/* ghost bus: rules, levels, solver, daily town. shared by the game and the node checks. */
(function (root) {
'use strict';

/* map format: node rows and street rows alternate.
   node rows: D depot, H horn, o corner, a-n places. between nodes: - street, > < one-way, = rickety bridge, space none.
   street rows: | street, v ^ one-way, # rickety bridge, space none. between them a block: . houses, t trees, w water, g graves, s shops, p pumpkins.
   ghosts: "a>b type [z]" (z = asleep until the bus honks). feuds: "0-1" (won't ride together). s = seats. k = dawn slack over par. */

var HOODS = [
  { name: 'old town', rule: 'seats', blurb: 'pick ghosts up, drop them off. the bus has seats. the sun has opinions.' },
  { name: 'the suburbs', rule: 'feuds', blurb: 'some ghosts will not ride together. divorce is forever, apparently.' },
  { name: 'riverside', rule: 'roads', blurb: 'one-way streets and a bridge that can take exactly one more bus.' },
  { name: 'the hill', rule: 'horn', blurb: 'sleepy ghosts only board once you\'ve honked. everyone else hates the horn.' }
];

var LEVELS = [
/* ---------- old town: seats + dawn ---------- */
{ name: 'first stop', s: 3, k: 4,
  map: ['D-a-o-b',
        '|.|t|.|',
        'o-o-o-o'],
  n: 'a:bus shelter,b:the chippy', g: ['a>b gary'],
  tip: 'drag from the bus to draw a route. pick gary up, drop him at the chippy. press go.' },
{ name: 'two\'s company', s: 3, k: 4,
  map: ['D-a-o-o',
        '|.|.|t|',
        'o-o-o-b',
        '|t|.|.|',
        'c-o-o-d'],
  n: 'a:the bakery,b:the laundrette,c:the graveyard,d:the old cinema', g: ['a>d nan', 'b>c kid'],
  tip: 'two ghosts. any order. shorter routes get more stars.' },
{ name: 'standing room only', s: 1, k: 4,
  map: ['D-a-o-b',
        '|.|.|.|',
        'o-c-o-o',
        '|.|t|.|',
        'o-o-o-d'],
  n: 'a:the library,b:the gym,c:the karaoke bar,d:the post office', g: ['a>b nerd', 'c>d nan'],
  tip: 'one seat. drive past a waiting ghost with a full bus and they get grumpy. grumpy ghosts cost the happy star.' },
{ name: 'the long way round', s: 3, k: 4,
  map: ['D-o-o-a',
        '|.   .|',
        'o-o-o-o',
        '|t .|. ',
        'b-o-c-o'],
  n: 'a:the pier,b:the dentist,c:the bowling alley', g: ['a>b lord', 'c>a gary'],
  tip: 'no street, no bus. the town planner was also a ghost.' },
{ name: 'cul-de-sac', s: 2, k: 4,
  map: ['D-o-o-o-a',
        '|.|.|.|. ',
        'o-o-b-o o',
        '|t| |.|.|',
        'c-o d-o-o'],
  n: 'a:the lighthouse,b:the church,c:the bingo hall,d:the vet', g: ['a>c lord', 'd>b cat'],
  tip: 'dead ends are fine. the bus can do a u-turn. drag back the way you came.' },
{ name: 'the high street', s: 2, k: 3,
  map: ['o-o-o-o-o',
        '|.| |s| |',
        'a-b-c-d-e',
        '| |s| |.|',
        'D-o-o-o-o'],
  n: 'a:the barbers,b:the bakery,c:the bank,d:the bookies,e:the late chemist', g: ['a>e gary', 'b>e nan', 'c>e kid'],
  tip: 'everyone wants the late chemist. two seats. you can be quick or you can be kind. stars for both, just maybe not at once.' },
{ name: 'rush hour (dead)', s: 2, k: 4,
  map: ['D-o-a-o-b',
        '|.|.|t|.|',
        'c-o-o-o-o',
        '|t|.|.|.|',
        'o-o-d-o-e'],
  n: 'a:the chippy,b:the graveyard,c:the laundrette,d:the bakery,e:the old cinema', g: ['a>d gary', 'c>e kid', 'b>c nan'],
  tip: 'two seats. three ghosts. the maths is not in your favour.' },
{ name: 'the one-seater', s: 1, k: 3,
  map: ['a-o-b-o-c',
        '|.| |.| |',
        'D-o-o-o-d'],
  n: 'a:the old school,b:the bingo hall,c:the chippy,d:the graveyard', g: ['a>c gary', 'b>d nan', 'c>d kid'],
  tip: 'one seat. the quick way means driving past someone. they will remember. they have nothing but time.' },
{ name: 'everyone wants the cinema', s: 2, k: 3,
  map: ['a-o-o-o-b',
        '|.|t|.|.|',
        'o-o-D-o-o',
        '|.|.|t|.|',
        'c-o-e-o-d'],
  n: 'a:the bakery,b:the gym,c:the old cinema,d:the dentist,e:the vet', g: ['a>c nan', 'b>c gary', 'd>c kid', 'e>a cat'],
  tip: 'three ghosts, one film, one cat who wants the bakery. two seats. quick or kind, again.' },
{ name: 'last orders', s: 2, k: 2,
  map: ['a-o-D-o-b',
        '|.|.|.|.|',
        'o-o-o-c-o',
        '|.|t|.|t|',
        'd-o-e-o-f'],
  n: 'a:the pub,b:the other pub,c:the chippy,d:the graveyard,e:the bowling alley,f:the vet', g: ['a>f gary', 'b>d nan', 'c>a kid', 'd>e nerd', 'f>b cat'],
  tip: 'old town finale. five ghosts, two seats, one very tired driver.' },

/* ---------- the suburbs: feuds ---------- */
{ name: 'the divorce', s: 3, k: 4,
  map: ['D-a-o-b',
        '|.|.|.|',
        'o-o-o-o',
        '|.|t|.|',
        'c-o-o-d'],
  n: 'a:number 4,b:number 9,c:the garden centre,d:the solicitor', g: ['a>d wife', 'b>c hus'], f: ['0-1'],
  tip: 'margaret and dennis won\'t ride together. 40 years married, 60 years dead, still not talking.' },
{ name: 'garlic bread', s: 3, k: 4,
  map: ['D-o-a-o-b',
        '|.|.|.|.|',
        'o-o-o-o-o',
        '|t|.|.|.|',
        'c-o-o-d-o'],
  n: 'a:the castle,b:the italian,c:the blood bank,d:the farmers market', g: ['a>c vamp', 'b>d chef'], f: ['0-1'],
  tip: 'the vampire and the garlic chef. you can guess.' },
{ name: 'the mime and the clown', s: 3, k: 3,
  map: ['D-o-a-o',
        '|.|.|.|',
        'b-o-o-c',
        '|t|.|.|',
        'o-d-o-o'],
  n: 'a:the circus,b:the theatre,c:the kids party,d:the silent disco', g: ['a>d mime', 'c>d clown', 'd>b gary'], f: ['0-1'],
  tip: 'the mime won\'t say why. the clown won\'t stop saying why.' },
{ name: 'the reunion', s: 2, k: 3,
  map: ['D-a-o-o-b',
        '|.|.|t|.|',
        'o-o-c-o-o',
        '|.|.|.|.|',
        'd-o-o-o-e'],
  n: 'a:number 7,b:number 22,c:the town hall,d:the wedding venue,e:the divorce lawyer', g: ['a>d wife', 'b>d hus', 'c>e lord'], f: ['0-1'],
  tip: 'they\'re both going to the same wedding. separately.' },
{ name: 'the long parade', s: 2, k: 3,
  map: ['a-o-b-o-c-o-d',
        '|.| |s| |t| |',
        'D-o-o-o-o-o-e'],
  n: 'a:the castle,b:the italian,c:the bus stop,d:the town fete,e:the allotments', g: ['a>d vamp', 'b>d chef', 'd>e gary'], f: ['0-1'],
  tip: 'the vampire and the garlic chef are both judging the town fete. one long street. nobody likes being driven past.' },
{ name: 'neighbours', s: 3, k: 3,
  map: ['a-o-b-o-c',
        '|.|.|.|.|',
        'o-o-D-o-o',
        '|t|.|.|t|',
        'd-o-o-o-e'],
  n: 'a:number 1,b:number 2,c:number 3,d:the hedge shop,e:the council', g: ['a>e nan', 'b>d lord', 'c>d gary'], f: ['0-1', '1-2'],
  tip: 'sir reginald has a hedge dispute with everyone.' },
{ name: 'the dinner party', s: 3, k: 3,
  map: ['D-o-a-o-b',
        '|.|.|t|.|',
        'c-o-o-o-o',
        '|.|.|.|.|',
        'o-d-o-o-e'],
  n: 'a:the castle,b:the italian,c:number 6,d:the dinner party,e:number 13', g: ['a>d vamp', 'b>d chef', 'c>e wife', 'e>d hus'], f: ['0-1', '2-3'],
  tip: 'everyone\'s invited. nobody gets on with anybody.' },
{ name: 'school run', s: 3, k: 3,
  map: ['a-o-D-o-b',
        '|.|.|.|.|',
        'o-o-o-o-o',
        '|.|t|.|.|',
        'c-o-o-o-d'],
  n: 'a:number 12,b:number 31,c:the old school,d:the playground', g: ['a>d kid', 'c>b kid2', 'd>b nan'], f: ['0-1'],
  tip: 'two victorian children. one bus. they will bite.' },
{ name: 'custody weekend', s: 2, k: 3,
  map: ['a-o-o-o-b',
        '|.|t|.|.|',
        'o-o-D-o-o',
        '|.|.|.|t|',
        'c-o-o-o-d'],
  n: 'a:mum\'s house,b:dad\'s house,c:the zoo,d:the park', g: ['a>c wife', 'b>c hus', 'c>a kid', 'd>a kid2'], f: ['0-1', '2-3'],
  tip: 'the kids have also stopped speaking. it\'s genetic.' },
{ name: 'cul-de-sac drama', s: 2, k: 2,
  map: ['D-o-a-o-b',
        '|.|.|.|.|',
        'o-o-o-o-o',
        '|t|.|t|.|',
        'c-o-d-o-e'],
  n: 'a:number 1,b:number 5,c:the castle,d:the italian,e:the circus', g: ['a>c mime', 'b>e vamp', 'c>e chef', 'd>c clown', 'e>d gary'], f: ['0-3', '1-2'],
  tip: 'suburbs finale. two feuds. one cul-de-sac. no survivors (already).' },

/* ---------- riverside: one-way streets + rickety bridges ---------- */
{ name: 'one way', s: 3, k: 4,
  map: ['D>o>a>o',
        '|.|.|.v',
        'o<o<b<o'],
  n: 'a:the boathouse,b:the fish shop', g: ['a>b gary'],
  tip: 'arrows mean one-way. the ghosts didn\'t make the rules. the council did. also ghosts.' },
{ name: 'the roundabout', s: 2, k: 4,
  map: ['D-o>a>o',
        '|.^.v.|',
        'b-o<o<o',
        '|t|.|.|',
        'o-o-c-o'],
  n: 'a:the marina,b:the lock keeper,c:the tackle shop', g: ['a>c lord', 'c>a gary'],
  tip: 'the roundabout only goes clockwise. like time. and gary.' },
{ name: 'the old bridge', s: 3, k: 4,
  map: ['D-a-o-o',
        '|.|.|.|',
        'o-o-o-o',
        ' w#w w|',
        'b-o-c-o'],
  n: 'a:the boathouse,b:the ferry office,c:the lighthouse', g: ['a>b nan', 'c>a gary'],
  tip: 'the rickety bridge takes one bus, then falls in the river. the long way round is very long.' },
{ name: 'the rickety mile', s: 2, k: 3,
  map: ['a-o-b-o-c-o-d',
        '#w|w#w|w#w| |',
        'D-o-o-o-o-o-e'],
  n: 'a:the boathouse,b:the swans,c:the old mill,d:the weir,e:the ferry steps', g: ['a>d gary', 'b>a nan', 'c>a lord'],
  tip: 'three rickety bridges, one trip each. the quick way drives past someone. the river is not judging you. the ghosts are.' },
{ name: 'the harbour', s: 2, k: 3,
  map: ['D>o>o>a',
        '^.v.^.v',
        'o-o-b-o',
        '^.v.^.v',
        'c<o<o<d'],
  n: 'a:the harbour,b:the fish market,c:the lifeboat station,d:the docks', g: ['a>b lord', 'c>d nan', 'd>a gary'],
  tip: 'the harbour is all one-way. the ghosts want to go the other way. obviously.' },
{ name: 'spaghetti junction', s: 2, k: 3,
  map: ['D>o-a<o',
        'v.^.v.^',
        'o-o>o-b',
        '|.v.v.|',
        'c<o-o>d'],
  n: 'a:the flyover,b:the services,c:the car boot sale,d:the ring road', g: ['a>c gary', 'b>a nerd', 'd>b nan', 'c>d kid'],
  tip: 'whoever designed this junction is haunting it.' },
{ name: 'the towpath', s: 2, k: 3,
  map: ['a>o>b>o>c>o>d',
        '|w| |w| |w| |',
        'D-o-o-o-o-o-e'],
  n: 'a:the lock,b:the narrowboat,c:the tea hut,d:the marina,e:the boat club', g: ['a>d gary', 'b>d nan', 'c>e kid'],
  tip: 'the towpath is one-way and everyone is on it. quick or kind. come back for the other star.' },
{ name: 'canal street', s: 2, k: 3,
  map: ['D-o>o>o-a',
        '|.vwvw|.|',
        'b-o-o-o-c',
        '|.^w^w|.|',
        'o-o<d<o-e'],
  n: 'a:the narrowboat,b:the lock,c:the canal cafe,d:the towpath,e:the pumping station', g: ['b>d gary', 'c>b nan', 'e>a kid'],
  tip: 'canal traffic flows both ways. just never on the same street. quick or kind: your call.' },
{ name: 'troll toll', s: 2, k: 3,
  map: ['D-a-o-o',
        '|.|.|.|',
        'o-o-o-b',
        ' w#w#w ',
        'c-o-o-d'],
  n: 'a:the mill,b:the troll house,c:the bank,d:the boat yard', g: ['a>d kid', 'd>b lord', 'c>a chef', 'b>c nan'],
  tip: 'two rickety bridges and four crossings. the troll charges nothing. the river charges everything.' },
{ name: 'the last ferry', s: 2, k: 2,
  map: ['D-o-a-o-b',
        '|.v.|w#.|',
        'o-o>o=o-c',
        '|w#.|.^.|',
        'd-o-o<o-e'],
  n: 'a:the pier,b:the lighthouse,c:the ferry,d:the island,e:the fish shop', g: ['a>e vamp', 'b>d chef', 'c>a nan', 'd>c gary', 'e>b lord'], f: ['0-1'],
  tip: 'riverside finale. bridges, arrows, garlic. good luck.' },

/* ---------- the hill: the horn ---------- */
{ name: 'wakey wakey', s: 3, k: 4,
  map: ['D-H-o-o',
        '|.|.|.|',
        'o-o-a-o',
        '|t|.|.|',
        'o-o-o-b'],
  n: 'a:the old house,b:the observatory', g: ['a>b sleepy z'],
  tip: 'sleepy ghosts (nightcap) only board after the bus has honked. drive over a horn to honk.' },
{ name: 'detour to the horn', s: 2, k: 3,
  map: ['D-o-a-o-H',
        '|.|.|.|.|',
        'o-o-o-o-o',
        '|t|.|t|.|',
        'b-o-o-o-c'],
  n: 'a:the manor,b:the windmill,c:the ruined abbey', g: ['a>b sleepy z', 'c>b gary'],
  tip: 'the horn is the wrong way. of course it is.' },
{ name: 'hill start', s: 2, k: 3,
  map: ['a-o-o-D-b',
        '|.|.|.|.|',
        'o-H-o-o-o',
        '|.|t|.|.|',
        'c-o-o-o-d'],
  n: 'a:the cottage,b:the barn,c:the well,d:the scarecrow', g: ['a>d sleepy z', 'b>c nan', 'c>b sleepy2 z'],
  tip: 'two sleepers. one honk wakes the whole hill.' },
{ name: 'the hilltop fair', s: 2, k: 3,
  map: ['o-o-H-o-o',
        '|.| |t| |',
        'a-b-c-d-e',
        '| |.| |g|',
        'D-o-o-o-o'],
  n: 'a:the cottage,b:the tea room,c:the post box,d:the pub,e:the hilltop fair', g: ['a>e sleepy z', 'b>e nan', 'd>e gary'],
  tip: 'everyone is off to the hilltop fair. sue is asleep. the horn is up the hill. honk, and be quick, or be kind.' },
{ name: 'over the hill', s: 2, k: 3,
  map: ['D-o-o-o-a',
        '|w#w|.|.|',
        'o-o-H>o-o',
        '|.|.^w#w|',
        'b-o-o-o-c'],
  n: 'a:the hilltop,b:the valley,c:the old mill', g: ['a>b sleepy z', 'c>a nan', 'b>c sleepy2 z'],
  tip: 'everything at once. arrows, bridges, horn. the hill is a lot.' },
{ name: 'graveyard shift', s: 3, k: 2,
  map: ['a-o-o-D-o-b',
        '|.|g|g|.|.|',
        'o-o-H-o-o-o',
        '|.|g|g|.|t|',
        'c-o-o-o-d-e'],
  n: 'a:the crypt,b:the morgue,c:the funeral home,d:the florist,e:the graveyard', g: ['a>e sleepy z', 'b>c vamp', 'c>d chef', 'd>a nan', 'e>b sleepy2 z'], f: ['1-2'],
  tip: 'the graveyard opens at midnight. so does everything else.' },
{ name: 'the switchbacks', s: 2, k: 3,
  map: ['D-o-o-o-a',
        '  |.|.|  ',
        'o-o-H o-o',
        '|.| |.|.|',
        'b-o-o-o-c'],
  n: 'a:the summit,b:the ski lodge,c:the cable car', g: ['a>b sleepy z', 'c>a gary', 'b>c kid'],
  tip: 'mountain roads. the bus is not happy. neither is gary.' },
{ name: 'wedding bells', s: 2, k: 3,
  map: ['D-o-a-o-b',
        '|.|.|t|.|',
        'o-H-o-o-o',
        '|.|.|.|.|',
        'c-o-o-d-o'],
  n: 'a:the bride\'s house,b:the groom\'s house,c:the chapel,d:the reception', g: ['a>c wife', 'b>c hus', 'c>d sleepy z', 'd>a lord'], f: ['0-1'],
  tip: 'remarrying each other. still can\'t share a bus. the vicar is asleep.' },
{ name: 'bed and breakfast', s: 2, k: 3,
  map: ['a-o-D-o-b',
        '|t|.|.|.|',
        'o-o-o-o-o',
        '|.|.|t|.|',
        'c-o-H-o-d'],
  n: 'a:the b&b,b:the inn,c:the breakfast bar,d:the vampire\'s castle', g: ['a>c sleepy z', 'b>d vamp', 'c>d chef', 'd>a sleepy2 z'], f: ['1-2'],
  tip: 'the full english contains garlic. the vampire did not read the menu.' },
{ name: 'dawn patrol', s: 2, k: 2,
  map: ['D-o-a-o-o-b',
        '|.v.|w#w|.|',
        'o-o-H-o=o-c',
        '|t|.|.|.^.|',
        'd-o-o<o-e-o'],
  n: 'a:the clock tower,b:the radio mast,c:the lighthouse,d:the dairy,e:the milk float depot', g: ['a>e sleepy z', 'b>d wife', 'c>a hus', 'd>c sleepy2 z', 'e>b gary'], f: ['1-2'],
  tip: 'the final route. the sun\'s nearly up. so is the milkman.' }
];

var DEF_PLACES = 'the corner shop,the graveyard,the old cinema,the chippy,the laundrette,the bakery,the library,the bingo hall,the vet,the dentist,the pub,the gym,the church,the karaoke bar'.split(',');

function parse(L) {
  var m = L.map, H = (m.length + 1) / 2, W = (m[0].length + 1) / 2, N = W * H;
  if (m.length % 2 === 0) throw new Error('map rows must be odd: ' + L.name);
  for (var r = 0; r < m.length; r++) if (m[r].length !== 2 * W - 1) throw new Error('row ' + r + ' length ' + m[r].length + ' != ' + (2 * W - 1) + ' in ' + L.name);
  var nodes = [], places = {}, depot = -1, isHorn = new Uint8Array(N), placeName = {};
  var names = {};
  if (L.n) L.n.split(',').forEach(function (s) { var i = s.indexOf(':'); names[s.slice(0, i)] = s.slice(i + 1); });
  for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
    var ch = m[2 * y][2 * x], id = y * W + x;
    var nd = { x: x, y: y, ch: ch, place: null };
    if (ch === 'D') depot = id;
    else if (ch === 'H') isHorn[id] = 1;
    else if (/[a-n]/.test(ch)) { places[ch] = id; nd.place = ch; placeName[ch] = names[ch] || DEF_PLACES[ch.charCodeAt(0) - 97]; }
    else if (ch !== 'o') throw new Error('bad node ' + ch + ' in ' + L.name);
    nodes.push(nd);
  }
  if (depot < 0) throw new Error('no depot in ' + L.name);
  var edges = [], adj = [], nb = 0;
  for (var i = 0; i < N; i++) adj.push([]);
  function add(a, b, ch) {
    var e = { a: a, b: b, from: -1, bridge: false, bi: -1, ch: ch };
    if (ch === '>' || ch === 'v') e.from = a;
    else if (ch === '<' || ch === '^') e.from = b;
    else if (ch === '=' || ch === '#') { e.bridge = true; e.bi = nb++; }
    else if (ch !== '-' && ch !== '|') throw new Error('bad street ' + ch + ' in ' + L.name);
    var ei = edges.length; edges.push(e);
    if (e.from < 0 || e.from === a) adj[a].push({ to: b, e: ei });
    if (e.from < 0 || e.from === b) adj[b].push({ to: a, e: ei });
  }
  for (y = 0; y < H; y++) for (x = 0; x < W - 1; x++) { var c = m[2 * y][2 * x + 1]; if (c !== ' ') add(y * W + x, y * W + x + 1, c); }
  for (y = 0; y < H - 1; y++) for (x = 0; x < W; x++) { c = m[2 * y + 1][2 * x]; if (c !== ' ') add(y * W + x, (y + 1) * W + x, c); }
  var decor = [];
  for (y = 0; y < H - 1; y++) { var row = []; for (x = 0; x < W - 1; x++) row.push(m[2 * y + 1][2 * x + 1]); decor.push(row); }
  var ghosts = (L.g || []).map(function (s) {
    var p = s.split(' '), ft = p[0].split('>');
    if (!(ft[0] in places) || !(ft[1] in places)) throw new Error('ghost place missing ' + s + ' in ' + L.name);
    return { from: places[ft[0]], to: places[ft[1]], fromL: ft[0], toL: ft[1], type: p[1] || 'gary', sleepy: p.indexOf('z') > 1 };
  });
  var enemies = ghosts.map(function () { return 0; });
  (L.f || []).forEach(function (s) { var ab = s.split('-').map(Number); enemies[ab[0]] |= 1 << ab[1]; enemies[ab[1]] |= 1 << ab[0]; });
  return { name: L.name, tip: L.tip || '', W: W, H: H, N: N, nodes: nodes, edges: edges, adj: adj, depot: depot, isHorn: isHorn,
    places: places, placeName: placeName, ghosts: ghosts, enemies: enemies, seats: L.s || 3, slack: L.k == null ? 3 : L.k, nb: nb, decor: decor, src: L };
}

/* one bus arrives at a node. S = {pos, st:[], honk, bm, grumpy:[]} ; ev optional list */
function arrive(P, S, node, ev) {
  S.pos = node;
  if (P.isHorn[node] && !S.honk) { S.honk = 1; if (ev) ev.push({ t: 'honk', node: node }); }
  var G = P.ghosts, i;
  for (i = 0; i < G.length; i++) if (S.st[i] === 1 && G[i].to === node) { S.st[i] = 2; if (ev) ev.push({ t: 'drop', g: i, node: node }); }
  for (i = 0; i < G.length; i++) if (S.st[i] === 0 && G[i].from === node) {
    var on = 0, foe = -1;
    for (var j = 0; j < G.length; j++) if (S.st[j] === 1) { on++; if (P.enemies[i] & (1 << j)) foe = j; }
    if (G[i].sleepy && !S.honk) { if (ev) ev.push({ t: 'asleep', g: i, node: node }); }
    else if (on >= P.seats) { S.grumpy[i] = 1; if (ev) ev.push({ t: 'full', g: i, node: node }); }
    else if (foe >= 0) { S.grumpy[i] = 1; if (ev) ev.push({ t: 'feud', g: i, foe: foe, node: node }); }
    else { S.st[i] = 1; if (ev) ev.push({ t: 'board', g: i, node: node }); }
  }
}

function fresh(P) { return { pos: P.depot, st: P.ghosts.map(function () { return 0; }), honk: 0, bm: 0, grumpy: P.ghosts.map(function () { return 0; }) }; }

function edgeBetween(P, a, b) { var l = P.adj[a]; for (var i = 0; i < l.length; i++) if (l[i].to === b) return l[i].e; return -1; }

/* moves allowed from the end of a route (respects one-way, used bridges, dawn) */
function legalNext(P, route) {
  var bm = 0;
  for (var i = 1; i < route.length; i++) { var e = P.edges[edgeBetween(P, route[i - 1], route[i])]; if (e && e.bridge) bm |= 1 << e.bi; }
  var end = route[route.length - 1];
  return P.adj[end].filter(function (m) { var e = P.edges[m.e]; return !(e.bridge && (bm & (1 << e.bi))); });
}

/* drive a route; returns per-step events and the final state */
function simulate(P, route) {
  var S = fresh(P), steps = [], ev = [];
  arrive(P, S, route[0], ev); steps.push(ev);
  for (var i = 1; i < route.length; i++) {
    ev = [];
    var ei = edgeBetween(P, route[i - 1], route[i]); if (ei < 0) { steps.push([{ t: 'bad' }]); break; }
    var e = P.edges[ei];
    if (e.bridge) { if (S.bm & (1 << e.bi)) { steps.push([{ t: 'bad' }]); break; } S.bm |= 1 << e.bi; ev.push({ t: 'bridge', e: ei }); }
    arrive(P, S, route[i], ev); steps.push(ev);
  }
  var done = S.st.every(function (s) { return s === 2; });
  var happy = done && S.grumpy.every(function (g) { return !g; });
  return { steps: steps, S: S, done: done, happy: happy, len: route.length - 1 };
}

/* breadth-first search over (node, ghost states, honked, bridges used, anyone grumpy). returns shortest finish and shortest happy finish */
function solve(P, maxD) {
  maxD = maxD || 70;
  var G = P.ghosts.length, S3 = Math.pow(3, G), BM = 1 << P.nb, total = P.N * S3 * 2 * BM * 2;
  if (total > 6e6) throw new Error('state space too big ' + total);
  var pow3 = []; for (var i = 0; i < G; i++) pow3.push(Math.pow(3, i));
  var parent = new Int32Array(total).fill(-2);
  function enc(S, g) { var st = 0; for (var i = 0; i < G; i++) st += S.st[i] * pow3[i]; return ((((S.pos * S3 + st) * 2 + S.honk) * BM + S.bm) * 2 + g); }
  function dec(k) {
    var g = k % 2; k = (k - g) / 2; var bm = k % BM; k = (k - bm) / BM; var h = k % 2; k = (k - h) / 2; var st = k % S3; var pos = (k - st) / S3;
    var a = []; for (var i = 0; i < G; i++) { a.push(st % 3); st = (st - st % 3) / 3; }
    return { pos: pos, st: a, honk: h, bm: bm, grumpy: a.map(function () { return 0; }), g: g };
  }
  var S0 = fresh(P); arrive(P, S0, P.depot, null);
  var k0 = enc(S0, S0.grumpy.some(Boolean) ? 1 : 0);
  parent[k0] = -1;
  var frontier = [k0], depth = 0, best = null, bestHappy = null, goal = S3 - 1, explored = 0;
  function isGoal(k) { var x = Math.floor(k / (2 * BM * 2)); return (x % S3) === goal; }
  while (frontier.length && depth <= maxD) {
    for (i = 0; i < frontier.length; i++) {
      var k = frontier[i];
      if (isGoal(k)) { if (!best) best = { len: depth, key: k }; if (!bestHappy && k % 2 === 0) bestHappy = { len: depth, key: k }; }
    }
    if (bestHappy) break;
    var next = [];
    for (i = 0; i < frontier.length; i++) {
      k = frontier[i]; if (isGoal(k)) continue;
      var D = dec(k); explored++;
      var moves = P.adj[D.pos];
      for (var j = 0; j < moves.length; j++) {
        var e = P.edges[moves[j].e];
        if (e.bridge && (D.bm & (1 << e.bi))) continue;
        var S = { pos: D.pos, st: D.st.slice(), honk: D.honk, bm: D.bm | (e.bridge ? 1 << e.bi : 0), grumpy: D.grumpy.slice() };
        arrive(P, S, moves[j].to, null);
        var nk = enc(S, (D.g || S.grumpy.some(Boolean)) ? 1 : 0);
        if (parent[nk] === -2) { parent[nk] = k; next.push(nk); }
      }
    }
    frontier = next; depth++;
  }
  function path(k) { var r = []; while (k >= 0) { r.push(dec(k).pos); k = parent[k]; } return r.reverse(); }
  return { par: best ? best.len : -1, route: best ? path(best.key) : null, happy: bestHappy ? bestHappy.len : -1, happyRoute: bestHappy ? path(bestHappy.key) : null, explored: explored };
}

/* level info used by the game: par, dawn (route limit) */
function analyse(P) {
  var r = solve(P, 80);
  if (r.par < 0) return { ok: false };
  var dawn = Math.max(r.par + P.slack, r.happy);
  return { ok: r.happy >= 0, par: r.par, happy: r.happy, dawn: dawn, route: r.route, happyRoute: r.happyRoute };
}

/* ---------- daily town ---------- */
function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
var DAILY_PLACES = 'the graveyard,the old cinema,my ex\'s house,the chippy,the laundrette,the bingo hall,the haunted library,the dentist,the kebab van,the pier,the bowling alley,the crypt,the karaoke bar,the 24h garage,the lighthouse,the vet,the castle,the italian,the old school,the bakery'.split(',');
var DAILY_TYPES = ['gary', 'nan', 'kid', 'lord', 'nerd', 'cat', 'mime', 'clown'];
var DAILY_NAMES = ['spooky','foggy','creaky','howling','gloomy','misty','dusty','rattling','wailing','drizzly','moonlit','muttering'];
var DAILY_NOUNS = ['lane','crescent','gardens','close','parade','terrace','row','hill','end','green'];

function dailyLevel(dayNum) {
  for (var attempt = 0; attempt < 60; attempt++) {
    var R = rng(dayNum * 7919 + attempt * 104729 + 17);
    var L = genTown(R, dayNum);
    try {
      var P = parse(L), A = analyse(P);
      if (A.ok && A.par >= 11 && A.par <= 26 && A.happy <= A.par + 6) { L.attempt = attempt; return L; }
    } catch (e) { /* try again */ }
  }
  return LEVELS[9];
}

function genTown(R, dayNum) {
  var W = 5, H = 5, x, y;
  function pick(a) { return a[Math.floor(R() * a.length)]; }
  var grid = [];
  for (y = 0; y < 2 * H - 1; y++) { var row = []; for (x = 0; x < 2 * W - 1; x++) row.push(' '); grid.push(row); }
  for (y = 0; y < H; y++) for (x = 0; x < W; x++) grid[2 * y][2 * x] = 'o';
  for (y = 0; y < H; y++) for (x = 0; x < W - 1; x++) grid[2 * y][2 * x + 1] = '-';
  for (y = 0; y < H - 1; y++) for (x = 0; x < W; x++) grid[2 * y + 1][2 * x] = '|';
  for (y = 0; y < H - 1; y++) for (x = 0; x < W - 1; x++) grid[2 * y + 1][2 * x + 1] = pick(['.', '.', '.', 't', 'g', 's']);
  /* knock out some streets but keep the town connected */
  var cut = 6 + Math.floor(R() * 4), tries = 0;
  while (cut > 0 && tries++ < 200) {
    var yy = Math.floor(R() * (2 * H - 1)), xx = Math.floor(R() * (2 * W - 1));
    if ((yy + xx) % 2 !== 1) continue;
    var old = grid[yy][xx]; if (old === ' ') continue;
    grid[yy][xx] = ' ';
    if (!connected(grid, W, H)) grid[yy][xx] = old; else cut--;
  }
  /* a couple of one-way streets, kept strongly connected */
  var ow = Math.floor(R() * 4); tries = 0;
  while (ow > 0 && tries++ < 200) {
    yy = Math.floor(R() * (2 * H - 1)); xx = Math.floor(R() * (2 * W - 1));
    if ((yy + xx) % 2 !== 1) continue;
    old = grid[yy][xx]; if (old !== '-' && old !== '|') continue;
    grid[yy][xx] = old === '-' ? (R() < 0.5 ? '>' : '<') : (R() < 0.5 ? 'v' : '^');
    if (!connected(grid, W, H)) grid[yy][xx] = old; else ow--;
  }
  var nodes = []; for (y = 0; y < H; y++) for (x = 0; x < W; x++) nodes.push([x, y]);
  for (var i = nodes.length - 1; i > 0; i--) { var j = Math.floor(R() * (i + 1)); var t = nodes[i]; nodes[i] = nodes[j]; nodes[j] = t; }
  var d = nodes.pop(); grid[2 * d[1]][2 * d[0]] = 'D';
  var useHorn = R() < 0.4;
  if (useHorn) { var h = nodes.pop(); grid[2 * h[1]][2 * h[0]] = 'H'; }
  var nG = 4 + (R() < 0.5 ? 1 : 0), nP = nG + 1;
  var letters = 'abcdefgh'.slice(0, nP).split(''), names = DAILY_PLACES.slice();
  for (i = names.length - 1; i > 0; i--) { j = Math.floor(R() * (i + 1)); t = names[i]; names[i] = names[j]; names[j] = t; }
  var n = [];
  letters.forEach(function (l, k) { var p = nodes.pop(); grid[2 * p[1]][2 * p[0]] = l; n.push(l + ':' + names[k]); });
  var types = DAILY_TYPES.slice(); for (i = types.length - 1; i > 0; i--) { j = Math.floor(R() * (i + 1)); t = types[i]; types[i] = types[j]; types[j] = t; }
  var g = [];
  for (i = 0; i < nG; i++) {
    var from = letters[i], to;
    do { to = pick(letters); } while (to === from);
    var sleepy = useHorn && i === nG - 1;
    g.push(from + '>' + to + ' ' + (sleepy ? 'sleepy z' : types[i]));
  }
  var f = [];
  if (R() < 0.6) { f.push('0-1'); g[0] = g[0].split(' ')[0] + ' vamp'; g[1] = g[1].split(' ')[0] + ' chef'; }
  var title = pick(DAILY_NAMES) + ' ' + pick(DAILY_NOUNS);
  return { name: title, s: 2 + (R() < 0.35 ? 1 : 0), k: 3, map: grid.map(function (r) { return r.join(''); }), n: n.join(','), g: g, f: f,
    tip: 'the daily town. same town for everyone today. one route, one shot at bragging rights.', daily: dayNum };
}

function connected(grid, W, H) {
  /* strongly connected: every node reaches every node following one-ways */
  var N = W * H;
  function adjOf(rev) {
    var A = []; for (var i = 0; i < N; i++) A.push([]);
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var a = y * W + x;
      if (x < W - 1) { var c = grid[2 * y][2 * x + 1], b = a + 1; if (c === '-' || c === '>') (rev ? A[b] : A[a]).push(rev ? a : b); if (c === '-' || c === '<') (rev ? A[a] : A[b]).push(rev ? b : a); }
      if (y < H - 1) { c = grid[2 * y + 1][2 * x]; b = a + W; if (c === '|' || c === 'v') (rev ? A[b] : A[a]).push(rev ? a : b); if (c === '|' || c === '^') (rev ? A[a] : A[b]).push(rev ? b : a); }
    }
    return A;
  }
  function all(A) { var seen = new Uint8Array(N), q = [0], c = 1; seen[0] = 1; while (q.length) { var u = q.pop(); A[u].forEach(function (v) { if (!seen[v]) { seen[v] = 1; c++; q.push(v); } }); } return c === N; }
  return all(adjOf(false)) && all(adjOf(true));
}

function dayNumber(d) { d = d || new Date(); return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(2026, 0, 1)) / 864e5); }

var API = { HOODS: HOODS, LEVELS: LEVELS, parse: parse, arrive: arrive, fresh: fresh, edgeBetween: edgeBetween, legalNext: legalNext, simulate: simulate, solve: solve, analyse: analyse, dailyLevel: dailyLevel, dayNumber: dayNumber };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.GBL = API;
})(this);
