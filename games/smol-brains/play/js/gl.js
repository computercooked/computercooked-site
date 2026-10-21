/* smol brains 2 — gl.js
   A thin WebGL layer: context (WebGL2, or WebGL1 + extensions), shader programs with auto-located
   attributes/uniforms, buffers, instancing, and small mat4 helpers. Shaders are GLSL ES 1.00 so the same
   source runs on both. No external libraries (site rule: nothing from a CDN). */
(function () {
  "use strict";
  var SB = window.SB;
  var GL = (SB.GL = {});

  GL.create = function (canvas, opts) {
    opts = opts || {};
    var attrs = { antialias: opts.antialias !== false, alpha: false, depth: true, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: "high-performance" };
    var gl = null, v2 = false;
    try { gl = canvas.getContext("webgl2", attrs); v2 = !!gl; } catch (e) { gl = null; }
    if (!gl) try { gl = canvas.getContext("webgl", attrs) || canvas.getContext("experimental-webgl", attrs); } catch (e) { gl = null; }
    if (!gl) return null;
    var ctx = { gl: gl, v2: v2, canvas: canvas };
    if (v2) {
      ctx.divisor = function (loc, d) { gl.vertexAttribDivisor(loc, d); };
      ctx.drawInstanced = function (mode, first, count, inst) { gl.drawArraysInstanced(mode, first, count, inst); };
      ctx.uint = true;
    } else {
      var ext = gl.getExtension("ANGLE_instanced_arrays");
      if (!ext) return null;
      ctx.divisor = function (loc, d) { ext.vertexAttribDivisorANGLE(loc, d); };
      ctx.drawInstanced = function (mode, first, count, inst) { ext.drawArraysInstancedANGLE(mode, first, count, inst); };
      ctx.uint = !!gl.getExtension("OES_element_index_uint");
    }
    ctx.maxAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
    ctx.enabled = [];
    return ctx;
  };

  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      var log = gl.getShaderInfoLog(s);
      var lines = src.split("\n").map(function (l, i) { return (i + 1) + ": " + l; }).join("\n");
      throw new Error("shader compile failed: " + log + "\n" + lines);
    }
    return s;
  }

  // Program with p.a.<attrib> and p.u.<uniform> locations. Array uniforms are found as "name[0]" -> p.u.name.
  GL.program = function (ctx, vsrc, fsrc) {
    var gl = ctx.gl;
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vsrc));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fsrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error("program link failed: " + gl.getProgramInfoLog(prog));
    var p = { prog: prog, a: {}, u: {} }, i, n;
    n = gl.getProgramParameter(prog, gl.ACTIVE_ATTRIBUTES);
    for (i = 0; i < n; i++) { var ai = gl.getActiveAttrib(prog, i); p.a[ai.name] = gl.getAttribLocation(prog, ai.name); }
    n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
    for (i = 0; i < n; i++) { var ui = gl.getActiveUniform(prog, i); var nm = ui.name.replace(/\[0\]$/, ""); p.u[nm] = gl.getUniformLocation(prog, ui.name); }
    return p;
  };

  GL.buffer = function (ctx, data, usage) {
    var gl = ctx.gl, b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
    return b;
  };

  // Update a dynamic buffer, growing it when needed. holder = {buf, cap}
  GL.stream = function (ctx, holder, data, len) {
    var gl = ctx.gl;
    var bytes = (len == null ? data.length : len) * 4;
    if (!holder.buf || holder.cap < bytes) {
      if (holder.buf) gl.deleteBuffer(holder.buf);
      holder.buf = gl.createBuffer();
      holder.cap = Math.max(bytes, 1024) * 1.5 | 0;
      gl.bindBuffer(gl.ARRAY_BUFFER, holder.buf);
      gl.bufferData(gl.ARRAY_BUFFER, holder.cap, gl.DYNAMIC_DRAW);
    } else gl.bindBuffer(gl.ARRAY_BUFFER, holder.buf);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, len == null ? data : data.subarray(0, len));
    return holder.buf;
  };

  // Bind float attributes from a buffer. layout = [[loc, size], ...] in floats; stride in floats.
  GL.attribs = function (ctx, buf, layout, stride, divisor, offsetFloats) {
    var gl = ctx.gl, off = offsetFloats || 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    for (var i = 0; i < layout.length; i++) {
      var loc = layout[i][0], size = layout[i][1];
      if (loc != null && loc >= 0) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride * 4, off * 4);
        ctx.divisor(loc, divisor || 0);
        ctx.enabled[loc] = true;
      }
      off += size;
    }
  };

  // Disable every attribute array (call before switching programs so stale instanced arrays don't leak).
  GL.resetAttribs = function (ctx) {
    var gl = ctx.gl;
    for (var i = 0; i < ctx.enabled.length; i++) if (ctx.enabled[i]) { gl.disableVertexAttribArray(i); ctx.divisor(i, 0); ctx.enabled[i] = false; }
  };

  GL.texture = function (ctx, w, h, data, opts) {
    var gl = ctx.gl, t = gl.createTexture();
    opts = opts || {};
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    var filt = opts.nearest ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt);
    var wrap = opts.repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  };

  /* ---------------- mat4 (column-major Float32Array(16)) ---------------- */
  var M = (GL.mat4 = {});
  M.create = function () { var m = new Float32Array(16); m[0] = m[5] = m[10] = m[15] = 1; return m; };
  M.ortho = function (out, l, r, b, t, n, f) {
    var lr = 1 / (l - r), bt = 1 / (b - t), nf = 1 / (n - f);
    out.fill(0);
    out[0] = -2 * lr; out[5] = -2 * bt; out[10] = 2 * nf;
    out[12] = (l + r) * lr; out[13] = (t + b) * bt; out[14] = (f + n) * nf; out[15] = 1;
    return out;
  };
  // perspective: fovy in radians (used by the possessed smol's eyes, possess.js)
  M.perspective = function (out, fovy, aspect, n, f) {
    var t = 1 / Math.tan(fovy / 2), nf = 1 / (n - f);
    out.fill(0);
    out[0] = t / aspect; out[5] = t; out[10] = (f + n) * nf; out[11] = -1; out[14] = 2 * f * n * nf;
    return out;
  };
  M.lookAt = function (out, ex, ey, ez, cx, cy, cz, ux, uy, uz) {
    var zx = ex - cx, zy = ey - cy, zz = ez - cz, l = 1 / Math.hypot(zx, zy, zz);
    zx *= l; zy *= l; zz *= l;
    var xx = uy * zz - uz * zy, xy = uz * zx - ux * zz, xz = ux * zy - uy * zx;
    l = Math.hypot(xx, xy, xz); l = l ? 1 / l : 0; xx *= l; xy *= l; xz *= l;
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    out[0] = xx; out[1] = yx; out[2] = zx; out[3] = 0;
    out[4] = xy; out[5] = yy; out[6] = zy; out[7] = 0;
    out[8] = xz; out[9] = yz; out[10] = zz; out[11] = 0;
    out[12] = -(xx * ex + xy * ey + xz * ez); out[13] = -(yx * ex + yy * ey + yz * ez); out[14] = -(zx * ex + zy * ey + zz * ez); out[15] = 1;
    return out;
  };
  M.mul = function (out, a, b) {
    var r = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var rr = 0; rr < 4; rr++) {
      r[c * 4 + rr] = a[rr] * b[c * 4] + a[4 + rr] * b[c * 4 + 1] + a[8 + rr] * b[c * 4 + 2] + a[12 + rr] * b[c * 4 + 3];
    }
    out.set(r);
    return out;
  };
  // project world point -> [ndcX, ndcY, ndcZ]
  M.project = function (m, x, y, z, out) {
    var w = m[3] * x + m[7] * y + m[11] * z + m[15];
    out[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) / w;
    out[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) / w;
    out[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) / w;
    out[3] = w; // < 0: behind a perspective camera
    return out;
  };
})();
