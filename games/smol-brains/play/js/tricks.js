/* smol brains: tricks.js (built from src/tricks.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB;
var T=(SB.Tricks={});
var IN=SB.IN;
T.LIST=[
{id:"eat",icon:"🍎",name:"eat when hungry",drive:"hunger",noun:"food",verb:"eat",practice:{drop:"apple"},
how:"when it's hungry, put food beside it and 🪶 tickle it while it eats."},
{id:"shroom",icon:"🍄",name:"leave red shrooms alone",drive:"hunger",noun:"mushroom",avoid:"eat",practice:{drop:"shroom"},
how:"drop a shroom beside it. 👆 tap it the moment it nibbles. careful: tap too hard and it may go off food altogether."},
{id:"come",icon:"👣",name:"come when called",noun:"hand",heard:"approach",verb:"approach",practice:{say:"come"},
how:"say 💬 “come” to it, then 🪶 tickle it as it walks over."},
{id:"play",icon:"⚽",name:"play when bored",drive:"bored",noun:"ball",verb:"play",practice:{drop:"ball"},
how:"give a bored smol a ball and 🪶 tickle it while it plays."},
{id:"herb",icon:"🌿",name:"eat healroot when sick",drive:"sick",noun:"medicine",verb:"eat",practice:{drop:"herb"},
how:"when it's poorly, put healroot beside it and 🪶 tickle it while it eats."},
{id:"hug",icon:"🤗",name:"hug a friend when lonely",drive:"lonely",noun:"smol",verb:"cuddle",
how:"when it's lonely and near another smol, 🪶 tickle it while they cuddle."},
{id:"nohit",icon:"✋",name:"never hit other smols",drive:"anger",noun:"smol",avoid:"hit",
how:"👆 tap it straight away whenever it shoves or hits someone."},
{id:"run",icon:"💨",name:"run from grumps",drive:"fear",noun:"grump",verb:"flee",
how:"at night, 🪶 tickle it when it runs away from a grump."}
];
T.BY={};
T.LIST.forEach(function(d){T.BY[d.id]=d;});
T.LEARN=0.8;
T.FORGET=0.45;
T.PAY=2;
var TEMP=0.25;
var FIRST=1,LAST=11;
var xs={};
function input(b,d){
var x=xs[b.nIn]||(xs[b.nIn]=new Float32Array(b.nIn)),i;
for(i=0;i<b.nIn;i++)x[i]=0;
for(i=0;i<SB.N_DRIVES;i++)x[IN.DRIVE0+i]=0.1;
if(d.drive)x[IN.DRIVE0+SB.D[d.drive]]=0.9;
x[IN.NOUN0+SB.N[d.noun]]=1;
if(d.heard)x[IN.HEARD0+SB.V[d.heard]]=1;
x[IN.NEAR]=1;
x[IN.BIAS]=1;
return x;
}
var qs=new Float32Array(SB.N_VERBS);
T.chance=function(b,d){
if(!b)return 0;
var x=input(b,d),mx=-1e9,a,s=0;
for(a=FIRST;a<=LAST;a++){qs[a]=SB.Brain.qOf(b,x,a);if(qs[a]>mx)mx=qs[a];}
for(a=FIRST;a<=LAST;a++){qs[a]=Math.exp((qs[a]-mx)/TEMP);s+=qs[a];}
return qs[SB.V[d.verb||d.avoid]]/s;
};
T.meter=function(c,d){
if(!c||!c.brain)return 0;
var p=T.chance(c.brain,d);
if(d.verb)return SB.clamp01(p);
return SB.clamp01(1-p/0.12);
};
T.STRETCH=0.15;
T.goal=function(r){
var b=r&&r.b!=null?r.b:0;
return{b:b,g:b>=T.LEARN-T.STRETCH?b+(1-b)*0.5:Math.max(T.LEARN,b+T.STRETCH)};
};
T.progress=function(c,d){
var r=c&&c.tricks&&c.tricks[d.id],m=T.meter(c,d),q=T.goal(r);
return{p:SB.clamp01((m-q.b)/Math.max(0.05,q.g-q.b)),m:m,g:q.g,b:q.b};
};
T.REPS=3;
T.shown=function(c,d){
if(T.known(c,d.id))return 1;
var r=c&&c.tricks&&c.tricks[d.id];
return Math.min(T.progress(c,d).p,((r&&r.n)||0)/T.REPS);
};
T.known=function(c,id){return!!(c&&c.tricks&&c.tricks[id]&&c.tricks[id].on);};
T.count=function(c){var n=0;if(c&&c.tricks)for(var k in c.tricks)if(c.tricks[k].on)n++;return n;};
T.colony=function(game){
var kinds={},total=0;
SB.Game.smols(game).forEach(function(c){if(c.tricks)for(var k in c.tricks)if(c.tricks[k].on&&c.tricks[k].by){kinds[k]=1;total++;}});
return{kinds:Object.keys(kinds).length,total:total};
};
T.best=function(game){var m=0;SB.Game.smols(game).forEach(function(c){m=Math.max(m,T.count(c));});return m;};
T.check=function(c,game,quiet){
if(!c||!c.alive||c.species!=="smol"||!c.brain)return;
var tr=c.tricks||(c.tricks={});
for(var i=0;i<T.LIST.length;i++){
var d=T.LIST[i],m=T.meter(c,d),r=tr[d.id];
if(!r){r=tr[d.id]={on:0,b:Math.round(m*1000)/1000};if(quiet)continue;}
if(r.b==null)r.b=r.on?Math.max(0,T.LEARN-T.STRETCH):Math.round(m*1000)/1000;
var q=T.goal(r);
if(m>=q.g&&!r.on&&(quiet||(r.n||0)>=T.REPS)){
var first=!r.t;
r.on=1;r.t=Math.round(game.time);r.by=quiet?(r.by||0):1;
if(first&&!quiet){
SB.Game.addSparks(game,T.PAY,c);
game.stats.tricks=(game.stats.tricks||0)+1;
if(SB.Social&&SB.Social.log)SB.Social.log(game,c,d.icon,"the sky taught me to "+d.name);
}
if(!quiet)SB.bus.emit("trickLearned",{c:c,trick:d,first:first});
}else if(r.on&&m<Math.min(T.FORGET,q.g-0.2)){
r.on=0;
if(!quiet)SB.bus.emit("trickForgot",{c:c,trick:d});
}
}
};
T.seed=function(c,game){T.check(c,game,true);};
T.practice=function(game,c,id){
var d=T.BY[id];
if(!d||!d.practice||!c||!c.alive)return false;
var p=d.practice;
if(p.drop){
var a=(c.facing||0)+(game.rng()-0.5)*0.8,x=c.x+Math.sin(a)*0.9,z=c.z+Math.cos(a)*0.9;
var it=SB.World.walkable(game.world,x,z)?SB.World.add(game.world,game,p.drop,x,z):SB.World.add(game.world,game,p.drop,c.x+0.5,c.z);
c.lure={id:it.id,t:game.time+20};var lureId=it.id;
c.thinkT=Math.min(c.thinkT||0,0.3);
if(c.action&&!c.plan&&(c.action.verb===SB.V.idle||c.action.verb===SB.V.wander))c.action=null;
}else if(p.say)SB.Creature.hear(c,p.say,game,{call:true});
game.stats.practices=(game.stats.practices||0)+1;
c.trickSession={id:id,until:game.time+30,from:T.shown(c,d),t0:game.time,lure:typeof lureId==="number"?lureId:null};
return true;
};
T.session=function(c,game){
var s=c&&c.trickSession;
if(!s)return null;
if(game.time>s.until||!T.BY[s.id]){c.trickSession=null;return null;}
return s;
};
T.GRACE=2.5;
T.doing=function(c,game,d){
var v=SB.V[d.verb||d.avoid],a=c.action;
if(a&&a.verb===v&&(a.phase==="do"||v===SB.V.approach))return true;
return!!(c.lastDone&&c.lastDone.a===v&&game.time-c.lastDone.t<T.GRACE);
};
T.target=function(c,game){
var s=T.session(c,game),d=s&&T.BY[s.id];
if(!d)return null;
var v=SB.V[d.verb||d.avoid],a=c.action;
if(a&&a.verb===v)return null;
return c.lastDone&&c.lastDone.a===v&&game.time-c.lastDone.t<T.GRACE&&c.lastDone.x?c.lastDone:null;
};
T.gate=function(c,game,sign){
var s=T.session(c,game);
if(!s)return true;
var d=T.BY[s.id],want=d.avoid?-1:1;
if(sign!==want)return true;
if(T.doing(c,game,d)){
s.until=Math.max(s.until,game.time+8);
if(!c.tricks)T.seed(c,game);
var r=c.tricks&&c.tricks[d.id];
if(r&&!r.on&&game.time-(s.repT==null?-99:s.repT)>1.5){r.n=(r.n||0)+1;s.repT=game.time;}
return true;
}
SB.bus.emit("trickWait",{c:c,trick:d});
return false;
};
T._delta=(function(e){
var g=SB.Game.current,c=e&&e.c;
if(!g||!c)return;
var s=T.session(c,g);
if(!s)return;
var d=T.BY[s.id],p=T.shown(c,d);
SB.bus.emit("trickDelta",{c:c,trick:d,from:s.last!=null?s.last:s.from,to:p});
s.last=p;
});
var t=0;
T.NUDGE=8;T.NO_BITE=16;
function sessions(game){
SB.Game.smols(game).forEach(function(c){
var s=c.trickSession;
if(!s||s.t0==null)return;
var d=T.BY[s.id];
if(!d||!T.session(c,game))return;
if(T.doing(c,game,d)){s.seen=true;return;}
if(s.seen)return;
var since=game.time-s.t0;
if(since>T.NUDGE&&!s.nudged){
s.nudged=true;
if(s.lure!=null&&SB.Game.byId(game,s.lure)){c.lure={id:s.lure,t:game.time+10};c.thinkT=0;if(c.action&&!c.plan&&(c.action.verb===SB.V.idle||c.action.verb===SB.V.wander))c.action=null;}
SB.bus.emit("trickNudge",{c:c,trick:d});
}else if(since>T.NO_BITE){
c.trickSession=null;
var low=d.drive&&c.chem[d.drive]!=null&&c.chem[d.drive]<0.45;
SB.bus.emit("trickNoBite",{c:c,trick:d,why:low?"it isn't "+(d.drive==="hunger"?"hungry":d.drive)+" enough":c.asleep?"it fell asleep":"its brain picked something else this time"});
}
});
}
T.tick=function(game,dt){
sessions(game);
t-=dt;
if(t>0)return;
t=3;
SB.Game.smols(game).forEach(function(c){if(!c.tricks)T.seed(c,game);else if(!c.far)T.check(c,game);});
};
SB.bus.on("learned",function(d){
var g=SB.Game.current;if(!g||!d||!d.c)return;
var c=d.c;
if(!c.tricks)T.seed(c,g);
for(var i=0;i<T.LIST.length;i++){
var tr=T.LIST[i],r=c.tricks[tr.id];
if(c.trickSession&&c.trickSession.id===tr.id&&T.session(c,g))continue;
if(!r||r.on||d.verb!==SB.V[tr.verb||tr.avoid]||(d.noun>=0&&d.noun!==SB.N[tr.noun]))continue;
if(tr.avoid?d.delta<0:d.delta>0)r.n=(r.n||0)+1;
}
T.check(c,g);
T._delta(d);
});
SB.bus.on("hatch",function(d){var g=SB.Game.current;if(g&&d&&d.c)T.seed(d.c,g);});
})();
