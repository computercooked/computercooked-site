/* A tiny QR code maker for short links (the "play on your phone" button in games/player.js loads it on first use).
   Byte mode, error correction level L, versions 1 to 5 (up to 106 bytes), mask 0. Follows the QR spec as laid out in
   Project Nayuki's reference encoder (MIT). window.ccQr(text) returns an SVG string (dark modules on white, with the
   4-module quiet zone), or null if the text is too long. Nothing is sent anywhere: the picture is drawn here. */
(function () {
  "use strict";
  var DATA = [0, 19, 34, 55, 80, 108], EC = [0, 7, 10, 15, 20, 26]; // per version, level L, one block each

  function mul(x, y) { // multiply in GF(2^8) mod x^8 + x^4 + x^3 + x^2 + 1
    var z = 0;
    for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
    return z;
  }
  function divisor(n) {
    var r = []; for (var i = 0; i < n - 1; i++) r.push(0); r.push(1);
    var root = 1;
    for (i = 0; i < n; i++) {
      for (var j = 0; j < r.length; j++) { r[j] = mul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = mul(root, 2);
    }
    return r;
  }
  function remainder(data, div) {
    var r = div.map(function () { return 0; });
    data.forEach(function (b) {
      var f = b ^ r.shift(); r.push(0);
      for (var i = 0; i < div.length; i++) r[i] ^= mul(div[i], f);
    });
    return r;
  }
  function utf8(s) {
    var out = [], e = unescape(encodeURIComponent(s));
    for (var i = 0; i < e.length; i++) out.push(e.charCodeAt(i));
    return out;
  }

  window.ccQr = function (text) {
    var bytes = utf8(String(text)), ver = 1;
    while (ver <= 5 && 4 + 8 + bytes.length * 8 > DATA[ver] * 8) ver++;
    if (ver > 5) return null;
    // the bit stream: byte mode, the length, the bytes, a terminator, then pad bytes
    var bits = [];
    function put(v, n) { for (var i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); }
    put(4, 4); put(bytes.length, 8); bytes.forEach(function (b) { put(b, 8); });
    var cap = DATA[ver] * 8;
    put(0, Math.min(4, cap - bits.length));
    put(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8);
    var data = [];
    for (var i = 0; i < bits.length; i += 8) { var v = 0; for (var k = 0; k < 8; k++) v = (v << 1) | bits[i + k]; data.push(v); }
    var words = data.concat(remainder(data, divisor(EC[ver])));

    var size = ver * 4 + 17, mod = [], fn = [];
    for (var y = 0; y < size; y++) { mod.push([]); fn.push([]); for (var x = 0; x < size; x++) { mod[y].push(false); fn[y].push(false); } }
    function set(x, y, dark) { mod[y][x] = dark; fn[y][x] = true; }
    for (i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); } // timing lines
    [[3, 3], [size - 4, 3], [3, size - 4]].forEach(function (c) { // finder squares with their white borders
      for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = c[0] + dx, yy = c[1] + dy;
        if (xx >= 0 && xx < size && yy >= 0 && yy < size) set(xx, yy, d !== 2 && d !== 4);
      }
    });
    if (ver > 1) { // the one alignment square versions 2 to 5 have
      var a = size - 7;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) set(a + dx2, a + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
    }
    // format bits: level L (01), mask 0, BCH-protected, written twice
    var fmt = 1 << 3, rem = fmt;
    for (i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
    var fb = ((fmt << 10) | rem) ^ 0x5412;
    function bit(n) { return ((fb >>> n) & 1) !== 0; }
    for (i = 0; i <= 5; i++) set(8, i, bit(i));
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
    for (i = 9; i < 15; i++) set(14 - i, 8, bit(i));
    for (i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
    for (i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
    set(8, size - 8, true);
    // the codewords, two columns at a time in a zigzag from the bottom right, then mask 0
    var n = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var j = 0; j < 2; j++) {
        var cx = right - j, up = ((right + 1) & 2) === 0, cy = up ? size - 1 - vert : vert;
        if (!fn[cy][cx] && n < words.length * 8) { mod[cy][cx] = ((words[n >>> 3] >>> (7 - (n & 7))) & 1) !== 0; n++; }
      }
    }
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (!fn[y][x] && (x + y) % 2 === 0) mod[y][x] = !mod[y][x];

    var q = 4, full = size + q * 2, path = "";
    for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (mod[y][x]) path += "M" + (x + q) + " " + (y + q) + "h1v1h-1z";
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + full + " " + full + '" shape-rendering="crispEdges" role="img" aria-label="QR code">' +
      '<rect width="' + full + '" height="' + full + '" fill="#fff"/><path d="' + path + '" fill="#000"/></svg>';
  };
})();
