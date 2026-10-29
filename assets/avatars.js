/* CRASH-style avatars, shared by /me, /u/ and the hub. ccAvatar(key) -> SVG string.
   key is a preset ("lime", "lilac", ...) or a built one: "x:<mood>-<face color>-<body color>-<accessory>",
   e.g. "x:happy-2-0-cap" (the server accepts the same format; see AVATAR_RE in src/auth.js). */
(function () {
  var A = {
    lime:   { screen: "#1a2b1a", face: "#C5FF49", body: "#d8ccab", mood: "tired" },
    lilac:  { screen: "#221a33", face: "#B59AFF", body: "#d8ccab", mood: "happy" },
    paper:  { screen: "#1d1e22", face: "#F5F3ED", body: "#bfb18c", mood: "flat" },
    hot:    { screen: "#3a1414", face: "#ff8a7d", body: "#d8ccab", mood: "angry" },
    ice:    { screen: "#10242e", face: "#5bc8ff", body: "#e6e1d3", mood: "happy" },
    cooked: { screen: "#2a1a10", face: "#ffb84d", body: "#c9b98f", mood: "x" }
  };
  // builder palettes: face colors come with a matching dark screen
  var MOODS = ["tired", "happy", "flat", "angry", "x", "smug", "shock", "sleepy", "wink"];
  var FACES = [["#C5FF49", "#1a2b1a"], ["#B59AFF", "#221a33"], ["#F5F3ED", "#1d1e22"], ["#ff8a7d", "#3a1414"],
               ["#5bc8ff", "#10242e"], ["#ffb84d", "#2a1a10"], ["#ff6bd6", "#2e1029"], ["#7dffb0", "#10291d"],
               ["#B8F23A", "#16200a"], ["#E8D9B5", "#1d1a12"], ["#FF5A4E", "#2e1110"], ["#9ad1ff", "#0f1c2b"]];
  var BODIES = ["#d8ccab", "#bfb18c", "#e6e1d3", "#3a3c44", "#8f7cff", "#5a4332", "#2a2d34"];
  var ACCS = ["none", "headphones", "cap", "witch", "bow", "glasses", "steam", "antenna", "crown", "halo", "flames", "chef",
              "beanie", "shades", "party", "bandana", "tophat", "horns", "visor", "wizard"];

  function eyes(m, c) {
    if (m === "smug") return '<path d="M19 25h8M37 25h8" stroke="' + c + '" stroke-width="3"/><rect x="22" y="26" width="5" height="3" fill="' + c + '"/><rect x="40" y="26" width="5" height="3" fill="' + c + '"/>';
    if (m === "shock") return '<rect x="19" y="21" width="8" height="8" fill="none" stroke="' + c + '" stroke-width="2.5"/><rect x="37" y="21" width="8" height="8" fill="none" stroke="' + c + '" stroke-width="2.5"/><rect x="22" y="24" width="2" height="2" fill="' + c + '"/><rect x="40" y="24" width="2" height="2" fill="' + c + '"/>';
    if (m === "sleepy") return '<path d="M19 26q4 3 8 0M37 26q4 3 8 0" fill="none" stroke="' + c + '" stroke-width="3"/><path d="M48 12h5l-5 5h5" fill="none" stroke="' + c + '" stroke-width="1.5"/>';
    if (m === "wink") return '<rect x="19" y="23" width="8" height="5" fill="' + c + '"/><path d="M37 27q4-4 8 0" fill="none" stroke="' + c + '" stroke-width="3"/>';
    if (m === "x") return '<path d="M20 22l6 6m0-6l-6 6M38 22l6 6m0-6l-6 6" stroke="' + c + '" stroke-width="3"/>';
    if (m === "angry") return '<path d="M19 22l8 4M45 22l-8 4" stroke="' + c + '" stroke-width="3"/><rect x="20" y="27" width="6" height="3" fill="' + c + '"/><rect x="38" y="27" width="6" height="3" fill="' + c + '"/>';
    if (m === "happy") return '<path d="M19 27q4-5 8 0M37 27q4-5 8 0" fill="none" stroke="' + c + '" stroke-width="3"/>';
    if (m === "flat") return '<rect x="19" y="25" width="8" height="3" fill="' + c + '"/><rect x="37" y="25" width="8" height="3" fill="' + c + '"/>';
    return '<rect x="19" y="24" width="8" height="4" fill="' + c + '"/><rect x="37" y="24" width="8" height="4" fill="' + c + '"/><rect x="18" y="21" width="10" height="2" fill="' + c + '"/><rect x="36" y="21" width="10" height="2" fill="' + c + '"/>';
  }
  function mouth(m, c) {
    if (m === "smug" || m === "wink") return '<path d="M26 37q8 3 12-3" fill="none" stroke="' + c + '" stroke-width="3"/>';
    if (m === "shock") return '<rect x="29" y="34" width="6" height="6" fill="none" stroke="' + c + '" stroke-width="2.5"/>';
    if (m === "sleepy") return '<rect x="28" y="36" width="8" height="2" fill="' + c + '"/>';
    if (m === "happy") return '<path d="M26 36q6 5 12 0" fill="none" stroke="' + c + '" stroke-width="3"/>';
    if (m === "angry" || m === "x") return '<path d="M25 38q3-3 6 0t6 0" fill="none" stroke="' + c + '" stroke-width="3"/>';
    return '<rect x="26" y="36" width="12" height="3" fill="' + c + '"/>';
  }
  function acc(k, c) {
    if (k === "headphones") return '<path d="M8 26q0-24 24-24t24 24" fill="none" stroke="#2a2c33" stroke-width="4"/><rect x="2" y="22" width="8" height="14" rx="3" fill="#2a2c33"/><rect x="50" y="22" width="8" height="14" rx="3" fill="#2a2c33"/>';
    if (k === "cap") return '<path d="M10 10q22-14 44 0v2H10z" fill="' + c + '"/><rect x="4" y="9" width="30" height="4" rx="2" fill="' + c + '"/>';
    if (k === "witch") return '<path d="M18 9 L34 -8 L44 9z" fill="#2a1a33"/><rect x="8" y="7" width="48" height="4" rx="2" fill="#2a1a33"/><rect x="22" y="5" width="20" height="3" fill="#ffb84d"/>';
    if (k === "bow") return '<path d="M44 6l8-6v14zM44 6l-8-6v14z" fill="#ff6bd6"/><rect x="42" y="4" width="4" height="6" fill="#ff6bd6"/>';
    if (k === "glasses") return '<rect x="16" y="20" width="14" height="11" rx="2" fill="none" stroke="#F5F3ED" stroke-width="2"/><rect x="34" y="20" width="14" height="11" rx="2" fill="none" stroke="#F5F3ED" stroke-width="2"/><rect x="30" y="24" width="4" height="2" fill="#F5F3ED"/>';
    if (k === "antenna") return '<rect x="31" y="-2" width="2" height="10" fill="#3a3c44"/><circle cx="32" cy="-4" r="3.5" fill="' + c + '"/>';
    if (k === "crown") return '<path d="M16 10 L17 -3 L24 3 L32 -6 L40 3 L47 -3 L48 10z" fill="#ffd84d"/><rect x="16" y="7" width="32" height="3" fill="#e0a92e"/><circle cx="32" cy="3" r="2" fill="#ff6bd6"/><circle cx="23" cy="5" r="1.5" fill="#5bc8ff"/><circle cx="41" cy="5" r="1.5" fill="#5bc8ff"/>';
    if (k === "halo") return '<ellipse cx="32" cy="-2" rx="15" ry="4" fill="none" stroke="#fff3a8" stroke-width="3"/><ellipse cx="32" cy="-2" rx="15" ry="4" fill="none" stroke="#ffd84d" stroke-width="1" opacity=".8"/>';
    if (k === "flames") return '<path d="M12 10q-3-9 3-15q0 6 4 8q-1-8 6-13q-1 8 4 10q1-7 7-10q-2 8 3 11q2-5 7-7q-3 7 1 12q3-3 4-7q4 7 0 11z" fill="#ff8a3d"/><path d="M20 10q-1-5 3-8q0 4 3 5q0-5 5-8q-1 6 3 7q1-4 5-6q-2 5 1 10z" fill="#ffd84d"/>';
    if (k === "chef") return '<circle cx="22" cy="0" r="7" fill="#F5F3ED"/><circle cx="32" cy="-3" r="8" fill="#F5F3ED"/><circle cx="42" cy="0" r="7" fill="#F5F3ED"/><rect x="17" y="1" width="30" height="9" rx="2" fill="#F5F3ED"/><rect x="17" y="7" width="30" height="2" fill="#d8d2c4"/>';
    if (k === "beanie") return '<path d="M12 10q20-18 40 0z" fill="' + c + '"/><rect x="10" y="8" width="44" height="5" rx="2" fill="#2a2d34"/><circle cx="32" cy="-6" r="3" fill="' + c + '"/>';
    if (k === "shades") return '<rect x="15" y="20" width="15" height="9" rx="2" fill="#0E0F11"/><rect x="34" y="20" width="15" height="9" rx="2" fill="#0E0F11"/><rect x="30" y="22" width="4" height="2" fill="#0E0F11"/><rect x="17" y="21" width="5" height="2" fill="#F3F1EA" opacity=".5"/>';
    if (k === "party") return '<path d="M24 9 L32 -10 L40 9z" fill="' + c + '"/><path d="M27 2h10M29 -4h6" stroke="#F3F1EA" stroke-width="2"/><circle cx="32" cy="-11" r="2.5" fill="#FF5A4E"/>';
    if (k === "bandana") return '<path d="M8 10q24-12 48 0v4H8z" fill="#FF5A4E"/><path d="M54 11l7 4-6 3z" fill="#FF5A4E"/><circle cx="20" cy="9" r="1.2" fill="#F3F1EA"/><circle cx="34" cy="7" r="1.2" fill="#F3F1EA"/><circle cx="46" cy="9" r="1.2" fill="#F3F1EA"/>';
    if (k === "tophat") return '<rect x="20" y="-12" width="24" height="20" rx="1" fill="#0E0F11"/><rect x="20" y="2" width="24" height="3" fill="' + c + '"/><rect x="12" y="7" width="40" height="4" rx="2" fill="#0E0F11"/>';
    if (k === "horns") return '<path d="M12 10q-6-10 2-16q-1 8 6 13z" fill="#FF5A4E"/><path d="M52 10q6-10-2-16q1 8-6 13z" fill="#FF5A4E"/>';
    if (k === "visor") return '<rect x="12" y="19" width="40" height="11" rx="5" fill="' + c + '" opacity=".85"/><rect x="14" y="21" width="12" height="2" fill="#F3F1EA" opacity=".6"/>';
    if (k === "wizard") return '<path d="M16 10 L36 -14 L48 10z" fill="#2a2d34"/><rect x="8" y="7" width="48" height="4" rx="2" fill="#2a2d34"/><path d="M30 -2l2 3 3-1-2 3 2 3-3-1-2 3-1-3-3 1 2-3-2-3 3 1z" fill="#B8F23A"/>';
    if (k === "steam") return '<path d="M20 6q-4-4 0-8M32 6q-4-4 0-8M44 6q-4-4 0-8" fill="none" stroke="#e6e1d3" stroke-width="2" opacity=".8"/>';
    return "";
  }
  function parse(key) {
    var m = /^x:(tired|happy|flat|angry|x|smug|shock|sleepy|wink)-(1[01]|[0-9])-([0-6])-([a-z]+)$/.exec(key || "");
    if (!m || ACCS.indexOf(m[4]) < 0) return null;
    var f = FACES[+m[2]];
    return { mood: m[1], face: f[0], screen: f[1], body: BODIES[+m[3]], acc: m[4] };
  }
  function svg(a) {
    return '<svg viewBox="0 -8 64 72" aria-hidden="true" focusable="false">' +
      '<rect x="6" y="8" width="48" height="40" rx="7" fill="' + a.body + '"/>' +
      '<rect x="50" y="12" width="8" height="32" rx="3" fill="#bfb18c"/>' +
      '<rect x="11" y="13" width="38" height="29" rx="5" fill="' + a.screen + '"/>' +
      eyes(a.mood, a.face) + mouth(a.mood, a.face) +
      '<rect x="20" y="48" width="24" height="5" fill="#bfb18c"/><rect x="14" y="53" width="36" height="5" rx="2" fill="#d8ccab"/>' +
      acc(a.acc, a.face) + "</svg>";
  }
  window.ccAvatarKeys = Object.keys(A);
  window.ccAvatarParts = { moods: MOODS, faces: FACES.map(function (f) { return f[0]; }), bodies: BODIES, accs: ACCS };
  window.ccAvatar = function (key) { return svg(parse(key) || A[key] || A.lime); };
})();
