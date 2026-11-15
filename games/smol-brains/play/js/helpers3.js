/* smol brains: helpers3.js (built from src/helpers3.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB=window.SB||{};
var H=SB.Helpers3={};
var K=SB.KINDS,SK=SB.STRUCTS;
H.MAX=3;
H.FUEL={stick:0.25,plank:0.3,log:0.5,firewood:0.5,charcoal:1};
H.COST={clay:4,crystal:1,stick:2};
H.BOT_COST={metal:3,crystal:1};
H.POD_COST={plank:3,fur:1,crystal:1};
H.INC_COST={clay:2,plank:2,fur:1};
H.PARTS={
l:{s:["stumpy legs","slow, and it cracks half as fast"],l:["long legs","quick on its feet"]},
a:{s:["scoop arms","carries four things"],h:["hook arms","carries two, burns half the wood"]},
h:{b:["bowl head","works by day, near its post"],l:["lamp head","works at night too, and ranges further"]}
};
H.JOBS={haul:"hauls loose sticks, stones and the like to its post",tend:"feeds low fires, pulls weeds, fills troughs",sort:"carries loose food to the nest",rest:"stands still"};
H.WORDS={come:"comes to you from anywhere",stay:"waits where it is",home:"goes home"};
H.SWAPS=[{a:{stone:3,stick:1},k:"flint",n:2},{a:{clay:3},k:"pot",n:1},{a:{fur:3},k:"cloak",n:1},{a:{metal:2,crystal:1},k:"mote",n:1},{a:{fish:2,honey:1},k:"heartfruit",n:1}];
H.ODD=[
{id:"clay",name:"Dollop",ev:"golemMade",n:1,hue:0.07,why:"it likes the smell of fired clay"},
{id:"shiny",name:"Glint",ev:"chestOpened",n:3,hue:0.14,why:"it followed the shine of three opened chests"},
{id:"brave",name:"Bash",ev:"grumpChased",n:5,hue:0.98,why:"it watched you chase off five grumps"},
{id:"sleepy",name:"Doze",ev:"podWoke",n:1,hue:0.6,why:"it heard somebody wake up well rested"},
{id:"wise",name:"Hum",ev:"grumpStudied",n:3,hue:0.82,why:"it wants to hear what the grump said"},
{id:"fishy",name:"Bloop",ev:"fishCaught",n:5,hue:0.5,why:"it smelled five fish"}
];
var LORE=["grumps hate a light because they remember having one","it counts the stars. it always stops at four thousand","it flinches at the word “pod”","it hums the ark's sleeping song, out of tune","a grump cannot lie. it just will not answer","it keeps looking up, where the ark was"];
var GN=["Pot","Mug","Brick","Crock","Tile","Jug","Urn","Daub"],TRY=[0,0.7,-0.7,1.4,-1.4],MINE={};
function addKind(k,d,mine){if(K&&!K[k])K[k]=d;if(mine)MINE[k]=1;}
(function(){
if(!K)return;
var gd="a clay helper, fired round a thought crystal. it needs firewood, and clay when it cracks.";
["s","l"].forEach(function(l){["s","h"].forEach(function(a){["b","l"].forEach(function(h){addKind("golem_"+l+a+h,{noun:"wonder",label:"clay helper",emoji:"🏺",r:0.3,color:0xb5693c,glow:h==="l"?1:0,desc:gd},1);});});});
addKind("arkbot",{noun:"wonder",label:"ark helper",emoji:"🤖",r:0.3,color:0x9aa4ad,glow:1,desc:"one of the ark's helpers, put back together. it runs on daylight. patch it with copper."},1);
addKind("ghostlight",{noun:"wonder",label:"ghost-light",emoji:"👻",r:0.16,color:0xcfe9ff,glow:1,desc:"somebody left one thing undone. step into the light and finish it."},1);
addKind("wisp",{noun:"wonder",label:"light-mote",emoji:"✨",r:0.08,color:0xfff2a8,glow:1,desc:"a little light that lives in the wreck. offer it food and it carries a gift home for you."},1);
addKind("burrow",{noun:"wonder",label:"winter burrow",emoji:"🕳",r:0.3,color:0x7a5a3a,desc:"somebody is asleep in here until spring."},1);
addKind("weed",{noun:"material",label:"weed",emoji:"🌿",r:0.16,color:0x5f9a3a,mat:1,desc:"it crept onto the plot overnight. pull it for fiber."});
if(!SK)return;
function sk(k,d){if(!SK[k])SK[k]=d;}
sk("sleeppod",{noun:"shelter",label:"sleep pod",emoji:"🛏",r:0.7,cost:H.POD_COST,work:6,desc:"tuck a sick or old smol in. nobody ages in a pod."});
sk("incubator",{noun:"shelter",label:"incubator",emoji:"🥚",r:0.5,cost:H.INC_COST,work:4,desc:"a warm clay box. an animal's egg set here hatches the next morning."});
sk("swapper",{noun:"wonder",label:"ark swapper",emoji:"🔁",r:0.6,cost:{},work:1,desc:"an ark machine. put in a set of things and it gives back something else."});
sk("arkstone",{noun:"wonder",label:"ark stone",emoji:"🗿",r:0.5,cost:{},work:1,desc:"an odd humming stone from the ark."});
sk("brokenbot",{noun:"wonder",label:"broken ark helper",emoji:"🤖",r:0.5,cost:{},work:1,desc:"it fell with the wreck. copper and a thought crystal would mend it."});
})();
function st(game){
var q=game.quests||(game.quests={ch:0,done:{},n:{}}),s=q.helpers3;
if(!s||typeof s!=="object")s=q.helpers3={};
if(!(s.n>=1))s.n=1;
["g","sleep","lines","wk","off","cnt","odd"].forEach(function(k){if(!s[k]||typeof s[k]!=="object")s[k]={};});
return s;
}
H.state=st;
function Sv(){return SB.Surv||SB.Survival;}
function An(){return SB.Animals;}
function day(game){return Math.floor((game.time||0)/SB.DAY_LENGTH)+1;}
function label(k){return K[k]&&K[k].label?K[k].label:k;}
function hashKey(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function dice(game,key){return SB.rng((hashKey(key)^(game.seed>>>0))>>>0);}
function you(game){var P=SB.Possess;return P&&P.active&&P.c&&P.c.alive?P.c:null;}
function quiet(game){var P=SB.Possess;return!!(game.headless||(P&&P.headless));}
function snd(game,name){if(SB.Audio&&SB.Audio.play&&!quiet(game))SB.Audio.play(name);}
function emit(n,d){if(SB.bus)SB.bus.emit(n,d);}
function tell(game,msg){H.last=msg;var P=SB.Possess;if(P&&P.active&&P.say)P.say(msg);else if(SB.UI&&SB.UI.toast&&!quiet(game))SB.UI.toast(msg,"",4500);}
function no(msg){return{ok:false,msg:msg};}
function yes(msg,x){x=x||{};x.ok=true;x.msg=msg;return x;}
function pct(v){return Math.round(v*100)+"%";}
function dry(game,x,z){var W=SB.World,w=game.world;return W.inBounds(w,x,z)&&W.walkable(w,x,z,false)&&W.depthAt(w,x,z)<0.05;}
function near(a,b,r){return SB.dist(a.x,a.z,b.x,b.z)<=(r||4.5);}
function costText(cost){var out=[];for(var k in cost)out.push(cost[k]+" "+label(k));return out.join(", ");}
function lacks(c,cost){for(var k in cost)if(Sv().count(c,k,true)<cost[k])return"needs "+costText(cost);return"";}
function pay(c,cost){for(var k in cost)Sv().take(c,k,cost[k]);}
function give(game,c,k,n){var left=Sv().add(c,k,n);if(left>0)Sv().spawn(game,k,left,c.x+0.5,c.z+0.4);}
function dirty(b){if(SB.Render&&SB.Render.markDirty)SB.Render.markDirty(b.x,b.z);}
function put(game,kind,x,z,data,rot){
var w=game.world,o={id:SB.Game.newId(game),type:"item",kind:kind,noun:K[kind].noun,x:x,y:SB.World.groundY(w,x,z),z:z,vx:0,vy:0,vz:0,r:K[kind].r,rot:rot||0,heldBy:null,age:0,onGround:true,data:data||{}};
w.items.push(o);
return o;
}
function spot(game,x,z,key,d0){
var r=dice(game,"spot"+key);
for(var t=0;t<30;t++){var a=r()*6.283,d=(d0||1.8)+r()*1.6+t*0.15,px=x+Math.sin(a)*d,pz=z+Math.cos(a)*d;if(dry(game,px,pz))return{x:Math.round(px*10)/10,z:Math.round(pz*10)/10};}
return{x:x+1.5,z:z+1};
}
function plant(game,key,kind,x,z,data){
var s=st(game);
if(s.wk[key]!=null||!SK[kind])return null;
var p=spot(game,x,z,key),b={id:SB.Game.newId(game),type:"struct",kind:kind,noun:"wonder",x:p.x,z:p.z,rot:(hashKey(key)%628)/100,s:0.6,done:true,work:0,need:{},tribe:0,builders:[],data:data||{},born:game.time,name:null};
game.world.structures.push(b);dirty(b);s.wk[key]=b.id;
return b;
}
function build(game,c,kind,cost,data,msg){
if(c.tier<2)return no("you need hands to build that");
var why=lacks(c,cost),S=Sv();
if(why)return no("a "+SK[kind].label+" "+why);
for(var i=0;i<12;i++){
var a=c.facing+i*0.5236,d=2.4+(i>5?1:0),x=c.x+Math.sin(a)*d,z=c.z+Math.cos(a)*d;
if(!(S.canPlace?S.canPlace(game,kind,x,z):SB.World.siteFree(game.world,x,z,SK[kind].r)))continue;
pay(c,cost);
var b=SB.World.addStructure(game.world,game,kind,x,z,{done:true,tribe:c.tribe,rot:c.facing+Math.PI,data:data});
b.founder=c.name;b.s=0.7;snd(game,"build");
return yes(msg,{st:b});
}
return no("no room here: it needs flat, open ground");
}
function structs(game,kind){return game.world.structures.filter(function(b){return b.kind===kind&&b.done;});}
function nearest(list,c,r){var best=null,bd=r;list.forEach(function(b){var d=SB.dist(b.x,b.z,c.x,c.z);if(d<bd){bd=d;best=b;}});return best;}
function gs(game){var s=st(game),out=[];for(var id in s.g)out.push(s.g[id]);return out;}
H.golems=gs;
function gKind(rec){return rec.ark?"arkbot":"golem_"+rec.l+rec.a+rec.h;}
function gBody(game,rec){
var o=rec.item!=null?SB.World.itemById(game.world,rec.item):null;
if(!o||o.gone||o.kind!==gKind(rec)){o=put(game,gKind(rec),rec.x,rec.z,{keep:1,gol:rec.id});rec.item=o.id;}
return o;
}
H.body=gBody;
H.byItem=function(game,it){return it&&it.data&&it.data.gol!=null?st(game).g[it.data.gol]||null:null;};
function gMake(game,c,o){
var s=st(game),id=s.n++;
var rec={id:id,name:GN[((hashKey("gn"+id)^(game.seed>>>0))>>>0)%GN.length],l:o.l,a:o.a,h:o.h,ark:o.ark?1:0,job:"haul",fuel:1,wear:0,x:o.x,z:o.z,px:o.x,pz:o.z,item:null,carry:[],by:c?c.name:"",day:day(game)};
if(rec.ark)rec.name="Unit "+(id+6);
s.g[id]=rec;gBody(game,rec);
emit("golemMade",{c:c,rec:rec});
return rec;
}
function thinkers(game,c){return(c&&c.tier>=5)||((game.stats&&game.stats.maxTier)||0)>=5;}
H.thinkers=thinkers;
var pick={l:"s",a:"s",h:"b"};
H.fire=function(game,c,parts){
parts=parts||pick;
if(!thinkers(game,c))return no("only a thinker knows how: clay, fired round a thought crystal");
if(!(Sv().nearKiln&&Sv().nearKiln(c,game)))return no("fire it at a lit kiln");
if(gs(game).filter(function(r){return!r.ark;}).length>=H.MAX)return no("three helpers is all a village can keep in firewood");
var why=lacks(c,H.COST);if(why)return no("a clay helper "+why);
pay(c,H.COST);
var x=c.x+Math.sin(c.facing)*1.4,z=c.z+Math.cos(c.facing)*1.4;if(!dry(game,x,z)){x=c.x;z=c.z;}
var rec=gMake(game,c,{l:parts.l==="l"?"l":"s",a:parts.a==="h"?"h":"s",h:parts.h==="l"?"l":"b",x:x,z:z});
snd(game,"craft");
return yes("🏺 "+rec.name+" steps out of the kiln, still warm. give it a job, and keep it in firewood",{rec:rec});
};
H.rebuild=function(game,c,b){
if(!b||b.kind!=="brokenbot")return no("");
if(!near(c,b))return no("get closer");
var why=lacks(c,H.BOT_COST);if(why)return no("mending it "+why);
pay(c,H.BOT_COST);
SB.World.removeStructure(game.world,b);dirty(b);
var rec=gMake(game,c,{l:"l",a:"s",h:"l",ark:1,x:b.x,z:b.z});
snd(game,"achievement");
return yes("🤖 it whirs, sits up and looks at you. “"+rec.name+". awaiting chores.” it runs on daylight",{rec:rec});
};
H.parts=function(rec){return rec.ark?"ark metal":H.PARTS.l[rec.l][0]+", "+H.PARTS.a[rec.a][0]+", "+H.PARTS.h[rec.h][0];};
H.line=function(game,rec){return rec.name+": "+(rec.wear>=1?"cracked through. patch it with "+(rec.ark?"copper":"clay"):rec.fuel<=0?(rec.ark?"run down. it wakes with the sun":"gone cold. it needs firewood"):rec.job+(idle(game,rec)&&rec.job!=="rest"?" (asleep till morning)":""))+" · "+(rec.ark?"charge ":"firewood ")+pct(rec.fuel)+" · cracks "+pct(rec.wear);};
H.setJob=function(game,rec,job){
var ks=Object.keys(H.JOBS);
rec.job=H.JOBS[job]?job:ks[(ks.indexOf(rec.job)+1)%ks.length];rec._t=null;rec._pl=0;
return yes(rec.name+" "+H.JOBS[rec.job]);
};
H.setPost=function(game,c,rec){rec.px=c.x;rec.pz=c.z;rec._t=null;return yes(rec.name+" will work from here");};
H.stoke=function(game,c,rec){
var hk=Sv().heldKind(c),f=H.FUEL[hk];
if(rec.ark)return no(rec.name+" runs on daylight, not wood");
if(!f)return no("hold a stick, a log or charcoal");
if(rec.fuel>=0.95)return no(rec.name+" is full of fire");
if(!near(c,gBody(game,rec)))return no("get closer");
Sv().take(c,hk,1);rec.fuel=Math.min(1,rec.fuel+f);
emit("golemFed",{c:c,rec:rec});
return yes("🔥 "+rec.name+" glows. firewood "+pct(rec.fuel));
};
H.patch=function(game,c,rec){
var m=rec.ark?"metal":"clay";
if(rec.wear<0.05)return no("not a crack on it");
if(!Sv().has(c,m))return no("patching it needs "+label(m));
if(!near(c,gBody(game,rec)))return no("get closer");
Sv().take(c,m,1);rec.wear=Math.max(0,rec.wear-0.5);
emit("golemPatched",{c:c,rec:rec});
return yes("you smooth "+label(m)+" into the cracks. cracks "+pct(rec.wear));
};
H.smash=function(game,rec){
var o=gBody(game,rec);
rec.carry.forEach(function(x){Sv().spawn(game,x.k,x.n,o.x,o.z);});
SB.World.remove(game.world,o);delete st(game).g[rec.id];
return yes(rec.name+" goes back to clay");
};
function carryN(rec){var n=0;rec.carry.forEach(function(x){n+=x.n;});return n;}
function idle(game,rec){return rec.job==="rest"||rec.fuel<=0||rec.wear>=1||(game.world.night&&rec.h!=="l");}
function dest(game,rec){var n=game.world.T&&game.world.T.nest;return rec.job==="sort"&&n?n:{x:rec.px,z:rec.pz};}
function wants(rec,o){
var d=K[o.kind];
if(!d||o.heldBy!=null||o.gone||d.critter||o.kind==="egg"||o.data.keep||o.data.rotten||MINE[o.kind])return false;
return rec.job==="sort"?o.noun==="food":!!d.mat;
}
function wear(game,rec,v){
var was=rec.wear;
rec.wear=Math.min(1,rec.wear+v*(rec.l==="l"?1:0.5));
if(was<1&&rec.wear>=1)tell(game,"🏺 "+rec.name+" has cracked through. patch it with "+(rec.ark?"copper":"clay"));
}
function plan(game,rec,o){
var w=game.world,R=rec.h==="l"?18:10,cap=rec.a==="h"?2:4,n=carryN(rec),d=dest(game,rec),t=null,bd=1e9,A=An();
function item(ok){
w.items.forEach(function(it){
if(!ok(it)||SB.dist(it.x,it.z,rec.px,rec.pz)>R||(rec._skip&&rec._skip[it.id]>game.time))return;
var dd=SB.dist(it.x,it.z,o.x,o.z);if(dd<bd){bd=dd;t={x:it.x,z:it.z,r:0.7,it:it.id};}
});
}
if(rec.job==="tend"){
if(n){
var pen=null;
if(A&&A.pens)A.pens(game).forEach(function(b){if(!pen&&SB.dist(b.x,b.z,rec.px,rec.pz)<R+4&&((b.data&&b.data.feed)||0)<A.TROUGH)pen=b;});
return pen?{x:pen.x,z:pen.z,r:SK[pen.kind].r+0.6,pen:pen.id}:{x:d.x,z:d.z,r:1.5,drop:1};
}
w.structures.forEach(function(b){
if((b.kind!=="campfire"&&b.kind!=="kiln")||!b.done||!b.data||!b.data.lit||b.data.fuel>=0.4)return;
var dd=SB.dist(b.x,b.z,rec.px,rec.pz);if(dd<R&&dd<bd){bd=dd;t={x:b.x,z:b.z,r:SK[b.kind].r+0.7,fire:b.id};}
});
if(!t)item(function(it){return it.kind==="weed"&&!it.gone;});
return t;
}
if(n<cap){item(function(it){return wants(rec,it)&&SB.dist(it.x,it.z,d.x,d.z)>2.6;});if(t)return t;}
return n?{x:d.x,z:d.z,r:1.6,drop:1}:SB.dist(o.x,o.z,rec.px,rec.pz)>2.5?{x:rec.px,z:rec.pz,r:1.5}:null;
}
function arrive(game,rec,o,t){
var W=SB.World,w=game.world,S=Sv(),b,n;
rec._t=null;rec._pl=0.3;
if(t.it!=null){
var it=W.itemById(w,t.it);
if(!it||it.gone||it.heldBy!=null)return;
var k=it.kind==="weed"?(K.feed?"feed":"fiber"):it.kind,same=null;
n=S.pileN?S.pileN(it):1;
W.remove(w,it);
rec.carry.forEach(function(x){if(x.k===k)same=x;});
if(same)same.n+=n;else rec.carry.push({k:k,n:n});
wear(game,rec,0.008);
}else if(t.fire!=null){
b=W.structById(w,t.fire);
if(b&&b.data){b.data.fuel=Math.min(1,(b.data.fuel||0)+0.4);rec.fuel=Math.max(0,rec.fuel-0.04);wear(game,rec,0.008);emit("golemTended",{rec:rec,st:b});}
}else if(t.pen!=null){
b=W.structById(w,t.pen);
if(b&&b.data){b.data.feed=Math.min(An().TROUGH,(b.data.feed||0)+carryN(rec));rec.carry=[];emit("golemTended",{rec:rec,st:b});}
}else if(t.drop){
n=carryN(rec);
rec.carry.forEach(function(x){var a=(hashKey(x.k)%8)*0.785,p=S.spawn(game,x.k,x.n,t.x+Math.sin(a)*1.1,t.z+Math.cos(a)*1.1);if(p&&p.data)p.data.keep=1;});
rec.carry=[];
emit("golemHauled",{rec:rec,n:n});
}
}
function gStep(game,rec,dt){
var o=gBody(game,rec),W=SB.World,w=game.world;
if(o.heldBy!=null)o.heldBy=null;
if(rec.ark&&!w.night&&rec.fuel<1)rec.fuel=Math.min(1,rec.fuel+dt/240);
if(idle(game,rec)){rec._t=null;return;}
if(!rec._t&&(rec._pl=(rec._pl||0)-dt)<=0){rec._pl=1;rec._t=plan(game,rec,o);rec._age=0;}
var t=rec._t;if(!t)return;
var dx=t.x-o.x,dz=t.z-o.z,l=Math.sqrt(dx*dx+dz*dz);
if(l<=t.r){arrive(game,rec,o,t);return;}
var v=Math.min(l,(rec.l==="l"?2.6:1.6)*dt),a=Math.atan2(dx,dz),i,b,nx,nz;
for(i=0;i<5;i++){b=a+TRY[i];nx=o.x+Math.sin(b)*v;nz=o.z+Math.cos(b)*v;if(dry(game,nx,nz))break;}
if(i<5){o.x=nx;o.z=nz;o.y=W.groundY(w,nx,nz);o.rot=b;o.vx=o.vy=o.vz=0;o.onGround=true;rec.x=nx;rec.z=nz;}
var was=rec.fuel;
rec.fuel=Math.max(0,rec.fuel-dt/(rec.a==="h"||rec.ark?1200:600));
if(was>0&&rec.fuel<=0)tell(game,rec.ark?"🤖 "+rec.name+" has run down. it wakes with the sun":"🏺 "+rec.name+" has gone cold. it needs firewood");
if((rec._age=(rec._age||0)+dt)>45){if(t.it!=null)(rec._skip||(rec._skip={}))[t.it]=game.time+120;rec._t=null;}
}
function vesselOf(game){var v=st(game).v;return v?SB.Game.byId(game,v.id):null;}
H.vessel=function(game){return st(game).v||null;};
function vessel(game,back,o){
var P=SB.Possess,C=SB.Creature,s=st(game);
if(!P||!C||s.v)return null;
var r=dice(game,"v"+o.name+Math.floor(game.time)),g=SB.Genome.forTier(r,o.tier);
var c=C.create(game,{species:"smol",genome:g,name:o.name,x:o.x,z:o.z,age:SB.STAGES[3].from+30,sex:o.sex||"f",tribe:back?back.tribe:0,brain:C.newBrain(g,o.tier,r)});
c.vessel=o.kind;c.chem.hunger=0.1;
game.creatures.push(c);
if(P.active)P.leave("vessel");
if(!P.enter(game,c,{free:true})){c.alive=false;c.gone=true;return null;}
s.v={id:c.id,kind:o.kind,until:game.time+o.life,back:back?back.id:null,pet:o.pet,task:o.task||null,name:o.name};
emit("vessel",{c:c,kind:o.kind});
return c;
}
function endVessel(game,why){
var s=st(game),v=s.v,P=SB.Possess;if(!v)return;
s.v=null;
var c=SB.Game.byId(game,v.id),back=v.back!=null?SB.Game.byId(game,v.back):null,A=An();
if(c){
if(v.pet!=null&&A){var rec=A.state(game).list[v.pet];if(rec){rec.x=rec.sx=c.x;rec.z=rec.sz=c.z;rec.bond=Math.min(1,(rec.bond||0)+0.05);}}
if(P&&P.active&&P.c===c)P.leave("vessel");
c.alive=false;c.gone=true;
}
emit("vesselEnd",{kind:v.kind,why:why});
if(why!=="left"&&back&&back.alive&&P&&!P.active)P.enter(game,back,{free:true});
}
H.endVessel=endVessel;
function leaveLight(game,c){
if(!c||c.species!=="smol"||c.vessel||c.stranger||!K.ghostlight)return;
game.world.items.forEach(function(o){if(o.kind==="ghostlight")SB.World.remove(game.world,o);});
put(game,"ghostlight",c.x,c.z,{keep:1,gl:{name:c.name,tier:c.tier||0,sex:c.sex,mate:c.partner==null?null:c.partner,until:game.time+SB.DAY_LENGTH}});
}
function taskFor(game,it){
var gl=it.data.gl,best=null,bd=30,mate=gl.mate!=null?SB.Game.byId(game,gl.mate):null;
game.world.structures.forEach(function(b){if(b.done||!SK[b.kind])return;var d=SB.dist(b.x,b.z,it.x,it.z);if(d<bd){bd=d;best=b;}});
if(best)return{t:"build",id:best.id,label:"finish the "+SK[best.kind].label};
if(!mate||!mate.alive){bd=60;mate=null;game.creatures.forEach(function(o){if(!o.alive||o.species!=="smol"||o.stranger||o.vessel||o._pov)return;var d=SB.dist(o.x,o.z,it.x,it.z);if(d<bd){bd=d;mate=o;}});}
if(mate&&mate.alive)return{t:"bye",id:mate.id,label:"say goodbye to "+mate.name};
return{t:"nest",label:"see the nest once more"};
}
H.ghost=function(game,c,it){
if(!it||it.kind!=="ghostlight"||!it.data.gl)return no("");
if(!near(c,it))return no("get closer");
var gl=it.data.gl,task=taskFor(game,it);
var v=vessel(game,c,{kind:"ghost",name:gl.name,tier:Math.max(2,Math.min(5,gl.tier)),x:it.x,z:it.z,sex:gl.sex,life:90,task:task});
if(!v)return no("the light slips away");
SB.World.remove(game.world,it);
return yes("👻 you are "+gl.name+"'s light, for a little while. "+task.label);
};
H.finish=function(game){
var s=st(game),v=s.v,c=vesselOf(game);if(!v||!c||v.kind!=="ghost"||!v.task)return no("");
var t=v.task,W=SB.World;
if(t.t==="build"){
var b=W.structById(game.world,t.id);
if(b&&!b.done){if(!near(c,b,5))return no("get closer");b.need={};if(SB.Ideas&&SB.Ideas.complete)SB.Ideas.complete(b,game);else{b.done=true;b.noun=SK[b.kind].noun;}}
}else if(t.t==="bye"){
var o=SB.Game.byId(game,t.id);
if(o&&o.alive){if(!near(c,o,5))return no("get closer");if(o.chem){o.chem.lonely=Math.max(0,(o.chem.lonely||0)-0.5);o.chem.fear=Math.max(0,(o.chem.fear||0)-0.3);}if(SB.Creature.emote)SB.Creature.emote(o,"happy",2.5);}
}else{var n=game.world.T.nest;if(n&&!near(c,n,3.5))return no("the nest is over there");}
if(SB.Game.addSparks)SB.Game.addSparks(game,2,c);
var msg="👻 done. "+v.name+"'s light lets go, and drifts up to the Lantern (+2 ✨)";
emit("ghostDone",{name:v.name,task:t.t});
endVessel(game,"done");
tell(game,msg);
return yes(msg);
};
H.bePet=function(game,c,rec){
var A=An();if(!A||!rec)return no("");
if(rec.k==="grump")return no("not a grump");
if((rec.bond||0)<0.4)return no(rec.name+" doesn't trust you enough yet");
var it=A.body(game,rec),sp=A.SP[rec.k]||{};
if(!near(c,it,8))return no("get closer");
var v=vessel(game,c,{kind:"pet",name:rec.name,tier:1,x:it.x,z:it.z,life:60,pet:rec.id});
if(!v)return no("not right now");
return yes((sp.icon||"🐾")+" you are "+rec.name+" for a minute. nose about");
};
H.nose=function(game){
var s=st(game),v=s.v,c=vesselOf(game),A=An();if(!v||!c||v.kind!=="pet"||!A)return no("");
if(v.nosed)return no("nothing else smells interesting");
var rec=A.state(game).list[v.pet],f=rec&&(A.SP[rec.k]||{}).finds,r=dice(game,"nose"+v.id),k=f&&f.length?f[Math.floor(r()*f.length)][0]:"seed";
if(!K[k])k="seed";
v.nosed=1;Sv().spawn(game,k,1,c.x+0.4,c.z+0.3);
emit("petNosed",{rec:rec,kind:k});
return yes("sniff sniff… you dig up a "+label(k)+"!");
};
function frail(c){return c.stage>=4||c.chem.sick>0.3||c.chem.health<0.5||c.chem.pain>0.5;}
H.frail=frail;
H.buildPod=function(game,c){return build(game,c,"sleeppod",H.POD_COST,{},"🛏 a sleep pod. look at a sick or old smol nearby and tuck them in");};
H.freePod=function(game,c,r){return nearest(structs(game,"sleeppod").filter(function(b){return!b.data||b.data.sl==null;}),c,r||12);};
function awake(game){return game.creatures.filter(function(o){return o.alive&&o.species==="smol"&&!o.stranger&&!o.vessel;}).length;}
function tuck(game,c,pod,why){
var s=st(game),P=SB.Possess,S=SB.Save,w=game.world;
if(!S||!S.plain||!c||!c.alive||c._pov||c.vessel||(P&&P.c===c))return null;
if(awake(game)<=2)return null;
w.items.forEach(function(o){if(o.heldBy===c.id)o.heldBy=null;});
c.holding=null;c.action=null;c.plan=null;c.asleep=false;c.inBed=false;
var p=S.plain(c);
p.genome=SB.Genome.encode(c.genome);p.brain=S.plain(SB.Brain.serialize(c.brain));delete p.anim;delete p.attn;delete p.speech;delete p.heard;
var i=game.creatures.indexOf(c);if(i>=0)game.creatures.splice(i,1);
if(game.hand&&game.hand.heldId===c.id)game.hand.heldId=null;
if(game.selected===c.id&&SB.Game.select)SB.Game.select(game,null);
var e=s.sleep[c.id]={c:p,name:c.name,pod:pod?pod.id:null,x:pod?pod.x:c.x,z:pod?pod.z:c.z,why:why,day:day(game)};
if(pod){pod.data.sl=c.id;pod.name=c.name+", asleep";dirty(pod);}
else e.it=put(game,"burrow",c.x,c.z,{keep:1}).id;
emit("podSlept",{c:c,why:why});
return e;
}
H.tuck=function(game,me,c,pod){
pod=pod||H.freePod(game,c);
if(!pod)return no("no empty sleep pod near enough");
if(!frail(c))return no(c.name+" is well. a pod is for the sick and the old");
if(me&&!near(me,c,6))return no("get closer");
if(awake(game)<=2)return no("somebody has to stay awake");
return tuck(game,c,pod,"pod")?yes("🛏 "+c.name+" is asleep in the pod. nobody ages in there. wake them when you like"):no("not right now");
};
H.wake=function(game,id){
var s=st(game),e=s.sleep[id],W=SB.World;if(!e)return no("the pod is empty");
var pc=Object.assign({},e.c);if(typeof pc.genome==="string")pc.genome=SB.Genome.decode(pc.genome);
var c=SB.Creature.revive(pc,game),pod=e.pod!=null?W.structById(game.world,e.pod):null,p=spot(game,e.x,e.z,"wake"+id,1);
delete s.sleep[id];
c.x=c.px=p.x;c.z=c.pz=p.z;c.y=W.groundY(game.world,c.x,c.z);c.asleep=false;c.action=null;
c.chem.sick*=0.4;c.chem.pain*=0.4;c.chem.health=Math.min(1,c.chem.health+0.3);c.chem.hunger=Math.max(c.chem.hunger,0.5);
game.creatures.push(c);
if(pod&&pod.data){pod.data.sl=null;pod.name=null;dirty(pod);}
if(e.it!=null){var it=W.itemById(game.world,e.it);if(it)W.remove(game.world,it);}
emit("podWoke",{c:c,why:e.why,days:day(game)-e.day});
return yes("☀️ "+c.name+" wakes, rested and hungry, not a day older",{c:c});
};
H.sleepers=function(game){var s=st(game),out=[];for(var id in s.sleep)out.push({id:+id,name:s.sleep[id].name,why:s.sleep[id].why,pod:s.sleep[id].pod,day:s.sleep[id].day});return out;};
H.inLine=function(game,c){
var s=st(game),fam=game.family||{},seen=0;
function up(id,d){if(s.lines[id])return true;var f=fam[id];if(!f||d>6||++seen>80)return false;return(f.parents||[]).some(function(p){return up(p,d+1);});}
return up(c.id,0);
};
H.setLine=function(game,c){
var s=st(game);
if(s.lines[c.id]){delete s.lines[c.id];return yes(c.name+"'s line stays up all winter again");}
s.lines[c.id]=1;
return yes("❄️ "+c.name+" and every smol descended from them will sleep the winters away, in a pod or a burrow, and wake in spring no older");
};
function winter(game){
var s=st(game),cold=game.world.season===3,id;
if(!cold){for(id in s.sleep)if(s.sleep[id].why==="winter")H.wake(game,id);return;}
var any=false;for(id in s.lines)any=true;
if(!any)return;
game.creatures.slice().forEach(function(c){
if(!c.alive||c.species!=="smol"||c.stranger||c.vessel||c._pov||c.heldBy!=null||c.stage<2||!H.inLine(game,c))return;
tuck(game,c,H.freePod(game,c,30),"winter");
});
}
H.eggSex=function(game,egg){
var d=egg&&egg.data;if(!d||!d.genome||d.twins)return"";
if(d.sex!=="f"&&d.sex!=="m")d.sex=dice(game,"sex"+egg.id)()<0.5?"f":"m";
return d.sex;
};
H.eggLine=function(game,egg){
var sx=H.eggSex(game,egg),d=egg.data||{},tr="";if(!sx)return"";
try{var t=SB.Genome.traits(d.genome);if(t&&t.length)tr=typeof t[0]==="string"?t[0]:t[0].w||"";}catch(e){}
return(sx==="f"?"a girl":"a boy")+(tr?" · "+tr:"")+(d.rush>=0.3?" · tapped out early: it will hatch small and hungry":"")+(d.carry?" · still being carried":"");
};
function onHatch(game,c,egg){
var d=egg&&egg.data;if(!d||!c||d.starter)return;
if((d.sex==="f"||d.sex==="m")&&!d.twins&&c.sex!==d.sex){c.sex=d.sex;if(game.family&&game.family[c.id])game.family[c.id].sex=d.sex;}
if(d.rush>=0.3){c.early=1;c.chem.hunger=Math.max(c.chem.hunger,0.7);c.lifespan*=0.92;if(SB.Game.note)SB.Game.note(game,c.name+" was tapped out of the egg early: small, and very hungry");emit("hatchedEarly",{c:c});}
}
var carried=[];
function carryStart(game,egg){
var s=st(game),d=egg&&egg.data;if(!s.carry||!d||!d.parents||d.starter)return;
var mum=null;d.parents.forEach(function(id){var p=SB.Game.byId(game,id);if(p&&p.alive&&(p.sex==="f"||!mum))mum=p;});
if(!mum)return;
d.carry={by:mum.id,until:game.time+45};egg.heldBy=mum.id;mum.carrying=egg.id;carried.push(egg);
}
function carryTick(game){
for(var i=carried.length-1;i>=0;i--){
var egg=carried[i],d=egg.data,m=d.carry?SB.Game.byId(game,d.carry.by):null;
if(egg.gone||!d.carry){carried.splice(i,1);continue;}
if(!m||!m.alive||game.time>=d.carry.until){
delete d.carry;egg.heldBy=null;egg.onGround=true;carried.splice(i,1);
if(m){delete m.carrying;egg.x=m.x+0.5;egg.z=m.z+0.3;}
egg.y=SB.World.groundY(game.world,egg.x,egg.z);
emit("eggLaid",{obj:egg,c:m});
continue;
}
egg.heldBy=m.id;egg.x=m.x+Math.sin(m.facing||0)*0.16;egg.z=m.z+Math.cos(m.facing||0)*0.16;egg.y=m.y+0.2;
}
}
H.setCarry=function(game){var s=st(game);s.carry=s.carry?0:1;return yes(s.carry?"🥚 from now on a mother carries her egg a while before she lays it":"eggs are laid straight away again");};
function eggSp(k){var A=An();return k==="cluckegg"?"clucker":A&&A.EGGS&&A.EGGS[k]?A.EGGS[k]:null;}
H.buildInc=function(game,c){return build(game,c,"incubator",H.INC_COST,{},"🥚 an incubator. set an animal's egg in it: it hatches the next morning");};
H.setEgg=function(game,c,b){
var hk=Sv().heldKind(c);
if(!b||b.kind!=="incubator"||!eggSp(hk))return no("hold an animal's egg");
if(b.data.egg)return no("there is an egg in it already");
if(!near(c,b))return no("get closer");
Sv().take(c,hk,1);b.data.egg={k:hk,d:day(game)};dirty(b);
return yes("you set the "+label(hk)+" in the warm straw. it hatches tomorrow morning");
};
function incDawn(game){
var A=An();if(!A||!A.makeRec)return;
structs(game,"incubator").forEach(function(b){
var e=b.data&&b.data.egg;if(!e||e.d>=day(game))return;
var sp=eggSp(e.k);b.data.egg=null;dirty(b);
if(!sp||!A.SP[sp])return;
var p=spot(game,b.x,b.z,"inc"+b.id+":"+e.d,1),rec=A.makeRec(game,sp,{kid:!!(K[sp+"_kid"]),x:p.x,z:p.z,bond:0.7});
emit("incHatched",{rec:rec,st:b});
tell(game,"🐣 the egg in the incubator hatched: "+rec.name+". it thinks you are its mum");
});
}
H.teachWord=function(game,c,rec,w){
var A=An();if(!A||!rec||!H.WORDS[w])return no("");
if(rec.k==="grump"&&!rec.lit)return no("not yet");
var ws=rec.words||(rec.words={});
if(ws[w]>=1)return H.sayWord(game,c,rec,w);
if(!near(c,A.body(game,rec),6))return no("get closer");
ws[w]=Math.min(1,(ws[w]||0)+0.34+(rec.bond||0)*0.2);
if(ws[w]>=1){snd(game,"chime");emit("petWord",{c:c,rec:rec,word:w});return yes("💬 "+rec.name+" knows “"+w+"” now: it "+H.WORDS[w],{learned:true});}
return yes("“"+w+"”, you say. "+rec.name+" tilts its head ("+pct(ws[w])+"). say it again");
};
H.sayWord=function(game,c,rec,w){
var A=An(),r;if(!A||!rec||!(rec.words&&rec.words[w]>=1))return no(rec?rec.name+" doesn't know that word":"");
if(w==="come"){r=A.setMode(game,c,rec,"follow");if(r.ok){var it=A.body(game,rec);if(!near(c,it,9)){it.x=c.x+0.8;it.z=c.z+0.5;it.y=c.y;}}}
else if(w==="stay")r=A.setMode(game,c,rec,"stay");
else r=A.sendHome(game,c,rec);
return r.ok?yes("“"+w+"!” "+r.msg):r;
};
H.study=function(game,c,rec){
var A=An(),s=st(game),d=day(game);if(!A||!rec||rec.k!=="grump"||rec.lit)return no("");
if(rec.mode!=="pen")return no("pen it first");
if(!near(c,A.body(game,rec),5))return no("get closer");
if(s.stDay===d&&s.stN>=2)return no("it has turned its back. more tomorrow");
if(s.stDay!==d){s.stDay=d;s.stN=0;}
s.stN++;s.lore=(s.lore||0)+1;
var I=SB.Ideas,got="";
if(I&&I.LIST)for(var i=0;i<I.LIST.length&&!got;i++){var id=I.LIST[i].id;if(I.canHold(c,id)&&!I.known(c,id)&&(c.ideas[id]||0)>0)got=id;}
if(I&&I.LIST&&!got)for(i=0;i<I.LIST.length&&!got;i++){id=I.LIST[i].id;if(I.canHold(c,id)&&!I.known(c,id))got=id;}
if(got)I.learn(c,got,0.2,game,"study");
if(SB.Game.addSparks)SB.Game.addSparks(game,1,c);
emit("grumpStudied",{c:c,rec:rec,idea:got});
return yes("📖 you watch the grump and take notes: "+LORE[(s.lore-1)%LORE.length]+(got?". it gives you a thought about "+got:"")+" (+1 ✨)");
};
function sites(game,kind){return(game.sites||[]).filter(function(q){return q.kind===kind&&q.found&&!q.gone;});}
function places(game){
var s=st(game);
sites(game,"wreck").forEach(function(q){
if(!s.wk["w"+q.id]){var ids=[];for(var i=0;i<3;i++)ids.push(put(game,"wisp",q.x+i*0.4,q.z,{keep:1,wisp:q.id,i:i}).id);s.wk["w"+q.id]=ids;}
if(q.id%2===0)plant(game,"swap"+q.id,"swapper",q.x,q.z,{});
else plant(game,"bot"+q.id,"brokenbot",q.x,q.z,{});
});
sites(game,"ruin").forEach(function(q){plant(game,"stone"+q.id,"arkstone",q.x,q.z,{stone:["twin","shuffle","maze"][q.id%3]});});
}
var wisps=[];
function wispTick(game){
var w=game.world,t=game.time,n=w.T.nest,s=st(game);
for(var i=wisps.length-1;i>=0;i--){
var o=wisps[i],d=o.data,q=(game.sites||[])[d.wisp];if(o.gone||!q){wisps.splice(i,1);continue;}
var off=s.off[q.id],home=d.i===0&&off&&off.n>0&&n?n:q,a=t*0.5+d.i*2.1,r=1.2+d.i*0.5;
o.x=home.x+Math.sin(a)*r;o.z=home.z+Math.cos(a)*r;o.y=SB.World.groundY(w,o.x,o.z)+0.7+Math.sin(t*1.3+d.i)*0.2;o.onGround=true;o.vx=o.vz=0;
}
}
H.offer=function(game,c,it){
var hk=Sv().heldKind(c),s=st(game),q=it&&it.data?(game.sites||[])[it.data.wisp]:null;
if(!q)return no("");
if(!hk||!Sv().edible(hk))return no("hold something good to eat");
var o=s.off[q.id]||(s.off[q.id]={n:0,d:0});
if(o.n>=3)return no("they have all they can carry today");
Sv().take(c,hk,1);o.n++;o.d=day(game);
emit("wispFed",{c:c,site:q});
return yes("✨ a mote takes your "+label(hk)+" and drifts off toward the nest. look there in the morning");
};
var GIFTS=["seed","flint","fiber","herb","honey","crystal","mote"];
function wispDawn(game){
var s=st(game),n=game.world.T.nest,d=day(game);if(!n)return;
for(var id in s.off){
var o=s.off[id];if(!(o.n>0)||o.d>=d)continue;
var r=dice(game,"gift"+id+":"+d),k=GIFTS[Math.min(GIFTS.length-1,Math.floor(r()*4)+(o.n>=3?3:o.n-1))];
if(!K[k])k="seed";
var p=spot(game,n.x,n.z,"g"+id+d,1),it=put(game,k,p.x,p.z,{keep:1});
if(o.n>1)it.data.n=o.n;
o.n=0;
emit("wispGift",{kind:k,x:p.x,z:p.z});
tell(game,"✨ the wreck's motes left a gift by the nest: "+label(k));
}
}
H.swaps=function(){return H.SWAPS.filter(function(x){if(!K[x.k])return false;for(var k in x.a)if(!K[k])return false;return true;});};
H.swap=function(game,c,i){
var s=st(game),x=H.swaps()[i],b=nearest(structs(game,"swapper"),c,6),d=day(game);
if(!x)return no("");
if(!b)return no("the swapper is in a wreck");
if(s.swDay===d&&s.swN>=3)return no("the machine has gone quiet. it swaps three times a day");
var why=lacks(c,x.a);if(why)return no("it "+why);
if(s.swDay!==d){s.swDay=d;s.swN=0;}
s.swN++;pay(c,x.a);give(game,c,x.k,x.n);
emit("swapped",{c:c,kind:x.k});
return yes("🔁 clunk, whirr: "+x.n+" "+label(x.k));
};
H.touch=function(game,c,b){
if(!b||b.kind!=="arkstone")return no("");
var d=b.data,k=d.stone,s=st(game),G=SB.Genome,g,r,i;
if(!near(c,b))return no("get closer");
if(k==="maze"){
if(s.maze)return no("you are lost already. find the stone again");
if(d.day===day(game))return no("the stone is quiet until tomorrow");
r=dice(game,"maze"+b.id+":"+day(game));
for(i=0;i<60;i++){
var a=r()*6.283,dd=30+r()*30,x=b.x+Math.sin(a)*dd,z=b.z+Math.cos(a)*dd;
if(!dry(game,x,z))continue;
d.day=day(game);s.maze={x:b.x,z:b.z,until:game.time+300};
c.x=c.px=x;c.z=c.pz=z;c.y=SB.World.groundY(game.world,x,z);
emit("stoneMaze",{c:c});
return yes("🌀 the stone folds the island up. you are somewhere else. find your way back to it before the hum fades");
}
return no("the stone hums, and nothing happens");
}
if(d.used)return no("the stone has gone dull. it only ever does it once");
if(!Sv().has(c,"crystal"))return no("it hums at you. it wants a thought crystal");
if(SB.Game.smols(game).length+game.world.items.filter(function(o){return o.kind==="egg";}).length>=SB.Game.POP_CAP)return no("too many smols for that");
Sv().take(c,"crystal",1);d.used=1;
g=G.decode(G.encode(c.genome));
if(k==="twin"){
var br;try{br=SB.Brain.deserialize(SB.Save.plain(SB.Brain.serialize(c.brain)),g,dice(game,"twb"+b.id));}catch(e){br=SB.Creature.newBrain(g,c.tier,dice(game,"twb"+b.id));}
var t=SB.Game.spawnSmol(game,{genome:g,x:b.x+1.2,z:b.z+0.6,age:Math.max(c.age||0,SB.STAGES[3].from+5),gen:c.gen,parents:(c.parents||[]).slice(),tribe:c.tribe,sex:c.sex,name:c.name+" two",brain:br,vocab:c.vocab,ideas:c.ideas,how:"twin"});
t.asleep=false;t.twinOf=c.id;
emit("stoneTwin",{c:c,twin:t});
return yes("🗿 the stone hums, and there are two of you. “hello,” says "+t.name,{twin:t});
}
G.mutate(g,dice(game,"shuf"+b.id),0.5);g.gen=(c.gen||1)+1;
var egg=put(game,"egg",b.x+1,b.z+0.5,{genome:g,parents:[c.id],gen:g.gen,progress:0.2,tribe:c.tribe||0,ideas:{},vocab:{}});
if(game.stats)game.stats.eggsLaid=(game.stats.eggsLaid||0)+1;
emit("egg",{obj:egg});emit("stoneShuffle",{c:c,obj:egg});
return yes("🗿 the stone shuffles what you are made of and hands it back as an egg. no telling what hatches",{egg:egg});
};
function mazeTick(game){
var s=st(game),m=s.maze,c=you(game);if(!m)return;
if(c&&SB.dist(c.x,c.z,m.x,m.z)<4){s.maze=null;if(SB.Game.addSparks)SB.Game.addSparks(game,4,c);if(K.mote)give(game,c,"mote",1);emit("mazeDone",{c:c});snd(game,"achievement");tell(game,"🌀 you found the stone again! it hums, pleased (+4 ✨)");}
else if(game.time>m.until){s.maze=null;tell(game,"🌀 the hum fades. the stone has let you go");}
}
function count(game,ev){
if(!game||!you(game)||game.offline)return;
var s=st(game);
H.ODD.forEach(function(o){if(o.ev===ev&&!s.odd[o.id])s.cnt[o.id]=(s.cnt[o.id]||0)+1;});
}
function oddTick(game){
var s=st(game),G=SB.Game;
H.ODD.forEach(function(o){
if(s.odd[o.id]||(s.cnt[o.id]||0)<o.n||G.smols(game).length>=(G.JOIN_CAP||G.POP_CAP))return;
var hm=SB.Society&&SB.Society.home?SB.Society.home(game,0):game.world.T.spawn,p=spot(game,hm.x,hm.z,"odd"+o.id,5),r=dice(game,"odd"+o.id),g=SB.Genome.forTier(r,0);
g.genes.hue=o.hue;g.genes.hue2=o.hue;if(g.genes.sat!=null)g.genes.sat=0.95;
var c=G.spawnSmol(game,{genome:g,x:p.x,z:p.z,age:SB.STAGES[3].from+20,name:o.name,sex:r()<0.5?"f":"m",brain:SB.Creature.newBrain(g,0,r),how:"odd"});
c.odd=o.id;c.asleep=false;s.odd[o.id]=c.id;
emit("oddBlob",{c:c,id:o.id});
tell(game,"🫧 an odd blob wobbled in and stayed: "+o.name+". "+o.why);
});
}
H.odds=function(game){var s=st(game);return H.ODD.filter(function(o){return s.odd[o.id];});};
function rod(hk){return!!hk&&(hk==="rod"||hk.indexOf("rod")>=0);}
H.askFish=function(game,c,o){
var HV=SB.Harvest,s=st(game);
if(!HV||!HV.bubbleNear)return no(o.name+" shrugs");
var p=HV.bubbleNear(game,c.x,c.z,70);
if(!p)return no(o.name+": “nothing biting anywhere near today”");
s.fish={x:p.x,z:p.z,d:day(game),by:o.name};
emit("fishTip",{c:c,by:o,x:p.x,z:p.z});
return yes("🫧 "+o.name+": “the water is bubbling "+Math.round(p.d)+" steps "+compass(p.x-c.x,p.z-c.z)+" of here. cast there”");
};
function compass(dx,dz){var ns=dz<0?"north":"south",ew=dx>0?"east":"west",ax=Math.abs(dx),az=Math.abs(dz);return ax>az*2.4?ew:az>ax*2.4?ns:ns+"-"+ew;}
function weedDawn(game){
var hm=SB.Home&&SB.Home.get?SB.Home.get(game):null;if(!hm||!K.weed)return;
var n=0,r=dice(game,"weed"+day(game));
game.world.items.forEach(function(o){if((o.kind==="weed"||(o.kind==="stone"&&o.data.creep))&&SB.dist(o.x,o.z,hm.x,hm.z)<9)n++;});
for(var i=0;i<3&&n<6;i++){
var a=r()*6.283,d=2.6+r()*4.5,x=hm.x+Math.sin(a)*d,z=hm.z+Math.cos(a)*d,rock=r()<0.3;
if(!dry(game,x,z))continue;
put(game,rock?"stone":"weed",x,z,rock?{creep:1}:{keep:1},r()*6.283);n++;
}
}
H.pull=function(game,c,it){
if(!it||it.kind!=="weed"||it.gone)return no("");
if(!near(c,it))return no("get closer");
SB.World.remove(game.world,it);give(game,c,"fiber",1);
var seed=dice(game,"pull"+it.id)()<0.25&&K.seed;if(seed)give(game,c,"seed",1);
emit("weedPulled",{c:c});
return yes("you pull the weed: 1 "+label("fiber")+(seed?", and a seed":""));
};
var tT=0,cur=null;
function resync(game){
cur=game;wisps=[];carried=[];
game.world.items.forEach(function(o){if(o.kind==="wisp"&&o.data&&o.data.wisp!=null)wisps.push(o);else if(o.kind==="egg"&&o.data&&o.data.carry)carried.push(o);});
}
H.tick=function(game,dt){
if(!game||!game.world||game.offline)return;
if(!game.quests||!game.quests.helpers3){if((tT-=dt)>0)return;}
var s=st(game),id,v=s.v;
if(cur!==game){resync(game);tT=0;}
for(id in s.g)gStep(game,s.g[id],dt);
if(wisps.length)wispTick(game);
if(carried.length)carryTick(game);
if(v){
var c=SB.Game.byId(game,v.id);
if(!c||!c.alive||game.time>v.until){var end=v.kind==="ghost"?"👻 the light fades":"you are yourself again";endVessel(game,"time");tell(game,end);}
else if(v.kind==="pet"&&An()){var rec=An().state(game).list[v.pet],it=rec?An().body(game,rec):null;if(it){it.x=c.x;it.z=c.z;it.y=c.y;it.rot=c.facing;rec.x=c.x;rec.z=c.z;}}
else if(v.task&&v.task.t==="nest"&&game.world.T.nest&&near(c,game.world.T.nest,3))H.finish(game);
}
if((tT-=dt)>0)return;
tT=2;
resync(game);
places(game);mazeTick(game);winter(game);oddTick(game);
game.creatures.forEach(function(o){if(o.vessel&&(!s.v||s.v.id!==o.id)){o.alive=false;o.gone=true;}});
game.world.items.forEach(function(o){if(o.kind==="ghostlight"&&o.data.gl&&game.time>o.data.gl.until)SB.World.remove(game.world,o);});
};
H.options=function(game,c,r,o,x){
if(!game||!c||!Sv())return;
var s=st(game),v=s.v,hk=x.hk,ref=r&&r.ref,A=An();
function run(fn,a,b){return function(){var q=fn(game,c,a,b);if(q&&q.msg)x.say(q.msg);if(q&&q.ok)x.audio("pop",0.6);return true;};}
if(v&&v.id===c.id){
if(v.kind==="ghost"&&v.task&&ref&&ref.id===v.task.id)o.use=o.pick=x.op(v.task.label,function(){var q=H.finish(game);if(!q.ok&&q.msg)x.say(q.msg);return true;},null);
else if(v.kind==="pet"&&!r&&!o.pick)o.pick=x.op("nose about",function(){var q=H.nose(game);x.say(q.msg);return true;},null);
return;
}
if(!r||!ref)return;
if(r.type==="item"){
var it=ref,k=it.kind,g=H.byItem(game,it);
if(g){
o.use=x.op("look over "+g.name,function(){x.say("🏺 "+H.line(game,g));x.openBag("helpers3");return true;},null);
o.place=H.FUEL[hk]&&!g.ark?x.op("stoke "+g.name+" with your "+label(hk),run(H.stoke,g),null):hk===(g.ark?"metal":"clay")?x.op("patch "+g.name,run(H.patch,g),null):null;
o.pick=x.op(g.name+": next job",function(){x.say(H.setJob(game,g).msg);return true;},null);
}else if(k==="ghostlight")o.use=o.pick=x.op("step into "+it.data.gl.name+"'s light",function(){var q=H.ghost(game,c,it);if(!q.ok&&q.msg)x.say(q.msg);return true;},null);
else if(k==="weed")o.use=o.pick=x.op("pull the weed",run(H.pull,it),null);
else if(k==="wisp"){o.use=o.pick=x.op("watch the light-motes",function(){x.say("✨ they live in the wreck. hold out food: they carry a gift to the nest by morning");return true;},null);if(hk&&Sv().edible(hk))o.place=x.op("offer your "+label(hk)+" to the motes",run(H.offer,it),null);}
else if(k==="burrow")o.use=o.pick=x.no("somebody is asleep in here until spring");
else if(k==="egg"){var el=H.eggLine(game,it);if(el){if(o.pick&&!o.pick.locked)o.pick.label+=" · "+el;else o.pick=x.no((o.pick?o.pick.label+" · ":"🥚 ")+el);}}
else if(A&&A.byItem){var rec=A.byItem(game,it);if(rec&&rec.k==="grump"&&!rec.lit&&rec.mode==="pen")o.pick=x.op("study the grump",run(H.study,rec),null);}
}else if(r.type==="struct"){
var b=ref,bk=b.kind;
if(bk==="sleeppod"){var e=b.data.sl!=null?s.sleep[b.data.sl]:null;o.use=o.pick=e?x.op("wake "+e.name,function(){x.say(H.wake(game,b.data.sl).msg);return true;},null):x.no("an empty sleep pod: look at a sick or old smol near it");}
else if(bk==="incubator"){o.use=o.pick=x.no(b.data.egg?"a "+label(b.data.egg.k)+", warm in the straw. tomorrow morning":"an empty incubator: hold an animal's egg");if(eggSp(hk)&&!b.data.egg)o.place=x.op("set your "+label(hk)+" in the incubator",run(H.setEgg,b),null);}
else if(bk==="swapper")o.use=o.pick=x.op("work the ark swapper",function(){x.openBag("helpers3");return true;},null);
else if(bk==="arkstone")o.use=o.pick=x.op(b.data.stone==="maze"?"touch the humming stone":b.data.used?"the stone is dull":"touch the humming stone (it wants a thought crystal)",run(H.touch,b),null);
else if(bk==="brokenbot")o.use=o.pick=x.op("mend the ark helper ("+costText(H.BOT_COST)+")",run(H.rebuild,b),null);
}else if(r.type==="creature"&&ref.species==="smol"&&ref.alive&&!ref.stranger&&ref!==c){
if(frail(ref)&&H.freePod(game,ref))o.pick=x.op("tuck "+ref.name+" into the sleep pod",function(){var q=H.tuck(game,c,ref);x.say(q.msg);return true;},null);
if(rod(hk))o.place=x.op("ask "+ref.name+" where the fish bite",run(H.askFish,ref),null);
}
};
H.vitals=function(game,c){
if(!game||!game.quests||!game.quests.helpers3)return[];
var s=st(game),out=[],v=s.v;
if(v&&v.id===c.id)out.push({icon:v.kind==="ghost"?"👻":"🐾",text:(v.task?v.task.label:"you are "+v.name)+" · "+Math.max(0,Math.ceil(v.until-game.time))+"s"});
if(s.maze)out.push({icon:"🌀",text:"the stone: "+Math.round(SB.dist(c.x,c.z,s.maze.x,s.maze.z))+"m "+compass(s.maze.x-c.x,s.maze.z-c.z)+" · "+Math.max(0,Math.ceil(s.maze.until-game.time))+"s"});
if(s.fish&&s.fish.d===day(game))out.push({icon:"🫧",text:"fish: "+Math.round(SB.dist(c.x,c.z,s.fish.x,s.fish.z))+"m "+compass(s.fish.x-c.x,s.fish.z-c.z)});
if(c.carrying!=null)out.push({icon:"🥚",text:"carrying an egg"});
return out;
};
H.act=function(game,c,act,a,b){
var s=st(game),g=s.g[a],A=An(),rec=A&&a!=null?A.state(game).list[a]:null;
if(act==="part"){pick[a.charAt(0)]=a.charAt(1);return yes("");}
if(act==="fire")return H.fire(game,c,pick);
if(act==="job"&&g)return H.setJob(game,g);
if(act==="post"&&g)return H.setPost(game,c,g);
if(act==="pod")return H.buildPod(game,c);
if(act==="inc")return H.buildInc(game,c);
if(act==="wake")return H.wake(game,a);
if(act==="line")return H.setLine(game,c);
if(act==="carry")return H.setCarry(game);
if(act==="be")return H.bePet(game,c,rec);
if(act==="word")return H.teachWord(game,c,rec,b);
if(act==="swap")return H.swap(game,c,+a);
return no("");
};
function esc(s){return String(s).replace(/[&<>"']/g,function(ch){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}
function btn(act,a,text,off,go){return"<button class='btn"+(go?" go":"")+"' data-h3='"+act+(a!=null?":"+a:"")+"'"+(off?" disabled":"")+">"+esc(text)+"</button>";}
function row(big,title,small,btns){return"<div class='rc'><span class='big'>"+big+"</span><div class='t'>"+esc(title)+"<small>"+esc(small)+"</small></div>"+btns+"</div>";}
H.html=function(game,c){
var s=st(game),out="<div class='lbl'>🏺 clay helpers</div><div class='rlist'>",A=An(),p,k;
gs(game).forEach(function(g){out+=row(g.ark?"🤖":"🏺",H.line(game,g),H.parts(g)+" · "+H.JOBS[g.job]+" · look at it with firewood or "+(g.ark?"copper":"clay")+" in your hand",btn("job",g.id,"next job")+btn("post",g.id,"work from here"));});
if(thinkers(game,c)){
out+="</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
for(p in H.PARTS)for(k in H.PARTS[p])out+=btn("part",p+k,H.PARTS[p][k][0],false,pick[p]===k);
out+="</div><div class='rlist'>"+row("🔥","fire a clay helper",H.PARTS.l[pick.l][1]+" · "+H.PARTS.a[pick.a][1]+" · "+H.PARTS.h[pick.h][1]+" · at a lit kiln: "+costText(H.COST),btn("fire",null,"fire it",false,true));
}else if(!gs(game).length)out+="<span class='help'>a thinker can fire a clay helper at a lit kiln. a broken one lies in some wrecks</span>";
out+="</div><div class='lbl'>🛏 sleep</div><div class='rlist'>"+row("🛏","sleep pod","for a sick or old smol. nobody ages in one · "+costText(H.POD_COST),btn("pod",null,"build"));
H.sleepers(game).forEach(function(e){out+=row(e.pod!=null?"🛏":"🕳",e.name,e.why==="winter"?"asleep until spring":"asleep since day "+e.day,btn("wake",e.id,"wake"));});
out+=row("❄️","winter sleepers",s.lines[c.id]?c.name+"'s line sleeps the winters away":H.inLine(game,c)?c.name+" comes from a line that sleeps the winters":"make "+c.name+"'s line sleep every winter and wake in spring",btn("line",null,s.lines[c.id]?"stop":"start"));
out+=row("🥚","carried eggs",s.carry?"a mother carries her egg a while before laying it":"eggs are laid straight away",btn("carry",null,s.carry?"turn off":"turn on"));
out+="</div>";
if(A){
out+="<div class='lbl'>🐾 animals</div><div class='rlist'>"+row("🥚","incubator","an animal's egg hatches in a morning, no pen needed · "+costText(H.INC_COST),btn("inc",null,"build"));
A.all(game).forEach(function(r){
if(r.k==="grump"&&!r.lit)return;
var it=A.body(game,r);if(!near(c,it,8))return;
var bs=btn("be",r.id,"be "+r.name),w;
for(w in H.WORDS)bs+=btn("word",r.id+":"+w,(r.words&&r.words[w]>=1?"say “":"teach “")+w+"”");
out+=row((A.SP[r.k]||{}).icon||"🐾",r.name,"step into it for a minute, or teach it a word by saying it",bs);
});
out+="</div>";
}
if(nearest(structs(game,"swapper"),c,6)){
out+="<div class='lbl'>🔁 the ark swapper · three swaps a day</div><div class='rlist'>";
H.swaps().forEach(function(x,i){out+=row("🔁",x.n+" "+label(x.k),"for "+costText(x.a),btn("swap",i,"swap",!!lacks(c,x.a),true));});
out+="</div>";
}
var od=H.odds(game);if(od.length)out+="<div class='lbl'>🫧 odd blobs that stayed: "+esc(od.map(function(o){return o.name;}).join(", "))+"</div>";
return out;
};
H.wire=function(root,game,c,redraw,say){
root.querySelectorAll("[data-h3]").forEach(function(b){
b.addEventListener("click",function(){
var p=b.getAttribute("data-h3").split(":"),r=H.act(game,c,p[0],p[1],p[2]);
if(r&&r.msg&&say)say(r.msg);
if(r&&r.ok&&r.msg)snd(game,"craft");
try{redraw();}catch(e){}
});
});
};
var hooked=false;
H.hook=function(){
if(hooked||!SB.bus)return;hooked=true;
function g(){return SB.Game&&SB.Game.current;}
SB.bus.on("dawn",function(){var game=g();if(!game||game.offline)return;weedDawn(game);if(game.quests&&game.quests.helpers3){incDawn(game);wispDawn(game);}});
SB.bus.on("death",function(d){var game=g();if(game&&d&&d.c&&!game.offline)leaveLight(game,d.c);});
SB.bus.on("hatch",function(d){var game=g();if(game&&d)onHatch(game,d.c,d.obj);});
SB.bus.on("egg",function(d){var game=g();if(game&&d&&d.obj&&game.quests&&game.quests.helpers3)carryStart(game,d.obj);});
SB.bus.on("unpossess",function(d){var game=g();if(game&&d&&d.c&&d.c.vessel&&game.quests&&game.quests.helpers3&&st(game).v)endVessel(game,"left");});
H.ODD.forEach(function(o){SB.bus.on(o.ev,function(){count(g(),o.ev);});});
if(SB.Ext){
SB.Ext.on("tick",H.tick);
SB.Ext.on("options",H.options);
SB.Ext.on("vitals",H.vitals);
SB.Ext.tab({id:"helpers3",label:function(){return"🏺 helpers";},show:function(game,c){return!!c&&c.tier>=2&&!c.vessel;},html:function(game,c,icon){return H.html(game,c,icon);},wire:function(root,game,c,redraw,say){H.wire(root,game,c,redraw,say);}});
}
};
H.hook();
var ME=SB.Meshes||SB.ME,THINGS=H.MESHES={};
function golem(l,a,h,ark){
return function(){
var b=ME.builder(),body=ark?0x9aa4ad:0xb5693c,dark=ark?0x5a646e:0x8a4a28,leg=l==="l"?0.3:0.14,top=leg+0.3,x;
b.color(dark);
for(x=-1;x<=1;x+=2)b.push().translate(x*0.1,0,0).cyl(5,0.05,0.06,leg).pop();
b.color(body).push().translate(0,leg+0.15,0).scale(0.2,0.17,0.16).sphere(1).pop();
b.color(0xa8e6ff).glow(1).push().translate(0,leg+0.17,0.15).scale(0.045).sphere(0).pop().glow(0);
b.color(dark);
for(x=-1;x<=1;x+=2){
b.push().translate(x*0.3,leg+0.04,0).rotZ(x*0.4).cyl(4,0.035,0.035,0.2).pop();
if(a==="h")b.push().translate(x*0.3,leg+0.03,0.05).rotX(1.57).cone(4,0.03,0.1).pop();
else b.push().translate(x*0.31,leg+0.03,0.04).box(0.09,0.05,0.12).pop();
}
b.color(body);
if(h==="l"){b.push().translate(0,top,0).cyl(6,0.07,0.09,0.1).pop();b.color(0xffd98a).glow(1).push().translate(0,top+0.15,0).scale(0.07).sphere(1).pop().glow(0);}
else b.push().translate(0,top,0).cyl(7,0.07,0.13,0.12).pop();
b.color(0x1a1a22).push().translate(0.05,top+0.05,0.085).scale(0.018).sphere(0).pop().push().translate(-0.05,top+0.05,0.085).scale(0.018).sphere(0).pop();
return b.finish();
};
}
function glowBall(col,s,tail){
return function(){
var b=ME.builder();
b.color(col).glow(1).push().translate(0,tail?0.45:0,0).scale(s).sphere(1).pop();
if(tail)b.push().translate(0,0.1,0).cone(5,s*0.6,0.3).pop();
return b.glow(0).finish();
};
}
var MODELS={
weed:function(){var b=ME.builder(),i;b.color(0x5f9a3a);for(i=0;i<5;i++)b.push().rotY(i*1.26).translate(0.05,0,0).rotZ(-0.5).box(0.03,0.26,0.05).pop();return b.finish();},
burrow:function(){var b=ME.builder();b.color(0x7a5a3a).push().scale(0.4,0.16,0.4).sphere(1).pop();b.color(0x1c140e).push().translate(0,0.07,0.3).scale(0.14,0.11,0.1).sphere(0).pop();return b.finish();}
};
var STRUCT={
sleeppod:function(){
var b=ME.builder();
b.color(0x8a94a0).push().translate(0,0.2,0).box(0.8,0.4,1.5).pop();
b.color(0xa8e6ff).glow(0.4).push().translate(0,0.44,0).scale(0.36,0.2,0.7).sphere(1).pop().glow(0);
b.color(0x5a646e).push().translate(0,0.25,-0.8).box(0.9,0.5,0.12).pop();
return b.finish();
},
incubator:function(){
var b=ME.builder();
b.color(0xb5693c).push().translate(0,0.18,0).box(0.7,0.36,0.7).pop();
b.color(0xd9c060).push().translate(0,0.38,0).box(0.56,0.06,0.56).pop();
b.color(0xf5ead0).push().translate(0,0.48,0).scale(0.1,0.13,0.1).sphere(1).pop();
return b.finish();
},
swapper:function(){
var b=ME.builder();
b.color(0x6a7480).push().translate(0,0.35,0).box(0.9,0.7,0.7).pop();
b.color(0x9aa4ad).push().translate(-0.2,0.7,0).cyl(6,0.12,0.26,0.3).pop();
b.color(0xc5ff49).glow(1).push().translate(0.22,0.45,0.36).box(0.2,0.14,0.03).pop().glow(0);
b.color(0x3a424c).push().translate(0.2,0.12,0.38).box(0.3,0.16,0.1).pop();
return b.finish();
},
arkstone:function(){
var b=ME.builder();
b.color(0x4a5560).push().cyl(4,0.3,0.16,1.6).pop();
b.color(0xa8e6ff).glow(1).push().translate(0,0.9,0).cyl(4,0.25,0.23,0.08).pop().glow(0);
return b.finish();
},
brokenbot:function(){
var b=ME.builder();
b.color(0x9aa4ad).push().translate(0,0.16,0).rotZ(1.2).scale(0.3,0.26,0.24).sphere(1).pop();
b.color(0x5a646e).push().translate(0.4,0.05,0.1).rotZ(1.57).cyl(5,0.07,0.08,0.45).pop().push().translate(-0.3,0.1,-0.2).cyl(7,0.1,0.16,0.16).pop();
return b.finish();
}
};
if(ME&&ME.builder){
try{
["s","l"].forEach(function(l){["s","h"].forEach(function(a){["b","l"].forEach(function(h){THINGS["golem_"+l+a+h]=golem(l,a,h,false);});});});
THINGS.arkbot=golem("l","s","l",true);THINGS.ghostlight=glowBall(0xcfe9ff,0.16,true);THINGS.wisp=glowBall(0xfff2a8,0.07,false);
for(var mk in MODELS)THINGS[mk]=MODELS[mk];
var im0=ME.itemMesh;
if(im0)ME.itemMesh=function(kind){if(THINGS[kind]){try{return THINGS[kind]();}catch(e){}}return im0(kind);};
if(ME.STRUCT_BUILDERS)for(var sk2 in STRUCT)ME.STRUCT_BUILDERS[sk2]=STRUCT[sk2];
}catch(e){}
}
H.STRUCT_MODELS=STRUCT;
})();
