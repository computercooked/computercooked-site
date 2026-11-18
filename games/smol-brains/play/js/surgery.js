/* smol brains: surgery.js (built from src/surgery.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB,S=SB.Surgery={};
S.COST=4;
S.PER_DAY=3;
S.MAX=16;
S.STEP=0.2;
S.CARE=0.25;
S.DREAM=220;
function D(i){return SB.DRIVES[i];}
function seedRng(){return SB.rng((Math.random()*4294967296)>>>0);}
function esc(s){return String(s).replace(/[&<>"']/g,function(m){return"&#"+m.charCodeAt(0)+";";});}
S.text=function(it){
return"when "+SB.DRIVE_EMOJI[it.drive]+" "+SB.DRIVE_WORDS[it.drive]+" and it sees "+SB.NOUN_EMOJI[it.noun]+" "+SB.NOUN_WORDS[it.noun]+" → "+SB.VERB_EMOJI[it.verb]+" "+SB.VERB_WORDS[it.verb];
};
S.list=function(c){
return(c.genome.instincts||[]).map(function(it,i){return{i:i,drive:it.drive,noun:it.noun,verb:it.verb,s:it.s,text:S.text(it)};})
.sort(function(a,b){return b.s-a.s;});
};
function ctx(b,drive,noun){
var x=new Float32Array(b.nIn);
for(var i=0;i<SB.N_DRIVES;i++)x[SB.IN.DRIVE0+i]=0.15;
x[SB.IN.DRIVE0+drive]=0.85;x[SB.IN.NOUN0+noun]=1;x[SB.IN.NEAR]=1;x[SB.IN.BIAS]=1;
return x;
}
S.q=function(c,it){var b=c.brain;return SB.Brain.qOf(b,ctx(b,it.drive,it.noun),it.verb);};
S.rank=function(c,it){
var b=c.brain,x=ctx(b,it.drive,it.noun),mine=SB.Brain.qOf(b,x,it.verb),r=0;
for(var v=0;v<SB.N_VERBS;v++)if(v!==it.verb&&SB.VERB_TIER[v]<=c.tier&&SB.Brain.qOf(b,x,v)>mine)r++;
return r;
};
S.pull=function(c,it){var r=S.rank(c,it);return r===0?"does it":r<=2?"sometimes":"rarely";};
S.why=function(game,c){
if(!c||!c.alive||c.species!=="smol")return"only a living smol can have brain surgery";
if(c.stage<1)return"it's still an egg";
var ps=SB.Possess&&SB.Possess.state?SB.Possess.state():null;
if(ps&&ps.c===c)return"not while you're inside it";
if(S.left(game,c)<=0)return c.name+" has had enough for today. let it sleep it off";
return"";
};
S.left=function(game,c){
var day=Math.floor(game.time/SB.DAY_LENGTH),s=c.surg;
return S.PER_DAY-(s&&s.day===day?s.n:0);
};
S.cost=function(game){return SB.Game.miracleCost?SB.Game.miracleCost(game,S.COST):S.COST;};
S.operate=function(game,c,op){
var no=S.why(game,c);
if(no)return{ok:false,why:no};
var g=c.genome,ins=g.instincts||(g.instincts=[]),it=null,msg="",n0=ins.length;
if(op.kind==="up"||op.kind==="down"||op.kind==="cut"){
it=ins[op.i];
if(!it)return{ok:false,why:"that instinct is gone"};
if(op.kind==="up"&&it.s>=1)return{ok:false,why:"it can't get any stronger"};
}else if(op.kind==="add"){
if(!(op.drive>=0&&op.drive<SB.N_DRIVES&&op.noun>=0&&op.noun<SB.N_NOUNS&&op.verb>=0&&op.verb<SB.N_VERBS))return{ok:false,why:"pick a feeling, a thing and an action"};
if(SB.VERB_TIER[op.verb]>c.tier)return{ok:false,why:"a "+SB.TIERS[c.tier].name+" can't "+SB.VERB_WORDS[op.verb]+" yet"};
if(ins.some(function(x){return x.drive===op.drive&&x.noun===op.noun&&x.verb===op.verb;}))return{ok:false,why:"it already has that one: make it stronger instead"};
if(n0>=S.MAX)return{ok:false,why:"its brain is full of instincts. cut one first"};
}else if(op.kind==="care"){
if(!(op.drive>=0&&op.drive<SB.N_DRIVES))return{ok:false,why:"pick a feeling"};
var w0=g.driveW[op.drive]!=null?g.driveW[op.drive]:1;
if((op.dir>0&&w0>=1.9)||(op.dir<0&&w0<=0.3))return{ok:false,why:"that's as far as it goes"};
}else if(op.kind==="rule"){
if(SB.Genome.RULES.indexOf(op.name)<0)return{ok:false,why:"pick a gene"};
var r0=SB.Genome.rule(g,op.name);
if((op.dir>0&&r0>=1)||(op.dir<0&&r0<=0))return{ok:false,why:"that's as far as it goes"};
}else return{ok:false,why:"unknown operation"};
if(!SB.Game.spend(game,S.cost(game)))return{ok:false,why:"not enough sparks ✨"};
var rng=seedRng();
if(op.kind==="up"||op.kind==="down"){
it.s=SB.clamp01(Math.round((it.s+(op.kind==="up"?S.STEP:-S.STEP))*100)/100);
SB.Brain.dream(c.brain,[it],S.DREAM,rng);
msg=(op.kind==="up"?"stronger: ":"weaker: ")+S.text(it);
if(it.s<=0.02){ins.splice(op.i,1);msg="faded out: "+S.text(it);}
}else if(op.kind==="cut"){
SB.Brain.dream(c.brain,[{drive:it.drive,noun:it.noun,verb:it.verb,s:0}],S.DREAM,rng);
ins.splice(op.i,1);
msg="cut out: "+S.text(it);
}else if(op.kind==="add"){
it={drive:op.drive,noun:op.noun,verb:op.verb,s:0.6};
ins.push(it);
SB.Brain.dream(c.brain,[it],S.DREAM,rng);
msg="new instinct: "+S.text(it);
}else if(op.kind==="rule"){
SB.Genome.setRule(g,op.name,SB.clamp01(SB.Genome.rule(g,op.name)+op.dir*S.RULE));
SB.Brain.retune(c.brain,g);
msg=(op.dir>0?"more ":"less ")+SB.Genome.RULE_LABELS[op.name];
}else{
var w=g.driveW[op.drive]!=null?g.driveW[op.drive]:1;
g.driveW[op.drive]=Math.round(SB.clamp(w+op.dir*S.CARE,0.3,1.9)*100)/100;
msg=(op.dir>0?"cares more about ":"cares less about ")+SB.DRIVE_EMOJI[op.drive]+" "+SB.DRIVE_WORDS[op.drive];
}
var day=Math.floor(game.time/SB.DAY_LENGTH);
if(!c.surg||c.surg.day!==day)c.surg={day:day,n:0,total:(c.surg&&c.surg.total)||0};
c.surg.n++;c.surg.total=(c.surg.total||0)+1;
if(SB.Chem&&SB.Chem.apply)SB.Chem.apply(c.chem,{sleepy:0.25,tired:0.1});
if(SB.Creature&&SB.Creature.say&&!game.headless)SB.Creature.say(c,"…huh?",game);
game.stats=game.stats||{};game.stats.surgeries=(game.stats.surgeries||0)+1;
SB.bus.emit("surgery",{c:c,op:op,msg:msg});
return{ok:true,msg:msg};
};
S.RULE=0.15;
S.lab=function(c){
var b=c.brain,B=SB.Brain,G=SB.Genome;
return{lobes:B.lobes(b,c.genome),situations:B.situations(b,4),shortTerm:B.shortTerm(b),pruned:b.pruned,regrown:b.regrown,
tract:G.TRACTS[b.tract]||"",carried:G.carried(c.genome),reactions:SB.Chem.reactions(c.genome)};
};
S.sitText=function(s){return"when "+s.when.join(" + ")+" → "+SB.VERB_EMOJI[s.verb]+" "+SB.VERB_WORDS[s.verb];};
S.fire=function(game,c,i){
var b=c&&c.brain;
if(!b||!c.alive||!(i>=0&&i<b.nIn))return{ok:false,why:"pick an input"};
var p=SB.Brain.poke(b,i,1);
SB.Brain.fire(b,i,1,3);
c.thinkT=Math.min(c.thinkT||0,0.2);
return{ok:true,verb:p.verb,d:p.d,msg:"\""+SB.Brain.inputLabel(b,i)+"\" on its own pulls "+c.name+" toward "+SB.VERB_EMOJI[p.verb]+" "+SB.VERB_WORDS[p.verb]+". it is on for its next 3 thoughts. the island waits while this window is open: close it to watch"};
};
function labHtml(c,dis){
var L=S.lab(c),b=c.brain,G=SB.Genome,h="<details class='lab'><summary>the lab: lobes, situations, fire an input</summary><div class='lobes'>";
L.lobes.forEach(function(l){
h+="<i style='left:"+Math.round(l.x*100)+"%;top:"+Math.round(l.y*100)+"%;opacity:"+(0.45+0.55*l.act).toFixed(2)+";font-size:"+Math.round(8+3*l.size)+"px'>"+esc(l.name)+" "+l.n+"</i>";
});
h+="</div><p class='note'>each lobe sits where its genes put it, and lights up as it works. "+Math.round(L.shortTerm*100)+"% of what it knows is still short-term (sleep keeps it). asleep it has pruned "+L.pruned+" weak links and regrown "+L.regrown+"."
+(L.tract?" a tract wires its "+esc(L.tract)+" straight to its actions.":"")+"</p><h4>situations it knows right now</h4>";
L.situations.forEach(function(s){h+="<div class='row'><div class='t'>"+esc(S.sitText(s))+"</div></div>";});
h+="<h4>fire one input</h4><p class='note'>the island holds still while this window is open. what you fire starts when you close it.</p><div class='add'><select data-k='fire'>";
for(var i=0;i<b.nIn;i++)if(i!==SB.IN.BIAS)h+="<option value='"+i+"'>"+esc(SB.Brain.inputLabel(b,i))+"</option>";
h+="</select> <button class='go' data-op='fire'>⚡ fire</button></div></details>";
h+="<details class='lab'><summary>rule genes: learning, half-lives, thresholds, reactions</summary>";
if(L.carried.length)h+="<p class='note'>hidden copies it carries (a kid may show them): "+L.carried.slice(0,6).map(function(x){return esc(x.label)+" "+Math.round(x.v*100);}).join(" · ")+"</p>";
h+="<div class='cares'>";
G.RULES.forEach(function(n){
h+="<div class='row'><div class='t'>"+esc(G.RULE_LABELS[n])+"<small>"+Math.round(G.rule(c.genome,n)*100)+"</small></div><button data-op='rule' data-n='"+n+"' data-dir='-1'"+dis+">−</button><button data-op='rule' data-n='"+n+"' data-dir='1'"+dis+">+</button></div>";
});
return h+"</div><p class='note'>reactions in its body: "+L.reactions.map(esc).join(" · ")+".</p></details>";
}
S.labHtml=labHtml;
var cur=null;
S.open=function(game,c){
if(!SB.UI||!SB.UI.modal||typeof document==="undefined")return;
var root=document.createElement("div");
root.className="surg";
cur={game:game,c:c,root:root};
draw();
root.addEventListener("click",click);
SB.UI.modal("🔪 "+c.name+"'s brain surgery",root,{big:true});
};
function draw(){
if(!cur)return;
var game=cur.game,c=cur.c,why=S.why(game,c),cost=S.cost(game),dis=why?" disabled":"";
var h="<style>.surg{font-size:13px;line-height:1.45}.surg .row{display:flex;gap:6px;align-items:center;padding:6px;background:rgba(255,255,255,.04);margin:3px 0}"
+".surg .row .t{flex:1;min-width:0}.surg .row small{display:block;opacity:.7}.surg .bar{height:5px;background:rgba(255,255,255,.1);margin-top:3px}.surg .bar i{display:block;height:100%;background:#c5ff49}"
+".surg button{font:700 12px var(--mono,monospace);padding:6px 9px;border:0;background:rgba(255,255,255,.1);color:inherit;cursor:pointer}.surg button.go{background:#c5ff49;color:#101114}.surg button[disabled]{opacity:.4;cursor:default}"
+".surg select{font:600 12px var(--mono,monospace);padding:5px;background:#1d1828;color:inherit;border:1px solid rgba(255,255,255,.2);max-width:100%}.surg .add{display:flex;flex-wrap:wrap;gap:6px;align-items:center}"
+".surg .lobes{position:relative;height:170px;margin:6px 0;background:rgba(255,255,255,.04)}.surg .lobes i{position:absolute;transform:translate(-50%,-50%);font-style:normal;white-space:nowrap;padding:2px 4px;background:rgba(197,255,73,.16)}.surg details{margin-top:10px}.surg summary{cursor:pointer;font:700 12px var(--mono,monospace)}"
+".surg .cares{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px}.surg .cares .row{margin:0}.surg h4{margin:12px 0 4px;font:700 12px var(--mono,monospace);opacity:.75}</style>";
h+="<p class='note'>its instincts are the rules it was born with: when it feels something and sees something, it leans toward an action. rewrite them here. the net is retrained on the spot, and its kids inherit the change. each operation costs <b>"+cost+" ✨</b> (you have "+(game.sparks||0)+"); "+esc(c.name)+" can take "+S.left(game,c)+" more today and wakes up sleepy.</p>";
if(why)h+="<p class='note' style='color:#ff9a9a'>"+esc(why)+"</p>";
var L=S.list(c);
h+="<h4>instincts ("+L.length+"/"+S.MAX+")</h4>";
if(!L.length)h+="<p class='note'>no instincts at all: it learns everything from scratch.</p>";
L.forEach(function(x){
h+="<div class='row'><div class='t'>"+esc(x.text)+"<small>strength "+Math.round(x.s*100)+"% · right now it "+S.pull(c,x)+"</small><div class='bar'><i style='width:"+Math.round(x.s*100)+"%'></i></div></div>"
+"<button data-op='up' data-i='"+x.i+"' title='stronger'"+dis+">▲</button><button data-op='down' data-i='"+x.i+"' title='weaker'"+dis+">▼</button><button data-op='cut' data-i='"+x.i+"' title='cut it out'"+dis+">✂</button></div>";
});
h+="<h4>add an instinct</h4><div class='add'>when <select data-k='drive'>"+SB.DRIVES.map(function(d,i){return"<option value='"+i+"'>"+SB.DRIVE_EMOJI[i]+" "+SB.DRIVE_WORDS[i]+"</option>";}).join("")+"</select>"
+" and it sees <select data-k='noun'>"+SB.NOUNS.map(function(n,i){return"<option value='"+i+"'>"+SB.NOUN_EMOJI[i]+" "+SB.NOUN_WORDS[i]+"</option>";}).join("")+"</select>"
+" → <select data-k='verb'>"+SB.VERBS.map(function(v,i){return SB.VERB_TIER[i]>c.tier?"":"<option value='"+i+"'>"+SB.VERB_EMOJI[i]+" "+SB.VERB_WORDS[i]+"</option>";}).join("")+"</select>"
+" <button class='go' data-op='add'"+dis+">＋ add</button></div>";
h+="<h4>what it cares about</h4><div class='cares'>";
SB.DRIVES.forEach(function(d,i){
var w=c.genome.driveW[i]!=null?c.genome.driveW[i]:1;
h+="<div class='row'><div class='t'>"+SB.DRIVE_EMOJI[i]+" "+SB.DRIVE_WORDS[i]+"<small>×"+w.toFixed(2)+"</small></div><button data-op='care' data-d='"+i+"' data-dir='-1' title='care less'"+dis+">−</button><button data-op='care' data-d='"+i+"' data-dir='1' title='care more'"+dis+">+</button></div>";
});
h+="</div><p class='note'>caring more about a feeling makes fixing it feel better, so it learns to chase that. caring less lets it shrug it off.</p>";
if(c.brain&&c.alive)h+=labHtml(c,dis);
var was=[].map.call(cur.root.querySelectorAll?cur.root.querySelectorAll("details"):[],function(d){return d.open;});
cur.root.innerHTML=h;
if(was.length)[].forEach.call(cur.root.querySelectorAll("details"),function(d,i){if(was[i])d.open=true;});
}
function click(e){
var b=e.target.closest&&e.target.closest("button[data-op]");
if(!b||b.disabled||!cur)return;
var k=b.dataset.op,op={kind:k};
if(k==="fire"){
var fs=cur.root.querySelector("select[data-k='fire']"),fr=S.fire(cur.game,cur.c,fs?+fs.value:-1);
if(SB.UI&&SB.UI.toast)SB.UI.toast(fr.ok?"⚡ "+esc(fr.msg):esc(fr.why));
return;
}
if(k==="rule"){op.name=b.dataset.n;op.dir=+b.dataset.dir;}
if(k==="up"||k==="down"||k==="cut")op.i=+b.dataset.i;
else if(k==="care"){op.drive=+b.dataset.d;op.dir=+b.dataset.dir;}
else if(k==="add"){var sel=function(n){var s=cur.root.querySelector("select[data-k='"+n+"']");return s?+s.value:-1;};op.drive=sel("drive");op.noun=sel("noun");op.verb=sel("verb");}
var r=S.operate(cur.game,cur.c,op);
if(SB.UI&&SB.UI.toast)SB.UI.toast(r.ok?"🔪 "+esc(r.msg):esc(r.why));
if(r.ok&&SB.Audio&&SB.Audio.play)SB.Audio.play("chime");
draw();
}
})();
