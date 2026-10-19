/* cc-sdk.js placeholder: games can call cc.start/score/end/event safely.
   The real SDK (plays, leaderboards) replaces this file when the platform ships. */
(function () {
  if (window.cc) return;
  var noop = function () {};
  window.cc = { start: noop, score: noop, event: noop, end: function () { return Promise.resolve(null); } };
})();
