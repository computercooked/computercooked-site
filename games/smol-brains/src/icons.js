// smol brains — pixel icons. Every emoji the game shows (menus, toasts, cards, the bubbles over smols)
// is swapped for a hand-made 12×12 pixel icon with the same chunky outline as the smols. Anything
// without a hand-made icon gets "pixelated": drawn tiny, posterized and outlined so it still fits.
(function () {
  "use strict";
  var SB = window.SB = window.SB || {};
  var IC = SB.Icons = {};

  var PAL = {
    k: "#2a1f33", w: "#ffffff", W: "#d9d4e6", y: "#ffd84a", Y: "#e89a22", o: "#ff9f43", r: "#ff4f5e", R: "#b8323e",
    p: "#ff9cc8", P: "#e0569a", g: "#7bd860", G: "#3f9a4a", l: "#c5ff49", b: "#6fc8ff", B: "#3f7fe0", v: "#b59aff",
    V: "#7a5ad8", n: "#b97d4b", N: "#6e4528", s: "#ffd2a8", S: "#e8a070", e: "#b4b2c4", E: "#6f6c82", c: "#a8f2ff",
    C: "#fff1d0", D: "#e3c48f", m: "#ff6ff0", O: "#d0662a"
  };
  var OUT = "#1a1222";

  // 12 columns × up to 12 rows; '.' is empty. The outline is added automatically.
  var ART = {
    hand: ["...s.s.s....", "...s.s.s.s..", "...s.s.s.s..", "...sssssss..", ".s.sssssss..", ".ssssssssS..", "..sssssssS..", "..sssssssS..", "...ssssssS..", "....sssss...", "....sssss..."],
    feather: [".........ww.", "........wwv.", ".......wwvv.", "......wwvv..", ".....wwvv...", "....wwvv....", "...wwvv.....", "...wvv......", "..N.v.......", ".N..........", "N..........."],
    finger: [".....s......", "....sss.....", "....sss.....", "....sss.....", "....ssss.s..", "..s.sssssss.", "..sssssssss.", "..ssssssssS.", "...sssssssS.", "...ssssssS..", "....sssssS.."],
    bubble: ["............", "..wwwwwwww..", ".wwwwwwwwww.", ".wwkwwkwwkw.", ".wwwwwwwwww.", ".wwwwwwwwwW.", "..wwwwwwwW..", "...wwW......", "..wW........", ".W.........."],
    sparkle: ["....y.......", "....y.......", "...yyy......", "yyyywyyyy...", "...yyy......", "....y.....w.", "....y....www", "..........w.", ".......y....", "......yyy...", ".......y...."],
    dna: ["..p......b..", "...peeeeb...", "....p..b....", ".....pb.....", "....b..p....", "...beeeep...", "..b......p..", "...beeeep...", "....b..p....", ".....bp.....", "....p..b....", "...peeeeb..."],
    bulb: ["....yyyy....", "...yyyyyy...", "..yywyyyyy..", "..ywyyyyyY..", "..yyyyyyyY..", "..yyyyyyYY..", "...yyyyyY...", "....yyyY....", "....eeee....", "....EEEE....", "....eeee....", ".....EE....."],
    egg: [".....CC.....", "....CCCC....", "...CCCCCC...", "...CwCCCCD..", "..CwCCCCCD..", "..CCCCCCCD..", "..CCCCCCDD..", "..CCCCCCDD..", "...CCCCDD...", "....DDDD...."],
    apple: ["......N.....", ".....Ng.....", "....N.gg....", "..rrrrrrr...", ".rwrrrrrrr..", ".rwrrrrrrR..", ".rrrrrrrrR..", ".rrrrrrrrR..", ".rrrrrrrRR..", "..rrrrrRR...", "...rR.RR...."],
    pray: [".....ss.....", "....ssss....", "....ssss....", "...ssSss....", "...ssSsss...", "..sssSsss...", "..sssSsss...", "..sssSsssS..", ".ssssSssssS.", ".ssssssssss.", ".ss......ss."],
    tree: ["....gggg....", "..gggggggg..", ".ggglgggggg.", ".gglggggggG.", ".ggggggggGG.", "..ggggggGG..", "...gGGGGG...", ".....nN.....", ".....nN.....", ".....nN.....", "....nnNN...."],
    fire: [".....r......", "....rr......", "....rro..r..", "...rroor.r..", "..rrooorrr..", "..rooyyorr..", ".rrooyyoorr.", ".rroyyyyorr.", ".rroywwyorr.", "..rryyyyor..", "...rrrrrr..."],
    brain: ["...pppppp...", "..ppPpppPp..", ".pPppPpppPp.", ".ppppPppppp.", ".pPpppPppPp.", ".ppPppPpppp.", "..ppppPppP..", "...pppppp...", ".......pp...", ".......p...."],
    hut: [".....YY.....", "....YYYY....", "...YYyYYY...", "..YYYYYyYY..", ".YYyYYYYYYY.", "YYYYYYYYYYYY", ".nnnnnnnnnn.", ".nnnNNNnnnN.", ".nnnNkNnnnN.", ".nnnNkNnnnN.", ".nnnNkNnnnN."],
    village: ["......YY....", ".....YYYY...", "..YY.YYYYY..", ".YYYYYYYYYY.", "YYYYYYYYYYYY", ".nnnn.nnnnn.", ".nNNn.nnNNn.", ".nNkn.nnNkn.", ".nNkn.nnNkn."],
    chick: ["....yyyy....", "...yyyyyy...", "...ykyykyy..", "...yyyoyyy..", "...yyyyyy...", "..CCyyyyCC..", "..CDCCDCCC..", "..CCCCCCCD..", "...CCCCCD...", "....DDDD...."],
    log: ["...NNNNNNN..", "..nnnnnnnnN.", ".CDnnnnnnnnN", ".DCDnnnnnnnN", ".CDCnnnnnnnN", ".DCDnnnnnnN.", "..DnnnnnnN..", "...NNNNNN..."],
    wheat: [".....y......", "....yYy.....", ".....y..y...", "....yYy.yYy.", ".y...y...y..", "yYy.yYy.yYy.", ".y...y...y..", ".Y...Y..Y...", "..Y..Y.Y....", "...Y.YY.....", "....YY......", "....Y......."],
    sprout: ["..gg....gg..", ".gggg..gggg.", ".gGggggggGg.", "..Gg.gg.gG..", ".....gg.....", ".....gG.....", ".....gG.....", "....NNNN....", "..NNnnnnNN.."],
    sun: [".....y......", ".y...y...y..", "..y.....y...", "....yyy.....", "...yyyyy....", "yy.yywyyY.yy", "...yyyyYY...", "....yYYY....", "..y.....y...", ".y...y...y..", ".....y......"],
    grump: ["..G......G..", "..GG....GG..", "..GGGGGGGG..", ".GGGGGGGGGG.", ".GrrGGGGrrG.", ".GGrGGGGrGG.", ".GGGGGGGGGG.", ".GGkkkkkkGG.", ".GGkwkkwkGG.", "..GGGGGGGG..", "...GGGGGG..."],
    hammer: ["..EEEEEE....", ".eeeeeeeE...", ".eeeeeeeE...", "..EEenEEE...", ".....nN.....", ".....nN.....", ".....nN.....", ".....nN.....", ".....nN.....", ".....NN....."],
    shroom: ["....rrrr....", "..rrwrrrrr..", ".rrwwrrwrrr.", ".rrrrrrwwrr.", "rrwrrrrrrrrR", ".RRRRRRRRRR.", "....CCCD....", "....CCCD....", "....CCCD....", "...CCCCDD..."],
    herb: [".........g..", ".......ggg..", "...g..gggG..", "..ggg.ggG...", "..gggGgG....", "...gGG..gg..", "....G..ggg..", "...gG.gggG..", "..gggGgG....", "..ggG.G.....", "....G.......", "...G........"],
    pole: ["...nnnnnn...", "..nkknnkkn..", "..nnnnnnnN..", "..nnkkkknN..", "...nnnnnN...", "..yyyyyyyy..", "..nkknnkkn..", "..nnnoonnN..", "..nnnnnnnN..", "...nnnnnN...", "....NnnN....", "....NnnN...."],
    candle: [".....y......", "....yoy.....", "....yoy.....", ".....y......", ".....k......", "....CCCC....", "....CCCD....", "....CCCD....", "....CCCD....", "....CCCD....", "...DDDDDD..."],
    dove: ["..ww........", ".wwww.......", ".wwwwww..k..", "..wwwwwwwwo.", "...wwwwwwww.", "..wwwwwwwW..", ".wwwWWWWW...", "wwwW........", "ww.........."],
    moon: ["....yyyy....", "..yyy.......", ".yyy........", ".yy.........", "yyy.........", "yyy.........", "yyy.........", "yyyy......y.", ".yyyy....yy.", "..yyyyyyyy..", "...yyyyyy..."],
    rain: ["....WWW.....", "..WWWWWWW...", ".WWWWWWWWW..", "WWWWWWWWWWW.", ".eeeeeeeee..", "............", "..b...b...b.", ".b...b...b..", "............", "...b...b....", "..b...b....."],
    heart: [".rrr...rrr..", "rrwrr.rrrrr.", "rwrrrrrrrrR.", "rrrrrrrrrrR.", "rrrrrrrrrRR.", ".rrrrrrrRR..", "..rrrrrRR...", "...rrrRR....", "....rRR.....", ".....R......"],
    pinkheart: [".ppp...ppp..", "ppwpp.ppppp.", "pwpppppppppP", "pppppppppppP", ".pppppppppP.", "..pppppppP..", "...pppppP...", "....pppP....", ".....pP....."],
    star: [".....y......", ".....y......", "....yyy.....", "yyyyywyyyyy.", ".yyyyyyyyy..", "..yyyyyyy...", "..yyyyyyy...", ".yyyy.yyyy..", ".yyy...yyy..", ".yy.....yy.."],
    sad: ["...yyyyyy...", "..yyyyyyyy..", ".yyyyyyyyyy.", ".yykyyyykyy.", ".yykyyyykyy.", ".ybyyyyyyyY.", ".ybyykkyyyY.", ".yyykyykyyY.", "..yyyyyyyY..", "...yyyyyY..."],
    angry: ["...oooooo...", "..oooooooo..", ".okooooooko.", ".ookooookoo.", ".ookooookoO.", ".ooooooooOO.", ".oookkkkoOO.", ".ookooookOO.", "..ooooooOO..", "...ooooOO..."],
    zzz: ["......bbbbb.", ".........b..", "........b...", ".......bbbbb", "............", ".bbbb.......", "...b........", "..b.........", ".bbbb......."],
    sick: ["...gggggg...", "..gggggggg..", ".gggggggggg.", ".ggkkggkkgg.", ".gggggggggG.", ".ggGGGGGGgG.", ".gGgGgGgGgG.", ".ggGGGGGGgG.", "..gggggggG..", "...ggggGG..."],
    snow: [".....c......", "...c.c.c....", "....ccc.....", ".c..ccc..c..", "..c..c..c...", "ccccc.ccccc.", "..c..c..c...", ".c..ccc..c..", "....ccc.....", "...c.c.c....", ".....c......"],
    drop: [".....b......", ".....b......", "....bbb.....", "....bbb.....", "...bbbbb....", "..bwbbbbb...", "..bwbbbbB...", "..bbbbbbB...", "..bbbbbBB...", "...bbbBB....", "....BBB....."],
    rock: ["....eeee....", "...eeeeeE...", "..eWeeeeeE..", ".eWeeeeeeEE.", ".eeeeeeeEEE.", ".eeeeeEEEEE.", "..EEEEEEEE.."],
    gift: ["..yy...yy...", "...yy.yy....", "....yyy.....", ".rrrryrrrrr.", ".rrrryrrrrR.", ".yyyyyyyyyy.", ".rrrryrrrrR.", ".rrrryrrrrR.", ".rrrryrrrrR.", ".RRRRyRRRRR."],
    x: [".ww......ww.", "..ww....ww..", "...ww..ww...", "....wwww....", ".....ww.....", "....wwww....", "...ww..ww...", "..ww....ww..", ".ww......ww."],
    q: ["...vvvvv....", "..vvvvvvv...", "..vv...vv...", ".......vv...", "......vvv...", ".....vvv....", ".....vv.....", "............", ".....vv.....", ".....vv....."],
    pause: ["..www..www..", "..wwW..wwW..", "..wwW..wwW..", "..wwW..wwW..", "..wwW..wwW..", "..wwW..wwW..", "..wwW..wwW..", "..WWW..WWW.."],
    menu: ["wwwwwwwwwww.", "WWWWWWWWWWW.", "............", "wwwwwwwwwww.", "WWWWWWWWWWW.", "............", "wwwwwwwwwww.", "WWWWWWWWWWW."],
    bang: ["....rr......", "....rr......", "....rr......", "....rr......", "....rr......", "....RR......", "............", "....rr......", "....RR......"],
    wand: [".........y..", "........yyy.", ".........y..", "......kk....", ".....kk.....", "....kk......", "...kk.......", "..kk........", ".kk........."],
    tools: ["..EEE.......", ".eeeE.....n.", ".eEeE....nN.", "..EnE...nN..", "....n..nN...", ".....nnN....", ".....nNn....", "....nN..n...", "...nN....n..", "..nN......n."],
    pick: ["..eeeeeeee..", ".eE......Ee.", "e....nN....e", ".....nN.....", ".....nN.....", ".....nN.....", ".....nN.....", ".....nN.....", ".....NN....."],
    axe: ["....eeee....", "...eeeeeN...", "..eeeeenN...", "..eeeeenN...", "...EEEEnN...", ".......nN...", ".......nN...", ".......nN...", ".......nN...", ".......NN..."],
    pot: ["...oooooo...", "....oooo....", "...oooooo...", "..oooooooo..", ".oyyyyyyyyo.", ".oooooooooO.", ".oooooooooO.", "..ooooooOO..", "...ooooOO..."],
    yarn: ["...pppppp...", "..pPppPppp..", ".pppPpppPpp.", ".pPpppPpppP.", ".ppPpppPppP.", ".pppPpppPpP.", "..ppppPppP..", "...ppppPP...", "........PP..", "..........P."],
    wave: ["....bbbb....", "..bbbbwwbb..", ".bbb....wb..", "bbb......w..", "bb...bbb....", "b..bbbbbbbb.", "bbbbbbbbbbBB", "BBBBBBBBBBBB"],
    family: ["..ss....ss..", ".ssss..ssss.", ".ssss..ssss.", "..ss....ss..", ".bbbb..pppp.", ".bbbb..pppp.", ".bbbb.sspppp", ".bb.b.ssp.pp", ".bb.b.vvp.pp", ".....vvvv...", ".....v..v..."],
    book: [".CCCCC.CCCCC", ".CkkkC.CkkkC", ".CCCCC.CCCCC", ".CkkCC.CkkCC", ".CCCCC.CCCCC", ".CkkkC.CkkCC", ".CCCCC.CCCCC", "NNNNNNNNNNNN"],
    school: [".....r......", ".....rrr....", ".....r......", "....nnnn....", "..nnnnnnnn..", ".nnnnnnnnnn.", "NNNNNNNNNNNN", ".CCCCCCCCCC.", ".CbbCNNCbbC.", ".CbbCNkCbbC.", ".CCCCNkCCCC."],
    eye: ["...wwwwww...", ".wwwwwwwwww.", "wwwwBBBBwwww", "wwwBBkkBBwww", "wwwBBkkBBwww", "wwwwBBBBwwww", ".wwwwwwwwww.", "...wwwwww..."],
    lock: ["...eeeee....", "..e.....e...", "..e.....e...", ".yyyyyyyyy..", ".yyyyNyyyY..", ".yyyyNyyyY..", ".yyyyyyyyY..", ".YYYYYYYYY.."],
    rocket: [".....r......", "....wwW.....", "....wbW.....", "....wwW.....", "....wwW.....", "...rwwWr....", "..rrwwWrr...", "....yoy.....", ".....o......"],
    leaf: ["........gg..", "......gggg..", "....gggggG..", "...gggggGG..", "..ggggGgG...", "..gggGgGG...", "..ggGgGG....", "..gGGGG.....", ".N..........", "N..........."],
    berry: ["....gg......", ".....g......", "...BB.BB....", "..BbBBBbB...", "..BBBBBBB...", "...BB.BB....", "..BbBBbBB...", "..BBBBBBB...", "...BBBBB...."],
    fish: ["............", "...bbbbb....", "..bbwbbbb..b", ".bbkbbbbbbbb", ".bbbbbbbb.bb", "..bbbbbbb..b", "...BBBBB...."],
    meat: ["...rrrrr....", "..rrppprr...", ".rrpprrrrR..", ".rrprrrrrR..", ".rrrrrrrRR..", "..rrrrrRRCC.", "...RRRR..CCC", "..........C."],
    flower: ["....pp......", "...pppp.....", "..ppyypp....", "...pppp.....", "....pp......", ".....g......", "..gg.g......", "...ggg......", ".....g......"],
    bone: ["CC.......CC.", "CCC.....CCC.", ".CCCCCCCCC..", ".CCCCCCCCD..", "CCC.....CDD.", "CC.......DD."],
    paw: ["..n..n......", ".nn..nn.....", "..........n.", "n...nn...nn.", "nn.nnnn.....", "..nnnnnn....", "..nnnnnn....", "...nnnn....."],
    dice: [".wwwwwwwww..", ".wkwwwwwkW..", ".wwwwwwwwW..", ".wwwwkwwwW..", ".wwwwwwwwW..", ".wkwwwwwkW..", ".wwwwwwwwW..", ".WWWWWWWWW.."],
    up: ["....ll......", "...llll.....", "..llllll....", ".llllllll...", "....ll......", "....ll......", "....ll......", "....ll......"],
    globe: ["...bbbbb....", "..bggbbbb...", ".bgggbbggb..", ".bggbbbgggb.", ".bbbbbbggbb.", ".bbggbbbbbB.", "..bgggbbbB..", "...bbbbbB..."],
    sound: ["....w.......", "...ww...w...", ".www.w...w..", ".www.w.w.w..", ".www.w.w.w..", "...ww...w...", "....w......."],
    mute: ["....w.......", "...ww.......", ".www.w.r..r.", ".www.w..rr..", ".www.w..rr..", "...ww..r..r.", "....w......."],
    gear: ["....ee......", ".e.eeee.e...", "..eeeeeee...", ".eeeEEeeee..", "eeeE..Eeee..", ".eeeEEeeee..", "..eeeeeee...", ".e.eeee.e...", "....ee......"],
    trophy: [".yyyyyyyy...", "yyyyyyyyyy..", "y.yyyyyy.y..", ".yyyyyyyY...", "..yyyyyY....", "....yY......", "....yY......", "..YYYYYY...."],
    horn: ["..........y.", "........yyy.", "......yyyyy.", "rr..yyyyyyy.", "rrryyyyyyyy.", "rrryyyyyyyy.", "rr..yyyyyyy.", "..r...yyyyy.", "..r.....yyy.", "..........y."],
    girl: ["...pppp.....", "..p....p....", ".p......p...", ".p......p...", ".p......p...", "..p....p....", "...pppp.....", ".....p......", "...ppppp....", ".....p......", ".....p......"],
    boy: [".......bbbbb", ".........bbb", "........b.bb", "...bbbb.b..b", "..b....b....", ".b......b...", ".b......b...", ".b......b...", "..b....b....", "...bbbb....."],
    club: [".........ee.", "........eEee", ".......neeEe", "......nNeee.", ".....nN.....", "....nN......", "...nN.......", "..nN........", ".nN.........", "NN.........."],
    rod: ["..........n.", ".........nNw", "........nN.w", ".......nN..w", "......nN...w", ".....nN....w", "....nN.....r", "...nN......r", "..nN........", ".NN........."],
    coat: ["...CC..CC...", "..CDDCCDDC..", ".CCCCDDCCCC.", "CCCCCDDCCCCC", "CC.CCDDCC.CC", "CC.CCDDCC.CC", "...CCDDCC...", "...CCDDCC...", "...CCDDCC...", "...DDDDDD..."],
    grave: ["....eeee....", "...eeeeee...", "..eeEEEEee..", "..eeeeeeeE..", "..eeEEEeeE..", "..eeeeeeeE..", "..eeeeeeeE..", ".p.eeeeeeE..", "pgpeeeeeEE..", "NgNNNNNNNNN.", "NNNNNNNNNNNN"],
    fist: ["...ssssss...", "..sSsSsSss..", "..ssssssss..", ".sssssssssS.", ".sSSsssssss.", ".ssssssssss.", "..sssssssS..", "..ssssssSS..", "...ssssSS...", "...bbbbbb...", "...bbbbbb..."],
    broken: [".rrr...rrr..", "rrwrr.rrrrr.", "rwrrkrrrrrR.", "rrrrrkrrrrR.", "rrrrkrrrrRR.", ".rrrrkrrRR..", "..rrkrrRR...", "...rrkRR....", "....rRR.....", ".....R......"],
    flag: ["..Nrrrrr....", "..NrrrrrrR..", "..NrrrrrrrR.", "..NrrrrrrR..", "..NrrrrR....", "..NR........", "..N.........", "..N.........", "..N.........", "..N.........", ".NNN........", "NNNNN......."],
    chart: ["..........l.", ".........ll.", "........l.l.", "...l...l....", "..l.l.l.....", ".l...l......", "l..........."]
  };

  // which emoji uses which icon
  var MAP = {
    "✋": "hand", "🫳": "hand", "🤲": "hand", "🪶": "feather", "👆": "finger", "💬": "bubble", "🗣": "bubble", "✨": "sparkle", "💫": "sparkle", "🪄": "wand",
    "🧬": "dna", "💡": "bulb", "🥚": "egg", "🪺": "egg", "🍎": "apple", "🙏": "pray", "🌳": "tree", "🌲": "tree", "🌴": "tree", "🔥": "fire", "🧠": "brain",
    "🛖": "hut", "🏘": "village", "🏕": "hut", "🏙": "village", "🐣": "chick", "🪵": "log", "🌾": "wheat", "🌱": "sprout", "☀": "sun", "🌞": "sun", "🌅": "sun",
    "👺": "grump", "👾": "grump", "🔨": "hammer", "🏗": "hammer", "🍄": "shroom", "🌿": "herb", "🗿": "pole", "🕯": "candle", "🕊": "dove", "🌙": "moon",
    "🌧": "rain", "⛈": "rain", "🌨": "snow", "❄": "snow", "🧊": "snow", "🥶": "snow", "💕": "pinkheart", "💚": "heart", "❤": "heart", "🌟": "star", "⭐": "star", "🌠": "star",
    "😢": "sad", "🥺": "sad", "😠": "angry", "😤": "angry", "💢": "angry", "💤": "zzz", "😴": "zzz", "🥱": "zzz", "🤢": "sick", "💊": "herb", "💧": "drop", "🫧": "drop",
    "🪨": "rock", "🧱": "rock", "🎁": "gift", "✕": "x", "❓": "q", "❔": "q", "🤔": "q", "⏸": "pause", "☰": "menu", "❗": "bang", "🛠": "tools", "⚙": "gear",
    "⛏": "pick", "🪓": "axe", "🏺": "pot", "🧺": "pot", "🍯": "pot", "🧶": "yarn", "🌊": "wave", "👪": "family", "🧑": "family", "📜": "book", "📖": "book", "🏫": "school", "🎓": "school",
    "👁": "eye", "👀": "eye", "🔒": "lock", "🚀": "rocket", "🍂": "leaf", "🫐": "berry", "🐟": "fish", "🍖": "meat", "🌸": "flower", "🌼": "flower", "🐾": "paw", "👣": "paw",
    "🎲": "dice", "⬆": "up", "🌌": "globe", "🏝": "globe", "🔊": "sound", "📣": "horn", "♀": "girl", "🪦": "grave", "👊": "fist", "💔": "broken", "📜": "book", "🏏": "club", "🎣": "rod", "🧥": "coat", "♂": "boy", "📢": "horn", "🔇": "mute", "🏆": "trophy", "💯": "trophy", "📐": "chart", "🚩": "flag", "🌉": "log", "🛶": "log"
  };
  IC.MAP = MAP;
  IC.ART = ART;

  var RX = /(?:[⌀-⏿☀-➿⬀-⯿]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDEFF])️?/g;
  IC.RX = RX;
  var cache = {}, cssDone = {}, sheet = null, n = 0;
  function bare(ch) { return ch.replace(/️/g, ""); }

  // paint an icon to a 14×14 canvas (12×12 art + 1px outline)
  function outline(ctx, S) {
    var img = ctx.getImageData(0, 0, S, S), d = img.data, a = new Uint8Array(S * S), i, x, y;
    for (i = 0; i < S * S; i++) a[i] = d[i * 4 + 3] > 100 ? 1 : 0;
    var oc = [parseInt(OUT.slice(1, 3), 16), parseInt(OUT.slice(3, 5), 16), parseInt(OUT.slice(5, 7), 16)];
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      i = y * S + x;
      if (a[i]) { d[i * 4 + 3] = 255; continue; }
      d[i * 4 + 3] = 0;
      if ((x > 0 && a[i - 1]) || (x < S - 1 && a[i + 1]) || (y > 0 && a[i - S]) || (y < S - 1 && a[i + S])) { d[i * 4] = oc[0]; d[i * 4 + 1] = oc[1]; d[i * 4 + 2] = oc[2]; d[i * 4 + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0);
  }
  function fromArt(rows) {
    var cv = document.createElement("canvas"); cv.width = cv.height = 14;
    var ctx = cv.getContext("2d", { willReadFrequently: true }), top = 1 + Math.floor((12 - rows.length) / 2);
    rows.forEach(function (r, y) { for (var x = 0; x < r.length && x < 12; x++) { var col = PAL[r[x]]; if (col) { ctx.fillStyle = col; ctx.fillRect(x + 1, y + top, 1, 1); } } });
    outline(ctx, 14);
    return cv;
  }
  // anything else: draw the emoji small, posterize it and outline it, so it reads as pixel art too
  function pixelate(ch) {
    var cv = document.createElement("canvas"); cv.width = cv.height = 14;
    var ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.font = "11px system-ui, 'apple color emoji', 'segoe ui emoji', 'noto color emoji', sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(ch, 7, 7.5);
    var img = ctx.getImageData(0, 0, 14, 14), d = img.data, solid = 0;
    for (var i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 110) { d[i + 3] = 0; continue; }
      solid++;
      for (var k = 0; k < 3; k++) d[i + k] = Math.min(255, Math.round(d[i + k] * 255 / d[i + 3] / 51) * 51);
      d[i + 3] = 255;
    }
    if (solid < 6) return null; // no emoji font: leave the character alone
    ctx.putImageData(img, 0, 0);
    outline(ctx, 14);
    return cv;
  }
  // the 14×14 canvas for an emoji (or null)
  IC.canvas = function (ch) {
    var key = bare(ch);
    if (key in cache) return cache[key];
    var cv = null;
    try { cv = ART[MAP[key]] ? fromArt(ART[MAP[key]]) : (typeof document !== "undefined" ? pixelate(key) : null); } catch (e) { cv = null; }
    cache[key] = cv;
    return cv;
  };
  IC.byName = function (name) { var k = "#" + name; if (!(k in cache)) cache[k] = ART[name] ? fromArt(ART[name]) : null; return cache[k]; };
  function cls(ch) {
    var key = bare(ch);
    if (cssDone[key] !== undefined) return cssDone[key];
    var cv = IC.canvas(key);
    if (!cv) return (cssDone[key] = null);
    if (!sheet) { var st = document.createElement("style"); document.head.appendChild(st); sheet = st.sheet; }
    var name = "pxi" + (n++);
    sheet.insertRule("." + name + "{background-image:url(" + cv.toDataURL() + ")}", sheet.cssRules.length);
    return (cssDone[key] = name);
  }
  IC.html = function (name) { var cv = IC.byName(name); return cv ? '<i class="pxi" style="background-image:url(' + cv.toDataURL() + ')"></i>' : ""; };

  // swap emoji in a text node for <i class="pxi …"> icons
  function swapText(node) {
    var s = node.nodeValue;
    RX.lastIndex = 0;
    if (!s || !RX.test(s)) return;
    var p = node.parentNode;
    if (!p || /^(SCRIPT|STYLE|TEXTAREA|OPTION|TITLE)$/.test(p.nodeName)) return;
    var frag = document.createDocumentFragment(), last = 0, m;
    RX.lastIndex = 0;
    while ((m = RX.exec(s))) {
      var c = cls(m[0]);
      if (!c) continue;
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      var i = document.createElement("i"); i.className = "pxi " + c; i.setAttribute("role", "img"); i.setAttribute("aria-label", m[0]);
      frag.appendChild(i);
      last = m.index + m[0].length;
    }
    if (!last) return;
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    p.replaceChild(frag, node);
  }
  function walk(root) {
    if (root.nodeType === 3) { swapText(root); return; }
    if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|CANVAS|INPUT)$/.test(root.nodeName)) return;
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), list = [], t;
    while ((t = tw.nextNode())) list.push(t);
    list.forEach(swapText);
  }
  IC.swap = walk;
  // watch the whole page: everything the UI writes gets pixel icons, with no changes to how it's written
  IC.watch = function (root) {
    if (typeof MutationObserver === "undefined") return;
    walk(root);
    var pending = [], queued = false;
    var mo = new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === "characterData") pending.push(m.target);
        else for (var j = 0; j < m.addedNodes.length; j++) pending.push(m.addedNodes[j]);
      }
      if (!queued) { queued = true; Promise.resolve().then(flush); }
    });
    function flush() { queued = false; var p = pending; pending = []; for (var i = 0; i < p.length; i++) if (p[i].isConnected) walk(p[i]); }
    mo.observe(root, { childList: true, subtree: true, characterData: true });
  };

  // canvas text with icons: draws `text` like fillText, but emoji become pixel icons `size` px tall
  IC.fillText = function (ctx, text, x, y, size, stroke) {
    text = String(text).replace(/f(?=[filt])/g, "f\u200C"); // the pixel font's fi/fl ligatures look broken; keep letters apart
    RX.lastIndex = 0;
    if (!RX.test(text)) { if (stroke) ctx.strokeText(text, x, y); ctx.fillText(text, x, y); return; }
    var parts = [], last = 0, m, w = 0, s = Math.round(size / 14) * 14 || 14;
    RX.lastIndex = 0;
    while ((m = RX.exec(text))) {
      if (m.index > last) parts.push(text.slice(last, m.index));
      parts.push({ cv: IC.canvas(m[0]), ch: m[0] });
      last = m.index + m[0].length;
    }
    if (last < text.length) parts.push(text.slice(last));
    parts.forEach(function (p) { w += typeof p === "string" ? ctx.measureText(p).width : p.cv ? s + 1 : ctx.measureText(p.ch).width; });
    var align = ctx.textAlign, px = align === "center" ? x - w / 2 : align === "right" || align === "end" ? x - w : x;
    ctx.textAlign = "left";
    var smooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    parts.forEach(function (p) {
      if (typeof p === "string") { if (stroke) ctx.strokeText(p, px, y); ctx.fillText(p, px, y); px += ctx.measureText(p).width; }
      else if (p.cv) { var by = ctx.textBaseline === "middle" ? y - s / 2 : ctx.textBaseline === "top" ? y : y - s * 0.8; ctx.drawImage(p.cv, Math.round(px), Math.round(by), s, s); px += s + 1; }
      else { ctx.fillText(p.ch, px, y); px += ctx.measureText(p.ch).width; }
    });
    ctx.textAlign = align; ctx.imageSmoothingEnabled = smooth;
  };
})();
