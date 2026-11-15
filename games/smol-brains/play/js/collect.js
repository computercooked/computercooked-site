/* smol brains: collect.js (built from src/collect.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB;
var CX=(SB.Collect={});
var RAR=(CX.RARITY=[
{id:"common",name:"common",col:"#c9c6d6"},
{id:"uncommon",name:"uncommon",col:"#7fe07f"},
{id:"rare",name:"rare",col:"#4fa8ff"},
{id:"epic",name:"epic",col:"#b874ff"},
{id:"legendary",name:"legendary",col:"#ffb52e"},
{id:"mythic",name:"mythic",col:"#ff5fae"}
]);
var SLOTS=(CX.SLOTS=[
{id:"pat",name:"pattern",list:[
["classic","classic",6400,0],["freckles","freckles",1300,1],["gradient","sunset fade",1100,1],
["calico","calico",500,2],["tiger","tiger stripes",450,2],["gold","gold leaf",180,3],
["holo","holo",50,4],["galaxy","galaxy",20,5]]},
{id:"eye",name:"eyes",list:[
["normal","bright eyes",7400,0],["sleepy","sleepy eyes",1100,1],["hetero","odd eyes",800,1],
["star","star eyes",450,2],["heart","heart eyes",200,3],["cosmic","cosmic eyes",20,5]]},
{id:"acc",name:"accessory",list:[
["none","nothing",7100,0],["bud","flower bud",1200,1],["scarf","leaf scarf",900,1],
["crystal","crystal spikes",450,2],["crown","crown horns",250,3],["halo","tiny halo",80,4],["moon","pocket moon",20,5]]},
{id:"pal",name:"palette",list:[
["natural","natural",9310,0],["pastel","pastel",380,2],["midnight","midnight",288,2],
["shiny","shiny",19.5,4],["prism","prismatic",2.5,5]]},
{id:"size",name:"size",list:[
["regular","regular",8000,0],["tiny","tiny",900,1],["chonky","chonky",900,1],["teacup","teacup",150,3],["titan","titan",50,4]]},
{id:"voice",name:"voice",list:[
["plain","chirpy",7000,0],["squeak","squeaky",1300,1],["deep","deep",1200,1],["song","sing-song",400,2],["chime","bell voice",100,3]]}
]);
var BY={},TOTAL={};
SLOTS.forEach(function(s){
var t=0;
s.list.forEach(function(e){t+=e[2];});
TOTAL[s.id]=t;BY[s.id]=s;
s.list.forEach(function(e,i){e.i=i;e.p=e[2]/t;});
});
CX.KEYS=SLOTS.map(function(s){return s.id;});
var GRADES=(CX.GRADES=[[0.07,"pristine fluff"],[0.15,"fresh fluff"],[0.38,"soft fluff"],[0.45,"tousled"],[1.01,"scruffy"]]);
CX.grade=function(f){for(var i=0;i<GRADES.length;i++)if(f<GRADES[i][0])return GRADES[i][1];return"scruffy";};
function floatTier(f){return f<0.01?4:f<0.03?3:f<0.07?2:0;}
CX.entry=function(slot,i){var s=BY[slot];return s&&s.list[i]?s.list[i]:s.list[0];};
CX.odds=function(slot,i){var e=CX.entry(slot,i);return Math.max(1,Math.round(1/e.p));};
CX.oddsText=function(slot,i){var e=CX.entry(slot,i);return e.p>=0.85?"most smols":e.p>0.25?Math.round(e.p*100)+"% of smols":"1 in "+CX.odds(slot,i);};
function pick(rng,slot,luck){
var s=BY[slot],list=s.list,t=0,i,w=[];
for(i=0;i<list.length;i++){var x=list[i][2]*(list[i][3]>0&&luck?Math.pow(luck,Math.min(2,list[i][3])):1);w.push(x);t+=x;}
var r=rng()*t;
for(i=0;i<list.length;i++){r-=w[i];if(r<0)return i;}
return 0;
}
CX.roll=function(rng,luck){
var cx={v:1};
SLOTS.forEach(function(s){cx[s.id]=pick(rng,s.id,luck&&luck[s.id]);});
cx.f=rollFloat(rng);
return cx;
};
function rollFloat(rng){return Math.round(Math.sqrt(rng())*10000)/10000;}
function geneHash(g,salt){
var h=2166136261^(salt||0);
var G=SB.Genome.GENES;
for(var i=0;i<G.length;i++){h^=Math.round(SB.clamp01(g.genes[G[i]]||0)*255);h=Math.imul(h,16777619);}
h^=(g.gen||1);h=Math.imul(h,16777619);
return h>>>0;
}
CX.geneHash=geneHash;
CX.ensure=function(g){
if(!g||g.species==="grump")return null;
if(g.cx&&valid(g.cx))return g.cx;
g.cx=CX.roll(SB.rng(geneHash(g,0x51ab)));
return g.cx;
};
function valid(cx){
if(!cx||typeof cx!=="object")return false;
for(var i=0;i<SLOTS.length;i++){var v=cx[SLOTS[i].id];if(!(v>=0&&v<SLOTS[i].list.length&&(v|0)===v))return false;}
return typeof cx.f==="number"&&cx.f>=0&&cx.f<=1;
}
CX.valid=valid;
CX.MUTATE=0.004;
CX.inherit=function(child,a,b,rng){
var ca=CX.ensure(a.genome||a),cb=CX.ensure(b.genome||b);
if(!ca||!cb||child.species==="grump")return CX.ensure(child);
rng=rng||SB.rng(geneHash(child,((ca.f*1e4)|0)^(((cb.f*1e4)|0)<<14)));
var cx={v:1};
SLOTS.forEach(function(s){
var k=s.id,ra=s.list[ca[k]][3],rb=s.list[cb[k]][3];
var luck=1+(ra>=2?0.5:ra?0.15:0)+(rb>=2?0.5:rb?0.15:0)+(ra>=2&&rb>=2?0.5:0);
if(ca[k]===cb[k]&&rng()<0.85)cx[k]=ca[k];
else if(rng()<0.7){
cx[k]=rng()<0.5?ca[k]:cb[k];
if(ca[k]!==cb[k]&&s.list[cx[k]][3]>=4&&rng()<0.4)cx[k]=pick(rng,k,luck);
}else cx[k]=pick(rng,k,luck);
});
var avg=(ca.f+cb.f)/2;
cx.f=rng()<0.6?Math.round(SB.clamp(avg+rng.gauss()*0.06,0,1)*10000)/10000:rollFloat(rng);
var top=Math.max(CX.info({cx:ca}).tier,CX.info({cx:cb}).tier);
if(rng()<CX.MUTATE*(top>=3?2:1)){
var slots=SLOTS.filter(function(s){return s.list.some(function(e){return e[3]===5;});});
var s=slots[(rng()*slots.length)|0],m=s.list.filter(function(e){return e[3]===5;})[0];
cx[s.id]=m.i;cx.mut=s.id;
}
child.cx=cx;
return cx;
};
var SCORE_AT=(CX.SCORE_AT=[8,11,14,17.3,21.5]);
CX.info=function(c){
var g=c.genome||c,cx=c.cx||(g&&(g.cx||CX.ensure(g)));
if(!cx)return null;
var traits=[],top=0,score=0;
SLOTS.forEach(function(s){
var e=s.list[cx[s.id]]||s.list[0];
traits.push({slot:s.id,slotName:s.name,id:e[0],name:e[1],tier:e[3],odds:CX.odds(s.id,e.i),oddsText:CX.oddsText(s.id,e.i),mut:cx.mut===s.id});
if(e[3]>top)top=e[3];
score+=-Math.log(e.p)/Math.LN2;
});
var ft=floatTier(cx.f);
score+=cx.f<0.01?8:cx.f<0.03?5:cx.f<0.07?3:0;
var tier=0;
for(var ti=0;ti<SCORE_AT.length;ti++)if(score>=SCORE_AT[ti])tier=ti+1;
tier=Math.min(5,Math.max(Math.min(tier,Math.max(top,ft)+1),top-1,ft-1));
var rarest=traits.slice().sort(function(a,b){return b.odds-a.odds;})[0];
return{tier:tier,rarity:RAR[tier],traits:traits,f:cx.f,grade:CX.grade(cx.f),score:Math.round(score*10)/10,rarest:rarest,cx:cx};
};
CX.stats=function(c){
var g=c.genome,gv=function(k){return g&&g.genes[k]!=null?g.genes[k]:0.5;};
var roll=function(v){return Math.max(1,Math.min(100,Math.round(v*100)));};
return[
["iq",c.iq||(SB.Creature&&c.brain?SB.Creature.iq(c):0),250],
["speed",roll(gv("speed")*0.7+gv("limbs")*0.3),100],
["memory",roll(gv("memory")*0.5+gv("recall")*0.5),100],
["charm",roll(gv("sociability")*0.4+gv("affection")*0.3+gv("chattiness")*0.15+(gv("cheeks")>0.5?0.15:0)),100],
["bravery",roll(gv("bravery")),100]
];
};
var MARK=0xc7;
CX.encodeInto=function(bytes,g){
if(!g||!g.cx||!valid(g.cx))return;
var cx=g.cx,f=Math.round(cx.f*10000);
bytes.push(MARK,1);
SLOTS.forEach(function(s){bytes.push(cx[s.id]&255);});
bytes.push((f>>8)&255,f&255,cx.mut?1+CX.KEYS.indexOf(cx.mut):0);
};
CX.decodeFrom=function(b,p){
if(b.length<p+5+SLOTS.length||b[p]!==MARK)return null;
p+=2;
var cx={v:1};
for(var i=0;i<SLOTS.length;i++)cx[SLOTS[i].id]=b[p++];
cx.f=Math.min(1,((b[p++]<<8)|b[p++])/10000);
var m=b[p++];
if(m&&CX.KEYS[m-1])cx.mut=CX.KEYS[m-1];
return valid(cx)?cx:null;
};
CX.checksum=function(str){
var h1=0x811c9dc5,h2=0x9e3779b9;
str="smolbrains·"+str;
for(var i=0;i<str.length;i++){var ch=str.charCodeAt(i);h1=Math.imul(h1^ch,16777619);h2=Math.imul(h2^ch,2246822507)^(h2>>>13);}
return((h1>>>0).toString(36)+(h2>>>0).toString(36)).slice(0,12);
};
CX.state=function(game){
var s=game.collect;
if(!s||typeof s!=="object")s=game.collect={};
if(typeof s.serial!=="number")s.serial=0;
if(!s.dex||typeof s.dex!=="object")s.dex={};
if(!Array.isArray(s.hall))s.hall=[];
if(!s.imports||typeof s.imports!=="object")s.imports={};
if(!s.tiers||typeof s.tiers!=="object")s.tiers={};
return s;
};
CX.dexTotal=function(){var n=0;SLOTS.forEach(function(s){n+=s.list.length;});return n+GRADES.length;};
CX.dexCount=function(game){return Object.keys(CX.state(game).dex).length;};
CX.register=function(game,c,how){
if(!c||c.species!=="smol"||!c.genome)return null;
var s=CX.state(game),info=CX.info(c);
if(!info)return null;
if(!c.serial)c.serial=++s.serial;
if(!c.oid)c.oid=(game.seed>>>0).toString(36)+"."+c.id;
var fresh=[];
info.traits.forEach(function(t){var k=t.slot+":"+t.id;if(!s.dex[k]){s.dex[k]=Math.round(game.time);fresh.push(t);}});
var gk="grade:"+info.grade;
if(!s.dex[gk])s.dex[gk]=Math.round(game.time);
s.tiers[info.rarity.id]=(s.tiers[info.rarity.id]||0)+1;
CX.fame(game,c,info);
if(info.tier>=4&&SB.Social&&SB.Social.chronicle){
SB.Social.chronicle(game,"✨",c.name+(how==="import"?" arrived from another world: ":how==="hatch"?" hatched ":" joined the island: ")+(how==="hatch"?"a ":"")+info.rarity.name+" smol ("+info.rarest.name+", "+info.rarest.oddsText+")");
}
return{info:info,fresh:fresh};
};
CX.fame=function(game,c,info){
var s=CX.state(game);
info=info||CX.info(c);
var row=s.hall.filter(function(r){return r.id===c.id;})[0];
if(!row){
if(info.tier<1)return;
row={id:c.id,t:Math.round(game.time)};
s.hall.push(row);
}
row.name=c.name;row.tier=info.tier;row.score=info.score;row.serial=c.serial||0;row.gen=c.gen||1;row.g=SB.Genome.encode(c.genome);
row.iq=c.iq||row.iq||0;
s.hall.sort(function(a,b){return(b.tier-a.tier)||(b.score-a.score);});
if(s.hall.length>12)s.hall.length=12;
};
CX.importKey=function(genomeStr,oid){return oid?"o:"+String(oid).slice(0,40):"g:"+CX.checksum(String(genomeStr));};
CX.seenImport=function(game,key,oid){
var s=CX.state(game);
if(s.imports[key])return true;
if(oid&&SB.Game.smols(game).some(function(c){return c.oid===oid;}))return true;
return false;
};
CX.markImport=function(game,key){CX.state(game).imports[key]=Math.round(game.time)||1;};
CX.backfill=function(game){
var s=CX.state(game);
var cs=game.creatures.filter(function(c){return c.species==="smol"&&c.alive;}).sort(function(a,b){return a.id-b.id;});
cs.forEach(function(c){if(!c.serial)CX.register(game,c,"old");});
var max=0;
cs.forEach(function(c){if(c.serial>max)max=c.serial;});
if(s.serial<max)s.serial=max;
};
})();
