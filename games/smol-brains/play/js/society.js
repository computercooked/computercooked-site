/* smol brains: society.js (built from src/society.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB;
var So=(SB.Society={});
var COLORS=["#c5ff49","#b59aff","#ff9f43","#6fd3ff","#ff7eb6","#ffd166"];
So.init=function(game){
if(!game.tribes||!game.tribes.length){
var sp=game.world.T.spawn;
game.tribes=[{id:0,name:null,home:{x:sp.x,z:sp.z},color:COLORS[0],founded:null,villages:0}];
}
game.villages=game.villages||[];
game.culture=game.culture||{};
var cu=game.culture;
cu.words=cu.words||{};cu.found=cu.found||{};cu.lost=cu.lost||{};cu.alive=cu.alive||{};cu.lostCount=cu.lostCount||0;
for(var k in cu.words)SB.Lang.addWord(cu.words[k],{type:"idea",id:k});
};
So.home=function(game,id){
var t=game.tribes&&game.tribes[id||0];
return t?t.home:game.world.T.spawn;
};
So.tribe=function(game,id){return game.tribes&&game.tribes[id||0];};
var acc=0;
So.tick=function(game,dt){
acc+=dt;
if(acc<4)return;
acc=0;
So.init(game);
var w=game.world;
if(w.night&&SB.Ideas)(w.fires||[]).forEach(function(f){
if(f.kind!=="campfire"||game.rng()>0.35)return;
var near=SB.Game.smols(game).filter(function(c){return!c.asleep&&SB.dist(c.x,c.z,f.x,f.z)<5;});
var singer=near.filter(function(c){return SB.Ideas.known(c,"song");})[0];
if(!singer||near.length<3)return;
near.forEach(function(c){SB.Chem.apply(c.chem,{bored:-0.2,lonely:-0.2,fear:-0.1});if(!c.far&&!c.convo)c.speech={text:game.rng.pick(["la la ♪","♪ ♫","laaa ♪","mm mm ♪"]),t:2,kind:"say"};});
SB.Game.unlock(game,"song");
SB.bus.emit("song",{c:singer,n:near.length});
});
if(SB.Ideas)game.creatures.forEach(function(y){
if(!y.alive||y.species!=="smol"||y.stage>2||y.stage<1||y.asleep)return;
var known=[];
SB.World.creaturesNear(w,game,y.x,y.z,8,function(a){
if(a===y||!a.alive||a.species!=="smol"||a.stage<3)return;
for(var id in a.ideas)if(a.ideas[id]>=1&&!SB.Ideas.known(y,id)&&SB.Ideas.canHold(y,id))known.push(id);
});
var school=w.structures.some(function(s){return s.kind==="school"&&s.done&&SB.dist(s.x,s.z,y.x,y.z)<9;});
if(known.length)SB.Ideas.learn(y,game.rng.pick(known),school?0.9:0.45,game,school?"school":"grew up with");
if(school&&SB.Words){
var words=SB.Words.BOOK.filter(function(b){return SB.Words.share(game,b.w)>=0.5&&(y.vocab[b.w]||0)<1;});
if(words.length)SB.Creature.lessonWord(y,game.rng.pick(words).w,game,0.3);
}
});
game.tribes.forEach(function(t){
if(!t.name){
var talkers=game.creatures.filter(function(c){return c.alive&&c.species==="smol"&&c.tribe===t.id&&c.tier>=3;});
if(talkers.length){
var r=SB.rng((game.seed+t.id*77)>>>0);
t.name="the "+SB.Lang.fresh(game.lang,r,2)+" tribe";
t.founded=game.time;
SB.bus.emit("tribe",{tribe:t});
SB.Game.note(game,"your smols have started calling themselves "+t.name+" 🔥");
}
}
var fires=w.structures.filter(function(s){return s.tribe===t.id&&s.done&&s.kind==="campfire";});
var anchor=fires.length?fires:w.structures.filter(function(s){return s.tribe===t.id&&s.done&&s.kind==="hut";});
if(t.pin){anchor=anchor.filter(function(s){return SB.dist(s.x,s.z,t.pin.x,t.pin.z)<24;});if(!anchor.length){t.home.x=t.pin.x;t.home.z=t.pin.z;}}
if(anchor.length){
var x=0,z=0;
anchor.forEach(function(s){x+=s.x;z+=s.z;});
t.home.x+=(x/anchor.length-t.home.x)*0.5;t.home.z+=(z/anchor.length-t.home.z)*0.5;
}
});
w.structures.forEach(function(f){
if(f.kind!=="campfire"||!f.done||f.village)return;
var huts=w.structures.filter(function(s){return s.kind==="hut"&&s.done&&SB.dist(s.x,s.z,f.x,f.z)<14;});
if(huts.length<3)return;
if(game.villages.some(function(v){return SB.dist(v.x,v.z,f.x,f.z)<20;})){f.village=true;return;}
var r=SB.rng((game.seed+game.villages.length*991)>>>0);
var name=SB.Lang.fresh(game.lang,r,2);
name=name+["ville","ton","holm","by","ham","wick",""][r.int(7)];
var v={id:game.villages.length,name:SB.Lang.cap(name),x:f.x,z:f.z,tribe:f.tribe,founded:game.time};
game.villages.push(v);
f.village=true;
SB.bus.emit("village",{village:v});
SB.Game.note(game,"a village is born: "+v.name+" 🏘");
});
census(game);
};
function census(game){
if(!SB.Ideas)return;
var cu=game.culture,cs=SB.Ideas.census(game),writing=false;
for(var id in cs.counts){
var n=cs.counts[id]+(cs.poles[id]?1:0);
if((cu.alive[id]||0)>0&&n===0){
cu.lost[id]=game.time;cu.lostCount++;
SB.bus.emit("ideaLost",{id:id});
SB.Game.note(game,"nobody remembers "+SB.Ideas.BY_ID[id].name+" "+SB.Ideas.BY_ID[id].icon+" anymore. it's lost. (story poles keep ideas safe)");
}
if(n>0&&cu.lost[id])cu.lost[id]=0;
cu.alive[id]=n;
if(id==="writing"&&n>0)writing=true;
}
cu.writing=writing;
}
function dry(game,x,z){var w=game.world;return SB.World.inBounds(w,x,z)&&SB.World.walkable(w,x,z)&&SB.World.depthAt(w,x,z)<0.1;}
So.moveNest=function(game,id,x,z){
var t=So.tribe(game,id);
if(!t||!dry(game,x,z))return false;
t.home.x=x;t.home.z=z;t.pin={x:x,z:z};t.trek=game.time+300;t.moved=(t.moved||0)+1;
SB.bus.emit("nestMoved",{tribe:t});
return true;
};
So.found=function(game,x,z,who){
So.init(game);
if(game.tribes.length>1||!dry(game,x,z))return null;
var t={id:game.tribes.length,name:null,home:{x:x,z:z},pin:{x:x,z:z},color:COLORS[game.tribes.length%COLORS.length],founded:null,villages:0,trek:game.time+300};
game.tribes.push(t);
(who||[]).forEach(function(c){c.tribe=t.id;c.hut=null;});
SB.bus.emit("tribeFounded",{tribe:t,n:(who||[]).length});
return t;
};
So.members=function(game,id){return game.creatures.filter(function(c){return c.alive&&c.species==="smol"&&!c.stranger&&(c.tribe||0)===id;});};
So.knownIdeas=function(game){
var cu=game.culture,n=0;
for(var k in cu.alive)if(cu.alive[k]>0)n++;
return n;
};
})();
