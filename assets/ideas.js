// "What should we make next?" (K-0050a item 7): any <form data-ideas> posts {text, handle, page, ms, website} to
// /api/ideas (src/ideas.js, our own database only). No login. "website" is a honeypot people never see.
(function () {
  function wire(form) {
    var opened = Date.now();
    var text = form.querySelector("textarea"), handle = form.querySelector('input[name="handle"]');
    var trap = form.querySelector('input[name="website"]'), btn = form.querySelector('button[type="submit"]');
    var out = form.querySelector(".ideas-status"), left = form.querySelector(".ideas-left");
    function say(msg, ok) { out.textContent = msg; out.classList.toggle("is-ok", !!ok); out.classList.toggle("is-bad", !ok); }
    function count() { if (left) left.textContent = 280 - text.value.length; }
    text.addEventListener("input", count); count();
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var t = text.value.replace(/\s+/g, " ").trim();
      if (t.length < 3) { say("tell us a bit more.", false); text.focus(); return; }
      if (/(https?:|www\.)/i.test(t)) { say("no links, just the idea.", false); text.focus(); return; }
      btn.disabled = true;
      var anon = null; try { anon = localStorage.getItem("cc-anon"); } catch (er) {}
      fetch("/api/ideas", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: t, handle: handle ? handle.value.trim() : "", page: form.getAttribute("data-page") || "site",
          ms: Date.now() - opened, website: trap ? trap.value : "", anon: anon }),
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          if (d && d.ok) { say("got it. the computer is thinking about it. (badly.)", true); text.value = ""; count(); opened = Date.now(); }
          else say((d && d.error) || "that didn't work. try again in a bit.", false);
        })
        .catch(function () { say("no connection. try again in a bit.", false); })
        .then(function () { btn.disabled = false; });
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll("form[data-ideas]"), wire);
})();
