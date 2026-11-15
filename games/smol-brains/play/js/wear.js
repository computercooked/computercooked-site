/* smol brains: wear.js (built from src/wear.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB=window.SB||{};
var W=SB.Wear={};
function F(){return SB.Fight;}function H(){return SB.Harvest;}function P(){return SB.Powers;}
function Sv(){return SB.Surv;}
function K(){return SB.KINDS;}
function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/'/g,"&#39;");}
function label(k){return K()[k]?K()[k].label:k;}
W.PLACES=[["head","head"],["body","body"],["feet","feet"],["charm","charm"],["paw","paw"]];
W.ROOM={head:1,body:1,feet:1,charm:2,paw:1};
var CANON={fight:{hat:"head",cloak:"body",boots:"feet",charm:"charm",charm2:"charm"},harvest:{head:"head",body:"body",feet:"feet",c1:"charm",c2:"charm"},powers:{head:"head",body:"body",feet:"feet",charm:"charm",paw:"paw"}};
W.CANON=CANON;
var fWearing=null,hWorn=null;
W.on=function(c){
var out=[],k,s;
if(!c)return out;
if(P()&&c.pw&&c.pw.wear&&P().WEAR)for(s in c.pw.wear){k=c.pw.wear[s];if(k&&P().WEAR[k]&&CANON.powers[s])out.push({sys:"powers",slot:s,place:CANON.powers[s],kind:k});}
if(H()&&c.wear&&H().WEAR)for(s in c.wear){k=c.wear[s]&&c.wear[s].k;if(k&&H().WEAR[k]&&CANON.harvest[s]){out.push({sys:"harvest",slot:s,place:CANON.harvest[s],kind:k});if(c.wear[s].k2)out.push({sys:"harvest",slot:s,place:"bound",kind:c.wear[s].k2});}}
if(F()&&c.body&&c.body.wear&&F().GEAR)for(s in c.body.wear){k=c.body.wear[s];if(k&&F().GEAR[k]&&CANON.fight[s]&&(fWearing||F().wearing)(c,s)===k)out.push({sys:"fight",slot:s,place:CANON.fight[s],kind:k});}
return out;
};
W.has=function(c,kind){return W.on(c).some(function(e){return e.kind===kind;});};
W.takeOff=function(game,c,sys,slot){
if(sys==="fight"){var w=c.body&&c.body.wear;if(!w||!w[slot])return{ok:false,msg:"nothing there"};var k=w[slot];delete w[slot];return{ok:true,msg:"you take off the "+label(k)};}
if(sys==="harvest"&&H())return H().takeOff(game,c,slot);
if(sys==="powers"&&P())return P().takeOff(game,c,slot);
return{ok:false,msg:"nothing there"};
};
W.settle=function(game,c,keep){
var all=W.on(c),n=0;
W.PLACES.forEach(function(pl){
var here=all.filter(function(e){return e.place===pl[0];}),room=W.ROOM[pl[0]];
here.sort(function(a,b){return(keep&&b.sys===keep.sys&&b.slot===keep.slot?1:0)-(keep&&a.sys===keep.sys&&a.slot===keep.slot?1:0);});
for(var i=room;i<here.length;i++)if(W.takeOff(game,c,here[i].sys,here[i].slot).ok)n++;
});
return n;
};
W.owner=function(kind){return P()&&P().WEAR&&P().WEAR[kind]?"powers":H()&&H().WEAR&&H().WEAR[kind]?"harvest":F()&&F().GEAR&&F().GEAR[kind]?"fight":null;};
W.placeOf=function(kind){
var o=W.owner(kind);
return o==="powers"?CANON.powers[P().WEAR[kind].slot]:o==="harvest"?(H().WEAR[kind].slot==="charm"?"charm":CANON.harvest[H().WEAR[kind].slot]):o==="fight"?CANON.fight[F().GEAR[kind].slot]:null;
};
W.tip=function(kind){
var t=[];
if(P()&&P().WEAR&&P().WEAR[kind])t.push(P().WEAR[kind].desc);
if(H()&&H().WEAR&&H().WEAR[kind]&&H().WEAR[kind].tip)t.push(H().WEAR[kind].tip);
if(F()&&F().GEAR&&F().GEAR[kind]&&F().gearText)t.push(F().gearText(kind));
return t.filter(function(x){return!!x;}).join(" · ");
};
W.putOn=function(game,c,kind){
var o=W.owner(kind),r;
if(!o)return{ok:false,msg:"that isn't something to wear"};
if(W.has(c,kind))return{ok:false,msg:"you have that on"};
r=o==="powers"?P().putOn(game,c,kind):o==="harvest"?H().putOn(game,c,kind):F().wear(game,c,kind);
if(r&&r.ok){var e=W.on(c).filter(function(x){return x.kind===kind&&x.sys===o;})[0];if(e)W.settle(game,c,e);}
return r||{ok:false,msg:"that didn't work"};
};
function count(c,k){return Sv().count(c,k,true);}
function costList(cost){var out=[];for(var k in cost)out.push({any:k.split("|"),n:cost[k]});return out;}
function lacks(c,cost){return costList(cost).filter(function(x){var n=0;x.any.forEach(function(k){n+=K()[k]?count(c,k):0;});return n<x.n;});}
function costText(cost){return costList(cost).map(function(x){return x.n+" "+x.any.map(label).join(" or ");}).join(", ");}
W.recipes=function(){
var out=[],seen={};
function add(kind,sys,id,cost,tier,at){if(!K()[kind]||seen[kind])return;seen[kind]=1;out.push({kind:kind,sys:sys,id:id,cost:cost||{},tier:tier||2,at:at||null,place:W.placeOf(kind)});}
if(P()&&P().RECIPES2)P().RECIPES2.forEach(function(r){if(P().WEAR[r.id])add(r.id,"powers",r.id,r["in"],2,r.at);});
if(H()&&H().CRAFTS)H().CRAFTS.forEach(function(x){if(x.out&&H().WEAR[x.out])add(x.out,"harvest",x.id,x.cost,2,x.at);});
if(F()&&F().RECIPES)F().RECIPES.forEach(function(r){if(F().GEAR[r.out])add(r.out,"fight",r.id,r.cost,r.tier,null);});
return out;
};
W.whyNot=function(game,c,r){
if(c.tier<2)return"it takes hands: a tool-user and up";
if(c.tier<r.tier)return"your tribe doesn't know how yet";
if(r.sys==="powers")return P().whyNotMake2(game,c,r.id);
if(r.sys==="harvest")return H().whyNotMake(game,c,r.id);
var l=lacks(c,r.cost);
return l.length?"it needs "+costText(r.cost):"";
};
W.make=function(game,c,kind){
var r=W.recipes().filter(function(x){return x.kind===kind;})[0];
if(!r)return{ok:false,msg:"nobody knows how to make that"};
var why=W.whyNot(game,c,r);
if(why)return{ok:false,msg:why};
var res=r.sys==="powers"?P().make2(game,c,r.id):r.sys==="harvest"?H().make(game,c,r.id):F().make(game,c,r.id);
if(res&&res.ok&&SB.Wardrobe)SB.Wardrobe.bump(game,"made");
return res;
};
var showAll=false,group="head",page="on";
W.page=function(p){if(p)page=p;return page;};
W.html=function(game,c,icon){
icon=icon||function(){return"";};
var X=SB.Wardrobe,top=X&&X.html?"<div class='row' style='display:flex;gap:4px;margin-bottom:4px'><button class='btn"+(page==="on"?" go":"")+"' data-wrpage='on'>wearing</button><button class='btn"+(page==="looks"?" go":"")+"' data-wrpage='looks'>looks</button></div>":"";
if(top&&page==="looks")return top+X.html(game,c,icon);
var bare=[],on=W.on(c),out=top+"<div class='lbl'>what "+esc(c.name||"this smol")+" is wearing</div><div class='rlist'>";
W.PLACES.forEach(function(pl){
var here=on.filter(function(e){return e.place===pl[0];});
if(pl[0]==="paw"&&!here.length&&!P())return;
for(var i=0;i<W.ROOM[pl[0]];i++){
var e=here[i];
if(!e){bare.push(pl[1]+(W.ROOM[pl[0]]>1&&here.length?" "+(i+1):""));if(!here.length)break;continue;}
out+="<div class='rc'><span class='big'>"+icon(e.kind,28)+"</span><div class='t'>"+pl[1]+": "+esc(label(e.kind))+"<small>"+esc(W.tip(e.kind))+"</small></div><button class='btn' data-wroff='"+e.sys+":"+e.slot+"'>take off</button></div>";
}
});
out+="</div>"+(bare.length?"<p class='help'>"+(on.length?"nothing on: ":"nothing on yet: ")+esc(bare.join(", "))+".</p>":"");
var seen={},btns=[];
Sv().inv(c).s.forEach(function(sl){if(sl&&!seen[sl.k]&&W.owner(sl.k)&&!W.has(c,sl.k)){seen[sl.k]=1;btns.push("<button class='btn go' data-wron='"+sl.k+"'>"+icon(sl.k,16)+" put on "+esc(label(sl.k))+"</button>");}});
out+="<div class='lbl'>in your bag</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>"+(btns.length?btns.join(""):"<span class='help'>nothing to wear in your bag yet. make something below.</span>")+"</div>";
if(c.tier<2)return out+"<p class='help'>it takes hands to make and to dress: a tool-user and up.</p>";
var rs=W.recipes().filter(function(r){return c.tier>=r.tier;});
out+="<div class='lbl'>make</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px'>"+W.PLACES.filter(function(pl){return rs.some(function(r){return r.place===pl[0];});}).map(function(pl){return"<button class='btn"+(group===pl[0]?" go":"")+"' data-wrgrp='"+pl[0]+"'>"+pl[1]+"</button>";}).join("")+"<button class='btn"+(showAll?" go":"")+"' data-wrall='1'>"+(showAll?"all shown":"only what I can make")+"</button></div><div class='rlist'>";
var n=0;
rs.forEach(function(r){
if(r.place!==group)return;
var why=W.whyNot(game,c,r);
if(why&&!showAll)return;
n++;
out+="<div class='rc'><span class='big'>"+icon(r.kind,28)+"</span><div class='t'>"+esc(label(r.kind))+"<small>"+esc(W.tip(r.kind))+" · "+esc(costText(r.cost))+(r.at?" · "+(r.at==="bench"?"at a workbench":r.at==="fire"?"by a fire":"at "+r.at):"")+"</small></div><button class='btn go' data-wrmake='"+r.kind+"' "+(why?"disabled title='"+esc(why)+"'":"")+">make</button></div>";
});
if(!n)out+="<p class='help'>nothing for the "+group+" you have the makings of. tap \"only what I can make\" to see everything and what it takes.</p>";
out+="</div>";
if(H())out+="<p class='help'>dyes, saved outfits and binding two charms are on the harvest tab, under wear.</p>";
return out;
};
W.wire=function(root,game,c,redraw,tell){
function each(sel,fn){root.querySelectorAll(sel).forEach(function(b){b.addEventListener("click",function(){fn(b);});});}
function done(r){W.fresh(c);if(r&&r.msg&&tell)tell(r.msg);if(redraw)redraw();}
each("[data-wroff]",function(b){var a=b.getAttribute("data-wroff").split(":");done(W.takeOff(game,c,a[0],a[1]));});
each("[data-wron]",function(b){done(W.putOn(game,c,b.getAttribute("data-wron")));});
each("[data-wrmake]",function(b){done(W.make(game,c,b.getAttribute("data-wrmake")));});
each("[data-wrgrp]",function(b){group=b.getAttribute("data-wrgrp");if(redraw)redraw();});
each("[data-wrall]",function(){showAll=!showAll;if(redraw)redraw();});
each("[data-wrpage]",function(b){page=b.getAttribute("data-wrpage");if(redraw)redraw();});
if(page==="looks"&&SB.Wardrobe&&SB.Wardrobe.wire)SB.Wardrobe.wire(root,game,c,redraw,tell);
};
function wd(c){return c.wd&&typeof c.wd==="object"?c.wd:(c.wd={});}
W.wd=wd;
function rgb(v){if(typeof v==="string")v=parseInt(v.replace("#",""),16);v=v||0x9a8f80;return[v>>16&255,v>>8&255,v&255];}
function mixc(a,b,t){return[a[0]+(b[0]-a[0])*t|0,a[1]+(b[1]-a[1])*t|0,a[2]+(b[2]-a[2])*t|0];}
W.rgb=rgb;
W.HATS={party:["party hat","cone",0xff5fa2],flower:["flower crown","band",0xff9ac0],top:["tall hat","tall",0x2a2630],acorn:["acorn cap","cap",0x8a5a36],knit:["knit cap","cap",0xd84a4a],ears:["mouse ears","ears",0x9a9aa6],feather:["feather cap","brim",0x4f8a40],crown:["captain's crown","band",0xffd65c],lantern:["lantern hood","hood",0xfff0a0]};
W.TRIMS=[null,["wave",[240,240,230]],["ember",[255,120,60]],["moss",[110,190,90]],["star",[255,214,92]]];
W.CLOAKS=["plain","striped","starry","checked"];
W.BANDS=[[240,190,60],[220,80,70],[90,190,240],[120,200,110],[190,120,230],[245,240,230]];
W.BAND_NAMES=["gold","red","blue","green","violet","white"];
W.PAINTS=[null,["white clay",[245,240,230]],["red ochre",[205,80,50]],["blue woad",[70,110,210]],["gold dust",[255,214,92]]];
W.STYLES=[["reed",[156,184,90]],["clay",[214,120,76]],["moss",[80,150,96]],["ember",[240,120,60]]];
W.style=function(game,c){var s=0,t=String(c&&c.tribe!=null?c.tribe:"");for(var i=0;i<t.length;i++)s+=t.charCodeAt(i);return W.STYLES[((game&&game.seed|0)+s)&3];};
var MAT=/copper|iron|fur|bark|leaf|moss|straw|hide|glow|gourd|thorn|cane|clam/,MATC={copper:0xe08a4a,iron:0x9aa0aa,fur:0xc8b48a,bark:0x7a5230,leaf:0x6aa84a,moss:0x4f8a40,straw:0xe8cf8a,hide:0xa07850,glow:0x67d4ff,gourd:0xf59b2b,thorn:0x5a9a4a,cane:0xb8c46a,clam:0xe8dccc};
W.shapeOf=function(k){return/crown|wreath|band|circlet/.test(k)?"band":/hood|cowl/.test(k)?"hood":/helm|mask|copperhat/.test(k)?"helm":/hat|parasol/.test(k)?"brim":"cap";};
W.fresh=function(c){if(c)c._wl=null;};
W.look=function(c){
if(!c||c.species==="grump"||!c.look)return null;
var n=c._wlN=(c._wlN||0)+1;
if(c._wl&&n%24)return c._wl;
var d=c.wd||{},hide=d.hide||{},game=cur(),L={fit:c.fit?Math.round(c.fit):0},dy=game?Math.floor((game.time||0)/(SB.DAY_LENGTH||1200)):0;
W.on(c).forEach(function(e){
var pl=e.place;
if(pl==="bound"||pl==="paw"||hide[pl]||L[pl])return;
var kd=K()[e.kind]||{},m=MAT.exec(e.kind),col=rgb(m&&(!kd.color||kd.color===0xb89a6a)?MATC[m[0]]:kd.color),r=e.sys==="harvest"&&c.wear[e.slot],dz=r&&r.dye&&H().DYE&&H().DYE[r.dye];
if(dz)col=[dz.rgb[0]*255|0,dz.rgb[1]*255|0,dz.rgb[2]*255|0];
if(d.dye&&d.dye[pl])col=d.dye[pl];
else if(/copper/.test(e.kind)&&game){
var on=d.on||(wd(c).on={});
if(on[e.kind]==null)on[e.kind]=dy;
col=mixc(col,[96,176,150],Math.max(0,Math.min(0.75,(dy-on[e.kind])/12)));
}
L[pl]={k:e.kind,col:col,sh:pl==="head"?W.shapeOf(e.kind):pl==="body"&&/cloak|cape|robe/.test(e.kind)?"cloak":""};
});
if(d.hat&&W.HATS[d.hat])L.head={k:d.hat,col:d.dye&&d.dye.hat||rgb(W.HATS[d.hat][2]),sh:W.HATS[d.hat][1]};
else if(!L.head&&!hide.head&&c.tier>=3&&game&&game.world){
if(SB.Dark&&SB.Dark.feast&&SB.Dark.feast(game))L.head={k:"party",col:rgb(W.HATS.party[2]),sh:"cone"};
else if(game.world.season===3)L.head={k:"knit",col:W.BANDS[(c.id||0)%W.BANDS.length],sh:"cap"};
}
if(!hide.mask&&Sv()&&Sv().count(c,"grumpmask",true)>0)L.mask=1;
if(L.body){L.body.trim=d.trim&&W.TRIMS[d.trim]?W.TRIMS[d.trim][1]:game?W.style(game,c)[1]:null;L.body.pat=d.cl|0;}
L.scars=P()&&P().scars?Math.min(3,P().scars(c)):0;
L.paint=d.paint&&W.PAINTS[d.paint]?d.paint:0;
L.mark=d.mark|0;
L.band=d.band==null?null:d.band<0?false:W.BANDS[d.band%W.BANDS.length];
L.belt=d.belt==null?null:d.belt<0?false:W.BANDS[d.belt%W.BANDS.length];
L.feather=game?W.style(game,c)[1]:null;
L.big=P()&&P().has&&game&&P().has(c,"bigglow",game)?(L.charm?L.charm.col:[255,240,170]):null;
var g=c.genome&&c.genome.genes||{},an=c.anim||{};
L.gait=H()&&H().has&&game&&c.buff&&H().has(c,"tipsy",game)?"tipsy":(SB.Body&&SB.Body.has(c,"cut"))||(P()&&P().sprained&&game&&P().sprained(c,game))?"limp":an.face==="tired"||(c.chem&&c.chem.tired>0.8)?"trudge":g.bravery>0.66?"strut":L.fit>0||c.look.body>1.12?"waddle":g.sociability>0.6?"bouncy":"";
L.key=JSON.stringify([L.head,L.body,L.feet,L.charm&&L.charm.col,L.mask,L.scars,L.paint,L.mark,L.band,L.belt,L.feather,L.fit,c.leafy?1:0]);
return(c._wl=L);
};
var GA={hop:0,lean:0,roll:0,leg:1,arm:1,ear:0};
W.gait=function(c,t,walk){
var L=W.look(c),g=L&&L.gait,s=Math.sin((walk||0)*1.6),id=c.id||0;
GA.hop=GA.lean=GA.roll=GA.ear=0;GA.leg=GA.arm=1;
if(!g)return GA;
if(g==="tipsy"){GA.roll=Math.sin(t*2.3+id)*0.2;GA.lean=Math.sin(t*1.7+id)*0.1;}
else if(!walk)return GA;
else if(g==="limp"){GA.roll=Math.max(0,s)*0.2;GA.hop=-Math.max(0,s)*0.5;GA.leg=0.55;}
else if(g==="trudge"){GA.lean=0.2;GA.leg=0.5;GA.arm=0.2;GA.ear=-0.3;}
else if(g==="strut"){GA.lean=-0.12;GA.arm=1.7;GA.hop=Math.abs(s)*0.4;}
else if(g==="waddle"){GA.roll=s*0.16;GA.leg=0.8;}
else if(g==="bouncy"){GA.hop=Math.abs(s)*1.5;GA.ear=0.1;}
return GA;
};
W.join=function(){
if(F()&&F().wearing&&!fWearing){
fWearing=F().wearing;
F().wearing=function(c,slot){
var k=fWearing(c,slot),pl=CANON.fight[slot];
if(k||!c||slot==="charm2")return k;
var o=W.on(c).filter(function(e){return e.sys!=="fight"&&e.place===pl&&F().GEAR[e.kind]&&F().GEAR[e.kind].slot===slot;})[0];
return o?o.kind:null;
};
}
if(H()&&H().worn&&!hWorn){
hWorn=H().worn;
H().worn=function(c,id){
var q=hWorn(c,id);
if(q||!c||!H().WEAR[id])return q;
return W.on(c).some(function(e){return e.sys!=="harvest"&&e.kind===id;})?1:0;
};
}
};
W.join();
function cur(){return SB.Game&&SB.Game.current;}
function onWorn(d,sys){
W.fresh(d&&d.c);
if(!d||!d.c||d.off||!d.kind)return;
var e=W.on(d.c).filter(function(x){return x.kind===d.kind&&(!sys||x.sys===sys)&&(!d.slot||x.slot===d.slot);})[0];
if(e)W.settle(cur(),d.c,e);
}
if(SB.bus&&SB.bus.on){
SB.bus.on("worn",function(d){onWorn(d,null);});
SB.bus.on("wearOn",function(d){onWorn(d,"harvest");});
}
if(SB.Ext)SB.Ext.tab({id:"wear",label:function(){return"🧥 wear";},show:function(game,c){return!!c&&(c.tier>=2||W.on(c).length>0||!!SB.Wardrobe);},html:W.html,wire:W.wire});
})();
