/* smol brains: genome.js (built from src/genome.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB;
var G=(SB.Genome={});
var GENES=[
["hue","body colour"],["hue2","second colour"],["sat","colour strength"],["light","brightness"],
["pattern","pattern"],["ears","ears"],["eyes","eye size"],["tail","tail"],["body","body shape"],
["size","size"],["cheeks","cheeks"],["antenna","antenna"],["spots","spot layout"],
["hidden","brain size"],["learnRate","learning speed"],["curiosity","curiosity"],["attnLearn","attention learning"],
["memory","memory"],["instinctStrength","instinct strength"],
["bravery","bravery"],["sociability","sociability"],["playfulness","playfulness"],["grumpiness","grumpiness"],
["obedience","obedience"],["chattiness","chattiness"],["appetite","appetite"],["affection","affection"],
["sleepiness","sleepiness"],
["metabolism","metabolism"],["immunity","immunity"],["lifespan","lifespan"],["fertility","fertility"],
["voice","voice pitch"],["coldTolerance","cold tolerance"],["heatTolerance","heat tolerance"],
["speed","walk speed"],["growth","growth rate"],["toughness","toughness"],
["limbs","legs"],["arms","hands"],["cortex","cortex"],["layers","brain layers"],["recall","working memory"],
["planning","planning"],["social","language centre"],["dexterity","dexterity"],["senses","senses"],
["head","head size"],["fins","fins"],["fluff","fluff"],["horns","horns"],["wings","wings"],["glow","inner glow"]
];
G.GENES=GENES.map(function(g){return g[0];});
G.GENE_LABELS={};
GENES.forEach(function(g){G.GENE_LABELS[g[0]]=g[1];});
G.V1_GENES=38;
var EVO=(G.EVO_GENES=["limbs","arms","cortex","layers","recall","planning","social","dexterity","senses","head","fins","fluff","horns","wings","glow"]);
var EVO_SET={};
EVO.forEach(function(n){EVO_SET[n]=1;});
var SPECIES=["smol","grump"];
var GRUMP_INST=[
{drive:"anger",noun:"smol",verb:"hit"},
{drive:"hunger",noun:"food",verb:"eat"},
{drive:"bored",noun:"food",verb:"pickup"},
{drive:"fear",noun:"hand",verb:"flee"},
{drive:"fear",noun:"fire",verb:"flee"},
{drive:"anger",noun:"hand",verb:"hit"},
{drive:"bored",noun:"smol",verb:"hit"}
];
function inst(row,s){return{drive:SB.D[row.drive],noun:SB.N[row.noun],verb:SB.V[row.verb],s:s};}
function q(v){return Math.round(SB.clamp01(v)*255)/255;}
function randInst(rng,s){return{drive:rng.int(SB.N_DRIVES),noun:rng.int(SB.N_NOUNS),verb:rng.int(12),s:s};}
function instKey(i){return i.drive+","+i.noun+","+i.verb;}
G.instName=function(i){return SB.DRIVES[i.drive]+" + "+SB.NOUNS[i.noun]+" → "+SB.VERBS[i.verb];};
G.random=function(rng,opts){
var species=(opts&&opts.species)||"smol";
var grump=species==="grump";
var genes={};
for(var i=0;i<G.GENES.length;i++)genes[G.GENES[i]]=rng();
genes.hidden=grump?rng.range(0.05,0.3):rng.range(0.11,0.56);
genes.learnRate=rng.range(0.25,0.85);
genes.instinctStrength=rng.range(0.35,0.9);
genes.limbs=rng.range(0.16,0.3);genes.arms=rng.range(0,0.25);genes.cortex=rng.range(0,0.14);
genes.layers=rng.range(0,0.18);genes.recall=rng.range(0,0.2);genes.planning=rng.range(0,0.18);
genes.social=rng.range(0.08,0.32);genes.dexterity=rng.range(0,0.3);genes.senses=rng.range(0.1,0.4);
genes.head=rng.range(0,0.25);genes.fins=rng.range(0,0.3);genes.fluff=rng.range(0,0.35);
genes.horns=rng.range(0,0.3);genes.wings=rng.range(0,0.2);genes.glow=rng.range(0,0.15);
if(grump){
genes.hue=rng.chance(0.6)?rng.range(0.72,0.8):rng.range(0.25,0.38);
genes.hue2=genes.hue+rng.range(-0.05,0.05);
genes.sat=rng.range(0.3,0.7);genes.light=rng.range(0,0.4);
genes.grumpiness=rng.range(0.75,1);genes.bravery=rng.range(0.5,1);genes.sociability=rng.range(0,0.3);
genes.antenna=rng.range(0,0.5);genes.cheeks=rng.range(0,0.4);
genes.limbs=rng.range(0.45,0.7);genes.horns=rng.range(0.6,1);genes.arms=rng.range(0.3,0.6);
}else{
genes.grumpiness=rng.range(0,0.6);
genes.light=rng.range(0.2,1);
}
for(var k in genes)genes[k]=q(genes[k]);
var driveW=[];
for(var d=0;d<SB.N_DRIVES;d++)driveW.push(q(rng.range(0.6,1.4)/2)*2);
var instincts=[];
var str=genes.instinctStrength;
if(grump)GRUMP_INST.forEach(function(row){instincts.push(inst(row,q(rng.range(0.6,1))));});
else{
SB.GOOD.forEach(function(row){if(rng.chance(0.65))instincts.push(inst(row,q(rng.range(0.3,1)*(0.5+str))));});
var extra=rng.int(3);
for(var e=0;e<extra;e++)instincts.push(randInst(rng,q(rng.range(0.1,0.35))));
}
return{v:2,species:species,gen:1,genes:genes,driveW:driveW,instincts:dedupe(instincts),mutated:[],clade:0};
};
function dedupe(list){
var seen={},out=[];
for(var i=0;i<list.length;i++){
var k=instKey(list[i]);
if(seen[k]!=null){var o=out[seen[k]];o.s=q(Math.max(o.s,list[i].s));continue;}
seen[k]=out.length;
out.push({drive:list[i].drive,noun:list[i].noun,verb:list[i].verb,s:q(list[i].s)});
}
return out.slice(0,48);
}
G.forTier=function(rng,tier){
var ge=G.random(rng,{species:"smol"}),need=G.TIER_NEEDS;
for(var t=1;t<=tier;t++)for(var k in need[t])if(k!=="neurons"&&k!=="layers")ge.genes[k]=Math.max(ge.genes[k],need[t][k]+0.05);
if(tier>=2){ge.genes.hidden=0.6;ge.genes.cortex=Math.max(ge.genes.cortex,[0,0,0.1,0.35,0.5,0.95,1][tier]);}
if(tier>=4)ge.genes.layers=Math.max(ge.genes.layers,tier>=6?0.85:0.5);
return ge;
};
G.cross=function(a,b,rng,echo,bless,momentum){
var mo=momentum==null?0.3:momentum;
var genes={};
for(var i=0;i<G.GENES.length;i++){
var n=G.GENES[i];
var va=a.genes[n]!=null?a.genes[n]:0.5,vb=b.genes[n]!=null?b.genes[n]:0.5;
genes[n]=q(EVO_SET[n]&&rng.chance(mo)?Math.max(va,vb):rng.chance(0.25)?SB.lerp(va,vb,rng()):rng.chance(0.5)?va:vb);
}
var driveW=[];
for(var d=0;d<SB.N_DRIVES;d++){
var wa=a.driveW[d]!=null?a.driveW[d]:1,wb=b.driveW[d]!=null?b.driveW[d]:1;
driveW.push(rng.chance(0.2)?(wa+wb)/2:rng.chance(0.5)?wa:wb);
}
var byKey={},list=[];
function add(x){
var k=instKey(x);
if(byKey[k]){byKey[k].s=(byKey[k].s+x.s)/2;byKey[k].both=true;return;}
var o={drive:x.drive,noun:x.noun,verb:x.verb,s:x.s};
byKey[k]=o;list.push(o);
}
(a.instincts||[]).forEach(add);
(b.instincts||[]).forEach(add);
var instincts=list.filter(function(o){return o.both||rng.chance(0.55);});
var child={
v:2,species:a.species||"smol",gen:Math.max(a.gen||1,b.gen||1)+1,
genes:genes,driveW:driveW,instincts:dedupe(instincts),mutated:[],
clade:rng.chance(0.5)?a.clade||0:b.clade||0
};
G.mutate(child,rng,0.05,echo,bless);
hered(child,a,b);
if(SB.Collect)SB.Collect.inherit(child,a,b);
return child;
};
G.mutate=function(g,rng,rate,echo,bless){
rate=rate==null?0.05:rate;
var notes=g.mutated||(g.mutated=[]);
function note(s){if(notes.indexOf(s)<0)notes.push(s);}
var i,n,old;
for(i=0;i<G.GENES.length;i++){
n=G.GENES[i];
if(EVO_SET[n])continue;
if(rng.chance(rate)){
old=g.genes[n];
g.genes[n]=q(old+rng.gauss()*0.12);
if(Math.abs(g.genes[n]-old)>0.02)note(G.GENE_LABELS[n]);
}
}
var grump=g.species==="grump";
for(i=0;i<EVO.length;i++){
n=EVO[i];
old=g.genes[n];
var v=old;
if(!grump&&echo&&echo[n]>0)v+=(n==="arms"?0.32:0.24)*Math.min(1.8,echo[n])*(1.1-v);
if(!grump&&echo)v+=0.01;
if(!grump&&bless&&bless[n])v+=bless[n]*(0.6+0.9*Math.min(1,(echo&&echo[n])||0))*(1.05-v);
if(rng.chance(0.3))v+=rng.gauss()*0.05;
g.genes[n]=q(v);
var dv=g.genes[n]-old;
if(dv>0.03)note("more "+G.GENE_LABELS[n]);
else if(dv<-0.03)note("less "+G.GENE_LABELS[n]);
}
if(!grump&&rng.chance(0.03)){
var leap=rng.pick(EVO);
g.genes[leap]=q(g.genes[leap]+rng.range(0.12,0.25));
note("big leap: "+G.GENE_LABELS[leap]);
g.leap=leap;
}
if(rng.chance(0.02)){
var big=rng.pick(G.GENES.slice(0,G.V1_GENES));
g.genes[big]=q(rng());
note("big mutation: "+G.GENE_LABELS[big]);
}
for(var d=0;d<SB.N_DRIVES;d++){
if(rng.chance(rate*0.5)){
g.driveW[d]=SB.clamp(g.driveW[d]+rng.gauss()*0.15,0.3,1.9);
note(SB.DRIVES[d]+" sensitivity");
}
}
var ins=g.instincts;
for(var j=ins.length-1;j>=0;j--){
if(!rng.chance(rate*1.5))continue;
var x=ins[j],r=rng();
if(r<0.3){ins.splice(j,1);note("lost instinct: "+G.instName(x));}
else if(r<0.55){
var dup={drive:x.drive,noun:x.noun,verb:x.verb,s:q(x.s*rng.range(0.6,1.1))};
if(rng.chance(0.5))dup.noun=rng.int(SB.N_NOUNS);else dup.drive=rng.int(SB.N_DRIVES);
ins.push(dup);note("new instinct: "+G.instName(dup));
}else if(r<0.8){x.verb=rng.int(12);note("rewired instinct: "+G.instName(x));}
else if(r<0.9){x.noun=rng.int(SB.N_NOUNS);note("rewired instinct: "+G.instName(x));}
else{x.s=q(x.s+rng.gauss()*0.25);note("instinct strength");}
}
if(rng.chance(rate)){var nw=randInst(rng,q(rng.range(0.15,0.5)));ins.push(nw);note("new instinct: "+G.instName(nw));}
g.instincts=dedupe(ins);
return g;
};
function gv(g,n,d){return g.genes[n]!=null?g.genes[n]:d;}
G.layers=function(g){
var l1=Math.round(6+SB.clamp01(gv(g,"hidden",0.3))*18+gv(g,"cortex",0)*36);
var nl=1+(gv(g,"layers",0)>=0.4?1:0)+(gv(g,"layers",0)>=0.8?1:0);
var out=[l1];
if(nl>=2)out.push(Math.max(6,Math.round(l1*(0.45+gv(g,"cortex",0)*0.4))));
if(nl>=3)out.push(Math.max(6,Math.round(out[1]*0.75)));
return out;
};
G.nHid=function(g){return G.layers(g)[0];};
G.memUnits=function(g){return Math.round(gv(g,"recall",0)*12);};
G.neurons=function(g){var l=G.layers(g),s=0;for(var i=0;i<l.length;i++)s+=l[i];return s+G.memUnits(g);};
G.planDepth=function(g){var p=gv(g,"planning",0);return p<0.3?0:p<0.55?1:p<0.8?2:3;};
G.TIER_NEEDS=[
null,
{limbs:0.35,neurons:0},
{arms:0.5,neurons:16},
{social:0.5,neurons:28},
{planning:0.45,layers:2,neurons:36},
{head:0.5,recall:0.5,neurons:58},
{glow:0.6,layers:3,neurons:88}
];
G.tierOf=function(g){
if(!g||g.species==="grump")return 1;
var neurons=G.neurons(g),nl=G.layers(g).length,t=0;
for(var i=1;i<G.TIER_NEEDS.length;i++){
var need=G.TIER_NEEDS[i],ok=neurons>=need.neurons&&(!need.layers||nl>=need.layers);
for(var k in need)if(k!=="neurons"&&k!=="layers"&&gv(g,k,0)<need[k])ok=false;
if(!ok)break;
t=i;
}
return t;
};
G.nextNeeds=function(g){
var t=G.tierOf(g);
if(t>=G.TIER_NEEDS.length-1)return[];
var need=G.TIER_NEEDS[t+1],out=[];
for(var k in need){
if(k==="neurons"){var nn=G.neurons(g);if(nn<need.neurons)out.push({gene:"neurons",label:"neurons",have:nn,need:need.neurons});}
else if(k==="layers"){var nl=G.layers(g).length;if(nl<need.layers)out.push({gene:"layers",label:"brain layers",have:nl,need:need.layers});}
else if(gv(g,k,0)<need[k])out.push({gene:k,label:G.GENE_LABELS[k],have:gv(g,k,0),need:need[k]});
}
return out;
};
G.look=function(g){
var e=g.genes,grump=g.species==="grump";
var tier=G.tierOf(g);
var limbs=gv(g,"limbs",0),arms=gv(g,"arms",0);
var cx=SB.Collect&&!grump?SB.Collect.ensure(g):null,sc=cx?SB.Collect.entry("size",cx.size)[0]:"";
var szK=sc==="teacup"?0.74:sc==="tiny"?0.88:sc==="titan"?1.16:1,bodyK=sc==="chonky"?0.16:0;
return{
cx:cx,cxKey:cx?[cx.pat,cx.eye,cx.acc,cx.pal,cx.size,cx.f<0.07?1:cx.f>0.85?2:0].join(""):"",
species:g.species,tier:tier,
hue:Math.round(e.hue*360)%360,
hue2:Math.round(e.hue2*360)%360,
sat:grump?25+e.sat*40:45+e.sat*50,
light:grump?22+e.light*20:50+e.light*24,
pattern:Math.min(3,Math.floor(e.pattern*4)),
ears:Math.min(4,Math.floor(e.ears*5)),
eyes:0.6+e.eyes*0.8,
tail:Math.min(3,Math.floor(e.tail*4)),
body:Math.min(1.35,0.8+e.body*0.45+bodyK),
size:(0.85+e.size*0.35)*szK,
spotsSeed:Math.floor(e.spots*65535)+1,
cheeks:e.cheeks>0.5,
antenna:e.antenna>0.8,
legs:limbs<0.35?0:limbs<0.72?2:4,
legLen:0.25+limbs*0.5,
arms:arms>=0.5,
armLen:0.3+arms*0.4,
head:gv(g,"head",0),
brainy:tier>=5,
fins:gv(g,"fins",0)>0.6,
fluff:gv(g,"fluff",0)>0.6,
horns:gv(g,"horns",0)>0.7||grump,
wings:gv(g,"wings",0)>0.72,
glow:tier>=6?1:gv(g,"glow",0)>0.6?gv(g,"glow",0)*0.6:0,
halo:tier>=6
};
};
var TRAITS=[
["curiosity","curious","cautious"],["bravery","brave","timid"],["chattiness","chatty","quiet"],
["appetite","big eater","picky eater"],["sleepiness","sleepyhead","night owl"],
["learnRate","quick learner","slow learner"],["immunity","tough","fragile"],
["affection","huggy","aloof"],["sociability","social","loner"],["grumpiness","grumpy","sunny"],
["hidden","big brain","smol brain"],["playfulness","playful","chill"],["obedience","obedient","stubborn"],
["memory","good memory","forgetful"],["metabolism","hyper","lazy"],["lifespan","long-lived","short-lived"],
["speed","zoomy","slowpoke"],["coldTolerance","fluffy","chilly"],["dexterity","nimble fingers",null],
["planning","planner",null],["fins","swimmer",null]
];
G.traits=function(g){
var c=[];
for(var i=0;i<TRAITS.length;i++){
var t=TRAITS[i],v=g.genes[t[0]];
if(v==null)continue;
if(t[0]==="hidden")v=SB.clamp01((v-0.11)/0.45);
var w=v>=0.5?t[1]:t[2];
if(!w)continue;
c.push({w:w,d:Math.abs(v-0.5)});
}
c.sort(function(a,b){return b.d-a.d;});
var out=[];
for(var j=0;j<c.length&&out.length<5;j++)if(out.length<3||c[j].d>0.38)out.push(c[j].w);
if(g.species==="grump"&&out.indexOf("grumpy")<0)out[out.length-1]="grumpy";
return out;
};
G.CMP=EVO.concat(["bravery","sociability","playfulness","grumpiness","obedience","chattiness","affection","curiosity","size","speed","toughness"]);
G.snap=function(g){
var s="";
for(var i=0;i<G.CMP.length;i++){var v=Math.round(SB.clamp01(g.genes[G.CMP[i]]||0)*255);s+=(v<16?"0":"")+v.toString(16);}
return s;
};
G.unsnap=function(s){
if(typeof s!=="string"||s.length<2)return null;
var out={};
for(var i=0;i<G.CMP.length&&i*2+1<s.length;i++){var v=parseInt(s.substr(i*2,2),16);if(!isNaN(v))out[G.CMP[i]]=v/255;}
return out;
};
G.compare=function(me,parents){
var ps=(parents||[]).filter(Boolean);
if(!ps.length)return[];
return G.CMP.map(function(k){
var vs=ps.map(function(p){return p[k];}).filter(function(v){return v!=null;});
if(!vs.length)return null;
var avg=vs.reduce(function(a,b){return a+b;},0)/vs.length,v=me[k]||0;
return{gene:k,label:G.GENE_LABELS[k],me:v,ps:vs,avg:avg,d:v-avg,beyond:v>Math.max.apply(null,vs)+0.02?1:v<Math.min.apply(null,vs)-0.02?-1:0};
}).filter(Boolean);
};
G.distance=function(a,b){
var s=0,n=0;
for(var i=0;i<G.GENES.length;i++){
var k=G.GENES[i],w=EVO_SET[k]?2:k==="hue"||k==="hue2"?0.6:0.4;
var d=Math.abs((a.genes[k]||0)-(b.genes[k]||0));
if(k==="hue"||k==="hue2")d=Math.min(d,1-d)*2;
s+=d*w;n+=w;
}
return s/n;
};
var B64="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
var B64I={};
for(var bi=0;bi<64;bi++)B64I[B64[bi]]=bi;
G.b64enc=function(bytes){
var s="",n=bytes.length;
for(var i=0;i<n;i+=3){
var a=bytes[i],b=i+1<n?bytes[i+1]:0,c=i+2<n?bytes[i+2]:0;
var t=(a<<16)|(b<<8)|c;
s+=B64[(t>>18)&63]+B64[(t>>12)&63];
if(i+1<n)s+=B64[(t>>6)&63];
if(i+2<n)s+=B64[t&63];
}
return s;
};
G.b64dec=function(str){
str=String(str).replace(/[=\s]/g,"").replace(/\+/g,"-").replace(/\//g,"_");
var n=Math.floor(str.length*3/4),out=new Uint8Array(n),o=0;
for(var i=0;i<str.length;i+=4){
var t=0,k;
for(k=0;k<4;k++){
var ch=str[i+k],v=ch==null?0:B64I[ch];
if(v==null)throw new Error("bad base64");
t=(t<<6)|v;
}
if(o<n)out[o++]=(t>>16)&255;
if(o<n)out[o++]=(t>>8)&255;
if(o<n)out[o++]=t&255;
}
return out;
};
function byte(v){return Math.round(SB.clamp01(v)*255);}
G.encode=function(g){
var b=[2,Math.max(0,SPECIES.indexOf(g.species)),(g.gen>>8)&255,g.gen&255,G.GENES.length];
for(var i=0;i<G.GENES.length;i++)b.push(byte(g.genes[G.GENES[i]]));
for(var d=0;d<SB.N_DRIVES;d++)b.push(byte((g.driveW[d]!=null?g.driveW[d]:1)/2));
var ins=g.instincts.slice(0,255);
b.push(ins.length);
ins.forEach(function(x){b.push(x.drive&255,x.noun&255,x.verb&255,byte(x.s));});
var cl=g.clade||0;
b.push((cl>>8)&255,cl&255);
if(SB.Collect)SB.Collect.encodeInto(b,g);
encX(b,g);
return G.b64enc(b);
};
var V1_NOUNS=["hand","smol","grump","food","mushroom","toy","ball","music","bed","medicine","snackbox","egg","computer","bug","plant","gadget"];
var V1_TO_V2={music:"toy",bed:"shelter",snackbox:"food",computer:"totem",gadget:"fire"};
G.v1Noun=function(i){var n=V1_NOUNS[i];if(n==null)return-1;n=V1_TO_V2[n]||n;return SB.N[n]!=null?SB.N[n]:-1;};
G.decode=function(str){
var b=G.b64dec(str),p=0;
var ver=b[p++];
if(ver!==1&&ver!==2)throw new Error("unknown genome version");
var species=SPECIES[b[p++]]||"smol";
var gen=(b[p++]<<8)|b[p++];
var ng=b[p++],genes={};
for(var i=0;i<ng;i++){var v=b[p++]/255;if(i<G.GENES.length)genes[G.GENES[i]]=v;}
var fresh=G.random(SB.rng((gen+7)*31+ng),{species:species}).genes;
for(var j=ng;j<G.GENES.length;j++)genes[G.GENES[j]]=fresh[G.GENES[j]];
var driveW=[];
for(var d=0;d<SB.N_DRIVES;d++)driveW.push(b[p++]/255*2);
var ni=b[p++],instincts=[];
for(var k=0;k<ni;k++){
var x={drive:b[p++],noun:b[p++],verb:b[p++],s:b[p++]/255};
if(ver===1)x.noun=G.v1Noun(x.noun);
if(x.drive<SB.N_DRIVES&&x.noun>=0&&x.noun<SB.N_NOUNS&&x.verb<SB.N_VERBS)instincts.push(x);
}
var clade=0;
if(ver>=2&&p+1<b.length+1){clade=((b[p++]||0)<<8)|(b[p++]||0);}
if(p>b.length)throw new Error("genome code is cut short");
var out={v:2,species:species,gen:gen||1,genes:genes,driveW:driveW,instincts:instincts,mutated:[],clade:clade};
var cx=SB.Collect&&ver>=2?SB.Collect.decodeFrom(b,p):null;
if(cx&&species!=="grump")out.cx=cx;
if(ver>=2)decX(b,b[p]===0xc7&&SB.Collect?p+5+SB.Collect.SLOTS.length:p,out);
return out;
};
var RULES=[
["trace","trace length",0.5],["forget","forgetting",0],["prune","pruning",0],["tract","tract",0],
["hlFear","fear half-life",0.5],["hlPain","pain half-life",0.5],["hlAnger","anger half-life",0.5],["hlReward","reward half-life",0.5],
["hlToxin","toxin half-life",0.5],["hlMedicine","medicine half-life",0.5],["hlAntibody","antibody half-life",0.5],
["thStarve","starving point",0.5],["thPain","pain point",0.5],["thTemp","weather point",0.5],["thSick","sickness point",0.5],["thLove","love point",0.5],
["rxFat","fat burning",0.5],["rxStore","fat storing",0.5]
];
var RI={};
G.RULES=RULES.map(function(r,i){RI[r[0]]=i;return r[0];});
G.RULE_LABELS={};
RULES.forEach(function(r){G.RULE_LABELS[r[0]]=r[1];});
G.ruleDefault=function(n){return RULES[RI[n]][2];};
G.rule=function(g,n){var r=g&&g.rule;return r&&r[n]!=null?r[n]:RULES[RI[n]][2];};
G.setRule=function(g,n,v){
if(RI[n]==null)return;
var r=g.rule||(g.rule={});
if(byte(v)===byte(RULES[RI[n]][2]))delete r[n];else r[n]=q(v);
if(g._ck)g._ck=null;
};
G.half=function(g,n){return Math.pow(2,1-2*G.rule(g,n));};
G.point=function(g,n,base,span){return base+(G.rule(g,n)-0.5)*span;};
G.TRACTS=["","feelings","sights","heard words","touch and smell"];
G.tract=function(g){var v=G.rule(g,"tract");return v<0.2?0:Math.min(4,1+Math.floor((v-0.2)/0.2));};
G.CHEMS=SB.DRIVES.concat(["glucose","fat","reward","punish","adrenaline","toxin","antigen","antibody","medicine"]);
var RXPOOL=[["adrenaline","glucose",0],["reward","pain",2],["glucose","sleepy",3],["medicine","antibody",1],["toxin","pain",0],
["fat","cold",2],["punish","adrenaline",0],["reward","bored",2],["adrenaline","tired",2],["antigen","sleepy",0]];
G.RX_MAX=4;
G.rxName=function(r){return G.CHEMS[r.a]+(r.f&2?" lowers ":" makes ")+G.CHEMS[r.b];};
function rxOk(r){return r&&r.a>=0&&r.a<G.CHEMS.length&&r.b>=0&&r.b<G.CHEMS.length&&r.a!==r.b;}
G.rxFromPool=function(i,k){var t=RXPOOL[i%RXPOOL.length];return{a:G.CHEMS.indexOf(t[0]),b:G.CHEMS.indexOf(t[1]),f:t[2],k:q(k==null?0.5:k)};};
G.RX_POOL=RXPOOL.length;
G.dominant=function(n,x,y){return G.GENES.indexOf(n)%2===0?Math.max(x,y):Math.min(x,y);};
G.carried=function(g){
var out=[],alt=(g&&g.alt)||{};
for(var n in alt)if(g.genes[n]!=null&&Math.abs(alt[n]-g.genes[n])>0.15)out.push({gene:n,label:G.GENE_LABELS[n],v:alt[n],shows:g.genes[n]});
out.sort(function(x,y){return Math.abs(y.v-y.shows)-Math.abs(x.v-x.shows);});
return out;
};
function hered(child,a,b){
var h=2166136261,i,n,notes=child.mutated;
for(i=0;i<G.GENES.length;i++)h=Math.imul(h^byte(child.genes[G.GENES[i]]),16777619);
var r=SB.rng(((h^(child.gen*7919))>>>0)||1),alt={},rule={},any=false;
function note(s){if(notes.indexOf(s)<0)notes.push(s);}
for(i=0;i<G.GENES.length;i++){
n=G.GENES[i];
if(EVO_SET[n])continue;
var va=a.genes[n]!=null?a.genes[n]:0.5,vb=b.genes[n]!=null?b.genes[n]:0.5;
var ha=a.alt&&a.alt[n],hb=b.alt&&b.alt[n],e=child.genes[n],o;
var ca=ha!=null&&r.chance(0.35)?ha:va,cb=hb!=null&&r.chance(0.35)?hb:vb;
if(ca!==va||cb!==vb){
var d=q(G.dominant(n,ca,cb));
o=d===q(ca)?cb:ca;
if(Math.abs(d-e)>0.1)note("hidden gene showed: "+G.GENE_LABELS[n]);
child.genes[n]=e=d;
}else o=Math.abs(va-e)>=Math.abs(vb-e)?va:vb;
if(Math.abs(o-e)>0.12)alt[n]=q(o);
}
child.alt=alt;
for(i=0;i<RULES.length;i++){
n=RULES[i][0];
var v=r.chance(0.5)?G.rule(a,n):G.rule(b,n);
if(r.chance(0.06)){v=q(v+r.gauss()*0.15);note(RULES[i][1]);}
if(byte(v)!==byte(RULES[i][2])){rule[n]=v;any=true;}
}
if(any)child.rule=rule;
var rx=[];
(a.rx||[]).concat(b.rx||[]).forEach(function(x){
if(!rxOk(x)||rx.length>=G.RX_MAX||rx.some(function(y){return y.a===x.a&&y.b===x.b;})||!r.chance(0.6))return;
rx.push({a:x.a,b:x.b,f:x.f&3,k:x.k});
});
if(rx.length&&r.chance(0.04))note("lost reaction: "+G.rxName(rx.pop()));
if(rx.length<G.RX_MAX&&r.chance(0.05)){
var nw=G.rxFromPool(r.int(RXPOOL.length),r.range(0.2,0.8));
if(!rx.some(function(y){return y.a===nw.a&&y.b===nw.b;})){rx.push(nw);note("new reaction: "+G.rxName(nw));}
}
if(rx.length)child.rx=rx;
}
function encX(b,g){
var p=[],i,n,at=0,c=0;
p.push(0);
for(i=0;i<RULES.length;i++){n=RULES[i][0];if(g.rule&&g.rule[n]!=null&&byte(g.rule[n])!==byte(RULES[i][2])){p.push(i,byte(g.rule[n]));c++;}}
p[at]=c;at=p.length;p.push(0);c=0;
for(i=0;i<G.GENES.length;i++){n=G.GENES[i];if(g.alt&&g.alt[n]!=null){p.push(i,byte(g.alt[n]));c++;}}
p[at]=c;
var rx=(g.rx||[]).filter(rxOk).slice(0,G.RX_MAX);
p.push(rx.length);
rx.forEach(function(x){p.push(x.a,x.b,x.f&3,byte(x.k));});
if(p.length<=3||p.length>255)return;
b.push(0xb3,p.length);
for(i=0;i<p.length;i++)b.push(p[i]);
}
function decX(b,p,out){
if(b[p]!==0xb3||p+2+b[p+1]>b.length)return;
var end=p+2+b[p+1],k,c;
p+=2;
for(c=b[p++];c>0&&p+1<end;c--,p+=2)if(RULES[b[p]]&&b[p+1]!==byte(RULES[b[p]][2]))(out.rule||(out.rule={}))[RULES[b[p]][0]]=b[p+1]/255;
for(c=b[p++];c>0&&p+1<end;c--,p+=2)if(G.GENES[b[p]])(out.alt||(out.alt={}))[G.GENES[b[p]]]=b[p+1]/255;
for(c=b[p++];c>0&&p+3<end;c--,p+=4){k={a:b[p],b:b[p+1],f:b[p+2]&3,k:b[p+3]/255};if(rxOk(k))(out.rx||(out.rx=[])).push(k);}
}
G.upgrade=function(g){
if(!g||g.v===2)return g;
var fresh=G.random(SB.rng(((g.gen||1)*977+13)>>>0),{species:g.species||"smol"}).genes;
var genes={};
for(var i=0;i<G.GENES.length;i++){var n=G.GENES[i];genes[n]=g.genes&&g.genes[n]!=null?g.genes[n]:fresh[n];}
var instincts=(g.instincts||[]).map(function(x){return{drive:x.drive,noun:G.v1Noun(x.noun),verb:x.verb,s:x.s};})
.filter(function(x){return x.noun>=0&&x.drive<SB.N_DRIVES&&x.verb<12;});
return{v:2,species:g.species||"smol",gen:g.gen||1,genes:genes,driveW:(g.driveW||[]).slice(0,SB.N_DRIVES),instincts:dedupe(instincts),mutated:[],clade:0};
};
})();
