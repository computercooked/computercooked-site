'use strict';
(function(){
// ---------- sound (ships silent; drop URLs in to enable) ----------
// all CC0 from the Computer Cooked sound library (sources + licences in PLAYTEST.md)
const FILES={coin:"sfx/coin.mp3",stamp:"sfx/stamp.mp3",door:"sfx/door.mp3",huff:"sfx/huff.mp3",rent:"sfx/rent.mp3",page:"sfx/page.mp3",haggle:"sfx/haggle.mp3",nope:"sfx/nope.mp3",rare:"sfx/rare.mp3",curse:"sfx/curse.mp3",walk:""};
// volumes levelled from measured loudness (ffmpeg, Nov 16): frequent sounds land near -21 to -25 LUFS, big moments near -18 to -19.
const VOL={coin:.49,stamp:.72,door:.38,huff:.62,rent:.57,page:.42,haggle:.4,nope:.27,rare:.76,curse:.54};
let muted=false,ccMuted=false,FAST=false;const _aud={};
function sfx(n){if(muted||ccMuted||FAST)return;const u=FILES[n];if(!u)return;try{const pool=_aud[n]||(_aud[n]={i:0,a:[]});let p=pool.a.find(x=>x.paused||x.ended);if(!p){if(pool.a.length<3){p=new Audio(u);p.preload='auto';pool.a.push(p);}else{p=pool.a[pool.i%3];pool.i++;}}p.volume=VOL[n]||.5;p.currentTime=0;const r=p.play();if(r&&r.catch)r.catch(()=>{});}catch(e){}}

// ---------- helpers ----------
const $=s=>document.querySelector(s);
const R=(a,b)=>a+Math.random()*(b-a);
const RI=(a,b)=>Math.floor(R(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=n=>(n<0?'-$':'$')+Math.abs(Math.round(n));
const Q=new URLSearchParams(location.search);
const TEST=Q.get('cctest')==='1'||(()=>{try{return window.parent!==window&&new URLSearchParams(parent.location.search).get('cctest')==='1';}catch(e){return false;}})(),SHOT=Q.get('shot')==='1';
const CC=()=>window.cc;
let evCount=0;
function ccEvent(n,d){if(evCount>=18)return;evCount++;try{CC()&&CC().event&&CC().event(n,d||{});}catch(e){}}

// ---------- data ----------
// [name, emoji, value, category, kind, look]
const ITEMS=[
["a single rollerblade, left","🛼",7,"toys"],["lamp shaped like a smaller lamp","💡",14,"home"],["toaster (toasts one side)","🍞",10,"kitchen"],
["box of mystery cables","🔌",5,"tech"],["vhs: 'aerobics 1987'","📼",7,"tech"],["garden gnome, judgmental","🗿",13,"home"],
["fondue set, never used, never will be","🫕",16,"kitchen"],["jar of buttons (not the good kind)","🫙",4,"odd"],["exercise bike (now a coat rack)","🚲",30,"home"],
["bread maker (makes bread sometimes)","🥖",22,"kitchen"],["trophy: '3rd place, participating'","🏆",8,"odd"],["mug: 'world's okayest dad'","☕",5,"kitchen"],
["puzzle, 999 pieces","🧩",6,"toys"],["board game missing the board","🎲",5,"toys"],["framed photo of someone else's family","🖼️",10,"home"],
["karaoke machine (knows one song)","🎤",24,"music"],["rotary phone","☎️",20,"tech"],["accordion, slightly deflated","🪗",34,"music"],
["inflatable flamingo","🦩",8,"toys"],["snow globe of a parking lot","🔮",11,"odd"],["a hat with a smaller hat on it","🎩",15,"fancy"],
["electric guitar, two strings","🎸",40,"music"],["ceramic frog orchestra (4 frogs)","🐸",24,"odd"],["typewriter that only types 'help'","⌨️",30,"tech"],
["a perfectly normal chair","🪑",12,"home"],["cassette labelled 'do not'","💿",9,"music"],["teapot shaped like a cat","🫖",20,"kitchen"],
["camping lantern (has seen things)","🏮",14,"home"],["rubber duck army (12)","🦆",10,"toys"],["tennis racket, emotionally strung","🎾",12,"toys"],
["cookbook: '101 soups of regret'","📕",6,"kitchen"],["roller skates for a dog","🐕",9,"odd"],["telescope pointed at a neighbor","🔭",45,"tech"],
["boombox (only bass)","📻",28,"music"],["velvet painting of a sad clown","🤡",18,"fancy"],["tuxedo, one sleeve","🤵",22,"fancy"],
["crystal decanter, smells like 1974","🍾",26,"fancy"],["bowling ball, one finger hole","🎳",11,"toys"],["blender (just loud now)","🌪️",15,"kitchen"],
["drum kit minus the drums","🥁",26,"music"],["a fax machine that faxes back","📠",19,"tech"],["umbrella, inside out, emotionally","☂️",6,"odd"],
["'gold' pocket watch","⌚",4,"fancy","fake",110],["'signed' baseball (signed 'ball')","⚾",3,"toys","fake",80],["'antique' vase, made tuesday","🏺",5,"fancy","fake",90],
["'diamond' ring, cereal box edition","💍",2,"fancy","fake",140],["'original' painting (still wet)","🎨",6,"fancy","fake",100],
["haunted lamp (works) (too well)","🕯️",40,"home","curse"],["music box that hums your name","🎶",36,"music","curse"],["monkey paw, two wishes left","🐾",52,"odd","curse"],
["doll that's always facing you","🪆",30,"toys","curse"],["mirror that's running late","🪞",44,"home","curse"],
["actual dinosaur tooth","🦷",160,"odd","rare"],["first edition 'goblin monthly'","📰",120,"fancy","rare"],["golden spork","🥄",140,"kitchen","rare"],
["crown (fits, weirdly)","👑",220,"fancy","rare"],["meteorite, still warm","☄️",180,"odd","rare"],["the original rubber duck","🐤",130,"toys","rare"],
["map to a better garage sale","🗺️",150,"odd","rare"],["jar of ancient pickles","🥒",110,"kitchen","rare"]
].map((a,i)=>({i,name:a[0],em:a[1],v:a[2],cat:a[3],kind:a[4]||"norm",look:a[5]||a[2]}));
const RARES=ITEMS.filter(x=>x.kind==="rare");
const BYKIND=k=>ITEMS.filter(x=>x.kind===k);
const CATS={home:"home stuff",toys:"toys",music:"music stuff",kitchen:"kitchen stuff",tech:"old tech",odd:"weird stuff",fancy:"fancy stuff"};

const SELLERS=[
{n:"suspiciously calm dad",skin:"#f2c39b",hat:"cap",body:"#3f9cff",pat:90,line:"everything must go. especially the stuff in the garage."},
{n:"retired wizard",skin:"#eed9c4",hat:"witch",body:"#6a4bc4",pat:75,line:"i have no further use for these. or for 'use'."},
{n:"teen whose mom said sell it",skin:"#c98e64",hat:"beanie",body:"#ff5a5f",pat:55,line:"mom said sell it or 'talk about feelings'. so."},
{n:"lady moving to the moon",skin:"#ffd6b0",hat:"bun",body:"#2ec4b6",pat:85,line:"can't take it to the moon. weight limit."},
{n:"man with 40 cats",skin:"#e0ac80",hat:"none",body:"#8d6e63",pat:75,line:"the cats voted. it goes."},
{n:"estate sale ghost",skin:"#e4ebff",hat:"none",body:"#c5d0f0",pat:100,eyes:"hollow",line:"take it. i'm not using it. i'm not using anything."},
{n:"tired grandma",skin:"#f5cfa8",hat:"bun",body:"#e98bbf",pat:120,line:"take whatever, sweetie. no wait, haggle. i love haggling."},
{n:"guy who says 'firm'",skin:"#d9a07a",hat:"none",eyes:"shades",body:"#222",pat:55,firm:true,line:"prices are firm. like my handshake. which you can't have."},
{n:"a goblin from the other street",skin:"#9ad06a",ears:"gob",hat:"none",body:"#7a5",pat:65,line:"don't tell anyone i sold you this. professional courtesy."}
];
// customers: m=price mult, pat=patience, imp=patience drain mult, open=opening offer fraction
const CUSTS=[
{id:"tapper",n:"impatient commuter",tell:"*taps foot*",skin:"#f0c090",hat:"cap",body:"#555",eyes:"dot",anim:"tap",pat:55,imp:1.8,m:1.12,w:10,
 greet:["i have four minutes. three now.","quick. what's the {item} cost."],leave:["missed my train for this. bye."],deal:["fine. going. bye."]},
{id:"lover",n:"starry-eyed hobbyist",tell:"*eyes sparkling*",skin:"#ffd6b0",hat:"bun",body:"#ff8fab",eyes:"sparkle",pat:85,imp:.9,m:1.0,love:1.5,w:10,
 greet:["oh. oh my. is that a {item}??","i've dreamed about a {item}. literally. last night."],leave:["my heart says yes. my wallet says absolutely not."],deal:["i'm going to name it."]},
{id:"collector",n:"collector",tell:"*adjusts monocle*",skin:"#f1d2b6",hat:"top",body:"#3d2b56",eyes:"monocle",pat:95,imp:.9,m:.8,rareM:2.1,w:7,
 greet:["hmm. the {item}. provenance?","i collect. i judge. mostly i judge."],leave:["pedestrian pricing. good day."],deal:["it shall join the others."]},
{id:"raccoon",n:"a raccoon in a coat",tell:"*rustles*",skin:"#9a9aa6",ears:"coon",hat:"none",body:"#8b5a2b",eyes:"mask",pat:70,imp:1,m:1,trade:true,w:7,
 greet:["psst. the {item}. i'll give you this and a secret."],leave:["*disappears into a bin*"],deal:["pleasure. don't check the pockets."]},
{id:"cheap",n:"coupon clipper",tell:"*clutching coupons*",skin:"#e8b98f",hat:"none",body:"#9aa",eyes:"dot",pat:75,imp:1.1,m:.68,open:.35,cheap:true,w:9,
 greet:["i'll give you three dollars and a compliment.","does the {item} come with a coupon?"],leave:["i'll wait for the clearance."],deal:["i'm telling everyone i robbed you."]},
{id:"pro",n:"professional haggler",tell:"*cracks knuckles*",skin:"#d9a07a",hat:"none",body:"#111",eyes:"shades",pat:150,imp:.6,m:1.0,open:.35,poker:true,w:7,
 greet:["let's dance.","the {item}. you and me. right now."],leave:["you're not ready."],deal:["respect."]},
{id:"tourist",n:"lost tourist",tell:"*takes a photo of you*",skin:"#ffcfa0",hat:"cap",body:"#ffd23f",eyes:"dot",pat:80,imp:1,m:1.3,tourist:true,w:8,
 greet:["is this the famous goblin shop? the {item}!","authentic local {item}! how much?"],leave:["i'll get one at the airport."],deal:["wait till they see this back home."]},
{id:"gran",n:"sweet grandma",tell:"*offers you a hard candy*",skin:"#f5cfa8",hat:"bun",body:"#b07cc6",eyes:"dot",pat:130,imp:.8,m:1.05,w:8,
 greet:["oh, a {item}! like my second husband had.","is the {item} haunted? i hope so."],leave:["well. you're a goblin, i suppose."],deal:["you're a good goblin. i'll tell the girls."]},
{id:"skater",n:"skater teen",tell:"*kickflips (fails)*",skin:"#c98e64",hat:"beanie",body:"#4caf50",eyes:"sleepy",pat:60,imp:1.2,m:.82,catM:{toys:1.35,music:1.35},w:8,
 greet:["yo is the {item} ironic or","the {item} goes hard ngl."],leave:["mid."],deal:["no cap this slaps."]},
{id:"ghost",n:"a ghost",tell:"*is slightly see-through*",skin:"#e4ebff",hat:"none",body:"#c5d0f0",eyes:"hollow",anim:"ghost",pat:90,imp:1,m:.6,curseM:2.0,w:5,
 greet:["oooo. the {item}. ooooo.","i sense a {item}. i sense... a price."],leave:["boo. (disappointed)"],deal:["it whispers. i like that."]},
{id:"influencer",n:"influencer",tell:"*filming you*",skin:"#ffd6b0",hat:"none",body:"#e040fb",eyes:"dot",pat:70,imp:1.2,m:1.18,fame:true,w:6,
 greet:["hey besties, look at this {item}!","say hi to my 40 followers. the {item}?"],leave:["unfollowing this shop."],deal:["link in bio. (there is no link.)"]},
{id:"wizard",n:"a wizard who knows",tell:"*knows*",skin:"#eed9c4",hat:"witch",body:"#6a4bc4",eyes:"dot",pat:70,imp:1.1,m:1.0,exact:true,w:5,
 greet:["i know what the {item} is worth. do you?"],leave:["you were wrong. i was always going to leave."],deal:["fair. i foresaw this."]},
{id:"trench",n:"three kids in a trenchcoat",tell:"*wobbles*",skin:"#ffcfa0",hat:"cap",body:"#a1887f",eyes:"dot",anim:"wob",pat:170,imp:.6,m:.85,w:6,
 greet:["we are one adult man. the {item}, please.","good day, fellow adult. {item}?"],leave:["*the coat leaves in three directions*"],deal:["*whispering* we did it."]},
{id:"dad",n:"dad with a truck",tell:"*jingles keys*",skin:"#f2c39b",hat:"cap",body:"#3f9cff",eyes:"dot",pat:80,imp:1,m:1.1,catM:{home:1.3,tech:1.2},w:8,
 greet:["got a truck. need a {item}. let's talk.","the {item}. does it fit in a truck? everything does."],leave:["truck's leaving. with or without."],deal:["she'll fit."]}
];
const REG_NAMES=["dale","marjorie","kev","bev","linus","the other dale","pam","gus","trish","old ned","sasha","boris"];
const LV_XP=[0,4,10,19,32];
const LV_W=[.55,.4,.28,.18,.1];

// ---------- meta save ----------
let META={best:{day:0,profit:0,score:0},runs:0,lifeProfit:0,museum:{},seen:{}};
function loadMeta(){try{const s=localStorage.getItem('gsg-save');if(s){const o=JSON.parse(s);if(o&&typeof o==='object')META=Object.assign(META,o);}}catch(e){}}
function saveMeta(){try{localStorage.setItem('gsg-save',JSON.stringify(META));}catch(e){}}
const museumCount=()=>Object.keys(META.museum).length;
const UNLOCKS=[[2,"start with +$15"],[4,"start with a sign"],[6,"start with the shop cat"],[8,"gala: crown + a free display case every run"]];

// ---------- round 2 data ----------
const SALES_N=[3,3,3,4,4,4,4,5];
function rentFor(k){const t=[25,45,110,300];if(k<=4)return t[k-1];return Math.round(300*Math.pow(2,k-4)/5)*5;}
const UPS={
 shelf:{n:"more shelves",d:"+3 shelf space, +1 shopper",cost:l=>[40,85,150][l],max:3},
 sign:{n:"a sign",d:"'goblin's: we have things'. +1 shopper, +patience",cost:()=>45,max:1},
 cat:{n:"shop cat",d:"scares off cheapskates. judges everyone.",cost:()=>55,max:1},
 dcase:{n:"display case",d:"rares + fancy stuff sell for +30%",cost:()=>90,max:1},
 van:{n:"the van",d:"unlocks uptown: rarer stuff, more fakes. $15 gas a trip",cost:()=>110,max:1},
 neon:{n:"neon sign",d:"+2 shoppers, but everyone is 20% less patient",cost:()=>70,max:1},
 exo:{n:"exorcist on call",d:"curses can't bite. costs $12 every night",cost:()=>30,max:1},
 bin:{n:"bargain bin",d:"stock 2+ days old auto-sells at half value at night",cost:()=>35,max:1},
 loyal:{n:"loyalty cards",d:"regulars return 2x as often. grubnik can't poach",cost:()=>80,max:1}
};
const UPTOWN_SELLERS=[
{n:"old money lady",skin:"#f7dcc4",hat:"bun",body:"#b0306a",pat:70,line:"darling, it's all heirlooms. except the bits that aren't."},
{n:"tech bro clearing his loft",skin:"#f0c8a0",hat:"none",eyes:"shades",body:"#888",pat:60,line:"minimalism journey. everything goes. except my podcast."},
{n:"retired opera singer",skin:"#e8c0a0",hat:"top",body:"#3d2b56",pat:80,line:"each item has a story. each story is forty minutes."},
{n:"divorce sale guy",skin:"#d9a07a",hat:"cap",hatc:"#3f9cff",body:"#2e9e74",pat:90,line:"price it like she's watching. she's not. she took the dog."}
];
const CELEB={id:"celeb",n:"a celebrity (probably)",tell:"*sunglasses indoors*",skin:"#ffcfa0",hat:"none",body:"#ffd23f",eyes:"shades",pat:55,imp:1.5,m:2.3,w:0,
 greet:["do you know who i am? i'll take the {item}.","my assistant said buy the {item}. so."],leave:["my people will not be calling your people."],deal:["put it on my... oh. cash. fine."]};
const RIVAL={skin:"#a58bd8",ears:"gob",eyes:"dot",hat:"cap",hatc:"#222",body:"#4a2f8a"};
const LANDLORD={skin:"#4f8a3a",ears:"gob",eyes:"dot",hat:"top",body:"#2b2140"};
const EVENTS={
 rain:{n:"☔ rainy day",d:"soggy prices (-25%), fewer shoppers"},
 fair:{n:"🎪 street fair",d:"+2 shoppers this afternoon"},
 celeb:{n:"🕶️ celebrity in town",d:"someone famous might drop in. they pay silly money"},
 estate:{n:"📦 estate sale",d:"one house has a mystery box"},
 rival:{n:"😈 grubnik's out",d:"your rival snipes stuff while you haggle"}
};
const INSULT_BUY=["did you just say that with your mouth?","i'm telling my mom about you.","that's not an offer, that's a cry for help.","wow. i'll remember your face.","the item heard that. it's upset."];
const INSULT_SELL=["for THAT? that's a price for a crime.","it's a {item}, not a car.","my grandma's ghost just gasped.","i'm going to need to sit down.","i could buy a whole lamp for that. a big one."];
const WALK_EXTRA=["*slams a door that isn't there*","*leaves backwards, keeping eye contact*","*storms off, trips on the flamingo*","*leaves a one-star review out loud*"];

const BIGCOL={id:"bigcol",n:"the big collector",tell:"*polishes three monocles*",skin:"#f1d2b6",hat:"top",body:"#5a1f3a",eyes:"monocle",pat:130,imp:.8,m:.95,rareM:2.0,catM:{fancy:1.4,odd:1.15},w:0,
 greet:["i have come for the {item}. i have come for all of it, eventually.","ah. the {item}. my wing of the house has a space exactly that shape."],leave:["i shall return. with a bigger checkbook. maybe."],deal:["into the vault it goes."]};
const DOG=`<svg viewBox="0 0 60 50"><ellipse cx="30" cy="36" rx="20" ry="12" fill="#c8894a" stroke="#2b2140" stroke-width="3"/><circle cx="44" cy="22" r="12" fill="#c8894a" stroke="#2b2140" stroke-width="3"/><path d="M36 14 Q30 4 36 22Z" fill="#7a4a22" stroke="#2b2140" stroke-width="2"/><path d="M52 14 Q60 6 54 24Z" fill="#7a4a22" stroke="#2b2140" stroke-width="2"/><circle cx="40" cy="21" r="2" fill="#2b2140"/><circle cx="48" cy="21" r="2" fill="#2b2140"/><ellipse cx="45" cy="27" rx="3" ry="2" fill="#2b2140"/><path class="wag" d="M11 32 Q2 22 6 16" fill="none" stroke="#2b2140" stroke-width="4" stroke-linecap="round"/></svg>`;
function rollEvent(day){if(day<2||Math.random()>=.55)return null;return pick(day<=3?['fair','celeb','estate']:['rain','fair','celeb','estate','rival','rival']);}
function saveRun(){try{META.run={day:S.day,cash:S.cash,ups:S.ups,xp:S.xp,lvl:S.lvl,profit:S.profit,revenue:S.revenue,soldN:S.soldN,fame:S.fame,curseNext:S.curseNext,donated:S.donated,bestSale:S.bestSale,graceUsed:S.graceUsed,rivalShown:S.rivalShown,collectorDay:S.collectorDay,ev:S.event,uid:S.uid,elapsed:Date.now()-S.t0,
 inv:S.inv.map(i=>({i:i.def.i,tv:i.tv,look:i.look,cost:i.cost,det:i.det,day:i.day,lo:i.lo,hi:i.hi})),regs:S.regs.map(c=>({id:c.t.id,name:c.name,mem:c.mem,visits:c.visits}))};saveMeta();}catch(e){}}
function continueRun(){
 const r=META.run;if(!r){newRun();return;}
 try{
  clearTimers();H=null;
  S={day:r.day,phase:'yard',cash:r.cash,inv:[],ups:Object.assign({shelf:0,sign:0,cat:0,dcase:0,van:0,neon:0,exo:0,bin:0,loyal:0},r.ups),xp:r.xp,lvl:r.lvl,profit:r.profit,revenue:r.revenue||0,soldN:r.soldN,fame:r.fame||0,curseNext:r.curseNext||0,
   saleIdx:0,sales:[],queue:[],cust:null,regs:[],t0:Date.now()-(r.elapsed||0),donated:r.donated||[],bestSale:r.bestSale||null,over:false,uid:r.uid||1000,result:null,district:'maple',event:null,
   graceUsed:!!r.graceUsed,tut:false,rivalShown:!!r.rivalShown,d:null,collectorDay:r.collectorDay||5,nextEvent:r.ev===undefined?null:r.ev,allUps:false};
  S.inv=(r.inv||[]).filter(x=>ITEMS[x.i]).map(x=>{const def=ITEMS[x.i];return {uid:S.uid++,def,name:def.name,em:def.em,cat:def.cat,kind:def.kind,tv:x.tv,look:x.look,cost:x.cost,det:x.det,day:x.day,lo:x.lo,hi:x.hi};});
  S.regs=(r.regs||[]).map(x=>({t:CUSTS.find(c=>c.id===x.id)||CUSTS[7],name:x.name,mem:x.mem,visits:x.visits,returning:false}));
  shownCash=S.cash;evCount=0;
  try{CC()&&CC().start&&CC().start();}catch(e){}
  startMorning();
 }catch(e){delete META.run;newRun();}
}
function showTitle(){
 S=null;H=null;
 $('#hud').innerHTML=`<span>garage sale goblin</span><button class="ib" style="margin-left:auto" data-act="mute" aria-label="mute">${muted?'🔇':'🔈'}</button>`;
 $('#scene').className='yard';
 $('#scene').innerHTML=`<div class="bg"></div><div class="tint" style="opacity:.35"></div><div class="sun" style="top:20%;right:18%"></div><div class="cloud" style="left:12%;top:14%"></div><div class="stage"><div class="house cottage" style="background:#ffd9e6;--roof:#8d4fd6"><div class="win" style="left:12%"></div><div class="win" style="right:12%"></div><div class="door"></div></div><div class="table"><i>🦆</i><i><b class="ico rare">👑</b></i><i>🎸</i></div><div class="char gob" style="left:50%;transform:translateX(-50%)">${face(Object.assign({},GOB,museumCount()>=8?{hat:'crown'}:{}),2)}</div></div>`;
 $('#panel').innerHTML='';
 const r=META.run;
 $('#modal').innerHTML=`<div class="sheet title"><div class="tt">garage sale goblin</div><div class="line">buy junk at yard sales. haggle it into your shop. pay the rent.</div>
  <div class="row" style="justify-content:center;margin:10px 0"><button class="btn primary big" data-act="start" id="mbtn">${r?'new shop':'start'}</button>${r?`<button class="btn gold big" data-act="cont" id="cbtn">continue · day ${r.day}</button>`:''}</div>
  ${META.runs?`<div class="line note">best: day ${META.best.day} · score ${META.best.score} · museum ${museumCount()}/8</div>`:''}<div class="credit">computer cooked games</div></div>`;
 $('#modal').className='on';
 if(r){const c=$('#cbtn');if(c)c.id='mbtn',$('[data-act=start]').id='';}
}
// ---------- state ----------
let S=null,H=null,paused=false,timers=[],shownCash=0,tickRaf=0;
function later(fn,ms){const t=setTimeout(()=>{timers=timers.filter(x=>x!==t);if(paused){later(fn,200);return;}fn();},ms);timers.push(t);}
function clearTimers(){timers.forEach(clearTimeout);timers=[];}

function newRun(){
 clearTimers();H=null;
 const mc=museumCount();
 S={day:1,phase:'yard',cash:50+(mc>=2?15:0),inv:[],ups:{shelf:0,sign:mc>=4?1:0,cat:mc>=6?1:0,dcase:mc>=8?1:0,van:0,neon:0,exo:0,bin:0,loyal:0},xp:0,lvl:1,
  profit:0,revenue:0,soldN:0,fame:0,curseNext:0,saleIdx:0,sales:[],queue:[],cust:null,regs:[],t0:Date.now(),donated:[],bestSale:null,
  over:false,uid:1,result:null,district:'maple',event:null,graceUsed:false,tut:META.runs===0,rivalShown:false,d:null,collectorDay:5,nextEvent:null,allUps:false};
 delete META.run;
 shownCash=S.cash;evCount=0;
 try{CC()&&CC().start&&CC().start();}catch(e){}
 startMorning();
}
const shelfCap=()=>6+3*S.ups.shelf;
const effDay=()=>S.day+(((S.phase==='evening'||S.phase==='rent')&&S.day%3===0)?1:0);
const nextRentDay=()=>Math.ceil(effDay()/3)*3;
const nextRent=()=>rentFor(Math.ceil(effDay()/3));

function makeItem(def){
 const it={uid:S.uid++,def,name:def.name,em:def.em,cat:def.cat,kind:def.kind,tv:Math.max(1,Math.round(def.v*R(.85,1.2))),cost:0,det:false,day:S.day};
 it.look=def.kind==='fake'?Math.round(def.look*R(.85,1.15)):it.tv;
 appraise(it);return it;
}
function mysteryBox(){return {uid:S.uid++,def:{i:-1},name:"mystery box (estate sale)",em:"📦",cat:"odd",kind:'box',tv:0,look:0,lo:0,hi:0,cost:0,det:true,day:S.day};}
function appraise(it){
 if(it.kind==='box')return;
 if((it.kind==='fake'||it.kind==='curse')&&!it.det){it.det=Math.random()<.18+.2*(S.lvl-1);}
 const base=(it.kind==='fake'&&!it.det)?it.look:it.tv;const w=LV_W[S.lvl-1];
 it.lo=Math.max(1,Math.round(base*(1-w*R(.35,1))));it.hi=Math.max(it.lo+1,Math.round(base*(1+w*R(.35,1))));
}
function rollDef(up){
 const r=Math.random();
 const rare=(.07+Math.min(.05,S.day*.004))*(up?1.7:1);
 const fake=S.day<=1?0:.11*(up?1.6:1),curse=S.day<=1?0:.1;
 if(r<rare)return pick(RARES);
 if(r<rare+fake)return pick(BYKIND('fake'));
 if(r<rare+fake+curse)return pick(BYKIND('curse'));
 const norm=BYKIND('norm');return pick(up?norm.filter(d=>d.v>=15):norm);
}

// ---------- morning ----------
function startMorning(){
 H=null;S.result=null;S.ev=[];S.rentInfo=null;S.d={bought:0,spent:0,sold:0,earned:0,profit:0,best:null};
 S.event=S.nextEvent!==null&&S.nextEvent!==undefined?S.nextEvent:rollEvent(S.day);S.nextEvent=null;S.allUps=false;
 saveRun();
 if(S.ups.van){S.phase='choose';render();return;}
 goStreet('maple');
}
function goStreet(d){
 S.district=d;if(d==='uptown'){S.cash=Math.max(0,S.cash-15);}
 S.phase='yard';S.saleIdx=0;const up=d==='uptown';
 const n=SALES_N[Math.min(S.day-1,SALES_N.length-1)];
 const infl=1+Math.max(0,S.day-8)*.05;
 S.sales=[];const used=new Set();const pool=up?UPTOWN_SELLERS.concat(SELLERS.slice(0,3)):SELLERS;
 const estateAt=S.event==='estate'?RI(0,n-1):-1,rivalAt=S.event==='rival'?RI(0,n-1):-1;
 for(let k=0;k<n;k++){
  let sel,g=0;do{sel=pick(pool);}while(used.has(sel.n)&&g++<30);used.add(sel.n);
  const cnt=RI(2,S.day===1&&k===0?3:4);const items=[];
  for(let j=0;j<cnt;j++){
   let it;
   if(k===estateAt&&j===0)it=mysteryBox();
   else it=makeItem((S.day===1&&k===0&&j===0)?pick(BYKIND('norm').filter(x=>x.v>=14&&x.v<=30)):rollDef(up));
   let st;
   if(it.kind==='box')st=R(14,30)*(up?1.8:1);
   else if(it.kind==='rare')st=it.tv*R(.3,.6);else if(it.kind==='fake')st=it.look*R(.35,.6);else if(it.kind==='curse')st=it.tv*R(.3,.55);else st=it.tv*R(.55,1.15);
   if(up&&it.kind!=='box')st*=1.2;
   if(sel.firm)st*=R(.85,1);
   st*=infl;if(S.event==='rain')st*=.75;
   it.sticker=Math.max(1,Math.round(st));
   it.floor=Math.max(1,Math.round(it.sticker*(sel.firm?R(.86,.95):R(.52,.82))));
   it.ask=it.sticker;it.st='open';items.push(it);
  }
  const pat=Math.round(sel.pat*(S.day<=3?1.3:1)*(up?.85:1));
  const look=Object.assign({},sel);
  if((!look.eyes||look.eyes==='dot')&&Math.random()<.35)look.glasses=1;
  if(Math.random()<.35){look.old=1;if(look.hat==='none'&&Math.random()<.6)look.hat='bun';}
  if(look.hat==='none'&&!look.old&&Math.random()<.35){look.hat=pick(['cap','beanie','top']);look.hatc=pick(['#ff5a5f','#3f9cff','#ffc83d','#2e9e74']);}
  if(Math.random()<.4)look.body=pick(['#ff8fab','#4caf50','#3f9cff','#ffd23f','#9b5de5','#ff7f50','#2ec4b6']);
  if(Math.random()<.5)look.skin=pick(['#f2c39b','#c98e64','#8d5a3b','#ffd6b0','#e0ac80','#f5cfa8']);
  if(sel.eyes==='hollow'||sel.ears==='gob')look.skin=sel.skin;
  S.sales.push({sel,look,dog:Math.random()<.28,style:pick(up?['mansion','condo','mansion','house']:['house','flat','tall','trailer','cottage']),items,pat,pat0:pat,closed:false,estate:k===estateAt,rival:k===rivalAt,
   roof:pick(['#d64545','#3f6fd6','#8d4fd6','#d68a2f','#2e9e74']),wall:up?pick(['#fffaf0','#f0f0ff','#fff0f5']):pick(['#fff3c4','#ffd9e6','#d6f0ff','#e6ffd6','#f0e0ff'])});
 }
 render();
 if(S.event)toast(EVENTS[S.event].n+': '+EVENTS[S.event].d);
 else if(S.day===1)tip('first','tap something cheap');
 else if(S.day===10&&!S.rivalShown){S.rivalShown=true;toast(S.ups.loyal?'grubnik opened a shop across the street. your regulars stay loyal.':'grubnik opened a shop across the street. -1 shopper a day.');}
}
const curSale=()=>S.sales[S.saleIdx];
function openBuy(idx){
 const sale=curSale();if(!sale||sale.closed)return;const it=sale.items[idx];if(!it||it.st!=='open')return;
 if(S.inv.length>=shelfCap()){sale.bubble='your shelves are full, goblin.';render();toast('shelves full. buy more tonight.');return;}
 H={mode:'buy',it,idx,sale,n:0,react:null,val:Math.max(1,Math.round(it.ask*.85)),status:'',stCls:'',fuzz:R(-.1,.1)};
 render();tip('haggle','drag left. watch their face.');
}
function buyAt(price){
 const {it,sale}=H;price=Math.round(price);
 if(S.cash<price){setStatus("you only have "+money(S.cash)+".",'bad');render();return;}
 const from=rectOf('#themc');
 S.cash-=price;S.d.bought++;S.d.spent+=price;
 let got=it;
 if(it.kind==='box'){const r=Math.random();const def=r<.18?pick(RARES):r<.33?pick(BYKIND('curse')):r<.48?pick(BYKIND('fake')):pick(BYKIND('norm'));got=makeItem(def);got.det=true;appraise(got);}
 got.cost=price;got.day=S.day;it.st='sold';S.inv.push(got);sfx('coin');
 if(got.kind==='rare'){ccEvent('rare_found',{item:got.def.i,day:S.day});sfx('rare');}
 const lines=price<=it.floor+1?["you drive a hard bargain. i hate it.","fine. take it. take it far away."]:price>=it.sticker?["sold! pleasure doing business.","no haggling? respect. weird, but respect."]:["deal. don't tell my spouse.","sold. it's your problem now."];
 sale.bubble=pick(lines);H=null;render();flashGob();stamp(price<it.sticker*.75?'steal!':'got it!','buy');coinFly(rectOf('#hud .cash'),from,Math.min(8,2+Math.round(price/10)));tickCash();
 if(it.kind==='box')toast('📦 inside: '+got.name+(got.kind==='rare'?'! jackpot.':got.kind==='curse'?'. uh oh.':got.kind==='fake'?'. a fake. classic.':'.'));
 else if(got.kind==='curse'&&got.det)toast('cursed. sell it today.');
 else if(got.kind==='rare')toast('a rare! sell big or museum it.');
}
function offerBuy(o){
 const {it,sale}=H;o=Math.round(o);
 if(o>=it.ask){buyAt(it.ask);return;}
 if(o>=it.floor){buyAt(o);return;}
 const gap=(it.floor-o)/it.floor;sale.pat-=16+gap*75;sfx('haggle');H.n++;
 if(sale.pat<=0&&H.n===1){sale.pat=8;sale.bubble=pick(INSULT_BUY)+" one more like that and i'm closing up.";setStatus('careful. they nearly closed up.','bad');react(-2,'💢');return;}
 if(sale.pat<=0){sale.closed=true;sale.bubble=pick(["no. not you. not anymore. sale's closed.","get off my lawn. respectfully.","i'd rather throw it in the sea."]);H=null;sfx('nope');render();bounce('#themc');pop('💢');toast('they closed up. try the next house.');return;}
 if(sale.rival&&Math.random()<.33){it.st='sniped';sale.bubble="grubnik slaps down "+money(it.ask)+". 'too slow, cousin.'";H=null;render();pop('😈');toast('grubnik sniped it. haggle faster.');return;}
 const prev=it.ask;it.ask=Math.max(it.floor,Math.round(it.ask-(it.ask-o)*R(.25,.45)));
 const cnt=it.ask===it.floor&&prev===it.floor?"that's my floor. "+money(it.ask)+".":pick(["how about "+money(it.ask)+"?","i could do "+money(it.ask)+".",money(it.ask)+". and that's me being nice.","ha. "+money(it.ask)+"."]);
 sale.bubble=(gap>.35?pick(INSULT_BUY)+' ':'')+cnt;
 setStatus(gap>.35?'they look insulted.':'they\'re thinking about it.',gap>.35?'bad':'');
 H.val=Math.min(H.val,it.ask);react(gap>.35?-2:0,gap>.35?'💢':'🤔');
}
function nextSale(){
 H=null;S.saleIdx++;sfx('walk');
 if(S.saleIdx>=S.sales.length){startShop();return;}
 render();
}

// ---------- afternoon ----------
function startShop(){
 S.phase='shop';H=null;S.result=null;
 let n=4+S.ups.shelf+S.ups.sign+2*S.ups.neon+(S.fame>0?1:0)-(S.curseNext||0)+(S.event==='fair'?2:0)-(S.event==='rain'?1:0)-(S.day>=10&&!S.ups.loyal?1:0);
 S.fame=Math.max(0,S.fame-1);S.curseNext=0;n=clamp(n,2,9);S.queue=[];
 for(let k=0;k<n;k++)S.queue.push(makeCust());
 if(S.day===S.collectorDay){S.queue.splice(Math.min(1,S.queue.length),0,{t:BIGCOL,name:null,mem:0,visits:0});S.collectorDay+=RI(4,5);toast('🧐 the big collector is here today!');}
 if(S.event==='celeb')S.queue[RI(Math.min(1,n-1),n-1)]={t:CELEB,name:null,mem:0,visits:0};
 S.custTotal=S.queue.length;S.custServed=0;
 tip('shop','customers! drag up. watch their face.');
 nextCust();
}
function makeCust(){
 if(S.regs.length&&Math.random()<.28*(S.ups.loyal?2:1)){const r=pick(S.regs);if(!S.queue.includes(r)&&r!==S.cust){r.returning=true;return r;}}
 let tot=0;CUSTS.forEach(c=>tot+=c.w);let t=CUSTS[0];
 for(let g=0;g<12;g++){let x=Math.random()*tot;for(const c of CUSTS){x-=c.w;if(x<=0){t=c;break;}}
  if(S.day<=2&&['pro','cheap','wizard'].includes(t.id))continue;if(S.day===1&&t.id==='raccoon')continue;break;}
 if(t.cheap&&S.ups.cat&&Math.random()<.85)t=CUSTS[7];
 return {t,name:Math.random()<.45?pick(REG_NAMES):null,mem:0,visits:0,returning:false};
}
function chooseItem(c){
 const inv=S.inv;if(!inv.length)return null;const t=c.t;
 const score=it=>{let s=Math.random();
  if(t.rareM&&it.kind==='rare')s+=3;if(t.curseM&&it.kind==='curse')s+=3;
  if(t.catM&&t.catM[it.cat])s+=1.5;if(c.want&&it.cat===c.want)s+=2;if(t.tourist&&it.kind==='fake')s+=1;return s;};
 return inv.slice().sort((a,b)=>score(b)-score(a))[0];
}
function nextCust(){
 H=null;S.result=null;
 if(!S.queue.length){endDay();return;}
 const c=S.queue.shift();S.cust=c;S.custServed++;c.visits++;
 c.want=pick(Object.keys(CATS));
 const it=chooseItem(c);
 if(!it){S.result={txt:pick(["empty shelves. bold choice.","...is this a shop or a mood?","nothing here. cool. cool cool."]),cls:'bad',mood:-1};render(true);later(()=>{if(S.phase==='shop'&&S.result)nextCust();},1500);return;}
 const t=c.t;let base=t.exact?it.tv:(t.tourist&&it.kind==='fake'?Math.max(it.tv,it.look*.55):it.tv);
 let m=t.m*R(.98,1.32);if(t.exact)m=R(1,1.08);
 if(t.rareM&&it.kind==='rare')m*=t.rareM;
 if(t.curseM)m*=it.kind==='curse'?t.curseM:1;
 if(t.catM&&t.catM[it.cat])m*=t.catM[it.cat];
 if(t.love&&Math.random()<.7)m*=t.love;
 if(S.ups.dcase&&(it.kind==='rare'||it.cat==='fancy'))m*=1.3;
 if(S.ups.sign)m*=1.04;
 if(c.mem>0)m*=1.1;
 const max=Math.max(1,Math.round(base*m));
 let pat=(t.pat+(S.ups.sign?12:0)+(c.mem>0?25:0)+(c.mem<0?-25:0))*(S.ups.neon?.8:1)*(S.day<=3?1.2:1);
 pat=Math.max(20,Math.round(pat));
 const open=Math.max(1,Math.round(max*(t.open||R(.42,.58))));
 H={mode:'sell',it,c,max,pat,pat0:pat,their:open,n:0,react:null,val:Math.max(open+1,Math.round((it.hi||it.cost*1.5)*1.15)),fuzz:R(-.12,.12),status:'',stCls:''};
 let g=pick(t.greet).replace('{item}',it.name.replace(/^(a |an |the )/,'').replace(/^'|'$/g,''));
 if(c.returning){g=(c.mem>0?pick(["you again! the good goblin! ","hey, it's my goblin! "]):c.mem<0?pick(["hmph. you. ","we meet again, robber. "]):"back again. ")+g;}
 H.bubble=g+' '+(t.trade?'':pick(["i'll give you "+money(open)+".",money(open)+"?","how's "+money(open)+"?"]));
 if(t.trade){const ti=makeItem(Math.random()<.12?pick(RARES):rollDef());ti.cost=0;H.tradeItem=ti;H.coins=RI(1,6);
  H.bubble=g.replace('this and a secret','this '+ti.name+' and '+money(H.coins));}
 sfx('door');render(true);
 if(t.id==='raccoon')tip('raccoon','raccoons pay in stuff. push for coins.');
 if(t.id==='celeb')toast('🕶️ a celebrity! they pay silly money. and have no patience.');
}
function mood(){
 if(!H)return 0;
 if(H.react!==null&&H.react!==undefined)return H.react;
 if(H.mode==='buy'){const g=(H.it.floor-H.val)/H.it.floor+H.fuzz;return g<=0?2:g<.15?1:g<.35?0:g<.6?-1:-2;}
 if(H.c.t.poker)return 0;
 const g=(H.val-H.max)/H.max+H.fuzz;return g<=-.25?2:g<=0?1:g<.18?0:g<.45?-1:-2;
}
function sellAt(price){
 const {it,c,max}=H;price=Math.round(price);const from=rectOf('#themc');
 S.cash+=price;const p=price-it.cost;S.profit+=p;S.d.profit+=p;S.revenue+=price;S.d.earned+=price;S.soldN++;S.d.sold++;
 S.inv=S.inv.filter(x=>x!==it);sfx('coin');
 if(!S.bestSale||p>S.bestSale.p)S.bestSale={p,name:it.name};
 if(!S.d.best||p>S.d.best.p)S.d.best={p,name:it.name};
 const bargain=price<max*.8;c.mem=bargain?1:0;
 if(c.name&&!S.regs.includes(c))S.regs.push(c);
 if(c.t.fame)S.fame=1;
 gainXp(1+(p>=20?1:0)+(p>=60?1:0));
 const big=p>=Math.max(40,it.cost*1.5);
 S.result={txt:(big?'big score! ':'')+'sold for '+money(price)+' ('+(p>=0?'+':'')+money(p)+'). "'+pick(c.t.deal)+'"',cls:p>=0?'good':'bad',mood:2};
 if(big&&p>=80)ccEvent('big_score',{p,day:S.day});
 H=null;render(true);flashGob();stamp(big?'big score!':'deal!',big?'big':'');pop(big?'🤑':'😍');
 coinFly(from,rectOf('#hud .cash'),Math.min(12,3+Math.round(price/8)));tickCash();
 later(()=>{if(S.phase==='shop'&&S.result)nextCust();},1700);
}
function askSell(a){
 a=Math.round(a);const h=H;
 if(a<=h.their||a<=h.max){sellAt(a);return;}
 const gap=(a-h.max)/h.max;h.pat-=(14+gap*70)*h.c.t.imp;sfx('haggle');h.n++;
 const nm=h.it.name.replace(/^(a |an |the )/,'').replace(/^'|'$/g,'');
 if(h.pat<=0&&h.n===1){h.pat=Math.round(h.pat0*.15);h.bubble=pick(INSULT_SELL).replace('{item}',nm)+" one more like that and i'm gone.";setStatus('way too high. they nearly left.','bad');react(-2,'💢');return;}
 if(h.pat<=0){walkOut();return;}
 h.their=Math.min(h.max,Math.round(h.their+(h.max-h.their)*R(.35,.6)));
 if(h.max-h.their<=1)h.their=h.max;
 const cnt=h.their>=h.max?pick(["okay. "+money(h.their)+". that's everything i've got.",money(h.their)+". final. actually final."]):pick(["what about "+money(h.their)+"?","i could stretch to "+money(h.their)+".",money(h.their)+". don't push it.","ugh. "+money(h.their)+"?"]);
 h.bubble=(gap>.35?pick(INSULT_SELL).replace('{item}',nm)+' ':'')+cnt;
 setStatus(gap>.5?'that price offended them.':gap>.2?'they wince.':'so close. they\'re tempted.',gap>.2?'bad':'');
 react(gap>.35?-2:gap>.12?-1:0,gap>.35?'💢':gap>.12?'😬':'🤔');
}
function walkOut(){
 const c=H.c;c.mem=-1;if(c.name&&!S.regs.includes(c))S.regs.push(c);
 S.result={txt:'they walked. "'+pick(c.t.leave)+'" '+pick(WALK_EXTRA),cls:'bad',mood:-2,walk:true};sfx('huff');
 H=null;render(true);pop('💨');stamp('walked','bad');later(()=>{if(S.phase==='shop'&&S.result)nextCust();},1900);
}
function passCust(){if(!H)return;const c=H.c;S.result={txt:'you sent them off. "'+pick(c.t.leave)+'"',cls:'',mood:-1};H=null;render(true);later(()=>{if(S.phase==='shop'&&S.result)nextCust();},1100);}
function acceptTrade(){
 const {it,tradeItem,coins}=H;const from=rectOf('#themc');
 S.inv=S.inv.filter(x=>x!==it);tradeItem.day=S.day;S.inv.push(tradeItem);S.cash+=coins;
 const p=coins-it.cost;S.profit+=p;S.d.profit+=p;S.d.sold++;S.d.earned+=coins;S.soldN++;gainXp(1);
 if(tradeItem.kind==='rare')ccEvent('raccoon_rare',{day:S.day});
 S.result={txt:'traded! you got '+tradeItem.name+' + '+money(coins)+'. "'+pick(H.c.t.deal)+'"',cls:'good',mood:2};
 H=null;sfx('coin');render(true);stamp('trade!','');coinFly(from,rectOf('#hud .cash'),3);tickCash();
 later(()=>{if(S.phase==='shop'&&S.result)nextCust();},1800);
}
function haggleTrade(){
 const h=H;if(!h||!h.tradeItem)return;h.tn=(h.tn||0)+1;sfx('haggle');
 const give=h.tradeItem.tv+h.coins,want=Math.max(1,h.it.tv);
 const p=(h.tn===1?.75:h.tn===2?.45:.2)*(give>want*1.4?.6:1);
 if(Math.random()<p){const b=RI(2,4)+(h.tn>1?1:0);h.coins+=b;
  h.bubble=pick(["fine. "+money(h.coins)+". don't tell my cousins.","*counts bottle caps* ..."+money(h.coins)+". final.","ugh. "+money(h.coins)+" and the "+h.tradeItem.name.replace(/^(a |an |the )/,'')+". deal?"]);
  setStatus('the raccoon caved. +'+money(b)+'.','good');react(1,'🦝');return;}
 if(h.tn>=2&&Math.random()<.6){walkOut();return;}
 h.bubble=pick(["*rustles in a threatening way*","no. that's my bin money.","the secret's worth more than coins, goblin."]);
 setStatus('they bristle. push again and they might bolt.','bad');react(-1,'😾');
}
function gainXp(n){S.xp+=n;while(S.lvl<5&&S.xp>=LV_XP[S.lvl]){S.lvl++;S.inv.forEach(appraise);toast('🔍 appraisal level '+S.lvl+'! sharper hunches.');ccEvent('appraise_lv',{lvl:S.lvl,day:S.day});}}

// ---------- evening ----------
function endDay(){
 S.phase='evening';H=null;S.cust=null;S.result=null;const ev=[];
 if(S.ups.bin){const old=S.inv.filter(i=>i.day<=S.day-2&&i.kind!=='rare');let got=0;
  old.forEach(i=>{const v=Math.max(1,Math.round(i.tv*.5));got+=v;S.profit+=v-i.cost;S.d.profit+=v-i.cost;S.soldN++;});
  if(old.length){S.inv=S.inv.filter(i=>!old.includes(i));S.cash+=got;S.d.earned+=got;S.d.sold+=old.length;ev.push('🧺 the bargain bin cleared '+old.length+' old thing'+(old.length>1?'s':'')+' for '+money(got)+'.');}}
 const cursed=S.inv.filter(i=>i.kind==='curse');
 if(S.ups.exo){S.cash=Math.max(0,S.cash-12);ev.push('🧄 exorcist fee: $12.'+(cursed.length?' the curses sulk quietly.':''));}
 else cursed.forEach(it=>{
  const r=Math.random();
  if(r<.4){const l=Math.max(5,Math.round(S.cash*.18));S.cash=Math.max(0,S.cash-l);ev.push(it.em+' the '+it.name+' ate '+money(l)+' overnight. you did not see it chew.');}
  else if(r<.7){S.curseNext=(S.curseNext||0)+1;ev.push(it.em+' the '+it.name+' scared people off. 1 fewer shopper tomorrow.');}
  else{const o=S.inv.filter(x=>x!==it&&x.kind!=='rare');if(o.length){const v=pick(o);S.inv=S.inv.filter(x=>x!==v);ev.push(it.em+' the '+it.name+' broke your '+v.name+'. on purpose.');}else{const l=Math.max(5,Math.round(S.cash*.12));S.cash=Math.max(0,S.cash-l);ev.push(it.em+' the '+it.name+' cost you '+money(l)+' in exorcism fees.');}}
  if(Math.random()<.35){S.inv=S.inv.filter(x=>x!==it);ev.push('then it just... left. good.');}
 });
 if(cursed.length&&!S.ups.exo)sfx('curse');
 S.ev=ev;S.rentInfo=null;S.nextEvent=rollEvent(S.day+1);
 if(S.day%3===0){
  const k=S.day/3,rent=rentFor(k),before=S.cash;let fire=0;
  if(S.cash<rent){const fs=S.inv.filter(i=>i.kind!=='curse').sort((a,b)=>a.tv-b.tv);
   while(S.cash+fire<rent&&fs.length){const it=fs.shift();fire+=Math.max(1,Math.round(it.tv*.4));S.inv=S.inv.filter(x=>x!==it);}
   S.cash+=fire;}
  if(S.cash>=rent){S.cash-=rent;S.rentInfo={rent,before,after:S.cash,fire,ok:true};sfx('rent');ccEvent('rent_paid',{day:S.day,rent});}
  else if(k===1&&!S.graceUsed){S.graceUsed=true;S.rentInfo={rent,before,after:S.cash,fire,ok:true,grace:true};}
  else S.rentInfo={rent,before:S.cash,fire,ok:false};
  S.phase='rent';
 }
 if(S.phase==='rent'&&!S.rentInfo.ok)sfx('nope');else if(S.phase!=='rent')sfx('page');
 render();if(S.phase==='rent'&&S.rentInfo.ok)tickCash();
}
function rentDone(){sfx('page');if(!S.rentInfo||!S.rentInfo.ok){gameOver('rent was '+money(S.rentInfo.rent)+'. you had '+money(S.cash)+'.');return;}S.phase='evening';render();}
function buyUp(k){
 const u=UPS[k],l=S.ups[k];if(l>=u.max)return;const c=u.cost(l);if(S.cash<c)return;
 S.cash-=c;S.ups[k]++;sfx('coin');ccEvent('upgrade',{k,day:S.day});render();tickCash();
 if(k==='van')toast('🚐 vroom. tomorrow you can drive uptown.');
}
function gala(){if(museumCount()>=8&&!META.gala){META.gala=1;saveMeta();S.cash+=200;render();tickCash();stamp('museum complete!','big');toast('🏛️ museum complete! gala night: +$200. every new shop starts with a display case + your crown.');ccEvent('museum_complete',{day:S.day});}}
function donate(uid){
 const it=S.inv.find(i=>i.uid===uid);if(!it||it.kind!=='rare')return;
 S.inv=S.inv.filter(x=>x!==it);const isNew=!META.museum[it.def.i];META.museum[it.def.i]=1;saveMeta();
 S.donated.push(it.name);S.fame=2;gainXp(3);ccEvent('museum',{item:it.def.i,isNew});
 toast(isNew?'🏛️ new museum piece! '+museumCount()+'/8. more shoppers tomorrow.':'🏛️ already had one, but the crowd loves it.');render();gala();
}
function nextDay(){S.day++;sfx('page');startMorning();}

// ---------- game over ----------
function score(){return Math.max(1,Math.round(S.profit+S.day*10+S.donated.length*25));}
function gameOver(why){
 S.phase='over';S.over=true;S.why=why;H=null;clearTimers();
 const sc=score();const dur=Date.now()-S.t0;
 META.runs++;META.lifeProfit+=Math.max(0,S.profit);delete META.run;
 S.newBest=sc>META.best.score;
 if(S.day>META.best.day)META.best.day=S.day;if(S.profit>META.best.profit)META.best.profit=Math.round(S.profit);if(sc>META.best.score)META.best.score=sc;
 saveMeta();
 try{CC()&&CC().score&&CC().score(sc);}catch(e){}
 try{CC()&&CC().end&&CC().end({score:sc,durationMs:dur,completed:false});}catch(e){}
 render();
}

// ---------- juice ----------
function rectOf(sel){const e=$(sel),a=$('#app');if(!e||!a)return null;const r=e.getBoundingClientRect(),b=a.getBoundingClientRect();return {x:r.left-b.left+r.width/2,y:r.top-b.top+r.height*.45};}
function coinFly(from,to,n){
 if(FAST||!from||!to)return;const app=$('#app');
 for(let i=0;i<n;i++){const c=document.createElement('div');c.className='coin';const x0=from.x+R(-22,22),y0=from.y+R(-18,18);
  c.style.left=x0+'px';c.style.top=y0+'px';app.appendChild(c);
  setTimeout(()=>{c.style.transform=`translate(${to.x-x0}px,${to.y-y0}px) scale(.55)`;c.style.opacity='.3';},30+i*45);
  setTimeout(()=>c.remove(),720+i*45);}
}
function tickCash(){
 cancelAnimationFrame(tickRaf);
 const step=()=>{const d=S.cash-shownCash;const el=$('#hud .cash');
  if(Math.abs(d)<1.2)shownCash=S.cash;else shownCash+=d*.14+(d>0?.6:-.6);
  if(el){el.textContent=money(shownCash);el.classList.toggle('up',d>0&&shownCash!==S.cash);el.classList.toggle('down',d<0&&shownCash!==S.cash);}
  if(shownCash!==S.cash)tickRaf=requestAnimationFrame(step);};
 tickRaf=requestAnimationFrame(step);
}
function stamp(txt,cls){if(cls!=='bad')sfx('stamp');const sc=$('#scene .stage')||$('#scene');if(!sc)return;const d=document.createElement('div');d.className='stamp '+(cls||'');d.textContent=txt;sc.appendChild(d);setTimeout(()=>d.remove(),1200);}
function pop(emo){const sc=$('#scene'),t=$('#themc');if(!sc||!t)return;const d=document.createElement('div');d.className='pop';d.textContent=emo;
 const a=sc.getBoundingClientRect(),r=t.getBoundingClientRect();d.style.left=(r.left-a.left+r.width*.55)+'px';d.style.top=(r.top-a.top+r.height*.05)+'px';sc.appendChild(d);setTimeout(()=>d.remove(),1000);}
function bounce(sel){const e=$(sel);if(!e)return;e.classList.remove('bounce');void e.offsetWidth;e.classList.add('bounce');}
function react(md,emo){
 if(!H)return;H.react=md;const h=H;render();bounce('#themc');pop(emo);
 setTimeout(()=>{if(H===h){h.react=null;const t=$('#themc');if(t)t.innerHTML=face(h.mode==='buy'?(curSale().look||curSale().sel):h.c.t,mood());}},950);
}

// ---------- art ----------
function face(o,md,extra){
 const s=o.skin||'#f0c090',b=o.body||'#3f9cff',k='#2b2140';let g='';
 g+=`<path d="M10 128 Q12 92 50 90 Q88 92 90 128Z" fill="${b}" stroke="${k}" stroke-width="3"/>`;
 if(o.id==='raccoon')g+=`<circle cx="50" cy="104" r="2.5" fill="#ffd23f"/><circle cx="50" cy="116" r="2.5" fill="#ffd23f"/><path d="M50 92 L50 128" stroke="${k}" stroke-width="2"/>`;
 if(o.apron)g+=`<path d="M32 96 L68 96 L66 128 L34 128Z" fill="#c8733a" stroke="${k}" stroke-width="2.5"/><circle cx="50" cy="110" r="5" fill="#ffc83d" stroke="${k}" stroke-width="2"/>`;
 if(o.ears==='gob')g+=`<path d="M24 50 L-6 30 L22 66Z" fill="${s}" stroke="${k}" stroke-width="3" stroke-linejoin="round"/><path d="M76 50 L106 30 L78 66Z" fill="${s}" stroke="${k}" stroke-width="3" stroke-linejoin="round"/>`;
 else if(o.ears==='coon')g+=`<path d="M26 34 L24 10 L44 26Z" fill="#6d6d78" stroke="${k}" stroke-width="3"/><path d="M74 34 L76 10 L56 26Z" fill="#6d6d78" stroke="${k}" stroke-width="3"/>`;
 else g+=`<circle cx="19" cy="58" r="6" fill="${s}" stroke="${k}" stroke-width="3"/><circle cx="81" cy="58" r="6" fill="${s}" stroke="${k}" stroke-width="3"/>`;
 g+=`<ellipse cx="50" cy="56" rx="31" ry="33" fill="${s}" stroke="${k}" stroke-width="3"/>`;
 const e=o.eyes||'dot';
 if(e==='mask')g+=`<path d="M22 46 Q50 36 78 46 L76 60 Q50 54 24 60Z" fill="#3a3a44"/>`;
 const happy=md>=2;
 const eye=(x)=>{
  if(e==='shades')return '';
  if(e==='hollow')return `<ellipse cx="${x}" cy="50" rx="5" ry="7" fill="${k}"/>`;
  if(happy&&e!=='sparkle'&&e!=='wide')return `<path d="M${x-6} 52 Q${x} 44 ${x+6} 52" fill="none" stroke="${e==='mask'?'#fff':k}" stroke-width="3" stroke-linecap="round"/>`;
  if(e==='sparkle')return `<circle cx="${x}" cy="50" r="7" fill="#fff" stroke="${k}" stroke-width="2.5"/><path class="spark" d="M${x} 44 L${x+2} 48 L${x+6} 50 L${x+2} 52 L${x} 56 L${x-2} 52 L${x-6} 50 L${x-2} 48Z" fill="#ffc83d"/>`;
  if(e==='wide')return `<circle cx="${x}" cy="50" r="8" fill="#fff8b0" stroke="${k}" stroke-width="2.5"/><circle cx="${x+(md<0?-2:2)}" cy="51" r="3.6" fill="${k}"/>`;
  if(e==='sleepy')return `<path d="M${x-6} 50 L${x+6} 50" stroke="${k}" stroke-width="3" stroke-linecap="round"/><circle cx="${x}" cy="52" r="2.4" fill="${k}"/>`;
  if(e==='mask')return `<circle cx="${x}" cy="50" r="4" fill="#fff"/><circle cx="${x}" cy="50" r="2" fill="${k}"/>`;
  return `<circle cx="${x}" cy="50" r="4" fill="${k}"/>`;};
 g+=eye(38)+eye(62);
 if(e==='shades')g+=`<rect x="24" y="43" width="22" height="12" rx="4" fill="${k}"/><rect x="54" y="43" width="22" height="12" rx="4" fill="${k}"/><path d="M46 47 L54 47" stroke="${k}" stroke-width="3"/>`;
 if(e==='monocle')g+=`<circle cx="62" cy="50" r="9" fill="rgba(200,240,255,.35)" stroke="#d4a017" stroke-width="2.5"/><path d="M70 55 Q78 80 70 95" fill="none" stroke="#d4a017" stroke-width="1.5"/><circle class="spark" cx="58" cy="46" r="2" fill="#fff"/>`;
 if(md<=-1)g+=`<path d="M30 ${md<=-2?36:39} L44 42" stroke="${k}" stroke-width="3" stroke-linecap="round"/><path d="M70 ${md<=-2?36:39} L56 42" stroke="${k}" stroke-width="3" stroke-linecap="round"/>`;
 if(o.glasses)g+=`<circle cx="38" cy="50" r="9" fill="rgba(255,255,255,.25)" stroke="${k}" stroke-width="2.5"/><circle cx="62" cy="50" r="9" fill="rgba(255,255,255,.25)" stroke="${k}" stroke-width="2.5"/><path d="M47 50 L53 50" stroke="${k}" stroke-width="2.5"/>`;
 if(o.old)g+=`<path d="M36 33 Q50 28 64 33 M40 38 Q50 35 60 38" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="2"/><path d="M26 62 l4 3 M74 62 l-4 3" stroke="rgba(0,0,0,.25)" stroke-width="2"/>`;
 const mouths={2:`<path d="M35 70 Q50 90 65 70Z" fill="#7a1f2b" stroke="${k}" stroke-width="3" stroke-linejoin="round"/>`,1:`<path d="M38 72 Q50 82 62 72" fill="none" stroke="${k}" stroke-width="3" stroke-linecap="round"/>`,
  0:`<path d="M40 76 L60 76" stroke="${k}" stroke-width="3" stroke-linecap="round"/>`,'-1':`<path d="M38 80 Q50 71 62 80" fill="none" stroke="${k}" stroke-width="3" stroke-linecap="round"/>`,
  '-2':`<path d="M36 82 Q50 66 64 82Z" fill="#7a1f2b" stroke="${k}" stroke-width="3" stroke-linejoin="round"/>`};
 g+=mouths[md]||mouths[0];
 if(o.ears==='gob')g+=`<path d="M${md>=1?43:56} ${md>=1?73:77} l3 6 l3 -5" fill="#fff" stroke="${k}" stroke-width="1.5"/>`;
 if(o.id==='raccoon'||o.ears==='coon')g+=`<ellipse cx="50" cy="64" rx="5" ry="3.5" fill="${k}"/>`;
 else g+=`<ellipse cx="50" cy="${o.ears==='gob'?62:63}" rx="${o.ears==='gob'?6:3}" ry="${o.ears==='gob'?5:3}" fill="rgba(0,0,0,.18)"/>`;
 const h=o.hat;
 if(h==='cap')g+=`<path d="M20 38 Q50 6 80 38Z" fill="${o.hatc||'#ff5a5f'}" stroke="${k}" stroke-width="3"/><path d="M74 36 L98 40" stroke="${k}" stroke-width="5" stroke-linecap="round"/>`;
 if(h==='witch')g+=`<path d="M14 32 L86 32 L60 26 L48 -8 L38 26Z" fill="#4a2f8a" stroke="${k}" stroke-width="3" stroke-linejoin="round"/><circle cx="50" cy="16" r="3" fill="#ffc83d"/>`;
 if(h==='top')g+=`<rect x="30" y="0" width="40" height="28" fill="#222" stroke="${k}" stroke-width="3"/><rect x="20" y="26" width="60" height="6" rx="3" fill="#222" stroke="${k}" stroke-width="3"/><rect x="30" y="18" width="40" height="5" fill="#a33"/>`;
 if(h==='beanie')g+=`<path d="M19 42 Q22 12 50 12 Q78 12 81 42Z" fill="#ffc83d" stroke="${k}" stroke-width="3"/><circle cx="50" cy="10" r="6" fill="#ff5a5f" stroke="${k}" stroke-width="3"/>`;
 if(h==='bun')g+=`<circle cx="50" cy="20" r="13" fill="#cfcfd6" stroke="${k}" stroke-width="3"/><path d="M22 44 Q26 20 50 22 Q74 20 78 44" fill="#cfcfd6" stroke="${k}" stroke-width="3"/>`;
 if(h==='crown')g+=`<path d="M30 30 L30 12 L40 22 L50 6 L60 22 L70 12 L70 30Z" fill="#ffc83d" stroke="${k}" stroke-width="3" stroke-linejoin="round"/>`;
 if(extra)g+=extra;
 return `<svg viewBox="-8 -10 116 140" xmlns="http://www.w3.org/2000/svg">${g}</svg>`;
}
const GOB={skin:'#7bd14f',ears:'gob',eyes:'wide',body:'#6b3f22',apron:true};
let gobMood=1,gobT=0;
function flashGob(){gobMood=2;clearTimeout(gobT);gobT=setTimeout(()=>{gobMood=1;const g=$('#gobc');if(g)g.innerHTML=gobSvg();},1200);const g=$('#gobc');if(g){g.innerHTML=gobSvg();g.classList.remove('bounce');void g.offsetWidth;g.classList.add('bounce');}}
function gobSvg(){const o=Object.assign({},GOB);if(museumCount()>=8)o.hat='crown';return face(o,gobMood);}

// ---------- render ----------
function render(enter){
 if(FAST)return;const app=$('#app');app.classList.toggle('short',app.clientHeight<540);
 renderHud();renderScene(enter);renderPanel();renderModal();
 const tt=$('#toast');if(tt&&tt.classList.contains('on'))placeToast();
}
function renderHud(){
 if(!S)return;
 const daysLeft=nextRentDay()-S.day;const warn=daysLeft===0&&S.cash<nextRent();
 const ph=S.phase==='yard'||S.phase==='choose'?'☀️':S.phase==='shop'?'🌇':S.phase==='over'?'💀':'🌙';
 $('#hud').innerHTML=`<span>${ph} day ${S.day}</span><span class="cash">${money(shownCash)}</span><span class="lvl" title="appraisal level">🔍${S.lvl}</span>
 <span class="rent ${warn?'warn':daysLeft===0?'due':''}">rent ${money(nextRent())} ${daysLeft===0?'tonight':'in '+daysLeft+'d'}</span><button class="ib" data-act="mute" aria-label="mute">${muted||ccMuted?'🔇':'🔈'}</button>`;
 if(shownCash!==S.cash)tickCash();
}
function wallTop(){
 // the upper wall of the shop: fills tall screens
 const frames=RARES.map(r=>`<span class="${META.museum[r.i]?'got':''}">${META.museum[r.i]?'<b class="ico rare">'+r.em+'</b>':''}</span>`).join('');
 const stock=S.inv.slice(9,18).map(i=>`<span>${ic(i)}</span>`).join('');
 return `<div class="upper"><div class="uwrap">
  <div class="sign ${S.ups.neon?'neon':''}">${S.ups.neon?'✨ GOBLIN\'S ✨':S.ups.sign?'goblin\'s: we have things':'goblin\'s junk'}</div>
  <div class="uwin">${S.event==='rain'?'🌧️':S.phase==='shop'?'🌤️':'🌙'}<span>${S.district==='uptown'?'uptown run':'maple st'}</span></div>
  <div class="frames" title="museum wall">${frames}</div><div class="flabel">museum wall ${museumCount()}/8</div>
  ${stock?`<div class="shelfrow hi">${stock}</div>`:''}
  ${S.ups.cat?'<div class="catnap">🐈‍⬛<i>z</i></div>':''}
 </div></div>`;
}
function renderScene(enter){
 const sc=$('#scene');if(!S)return;
 let h='',cls='';
 if(S.phase==='yard'||S.phase==='choose'){
  cls='yard'+(S.district==='uptown'?' uptown':'')+(S.event==='rain'?' rain':'');
  const tod=S.phase==='yard'&&S.sales.length>1?S.saleIdx/(S.sales.length-1):0;
  h+=`<div class="bg"></div>${S.district==='uptown'?'<div class="skyline"></div>':''}<div class="tint" style="opacity:${(.42*(1-tod)).toFixed(2)}"></div>${S.event==='rain'?'<div class="drops"></div>':`<div class="sun" style="top:${(26-tod*20).toFixed(0)}%;right:${(30-tod*22).toFixed(0)}%"></div>`}<div class="cloud" style="left:12%;top:14%"></div><div class="cloud" style="left:58%;top:6%;transform:scale(.7)"></div>`;
  if(S.phase==='yard'){
   const sale=curSale();
   const dots=S.sales.map((s,i)=>`<span class="${i===S.saleIdx?'on':i<S.saleIdx?'done':''}"></span>`).join('');
   h+=`<div class="stage"><div class="street">${S.district==='uptown'?'🏙️ uptown':'🏡 maple st'} · sale ${S.saleIdx+1}/${S.sales.length} ${dots}${S.event?' · '+EVENTS[S.event].n:''}</div>`;
   const st=sale.style||'house';const extraW=st==='tall'||st==='condo'?'<div class="win" style="left:12%;top:58%"></div><div class="win" style="right:12%;top:58%"></div>':st==='mansion'?'<div class="col" style="left:30%"></div><div class="col" style="right:30%"></div>':'';
   h+=`<div class="house ${st}" style="background:${sale.wall};--roof:${sale.roof}"><div class="win" style="left:12%"></div><div class="win" style="right:12%"></div>${extraW}<div class="door"></div>${sale.estate?'<div class="estate">ESTATE SALE</div>':''}</div>`;
   h+=`<div class="table">${sale.items.map(it=>`<i style="opacity:${it.st==='open'&&!sale.closed?1:.25}">${ic(it)}</i>`).join('')}</div>`;
   if(sale.rival)h+=`<div class="char rival">${face(RIVAL,H&&H.mode==='buy'?1:0)}</div><div class="rtag">grubnik 😈</div>`;
   const md=sale.closed?-2:H&&H.mode==='buy'?mood():1;
   h+=`<div class="char gob" id="gobc">${gobSvg()}</div><div class="char them" id="themc">${face(sale.look||sale.sel,md)}</div>${sale.dog?`<div class="dog">${DOG}</div>`:''}`;
   h+=`<div class="who">${esc(sale.sel.n)}</div>`;
   h+=`<div class="bubble">${esc(sale.bubble||sale.sel.line)}</div></div>`;
  }
 } else {
  cls='shop';
  h+=`<div class="bg"></div>`+wallTop();
  const inv=S.inv.slice(0,9).map(ic);const rows=[inv.slice(0,5),inv.slice(5,10)];
  h+=`<div class="stage"><div class="shelfwall">${rows.map(r=>`<div class="shelfrow">${r.map(e=>`<span>${e}</span>`).join('')}</div>`).join('')}</div><div class="counter"><div class="till">💰</div></div>`;
  if(S.ups.dcase)h+=`<div class="extra" style="right:24%;bottom:20%">🗄️</div>`;
  h+=`<div class="char gob" id="gobc">${gobSvg()}</div>`;
  if(S.phase==='shop'&&S.cust){
   const c=S.cust,t=c.t;const md=S.result?S.result.mood:H?mood():0;
   const anim=t.anim==='tap'?'tap':t.anim==='wob'?'wob':t.anim==='ghost'?'ghost':'';
   const leaving=S.result?(S.result.walk?' storm':' leave'):'';
   h+=`<div class="char them ${anim}${enter&&!S.result?' enter':''}${leaving}" id="themc">${face(t,md)}</div>`;
   h+=`<div class="tell">${esc(t.tell)}</div><div class="who">${esc(c.name?c.name+' ('+t.n+')':t.n)}${c.returning?' · regular':''}</div>`;
   const b=S.result?S.result.txt:H?H.bubble:'';if(b)h+=`<div class="bubble">${esc(b)}</div>`;
   h+=`<div class="street">shopper ${S.custServed}/${S.custTotal}</div>`;
  }
  h+='</div>';
 }
 sc.className=cls;sc.innerHTML=h;
}
function upOrder(){
 const ks=Object.keys(UPS).filter(k=>S.ups[k]<UPS[k].max);
 const sc=k=>{let v=0;const c=UPS[k].cost(S.ups[k]);if(c<=S.cash)v+=10;if(c<=S.cash-nextRentNeed())v+=5;
  if(k==='shelf'&&S.inv.length>=shelfCap()-2)v+=6;if(k==='sign'&&S.day<=6)v+=4;if(k==='dcase'&&S.inv.some(i=>i.kind==='rare'||i.cat==='fancy'))v+=5;
  if(k==='exo'&&S.inv.some(i=>i.kind==='curse'))v+=6;if(k==='van'&&S.day>=4)v+=4;if(k==='loyal'&&S.day>=8)v+=4;if(k==='bin'&&S.inv.some(i=>i.day<=S.day-2))v+=3;if(k==='cat')v+=1;
  return v-c/100;};
 return ks.sort((a,b)=>sc(b)-sc(a));
}
function nextRentNeed(){const nd=Math.ceil((S.day+1)/3)*3;return nd-S.day<=1?rentFor(nd/3):0;}
function teaser(){
 const t=[];const ne=S.nextEvent;
 t.push(ne?`<b>tomorrow:</b> ${EVENTS[ne].n}. ${EVENTS[ne].d}.`:`<b>tomorrow:</b> a normal day. probably.`);
 const cd=S.collectorDay-S.day;
 if(cd>=1&&cd<=3)t.push(`🧐 <b>the big collector</b> visits ${cd===1?'tomorrow':'on day '+S.collectorDay}. pays huge for rares + fancy stuff. save one.`);
 if(!S.ups.van&&S.day>=3)t.push('🚐 a van gets you uptown. collectors live there.');
 if(museumCount()<8){const nu=UNLOCKS.find(u=>museumCount()<u[0]);if(nu)t.push(`🏛️ museum ${museumCount()}/8. next unlock at ${nu[0]}: ${nu[1]}.`);}
 return t.slice(0,3).map(x=>`<div>${x}</div>`).join('');
}
function tagsFor(it){
 let t='';
 if(it.kind==='rare')t+='<span class="tag rare">✨ rare</span>';
 if(it.kind==='fake'&&it.det)t+='<span class="tag fake">fake!</span>';
 if(it.kind==='curse'&&it.det)t+='<span class="tag curse">cursed</span>';
 if(it.kind==='box')t+='<span class="tag want">mystery</span>';
 return t;
}
function ic(it){return (it.kind==='rare'||it.kind==='curse')?`<b class="ico ${it.kind}">${it.em}</b>`:it.em;}
function apText(it){return it.kind==='box'?'hunch: ???':`hunch ${money(it.lo)}–${money(it.hi)}`;}
const tutOn=()=>S&&S.tut&&S.day===1;
function sliderRow(max){
 return `<div class="price ${tutOn()&&H&&!H.n?'pulse':''}"><b id="pv">${money(H.val)}</b><button class="nudge" data-act="nudge" data-a="-1" aria-label="lower">−</button><input id="slider" type="range" min="1" max="${max}" value="${H.val}" aria-label="price"><button class="nudge" data-act="nudge" data-a="1" aria-label="higher">+</button></div>`;
}
function renderPanel(){
 const p=$('#panel');if(!S){p.innerHTML='';return;}
 let h='';const tut=tutOn();
 if(S.phase==='yard'){
  const sale=curSale();
  if(H&&H.mode==='buy'){
   const it=H.it;const pat=clamp(sale.pat/sale.pat0*100,0,100);
   h+=`<div class="hag"><div class="top"><div class="em">${ic(it)}</div><div><div class="nm">${esc(it.name)} ${tagsFor(it)}</div><div class="note">${apText(it)} · they want ${money(it.ask)} · you have ${money(S.cash)}</div></div></div>
   <div class="meters"><div class="meter">their patience<div class="bar"><i class="${pat<30?'low':pat<60?'mid':''}" style="width:${pat}%"></i></div></div></div>
   ${sliderRow(it.ask)}<div class="status ${H.stCls}">${esc(H.status||'')}</div>
   <div class="row"><button class="btn primary ${tut&&!H.n?'pulse':''}" data-act="offer" id="pbtn">offer ${money(H.val)}</button><button class="btn gold ${tut&&H.n?'pulse':''}" data-act="buyask">pay ${money(it.ask)}</button><button class="btn sm" data-act="back">back</button></div></div>`;
  } else {
   const bought=S.d.bought>0;let firstOpen=sale.items.findIndex(i=>i.st==='open');
   h+=`<div class="grid">${sale.items.map((it,i)=>`<button class="card ${it.st!=='open'||sale.closed?'gone':''} ${tut&&!bought&&i===firstOpen&&!sale.closed?'pulse':''}" data-act="look" data-a="${i}"><span class="pr">${it.st==='sniped'?'gone':money(it.ask)}</span><span class="em">${ic(it)}</span><span class="nm">${esc(it.name)}</span><span>${tagsFor(it)}</span><span class="ap">${apText(it)}</span></button>`).join('')}</div>
   <div class="row end"><span class="note">shelf ${S.inv.length}/${shelfCap()}${S.day===1&&S.saleIdx===0?' · <span class="credit">computer cooked games</span>':''}</span><button class="btn primary ${tut&&bought?'pulse':''}" data-act="next" id="pbtn">${S.saleIdx+1>=S.sales.length?'open the shop →':'next house →'}</button></div>`;
  }
 } else if(S.phase==='shop'){
  if(H&&H.mode==='sell'){
   const it=H.it;
   if(H.tradeItem){const ti=H.tradeItem;
    h+=`<div class="hag"><div class="top"><div class="em">${ic(it)}</div><div><div class="nm">they want: ${esc(it.name)}</div><div class="note">you paid ${money(it.cost)} · ${apText(it)}</div></div></div>
    <div class="top" style="margin-top:6px"><div class="em">${ic(ti)}</div><div><div class="nm">they offer: ${esc(ti.name)} + ${money(H.coins)} ${tagsFor(ti)}</div><div class="note">${apText(ti)}</div></div></div>
    <div class="status ${H.stCls}">${esc(H.status||'')}</div>
    <div class="row" style="margin-top:8px"><button class="btn primary" data-act="trade" id="pbtn">trade</button><button class="btn gold" data-act="thaggle">push for more coins</button><button class="btn sm" data-act="pass">no thanks</button></div></div>`;
   } else {
    const pat=clamp(H.pat/H.pat0*100,0,100);
    h+=`<div class="hag"><div class="top"><div class="em">${ic(it)}</div><div><div class="nm">${esc(it.name)} ${tagsFor(it)}</div><div class="note">you paid ${money(it.cost)} · ${apText(it)}</div></div></div>
    <div class="meters"><div class="meter">patience<div class="bar"><i class="${pat<30?'low':pat<60?'mid':''}" style="width:${pat}%"></i></div></div><div class="meter">they offer<div class="offer">${money(H.their)}</div></div></div>
    ${sliderRow(Math.max(H.their+10,Math.round((it.hi||10)*2.6)+5))}<div class="status ${H.stCls}">${esc(H.status||'')}</div>
    <div class="row"><button class="btn primary ${tut&&!H.n?'pulse':''}" data-act="ask" id="pbtn">ask ${money(H.val)}</button><button class="btn gold ${tut&&H.n?'pulse':''}" data-act="take">take ${money(H.their)}</button><button class="btn sm" data-act="pass">no sale</button></div></div>`;
   }
  } else if(S.result){
   h+=`<div class="status ${S.result.cls}" style="font-size:15px">${esc(S.result.txt)}</div><div class="row end"><span class="note">shelf ${S.inv.length}/${shelfCap()} · today ${S.d.profit>=0?'+':''}${money(S.d.profit)}</span><button class="btn primary" data-act="nextc" id="pbtn">${S.queue.length?'next shopper →':'close up →'}</button></div>`;
  }
 }
 p.innerHTML=h;
 const sl=$('#slider');if(sl)sl.addEventListener('input',onSlide);
}
function onSlide(){
 const sl=$('#slider');if(!sl||!H)return;H.val=+sl.value;H.react=null;
 $('#pv').textContent=money(H.val);const pb=$('#pbtn');if(pb)pb.textContent=(H.mode==='buy'?'offer ':'ask ')+money(H.val);
 const t=$('#themc');if(t){const src=H.mode==='buy'?(curSale().look||curSale().sel):H.c.t;t.innerHTML=face(src,mood());}
}
function nudge(d){const sl=$('#slider');if(!sl)return;sl.value=clamp(+sl.value+d,+sl.min,+sl.max);onSlide();}
function setStatus(s,c){if(H){H.status=s;H.stCls=c||'';}}

function renderModal(){
 const m=$('#modal');if(!S){m.className='';return;}
 if(S.phase==='choose'){
  m.innerHTML=`<div class="sheet"><h2>☀️ day ${S.day}: where to?</h2>${S.event?`<div class="line"><b>${EVENTS[S.event].n}</b>: ${EVENTS[S.event].d}</div>`:''}
  <div class="choose"><button class="up" data-act="go" data-a="maple" id="mbtn"><b>🏡 maple street</b>cheap junk. honest-ish sellers. free.</button>
  <button class="up" data-act="go" data-a="uptown" ${S.cash<15?'disabled':''}><b>🏙️ uptown</b>rarer stuff, pricier, more fakes. collectors' dreams. $15 gas.</button></div></div>`;
  m.className='on';
 } else if(S.phase==='rent'){
  const r=S.rentInfo;
  m.innerHTML=`<div class="sheet rentday"><div class="landlord">${face(LANDLORD,r.ok?(r.grace?1:0):-2)}</div><h2>🗝️ rent day!</h2>
  <div class="line">the landlord (a much bigger goblin) holds out a hand.</div>
  <div class="rentbig">${money(r.rent)}</div>
  ${r.fire?`<div class="line" style="color:#d0303a">short on cash! fire sale to "the liquidator": +${money(r.fire)}</div>`:''}
  <div class="line big">${money(r.before+(r.fire||0))} → ${r.ok?money(r.after):'not enough'}</div>
  <div class="rstamp ${r.ok?'ok':'no'}">${r.grace?'first month free':r.ok?'paid':'evicted'}</div>
  <div class="line">${r.grace?'"first month\'s on me. next time: the locks."':r.ok?'"see you in 3 days. it goes up. it always goes up."':'"pack your junk."'}</div>
  <div class="line note">${r.ok?'next rent: '+money(rentFor(S.day/3+1))+' on day '+(S.day+3):''}</div>
  <button class="btn ${r.ok?'primary':'red'}" data-act="rentok" id="mbtn">${r.ok?'phew →':'uh oh'}</button></div>`;
  m.className='on';
 } else if(S.phase==='evening'){
  const nd=Math.ceil((S.day+1)/3)*3,dl=nd-S.day,nr=rentFor(nd/3);
  const pips=[0,1,2].map(i=>`<span class="${i<3-dl?'on':''}"></span>`).join('');
  let h=`<div class="sheet"><h2>🌙 day ${S.day} done</h2>
  <div class="tiles"><div><small>bought</small><b>${S.d.bought}</b><em>-${money(S.d.spent)}</em></div><div><small>sold</small><b>${S.d.sold}</b><em>+${money(S.d.earned)}</em></div>
  <div><small>profit</small><b class="${S.d.profit>=0?'g':'r'}">${S.d.profit>=0?'+':''}${money(S.d.profit)}</b><em>today</em></div><div><small>cash</small><b>${money(S.cash)}</b><em>stock ${S.inv.length}/${shelfCap()}</em></div></div>
  ${S.d.best?`<div class="line">best flip: ${esc(S.d.best.name)} (${S.d.best.p>=0?'+':''}${money(S.d.best.p)})</div>`:''}`;
  (S.ev||[]).forEach(e=>h+=`<div class="line" style="color:#6a2d9a">${esc(e)}</div>`);
  h+=`<div class="rentbar ${S.cash<nr?'short':''}"><span>🗝️ rent <b>${money(nr)}</b> due day ${nd}</span><span class="pips">${pips}</span><span>${dl} day${dl>1?'s':''} left</span></div>`;
  if(S.cash<nr)h+=`<div class="line note">you need ${money(nr-S.cash)} more. sell, sell, sell.</div>`;
  h+=`<div class="tease">${teaser()}</div>`;
  h+=`<div class="row end" style="margin:4px 0 2px"><span class="note">🔍 appraisal ${S.lvl}${S.lvl<5?' ('+S.xp+'/'+LV_XP[S.lvl]+' xp)':''}</span><button class="btn primary" data-act="nextday" id="mbtn">day ${S.day+1} →</button></div>`;
  const rares=S.inv.filter(i=>i.kind==='rare');
  if(rares.length){h+=`<h3>🏛️ museum wall (${museumCount()}/8)</h3><div class="line note">donate a rare: gone from this run, on your wall forever. +shoppers tomorrow.</div><div class="row">`+rares.map(r=>`<button class="btn sm" data-act="donate" data-a="${r.uid}">${r.em} donate${META.museum[r.def.i]?' (have)':' (new!)'}</button>`).join('')+`</div>`;}
  const cursedHeld=S.inv.filter(i=>i.kind==='curse'&&i.det).length;if(cursedHeld&&!S.ups.exo)h+=`<div class="line" style="color:#6a2d9a">holding ${cursedHeld} cursed thing${cursedHeld>1?'s':''}. sell fast.</div>`;
  const keys=upOrder();const shown=S.allUps?keys:keys.slice(0,3);
  h+=`<h3>🛠️ upgrades ${S.allUps?'':'<span class="note">(recommended)</span>'}</h3><div class="ups">`+shown.map(k=>{const u=UPS[k],l=S.ups[k];const own=l>=u.max;const c=own?0:u.cost(l);
   return `<button class="up ${own?'own':''}" data-act="up" data-a="${k}" ${own||S.cash<c?'disabled':''}><b>${u.n}${u.max>1?' '+l+'/'+u.max:''} · ${own?'✓':money(c)}</b>${u.d}</button>`;}).join('')+`</div>`+(keys.length>3?`<button class="btn sm wide" data-act="allups">${S.allUps?'show fewer':'see all upgrades ('+keys.length+')'}</button>`:'')+`</div>`;
  m.innerHTML=h;m.className='on';
 } else if(S.phase==='over'){
  const sc=score();
  let h=`<div class="sheet over"><h2>evicted. 🗝️</h2><div class="line">${esc(S.why||'')} the landlord changes the locks. the shop is now a vape store.</div>
  <div class="big">score ${sc}${S.newBest?' · new best!':''}</div>
  <div class="row" style="margin:6px 0"><button class="btn primary" data-act="again" id="mbtn">open a new shop</button><button class="btn gold" data-act="share">share result</button></div>
  <div class="status" id="sharemsg"></div>
  <div class="line">made it to day ${S.day} · total profit ${money(S.profit)} · ${S.soldN} things sold${S.bestSale?' · best flip: '+esc(S.bestSale.name)+' (+'+money(S.bestSale.p)+')':''}</div>
  <div class="line note">best: day ${META.best.day} · score ${META.best.score} · runs ${META.runs}</div>
  <h3>🏛️ museum wall ${museumCount()}/8</h3><div class="wall">${RARES.map(r=>`<span class="${META.museum[r.i]?'got':''}" title="${esc(r.name)}">${META.museum[r.i]?r.em:'?'}</span>`).join('')}</div>`;
  const nu=UNLOCKS.find(u=>museumCount()<u[0]);h+=`<div class="line note">${UNLOCKS.filter(u=>museumCount()>=u[0]).map(u=>'✓ '+u[1]).join(' · ')}${nu?(museumCount()>=2?' · ':'')+'next at '+nu[0]+' pieces: '+nu[1]:''}</div>`;
  h+=`<canvas id="sharec" width="600" height="315" style="display:none"></canvas><img id="shareimg" alt="result card"><div id="tipjar"></div><div class="credit">computer cooked games · computercooked.com</div></div>`;
  m.innerHTML=h;m.className='on';
  drawCard();
  try{window.ccTip&&window.ccTip.mount($('#tipjar'),{game:"garage-sale-goblin",slot:"game-over"});}catch(e){}
 } else if(paused){
  m.innerHTML=`<div class="sheet" style="margin-top:80px;text-align:center"><h2>paused</h2><div class="line">the goblin is taking a little sit.</div><button class="btn primary" data-act="unpause" id="mbtn">back to it</button></div>`;m.className='on';
 } else {m.className='';m.innerHTML='';}
 if(paused&&S.phase!=='over'&&m.className!=='on'){}
}
function drawCard(){
 const c=$('#sharec');if(!c)return;const x=c.getContext('2d');
 x.fillStyle='#ffc83d';x.fillRect(0,0,600,315);x.fillStyle='#2b2140';x.fillRect(0,250,600,65);
 x.fillStyle='#4fb83a';x.beginPath();x.ellipse(110,150,62,66,0,0,7);x.fill();x.lineWidth=5;x.strokeStyle='#2b2140';x.stroke();
 x.beginPath();x.moveTo(55,135);x.lineTo(5,105);x.lineTo(55,170);x.closePath();x.fill();x.stroke();
 x.beginPath();x.moveTo(165,135);x.lineTo(215,105);x.lineTo(165,170);x.closePath();x.fill();x.stroke();
 x.fillStyle='#fff8b0';[85,135].forEach(e=>{x.beginPath();x.arc(e,140,14,0,7);x.fill();x.stroke();});
 x.fillStyle='#2b2140';[89,139].forEach(e=>{x.beginPath();x.arc(e,142,6,0,7);x.fill();});
 x.beginPath();x.moveTo(80,180);x.quadraticCurveTo(110,205,140,180);x.closePath();x.fillStyle='#7a1f2b';x.fill();x.stroke();
 x.fillStyle='#2b2140';x.font='900 34px system-ui,sans-serif';x.fillText('garage sale goblin',235,70);
 x.font='800 24px system-ui,sans-serif';x.fillText('made it to day '+S.day,235,115);x.fillText('profit '+money(S.profit)+' · score '+score(),235,150);
 x.font='700 18px system-ui,sans-serif';x.fillText(S.bestSale?('best flip: '+S.bestSale.name).slice(0,40):'sold '+S.soldN+' things',235,185);
 x.fillText('museum pieces: '+museumCount()+'/8',235,215);
 x.fillStyle='#fff';x.font='800 20px system-ui,sans-serif';x.fillText('computercooked.com/games/garage-sale-goblin',20,290);
 try{$('#shareimg').src=c.toDataURL('image/png');}catch(e){}
}
async function share(){
 const url='https://computercooked.com/games/garage-sale-goblin';
 const text=`i ran a goblin junk shop to day ${S.day} with ${money(S.profit)} profit (score ${score()}). ${url}`;
 const msg=$('#sharemsg');
 try{
  if(navigator.share){
   let files=null;try{const c=$('#sharec');const blob=await new Promise(r=>c.toBlob(r,'image/png'));const f=new File([blob],'garage-sale-goblin.png',{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[f]}))files=[f];}catch(e){}
   await navigator.share(files?{text,files}:{text,url});return;}
 }catch(e){if(e&&e.name==='AbortError')return;}
 try{await navigator.clipboard.writeText(text);msg.textContent='copied to clipboard!';}catch(e){msg.textContent=text;}
}

// ---------- tips / toast ----------
let toastT=0;
function placeToast(){const t=$('#toast'),sc=$('#scene');if(!t||!sc)return;t.style.top=Math.max(sc.offsetTop+4,sc.offsetTop+sc.offsetHeight-t.offsetHeight-30)+'px';}
function toast(s){const t=$('#toast');t.textContent=s;placeToast();t.classList.add('on');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('on'),2600);}
function tip(k,s){if(META.seen[k])return;META.seen[k]=1;saveMeta();toast(s);}

// ---------- input ----------
const ACT={
 look:a=>openBuy(+a),back:()=>{H=null;render();},next:()=>nextSale(),
 offer:()=>H&&offerBuy(H.val),buyask:()=>H&&buyAt(H.it.ask),nudge:a=>nudge(+a),
 ask:()=>H&&askSell(H.val),take:()=>H&&sellAt(H.their),pass:()=>passCust(),trade:()=>H&&acceptTrade(),thaggle:()=>H&&haggleTrade(),
 nextc:()=>{clearTimers();nextCust();},go:a=>{if(S.phase==='choose')goStreet(a);},rentok:()=>{if(S.phase==='rent')rentDone();},
 up:a=>buyUp(a),donate:a=>donate(+a),nextday:()=>{if(S.phase==='evening')nextDay();},
 again:()=>newRun(),start:()=>newRun(),cont:()=>continueRun(),allups:()=>{S.allUps=!S.allUps;render();},share:()=>share(),mute:()=>{muted=!muted;META.muted=muted;saveMeta();renderHud();if(!S){const b=$('#hud .ib');if(b)b.textContent=muted?'🔇':'🔈';}},unpause:()=>{paused=false;render();}
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.disabled)return;if(paused&&b.dataset.act!=='unpause')return;const f=ACT[b.dataset.act];if(f)f(b.dataset.a);});
document.addEventListener('keydown',e=>{
 const k=e.key;if(!S){if(k==='Enter'||k===' '){const b=$('#modal.on #mbtn');if(b){e.preventDefault();b.click();}}return;}
 if(paused){if(k==='Enter'||k===' '||k==='Escape'){e.preventDefault();ACT.unpause();}return;}
 if(k==='Enter'||k===' '){const b=$('#modal.on #mbtn')||(!$('#modal.on')&&$('#pbtn'));if(b&&!b.disabled){e.preventDefault();b.click();}return;}
 const sl=$('#slider');
 if(sl&&(k==='ArrowLeft'||k==='ArrowRight'||k==='ArrowUp'||k==='ArrowDown'||k==='+'||k==='-'||k==='=')){e.preventDefault();const d=(k==='ArrowRight'||k==='ArrowUp'||k==='+'||k==='='?1:-1)*(e.shiftKey?5:1);nudge(d);return;}
 if(k==='Escape'){if(H&&H.mode==='buy')ACT.back();else if(H)ACT.pass();return;}
 if(S.phase==='yard'&&!H&&/^[1-5]$/.test(k))openBuy(+k-1);
 if(S.phase==='choose'&&(k==='1'||k==='2'))ACT.go(k==='1'?'maple':'uptown');
 if((k==='t'||k==='T')&&H&&H.mode==='sell'&&!H.tradeItem)ACT.take();
});
window.addEventListener('message',e=>{const d=e.data;if(!d||typeof d!=='object')return;
 if(d.type==='cc-mute'){ccMuted=!!d.muted;renderHud();}
 else if(d.type==='cc-restart'){paused=false;if(S&&!S.over){try{CC()&&CC().end&&CC().end({score:score(),durationMs:Date.now()-S.t0,completed:false});}catch(e){}}newRun();}
 else if(d.type==='cc-pause'){if(S){paused=true;render();}}
});
window.addEventListener('resize',()=>{if(S)render();});

// ---------- cover shot ----------
function coverShot(){
 S={day:7,phase:'shop',cash:312,inv:[],ups:{shelf:2,sign:1,cat:1,dcase:1,van:1,neon:0,exo:0,bin:0,loyal:0},xp:12,lvl:3,profit:420,soldN:20,regs:[],sales:[],queue:[1,2],donated:[],uid:1,custServed:4,custTotal:6,t0:Date.now(),d:{},district:'maple'};
 shownCash=312;
 ['👑','🎸','🦆','🕯️','🫖','🎩','📻','🦷','🪗'].forEach(e=>{const d=ITEMS.find(x=>x.em===e);S.inv.push(makeItem(d));});
 const it=S.inv[0];S.cust={t:CUSTS[2],name:null};H={mode:'sell',it,c:S.cust,max:999,pat:80,pat0:100,their:240,val:300,fuzz:0,react:2,bubble:"the crown. i must have it. name your price."};
 render();
 $('#panel').innerHTML=`<div style="text-align:center;padding:6px 0"><div style="font-size:clamp(28px,7vw,46px);font-weight:900;line-height:1">garage sale goblin</div><div class="note" style="font-size:14px;margin-top:4px">buy junk. haggle hard. pay the rent.</div><div class="credit" style="margin-top:4px">computer cooked games</div></div>`;
 $('#hud').innerHTML=`<span>🌇 day 7</span><span class="cash">$312</span><span class="lvl">🔍3</span><span class="rent">rent $125 in 2d</span>`;
 const c=document.createElement('div');c.className='stamp big';c.style.animation='none';c.textContent='big score!';c.style.top='60%';c.style.fontSize='34px';$('#scene').appendChild(c);
 [[44,30],[50,22],[56,34],[61,25],[39,24]].forEach(([x,y])=>{const k=document.createElement('div');k.className='coin';k.style.left=x+'%';k.style.top=y+'%';k.style.transition='none';$('#scene').appendChild(k);});
}

// ---------- test hooks ----------
if(TEST){
 const pureMood=()=>{if(!H)return 0;const r=H.react;H.react=null;const m=mood();H.react=r;return m;};
 window.__gsg={
  state:()=>JSON.parse(JSON.stringify({day:S.day,phase:S.phase,cash:S.cash,district:S.district,event:S.event,inv:S.inv.map(i=>({name:i.name,kind:i.kind,tv:i.tv,cost:i.cost,lo:i.lo,hi:i.hi,day:i.day})),ups:S.ups,lvl:S.lvl,xp:S.xp,profit:S.profit,soldN:S.soldN,saleIdx:S.saleIdx,
   sale:S.phase==='yard'?curSale().items.map(i=>({name:i.name,kind:i.kind,tv:i.tv,ask:i.ask,floor:i.floor,lo:i.lo,hi:i.hi,st:i.st})):null,closed:S.phase==='yard'?curSale().closed:null,
   H:H?{mode:H.mode,val:H.val,their:H.their,max:H.max,pat:H.pat,trade:!!H.tradeItem,item:H.it&&H.it.name,cost:H.it&&H.it.cost,tv:H.it&&H.it.tv,lo:H.it&&H.it.lo,hi:H.it&&H.it.hi,kind:H.it&&H.it.kind}:null,
   result:S.result,queue:S.queue?S.queue.length:0,score:score(),rentNext:nextRent(),rentDay:nextRentDay(),rentInfo:S.rentInfo,d:S.d,meta:META})),
  cash:n=>{S.cash=n;shownCash=n;render();},day:n=>{S.day=n;render();},lose:()=>gameOver('the test hook said so.'),
  sellAll:()=>{S.inv.slice().forEach(it=>{const p=it.tv;S.cash+=p;S.profit+=p-it.cost;S.soldN++;});S.inv=[];shownCash=S.cash;render();},
  setVal:(v,q)=>{if(H){H.val=v;if(!q)render();}},mood:pureMood,act:(n,a)=>ACT[n]&&ACT[n](a),endDay:()=>endDay(),
  addItem:kind=>{const it=makeItem(pick(BYKIND(kind||'rare')));S.inv.push(it);render();},event:e=>{S.event=e;},
  fast:on=>{FAST=!!on;if(!FAST)render();},meta:()=>META,resetMeta:()=>{META={best:{day:0,profit:0,score:0},runs:0,lifeProfit:0,museum:{},seen:{}};saveMeta();}
 };
}

// ---------- boot ----------
loadMeta();muted=!!META.muted;
if(SHOT)coverShot();else if(TEST&&Q.get('title')!=='1')newRun();else showTitle();
})();
