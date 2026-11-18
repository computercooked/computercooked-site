/* smol brains: friends.js (built from src/friends.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB=window.SB||{};
var F=SB.Friends={};
F.MAX=10;F.PER=250;
F.PTS={"2":80,"1":45,"0":20,"-1":-20,"-2":-40,talk:20,tickle:10,wish:50,saved:30,social:10,fetch:3};
F.HATCHDAY=4;
F.MAX_FOL=3;
F.FEST_LEN=360;F.WED_GATHER=25;F.WED_LEN=8;
F.UNLOCK={1:"it comes when you call its name",2:"it tells you its favourite thing",3:"it will follow you",4:"it leaves you gifts at dawn",5:"it teaches you what it knows",6:"it fights beside you",8:"a keepsake, and 5 ✨",10:"best friends: a memory ember"};
F.WORD={"2":"loves","1":"likes","0":"doesn't mind","-1":"doesn't like","-2":"hates"};
var K0=SB.KINDS;
if(K0){
if(!K0.posy)K0.posy={noun:"toy",label:"posy",emoji:"💐",r:0.13,color:0xf2a0c8,desc:"leaves and berries tied in a bunch. nearly everyone likes one. it cheers the sick and helps a courtship along."};
if(!K0.knot)K0.knot={noun:"toy",label:"wedding knot",emoji:"🎀",r:0.11,color:0xff8fb0,desc:"a keepsake from a wedding you were at."};
if(!K0.ribbon)K0.ribbon={noun:"toy",label:"festival ribbon",emoji:"🎗",r:0.11,color:0x6fb8ff,desc:"the best bonk at the autumn log. yours to keep, or to give."};
}
F.POSY={leaves:2,berry:1};
function Q(game){return game.quests||(game.quests={ch:0,done:{},n:{}});}
function st(game){
var q=Q(game);
if(!q.friends||typeof q.friends!=="object")q.friends={h:{},fol:[]};
if(!q.friends.h)q.friends.h={};
if(!Array.isArray(q.friends.fol))q.friends.fol=[];
return q.friends;
}
F.state=st;
function Sv(){return SB.Surv||SB.Survival;}
function K(){return SB.KINDS||{};}
function cur(){return SB.Game&&SB.Game.current;}
function day(game){return Math.floor((game.time||0)/SB.DAY_LENGTH)+1;}
function label(k){return K()[k]&&K()[k].label?K()[k].label:k;}
function emo(k){return K()[k]&&K()[k].emoji?K()[k].emoji:"";}
function hashKey(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function dice(game,key){return SB.rng((hashKey(key)^(game.seed>>>0))>>>0);}
function gene(c,k){var v=c&&c.genome&&c.genome.genes?c.genome.genes[k]:null;return v==null?0.5:v;}
function isSmol(c){return!!c&&c.species==="smol"&&c.alive&&!c.stranger;}
function tribe(game){return SB.Game.smols(game).filter(function(c){return isSmol(c);});}
function of(c){if(!c.fr||typeof c.fr!=="object")c.fr={};return c.fr;}
function speak(c,text,t){if(c&&c.alive)c.speech={text:text,t:t||2,kind:"say"};}
function emote(c,e,t){if(c&&c.anim&&SB.Creature&&SB.Creature.emote)SB.Creature.emote(c,e,t||1.6);}
function me(){var P=SB.Possess;return P&&P.active&&P.c&&P.c.alive?P.c:null;}
function quiet(game){return!game||game.offline||game.offlineRunning;}
function story(game){return!!(game.tutorial&&game.tutorial.done===false)||!!(SB.FirstNight&&SB.FirstNight.active&&SB.FirstNight.active(game));}
function toast(game,html,at,cls){if(quiet(game)||!SB.UI||!SB.UI.toast)return;try{SB.UI.toast(html,cls||"",4600,at||undefined);}catch(e){}}
function tell(game,text,at){if(quiet(game))return;var P=SB.Possess;if(me()&&P.say)P.say(text);else toast(game,text,at);}
function sound(name,vol){var P=SB.Possess;if(SB.Audio&&SB.Audio.play&&!(P&&P.headless)){try{SB.Audio.play(name,{vol:vol==null?0.7:vol});}catch(e){}}}
function fx(kind,c,n){if(SB.FX&&SB.FX.burst&&c&&!c.far){try{SB.FX.burst(kind,c.x,(c.y||0)+1,c.z,n||6);}catch(e){}}}
function sendTo(c,x,z,game,dur){if(!c||!c.alive||c._pov||c.heldBy!=null||!SB.Creature||!SB.Creature.sendTo)return false;try{return(SB.Creature.sendSoft||SB.Creature.sendTo)(c,x,z,game,dur||14);}catch(e){return false;}}
function opinion(game,a,b){return SB.Social&&SB.Social.opinion?SB.Social.opinion(game,a,b):0;}
function remember(game,a,b,key,d,txt,life,stack){if(SB.Social&&SB.Social.remember)SB.Social.remember(game,a,b,key,d,txt,life||2400,stack||0);}
function diary(game,c,icon,txt){if(SB.Social&&SB.Social.log)SB.Social.log(game,c,icon,txt);}
function sparks(game,n,c){if(SB.Game.addSparks)SB.Game.addSparks(game,n,c||null);}
function addItem(game,c,kind,n){var left=Sv().add(c,kind,n);if(left>0&&Sv().spawn)Sv().spawn(game,kind,left,c.x+0.6,c.z+0.4);}
function itemsNear(game,x,z,r,fn){var L=game.world.items,r2=r*r;for(var i=0;i<L.length;i++)if(SB.dist2(L[i].x,L[i].z,x,z)<=r2)fn(L[i]);}
function gatherSpot(game,x,z){
var w=game.world,f=SB.World.nearestFire?SB.World.nearestFire(w,x,z,40):null;
if(f)return{x:f.x+1.6,z:f.z+0.8,fire:true};
return{x:x,z:z,fire:false};
}
F.MOODS={
loved:["💝","got my favourite thing",2,900,{bored:-0.3,lonely:-0.3}],liked:["🎁","got a nice gift",1,600,{bored:-0.15,lonely:-0.15}],
yuck:["🤢","got a yucky gift",-1,500,{anger:0.1}],chat:["💬","had a good chat",1,400,{lonely:-0.2}],
wed:["💒","our wedding day",2,2400,{lonely:-0.5,bored:-0.3}],guest:["🎉","went to a wedding",1,900,{bored:-0.3,lonely:-0.2}],
laugh:["😆","had a good laugh",1,500,{bored:-0.3}],pranked:["😤","got pranked",-1,400,{anger:0.15}],
saved:["🛡","saved from a grump",2,1200,{fear:-0.4}],fest:["🎪","festival day",1,1200,{bored:-0.4,lonely:-0.3}],
dream:["🌠","my dream came true",2,3600,{bored:-0.5,lonely:-0.3}],bday:["🎂","my growing-up party",2,1200,{lonely:-0.4}],
moment:["🍂","a silly, happy moment",1,400,{bored:-0.25}],matched:["💘","someone has caught my eye",1,900,{}],
posy:["💐","flowers by my bed",1,900,{sick:-0.1,bored:-0.1}],blessed:["✨","the Lantern blessed us",2,1800,{}]
};
F.mood=function(game,c,id){
var d=F.MOODS[id];if(!d||!c||!c.alive)return false;
var f=of(c),m=f.m||(f.m=[]),until=Math.round(game.time+d[3]),had=false;
for(var i=0;i<m.length;i++)if(m[i][0]===id){m[i][1]=until;had=true;}
if(!had){m.push([id,until]);if(m.length>6)m.shift();if(c.chem&&SB.Chem&&SB.Chem.apply)SB.Chem.apply(c.chem,d[4]);}
return true;
};
F.moods=function(game,c){
var f=c&&c.fr,out=[];
if(!f||!f.m)return out;
f.m=f.m.filter(function(x){return F.MOODS[x[0]]&&x[1]>game.time;});
f.m.forEach(function(x){var d=F.MOODS[x[0]];out.push({id:x[0],icon:d[0],text:d[1],v:d[2],left:Math.round(x[1]-game.time)});});
return out;
};
F.moodScore=function(game,c){var n=0;F.moods(game,c).forEach(function(m){n+=m.v;});return n;};
var UNI={honey:1.2,heartfruit:1.1,posy:0.8,mote:0.5,plush:0.45,cooked:0.35,bread:0.35,ball:0.3,crystal:0.3,knot:0.3,ribbon:0.3,cherry:0.2,berry:0.15,apple:0.15,
shroom:-1,log:-0.5,firewood:-0.5,stone:-0.45,clay:-0.4,plank:-0.4,stick:-0.35,leaves:-0.3,fiber:-0.3,flint:-0.3,ore:-0.3,ironore:-0.3,sharpstone:-0.3,vine:-0.3,meat:-0.3,beetle:-0.3,seed:-0.2,sapling:-0.2};
var SHINY={crystal:1,metal:1,iron:1,mote:1,lens:1,glowcap:1};
var FAV=["honey","apple","berry","cherry","banana","fish","cooked","bread","carrot","pumpkin","nutmeat","clam","glowcap","crystal","ball","plush","posy","fur"];
F.favourite=function(game,c){
var pool=FAV.filter(function(k){return K()[k];});
return pool.length?pool[Math.floor(dice(game,"fav:"+c.id)()*pool.length)%pool.length]:null;
};
F.taste=function(game,c,kind){
var d=K()[kind];if(!d||!c)return 0;
if(kind===F.favourite(game,c))return 2;
var s=dice(game,"taste:"+kind+":"+c.id)()*1.8-0.9+(UNI[kind]||0);
if(d.noun==="toy"||d.noun==="ball")s+=(gene(c,"playfulness")-0.5)*1.2;
else if(d.food&&d.noun==="food")s+=(gene(c,"appetite")-0.5)*0.8;
else if(d.tool)s+=(gene(c,"bravery")-0.5)*0.6;
if(SHINY[kind]||d.noun==="mushroom")s+=(gene(c,"curiosity")-0.5)*1.2;
s-=(gene(c,"grumpiness")-0.5)*0.4;
var t=s>0.75?2:s>0.2?1:s>-0.3?0:s>-0.85?-1:-2;
if(t<1&&d.food&&d.noun==="food"&&F.trait(c)==="greedy")t=1;
return t;
};
function rec(game,c){var s=st(game),r=s.h[c.id];if(!r)r=s.h[c.id]={p:0,n:c.name,k:{},lv:0};if(!r.k)r.k={};r.n=c.name;return r;}
F.rec=rec;
F.points=function(game,c){var r=c&&st(game).h[c.id];return r?r.p||0:0;};
F.cap=function(){return F.MAX;};
F.hearts=function(game,c){return Math.min(F.cap(game,c),Math.floor(F.points(game,c)/F.PER));};
F.heartsText=function(game,c){var h=F.hearts(game,c),out="";for(var i=1;i<=F.MAX;i++)out+=h>=i?"♥":"♡";return out;};
F.known=function(game,c){var r=c&&st(game).h[c.id];return r?r.k:{};};
F.nextUnlock=function(game,c){var h=F.hearts(game,c);for(var i=h+1;i<=F.MAX;i++)if(F.UNLOCK[i])return{at:i,text:F.UNLOCK[i]};return null;};
function note(game,c,text){var r=rec(game,c),m=r.mem||(r.mem=[]);m.push([day(game),text]);if(m.length>4)m.shift();}
F.memories=function(game,c){var r=c&&st(game).h[c.id];return r&&r.mem?r.mem:[];};
function levelUp(game,c,lv){
var r=rec(game,c),text=F.UNLOCK[lv]||"";
if(SB.Orders&&SB.Orders.addTrust)SB.Orders.addTrust(c,0.02);
if(lv===2){var fav=F.favourite(game,c);if(fav){r.k[fav]=2;text="it tells you its favourite thing: "+emo(fav)+" "+label(fav);}}
if(lv===8){r.keep=day(game);sparks(game,5,c);}
if(lv===10){
var E=SB.Embers,got=false;
if(E&&E.add){try{got=E.add(game,"bestfriend",c.name+" became your best friend",c);}catch(e){}}
if(!got){sparks(game,8,c);text="best friends: 8 ✨";}
}
SB.bus.emit("friendLevel",{c:c,level:lv,text:text});
emote(c,"love",2.2);fx("hearts",c,4);
tell(game,"💗 "+c.name+": "+lv+" heart"+(lv>1?"s":"")+(text?". "+text:""),c);
sound("achievement",0.5);
}
F.add=function(game,c,pts){
if(!game||!isSmol(c)||!pts)return 0;
var r=rec(game,c),was=r.p||0;
r.p=Math.max(0,Math.min(F.cap(game,c)*F.PER,was+pts));
r.seen=day(game);
var h=Math.floor(r.p/F.PER);
while((r.lv||0)<h){r.lv=(r.lv||0)+1;levelUp(game,c,r.lv);}
return r.p-was;
};
F.isHatchDay=function(game,c){
var d=day(game),born=Math.floor((c.born||0)/SB.DAY_LENGTH)+1,year=Math.max(1,Math.round(SB.seasonDays(game)*4));
return d>born&&(d-born)%year===0;
};
var LINES={"2":["ooh! %k! best thing!","%k!! me love!","for me? %k! yay!"],"1":["%k. nice!","oh, %k. thank!","me like %k"],"0":["oh. %k. okay","a %k. thank"],"-1":["%k? hm. no like","oh. %k."],"-2":["%k?! yuck!","bleh! no %k!"]};
F.gift=function(game,to,kind,by){
if(!game||!isSmol(to)||!K()[kind]||to===by)return null;
var r=rec(game,to),d=day(game),t=F.taste(game,to,kind),isNew=r.k[kind]==null,counted=r.gd!==d,bday=F.isHatchDay(game,to);
r.k[kind]=t;r.gifts=(r.gifts||0)+1;
var pts=counted?F.PTS[String(t)]*(bday?F.HATCHDAY:1):0;
if(counted)r.gd=d;
if(to.stage<3)bump(to,"spoil");
var line=LINES[String(t)];line=line[Math.floor(Math.random()*line.length)].replace("%k",label(kind));
speak(to,line,2.4);emote(to,t>=2?"love":t>=1?"happy":t<=-2?"angry":t<0?"sad":"huh",2);
F.mood(game,to,t>=2?"loved":t>=1?"liked":t<0?"yuck":"chat");
if(by&&t!==0)remember(game,to,by,"taste",[-16,-8,0,8,16][t+2],t>=2?"gave me my favourite thing":t>=1?"gave me something nice":"gave me a yucky "+label(kind),3000,30);
if((kind==="honey"||kind==="posy")&&to.chem&&to.stage>=3)to.chem.love=Math.min(1,(to.chem.love||0)+0.2);
if(kind==="posy")F.mood(game,to,"posy");
if(t>=1)note(game,to,"you gave me "+label(kind));
var got=F.add(game,to,pts);
var msg=(t>=1?"💝 ":t<0?"🙈 ":"🎁 ")+to.name+" "+F.WORD[String(t)]+" "+label(kind)+(bday&&counted?" (its hatch-day: ×"+F.HATCHDAY+")":"")+(counted?(got>0?" · +"+got:got<0?" · "+got:""):" · one gift a day counts");
var res={ok:true,taste:t,pts:got,counted:counted,isNew:isNew,bday:bday,line:line,msg:msg,kind:kind,to:to};
var fe=st(game).fest;
if(by&&fe&&fe.k===3&&!fe.done&&fe.who===to.id){var fr=festReward(game,by,t>=1?2:t===0?1:0,to);res.msg=msg+". "+fr;}
SB.bus.emit("gift",{to:to,by:by||null,kind:kind,taste:t,pts:got,sky:!by,counted:counted});
return res;
};
var skySeen={},skyN=0;
function skyGift(game,c,it){
if(!it||skySeen[it.id]||!isSmol(c)||c._pov)return;
skySeen[it.id]=1;if(++skyN>80){skySeen={};skyN=0;}
var r=F.gift(game,c,it.kind,null);
if(r&&(r.counted||r.isNew))toast(game,r.msg,c);
}
function skyScan(game){
var f=game.fh;if(!f||!f.recent||!f.recent.length)return;
for(var i=0;i<f.recent.length;i++){
var rr=f.recent[i];if(rr.type==="creature"||skySeen[rr.id])continue;
var it=SB.World.itemById(game.world,rr.id);
if(it&&typeof it.heldBy==="number")skyGift(game,SB.Game.byId(game,it.heldBy),it);
}
}
function handled(game,id){var f=game.fh;return!!(f&&f.recent&&f.recent.some(function(x){return x.id===id&&x.type!=="creature";}));}
F.line=function(game,c){
var h=F.hearts(game,c),mem=F.memories(game,c),lw=F.lifeOf(game,c),md=F.moods(game,c),r=Math.random();
if(h<1&&!mem.length)return["who you?","hm? hello","you new"][Math.floor(r*3)];
if(md.length&&r<0.25)return md[md.length-1].text.replace(/^my /,"me ").replace(/^our /,"we ")+"!";
if(mem.length&&r<0.55)return mem[mem.length-1][1]+". "+(h>=5?"you good friend":"me remember");
if(lw&&!lw.done&&r<0.8)return"one day me "+lw.def.t;
return h>=8?"you best friend":h>=4?"you good. me like you":h>=1?"you okay":"hm";
};
F.talk=function(game,by,to){
if(!game||!isSmol(to)||to===by)return null;
var r=rec(game,to),d=day(game),first=r.td!==d,hint=null;
var line=F.line(game,to);
if(first){
r.td=d;F.mood(game,to,"chat");
var pool=Object.keys(K()).filter(function(k){return r.k[k]==null&&K()[k].noun!=="critter"&&k!=="egg"&&Math.abs(F.taste(game,to,k))===2;});
if(pool.length&&dice(game,"hint:"+to.id+":"+d)()<0.45){hint=pool[Math.floor(dice(game,"hintk:"+to.id+":"+d)()*pool.length)%pool.length];r.k[hint]=F.taste(game,to,hint);line=r.k[hint]>0?"me love "+label(hint):"me no like "+label(hint)+". yuck";}
}
speak(to,line,2.6);
var got=first?F.add(game,to,F.PTS.talk):0;
SB.bus.emit("friendTalk",{to:to,by:by||null,first:first,hint:hint});
return{ok:true,first:first,pts:got,hint:hint,line:line,msg:"💬 "+to.name+": “"+line+"”"+(got>0?" · +"+got:"")};
};
F.willing=function(game,by,c,need){
if(F.hearts(game,c)>=need)return true;
if(!by||need>3)return false;
return c.partner===by.id||opinion(game,c,by)>=(SB.Social?SB.Social.FRIEND:25)||!!(SB.Game.related&&SB.Game.related(game,c,by));
};
F.NEED={come:1,stay:1,home:1,get:2,follow:3};
F.following=function(game,c){return!!c&&st(game).fol.indexOf(c.id)>=0;};
F.followers=function(game){var s=st(game),out=[];s.fol=s.fol.filter(function(id){var c=SB.Game.byId(game,id);if(isSmol(c)){out.push(c);return true;}return false;});return out;};
F.unfollow=function(game,c){var s=st(game),i=s.fol.indexOf(c.id);if(i>=0)s.fol.splice(i,1);return i>=0;};
F.fetchables=function(game,c){
var seen={},out=[];
itemsNear(game,c.x,c.z,26,function(o){
var d=K()[o.kind];
if(!d||d.critter||o.heldBy!=null||o.gone||o.kind==="egg"||(o.data&&(o.data.pod||o.data.rotten)))return;
if(!seen[o.kind]){seen[o.kind]=SB.dist(o.x,o.z,c.x,c.z);out.push(o.kind);}
});
return out.sort(function(a,b){return seen[a]-seen[b];}).slice(0,5);
};
var jobs=[];
F.errands=function(){return jobs;};
F.command=function(game,by,c,cmd,arg){
if(!game||!by||!isSmol(c)||c===by)return{ok:false,msg:"nobody to ask"};
if(c.asleep&&cmd!=="come")return{ok:false,msg:"💤 "+c.name+" is asleep"};
var need=F.NEED[cmd];
if(need==null)return{ok:false,msg:"it doesn't know that one"};
if(!F.willing(game,by,c,need)){speak(c,"hm?",1.6);emote(c,"huh",1.4);return{ok:false,msg:c.name+" doesn't know you well enough for that ("+need+" ♥)"};}
if(cmd!=="follow")c._frStay=0;
if(c.asleep){c.asleep=false;c.inBed=false;c.action=null;}
if(SB.Creature&&SB.Creature.hear){try{SB.Creature.hear(c,c.name,game,{});}catch(e){}}
if(cmd==="come"){
sendTo(c,by.x+0.9,by.z+0.6,game,16);speak(c,"coming!",1.6);
SB.bus.emit("friendCommand",{c:c,by:by,cmd:cmd});
return{ok:true,msg:"📣 "+c.name+", come! it's on its way"};
}
if(cmd==="stay"){
F.unfollow(game,c);c._frStay=game.time+45;
if(SB.Creature&&SB.Creature.startAction){try{SB.Creature.startAction(c,game,SB.V.idle,null);if(c.action)c.action.dur=45;}catch(e){}}
speak(c,"me stay",1.6);
SB.bus.emit("friendCommand",{c:c,by:by,cmd:cmd});
return{ok:true,msg:"✋ "+c.name+", stay. it waits here"};
}
if(cmd==="home"){
F.unfollow(game,c);
var n=game.world.T&&game.world.T.nest,hm=SB.Society&&SB.Society.home?SB.Society.home(game,c.tribe||0):null,hx=hm&&hm.x!=null?hm.x:n?n.x:c.x,hz=hm&&hm.z!=null?hm.z:n?n.z:c.z;
sendTo(c,hx,hz,game,30);speak(c,"me go home",1.6);
SB.bus.emit("friendCommand",{c:c,by:by,cmd:cmd});
return{ok:true,msg:"🏠 "+c.name+", go home. off it goes"};
}
if(cmd==="follow"){
var s=st(game);
if(F.following(game,c)){F.unfollow(game,c);speak(c,"okay. bye",1.6);return{ok:true,msg:c.name+" stops following you"};}
if(F.followers(game).length>=F.MAX_FOL)return{ok:false,msg:"three is a crowd: ask someone to stay first"};
s.fol.push(c.id);c._frStay=0;speak(c,"me follow!",1.6);emote(c,"happy",1.6);
SB.bus.emit("friendCommand",{c:c,by:by,cmd:cmd});
return{ok:true,msg:"🐾 "+c.name+", follow me! it tags along"+(F.hearts(game,c)>=6?", and it'll fight beside you":"")};
}
var best=null,bd=1e9;
itemsNear(game,c.x,c.z,30,function(o){if(o.kind!==arg||o.heldBy!=null||o.gone||(o.data&&(o.data.pod||o.data.rotten)))return;var dd=SB.dist(o.x,o.z,c.x,c.z);if(dd<bd){bd=dd;best=o;}});
if(!best){speak(c,"no "+label(arg)+" here",1.8);return{ok:false,msg:c.name+" can't see any "+label(arg)+" around"};}
jobs=jobs.filter(function(j){return j.c!==c;});
jobs.push({c:c,k:arg,id:best.id,ph:"go",until:game.time+40,by:by.id});
sendTo(c,best.x,best.z,game,20);speak(c,"get "+label(arg)+"!",1.6);
SB.bus.emit("friendCommand",{c:c,by:by,cmd:cmd,kind:arg});
return{ok:true,msg:"👉 "+c.name+", get "+label(arg)+"! off it trots"};
};
function errandTick(game){
for(var i=jobs.length-1;i>=0;i--){
var j=jobs[i],c=j.c,by=SB.Game.byId(game,j.by);
if(!isSmol(c)||game.time>j.until){if(j.ph==="back"&&c&&c.alive&&Sv().spawn)Sv().spawn(game,j.k,1,c.x,c.z);jobs.splice(i,1);continue;}
if(j.ph==="go"){
var it=SB.World.itemById(game.world,j.id);
if(!it||it.gone||it.heldBy!=null){speak(c,"gone!",1.4);jobs.splice(i,1);continue;}
if(SB.dist(c.x,c.z,it.x,it.z)<1.5){
if(Sv().pileN&&Sv().pileN(it)>1&&Sv().split)it=Sv().split(game,it);
SB.World.remove(game.world,it);
j.ph="back";j.until=game.time+40;
}else if(!c.action||!c.action.called)sendTo(c,it.x,it.z,game,20);
}else{
if(!by||!by.alive){if(Sv().spawn)Sv().spawn(game,j.k,1,c.x,c.z);jobs.splice(i,1);continue;}
if(SB.dist(c.x,c.z,by.x,by.z)<2.2){
addItem(game,by,j.k,1);speak(c,"here!",1.6);emote(c,"proud",1.6);
F.add(game,c,F.PTS.fetch);
SB.bus.emit("fetched",{c:c,by:by,kind:j.k});
if(by._pov)tell(game,"📦 "+c.name+" brought you "+(/s$/.test(label(j.k))?"":"a ")+label(j.k));
jobs.splice(i,1);
}else if(!c.action||!c.action.called)sendTo(c,by.x+0.8,by.z+0.5,game,20);
}
}
}
F.callAll=function(game,by){
var n=0;
tribe(game).forEach(function(c){if(c===by||c.asleep||SB.dist(c.x,c.z,by.x,by.z)>34||!F.willing(game,by,c,2))return;if(sendTo(c,by.x+(n%3)-1,by.z+1+Math.floor(n/3),game,16))n++;});
SB.bus.emit("friendCall",{by:by,n:n});
return{ok:n>0,n:n,msg:n?"📣 you call, and "+n+" friend"+(n>1?"s come":" comes")+" running":"nobody near knows you well enough to come (2 ♥)"};
};
function followTick(game){
var c=me(),fol=F.followers(game);
if(!c||!fol.length)return;
var grump=null,gd=9;
game.creatures.forEach(function(o){if(o.species!=="grump"||!o.alive||o.gone)return;var d=SB.dist(o.x,o.z,c.x,c.z);if(d<gd){gd=d;grump=o;}});
fol.forEach(function(f,i){
if(f.asleep||f.heldBy!=null||(f._frStay||0)>game.time)return;
if(jobs.some(function(j){return j.c===f;}))return;
if(grump&&F.fights(game,f)){if(!(f.action&&f.action.verb===SB.V.hit)&&SB.Creature.provoke){try{SB.Creature.provoke(f,grump,game);}catch(e){}}return;}
var d=SB.dist(f.x,f.z,c.x,c.z);
if(d>4.5&&!(f.action&&f.action.called&&SB.dist(f.action.tx,f.action.tz,c.x,c.z)<3.5))sendTo(f,c.x+Math.sin(i*2.1+1)*1.6,c.z+Math.cos(i*2.1+1)*1.6,game,10);
});
}
F.fights=function(game,c){return F.following(game,c)&&(F.hearts(game,c)>=6||(F.trait(c)==="brave"&&F.hearts(game,c)>=4));};
F.learnFrom=function(game,by,c){
if(!by||!isSmol(c))return{ok:false,msg:""};
if(F.hearts(game,c)<5)return{ok:false,msg:c.name+" will teach you at 5 ♥"};
var r=rec(game,c),d=day(game),I=SB.Ideas;
if(r.ld===d)return{ok:false,msg:c.name+" has taught you today. ask again tomorrow"};
var id,w;
if(I&&c.ideas)for(id in c.ideas)if(I.known(c,id)&&I.canHold(by,id)&&!I.known(by,id)){
try{I.learn(by,id,3,game,"taught");}catch(e){}
if(!I.known(by,id)){by.ideas=by.ideas||{};by.ideas[id]=1;}
r.ld=d;var nm=I.BY&&I.BY[id]?I.BY[id].name:id;
SB.bus.emit("friendTaught",{c:c,by:by,idea:id});
return{ok:true,idea:id,msg:"📖 "+c.name+" showed "+by.name+" how: "+nm};
}
var C=SB.Creature;
if(C&&C.knows&&c.vocab)for(w in c.vocab)if(C.knows(c,w)&&!C.knows(by,w)){
C.learnWord(by,w,3,game);
if(!C.knows(by,w))by.vocab[w]=1;
r.ld=d;
SB.bus.emit("friendTaught",{c:c,by:by,word:w});
return{ok:true,word:w,msg:"📖 "+c.name+" taught "+by.name+" a word: “"+w+"”"};
}
var pool=Object.keys(K()).filter(function(k){return r.k[k]==null&&F.taste(game,c,k)===2;});
if(pool.length){r.k[pool[0]]=2;r.ld=d;return{ok:true,taste:pool[0],msg:c.name+" has nothing new to teach. but it tells you it loves "+label(pool[0])};}
return{ok:false,msg:c.name+" has nothing new to teach "+by.name};
};
F.PRANKS=[["jumped out at %b and yelled boo","boo!","eep!"],["tickled %b and ran away","hehehe","hey!"],["put a beetle on %b's head","psst. look up","aaa! bug!"],["swapped %b's stick for a wet leaf","heh","…a leaf?"],["made a rude noise right behind %b","pfffbt","!!"],["hid, and let %b look everywhere","…","where you go?"]];
F.prank=function(game,a,b,byPlayer){
if(!game||!a||!b||a===b||!b.alive||b.asleep)return null;
var p=F.PRANKS[Math.floor(Math.random()*F.PRANKS.length)],txt=p[0].replace("%b",b.name);
var funny=gene(b,"grumpiness")<0.55||F.trait(a)==="cheeky"||opinion(game,b,a)>=25;
speak(a,p[1],2);emote(a,"happy",2);speak(b,funny?p[2]+" …haha!":p[2]+" not funny!",2.6);emote(b,funny?"huh":"angry",2);
if(a.stage<3)bump(a,"play");
if(funny){remember(game,b,a,"prank",6,"pranked me. it was funny",2400,18);remember(game,a,b,"prank",4,"fun to prank",2400,12);F.mood(game,b,"laugh");F.mood(game,a,"laugh");}
else{remember(game,b,a,"pranked",-8,"pranked me",2400,24);F.mood(game,b,"pranked");F.mood(game,a,"laugh");}
diary(game,a,"😜",txt.replace(b.name,b.name));diary(game,b,"😜",a.name+" "+p[0].replace("%b","me")+(funny?". we laughed":". not funny"));
var res={ok:true,funny:funny,text:txt,a:a,b:b,msg:"😜 "+a.name+" "+txt+(funny?". "+b.name+" laughs":". "+b.name+" sulks")};
SB.bus.emit("prank",{a:a,b:b,funny:funny,text:txt,byPlayer:!!byPlayer});
return res;
};
F.SOCIALS={joke:["😄","tell a joke"],dance:["💃","dance"],prank:["😜","play a prank"],cheer:["🙌","cheer"]};
F.social=function(game,by,to,kind){
if(!by||!isSmol(to)||to===by||!F.SOCIALS[kind])return{ok:false,msg:""};
if(to.asleep)return{ok:false,msg:"💤 "+to.name+" is asleep"};
if(SB.dist(by.x,by.z,to.x,to.z)>7)return{ok:false,msg:"get closer to "+to.name};
var r=rec(game,to),d=day(game),first=r.sd!==d,good=true,msg;
if(kind==="prank"){var pr=F.prank(game,by,to,true);good=pr.funny;msg=pr.msg.replace(by.name+" ","you ");}
else if(kind==="joke"){good=gene(to,"playfulness")+gene(to,"sociability")>0.7||F.hearts(game,to)>=3;speak(to,good?"hahaha!":"…me no get it",2.2);emote(to,good?"happy":"huh",2);if(good)F.mood(game,to,"laugh");msg=good?"😄 "+to.name+" laughs at your joke":"😶 "+to.name+" doesn't get it";}
else if(kind==="dance"){good=F.willing(game,by,to,2)||gene(to,"playfulness")>0.6;emote(by,"happy",3);if(good){emote(to,"happy",3);speak(to,"♪ ♪",2.4);F.mood(game,to,"laugh");}else{speak(to,"…no dance",2);emote(to,"huh",1.6);}msg=good?"💃 you and "+to.name+" dance":"🙈 "+to.name+" is too shy to dance with you yet (2 ♥)";}
else{emote(by,"proud",2);emote(to,"happy",2);speak(to,"yay!",1.6);msg="🙌 you cheer for "+to.name;}
remember(game,to,by,"fun",good?5:-3,good?"we had fun":"was a bit much",2400,15);
var got=first?F.add(game,to,good?F.PTS.social:-F.PTS.social):0;
if(first)r.sd=d;
SB.bus.emit("friendSocial",{to:to,by:by,kind:kind,good:good});
return{ok:true,good:good,pts:got,msg:msg+(got?" · "+(got>0?"+":"")+got:"")};
};
var ambLast=-999;
function ambient(game,a,text){
var m=me(),mine=SB.Mine&&SB.Mine.get?SB.Mine.get(game):null;
if(m&&SB.dist(m.x,m.z,a.x,a.z)<14){if(game.time-ambLast>40){ambLast=game.time;tell(game,text);}return;}
if(game.time-ambLast<90||(mine&&a!==mine&&SB.dist(mine.x,mine.z,a.x,a.z)>12&&Math.random()<0.6))return;
ambLast=game.time;toast(game,text,a);
}
function awake(c){return isSmol(c)&&!c.asleep&&!c.far&&!c._pov&&c.heldBy==null&&!c.dying;}
F.autoPrank=function(game){
var list=tribe(game).filter(function(c){return awake(c)&&c.stage>=1&&(gene(c,"playfulness")>0.6||F.trait(c)==="cheeky");});
if(!list.length)return null;
var a=list[Math.floor(Math.random()*list.length)],b=null,bd=9;
tribe(game).forEach(function(o){if(o===a||!awake(o))return;var d=SB.dist(o.x,o.z,a.x,a.z);if(d<bd){bd=d;b=o;}});
if(!b)return null;
var r=F.prank(game,a,b,false);
if(r)ambient(game,a,r.msg);
return r;
};
F.moment=function(game,c){
var w=game.world,list=c?[c]:tribe(game).filter(function(o){return awake(o)&&(o.stage===1||o.stage===2||gene(o,"playfulness")>0.7);});
if(!list.length)return null;
c=list[Math.floor(Math.random()*list.length)];
var rain=w.weather&&w.weather.rain>0.3,s=w.season||0;
var m=rain?["💦","hopped in every puddle it could find"]:s===3?["❄","rolled in the snow until it was a snowball"]:s===2?["🍂","jumped into a pile of leaves"]:s===0?(w.night?["✨","chased a firefly in circles"]:["🦋","chased a butterfly in circles"]):w.night?["🌙","flopped in the moonlight and wiggled"]:["☀","flopped in the sun and wiggled"];
speak(c,"wheee!",2);emote(c,"happy",2.4);
F.mood(game,c,"moment");if(c.stage<3)bump(c,"play");
diary(game,c,m[0],m[1]);
SB.bus.emit("moment",{c:c,icon:m[0],text:m[1]});
ambient(game,c,m[0]+" "+c.name+" "+m[1]);
return{c:c,icon:m[0],text:m[1]};
};
var biomeCache={seed:null,has:{}};
function hasBiome(game,id){
if(biomeCache.seed!==game.seed)biomeCache={seed:game.seed,has:{}};
if(biomeCache.has[id]!=null)return biomeCache.has[id];
var T=game.world&&game.world.T,idx=SB.B?SB.B[id]:null,found=false;
if(T&&T.biome&&idx!=null)for(var i=0;i<T.biome.length;i+=3)if(T.biome[i]===idx){found=true;break;}
return(biomeCache.has[id]=found);
}
function seen(id){return function(c){return c.visited&&c.visited[id]?1:0;};}
function stat(k){return function(c){return(c.stats&&c.stats[k])||0;};}
F.WISHES=[
{id:"sea",focus:"explorer",icon:"🌊",t:"see the sea",need:1,n:seen("beach")},
{id:"snow",focus:"explorer",icon:"❄",t:"see a snowfield",need:1,n:seen("tundra"),ok:function(c,game){return hasBiome(game,"tundra");}},
{id:"peaks",focus:"explorer",icon:"⛰",t:"see the mountains",need:1,n:seen("mountain"),ok:function(c,game){return hasBiome(game,"mountain");}},
{id:"roam",focus:"explorer",icon:"🧭",t:"walk 5 kinds of land",need:5,n:function(c){return c.visited?Object.keys(c.visited).length:0;}},
{id:"grump",focus:"explorer",icon:"🏏",t:"chase off a grump",need:1,n:stat("grumpsChased"),ok:function(c){return gene(c,"bravery")>0.45;}},
{id:"kids",focus:"family",icon:"🥚",t:"have 3 children",need:3,n:function(c,game){var n=0;game.creatures.forEach(function(o){if(o.parents&&o.parents.indexOf(c.id)>=0)n++;});return n;}},
{id:"partner",focus:"family",icon:"💕",t:"find a partner",need:1,n:function(c){return c.partner!=null?1:0;}},
{id:"invent",focus:"maker",icon:"💡",t:"invent something",need:1,n:function(c){return c.invented?Object.keys(c.invented).length:0;},ok:function(c){return c.tier>=2;}},
{id:"fish",focus:"maker",icon:"🎣",t:"catch 10 fish",need:10,n:function(c){return(c.fr&&c.fr.fish)||0;},ok:function(c){return c.tier>=2;}},
{id:"teach",focus:"thinker",icon:"🎓",t:"teach 5 lessons",need:5,n:stat("taught"),ok:function(c){return c.tier>=2;}},
{id:"words",focus:"thinker",icon:"💬",t:"know 15 words",need:15,n:function(c){return SB.Creature&&SB.Creature.knownCount?SB.Creature.knownCount(c):0;}},
{id:"friends",focus:"friend",icon:"🫂",t:"make 3 friends",need:3,n:function(c,game){var n=0,S=SB.Social;if(!S||!c.ops)return 0;for(var id in c.ops){var o=SB.Game.byId(game,+id);if(o&&o.alive&&S.opinion(game,c,o)>=S.FRIEND)n++;}return n;}},
{id:"gifts",focus:"friend",icon:"🎁",t:"give 6 gifts",need:6,n:stat("gifts")}
];
F.WISH={};F.WISHES.forEach(function(w){F.WISH[w.id]=w;});
F.FOCUS={family:"a family smol",maker:"a maker",explorer:"an explorer",thinker:"a thinker",friend:"a friend to all"};
F.focus=function(game,c){
var r=dice(game,"focus:"+c.id),sc={
family:gene(c,"affection")+gene(c,"fertility"),maker:gene(c,"dexterity")+gene(c,"curiosity")*0.8,explorer:gene(c,"curiosity")+gene(c,"bravery"),
thinker:gene(c,"learnRate")+gene(c,"chattiness")*0.8,friend:gene(c,"sociability")+gene(c,"playfulness")
},best=null,bv=-1;
for(var k in sc){var v=sc[k]+r()*0.5;if(v>bv){bv=v;best=k;}}
return best;
};
F.lifeOf=function(game,c){
if(!game||!c||c.species!=="smol"||c.stranger)return null;
var f=of(c);
if(!f.life||!F.WISH[f.life.id]){
var fo=F.focus(game,c),open=F.WISHES.filter(function(w){return(!w.ok||w.ok(c,game))&&w.n(c,game)<w.need;});
var pool=open.filter(function(w){return w.focus===fo;});
if(!pool.length)pool=open;
if(!pool.length)pool=[F.WISH.words];
f.life={id:pool[Math.floor(dice(game,"life:"+c.id)()*pool.length)%pool.length].id};
}
var def=F.WISH[f.life.id],n=Math.min(def.need,def.n(c,game));
return{def:def,n:f.life.done?def.need:n,need:def.need,done:!!f.life.done};
};
function lifeCheck(game,c){
var lw=F.lifeOf(game,c);
if(!lw||lw.done||lw.n<lw.need||!c.alive)return false;
var f=of(c),E=SB.Embers,ember=false,pay=SB.Mine&&SB.Mine.is&&SB.Mine.is(game,c)?10:6;
f.life.done=day(game);
if(E&&E.add){try{ember=E.add(game,"lifewish",c.name+"'s life wish came true",c);}catch(e){}}
if(!ember)sparks(game,pay,c);
if(c.lifespan)c.lifespan=Math.round(c.lifespan*1.05);
F.mood(game,c,"dream");emote(c,"love",3);speak(c,"me did it!",3);fx("sparkle",c,16);
diary(game,c,"🌠","my life wish came true: "+lw.def.t);
if(SB.Social&&SB.Social.chronicle&&!quiet(game))SB.Social.chronicle(game,"🌠",c.name+"'s life wish came true: to "+lw.def.t);
SB.bus.emit("lifeWish",{c:c,wish:lw.def,ember:!!ember,sparks:ember?0:pay});
toast(game,"🌠 "+c.name+"'s life wish came true: to "+lw.def.t+"! "+(ember?"a memory ember":"+"+pay+" ✨"),c);
sound("achievement",0.6);
return true;
}
F.lifeCheck=lifeCheck;
F.TRAITS={
brave:{icon:"🦁",why:"it stood up for itself as a kid",does:"fear leaves it fast, and it fights beside a friend sooner"},
gentle:{icon:"🕊",why:"it was raised with tickles, never a tap",does:"everyone it talks to warms to it"},
clever:{icon:"🦉",why:"it was taught a lot when it was small",does:"it wakes up inspired every morning"},
greedy:{icon:"🍯",why:"it was spoiled with gifts and treats",does:"any food is a good gift. it's always peckish, and gives nothing back"},
cheeky:{icon:"😜",why:"it played all day as a kid",does:"it pranks twice as much, and its pranks always land"},
tough:{icon:"🪨",why:"it took its knocks growing up",does:"pain fades from it fast"},
kind:{icon:"💛",why:"it shared what it had as a kid",does:"it leaves you gifts sooner, and more often"},
curious:{icon:"🔍",why:"it wandered far as a kid",does:"it turns up with something it found, some mornings"}
};
function bump(c,k,n){var f=of(c),u=f.up||(f.up={});u[k]=(u[k]||0)+(n||1);}
F.upbringing=function(c){return(c&&c.fr&&c.fr.up)||{};};
F.trait=function(c){return c&&c.fr&&F.TRAITS[c.fr.trait]?c.fr.trait:null;};
F.scoreTraits=function(game,c){
var u=F.upbringing(c),r=dice(game,"trait:"+c.id),ex=c.visited?Object.keys(c.visited).length:0;
function n(k){return u[k]||0;}
return{
brave:n("fight")*2+(ex>=4?2:0)+gene(c,"bravery")*4+r(),gentle:n("tickle")*1.2-n("tap")*2-n("fight")+gene(c,"affection")*4+r(),
clever:n("word")*1.5+n("taught")*2+gene(c,"learnRate")*4+r(),greedy:n("spoil")*2+gene(c,"appetite")*3.5+r(),
cheeky:n("play")*3+gene(c,"playfulness")*4+r(),tough:n("tap")*2+gene(c,"toughness")*3.5+r(),
kind:n("share")*3+gene(c,"sociability")*3.5+r(),curious:ex*0.8+gene(c,"curiosity")*4+r()
};
};
F.grantTrait=function(game,c,announce){
if(!c||c.species!=="smol")return null;
var f=of(c);if(F.TRAITS[f.trait])return f.trait;
var sc=F.scoreTraits(game,c),best=null,bv=-1e9;
for(var k in sc)if(sc[k]>bv){bv=sc[k];best=k;}
f.trait=best;
if(announce){
diary(game,c,F.TRAITS[best].icon,"grew up "+best+": "+F.TRAITS[best].why.replace(/\bit\b/g,"I").replace("its","my").replace("itself","myself"));
toast(game,"🎂 "+c.name+" is all grown up, and grew up "+F.TRAITS[best].icon+" <b>"+best+"</b>: "+F.TRAITS[best].why,c);
}
SB.bus.emit("trait",{c:c,trait:best,announced:!!announce});
return best;
};
F.quirk=function(c){
if(!c||c.stage>1)return null;
var q=[["clingy",gene(c,"affection")],["wild",gene(c,"bravery")],["sleepy",gene(c,"sleepiness")],["chatty",gene(c,"chattiness")],["shy",1-gene(c,"sociability")],["nosy",gene(c,"curiosity")]];
q.sort(function(a,b){return b[1]-a[1];});
return q[0][0];
};
function party(game,c){
var n=0;
tribe(game).forEach(function(o){
if(o===c||n>=5||!awake(o)||SB.dist(o.x,o.z,c.x,c.z)>30)return;
if(!(SB.Game.related&&SB.Game.related(game,o,c))&&opinion(game,o,c)<25)return;
if(sendTo(o,c.x+Math.sin(n*1.3)*1.5,c.z+Math.cos(n*1.3)*1.5,game,12)){n++;speak(o,"🎂 yay "+c.name+"!",2.4);}
});
F.mood(game,c,"bday");speak(c,"me big now!",2.4);
SB.bus.emit("party",{c:c,guests:n});
return n;
}
F.party=party;
F.matchWhy=function(game,a,b){
var S=SB.Social;
if(!S||!a||!b||a===b)return"pick two smols";
if(!S.eligible(game,a,b))return a.stage!==3||b.stage!==3?"both have to be grown-ups, and not elders":a.sex===b.sex?"these two would only ever be friends":"these two are family";
if(S.partnerOf(game,a)||S.partnerOf(game,b))return"one of them has a partner already";
if(st(game).md===day(game))return"one nudge a day. let it work";
return"";
};
F.candidates=function(game,a){var S=SB.Social;if(!S)return[];return tribe(game).filter(function(b){return b!==a&&S.eligible(game,a,b)&&!S.partnerOf(game,a)&&!S.partnerOf(game,b);}).sort(function(x,y){return opinion(game,a,y)-opinion(game,a,x);}).slice(0,4);};
F.match=function(game,a,b){
var why=F.matchWhy(game,a,b);
if(why)return{ok:false,msg:why};
var s=st(game);s.md=day(game);
[[a,b],[b,a]].forEach(function(p){
p[0].chem.love=Math.max(p[0].chem.love||0,0.5);p[0].shy=null;
remember(game,p[0],p[1],"matched",10,"the Lantern thinks we'd get along",3000,20);
F.mood(game,p[0],"matched");emote(p[0],"love",2);
diary(game,p[0],"💘","can't stop thinking about "+p[1].name);
});
var mx=(a.x+b.x)/2,mz=(a.z+b.z)/2;
sendTo(a,mx+0.5,mz,game,20);sendTo(b,mx-0.5,mz,game,20);
s.match={a:a.id,b:b.id,until:Math.round(game.time+60)};
SB.bus.emit("matched",{a:a,b:b});
return{ok:true,msg:"💘 you nudge "+a.name+" and "+b.name+" toward each other. the rest is up to them"};
};
function matchTick(game){
var s=st(game),m=s.match;if(!m)return;
var a=SB.Game.byId(game,m.a),b=SB.Game.byId(game,m.b);
if(!isSmol(a)||!isSmol(b)||game.time>m.until){s.match=null;return;}
if(SB.dist(a.x,a.z,b.x,b.z)<2.6){
s.match=null;
var ok=false;try{ok=SB.Social.court(game,a,b,"talk");}catch(e){}
speak(a,"…hi",2);speak(b,"hi!",2);
SB.bus.emit("matchMet",{a:a,b:b,courting:!!ok});
}
}
F.wedding=function(game){return st(game).wed||null;};
function startWedding(game,a,b){
var s=st(game);
if(s.wed||!isSmol(a)||!isSmol(b))return null;
var sp=gatherSpot(game,(a.x+b.x)/2,(a.z+b.z)/2),n=0;
s.wed={a:a.id,b:b.id,t:Math.round(game.time),x:sp.x,z:sp.z,fire:sp.fire?1:0,ph:0,bless:0};
sendTo(a,sp.x+0.5,sp.z,game,24);sendTo(b,sp.x-0.5,sp.z,game,24);
tribe(game).filter(function(o){return o!==a&&o!==b&&awake(o)&&SB.dist(o.x,o.z,sp.x,sp.z)<45;})
.sort(function(x,y){return SB.dist2(x.x,x.z,sp.x,sp.z)-SB.dist2(y.x,y.z,sp.x,sp.z);}).slice(0,10)
.forEach(function(o){if(sendTo(o,sp.x+Math.sin(n*0.7)*2.6,sp.z+Math.cos(n*0.7)*2.6,game,24))n++;});
SB.bus.emit("weddingStart",{a:a,b:b,x:sp.x,z:sp.z,invited:n});
tell(game,"💒 "+a.name+" and "+b.name+" are getting wed"+(sp.fire?" at the fire":"")+"! the tribe is gathering. be there, or bless them",a);
return s.wed;
}
F.startWedding=startWedding;
F.bless=function(game){
var w=st(game).wed;if(!w||w.bless)return{ok:false,msg:w?"it's blessed already":"no wedding to bless"};
w.bless=1;
var a=SB.Game.byId(game,w.a),b=SB.Game.byId(game,w.b);
[a,b].forEach(function(c){if(isSmol(c)){F.mood(game,c,"blessed");F.add(game,c,20);fx("sparkle",c,12);}});
SB.bus.emit("weddingBlessed",{a:a,b:b});
sound("chime",0.6);
return{ok:true,msg:"✨ the Lantern blesses "+(a?a.name:"them")+" and "+(b?b.name:"them")};
};
function wedTick(game){
var s=st(game),w=s.wed;if(!w)return;
var a=SB.Game.byId(game,w.a),b=SB.Game.byId(game,w.b);
if(!isSmol(a)||!isSmol(b)||a.partner!==b.id){s.wed=null;return;}
if(w.ph===0){
var both=SB.dist(a.x,a.z,w.x,w.z)<4&&SB.dist(b.x,b.z,w.x,w.z)<4;
if(!both&&game.time-w.t<F.WED_GATHER)return;
w.ph=1;w.t1=Math.round(game.time);
var guests=tribe(game).filter(function(o){return o!==a&&o!==b&&!o.asleep&&SB.dist(o.x,o.z,w.x,w.z)<9;});
var m=me(),there=!!m&&SB.dist(m.x,m.z,w.x,w.z)<11;
var q=Math.min(4,Math.floor(guests.length/2))+(w.fire?1:0)+(w.bless?2:0)+(there?1:0),word=q>=6?"grand":q>=4?"lovely":q>=2?"sweet":"quiet";
w.q=q;w.n=guests.length;
[[a,b],[b,a]].forEach(function(p){
F.mood(game,p[0],"wed");emote(p[0],"love",4);speak(p[0],"💍",3);fx("hearts",p[0],8);
remember(game,p[0],p[1],"wedding",8+q*2,"our "+word+" wedding",6000,30);
of(p[0]).keep={n:p[1].name,d:day(game),q:word};
diary(game,p[0],"💒","wed "+p[1].name+". a "+word+" wedding, "+guests.length+" came");
});
guests.forEach(function(o,i){
F.mood(game,o,"guest");emote(o,"happy",3);if(i<5)speak(o,["yay!","aww","hooray!","♪","💕"][i],2.4);
if(i<8){remember(game,o,a,"wedguest",5,"danced at their wedding",3000,10);remember(game,o,b,"wedguest",5,"danced at their wedding",3000,10);}
});
if(SB.Social&&SB.Social.chronicle)SB.Social.chronicle(game,"💒",a.name+" and "+b.name+" had a "+word+" wedding"+(w.fire?" by the fire":"")+" ("+guests.length+" came"+(w.bless?", and the Lantern blessed it":"")+")");
if(there){
addItem(game,m,"knot",1);F.add(game,a,30);F.add(game,b,30);w.there=1;
note(game,a,"you came to my wedding");note(game,b,"you came to my wedding");
}
s.weds=(s.weds||0)+1;
SB.bus.emit("wedding",{a:a,b:b,quality:q,word:word,guests:guests.length,blessed:!!w.bless,attended:there});
tell(game,"💒 "+a.name+" and "+b.name+" are wed! a "+word+" wedding, "+guests.length+" came"+(there?". you keep a 🎀 wedding knot":""),a);
sound("achievement",0.6);
return;
}
if(game.time-w.t1>F.WED_LEN){s.wed=null;SB.bus.emit("weddingEnd",{a:a,b:b});}
}
F.FESTS=[
{id:"dance",icon:"🌸",name:"the blossom dance",join:"join the blossom dance",how:"dance by the fire. look at a friend first and you dance together"},
{id:"feast",icon:"🍲",name:"the big summer feast",join:"bring your food to the feast",how:"hold some food and add it to the pot. cooked food makes a better feast"},
{id:"contest",icon:"🪵",name:"the autumn log-bonk",join:"take your turn at the log",how:"bonk the log as hard as you can. the best bonk wins the ribbon"},
{id:"swap",icon:"🎁",name:"the winter gift swap",join:"who is my secret friend?",how:"give your secret friend something they like before the fire burns down"}
];
F.fest=function(game){var f=st(game).fest;return f&&game.time<f.until?f:null;};
F.nextFest=function(game){
var sd=SB.seasonDays(game),t=(game.time||0)/SB.DAY_LENGTH,nextAt=(Math.floor(t/sd+1e-9)+1)*sd;
return{def:F.FESTS[(Math.floor(t/sd+1e-9)+1)%4],days:Math.round((nextAt-t)*10)/10};
};
F.startFest=function(game,k){
var s=st(game),def=F.FESTS[k],list=tribe(game);
if(!def||list.length<3||story(game))return null;
var n=game.world.T&&game.world.T.nest,sp=gatherSpot(game,n?n.x:list[0].x,n?n.z:list[0].z);
s.fest={k:k,day:day(game),t:Math.round(game.time),until:Math.round(game.time+F.FEST_LEN),x:sp.x,z:sp.z,done:0,gT:0};
if(k===3){var m=me(),pool=list.filter(function(c){return c!==m;});s.fest.who=pool[Math.floor(dice(game,"swap:"+day(game))()*pool.length)%pool.length].id;}
festGather(game);
SB.bus.emit("festival",{k:k,def:def,x:sp.x,z:sp.z});
toast(game,def.icon+" <b>"+def.name+"!</b> the tribe is gathering"+(sp.fire?" by the fire":" at the nest")+". step into a smol and join in",{x:sp.x,z:sp.z});
if(me()&&SB.Possess.say)SB.Possess.say(def.icon+" "+def.name+"! the tribe is gathering"+(sp.fire?" by the fire":" at the nest")+". go and join in");
return s.fest;
};
function festGather(game){
var f=st(game).fest,n=0;if(!f)return;
tribe(game).forEach(function(c){
if(n>=12||!awake(c)||c.plan||(c.chem&&c.chem.hunger>0.7)||F.following(game,c))return;
var d=SB.dist(c.x,c.z,f.x,f.z);
if(d>60)return;
if(d>5)sendTo(c,f.x+Math.sin(n*0.55)*3,f.z+Math.cos(n*0.55)*3,game,30);
else if(Math.random()<0.3){emote(c,"happy",2.4);speak(c,f.k===1?"yum!":"♪",2);}
n++;
});
}
F.atFest=function(game,c){var f=F.fest(game);return!!f&&!!c&&SB.dist(c.x,c.z,f.x,f.z)<13;};
function festReward(game,c,grade,other){
var f=st(game).fest,def=F.FESTS[f.k],sp=[1,3,5][grade],msg;
f.done=1;f.grade=grade;
sparks(game,sp,c);F.mood(game,c,"fest");
if(f.k===0){addItem(game,c,"posy",1);msg=(other?"💃 you and "+other.name+" dance the blossom dance":"💃 you dance the blossom dance by yourself")+". a 💐 posy, and +"+sp+" ✨";if(other)F.add(game,other,40);}
else if(f.k===1)msg=["🍲 you came empty-handed. the feast is plain, but there's a place for you","🍲 into the pot it goes. a good feast","🍲 what a feast! everyone eats until they're round"][grade]+". +"+sp+" ✨";
else if(f.k===2){if(grade===2)addItem(game,c,"ribbon",1);msg=(grade===2?"🪵 BONK! "+f.mine+" beats "+(other?other.name+"'s ":"")+f.best+". the 🎗 ribbon is yours":"🪵 bonk. "+f.mine+": "+(other?other.name:"someone")+" wins with "+f.best)+". +"+sp+" ✨";}
else{if(grade===2){var back=K().heartfruit&&dice(game,"swapback:"+f.day)()<0.35?"heartfruit":"honey";addItem(game,c,back,1);msg="🎁 your secret friend loved it, and gives you "+label(back)+" back";}else msg=grade===1?"🎁 your secret friend says thank you":"🎁 your secret friend makes a face. it's the thought";msg+=". +"+sp+" ✨";}
SB.bus.emit("festJoin",{k:f.k,def:def,c:c,grade:grade,sparks:sp});
sound("achievement",0.6);
return msg;
}
F.joinFest=function(game,c,look){
var f=F.fest(game);if(!f||!c)return{ok:false,msg:"no festival today"};
if(f.done)return{ok:false,msg:"you've had your turn. enjoy the day"};
if(!F.atFest(game,c))return{ok:false,msg:"the festival is over there: go to where the tribe is"};
if(f.k===0){
var p=isSmol(look)&&look!==c&&SB.dist(look.x,look.z,c.x,c.z)<8?look:null;
if(p&&!(F.willing(game,c,p,2)||opinion(game,p,c)>=8)){speak(p,"…no dance",2);return{ok:false,msg:"🙈 "+p.name+" is too shy to dance with you (2 ♥). ask someone else, or dance alone"};}
if(p){emote(p,"love",3);speak(p,"♪ ♪ ♪",3);}
emote(c,"happy",3);
return{ok:true,msg:festReward(game,c,p?2:1,p)};
}
if(f.k===1){
var v=Sv().inv(c),sl=Sv().held(c),grade=0;
if(sl&&Sv().edible(sl.k)){grade={cooked:2,bread:2,honey:2,heartfruit:2}[sl.k]?2:1;Sv().removeAt(c,v.sel,1);}
tribe(game).forEach(function(o){if(SB.dist(o.x,o.z,f.x,f.z)<13&&o.chem){o.chem.hunger=Math.max(0,o.chem.hunger-0.15*(grade+1));if(grade&&o!==c)F.add(game,o,5*grade);}});
return{ok:true,msg:festReward(game,c,grade)};
}
if(f.k===2){
var r=dice(game,"bonk:"+f.day+":"+c.id),sk=SB.Body&&SB.Body.bonus?SB.Body.bonus(c,"fight"):0;
f.mine=Math.round(35+(c.tier||0)*6+Math.min(20,sk*40)+gene(c,"toughness")*10+r()*30);
var rivals=tribe(game).filter(function(o){return o!==c&&o.stage>=2&&SB.dist(o.x,o.z,f.x,f.z)<20;}),rv=rivals.length?rivals[Math.floor(r()*rivals.length)%rivals.length]:null;
f.best=Math.round(40+r()*45+(rv?gene(rv,"toughness")*10:0));
if(rv){emote(rv,f.mine>f.best?"huh":"proud",2.4);speak(rv,f.mine>f.best?"whoa!":"me win!",2.4);}
return{ok:true,msg:festReward(game,c,f.mine>f.best?2:1,rv)};
}
var who=SB.Game.byId(game,f.who);
if(!isSmol(who)){f.who=null;return{ok:true,msg:festReward(game,c,1,null)};}
return{ok:true,msg:"🎁 your secret friend is "+who.name+". give them something they'd like"};
};
function festTick(game){
var s=st(game),f=s.fest;if(!f)return;
if(game.time>=f.until){
tribe(game).forEach(function(c){if(SB.dist(c.x,c.z,f.x,f.z)<13)F.mood(game,c,"fest");});
s.last={k:f.k,day:f.day,joined:f.done?1:0};s.fest=null;
SB.bus.emit("festivalEnd",{k:f.k,joined:!!f.done});
return;
}
if(game.time>=(f.gT||0)){f.gT=Math.round(game.time+30);festGather(game);}
}
F.BACK=["berry","apple","honey","fish","cooked","herb","fiber","flint","nutmeat","cherry"];
function dawn(){
var game=cur();if(!game||quiet(game)||story(game))return;
var s=st(game),d=day(game),m=me(),mine=SB.Mine&&SB.Mine.get?SB.Mine.get(game):null,home=SB.Home&&SB.Home.get?SB.Home.get(game):null,gave=0,bdays=[];
for(var id in s.h){
var c=SB.Game.byId(game,+id),r=s.h[id];
if(!c||!c.alive){if(!c||c.gone)delete s.h[id];continue;}
var h=F.hearts(game,c),tr=F.trait(c);
if(h<F.MAX&&(r.seen||0)<d-1&&r.p>0)r.p=Math.max(0,r.p-4);
if(h>=1&&F.isHatchDay(game,c))bdays.push(c);
if(gave<2&&tr!=="greedy"&&h>=(tr==="kind"?3:4)&&dice(game,"back:"+id+":"+d)()<(tr==="kind"?0.6:0.35)){
var pool=F.BACK.filter(function(k){return K()[k];}),k=pool[Math.floor(dice(game,"backk:"+id+":"+d)()*pool.length)%pool.length],where;
if(home&&SB.Home.has(game,"chest")&&SB.Home.put(game,k,1)===0)where="in your chest";
else{var at=m||mine||c;if(Sv().spawn)Sv().spawn(game,k,1,(home?home.x:at.x)+0.9,(home?home.z:at.z)+0.7);where=home?"at your door":m||mine?"at "+(m||mine).name+"'s feet":"by the nest";}
gave++;r.back=d;
SB.bus.emit("friendGift",{c:c,kind:k,where:where});
tell(game,"🎁 "+c.name+" left you "+(/s$/.test(label(k))?"some ":"a ")+label(k)+" "+where,c);
}
}
if(bdays.length)toast(game,"🎂 it's "+bdays[0].name+"'s hatch-day"+(bdays.length>1?" (and "+(bdays.length-1)+" more)":"")+": a gift today counts "+F.HATCHDAY+" times",bdays[0]);
tribe(game).forEach(function(c){
var tr=F.trait(c);
if(tr==="clever")c.inspired=Math.max(c.inspired||0,90);
if(tr==="curious"&&!c._pov&&Sv().spawn&&dice(game,"find:"+c.id+":"+d)()<0.25){var fk=["flint","berry","fiber","seed","crystal"].filter(function(x){return K()[x];});fk=fk[Math.floor(dice(game,"findk:"+c.id+":"+d)()*fk.length)%fk.length];Sv().spawn(game,fk,1,c.x+0.5,c.z+0.4);diary(game,c,"🔍","found a "+label(fk)+" on my wanderings");SB.bus.emit("friendFound",{c:c,kind:fk});}
});
}
F._dawn=dawn;
var tT=0,slowT=0,playT=50,cursor=0;
function visit(game,c){
if(!isSmol(c))return;
lifeCheck(game,c);
if(c.stage>=3&&!F.trait(c))F.grantTrait(game,c,false);
var tr=F.trait(c),ch=c.chem;if(!ch)return;
if(tr==="brave"&&ch.fear>0)ch.fear=Math.max(0,ch.fear-0.15);
else if(tr==="tough"&&ch.pain>0)ch.pain=Math.max(0,ch.pain-0.1);
else if(tr==="greedy"&&!c._pov)ch.hunger=Math.min(1,ch.hunger+0.02);
var ms=F.moodScore(game,c);
if(ms>0){ch.bored=Math.max(0,ch.bored-0.02*ms);ch.lonely=Math.max(0,ch.lonely-0.02*ms);}
else if(ms<0)ch.anger=Math.min(1,(ch.anger||0)-0.02*ms);
}
F.visit=visit;
F.tick=function(game,dt){
if(!game||quiet(game))return;
if((tT-=dt)>0)return;
var step=0.5-tT;tT=0.5;
errandTick(game);followTick(game);matchTick(game);wedTick(game);festTick(game);skyScan(game);
if((slowT-=step)<=0){
slowT=2;
var list=SB.Game.smols(game);
for(var i=0;i<6&&list.length;i++){cursor=(cursor+1)%list.length;F.visit(game,list[cursor]);}
}
if(story(game))return;
if((playT-=step)<=0){
playT=45+Math.random()*45;
if(tribe(game).some(function(c){return F.trait(c)==="cheeky";}))playT*=0.6;
if(Math.random()<0.6)F.autoPrank(game);else F.moment(game);
}
};
var hooked=false;
F.hook=function(){
if(hooked||!SB.bus)return;hooked=true;
var on=SB.bus.on;
function up(d,k){if(d&&d.c&&d.c.species==="smol"&&d.c.stage<3)bump(d.c,k);}
on("dawn",dawn);
on("give",function(d){
var game=cur();if(!game||!d||!d.c||!d.to||!d.item)return;
up(d,"share");
if(d.c._pov&&d.to.species==="smol")F._lastGift=F.gift(game,d.to,d.item.kind,d.c,d.item);
});
on("eat",function(d){var game=cur();if(game&&d&&d.c&&d.obj&&handled(game,d.obj.id))skyGift(game,d.c,d.obj);});
on("tickle",function(d){
var game=cur(),c=d&&d.c;if(!game||!c||c.species!=="smol")return;
up(d,"tickle");
var w=st(game).wed;
if(w&&!w.bless&&(w.a===c.id||w.b===c.id)){var b=F.bless(game);if(b.ok)toast(game,b.msg,c);}
if(!isSmol(c))return;
var r=rec(game,c);
if(r.kd!==day(game)){r.kd=day(game);F.add(game,c,F.PTS.tickle);}
});
on("tap",function(d){up(d,"tap");});
on("learnWord",function(d){up(d,"word");});
on("teach",function(d){if(d&&d.student&&d.student.stage<3)bump(d.student,"taught");});
on("hit",function(d){
var game=cur();up(d,"fight");
if(!game||!d||!d.c||!d.target||d.target.species!=="grump"||!d.target.alive||!F.fights(game,d.c))return;
var need=SB.Threats&&SB.Threats.whacksNeeded?SB.Threats.whacksNeeded(d.target):3;
d.target.whacked=Math.min(Math.max(d.target.whacked||0,need-0.5),(d.target.whacked||0)+(F.trait(d.c)==="brave"?0.75:0.5));
SB.bus.emit("friendFought",{c:d.c,g:d.target});
});
on("fish",function(d){if(d&&d.c&&d.c.species==="smol"){var f=of(d.c);f.fish=(f.fish||0)+1;}});
on("wishGranted",function(d){var game=cur();if(game&&d&&isSmol(d.c)){F.add(game,d.c,F.PTS.wish);note(game,d.c,"you gave me my wish");bump(d.c,"spoil");}});
on("grumpChased",function(d){
var game=cur(),c=d&&d.c;if(!game||!c||!c._pov||quiet(game))return;
var n=0;
tribe(game).forEach(function(o){if(o===c||SB.dist(o.x,o.z,c.x,c.z)>14)return;n++;F.mood(game,o,"saved");F.add(game,o,F.PTS.saved);note(game,o,"you chased a grump off");remember(game,o,c,"hero",12,"chased a grump off for us",3600,24);if(SB.Orders&&SB.Orders.addTrust)SB.Orders.addTrust(o,0.03);if(n<=3){emote(o,"love",2.4);speak(o,"hero!",2.4);}});
if(n){var k=K().cooked?"cooked":"berry";if(Sv().spawn)Sv().spawn(game,k,1,c.x+0.7,c.z+0.5);SB.bus.emit("hero",{c:c,n:n,gift:k});}
});
on("partners",function(d){var game=cur();if(game&&d&&d.a&&d.b&&!quiet(game)&&!story(game))startWedding(game,d.a,d.b);});
on("season",function(){var game=cur();if(game&&!quiet(game))F.startFest(game,game.world.season||0);});
on("grow",function(d){
var game=cur(),c=d&&d.c;if(!game||!c||c.species!=="smol"||c.stage!==3||quiet(game))return;
if(!F.trait(c)){F.grantTrait(game,c,true);party(game,c);}
});
on("convo",function(d){
var game=cur();if(!game||!d||!d.a||!d.b)return;
if(F.trait(d.a)==="gentle")remember(game,d.b,d.a,"gentle",3,"is so gentle",2400,12);
if(F.trait(d.b)==="gentle")remember(game,d.a,d.b,"gentle",3,"is so gentle",2400,12);
});
on("unpossess",function(){jobs=[];});
};
F.hook();
F._focus=null;
F.focusOn=function(c){F._focus=c?c.id:null;};
function options(game,c,r,o,x){
if(!game||!c)return;
var fe=F.fest(game),cr=r&&r.type==="creature"?r.ref:null;
if(cr&&cr.species==="smol"&&cr!==c&&cr.alive&&!cr.stranger){
if(o.use&&!o.use.locked&&/^talk to /.test(o.use.label||"")){
var go0=o.use.go;
o.use.go=function(){var ok=go0();if(ok){var t=F.talk(game,c,cr);if(t)x.say(t.msg);}return ok;};
}
if(x.held&&x.hk&&x.hk!=="plans"){
var known=F.known(game,cr)[x.hk],hk=x.hk;
o.place=x.op("give "+cr.name+" your "+label(hk)+(known!=null?" ("+F.WORD[String(known)]+" it)":" (a gift)"),function(){
if(SB.dist(cr.x,cr.z,c.x,c.z)>2.6){x.say("get closer to give it");return false;}
F._lastGift=null;
var it=Sv().give(c,game,cr,Sv().inv(c).sel);
if(!it)return false;
x.say(F._lastGift?F._lastGift.msg:"you gave "+cr.name+" your "+label(hk));
x.audio(F._lastGift&&F._lastGift.taste<0?"bonk":"chime",0.5);
return true;
},SB.V?SB.V.give:null);
}
var w=F.wedding(game);
if(w&&!w.bless&&w.ph===0&&(w.a===cr.id||w.b===cr.id))o.pick=x.op("bless the wedding",function(){var b=F.bless(game);x.say(b.msg);return b.ok;},null);
else if(fe&&fe.k===0&&!fe.done&&F.atFest(game,c))o.pick=x.op("dance with "+cr.name,function(){var j=F.joinFest(game,c,cr);x.say(j.msg);return j.ok;},null);
else o.pick=x.op("ask "+cr.name+"… ("+F.hearts(game,cr)+" ♥)",function(){F._focus=cr.id;x.openBag("friends");return true;},null);
return;
}
if(fe&&!fe.done&&F.atFest(game,c)&&!o.pick&&(!r||r.type==="struct")){
var def=F.FESTS[fe.k];
o.pick=x.op(def.icon+" "+def.join,function(){var j=F.joinFest(game,c,null);x.say(j.msg);return j.ok;},null);
}
}
F.options=options;
F.focus0=function(game,c){
var f=F._focus!=null?SB.Game.byId(game,F._focus):null;
if(isSmol(f)&&f!==c)return f;
var best=null,bd=9;
tribe(game).forEach(function(o){if(o===c)return;var d=SB.dist(o.x,o.z,c.x,c.z);if(d<bd){bd=d;best=o;}});
return best;
};
F.canPosy=function(c){for(var k in F.POSY)if(Sv().count(c,k,true)<F.POSY[k])return false;return c.tier>=2;};
F.makePosy=function(game,c){
if(c.tier<2)return{ok:false,msg:"it takes hands: a tool-user and up"};
if(!F.canPosy(c))return{ok:false,msg:"a posy needs 2 leaves and 1 berry"};
for(var k in F.POSY)Sv().take(c,k,F.POSY[k]);
addItem(game,c,"posy",1);
SB.bus.emit("craft",{c:c,id:"posy",pov:!!c._pov});
return{ok:true,msg:"💐 a posy. nearly everyone likes one"};
};
function esc(s){return String(s).replace(/[&<>"']/g,function(ch){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}
function btn(attr,val,text,off,go){return"<button class='btn"+(go?" go":"")+"' data-fr"+attr+"='"+esc(val)+"' "+(off?"disabled":"")+">"+text+"</button>";}
function tastesHtml(game,c){
var k=F.known(game,c),groups={"2":[],"1":[],"0":[],"-1":[],"-2":[]},out=[];
for(var id in k)if(groups[String(k[id])]&&K()[id])groups[String(k[id])].push(emo(id)+" "+esc(label(id)));
["2","1","0","-1","-2"].forEach(function(t){if(groups[t].length)out.push("<b>"+F.WORD[t]+"</b> "+groups[t].join(", "));});
return out.length?out.join(" · "):"you don't know what it likes yet. give it things and see";
}
F.html=function(game,c,icon){
var out="",fe=F.fest(game),w=F.wedding(game),s=st(game),d=day(game),row="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
if(fe){var def=F.FESTS[fe.k],who=fe.k===3&&fe.who!=null?SB.Game.byId(game,fe.who):null;out+="<div class='lbl'>"+def.icon+" today: "+esc(def.name)+"</div><p>"+esc(def.how)+(who&&!fe.done?". your secret friend: <b>"+esc(who.name)+"</b>":"")+"</p>"+row+btn("fest","1",fe.done?"you've had your turn":def.join,!!fe.done||!F.atFest(game,c),true)+(F.atFest(game,c)?"":"<span class='help'>go to where the tribe is gathered</span>")+"</div>";}
else{var nf=F.nextFest(game);out+="<div class='lbl'>"+nf.def.icon+" next: "+esc(nf.def.name)+", in "+nf.days+" day"+(nf.days===1?"":"s")+"</div>";}
if(w){var wa=SB.Game.byId(game,w.a),wb=SB.Game.byId(game,w.b);if(wa&&wb)out+="<div class='lbl'>💒 "+esc(wa.name)+" and "+esc(wb.name)+" are getting wed</div>"+row+btn("bless","1","✨ bless the wedding",!!w.bless,true)+"<span class='help'>be near them when they tie the knot and you keep a keepsake</span></div>";}
var f=F.focus0(game,c);
if(f){
var h=F.hearts(game,f),nx=F.nextUnlock(game,f),lw=F.lifeOf(game,f),tr=F.trait(f),md=F.moods(game,f),r=rec(game,f),near=SB.dist(f.x,f.z,c.x,c.z)<7,fol=F.following(game,f),q=F.quirk(f),keep=f.fr&&f.fr.keep;
out+="<div class='lbl'>"+esc(f.name)+" · <span style='color:#ff6b9a'>"+F.heartsText(game,f)+"</span>"+(F.isHatchDay(game,f)?" · 🎂 hatch-day":"")+"</div><div class='rlist'>";
out+="<div class='rc'><span class='big'>💗</span><div class='t'>"+h+" of "+F.MAX+" hearts"+(r.td===d?" · talked today":" · say hello today")+(r.gd===d?" · had a gift today":"")+"<small>"+(nx?"at "+nx.at+" ♥: "+esc(nx.text):"best friends")+"</small></div></div>";
out+="<div class='rc'><span class='big'>🎁</span><div class='t'>tastes<small>"+tastesHtml(game,f)+"</small></div></div>";
if(tr)out+="<div class='rc'><span class='big'>"+F.TRAITS[tr].icon+"</span><div class='t'>"+tr+"<small>"+esc(F.TRAITS[tr].why)+". "+esc(F.TRAITS[tr].does)+"</small></div></div>";
else if(q)out+="<div class='rc'><span class='big'>🐣</span><div class='t'>a "+q+" little one<small>how it's raised decides what it grows up to be</small></div></div>";
if(lw)out+="<div class='rc'><span class='big'>"+lw.def.icon+"</span><div class='t'>life wish: "+esc(lw.def.t)+"<small>"+esc(F.FOCUS[lw.def.focus]||"")+" · "+(lw.done?"it came true":lw.n+"/"+lw.need)+"</small></div>"+(lw.done?"<span class='ok'>✓</span>":"")+"</div>";
if(md.length||keep)out+="<div class='rc'><span class='big'>"+(md.length?md[md.length-1].icon:"💒")+"</span><div class='t'>feeling<small>"+md.map(function(m){return m.icon+" "+esc(m.text);}).join(" · ")+(keep?(md.length?" · ":"")+"💒 wed to "+esc(keep.n)+" (a "+esc(keep.q)+" wedding)":"")+"</small></div></div>";
out+="</div><div class='lbl'>ask "+esc(f.name)+"</div>"+row+btn("cmd","come","📣 come")+btn("cmd","stay","✋ stay")+btn("cmd","follow",fol?"🐾 stop following":"🐾 follow me")+btn("cmd","home","🏠 go home")+(SB.Motion3&&SB.Motion3.askCourse&&f.tier>=2&&Sv().has(c,"ball")?btn("course","1","⛳ put up a kick course",!near):"");
F.fetchables(game,f).forEach(function(k){out+=btn("get",k,"👉 get "+(icon?icon(k,16)+" ":"")+esc(label(k)));});
out+="</div><div class='lbl'>together"+(near?"":" · get closer")+"</div>"+row;
for(var sk in F.SOCIALS)out+=btn("soc",sk,F.SOCIALS[sk][0]+" "+F.SOCIALS[sk][1],!near);
out+=btn("learn","1","📖 teach me",h<5||r.ld===d)+"</div>";
var cand=F.candidates(game,f);
if(cand.length){out+="<div class='lbl'>💘 nudge "+esc(f.name)+" toward…"+(s.md===d?" (one a day)":"")+"</div>"+row;cand.forEach(function(b){out+=btn("match",b.id,"💘 "+esc(b.name),s.md===d);});out+="</div>";}
}else out+="<p><b>nobody near.</b> look at a smol and choose “ask”, or call someone by name below.</p>";
out+="<div class='lbl'>everyone · call by name</div>"+row+btn("all","1","📣 call your friends")+btn("posy","1","💐 tie a posy (2 leaves, 1 berry)",!F.canPosy(c))+"</div><div class='rlist'>";
tribe(game).filter(function(o){return o!==c;}).sort(function(a,b){return F.points(game,b)-F.points(game,a)||a.id-b.id;}).slice(0,24).forEach(function(o){
var r2=s.h[o.id]||{};
out+="<div class='rc'><div class='t'>"+esc(o.name)+(F.following(game,o)?" 🐾":"")+(F.isHatchDay(game,o)?" 🎂":"")+" <span style='color:#ff6b9a'>"+F.heartsText(game,o)+"</span><small>"+(r2.td===d?"💬✓ ":"💬– ")+(r2.gd===d?"🎁✓":"🎁–")+(F.trait(o)?" · "+F.trait(o):"")+"</small></div>"+btn("pick",o.id,"ask")+btn("call",o.id,"call")+"</div>";
});
return out+"</div>";
};
F.wire=function(root,game,c,redraw,say){
function done(r){if(r&&r.msg&&say)say(r.msg);if(r&&r.ok)sound("craft",0.5);redraw();}
function each(attr,fn){root.querySelectorAll("[data-fr"+attr+"]").forEach(function(b){b.addEventListener("click",function(){fn(b.getAttribute("data-fr"+attr));});});}
function f(){return F.focus0(game,c);}
each("cmd",function(v){done(F.command(game,c,f(),v));});
each("get",function(v){done(F.command(game,c,f(),"get",v));});
each("soc",function(v){done(F.social(game,c,f(),v));});
each("learn",function(){done(F.learnFrom(game,c,f()));});
each("match",function(v){done(F.match(game,f(),SB.Game.byId(game,+v)));});
each("fest",function(){done(F.joinFest(game,c,null));});
each("bless",function(){done(F.bless(game));});
each("all",function(){done(F.callAll(game,c));});
each("posy",function(){done(F.makePosy(game,c));});
each("course",function(){done(SB.Motion3&&SB.Motion3.askCourse?SB.Motion3.askCourse(game,c,f()):null);});
each("pick",function(v){F._focus=+v;redraw();});
each("call",function(v){done(F.command(game,c,SB.Game.byId(game,+v),"come"));});
};
if(SB.Ext){
SB.Ext.on("tick",function(game,dt){F.tick(game,dt);});
SB.Ext.on("options",options);
SB.Ext.on("vitals",function(game,c){return F.moods(game,c).slice(-2).map(function(m){return{icon:m.icon,text:m.text,bad:m.v<0};});});
SB.Ext.on("goals",function(game,add){
var fe=F.fest(game),w=F.wedding(game),mine=SB.Mine&&SB.Mine.get?SB.Mine.get(game):null,lw=mine?F.lifeOf(game,mine):null;
if(fe)add(F.FESTS[fe.k].icon+" "+F.FESTS[fe.k].name+": join in as a smol",fe.done?"1/1":"0/1",!!fe.done,false);
if(w)add("💒 a wedding: be there as a smol, or tickle one of them to bless it",w.bless?"blessed":"",!!w.bless,false);
if(lw&&!lw.done)add(lw.def.icon+" "+mine.name+"'s life wish: "+lw.def.t,lw.n+"/"+lw.need,false,false);
});
SB.Ext.tab({id:"friends",label:function(){return"💗 friends";},show:function(game,c){return!!game&&!!c;},html:function(game,c,icon){return F.html(game,c,icon);},wire:function(root,game,c,redraw,say){F.wire(root,game,c,redraw,say);}});
}
F._x={st:st,rec:rec,of:of,dice:dice,gene:gene,isSmol:isSmol,tribe:tribe,speak:speak,emote:emote,tell:tell,toast:toast,quiet:quiet,story:story,sound:sound,fx:fx,sendTo:sendTo,opinion:opinion,remember:remember,diary:diary,sparks:sparks,addItem:addItem,me:me,day:day,label:label,emo:emo,awake:awake,bump:bump,note:note,K:K,Sv:Sv,cur:cur,esc:esc,btn:btn,gatherSpot:gatherSpot,ambient:ambient};
})();
(function(){
"use strict";
var SB=window.SB,F=SB&&SB.Friends,X=F&&F._x;
if(!X)return;
var st=X.st,rec=X.rec,of=X.of,dice=X.dice,gene=X.gene,isSmol=X.isSmol,tribe=X.tribe,speak=X.speak,emote=X.emote,tell=X.tell,toast=X.toast,quiet=X.quiet,story=X.story,sound=X.sound,fx=X.fx,sendTo=X.sendTo,opinion=X.opinion,remember=X.remember,diary=X.diary,sparks=X.sparks,addItem=X.addItem,me=X.me,day=X.day,label=X.label,emo=X.emo,awake=X.awake,bump=X.bump,note=X.note,K=X.K,Sv=X.Sv,cur=X.cur,esc=X.esc,gatherSpot=X.gatherSpot,ambient=X.ambient;
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function emit(k,d){SB.bus.emit(k,d);}
function byId(game,id){return id==null?null:SB.Game.byId(game,id);}
function dist(a,b){return SB.dist(a.x,a.z,b.x,b.z);}
function pickOf(arr,r){return arr[Math.floor(r*arr.length)%arr.length];}
function chron(game,icon,txt){if(SB.Social&&SB.Social.chronicle&&!quiet(game))SB.Social.chronicle(game,icon,txt);}
function chat(game,a,b){if(SB.Social&&SB.Social.onChat)SB.Social.onChat(game,a,b);}
function homeOf(game,c){var n=game.world.T&&game.world.T.nest,h=SB.Society&&SB.Society.home?SB.Society.home(game,c?c.tribe||0:0):null;return h&&h.x!=null?h:n||{x:c?c.x:0,z:c?c.z:0};}
function kin(game,a,b){return!!(SB.Game.related&&SB.Game.related(game,a,b));}
function parentsOf(game,c){return(c.parents||[]).map(function(id){return byId(game,id);}).filter(function(p){return p&&p.alive&&p.species==="smol";});}
function carers(game,c){var out=parentsOf(game,c),w=byId(game,of(c).ward);if(w&&w.alive&&out.indexOf(w)<0)out.push(w);return out;}
function withDice(game,key,fn){var k="rng",keep=game[k];game[k]=dice(game,key+":"+Math.round(game.time));try{return fn();}finally{game[k]=keep;}}
function spend(game,n){return n<=0||!!(SB.Game.spend&&SB.Game.spend(game,n));}
function s2(game){
var s=st(game);
if(!s.ways||typeof s.ways!=="object")s.ways={n:{},on:[]};
if(!s.ways.n)s.ways.n={};if(!Array.isArray(s.ways.on))s.ways.on=[];
if(!s.cr||typeof s.cr!=="object")s.cr={g:{},stolen:{}};
if(!s.cr.g)s.cr.g={};if(!s.cr.stolen)s.cr.stolen={};
if(!Array.isArray(s.pen))s.pen=[];
if(!Array.isArray(s.tales))s.tales=[];
return s;
}
F.state2=s2;
function learnAWord(game,from,to,amt){
var C=SB.Creature;if(!C||!C.knows||!from||!from.vocab||!to||!to.vocab)return null;
for(var w in from.vocab)if(C.knows(from,w)&&!C.knows(to,w)){C.learnWord(to,w,amt||0.6,game);return w;}
return null;
}
var K0=SB.KINDS;
if(K0){
if(!K0.callhorn)K0.callhorn={noun:"toy",label:"calling horn",emoji:"📯",r:0.13,color:0xd8b06a,desc:"blow it and everyone who knows you comes running, from far off."};
if(!K0.starseed)K0.starseed={noun:"food",label:"star seed",emoji:"🌟",r:0.1,color:0xfff2a0,food:{hunger:-0.5},chem:{glucose:0.3},desc:"a partner who trusts you all the way gives you one. eat it, and you carry a little star for good."};
if(!K0.fluff)K0.fluff={noun:"material",label:"smol fluff",emoji:"☁",r:0.1,color:0xf4f0e6,mat:1,desc:"a winter coat, shed in spring. soft."};
}
F.HORN={stick:2,vine:1};
if(SB.Surv&&SB.Surv.EXTRA&&!SB.Surv.EXTRA.some(function(r){return r.id==="callhorn";}))SB.Surv.EXTRA.push({id:"callhorn",name:"calling horn",icon:"📯",in:{stick:2,vine:1},out:"callhorn",hint:"two sticks and something bendy"});
var M2={
calm:["😌","calm after the storm",1,600,{anger:-0.4,fear:-0.2}],sulk:["😒","sulking",-1,300,{}],binge:["🍽","ate its feelings",0,300,{}],ranoff:["🏃","ran off for a bit",-1,240,{}],
rock:["🪨","told it all to a rock",0,300,{anger:-0.2,lonely:-0.1}],cooped:["🚪","cooped up too long",-1,500,{bored:0.1}],wantshut:["🛖","wants its own four walls",-1,500,{}],
simple:["🌾","happy with little",1,400,{}],wants:["🏛","expects better than this",-1,400,{anger:0.05}],sweet:["🍯","a sweet treat",1,500,{bored:-0.2}],nohoney:["🫙","no honey today",-1,900,{anger:0.1}],
raw:["🥩","ate it raw",-1,300,{}],rotten:["🤢","ate something off",-1,400,{}],bug:["🐞","ate a bug",-1,300,{}],jinx:["🌀","feels jinxed",-1,1800,{fear:0.1}],
faint:["💫","fainted clean away",0,200,{fear:-0.5,anger:-0.5}],faced:["🦁","faced its fear",2,1200,{fear:-0.4}],homesick:["🏡","homesick",-1,500,{lonely:0.1}],
crowded:["👥","too many elbows",-1,300,{anger:0.05}],peace:["🍃","peace and quiet",1,300,{}],beach:["🏖","a day at the beach",1,900,{bored:-0.4}],welcome:["🧺","a warm welcome",2,1200,{lonely:-0.4}],
song:["🎵","heard a lovely song",1,500,{lonely:-0.2}],play:["🎭","saw a good play",1,700,{bored:-0.4}],award:["🏅","the tribe cheered for me",2,1500,{lonely:-0.3}],shame:["🙈","ashamed",-1,900,{}],
told:["👵","told off for smooching",-1,300,{}],jealous:["💔","jealous",-2,1200,{anger:0.2}],surprise:["🎁","a surprise in my pouch",2,900,{bored:-0.3}],charity:["🤲","fed someone hungry",1,900,{}],
lantern:["🏮","lantern night",1,1200,{bored:-0.3,fear:-0.2}],drum:["🥁","danced to the drums",1,900,{bored:-0.4}],way:["🔥","living our way",1,400,{}],waysad:["🪓","that's not our way",-1,500,{}],
totem:["🗿","our totem is near",1,900,{fear:-0.1}],cheered:["📣","a rousing speech",1,600,{}],bored2:["🥱","sat through a speech",-1,300,{}],cosy:["💞","cosy together",1,400,{lonely:-0.2}],
bicker:["💢","bickering",-1,400,{anger:0.05}],minded:["🧓","looked after",1,400,{lonely:-0.2,fear:-0.1}],star:["🌟","carries a little star",2,3600,{}],oldsoul:["🕯","an old soul",1,1800,{}],
quiet:["🪦","remembering",0,400,{anger:-0.1,fear:-0.1}],easy:["🌤","taking it easy",1,400,{sleepy:-0.05}],kissed:["💋","a kiss",1,400,{lonely:-0.2}],zone:["🎯","in the zone",1,600,{bored:-0.4}],
lesson:["🏫","learned something",1,400,{bored:-0.2}],kidwish:["🪁","a little wish came true",2,900,{bored:-0.3}],knack:["✨","felt a knack at work",1,500,{}],flop:["😮‍💨","out of puff",-1,120,{}]
};
for(var mk in M2)if(!F.MOODS[mk])F.MOODS[mk]=M2[mk];
F.hasMood=function(game,c,id){return F.moods(game,c).some(function(m){return m.id===id;});};
var EMO=[["hungry","hunger","🍎"],["scared","fear","😱"],["angry","anger","😠"],["sad","lonely","🥺"],["bored","bored","😐"],["sleepy","sleepy","😴"],["sick","sick","🤢"],["cold","cold","🥶"],["sore","pain","🤕"],["in love","love","💕"]];
F.emotion=function(game,c){
var ch=c&&c.chem;if(!ch)return null;
var best=null,bv=0.3;
EMO.forEach(function(e){var v=ch[e[1]]||0;if(v>bv){bv=v;best=e;}});
if(!best){var ms=F.moodScore(game,c);return{id:ms>0?"happy":"fine",icon:ms>0?"😊":"🙂",lvl:ms>=3?3:ms>=1?2:1,text:ms>=3?"very happy":ms>=1?"happy":"fine"};}
var lvl=bv>0.8?3:bv>0.55?2:1;
return{id:best[0],icon:best[2],lvl:lvl,text:(lvl===1?"a bit ":lvl===3?"very ":"")+best[0]};
};
F.adverbs=function(game){
var r=dice(game,"adverbs"),a=["mi","ti","pip","lil","ne"],b=["zu","bom","gra","moh","wub"];
return{bit:pickOf(a,r()),very:pickOf(b,r())};
};
F.feel=function(game,c){var e=F.emotion(game,c);if(!e)return"";var a=F.adverbs(game);return(e.lvl===1?a.bit+" ":e.lvl===3?a.very+" ":"")+e.id;};
F.cont=function(c){var v=c&&c.fr?c.fr.cont:null;return v==null?50:v;};
F.addCont=function(c,n){if(!c||c.species!=="smol")return 50;var f=of(c);f.cont=clamp(Math.round(F.cont(c)+n),0,100);return f.cont;};
F.moodBar=function(game,c){
var ch=c&&c.chem;if(!ch)return 50;
var worst=Math.max(ch.hunger||0,ch.lonely||0,ch.bored||0,ch.anger||0,ch.pain||0,ch.cold||0,ch.fear||0,ch.sick||0);
return clamp(Math.round(62+F.moodScore(game,c)*7-worst*55+(F.cont(c)-50)*0.3),0,100);
};
F.moodWord=function(v){return v>=80?"glowing":v>=60?"content":v>=40?"so-so":v>=20?"low":"at the end of its tether";};
F.FEELS={angry:["🦶","stomp it out"],sad:["🎵","sing a sad song"],scared:["🎶","hum to feel brave"],happy:["💃","dance for joy"]};
F.act=function(game,c){
var e=F.emotion(game,c),ch=c&&c.chem;if(!e||!ch||!F.FEELS[e.id])return{ok:false,msg:"nothing is bursting to come out just now"};
var n=0;
if(e.id==="angry"){ch.anger=Math.max(0,ch.anger-0.35);emote(c,"angry",2);speak(c,"STOMP. stomp. stomp",2);tribe(game).forEach(function(o){if(o!==c&&dist(o,c)<6){emote(o,"huh",1.4);n++;}});}
else if(e.id==="sad"){ch.lonely=Math.max(0,ch.lonely-0.3);speak(c,"♪ oooh ♪",2.6);tribe(game).forEach(function(o){if(o!==c&&!o.asleep&&dist(o,c)<9){F.mood(game,o,"song");remember(game,o,c,"song",3,"sang a sad, lovely song",2400,9);n++;}});}
else if(e.id==="scared"){ch.fear=Math.max(0,ch.fear-0.3);speak(c,"♪ hm hm hm ♪",2.4);}
else{emote(c,"happy",3);speak(c,"♪ ♪ ♪",2.4);tribe(game).forEach(function(o){if(o!==c&&!o.asleep&&dist(o,c)<8){if(o.chem)o.chem.bored=Math.max(0,o.chem.bored-0.2);F.mood(game,o,"laugh");n++;}});of(c).dance=(of(c).dance||0)+1;}
emit("feelAct",{c:c,feel:e.id,n:n});
return{ok:true,feel:e.id,n:n,msg:F.FEELS[e.id][0]+" "+(c._pov?"you":c.name)+" "+({angry:"stomp it out",sad:"sing it out"+(n?", and "+n+" listen":""),scared:"hum until the fear shrinks",happy:"dance for joy"+(n?", and it catches":"")})[e.id]};
};
F.calm=function(game,c){
if(!c||!c.chem)return{ok:false,msg:""};
var f=of(c);if(f.cd===day(game)&&c._pov)return{ok:false,msg:"you've had your quiet sit today"};
f.cd=day(game);c.chem.anger=Math.max(0,(c.chem.anger||0)-0.4);c.chem.fear=Math.max(0,(c.chem.fear||0)-0.4);F.mood(game,c,"calm");F.addCont(c,5);
emit("calm",{c:c});
return{ok:true,msg:"😌 "+(c._pov?"you sit":c.name+" sits")+" quietly until the noise inside goes away"};
};
F.BREAKS={stomp:"threw a tantrum",sulk:"went off to sulk",binge:"ate its feelings",runoff:"ran off to be alone",rock:"told its troubles to a rock"};
F.breakdown=function(game,c,kind){
if(!isSmol(c)||!F.BREAKS[kind])return null;
var f=of(c),ch=c.chem,a=dice(game,"brk:"+c.id+":"+Math.round(game.time))()*6.283;
f.brk={k:kind,t:Math.round(game.time)};
if(kind!=="stomp"){c.tantrum=null;if(ch)ch.anger*=0.6;}
if(kind==="sulk"){F.mood(game,c,"sulk");speak(c,"hmph.",2.4);emote(c,"sad",2.4);sendTo(c,c.x+Math.cos(a)*7,c.z+Math.sin(a)*7,game,14);}
else if(kind==="binge"){
var ate=0,L=game.world.items;
for(var i=L.length-1;i>=0&&ate<3;i--){var o=L[i],d=K()[o.kind];if(d&&d.food&&d.noun==="food"&&o.heldBy==null&&!o.gone&&SB.dist(o.x,o.z,c.x,c.z)<8){SB.World.remove(game.world,o);ate++;}}
if(ch)ch.hunger=Math.max(0,ch.hunger-0.25-ate*0.2);f.ate=ate;F.mood(game,c,"binge");speak(c,"nom nom nom. nom.",2.6);
}
else if(kind==="runoff"){F.mood(game,c,"ranoff");f.back=Math.round(game.time+40);speak(c,"leave me ALONE",2.2);sendTo(c,c.x+Math.cos(a)*22,c.z+Math.sin(a)*22,game,30);}
else if(kind==="rock"){F.mood(game,c,"rock");speak(c,"…and THEN, rock, they said…",3);emote(c,"sad",2);}
diary(game,c,"😤",F.BREAKS[kind].replace("its","my"));
emit("breakdown",{c:c,kind:kind});
return kind;
};
function onTantrum(d){
var game=cur(),c=d&&d.c;if(!game||!isSmol(c))return;
if(F.hasMood(game,c,"calm")){c.tantrum=null;if(c.chem)c.chem.anger*=0.5;emit("catharsis",{c:c,blocked:true});return;}
var r=dice(game,"brkk:"+c.id+":"+Math.round(game.time))();
F.breakdown(game,c,r<0.4?"stomp":r<0.6?"sulk":r<0.8?"binge":"runoff");
}
F.inspiredAs=function(game,c){var f=c&&c.fr;return f&&f.insp&&f.insp.u>game.time?f.insp.k:null;};
F.inspire=function(game,c,kind){
if(!isSmol(c))return null;
var k=kind||(gene(c,"dexterity")>0.6?"craft":gene(c,"bravery")>0.65?"fight":"idea");
of(c).insp={k:k,u:Math.round(game.time+90)};
if(k==="idea")c.inspired=Math.max(c.inspired||0,60);
emit("inspiredAs",{c:c,kind:k});
return k;
};
F.sweet=function(c){var s=c&&c.fr&&c.fr.sw;return{n:s?s.n||0:0,crave:!!(s&&s.n>=4),last:s?s.d:null};};
function ateSweet(game,c){
var f=of(c),s=f.sw||(f.sw={n:0});
s.n=Math.min(8,(s.n||0)+1);s.d=day(game);
if(c.chem)c.chem.bored=Math.max(0,c.chem.bored-0.3/(1+s.n/3));
if(s.n<=3)F.mood(game,c,"sweet");
if(s.n===4){diary(game,c,"🍯","can't stop thinking about honey");emit("craving",{c:c});}
}
function ate(d){
var game=cur(),c=d&&d.c,o=d&&d.obj;if(!game||!c||!o||c.species!=="smol")return;
var k=o.kind,def=K()[k]||{},f=of(c);
if(c.stage<=1&&!(f.first&&f.first.meal)){(f.first||(f.first={})).meal=1;}
if(k==="honey"||k==="heartfruit")ateSweet(game,c);
if(o.data&&o.data.rotten)F.mood(game,c,"rotten");
else if((k==="meat"||k==="fish")&&c.tier>=3)F.mood(game,c,"raw");
else if(def.noun==="bug"&&gene(c,"curiosity")<0.7)F.mood(game,c,"bug");
if(k==="shroom"&&gene(c,"immunity")>0.8&&c.chem)c.chem.sick=Math.max(0,(c.chem.sick||0)-0.3);
if(k==="starseed"&&!f.star){f.star=1;if(c.lifespan)c.lifespan=Math.round(c.lifespan*1.05);f.cont=100;F.mood(game,c,"star");emit("starSeed",{c:c});}
}
var SIGNS=[[["the sprout","🌱","earth"],["the flutterby","🦋","air"]],[["the sun palm","🌴","fire"],["the clam","🦪","water"]],[["the maple","🍁","earth"],["the ember","🔥","fire"]],[["the snow hare","🐇","air"],["the deep pool","💧","water"]]];
F.sign=function(game,c){
var sd=SB.seasonDays(game),t=Math.max(0,(c.born||0))/SB.DAY_LENGTH/sd,se=Math.floor(t)%4,half=(t-Math.floor(t))<0.5?0:1,g=SIGNS[se][half];
return{name:g[0],icon:g[1],el:g[2]};
};
var FIT={earth:"water",water:"earth",fire:"air",air:"fire"};
F.signsFit=function(game,a,b){var x=F.sign(game,a).el,y=F.sign(game,b).el;return x===y||FIT[x]===y;};
F.beauty=function(c){return(gene(c,"fluff")+gene(c,"cheeks")+gene(c,"eyes"))/3;};
F.luck=function(game,c){
var f=of(c);
if(f.luck==null){
var ps=parentsOf(game,c).filter(function(p){return p.fr&&p.fr.luck!=null;}),r=dice(game,"luck:"+c.id)();
f.luck=Math.round(clamp(ps.length?(ps.reduce(function(n,p){return n+p.fr.luck;},0)/ps.length)*0.6+r*0.4:r,0,1)*100)/100;
}
return f.luck;
};
F.lucky=function(game,c){return F.luck(game,c)>=0.8;};
F.HIDDEN={owl:["🦉","a night owl","wide awake after dark"],thumb:["🌱","a green thumb","finds seeds some mornings"],sealegs:["🌊","sea legs","pulls up two fish now and then"],voice:["🎤","a sweet voice","its songs reach twice as many hearts"],nose:["👃","a keen nose","sniffs out a snack when it's hungry"],steady:["🧱","steady as a rock","never has a breakdown twice in a day"]};
F.hiddenId=function(game,c){var ids=Object.keys(F.HIDDEN);return pickOf(ids,dice(game,"hid:"+c.id)());};
F.hidden=function(game,c){return c&&(c._pov||F.hearts(game,c)>=6)?F.hiddenId(game,c):null;};
F.TOPICS={food:"🍎 food",weather:"🌦 the weather",grumps:"👺 grumps",stars:"⭐ the stars",gossip:"🗣 gossip",making:"🛠 making things",family:"🥚 family",sea:"🌊 the sea"};
F.interests=function(game,c){
var ids=Object.keys(F.TOPICS),r=dice(game,"int:"+c.id),sc={};
ids.forEach(function(t){sc[t]=r();});
sc.food+=gene(c,"appetite")*0.5;sc.grumps+=gene(c,"bravery")*0.4;sc.stars+=gene(c,"curiosity")*0.4;sc.gossip+=gene(c,"chattiness")*0.5;sc.making+=gene(c,"dexterity")*0.5;sc.family+=gene(c,"affection")*0.5;
ids.sort(function(a,b){return sc[b]-sc[a];});
return{like:[ids[0],ids[1]],bore:ids[ids.length-1]};
};
F.chat=function(game,by,c,topic){
if(!by||!isSmol(c)||c===by||!F.TOPICS[topic])return{ok:false,msg:""};
if(c.asleep)return{ok:false,msg:"💤 "+c.name+" is asleep"};
if(dist(by,c)>7)return{ok:false,msg:"get closer to "+c.name};
var r=rec(game,c),d=day(game),it=F.interests(game,c);
if(r.cd===d)return{ok:false,msg:"you've had your long talk with "+c.name+" today"};
r.cd=d;r.int=r.int||{};
var hit=it.like.indexOf(topic)>=0,miss=it.bore===topic,pts=hit?15:miss?-5:5;
r.int[topic]=hit?1:miss?-1:0;
speak(c,hit?"oh! yes! "+topic+"!":miss?"…yawn":"hm. "+topic,2.4);emote(c,hit?"happy":miss?"huh":"happy",1.6);
if(hit)F.mood(game,c,"chat");
var got=F.add(game,c,pts);
emit("friendChat",{by:by,to:c,topic:topic,hit:hit,miss:miss});
return{ok:true,hit:hit,miss:miss,pts:got,msg:(hit?"💬 "+c.name+" lights up: it could talk about ":miss?"🥱 "+c.name+" has no time for ":"💬 you and "+c.name+" talk about ")+F.TOPICS[topic].replace(/^\S+ /,"")+(got?" · "+(got>0?"+":"")+got:"")};
};
F.FANCY={brave:["bravery","a brave heart"],playful:["playfulness","a playful one"],chatty:["chattiness","a talker"],fluffy:["fluff","lots of fluff"],clever:["learnRate","a quick mind"],gentle:["affection","a soft touch"],big:["size","a big smol"],grumpy:["grumpiness","a grump"]};
F.fancy=function(game,c){var ids=Object.keys(F.FANCY),r=dice(game,"fancy:"+c.id),on=pickOf(ids.slice(0,7),r()),off=pickOf(ids.filter(function(k){return k!==on;}),r());return{on:on,off:off};};
F.fits=function(game,c,o){var fa=F.fancy(game,c),n=0;if(gene(o,F.FANCY[fa.on][0])>0.58)n++;if(gene(o,F.FANCY[fa.off][0])>0.7)n--;return n;};
var LIFE={walk:["a rambler","never homesick"],hands:["a tinkerer","happy with busy paws"],think:["a dreamer","calm comes easy"],social:["a chatterbox","never short of company"],plan:["a planner","likes things just so"],build:["a builder","happiest with a wall going up"]};
F.lifestyle=function(c){
var h=(c&&c.habits)||{},best=null,bv=3;
for(var k in LIFE){var v=(h[k]||0)/(k==="walk"?40:1);if(v>bv){bv=v;best=k;}}
return best?{id:best,name:LIFE[best][0],does:LIFE[best][1]}:{id:"easy",name:"easy-going",does:"takes each day as it comes"};
};
F.HOBBIES={fishing:"🎣 dangling a line",carving:"🪵 whittling sticks",singing:"🎵 singing",stars:"⭐ watching the stars",bugs:"🐞 watching bugs",pebbles:"🪨 the pebble game",naps:"💤 a good nap in the sun"};
F.hobby=function(game,c){
var ids=Object.keys(F.HOBBIES),r=dice(game,"hob:"+c.id),sc={},best=null,bv=-1;
ids.forEach(function(h){sc[h]=r();});
sc.carving+=gene(c,"dexterity")*0.5;sc.singing+=gene(c,"chattiness")*0.5;sc.stars+=gene(c,"curiosity")*0.5;sc.naps+=gene(c,"sleepiness")*0.5;sc.pebbles+=gene(c,"learnRate")*0.4;
for(var k in sc)if(sc[k]>bv){bv=sc[k];best=k;}
return best;
};
F.doHobby=function(game,c){
if(!isSmol(c))return null;
var f=of(c),h=F.hobby(game,c);
f.hob=(f.hob||0)+1;if(c.chem)c.chem.bored=Math.max(0,c.chem.bored-0.3);
diary(game,c,"🎈","spent a while "+F.HOBBIES[h].replace(/^\S+ /,""));
if(f.hob%5===0){c.inspired=Math.max(c.inspired||0,60);F.mood(game,c,"zone");}
emit("hobby",{c:c,hobby:h,n:f.hob,zone:f.hob%5===0});
return h;
};
F.stageName=function(c){
if(!c)return"";
var S=SB.STAGES,a=c.age||0;
if(c.stage===3&&a<S[3].from+(S[4].from-S[3].from)*0.15)return"youth";
if(c.stage===4&&c.lifespan&&a>c.lifespan*0.92)return"ancient";
return(S[c.stage]||S[3]).name;
};
F.homebody=function(c){return gene(c,"sleepiness")>0.7&&gene(c,"curiosity")<0.5;};
F.stageNeed=function(game,c){
var ch=c.chem||{},sn=F.stageName(c);
if(c.stage===0)return{text:"cuddles and a carer near",ok:(ch.lonely||0)<0.5};
if(c.stage===1)return{text:"play",ok:(ch.bored||0)<0.5};
if(c.stage===2)return{text:"friends its own age",ok:(ch.lonely||0)<0.45};
if(sn==="youth")return{text:"something new to try",ok:(ch.bored||0)<0.4};
if(c.stage===3)return{text:"useful work and a full belly",ok:(ch.hunger||0)<0.6&&(ch.bored||0)<0.6};
return{text:sn==="ancient"?"rest, and someone to tell it all to":"company, and someone to tell stories to",ok:(ch.lonely||0)<0.4};
};
var FEARS={dark:["🌑","the dark"],water:["🌊","deep water"],grumps:["👺","grumps"],storms:["⛈","storms"],alone:["🫥","being alone"],heights:["⛰","high places"]};
F.fearOf=function(game,c){
var f=of(c),ids=Object.keys(FEARS);
if(!f.fear||!FEARS[f.fear])f.fear=pickOf(ids,dice(game,"fear:"+c.id)());
return{id:f.fear,icon:FEARS[f.fear][0],text:FEARS[f.fear][1],n:f.fn||0,faced:(f.fn||0)>=3};
};
function inFear(game,c,id,alone){
var w=game.world;
if(id==="dark")return!!w.night&&!(SB.World.nearestFire&&SB.World.nearestFire(w,c.x,c.z,12));
if(id==="storms")return!!(w.weather&&w.weather.rain>0.5);
if(id==="alone")return alone;
if(id==="grumps")return game.creatures.some(function(o){return o.species==="grump"&&o.alive&&!o.gone&&dist(o,c)<14;});
var b=SB.World.biomeAt&&SB.B?SB.World.biomeAt(w,c.x,c.z):-1;
return id==="water"?b===SB.B.beach||b===SB.B.ocean||b===SB.B.sea:b===SB.B.mountain;
}
F.faceFear=function(game,c,company){
var f=of(c),fe=F.fearOf(game,c);if(fe.faced)return false;
if(!company){if(c.chem)c.chem.fear=Math.min(1,(c.chem.fear||0)+0.06);return false;}
f.fn=(f.fn||0)+1;
if(f.fn>=3){F.mood(game,c,"faced");F.addRenown(game,c,2,"faced "+fe.text);diary(game,c,"🦁","isn't scared of "+fe.text+" any more");emit("fearFaced",{c:c,fear:fe.id});if(c._pov)tell(game,"🦁 "+fe.text+" doesn't scare you any more");}
return true;
};
F.RANKS=[[0,"a face in the crowd"],[5,"known"],[12,"respected"],[25,"famous"],[45,"a legend"]];
F.renown=function(c){return c&&c.fr&&c.fr.ren?c.fr.ren:0;};
F.rank=function(c){var r=F.renown(c),k=0;for(var i=0;i<F.RANKS.length;i++)if(r>=F.RANKS[i][0])k=i;return k;};
F.rankName=function(c){return F.RANKS[F.rank(c)][1];};
F.addRenown=function(game,c,n,why){
if(!c||c.species!=="smol"||!c.alive||!n)return 0;
var f=of(c),was=F.rank(c);
f.ren=Math.max(0,Math.round(((f.ren||0)+n)*10)/10);
var now=F.rank(c);
if(now>was&&now>(f.top||0)){
f.top=now;
if(now>=2&&game&&!quiet(game)){
var n2=0;tribe(game).forEach(function(o){if(o!==c&&n2<5&&awake(o)&&dist(o,c)<30){if(sendTo(o,c.x+Math.sin(n2*1.3)*1.6,c.z+Math.cos(n2*1.3)*1.6,game,12))n2++;}});
F.mood(game,c,"award");chron(game,"🏅","the tribe cheered "+c.name+", now "+F.RANKS[now][1]);
emit("ceremony",{c:c,rank:now,guests:n2});
}
emit("rank",{c:c,rank:now,name:F.RANKS[now][1],why:why||""});
}
if(n<0&&game)F.mood(game,c,"shame");
return f.ren;
};
F.HONOURS={fire:["🔥","keeper of the fire","the cold never bites it"],voice:["📣","voice of the tribe","whoever it talks to thinks better of it"],shield:["🛡","shield of the tribe","fear leaves it fast, and it fights beside you at three hearts"]};
F.honour=function(game,c,id){
if(!isSmol(c)||!F.HONOURS[id])return{ok:false,msg:""};
if(of(c).hon)return{ok:false,msg:c.name+" carries an honour already"};
if(F.renown(c)<10)return{ok:false,msg:c.name+" needs 10 renown first ("+F.renown(c)+")"};
of(c).hon=id;of(c).ren=Math.round((of(c).ren-10)*10)/10;
chron(game,F.HONOURS[id][0],c.name+" was named "+F.HONOURS[id][1]);F.mood(game,c,"award");
emit("honour",{c:c,id:id});
return{ok:true,msg:F.HONOURS[id][0]+" "+c.name+" is "+F.HONOURS[id][1]+" now: "+F.HONOURS[id][2]};
};
var QUIRKS={crowd:"loves a crowd, the bigger the better",mornings:"is a bear before breakfast",pebbles:"leaves a pebble wherever it has been"};
F.fameQuirk=function(game,c){return F.rank(c)>=3?pickOf(Object.keys(QUIRKS),dice(game,"quirk:"+c.id)()):null;};
F.quirkText=function(id){return QUIRKS[id]||"";};
F.TITLE_DOES={"grump-chaser":"fear slides off it",teacher:"what it teaches sticks better",wordsmith:"a chat with it is a treat",kind:"a happier heart, day by day",explorer:"never homesick",inventor:"wakes inspired some mornings",wise:"little ones near it settle"};
F.leader=function(game){
var id=game.civ&&game.civ.council?game.civ.council.leader:null,c=byId(game,id);
if(isSmol(c))return c;
var best=null,bv=11.9;
tribe(game).forEach(function(o){if(o.stage>=3&&F.renown(o)>bv){bv=F.renown(o);best=o;}});
return best;
};
F.demand=function(game){var s=st(game);return s.dem&&F.leader(game)?s.dem:null;};
F.speech=function(game){
var L=F.leader(game);if(!L||L.asleep)return null;
var yes=0,no=0;
tribe(game).forEach(function(o){
if(o===L||o.asleep||dist(o,L)>14)return;
if(opinion(game,o,L)>=0){yes++;F.mood(game,o,"cheered");if(o.tier>=2)o.inspired=Math.max(o.inspired||0,45);}else{no++;F.mood(game,o,"bored2");}
});
speak(L,"smols! hear me!",3);emote(L,"proud",3);
F.addRenown(game,L,yes>no?1:-0.5,"a speech");
chron(game,"📣",L.name+" gave a speech: "+yes+" cheered"+(no?", "+no+" grumbled":""));
emit("speech",{c:L,yes:yes,no:no});
return{c:L,yes:yes,no:no};
};
F.WAYS={
fire:{icon:"🔥",name:"fire-lovers",creed:"the warm fire",rule:"keep the fire fed. a night by it is a good night"},
tree:{icon:"🌳",name:"tree-huggers",creed:"the green roof",rule:"leave the trees standing. felling one sits badly"},
share:{icon:"🤲",name:"sharers",creed:"the open paw",rule:"what you have is for giving. gifts count for more"},
bold:{icon:"🏏",name:"grump-chasers",creed:"the loud stick",rule:"run at grumps, not from them. a chase is a feast day"},
sea:{icon:"🐟",name:"sea-folk",creed:"the full net",rule:"the water feeds us. everyone likes a fish"},
lore:{icon:"📖",name:"lore-keepers",creed:"the long memory",rule:"teach what you know. a lesson warms the teacher"},
night:{icon:"🌙",name:"night-lovers",creed:"the kind dark",rule:"the dark is a friend. nobody fears it"},
scar:{icon:"🩹",name:"scar-proud",creed:"the mended hide",rule:"a scar is a story. wear it and be known"}
};
F.WAY_AT=12;
F.wayOn=function(game,id){return s2(game).ways.on.indexOf(id)>=0;};
F.wayCount=function(game,id,n){var w=s2(game).ways;if(F.WAYS[id])w.n[id]=(w.n[id]||0)+(n==null?1:n);return w.n[id]||0;};
F.ways=function(game){return s2(game).ways.on.map(function(id){return F.WAYS[id];}).filter(Boolean);};
F.creed=function(game){var on=s2(game).ways.on;return on.length&&F.WAYS[on[0]]?"the way of "+F.WAYS[on[0]].creed:null;};
F.totem=function(game){var t=s2(game).ways.totem;return t&&K()[t]?t:null;};
F.growWays=function(game){
var w=s2(game).ways,got=null;
Object.keys(F.WAYS).sort(function(a,b){return(w.n[b]||0)-(w.n[a]||0);}).forEach(function(id){
if(got||w.on.length>=3||w.on.indexOf(id)>=0||(w.n[id]||0)<F.WAY_AT)return;
w.on.push(id);got=id;
});
if(!got)return null;
if(!w.totem){var pool=["hopper","butterfly","beetle"].filter(function(k){return K()[k];});if(pool.length)w.totem=pickOf(pool,dice(game,"totem")());}
chron(game,F.WAYS[got].icon,"the tribe are "+F.WAYS[got].name+" now. they call it "+F.creed(game));
toast(game,F.WAYS[got].icon+" your smols have a way now: <b>"+F.WAYS[got].name+"</b>. "+F.WAYS[got].rule);
emit("way",{id:got,creed:F.creed(game),totem:w.totem||null});
return got;
};
function believer(c){return!(c.fr&&c.fr.conv!=null);}
F.coupleMood=function(game,a,b){
if(!a||!b)return null;
var v=(opinion(game,a,b)+opinion(game,b,a))/2;
return v>=40?"cosy":v>=15?"sweet":v>=0?"polite":"bickering";
};
F.familyBond=function(game,kid,p){
if(!kid||!p)return null;
var u=F.upbringing(kid),v=(opinion(game,kid,p)+opinion(game,p,kid))/2;
if((u.tap||0)>=3&&(u.tap||0)>(u.tickle||0))return"strict";
return v>=20||(u.taught||0)+(u.tickle||0)>=4?"close":v<0?"distant":"easy";
};
F.parenting=function(c){return Math.min(3,(c&&c.fr&&c.fr.par)||0);};
F.isOrphan=function(game,c){return isSmol(c)&&c.stage<=1&&(c.parents||[]).length>0&&!parentsOf(game,c).length&&!byId(game,of(c).ward);};
F.adopt=function(game,kid,by){
if(!isSmol(kid)||kid.stage>2)return null;
var g=by||null;
if(!g){var bv=-1;tribe(game).forEach(function(o){if(o===kid||o.stage<3)return;var v=gene(o,"affection")+(o.stage===4?0.3:0)+(o.partner!=null?0.15:0);if(v>bv){bv=v;g=o;}});}
if(!g)return null;
of(kid).ward=g.id;remember(game,kid,g,"tookin",20,"took me in",9000,30);remember(game,g,kid,"ward",15,"is mine to look after now",9000,30);
F.mood(game,kid,"minded");chron(game,"🧺",g.name+" took little "+kid.name+" in");
emit("adopted",{kid:kid,by:g,player:!!(by&&by._pov)});
return g;
};
var famLast={};
F.familyTick=function(game){
var out={fed:0,carried:0,minded:0,adopted:0};
tribe(game).forEach(function(k){
if(k.stage>1||k._pov||k.heldBy!=null)return;
if(F.isOrphan(game,k)){if(F.adopt(game,k))out.adopted++;return;}
var cs=carers(game,k).filter(function(p){return!p.asleep&&!p._pov;}),nearC=null,nd=1e9;
cs.forEach(function(p){var d=dist(p,k);if(d<nd){nd=d;nearC=p;}});
if(k.stage===0&&nearC&&nd<14&&k.chem&&k.chem.hunger>0.5){k.chem.hunger=Math.max(0,k.chem.hunger-0.3);speak(nearC,"here, little one",2);emote(k,"happy",1.6);diary(game,nearC,"🍼","fed little "+k.name);out.fed++;emit("babyFed",{kid:k,by:nearC});}
else if(k.stage===0&&nearC&&nd>12&&nd<60&&(famLast[k.id]||0)<game.time){famLast[k.id]=game.time+30;sendTo(nearC,k.x+0.5,k.z,game,20);sendTo(k,nearC.x,nearC.z,game,20);diary(game,nearC,"🧺","went to fetch little "+k.name+" and carried it home");out.carried++;emit("carried",{kid:k,by:nearC});}
else if((!nearC||nd>25)&&(famLast[k.id]||0)<game.time){
var el=null,ed=40;tribe(game).forEach(function(o){if(o.stage===4&&awake(o)){var d=dist(o,k);if(d<ed){ed=d;el=o;}}});
if(el){famLast[k.id]=game.time+60;sendTo(el,k.x+0.8,k.z+0.4,game,20);F.mood(game,k,"minded");speak(el,"come, sit by me",2);out.minded++;emit("minded",{kid:k,by:el});}
}
});
return out;
};
F.teacher=function(game){
var best=null,bv=-1;
tribe(game).forEach(function(o){if(o.stage<3||o._pov)return;var v=(o.title==="teacher"?5:0)+(o.stage===4?1:0)+(o.tier||0)*0.3+gene(o,"chattiness");if(v>bv){bv=v;best=o;}});
return best;
};
F.grade=function(c){var f=(c&&c.fr)||{},n=(f.les||0)-(f.skip||0)*2;return!f.les?"–":n>=6?"A":n>=3?"B":n>=1?"C":"D";};
function lesson(game,k,t){
var f=of(k),w=learnAWord(game,t,k,0.7);
f.les=(f.les||0)+1;bump(k,"taught");F.mood(game,k,"lesson");
return w;
}
F.kidCircle=function(game){
var s=st(game),t=F.teacher(game),kids=tribe(game).filter(function(c){return(c.stage===1||c.stage===2)&&!c._pov;});
if(!t||!kids.length)return null;
var sch=null;game.world.structures.forEach(function(b){if(b.done&&b.kind==="school"&&!sch)sch=b;});
var sp=sch?{x:sch.x+1.5,z:sch.z+1.5}:gatherSpot(game,t.x,t.z),went=0,skipped=0;
s.kc={d:day(game),x:sp.x,z:sp.z,t:t.id,until:Math.round(game.time+120),school:sch?1:0};
sendTo(t,sp.x,sp.z,game,30);
kids.forEach(function(k,i){
if(dice(game,"skip:"+k.id+":"+day(game))()<gene(k,"playfulness")-0.55){of(k).skip=(of(k).skip||0)+1;bump(k,"play");skipped++;diary(game,k,"🙈","skipped the lesson to play");emit("skipped",{c:k});return;}
sendTo(k,sp.x+Math.sin(i*1.1)*1.8,sp.z+Math.cos(i*1.1)*1.8,game,30);lesson(game,k,t);went++;
});
if(went){of(t).taughtN=(of(t).taughtN||0)+went;F.wayCount(game,"lore",1);}
emit("kidCircle",{teacher:t,went:went,skipped:skipped,school:!!sch});
return{teacher:t,went:went,skipped:skipped};
};
F.joinLesson=function(game,c){
var s=st(game),kc=s.kc;
if(!kc||kc.until<game.time)return{ok:false,msg:"no lesson on just now. the circle meets in the morning"};
if(c.stage>2)return{ok:false,msg:"the circle is for little ones. grown-ups learn at the fire in the evening"};
if(SB.dist(c.x,c.z,kc.x,kc.z)>12)return{ok:false,msg:"the circle is over there, with the teacher"};
if(of(c).ld2===kc.d)return{ok:false,msg:"you've had today's lesson"};
of(c).ld2=kc.d;
var t=byId(game,kc.t),w=t?lesson(game,c,t):null;
emit("lessonJoined",{c:c,word:w});
return{ok:true,word:w,msg:"🏫 you sit in the circle"+(w?" and learn a word: “"+w+"”":" and listen")+". grade so far: "+F.grade(c)};
};
F.tutor=function(game,el,kid){
if(!isSmol(el)||!isSmol(kid)||el.stage<3||kid.stage>2||el===kid)return{ok:false,msg:"a grown-up teaches, a little one learns"};
if(el.tier<3)return{ok:false,msg:el.name+" has no words to teach with yet"};
of(kid).tut={by:el.id,n:3};
remember(game,kid,el,"tutor",8,"teaches me, just me",6000,20);
emit("tutorSet",{el:el,kid:kid});
return{ok:true,msg:"🎓 "+el.name+" will teach "+kid.name+" for the next three mornings"};
};
function tutorDawn(game){
tribe(game).forEach(function(k){
var tu=k.fr&&k.fr.tut,el=tu?byId(game,tu.by):null;
if(!tu)return;
if(!isSmol(el)||k.stage>2){k.fr.tut=null;return;}
var w=learnAWord(game,el,k,1.2);of(k).les=(of(k).les||0)+1;bump(k,"taught",2);
if(--tu.n<=0)k.fr.tut=null;
emit("tutored",{el:el,kid:k,word:w});
});
}
F.homework=function(game){
var n=0,s=st(game);
tribe(game).forEach(function(k){
if(k.stage!==1&&k.stage!==2)return;
var p=carers(game,k).filter(function(o){return!o.asleep&&dist(o,k)<25;})[0],f=of(k);
if(p){
var w=learnAWord(game,p,k,0.4+F.parenting(p)*0.15);
if(w){n++;diary(game,k,"✏","practised “"+w+"” with "+p.name);emit("homework",{kid:k,by:p,word:w});}
if(!f.proj&&dice(game,"proj:"+k.id+":"+day(game))()<0.2&&Sv().spawn){f.proj=1;var toy=K().plush?"plush":"ball";Sv().spawn(game,toy,1,k.x+0.4,k.z+0.3);bump(k,"share");diary(game,k,"🧸","made a "+label(toy)+" with "+p.name);emit("project",{kid:k,by:p,kind:toy});}
}
if(s.curfew&&!k._pov){var h=homeOf(game,k);sendTo(k,h.x+0.5,h.z+0.5,game,30);speak(k,"aww. bedtime",2);}
});
return n;
};
F.firsts=function(game,c){
var f=of(c),fi=f.first||(f.first={});
if(c.visited&&Object.keys(c.visited).length>=1)fi.step=1;
if(SB.Creature&&SB.Creature.knownCount&&SB.Creature.knownCount(c)>=1)fi.word=1;
if((F.upbringing(c).play||0)>=1)fi.play=1;
return[["first steps",!!fi.step],["first meal",!!fi.meal],["first word",!!fi.word],["first game",!!fi.play]];
};
F.kidSkills=function(c){var u=F.upbringing(c);return[["tumbling",u.play||0],["chatter",u.word||0],["sharing",u.share||0],["scrapping",u.fight||0],["listening",u.taught||0]].filter(function(x){return x[1]>0;}).map(function(x){return{name:x[0],lvl:Math.min(5,1+Math.floor(x[1]/2))};});};
var YOUNG={
1:[{id:"play",t:"play three games",need:3,n:function(c){return F.upbringing(c).play||0;}},{id:"word",t:"learn two words",need:2,n:function(c){return F.upbringing(c).word||0;}},{id:"show",t:"show a grown-up something",need:1,n:function(c){return(c.fr&&c.fr.show)||0;}}],
2:[{id:"mentor",t:"find someone to learn from",need:2,n:function(c){return F.upbringing(c).taught||0;}},{id:"catch",t:"catch a first fish",need:1,n:function(c){return(c.fr&&c.fr.fish)||0;}},{id:"crowd",t:"make two friends",need:2,n:function(c,game){return F.WISH.friends.n(c,game);}}]
};
F.young=function(game,c){
if(!c||!YOUNG[c.stage])return null;
var f=of(c),L=YOUNG[c.stage];
if(!f.yw||f.yw.s!==c.stage)f.yw={s:c.stage,id:pickOf(L,dice(game,"yw:"+c.id+":"+c.stage)()).id};
var def=L.filter(function(w){return w.id===f.yw.id;})[0]||L[0];
return{def:def,n:f.yw.done?def.need:Math.min(def.need,def.n(c,game)),need:def.need,done:!!f.yw.done};
};
function youngCheck(game,c){
var y=F.young(game,c);if(!y||y.done||y.n<y.need)return false;
of(c).yw.done=day(game);F.addCont(c,30);F.mood(game,c,"kidwish");sparks(game,2,c);speak(c,"me did it!",2.4);
diary(game,c,"🪁","got my wish: to "+y.def.t);
emit("youngWish",{c:c,wish:y.def});
return true;
}
F.life2Of=function(game,c){
var f=c&&c.fr;if(!f||!f.life||!f.life.done||!(c.stage===4||c.tier>=5))return null;
if(!f.life2||!F.WISH[f.life2.id]){
var open=F.WISHES.filter(function(w){return w.id!==f.life.id&&(!w.ok||w.ok(c,game))&&w.n(c,game)<w.need;});
if(!open.length)return null;
f.life2={id:pickOf(open,dice(game,"life2:"+c.id)()).id};
}
var def=F.WISH[f.life2.id];
return{def:def,n:f.life2.done?def.need:Math.min(def.need,def.n(c,game)),need:def.need,done:!!f.life2.done};
};
function life2Check(game,c){
var l=F.life2Of(game,c);if(!l||l.done||l.n<l.need)return false;
c.fr.life2.done=day(game);sparks(game,4,c);F.mood(game,c,"dream");F.addCont(c,30);F.addRenown(game,c,2,"a second wish");
emit("lifeWish2",{c:c,wish:l.def});
return true;
}
var AD={tickle:"gentle",hit:"brave",teach:"clever",give:"kind",prank:"cheeky",roam:"curious"};
function lived(c,k,n){if(!c||c.species!=="smol"||c.stage<3)return;var f=of(c),a=f.ad||(f.ad={});a[k]=(a[k]||0)+(n||1);}
F.lived=lived;
F.selfDiscover=function(game,c){
var f=c&&c.fr,a=f&&f.ad;if(!a||!F.trait(c))return null;
var best=null,bv=7.9;
for(var k in a)if(AD[k]&&a[k]>bv){bv=a[k];best=AD[k];}
if(!best||best===f.trait)return null;
var was=f.trait;f.trait=best;f.ad={};
diary(game,c,F.TRAITS[best].icon,"found out I'm more "+best+" than "+was);
emit("selfDiscovery",{c:c,was:was,trait:best});
return best;
};
function has(c,g){var lk=c&&c.look;return lk&&lk[g]!=null?!!lk[g]&&lk[g]!==0:gene(c,g)>0.6;}
F.variant=function(c){
if(!c||c.species!=="smol")return null;
var fi=has(c,"fins"),wi=has(c,"wings"),gl=gene(c,"glow")>0.6,ho=has(c,"horns");
return fi&&wi?"skimmer":fi&&gl?"lantern-fish":wi&&gl?"firefly":ho&&gene(c,"fluff")>0.7?"woolly ram":fi?"finned":wi?"winged":gl?"glowing":ho?"horned":null;
};
F.passives=function(c){
var out=[];
if(gene(c,"fluff")>0.6)out.push("thick fluff: the cold takes longer to bite");
if(has(c,"fins"))out.push("fins: at home in the water");
if(has(c,"wings"))out.push("wings: light on its feet");
if(gene(c,"toughness")>0.7)out.push("tough hide: knocks hurt less");
if(gene(c,"immunity")>0.8)out.push("shroom-belly: a red shroom doesn't upset it");
if(gene(c,"speed")>0.7)out.push("quick legs");
if(c.tier>=5)out.push("a big brain: hungry more often");
return out;
};
F.sexTrait=function(c){
if(!c)return null;
if(c.sex==="m"&&gene(c,"voice")<0.4)return{id:"boom",text:"a booming voice (the boys of its line have it): its call carries twice as far"};
if(c.sex==="f"&&gene(c,"senses")>0.55)return{id:"keen",text:"keen eyes (the girls of its line have them): it spots things lying about from further off"};
return null;
};
F.lateTraits=function(c){
var out=[],f=(c&&c.fr)||{};
if(f.late&&f.late.spurt)out.push("a growth spurt as a teen: pain fades faster");
if(f.late&&f.late.glow)out.push("a late glow: wakes inspired");
if(f.late&&f.late.grey)out.push("grey whiskers: the little ones listen");
return out;
};
F.KNACKS={song:["🎶","a sea song","everyone near feels less alone"],dust:["✨","flutter dust","boredom lifts from everyone near"],glow:["💡","a warm glow","fear drains from everyone near"],butt:["🐏","a headbutt","your next blow lands twice as hard"],think:["💭","a deep think","inspired for a minute"],cheer:["🙌","a big cheer","a laugh for everyone near"]};
F.knack=function(c){var v=F.variant(c);return v==="finned"||v==="skimmer"||v==="lantern-fish"?"song":v==="winged"||v==="firefly"?"dust":v==="glowing"?"glow":v==="horned"||v==="woolly ram"?"butt":c&&c.tier>=5?"think":"cheer";};
F.useKnack=function(game,c){
if(!c||!c.alive)return{ok:false,msg:""};
var f=of(c),d=day(game),k=F.knack(c),n=0;
if(f.kd===d)return{ok:false,msg:"once a day. your knack needs a night's sleep"};
f.kd=d;
if(k==="butt")c._frButt=1;
else if(k==="think")c.inspired=Math.max(c.inspired||0,60);
else tribe(game).forEach(function(o){
if(o===c||o.asleep||dist(o,c)>12||!o.chem)return;n++;
if(k==="song"){o.chem.lonely=Math.max(0,o.chem.lonely-0.3);F.mood(game,o,"song");}
else if(k==="dust"){o.chem.bored=Math.max(0,o.chem.bored-0.3);F.mood(game,o,"knack");}
else if(k==="glow"){o.chem.fear=Math.max(0,o.chem.fear-0.4);F.mood(game,o,"knack");}
else F.mood(game,o,"laugh");
});
fx("sparkle",c,10);F.mood(game,c,"knack");
emit("knack",{c:c,knack:k,n:n});
return{ok:true,knack:k,n:n,msg:F.KNACKS[k][0]+" "+F.KNACKS[k][1]+": "+F.KNACKS[k][2]};
};
F.singer=function(game){var best=null,bv=-1;tribe(game).forEach(function(o){if(o.stage<2||!awake(o))return;var v=gene(o,"chattiness")+(F.hiddenId(game,o)==="voice"?0.4:0)+(F.hobby(game,o)==="singing"?0.3:0);if(v>bv){bv=v;best=o;}});return best;};
F.perform=function(game,c,kind){
if(!isSmol(c))return null;
var n=0,reach=F.hiddenId(game,c)==="voice"?18:10,f=of(c),earned=0;
tribe(game).forEach(function(o){if(o===c||o.asleep||dist(o,c)>reach)return;n++;F.mood(game,o,kind==="song"?"song":"play");remember(game,o,c,"show",3,"put on a good show",2400,9);});
f.gig=(f.gig||0)+1;
if(n>=2)F.addRenown(game,c,1,"a show");
if(n&&game.econ&&(game.econ.coins||game.econ.copper)){earned=Math.round(n*0.5*10)/10;c.purse=Math.round(((c.purse||0)+earned)*100)/100;}
speak(c,kind==="song"?"♪ la la laa ♪":kind==="trick"?"ta-daa!":"long, long ago…",2.8);emote(c,"proud",2.4);
diary(game,c,kind==="song"?"🎵":kind==="trick"?"🎪":"📖",(kind==="song"?"sang":kind==="trick"?"showed my best trick":"told a story")+" for "+n);
emit("performed",{c:c,kind:kind,n:n,earned:earned});
return{c:c,n:n,earned:earned};
};
F.writeTale=function(game,c){
var ch=game.chronicle||[],s=s2(game);if(!isSmol(c)||!ch.length)return null;
var e=ch[Math.floor(dice(game,"tale:"+day(game))()*ch.length)%ch.length],t=[day(game),c.name,"the tale of how "+String(e[2]).replace(/^the /,"the ")];
if(s.tales.some(function(x){return x[2]===t[2];}))return null;
s.tales.push(t);if(s.tales.length>6)s.tales.shift();
F.addRenown(game,c,1,"a tale");diary(game,c,"✍","wrote "+t[2]);
emit("tale",{c:c,text:t[2]});
return t;
};
F.tales=function(game){return s2(game).tales;};
F.readTale=function(game,c,i){
var t=F.tales(game)[i];if(!t)return{ok:false,msg:"no tales written yet"};
if(of(c).rd===day(game))return{ok:true,msg:"📜 "+t[2]+", by "+t[1]};
of(c).rd=day(game);F.mood(game,c,"play");F.addCont(c,5);
emit("taleRead",{c:c,text:t[2]});
return{ok:true,msg:"📜 you read "+t[2]+", by "+t[1]+". a good one"};
};
F.debate=function(game){
var th=tribe(game).filter(function(c){return c.tier>=5&&awake(c);}),I=SB.Ideas;if(th.length<2||!I)return null;
for(var i=0;i<th.length;i++)for(var j=0;j<th.length;j++){
if(i===j)continue;var a=th[i],b=th[j];
for(var id in a.ideas)if(I.known(a,id)&&I.canHold(b,id)&&!I.known(b,id)){
try{I.learn(b,id,0.3,game,"taught");}catch(e){}
speak(a,"no no. listen!",2.4);speak(b,"…oh. hm!",2.4);chat(game,a,b);
emit("debate",{a:a,b:b,idea:id});
return{a:a,b:b,idea:id};
}
}
return null;
};
F.termWork=function(game){
var I=SB.Ideas,got=null;if(!I)return null;
tribe(game).forEach(function(c){
if(got||c.tier<5||!awake(c))return;
for(var id in c.ideas)if(c.ideas[id]>0.2&&c.ideas[id]<1&&I.canHold(c,id)){var was=c.ideas[id];try{I.learn(c,id,0.5,game,"taught");}catch(e){}speak(c,"so. what if…",2.6);got={c:c,idea:id,was:was,now:c.ideas[id]};break;}
});
if(got)emit("termWork",got);
return got;
};
F.EVES={story:["📖","story night","sit and listen"],play:["🎭","a fireside play","take a part"],lantern:["🏮","lantern night","let a lantern go"],drum:["🥁","the drum dance","dance to the drums"]};
F.EVE_LEN=240;
F.eve=function(game){var e=st(game).eve;return e&&game.time<e.until?e:null;};
F.atEve=function(game,c){var e=F.eve(game);return!!e&&!!c&&SB.dist(c.x,c.z,e.x,e.z)<13;};
F.startEve=function(game,k){
var s=st(game),list=tribe(game),d=day(game);
if(list.length<3||story(game)||F.fest(game))return null;
if(!F.EVES[k])k=d%4===1?"lantern":d%4===3?"drum":d%2===0&&game.chronicle&&game.chronicle.length?"play":"story";
var n=game.world.T&&game.world.T.nest,hall=null,cnt=0,el=null,cast=[];
game.world.structures.forEach(function(b){if(b.done&&b.kind==="hall"&&!hall)hall=b;});
var sp=hall&&(k==="play"||k==="story")?{x:hall.x+2,z:hall.z+2}:gatherSpot(game,n?n.x:list[0].x,n?n.z:list[0].z);
list.forEach(function(c){
if(!awake(c)||SB.dist(c.x,c.z,sp.x,sp.z)>50)return;
if(!el||(c.age||0)>(el.age||0))el=c;
if(cnt<8&&!F.following(game,c)){sendTo(c,sp.x+Math.sin(cnt*0.8)*2.6,sp.z+Math.cos(cnt*0.8)*2.6,game,30);cnt++;if(k==="play"&&cast.length<3&&c.stage>=2)cast.push(c);}
});
s.eve={k:k,d:d,x:sp.x,z:sp.z,until:Math.round(game.time+F.EVE_LEN),done:0,el:el?el.id:null,hall:hall?1:0};
if(k==="play"&&cast.length){
var line=game.chronicle&&game.chronicle.length?game.chronicle[game.chronicle.length-1][2]:"the day the pod fell";
s.eve.line=String(line);s.eve.cast=cast.map(function(c){return c.id;});
cast.forEach(function(c,i){of(c).act=(of(c).act||0)+1;F.addRenown(game,c,1,"a play");speak(c,["and so!","oh no!","the end!"][i],3);});
tribe(game).forEach(function(o){if(cast.indexOf(o)<0&&SB.dist(o.x,o.z,sp.x,sp.z)<13)F.mood(game,o,"play");});
}else if(k==="story"&&el)F.perform(game,el,"story");
else{var sg=F.singer(game);if(sg)F.perform(game,sg,"song");}
for(var i=0;i+1<list.length&&i<6;i+=2)if(SB.dist(list[i].x,list[i].z,sp.x,sp.z)<13&&SB.dist(list[i+1].x,list[i+1].z,sp.x,sp.z)<13)chat(game,list[i],list[i+1]);
F.wayCount(game,"night",1);
emit("evening",{k:k,x:sp.x,z:sp.z,n:cnt,cast:cast.length});
if(me())tell(game,F.EVES[k][0]+" "+F.EVES[k][1]+" tonight"+(hall&&(k==="play"||k==="story")?" at the hall":" at the fire")+". go and "+F.EVES[k][2]);
return s.eve;
};
F.troupe=function(game){return tribe(game).filter(function(c){return c.fr&&c.fr.act>=3;});};
F.listen=function(game,by,el){
if(!by||!isSmol(el)||el===by)return{ok:false,msg:"nobody old enough to listen to"};
var s=st(game),d=day(game),out=[];
if(s.lsd===d)return{ok:false,msg:el.name+" has told its story for today"};
s.lsd=d;
var w=learnAWord(game,el,by,1);if(w)out.push("a word: “"+w+"”");
var best=null,bd=1e9;game.world.structures.forEach(function(b){if(b.kind!=="lootchest"||(SB.Loot&&SB.Loot.isOpen&&SB.Loot.isOpen(game,b)))return;var dd=SB.dist(b.x,b.z,by.x,by.z);if(dd<bd){bd=dd;best=b;}});
if(best){el.facing=Math.atan2(best.x-el.x,best.z-el.z);out.push("it turns and points: something old lies about "+Math.round(bd)+" steps that way");}
if(d%7===0||!out.length){
var pool=tribe(game).filter(function(o){return o!==by&&o!==el;}),o=pool.length?pickOf(pool,dice(game,"tip:"+d)()):null,fav=o?F.favourite(game,o):null;
if(o&&fav){rec(game,o).k[fav]=2;out.push("a tip: "+o.name+" loves "+label(fav));}
}
speak(el,"long, long ago…",3);F.add(game,el,10);F.mood(game,by,"lesson");
emit("listened",{by:by,el:el,word:w,chest:!!best});
return{ok:true,word:w,msg:"📖 "+el.name+" tells you a story"+(out.length?". "+out.join(". "):"")};
};
F.joinEve=function(game,c){
var e=F.eve(game);if(!e||!c)return{ok:false,msg:"nothing on at the fire tonight"};
if(e.done)return{ok:false,msg:"you've had your turn. enjoy the evening"};
if(!F.atEve(game,c))return{ok:false,msg:"it's over there, where the tribe is sitting"};
e.done=1;
var msg,sl=Sv().held(c),fed=0,dates=0;
if(sl&&Sv().edible(sl.k)){Sv().removeAt(c,Sv().inv(c).sel,1);tribe(game).forEach(function(o){if(o!==c&&SB.dist(o.x,o.z,e.x,e.z)<13&&o.chem){o.chem.hunger=Math.max(0,o.chem.hunger-0.15);F.add(game,o,5);fed++;}});}
F.followers(game).forEach(function(f){if(dist(f,c)<13){F.add(game,f,30);note(game,f,"we sat by the fire together");dates++;}});
if(e.k==="story"){var l=F.listen(game,c,byId(game,e.el));msg=l.ok?l.msg:"📖 you sit and listen";}
else if(e.k==="play"){of(c).act=(of(c).act||0)+1;F.addRenown(game,c,1,"a play");(e.cast||[]).forEach(function(id){var a=byId(game,id);if(isSmol(a)&&a!==c)F.add(game,a,10);});msg="🎭 you take a part in the play: “"+(e.line||"the day the pod fell")+"”. they clap";}
else if(e.k==="lantern"){F.addCont(c,20);sparks(game,2,c);fx("sparkle",c,14);msg="🏮 you let a lantern go, and make a wish. up it floats. +2 ✨";}
else{
var f=of(c),r=dice(game,"drum:"+e.d+":"+c.id);f.dance=(f.dance||0)+2;
var mine=Math.round(f.dance*3+gene(c,"playfulness")*20+r()*30),riv=tribe(game).filter(function(o){return o!==c&&o.stage>=2&&SB.dist(o.x,o.z,e.x,e.z)<20;})[0],theirs=Math.round(15+r()*35+(riv?((riv.fr&&riv.fr.dance)||0)*3:0));
e.mine=mine;e.best=theirs;
if(mine>theirs){sparks(game,3,c);F.addRenown(game,c,1,"a dance-off");}
msg="🥁 you dance to the drums: "+mine+(riv?" against "+riv.name+"'s ":" against ")+theirs+(mine>theirs?". you win the dance-off. +3 ✨":". good try")+" (dancing "+f.dance+")";
}
F.mood(game,c,e.k==="lantern"?"lantern":e.k==="drum"?"drum":e.k==="play"?"play":"lesson");
emit("eveJoin",{k:e.k,c:c,fed:fed,dates:dates});
return{ok:true,msg:msg+(fed?". you pass your food round: "+fed+" eat":"")+(dates?". "+dates+" friend"+(dates>1?"s":"")+" sat with you":"")};
};
function pebScore(game,c,key){return gene(c,"planning")*10+gene(c,"learnRate")*10+F.luck(game,c)*5+dice(game,key+":"+c.id)()*20;}
F.pebbles=function(game,a,b,byPlayer){
if(!isSmol(a)||!isSmol(b)||a===b)return null;
var d=day(game);
if(byPlayer){if(b.asleep)return{ok:false,msg:"💤 "+b.name+" is asleep"};if(dist(a,b)>7)return{ok:false,msg:"get closer to "+b.name};if(rec(game,b).pb===d)return{ok:false,msg:"one game a day with "+b.name};rec(game,b).pb=d;}
var key="peb:"+d+":"+Math.round(game.time),win=pebScore(game,a,key)>=pebScore(game,b,key)?a:b,lose=win===a?b:a;
of(win).peb=(of(win).peb||0)+1;
remember(game,a,b,"pebbles",3,"we play pebbles",2400,9);remember(game,b,a,"pebbles",3,"we play pebbles",2400,9);
speak(win,"ha! mine!",2);speak(lose,"again!",2);
var got=byPlayer?F.add(game,b,10+(win===a?5:0)):0;
emit("pebbles",{a:a,b:b,win:win,byPlayer:!!byPlayer});
return{ok:true,win:win,msg:"🪨 pebbles with "+b.name+": "+(win===a?"you win":b.name+" wins")+(got?" · +"+got:"")};
};
F.champion=function(game){var best=null,bv=0;tribe(game).forEach(function(c){var n=(c.fr&&c.fr.peb)||0;if(n>bv){bv=n;best=c;}});return best;};
F.playGame=function(game,by,c,kind){
if(!by||!isSmol(c)||c===by)return{ok:false,msg:""};
if(c.asleep)return{ok:false,msg:"💤 "+c.name+" is asleep"};
if(!(c.stage<=2||gene(c,"playfulness")>0.6)){speak(c,"me busy",1.8);return{ok:false,msg:c.name+" is too grown-up for that. ask a kid"};}
if(dist(by,c)>8)return{ok:false,msg:"get closer to "+c.name};
var s=st(game),a=dice(game,"tag:"+c.id+":"+Math.round(game.time))()*6.283,r=kind==="hide"?11:9;
s.tag={k:kind==="hide"?"hide":"tag",c:c.id,t:Math.round(game.time),until:Math.round(game.time+(kind==="hide"?45:25)),x:c.x+Math.cos(a)*r,z:c.z+Math.sin(a)*r};
sendTo(c,s.tag.x,s.tag.z,game,14);speak(c,kind==="hide"?"no peeking!":"can't catch me!",2);emote(c,"happy",2);
emit("gameStart",{c:c,by:by,kind:s.tag.k});
return{ok:true,msg:kind==="hide"?"🙈 you cover your eyes. "+c.name+" runs off to hide: go and find it":"🏃 "+c.name+" is off! catch it"};
};
function tagTick(game){
var s=st(game),g=s.tag,m=me();if(!g)return;
var c=byId(game,g.c);
if(!m||!isSmol(c)){s.tag=null;return;}
var d=dist(m,c),won=g.k==="tag"?d<1.8:d<2.5&&game.time-g.t>3;
if(!won&&game.time<g.until)return;
s.tag=null;bump(c,"play");F.mood(game,c,"laugh");F.addCont(m,5);
var got=F.add(game,c,won?15:5);
speak(c,won?(g.k==="tag"?"you got me!":"you found me!"):"hehe. too slow!",2.2);
tell(game,(won?(g.k==="tag"?"🏃 got it! ":"🙈 found it! "):"⌛ "+c.name+" wins that one. ")+c.name+" giggles · +"+got);
emit("gameEnd",{c:c,kind:g.k,won:won});
}
F._tagTick=tagTick;
F.shove=function(game,by,c){
if(!by||!isSmol(c)||c===by)return{ok:false,msg:""};
if(c.stage<3||c.asleep)return{ok:false,msg:c.asleep?"💤 "+c.name+" is asleep":"only with a grown-up"};
if(dist(by,c)>6)return{ok:false,msg:"get closer to "+c.name};
var s=st(game),d=day(game);if(s.shd===d)return{ok:false,msg:"one shoving match a day"};
s.shd=d;
var r=dice(game,"shove:"+d+":"+c.id),bet=Math.min(2,by.purse||0,c.purse||0),a=gene(by,"toughness")*10+(by.tier||0)*2+F.luck(game,by)*4+r()*20,b=gene(c,"toughness")*10+(c.tier||0)*2+r()*20,win=a>=b;
if(bet>0){by.purse=Math.round(((by.purse||0)+(win?bet:-bet))*100)/100;c.purse=Math.round(((c.purse||0)+(win?-bet:bet))*100)/100;}
remember(game,c,by,"sport",4,"a good sport",2400,12);emote(c,win?"huh":"proud",2);speak(c,win?"oof! good one":"ha! me win",2.2);
F.add(game,c,10);
emit("shove",{by:by,c:c,win:win,bet:bet});
return{ok:true,win:win,bet:bet,msg:"🤼 you and "+c.name+" lean in and shove. "+(win?"you win":c.name+" wins")+(bet?", and "+bet+" changes paws":"")+". no hard feelings"};
};
F.kickabout=function(game){
var p=tribe(game).filter(function(c){return awake(c)&&c.stage>=1&&c.stage<=3&&gene(c,"playfulness")>0.45;}).slice(0,8);
if(p.length<4)return null;
var r=dice(game,"kick:"+Math.round(game.time)),sc=[Math.floor(r()*4),Math.floor(r()*4)];
p.forEach(function(c,i){F.mood(game,c,"moment");if(c.stage<3)bump(c,"play");if(i)chat(game,p[0],c);});
diary(game,p[0],"⚽","kick-about: "+sc[0]+" to "+sc[1]);
emit("kickabout",{n:p.length,score:sc});
return{n:p.length,score:sc};
};
F.grudge=function(game,c){return(c&&s2(game).cr.g[c.tribe||0])||0;};
F.crime=function(game,by,victim,guard,kind){
var s=s2(game),tr=(victim||guard||by).tribe||0;
s.cr.g[tr]=(s.cr.g[tr]||0)+1;
s.cr.arr={by:guard?guard.id:null,k:kind||null,own:victim?victim.id:null,t:Math.round(game.time)};
if(victim){F.add(game,victim,-60);remember(game,victim,by,"stole",-15,"took my things",6000,30);}
if(guard){speak(guard,kind?"hey! that not yours!":"hey! we don't do that!",2.6);emote(guard,"angry",2);sendTo(guard,by.x+0.8,by.z+0.5,game,14);}
emit("crime",{by:by,victim:victim||null,guard:guard||null,kind:kind||null});
return s.cr.arr;
};
F.rummage=function(game,by,c){
if(!by||!isSmol(c)||c===by)return{ok:false,msg:""};
if(dist(by,c)>3)return{ok:false,msg:"get closer to "+c.name};
var v=Sv().inv(c),i=-1;for(var j=0;j<v.s.length;j++)if(v.s[j]){i=j;break;}
if(i<0)return{ok:false,msg:c.name+"'s pouch is empty"};
var k=v.s[i].k,share=F.hearts(game,c)>=7||c.partner===by.id;
Sv().removeAt(c,i,1);addItem(game,by,k,1);
if(share){speak(c,"take, take",1.8);emit("shared",{by:by,c:c,kind:k});return{ok:true,shared:true,kind:k,msg:"🤝 "+c.name+" lets you take "+label(k)+". what's its is yours"};}
s2(game).cr.stolen[k]=c.id;
var wit=!c.asleep?c:null;if(!wit)tribe(game).forEach(function(o){if(!wit&&o!==by&&o!==c&&!o.asleep&&dist(o,by)<10)wit=o;});
if(!wit){emit("pinched",{by:by,c:c,kind:k,seen:false});return{ok:true,seen:false,kind:k,msg:"🤫 you take "+label(k)+" from "+c.name+"'s pouch. nobody saw. it is still "+c.name+"'s"};}
F.crime(game,by,c,wit,k);
emit("pinched",{by:by,c:c,kind:k,seen:true});
return{ok:true,seen:true,kind:k,msg:"🫣 "+wit.name+" saw you take "+c.name+"'s "+label(k)+"! give it back, say sorry, or run"};
};
F.answer=function(game,by,how){
var s=s2(game),a=s.cr.arr;if(!a)return{ok:false,msg:"nobody is cross with you"};
var g=byId(game,a.by),own=byId(game,a.own),tr=((g||own||by).tribe)||0;
if(how==="back"){
if(!a.k||!Sv().count(by,a.k,true))return{ok:false,msg:"you haven't got it to give back"};
Sv().take(by,a.k,1);if(own&&own.alive)Sv().add(own,a.k,1);delete s.cr.stolen[a.k];
s.cr.g[tr]=Math.max(0,(s.cr.g[tr]||0)-1);s.cr.arr=null;if(own)F.add(game,own,30);
emit("crimeEnd",{how:how});return{ok:true,msg:"🙇 you give it back. "+(own?own.name:"it")+" sniffs, and lets it go"};
}
if(how==="sorry"){
s.cr.arr=null;
if(g&&F.hearts(game,g)>=6&&!s.cr.len){s.cr.len=1;s.cr.g[tr]=0;emit("crimeEnd",{how:"forgiven"});return{ok:true,forgiven:true,msg:"🫂 "+g.name+" knows you. forgiven, this once"};}
if(g)F.add(game,g,-20);
emit("crimeEnd",{how:how});return{ok:true,msg:"😔 you say sorry. "+(g?g.name:"it")+" huffs. the village will remember for a while"};
}
if(how==="timeout"){s.cr.arr=null;s.cr.g[tr]=0;s.cr.to=Math.round(game.time+20);if(g)F.add(game,g,-10);F.mood(game,by,"shame");emit("crimeEnd",{how:how});return{ok:true,msg:"🪑 you sit out by the hall where everyone can see. it costs a little trust, and it's done with"};}
s.cr.arr=null;s.cr.g[tr]=(s.cr.g[tr]||0)+1;
emit("crimeEnd",{how:"run"});return{ok:true,msg:"🏃 you leg it. this village won't do you favours for a while"};
};
F.sway=function(game,by,c,how){
if(!by||!isSmol(c)||c===by)return{ok:false,msg:""};
if(dist(by,c)>7)return{ok:false,msg:"get closer to "+c.name};
var r=rec(game,c),d=day(game);
if(how==="persuade"){
if(r.pd===d)return{ok:false,msg:"you've made your case to "+c.name+" today"};
r.pd=d;
var ok=dice(game,"sway:"+c.id+":"+d)()<0.25+F.hearts(game,c)*0.1+F.rank(by)*0.1;
if(ok)c._frYes=game.time+90;speak(c,ok?"…okay. this once":"hm. no",2);
emit("swayed",{c:c,how:how,ok:ok});
return{ok:ok,msg:ok?"🗣 you talk "+c.name+" round. it'll do as you ask for a bit":"🗣 "+c.name+" isn't convinced"};
}
if(how==="bribe"){
var sl=Sv().held(by);if(!sl||!Sv().edible(sl.k)||F.taste(game,c,sl.k)<0)return{ok:false,msg:"hold some food it doesn't hate"};
var k=sl.k;Sv().removeAt(by,Sv().inv(by).sel,1);if(c.chem)c.chem.hunger=Math.max(0,c.chem.hunger-0.2);
c._frYes=game.time+90;speak(c,"mm. okay!",2);emit("swayed",{c:c,how:how,ok:true});
return{ok:true,msg:"🍪 "+c.name+" takes the "+label(k)+", and will do as you ask for a bit"};
}
if(how==="favour"){
if(F.renown(by)<2)return{ok:false,msg:"you've no name to trade on yet (2 renown)"};
of(by).ren=Math.round((of(by).ren-2)*10)/10;c._frYes=game.time+120;speak(c,"for you? fine",2);emit("swayed",{c:c,how:how,ok:true});
return{ok:true,msg:"🎖 you call in a favour. "+c.name+" will do as you ask (−2 renown)"};
}
var meek=gene(c,"bravery")<0.45;
remember(game,c,by,"scolded",-8,"bossed me about",2400,16);F.add(game,c,-15);
if(meek)c._frYes=game.time+60;else if(c.chem)c.chem.anger=Math.min(1,(c.chem.anger||0)+0.2);
speak(c,meek?"eep. okay okay":"NO. you not boss",2);emote(c,meek?"sad":"angry",2);
emit("swayed",{c:c,how:"scold",ok:meek});
return{ok:meek,msg:meek?"☝ "+c.name+" does as it's told, and likes you less for it":"☝ "+c.name+" puffs up and won't be bossed"};
};
F.slip=function(game,by,c){
if(!by||!isSmol(c)||c===by)return{ok:false,msg:""};
if(dist(by,c)>3)return{ok:false,msg:"get closer to "+c.name};
var sl=Sv().held(by);if(!sl)return{ok:false,msg:"hold the thing you want to slip in"};
var r=rec(game,c);if(r.slip)return{ok:false,msg:"there's a surprise waiting in "+c.name+"'s pouch already"};
r.slip=sl.k;Sv().removeAt(by,Sv().inv(by).sel,1);
emit("slipped",{by:by,c:c,kind:r.slip});
return{ok:true,msg:"🤫 you slip "+label(r.slip)+" into "+c.name+"'s pouch. it'll find it in the morning"};
};
F.yesNo=function(game,by,c,yes){
if(!by||!isSmol(c)||c===by||!SB.Creature)return{ok:false,msg:""};
if(dist(by,c)>8)return{ok:false,msg:"get closer to "+c.name};
try{if(yes)SB.Creature.tickle(c,game);else SB.Creature.tap(c,game);}catch(e){}
speak(by,yes?"good!":"bad!",1.6);
emit("yesNo",{by:by,c:c,yes:!!yes});
return{ok:true,msg:yes?"👍 “good!” "+c.name+" will do that more":"👎 “bad!” "+c.name+" will think twice"};
};
F.trial=function(game){
var s=st(game),t=s.trial,c=t?byId(game,t.c):null;if(!t)return null;
s.trial=null;if(!isSmol(c))return null;
var sum=0,n=0;tribe(game).forEach(function(o){if(o!==c&&o.stage>=3){sum+=opinion(game,o,c);n++;}});
var kind=t.spoke||(n&&sum/n>=0)?"fine":"timeout";
if(kind==="fine"){F.addRenown(game,c,-3,"a trial");if(Sv().spawn)Sv().spawn(game,K().berry?"berry":"stick",1,c.x+0.5,c.z+0.4);}
else{c._frStay=game.time+60;if(SB.Creature&&SB.Creature.startAction){try{SB.Creature.startAction(c,game,SB.V.idle,null);if(c.action)c.action.dur=60;}catch(e){}}F.mood(game,c,"shame");}
chron(game,"⚖","the tribe sat in judgement on "+c.name+": "+(kind==="fine"?"it pays a fine":"it sits out by the hall"));
emit("trial",{c:c,verdict:kind,spoke:!!t.spoke});
return{c:c,verdict:kind};
};
F.speakUp=function(game,by){
var t=st(game).trial,c=t?byId(game,t.c):null;if(!t||!isSmol(c))return{ok:false,msg:"nobody is on trial"};
if(t.spoke)return{ok:false,msg:"you've spoken for "+c.name};
t.spoke=1;F.add(game,c,40);note(game,c,"you spoke up for me");
return{ok:true,msg:"🗣 you speak up for "+c.name+". the tribe will go easy"};
};
F.courts=function(game,c){if(!st(game).anyPair)return"other";var r=dice(game,"courts:"+c.id)();return r<0.8?"other":r<0.9?"same":"any";};
F.pairOk=function(game,a,b){if(!game||!st(game).anyPair||!a||!b)return false;return F.courts(game,a)!=="other"&&F.courts(game,b)!=="other";};
F.courtWhy=function(game,by,c){
var S=SB.Social;if(!S||!by||!isSmol(c)||c===by)return"nobody to court";
if(!S.eligible(game,by,c))return by.stage!==3||c.stage!==3?"courting is for grown-ups":kin(game,by,c)?"you two are family":"you two would only ever be friends";
var p=S.partnerOf(game,c),q=S.partnerOf(game,by);
if(c.partner===by.id)return"you two are partners already";
if(p&&p!==by)return c.name+" has a partner";
if(q&&q!==c)return"you have a partner";
return"";
};
F.date=function(game,by,c){
var why=F.courtWhy(game,by,c);if(why)return{ok:false,msg:why};
if(F.hearts(game,c)<4)return{ok:false,msg:c.name+" doesn't know you well enough for a walk (4 ♥)"};
if(dist(by,c)>7)return{ok:false,msg:"get closer to "+c.name};
var s=st(game),r=rec(game,c),d=day(game);if(r.dd===d)return{ok:false,msg:"you've had your walk with "+c.name+" today"};
r.dd=d;
var w=game.world,n=0,bits=[],sl=Sv().held(by);
if(w.night||(SB.World.nearestFire&&SB.World.nearestFire(w,by.x,by.z,12))){n++;bits.push(w.night?"the stars are out":"the fire is warm");}
if(sl&&Sv().edible(sl.k)&&F.taste(game,c,sl.k)>=1){Sv().removeAt(by,Sv().inv(by).sel,1);n++;bits.push("you share your "+label(sl.k));}
if(F.fits(game,c,by)>0||F.signsFit(game,by,c)){n++;bits.push("you are just its sort");}
[by,c].forEach(function(x){if(x.chem)x.chem.love=Math.min(1,(x.chem.love||0)+0.3);});
remember(game,c,by,"walk",6+n*4,"a lovely walk together",4000,30);remember(game,by,c,"walk",6+n*4,"a lovely walk together",4000,30);
var courting=false;try{courting=!!SB.Social.court(game,by,c,"talk");}catch(e){}
var got=F.add(game,c,10+n*20);emote(c,"love",2.4);speak(c,n>=2?"♥ nice walk":"nice walk",2.2);F.mood(game,c,"matched");
s.dates=(s.dates||[]).filter(function(x){return x[1]>=d-3&&x[0]!==c.id;});
var other=null;s.dates.forEach(function(x){var o=byId(game,x[0]);if(isSmol(o)&&F.hearts(game,o)>=4)other=o;});
s.dates.push([c.id,d]);
if(other){F.add(game,other,-100);F.mood(game,other,"jealous");remember(game,other,by,"twotimer",-20,"walks out with someone else too",6000,30);remember(game,other,c,"rival",-10,"is after the same smol",4000,20);emit("jealous",{c:other,of:c,by:by});}
emit("dated",{by:by,c:c,moments:n,courting:courting});
return{ok:true,moments:n,msg:"🌙 you and "+c.name+" go for a walk"+(bits.length?": "+bits.join(", "):". it's a quiet one")+" · +"+got+(other?". "+other.name+" heard about it, and is hurt":"")};
};
F.propose=function(game,by,c){
var why=F.courtWhy(game,by,c);if(why)return{ok:false,msg:why};
if(F.hearts(game,c)<8)return{ok:false,msg:c.name+" isn't ready (8 ♥)"};
var tok=Sv().count(by,"posy",true)?"posy":Sv().count(by,"knot",true)?"knot":null;
if(!tok)return{ok:false,msg:"bring a token: a posy, or a wedding knot"};
if(SB.Home&&SB.Home.get&&!SB.Home.get(game))return{ok:false,msg:"you need a home of your own first"};
Sv().take(by,tok,1);
try{SB.Social.bond(game,by,c);}catch(e){}
if(c.partner!==by.id){c.partner=by.id;by.partner=c.id;}
emote(c,"love",3);speak(c,"yes! yes!",3);fx("hearts",c,10);F.mood(game,c,"kissed");
emit("proposed",{by:by,c:c,token:tok});
return{ok:true,msg:"💍 you give "+c.name+" your "+label(tok)+". it says yes"};
};
F.cap=function(game,c){
if(!c||c.partner==null)return F.MAX;
var m=me(),mine=SB.Mine&&SB.Mine.get?SB.Mine.get(game):null;
return(m&&c.partner===m.id)||(mine&&c.partner===mine.id)?F.MAX+2:F.MAX;
};
F.UNLOCK[12]="a star seed, from a partner who trusts you all the way";
F.canHorn=function(c){for(var k in F.HORN)if(Sv().count(c,k,true)<F.HORN[k])return false;return c.tier>=2;};
F.makeHorn=function(game,c){
if(!F.canHorn(c))return{ok:false,msg:c.tier<2?"it takes hands: a tool-user and up":"a calling horn needs 2 sticks and a vine"};
for(var k in F.HORN)Sv().take(c,k,F.HORN[k]);
addItem(game,c,"callhorn",1);emit("craft",{c:c,id:"callhorn",item:{kind:"callhorn"},pov:!!c._pov});
return{ok:true,msg:"📯 a calling horn. blow it and your friends come from far off"};
};
F.horn=function(game,c){
if(!c||!Sv().count(c,"callhorn",true))return{ok:false,msg:"you've no horn"};
var n=0,mine=SB.Mine&&SB.Mine.get?SB.Mine.get(game):null,far=F.sexTrait(c)&&F.sexTrait(c).id==="boom"?140:90;
tribe(game).forEach(function(o){
if(o===c||dist(o,c)>far)return;
if(o!==mine&&!F.willing(game,c,o,1))return;
if(o.asleep){o.asleep=false;o.inBed=false;o.action=null;}
if(sendTo(o,c.x+(n%3)-1,c.z+1+Math.floor(n/3),game,30))n++;
});
sound("grump",0.3);emit("horn",{c:c,n:n});
return{ok:n>0,n:n,msg:n?"📯 HAROOO. "+n+" smol"+(n>1?"s come":" comes")+" running":"📯 HAROOO. nobody near enough knows you (1 ♥)"};
};
F.TONES={hard:"💪 work hard",easy:"🌤 take it easy"};
F.tone=function(game,by,c,t){
if(!isSmol(c))return{ok:false,msg:""};
if(by&&c!==by&&!F.willing(game,by,c,2))return{ok:false,msg:c.name+" doesn't know you well enough for that (2 ♥)"};
var f=of(c);f.tone=f.tone===t||!F.TONES[t]?null:t;
speak(c,f.tone==="hard"?"me work work!":f.tone==="easy"?"ahh. slow day":"okay",2);
emit("tone",{c:c,tone:f.tone});
return{ok:true,tone:f.tone,msg:f.tone==="hard"?"💪 "+c.name+" will push itself: more to show for it, and a shorter temper":f.tone==="easy"?"🌤 "+c.name+" will take it easy: slower, and happier":c.name+" goes back to its own pace"};
};
var INV={fish:["🎣","fish with me"],eat:["🍲","eat with me"],fire:["🔥","sit by the fire with me"]};
F.invite=function(game,from,kind){
var m=me(),s=st(game);if(!m||(s.inv&&s.inv.until>game.time))return null;
var c=from||tribe(game).filter(function(o){return o!==m&&awake(o)&&F.hearts(game,o)>=3&&dist(o,m)<25;})[0];
if(!c)return null;
var k=INV[kind]?kind:pickOf(Object.keys(INV),dice(game,"inv:"+Math.round(game.time))());
s.inv={c:c.id,k:k,until:Math.round(game.time+90)};
speak(c,"come "+INV[k][1].replace(" with me","")+"?",2.6);sendTo(c,m.x+0.9,m.z+0.5,game,16);
tell(game,"💌 "+c.name+" asks: come and "+INV[k][1]+"? (say yes on the 🧬 life tab)");
emit("invited",{c:c,kind:k});
return s.inv;
};
F.accept=function(game,by){
var s=st(game),v=s.inv,c=v?byId(game,v.c):null;
if(!v||v.until<game.time||!isSmol(c)){s.inv=null;return{ok:false,msg:"nobody is asking just now"};}
s.inv=null;
var got=F.add(game,c,25);F.mood(game,c,"chat");F.mood(game,by,"chat");F.addCont(by,10);note(game,c,"you came when I asked");
if(v.k==="fish"&&K().fish){addItem(game,by,"fish",1);of(c).fish=(of(c).fish||0)+1;}
else if(v.k==="eat")[by,c].forEach(function(x){if(x.chem)x.chem.hunger=Math.max(0,x.chem.hunger-0.2);});
else if(by.chem)by.chem.cold=Math.max(0,(by.chem.cold||0)-0.3);
emit("inviteAccepted",{c:c,by:by,kind:v.k});
return{ok:true,msg:INV[v.k][0]+" you and "+c.name+" "+({fish:"fish side by side. you come away with one",eat:"share a meal",fire:"sit by the fire and say not much"})[v.k]+" · +"+got};
};
var meets=[];
F.visitFriend=function(game,c){
var best=null,bv=9.9;tribe(game).forEach(function(o){if(o===c||o._pov||o.asleep)return;var v=opinion(game,c,o);if(v>bv){bv=v;best=o;}});
if(!best)return null;
meets=meets.filter(function(x){return x.a!==c;});meets.push({a:c,b:best,until:game.time+45});
sendTo(c,best.x+0.8,best.z+0.4,game,30);speak(c,"me go see "+best.name,2);
emit("visiting",{c:c,to:best});
return best;
};
function meetTick(game){
for(var i=meets.length-1;i>=0;i--){
var x=meets[i];
if(!isSmol(x.a)||!isSmol(x.b)||game.time>x.until){meets.splice(i,1);continue;}
if(dist(x.a,x.b)<2.8){meets.splice(i,1);chat(game,x.a,x.b);if(x.a.chem)x.a.chem.lonely=Math.max(0,x.a.chem.lonely-0.3);speak(x.b,"oh! hello "+x.a.name,2);emit("visited",{a:x.a,b:x.b});}
}
}
F._meetTick=meetTick;
F.courier=function(game,from,kind,why){
var m=me();
if(m&&isSmol(from)&&from!==m){F.errands().push({c:from,k:kind,ph:"back",until:game.time+60,by:m.id});sendTo(from,m.x+0.8,m.z+0.5,game,30);}
else{var h=SB.Home&&SB.Home.get?SB.Home.get(game):null,at=h||homeOf(game,from);if(Sv().spawn)Sv().spawn(game,kind,1,at.x+0.9,at.z+0.7);}
emit("courier",{from:from||null,kind:kind,why:why||""});
return true;
};
F.feral=function(game){var out=null;game.creatures.forEach(function(c){if(c.alive&&c.stranger&&c.stranger.state==="feral")out=c;});return out;};
F.spawnFeral=function(game){
if(F.feral(game)||!SB.Strangers||!SB.Strangers.arrive||(SB.Strangers.pending&&SB.Strangers.pending(game)))return null;
var c=withDice(game,"feral",function(){return SB.Strangers.arrive(game,{});});
if(!c||!c.stranger)return null;
c.stranger.state="feral";c.stranger.trait="wild";of(c).tame=0;of(c).fd=day(game);
if(c.chem)c.chem.fear=0.5;
emit("feral",{c:c});
toast(game,"🌿 a wild smol is watching from the edge of things. food and a kind hand might win it over",c);
return c;
};
F.tame=function(game,c,how){
if(!c||!c.stranger||c.stranger.state!=="feral")return{ok:false,msg:""};
var f=of(c);f.tame=(f.tame||0)+1;emote(c,"huh",1.6);if(c.chem)c.chem.fear=Math.max(0,c.chem.fear-0.2);
if(f.tame<3){speak(c,f.tame===1?"…?":"…friend?",2);emit("feralWarmed",{c:c,n:f.tame,how:how||""});return{ok:true,n:f.tame,msg:"🌿 the wild smol edges closer ("+f.tame+"/3)"};}
c.stranger.state="waiting";
try{withDice(game,"tame",function(){SB.Strangers.decide(game,c,true,false);});}catch(e){}
if(c.stranger)c.stranger=null;
of(c).wild=1;chron(game,"🌿","the wild smol came in from the edge. they call it "+c.name);
emit("feralTamed",{c:c});
return{ok:true,n:3,joined:true,msg:"🌿 the wild smol comes in. this is "+c.name+" now"};
};
var mournC={t:-99,v:null};
F.mourning=function(game){
if(game.time-mournC.t<30&&mournC.g===game)return mournC.v;
var gs=game.world.structures.filter(function(b){return b.kind==="grave";}),v=null;
for(var i=0;i<gs.length&&!v;i++){var n=0;for(var j=0;j<gs.length;j++)if(SB.dist(gs[i].x,gs[i].z,gs[j].x,gs[j].z)<10)n++;if(n>=3)v={x:gs[i].x,z:gs[i].z,n:n};}
mournC={t:game.time,v:v,g:game};
return v;
};
var PV=[["ears","big ears","small ears"],["size","big","small"],["fluff","fluffy",""],["bravery","bold","timid"],["playfulness","playful","serious"],["learnRate","quick to learn",""]];
F.preview=function(game,a,b){
var G=SB.Genome;if(!a||!b||!a.genome||!b.genome||!G||!G.cross)return null;
var r=dice(game,"pv:"+a.id+":"+b.id),lo=9,hi=0,sum={},N=6,words=[];
for(var i=0;i<N;i++){
var g;try{g=G.cross(a.genome,b.genome,r,null,null);}catch(e){return null;}
var t=G.tierOf(g);if(t<lo)lo=t;if(t>hi)hi=t;
PV.forEach(function(p){var v=g.genes[p[0]];sum[p[0]]=(sum[p[0]]||0)+(v==null?0.5:v);});
}
PV.forEach(function(p){var v=sum[p[0]]/N;if(v>0.6&&p[1])words.push(p[1]);else if(v<0.4&&p[2])words.push(p[2]);});
var T=SB.TIERS||[];
return{tier:[lo,hi],words:words,text:"likely "+(words.length?words.join(", "):"a bit of both")+(T[lo]?" · "+T[lo].name+(hi>lo&&T[hi]?" to "+T[hi].name:""):"")};
};
F.fertile=function(game,c){
if(!c||c.stage!==3)return"not of an age for eggs";
if((c.eggCooldown||0)>0)return"resting ("+Math.ceil(c.eggCooldown)+"s)";
var lv=c.chem?c.chem.love||0:0;
return lv>=0.5?"ready, and in the mood":lv>=0.25?"ready, and warming up":"ready, but its mind is elsewhere";
};
function isEgg(o){return!!o&&o.kind==="egg"&&!!o.data&&!o.data.pod&&!o.data.starter;}
F.eggSex=function(game,egg){
if(!isEgg(egg))return{ok:false,msg:""};
var d=egg.data;if(!d.frSex&&!spend(game,1))return{ok:false,msg:"a wish costs 1 ✨"};
d.frSex=d.frSex==="f"?"m":"f";
emit("eggWish",{egg:egg,sex:d.frSex});
return{ok:true,sex:d.frSex,msg:"🥚 you wish for a "+(d.frSex==="f"?"girl":"boy")+". ask again to change your mind"};
};
var STAND=["ears","size","fluff","bravery","playfulness","learnRate","toughness","speed","curiosity","affection"];
F.standout=function(c,egg){
var best=null,bv=0.5,eg=egg&&egg.data&&egg.data.genome&&egg.data.genome.genes?egg.data.genome.genes:null;
STAND.forEach(function(g){var v=gene(c,g);if(v>bv&&!(eg&&v<=(eg[g]==null?0.5:eg[g]))){bv=v;best=g;}});
return best;
};
function gname(g){return SB.Genome&&SB.Genome.GENE_LABELS&&SB.Genome.GENE_LABELS[g]?SB.Genome.GENE_LABELS[g]:g;}
F.geneCopy=function(game,donor,egg){
if(!isSmol(donor)||!isEgg(egg)||!egg.data.genome||!egg.data.genome.genes)return{ok:false,msg:"look at an egg, with a smol picked on the friends tab"};
if(egg.data.frGene)return{ok:false,msg:"this egg has had its gift already"};
var g=F.standout(donor,egg);
if(!g)return{ok:false,none:true,msg:donor.name+" has nothing to give this egg: "+(F.standout(donor)?"the egg already has as much of everything "+donor.name+" is strong in":"nothing about "+donor.name+" stands out")};
if(!spend(game,3))return{ok:false,msg:"that costs 3 ✨"};
egg.data.genome.genes[g]=gene(donor,g);egg.data.frGene=[g,donor.name];
emit("geneCopy",{donor:donor,egg:egg,gene:g});
return{ok:true,gene:g,msg:"🧬 the egg takes "+donor.name+"'s "+gname(g)};
};
F.blend=function(game,by,a,b){
if(!by||!isSmol(a)||!isSmol(b))return{ok:false,msg:"pick two smols"};
if((by.tier||0)<5)return{ok:false,msg:"it takes a thinker's hands"};
var s=st(game),d=day(game),clone=a===b,cost=clone?15:10;
if(s.bd===d)return{ok:false,msg:"one blend a day"};
var pop=SB.Game.smols(game).length+game.world.items.filter(function(o){return o.kind==="egg";}).length;
if(pop>=(SB.Game.POP_CAP||36))return{ok:false,msg:"too many smols for another egg"};
if(!spend(game,cost))return{ok:false,msg:"that costs "+cost+" ✨"};
var egg=withDice(game,"blend",function(){return SB.Game.layEgg(game,a,b,by.x+0.8,by.z+0.5);});
s.bd=d;if(egg&&egg.data)egg.data.frBlend=clone?2:1;
emit("blend",{a:a,b:b,egg:egg,clone:clone});
return{ok:!!egg,egg:egg,msg:clone?"🥚 an echo egg: "+a.name+", over again (give or take)":"🥚 a blended egg, from "+a.name+" and "+b.name};
};
F.MIRROR={looks:["hue","hue2","pattern","ears","eyes","tail","size","cheeks"],nature:["bravery","sociability","playfulness","grumpiness","chattiness","affection"],body:["toughness","speed"],rare:["fins","wings","horns","fluff"]};
F.MIRROR_COST={looks:1,nature:2,body:2,rare:3};
function groupOf(g){for(var k in F.MIRROR)if(F.MIRROR[k].indexOf(g)>=0)return k;return null;}
function relook(c){try{if(SB.Genome&&SB.Genome.look)c.look=SB.Genome.look(c.genome);}catch(e){}}
function setGene(c,g,v){var f=of(c),g0=f.g0||(f.g0={});if(g0[g]==null)g0[g]=gene(c,g);c.genome.genes[g]=Math.round(v*100)/100;}
F.tweak=function(game,c,g,dir){
var grp=groupOf(g);if(!c||c.species!=="smol"||!c.genome||!grp)return{ok:false,msg:""};
var cost=F.MIRROR_COST[grp],rare=grp==="rare"?(Sv().count(c,"crystal",true)?"crystal":Sv().count(c,"mote",true)?"mote":null):null;
if(grp==="rare"&&!rare)return{ok:false,msg:"that one needs a thought crystal or a light mote, and "+cost+" ✨"};
if(!spend(game,cost))return{ok:false,msg:"that costs "+cost+" ✨"};
if(rare)Sv().take(c,rare,1);
var v=gene(c,g),nv=g==="hue"||g==="hue2"?(v+(dir>0?0.08:-0.08)+1)%1:clamp(v+(dir>0?0.1:-0.1),0,1);
setGene(c,g,nv);relook(c);
emit("mirror",{c:c,gene:g,v:c.genome.genes[g]});
return{ok:true,v:c.genome.genes[g],msg:"🪞 "+gname(g)+": "+Math.round(c.genome.genes[g]*100)};
};
F.reroll=function(game,c){
if(!c||c.species!=="smol"||!c.genome)return{ok:false,msg:""};
if(!spend(game,5))return{ok:false,msg:"a new look costs 5 ✨"};
F.MIRROR.looks.forEach(function(g){setGene(c,g,Math.random());});
if(SB.Collect&&SB.Collect.roll){try{var cx=SB.Collect.roll(SB.rng((Math.random()*4294967295)>>>0));c.genome.cx=cx;if(c.cx)c.cx=cx;}catch(e){}}
relook(c);emit("reroll",{c:c});
return{ok:true,msg:"🪞 the water ripples, and a new face looks back"};
};
F.paint=function(game,c){
var k=Sv().count(c,"berry",true)?"berry":Sv().count(c,"cherry",true)?"cherry":null;
if(!c||!c.genome||!k)return{ok:false,msg:"face paint needs berries"};
Sv().take(c,k,1);setGene(c,"hue",(gene(c,"hue")+0.07)%1);relook(c);emit("paint",{c:c});
return{ok:true,msg:"🎨 berry juice, smeared on with great care. a new shade"};
};
var wrapped={};
function swapOut(c){var g0=c&&c.fr&&c.fr.g0,out=null;if(g0&&c.genome&&c.genome.genes){out={};for(var g in g0){out[g]=c.genome.genes[g];c.genome.genes[g]=g0[g];}}return out;}
function swapBack(c,sv){if(sv)for(var g in sv)c.genome.genes[g]=sv[g];}
function wrapOnce(){
if(!wrapped.lay&&SB.Game&&SB.Game.layEgg){
wrapped.lay=1;var lay0=SB.Game.layEgg;
SB.Game.layEgg=function(game,a,b,x,z){var sa=swapOut(a),sb=a===b?null:swapOut(b);try{return lay0.apply(this,arguments);}finally{swapBack(b,sb);swapBack(a,sa);}};
}
if(!wrapped.body&&SB.Body&&SB.Body.pepCap){
wrapped.body=1;var B=SB.Body,cap0=B.pepCap,run0=B.runCost,hm0=B.hungerMul;
B.pepCap=function(c){return cap0.apply(this,arguments)*(F.shortSleep(cur(),c)?0.8:1);};
B.runCost=function(c){return run0.apply(this,arguments)*(c&&c.chem&&c.chem.hunger>0.85?1.6:1);};
B.hungerMul=function(c,game){return hm0.apply(this,arguments)*(F.full(game,c)?0.7:1);};
}
}
F._wrap=wrapOnce;
F.shortSleep=function(game,c){return!!(game&&c&&c.fr&&c.fr.wk!=null&&game.time-c.fr.wk>SB.DAY_LENGTH*1.5);};
F.full=function(game,c){return!!(game&&c&&c.fr&&c.fr.sat>game.time);};
var FILLING={cooked:1,bread:1,meat:1,fish:1,nutmeat:1,honey:1,pumpkin:1,starseed:1};
function damage2(game,c,target,info){
var k=1,ch=(c&&c.chem)||{};
if(F.inspiredAs(game,c)==="fight")k*=1.3;
if((ch.adrenaline||0)>0.5)k*=1.15;else if((ch.anger||0)>0.5)k*=1.1;
if(c&&c._frButt){c._frButt=0;k*=2;}
return k;
}
F.damage2=damage2;
function visit2(game,c){
if(!isSmol(c)||!c.chem)return;
var f=of(c),ch=c.chem,w=game.world,d=day(game),pov=!!c._pov,cnt=0,alone=true,comp=false;
c._frH=ch.hunger;
tribe(game).forEach(function(o){if(o===c)return;var dd=dist(o,c);if(dd<9)cnt++;if(dd<20)alone=false;if(dd<6&&!o.asleep)comp=true;});
if(f.brk&&!c.tantrum&&game.time-f.brk.t>20){f.brk=null;F.mood(game,c,"calm");emit("catharsis",{c:c,blocked:false});}
var hm=homeOf(game,c);
if(f.back&&game.time>f.back){f.back=0;if(!pov)sendTo(c,hm.x+1,hm.z+1,game,40);}
var inside=!!(SB.World.shelterAt&&SB.World.shelterAt(w,c.x,c.z))||!!c.inBed,hb=F.homebody(c);
f["in"]=clamp((f["in"]||0)+(inside!==hb?1:-2),0,60);
if(f["in"]>=40){f["in"]=20;F.mood(game,c,hb?"wantshut":"cooped");emit("outdoors",{c:c,homebody:hb});}
f.aw=SB.dist(c.x,c.z,hm.x,hm.z)>55&&c.title!=="explorer"&&F.lifestyle(c).id!=="walk"?(f.aw||0)+1:0;
if(f.aw>=15){f.aw=0;F.mood(game,c,"homesick");if(!pov&&!F.following(game,c)&&(!SB.Social||!SB.Social.free||SB.Social.free(c)))sendTo(c,hm.x+1,hm.z+1,game,40);emit("homesick",{c:c});}
if(cnt>=8&&gene(c,"sociability")<0.6&&F.fameQuirk(game,c)!=="crowd")F.mood(game,c,"crowded");
else if(alone&&!w.night&&gene(c,"sociability")<0.35)F.mood(game,c,"peace");
if(F.expect(game).lvl===2&&(ch.hunger>0.5||(w.night&&!inside)))F.mood(game,c,"wants");
var need=F.stageNeed(game,c),sn=F.stageName(c);
if(!need.ok){if(c.stage===1)ch.bored=Math.min(1,ch.bored+0.01);else if(c.stage===4||c.stage===0)ch.lonely=Math.min(1,ch.lonely+0.01);}
if(sn==="youth")ch.bored=Math.min(1,ch.bored+0.004);else if(sn==="ancient")ch.sleepy=Math.min(1,(ch.sleepy||0)+0.004);
if(c.tier>=5&&!pov)ch.hunger=Math.min(1,ch.hunger+0.004);
var se=w.season||0;
if(se>=2)f.coat=Math.min(1,(f.coat||0)+0.01+gene(c,"fluff")*0.02);
if((f.coat||0)>0.5){
if(se>=2&&ch.cold>0)ch.cold=Math.max(0,ch.cold-0.05);
if(se===0&&!pov){f.coat=0;if(Sv().spawn&&K().fluff)Sv().spawn(game,"fluff",1,c.x+0.3,c.z+0.3);diary(game,c,"☁","shed my winter coat");emit("shed",{c:c});}
}else if(se===1)f.coat=0;
var fe=F.fearOf(game,c);
if(!fe.faced&&(f.ft||0)<game.time&&inFear(game,c,fe.id,alone)){f.ft=game.time+60;F.faceFear(game,c,fe.id==="alone"?F.moodScore(game,c)>0:comp);}
if(believer(c)&&w.night){if(F.wayOn(game,"night"))ch.fear=Math.max(0,ch.fear-0.05);if(F.wayOn(game,"fire")&&SB.World.nearestFire&&SB.World.nearestFire(w,c.x,c.z,8))F.mood(game,c,"way");}
var p=c.partner!=null?byId(game,c.partner):null;
if(isSmol(p)&&dist(c,p)<12){var cm=F.coupleMood(game,c,p);if(cm==="cosy")F.mood(game,c,"cosy");else if(cm==="bickering")F.mood(game,c,"bicker");}
if(c.stage<=2){
var np=null,nd=10;carers(game,c).forEach(function(o){var dd=dist(o,c);if(dd<nd){nd=dd;np=o;}});
if(np){
var bond=F.familyBond(game,c,np),lv=F.parenting(np)+(np.fr&&np.fr.late&&np.fr.late.grey?1:0)+(np.title==="wise"?1:0);
if(bond==="close")ch.lonely=Math.max(0,ch.lonely-0.03);else if(bond==="distant")ch.lonely=Math.min(1,ch.lonely+0.01);else if(bond==="strict"&&SB.Orders&&SB.Orders.addTrust)SB.Orders.addTrust(c,0.002);
if(lv&&ch.fear>0.2)ch.fear=Math.max(0,ch.fear-0.05*lv);
}
}
if((c.title==="grump-chaser"||f.hon==="shield")&&ch.fear>0)ch.fear=Math.max(0,ch.fear-0.1);
if(c.title==="kind"&&f.kd2!==d){f.kd2=d;F.addCont(c,3);}
if(f.hon==="fire"&&ch.cold>0)ch.cold=Math.max(0,ch.cold-0.1);
if(f.late&&f.late.spurt&&ch.pain>0)ch.pain=Math.max(0,ch.pain-0.05);
if(ch.fear>0.6)ch.bored*=0.85;
if((ch.fear>0.93||ch.anger>0.96)&&(f.fa||0)<game.time&&!pov){
f.fa=game.time+120;c.tantrum=null;F.mood(game,c,"faint");speak(c,"…oh.",2);
if(SB.Creature&&SB.Creature.startAction){try{SB.Creature.startAction(c,game,SB.V.idle,null);if(c.action)c.action.dur=8;}catch(e){}}
diary(game,c,"💫","fainted clean away");emit("fainted",{c:c});
}
if(f.tone==="hard"){ch.sleepy=Math.min(1,(ch.sleepy||0)+0.01);ch.anger=Math.min(1,(ch.anger||0)+0.004);}else if(f.tone==="easy")F.mood(game,c,"easy");
if(w.night&&F.hiddenId(game,c)==="owl")ch.sleepy=Math.max(0,(ch.sleepy||0)-0.02);
if(w.night&&F.variant(c)==="firefly"&&SB.World.nearestFire&&SB.World.nearestFire(w,c.x,c.z,6))ch.hunger=Math.max(0,ch.hunger-0.02);
var mg=F.mourning(game);if(mg&&SB.dist(c.x,c.z,mg.x,mg.z)<8)F.mood(game,c,"quiet");
var ct=F.cont(c);if(ct!==50&&f.cdr!==d){f.cdr=d;f.cont=ct+(ct>50?-3:3);}
if(ct<=15&&(f.rk||0)<game.time&&!pov&&c.stage>=1){f.rk=game.time+600;F.breakdown(game,c,"rock");f.cont=30;}
youngCheck(game,c);life2Check(game,c);
}
F.visit2=visit2;
F.expect=function(game){var era=SB.Civ&&SB.Civ.era?SB.Civ.era(game):0,lvl=era<=1?0:era<=3?1:2;return{lvl:lvl,text:["happy with little","used to a few comforts","expects a roof, a full pot and a lit street"][lvl]};};
var beachC={seed:null,v:null};
function beachSpot(game){
if(beachC.seed===game.seed)return beachC.v;
var n=game.world.T&&game.world.T.nest,v=null,W=SB.World;
if(n&&W.biomeAt&&SB.B&&SB.B.beach!=null)for(var r=15;r<=75&&!v;r+=10)for(var a=0;a<12&&!v;a++){var x=n.x+Math.cos(a*0.5236)*r,z=n.z+Math.sin(a*0.5236)*r;if(W.biomeAt(game.world,x,z)===SB.B.beach&&(!W.walkable||W.walkable(game.world,x,z)))v={x:x,z:z};}
beachC={seed:game.seed,v:v};
return v;
}
F.beachDay=function(game){
var sp=beachSpot(game),n=0;if(!sp)return null;
tribe(game).forEach(function(c){if(n>=4||!awake(c)||c.plan||F.following(game,c))return;sendTo(c,sp.x+n*0.8,sp.z+(n%2),game,60);F.mood(game,c,"beach");n++;});
if(n){emit("beachDay",{n:n,x:sp.x,z:sp.z});}
return n?{n:n}:null;
};
F.matchmaker=function(game){
var S=SB.Social,el=tribe(game).filter(function(c){return c.stage===4&&gene(c,"sociability")>0.45;})[0];if(!S||!el)return null;
var ad=tribe(game).filter(function(c){return c.stage===3&&!S.partnerOf(game,c);}),best=null,bv=-1e9;
for(var i=0;i<ad.length;i++)for(var j=i+1;j<ad.length;j++){if(!S.eligible(game,ad[i],ad[j]))continue;var v=F.fits(game,ad[i],ad[j])+F.fits(game,ad[j],ad[i])+(F.signsFit(game,ad[i],ad[j])?1:0)+opinion(game,ad[i],ad[j])/50;if(v>bv){bv=v;best=[ad[i],ad[j]];}}
if(!best)return null;
var s=st(game),md=s.md;s.md=null;var r=F.match(game,best[0],best[1]);s.md=md;
if(!r.ok)return null;
chron(game,"💘","old "+el.name+" has been matchmaking: "+best[0].name+" and "+best[1].name);
emit("matchmaker",{el:el,a:best[0],b:best[1]});
return{el:el,a:best[0],b:best[1]};
};
function tsk(game,a,b){
var el=null;tribe(game).forEach(function(o){if(!el&&o!==a&&o!==b&&o.stage===4&&!o.asleep&&gene(o,"grumpiness")>0.6&&dist(o,a)<12)el=o;});
if(!el)return null;
speak(el,"tsk! not out here!",2.6);emote(el,"angry",1.6);F.mood(game,a,"told");F.mood(game,b,"told");
emit("tsk",{el:el,a:a,b:b});
return el;
}
F._tsk=tsk;
function kiss(game,a,b){[a,b].forEach(function(c){if(isSmol(c)){speak(c,"mwah!",1.6);fx("hearts",c,5);F.mood(game,c,"kissed");}});sound("chime",0.4);emit("kiss",{a:a,b:b});if(isSmol(a)&&isSmol(b))tsk(game,a,b);}
F.AMB=["feel","hobby","pebbles","visit","kick","fan","multi","favour","invite","debate","show","beach"];
F.ambient2=function(game,force){
var list=tribe(game).filter(function(c){return awake(c);});if(!list.length)return null;
var k=force||F.AMB[Math.floor(Math.random()*F.AMB.length)],c=list[Math.floor(Math.random()*list.length)],o=null,m=me();
if(k==="feel"){c=list.filter(function(x){var e=F.emotion(game,x);return e&&e.lvl>=2&&F.FEELS[e.id];})[0];if(!c)return null;if(c.tier>=5&&F.emotion(game,c).id!=="happy")F.calm(game,c);else F.act(game,c);}
else if(k==="hobby")F.doHobby(game,c);
else if(k==="pebbles"){var bd=15;list.forEach(function(x){if(x!==c){var dd=dist(x,c);if(dd<bd){bd=dd;o=x;}}});if(!o)return null;F.pebbles(game,c,o,false);}
else if(k==="visit"){list.sort(function(a,b){return(b.chem?b.chem.lonely:0)-(a.chem?a.chem.lonely:0);});if(!F.visitFriend(game,list[0]))return null;}
else if(k==="kick"){if(!F.kickabout(game))return null;}
else if(k==="fan"){var star=list.filter(function(x){return F.rank(x)>=3;})[0],kid=list.filter(function(x){return x.stage<=2&&x!==star;})[0];if(!star||!kid)return null;sendTo(kid,star.x+0.8,star.z+0.6,game,20);speak(kid,"wow! it's "+star.name+"!",2.4);emit("fan",{kid:kid,star:star});}
else if(k==="multi"){
var eater=list.filter(function(x){return x.action&&SB.V&&x.action.verb===SB.V.eat;})[0];
if(eater)list.forEach(function(x){if(!o&&x!==eater&&dist(x,eater)<3.5)o=x;});
if(eater&&o){chat(game,eater,o);speak(eater,"mm. nice day",2);emit("multitask",{a:eater,b:o,how:"eating"});}
else{var fol=m?F.followers(game)[0]:null;if(!fol)return null;speak(fol,F.line(game,fol),2.4);emit("multitask",{a:fol,b:m,how:"walking"});}
}
else if(k==="favour"){
c=list.filter(function(x){return x.chem&&x.chem.hunger>0.6&&F.renown(x)>=5;})[0];if(!c)return null;
list.forEach(function(x){if(!o&&x!==c&&dist(x,c)<14&&opinion(game,x,c)>=15)o=x;});if(!o)return null;
c.chem.hunger=Math.max(0,c.chem.hunger-0.25);of(c).ren=Math.max(0,F.renown(c)-1);speak(o,"for you, "+c.name,2);diary(game,o,"🤝","did "+c.name+" a favour");emit("favour",{c:c,by:o});
}
else if(k==="invite"){if(!F.invite(game))return null;}
else if(k==="debate"){if(!F.debate(game)&&!F.termWork(game))return null;}
else if(k==="show"){var kd=list.filter(function(x){return x.stage===1&&carers(game,x).some(function(p){return dist(p,x)<12;});})[0];if(!kd)return null;of(kd).show=(of(kd).show||0)+1;speak(kd,"look! look!",2);emit("showOff",{kid:kd});}
else if(k==="beach"){if((game.world.season||0)!==1||game.world.night||!F.beachDay(game))return null;}
return k;
};
function trespass(game,m){
var w=game.world,s=st(game),d=day(game),hit=null;if(!w.night||!m)return null;
tribe(game).forEach(function(o){
if(hit||o===m||!o.asleep||dist(o,m)>2.2||!(SB.World.shelterAt&&SB.World.shelterAt(w,o.x,o.z)))return;
if(F.hearts(game,o)>=3||o.partner===m.id||kin(game,o,m)||s.tres===d+":"+o.id)return;
hit=o;
});
if(!hit)return null;
s.tres=d+":"+hit.id;hit.asleep=false;hit.inBed=false;speak(hit,"out! my hut!",2.4);emote(hit,"angry",2);F.add(game,hit,-5);
tell(game,"🚪 "+hit.name+" wakes, and shoos you out of its hut");
emit("trespass",{c:hit,by:m});
return hit;
}
F._trespass=trespass;
var t2=0,famT=12,ambT=35,slow2=2;
function tick2(game,dt){
if(!game||quiet(game))return;
wrapOnce();
if((t2-=dt)>0)return;
var step=0.5-t2;t2=0.5;
tagTick(game);meetTick(game);
var s=st(game),m=me();
if(m){
var S=SB.Possess&&SB.Possess.state?SB.Possess.state():null;
if(S&&typeof S.stam==="number"&&S.stam<0.03&&(m._frFlop||0)<game.time){m._frFlop=game.time+60;F.mood(game,m,"flop");if(m.chem)m.chem.tired=Math.min(1,(m.chem.tired||0)+0.1);tell(game,"😮‍💨 you run clean out of puff and flop down. sit a moment");emit("flop",{c:m});}
if((slow2-=step)<=0){slow2=2;trespass(game,m);}
}
if(s.kcAt&&game.time>=s.kcAt){s.kcAt=0;if(!story(game))F.kidCircle(game);}
if(s.trAt&&game.time>=s.trAt){s.trAt=0;F.trial(game);}
if(story(game))return;
if((famT-=step)<=0){famT=15;F.familyTick(game);}
if((ambT-=step)<=0){ambT=40+Math.random()*40;F.ambient2(game);}
}
F.tick2=tick2;
var tick0=F.tick;F.tick=function(game,dt){tick0(game,dt);tick2(game,dt);};
var visit0=F.visit;F.visit=function(game,c){visit0(game,c);visit2(game,c);};
function dawn2(){
var game=cur();if(!game||quiet(game))return;
var s=s2(game),d=day(game),m=me(),k,one=false;
s.kcAt=Math.round(game.time+SB.DAY_LENGTH*0.1);
for(k in s.cr.g)s.cr.g[k]=Math.max(0,s.cr.g[k]-1);
if(story(game))return;
if(s.trial)s.trAt=Math.round(game.time+SB.DAY_LENGTH*0.2);
if(!s.ways.chop)F.wayCount(game,"tree",2);s.ways.chop=0;
F.growWays(game);
var tot=F.totem(game),n=game.world.T&&game.world.T.nest,totNear=!!(tot&&n&&game.world.items.some(function(o){return o.kind===tot&&SB.dist(o.x,o.z,n.x,n.z)<30;}));
tutorDawn(game);
var list=tribe(game);
list.forEach(function(c){
var f=of(c),rr=s.h[c.id];
if(f.conv!=null){f.conv+=0.34;if(f.conv>=1){delete f.conv;if(s.ways.on.length){chron(game,"🧭",c.name+" has taken up the tribe's ways");F.mood(game,c,"way");}emit("converted",{c:c});}}
else if(totNear)F.mood(game,c,"totem");
var sw=f.sw;if(sw&&sw.n>0&&sw.d<d-1){if(sw.n>=4){F.mood(game,c,"nohoney");emit("withdrawal",{c:c});}sw.n=Math.max(0,sw.n-1);}
if(rr&&rr.slip){
var sk=rr.slip,t=F.taste(game,c,sk);rr.slip=null;rr.k[sk]=t;Sv().add(c,sk,1);
if(t>0){F.add(game,c,Math.round(F.PTS[String(t)]*1.5));F.mood(game,c,"surprise");note(game,c,"you left me a surprise");}
emit("slipFound",{c:c,kind:sk,taste:t});
if(m)tell(game,"🎁 "+c.name+" found the "+label(sk)+" in its pouch"+(t>0?", and beams":t<0?", and pulls a face":""));
}
if((f.late&&f.late.glow)||(c.title==="inventor"&&dice(game,"inv:"+c.id+":"+d)()<0.3))c.inspired=Math.max(c.inspired||0,60);
if(F.cont(c)>=80&&c.tier>=2)F.inspire(game,c);
if(!c._pov&&Sv().spawn){
if(F.lucky(game,c)&&dice(game,"lk:"+c.id+":"+d)()<0.2&&K().berry){Sv().spawn(game,"berry",1,c.x+0.4,c.z+0.3);emit("luckyFind",{c:c});}
if(F.hiddenId(game,c)==="thumb"&&dice(game,"th:"+c.id+":"+d)()<0.15&&K().seed)Sv().spawn(game,"seed",1,c.x+0.4,c.z-0.3);
var q=F.fameQuirk(game,c);if(q==="pebbles"&&K().stone&&dice(game,"pb:"+c.id+":"+d)()<0.3)Sv().spawn(game,"stone",1,c.x-0.4,c.z+0.3);else if(q==="mornings"&&c.chem)c.chem.anger=Math.min(1,(c.chem.anger||0)+0.1);
}
if(F.wayOn(game,"scar")&&believer(c)){var sc=SB.Powers&&SB.Powers.scars?SB.Powers.scars(c):0;if(sc>(f.sc||0)){F.addRenown(game,c,sc-(f.sc||0),"a scar");f.sc=sc;}}
if(F.rank(c)>=3&&c.chem)c.chem.hunger=Math.max(0,c.chem.hunger-0.2);
if(!one&&c.stage>=3&&d%5===0&&F.selfDiscover(game,c))one=true;
});
var L=F.leader(game);
if(L){
if(d%3===0)F.speech(game);
if(!s.dem&&d%3===1){var want=["cooked","honey","bread","fish"].filter(function(x){return K()[x];});s.dem={k:pickOf(want,dice(game,"dem:"+d)()),d:d};emit("demand",{c:L,kind:s.dem.k});}
else if(s.dem&&d-s.dem.d>=2){F.mood(game,L,"wants");s.dem=null;}
}else s.dem=null;
if(d%2===0)F.matchmaker(game);
var wr=list.filter(function(c){return c.job==="scribe"||c.tier>=5;})[0];if(wr&&dice(game,"wr:"+d)()<0.35)F.writeTale(game,wr);
if(s.pen.length&&dice(game,"pen:"+d)()<0.25){
var nm=pickOf(s.pen,dice(game,"penn:"+d)()),pool=F.BACK.filter(function(x){return K()[x];}),pk=pickOf(pool,dice(game,"penk:"+d)()),run=list.filter(function(c){return c!==m&&awake(c)&&c.stage>=2;})[0];
F.courier(game,run||null,pk,nm);tell(game,"✉ "+nm+", far away now, sent you "+label(pk)+(run&&m?". "+run.name+" is bringing it":""));
}
var fer=F.feral(game);
if(fer&&d-((fer.fr&&fer.fr.fd)||d)>=3){fer.stranger.state="leaving";fer.stranger.t=game.time;emit("feralLeft",{c:fer});}
else if(!fer&&d>=3&&d%6===3&&list.length>=3)F.spawnFeral(game);
}
F._dawn2=dawn2;
function dusk2(){
var game=cur();if(!game||quiet(game)||story(game))return;
F.homework(game);F.startEve(game);
var t=F.teacher(game),I=SB.Ideas;
if(t&&I&&I.teach){var ad=tribe(game).filter(function(c){return c!==t&&c.stage>=3&&awake(c)&&dist(c,t)<20;})[0];if(ad){try{withDice(game,"class",function(){I.teach(t,ad,game);});}catch(e){}emit("eveningClass",{t:t,c:ad});}}
}
F._dusk2=dusk2;
var ARMS={club:1,spear:1,sword:1,blade:1,pokestick:1};
var gift0=F.gift;
F.gift=function(game,to,kind,by,item){
var hungry=!!to&&(to._frH||0)>0.6,crave=isSmol(to)&&F.sweet(to).crave&&kind==="honey";
var res=gift0(game,to,kind,by);if(!res)return res;
var s=s2(game),d=K()[kind]||{},extra=0,bits=[];
var q=item&&item.data?(item.data.q!=null?item.data.q:SB.Fight&&SB.Fight.qualOf&&item.data.w!=null?SB.Fight.qualOf({w:item.data.w}):1):1;
if(res.counted&&res.taste>0&&q>1){extra+=Math.round(F.PTS[String(res.taste)]*0.25*(q-1));bits.push("finely made");}
if(crave){extra+=30;bits.push("just what it was craving");}
var L=F.leader(game);
if(s.dem&&L===to&&s.dem.k===kind){extra+=40;s.dem=null;F.mood(game,to,"liked");if(by)F.addRenown(game,by,1,"fed the leader");bits.push("what the leader asked for");emit("demandMet",{c:to,by:by||null,kind:kind});}
if(by&&d.food&&hungry){F.mood(game,by,"charity");bits.push("it was hungry: a kindness");emit("charity",{by:by,to:to});}
if(by&&ARMS[kind]&&F.following(game,to)){of(to).arm=kind;bits.push("it will carry it into a fight");emit("armed",{c:to,kind:kind});}
if(kind==="posy"&&F.hasMood(game,to,"jinx")){of(to).m=(of(to).m||[]).filter(function(x){return x[0]!=="jinx";});bits.push("the jinx lifts");}
if(F.wayOn(game,"share")&&by&&res.taste>=0)extra+=5;
if(by&&s.cr.arr&&s.cr.arr.by===to.id&&res.taste>=0){var tr=to.tribe||0;s.cr.arr=null;s.cr.g[tr]=Math.max(0,(s.cr.g[tr]||0)-1);bits.push("and it lets the other thing drop");emit("crimeEnd",{how:"bribe"});}
if(by)lived(by,"give");
if(extra){var g=F.add(game,to,extra);res.pts+=g;}
if(bits.length||extra)res.msg+=" · "+bits.join(", ")+(extra?(bits.length?" ":"")+"+"+extra:"");
return res;
};
var taste0=F.taste;
F.taste=function(game,c,kind){
var t=taste0(game,c,kind);
if(kind==="fish"&&t<1&&game&&F.wayOn(game,"sea"))t=1;
if(kind==="honey"&&c&&c.fr&&c.fr.sw&&c.fr.sw.n>=4)t=2;
return t;
};
var willing0=F.willing;
F.willing=function(game,by,c,need){
if(c&&(c._frYes||0)>game.time)return true;
if(by&&c&&need>0&&F.grudge(game,c)>0)return false;
if(by&&F.rank(by)>=2)need=Math.max(0,need-1);
return willing0(game,by,c,need);
};
var fights0=F.fights;
F.fights=function(game,c){if(st(game).hold)return false;return fights0(game,c)||(F.following(game,c)&&c.fr&&c.fr.hon==="shield"&&F.hearts(game,c)>=3);};
F.holdFire=function(game){var s=st(game);s.hold=s.hold?0:1;emit("holdFire",{on:!!s.hold});return{ok:true,on:!!s.hold,msg:s.hold?"✋ “leave it!” your friends won't fight until you say":"⚔ your friends will stand with you again"};};
F.NEED.visit=2;F.NEED.gather=3;
var command0=F.command;
F.command=function(game,by,c,cmd,arg){
if(cmd!=="visit"&&cmd!=="gather")return command0(game,by,c,cmd,arg);
if(!game||!by||!isSmol(c)||c===by)return{ok:false,msg:"nobody to ask"};
if(c.asleep)return{ok:false,msg:"💤 "+c.name+" is asleep"};
if(!F.willing(game,by,c,F.NEED[cmd])){speak(c,"hm?",1.6);return{ok:false,msg:c.name+" doesn't know you well enough for that ("+F.NEED[cmd]+" ♥)"};}
if(cmd==="visit"){var b=F.visitFriend(game,c);emit("friendCommand",{c:c,by:by,cmd:cmd});return b?{ok:true,msg:"👋 "+c.name+" goes to see "+b.name}:{ok:false,msg:c.name+" has no friend to go and see yet"};}
var r=command0(game,by,c,"get",arg);
if(r.ok){st(game).gat={id:c.id,k:arg,n:4};r.msg="🧺 "+c.name+", gather "+label(arg)+"! it will keep at it";}
return r;
};
var line0=F.line;
F.line=function(game,c){
var l=line0(game,c),m=me();
if(m&&m!==c&&Math.random()<0.3){var v=F.variant(m),p=m.tier===0?"aw. little blob. ":m.tier>=6?"ooh. shiny one. ":m.stage<=1?"hello, little one. ":m.stage===4?"old one! ":v?"ooh, a "+v+". ":m.fr&&m.fr.wild?"wild one! ":"";l=p+l;}
return l;
};
var talk0=F.talk;
F.talk=function(game,by,to){
var res=talk0(game,by,to);
if(res&&res.first&&by){var b=F.rank(by)*5+(F.hasMood(game,by,"charity")?10:0);if(b){var g=F.add(game,to,b);res.pts+=g;res.msg+=" · +"+g+" (it has heard of you)";}}
return res;
};
var match0=F.match;
F.match=function(game,a,b){
if(isSmol(a)&&isSmol(b)&&!F.matchWhy(game,a,b)){
var fem=a.sex==="f"?a:b.sex==="f"?b:null,him=fem===a?b:a;
if(fem&&him.sex!=="f"&&F.fits(game,fem,him)<0&&opinion(game,fem,him)<10){speak(fem,"him? no.",2);emit("refused",{a:fem,b:him});return{ok:false,refused:true,msg:"🙅 "+fem.name+" isn't interested: "+him.name+" is "+F.FANCY[F.fancy(game,fem).off][1]+", and that puts her off"};}
}
return match0(game,a,b);
};
var hooked2=false;
F.hook2=function(){
if(hooked2||!SB.bus)return;hooked2=true;
var on=SB.bus.on;
function g(){var game=cur();return game&&!quiet(game)?game:null;}
on("dawn",dawn2);on("dusk",dusk2);
on("tantrum",onTantrum);
on("inspired",function(d){var game=g();if(game&&d&&isSmol(d.c))F.inspire(game,d.c);});
on("eat",ate);
on("povEat",function(d){var game=g();if(game&&d&&d.c&&FILLING[d.kind])of(d.c).sat=Math.round(game.time+240);});
on("possess",function(d){var game=cur();if(game&&d&&d.c&&d.c.species==="smol"&&of(d.c).wk==null)of(d.c).wk=Math.round(game.time);});
function rested(d){var game=cur();if(game&&d&&d.c&&d.c.fr)d.c.fr.wk=Math.round(game.time);}
on("cosy",rested);on("povSafeNight",rested);
on("craft",function(d){var game=g();if(game&&d&&isSmol(d.c)&&F.inspiredAs(game,d.c)==="craft"){sparks(game,1,d.c);F.addCont(d.c,5);emit("fineWork",{c:d.c});}});
on("fireFed",function(){var game=g();if(game)F.wayCount(game,"fire");});
on("fireLit",function(){var game=g();if(game)F.wayCount(game,"fire",2);});
on("chop",function(d){
var game=g(),c=d&&d.c;if(!game||!c||c.species!=="smol")return;
s2(game).ways.chop=(s2(game).ways.chop||0)+1;
if(F.wayOn(game,"tree")&&isSmol(c)&&believer(c))F.mood(game,c,"waysad");
if(c.fr&&c.fr.tone==="hard"&&!c._pov&&Math.random()<0.3&&Sv().spawn&&K().stick)Sv().spawn(game,"stick",1,c.x+0.4,c.z+0.4);
});
on("give",function(d){
var game=g(),c=d&&d.c,to=d&&d.to;if(!game||!c||!to||!d.item)return;
var def=K()[d.item.kind]||{};
if(to.stranger){
if(to.stranger.state==="feral"){var r=F.tame(game,to,"food");if(c._pov&&r.msg)tell(game,r.msg);}
else if(c._pov&&def.food){F.mood(game,c,"charity");var s=s2(game);if(s.pen.indexOf(to.name)<0){s.pen.push(to.name);if(s.pen.length>5)s.pen.shift();}emit("charity",{by:c,to:to});}
return;
}
if(to.species==="smol"&&!c._pov){F.wayCount(game,"share");if(F.wayOn(game,"share"))remember(game,to,c,"shared",4,"shares, as we do",2400,12);lived(c,"give");}
});
on("grumpChased",function(d){
var game=g(),c=d&&d.c;if(!game||!c||c.species!=="smol")return;
F.wayCount(game,"bold",2);F.addRenown(game,c,F.wayOn(game,"bold")?6:3,"chased a grump");lived(c,"hit",3);
if(F.wayOn(game,"bold"))tribe(game).forEach(function(o){if(believer(o)&&dist(o,c)<20)F.mood(game,o,"way");});
});
on("fish",function(d){
var game=g(),c=d&&d.c;if(!game||!c||c.species!=="smol")return;
F.wayCount(game,"sea");
if(!c._pov&&Sv().spawn&&K().fish&&((c.fr&&c.fr.tone==="hard"&&Math.random()<0.3)||(F.hiddenId(game,c)==="sealegs"&&Math.random()<0.25)))Sv().spawn(game,"fish",1,c.x+0.4,c.z+0.4);
});
on("teach",function(d){
var game=g(),t=d&&d.c,k=d&&d.student;if(!game||!t||t.species!=="smol")return;
F.wayCount(game,"lore");F.addRenown(game,t,0.2,"teaching");lived(t,"teach");
if(F.wayOn(game,"lore"))F.addCont(t,3);
if(k&&d.id&&SB.Ideas){var lv=((k.parents||[]).indexOf(t.id)>=0||(k.fr&&k.fr.ward===t.id)?F.parenting(t):0)+(t.title==="teacher"?1:0)+(t.fr&&t.fr.late&&t.fr.late.grey?1:0);if(lv){try{SB.Ideas.learn(k,d.id,0.08*lv,game,"taught");}catch(e){}emit("taughtWell",{t:t,k:k,lv:lv});}}
});
on("wound",function(d){var game=g();if(game&&d&&d.c&&d.c.species==="smol")F.wayCount(game,"scar",2);});
on("tickle",function(d){
var game=g(),c=d&&d.c;if(!game||!c)return;
if(c.stranger&&c.stranger.state==="feral"){var r=F.tame(game,c,"tickle");toast(game,r.msg,c);return;}
if(isSmol(c)){lived(c,"tickle");if(F.hasMood(game,c,"jinx")){c.fr.m=c.fr.m.filter(function(x){return x[0]!=="jinx";});emit("jinxLifted",{c:c});}}
});
on("hit",function(d){
var game=g(),c=d&&d.c,t=d&&d.target;if(!game||!c||c.species!=="smol")return;
lived(c,"hit");
if(t&&t.species==="grump"&&t.alive&&c.fr&&c.fr.arm&&F.fights(game,c)){var need=SB.Threats&&SB.Threats.whacksNeeded?SB.Threats.whacksNeeded(t):3;t.whacked=Math.min(Math.max(t.whacked||0,need-0.5),(t.whacked||0)+0.25);}
});
on("prank",function(d){if(d&&d.a)lived(d.a,"prank",2);});
on("convo",function(d){
var game=g(),a=d&&d.a,b=d&&d.b;if(!game||!isSmol(a)||!isSmol(b))return;
if(F.signsFit(game,a,b)){remember(game,a,b,"stars",2,"our stars agree",2400,8);remember(game,b,a,"stars",2,"our stars agree",2400,8);}
[[a,b],[b,a]].forEach(function(p){
if(F.beauty(p[0])>0.62)remember(game,p[1],p[0],"pretty",3,"is so fluffy",2400,9);
if(p[0].title==="wordsmith"||(p[0].fr&&p[0].fr.hon==="voice"))remember(game,p[1],p[0],"talker",3,"is a treat to talk to",2400,9);
});
if(Math.random()<0.25){var w=learnAWord(game,a,b,0.5);if(w){speak(a,"tip: "+w+"!",2);emit("advice",{a:a,b:b,word:w});}}
var m=me(),s=st(game);
if(m&&m!==a&&m!==b&&dist(a,m)<9&&game.time-(s.ovT||-999)>120){
var r=rec(game,a),pool=Object.keys(K()).filter(function(k){return r.k[k]==null&&K()[k].noun!=="critter"&&k!=="egg"&&F.taste(game,a,k)===2;});
if(pool.length){var k=pickOf(pool,dice(game,"ov:"+a.id+":"+day(game))());r.k[k]=2;s.ovT=Math.round(game.time);tell(game,"👂 you overhear "+a.name+" tell "+b.name+": “me love "+label(k)+"”");emit("overheard",{a:a,b:b,kind:k});}
}
});
on("title",function(d){var game=g();if(game&&d&&d.c)F.addRenown(game,d.c,3,"a title");});
on("lifeWish",function(d){var game=g();if(game&&d&&d.c){F.addRenown(game,d.c,3,"a life wish");of(d.c).boon=d.wish?d.wish.focus:"friend";F.addCont(d.c,40);}});
on("wishGranted",function(d){if(d&&d.c)F.addCont(d.c,25);});
on("gift",function(d){if(d&&d.to&&d.taste)F.addCont(d.to,d.taste*5);});
on("wedding",function(d){var game=g();if(game&&d){F.addRenown(game,d.a,1,"wed");F.addRenown(game,d.b,1,"wed");}});
on("festJoin",function(d){var game=g();if(game&&d&&d.c&&d.grade===2)F.addRenown(game,d.c,2,"the festival");});
on("lieCaught",function(d){var game=g();if(game&&d&&d.liar)F.addRenown(game,d.liar,-3,"a lie");});
on("theft",function(d){
var game=g(),c=d&&d.c;if(!game||!c||c.species!=="smol"||d.meant===false)return;
F.addRenown(game,c,-2,"a theft");
var s=st(game);if(!c._pov&&!s.trial&&((c.stats&&c.stats.thefts)||0)>=3){s.trial={c:c.id};emit("trialCalled",{c:c});}
});
function povCrime(d){
var game=g(),c=d&&d.c;if(!game||!c)return;
if(isSmol(c)&&d.l!==undefined)F.mood(game,c,"jinx");
if(!c._pov)return;
var gd=d.guard||null;if(!gd){var bd=20;tribe(game).forEach(function(o){if(o!==c&&o.stage>=3&&!o.asleep){var dd=dist(o,c);if(dd<bd){bd=dd;gd=o;}}});}
F.crime(game,c,null,gd,null);
}
on("tabooBroken",povCrime);on("lawBroken",povCrime);
on("strangerJoined",function(d){
var game=g(),c=d&&d.c;if(!game||!c)return;
var f=of(c),n=0,kinTo=null;f.conv=0;
tribe(game).forEach(function(o){if(o===c||n>=3||!awake(o)||dist(o,c)>40)return;n++;sendTo(o,c.x+Math.sin(n*2)*1.5,c.z+Math.cos(n*2)*1.5,game,20);speak(o,"welcome!",2.2);remember(game,c,o,"welcomed",6,"welcomed me in",4000,18);});
if(Sv().spawn)Sv().spawn(game,K().cooked?"cooked":"berry",F.wayOn(game,"share")?3:2,c.x+0.5,c.z+0.5);
F.mood(game,c,"welcome");
if(dice(game,"cousin:"+c.id)()<0.25){var ad=tribe(game).filter(function(o){return o!==c&&o.stage>=3;});if(ad.length){kinTo=pickOf(ad,dice(game,"cousinw:"+c.id)());f.kin2=kinTo.name;remember(game,c,kinTo,"cousin",12,"a cousin, found again",9000,30);remember(game,kinTo,c,"cousin",12,"a cousin, found again",9000,30);chron(game,"🧬",c.name+" turns out to be "+kinTo.name+"'s long-lost cousin");}}
emit("welcomeWagon",{c:c,n:n,cousin:kinTo});
});
on("marketDay",function(){var game=g();if(!game)return;var sg=F.singer(game);if(sg){var r=F.perform(game,sg,"song");emit("busking",{c:sg,n:r?r.n:0,earned:r?r.earned:0});}});
on("festival",function(){
var game=g();if(!game)return;
var sg=F.singer(game),best=null,bv=0,ch=F.champion(game);
if(sg)F.perform(game,sg,"song");
if(SB.Tricks&&SB.Tricks.count)tribe(game).forEach(function(c){var n=SB.Tricks.count(c);if(n>bv){bv=n;best=c;}});
if(best){F.perform(game,best,"trick");F.mood(game,best,"award");emit("trickShow",{c:best,tricks:bv});}
if(ch){speak(ch,"pebble champion! me!",2.6);F.addRenown(game,ch,1,"pebble champion");emit("champion",{c:ch});}
});
on("partners",function(d){var game=g();if(game&&d&&d.a&&d.b)kiss(game,d.a,d.b);});
on("matchMet",function(d){var game=g();if(game&&d&&d.a&&d.b)tsk(game,d.a,d.b);});
on("egg",function(d){
var game=g(),egg=d&&d.obj;if(!game||!isEgg(egg))return;
var ps=(egg.data.parents||[]).map(function(id){return byId(game,id);}).filter(Boolean),gn=egg.data.genome&&egg.data.genome.genes;
if(ps.length===2&&ps[0]!==ps[1])kiss(game,ps[0],ps[1]);
if(ps.length===2&&gn){var from={};["ears","size","fluff","bravery"].forEach(function(k){var v=gn[k]==null?0.5:gn[k],da=Math.abs(v-gene(ps[0],k)),db=Math.abs(v-gene(ps[1],k));from[k]=Math.min(da,db)>0.2?"all its own":da<=db?ps[0].name:ps[1].name;});egg.data.frFrom=from;}
if(!egg.data.frBlend&&dice(game,"twin:"+egg.id)()<0.08)egg.data.fr2=1;
});
on("hatch",function(d){
var game=g(),c=d&&d.c,egg=d&&d.obj,dt=(egg&&egg.data)||{};if(!game||!c||c.species!=="smol")return;
var f=of(c),ps=parentsOf(game,c),s=st(game);
if(dt.frSex==="f"||dt.frSex==="m")c.sex=dt.frSex;
if(dt.frFrom)f.from=dt.frFrom;
if(dt.frGene)f.gift=dt.frGene;
ps.forEach(function(p){of(p).par=(of(p).par||0)+1;if(p.fr.boon&&!f.born)f.born=p.fr.boon;});
if(f.born){f.cont=70;f.luck=Math.min(1,F.luck(game,c)+0.15);}
if(s.soul&&!dt.starter){var so=s.soul;s.soul=null;f.soul=so.n;(so.w||[]).forEach(function(w){try{SB.Creature.learnWord(c,w,3,game);}catch(e){}});F.mood(game,c,"oldsoul");chron(game,"🕯",c.name+" hatched with an old soul: it has "+so.n+"'s way of looking at you");emit("rebirth",{c:c,of:so.n});}
if(dt.fr2&&ps.length===2&&SB.Genome&&SB.Game.smols(game).length<(SB.Game.POP_CAP||36)){
var g2=null;try{g2=SB.Genome.cross(ps[0].genome,ps[1].genome,dice(game,"twin2:"+c.id),null,null);g2.gen=c.genome.gen;}catch(e){}
if(g2){
var tw=withDice(game,"twinborn",function(){return SB.Game.spawnSmol(game,{genome:g2,x:c.x+0.6,z:c.z+0.3,gen:c.gen,parents:(c.parents||[]).slice(),tribe:c.tribe,how:"hatch"});});
if(tw){if(game.creatures.indexOf(tw)<0)game.creatures.push(tw);of(tw).twin=c.id;f.twin=tw.id;remember(game,c,tw,"twin",20,"my twin",99999,30);remember(game,tw,c,"twin",20,"my twin",99999,30);chron(game,"🥚","twins! "+c.name+" and "+tw.name+" came out of one egg");emit("twins",{a:c,b:tw});}
}
}
});
on("death",function(d){
var game=cur(),c=d&&d.c;if(!game||!c||c.species!=="smol"||!c.fr||!c.fr.life||!c.fr.life.done)return;
var w=[];if(c.vocab)for(var k in c.vocab)if(c.vocab[k]>=1&&w.length<3)w.push(k);
st(game).soul={n:c.name,w:w};
});
on("grow",function(d){
var game=g(),c=d&&d.c;if(!game||!c||c.species!=="smol")return;
var f=of(c),l=f.late||(f.late={}),got=null,B=SB.Brain;
if(c.stage===2){if(gene(c,"growth")>0.55){l.spurt=1;got="spurt";}if(B&&B.dream&&c.brain){try{B.dream(c.brain,[{drive:SB.D.bored,noun:SB.N.plant,verb:SB.V.wander,s:0.6}],30,dice(game,"inst:"+c.id));}catch(e){}f.inst="wanderlust";}}
else if(c.stage===4){if(gene(c,"glow")>0.5){l.glow=1;got="glow";}else{l.grey=1;got="grey";}if(B&&B.dream&&c.brain){try{B.dream(c.brain,[{drive:SB.D.lonely,noun:SB.N.smol,verb:SB.V.talk,s:0.6}],30,dice(game,"inst4:"+c.id));}catch(e){}f.inst="storyteller";}}
else if(c.stage===3&&B&&B.dream&&c.brain){try{B.dream(c.brain,[{drive:SB.D.lonely,noun:SB.N.smol,verb:SB.V.cuddle,s:0.5}],20,dice(game,"inst3:"+c.id));}catch(e){}f.inst="nesting";}
if(got||f.inst)emit("lateTrait",{c:c,trait:got,instinct:f.inst||null});
});
on("friendLevel",function(d){var game=g();if(game&&d&&d.level===12&&d.c){var m=me();if(m)addItem(game,m,"starseed",1);else if(Sv().spawn)Sv().spawn(game,"starseed",1,d.c.x+0.5,d.c.z+0.4);emit("starGiven",{c:d.c});}});
on("fetched",function(d){
var game=g(),s=game?st(game):null,gt=s&&s.gat;if(!gt||!d||!d.c||d.c.id!==gt.id)return;
if(--gt.n<=0){s.gat=null;return;}
var r=command0(game,d.by,d.c,"get",gt.k);if(!r.ok)s.gat=null;
});
on("hunt",function(d){
var game=g(),c=d&&d.c,tot=game?F.totem(game):null;if(!game||!c||!tot||d.kind!==tot)return;
tribe(game).forEach(function(o){if(believer(o)&&dist(o,c)<20)F.mood(game,o,"waysad");});
emit("totemHurt",{c:c,kind:tot});
});
on("unpossess",function(){var game=cur();if(game){var s=st(game);s.tag=null;s.inv=null;s.gat=null;}});
};
F.hook2();
wrapOnce();
function options2(game,c,r,o,x){
if(!game||!c)return;
var s=s2(game),ref=r?r.ref:null,ev=F.eve(game);
function run(fn){return function(){var res=fn();if(res&&res.msg)x.say(res.msg);return!!(res&&res.ok);};}
if(r&&r.type==="creature"&&ref&&ref.alive){
if(ref.stranger&&ref.stranger.state==="feral"){o.pick=x.op("hold out a paw to the wild smol",run(function(){return dist(ref,c)>4?{ok:false,msg:"slowly. get closer"}:F.tame(game,ref,"paw");}),null);return;}
if(s.cr.arr&&s.cr.arr.by===ref.id)o.pick=x.op("say sorry to "+ref.name,run(function(){return F.answer(game,c,"sorry");}),null);
else if(s.inv&&s.inv.c===ref.id&&s.inv.until>game.time)o.pick=x.op("yes, "+ref.name+"!",run(function(){return F.accept(game,c);}),null);
return;
}
if(r&&r.type==="item"&&isEgg(ref)){
if(!o.pick||o.pick.locked)o.pick=x.op(ref.data.frSex?"wish for a "+(ref.data.frSex==="f"?"boy":"girl")+" instead":"wish for a girl (1 ✨)",run(function(){return F.eggSex(game,ref);}),null);
var don=F._focus!=null?byId(game,F._focus):null;
var gg=isSmol(don)&&!ref.data.frGene?F.standout(don,ref):null;
if(isSmol(don)&&!ref.data.frGene&&(!o.place||o.place.locked))o.place=x.op(gg?"give it "+don.name+"'s "+gname(gg)+" (3 ✨)":don.name+" has nothing to give this egg",run(function(){return F.geneCopy(game,don,ref);}),null);
return;
}
if(r&&r.type==="struct"&&ref&&ref.done&&ref.kind==="totem"&&(!o.pick||o.pick.locked)){o.pick=x.op("study the carvings",run(function(){return F.studyPole(game,c);}),null);return;}
if(r&&r.type==="water"&&(!o.pick||o.pick.locked)){o.pick=x.op("gaze into the water (a new look, 5 ✨)",run(function(){return F.reroll(game,c);}),null);return;}
if(!r&&x.hk==="callhorn"){o.use=x.op("blow the calling horn",run(function(){return F.horn(game,c);}),null);return;}
if(ev&&!ev.done&&F.atEve(game,c)&&!o.pick&&(!r||r.type==="struct"))o.pick=x.op(F.EVES[ev.k][0]+" "+F.EVES[ev.k][2],run(function(){return F.joinEve(game,c);}),null);
}
F.options2=options2;
F.studyPole=function(game,c){
var B=SB.Body,f=of(c),d=day(game);if(!B||!B.SKILLS||!B.xp)return{ok:false,msg:"the carvings are just carvings"};
if(f.pd===d)return{ok:false,msg:"you've studied the pole today"};
f.pd=d;var sk=pickOf(B.SKILLS,dice(game,"pole:"+d+":"+c.id)());
try{B.xp(c,sk.id,3);}catch(e){}
emit("poleStudied",{c:c,skill:sk.id});
return{ok:true,skill:sk.id,msg:"🗿 you trace the carvings: a little wiser about "+sk.label};
};
var btn0=X.btn;
function btn(attr,val,text,off,go){return btn0(attr,val,text,off,go).replace("data-fr","data-lf");}
function rc(icon,t,small){return"<div class='rc'><span class='big'>"+icon+"</span><div class='t'>"+t+(small?"<small>"+small+"</small>":"")+"</div></div>";}
F._page2="me";F._mir=false;
F.plan=function(game,c){
var s=st(game),w=game.world,e=F.eve(game),kc=s.kc&&s.kc.until>game.time?s.kc:null,kid=c.stage===1||c.stage===2;
var now=c.asleep?"asleep":F.fest(game)?"at the festival":e?"at the fire for "+F.EVES[e.k][1]:kc&&kid?"at the kid circle":w.night?"heading home for the night":kid?"playing":"out and about, "+F.HOBBIES[F.hobby(game,c)].replace(/^\S+ /,"")+" when it can";
var next=w.night?"up at dawn":kid&&s.kcAt?"the kid circle this morning":"the fire at dusk";
return{now:now,next:next};
};
function who(game,c,mine){
var sg=F.sign(game,c),v=F.variant(c),out="";
out+=rc(F.emotion(game,c).icon,"feeling "+esc(F.emotion(game,c).text)+" · mood "+F.moodBar(game,c)+"/100 ("+F.moodWord(F.moodBar(game,c))+")","in smol: “"+esc(F.feel(game,c))+"” · content "+F.cont(c)+"/100 · needs: "+esc(F.stageNeed(game,c).text)+(F.stageNeed(game,c).ok?" ✓":""));
out+=rc(sg.icon,esc(F.stageName(c))+" · born under "+esc(sg.name)+(v?" · a "+esc(v):""),esc(F.lifestyle(c).name+": "+F.lifestyle(c).does)+" · likes "+esc(F.HOBBIES[F.hobby(game,c)])+(F.lucky(game,c)?" · 🍀 born lucky":"")+(c.fr&&c.fr.soul?" · 🕯 an old soul ("+esc(c.fr.soul)+")":"")+(c.fr&&c.fr.twin!=null?" · a twin":"")+(c.fr&&c.fr.wild?" · came in from the wild":""));
out+=rc("🏅",esc(F.rankName(c))+" · renown "+F.renown(c),(c.title?"the "+esc(c.title)+(F.TITLE_DOES[c.title]?": "+esc(F.TITLE_DOES[c.title]):"")+" · ":"")+(c.fr&&c.fr.hon?esc(F.HONOURS[c.fr.hon][1]+": "+F.HONOURS[c.fr.hon][2])+" · ":"")+(F.fameQuirk(game,c)?"famous, and "+esc(F.quirkText(F.fameQuirk(game,c))):"deeds, shows and wishes earn a name")+(c.fr&&c.fr.boon?" · 🌠 fulfilled: its children start life content and lucky":""));
return out;
}
function pageMe(game,c){
var s=s2(game),f=of(c),d=day(game),out="<div class='rlist'>"+who(game,c,true),row="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
var fe=F.fearOf(game,c),y=F.young(game,c),lw=F.lifeOf(game,c),l2=F.life2Of(game,c),wants=[],fw=SB.FirstHour&&SB.FirstHour.wishOf?SB.FirstHour.wishOf(game,c):null;
if(y)wants.push("🪁 "+y.def.t+" ("+y.n+"/"+y.need+")");if(lw)wants.push(lw.def.icon+" "+lw.def.t+" ("+(lw.done?"done":lw.n+"/"+lw.need)+")");if(l2)wants.push("🌠 and then: "+l2.def.t+" ("+l2.n+"/"+l2.need+")");if(fw&&fw.text)wants.push("💭 "+fw.text);
out+=rc("💭","wants and fears",esc(wants.join(" · ")||"no wish just now")+" · fears "+fe.icon+" "+esc(fe.text)+(fe.faced?" (faced)":" ("+fe.n+"/3: be in it with a friend near)"));
var hid=F.hidden(game,c),st2=F.sexTrait(c),bits=[F.TRAITS[F.trait(c)]?F.trait(c):null,hid?F.HIDDEN[hid][1]+" ("+F.HIDDEN[hid][2]+")":null,st2?st2.text:null].concat(F.lateTraits(c)).concat(F.passives(c)).filter(Boolean);
out+=rc("🧬","what you are made of",esc(bits.join(" · ")||"nothing out of the ordinary")+(F.sweet(c).n?" · 🍯 sweet tooth "+F.sweet(c).n+"/4"+(F.sweet(c).crave?": craving honey":""):"")+(F.shortSleep(game,c)?" · 😪 short of sleep: less pep":"")+(F.full(game,c)?" · 🍖 well fed: hunger comes slowly":"")+(c.chem&&c.chem.hunger>0.85?" · too hungry to run far":"")+(f.from?" · "+Object.keys(f.from).map(function(k){return esc(gname(k))+" from "+esc(f.from[k]);}).join(", "):""));
if(c.stage<=2)out+=rc("🐣","growing up · grade "+F.grade(c),F.firsts(game,c).map(function(x){return(x[1]?"✓ ":"· ")+x[0];}).join(" ")+(F.kidSkills(c).length?" · "+F.kidSkills(c).map(function(k){return k.name+" "+k.lvl;}).join(", "):""));
out+="</div><div class='lbl'>do</div>"+row;
var em=F.emotion(game,c),kn=F.knack(c);
if(F.FEELS[em.id])out+=btn("do","feel",F.FEELS[em.id][0]+" "+F.FEELS[em.id][1]);
out+=btn("do","calm","😌 sit quietly",f.cd===d)+btn("do","knack",F.KNACKS[kn][0]+" "+F.KNACKS[kn][1],f.kd===d)+btn("do","horn",Sv().count(c,"callhorn",true)?"📯 blow the horn":"📯 make a calling horn (2 sticks, a vine)",!Sv().count(c,"callhorn",true)&&!F.canHorn(c));
if(s.inv&&s.inv.until>game.time&&byId(game,s.inv.c))out+=btn("do","accept","💌 yes, "+esc(byId(game,s.inv.c).name)+"!",false,true);
var ev=F.eve(game);if(ev)out+=btn("do","eve",F.EVES[ev.k][0]+" "+(ev.done?"you've had your turn":F.EVES[ev.k][2]),!!ev.done||!F.atEve(game,c),true);
if(s.kc&&s.kc.until>game.time&&c.stage<=2)out+=btn("do","lesson","🏫 join the lesson",f.ld2===s.kc.d,true);
if(F.mourning(game)&&SB.dist(c.x,c.z,F.mourning(game).x,F.mourning(game).z)<8)out+=btn("do","calm","🪦 sit a while with the old ones",f.cd===d);
out+="</div>";
if(s.cr.arr){var gd=byId(game,s.cr.arr.by);out+="<div class='lbl'>🫣 "+esc(gd?gd.name:"someone")+" is cross with you</div>"+row+btn("ans","back","🙇 give it back",!s.cr.arr.k)+btn("ans","sorry","😔 say sorry")+btn("ans","timeout","🪑 sit out by the hall")+btn("ans","run","🏃 run")+"</div>";}
out+="<div class='lbl'>🪞 the mirror"+(F._mir?" · yours alone: eggs get what you were born with":"")+"</div>"+row+btn("mir","toggle",F._mir?"close":"change how you look, or how you are")+btn("mir","paint","🎨 berry face paint",!Sv().count(c,"berry",true)&&!Sv().count(c,"cherry",true))+"</div>";
if(F._mir)for(var grp in F.MIRROR){
out+="<div class='help'>"+grp+" · "+F.MIRROR_COST[grp]+" ✨ a notch"+(grp==="rare"?", and a crystal or a mote":"")+"</div>"+row;
F.MIRROR[grp].forEach(function(g){out+=btn("dn",g,"−")+"<span class='help' style='min-width:74px;text-align:center'>"+esc(gname(g))+" "+Math.round(gene(c,g)*100)+"</span>"+btn("up",g,"+");});
out+="</div>";
}
return out;
}
function pageThem(game,c){
var f=F.focus0(game,c),s=s2(game),d=day(game),row="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
if(!f)return"<p><b>nobody near.</b> look at a smol and choose “ask”, then come back here.</p>";
var h=F.hearts(game,f),r=rec(game,f),near=dist(f,c)<7,out="<div class='lbl'>"+esc(f.name)+" · "+h+" ♥"+(F.signsFit(game,c,f)?" · ⭐ your stars agree":"")+"</div><div class='rlist'>"+who(game,f,false);
var it=F.interests(game,f),kn=r["int"]||{},fa=F.fancy(game,f),fe=F.fearOf(game,f),hid=F.hidden(game,f),pl=F.plan(game,f),p=f.partner!=null?byId(game,f.partner):null,y=F.young(game,f);
out+=rc("💬","what it cares about",Object.keys(kn).length?Object.keys(kn).map(function(t){return(kn[t]>0?"loves ":kn[t]<0?"bored by ":"fine with ")+F.TOPICS[t].replace(/^\S+ /,"");}).join(" · "):"pick something to talk about and find out"+"",(h>=3?"fears "+fe.icon+" "+esc(fe.text)+(fe.faced?" (faced)":""):"its fear: at 3 ♥")+" · "+(h>=4?"fancies "+esc(F.FANCY[fa.on][1])+", not "+esc(F.FANCY[fa.off][1]):"what it fancies: at 4 ♥")+" · "+(hid?esc(F.HIDDEN[hid][1]+": "+F.HIDDEN[hid][2]):"something hidden: at 6 ♥"));
out+=rc("🗓","now: "+esc(pl.now),"next: "+esc(pl.next)+(f.fr&&f.fr.tone?" · told to "+(f.fr.tone==="hard"?"work hard":"take it easy"):""));
if(f.stage<=2){var cs=carers(game,f);out+=rc("🐣","grade "+F.grade(f)+(y?" · wants to "+esc(y.def.t)+" ("+y.n+"/"+y.need+")":""),F.firsts(game,f).map(function(x){return(x[1]?"✓ ":"· ")+x[0];}).join(" ")+(cs.length?" · "+cs.map(function(q){return esc(q.name)+": "+F.familyBond(game,f,q);}).join(", "):" · nobody of its own")+(F.kidSkills(f).length?" · "+F.kidSkills(f).map(function(k){return k.name+" "+k.lvl;}).join(", "):""));}
if(f.stage>=3){var pv=p?F.preview(game,f,p):!F.courtWhy(game,c,f)?F.preview(game,c,f):null;out+=rc("🥚",(p?"with "+esc(p.name)+": "+F.coupleMood(game,f,p):"on its own")+" · eggs: "+esc(F.fertile(game,f)),(pv?"a baby "+(p?"of theirs":"of yours")+": "+esc(pv.text):"")+(F.parenting(f)?" · parenting "+F.parenting(f)+"/3":""));}
out+="</div><div class='lbl'>talk about…"+(r.cd===d?" (had your long talk today)":"")+"</div>"+row;
for(var t in F.TOPICS)out+=btn("top",t,F.TOPICS[t],r.cd===d||!near);
out+="</div><div class='lbl'>play"+(near?"":" · get closer")+"</div>"+row+btn("play","pebbles","🪨 pebbles",!near||r.pb===d)+btn("play","tag","🏃 tag",!near)+btn("play","hide","🙈 hide-and-seek",!near)+btn("play","shove","🤼 a friendly shove",!near||s.shd===d)+btn("say","yes","👍 good!",!near)+btn("say","no","👎 bad!",!near)+"</div>";
out+="<div class='lbl'>ask more</div>"+row+btn("cmd","visit","👋 go and see a friend")+btn("tone","hard",f.fr&&f.fr.tone==="hard"?"💪 working hard ✓":"💪 work hard")+btn("tone","easy",f.fr&&f.fr.tone==="easy"?"🌤 taking it easy ✓":"🌤 take it easy")+btn("hold","1",s.hold?"⚔ fight with me again":"✋ leave it! (no fighting)");
F.fetchables(game,f).slice(0,2).forEach(function(k){out+=btn("gat",k,"🧺 gather "+esc(label(k)));});
out+="</div><div class='lbl'>if it won't</div>"+row+btn("sway","persuade","🗣 talk it round",!near||r.pd===d)+btn("sway","bribe","🍪 sweeten it",!near)+btn("sway","scold","☝ put your foot down",!near)+btn("sway","favour","🎖 call in a favour",!near||F.renown(c)<2)+"</div>";
out+="<div class='lbl'>pouch</div>"+row+btn("pouch","slip","🤫 slip it a surprise",dist(f,c)>3||!Sv().held(c)||!!r.slip)+btn("pouch","rummage",h>=7||f.partner===c.id?"🤝 take from its pouch":"🫳 poke through its pouch",dist(f,c)>3)+"</div>";
var cw=F.courtWhy(game,c,f);
if(!cw)out+="<div class='lbl'>💕 courting</div>"+row+btn("court","date","🌙 go for a walk",h<4||r.dd===d||!near)+btn("court","propose","💍 ask it to be yours (8 ♥, a posy, a home)",h<8)+"</div>";
var more="";
if(f.stage<=2&&!carers(game,f).length)more+=btn("fam","adopt","🧺 take "+esc(f.name)+" in",false,true);
if(f.stage>=3&&f.tier>=3)tribe(game).filter(function(k){return k.stage<=2&&k!==c&&!(k.fr&&k.fr.tut);}).slice(0,2).forEach(function(k){more+=btn("tut",k.id,"🎓 teach "+esc(k.name));});
if(f.stage===4)more+=btn("fam","listen","📖 sit and listen",s.lsd===d||!near);
if(F.renown(f)>=10&&!(f.fr&&f.fr.hon))for(var hn in F.HONOURS)more+=btn("hon",hn,F.HONOURS[hn][0]+" name it "+F.HONOURS[hn][1]);
if((c.tier||0)>=5)more+=btn("egg","blend","🥚 blend an egg: you and "+esc(f.name)+" (10 ✨)",s.bd===d)+btn("egg","echo","🥚 an echo egg of "+esc(f.name)+" (15 ✨)",s.bd===d);
if(more)out+="<div class='lbl'>more</div>"+row+more+"</div>";
return out;
}
function pageTribe(game,c){
var s=s2(game),w=s.ways,out="",row="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>",L=F.leader(game),ev=F.eve(game),ch=F.champion(game),tr=F.troupe(game),fer=F.feral(game),t=F.teacher(game),tot=F.totem(game),dem=F.demand(game);
out+="<div class='lbl'>"+(F.creed(game)?"🧭 "+esc(F.creed(game)):"🧭 no ways yet: what the tribe keeps doing becomes its way")+"</div><div class='rlist'>";
F.ways(game).forEach(function(wy){out+=rc(wy.icon,esc(wy.name),esc(wy.rule));});
var grow=Object.keys(F.WAYS).filter(function(id){return w.on.indexOf(id)<0&&(w.n[id]||0)>0;}).sort(function(a,b){return w.n[b]-w.n[a];}).slice(0,3);
if(grow.length&&w.on.length<3)out+=rc("🌱","growing",grow.map(function(id){return F.WAYS[id].name+" "+Math.min(F.WAY_AT,Math.round(w.n[id]))+"/"+F.WAY_AT;}).join(" · "));
if(tot)out+=rc(emo(tot)||"🗿","the totem: "+esc(label(tot)),"one near the nest at dawn pleases everyone. hunting one sits badly");
out+=rc("🏛",esc(F.expect(game).text),L?esc(L.name)+" leads"+(dem?", and wants "+esc(label(dem.k))+" brought":"")+". a speech every third morning":"no leader yet");
out+=rc("🔥",ev?F.EVES[ev.k][0]+" tonight: "+F.EVES[ev.k][1]:"evenings at the fire","story night, plays, lantern night and the drum dance take turns at dusk"+(t?" · "+esc(t.name)+" runs the kid circle each morning":"")+(ch?" · pebble champion: "+esc(ch.name):"")+(tr.length?" · the troupe: "+tr.map(function(x){return esc(x.name);}).join(", "):""));
if(s.trial&&byId(game,s.trial.c))out+=rc("⚖",esc(byId(game,s.trial.c).name)+" is up before the tribe",s.trial.spoke?"you spoke up for it":"you can speak up for it");
if(F.grudge(game,c)>0)out+=rc("😠","this village is cross with you","no favours for now. it fades a little each morning, or sit out by the hall");
if(fer)out+=rc("🌿","a wild smol is about","food or a paw held out, three times, and it comes in");
if(s.pen.length)out+=rc("✉","friends far away",esc(s.pen.join(", "))+" · they send things now and then");
out+="</div>"+row+btn("set","curfew",s.curfew?"🌙 kids' bedtime at dusk: on":"🌙 kids' bedtime at dusk: off")+btn("set","anyPair",s.anyPair?"💞 any two smols can pair: on":"💞 any two smols can pair: off")+(s.trial&&!s.trial.spoke?btn("set","speak","🗣 speak up",false,true):"")+"</div>";
if(s.tales.length){out+="<div class='lbl'>📜 tales</div>"+row;s.tales.forEach(function(x,i){out+=btn("tale",i,"📜 "+esc(x[2].slice(0,40))+(x[2].length>40?"…":""));});out+="</div>";}
return out;
}
F.lifeHtml=function(game,c,icon){
var pg=F._page2,row="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
return row+btn("pg","me","🧬 you",false,pg==="me")+btn("pg","them","👀 "+(F.focus0(game,c)?esc(F.focus0(game,c).name):"them"),false,pg==="them")+btn("pg","tribe","🧭 the tribe",false,pg==="tribe")+"</div>"+(pg==="them"?pageThem(game,c):pg==="tribe"?pageTribe(game,c):pageMe(game,c));
};
F.lifeWire=function(root,game,c,redraw,say){
function done(r){if(r&&r.msg&&say)say(r.msg);if(r&&r.ok)sound("craft",0.5);redraw();}
function each(attr,fn){root.querySelectorAll("[data-lf"+attr+"]").forEach(function(b){b.addEventListener("click",function(){fn(b.getAttribute("data-lf"+attr));});});}
function f(){return F.focus0(game,c);}
each("pg",function(v){F._page2=v;redraw();});
each("do",function(v){done(v==="feel"?F.act(game,c):v==="calm"?F.calm(game,c):v==="knack"?F.useKnack(game,c):v==="horn"?(Sv().count(c,"callhorn",true)?F.horn(game,c):F.makeHorn(game,c)):v==="accept"?F.accept(game,c):v==="eve"?F.joinEve(game,c):F.joinLesson(game,c));});
each("ans",function(v){done(F.answer(game,c,v));});
each("mir",function(v){if(v==="toggle"){F._mir=!F._mir;redraw();}else done(F.paint(game,c));});
each("up",function(v){done(F.tweak(game,c,v,1));});
each("dn",function(v){done(F.tweak(game,c,v,-1));});
each("top",function(v){done(F.chat(game,c,f(),v));});
each("play",function(v){done(v==="pebbles"?F.pebbles(game,c,f(),true):v==="shove"?F.shove(game,c,f()):F.playGame(game,c,f(),v));});
each("say",function(v){done(F.yesNo(game,c,f(),v==="yes"));});
each("cmd",function(v){done(F.command(game,c,f(),v));});
each("gat",function(v){done(F.command(game,c,f(),"gather",v));});
each("tone",function(v){done(F.tone(game,c,f(),v));});
each("hold",function(){done(F.holdFire(game));});
each("sway",function(v){done(F.sway(game,c,f(),v));});
each("pouch",function(v){done(v==="slip"?F.slip(game,c,f()):F.rummage(game,c,f()));});
each("court",function(v){done(v==="date"?F.date(game,c,f()):F.propose(game,c,f()));});
each("fam",function(v){if(v==="adopt"){var g=F.adopt(game,f(),c);if(g)F.add(game,f(),100);done({ok:!!g,msg:g?"🧺 you take "+f().name+" in. it is yours to look after now":""});}else done(F.listen(game,c,f()));});
each("tut",function(v){done(F.tutor(game,f(),byId(game,+v)));});
each("hon",function(v){done(F.honour(game,f(),v));});
each("egg",function(v){done(v==="echo"?F.blend(game,c,f(),f()):F.blend(game,c,c,f()));});
each("set",function(v){var s=st(game);if(v==="speak")return done(F.speakUp(game,c));s[v]=s[v]?0:1;emit("lifeSetting",{key:v,on:!!s[v]});redraw();});
each("tale",function(v){done(F.readTale(game,c,+v));});
};
if(SB.Ext){
SB.Ext.on("options",options2);
SB.Ext.on("damage",damage2);
SB.Ext.on("vitals",function(game,c){
var out=[],e=F.emotion(game,c),k=F.inspiredAs(game,c);
if(e&&e.lvl===3)out.push({icon:e.icon,text:e.text,bad:e.id!=="happy"&&e.id!=="in love"});
if(k&&k!=="idea")out.push({icon:"💡",text:k==="fight"?"inspired: hits land harder":"inspired: fine work",bad:false});
if(F.grudge(game,c)>0)out.push({icon:"😠",text:"the village is cross with you",bad:true});
return out;
});
SB.Ext.on("goals",function(game,add){var ev=F.eve(game),fer=F.feral(game);if(ev)add(F.EVES[ev.k][0]+" "+F.EVES[ev.k][1]+" at the fire: join in as a smol",ev.done?"1/1":"0/1",!!ev.done,false);if(fer)add("🌿 a wild smol: tickle it or bring it food",((fer.fr&&fer.fr.tame)||0)+"/3",false,false);});
SB.Ext.tab({id:"life",label:function(){return"🧬 life";},show:function(game,c){return!!game&&!!c;},html:function(game,c,icon){return F.lifeHtml(game,c,icon);},wire:function(root,game,c,redraw,say){F.lifeWire(root,game,c,redraw,say);}});
}
})();
