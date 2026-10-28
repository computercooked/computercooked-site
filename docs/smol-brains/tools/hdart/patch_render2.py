import sys
p = sys.argv[1]
s = open(p).read()


def rep(a, b, cnt=1):
    global s
    assert s.count(a) == cnt, (a, s.count(a))
    s = s.replace(a, b)


rep('''  var W = 1, H = 1, dpr = 1, quality = { scale: 1, decor: true, lights: 8 };''',
    '''  var W = 1, H = 1, dpr = 1, quality = { scale: 1, decor: true, lights: 8 };
  var BW = 1, BH = 1; // the 3D scene's buffer size (= the canvas, except in the hd look, where the canvas is full resolution)''')

rep('''    var w = canvas.width, h = canvas.height;
    if (post && post.w === w && post.h === h) return post;''', '''    var w = BW, h = BH;
    if (post && post.w === w && post.h === h) return post;''')
rep('''  function drawPost(P) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);''', '''  function drawPost(P) {
    // hd look: the outlined picture goes to one more buffer, and hd.js blurs, blooms and grades it onto the canvas
    var hdT = R.hd && SB.HD ? SB.HD.target(ctx, P) : null;
    gl.bindFramebuffer(gl.FRAMEBUFFER, hdT);
    gl.viewport(0, 0, P.w, P.h);''')
rep('''    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE0);
    gl.enable(gl.DEPTH_TEST);
  }''', '''    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.activeTexture(gl.TEXTURE0);
    if (hdT) SB.HD.post(ctx, P, env, cam, canvas);
    gl.enable(gl.DEPTH_TEST);
  }''')

rep('''    R.pixel = opts.pixel !== false;
    canvas.classList.toggle("pixel", R.pixel);''', '''    R.pixel = opts.pixel !== false;
    R.hd = !!(opts.hd && R.pixel && SB.HD); // the hd pixel look (hd.js) builds on the pixel look
    canvas.classList.toggle("pixel", R.pixel);''')
rep('''    progs.terrain = GL.program(ctx, VS_TERRAIN, FS_TERRAIN);
    progs.obj = GL.program(ctx, VS_OBJ, FS_OBJ);
    progs.water = GL.program(ctx, VS_WATER, FS_WATER);''', '''    var def = R.hd ? "#define HD\\n" : "";
    progs.terrain = GL.program(ctx, def + VS_TERRAIN, def + FS_TERRAIN);
    progs.obj = GL.program(ctx, def + VS_OBJ, def + FS_OBJ);
    progs.water = GL.program(ctx, def + VS_WATER, def + FS_WATER);''')
rep('''    art.blank = GL.texture(ctx, 1, 1, new Uint8Array([128, 128, 128, 255]), { nearest: true });
    buildMeshes();''', '''    art.blank = GL.texture(ctx, 1, 1, new Uint8Array([128, 128, 128, 255]), { nearest: true });
    if (R.hd) SB.HD.init(ctx); // starts loading the hd art (nothing is fetched in the other looks)
    buildMeshes();''')
rep('''    quality.lowEnd = lowEnd;
    R.resize();''', '''    quality.lowEnd = lowEnd;
    if (quality.fx == null) quality.fx = !lowEnd; // hd look: depth of field and bloom (off on weak phones)
    R.resize();''')
rep('''    canvas.addEventListener("webglcontextrestored", function () { R.lost = false; post = null; R.init(canvas, overlay, { pixel: R.pixel }); if (game) R.setWorld(game); }, false);''',
    '''    canvas.addEventListener("webglcontextrestored", function () { R.lost = false; post = null; R.init(canvas, overlay, { pixel: R.pixel, hd: R.hd }); if (game) R.setWorld(game); }, false);''')

rep('''    if (R.pixel) {
      // whole CSS pixels per art pixel, so every art pixel is the same size on screen
      R.pixelSize = Math.max(2, Math.round(Math.min(W, H) / 240));
      dpr = 1 / R.pixelSize;
    } else dpr = Math.min(window.devicePixelRatio || 1, 2) * quality.scale;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);''', '''    if (R.pixel) {
      // whole CSS pixels per art pixel, so every art pixel is the same size on screen (a little finer in hd)
      R.pixelSize = Math.max(2, Math.round(Math.min(W, H) / (R.hd ? SB.HD.ROWS : 240)));
      dpr = 1 / R.pixelSize;
    } else dpr = Math.min(window.devicePixelRatio || 1, 2) * quality.scale;
    BW = Math.round(W * dpr); BH = Math.round(H * dpr);
    if (R.hd && quality.fx) { // the soft blur needs real screen pixels; the art itself stays on its grid
      var cd = Math.min(window.devicePixelRatio || 1, 2) * (quality.max || 1);
      canvas.width = Math.round(W * cd); canvas.height = Math.round(H * cd);
    } else { canvas.width = BW; canvas.height = BH; }''')

rep('''  function upload(m) { return { buf: GL.buffer(ctx, m.data), count: m.count, minY: m.minY, maxY: m.maxY, rad: m.rad }; }
  function buildMeshes() {
    meshes = {};''', '''  function upload(m, key) {
    var u = { buf: GL.buffer(ctx, m.data), count: m.count, minY: m.minY, maxY: m.maxY, rad: m.rad };
    if (R.hd) u.mat = GL.buffer(ctx, SB.HD.materials(key, m.data, m.count, STRIDE)); // which hd tile each vertex wears
    return u;
  }
  function buildMeshes() {
    meshes = {};''')
rep('''    for (k in ME.NODE_BUILDERS) for (v = 0; v < 3; v++) meshes["n:" + k + ":" + v] = upload(ME.NODE_BUILDERS[k](v * 3.7 + 1));
    meshes["n:stump"] = upload(ME.stump());
    meshes["n:burnt"] = upload(ME.burnt());
    for (k in SB.KINDS) meshes["i:" + k] = upload(ME.itemMesh(k));
    meshes["i:pod"] = upload(ME.podMesh());
    for (k in ME.STRUCT_BUILDERS) meshes["s:" + k] = upload(ME.STRUCT_BUILDERS[k]());
    for (v = 0; v < ME.DECOR_BUILDERS.length; v++) meshes["d:" + v] = upload(ME.DECOR_BUILDERS[v]());
    for (k in ME.PARTS) if (ME.PARTS[k]) meshes["p:" + k] = upload(ME.PARTS[k]());
    if (ME.extraMeshes) { var ex = ME.extraMeshes(); for (k in ex) meshes[k] = upload(ex[k]); }''', '''    for (k in ME.NODE_BUILDERS) for (v = 0; v < 3; v++) meshes["n:" + k + ":" + v] = upload(ME.NODE_BUILDERS[k](v * 3.7 + 1), "n:" + k);
    meshes["n:stump"] = upload(ME.stump(), "n:stump");
    meshes["n:burnt"] = upload(ME.burnt(), "n:burnt");
    for (k in SB.KINDS) meshes["i:" + k] = upload(ME.itemMesh(k), "i:" + k);
    meshes["i:pod"] = upload(ME.podMesh(), "i:pod");
    for (k in ME.STRUCT_BUILDERS) meshes["s:" + k] = upload(ME.STRUCT_BUILDERS[k](), "s:" + k);
    for (v = 0; v < ME.DECOR_BUILDERS.length; v++) meshes["d:" + v] = upload(ME.DECOR_BUILDERS[v](), "d:" + v);
    for (k in ME.PARTS) if (ME.PARTS[k]) meshes["p:" + k] = upload(ME.PARTS[k](), "p:" + k);
    if (ME.extraMeshes) { var ex = ME.extraMeshes(); for (k in ex) meshes[k] = upload(ex[k], k); }''')

rep('''    c.povK = canvas.height / (2 * Math.tan((p.fov || 1.22) / 2)); // canvas px per world unit at distance 1''',
    '''    c.povK = BH / (2 * Math.tan((p.fov || 1.22) / 2)); // buffer px per world unit at distance 1''')
rep('''    if (!cam.pov) return canvas.height / (2 * cam.halfH);''', '''    if (!cam.pov) return BH / (2 * cam.halfH);''')
rep('''    var P = ensurePost();
    gl.bindFramebuffer(gl.FRAMEBUFFER, P ? P.fb : null);
    gl.viewport(0, 0, canvas.width, canvas.height);''', '''    var P = ensurePost();
    gl.bindFramebuffer(gl.FRAMEBUFFER, P ? P.fb : null);
    gl.viewport(0, 0, BW, BH);''')
rep('''  R.canvasSize = function () { return { w: canvas.width, h: canvas.height }; };
  R.canvasScale = function () { return canvas ? canvas.width / W : 1; };''', '''  R.canvasSize = function () { return { w: BW, h: BH }; }; // the scene buffer (sprites snap to its pixels)
  R.canvasScale = function () { return canvas ? BW / W : 1; };''')

rep('''    if (SB.Threats && SB.Threats.env) SB.Threats.env(env); // disasters tint the sky''', '''    if (R.hd) SB.HD.env(env); // hd look: warmer sun, cooler shadows
    if (SB.Threats && SB.Threats.env) SB.Threats.env(env); // disasters tint the sky''')

rep('''    gl.uniformMatrix4fv(p.u.uVP, false, VP);
  }

  function drawTerrain(vis) {''', '''    gl.uniformMatrix4fv(p.u.uVP, false, VP);
    if (p.u.uHdK) SB.HD.uniforms(gl, p, cam, BH);
  }

  function drawTerrain(vis) {''')

rep('''    GL.attribs(ctx, m.buf, [[p.a.aPos, 3], [p.a.aNrm, 3], [p.a.aCol, 4], [p.a.aExt, 2]], STRIDE, 0);
    GL.attribs(ctx, buf, [[p.a.iM0, 4], [p.a.iM1, 4], [p.a.iM2, 4], [p.a.iTint, 4], [p.a.iExt, 4]], ISTRIDE, 1);''', '''    GL.attribs(ctx, m.buf, [[p.a.aPos, 3], [p.a.aNrm, 3], [p.a.aCol, 4], [p.a.aExt, 2]], STRIDE, 0);
    if (m.mat && p.a.aMat != null) GL.attribs(ctx, m.mat, [[p.a.aMat, 1]], 1, 0);
    GL.attribs(ctx, buf, [[p.a.iM0, 4], [p.a.iM1, 4], [p.a.iM2, 4], [p.a.iTint, 4], [p.a.iExt, 4]], ISTRIDE, 1);''')
open(p, 'w').write(s)
print("ok")
