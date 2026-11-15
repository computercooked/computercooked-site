/* smol brains: strangers.js (built from src/strangers.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB=window.SB||{};
var ST=SB.Strangers={};
var WAIT=150;
function smols(game){return game.creatures.filter(function(c){return c.alive&&c.species==="smol"&&!c.stranger;});}
ST.breedablePairs=function(game){
var ad=smols(game).filter(function(c){return c.stage>=2&&c.stage<=3;}),n=0;
for(var i=0;i<ad.length;i++)for(var j=i+1;j<ad.length;j++){
var a=ad[i],b=ad[j];
if(a.sex!==b.sex&&!SB.Game.related(game,a,b))n++;
}
return n;
};
ST.couples=function(game){
var SO=SB.Social,ad=smols(game).filter(function(c){return c.stage===3&&c.tier>=3;}),n=0;
if(!SO||!SO.eligible)return ST.breedablePairs(game);
var taken=function(c){var p=SO.partnerOf(game,c);return!!p&&p.stage===3;};
for(var i=0;i<ad.length;i++)for(var j=i+1;j<ad.length;j++){
var a=ad[i],b=ad[j];
if(a.partner===b.id&&b.partner===a.id)n++;
else if(SO.eligible(game,a,b)&&!taken(a)&&!taken(b))n++;
}
return n;
};
function chances(game){return(game.stats.maxTier||0)>=3?ST.couples(game):ST.breedablePairs(game);}
ST.shortOfCouples=function(game,n){
if((game.stats.maxTier||0)<3)return false;
var cap=SB.Civ&&SB.Civ.popCap?SB.Civ.popCap(game):(SB.Game.POP_CAP||36);
return n<cap*0.6&&ST.couples(game)<3;
};
ST.pending=function(game){return game.creatures.filter(function(c){return c.alive&&c.stranger&&c.stranger.state==="waiting";})[0]||null;};
function nextIn(game){
var r=game.rng,urgent=chances(game)===0;
var n=smols(game).length,talk=(game.stats.maxTier||0)>=3;
return urgent?r.range(120,210):talk&&n<30?r.range(200,360):n<12?r.range(300,480):talk?r.range(330,600):r.range(480,840);
}
function A(game){var q=game.quests||(game.quests={});return q.arr||(q.arr={n:0,came:{},merged:{}});}
ST.state=A;
function dice(game){var a=A(game);a.n=(a.n||0)+1;return SB.rng((game.seed*37+a.n*7919)>>>0);}
function homeOf(game){return SB.Society?SB.Society.home(game,0):game.world.T.spawn;}
function note(game,t){SB.Game.note(game,t);}
function spot(game,home,dist,r){
var w=game.world;r=r||game.rng;
for(var i=0;i<40;i++){
var a=r()*6.283,d=dist*(0.8+r()*0.4),x=home.x+Math.cos(a)*d,z=home.z+Math.sin(a)*d;
if(SB.World.inBounds(w,x,z)&&SB.World.walkable(w,x,z,false)&&SB.World.depthAt(w,x,z)<0.1)return{x:x,z:z};
}
return null;
}
ST.tick=function(game,dt){
var all=smols(game);
if(!all.length)return;
if(game.strangerT==null)game.strangerT=360;
game.creatures.forEach(function(c){
var s=c.stranger;
if(!c.alive||!s)return;
if(s.state!=="guest"&&c.chem&&c.chem.hunger>0.8&&!c._pov)c.chem.hunger=0.8;
if(s.state==="waiting"&&game.time-s.t>WAIT)ST.decide(game,c,all.length<8||ST.breedablePairs(game)===0||ST.shortOfCouples(game,all.length),true);
if((s.state==="leaving"&&(game.time-s.t>70||SB.dist(c.x,c.z,s.x0,s.z0)<3))||(s.state==="passing"&&(game.time-s.t>160||SB.dist(c.x,c.z,s.x1,s.z1)<3))){c.alive=false;c.gone=true;c.dying=false;}
if(s.state==="guest"&&game.time>s.until)ST.guestOut(game,c);
});
var ar=A(game);
if(ar.fake&&game.time>ar.fake.t)ST.unmask(game);
if(!game.showcase&&!(game.settings&&game.settings.noStrangers)&&(game.time>=SB.DAY_LENGTH||game.ngPlus)){
if(ar.passT==null)ar.passT=420+dice(game)()*300;
ar.passT-=dt;
if(ar.passT<=0){ar.passT=540+dice(game)()*600;ST.pass(game);}
ar.condT=(ar.condT==null?20:ar.condT)-dt;
if(ar.condT<=0){ar.condT=20;if(!ST.pending(game)&&all.length+1<(SB.Game.JOIN_CAP||SB.Game.POP_CAP)&&!(ar.condAt>game.time))ST.checkConds(game);}
}
if(!(game._pairsT>game.time-5)){game._pairsT=game.time;game._pairs=chances(game);}
game.strangerT-=dt*(game._pairs<((game.stats.maxTier||0)>=3?3:2)&&all.length<24?4:1);
if(game.strangerT>0)return;
if(game.time<SB.DAY_LENGTH&&!game.ngPlus){game.strangerT=30;return;}
game.strangerT=nextIn(game);
if(ST.pending(game))return;
if(all.length+1>=(SB.Game.JOIN_CAP||SB.Game.POP_CAP))return;
ST.arrive(game,ST.roll(game));
};
ST.roll=function(game){
var v=dice(game)(),ar=A(game);
if(chances(game)===0)return{};
if(v<0.08&&game.time>SB.DAY_LENGTH*3&&smols(game).length>=5&&SB.wopt(game,"grumps")>0&&!ar.fake)return{kind:"fake"};
return v<0.26?{kind:"guest"}:{};
};
var LOOKS=["mud up to the knees","a leaf stuck behind one ear","humming something","a patched little bag","sea salt in the fur"];
var TELLS=["the humming has a growl under it","the shadow has horns","smells of cave","the smile never moves"];
ST.TELLS=TELLS;
ST.arrive=function(game,opts){
opts=opts||{};
var all=smols(game),r=game.rng;
var home=SB.Society?SB.Society.home(game,0):game.world.T.spawn;
var from=spot(game,home,30),wait=spot(game,home,7);
if(!from||!wait)return null;
var top=all.reduce(function(m,c){return Math.max(m,c.tier);},0);
var tier=opts.tier!=null?opts.tier:Math.max(0,Math.min(top<4?top+1:4,top+(r()<0.05?1:r()<0.5?0:-1)));
var f=all.filter(function(c){return c.sex==="f";}).length,m=all.length-f;
var sex=opts.sex||(f<m?(r()<0.75?"f":"m"):m<f?(r()<0.75?"m":"f"):(r()<0.5?"f":"m"));
var c=SB.Game.spawnSmol(game,{genome:SB.Genome.forTier(r,tier),x:from.x,z:from.z,age:SB.STAGES[3].from+30+r()*120,sex:sex,tribe:0});
c.stranger={state:"waiting",t:game.time,x0:from.x,z0:from.z,wx:wait.x,wz:wait.z};
var dd=dice(game),fake=opts.kind==="fake";
if(opts.kind)c.stranger.kind=opts.kind;
c.stranger.look=(fake?TELLS:LOOKS)[Math.floor(dd()*(fake?TELLS:LOOKS).length)];
if(opts.role){c.stranger.kind="special";c.stranger.role=opts.role;}
if(SB.Ideas&&c.tier>=2&&!fake){
var can=SB.Ideas.LIST.filter(function(d){return!d.pov&&SB.Ideas.canHold(c,d.id)&&d.tier<=c.tier&&!SB.Game.cultureKnows(game,d.id);});
if(can.length&&r()<0.6){var d=r.pick(can);c.ideas[d.id]=1;c.stranger.brings=d.id;}
}
c.stranger.trait=r.pick(["shy","brave","chatty","hungry","tired","cheerful","grumpy","curious"]);
if(c.stranger.trait==="grumpy")c.chem.anger=0.35;
if(c.stranger.trait==="hungry")c.chem.hunger=0.7;
if(fake){c.stranger.trait="very friendly";c.chem.anger=0.3;}
SB.bus.emit("stranger",{c:c});
return c;
};
ST.decide=function(game,c,welcome,auto){
var s=c.stranger;
if(!s||s.state!=="waiting")return;
if(s.imported&&auto&&!welcome)return;
if(welcome&&s.kind==="guest"&&!s.asked){
s.state="guest";s.t=game.time;s.until=game.time+ST.GUEST_DAYS*SB.DAY_LENGTH;
note(game,"🛏 "+c.name+" is your guest for "+ST.GUEST_DAYS+" days");
SB.bus.emit("guestIn",{c:c,auto:!!auto});
return;
}
if(welcome){
if(s.kind==="fake")A(game).fake={id:c.id,t:game.time+45+dice(game)()*60};
if(s.role)ST.gift(game,c,s.role);
c.stranger=null;
c.tribe=0;
SB.Chem.apply(c.chem,{lonely:-0.5,fear:-0.3});
c.anim.emote="happy";c.anim.emoteT=2;
SB.Game.unlock(game,"stranger");
SB.Game.note(game,c.name+(auto?" wandered in and stayed. welcome!":" joined your smols! 🧳"));
SB.bus.emit("strangerJoined",{c:c,auto:!!auto});
}else{
s.state="leaving";s.t=game.time;
c.action=null;if(c.plan)SB.Creature.dropPlan(c,game);
SB.bus.emit("strangerLeft",{c:c,auto:!!auto});
if(s.kind==="fake"&&!auto){
s.caught=1;SB.Game.addSparks(game,3,c);
note(game,"🎭 good eye! "+c.name+" tears off a mask as it goes: a grump in a smol suit. +3 ✨");
SB.bus.emit("fakeCaught",{c:c});
}
}
};
ST.GUEST_DAYS=3;
ST.guestOut=function(game,c){
var s=c.stranger;
if(!s.asked&&dice(game)()<0.4&&SB.Game.colonyHunger(game)<0.55){
s.asked=1;s.state="waiting";s.t=game.time;
note(game,"🛏 "+c.name+" liked it here, and asks to stay for good");
SB.bus.emit("stranger",{c:c});
return;
}
SB.Game.addSparks(game,3,c);
note(game,"🛏 "+c.name+" thanks you for the stay and heads off. +3 ✨");
s.state="leaving";s.t=game.time;
SB.bus.emit("guestLeft",{c:c});
};
ST.unmask=function(game){
var ar=A(game),f=ar.fake,c=f&&SB.Game.byId(game,f.id);
if(c&&c.alive&&c._pov){f.t=game.time+30;return null;}
ar.fake=null;
if(!c||!c.alive)return null;
var g=SB.Game.spawnGrump(game,c.x,c.z),fm=game.family[c.id];
g.goingHome=true;
c.alive=false;c.gone=true;c.dying=false;
if(fm){fm.died=game.time;fm.cause="was a grump in a smol suit";}
ar.fakes=(ar.fakes||0)+1;
note(game,"🎭 "+c.name+" pulls off a mask: a grump in a smol suit! it bolts for the trees");
SB.bus.emit("unmasked",{c:c,g:g});
return g;
};
ST.CAMEOS=[["Judge Honk","goose court","order! order in the pond"],["Fishbert","elevator full of fish","going up?"],["Toasty","microwave panic","ding!"],["Stacks","sandwich tower","one more slice"],["Clicky","prove you're human","i am not a robot"],["Thinice","thin ice","don't look down"]];
ST.pass=function(game,opts){
opts=opts||{};
var r=dice(game),home=homeOf(game),from=null,to=null;
for(var i=0;i<8&&!(from&&to&&SB.dist(from.x,from.z,to.x,to.z)>24);i++){from=spot(game,home,30,r);to=spot(game,home,30,r);}
if(!from||!to)return null;
var cam=opts.cameo!=null?ST.CAMEOS[opts.cameo]:r()<0.25?ST.CAMEOS[Math.floor(r()*ST.CAMEOS.length)]:null;
var top=smols(game).reduce(function(m,o){return Math.max(m,o.tier);},0);
var c=SB.Game.spawnSmol(game,{genome:SB.Genome.forTier(r,Math.min(4,top)),name:cam?cam[0]:SB.makeName(r,game,{}),x:from.x,z:from.z,age:SB.STAGES[3].from+60,sex:r()<0.5?"f":"m",tribe:0});
c.stranger={state:"passing",kind:"passer",t:game.time,x0:from.x,z0:from.z,x1:to.x,z1:to.z,wx:to.x,wz:to.z,trait:cam?"on the way home to "+cam[1]:"just passing through"};
if(cam)c.stranger.cameo=cam[1];
c.stranger.line=cam?cam[2]:"safe roads!";
SB.bus.emit("passer",{c:c});
return c;
};
ST.wave=function(game,c,o){
var s=o&&o.stranger;
if(!s||(s.state!=="passing"&&s.state!=="guest"))return{ok:false,msg:""};
if(s.waved)return{ok:false,msg:o.name+" waves back again"};
s.waved=1;SB.Game.addSparks(game,1,o);
if(o.anim){o.anim.emote="happy";o.anim.emoteT=2;}
return{ok:true,msg:"👋 "+o.name+": \""+(s.line||"hello!")+"\" +1 ✨"};
};
function built(game,kind){return game.world.structures.some(function(s){return s.kind===kind&&s.done;});}
ST.jobsFilled=function(game){
var J=SB.Civ&&SB.Civ.JOBS,sm=smols(game);
return!!J&&Object.keys(J).every(function(j){return sm.some(function(c){return c.job===j;});});
};
ST.CONDS=[
{id:"cook",name:"a cook",icon:"🍲",why:"saw your campfire",when:function(g){return built(g,"campfire");},gift:["berry","berry","apple"]},
{id:"mason",name:"a mason",icon:"🧱",why:"saw your first hut",when:function(g){return built(g,"hut");},gift:["stone","stone","stone"]},
{id:"healer",name:"a healer",icon:"🌿",why:"heard someone was ill",when:function(g){return smols(g).some(function(c){return c.chem.sick>0.5;});},gift:["herb","herb"]},
{id:"piper",name:"a piper",icon:"🎶",why:"saw your story pole",when:function(g){return built(g,"totem");},cheer:1},
{id:"crown",name:"the crowned one",icon:"👑",why:"heard every job in town is filled",when:function(g){return ST.jobsFilled(g);},cheer:1,sparks:15,crown:1}
];
ST.cond=function(id){for(var i=0;i<ST.CONDS.length;i++)if(ST.CONDS[i].id===id)return ST.CONDS[i];return null;};
ST.checkConds=function(game){
var ar=A(game);
for(var i=0;i<ST.CONDS.length;i++){
var d=ST.CONDS[i];
if(ar.came[d.id]||!d.when(game))continue;
var c=ST.arrive(game,{role:d.id});
if(c){ar.came[d.id]=1;ar.condAt=game.time+SB.DAY_LENGTH*0.5;}
return c;
}
return null;
};
ST.gift=function(game,c,role){
var d=ST.cond(role);
if(!d)return;
c.came=role;
(d.gift||[]).forEach(function(k,i){if(SB.KINDS[k])SB.World.add(game.world,game,k,c.x+0.5+i*0.35,c.z+0.4,{});});
if(d.cheer)smols(game).forEach(function(o){SB.Chem.apply(o.chem,{lonely:-0.3,bored:-0.3});});
if(d.sparks)SB.Game.addSparks(game,d.sparks,c);
if(d.crown)c.crown=1;
note(game,d.icon+" "+c.name+" came as "+d.name+(d.gift?", with a gift":d.sparks?". +"+d.sparks+" ✨":", and the village cheers up"));
};
ST.gate=function(game){var ss=game.world.structures;for(var i=0;i<ss.length;i++)if(ss[i].kind==="skygate"&&ss[i].done)return ss[i];return null;};
ST.land=function(game,d,o){
o=o||{};
var r=dice(game),home=homeOf(game),g=ST.gate(game),from=null,wait=null,W=SB.World,w=game.world;
if(g){from={x:g.x+1.3,z:g.z+0.5};wait={x:g.x+1.5+(o.i||0)*0.7,z:g.z+1.5};if(!W.walkable(w,from.x,from.z,false)||!W.walkable(w,wait.x,wait.z,false))from=wait=null;}
if(!from){from=spot(game,home,30,r);wait=spot(game,home,7,r);}
if(!from||!wait)from=wait={x:home.x+2,z:home.z+2};
var c=SB.Game.spawnSmol(game,{genome:d.genome,name:d.name,gen:d.gen,vocab:d.vocab,ideas:d.ideas,age:d.age,sex:d.sex,x:from.x,z:from.z,brain:d.brain?SB.Brain.deserialize(d.brain,d.genome,game.rng):null,how:"import"});
c.stranger={state:"waiting",kind:"import",imported:true,gate:!!g,t:game.time,x0:from.x,z0:from.z,wx:wait.x,wz:wait.z,trait:"from "+(o.from||"somewhere else"),look:LOOKS[Math.floor(r()*LOOKS.length)]};
if(!o.quiet)SB.bus.emit("stranger",{c:c});
return c;
};
ST.merge=function(game,data){
var ar=A(game),key=data&&String(data.wid||data.seed),nm=(data&&data.wname)||"another island";
if(!data||!Array.isArray(data.creatures))return{ok:false,msg:"that island couldn't be read"};
if(data.seed===game.seed&&(data.wid||null)===(game.wid||null))return{ok:false,msg:"that's this island"};
if(ar.merged[key])return{ok:false,msg:"the smols of "+nm+" already came over"};
var room=(SB.Game.JOIN_CAP||SB.Game.POP_CAP||36)-smols(game).length-1,fam=data.family||{},map={},band=[];
var cs=data.creatures.filter(function(p){return p&&p.alive!==false&&!p.stranger&&p.genome;}).slice(0,Math.max(0,Math.min(6,room)));
if(!cs.length)return{ok:false,msg:room<1?"there's no room in the village":"nobody lives there"};
function kin(id,depth){
if(map[id]!=null)return map[id];
var f=fam[id];
if(!f||depth<=0)return null;
var nid=SB.Game.newId(game);
map[id]=nid;
game.family[nid]={id:nid,name:f.name,gen:f.gen||1,parents:(f.parents||[]).map(function(p){return kin(p,depth-1);}).filter(function(v){return v!=null;}),born:0,died:0,cause:"stayed on "+nm,look:f.look,tier:f.tier||0,clade:0,kids:[],sex:f.sex,gx:f.gx||""};
return nid;
}
cs.forEach(function(p,i){
var ge=typeof p.genome==="string"?SB.Genome.decode(p.genome):p.genome;
var c=ST.land(game,{genome:ge,name:p.name,gen:p.gen,vocab:p.vocab,ideas:p.ideas,age:p.age,sex:p.sex,brain:p.brain},{i:i,from:nm,quiet:i>0});
map[p.id]=c.id;band.push([c,p]);
});
band.forEach(function(b){
var ps=(b[1].parents||[]).map(function(id){return kin(id,2);}).filter(function(v){return v!=null;}),f=game.family[b[0].id];
b[0].parents=ps;
if(f)f.parents=ps.slice();
ps.forEach(function(pid){var pf=game.family[pid];if(pf&&pf.kids&&pf.kids.indexOf(b[0].id)<0)pf.kids.push(b[0].id);});
});
ar.merged[key]=1;
note(game,"🌀 "+band.length+" smol"+(band.length===1?"":"s")+" from "+nm+" at the edge, asking to come in");
SB.bus.emit("merged",{n:band.length,from:nm});
return{ok:true,n:band.length,band:band.map(function(b){return b[0];}),msg:"🌀 "+band.length+" from "+nm+" are waiting at the edge"};
};
ST.think=function(c,game){
var s=c.stranger;
if(!s)return false;
if(s.state==="passing")return{x:s.x1,z:s.z1};
if(s.state==="guest")return SB.dist(c.x,c.z,s.wx,s.wz)>16?{x:s.wx,z:s.wz}:false;
var tx=s.state==="leaving"?s.x0:s.wx,tz=s.state==="leaving"?s.z0:s.wz;
if(SB.dist(c.x,c.z,tx,tz)>1.5)return{x:tx,z:tz};
return{wait:true};
};
})();
