/* CRASH-style avatar presets, shared by /me and the hub. ccAvatar(key) -> SVG string. */
(function () {
  var A = {
    lime:   { screen: "#1a2b1a", face: "#C5FF49", body: "#d8ccab", mood: "tired" },
    lilac:  { screen: "#221a33", face: "#B59AFF", body: "#d8ccab", mood: "happy" },
    paper:  { screen: "#1d1e22", face: "#F5F3ED", body: "#bfb18c", mood: "flat" },
    hot:    { screen: "#3a1414", face: "#ff8a7d", body: "#d8ccab", mood: "angry" },
    ice:    { screen: "#10242e", face: "#5bc8ff", body: "#e6e1d3", mood: "happy" },
    cooked: { screen: "#2a1a10", face: "#ffb84d", body: "#c9b98f", mood: "x" }
  };
  function eyes(m, c) {
    if (m === "x") return '<path d="M20 22l6 6m0-6l-6 6M38 22l6 6m0-6l-6 6" stroke="' + c + '" stroke-width="3"/>';
    if (m === "angry") return '<path d="M19 22l8 4M45 22l-8 4" stroke="' + c + '" stroke-width="3"/><rect x="20" y="27" width="6" height="3" fill="' + c + '"/><rect x="38" y="27" width="6" height="3" fill="' + c + '"/>';
    if (m === "happy") return '<path d="M19 27q4-5 8 0M37 27q4-5 8 0" fill="none" stroke="' + c + '" stroke-width="3"/>';
    if (m === "flat") return '<rect x="19" y="25" width="8" height="3" fill="' + c + '"/><rect x="37" y="25" width="8" height="3" fill="' + c + '"/>';
    return '<rect x="19" y="24" width="8" height="4" fill="' + c + '"/><rect x="37" y="24" width="8" height="4" fill="' + c + '"/><rect x="18" y="21" width="10" height="2" fill="' + c + '"/><rect x="36" y="21" width="10" height="2" fill="' + c + '"/>';
  }
  function mouth(m, c) {
    if (m === "happy") return '<path d="M26 36q6 5 12 0" fill="none" stroke="' + c + '" stroke-width="3"/>';
    if (m === "angry" || m === "x") return '<path d="M25 38q3-3 6 0t6 0" fill="none" stroke="' + c + '" stroke-width="3"/>';
    return '<rect x="26" y="36" width="12" height="3" fill="' + c + '"/>';
  }
  window.ccAvatarKeys = Object.keys(A);
  window.ccAvatar = function (key) {
    var a = A[key] || A.lime;
    return '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
      '<rect x="6" y="8" width="48" height="40" rx="7" fill="' + a.body + '"/>' +
      '<rect x="50" y="12" width="8" height="32" rx="3" fill="#bfb18c"/>' +
      '<rect x="11" y="13" width="38" height="29" rx="5" fill="' + a.screen + '"/>' +
      eyes(a.mood, a.face) + mouth(a.mood, a.face) +
      '<rect x="20" y="48" width="24" height="5" fill="#bfb18c"/><rect x="14" y="53" width="36" height="5" rx="2" fill="#d8ccab"/></svg>';
  };
})();
