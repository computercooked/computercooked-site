/* smol brains: mine.js (built from src/mine.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB=window.SB||{};
var M=SB.Mine={};
M.HEARTS=5;
M.WISH_TRUST=0.05;
M.JOB_PAY=2;M.JOB_BONUS=4;
function Q(game){return game.quests||(game.quests={ch:0,done:{},n:{}});}
function st(game){var q=Q(game);if(!q.mine||typeof q.mine!=="object")q.mine={id:null,line:[]};if(!Array.isArray(q.mine.line))q.mine.line=[];return q.mine;}
function smols(game){return SB.Game.smols(game).filter(function(c){return c.alive&&!c.stranger;});}
function trust(c){return SB.Orders&&SB.Orders.trust?SB.Orders.trust(c):typeof c.trust==="number"?c.trust:0.5;}
function cur(){return SB.Game&&SB.Game.current;}
M.state=st;
M.is=function(game,c){return!!c&&!!game&&st(game).id===c.id;};
M.set=function(game,c,how){
if(!game||!c||!c.alive||c.species!=="smol"||c.stranger)return false;
var s=st(game);
if(s.id===c.id)return true;
s.id=c.id;s.since=Math.round(game.time);
if(s.line[s.line.length-1]!==c.name)s.line.push(c.name);
if(s.line.length>30)s.line.splice(0,s.line.length-30);
SB.bus.emit("mine",{c:c,how:how||"picked"});
return true;
};
M.get=function(game){
if(!game)return null;
var s=st(game),c=s.id!=null?SB.Game.byId(game,s.id):null;
if(c&&c.alive&&c.species==="smol")return c;
if(s.id==null)return null;
var h=M.heir(game,c);
if(h){var was=c?c.name:s.line[s.line.length-1]||"your smol";M.set(game,h,"heir");SB.bus.emit("mineHeir",{c:h,was:was,kin:!!(c&&h.parents&&h.parents.indexOf(c.id)>=0)});return h;}
return null;
};
M.heir=function(game,old){
var all=smols(game).filter(function(c){return!old||c.id!==old.id;});
if(!all.length)return null;
var best=function(list){return list.slice().sort(function(a,b){return trust(b)-trust(a)||a.id-b.id;})[0]||null;};
if(old){
var kids=all.filter(function(c){return c.parents&&c.parents.indexOf(old.id)>=0;});
if(kids.length)return best(kids);
var p=old.partner!=null?SB.Game.byId(game,old.partner):null;
if(p&&p.alive&&!p.stranger)return p;
}
return best(all);
};
M.adopt=function(game){
var s=st(game);
if(s.id!=null)return M.get(game);
var all=smols(game);if(!all.length)return null;
var pip=all.filter(function(c){return c.pip;})[0]||all[0];
M.set(game,pip,"first");
return pip;
};
M.need=function(c){
if(!c||!c.chem)return null;
var top=null,tv=0.45;
SB.DRIVES.forEach(function(d,i){if(d==="love")return;var v=c.chem[d]||0;if(v>tv){tv=v;top=i;}});
return top==null?null:{i:top,word:SB.DRIVE_WORDS[top],emoji:SB.DRIVE_EMOJI[top],v:tv};
};
M.hearts=function(c){return Math.round(trust(c)*M.HEARTS*2)/2;};
M.heartsText=function(c){var hh=M.hearts(c),out="";for(var i=1;i<=M.HEARTS;i++)out+=hh>=i?"♥":hh>=i-0.5?"❥":"♡";return out;};
M.JOBS=[
{id:"poveat",kind:"hands",tier:0,need:1,icon:"😋",t:"eat a meal as a smol",how:"tap your smol's chip → 👁, then find food and eat it"},
{id:"gather",kind:"hands",tier:0,need:3,icon:"🎒",t:"pick up 3 things as a smol",how:"in a smol's body, press F on sticks, berries, stones…"},
{id:"craft",kind:"hands",tier:2,need:1,icon:"🪓",t:"make something with a smol's hands",how:"in a tool-user's body, open the bag (Tab) and combine things"},
{id:"tickle",kind:"teach",tier:0,need:3,icon:"🪶",t:"reward good behaviour 3 times",how:"🪶 tickle a smol while it does something you like"},
{id:"word",kind:"teach",tier:0,need:1,icon:"💬",t:"teach a word",how:"💬 talk, pick a word, tap the thing while a smol looks at it"},
{id:"trick",kind:"teach",tier:0,need:1,icon:"🎓",t:"finish teaching a trick",how:"a smol's card → 🎓 tricks → set it up, then tickle at the right moment"},
{id:"hatch",kind:"island",tier:0,need:1,icon:"🥚",t:"see a new smol hatch",how:"fed, rested grown-ups fall in love. keep them fed"},
{id:"wish",kind:"island",tier:0,need:1,icon:"⭐",t:"grant a wish",how:"a 💭 over a little smol: bring what it asks for with ✋ grab"},
{id:"explore",kind:"island",tier:1,need:1,icon:"🧭",t:"find somewhere new",how:"walk a smol into the cloud at the edge of the map"},
{id:"idea",kind:"island",tier:2,need:1,icon:"💡",t:"a smol has a new idea",how:"hand tool-users sticks and stones, or ✨ magic → 💡 inspire"},
{id:"pray",kind:"island",tier:3,need:1,icon:"🙏",t:"answer a prayer",how:"tap the 🙏 toast, then cast the miracle it asks for"},
{id:"build",kind:"island",tier:4,need:1,icon:"🏗",t:"finish a building",how:"🚩 orders → blueprints, or carry sticks to a site yourself"}
];
M.JOB={};M.JOBS.forEach(function(j){M.JOB[j.id]=j;});
function day(game){return Math.floor((game.time||0)/SB.DAY_LENGTH)+1;}
function jobs(game){var q=Q(game);return q.jobs&&typeof q.jobs==="object"&&Array.isArray(q.jobs.list)?q.jobs:null;}
M.jobs=jobs;
M.roll=function(game){
var top=(game.stats&&game.stats.maxTier)||0,d=day(game),prev=jobs(game),r=SB.rng(((game.seed>>>0)^(d*2654435761))>>>0);
var was=prev?prev.list.map(function(j){return j.id;}):[];
var list=["hands","teach","island"].map(function(kind){
var pool=M.JOBS.filter(function(j){return j.kind===kind&&j.tier<=top;});
var fresh=pool.filter(function(j){return was.indexOf(j.id)<0;});
if(fresh.length)pool=fresh;
var j=pool[Math.floor(r()*pool.length)]||pool[0];
return{id:j.id,n:0,done:false};
});
Q(game).jobs={day:d,list:list,bonus:false};
SB.bus.emit("jobs",{day:d,list:list});
return Q(game).jobs;
};
M.today=function(game){var j=jobs(game);if(!j||j.day!==day(game))j=M.open(game)?M.roll(game):null;return j;};
M.open=function(game){return!!game&&!game.showcase&&(!SB.Quests||!SB.Quests.open||SB.Quests.open(game));};
M.count=function(game,id,by){
if(!game||game.offlineRunning||!M.open(game))return;
var js=M.today(game);if(!js)return;
js.list.forEach(function(j){
if(j.id!==id||j.done)return;
var def=M.JOB[id];
j.n=Math.min(def.need,j.n+(by==null?1:by));
if(j.n>=def.need){
j.done=true;
if(SB.Game.addSparks)SB.Game.addSparks(game,M.JOB_PAY,null);
SB.bus.emit("jobDone",{job:def,pay:M.JOB_PAY});
if(!js.bonus&&js.list.every(function(x){return x.done;})){
js.bonus=true;
if(SB.Game.addSparks)SB.Game.addSparks(game,M.JOB_BONUS,null);
var s=st(game);s.days=(s.days||0)+1;
SB.bus.emit("jobsDone",{pay:M.JOB_BONUS,days:s.days});
}
}
});
};
M.board=function(game){
var js=M.today(game);if(!js)return null;
return{day:js.day,bonus:js.bonus,rows:js.list.map(function(j){var d=M.JOB[j.id];return{id:j.id,icon:d.icon,t:d.t,how:d.how,have:j.n,need:d.need,done:j.done};})};
};
var hooked=false;
M.hook=function(){
if(hooked||!SB.bus)return;hooked=true;
var on=SB.bus.on;
function g(){return cur();}
on("povEat",function(){M.count(g(),"poveat");});
on("nibble",function(d){if(d&&d.c&&d.c._pov)M.count(g(),"poveat");});
on("povGain",function(d){M.count(g(),"gather",(d&&d.n)||1);});
on("craft",function(d){if(d&&d.pov)M.count(g(),"craft");});
on("tickle",function(d){if(d&&d.c&&d.c.species==="smol")M.count(g(),"tickle");});
on("learnWord",function(d){var gm=g();if(gm&&d&&d.c&&SB.Game.smols(gm).length<=40)M.count(gm,"word");});
on("trickLearned",function(){M.count(g(),"trick");});
on("hatch",function(d){var gm=g();if(d&&d.c&&d.c.species==="smol"&&!(d.obj&&d.obj.data&&d.obj.data.starter))M.count(gm,"hatch");});
on("wishGranted",function(d){M.count(g(),"wish");if(d&&d.c&&SB.Orders&&SB.Orders.addTrust)SB.Orders.addTrust(d.c,M.WISH_TRUST);});
on("newBiome",function(){M.count(g(),"explore");});
on("eureka",function(d){if(!d||d.first!==false)M.count(g(),"idea");});
on("prayerAnswered",function(d){if(!d||d.how==="miracle")M.count(g(),"pray");});
on("built",function(){M.count(g(),"build");});
on("dawn",function(){var gm=g();if(gm)M.today(gm);});
on("firstNight",function(d){var gm=g();if(gm&&d&&d.step==="done"){M.adopt(gm);M.today(gm);}});
};
M.hook();
})();
