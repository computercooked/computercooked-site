/* smol brains — title.js (v3.6)
   Everything before an island: "computer cooked games presents", the title card, and the title screen
   over a slow, faded panorama of a late-game smol city (a real island, built and simulated in the engine:
   the future you're playing toward). From there: continue, start a new world (name, size and a
   Minecraft-style page of world settings) or load any island this browser keeps. */
(function () {
  "use strict";
  var SB = window.SB;
  var TI = (SB.Title = {});
  TI.NEWS = "new: three grump captains to f\u200cight by hand · your own smol and its heirs · three small jobs a day"; // the title's footer: what changed lately (4.17)

  function h(tag, attrs, kids) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "text") e.textContent = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.slice(0, 2) === "on") e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v);
    }
    if (kids != null) (Array.isArray(kids) ? kids : [kids]).forEach(function (c) { if (c == null || c === false) return; e.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return e;
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function sfx(n, v) { if (SB.Audio && SB.Audio.play) try { SB.Audio.play(n, { vol: v == null ? 1 : v }); } catch (e) {} }
  function root() { return document.getElementById("ui") || document.body; }
  function store(k, v) { try { if (v === undefined) return window.localStorage.getItem(k); window.localStorage.setItem(k, v); } catch (e) {} return null; }

  /* ---------------- language packs (round 3) ----------------
     One table per language: the english line -> that language's line. SB.Tr.add("xx", "name", {...}) adds or grows
     a pack, SB.Tr.set("xx") switches (remembered), SB.Tr.t(line) looks one line up, and SB.Tr.sweep(element) puts
     every line it knows inside an element into the language. With a language on, everything added to the page is
     swept as it appears, so a pack can cover any screen without the code that draws it changing. A line with a
     name or a number in it is written with {} where that goes ("{} joined your smols! 🧳"). Lines a pack does not
     have stay english. */
  var TR = (SB.Tr = { lang: "en", packs: { en: { _name: "english" } } });
  var pats = {};
  TR.add = function (lang, name, table) {
    var p = TR.packs[lang] || (TR.packs[lang] = {});
    if (name) p._name = name;
    for (var k in table || {}) {
      p[k] = table[k];
      if (k.indexOf("{}") >= 0) (pats[lang] || (pats[lang] = [])).push([new RegExp("^" + k.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\{\}/g, "(.+?)") + "$"), table[k]]);
    }
    return p;
  };
  TR.t = function (line) {
    var p = TR.packs[TR.lang], ps = pats[TR.lang] || [], m, i;
    if (TR.lang === "en" || !p || typeof line !== "string") return line;
    if (typeof p[line] === "string") return p[line];
    for (i = 0; i < ps.length; i++) if ((m = ps[i][0].exec(line))) { var n = 1; return ps[i][1].replace(/\{\}/g, function () { return m[n++]; }); }
    return line;
  };
  TR.count = function (lang) { var n = 0; for (var k in TR.packs[lang] || {}) if (k !== "_name") n++; return n; };
  TR.sweep = function (el) {
    if (TR.lang === "en" || !el) return 0;
    var n = 0, kids = el.childNodes || [], i, t, m;
    if (el.nodeType === 3) { t = el.nodeValue; m = TR.t(t.trim()); if (m !== t.trim()) { el.nodeValue = t.replace(t.trim(), m); n++; } return n; }
    if (el.getAttribute) ["placeholder", "title"].forEach(function (a) { var v = el.getAttribute(a); if (v && TR.t(v) !== v) { el.setAttribute(a, TR.t(v)); n++; } });
    for (i = 0; i < kids.length; i++) n += TR.sweep(kids[i]);
    return n;
  };
  var watching = null;
  TR.set = function (lang) {
    TR.lang = TR.packs[lang] ? lang : "en";
    store("smolbrains-lang", TR.lang);
    if (TR.lang !== "en" && !watching && typeof MutationObserver !== "undefined" && typeof document !== "undefined" && document.getElementById) {
      var ui = document.getElementById("ui");
      if (ui) { watching = new MutationObserver(function (ms) { if (TR.lang === "en") return; ms.forEach(function (m) { for (var i = 0; i < m.addedNodes.length; i++) TR.sweep(m.addedNodes[i]); }); }); watching.observe(ui, { childList: true, subtree: true }); }
    }
    return TR.lang;
  };
  TR.add("es", "español", {
    "tiny minds · one island · a whole civilisation": "mentes diminutas · una isla · toda una civilización", "presents": "presenta", "tap to skip": "toca para saltar",
    "▶ continue": "▶ continuar", "▶ play now": "▶ jugar ya", "🌱 custom island": "🌱 isla a medida", "📂 load game": "📂 cargar partida", "⚙ settings": "⚙ ajustes",
    "pick the size, shape, climate, grumps…": "elige tamaño, forma, clima, gruñones…", "text size · sound": "tamaño del texto · sonido · idioma", "nothing saved yet": "nada guardado aún",
    "‹ back": "‹ atrás", "🌱 create world": "🌱 crear mundo", "🌱 new island": "🌱 isla nueva", "create world": "crear mundo", "load game": "cargar partida", "settings": "ajustes",
    "world name": "nombre del mundo", "world code (seed)": "código del mundo (semilla)", "same code + same settings = the same island. leave it empty for a surprise.": "mismo código + mismos ajustes = la misma isla. déjalo vacío para una sorpresa.",
    "mode": "modo", "island size": "tamaño de la isla", "island shape": "forma de la isla", "land": "tierra", "mountains": "montañas", "climate": "clima", "food": "comida", "grumps": "gruñones",
    "weather": "tiempo", "storyteller": "narrador", "seasons": "estaciones", "escape pods": "cápsulas de escape", "island quirk": "rareza de la isla", "landing site": "lugar de aterrizaje",
    "the founders": "los fundadores", "pip's look": "el aspecto de pip", "a starting critter": "un bichito para empezar", "secret places": "lugares secretos", "island map": "mapa de la isla",
    "language": "idioma", "volume": "volumen", "text & menu size": "tamaño de texto y menús", "normal": "normal", "small": "pequeña", "medium": "mediana", "large": "grande", "extra large": "enorme",
    "tiny": "diminuta", "none": "ninguno", "few": "pocos", "lots": "muchos", "mild": "templado", "tropical": "tropical", "frozen": "helado", "dry": "seco", "scarce": "escasa", "plenty": "de sobra",
    "calm": "calmo", "wild": "salvaje", "gentle": "suave", "balanced": "equilibrado", "short": "cortas", "one pod": "una cápsula", "two pods": "dos cápsulas", "best spot": "el mejor sitio",
    "woods": "bosque", "shore": "orilla", "dry lands": "tierras secas", "snow": "nieve", "jungle": "selva", "far shore": "la orilla lejana", "strangers": "desconocidos", "sweethearts": "enamorados",
    "brother & sister": "hermano y hermana", "as it comes": "como salga", "hidden vale": "valle escondido", "waking the island…": "despertando la isla…", "no islands yet. start one!": "aún no hay islas. ¡empieza una!",
    "🗺 draw the island": "🗺 dibujar la isla", "▾ more world options (land, food, grumps, weather, storyteller, quirks…)": "▾ más opciones (tierra, comida, gruñones, tiempo, narrador, rarezas…)", "▴ fewer options": "▴ menos opciones",
    "🧳 a stranger approaches": "🧳 se acerca un forastero", "🏠 welcome them": "🏠 darles la bienvenida", "send them away": "que se vayan", "🛏 let them stay a few days": "🛏 que se queden unos días",
    "spreading things": "cosas que se extienden", "spread": "se extienden", "stay put": "se quedan quietas", "{} joined your smols! 🧳": "¡{} se unió a tus smols! 🧳", "🛏 {} is your guest for {} days": "🛏 {} es tu huésped durante {} días",
    "{} is waiting to join": "{} espera para unirse", "{} hatched! (gen {}, {})": "¡{} salió del huevo! (gen {}, {})", "day {}": "día {}"
  });
  // 4.38: three more packs, the same lines the spanish one covers
  TR.add("fr", "français", {
    "tiny minds · one island · a whole civilisation": "de petits esprits · une île · toute une civilisation", "presents": "présente", "tap to skip": "touche pour passer",
    "▶ continue": "▶ continuer", "▶ play now": "▶ jouer", "🌱 custom island": "🌱 île sur mesure", "📂 load game": "📂 charger une partie", "⚙ settings": "⚙ réglages",
    "pick the size, shape, climate, grumps…": "choisis la taille, la forme, le climat, les grognons…", "text size · sound": "taille du texte · son · langue", "nothing saved yet": "rien d'enregistré pour l'instant",
    "‹ back": "‹ retour", "🌱 create world": "🌱 créer le monde", "🌱 new island": "🌱 nouvelle île", "create world": "créer le monde", "load game": "charger une partie", "settings": "réglages",
    "world name": "nom du monde", "world code (seed)": "code du monde (graine)", "same code + same settings = the same island. leave it empty for a surprise.": "même code + mêmes réglages = la même île. laisse vide pour une surprise.",
    "mode": "mode", "island size": "taille de l'île", "island shape": "forme de l'île", "land": "terre", "mountains": "montagnes", "climate": "climat", "food": "nourriture", "grumps": "grognons",
    "weather": "météo", "storyteller": "conteur", "seasons": "saisons", "escape pods": "capsules de secours", "island quirk": "bizarrerie de l'île", "landing site": "lieu d'atterrissage",
    "the founders": "les fondateurs", "pip's look": "l'allure de pip", "a starting critter": "une bestiole pour commencer", "secret places": "lieux secrets", "island map": "carte de l'île",
    "language": "langue", "volume": "volume", "text & menu size": "taille du texte et des menus", "normal": "normale", "small": "petite", "medium": "moyenne", "large": "grande", "extra large": "très grande",
    "tiny": "minuscule", "none": "aucun", "few": "peu", "lots": "beaucoup", "mild": "doux", "tropical": "tropical", "frozen": "glacé", "dry": "sec", "scarce": "rare", "plenty": "abondante",
    "calm": "calme", "wild": "sauvage", "gentle": "tranquille", "balanced": "équilibré", "short": "courtes", "one pod": "une capsule", "two pods": "deux capsules", "best spot": "le meilleur endroit",
    "woods": "bois", "shore": "rivage", "dry lands": "terres sèches", "snow": "neige", "jungle": "jungle", "far shore": "le rivage lointain", "strangers": "inconnus", "sweethearts": "amoureux",
    "brother & sister": "frère et sœur", "as it comes": "au hasard", "hidden vale": "vallon caché", "waking the island…": "l'île se réveille…", "no islands yet. start one!": "pas encore d'île. commences-en une !",
    "🗺 draw the island": "🗺 dessiner l'île", "▾ more world options (land, food, grumps, weather, storyteller, quirks…)": "▾ plus d'options (terre, nourriture, grognons, météo, conteur, bizarreries…)", "▴ fewer options": "▴ moins d'options",
    "🧳 a stranger approaches": "🧳 un étranger approche", "🏠 welcome them": "🏠 l'accueillir", "send them away": "le renvoyer", "🛏 let them stay a few days": "🛏 le laisser rester quelques jours",
    "spreading things": "ce qui se propage", "spread": "se propage", "stay put": "reste en place", "{} joined your smols! 🧳": "{} a rejoint tes smols ! 🧳", "🛏 {} is your guest for {} days": "🛏 {} est ton invité pour {} jours",
    "{} is waiting to join": "{} attend de vous rejoindre", "{} hatched! (gen {}, {})": "{} a éclos ! (gén {}, {})", "day {}": "jour {}"
  });
  TR.add("de", "deutsch", {
    "tiny minds · one island · a whole civilisation": "winzige köpfe · eine insel · eine ganze zivilisation", "presents": "präsentiert", "tap to skip": "tippen zum überspringen",
    "▶ continue": "▶ weiter", "▶ play now": "▶ jetzt spielen", "🌱 custom island": "🌱 eigene insel", "📂 load game": "📂 spiel laden", "⚙ settings": "⚙ einstellungen",
    "pick the size, shape, climate, grumps…": "wähle größe, form, klima, grummel…", "text size · sound": "textgröße · ton · sprache", "nothing saved yet": "noch nichts gespeichert",
    "‹ back": "‹ zurück", "🌱 create world": "🌱 welt erschaffen", "🌱 new island": "🌱 neue insel", "create world": "welt erschaffen", "load game": "spiel laden", "settings": "einstellungen",
    "world name": "name der welt", "world code (seed)": "weltcode (seed)", "same code + same settings = the same island. leave it empty for a surprise.": "gleicher code + gleiche einstellungen = dieselbe insel. leer lassen für eine überraschung.",
    "mode": "modus", "island size": "inselgröße", "island shape": "inselform", "land": "land", "mountains": "berge", "climate": "klima", "food": "nahrung", "grumps": "grummel",
    "weather": "wetter", "storyteller": "erzähler", "seasons": "jahreszeiten", "escape pods": "rettungskapseln", "island quirk": "eigenart der insel", "landing site": "landeplatz",
    "the founders": "die gründer", "pip's look": "pips aussehen", "a starting critter": "ein tierchen zum start", "secret places": "geheime orte", "island map": "inselkarte",
    "language": "sprache", "volume": "lautstärke", "text & menu size": "text- und menügröße", "normal": "normal", "small": "klein", "medium": "mittel", "large": "groß", "extra large": "sehr groß",
    "tiny": "winzig", "none": "keine", "few": "wenige", "lots": "viele", "mild": "mild", "tropical": "tropisch", "frozen": "eisig", "dry": "trocken", "scarce": "knapp", "plenty": "reichlich",
    "calm": "ruhig", "wild": "wild", "gentle": "sanft", "balanced": "ausgewogen", "short": "kurz", "one pod": "eine kapsel", "two pods": "zwei kapseln", "best spot": "der beste platz",
    "woods": "wald", "shore": "ufer", "dry lands": "trockenes land", "snow": "schnee", "jungle": "dschungel", "far shore": "das ferne ufer", "strangers": "fremde", "sweethearts": "verliebte",
    "brother & sister": "bruder und schwester", "as it comes": "wie es kommt", "hidden vale": "verstecktes tal", "waking the island…": "die insel erwacht…", "no islands yet. start one!": "noch keine inseln. fang eine an!",
    "🗺 draw the island": "🗺 insel zeichnen", "▾ more world options (land, food, grumps, weather, storyteller, quirks…)": "▾ mehr optionen (land, nahrung, grummel, wetter, erzähler, eigenarten…)", "▴ fewer options": "▴ weniger optionen",
    "🧳 a stranger approaches": "🧳 ein fremder nähert sich", "🏠 welcome them": "🏠 willkommen heißen", "send them away": "wegschicken", "🛏 let them stay a few days": "🛏 ein paar tage bleiben lassen",
    "spreading things": "was sich ausbreitet", "spread": "breitet sich aus", "stay put": "bleibt, wo es ist", "{} joined your smols! 🧳": "{} gehört jetzt zu deinen smols! 🧳", "🛏 {} is your guest for {} days": "🛏 {} ist {} tage dein gast",
    "{} is waiting to join": "{} wartet darauf, dazuzukommen", "{} hatched! (gen {}, {})": "{} ist geschlüpft! (gen {}, {})", "day {}": "tag {}"
  });
  TR.add("pt", "português", {
    "tiny minds · one island · a whole civilisation": "mentes pequeninas · uma ilha · uma civilização inteira", "presents": "apresenta", "tap to skip": "toque para pular",
    "▶ continue": "▶ continuar", "▶ play now": "▶ jogar agora", "🌱 custom island": "🌱 ilha sob medida", "📂 load game": "📂 carregar jogo", "⚙ settings": "⚙ ajustes",
    "pick the size, shape, climate, grumps…": "escolha tamanho, forma, clima, ranzinzas…", "text size · sound": "tamanho do texto · som · idioma", "nothing saved yet": "nada salvo ainda",
    "‹ back": "‹ voltar", "🌱 create world": "🌱 criar mundo", "🌱 new island": "🌱 ilha nova", "create world": "criar mundo", "load game": "carregar jogo", "settings": "ajustes",
    "world name": "nome do mundo", "world code (seed)": "código do mundo (semente)", "same code + same settings = the same island. leave it empty for a surprise.": "mesmo código + mesmos ajustes = a mesma ilha. deixe vazio para uma surpresa.",
    "mode": "modo", "island size": "tamanho da ilha", "island shape": "forma da ilha", "land": "terra", "mountains": "montanhas", "climate": "clima", "food": "comida", "grumps": "ranzinzas",
    "weather": "tempo", "storyteller": "narrador", "seasons": "estações", "escape pods": "cápsulas de fuga", "island quirk": "esquisitice da ilha", "landing site": "local de pouso",
    "the founders": "os fundadores", "pip's look": "o visual do pip", "a starting critter": "um bichinho para começar", "secret places": "lugares secretos", "island map": "mapa da ilha",
    "language": "idioma", "volume": "volume", "text & menu size": "tamanho do texto e dos menus", "normal": "normal", "small": "pequena", "medium": "média", "large": "grande", "extra large": "enorme",
    "tiny": "minúscula", "none": "nenhum", "few": "poucos", "lots": "muitos", "mild": "ameno", "tropical": "tropical", "frozen": "gelado", "dry": "seco", "scarce": "escassa", "plenty": "farta",
    "calm": "calmo", "wild": "selvagem", "gentle": "suave", "balanced": "equilibrado", "short": "curtas", "one pod": "uma cápsula", "two pods": "duas cápsulas", "best spot": "o melhor lugar",
    "woods": "bosque", "shore": "praia", "dry lands": "terras secas", "snow": "neve", "jungle": "selva", "far shore": "a praia distante", "strangers": "desconhecidos", "sweethearts": "namorados",
    "brother & sister": "irmão e irmã", "as it comes": "como vier", "hidden vale": "vale escondido", "waking the island…": "acordando a ilha…", "no islands yet. start one!": "nenhuma ilha ainda. comece uma!",
    "🗺 draw the island": "🗺 desenhar a ilha", "▾ more world options (land, food, grumps, weather, storyteller, quirks…)": "▾ mais opções (terra, comida, ranzinzas, tempo, narrador, esquisitices…)", "▴ fewer options": "▴ menos opções",
    "🧳 a stranger approaches": "🧳 um forasteiro se aproxima", "🏠 welcome them": "🏠 dar as boas-vindas", "send them away": "mandar embora", "🛏 let them stay a few days": "🛏 deixar ficar uns dias",
    "spreading things": "coisas que se espalham", "spread": "se espalham", "stay put": "ficam onde estão", "{} joined your smols! 🧳": "{} se juntou aos seus smols! 🧳", "🛏 {} is your guest for {} days": "🛏 {} é seu hóspede por {} dias",
    "{} is waiting to join": "{} está esperando para entrar", "{} hatched! (gen {}, {})": "{} saiu do ovo! (gen {}, {})", "day {}": "dia {}"
  });
  if (store("smolbrains-lang")) TR.lang = TR.packs[store("smolbrains-lang")] ? store("smolbrains-lang") : "en";

  /* ---------------- title screen secrets (round 3) ----------------
     Three bits of the title answer a tap with a small animation: the logo hops (and lays an egg on the fifth tap),
     the studio's name fries an egg, and the version number, tapped three times, says who made it. Found ones are
     remembered on this device; all three found shows a line in the footer. */
  TI.SECRETS = ["logo", "cooked", "version"];
  function found() { try { return JSON.parse(store("smolbrains-secrets") || "{}") || {}; } catch (e) { return {}; } }
  var taps = {};
  // a tap on one of the secret bits -> { hit: did the secret fire, n: how many are found, all: all three }
  TI.secret = function (id) {
    var f = found(), need = id === "logo" ? 5 : id === "version" ? 3 : 1;
    if (TI.SECRETS.indexOf(id) < 0) return { hit: false, n: Object.keys(f).length, all: false };
    taps[id] = (taps[id] || 0) + 1;
    var hit = taps[id] % need === 0;
    if (hit && !f[id]) { f[id] = 1; store("smolbrains-secrets", JSON.stringify(f)); }
    var n = TI.SECRETS.filter(function (k) { return f[k]; }).length;
    return { hit: hit, n: n, all: n === TI.SECRETS.length };
  };
  function hop(el) { if (el && el.animate) try { el.animate([{ transform: "translateY(0) rotate(0)" }, { transform: "translateY(-14px) rotate(-3deg)" }, { transform: "translateY(0) rotate(0)" }], { duration: 320 }); } catch (e) {} }
  // a glyph that pops out of an element, drifts up and fades
  function pop(el, glyph, dx) {
    if (!el || !el.getBoundingClientRect || !ts) return;
    var b = el.getBoundingClientRect(), g = h("span", { style: "position:fixed;z-index:60;pointer-events:none;font-size:26px;left:" + (b.left + b.width / 2 + (dx || 0)) + "px;top:" + b.top + "px;transition:transform .9s ease-out,opacity .9s", text: glyph });
    document.body.appendChild(g);
    setTimeout(function () { g.style.transform = "translateY(-70px) rotate(" + ((dx || 0) > 0 ? 40 : -40) + "deg)"; g.style.opacity = "0"; }, 20);
    setTimeout(function () { g.remove(); }, 1000);
  }
  function secretTap(id, el) {
    var r = TI.secret(id);
    hop(el);
    if (id === "logo") { sfx("click", 0.5); if (r.hit) { pop(el, "🥚", 0); setTimeout(function () { pop(el, "🐣", 30); sfx("pop", 0.7); }, 500); } }
    else if (id === "cooked") { pop(el, "🍳", -20); pop(el, "🍳", 24); sfx("eat", 0.6); }
    else if (r.hit) { var t0 = el.textContent; el.textContent = "made by tiny minds"; sfx("chime", 0.6); setTimeout(function () { el.textContent = t0; }, 2200); }
    if (r.all && r.hit && TI.newsEl) TI.newsEl.textContent = "🥚 you found all three title secrets";
  }

  /* ---------------- computer cooked games presents ---------------- */
  // big words fading in and out on black, then the title. Any tap or key skips ahead a step
  TI.presents = function (done) {
    var wrap = h("div", { class: "presents live" }), cur = null, steps, i = -1, timer = null, over = false;
    var cards = [
      h("div", { class: "pcard pcc" }, [h("div", { class: "pcc-mark", html: "<i></i><i></i><i></i>" }), h("div", { class: "pcc-name", html: "computer cooked<br><b>games</b>" }), h("div", { class: "pcc-sub", text: "presents" })]),
      h("div", { class: "pcard ptitle" }, [h("h1", { html: "smol<br><span>brains</span>" }), h("p", { text: "tiny minds · one island · a whole civilisation" })])
    ];
    steps = [1.4, 1.2]; // K-0051: clickable within about 2 s
    cards.forEach(function (c) { wrap.appendChild(c); });
    wrap.appendChild(h("div", { class: "pskip", text: "tap to skip" }));
    root().appendChild(wrap);
    function next() {
      clearTimeout(timer);
      if (cur) { var old = cur; old.classList.remove("on"); old.classList.add("off"); }
      i++;
      if (i >= cards.length) return finish();
      cur = cards[i];
      cur.classList.add("on");
      timer = setTimeout(next, steps[i] * 1000);
    }
    function finish() {
      if (over) return;
      over = true;
      clearTimeout(timer);
      document.removeEventListener("keydown", key, true);
      wrap.classList.add("gone");
      setTimeout(function () { wrap.remove(); }, 900);
      if (done) done();
    }
    function key(e) { if (e.key === "Escape" || e.key === " " || e.key === "Enter") { e.preventDefault(); e.stopPropagation(); next(); } }
    wrap.addEventListener("pointerdown", function (e) { e.preventDefault(); next(); });
    document.addEventListener("keydown", key, true);
    setTimeout(next, 150);
    return { skip: finish };
  };

  /* ---------------- the panorama: a late-game smol city ----------------
     A small island of its own (never saved), built up the way a tribe of thinkers would leave it: the
     big thought in the middle, star domes, schools and workshops around it, rings of huts, windmills over
     the farms, a palisade, story poles and campfires, and ascended smols drifting about. */
  var SHOW_SEED = 812604, SHOW_T = 0.64;
  // built in small steps (the island, the buildings, then the smols a few at a time) so the page never
  // freezes for long: it starts under "presents" and is usually done before the title appears
  var building = null;
  TI.prepare = function (cb) {
    if (building) { if (cb) { if (building.done) cb(building.g); else building.cbs.push(cb); } return; }
    building = { done: false, g: null, cbs: cb ? [cb] : [] };
    var G = SB.Game, g = null, steps = [], si = 0;
    function own(fn) { return function () { var keep = G.current; G.current = g || keep; try { fn(); } finally { G.current = keep || g; } }; }
    steps.push(function () {
      var keep = G.current;
      g = G.create(SHOW_SEED, 256, null);
      G.current = keep;
      g.showcase = true; g.tutorial.done = true; g.podT = 1e9; g.strangerT = 1e9;
      if (g.dir) g.dir.nextT = 1e9;
    });
    steps.push(own(function () { city(g); }));
    [[6, 3], [6, 3], [5, 3], [5, 3], [4, 4]].forEach(function (p) {
      steps.push(own(function () {
        SB.quickBrains = 0.15;
        try { SB.Debug.spawnTier(p[0], p[1]).forEach(function (s) { s.asleep = false; s.chem.hunger = 0.05; s.age = Math.max(s.age, 900); }); } catch (e) { if (window.console) console.warn("[smol] showcase smols", e); }
        SB.quickBrains = 1;
      }));
    });
    steps.push(own(function () {
      var w = g.world, T = w.T;
      w.seen.fill(255); w.seenDirty = true; w.seenChunks = {};
      for (var i = 0; i < (T.N / SB.CHUNK) * (T.N / SB.CHUNK); i++) w.seenChunks[i] = 1;
      w.weather.kind = "clear"; w.weather.cloud = 0.25; w.weather.rain = 0; w.weather.next = 1e9;
      g.time = w.time = SB.DAY_LENGTH * SHOW_T;
      for (var t = 0; t < 2; t += SB.TICK) G.step(g, SB.TICK);
      g.time = w.time = SB.DAY_LENGTH * SHOW_T;
    }));
    (function run() {
      try { steps[si++](); } catch (e) { if (window.console) console.warn("[smol] showcase", e); if (!g) si = steps.length; }
      if (si < steps.length) return setTimeout(run, 30);
      building.done = true; building.g = g;
      building.cbs.forEach(function (f) { try { f(g); } catch (e) {} });
      building.cbs = [];
    })();
  };
  // the buildings of a city thinkers would leave: rings round the big thought
  function city(g) {
    var w = g.world, T = w.T, c = T.nest, placed = [];
    function ok(x, z, r) {
      if (!SB.World.walkable(w, x, z) || SB.World.depthAt(w, x, z) > 0.02) return false;
      var h0 = SB.WorldGen.heightAt(T, x, z);
      for (var a = 0; a < 6.28; a += 1.05) if (Math.abs(SB.WorldGen.heightAt(T, x + Math.cos(a) * r, z + Math.sin(a) * r) - h0) > 0.9 || SB.World.depthAt(w, x + Math.cos(a) * r, z + Math.sin(a) * r) > 0.02) return false;
      for (var i = 0; i < placed.length; i++) if (SB.dist(x, z, placed[i].x, placed[i].z) < r + placed[i].r + 0.5) return false;
      return true;
    }
    function put(kind, x, z) {
      var r = (SB.STRUCTS[kind] || { r: 1 }).r;
      if (!ok(x, z, r)) return null;
      try { var s = SB.World.addStructure(w, g, kind, x, z, { done: true }); placed.push({ x: x, z: z, r: r }); return s; } catch (e) { return null; }
    }
    function ring(rad, kinds, n, off) {
      for (var i = 0; i < n; i++) {
        var a = (off || 0) + i / n * 6.283;
        for (var tr = 0; tr < 4; tr++) if (put(kinds[i % kinds.length], c.x + Math.cos(a) * (rad + tr * 0.9), c.z + Math.sin(a) * (rad + tr * 0.9))) break;
      }
    }
    put("spire", c.x, c.z) || put("spire", c.x + 3, c.z + 2) || put("spire", c.x - 3, c.z - 2);
    ring(5.2, ["campfire", "totem"], 6, 0.3);
    ring(8.5, ["observatory", "school", "workshop", "kiln"], 8, 0.1);
    ring(12.5, ["hut"], 16, 0);
    ring(16.5, ["hut", "windmill", "hut", "totem"], 18, 0.2);
    ring(21, ["farm", "farm", "windmill", "farm"], 20, 0.05);
    ring(26, ["wall"], 44, 0);
    ring(29, ["farm", "hut", "campfire"], 12, 0.4);
  }

  /* ---------------- the title screen ---------------- */
  var ts = null, show = null, raf = 0, ang = 0, opts = {};
  TI.open = function () { return !!ts; };
  TI.watchIntro = function () { // (no button calls this since Nov 12: the intro plays when you make a new world)
    if (!SB.Intro || !SB.Intro.play) return;
    SB.Intro.play({ noGate: true });
  };
  // o: { onPlay(data|null, info), onNew(settings), shareSeed }
  TI.show = function (o) {
    opts = o || {};
    if (ts) return;
    var R = SB.Render, G = SB.Game;
    document.body.classList.add("titling");
    ts = h("div", { class: "ts live" });
    ts.appendChild(h("div", { class: "ts-fade" }));
    var box = h("div", { class: "ts-box" });
    box.appendChild(h("div", { class: "ts-logo" }, [h("h1", { html: "smol<br><span>brains</span>", onclick: function () { secretTap("logo", this); } }), h("p", { text: "tiny minds · one island · a whole civilisation" })]));
    var pane = h("div", { class: "ts-pane" });
    box.appendChild(pane);
    ts.appendChild(box);
    TI.newsEl = h("span", { class: "ts-news", text: TI.NEWS });
    ts.appendChild(h("div", { class: "ts-foot" }, [h("span", { style: "pointer-events:auto", text: "computer cooked games", onclick: function () { secretTap("cooked", this); } }), TI.newsEl, h("span", { style: "pointer-events:auto", text: "v" + (document.documentElement.getAttribute("data-version") || window.SB_VERSION || "3.6"), onclick: function () { secretTap("version", this); } })]));
    root().appendChild(ts);
    TR.sweep(ts);
    TI.pane = pane;
    // the first tap anywhere on the title is also what lets the browser start the music
    var music = function () { ts && ts.removeEventListener("pointerdown", music, true); if (SB.Audio && SB.Audio.unlock) try { SB.Audio.unlock(); } catch (e) {} if (SB.Music && !(SB.Music.now && SB.Music.now())) SB.Music.play("smolbrains"); };
    ts.addEventListener("pointerdown", music, true);
    mainMenu();
    if (opts.shareSeed) createWorld({ seed: opts.shareSeed });
    // the city fades in behind the menu when it's ready, and the camera drifts slowly round it, low and wide
    TI.prepare(function (g) {
      if (!ts || !g) return;
      show = g;
      G.start(show); R.setWorld(show);
      document.body.classList.add("cityup");
      var c = show.world.T.nest, cam = R.camera;
      cam.follow = null; cam.intro = null; cam.tilt = -0.32;
      var last = performance.now();
      (function orbit(now) {
        if (!ts) return;
        var dt = Math.min(0.1, (now - last) / 1000); last = now;
        ang += dt * 0.035;
        var rr = 9 + Math.sin(ang * 0.7) * 5;
        cam.x = c.x + Math.cos(ang * 0.6) * rr; cam.z = c.z + Math.sin(ang * 0.6) * rr;
        cam.yaw = cam.tYaw = ang; cam.zoom = cam.tZoom = 20 + Math.sin(ang * 0.45) * 6;
        show.time = show.world.time = SB.DAY_LENGTH * SHOW_T; // the light stays golden
        raf = requestAnimationFrame(orbit);
      })(last);
    });
  };
  TI.hide = function () {
    if (!ts) return;
    cancelAnimationFrame(raf);
    var el = ts; ts = null;
    el.classList.add("out");
    document.body.classList.remove("titling", "cityup");
    setTimeout(function () { el.remove(); }, 700);
    if (SB.Render && SB.Render.camera) SB.Render.camera.tilt = 0;
    if (SB.Music && SB.Music.now && SB.Music.now() && SB.Music.now().id === "smolbrains") SB.Music.skip();
    show = null; building = null; // let the city go: it's rebuilt if the title opens again
  };

  function btn(label, sub, cls, fn) {
    return h("button", { class: "ts-btn " + (cls || ""), onclick: function (e) { e.stopPropagation(); sfx("click"); fn(); } }, [h("span", { class: "l", html: label }), sub ? h("span", { class: "s", html: sub }) : null]);
  }
  function setPane(kids, cls) {
    var p = TI.pane; if (!p) return;
    p.innerHTML = ""; p.className = "ts-pane " + (cls || "");
    (Array.isArray(kids) ? kids : [kids]).forEach(function (k) { if (k) p.appendChild(k); });
    TR.sweep(p);
    var f = p.querySelector("button, input"); if (f && !("ontouchstart" in window)) try { f.focus({ preventScroll: true }); } catch (e) {}
  }
  function tierName(t) { var d = SB.TIERS[t | 0]; return d ? d.name + "s" : "blobs"; }
  function ago(ms) {
    var s = (Date.now() - ms) / 1000;
    if (!(s > 0)) return "just now";
    if (s < 90) return "just now";
    if (s < 3600) return Math.round(s / 60) + " min ago";
    if (s < 86400 * 1.5) return Math.round(s / 3600) + " h ago";
    return Math.round(s / 86400) + " days ago";
  }
  function metaLine(m) { return "day " + m.day + " · " + (m.pop ? m.pop + " smol" + (m.pop === 1 ? "" : "s") + " · " + tierName(m.tier) : "still in the pod") + " · " + ({ 256: "classic", 384: "small", 512: "big", 544: "medium", 768: "large", 1024: "extra large" }[m.n] || m.n) + " island"; }

  function mainMenu() {
    var ws = SB.Save.worlds(), last = ws[0], recent = last && Date.now() - (last.savedAt || 0) < 12 * 3600 * 1000; // an old island isn't the default (K-0025)
    var cont = last ? btn("▶ continue", esc(last.name) + " · " + metaLine(last), recent ? "go big" : "small", function () { play(last.id); }) : null;
    var now = btn("▶ play now", last ? "a fresh island. " + esc(last.name) + " stays safe in 📂 load game" : (SB.Lantern ? "a fresh island. a short film, then you wake up on it" : "jump straight in: a fresh island, ready in seconds"), recent ? "" : "go big", function () { createWorld({ quick: true }); });
    setPane([
      recent ? cont : now, recent ? now : cont,
      btn("🌱 custom island", "pick the size, shape, climate, grumps…", "small", function () { createWorld({}); }),
      btn("📂 load game", ws.length ? ws.length + " island" + (ws.length === 1 ? "" : "s") + " saved" : "nothing saved yet", ws.length ? "" : "dim", function () { loadGame(); }),
      btn("⚙ settings", "text size · sound", "small", function () { settings(); })
    ], "menu");
  }

  function play(id) {
    setPane([h("div", { class: "ts-wait", text: "waking the island…" })]);
    SB.Save.stash().then(function () { return SB.Save.loadWorld(id); }).then(function (d) {
      if (!d) { setPane([h("p", { class: "ts-note", text: "that island couldn't be read. it may have been saved by a newer version, or the browser cleared it." }), btn("‹ back", null, "small", mainMenu)]); return; }
      SB.Save.adopt(d);
      if (opts.onPlay) opts.onPlay(d);
    });
  }

  /* ---------------- load game ---------------- */
  function loadGame() {
    var ws = SB.Save.worlds();
    var list = h("div", { class: "ts-worlds" });
    if (!ws.length) list.appendChild(h("p", { class: "ts-note", text: "no islands yet. start one!" }));
    ws.forEach(function (m) {
      var q = (m.quirks || []).map(function (k) { return SB.QUIRKS[k] ? SB.QUIRKS[k].icon : ""; }).join(" ");
      var row = h("div", { class: "ts-world" }, [
        h("button", { class: "ts-wplay", onclick: function () { sfx("click"); play(m.id); } }, [
          h("b", { text: m.name }), h("span", { text: metaLine(m) }), h("small", { text: "world " + SB.worldCode(m.seed) + " · played " + ago(m.savedAt) + (q ? " · " + q : "") + (m.ended ? " · 🌟 finished" : "") })
        ]),
        h("button", { class: "ts-wdel", title: "delete", "aria-label": "delete " + m.name, onclick: function (e) {
          e.stopPropagation();
          if (row.classList.contains("sure")) { SB.Save.removeWorld(m.id); sfx("sad", 0.5); loadGame(); return; }
          row.classList.add("sure"); this.textContent = "delete?"; var b = this; setTimeout(function () { if (b.isConnected) { row.classList.remove("sure"); b.textContent = "🗑"; } }, 3000);
        } }, "🗑")
      ]);
      list.appendChild(row);
    });
    var note = h("p", { class: "ts-note small", text: "" });
    SB.Save.manyOk().then(function (yes) { if (!yes) note.textContent = "this browser can only keep one island at a time: starting a new one replaces it."; });
    setPane([h("h2", { text: "load game" }), list, note, h("div", { class: "ts-row" }, [btn("‹ back", null, "small", mainMenu), btn("🌱 new island", null, "small", function () { createWorld({}); })])], "wide");
  }

  /* ---------------- create world ---------------- */
  var LABELS = {
    mode: ["mode", [["normal", "normal", ""], ["sandbox", "🧪 sandbox", "spawn smols of any tier, eggs, grumps and food from ✨ magic. miracles are free. not on the leaderboard"]]],
    size: ["island size", [["tiny", "tiny", "one screenful of land. made for a one-islet start"], ["small", "small", "quick to explore. best on phones"], ["normal", "medium", "lots to explore"], ["large", "large", "huge. slow to make and to play on phones"], ["huge", "extra large", "enormous. needs a fast computer: phones will struggle"]]],
    shape: ["island shape", [["surprise", "🎲 surprise", "any of the shapes below"], ["classic", "classic", "one big rolling island"], ["volcano", "volcano", "a huge cone with a crater, black ash and hot vents"], ["twin", "twin isles", "two islands joined by a sandbar"], ["crescent", "crescent bay", "a ring of land around a sheltered bay"], ["mesa", "mesas", "red table-top hills and canyons"], ["delta", "river delta", "flat wet land where rivers fan out"], ["lakes", "lake district", "green hills full of lakes"], ["fjord", "fjord coast", "deep sea inlets between cliffs"], ["islet", "one islet", "a single small islet in a wide sea. a hard start"]]],
    land: ["land", [["isles", "little isles", "smaller islands, more sea"], ["island", "one island", ""], ["big", "big land", "more land, fewer beaches"]]],
    peaks: ["mountains", [["none", "none", "a level plain from shore to shore"], ["flat", "gentle", "rolling hills"], ["normal", "normal", ""], ["tall", "towering", "big peaks and deep valleys"]]],
    climate: ["climate", [["temperate", "mild", ""], ["tropical", "tropical", "warm and green: jungles, swamps"], ["frozen", "frozen", "snow and taiga: hard winters"], ["dry", "dry", "savanna and desert"]]],
    food: ["food", [["scarce", "scarce", "hungry smols, harder start"], ["normal", "normal", ""], ["plenty", "plenty", "fruit everywhere"]]],
    grumps: ["grumps", [["none", "none", "no grumps at night"], ["few", "few", ""], ["normal", "normal", ""], ["many", "lots", "hard nights"]]],
    storms: ["weather", [["calm", "calm", "few storms"], ["normal", "normal", ""], ["wild", "wild", "storms, lightning, wildfires"]]],
    story: ["storyteller", [["calm", "gentle", "fewer events, more breathing room"], ["balanced", "balanced", ""], ["wild", "wild", "events come thick and fast"]]],
    seasons: ["seasons", [["normal", "normal", "40 minutes each"], ["short", "short", "10 minutes each: a whole year in under an hour"]]],
    crew: ["escape pods", [["pair", "one pod", "two smols, a girl and a boy"], ["crew", "two pods", "four smols: a faster start"]]],
    site: ["landing site", [["", "best spot", "the pod finds a mild meadow near fresh water"], ["woods", "woods", "down among the trees"], ["shore", "shore", "on the beach"], ["dunes", "dry lands", "sand and savanna. thirsty"], ["snow", "snow", "the cold end of the island"], ["jungle", "jungle", "hot, wet and green"], ["far", "far shore", "the far side, among the grump lairs. hard"]]],
    kin: ["the founders", [["", "strangers", "a girl and a boy thrown together"], ["sweethearts", "sweethearts", "partners from the first day"], ["siblings", "brother & sister", "family can't have eggs together: they will need newcomers"]]],
    pip: ["pip's look", [["", "as it comes", ""], ["sky", "sky blue", ""], ["sun", "sunny", ""], ["rose", "rosy", ""], ["moss", "mossy", ""], ["snow", "snowy", ""]]],
    critter: ["a starting critter", [["", "none", ""], ["hopper", "🐇 a hopper", "climbs out of the pod with the founders, already tame"], ["beetle", "🪲 a beetle", "climbs out of the pod with the founders, already tame"]]],
    secret: ["secret places", [["", "none", ""], ["vale", "hidden vale", "somewhere a ring of cliffs hides a glittering valley. find the glow-stone that hops you in"]]],
    spread: ["spreading things", [["", "spread", "blight goes farm to farm, bug nests bud new nests"], ["off", "stay put", "blight and bug nests stay where they start"]]]
  };
  var ORDER = ["mode", "size", "shape", "climate", "land", "peaks", "food", "grumps", "storms", "story", "seasons", "crew", "site", "kin", "pip", "critter", "secret", "spread"];
  // tiles across for a size choice ("tiny" is title-only: a 256 island, the size the classic islands were)
  TI.sizeN = function (k) { return k === "tiny" ? 256 : SB.WORLD_CHOICES.size[k] || SB.WORLD_N_NEW; };
  // the settings a new island is made from (settings.world). the round-3 choices are only there when picked
  TI.worldOf = function (st, q) {
    var w = { gv: SB.WORLD_GV, arch: st.shape === "surprise" ? undefined : st.shape, size: st.size, land: st.land, peaks: st.peaks, climate: st.climate, food: st.food, grumps: st.grumps, storms: st.storms, crew: st.crew, quirks: q || [], surprise: st.quirk === "surprise", mode: st.mode === "sandbox" ? "sandbox" : undefined };
    ["site", "kin", "pip", "critter", "spread"].forEach(function (k) { if (st[k]) w[k] = st[k]; });
    if (st.secret === "vale") w.vale = 1;
    if (st.pod) w.pod = st.pod;
    if (st.edits && st.edits.length) w.edits = st.edits;
    return w;
  };
  /* the island editor (round 3): draw the island a code and its settings make, then tap the map to choose where the
     pod lands or to stamp a hill, a lake or a grove on it. Stamps ride in the island's settings, so it reloads the same */
  TI.TOOLS = [["pod", "🚀 pod"], ["hill", "⛰ hill"], ["lake", "💧 lake"], ["grove", "🌳 grove"]];
  TI.stamp = function (st, tool, fx, fz) {
    fx = Math.round(SB.clamp01(fx) * 1000) / 1000; fz = Math.round(SB.clamp01(fz) * 1000) / 1000;
    if (!st.edits) st.edits = [];
    if (tool === "undo") { if (st.edits.length) st.edits.pop(); else st.pod = null; }
    else if (tool === "pod") st.pod = [fx, fz];
    else if (st.edits.length < 24 && (tool === "hill" || tool === "lake" || tool === "grove")) st.edits.push([tool, fx, fz]);
    return st;
  };
  // the terrain those settings make (nothing else is touched: the island on screen keeps its own size and options)
  TI.preview = function (st) {
    var keepN = SB.WORLD_N, keepO = SB.WORLD_OPTS, T = null, w = TI.worldOf(st, []);
    try { SB.setWorldN(TI.sizeN(st.size)); SB.WORLD_OPTS = SB.worldFx(w); SB.WORLD_OPTS.w = w; T = SB.WorldGen.generate(SB.parseWorldCode(st.seed) || 1); }
    finally { SB.setWorldN(keepN); SB.WORLD_OPTS = keepO; }
    return T;
  };
  function mapCanvas(T, st, onTap) {
    var cv = h("canvas", { width: String(T.N), height: String(T.N), style: "width:100%;max-width:340px;display:block;margin:6px auto;border-radius:8px;image-rendering:pixelated;touch-action:manipulation" });
    try {
      var g = cv.getContext("2d"), img = g.createImageData(T.N, T.N), k = T.N / 256;
      img.data.set(SB.WorldGen.minimap(T)); g.putImageData(img, 0, 0);
      g.font = Math.round(13 * k) + "px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      (st.edits || []).forEach(function (e) { g.fillText(e[0] === "hill" ? "⛰" : e[0] === "lake" ? "💧" : "🌳", e[1] * T.N, e[2] * T.N); });
      var pd = st.pod ? { x: st.pod[0] * T.N, z: st.pod[1] * T.N } : T.nest;
      g.fillText("🚀", pd.x, pd.z);
    } catch (e) {}
    cv.addEventListener("click", function (e) { var b = cv.getBoundingClientRect(); if (b.width > 0) onTap((e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height); });
    return cv;
  }
  function islandName(r) { var w = SB.makeName ? SB.makeName(r) : "smol"; return (r() < 0.5 ? w + " island" : r() < 0.5 ? "isle of " + w : w + " cove").toLowerCase(); }
  function createWorld(pre) {
    var r = SB.rng((Math.random() * 1e9) >>> 0);
    var st = { mode: pre.mode || "normal", name: islandName(r), seed: pre.seed ? SB.worldCode(pre.seed) : "", size: pre.quick && (window.innerWidth || 1000) < 700 ? "small" : "normal", shape: "surprise", land: "island", peaks: "normal", climate: "temperate", food: "normal", grumps: "normal", storms: "normal", story: "balanced", seasons: "normal", crew: "pair", quirk: "surprise", site: "", kin: "", pip: "", critter: "", secret: "", spread: "", pod: null, edits: [], tool: "pod" };
    var more = false, pv = null;
    function rowFor(k) {
      var L = LABELS[k], cur = L[1].find(function (o) { return o[0] === st[k]; });
      return h("div", { class: "ts-opt" }, [
        h("label", { text: L[0] }),
        h("div", { class: "ts-seg" + (L[1].length > 4 ? " wrap" : "") }, L[1].map(function (o) { return h("button", { class: o[0] === st[k] ? "on" : "", onclick: function () { sfx("click", 0.6); st[k] = o[0]; pv = null; draw(); } }, o[1]); })),
        h("small", { text: cur && cur[2] || "" })
      ]);
    }
    function quirkRow() {
      var qs = Object.keys(SB.QUIRKS);
      var chips = [["surprise", "🎲 surprise me"], ["none", "none"]].concat(qs.map(function (k) { return [k, SB.QUIRKS[k].icon + " " + SB.QUIRKS[k].name]; }));
      var d = SB.QUIRKS[st.quirk];
      return h("div", { class: "ts-opt quirks" }, [
        h("label", { text: "island quirk" }),
        h("div", { class: "ts-seg wrap" }, chips.map(function (o) { return h("button", { class: o[0] === st.quirk ? "on" : "", onclick: function () { sfx("click", 0.6); st.quirk = o[0]; draw(); } }, o[1]); })),
        h("small", { text: st.quirk === "surprise" ? "a random quirk you'll discover when you land (or none at all)" : st.quirk === "none" ? "a classic island" : d.desc })
      ]);
    }
    function mapRow() {
      var kids = [h("label", { text: "island map" })];
      if (!pv) kids.push(h("div", { class: "ts-seg" }, [h("button", { onclick: function () { sfx("click", 0.6); if (!st.seed) st.seed = SB.worldCode(SB.newSeed()); try { pv = TI.preview(st); } catch (e) { pv = null; } draw(); } }, "🗺 draw the island")]));
      else {
        kids.push(mapCanvas(pv, st, function (fx, fz) { sfx("click", 0.6); TI.stamp(st, st.tool, fx, fz); draw(); }));
        kids.push(h("div", { class: "ts-seg wrap" }, TI.TOOLS.map(function (t) { return h("button", { class: t[0] === st.tool ? "on" : "", onclick: function () { st.tool = t[0]; draw(); } }, t[1]); }).concat([h("button", { onclick: function () { TI.stamp(st, "undo", 0, 0); draw(); } }, "↩ undo"), h("button", { onclick: function () { try { pv = TI.preview(st); } catch (e) { pv = null; } draw(); } }, "↻ redraw")])));
      }
      kids.push(h("small", { text: pv ? "tap the map: 🚀 moves the pod, the others stamp a hill, a lake or a grove (" + st.edits.length + "/24). ↻ shows the result" : "see the island this code makes, pick where the pod lands, and shape it a little" }));
      return h("div", { class: "ts-opt" }, kids);
    }
    function draw() {
      var nameIn = h("input", { class: "ts-in", maxlength: "32", value: st.name, "aria-label": "world name", oninput: function () { st.name = this.value; } });
      var seedIn = h("input", { class: "ts-in mono", maxlength: "16", value: st.seed, placeholder: "random", "aria-label": "world code", oninput: function () { st.seed = this.value; pv = null; } });
      var opts2 = h("div", { class: "ts-opts" }, (more ? ORDER : ORDER.slice(0, 4)).map(rowFor).concat([more ? quirkRow() : null, more ? mapRow() : null]));
      setPane([
        h("h2", { text: "create world" }),
        h("div", { class: "ts-field" }, [h("label", { text: "world name" }), h("div", { class: "ts-inrow" }, [nameIn, h("button", { class: "ts-dice", title: "another name", onclick: function () { sfx("click"); st.name = islandName(r); draw(); } }, "🎲")])]),
        h("div", { class: "ts-field" }, [h("label", { text: "world code (seed)" }), h("div", { class: "ts-inrow" }, [seedIn, h("button", { class: "ts-dice", title: "random", onclick: function () { sfx("click"); st.seed = SB.worldCode(SB.newSeed()); pv = null; draw(); } }, "🎲")]), h("small", { text: "same code + same settings = the same island. leave it empty for a surprise." })]),
        opts2,
        h("button", { class: "ts-more", onclick: function () { more = !more; draw(); } }, more ? "▴ fewer options" : "▾ more world options (land, food, grumps, weather, storyteller, quirks…)"),
        h("div", { class: "ts-row" }, [btn("‹ back", null, "small", mainMenu), btn("🌱 create world", null, "go", go)])
      ], "wide");
    }
    function go() {
      SB.Game.quickStart = !!pre.quick; // play now: no opening film, straight to the pod (the menu can show the film)
      var seed = st.seed && SB.parseWorldCode(st.seed) || SB.newSeed();
      var q = st.quirk === "surprise" ? (Math.random() < 0.75 ? [SB.pick ? SB.pick(Object.keys(SB.QUIRKS)) : Object.keys(SB.QUIRKS)[(Math.random() * Object.keys(SB.QUIRKS).length) | 0]] : []) : st.quirk === "none" ? [] : [st.quirk];
      var world = TI.worldOf(st, q);
      var name = (st.name || "").trim().slice(0, 32) || islandName(r);
      setPane([h("div", { class: "ts-wait", html: "growing <b>" + esc(name) + "</b>…<br><small>raising mountains, digging rivers</small>" })]);
      SB.Save.stash().then(function (kept) {
        if (!kept && SB.Save.load()) {
          return SB.Save.manyOk().then(function (many) {
            if (many || window.confirm("this browser can only keep one island. starting a new one replaces the island you have. go ahead?")) return true;
            if (pre.quick) mainMenu(); else createWorld(pre); return false;
          });
        }
        return true;
      }).then(function (yes) {
        if (!yes) return;
        setTimeout(function () { if (opts.onNew) opts.onNew({ seed: seed, n: TI.sizeN(st.size), world: world, story: st.story, seasons: st.seasons, name: name }); }, 60);
      });
    }
    if (pre.quick) go(); else draw();
  }

  /* ---------------- settings ---------------- */
  function settings() {
    var cur = TI.uiScale();
    var sizes = [["auto", "auto"], ["1", "normal"], ["1.2", "big"], ["1.4", "bigger"], ["1.65", "huge"]];
    var vol = SB.Music && SB.Music.volume ? SB.Music.volume() : 0.8;
    setPane([
      h("h2", { text: "settings" }),
      h("div", { class: "ts-opt" }, [h("label", { text: "text & menu size" }), h("div", { class: "ts-seg" }, sizes.map(function (o) { return h("button", { class: o[0] === cur ? "on" : "", onclick: function () { TI.setUiScale(o[0]); settings(); } }, o[1]); })), h("small", { text: "auto makes everything bigger on big screens. you can also change this in the game's settings." })]),
      SB.Audio && SB.Audio.sliders ? h("div", { class: "ts-opt" }, [h("label", { text: "volume" }), SB.Audio.sliders()]) : null,
      h("div", { class: "ts-opt" }, [h("label", { text: "language" }), h("div", { class: "ts-seg" }, Object.keys(TR.packs).map(function (k) { return h("button", { class: k === TR.lang ? "on" : "", onclick: function () { TR.set(k); settings(); } }, TR.packs[k]._name || k); })), h("small", { text: TR.lang === "en" ? "" : TR.count(TR.lang) + " lines so far. the rest stays english" })]),
      h("div", { class: "ts-row" }, [btn("‹ back", null, "small", mainMenu)])
    ], "wide");
  }

  /* ---------------- UI size ----------------
     Every menu, card and button lives in #ui, which is zoomed as one. "auto" grows it on big screens
     (a desktop browser window gets the game's text at a comfortable reading size). */
  var UIZ = "smolbrains-uiscale";
  TI.uiScale = function () { try { return window.localStorage.getItem(UIZ) || "auto"; } catch (e) { return "auto"; } };
  TI.setUiScale = function (v) { try { window.localStorage.setItem(UIZ, v); } catch (e) {} TI.applyUiScale(); };
  TI.zoomFor = function (v, w, hh) {
    if (v !== "auto") return Math.max(0.8, Math.min(2, +v || 1));
    var s = Math.min(w / 1000, hh / 640);
    return s >= 1.6 ? 1.45 : s >= 1.25 ? 1.3 : s >= 1 ? 1.15 : 1;
  };
  TI.applyUiScale = function () {
    var z = TI.zoomFor(TI.uiScale(), window.innerWidth || 800, window.innerHeight || 600);
    document.documentElement.style.setProperty("--uiz", String(z));
    TI.zoom = z;
    return z;
  };
  if (typeof window !== "undefined" && window.addEventListener && typeof document !== "undefined" && document.documentElement) {
    TI.applyUiScale();
    window.addEventListener("resize", function () { TI.applyUiScale(); });
  }
})();
