// 4.41: phone polish from a look in a visible browser at 390 by 844 and 740 by 360 (cc-lead, Nov 16).
//   the stick's rest spot after the phone is turned, a "not thirsty" sip, "tap" for "click" on a touch screen,
//   the chase banner and the bite card clear of the buttons when held sideways, a close at the top of the bag,
//   the title footer after the menu on a short screen.
// node games/smol-brains/tests/play441.test.js
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
require("./_src.js");
let failed = 0;
function check(name, ok, extra) { console.log((ok ? "  ok  " : "  FAIL ") + name + (extra != null && extra !== "" ? "  (" + extra + ")" : "")); if (!ok) failed++; }
const js = f => fs.readFileSync(path.join(__dirname, "..", "play", "js", f), "utf8");
const css = fs.readFileSync(path.join(__dirname, "..", "play", "style.css"), "utf8");
const pj = js("povhud.js"), pos = js("possess.js");

console.log("1. the words on a touch screen");
{
  // the real table, run as the game runs it
  const m = pj.match(/var PHONE_WORDS = (\[\[.*\]\]);/);
  check("the table of phone words is there", !!m);
  if (m) {
    const words = vm.runInNewContext(m[1]);
    const say = msg => { words.forEach(p => { msg = msg.replace(p[0], p[1]); }); return msg; };
    check("\"click it\" becomes the big button", say("follow the marker to the berry bush and click it") === "follow the marker to the berry bush and tap the big button", say("follow the marker to the berry bush and click it"));
    check("the pod goal too", say("walk back to it and click it until it opens") === "walk back to it and tap the big button until it opens");
    check("left click still means the use button", say("carry leaves to the nest (follow the marker) and left click it") === "carry leaves to the nest (follow the marker) and tap use it");
    check("no \"click\" is left in any goal's tip", (pos.match(/tip: "[^"]*"/g) || []).every(t => !/click/.test(say(t))), (pos.match(/tip: "[^"]*"/g) || []).filter(t => /click/.test(say(t))).length + " left");
  }
}

console.log("2. a drink when you are not thirsty says so");
check("a sip either way", /say\(th ?> ?0\.25 ?\? ?"💧 ahh\. that's better" ?: ?"💧 a sip\. you're not thirsty"\)/.test(pos));

console.log("3. the stick goes back to its corner when the phone is turned");
check("a resize clears the spot your thumb left it at, unless you are holding it", /resize: ?function ?\(\) ?\{ ?if ?\(!stick ?&& ?hud ?&& ?hud\.stick\) ?\{ ?hud\.stick\.style\.left ?= ?""; ?hud\.stick\.style\.top ?= ?""; ?\} ?\}/.test(pj));
check("it listens for a resize and a turn, and stops listening when you leave the body", /window\.addEventListener\("resize", ?h\.resize\); ?window\.addEventListener\("orientationchange", ?h\.resize\)/.test(pj) && /window\.removeEventListener\("resize", ?h\.resize\); ?window\.removeEventListener\("orientationchange", ?h\.resize\)/.test(pj));

console.log("4. held sideways: the chase banner and the bite card keep clear of the buttons");
{
  const land = (pj.match(/@media \(max-height:500px\)\{[\s\S]*?\}\}"/) || [""])[0];
  check("there is a sideways block", land.length > 100);
  check("the banner sits under the clock, wraps, and is no wider than the room between the stick and the buttons", /#pov\.phone \.threat\{top:68px;white-space:normal;width:max-content;max-width:calc\(100vw - 390px\)/.test(land));
  check("a toast drops under the banner while it is up", /#pov\.phone:has\(\.threat\.on\) \.toast\{top:118px\}/.test(land));
  check("the bite card is smaller and at the top", /#pov\.phone \.ouch\{justify-content:flex-start;padding-top:62px\}#pov\.phone \.ouch b\{font-size:38px\}/.test(land));
  // the sum: at 740 and 568 wide the banner ends before the buttons begin (166 px of buttons and 10 px of edge)
  [740, 667, 568].forEach(w => { const half = (w - 390) / 2, right = w / 2 + half, btn = w - 176; check("at " + w + " wide the banner ends at " + right + ", the buttons begin at " + btn, right <= btn - 8 && w / 2 - half >= 135); });
}

console.log("5. the bag on a phone has a close at the top");
check("a close button in the heading", /\(hud\.phone ?\? ?"<button class='btn' data-close style='margin-left:auto'>✕ close<\/button>" ?: ?""\) ?\+ ?"<\/h3>"/.test(pj));
check("every close button closes", /root\.querySelectorAll\("\[data-close\]"\), ?function ?\(cl\) ?\{ ?cl\.addEventListener\("click", ?closeBag\); ?\}\)/.test(pj));

console.log("6. the title screen on a short screen: the footer comes after the menu");
check("not fixed over the play card", /@media \(max-height: 500px\) \{ \.ts-foot \{ position: static; align-self: stretch; margin-top: auto; flex: none; \} \}/.test(css));

console.log(failed ? failed + " FAILED" : "all passed");
process.exit(failed ? 1 : 0);
