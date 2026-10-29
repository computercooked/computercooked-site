// K-0031 email signup: any <form data-signup> posts {email, source, consent} to /api/subscribe (our own database only).
(function () {
  var EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
  function wire(form) {
    var input = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var out = form.querySelector(".signup-status");
    function say(msg, ok) {
      if (!out) return;
      out.textContent = msg;
      out.classList.toggle("is-ok", !!ok);
      out.classList.toggle("is-bad", !ok);
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = (input.value || "").trim();
      if (!EMAIL.test(email)) { say("that doesn't look like an email.", false); input.focus(); return; }
      btn.disabled = true;
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email, source: form.getAttribute("data-source") || "site", consent: true }),
      })
        .then(function (r) { return r.json().catch(function () { return { ok: false }; }); })
        .then(function (d) {
          if (d && d.ok) { say("you're on the list.", true); form.reset(); }
          else say((d && d.error) || "that didn't work. try again in a bit.", false);
        })
        .catch(function () { say("no connection. try again in a bit.", false); })
        .then(function () { btn.disabled = false; });
    });
  }
  Array.prototype.forEach.call(document.querySelectorAll("form[data-signup]"), wire);
})();
