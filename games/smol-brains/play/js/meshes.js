/* smol brains 2 — meshes.js
   Every 3D shape in the game is built here from code: low-poly trees, rocks, items, buildings, decorations
   and creature body parts. A mesh is a Float32Array of non-indexed triangles with 12 floats per vertex:
   position(3) normal(3) colour(4: rgb + tintMask) extra(2: wind flex, emissive).
   tintMask 1 = the per-instance tint colour multiplies this vertex (leaves, bodies); 0 = keep vertex colour. */
(function () {
  "use strict";
  var SB = window.SB;
  var ME = (SB.Meshes = {});
  var STRIDE = (ME.STRIDE = 12);

  /* ---------------- builder ---------------- */

  function Builder() {
    this.v = [];
    this.m = [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]; // 3x3 linear (row-major) + translation
    this.stack = [];
    this.c = [1, 1, 1, 0];
    this.fk = 0; this.f0 = 0; // flex = clamp((y - f0) * fk)
    this.em = 0;
    this.flatShade = true;
    this.twoSided = false;
  }
  var BP = Builder.prototype;
  BP.push = function () { this.stack.push(this.m.slice()); return this; };
  BP.pop = function () { this.m = this.stack.pop(); return this; };
  function mulLin(m, a) { // m = m * a (a is 3x3 row-major)
    var r = [];
    for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) r[i * 3 + j] = m[i * 3] * a[j] + m[i * 3 + 1] * a[3 + j] + m[i * 3 + 2] * a[6 + j];
    for (var k = 0; k < 9; k++) m[k] = r[k];
  }
  BP.translate = function (x, y, z) {
    var m = this.m;
    m[9] += m[0] * x + m[1] * y + m[2] * z;
    m[10] += m[3] * x + m[4] * y + m[5] * z;
    m[11] += m[6] * x + m[7] * y + m[8] * z;
    return this;
  };
  BP.scale = function (x, y, z) { if (y == null) { y = x; z = x; } mulLin(this.m, [x, 0, 0, 0, y, 0, 0, 0, z]); return this; };
  BP.rotY = function (a) { var c = Math.cos(a), s = Math.sin(a); mulLin(this.m, [c, 0, s, 0, 1, 0, -s, 0, c]); return this; };
  BP.rotX = function (a) { var c = Math.cos(a), s = Math.sin(a); mulLin(this.m, [1, 0, 0, 0, c, -s, 0, s, c]); return this; };
  BP.rotZ = function (a) { var c = Math.cos(a), s = Math.sin(a); mulLin(this.m, [c, -s, 0, s, c, 0, 0, 0, 1]); return this; };
  BP.color = function (hex, tint) { var c = typeof hex === "number" ? SB.hex(hex) : hex; this.c = [c[0], c[1], c[2], tint || 0]; return this; };
  BP.flex = function (k, y0) { this.fk = k; this.f0 = y0 || 0; return this; };
  BP.glow = function (e) { this.em = e; return this; };
  BP.smoothShade = function (on) { this.flatShade = !on; return this; };
  BP.sides = function (two) { this.twoSided = !!two; return this; };

  BP.xf = function (p) {
    var m = this.m;
    return [m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[9], m[3] * p[0] + m[4] * p[1] + m[5] * p[2] + m[10], m[6] * p[0] + m[7] * p[1] + m[8] * p[2] + m[11]];
  };
  BP.xn = function (n) { // inverse-transpose of the linear part, then normalise
    var m = this.m;
    var a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8];
    var A = e * i - f * h, Bc = -(d * i - f * g), C = d * h - e * g, D = -(b * i - c * h), E = a * i - c * g, Fc = -(a * h - b * g), G = b * f - c * e, H = -(a * f - c * d), I = a * e - b * d;
    var x = A * n[0] + Bc * n[1] + C * n[2], y = D * n[0] + E * n[1] + Fc * n[2], z = G * n[0] + H * n[1] + I * n[2];
    var l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  };
  BP.vert = function (p, n) {
    var c = this.c, f = this.fk ? SB.clamp01((p[1] - this.f0) * this.fk) : 0;
    this.v.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], c[3], f, this.em);
  };
  // triangle in local coords; normals given (smooth) or computed (flat)
  BP.tri = function (a, b, c, na, nb, nc) {
    var A = this.xf(a), Bv = this.xf(b), C = this.xf(c);
    var fn;
    if (this.flatShade || !na) {
      var ux = Bv[0] - A[0], uy = Bv[1] - A[1], uz = Bv[2] - A[2], vx = C[0] - A[0], vy = C[1] - A[1], vz = C[2] - A[2];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.hypot(nx, ny, nz) || 1;
      fn = [nx / l, ny / l, nz / l];
      this.vert(A, fn); this.vert(Bv, fn); this.vert(C, fn);
      if (this.twoSided) { var bn = [-fn[0], -fn[1], -fn[2]]; this.vert(A, bn); this.vert(C, bn); this.vert(Bv, bn); }
    } else {
      this.vert(A, this.xn(na)); this.vert(Bv, this.xn(nb)); this.vert(C, this.xn(nc));
    }
    return this;
  };
  BP.quad = function (a, b, c, d) { this.tri(a, b, c); this.tri(a, c, d); return this; };

  // unit icosphere (radius 1), sub = 0..3; disp(x,y,z) optional radial multiplier
  var icoCache = {};
  function icoTris(sub) {
    if (icoCache[sub]) return icoCache[sub];
    var t = (1 + Math.sqrt(5)) / 2;
    var P = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map(nrm);
    var F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    var tris = F.map(function (f) { return [P[f[0]], P[f[1]], P[f[2]]]; });
    for (var s = 0; s < sub; s++) {
      var nt = [];
      tris.forEach(function (tr) {
        var a = tr[0], b = tr[1], c = tr[2];
        var ab = nrm(mid(a, b)), bc = nrm(mid(b, c)), ca = nrm(mid(c, a));
        nt.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      });
      tris = nt;
    }
    return (icoCache[sub] = tris);
  }
  function nrm(p) { var l = Math.hypot(p[0], p[1], p[2]); return [p[0] / l, p[1] / l, p[2] / l]; }
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }

  BP.sphere = function (sub, disp) {
    var tris = icoTris(sub == null ? 1 : sub), self = this;
    tris.forEach(function (tr) {
      var p = tr.map(function (q) { var k = disp ? disp(q[0], q[1], q[2]) : 1; return [q[0] * k, q[1] * k, q[2] * k]; });
      self.tri(p[0], p[1], p[2], tr[0], tr[1], tr[2]);
    });
    return this;
  };
  // lumpy flat-shaded blob (canopies, bushes, rocks). seed makes each one different.
  BP.blob = function (sub, amp, seed, squashY) {
    var s = seed || 1;
    return this.sphere(sub, function (x, y, z) {
      var n = Math.sin(x * 5.1 + s) * Math.cos(y * 4.3 + s * 1.7) + Math.sin(z * 6.7 - s * 0.7) * 0.6;
      return 1 + n * amp * 0.5 + (squashY && y < 0 ? y * squashY : 0);
    });
  };
  // cylinder / cone along +y from 0 to h, radius r0 at bottom, r1 at top
  BP.cyl = function (segs, r0, r1, h, caps) {
    for (var i = 0; i < segs; i++) {
      var a0 = i / segs * Math.PI * 2, a1 = (i + 1) / segs * Math.PI * 2;
      var c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      var p00 = [c0 * r0, 0, s0 * r0], p10 = [c1 * r0, 0, s1 * r0], p01 = [c0 * r1, h, s0 * r1], p11 = [c1 * r1, h, s1 * r1];
      if (r1 > 0.0001) this.quad(p00, p01, p11, p10); else this.tri(p00, p01, p10);
      if (caps !== false) {
        if (r1 > 0.0001) this.tri([0, h, 0], p01, p11);
        this.tri([0, 0, 0], p00, p10);
      }
    }
    return this;
  };
  BP.cone = function (segs, r, h) { return this.cyl(segs, r, 0, h, true); };
  BP.box = function (w, h, d) {
    var x = w / 2, z = d / 2;
    var P = [[-x, 0, -z], [x, 0, -z], [x, 0, z], [-x, 0, z], [-x, h, -z], [x, h, -z], [x, h, z], [-x, h, z]];
    this.quad(P[4], P[7], P[6], P[5]); this.quad(P[0], P[1], P[2], P[3]);
    this.quad(P[3], P[2], P[6], P[7]); this.quad(P[1], P[0], P[4], P[5]);
    this.quad(P[2], P[1], P[5], P[6]); this.quad(P[0], P[3], P[7], P[4]);
    return this;
  };
  // flat leaf/fin/ear shape in the xy plane: a diamond pointing +y
  BP.leaf = function (w, h, bend) {
    var b = bend || 0;
    this.tri([0, 0, 0], [w / 2, h * 0.45, b * 0.5], [0, h, b]);
    this.tri([0, 0, 0], [0, h, b], [-w / 2, h * 0.45, b * 0.5]);
    return this;
  };
  BP.torus = function (R, r, segs, sides) {
    for (var i = 0; i < segs; i++) for (var j = 0; j < sides; j++) {
      var u0 = i / segs * 6.2832, u1 = (i + 1) / segs * 6.2832, v0 = j / sides * 6.2832, v1 = (j + 1) / sides * 6.2832;
      var P = function (u, v) { return [(R + r * Math.cos(v)) * Math.cos(u), r * Math.sin(v), (R + r * Math.cos(v)) * Math.sin(u)]; };
      var N = function (u, v) { return [Math.cos(v) * Math.cos(u), Math.sin(v), Math.cos(v) * Math.sin(u)]; };
      this.tri(P(u0, v0), P(u0, v1), P(u1, v1), N(u0, v0), N(u0, v1), N(u1, v1));
      this.tri(P(u0, v0), P(u1, v1), P(u1, v0), N(u0, v0), N(u1, v1), N(u1, v0));
    }
    return this;
  };
  BP.finish = function () {
    var a = new Float32Array(this.v);
    var minY = 1e9, maxY = -1e9, rad = 0;
    for (var i = 0; i < a.length; i += STRIDE) { if (a[i + 1] < minY) minY = a[i + 1]; if (a[i + 1] > maxY) maxY = a[i + 1]; rad = Math.max(rad, Math.hypot(a[i], a[i + 2])); }
    return { data: a, count: a.length / STRIDE, minY: minY, maxY: maxY, rad: rad };
  };
  ME.builder = function () { return new Builder(); };

  /* ---------------- palette ---------------- */
  var C = {
    bark: 0x7a5236, barkDark: 0x5a3b26, birch: 0xe8e2d6, leaf: 0x5fae4a, leafDark: 0x3f8a3a, pine: 0x2f6e48, palm: 0x58b04a,
    jungle: 0x2f9a4f, rock: 0x9a96a0, rockDark: 0x77737e, flint: 0x46526c, sand: 0xe0c890, clay: 0xb86b45, ore: 0xd9823e,
    crystal: 0x9fe4ff, shroomCap: 0xb07ae0, shroomStem: 0xe8e0d0, red: 0xe0405a, straw: 0xd9b86a, twig: 0x8a6440,
    reed: 0x9cb85a, white: 0xf5f3ed, dark: 0x1a1a22, lime: 0xc5ff49, lilac: 0xb59aff, fire: 0xffa640, ember: 0xff5a2a
  };
  ME.C = C;

  /* ---------------- nodes (trees, bushes, rocks...) ---------------- */

  function oak(seed) {
    var b = ME.builder();
    b.color(C.bark).cyl(6, 0.16, 0.11, 1.5);
    b.push().translate(0, 1.1, 0).rotZ(0.6).color(C.bark).cyl(5, 0.07, 0.04, 0.6).pop();
    b.flex(0.3, 1).color(C.leaf, 1);
    b.push().translate(0, 2.0, 0).scale(1.05, 0.85, 1.05).blob(1, 0.3, seed).pop();
    b.push().translate(0.45, 1.75, 0.2).scale(0.65, 0.55, 0.65).blob(1, 0.3, seed + 2).pop();
    b.push().translate(-0.35, 1.8, -0.3).scale(0.6, 0.55, 0.6).blob(1, 0.3, seed + 3).pop();
    // apples peek out
    b.flex(0.3, 1).color(0xe5484d);
    [[0.6, 1.95, 0.55], [-0.55, 1.6, 0.4], [0.2, 1.55, -0.75]].forEach(function (p) { b.push().translate(p[0], p[1], p[2]).scale(0.09).sphere(0).pop(); });
    return b.finish();
  }
  function birch(seed) {
    var b = ME.builder();
    b.color(C.birch).cyl(6, 0.11, 0.07, 2.2);
    b.color(0x333333);
    [0.5, 1.0, 1.5].forEach(function (y, i) { b.push().translate(0, y, 0).rotY(i * 2).box(0.235, 0.05, 0.08).pop(); });
    b.flex(0.3, 1.2).color(0x8fc85a, 1);
    b.push().translate(0, 2.2, 0).scale(0.55, 0.95, 0.55).blob(1, 0.25, seed).pop();
    b.push().translate(0.15, 1.6, 0.1).scale(0.45, 0.6, 0.45).blob(1, 0.25, seed + 1).pop();
    return b.finish();
  }
  function pine(seed) {
    var b = ME.builder();
    b.color(C.barkDark).cyl(5, 0.13, 0.08, 1.0);
    b.flex(0.25, 0.8).color(C.pine, 1);
    b.push().translate(0, 0.6, 0).rotY(seed).cyl(7, 0.95, 0, 1.4).pop();
    b.push().translate(0, 1.3, 0).rotY(seed + 1).cyl(7, 0.75, 0, 1.2).pop();
    b.push().translate(0, 1.95, 0).rotY(seed + 2).cyl(7, 0.5, 0, 1.0).pop();
    return b.finish();
  }
  function palm(seed) {
    var b = ME.builder(), x = 0, y = 0, lean = 0.12;
    b.color(0x9c7a4a);
    for (var i = 0; i < 5; i++) {
      b.push().translate(x, y, 0).rotZ(-lean * (i + 1)).cyl(5, 0.11 - i * 0.012, 0.1 - i * 0.012, 0.55).pop();
      x += Math.sin(lean * (i + 1)) * 0.55; y += Math.cos(lean * (i + 1)) * 0.5;
    }
    b.flex(0.4, 1.5).color(C.palm, 1).sides(true);
    for (var k = 0; k < 7; k++) {
      b.push().translate(x, y, 0).rotY(k / 7 * 6.283 + seed).rotX(1.15).leaf(0.42, 1.3, -0.35).pop();
    }
    b.sides(false).color(0xffd23f);
    b.push().translate(x + 0.08, y - 0.12, 0.06).scale(0.1, 0.16, 0.1).sphere(0).pop();
    b.push().translate(x - 0.08, y - 0.14, -0.05).scale(0.1, 0.16, 0.1).sphere(0).pop();
    return b.finish();
  }
  function giant(seed) {
    var b = ME.builder();
    b.color(0x6a4a2e).cyl(7, 0.38, 0.22, 2.6);
    for (var i = 0; i < 4; i++) b.push().rotY(i * 1.57 + seed).translate(0.3, 0, 0).rotZ(-0.7).color(0x6a4a2e).cyl(4, 0.12, 0.02, 0.6).pop();
    b.flex(0.2, 2).color(C.jungle, 1);
    b.push().translate(0, 2.9, 0).scale(1.6, 0.7, 1.6).blob(1, 0.35, seed).pop();
    b.push().translate(0.6, 3.4, 0.3).scale(1.0, 0.6, 1.0).blob(1, 0.35, seed + 1).pop();
    b.push().translate(-0.5, 3.5, -0.4).scale(0.9, 0.55, 0.9).blob(1, 0.35, seed + 2).pop();
    b.sides(true).color(0x3fa85a, 1);
    for (var v = 0; v < 5; v++) b.push().rotY(v * 1.26 + seed).translate(1.0, 2.7, 0).rotX(Math.PI).leaf(0.08, 1.0, 0.1).pop();
    return b.finish();
  }
  function deadtree(seed) {
    var b = ME.builder();
    b.color(0x6e5a4a).cyl(5, 0.14, 0.06, 1.9);
    for (var i = 0; i < 4; i++) {
      b.push().translate(0, 0.8 + i * 0.3, 0).rotY(i * 2.1 + seed).rotZ(0.9 - i * 0.1).cyl(4, 0.06, 0.015, 0.7 - i * 0.08).pop();
    }
    return b.finish();
  }
  function shroomtree(seed) {
    var b = ME.builder();
    b.color(C.shroomStem).cyl(7, 0.22, 0.16, 1.9);
    b.flex(0.15, 1.5).color(C.shroomCap, 1).glow(0.35);
    b.push().translate(0, 1.8, 0).scale(1.3, 0.55, 1.3).sphere(1, function (x, y) { return y < -0.1 ? 0.2 : 1; }).pop();
    b.color(0xf5f3ed).glow(0.8);
    for (var i = 0; i < 7; i++) {
      var a = i * 2.4 + seed, rr = 0.5 + (i % 3) * 0.25;
      b.push().translate(Math.cos(a) * rr, 2.05 + (1 - rr) * 0.25, Math.sin(a) * rr).scale(0.1, 0.05, 0.1).sphere(0).pop();
    }
    return b.finish();
  }
  function cactus(seed) {
    var b = ME.builder();
    b.color(0x4f9a58, 1).cyl(7, 0.2, 0.18, 1.3);
    b.push().translate(0, 1.3, 0).scale(0.18).sphere(0).pop();
    b.push().translate(0.16, 0.6, 0).rotZ(-1.57).cyl(6, 0.1, 0.1, 0.3, false).pop();
    b.push().translate(0.42, 0.6, 0).cyl(6, 0.1, 0.09, 0.4).translate(0, 0.4, 0).scale(0.09).sphere(0).pop();
    b.color(0xff7eb6).push().translate(0, 1.45, 0).scale(0.09).sphere(0).pop();
    return b.finish();
  }
  function bush(seed) {
    var b = ME.builder();
    b.flex(0.6, 0).color(0x4f9a48, 1);
    b.push().translate(0, 0.35, 0).scale(0.55, 0.42, 0.55).blob(1, 0.35, seed, 0.5).pop();
    b.push().translate(0.28, 0.28, 0.1).scale(0.35, 0.3, 0.35).blob(1, 0.35, seed + 1, 0.5).pop();
    b.color(0x6c5ce7);
    for (var i = 0; i < 7; i++) {
      var a = i * 2.2 + seed;
      b.push().translate(Math.cos(a) * 0.45, 0.3 + (i % 3) * 0.14, Math.sin(a) * 0.45).scale(0.07).sphere(0).pop();
    }
    return b.finish();
  }
  function reeds(seed) {
    var b = ME.builder().sides(true).flex(1.2, 0);
    for (var i = 0; i < 9; i++) {
      var a = i * 2.39 + seed, rr = 0.1 + (i % 4) * 0.08, hh = 0.7 + (i % 3) * 0.25;
      b.color(i % 2 ? C.reed : 0x7f9e48, 1).push().translate(Math.cos(a) * rr, 0, Math.sin(a) * rr).rotY(a).rotZ((i % 3 - 1) * 0.15).leaf(0.07, hh, 0.05).pop();
    }
    b.sides(false).color(0x7a5236);
    for (i = 0; i < 3; i++) { var a2 = i * 2.1 + seed; b.push().translate(Math.cos(a2) * 0.12, 0.85 + i * 0.1, Math.sin(a2) * 0.12).scale(0.035, 0.12, 0.035).sphere(0).pop(); }
    return b.finish();
  }
  function herbs(seed) {
    var b = ME.builder().sides(true).flex(1.5, 0);
    for (var i = 0; i < 6; i++) b.color(0x5ed17a, 1).push().rotY(i * 1.05 + seed).rotX(0.6).leaf(0.16, 0.3, 0.05).pop();
    b.sides(false).color(0xffffff).glow(0.2);
    for (i = 0; i < 3; i++) b.push().translate(Math.cos(i * 2.1) * 0.12, 0.26, Math.sin(i * 2.1) * 0.12).scale(0.04).sphere(0).pop();
    return b.finish();
  }
  function shrooms(seed) {
    var b = ME.builder();
    for (var i = 0; i < 6; i++) {
      var a = i / 6 * 6.283 + seed, s = 0.7 + (i % 3) * 0.2;
      b.push().translate(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32).scale(s);
      b.color(C.shroomStem).cyl(5, 0.035, 0.03, 0.14);
      b.color(i % 3 === 2 ? 0x5ab8ff : C.red).glow(i % 3 === 2 ? 0.4 : 0).push().translate(0, 0.14, 0).scale(0.11, 0.07, 0.11).sphere(0, function (x, y) { return y < 0 ? 0.3 : 1; }).pop().glow(0);
      b.pop();
    }
    return b.finish();
  }
  function roots(seed) {
    var b = ME.builder().sides(true).flex(1.4, 0);
    for (var i = 0; i < 5; i++) {
      var a = i * 2.5 + seed, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.2;
      for (var j = 0; j < 3; j++) b.color(j % 2 ? 0x6fbf4a : 0x58a83c, 1).push().translate(x, 0.04, z).rotY(a + j * 2.1).rotX(0.35).leaf(0.07, 0.34, 0.03).pop();
      b.sides(false).color(0xff8a3d).push().translate(x, 0.03, z).scale(0.05, 0.04, 0.05).sphere(0).pop().sides(true);
    }
    return b.finish();
  }
  function gourds(seed) {
    var b = ME.builder();
    b.sides(true).flex(0.8, 0).color(0x4f9a48, 1);
    for (var i = 0; i < 7; i++) { var a = i * 0.9 + seed; b.push().translate(Math.cos(a) * 0.35, 0.03, Math.sin(a) * 0.35).rotY(a).rotX(1.3).leaf(0.16, 0.2, 0.02).pop(); }
    b.sides(false).flex(0, 0).color(0x5a7a2a).push().translate(0, 0.02, 0).rotZ(1.57).translate(0, -0.45, 0).cyl(4, 0.02, 0.02, 0.9, false).pop();
    b.color(0xf59b2b);
    [[0.22, 0.12, 0.05, 0.16], [-0.25, 0.1, -0.12, 0.12], [0.02, 0.09, 0.3, 0.1]].forEach(function (g) { b.push().translate(g[0], g[1], g[2]).scale(g[3] * 1.2, g[3], g[3] * 1.2).sphere(1, function (x, y, z) { return 1 + 0.08 * Math.cos(Math.atan2(z, x) * 8); }).pop(); });
    return b.finish();
  }
  function hive(seed) {
    var b = ME.builder();
    b.color(0x7a5236).cyl(5, 0.06, 0.05, 1.1);
    b.push().translate(0, 1.0, 0).rotZ(1.2).cyl(4, 0.04, 0.03, 0.5, false).pop();
    b.color(0xe8b04a);
    for (var i = 0; i < 4; i++) b.push().translate(0.28, 0.82 - i * 0.09, 0).scale(0.17 - Math.abs(i - 1.3) * 0.03, 0.06, 0.17 - Math.abs(i - 1.3) * 0.03).sphere(0).pop();
    b.color(0x3a2a1a).push().translate(0.28, 0.66, 0.13).scale(0.035).sphere(0).pop();
    return b.finish();
  }
  function clams(seed) {
    var b = ME.builder();
    b.color(0xd8c9a0).push().translate(0, 0.0, 0).scale(0.45, 0.04, 0.4).sphere(1).pop();
    b.color(0xc9c1b4);
    for (var i = 0; i < 4; i++) { var a = i * 1.7 + seed; b.push().translate(Math.cos(a) * 0.22, 0.04, Math.sin(a) * 0.2).rotY(a).scale(0.07, 0.035, 0.06).sphere(0).pop(); }
    b.color(0xeef6ff).glow(0.2);
    for (i = 0; i < 3; i++) b.push().translate(Math.cos(i * 2.3) * 0.1, 0.06, Math.sin(i * 2.3) * 0.12).scale(0.025).sphere(0).pop();
    return b.finish();
  }
  function boulder(seed) {
    var b = ME.builder();
    b.color(C.rock, 1).push().translate(0, 0.28, 0).scale(0.62, 0.45, 0.55).rotY(seed).blob(1, 0.4, seed, 0.3).pop();
    b.color(C.rockDark, 1).push().translate(0.42, 0.12, 0.25).scale(0.22, 0.16, 0.2).blob(0, 0.3, seed + 1).pop();
    return b.finish();
  }
  function flintrock(seed) {
    var b = ME.builder();
    b.color(C.flint, 1);
    for (var i = 0; i < 4; i++) {
      var a = i * 1.9 + seed;
      b.push().translate(Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22).rotY(a).rotZ(0.25 * (i % 2 ? 1 : -1)).cyl(4, 0.18, 0.02, 0.55 + (i % 3) * 0.15).pop();
    }
    return b.finish();
  }
  function claybank(seed) {
    var b = ME.builder();
    b.color(C.clay, 1).push().translate(0, 0.02, 0).scale(0.7, 0.14, 0.55).blob(1, 0.4, seed, 0.8).pop();
    b.color(0xa85f3d, 1).push().translate(0.3, 0.06, 0.2).scale(0.3, 0.1, 0.25).blob(0, 0.3, seed + 3).pop();
    return b.finish();
  }
  function orevein(seed) {
    var b = ME.builder();
    b.color(0x8a8590, 1).push().translate(0, 0.25, 0).scale(0.7, 0.5, 0.6).blob(1, 0.35, seed, 0.3).pop();
    b.color(C.ore).glow(0.1);
    for (var i = 0; i < 5; i++) { var a = i * 1.3 + seed; b.push().translate(Math.cos(a) * 0.5, 0.25 + (i % 2) * 0.2, Math.sin(a) * 0.42).scale(0.13).blob(0, 0.3, i).pop(); }
    b.glow(0).color(0x5fbf8a);
    b.push().translate(-0.2, 0.62, 0.1).scale(0.1).blob(0, 0.3, 9).pop();
    return b.finish();
  }
  function crystals(seed) {
    var b = ME.builder();
    b.color(C.crystal, 1).glow(0.55);
    for (var i = 0; i < 6; i++) {
      var a = i * 1.7 + seed, rr = i ? 0.25 + (i % 2) * 0.15 : 0, hh = i ? 0.6 + (i % 3) * 0.25 : 1.3;
      b.push().translate(Math.cos(a) * rr, 0, Math.sin(a) * rr).rotY(a).rotZ(i ? 0.35 * (i % 2 ? 1 : -1) : 0).rotX(i ? 0.2 : 0);
      b.cyl(6, 0.12 + (i ? 0 : 0.05), 0.12 + (i ? 0 : 0.05), hh * 0.75, false).translate(0, hh * 0.75, 0).cone(6, 0.12 + (i ? 0 : 0.05), hh * 0.3);
      b.pop();
    }
    b.glow(0).color(C.rockDark).push().scale(0.55, 0.12, 0.55).blob(0, 0.3, seed).pop();
    return b.finish();
  }
  function cave() {
    var b = ME.builder();
    b.color(0x6e6a76, 1);
    b.push().translate(0, 0.6, 0).scale(1.6, 1.1, 1.3).blob(1, 0.35, 4, 0.2).pop();
    b.color(0x5e5a66, 1).push().translate(1.0, 0.4, -0.5).scale(0.7, 0.6, 0.6).blob(1, 0.35, 5).pop();
    b.color(0x08080c).push().translate(0, 0.45, 1.05).scale(0.62, 0.55, 0.32).sphere(1).pop();
    b.color(0xff3355).glow(1);
    b.push().translate(-0.16, 0.55, 1.33).scale(0.05).sphere(0).pop();
    b.push().translate(0.16, 0.55, 1.33).scale(0.05).sphere(0).pop();
    return b.finish();
  }
  function nest() {
    var b = ME.builder();
    b.color(C.twig);
    for (var i = 0; i < 14; i++) {
      var a = i / 14 * 6.283;
      b.push().translate(Math.cos(a) * 0.55, 0.12, Math.sin(a) * 0.55).rotY(-a + 0.4).rotZ(1.45).cyl(4, 0.04, 0.035, 0.6, false).pop();
    }
    b.color(C.straw, 1).push().translate(0, 0.05, 0).scale(0.6, 0.12, 0.6).blob(1, 0.2, 2).pop();
    return b.finish();
  }

  ME.NODE_BUILDERS = { oak: oak, birch: birch, pine: pine, palm: palm, giant: giant, deadtree: deadtree, shroomtree: shroomtree, cactus: cactus, bush: bush, reeds: reeds, herbs: herbs, shrooms: shrooms, boulder: boulder, flintrock: flintrock, claybank: claybank, orevein: orevein, crystals: crystals, cave: cave, nest: nest, roots: roots, gourds: gourds, hive: hive, clams: clams };
  // trees that change colour in autumn
  ME.DECIDUOUS = { oak: 1, birch: 1, bush: 1, giant: 0 };

  // stump (felled tree) and charred tree
  ME.stump = function () { var b = ME.builder(); b.color(C.bark).cyl(6, 0.18, 0.16, 0.25); b.color(0xd9b88a).push().translate(0, 0.25, 0).cyl(6, 0.155, 0.155, 0.005).pop(); return b.finish(); };
  ME.burnt = function () { var b = ME.builder(); b.color(0x2a2522).cyl(5, 0.15, 0.06, 1.6); for (var i = 0; i < 3; i++) b.push().translate(0, 0.9 + i * 0.25, 0).rotY(i * 2.2).rotZ(0.8).cyl(4, 0.05, 0.01, 0.5).pop(); return b.finish(); };

  /* ---------------- items ---------------- */

  // the founders' escape pod: crashed, tilted, half dug into a scorched patch, window still glowing
  ME.podMesh = function () {
    var b = ME.builder();
    b.color(0x2e2826, 1).cyl(12, 0.95, 1.05, 0.02);
    b.color(0x7a5a3a, 1);
    [[0.62, 0.3, 0.16], [-0.55, 0.42, 0.13], [0.2, -0.65, 0.14], [-0.3, -0.5, 0.1]].forEach(function (d, i) { b.push().translate(d[0], 0.04, d[1]).scale(d[2], d[2] * 0.6, d[2]).blob(0, 0.3, i + 2).pop(); });
    b.smoothShade(true).color(0xe8e4f0, 1).push().translate(0, 0.33, 0).rotZ(0.55).scale(0.4, 0.6, 0.4).sphere(2).pop();
    b.color(0x5fc9c0, 1).push().translate(0, 0.33, 0).rotZ(0.55).scale(0.415, 0.09, 0.415).sphere(1).pop();
    b.color(0x9a96a8, 1).push().translate(0.27, 0.72, 0).rotZ(0.55).cyl(6, 0.08, 0.15, 0.12).pop();
    b.color(0xc5ff49, 1).glow(0.9).push().translate(-0.06, 0.42, 0.34).scale(0.13, 0.13, 0.07).sphere(1).pop().glow(0);
    b.color(0x9a96a8, 1).push().translate(-0.36, 0.1, 0.12).rotZ(1.1).box(0.26, 0.04, 0.16).pop();
    b.push().translate(-0.32, 0.12, -0.16).rotZ(1.0).box(0.24, 0.04, 0.14).pop();
    return b.finish();
  };
  function itemMesh(kind) {
    var k = SB.KINDS[kind], b = ME.builder(), col = k.color || 0xffffff;
    switch (kind) {
      case "apple": b.color(col).push().translate(0, 0.14, 0).scale(0.14, 0.13, 0.14).sphere(1).pop(); b.color(0x5a3b26).push().translate(0, 0.25, 0).cyl(4, 0.012, 0.01, 0.06).pop(); b.color(0x5fae4a).push().translate(0.03, 0.29, 0).rotZ(-1).leaf(0.05, 0.08).pop(); break;
      case "berry": b.color(col); [[0, 0.07, 0], [0.07, 0.07, 0.03], [-0.05, 0.07, 0.05], [0.01, 0.13, 0.02], [0.02, 0.07, -0.07]].forEach(function (p) { b.push().translate(p[0], p[1], p[2]).scale(0.065).sphere(0).pop(); }); break;
      case "banana": b.color(col); for (var i = 0; i < 4; i++) b.push().translate(-0.12 + i * 0.07, 0.06 + Math.sin(i / 3 * 3.14) * 0.05, 0).rotZ(-0.9 + i * 0.55).scale(0.05, 0.08, 0.05).sphere(0).pop(); break;
      case "nut": b.color(col).push().translate(0, 0.1, 0).scale(0.1, 0.12, 0.1).blob(0, 0.2, 3).pop(); b.color(0x6a4a2a).push().translate(0, 0.2, 0).scale(0.11, 0.04, 0.11).sphere(0).pop(); break;
      case "fish": b.color(col).push().translate(0, 0.08, 0).scale(0.2, 0.08, 0.06).sphere(1).pop(); b.color(col).push().translate(-0.2, 0.08, 0).rotZ(1.57).sides(true).leaf(0.14, 0.1).sides(false).pop(); b.color(0x1a1a22).push().translate(0.13, 0.1, 0.05).scale(0.015).sphere(0).pop(); break;
      case "meat": b.color(col).push().translate(0, 0.09, 0).scale(0.14, 0.09, 0.11).blob(0, 0.2, 2).pop(); b.color(0xf5f3ed).push().translate(0.12, 0.09, 0).rotZ(-1.57).cyl(4, 0.025, 0.025, 0.12).pop(); break;
      case "cooked": b.color(0x8a5a33).push().translate(0, 0.02, 0).rotZ(1.57).translate(0, -0.18, 0).cyl(4, 0.012, 0.012, 0.36).pop(); b.color(col); for (var j = 0; j < 3; j++) b.push().translate(-0.1 + j * 0.1, 0.03, 0).scale(0.06).blob(0, 0.3, j).pop(); break;
      case "bread": b.color(col).push().translate(0, 0.07, 0).scale(0.16, 0.09, 0.1).sphere(1).pop(); break;
      case "grain": b.sides(true).color(col); for (var g = 0; g < 4; g++) b.push().rotY(g * 0.8).rotZ(0.2).leaf(0.06, 0.3).pop(); break;
      case "carrot": b.color(col).push().translate(0, 0.05, 0).rotZ(1.45).cone(5, 0.05, 0.24).pop(); b.sides(true).color(0x6fbf4a); for (var cr = 0; cr < 3; cr++) b.push().translate(0.13, 0.05, 0).rotY(cr * 2.1).rotZ(-1.2).leaf(0.04, 0.13).pop(); b.sides(false); break;
      case "pumpkin": b.color(col).push().translate(0, 0.15, 0).scale(0.24, 0.17, 0.24).sphere(1, function (x, y, z) { return 1 + 0.07 * Math.cos(Math.atan2(z, x) * 8); }).pop(); b.color(0x5a7a2a).push().translate(0, 0.3, 0).cyl(4, 0.025, 0.02, 0.07).pop(); break;
      case "honey": b.color(col).glow(0.15).push().translate(0, 0.07, 0).cyl(6, 0.13, 0.13, 0.1).pop(); b.color(0xd99a20).glow(0); for (var hc = 0; hc < 6; hc++) b.push().translate(Math.cos(hc * 1.047) * 0.07, 0.175, Math.sin(hc * 1.047) * 0.07).scale(0.03, 0.006, 0.03).sphere(0).pop(); break;
      case "pricklypear": b.color(col).push().translate(0, 0.09, 0).scale(0.09, 0.11, 0.09).sphere(1).pop(); b.color(0xfff0c0); for (var pp = 0; pp < 4; pp++) b.push().translate(Math.cos(pp * 1.57) * 0.09, 0.11, Math.sin(pp * 1.57) * 0.09).scale(0.012).sphere(0).pop(); break;
      case "clam": b.color(col).push().translate(0, 0.04, 0).scale(0.13, 0.05, 0.11).sphere(1, function (x, y) { return y > 0 ? 1 : 0.6; }).pop(); b.color(0x9a9286).push().translate(0, 0.04, 0).scale(0.135, 0.008, 0.115).sphere(1).pop(); break;
      case "glowcap": case "shroom": b.color(0xe8e0d0).cyl(5, 0.035, 0.03, 0.1); b.color(col).glow(kind === "glowcap" ? 0.8 : 0).push().translate(0, 0.1, 0).scale(0.12, 0.08, 0.12).sphere(1, function (x, y) { return y < 0 ? 0.25 : 1; }).pop(); if (kind === "shroom") { b.color(0xffffff).glow(0); b.push().translate(0.05, 0.16, 0.03).scale(0.025).sphere(0).pop(); b.push().translate(-0.04, 0.15, -0.04).scale(0.02).sphere(0).pop(); } break;
      case "herb": b.sides(true).color(col); for (var h = 0; h < 4; h++) b.push().rotY(h * 1.57).rotX(0.5).leaf(0.08, 0.18).pop(); b.sides(false).color(0xc9a36a).push().scale(0.03, 0.08, 0.03).sphere(0).pop(); break;
      case "potion": b.color(0xb0603a).cyl(6, 0.08, 0.06, 0.16); b.color(col).glow(0.5).push().translate(0, 0.16, 0).cyl(6, 0.055, 0.055, 0.01).pop(); break;
      case "stoneaxe": b.color(0x8a5a35).push().translate(0, 0.04, 0).rotZ(1.5).cyl(4, 0.025, 0.022, 0.5).pop(); b.color(0x5d6d8e).push().translate(0.22, 0.05, 0).scale(0.09, 0.03, 0.07).blob(0, 0.2, 2).pop(); b.color(0xb8c46a).push().translate(0.2, 0.05, 0).scale(0.03, 0.035, 0.035).sphere(0).pop(); break;
      case "club": b.color(0x7a5232).push().translate(0, 0.05, 0).rotZ(1.5).cyl(5, 0.035, 0.06, 0.45).pop(); b.color(0x8e8a96).push().translate(0.24, 0.07, 0).scale(0.08).blob(0, 0.3, 4).pop(); break;
      case "rod": b.color(0xa07a50).push().translate(-0.2, 0.03, 0).rotZ(-1.45).cyl(4, 0.015, 0.008, 0.6).pop(); b.color(0xe8e4f0).push().translate(0.32, 0.03, 0.04).scale(0.035).sphere(0).pop(); b.color(0xff4f5e).push().translate(0.32, 0.06, 0.04).scale(0.03).sphere(0).pop(); break;
      case "cloak": b.smoothShade(true).color(col).push().translate(0, 0.06, 0).scale(0.22, 0.06, 0.18).blob(1, 0.25, 5).pop(); b.color(0xffffff).push().translate(0.05, 0.1, 0.05).scale(0.08, 0.03, 0.06).sphere(0).pop(); break;
      case "log": b.color(col).push().translate(0, 0.1, 0).rotZ(1.57).cyl(7, 0.1, 0.1, 0.5).pop(); b.color(0xd9b88a).push().translate(0.25, 0.1, 0).rotZ(1.57).cyl(7, 0.085, 0.085, 0.01).pop(); break;
      case "fur": b.smoothShade(true).color(col).push().translate(0, 0.05, 0).scale(0.15, 0.05, 0.12).blob(1, 0.35, 7).pop(); break;
      case "egg": b.smoothShade(true).color(col, 1).push().translate(0, 0.2, 0).scale(0.16, 0.21, 0.16).sphere(2).pop(); break;
      case "stick": b.color(col).push().translate(-0.2, 0.04, 0).rotZ(-1.5).cyl(4, 0.03, 0.022, 0.42).pop(); b.push().translate(0.02, 0.05, 0).rotY(0.7).rotZ(-1.0).cyl(3, 0.015, 0.01, 0.12).pop(); break;
      case "stone": b.color(col).push().translate(0, 0.07, 0).scale(0.12, 0.08, 0.1).blob(0, 0.3, 5).pop(); break;
      case "flint": b.color(col).push().translate(0, 0.0, 0).rotZ(0.3).cyl(4, 0.09, 0.0, 0.18).pop(); break;
      case "fiber": b.color(col); for (var f = 0; f < 5; f++) b.push().translate(0, 0.03 + f * 0.012, 0).rotY(f * 0.4).rotZ(1.57).translate(0, -0.18, 0).cyl(3, 0.01, 0.01, 0.36, false).pop(); break;
      case "clay": b.color(col).push().translate(0, 0.06, 0).scale(0.12, 0.07, 0.11).blob(0, 0.3, 7).pop(); break;
      case "ore": b.color(0x8a8590).push().translate(0, 0.07, 0).scale(0.11, 0.08, 0.1).blob(0, 0.3, 8).pop(); b.color(col).push().translate(0.05, 0.11, 0.03).scale(0.05).blob(0, 0.2, 1).pop(); break;
      case "metal": b.color(col).push().translate(0, 0.03, 0).box(0.22, 0.06, 0.1).pop(); break;
      case "crystal": b.color(col).glow(0.7).cyl(6, 0.06, 0.06, 0.15, false).translate(0, 0.15, 0).cone(6, 0.06, 0.1); break;
      case "seed": b.color(col); for (var s = 0; s < 5; s++) b.push().translate(Math.cos(s * 1.3) * 0.05, 0.02, Math.sin(s * 1.3) * 0.05).scale(0.025, 0.018, 0.025).sphere(0).pop(); break;
      case "ball": b.smoothShade(true).color(col).push().translate(0, 0.18, 0).scale(0.18).sphere(1).pop(); b.color(0xc5ff49).push().translate(0, 0.18, 0).scale(0.185, 0.04, 0.185).sphere(1).pop(); break;
      case "plush": b.smoothShade(true).color(col).push().translate(0, 0.14, 0).scale(0.15, 0.14, 0.13).sphere(1).pop(); b.color(0x1a1a22).push().translate(0.06, 0.17, 0.11).scale(0.022).sphere(0).pop().push().translate(-0.06, 0.17, 0.11).scale(0.022).sphere(0).pop(); b.color(col).push().translate(0.09, 0.27, 0).scale(0.05).sphere(0).pop().push().translate(-0.09, 0.27, 0).scale(0.05).sphere(0).pop(); break;
      case "pokestick": b.color(col).push().translate(-0.25, 0.04, 0).rotZ(-1.5).cyl(4, 0.03, 0.012, 0.52).pop(); break;
      case "hammer": b.color(col).push().translate(0, 0.08, 0).scale(0.13, 0.09, 0.11).blob(0, 0.15, 2).pop(); break;
      case "blade": b.color(col).push().translate(0, 0.02, 0).rotZ(-1.57).cyl(4, 0.04, 0.0, 0.26).pop(); b.color(0x8a5a33).push().translate(-0.06, 0.02, 0).rotZ(1.57).cyl(4, 0.025, 0.025, 0.08).pop(); break;
      case "spear": b.color(col).push().translate(-0.35, 0.04, 0).rotZ(-1.53).cyl(4, 0.022, 0.02, 0.7).pop(); b.color(C.flint).push().translate(0.35, 0.06, 0).rotZ(-1.53).cyl(4, 0.04, 0.0, 0.14).pop(); break;
      case "torch": b.color(0x7a5236).push().translate(-0.2, 0.04, 0).rotZ(-1.3).cyl(4, 0.03, 0.025, 0.42).pop(); b.color(0xffb050).glow(1).push().translate(0.2, 0.12, 0).scale(0.06, 0.09, 0.06).sphere(0).pop(); break;
      case "basket": b.color(col).cyl(8, 0.12, 0.16, 0.16, false); b.color(0xa8804a).cyl(8, 0.12, 0.12, 0.005); break;
      case "pot": b.color(col).push().scale(0.14, 0.18, 0.14).sphere(1, function (x, y) { return y > 0.7 ? 0.8 : 1; }).pop(); b.push().translate(0, 0.16, 0).cyl(8, 0.08, 0.1, 0.05, false).pop(); break;
      case "axe": b.color(0x7a5236).push().translate(-0.2, 0.04, 0).rotZ(-1.5).cyl(4, 0.025, 0.025, 0.45).pop(); b.color(col).push().translate(0.18, 0.04, 0).box(0.1, 0.05, 0.16).pop(); break;
      case "lens": b.color(0xc9a36a).push().translate(0, 0.02, 0).torus(0.09, 0.02, 10, 4).pop(); b.color(col).glow(0.6).push().translate(0, 0.02, 0).scale(0.085, 0.015, 0.085).sphere(1).pop(); break;
      case "butterfly": b.sides(true).color(col, 1); b.push().rotY(-1.57).rotX(-1.27).leaf(0.16, 0.17).pop().push().rotY(1.57).rotX(-1.27).leaf(0.16, 0.17).pop(); b.sides(false).color(0x2a2522).push().scale(0.02, 0.02, 0.08).sphere(0).pop(); break;
      case "beetle": b.smoothShade(true).color(col).push().translate(0, 0.05, 0).scale(0.08, 0.05, 0.1).sphere(1).pop(); b.color(0x1a1a22).push().translate(0, 0.05, 0.08).scale(0.04).sphere(0).pop(); b.push().translate(0, 0.1, 0).scale(0.005, 0.005, 0.1).sphere(0).pop(); break;
      case "hopper": b.smoothShade(true).color(col).push().translate(0, 0.16, 0).scale(0.16, 0.15, 0.2).sphere(1).pop(); b.push().translate(0, 0.26, 0.15).scale(0.1).sphere(1).pop(); b.color(0xf5e8d8).push().translate(0, 0.17, -0.2).scale(0.07).sphere(0).pop(); b.color(col).push().translate(0.05, 0.38, 0.12).rotX(-0.2).scale(0.03, 0.12, 0.03).sphere(0).pop().push().translate(-0.05, 0.38, 0.12).rotX(-0.2).scale(0.03, 0.12, 0.03).sphere(0).pop(); b.color(0x1a1a22).push().translate(0.05, 0.28, 0.23).scale(0.018).sphere(0).pop().push().translate(-0.05, 0.28, 0.23).scale(0.018).sphere(0).pop(); break;
      default: b.color(col).push().translate(0, 0.1, 0).scale(0.1).sphere(1).pop();
    }
    return b.finish();
  }
  ME.itemMesh = itemMesh;

  /* ---------------- structures (built by smols) ---------------- */

  ME.STRUCT_BUILDERS = {
    campfire: function () {
      var b = ME.builder();
      b.color(0x8a8590);
      for (var i = 0; i < 8; i++) { var a = i / 8 * 6.283; b.push().translate(Math.cos(a) * 0.42, 0.06, Math.sin(a) * 0.42).scale(0.12, 0.09, 0.1).blob(0, 0.3, i).pop(); }
      b.color(0x6a4a2e);
      for (i = 0; i < 4; i++) b.push().rotY(i * 1.57 + 0.4).translate(0, 0.06, 0).rotZ(1.1).translate(0, -0.25, 0).cyl(4, 0.05, 0.04, 0.5).pop();
      b.color(0x2a2522).push().translate(0, 0.03, 0).scale(0.3, 0.03, 0.3).sphere(0).pop();
      return b.finish();
    },
    flame: function () { // drawn on top of fires, scaled by fuel
      var b = ME.builder().glow(0.9);
      b.color(0xe8501f).push().rotY(0.3).cone(5, 0.26, 0.62).pop();
      b.color(0xff8a2a).push().translate(0.08, 0, 0.05).rotY(1).cone(5, 0.17, 0.78).pop();
      b.color(0xffc04a).push().translate(-0.07, 0, 0.02).rotY(2).cone(4, 0.13, 0.55).pop();
      b.color(0xfff1a0).glow(1.2).push().translate(0, 0, -0.03).cone(4, 0.08, 0.32).pop();
      return b.finish();
    },
    hut: function () {
      var b = ME.builder();
      b.color(0x9c7a4a).cyl(9, 0.9, 0.85, 0.75);
      b.color(0xd9b86a, 1).push().translate(0, 0.7, 0).cyl(9, 1.15, 0.05, 1.05).pop();
      b.color(0x2a1d14).push().translate(0, 0, 0.84).box(0.42, 0.55, 0.06).pop();
      b.color(0x6a4a2e).push().translate(0, 1.7, 0).rotZ(0.4).cyl(3, 0.03, 0.03, 0.35).pop().push().translate(0, 1.7, 0).rotZ(-0.4).cyl(3, 0.03, 0.03, 0.35).pop();
      return b.finish();
    },
    farm: function () {
      var b = ME.builder();
      b.color(0x6e4a30).push().translate(0, 0.01, 0).box(1.9, 0.06, 1.9).pop();
      b.color(0x5a3b26);
      for (var i = 0; i < 4; i++) b.push().translate(-0.7 + i * 0.47, 0.07, 0).box(0.18, 0.05, 1.8).pop();
      b.color(0x8a6440);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (p) { b.push().translate(p[0] * 0.98, 0, p[1] * 0.98).cyl(4, 0.04, 0.035, 0.35).pop(); });
      return b.finish();
    },
    crop: function () { // one crop plant; drawn in rows on farms, scaled by growth
      var b = ME.builder().sides(true).flex(1.5, 0);
      for (var i = 0; i < 4; i++) b.color(0x8fc85a, 1).push().rotY(i * 0.8).rotZ(0.25).leaf(0.07, 0.35).pop();
      b.sides(false).color(0xe8c45a, 1).push().translate(0, 0.38, 0).scale(0.04, 0.09, 0.04).sphere(0).pop();
      return b.finish();
    },
    totem: function () {
      var b = ME.builder();
      var cols = [0x9c6a3d, 0xb07ae0, 0xc5ff49, 0xff9f43];
      for (var i = 0; i < 4; i++) {
        b.color(cols[i]).push().translate(0, i * 0.42, 0).cyl(6, 0.24 - i * 0.02, 0.22 - i * 0.02, 0.4).pop();
        b.color(0x1a1a22).push().translate(0.07, i * 0.42 + 0.24, 0.21).scale(0.035).sphere(0).pop().push().translate(-0.07, i * 0.42 + 0.24, 0.21).scale(0.035).sphere(0).pop();
      }
      b.color(0xd9b86a).sides(true).push().translate(0, 1.4, 0).rotZ(1.2).leaf(0.25, 0.6).pop().push().translate(0, 1.4, 0).rotZ(-1.2).leaf(0.25, 0.6).pop();
      return b.finish();
    },
    grave: function () { // a little rounded headstone, a mound and a flower
      var b = ME.builder();
      b.color(0x7a5a3a, 1).push().translate(0, 0, 0.18).scale(0.32, 0.08, 0.4).sphere(1).pop();
      b.smoothShade(true).color(0x9d98a3).push().translate(0, 0.22, -0.18).scale(0.22, 0.26, 0.07).sphere(2).pop();
      b.push().translate(0, 0.1, -0.18).box(0.42, 0.22, 0.13).pop();
      b.smoothShade(false).color(0xff9cc8).glow(0.3).push().translate(0.16, 0.1, 0.25).scale(0.05).sphere(0).pop().glow(0);
      b.color(0x5fae4a).push().translate(0.16, 0.02, 0.25).cyl(3, 0.01, 0.01, 0.08).pop();
      return b.finish();
    },
    school: function () { // a long hut with a slate out front and a little flag
      var b = ME.builder();
      b.color(0xa8845a).push().scale(1.35, 1, 0.95).cyl(10, 0.95, 0.9, 0.8).pop();
      b.color(0xc9a05a, 1).push().translate(0, 0.75, 0).scale(1.35, 1, 0.95).cyl(10, 1.2, 0.05, 0.95).pop();
      b.color(0x2a1d14).push().translate(0, 0, 0.88).box(0.46, 0.58, 0.06).pop();
      b.color(0x6a4a2e).push().translate(0.9, 0, 1.05).cyl(4, 0.03, 0.03, 0.55).pop().push().translate(1.4, 0, 1.05).cyl(4, 0.03, 0.03, 0.55).pop();
      b.color(0x2e3b33).push().translate(1.15, 0.55, 1.05).box(0.62, 0.36, 0.04).pop();
      b.color(0xf5f3ed).push().translate(1.05, 0.6, 1.08).box(0.18, 0.02, 0.01).pop().push().translate(1.2, 0.52, 1.08).box(0.24, 0.02, 0.01).pop();
      b.color(0x6a4a2e).push().translate(-0.6, 1.2, 0).cyl(3, 0.025, 0.025, 1.0).pop();
      b.color(0xc5ff49, 1).sides(true).push().translate(-0.6, 2.05, 0).rotZ(-1.57).leaf(0.16, 0.32).pop().sides(false);
      return b.finish();
    },
    // places to find out in the fog (sites.js)
    site_wreck: function () { // another escape pod, nose-down in the dirt, hull cracked open
      var b = ME.builder();
      b.color(0x2e2826, 1).cyl(10, 1.3, 1.4, 0.02);
      b.smoothShade(true).color(0xb8b4c4, 1).push().translate(0.1, 0.25, 0).rotZ(1.05).rotY(0.3).scale(0.45, 0.7, 0.45).sphere(2).pop();
      b.color(0x5fc9c0, 1).push().translate(0.1, 0.25, 0).rotZ(1.05).rotY(0.3).scale(0.46, 0.1, 0.46).sphere(1).pop();
      b.smoothShade(false).color(0x9a96a8, 1);
      [[-0.9, 0.3, 0.6], [0.8, -0.6, -0.4], [-0.4, -0.9, 1.2], [0.95, 0.55, 2.1]].forEach(function (d) { b.push().translate(d[0], 0.05, d[1]).rotY(d[2]).rotZ(0.3).box(0.3, 0.05, 0.18).pop(); });
      b.color(0xff5fa2, 1).glow(0.8).push().translate(-0.25, 0.5, 0.25).scale(0.08).sphere(0).pop().glow(0);
      return b.finish();
    },
    site_ruin: function () { // standing stones, one fallen, carvings glowing faintly
      var b = ME.builder();
      b.color(0x6f6a7c);
      b.push().translate(-0.9, 0, 0).box(0.32, 1.25, 0.28).pop();
      b.push().translate(0.9, 0, 0).box(0.32, 1.1, 0.28).pop();
      b.push().translate(0, 1.2, 0).box(2.15, 0.26, 0.32).pop();
      b.push().translate(0.2, 0.1, 0.95).rotY(0.4).rotZ(1.57).box(0.3, 1.1, 0.28).pop();
      b.color(0x6a6474).push().translate(-0.5, 0, -0.8).scale(0.3, 0.2, 0.3).blob(0, 0.3, 4).pop();
      b.color(0xc5ff49, 1).glow(0.7).push().translate(-0.9, 0.7, 0.15).box(0.12, 0.12, 0.02).pop().push().translate(0.9, 0.6, 0.15).box(0.12, 0.12, 0.02).pop().glow(0);
      return b.finish();
    },
    site_camp: function () { // a ring of spikes, a lopsided tent, a smoky fire and a cage
      var b = ME.builder();
      b.color(0x3e2618);
      for (var i = 0; i < 12; i++) { var a = i / 12 * 6.283; b.push().translate(Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6).rotZ(Math.cos(a) * 0.25).rotX(-Math.sin(a) * 0.25).cyl(4, 0.07, 0.05, 0.8).translate(0, 0.8, 0).cone(4, 0.05, 0.14).pop(); }
      b.color(0x4a5a3a, 1).push().translate(-0.6, 0, -0.4).cyl(4, 0.75, 0.04, 1.1).pop();
      b.color(0x2a2522).push().translate(0.5, 0.03, -0.3).scale(0.28, 0.04, 0.28).sphere(0).pop();
      b.color(0xff9f43, 1).glow(0.9).push().translate(0.5, 0.15, -0.3).scale(0.12, 0.2, 0.12).sphere(0).pop().glow(0);
      b.color(0x3a3440);
      for (var j = 0; j < 6; j++) { var a2 = j / 6 * 6.283; b.push().translate(0.45 + Math.cos(a2) * 0.4, 0, 0.6 + Math.sin(a2) * 0.4).cyl(3, 0.025, 0.025, 0.7).pop(); }
      b.push().translate(0.45, 0.7, 0.6).cyl(6, 0.45, 0.45, 0.05).pop();
      return b.finish();
    },
    site_campdone: function () { // a smashed camp: fallen spikes, an open cage
      var b = ME.builder();
      b.color(0x5a3b26);
      for (var i = 0; i < 7; i++) { var a = i / 7 * 6.283 + 0.3; b.push().translate(Math.cos(a) * 1.5, 0.05, Math.sin(a) * 1.5).rotY(a).rotZ(1.45).cyl(4, 0.06, 0.05, 0.7).pop(); }
      b.color(0x2a2522).push().translate(0.5, 0.02, -0.3).scale(0.3, 0.03, 0.3).sphere(0).pop();
      b.color(0x3a3440);
      for (var j = 0; j < 3; j++) b.push().translate(0.4 + j * 0.2, 0.03, 0.6).rotZ(1.5).cyl(3, 0.025, 0.025, 0.6).pop();
      return b.finish();
    },
    wall: function () {
      var b = ME.builder().color(0x8a6440);
      for (var i = 0; i < 6; i++) b.push().translate(-0.75 + i * 0.3, 0, 0).cyl(5, 0.1, 0.08, 0.8 + (i % 2) * 0.12).translate(0, 0.8 + (i % 2) * 0.12, 0).cone(5, 0.08, 0.15).pop();
      b.color(0x6a4a2e).push().translate(0, 0.5, 0).rotZ(1.57).translate(0, -0.85, 0).cyl(4, 0.04, 0.04, 1.7).pop();
      return b.finish();
    },
    kiln: function () {
      var b = ME.builder();
      b.color(0xa85f3d).push().scale(0.8, 1.0, 0.8).sphere(1, function (x, y) { return y < 0 ? 0.1 : 1; }).pop();
      b.color(0x1a1210).push().translate(0, 0.2, 0.72).scale(0.25, 0.22, 0.1).sphere(0).pop();
      b.color(0x8a4a2d).push().translate(0, 0.85, 0).cyl(6, 0.18, 0.14, 0.4).pop();
      return b.finish();
    },
    workshop: function () {
      var b = ME.builder();
      b.color(0x8a6440);
      [[-0.9, -0.6], [0.9, -0.6], [0.9, 0.6], [-0.9, 0.6]].forEach(function (p) { b.push().translate(p[0], 0, p[1]).cyl(4, 0.06, 0.06, 1.2).pop(); });
      b.color(0xc9a05a, 1).push().translate(0, 1.2, 0).box(2.1, 0.08, 1.5).pop();
      b.color(0x9c7a4a).push().translate(0, 0.45, 0).box(1.3, 0.08, 0.6).pop();
      b.color(0x8e8a96).push().translate(0.3, 0.55, 0).scale(0.12).blob(0, 0.3, 1).pop();
      return b.finish();
    },
    windmill: function () {
      var b = ME.builder();
      b.color(0xe8e2d6).cyl(8, 0.7, 0.45, 2.4);
      b.color(0xb0603a, 1).push().translate(0, 2.4, 0).cone(8, 0.62, 0.7).pop();
      return b.finish();
    },
    blades: function () {
      var b = ME.builder().sides(true).color(0xf5f3ed);
      for (var i = 0; i < 4; i++) b.push().rotZ(i * 1.5708).translate(0.12, 0, 0).quad([0, -0.06, 0], [1.3, -0.12, 0], [1.3, 0.18, 0], [0, 0.06, 0]).pop();
      return b.finish();
    },
    observatory: function () {
      var b = ME.builder();
      b.color(0xd9d4cc).cyl(10, 1.0, 0.95, 1.2);
      b.color(0xb59aff, 1).push().translate(0, 1.2, 0).scale(1.0, 0.85, 1.0).sphere(2, function (x, y) { return y < 0 ? 0.05 : 1; }).pop();
      b.color(0x1a1a22).push().translate(0, 1.55, 0.55).rotX(0.9).box(0.3, 0.7, 0.12).pop();
      b.color(0x8a8590).push().translate(0, 1.7, 0.6).rotX(0.9).cyl(6, 0.08, 0.06, 0.9).pop();
      return b.finish();
    },
    bridge: function () {
      var b = ME.builder().color(0x9c7a4a);
      for (var i = 0; i < 9; i++) b.push().translate(0, 0.25, -1.6 + i * 0.4).box(1.2, 0.08, 0.36).pop();
      b.color(0x6a4a2e);
      [-0.6, 0.6].forEach(function (x) { b.push().translate(x, 0.6, 0).rotX(1.5708).translate(0, -1.8, 0).cyl(4, 0.04, 0.04, 3.6).pop(); for (var k = 0; k < 4; k++) b.push().translate(x, -0.6, -1.6 + k * 1.07).cyl(4, 0.06, 0.06, 1.25).pop(); });
      return b.finish();
    },
    spire: function () { // the Big Thought: a crystal spire that grows as it's built
      var b = ME.builder();
      b.color(0x3a3550).cyl(8, 2.0, 1.6, 0.8);
      b.color(0xb59aff, 1).push().translate(0, 0.8, 0).cyl(8, 1.3, 0.6, 5.0).pop();
      b.color(C.crystal).glow(0.8).push().translate(0, 5.8, 0).cyl(6, 0.6, 0.6, 1.2, false).translate(0, 1.2, 0).cone(6, 0.6, 1.8).pop();
      b.color(0xc5ff49).glow(1);
      for (var i = 0; i < 6; i++) { var a = i * 1.047; b.push().translate(Math.cos(a) * 1.0, 3.0, Math.sin(a) * 1.0).scale(0.16).sphere(1).pop(); }
      return b.finish();
    },
    // from village to city
    stall: function () { // a counter under a striped awning on four poles
      var b = ME.builder();
      b.color(0x8a6440).push().translate(0, 0, 0.1).box(1.1, 0.45, 0.5).pop();
      b.color(0xb08a5a).push().translate(0, 0.45, 0.1).box(1.2, 0.05, 0.6).pop();
      b.color(0x6a4a2e);
      [[-0.55, -0.3], [0.55, -0.3], [-0.55, 0.45], [0.55, 0.45]].forEach(function (p) { b.push().translate(p[0], 0, p[1]).cyl(4, 0.03, 0.03, 1.15).pop(); });
      for (var i = 0; i < 5; i++) b.color(i % 2 ? 0xf5f3ed : 0xe5484d, 1).push().translate(-0.5 + i * 0.25, 1.15, 0.08).rotX(0.25).box(0.25, 0.04, 0.95).pop();
      b.color(0xe8c45a, 1).push().translate(-0.25, 0.5, 0.15).scale(0.09).sphere(0).pop().push().translate(0, 0.5, 0.2).scale(0.08).sphere(0).pop();
      b.color(0xe5484d, 1).push().translate(0.25, 0.5, 0.12).scale(0.09).sphere(0).pop();
      return b.finish();
    },
    house: function () { // stone walls, a tiled roof, a chimney and a window
      var b = ME.builder();
      b.color(0xb8ad9c).push().box(1.6, 0.95, 1.3).pop();
      b.color(0x8f8577).push().translate(0, 0, 0).box(1.66, 0.12, 1.36).pop();
      b.color(0xb4573a, 1);
      b.push().translate(0, 0.95, -0.36).rotX(0.62).box(1.8, 0.07, 0.95).pop();
      b.push().translate(0, 0.95, 0.36).rotX(-0.62).box(1.8, 0.07, 0.95).pop();
      b.color(0xa8a094).push().translate(0, 0.95, 0).cyl(3, 0.65, 0.01, 0.5).pop();
      b.color(0x7a7268).push().translate(0.5, 1.0, -0.2).box(0.2, 0.6, 0.2).pop();
      b.color(0x3a2a1c).push().translate(-0.35, 0, 0.66).box(0.36, 0.6, 0.04).pop();
      b.color(0x2a3550).push().translate(0.38, 0.45, 0.66).box(0.34, 0.28, 0.03).pop();
      return b.finish();
    },
    hall: function () { // a stone hall with columns, steps and a pediment
      var b = ME.builder();
      b.color(0xcfc6b4).push().box(2.4, 0.12, 1.9).pop().push().translate(0, 0.12, 0).box(2.2, 0.1, 1.7).pop();
      b.color(0xd9d0be).push().translate(0, 0.22, -0.2).box(2.0, 1.2, 1.1).pop();
      b.color(0xe6dfcf);
      for (var i = 0; i < 5; i++) b.push().translate(-0.9 + i * 0.45, 0.22, 0.65).cyl(6, 0.09, 0.08, 1.2).pop();
      b.color(0xcfc6b4).push().translate(0, 1.42, 0.05).box(2.3, 0.14, 1.6).pop();
      b.color(0x9a8f7c, 1).push().translate(0, 1.56, 0.05).scale(1.25, 1, 0.85).cyl(4, 0.95, 0.01, 0.55).pop();
      b.color(0x3a2a1c).push().translate(0, 0.22, 0.36).box(0.42, 0.75, 0.04).pop();
      b.color(0xc5ff49, 1).sides(true).push().translate(0.95, 2.1, 0.05).rotZ(-1.57).leaf(0.14, 0.3).pop().sides(false);
      b.color(0x6a4a2e).push().translate(0.95, 1.56, 0.05).cyl(3, 0.02, 0.02, 0.6).pop();
      return b.finish();
    },
    mint: function () { // a squat stone workshop with a furnace glow and a stack of coins
      var b = ME.builder();
      b.color(0x8f8a96).push().box(1.4, 0.8, 1.1).pop();
      b.color(0x6a6474, 1).push().translate(0, 0.8, 0).scale(1.1, 1, 0.85).cyl(4, 0.95, 0.4, 0.3).pop();
      b.color(0x5a5560).push().translate(-0.4, 1.0, 0).cyl(6, 0.14, 0.12, 0.6).pop();
      b.color(0xff8a2a, 1).glow(0.9).push().translate(0.3, 0.15, 0.56).box(0.36, 0.26, 0.02).pop().glow(0);
      b.color(0xe08a4a, 1).glow(0.3);
      for (var i = 0; i < 4; i++) b.push().translate(-0.3, i * 0.05, 0.75).cyl(8, 0.1, 0.1, 0.04).pop();
      b.glow(0);
      return b.finish();
    },
    granary: function () { // a round store on stilts with a conical thatched roof
      var b = ME.builder();
      b.color(0x6a4a2e);
      for (var i = 0; i < 4; i++) { var a = i / 4 * 6.283 + 0.4; b.push().translate(Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55).cyl(4, 0.06, 0.06, 0.5).pop(); }
      b.color(0xc9a97a).push().translate(0, 0.5, 0).cyl(10, 0.75, 0.8, 0.9).pop();
      b.color(0xd9b86a, 1).push().translate(0, 1.4, 0).cyl(10, 0.95, 0.04, 0.8).pop();
      b.color(0x3a2a1c).push().translate(0, 0.7, 0.78).box(0.26, 0.4, 0.04).pop();
      return b.finish();
    },
    road: function () { return ME.builder().color(0xffffff, 1).push().box(1.02, 0.03, 1.02).pop().finish(); }, // one tile of trail or paving, tinted per kind
    winglow: function () { return ME.builder().color(0xffd27a, 1).glow(1.3).push().box(0.3, 0.24, 0.02).pop().finish(); }, // a lit window
    plot: function () { // construction site
      var b = ME.builder();
      b.color(0xc5ff49).glow(0.4);
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(function (p) { b.push().translate(p[0] * 0.8, 0, p[1] * 0.8).cyl(4, 0.035, 0.03, 0.4).pop(); });
      b.glow(0).color(0x8a6440).push().translate(0, 0.01, 0).box(1.6, 0.02, 1.6).pop();
      return b.finish();
    }
  };

  /* ---------------- decorations ---------------- */
  ME.DECOR_BUILDERS = [
    function grass() { var b = ME.builder().sides(true).flex(3, 0); for (var i = 0; i < 4; i++) b.color(i % 2 ? 0x7fcf5f : 0x6aba50, 1).push().rotY(i * 0.8).rotZ((i - 1.5) * 0.25).leaf(0.05, 0.22 + (i % 2) * 0.08).pop(); return b.finish(); },
    function flower() {
      var b = ME.builder().flex(3, 0); b.sides(true).color(0x6aba50, 1).leaf(0.03, 0.22); b.sides(false);
      b.color(0xffffff, 1); for (var i = 0; i < 5; i++) b.push().translate(0, 0.22, 0).rotY(i * 1.2566).translate(0.04, 0, 0).scale(0.035, 0.012, 0.025).sphere(0).pop();
      b.color(0xffd23f).push().translate(0, 0.23, 0).scale(0.022).sphere(0).pop(); return b.finish();
    },
    function pebble() { var b = ME.builder().color(0x8a8590, 1); b.push().translate(0, 0.02, 0).scale(0.08, 0.05, 0.07).blob(0, 0.3, 1).pop(); return b.finish(); },
    function fern() { var b = ME.builder().sides(true).flex(2, 0); for (var i = 0; i < 5; i++) b.color(0x3f8a3a, 1).push().rotY(i * 1.2566).rotX(1.0).leaf(0.12, 0.38, -0.08).pop(); return b.finish(); },
    function snowtuft() { var b = ME.builder().color(0xf5f8fc); b.push().translate(0, 0.02, 0).scale(0.16, 0.06, 0.14).blob(0, 0.3, 2).pop(); return b.finish(); },
    function cattail() { var b = ME.builder().sides(true).flex(2, 0).color(0x7f9e48, 1); b.leaf(0.04, 0.5).push().rotY(1).leaf(0.04, 0.42).pop(); b.sides(false).color(0x6a4a2e).push().translate(0, 0.5, 0).scale(0.025, 0.07, 0.025).sphere(0).pop(); return b.finish(); },
    function glowdot() { var b = ME.builder().color(0x9fe4ff, 1).glow(0.9); b.push().translate(0, 0.05, 0).scale(0.04).sphere(0).pop(); b.color(0xe8e0d0).glow(0).cyl(3, 0.008, 0.008, 0.05); return b.finish(); }
  ];

  /* ---------------- creature parts ---------------- */
  ME.PARTS = {
    body: function () { return ME.builder().smoothShade(true).color(0xffffff, 1).sphere(2).finish(); },
    ball: function () { return ME.builder().smoothShade(true).color(0xffffff, 1).sphere(1).finish(); },
    eye: function () { // white ball with a dark pupil and a sparkle, looking +z
      var b = ME.builder().smoothShade(true);
      b.color(0xffffff, 1).sphere(1);
      b.color(0x14131a).push().translate(0, 0, 0.62).scale(0.62, 0.66, 0.45).sphere(1).pop();
      b.color(0xffffff).glow(1).push().translate(0.18, 0.2, 0.93).scale(0.17).sphere(0).pop();
      return b.finish();
    },
    cone: function () { return ME.builder().color(0xffffff, 1).cone(7, 1, 1).finish(); },
    limb: function () { var b = ME.builder().smoothShade(true).color(0xffffff, 1); b.cyl(6, 1, 0.8, 1, false); b.push().translate(0, 1, 0).scale(0.8).sphere(0).pop(); return b.finish(); },
    leaf: function () { return ME.builder().sides(true).color(0xffffff, 1).leaf(1, 1, 0.15).finish(); },
    ring: function () { return ME.builder().smoothShade(true).color(0xffffff, 1).torus(1, 0.12, 16, 5).finish(); },
    halo: function () { return ME.builder().smoothShade(true).color(0xffffff, 1).glow(1).torus(1, 0.12, 16, 5).finish(); },
    disc: function () { var b = ME.builder().color(0xffffff, 1); b.cyl(24, 1, 1, 0.02, true); return b.finish(); },
    brain: function () { var b = ME.builder().color(0xffffff, 1); b.push().scale(1, 0.75, 1.1).blob(2, 0.18, 7).pop(); b.color(0xd06a8a, 1).push().translate(0, 0.62, 0).scale(0.06, 0.18, 1.0).sphere(1).pop(); return b.finish(); },
    mouth: function () { return ME.builder().color(0x3a1520).push().scale(1, 0.55, 0.4).sphere(0).pop().finish(); },
    shadow: null // drawn by the blob-shadow pass
  };
})();
