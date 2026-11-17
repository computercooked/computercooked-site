/* smol brains: world3.js (built from src/world3.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB=window.SB||{};
var W3=SB.World3={};
var K=SB.KINDS,NK=SB.NODES,SK=SB.STRUCTS,G=48,GG=G*G,PER=8,DAY=SB.DAY_LENGTH||1200;
W3.G=G;W3.BARE=-4;W3.LUSH=4;W3.TREES=6;W3.CAPS=5;W3.JADE_MAX=30;W3.SEED_MAX=40;
W3.LIFE={oak:60,pine:80,birch:36,palm:45,giant:150,sakura:40,maple:55,bamboo:16,mangrove:70,shroomtree:30};
var FLOWERS={oak:1,birch:1,sakura:1,giant:1,maple:1,mangrove:1,palm:1};
var GREEN={meadow:1,forest:1,jungle:1,swamp:1,taiga:1,blossom:1,maple:1,bamboo:1,flowers:1,mangrove:1,shroom:1};
var POOR={desert:1,tundra:1,mountain:1,beach:1,mesa:1,ash:1};
var RAFT={raftdeck:1,raftsail:1,raftrud:1,houseraft:1};
function Wd(){return SB.World;}
function Sv(){return SB.Survival||SB.Surv;}
function Pz(){return SB.Possess;}
function me(){var P=Pz();return P&&P.active?P.c:null;}
function day(game){return Math.floor((game.time||0)/DAY)+1;}
function year(game){return Math.floor((day(game)-1)/(4*(SB.seasonDays?SB.seasonDays(game):7)));}
function cl(v){return v<0?0:v>1?1:v;}
function label(k){return K[k]&&K[k].label?K[k].label:k;}
function dirOf(dx,dz){var a=(Math.atan2(dx,-dz)*180/Math.PI+360)%360;return["north","north-east","east","south-east","south","south-west","west","north-west"][Math.round(a/45)%8];}
function kind(k,d){if(!K[k])K[k]=d;}
kind("jade",{noun:"material",label:"jungle crystal",emoji:"💚",r:0.13,color:0x3fd67a,mat:1,glow:1,desc:"a green crystal that creeps through wet ground. plant it somewhere wet, or make a growstone."});
kind("growstone",{noun:"material",label:"growstone",emoji:"🪴",r:0.15,color:0x58c98a,mat:1,glow:1,desc:"jungle crystal set in stone. put it in the ground and the patch round it comes alive."});
kind("blossom",{noun:"food",label:"blossom",emoji:"🌸",r:0.1,color:0xf6b8d0,food:{hunger:-0.06,bored:-0.05},chem:{glucose:0.05},rots:480,desc:"picked from a tree in flower. a tree with no blossom left sets no seed."});
kind("sail",{noun:"material",label:"sail",emoji:"⛵",r:0.2,color:0xf2ead8,mat:1,desc:"woven fibre on a spar. a raft deck needs one."});
kind("rudder",{noun:"material",label:"rudder",emoji:"🛶",r:0.2,color:0xc9935a,mat:1,desc:"two planks on a stick. a raft deck needs one to steer."});
if(NK&&!NK.jadevein)NK.jadevein={noun:"material",label:"jungle crystal",emoji:"💚",r:0.45,glow:1,desc:"it grows, slowly, through wet ground. a pick gets it out."};
if(SK){
if(!SK.stilthut)SK.stilthut={noun:"shelter",label:"stilt hut",emoji:"🛖",r:1.1,cost:{stick:8,leaves:4,vine:2},work:14,wet:1,desc:"a hut on legs, out in the shallows or the swamp. no grump wades out to it."};
[["raftdeck","raft deck"],["raftsail","raft with a sail"],["raftrud","raft with a rudder"],["houseraft","house raft"]].forEach(function(p){
if(!SK[p[0]])SK[p[0]]={noun:p[0]==="houseraft"?"shelter":"material",label:p[1],emoji:"⛵",r:1.3,cost:{log:4,vine:3},work:1,wet:1,desc:"a deck, a sail and a rudder: then it floats along the coast, and it can be your home."};
});
}
W3.DECK={log:4,vine:3};
function plugIn(){
var S=Sv(),H=SB.Home;
if(S&&S.ROCKS&&!S.ROCKS.jadevein)S.ROCKS.jadevein={item:"jade",left:2,hp:2.5,ore:1};
if(S&&S.PLANTS&&!S.PLANTS.jade)S.PLANTS.jade="jadevein";
if(S&&S.EXTRA&&!plugIn.rc){
plugIn.rc=1;
[{id:"sail",name:"sail",icon:"⛵",shape:["fiber","fiber","stick","vine"],out:"sail",idea:"lashing",hint:"two fibre on top, a stick and a vine under them"},
{id:"rudder",name:"rudder",icon:"🛶",shape:["stick","plank","plank"],out:"rudder",idea:"lashing",hint:"the stick first, then two planks"},
{id:"growstone",name:"growstone",icon:"🪴",shape:["jade","stone","stone","jade"],out:"growstone",idea:"lashing",hint:"jungle crystal and stone, corner to corner"}
].forEach(function(r){if(!S.EXTRA.some(function(o){return o.id===r.id;}))S.EXTRA.push(r);});
}
if(H&&H.KINDS){H.KINDS.stilthut=1;H.KINDS.houseraft=1;}
return!!(S&&H);
}
var plugged=plugIn();
function st(game){
var q=game.quests||(game.quests={ch:0,done:{},n:{}}),s=q.world3;
if(!s||typeof s!=="object")s=q.world3={};
if(!s.nu){["nu","eco","bio","bp","born","pk"].forEach(function(k){if(!s[k]||typeof s[k]!=="object")s[k]={};});s.fell=s.fell||0;s.plant=s.plant||0;s.ns=s.ns||0;if(s.d0==null)s.d0=day(game);}
return s;
}
W3.state=st;
var RT=null;
function rt(game){
var w=game.world;
if(RT&&RT.w===w)return RT;
var T=w.T,N=T.N,cs=N/G,i,s=st(game);
var R=RT={w:w,cs:cs,b0:new Uint8Array(T.biome),sm:[new Float32Array(GG),new Float32Array(GG),new Float32Array(GG),new Float32Array(GG)],can:new Uint8Array(GG),pl:new Uint8Array(GG),sh:new Uint8Array(GG),land:[],cur:0,act:[],nj:0,ring:null,sailT:0,k:0};
for(i=0;i<GG;i++){var x=(i%G+0.5)*cs,z=((i/G|0)+0.5)*cs;if(Wd().inBounds(w,x,z)&&Wd().depthAt(w,x,z)<0.5)R.land.push(i);}
var r=SB.rng(((game.seed>>>0)^0x3077)>>>0);
for(i=R.land.length-1;i>0;i--){var j=(r()*(i+1))|0,t=R.land[i];R.land[i]=R.land[j];R.land[j]=t;}
for(var c in s.bio)paint(R,+c,s.bio[c]);
return R;
}
function cellOf(R,x,z){var i=(x/R.cs)|0,j=(z/R.cs)|0;return(j<0?0:j>=G?G-1:j)*G+(i<0?0:i>=G?G-1:i);}
W3.cell=function(game,x,z){return cellOf(rt(game),x,z);};
W3.center=function(game,c){var R=rt(game);return{x:(c%G+0.5)*R.cs,z:((c/G|0)+0.5)*R.cs};};
function paint(R,c,idx){
var T=R.w.T,N=T.N,i0=Math.floor((c%G)*R.cs),j0=Math.floor((c/G|0)*R.cs),i1=Math.floor((c%G+1)*R.cs),j1=Math.floor(((c/G|0)+1)*R.cs);
for(var j=j0;j<j1&&j<N;j++)for(var i=i0;i<i1&&i<N;i++){var t=j*N+i,b=SB.BIOMES[R.b0[t]];if(b&&b.id!=="ocean"&&b.id!=="reef")T.biome[t]=idx<0?R.b0[t]:idx;}
var Rn=SB.Render,mk=Rn&&(Rn.markGround||Rn.markDirty),xs=[i0-2,i1+2],zs=[j0-2,j1+2];
if(mk)for(var a=0;a<2;a++)for(var q=0;q<2;q++)mk.call(Rn,Math.max(0,Math.min(N-1,xs[a])),Math.max(0,Math.min(N-1,zs[q])));
}
function b0id(R,c){var p={x:(c%G+0.5)*R.cs,z:((c/G|0)+0.5)*R.cs},b=SB.BIOMES[R.b0[(p.z|0)*R.w.T.N+(p.x|0)]];return b?b.id:"ocean";}
W3.wet=function(game,x,z){var w=game.world,T=w.T;return Wd().depthAt(w,x,z)>0.02?1:T.moist?T.moist[SB.clamp(z|0,0,T.N-1)*T.N+SB.clamp(x|0,0,T.N-1)]:0.4;};
function base(game,R,c){var p=W3.center(game,c);return cl((0.25+0.6*W3.wet(game,p.x,p.z))*(POOR[b0id(R,c)]?0.5:1));}
function soilAt(game,R,c){var v=st(game).nu[c];return v==null?base(game,R,c):v;}
W3.soil=function(game,x,z){var R=rt(game);return soilAt(game,R,cellOf(R,x,z));};
function feed(game,R,c,dv){var s=st(game),b=base(game,R,c),v=cl(soilAt(game,R,c)+dv);if(Math.abs(v-b)<0.02)delete s.nu[c];else s.nu[c]=Math.round(v*100)/100;return v;}
W3.feed=function(game,x,z,dv){var R=rt(game);return feed(game,R,cellOf(R,x,z),dv);};
W3.light=function(game,x,z){
var R=rt(game),w=game.world,c=cellOf(R,x,z),td=((game.time||0)/DAY)%1;
var sun=td<0.18||td>0.82?0.06:0.15+0.85*Math.sin((td-0.18)/0.64*Math.PI);
sun*=1-0.45*((w.weather&&w.weather.cloud)||0);
return cl(sun*(1-Math.min(0.7,R.can[c]*0.14))+(R.sm[1][c]>0.35?0.5:0));
};
W3.eco=function(game,x,z){return st(game).eco[W3.cell(game,x,z)]||0;};
function ecoAdd(game,c,d){var s=st(game),v=Math.max(-8,Math.min(8,(s.eco[c]||0)+d));if(v)s.eco[c]=v;else delete s.eco[c];return v;}
W3.wind=function(game){var a=SB.hash(game.seed|0,day(game),77)*6.283;return{dx:Math.sin(a),dz:Math.cos(a)};};
function stamp(game,R,s){
var w=game.world,sm=R.sm,H=SB.Home,i,o;
function put(ch,x,z,v){var c=cellOf(R,x,z);if(sm[ch][c]<v)sm[ch][c]=v;}
for(i=0;i<w.items.length;i++){o=w.items[i];if(o.noun==="food"&&o.heldBy==null)put(0,o.x,o.z,0.7);}
for(i=0;i<w.structures.length;i++){
o=w.structures[i];if(!o.done)continue;
if((o.kind==="campfire"||o.kind==="kiln")&&o.data&&o.data.lit)put(1,o.x,o.z,1);
else if(o.noun==="shelter"||(H&&H.KINDS[o.kind]))put(2,o.x,o.z,0.7);
}
(w.burning||[]).forEach(function(n){put(1,n.x,n.z,1);});
if(w.T.nest)put(2,w.T.nest.x,w.T.nest.z,1);
R.act.length=0;
for(i=0;i<game.creatures.length;i++){o=game.creatures[i];if(!o.alive)continue;if(o.species==="grump")put(3,o.x,o.z,1);else if(o.species==="smol"&&R.act.length<48)R.act.push(o.x,o.z);}
if(game.focus)R.act.push(game.focus.x,game.focus.z);
if(R.k++%12===0){R.nj=0;for(i=0;i<w.nodes.length;i++)if(w.nodes[i].kind==="jadevein"&&w.nodes[i].state==="ok")R.nj++;}
var b=W3.raft(game);if(b)b.s=1+0.2*(s.raft.cores||0);
if(s.yr!==year(game)){s.yr=year(game);s.pk={};s.ns=0;}
if(!s.jade){s.jade=1;sowJade(game,R);}
}
function near(R,x,z,d){for(var i=0;i<R.act.length;i+=2){var dx=R.act[i]-x,dz=R.act[i+1]-z;if(dx*dx+dz*dz<d*d)return true;}return false;}
function drift(game,R,c,sdt){
var wn=W3.wind(game),dw=Math.abs(wn.dx)>Math.abs(wn.dz)?(wn.dx>0?1:-1):(wn.dz>0?G:-G),nb=[1,-1,G,-G],x=c%G,k=Math.exp(-sdt/40);
for(var ch=0;ch<4;ch++){
var f=R.sm[ch],v=f[c];
if(v<0.01){f[c]=0;continue;}
for(var q=0;q<4;q++){
var n=c+nb[q];
if(n<0||n>=GG||(q===0&&x===G-1)||(q===1&&x===0))continue;
var t=v*(nb[q]===dw?0.85:nb[q]===-dw?0.35:0.6);
if(f[n]<t)f[n]+=(t-f[n])*0.6;
}
f[c]=v*k;
}
}
W3.smell=function(game,x,z){var R=rt(game),c=cellOf(R,x,z);return{food:R.sm[0][c],fire:R.sm[1][c],home:R.sm[2][c],grump:R.sm[3][c]};};
W3.nose=function(game,x,z,ch){
var R=rt(game),f=R.sm[ch],c=cellOf(R,x,z),cx=c%G,cz=(c/G)|0,bv=f[c],bx=0,bz=0;
for(var j=-1;j<=1;j++)for(var i=-1;i<=1;i++){var nx=cx+i,nz=cz+j;if((i||j)&&nx>=0&&nz>=0&&nx<G&&nz<G&&f[nz*G+nx]>bv+0.01){bv=f[nz*G+nx];bx=i;bz=j;}}
if(bv<0.06)return null;
return{v:bv,here:!bx&&!bz,dx:bx,dz:bz,dir:bx||bz?dirOf(bx,bz):"right here"};
};
W3.follow=function(c,game){
if(!c||!game||!game.world||game.offline||c.species!=="smol"||c._pov||!c.chem)return null;
var ch=c.chem.hunger>0.5?0:(c.chem.cold>0.45||(game.world.night&&c.chem.fear>0.3))?1:-1;
if(ch<0)return null;
var n=W3.nose(game,c.x,c.z,ch);
if(!n||n.here)return null;
var k=Math.min(13,rt(game).cs*1.2)/Math.sqrt(n.dx*n.dx+n.dz*n.dz);
return{x:c.x+n.dx*k,z:c.z+n.dz*k,why:ch?"i smell smoke to the "+n.dir+". a fire!":"something smells good to the "+n.dir};
};
function wrapMind(){
var M=SB.Mind;
if(!M||!M.wanderTarget||M._w3)return;
var f0=M.wanderTarget;M._w3=1;
M.wanderTarget=function(c,game){var p=f0(c,game);if(p)return p;try{return W3.follow(c,game);}catch(e){return null;}};
}
wrapMind();
function addNode(w,kind,x,z,s){
if(!NK[kind]||!Wd().inBounds(w,x,z))return null;
var id=w._nextNode||0;
if(!id)w.nodes.forEach(function(o){if(o.id>=id&&!(NK[o.kind]&&NK[o.kind].nop))id=o.id+1;});
w._nextNode=id+1;
var n={id:id,kind:kind,x:x,z:z,s:s||1,rot:Math.random()*6.28,seed:1,added:true,type:"node",noun:NK[kind].noun,dropT:20,alsoT:60,state:"ok",grow:0};
w.nodes.push(n);w.nodeById[id]=n;
if(Wd().rebuildNodeGrid)Wd().rebuildNodeGrid(w);
Wd().markNode(w,n);
return n;
}
function lifeOf(n){return W3.LIFE[n.kind]||50;}
function mortal(n){return!!n&&n.kind!=="deadtree"&&Sv().isTree(n);}
W3.age=function(game,n){var s=st(game),b=s.born[n.id];if(b==null)b=s.d0-Math.floor(SB.hash(n.id,7,3)*lifeOf(n)*0.9);return day(game)-b;};
W3.stage=function(game,n){
if(!mortal(n)||n.state!=="ok")return"";
if(n.grow!=null&&n.grow<1)return"sapling";
var a=W3.age(game,n),L=lifeOf(n),sea=game.world.season;
if(a>=L*0.85)return"old";
if(a<L*0.12)return"grown";
return sea===0&&FLOWERS[n.kind]&&st(game).pk[n.id]==null?"flower":sea===2&&st(game).pk[n.id]==null?"seed":"grown";
};
W3.inFlower=function(game,n){return W3.stage(game,n)==="flower";};
W3.pick=function(game,c,n){
if(!W3.inFlower(game,n))return{ok:false,msg:"no blossom on it"};
if(Sv().add(c,"blossom",1))return{ok:false,msg:"your paws are full"};
st(game).pk[n.id]=1;
SB.bus.emit("w3blossom",{c:c,node:n});
return{ok:true,msg:"🌸 a blossom. (a tree picked bare sets no seed this year)"};
};
W3.seedFrom=function(game,n){
var R=rt(game),s=st(game),w=game.world;
if(s.ns>=W3.SEED_MAX)return null;
for(var t=0;t<6;t++){
var a=Math.random()*6.283,d=2+Math.random()*2.5,x=n.x+Math.sin(a)*d,z=n.z+Math.cos(a)*d,c=cellOf(R,x,z);
if(R.can[c]>=3||soilAt(game,R,c)<0.3||(s.eco[c]||0)<=W3.BARE||!Sv().plantSpot(game,x,z))continue;
var o=addNode(w,n.kind,x,z,0.85+Math.random()*0.3);
if(!o)return null;
s.born[o.id]=day(game);s.ns++;
SB.bus.emit("w3seed",{from:n,node:o});
return o;
}
return null;
};
W3.die=function(game,n){
var R=rt(game),w=game.world;
if(!mortal(n)||n.state!=="ok")return false;
n.state="stump";n.regrowT=600;n.hp=null;Wd().markNode(w,n);
st(game).born[n.id]=day(game);
feed(game,R,cellOf(R,n.x,n.z),0.2);
if(Sv().spawn){Sv().spawn(game,"log",1,n.x+0.6,n.z+0.3);Sv().spawn(game,"stick",2,n.x-0.5,n.z+0.5);}
SB.bus.emit("w3died",{node:n});
return true;
};
function wetGround(game,x,z){return W3.wet(game,x,z)>=0.5&&Wd().depthAt(game.world,x,z)<=0.02;}
function sowJade(game,R){
var w=game.world,r=SB.rng(((game.seed>>>0)^0x1ade)>>>0),N=w.T.N,got=0,best=null,bw=0;
for(var t=0;t<500&&got<3;t++){
var x=6+r()*(N-12),z=6+r()*(N-12),b=SB.BIOMES[Wd().biomeAt(w,x,z)],wt=W3.wet(game,x,z);
if(!b||Wd().depthAt(w,x,z)>0.02||!Wd().walkable(w,x,z)||Wd().nearestNode(w,x,z,1.4))continue;
if(wt>bw){bw=wt;best={x:x,z:z};}
if(wt>=0.55&&(b.id==="jungle"||b.id==="swamp"||b.id==="mangrove"||b.id==="bamboo")){var n=addNode(w,"jadevein",x,z,0.8);if(n){n.grow=null;got++;}}
}
if(!got&&best){var n2=addNode(w,"jadevein",best.x,best.z,0.8);if(n2)n2.grow=null;}
}
W3.spread=function(game,n){
var R=rt(game);
if(R.nj>=W3.JADE_MAX)return null;
for(var t=0;t<6;t++){
var a=Math.random()*6.283,d=1.2+Math.random()*1.2,x=n.x+Math.sin(a)*d,z=n.z+Math.cos(a)*d;
if(!wetGround(game,x,z)||!Sv().plantSpot(game,x,z))continue;
var o=addNode(game.world,"jadevein",x,z,0.6+Math.random()*0.3);
if(o){R.nj++;SB.bus.emit("w3jade",{from:n,node:o});}
return o;
}
return null;
};
W3.plantJade=function(game,c,x,z){
if(!wetGround(game,x,z))return{ok:false,msg:"too dry here. jungle crystal only takes in wet ground"};
var n=Sv().plant(c,game,"jade",x,z);
if(!n)return{ok:false,msg:"no room to plant here"};
n.s=0.6;
return{ok:true,msg:"💚 planted. in wet ground it buds new crystals, slowly"};
};
W3.setStone=function(game,c){
var R=rt(game),cc=cellOf(R,c.x,c.z);
if(!Sv().take(c,"growstone",1).length)return{ok:false,msg:"you have no growstone"};
feed(game,R,cc,1);ecoAdd(game,cc,3);
[1,-1,G,-G].forEach(function(d){var n=cc+d;if(n>=0&&n<GG){feed(game,R,n,0.3);ecoAdd(game,n,1);}});
SB.bus.emit("w3stone",{c:c,cell:cc});
return{ok:true,msg:"🪴 the growstone sinks in. the ground round it wakes up"};
};
W3.mulch=function(game,c){
var R=rt(game);
if(Sv().count(c,"leaves",true)<2)return{ok:false,msg:"mulch takes 2 leaves"};
Sv().take(c,"leaves",2);
return{ok:true,msg:"🍃 dug in. soil here: "+Math.round(feed(game,R,cellOf(R,c.x,c.z),0.25)*100)+"%"};
};
function turnTo(game,R,s,c,id){
var idx=id?SB.B[id]:-1,cur=s.bio[c];
if((idx<0&&cur==null)||cur===idx||(idx>=0&&idx===SB.B[b0id(R,c)]&&cur==null))return;
if(idx<0||idx===SB.B[b0id(R,c)]){delete s.bio[c];paint(R,c,-1);}else{s.bio[c]=idx;paint(R,c,idx);}
var p=W3.center(game,c),nm=SB.BIOMES[idx<0?SB.B[b0id(R,c)]:idx].name;
SB.bus.emit("w3biome",{cell:c,x:p.x,z:p.z,to:id||b0id(R,c),back:idx<0});
if(near(R,p.x,p.z,30)&&SB.Game&&SB.Game.note)SB.Game.note(game,id==="savanna"?"🏜 a patch felled bare has gone to dry grass. plant trees there to mend it":idx<0?"🌱 a patch has gone back to "+nm:"🌳 a planted patch has become "+nm);
}
function cellTick(game,R,s,c,sdt){
var w=game.world,cs=R.cs,cx=(c%G+0.5)*cs,cz=((c/G|0)+0.5)*cs,S=Sv();
drift(game,R,c,sdt);
if(s.nu[c]!=null)feed(game,R,c,(base(game,R,c)-s.nu[c])*Math.min(1,sdt/(4*DAY)));
var eco=s.eco[c]||0,bare=eco<=W3.BARE,lush=eco>=W3.LUSH,soil=soilAt(game,R,c),can=0,pl=0,sh=0,on=near(R,cx,cz,45);
if(eco<0&&Math.random()<sdt/(6*DAY))eco=ecoAdd(game,c,1);
Wd().eachNodeNear(w,cx,cz,cs*0.75,function(n){
if(cellOf(R,n.x,n.z)!==c)return;
var def=NK[n.kind];
if(n.state==="stump"&&bare){if((n.regrowT||0)<120)n.regrowT=120;return;}
if(n.state!=="ok"||!def)return;
if(n.kind==="jadevein"){if(on&&(n.grow==null||n.grow>=1)&&Math.random()<sdt/(2*DAY))W3.spread(game,n);return;}
if(n.kind==="shrooms"||n.kind==="shroomtree"){if(n.added)sh++;}
if(def.drops&&n.dropT!=null){if(lush||soil>0.7)n.dropT-=sdt*0.5;else if(bare)n.dropT+=sdt*0.5;}
if(!S.isTree(n))return;
if(n.added)pl++;
if(n.grow!=null&&n.grow<1)return;
can++;
if(!on||!mortal(n))return;
var stg=W3.stage(game,n);
if(stg==="old"&&W3.age(game,n)>=lifeOf(n)&&Math.random()<sdt/(0.5*DAY))W3.die(game,n);
else if(stg==="seed"&&Math.random()<sdt/(3*DAY)*(lush?3:1))W3.seedFrom(game,n);
else if(stg==="flower"&&SB.FX&&SB.FX.burst&&Math.random()<0.05&&near(R,n.x,n.z,18))SB.FX.burst("leaves",n.x,Wd().groundY(w,n.x,n.z)+2,n.z,2);
});
R.can[c]=can;R.pl[c]=pl;R.sh[c]=sh;
var nb=[1,-1,G,-G],tp=pl,ts=sh,q,bp=s.bp[c]||0;
for(q=0;q<4;q++){var n2=c+nb[q];if(n2>=0&&n2<GG){tp+=R.pl[n2];ts+=R.sh[n2];}}
var want=sh>=2&&ts>=W3.CAPS?-1:pl>=2&&tp>=W3.TREES?1:0;
if(want&&Math.abs(bp)<1){bp+=want*sdt/(1.5*DAY);if(bp*want<0)bp=0;bp=Math.max(-1,Math.min(1,bp));}
else if(!want&&bp&&Math.abs(bp)<1){bp-=(bp>0?1:-1)*Math.min(Math.abs(bp),sdt/(4*DAY));}
else if(Math.abs(bp)>=1&&((bp>0&&tp<3)||(bp<0&&ts<2)))bp=0;
if(bp)s.bp[c]=Math.round(bp*1000)/1000;else delete s.bp[c];
turnTo(game,R,s,c,bare&&GREEN[b0id(R,c)]?"savanna":bp>=1?"forest":bp<=-1?"shroom":null);
}
W3.pass=function(game,sdt){var R=rt(game),s=st(game);stamp(game,R,s);for(var i=0;i<R.land.length;i++)cellTick(game,R,s,R.land[i],sdt);};
W3.info=function(game,x,z){
var R=rt(game),s=st(game),c=cellOf(R,x,z),eco=s.eco[c]||0,bp=s.bp[c]||0,b=SB.BIOMES[Wd().biomeAt(game.world,x,z)];
return{cell:c,biome:b?b.name:"",light:W3.light(game,x,z),soil:soilAt(game,R,c),wet:W3.wet(game,x,z),eco:eco,trees:R.can[c],
word:eco<=W3.BARE?"barren":eco<0?"worn":eco>=W3.LUSH?"lush":eco>0?"tended":"wild",
turn:bp&&Math.abs(bp)<1?(bp>0?"forest":"glowshroom grove"):"",pct:Math.round(Math.abs(bp)*100)};
};
function fwd(c){var P=Pz(),S=P&&P.active&&P.c===c&&P.state?P.state():null;return S&&S.yaw!=null?{x:-Math.sin(S.yaw),z:-Math.cos(S.yaw)}:{x:Math.sin(c.facing||0),z:Math.cos(c.facing||0)};}
W3.raise=function(game,c){
if(c.tier<2)return{ok:false,msg:"it takes hands: a tool-user and up"};
var f=fwd(c),a0=Math.atan2(f.x,f.z),S=Sv();
for(var k=0;k<8;k++)for(var d=2;d<=6;d+=0.5){
var a=a0+(k%2?1:-1)*Math.ceil(k/2)*0.785,x=c.x+Math.sin(a)*d,z=c.z+Math.cos(a)*d;
if(!S.canPlace(game,"stilthut",x,z))continue;
var b=S.place(c,game,"stilthut",x,z,a);
if(!b)continue;
if(S.canDeliver(c,b))S.deliver(c,game,b);
var need=S.needs(b);
return{ok:true,st:b,msg:"🛖 a stilt hut site, out on the wet! "+(need.length?"it needs "+need.map(function(o){return o.n+" "+label(o.k);}).join(", "):"now build it")};
}
return{ok:false,msg:"stilt huts stand in shallow water or swamp. go to the water's edge"};
};
W3.ring=function(game){
var R=rt(game);
if(R.ring)return R.ring;
var w=game.world,N=w.T.N,out=[];
for(var a=0;a<144;a++){
var sx=Math.sin(a/144*6.2832),sz=Math.cos(a/144*6.2832);
for(var r=N*0.7;r>4;r-=0.25){
var x=N/2+sx*r,z=N/2+sz*r;
if(!Wd().inBounds(w,x,z))continue;
var d=Wd().depthAt(w,x,z);
if(d>0.12&&d<0.45){out.push({x:Math.round(x*10)/10,z:Math.round(z*10)/10});break;}
if(d<=0.02)break;
}
}
return(R.ring=out);
};
W3.raft=function(game){var s=game.quests&&game.quests.world3,b=s&&s.raft?Wd().structById(game.world,s.raft.id):null;return b&&RAFT[b.kind]?b:null;};
W3.afloat=function(game){var b=W3.raft(game);return!!b&&b.kind==="houseraft";};
W3.hold=function(game){var b=W3.raft(game),H=SB.Home;return b&&H&&H.is(game,b)?4*(st(game).raft.cores||0):0;};
function has(c,k,n){return Sv().count(c,k,true)>=(n||1);}
W3.layDeck=function(game,c){
var s=st(game),ring=W3.ring(game),best=-1,bd=9;
if(c.tier<2)return{ok:false,msg:"it takes hands: a tool-user and up"};
if(W3.raft(game))return{ok:false,msg:"you have a raft already"};
for(var k in W3.DECK)if(!has(c,k,W3.DECK[k]))return{ok:false,msg:"a deck takes 4 logs and 3 vines"};
for(var i=0;i<ring.length;i++){var d=SB.dist(c.x,c.z,ring[i].x,ring[i].z);if(d<bd){bd=d;best=i;}}
if(best<0)return{ok:false,msg:"a deck is laid in the shallows. carry the logs down to the sea"};
for(k in W3.DECK)Sv().take(c,k,W3.DECK[k]);
var b=Wd().addStructure(game.world,game,"raftdeck",ring[best].x,ring[best].z,{done:true,tribe:c.tribe,rot:0});
b.founder=c.name;
s.raft={id:b.id,sail:0,rud:0,cores:0,pos:best,go:0,n:0};
SB.bus.emit("w3raft",{c:c,st:b,part:"deck"});
return{ok:true,st:b,msg:"🪵 the deck is down, in the shallows. it needs a sail and a rudder before it floats"};
};
W3.fit=function(game,c,part){
var s=st(game),b=W3.raft(game),r=s.raft,core=part==="core",it=core?"arkcore":part;
if(!b)return{ok:false,msg:"lay a deck first"};
if(SB.dist(c.x,c.z,b.x,b.z)>4.5)return{ok:false,msg:"stand at the raft"};
if(core?b.kind!=="houseraft":part==="sail"?r.sail:r.rud)return{ok:false,msg:core?"it has to float first: a sail and a rudder":"it has one"};
if(core&&r.cores>=3)return{ok:false,msg:"three cores is all it holds"};
if(!K[it]||!Sv().take(c,it,1).length)return{ok:false,msg:core?"you carry no ark core. they lie in the mazes under the captains' lairs":"you carry no "+part+". lay one out on the grid: "+(part==="sail"?"two fibre, then a stick and a vine":"a stick, then two planks")};
if(core){r.cores++;b.s=1+0.2*r.cores;}
else{if(part==="sail")r.sail=1;else r.rud=1;b.kind=r.sail&&r.rud?"houseraft":r.sail?"raftsail":"raftrud";b.noun=SK[b.kind].noun;}
Wd().markNode(game.world,b);
SB.bus.emit("w3raft",{c:c,st:b,part:part,afloat:b.kind==="houseraft"});
return{ok:true,msg:core?"🔷 the core hums. the raft grows: faster, and room for "+(4*r.cores)+" more things in its chest":b.kind==="houseraft"?"⛵ she floats! cast off to sail the coast. she can be your home":part==="sail"?"⛵ the sail is up. now a rudder":"🛶 the rudder is on. now a sail"};
};
W3.cast=function(game,c){
var b=W3.raft(game),r=st(game).raft;
if(!b||b.kind!=="houseraft")return{ok:false,msg:"it needs a deck, a sail and a rudder to float"};
if(W3.ring(game).length<3)return{ok:false,msg:"no coast to sail"};
if(c&&SB.dist(c.x,c.z,b.x,b.z)>4.5)return{ok:false,msg:"stand at the raft"};
if(c&&SB.dist(c.x,c.z,b.x,b.z)>1.2){c.x=b.x;c.z=b.z;}
r.go=1;r.n=0;
SB.bus.emit("w3sail",{c:c,st:b});
return{ok:true,msg:"⛵ cast off! she follows the coast. drop anchor where you like"};
};
W3.anchor=function(game){var r=st(game).raft;if(!r||!r.go)return{ok:false,msg:"she is at anchor"};r.go=2;return{ok:true,msg:"⚓ dropping anchor at the next cove"};};
function sail(game,R,s,dt){
var r=s.raft,b=r&&r.go?W3.raft(game):null;
if(!b){if(r&&r.go)r.go=0;return;}
if((R.sailT+=dt)<0.3)return;
var ring=W3.ring(game),step=R.sailT*(2.2+0.6*(r.cores||0)),ox=b.x,oz=b.z,c=me();
R.sailT=0;
if(ring.length<3){r.go=0;return;}
var nx=(r.pos+1)%ring.length,t=ring[nx],d=SB.dist(ox,oz,t.x,t.z);
if(d<=step){b.x=t.x;b.z=t.z;r.pos=nx;r.n++;if(r.go===2||r.n>=ring.length){r.go=0;SB.bus.emit("w3anchor",{st:b});}}
else{b.x+=(t.x-ox)/d*step;b.z+=(t.z-oz)/d*step;b.rot=Math.atan2(t.x-ox,t.z-oz);}
Wd().markNode(game.world,{x:ox,z:oz});Wd().markNode(game.world,b);
if(c&&c.alive&&SB.dist(c.x,c.z,ox,oz)<1.8*(b.s||1)){c.x+=b.x-ox;c.z+=b.z-oz;if(c.px!=null){c.px+=b.x-ox;c.pz+=b.z-oz;}}
var H=SB.Home;if(H&&H.is(game,b)){var hs=H.state(game);hs.x=b.x;hs.z=b.z;}
}
function guard(game,R,s){
var P=Pz(),c=me(),B=SB.Bosses;
if(!c)return;
var mid=B&&B.mazeIn?B.mazeIn(game):null;
if(mid){var e=B.state(game).list[mid];if(SB.dist(c.x,c.z,e.x,e.z)>7)B.mazeLeave(game,mid);}
var g=P.scout?P.scout():null;
if(!g||g.boss||!g.scout||g.scout.done||g.scout.night)return;
var safe=Wd().structsNear(game.world,c.x,c.z,2.8,function(b){return b.done&&(b.kind==="stilthut"||b.kind==="houseraft");}).length;
if(!safe)return;
if(P.endScout)P.endScout("🛖 the grump won't wade out after you. it slinks off",1,"stilts");else{g.scout.done=true;g.goingHome=true;}
SB.bus.emit("w3safe",{c:c,g:g});
}
var tS=0,tH=0;
W3.tick=function(game,dt){
if(!game||!game.world||!game.world.T||game.offline||game.showcase)return;
if(!plugged)plugged=plugIn();
var R=rt(game),s=st(game),L=R.land,n=Math.min(L.length,PER);
sail(game,R,s,dt);
if((tS-=dt)<=0){tS=1.5;stamp(game,R,s);}
if((tH-=dt)<=0){tH=0.5;guard(game,R,s);}
for(var i=0;i<n;i++){R.cur=(R.cur+1)%L.length;cellTick(game,R,s,L[R.cur],dt*L.length/n);}
};
function cur(){return SB.Game&&SB.Game.current;}
var hooked=false;
W3.hook=function(){
if(hooked||!SB.bus)return;hooked=true;
SB.bus.on("chop",function(d){
var game=cur();if(!game||!d||!d.node||game.offline)return;
var R=rt(game),s=st(game),c=cellOf(R,d.node.x,d.node.z),was=s.eco[c]||0,v=ecoAdd(game,c,-1);
s.fell++;feed(game,R,c,-0.1);
if(v<=W3.BARE&&was>W3.BARE&&d.c&&d.c._pov&&Pz()&&Pz().say)Pz().say("🏜 this patch is felled bare. stumps won't grow back here until someone plants");
});
SB.bus.on("planted",function(d){
var game=cur();if(!game||!d||!d.node||game.offline)return;
var R=rt(game),s=st(game);
if(d.node.kind!=="jadevein"){ecoAdd(game,cellOf(R,d.node.x,d.node.z),1);s.plant++;}
s.born[d.node.id]=day(game);
});
SB.bus.on("unpossess",function(){var game=cur(),B=SB.Bosses,id=game&&B&&B.mazeIn?B.mazeIn(game):null;if(id)B.mazeLeave(game,id);});
};
W3.hook();
var X=SB.Ext;
if(X){
X.on("tick",W3.tick);
X.on("options",function(game,c,r,o,x){
if(!game||game.offline||!c)return;
var B=SB.Bosses,H=SB.Home,s=st(game),mid=B&&B.mazeIn?B.mazeIn(game):null;
function go(fn,snd){return function(){var res=fn();if(res&&res.msg)x.say(res.msg);if(res&&res.ok)x.audio(snd||"craft",0.7);return!!(res&&res.ok);};}
if(mid){
var L=B.mazeLook(game,mid);
var mv=function(t){return go(function(){var m=B.mazeMove(game,c,mid,t);if(m.heart||m.found)x.audio("achievement",0.7);return m;},"bonk");};
var lab=function(t,w){return L.out===t?"climb back out":w;};
o.use=L.ahead?x.op(lab(0,"go ahead"),mv(0),null):x.op(lab(2,"turn back"),mv(2),null);
o.pick=L.left?x.op(lab(-1,"go left"),mv(-1),null):x.no("a wall on the left");
o.place=L.right?x.op(lab(1,"go right"),mv(1),null):x.no("a wall on the right");
return;
}
if(r&&r.type==="struct"&&r.ref){
var b=r.ref,home=b.done&&H&&(b.kind==="stilthut"||b.kind==="houseraft");
if(RAFT[b.kind]&&s.raft&&b.id===s.raft.id){
if(b.kind!=="houseraft"){
var p=!s.raft.sail&&has(c,"sail")?"sail":!s.raft.rud&&has(c,"rudder")?"rudder":null;
o.use=p?x.op(p==="sail"?"rig the sail":"hang the rudder",go(function(){return W3.fit(game,c,p);},"build"),null):x.no("it needs "+(s.raft.sail?"a rudder":s.raft.rud?"a sail":"a sail and a rudder")+": lay one out on the grid");
}else{
o.use=s.raft.go===1?x.op("drop anchor",go(function(){return W3.anchor(game);}),null):x.op("cast off",go(function(){return W3.cast(game,c);},"chime"),null);
if(has(c,"arkcore")&&s.raft.cores<3)o.pick=x.op("fit the ark core",go(function(){return W3.fit(game,c,"core");},"achievement"),null);
}
}
if(home){
if(H.is(game,b))o.place=x.op("open your home",function(){x.openBag("home");return true;},null);
else if(H.canClaim(game,b))o.place=x.op(H.get(game)?"move your home here":"make this your home",go(function(){return H.claim(game,b,c)?{ok:true,msg:"🏠 this "+SK[b.kind].label+" is your home now"}:null;},"achievement"),null);
}
}else if(r&&r.type==="node"&&r.ref){
var n=r.ref;
if(n.kind==="jadevein"&&o.use&&o.use.locked)o.use=x.no("jungle crystal: dig it out with a pick");
else if(!o.place&&c.tier>=1&&W3.inFlower(game,n))o.place=x.op("pick a blossom",go(function(){return W3.pick(game,c,n);}),null);
}else if(r&&r.type==="water"){
if(c.tier>=2&&x.hk==="log"&&!W3.raft(game))o.pick=x.op("lay a raft deck here (4 logs, 3 vines)",go(function(){return W3.layDeck(game,c);},"build"),null);
}else if(!r){
var S=x.state,ag=S&&S.aim?S.aim:Pz()&&Pz().aimGround?Pz().aimGround(game,c):null,hk=x.hk;
if(c.tier>=2&&!o.use&&(hk==="glowcap"||hk==="jade")){
o.use=ag&&Sv().plantSpot(game,ag.x,ag.z)?x.op("plant the "+label(hk),go(function(){if(hk==="jade")return W3.plantJade(game,c,ag.x,ag.z);return Sv().plant(c,game,hk,ag.x,ag.z)?{ok:true,msg:"🍄 planted. enough of them and the patch turns to a glowshroom grove"}:{ok:false,msg:"no room to plant here"};}),null):x.no("no room to plant here: find open ground");
}else if(c.tier>=2&&!o.use&&hk==="growstone")o.use=x.op("set the growstone in the ground",go(function(){return W3.setStone(game,c);},"chime"),null);
var id=B&&B.mazeAt?B.mazeAt(game,c):null;
if(id&&!o.pick)o.pick=x.op("search the maze under the lair",go(function(){return B.mazeEnter(game,c,id);},"bonk"),null);
}
});
X.on("vitals",function(game,c){
if(!game||game.offline||!c)return null;
var out=[],g=W3.nose(game,c.x,c.z,3),f=c.chem&&c.chem.hunger>0.5?W3.nose(game,c.x,c.z,0):null,e=W3.eco(game,c.x,c.z);
if(g&&g.v>0.25)out.push({icon:"👃",text:"grump "+(g.here?"close":g.dir),bad:true,tip:"you can smell it. the smell drifts downwind"});
else if(f&&!f.here)out.push({icon:"👃",text:"food "+f.dir,tip:"something to eat, that way"});
if(e<=W3.BARE)out.push({icon:"🏜",text:"barren",bad:true,tip:"felled bare. plant here to mend it"});
else if(e>=W3.LUSH)out.push({icon:"🌸",text:"lush",tip:"well planted: things fruit and seed faster here"});
if(W3.raft(game)&&st(game).raft.go)out.push({icon:"⛵",text:"sailing",tip:"look at the raft to drop anchor"});
return out;
});
X.on("goals",function(game,add){
var B=SB.Bosses;if(!game||!B||!B.state||!game.quests||!game.quests.boss)return;
var l=B.state(game).list;
for(var id in l)if(l[id].beaten&&B.BY[id]&&!(l[id].mz&&l[id].mz.core)){add("search the maze under "+B.BY[id].name+"'s lair (bring a light)","",false);return;}
});
X.tab({id:"land",label:function(){return"🌱 land";},show:function(game,c){return!!c&&c.tier>=1;},html:function(game,c,icon){return W3.html(game,c,icon);},wire:function(root,game,c,redraw,say){W3.wire(root,game,c,redraw,say);}});
}
function pc(v){return Math.round(v*100)+"%";}
W3.html=function(game,c){
var i=W3.info(game,c.x,c.z),s=st(game),B=SB.Bosses,b=W3.raft(game),r=s.raft,out,sm=[],ch=["food","smoke","home","grump"];
out="<div class='lbl'>this patch · "+i.biome+" · "+i.word+(i.turn?" · turning to "+i.turn+" "+i.pct+"%":"")+"</div>";
out+="<p>☀ light "+pc(i.light)+" · 🟤 soil "+pc(i.soil)+" · 💧 wet "+pc(i.wet)+"</p>";
for(var k=0;k<4;k++){var n=W3.nose(game,c.x,c.z,k);if(n)sm.push(ch[k]+" "+(n.here?"here":n.dir));}
out+="<p class='help'>👃 "+(sm.length?sm.join(" · "):"nothing on the wind")+" · island: "+s.fell+" felled, "+s.plant+" planted</p>";
out+="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'><button class='btn' data-w3='mulch' "+(has(c,"leaves",2)?"":"disabled")+">🍃 mulch (2 leaves)</button>";
if(c.tier>=2){
out+="<button class='btn' data-w3='raise'>🛖 stilt hut on the water</button>";
if(!b)out+="<button class='btn' data-w3='deck'>🪵 lay a raft deck (4 logs, 3 vines)</button>";
else if(b.kind!=="houseraft"){if(!r.sail)out+="<button class='btn' data-w3='sail' "+(has(c,"sail")?"":"disabled")+">⛵ rig the sail</button>";if(!r.rud)out+="<button class='btn' data-w3='rudder' "+(has(c,"rudder")?"":"disabled")+">🛶 hang the rudder</button>";}
else out+="<button class='btn' data-w3='"+(r.go===1?"anchor'>⚓ drop anchor":"cast'>⛵ cast off")+"</button>"+(r.cores<3?"<button class='btn' data-w3='core' "+(has(c,"arkcore")?"":"disabled")+">🔷 fit an ark core</button>":"");
}
out+="</div>";
if(b)out+="<p class='help'>⛵ your raft: "+(b.kind==="houseraft"?"afloat"+(r.cores?" · "+r.cores+" ark core"+(r.cores>1?"s":""):""):"deck"+(r.sail?", sail":"")+(r.rud?", rudder":"")+". a sail and a rudder are laid out on the make grid")+" · "+Math.round(SB.dist(c.x,c.z,b.x,b.z))+"m "+dirOf(b.x-c.x,b.z-c.z)+"</p>";
var mid=B&&B.mazeIn?B.mazeIn(game):null;
if(mid)out+="<div class='lbl'>the maze under "+B.BY[mid].name+"'s lair</div><pre style='line-height:1;font-size:18px;margin:4px 0'>"+B.mazeMap(game,mid).join("\n")+"</pre><p class='help'>◆ you · ★ the heart · the three buttons are the three ways</p>";
return out;
};
W3.wire=function(root,game,c,redraw,say){
var F={mulch:function(){return W3.mulch(game,c);},raise:function(){return W3.raise(game,c);},deck:function(){return W3.layDeck(game,c);},sail:function(){return W3.fit(game,c,"sail");},rudder:function(){return W3.fit(game,c,"rudder");},core:function(){return W3.fit(game,c,"core");},cast:function(){return W3.cast(game,c);},anchor:function(){return W3.anchor(game);}};
root.querySelectorAll("[data-w3]").forEach(function(b){b.addEventListener("click",function(){var r=F[b.getAttribute("data-w3")]();if(r&&r.msg&&say)say(r.msg);if(r&&r.ok&&SB.Audio&&SB.Audio.play)SB.Audio.play("craft");redraw();});});
};
var ME=SB.Meshes||SB.ME;
function mdl(parts){
return function(){
var b=ME.builder();
parts.forEach(function(p){
b.color(p[1]).glow(p[8]||0).push().translate(p[2],p[3],p[4]);
if(p[0]==="box")b.box(p[5],p[6],p[7]);else if(p[0]==="cone")b.cone(p[7]||6,p[5],p[6]);else b.cyl(6,p[5],p[6],p[7]);
b.pop();
});
b.glow(0);
return b.finish();
};
}
var WOOD=0x8a5a34,PLK=0xc9935a;
var DECK=[["box",WOOD,-0.7,0.3,0,0.32,0.32,2.4],["box",WOOD,0,0.3,0,0.32,0.32,2.4],["box",WOOD,0.7,0.3,0,0.32,0.32,2.4],["box",PLK,0,0.5,0,1.9,0.08,2.2]];
var SAIL=[["box",WOOD,0,1.6,0.25,0.08,2.2,0.08],["box",0xf2ead8,0,1.9,0.31,1.3,1.2,0.04]];
var RUD=[["box",WOOD,0,0.45,-1.3,0.06,0.5,0.5],["box",WOOD,0,0.75,-1,0.05,0.05,0.6]];
var CABIN=[["box",0xb08a5a,0,0.84,-0.45,1,0.6,0.8],["box",0x7a4a26,0,1.18,-0.45,1.15,0.08,0.95]];
W3.MODELS={
raftdeck:mdl(DECK),raftsail:mdl(DECK.concat(SAIL)),raftrud:mdl(DECK.concat(RUD)),houseraft:mdl(DECK.concat(SAIL,RUD,CABIN)),
stilthut:mdl([["box",WOOD,-0.6,0.45,-0.6,0.1,0.9,0.1],["box",WOOD,0.6,0.45,-0.6,0.1,0.9,0.1],["box",WOOD,-0.6,0.45,0.6,0.1,0.9,0.1],["box",WOOD,0.6,0.45,0.6,0.1,0.9,0.1],
["box",PLK,0,0.93,0,1.6,0.1,1.6],["box",0xb08a5a,0,1.33,0,1.2,0.7,1.2],["cone",0xc9b36a,0,1.68,0,1.05,0.7,4],["box",WOOD,0,0.47,0.86,0.3,0.94,0.05]])
};
W3.NODE_MODELS={jadevein:mdl([["box",0x5a6a5e,0,0.1,0,0.6,0.2,0.5],["cone",0x3fd67a,0.05,0.15,0,0.14,0.75,5,0.7],["cone",0x6ff0a0,-0.2,0.12,0.1,0.1,0.5,5,0.7],["cone",0x2fb86a,0.22,0.12,-0.1,0.09,0.4,5,0.7]])};
if(ME&&ME.builder&&ME.STRUCT_BUILDERS&&ME.NODE_BUILDERS){
try{
for(var mk in W3.MODELS)if(!ME.STRUCT_BUILDERS[mk]){W3.MODELS[mk]();ME.STRUCT_BUILDERS[mk]=W3.MODELS[mk];}
if(!ME.NODE_BUILDERS.jadevein){W3.NODE_MODELS.jadevein();ME.NODE_BUILDERS.jadevein=W3.NODE_MODELS.jadevein;}
}catch(e){}
}
})();
