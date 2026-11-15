/* smol brains: harvest.js (built from src/harvest.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB=window.SB||{};
var H=SB.Harvest={};
var K=SB.KINDS,SK=SB.STRUCTS,NK=SB.NODES;
if(!K||!SK)return;
function Sv(){return SB.Surv||SB.Survival;}
function Ps(){return SB.Possess;}
function Q(game){return game.quests||(game.quests={ch:0,done:{},n:{}});}
var KEYS=["fish","dishes","crops","forage","taps"];
function st(game){
var q=Q(game);
if(!q.harvest||typeof q.harvest!=="object")q.harvest={};
var s=q.harvest;
KEYS.forEach(function(k){if(!s[k]||typeof s[k]!=="object")s[k]={};});
if(typeof s.casts!=="number")s.casts=0;
return s;
}
H.state=st;
function day(game){return Math.floor((game.time||0)/SB.DAY_LENGTH)+1;}
function season(game){return game.world&&game.world.season?game.world.season|0:0;}
function raining(game){var w=game.world&&game.world.weather;return!!w&&(w.rain||0)>0.3;}
function label(k){return K[k]&&K[k].label?K[k].label:k;}
function hashKey(s){var h=2166136261;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function rnd(game,key){return SB.rng((hashKey(key)^(game.seed>>>0))>>>0);}
function lv(c,id){return SB.Body&&c?SB.Body.level(c,id):0;}
function bonus(c,id){return SB.Body&&c?SB.Body.bonus(c,id):0;}
function xp(c,id,n){if(SB.Body&&c)SB.Body.xp(c,id,n);}
function r1(v){return Math.round(v*10)/10;}
function emit(ev,d){if(SB.bus)SB.bus.emit(ev,d);}
function say(msg){var P=Ps();if(msg&&P&&P.active&&P.say)P.say(msg);}
function sound(name){var P=Ps();if(SB.Audio&&SB.Audio.play&&!(P&&P.headless))SB.Audio.play(name);}
function mark(game,b){if(SB.World&&SB.World.markNode)SB.World.markNode(game.world,b);}
function give(game,c,kind,n){
if(!K[kind]||n<=0)return 0;
var left=Sv().add(c,kind,n);
if(left>0&&Sv().spawn)Sv().spawn(game,kind,left,c.x+0.5,c.z+0.3,{by:c.id});
return left;
}
function biomeId(game,x,z){var b=SB.BIOMES&&SB.World?SB.BIOMES[SB.World.biomeAt(game.world,x,z)]:null;return b?b.id:"";}
function waterNear(game,x,z,r){
var W=SB.World,w=game.world;
if(W.depthAt(w,x,z)>0.05)return{x:x,z:z};
for(var d=0.8;d<=r;d+=0.8)for(var a=0;a<6.28;a+=0.785){var px=x+Math.sin(a)*d,pz=z+Math.cos(a)*d;if(W.depthAt(w,px,pz)>0.05)return{x:px,z:pz};}
return null;
}
var SEASON=SB.SEASONS||["spring","summer","autumn","winter"];
function seasonsText(s){return!s||s.length>=4?"all year":s.map(function(i){return SEASON[i];}).join(" and ");}
var SHAPE={};
function kind(id,shape,def){if(!K[id]){if(def.r==null)def.r=0.14;K[id]=def;}SHAPE[id]=shape;return K[id];}
function food(id,shape,lab,emoji,color,hunger,desc,extra){
var d={noun:"food",label:lab,emoji:emoji,color:color,food:{hunger:-hunger},chem:{glucose:Math.round(hunger*50)/100},rots:900,desc:desc};
for(var k in extra||{})d[k]=extra[k];
return kind(id,shape,d);
}
function mat(id,shape,lab,emoji,color,desc){return kind(id,shape,{noun:"material",label:lab,emoji:emoji,color:color,mat:1,desc:desc});}
var TOOLS={};
function tool(id,lab,emoji,color,verb,desc,pow){kind(id,"tool",{noun:"tool",label:lab,emoji:emoji,r:0.15,color:color,tool:verb,desc:desc});TOOLS[id]=pow;}
H.FISH=[];
var FISH_BY=H.FISH_BY={};
function fish(id,lab,emoji,color,w,o){
var f={id:id,label:lab,emoji:emoji,w:w,s:o.s||null,t:o.t||"",wx:o.wx||"",rare:o.rare||1,min:o.min,max:o.max,b:o.b||null,pot:!!o.pot};
H.FISH.push(f);FISH_BY[id]=f;
food(id,"fish",lab,emoji,color,o.hunger||0.4,o.desc,{raw:!o.safe,rots:240,chem:{glucose:0.2,fat:0.3},glow:o.glow?1:undefined,r:0.16});
return f;
}
fish("minnow","minnow","🐟",0xa9c4cf,["river","pond"],{rare:1,min:4,max:9,hunger:0.2,desc:"tiny and everywhere in fresh water. good bait, small supper."});
fish("silverling","silverling","🐟",0xc9d6e2,["sea"],{rare:1,min:8,max:16,hunger:0.25,desc:"flashes in the shallows of the sea, all year."});
fish("mudcarp","mud carp","🐟",0x9a8a5a,["pond"],{s:[0,1,2],rare:2,min:25,max:60,hunger:0.5,desc:"a fat pond fish. sleeps under the ice all winter."});
fish("trout","brook trout","🐟",0x8fae7a,["river"],{s:[0,2],rare:2,min:20,max:45,hunger:0.45,desc:"likes cool running water: spring and autumn rivers."});
fish("leaper","silver leaper","🐠",0xe58a6a,["river"],{s:[2],rare:3,min:40,max:85,hunger:0.6,desc:"swims up the rivers in autumn. strong on the line."});
fish("whiskerfish","whiskerfish","🐟",0x6a6a72,["river","pond"],{wx:"r",rare:2,min:30,max:70,hunger:0.5,desc:"only comes up to feed when it rains."});
fish("puffer","puffer","🐡",0xe8c86a,["sea"],{s:[1],t:"d",rare:2,min:12,max:30,hunger:0.35,desc:"a round summer fish of sunny seas. very cross about being caught."});
fish("flatfish","flatfish","🐟",0xb8a888,["sea"],{s:[0,2,3],rare:2,min:20,max:50,hunger:0.45,desc:"lies on the sea floor pretending to be sand."});
fish("mooneel","moon eel","🐍",0x4a5a8a,["sea","river"],{t:"n",rare:3,min:50,max:110,hunger:0.55,desc:"long, dark and only out at night."});
fish("icefin","icefin","🐟",0xbfe6f5,["pond","river"],{s:[3],rare:2,min:15,max:35,hunger:0.4,desc:"a pale winter fish. the cold doesn't bother it."});
fish("sunperch","sunperch","🐠",0xf2a23a,["pond"],{s:[1],t:"d",wx:"c",rare:2,min:15,max:30,hunger:0.4,desc:"basks near the top of a pond on a clear summer day."});
fish("jelly","glow jelly","🪼",0x9af0e0,["sea"],{s:[1,2],t:"n",rare:3,min:8,max:20,hunger:0.2,safe:1,glow:1,desc:"drifts in on warm nights, glowing. wobbly, and good in a pudding."});
fish("coralfin","coralfin","🐠",0xff7a8a,["sea"],{b:["reef"],rare:2,min:10,max:25,hunger:0.35,desc:"lives only in the coral shallows."});
fish("glimmerfin","glimmerfin","🐠",0xc0a8ff,["river","pond","sea"],{b:["crystal","shroom"],rare:3,min:15,max:30,hunger:0.4,glow:1,desc:"found only in the waters of the crystal steppe and the glowshroom grove."});
fish("oldbarnacle","Old Barnacle","🐋",0x5a7a8a,["sea"],{s:[1],t:"d",rare:4,min:140,max:190,hunger:0.8,desc:"a great fish. the oldest thing in the summer sea."});
fish("riverghost","the River Ghost","🐟",0xeef4f8,["river"],{s:[3],t:"n",rare:4,min:90,max:130,hunger:0.8,desc:"a great fish. white as frost, seen on winter nights."});
fish("grandcarp","Grandmother Carp","🐡",0xd9a03a,["pond"],{s:[0],wx:"r",rare:4,min:100,max:150,hunger:0.8,desc:"a great fish. she only rises in the spring rain."});
fish("moonscale","Moonscale","🐠",0xdfe6ff,["sea"],{s:[2],t:"n",rare:4,min:110,max:160,hunger:0.8,glow:1,desc:"a great fish. it follows the autumn moon in to shore."});
fish("gloop","the Gloop","🐸",0x6a9a4a,["pond","river"],{b:["swamp","mangrove","jungle"],wx:"r",rare:4,min:80,max:120,hunger:0.8,desc:"a great fish, if it is a fish. swamp water, in the rain."});
fish("crab","crab","🦀",0xe0603a,["sea","river","pond"],{pot:1,rare:2,min:8,max:18,hunger:0.4,desc:"walks into crab pots sideways. boil it."});
H.GREAT=H.FISH.filter(function(f){return f.rare===4;});
var RARE_W=[0,10,4.5,1.6,0.4],RARE_WORD=["","common","uncommon","rare","great"];
food("seaweed","veg","seaweed","🥬",0x3f8a5a,0.15,"pulled up on a line at sea. chewy. dries into something a fire will burn.",{rots:0});
mat("pondweed","veg","pondweed","🌿",0x5a8a3a,"slimy green stuff off a hook. makes good compost.");
mat("oldboot","tool","old boot","🥾",0x6a4a36,"somebody's. nobody on this island wears boots. compost it.");
mat("bait","seed","bait","🪱",0xc98a7a,"wriggly. with bait in your bag the bites come twice as fast (one a cast).");
mat("lure","seed","lure","🪶",0xf0d060,"made from a fish, to catch more of that fish. one a cast.");
mat("compost","seed","compost","🟤",0x4a3424,"rotted-down scraps. feed it to a garden bed or a farm: faster, and better.");
mat("tapper","tool","tree tap","🪠",0x9a7a4a,"push it into a pine, maple, birch or apple tree. come back later for the sap.");
food("sap","jar","sweet sap","🍯",0xd9a24a,0.2,"tapped from a tree. sweet, sticky, and it burns.",{rots:0});
mat("flour","seed","flour","🌾",0xf0e6cf,"grain ground in a quern. the start of pies and cakes.");
tool("hoe","hoe","⛏",0x8a6a48,"till","a flat stone on a stick. look at open ground and till a garden bed.",{wood:0,stone:0,ore:0,dmg:0.3,uses:80});
tool("sickle","sickle","🌙",0x7a8a9a,"reap","a curved flint on a handle. harvest with it: one more from every bed, more seeds, and it reaps the beds beside it too.",{wood:0,stone:0,ore:0,dmg:0.5,uses:120});
tool("dipper","leaf cup","🍃",0x6fbf4a,"water","leaves folded into a cup. fill it at any water: three waterings.",{wood:0,stone:0,ore:0,dmg:0,uses:100});
tool("finerod","bamboo rod","🎣",0xb8c46a,"fish","long and springy. you get longer to hook a bite.",{wood:0,stone:0,ore:0,dmg:0.2,uses:220});
H.RODS={rod:{win:1.0,line:1},finerod:{win:1.5,line:1},spear:{win:0.7,line:0}};
H.WATER={pot:8,dipper:3};
H.CROPS=[];
var CROP=H.CROP={},CROP_SEED={},CROP_OUT={};
function crop(id,lab,out,s,grow,y,o){
o=o||{};
var cr={id:id,label:lab,out:out,seed:"s_"+id,s:s,grow:grow,y:y,regrow:o.regrow||0,giant:!!o.giant,paddy:!!o.paddy,damp:!!o.damp,found:!!o.found};
H.CROPS.push(cr);CROP[id]=cr;CROP_SEED[cr.seed]=cr;if(!CROP_OUT[out])CROP_OUT[out]=cr;
kind(cr.seed,"seed",{noun:"crop",label:lab+" seeds",emoji:"🌱",r:0.1,color:o.col||0x9bd16a,mat:1,desc:"sow them in a garden bed in "+seasonsText(s)+(o.note?". "+o.note:".")});
return cr;
}
food("firepod","veg","firepod","🌶",0xe0402a,0.2,"a hot little summer pod. warms you from the inside.");
food("bean","veg","pole beans","🫘",0x8a5a3a,0.3,"climbs anything. keeps giving all spring and summer.");
food("rice","seed","marsh rice","🍚",0xf2ecd8,0.3,"grown with its feet wet. fills a bowl.",{rots:1600});
kind("tealeaf","veg",{noun:"material",label:"tea leaves",emoji:"🍵",color:0x5a9a4a,mat:1,desc:"from a tea bush. brew them in a pot by the fire."});
food("snowbulb","veg","snowbulb","🧅",0xdfeef8,0.4,"the one crop that likes winter. sweet when the frost has had it.");
food("starmelon","veg","star melon","🍈",0xa8e06a,0.7,"an old ark crop. slow, grows all year, and tastes like luck.",{r:0.22,rots:1400});
crop("sunroot","sunroot","carrot",[0,2],300,[1,2]);
crop("grain","grain","grain",[1,2],340,[2,3]);
crop("gourd","gourd","pumpkin",[1,2],460,[1,1],{giant:1,note:"well kept, one may grow giant"});
crop("berry","berry bramble","berry",[0,1],300,[2,3],{regrow:150,note:"keeps fruiting"});
crop("firepod","firepod","firepod",[1],320,[1,2],{regrow:170,col:0xe0402a,note:"keeps fruiting"});
crop("bean","pole bean","bean",[0,1],280,[2,3],{regrow:140,note:"keeps fruiting"});
crop("rice","marsh rice","rice",[0,1,2],380,[2,4],{paddy:1,note:"beside water it waters itself and grows faster"});
crop("healroot","healroot","herb",[0,1,2],320,[1,2],{regrow:200,note:"a herb bed keeps giving"});
crop("glowcap","glowcap","glowcap",[0,1,2,3],300,[1,2],{regrow:160,damp:1,col:0x67d4ff,note:"a mushroom bed: needs no watering, fruits even in winter"});
crop("tea","tea bush","tealeaf",[0,1,2],400,[2,3],{regrow:150,note:"leaves for a pot of tea"});
crop("reed","reed","fiber",[0,1,2],260,[2,3],{regrow:130,paddy:1,note:"fibre you grow yourself"});
crop("snowbulb","snowbulb","snowbulb",[3],320,[1,2],{found:1,col:0xdfeef8,note:"found in old ruins"});
crop("starmelon","star melon","starmelon",[0,1,2,3],600,[1,1],{giant:1,found:1,col:0xffe27a,note:"found in pod crates and wrecks"});
food("leek","veg","wild leek","🧅",0xcfe6a8,0.25,"comes up under the trees in spring.");
food("morel","veg","morel","🍄",0xb89a6a,0.25,"a wrinkly spring mushroom. a safe one.",{noun:"food"});
kind("mint","veg",{noun:"material",label:"wild mint",emoji:"🌿",color:0x6ad1a0,mat:1,desc:"summer leaves from damp places. makes a pot of tea."});
food("truffle","veg","truffle","🟤",0x4a3a30,0.35,"an autumn find under old trees. smols would trade a house for one.",{rots:0});
food("snowroot","veg","snowroot","🥔",0xd8c8a8,0.35,"dug out from under the snow in winter. plain, filling.",{rots:1600});
H.FORAGE=[
{id:"leek",s:0,p:0.5,nodes:["oak","birch","maple","sakura","giant"]},
{id:"morel",s:0,p:0.45,nodes:["deadtree","shrooms","pine","shroomtree"]},
{id:"mint",s:1,p:0.5,nodes:["reeds","herbs","bush","bamboo","mangrove"]},
{id:"truffle",s:2,p:0.2,nodes:["oak","pine","maple","giant","birch"]},
{id:"snowroot",s:3,p:0.5,nodes:["roots","bush","oak","pine","birch","maple","deadtree","sakura"]}
];
H.SEED_NODE={roots:"s_sunroot",gourds:"s_gourd",bush:"s_berry",herbs:"s_healroot",reeds:"s_reed",shrooms:"s_glowcap",shroomtree:"s_glowcap",cactus:"s_firepod",sakura:"s_tea",mangrove:"s_rice",bamboo:"s_bean",palm:"s_grain"};
H.TAP_TREES={pine:1,maple:1,birch:1,oak:1,sakura:1,giant:1};
H.TAP_SECS=500;
H.BUFFS={
pep:{icon:"⚡",name:"peppy",tip:"your pep comes back much faster"},
warm:{icon:"🔥",name:"warm",tip:"the cold can't get into you"},
mighty:{icon:"💪",name:"mighty",tip:"you hit a third harder"},
quick:{icon:"💨",name:"quick",tip:"you walk and run faster"},
lucky:{icon:"🍀",name:"lucky",tip:"rarer fish, bigger harvests, better finds"},
hearty:{icon:"💗",name:"mending",tip:"your hearts slowly come back"},
keen:{icon:"🎣",name:"keen",tip:"longer to hook a bite"},
green:{icon:"🌱",name:"green paws",tip:"watering lasts twice as long, and one more from every harvest"}
};
var BUFF_KEYS=Object.keys(H.BUFFS);
H.DISHES=[];
var DISH=H.DISH={},BUFF_OF=H.BUFF_OF={};
function dish(id,lab,emoji,color,ins,buff,secs,hunger,o){
o=o||{};
var d={id:id,label:lab,emoji:emoji,in:ins,buff:buff,secs:secs,pot:!!o.pot,cold:!!o.cold,lvl:o.lvl==null?99:o.lvl,drink:!!o.drink,riddle:o.riddle||"",fx:o.fx||"",snow:!!o.snow};
H.DISHES.push(d);DISH[id]=d;
var bt=o.fx||(buff&&H.BUFFS[buff]?H.BUFFS[buff].name+" for "+Math.round(secs/60)+" min":"a surprise");
kind(id,o.drink?"jar":"bowl",{noun:o.drink?"medicine":"food",label:lab,emoji:emoji,r:0.15,color:color,food:{hunger:-hunger},chem:{glucose:Math.round(hunger*45)/100,fat:o.drink?0:0.15},rots:1500,desc:(o.desc||"a dish.")+" "+bt+"."});
if(buff)BUFF_OF[id]={k:buff,secs:secs,slot:o.drink?"drink":"food"};
return d;
}
dish("roastroots","roast roots","🥕",0xe8843a,{carrot:2},"quick",240,0.6,{lvl:0,riddle:"two of the same root",desc:"sunroots done in the embers."});
dish("fishstew","fish stew","🍲",0xd9a05a,{"fish*":1,carrot:1},"warm",300,0.8,{pot:1,lvl:0,riddle:"something fishy and a root, in a pot",desc:"any fish and a sunroot, simmered."});
dish("berrytart","berry tart","🥧",0x8a5ac8,{berry:2,flour:1},"pep",300,0.6,{lvl:2,riddle:"berries and something ground",desc:"berries in a crust."});
dish("fishpie","fish pie","🥧",0xd8b070,{"fish*":1,flour:1},"hearty",300,0.85,{lvl:2,riddle:"something fishy and something ground",desc:"fish under a lid of pastry."});
dish("gourdsoup","gourd soup","🎃",0xf2a23a,{pumpkin:1,herb:1},"hearty",360,0.8,{pot:1,lvl:4,riddle:"a gourd and a root that heals, in a pot",desc:"thick, orange and kind."});
dish("firestew","fire stew","🌶",0xc8402a,{firepod:1,"meat*":1},"mighty",240,0.8,{pot:1,lvl:4,riddle:"something hot and something meaty, in a pot",desc:"puts fight in a smol."});
dish("honeycake","honey cake","🍰",0xf2c860,{"sweet*":1,flour:1},"lucky",300,0.6,{lvl:6,riddle:"something sweet and something ground",desc:"a lucky cake."});
dish("ricebowl","fisher's bowl","🍚",0xf2ecd8,{rice:2,"fish*":1},"keen",300,0.8,{lvl:6,riddle:"marsh rice and something fishy",desc:"what fishers eat before a long day."});
dish("beanpot","bean pot","🫘",0x9a5a3a,{bean:2,firepod:1},"green",360,0.7,{pot:1,lvl:8,riddle:"beans and something hot, in a pot",desc:"a gardener's supper."});
dish("feast","harvest feast","🍽",0xe8c070,{truffle:1,"meat*":1,bread:1},"lucky",600,1,{lvl:8,riddle:"the autumn find, something meaty and a loaf",desc:"the best plate on the island."});
dish("trailmix","trail mix","🥜",0xc8a070,{nutmeat:1,driedfruit:1},"pep",240,0.5,{cold:1,riddle:"nut meat and dried fruit. no fire needed",desc:"a pocket snack."});
dish("shroomfry","mushroom fry","🍄",0xb89a6a,{"shroom*":2},"lucky",200,0.5,{riddle:"two safe mushrooms",desc:"fried till the edges curl."});
dish("crabboil","crab boil","🦀",0xe0603a,{crab:1,seaweed:1},"mighty",300,0.8,{pot:1,riddle:"a crab and something green from the sea, in a pot",desc:"pinchy, then delicious."});
dish("jellypudding","glow pudding","🍮",0x9af0e0,{jelly:1,"sweet*":1},"quick",360,0.5,{riddle:"something that glows from the sea, and something sweet",desc:"it wobbles. so do you, quickly."});
dish("springsoup","spring soup","🥣",0xa8d88a,{leek:1,morel:1},"pep",360,0.6,{pot:1,riddle:"two spring finds, in a pot",desc:"tastes like the thaw."});
dish("snowbroth","snow broth","🥣",0xdfeef8,{snowbulb:1,snowroot:1},"warm",480,0.7,{pot:1,riddle:"two winter roots, in a pot",desc:"winter in a bowl, but warm."});
dish("mysterystew","mystery stew","🥘",0x8a6a9a,{shroom:1,"any*":1},null,240,0.5,{pot:1,riddle:"a red shroom and anything you can eat, in a pot. brave",desc:"nobody knows what it will do. not even the cook."});
dish("herbtea","herb tea","🍵",0x8ac87a,{"tea*":2},"pep",300,0.05,{pot:1,drink:1,lvl:0,riddle:"two handfuls of leaves for brewing, in a pot",desc:"a drink. calms a smol down too."});
dish("berryjuice","berry juice","🧃",0x7a5ad8,{berry:3},"quick",240,0.15,{pot:1,cold:1,drink:1,riddle:"a lot of berries, squashed in a pot. no fire",desc:"a drink."});
dish("kelpbroth","kelp broth","🍶",0x4a9a7a,{seaweed:2},"keen",300,0.1,{pot:1,drink:1,riddle:"sea greens, twice, in a pot",desc:"a drink. fishers swear by it."});
dish("cider","hot cider","🍺",0xd9903a,{apple:2},"warm",300,0.2,{pot:1,drink:1,riddle:"two apples, in a pot",desc:"a drink. apples, hot."});
food("driedfruit","veg","dried fruit","🍑",0xd98a5a,0.3,"off the drying rack. never goes bad.",{rots:0});
food("jerky","fish","jerky","🥓",0x9a5a4a,0.5,"dried fish or meat. never goes bad, never makes you sick.",{rots:0,chem:{glucose:0.15,fat:0.3}});
food("smokedfish","fish","smoked fish","🐟",0xb87a4a,0.75,"out of the smoker. feeds more than a fresh one and keeps for ages.",{rots:3000,chem:{glucose:0.25,fat:0.35}});
food("jam","jar","jam","🍓",0xc8305a,0.45,"fruit, potted. never goes bad.",{rots:0});
food("pickles","jar","pickles","🥒",0x7aa84a,0.45,"roots and pods, potted. never goes bad.",{rots:0});
kind("fizz","jar",{noun:"medicine",label:"honey fizz",emoji:"🥂",r:0.15,color:0xf7d76a,food:{hunger:-0.1,bored:-0.3,lonely:-0.15},chem:{glucose:0.3},rots:0,desc:"honey left in a crock until it tickles. a party drink. lucky for 5 min."});
BUFF_OF.fizz={k:"lucky",secs:300,slot:"drink"};
BUFF_OF.jam={k:"pep",secs:120,slot:"food"};
BUFF_OF.honey={k:"hearty",secs:60,slot:"food"};
BUFF_OF.starmelon={k:"lucky",secs:240,slot:"food"};
BUFF_OF.firepod={k:"warm",secs:120,slot:"food"};
function inList(list){var m={};list.forEach(function(k){m[k]=1;});return function(k){return!!m[k];};}
var GROUPS=H.GROUPS={
"fish*":{name:"fish (any)",is:function(k){return k==="fish"||!!FISH_BY[k]&&k!=="crab";}},
"fruit*":{name:"fruit (any)",is:inList(["apple","cherry","berry","banana","pricklypear"])},
"veg*":{name:"roots or pods (any)",is:inList(["carrot","pumpkin","bean","firepod","leek","snowbulb","snowroot"])},
"meat*":{name:"meat, clam or crab",is:inList(["meat","clam","crab","jerky"])},
"shroom*":{name:"safe mushrooms",is:inList(["glowcap","morel","truffle"])},
"tea*":{name:"tea leaves or mint",is:inList(["tealeaf","mint"])},
"sweet*":{name:"honeycomb, sap or jam",is:inList(["honey","sap","jam"])},
"scrap*":{name:"scraps (any food, weed or an old boot)",is:function(k){return k==="pondweed"||k==="oldboot"||k==="seaweed"||(Sv().edible(k)&&!DISH[k]);}},
"any*":{name:"anything you can eat",is:function(k){return k!=="shroom"&&Sv().edible(k)&&!DISH[k];}}
};
function chestOf(c){var g=SB.Game&&SB.Game.current,Hm=SB.Home;return g&&c&&Hm&&Hm.has&&Hm.chest&&Hm.has(g,"chest")&&Hm.at(g,c)?Hm.chest(g):null;}
H.chestOf=chestOf;
function countOf(c,want){
var v=Sv().inv(c),n=0,ch=chestOf(c),i;
if(!GROUPS[want])n=Sv().count(c,want,true);
else for(i=0;i<v.s.length;i++)if(v.s[i]&&GROUPS[want].is(v.s[i].k))n+=v.s[i].n;
if(ch)for(i=0;i<ch.length;i++)if(ch[i]&&(GROUPS[want]?GROUPS[want].is(ch[i].k):ch[i].k===want))n+=ch[i].n;
return n;
}
function takeOf(c,want,n){
var got=takeBag(c,want,n),ch=got.length<n?chestOf(c):null,left=n-got.length;
for(var i=0;ch&&i<ch.length&&left>0;i++){var sl=ch[i];if(!sl||!(GROUPS[want]?GROUPS[want].is(sl.k):sl.k===want))continue;while(sl.n>0&&left>0){sl.n--;left--;got.push(sl.k);}if(sl.n<=0)ch[i]=null;}
return got;
}
function takeBag(c,want,n){
if(!GROUPS[want])return Sv().count(c,want,true)>0?Sv().take(c,want,Math.min(n,Sv().count(c,want,true))):[];
var v=Sv().inv(c),idx=[],out=[];
for(var i=0;i<v.s.length;i++)if(v.s[i]&&GROUPS[want].is(v.s[i].k))idx.push(i);
function rank(k){return FISH_BY[k]?FISH_BY[k].rare:k==="oldboot"||k==="pondweed"||k==="seaweed"?-1:0;}
idx.sort(function(a,b){return rank(v.s[a].k)-rank(v.s[b].k);});
for(var j=0;j<idx.length&&n>0;j++){var sl=v.s[idx[j]];while(sl.n>0&&n>0){sl.n--;n--;out.push(sl.k);}if(sl.n<=0)v.s[idx[j]]=null;}
return out;
}
function wantText(want,n){return n+" "+(GROUPS[want]?GROUPS[want].name:label(want));}
H.costText=function(cost){var out=[];for(var k in cost)out.push(wantText(k,cost[k]));return out.join(", ");};
function lacks(c,cost){for(var k in cost)if(countOf(c,k)<cost[k])return true;return false;}
H.countOf=countOf;
H.buffs=function(c,game){
var out=[],b=c&&c.buff,t=game.time||0;
if(!b)return out;
["food","drink"].forEach(function(slot){var x=b[slot];if(x&&x.until>t&&H.BUFFS[x.k])out.push({slot:slot,k:x.k,id:x.id,left:x.until-t,def:H.BUFFS[x.k]});});
return out;
};
function luck3(c,game){return SB.Minds&&SB.Minds.luck&&c?0.1*SB.Minds.luck(c,game):0;}
H.has=function(c,k,game){var b=c&&c.buff,t=game.time||0;return!!(b&&((b.food&&b.food.k===k&&b.food.until>t)||(b.drink&&b.drink.k===k&&b.drink.until>t)));};
H.giveBuff=function(game,c,k,secs,slot,id){
if(!H.BUFFS[k]||!c)return null;
if(!c.buff||typeof c.buff!=="object")c.buff={};
if(lv(c,"cook")>=3)secs*=1.25;
c.buff[slot||"food"]={k:k,id:id||k,until:(game.time||0)+secs};
emit("buff",{c:c,k:k,secs:secs,slot:slot||"food"});
return c.buff[slot||"food"];
};
H.ate=function(game,c,k){
if(!game||!c)return null;
var bo=BUFF_OF[k],msg=null;
if(k==="mysterystew"){
var s=st(game),r=rnd(game,"myst"+(s.myst=(s.myst||0)+1))();
if(r<0.2){c.chem.sick=Math.min(1,(c.chem.sick||0)+0.25);msg="🥘 mystery stew… your tummy gurgles. that was the wrong mystery";}
else bo={k:BUFF_KEYS[Math.floor(r*97)%BUFF_KEYS.length],secs:240,slot:"food"};
}
if(k==="honey"&&c.chem.toxin!=null)c.chem.toxin=Math.max(0,c.chem.toxin-0.3);
if(k==="herbtea"){if(c.chem.fear!=null)c.chem.fear=Math.max(0,c.chem.fear-0.3);if(c.chem.anger!=null)c.chem.anger=Math.max(0,c.chem.anger-0.3);}
if(bo){
var b=H.giveBuff(game,c,bo.k,bo.secs,bo.slot,k),def=H.BUFFS[bo.k];
msg=def.icon+" "+label(k)+": "+def.name+" for "+Math.max(1,Math.round((b.until-game.time)/60))+" min. "+def.tip;
}
if(msg)say(msg);
if(H.ate2)H.ate2(game,c,k,bo);
return bo||null;
};
var lastX=null,lastZ=null,lastId=null;
function buffTick(game,dt){
var P=Ps(),c=P&&P.active?P.c:null;
if(!c||!c.alive||!c.buff){lastId=null;return;}
var S=P.state?P.state():null,ch=c.chem;
if(H.has(c,"pep",game)&&S&&typeof S.stam==="number")S.stam=Math.min(1,S.stam+dt*0.07);
if(H.has(c,"warm",game)&&ch.cold!=null)ch.cold=Math.max(0,ch.cold-dt*0.03);
if(H.has(c,"hearty",game)&&ch.health>0&&ch.health<1)ch.health=Math.min(1,ch.health+dt*0.004);
if((H.has(c,"quick",game)||H.has(c,"glow",game))&&lastId===c.id&&!c.asleep){
var dx=c.x-lastX,dz=c.z-lastZ,d=Math.sqrt(dx*dx+dz*dz);
if(d>0.0005&&d<0.6){var nx=c.x+dx*0.2,nz=c.z+dz*0.2;if(SB.World.walkable(game.world,nx,nz,false)){c.x=nx;c.z=nz;}}
}
lastX=c.x;lastZ=c.z;lastId=c.id;
}
H.waterKind=function(game,x,z){
var w=game.world,T=w.T,WG=SB.WorldGen,b=biomeId(game,x,z);
if(b==="ocean"||b==="reef")return"sea";
if(!T||!WG)return"pond";
var lvl=WG.waterAt(T,x,z);
if(lvl!==T.NONE&&lvl<=(SB.SEA||0)+0.06)return"sea";
if(T.river&&T.V){
var i0=Math.round(x),j0=Math.round(z);
for(var j=j0-1;j<=j0+1;j++)for(var i=i0-1;i<=i0+1;i++)if(i>=0&&j>=0&&i<T.V&&j<T.V&&T.river[j*T.V+i])return"river";
}
return"pond";
};
H.bubbling=function(game,x,z){return(hashKey("bub:"+Math.floor(x/5)+","+Math.floor(z/5)+":"+day(game))^(game.seed>>>0))%5===0;};
H.bubbleNear=function(game,x,z,r){
var W=SB.World,w=game.world,best=null,bd=r||60,n=Math.ceil(bd/5),cx=Math.floor(x/5),cz=Math.floor(z/5);
for(var j=-n;j<=n;j++)for(var i=-n;i<=n;i++){
var px=(cx+i)*5+2.5,pz=(cz+j)*5+2.5,d=SB.dist(px,pz,x,z);
if(d<bd&&H.bubbling(game,px,pz)&&W.inBounds(w,px,pz)&&W.depthAt(w,px,pz)>0.05){bd=d;best={x:px,z:pz,d:d};}
}
return best;
};
H.fishHere=function(game,x,z,c,wkIs){
var w=game.world,wk=wkIs||H.waterKind(game,x,z),se=season(game),night=!!w.night,rain=raining(game);
var b1=biomeId(game,x,z),b2=c?biomeId(game,c.x,c.z):b1;
return H.FISH.filter(function(f){
if(f.pot||f.w.indexOf(wk)<0)return false;
if(f.s&&f.s.indexOf(se)<0)return false;
if((f.t==="n"&&!night)||(f.t==="d"&&night))return false;
if((f.wx==="r"&&!rain)||(f.wx==="c"&&rain))return false;
if(f.b&&f.b.indexOf(b1)<0&&f.b.indexOf(b2)<0)return false;
return true;
});
};
H.fishHint=function(f){
var p=[f.pot?"a crab pot left in any water":f.w[0]==="vent"?"a steam vent's pool, with an ember hook":f.w.join(" or ")];
if(H.MOVES&&H.MOVES[f.id])p.push(H.MOVE_TEXT[H.MOVES[f.id]]);
if(f.b)p.push("only in the "+f.b.map(function(id){var b=null;(SB.BIOMES||[]).forEach(function(x){if(x.id===id)b=x;});return b?b.name:id;}).join(" or "));
if(f.s)p.push(seasonsText(f.s));
if(f.t)p.push(f.t==="n"?"at night":"by day");
if(f.wx)p.push(f.wx==="r"?"in the rain":"in clear weather");
return p.join(" · ");
};
H.rollCatch=function(game,c,o){
var r=o.r,s=st(game),fl=lv(c,"fish"),lucky=H.has(c,"lucky",game),spear=o.tool==="spear";
var wk=o.wk||H.waterKind(game,o.x,o.z),x=r(),R=H.RODS[o.tool]||{};
var crateP=spear||o.wk?0:(0.03+(lucky?0.03:0))*(R.crate||1),junkP=spear?0:fl>=5?0.05:0.13;
if(x<crateP)return{crate:true,water:wk};
if(x<crateP+junkP)return{junk:wk==="sea"?(r()<0.6?"seaweed":"oldboot"):(r()<0.5?"pondweed":r()<0.6?"oldboot":"stick"),water:wk};
var list=H.fishHere(game,o.x,o.z,c,o.wk),wts=[],tot=0;
list.forEach(function(f){
var w=RARE_W[f.rare];
if(f.rare===4&&(spear||(s.fish[f.id]&&s.fish[f.id].n>0)))w=0;
if(spear&&f.rare>2)w=0;
if(f.rare>=3)w*=(lucky?1.7:1)*(o.bubbles?1.5:1)*(fl>=8?1.5:1)*(R.rare||1)*(o.far?1.4:1)*(H.worn&&H.worn(c,"shellcharm")?1.2:1);
if(o.bait==="lure"&&s.lureFor===f.id)w*=8;
wts.push(w);tot+=w;
});
if(tot<=0)return{junk:wk==="sea"?"seaweed":"pondweed",water:wk};
var roll=r()*tot,j=0;while(j<list.length-1&&(roll-=wts[j])>0)j++;
while(wts[j]<=0&&j>0)j--;
var f=list[j];
return{fish:f,size:Math.round(f.min+(f.max-f.min)*Math.pow(r(),1.6)),water:wk};
};
var F=null;
H.line=function(){return F;};
H.reel=function(){F=null;};
H.cast=function(game,c,wx,wz,wkIs){
var hk=Sv().heldKind(c),R=H.RODS[hk];
if(!R||c.tier<2)return{ok:false,msg:"hold a rod or a spear"};
if(F)return{ok:false,msg:"your line is already out"};
var s=st(game),n=(s.casts=(s.casts||0)+1),r=rnd(game,"cast"+n);
var bub=H.bubbling(game,wx,wz),chum=!!(s.chum&&s.chum.until>game.time&&SB.dist(s.chum.x,s.chum.z,wx,wz)<9),bait=null;
if(R.line){if(Sv().count(c,"lure",true)&&s.lureFor)bait="lure";else if(Sv().count(c,"bait",true))bait="bait";if(bait)Sv().take(c,bait,1);}
var tk=R.line&&c.tackle&&c.tackle.k&&H.TACKLE[c.tackle.k]?c.tackle.k:null,far=R.line&&!wkIs&&SB.dist(c.x,c.z,wx,wz)>=4;
if(wkIs==="vent"&&tk!=="emberhook"){s.casts--;return{ok:false,msg:"the vent pool would eat a plain hook. tie on an ember hook"};}
if(tk&&--c.tackle.n<=0)c.tackle=null;
var res=H.rollCatch(game,c,{x:wx,z:wz,tool:hk,bait:bait,bubbles:bub,r:r,wk:wkIs,far:far});
var wait=(R.line?3+r()*4.5:1.2+r()*1.5)*(bait?0.55:1)*(bub?0.6:1)*(chum?0.6:1)*(tk==="spinner"?0.7:1)*(1-Math.min(0.4,bonus(c,"fish")*0.8));
var rar=res.fish?res.fish.rare:1;
var mv=res.fish&&H.MOVES?H.MOVES[res.fish.id]||"steady":"steady";
var win=Math.max(0.4,R.win+(lv(c,"fish")>=2?0.15:0)+(H.has(c,"keen",game)?0.35:0)-(rar-1)*0.14+(tk==="float"?0.3:0)+(H.worn&&H.worn(c,"fisherhat")?0.25*H.worn(c,"fisherhat"):0)-(H.has(c,"tipsy",game)?0.25:0))*(mv==="dart"?0.75:1);
if(far&&res.fish)res.size=Math.min(res.fish.max,Math.round(res.size*1.1));
if(mv==="dart"&&res.fish)res.size=Math.min(res.fish.max,Math.round(res.size*1.15));
F={cid:c.id,x:c.x,z:c.z,wx:wx,wz:wz,phase:"wait",t:wait,at:0,win:win,res:res,tool:hk,bait:bait,bubbles:bub,spooks:0,move:mv,nib:mv==="nibble"?1:0,fights:mv==="fight"&&tk!=="strongline"?1:0,far:far};
emit("fishCast",{c:c,water:res.water,bait:bait,bubbles:bub});
return{ok:true,wait:wait,win:win,msg:(R.line?"🎣 the float sits on the "+res.water:"🔱 you stand over the "+res.water+", spear up")+(bait?" ("+label(bait)+" on)":"")+(far?". a long cast: the better fish are out there":"")+(bub?". bubbles: they're biting here":"")+". wait for the bite…"};
};
function fishTick(game,dt){
if(!F)return;
var P=Ps(),c=P&&P.active?P.c:null;
if(!c||c.id!==F.cid||!c.alive){F=null;return;}
if(SB.dist(c.x,c.z,F.x,F.z)>2.5){F=null;say("you wandered off. the line went slack");return;}
if(Sv().heldKind(c)!==F.tool){F=null;return;}
if(F.phase==="wait"){
if((F.t-=dt)<=0&&F.nib>0){F.nib--;F.t=0.9;say("…a nibble. not yet");emit("fishNibble",{c:c});}
else if(F.t<=0){F.phase="bite";F.at=0;say("❗ a bite! hook it!");sound("chime");if(SB.FX&&SB.FX.burst)SB.FX.burst("sparkle",F.wx,SB.World.groundY(game.world,F.wx,F.wz)+0.1,F.wz,8);emit("fishBite",{c:c});}
}else if((F.at+=dt)>F.win){F=null;say("…too slow. it got away");xp(c,"fish",1);emit("fishAway",{c:c});}
}
H.pull=function(game,c){
if(!F||F.cid!==c.id)return{ok:false,msg:""};
if(F.phase==="wait"){F.t=Math.max(F.t,1.2);F.spooks++;return{ok:false,early:true,msg:F.spooks===1?"shh. keep still until it bites":""};}
if(F.fights>0){F.fights--;F.phase="wait";F.t=0.7;F.at=0;emit("fishFight",{c:c});return{ok:false,again:true,msg:"💪 it fights! keep the line tight and hook it again"};}
var f=F;F=null;
return H.land(game,c,f);
};
H.land=function(game,c,f){
var s=st(game),res=f.res,perfect=f.at<=f.win*0.35,v=Sv().inv(c),msg;
if(K[f.tool]&&v.s[v.sel]&&v.s[v.sel].k===f.tool)Sv().wear(c,game,v.sel,1);
if(res.crate){
var r=rnd(game,"crate"+(s.crates=(s.crates||0)+1)),got=[["metal",1+Math.floor(r()*2)],["plank",2],["s_starmelon",1+Math.floor(r()*2)]];
if(r()<0.3&&K.axe)got.push(["axe",1]);
got.forEach(function(g){give(game,c,g[0],g[1]);});
xp(c,"fish",4);
emit("fishCrate",{c:c,got:got});
return{ok:true,crate:true,got:got,msg:"🧰 you hooked a sunk pod crate! "+got.map(function(g){return g[1]+" "+label(g[0]);}).join(", ")};
}
if(res.junk){
give(game,c,res.junk,1);s.junk=(s.junk||0)+1;xp(c,"fish",1);
emit("fishJunk",{c:c,kind:res.junk});
return{ok:true,junk:res.junk,msg:"you hooked… "+(res.junk==="oldboot"?"an old boot. whose?":res.junk==="stick"?"a stick":label(res.junk))};
}
var fi=res.fish,size=perfect?Math.min(fi.max,Math.round(res.size*1.12)):res.size,e=s.fish[fi.id]||(s.fish[fi.id]={n:0,best:0,d:day(game)});
var first=e.n===0,record=!first&&size>e.best,n=1;
if(fi.rare===1&&lv(c,"fish")>=6&&SB.Body&&SB.Body.roll(c,"fish"))n=2;
e.n+=n;if(size>e.best)e.best=size;
give(game,c,fi.id,n);
xp(c,"fish",(perfect?2:0)+(fi.rare-1)*2);
emit("fish",{c:c});
emit("fishCaught",{c:c,id:fi.id,size:size,perfect:perfect,first:first,great:fi.rare===4,n:n});
msg=fi.emoji+" "+(fi.rare===4?"you caught "+fi.label+"! ":(/^[aeiou]/.test(fi.label)?"an ":"a ")+fi.label+(n>1?" (and another!)":"")+", ")+size+" cm"+(perfect?" · a perfect hook":"")+(first?" · a new one for the fish log":record?" · your biggest yet":"");
return{ok:true,fish:fi.id,size:size,perfect:perfect,first:first,n:n,msg:msg};
};
H.chum=function(game,c,wx,wz){
if(!Sv().count(c,"bait",true))return{ok:false,msg:"no bait to throw"};
Sv().take(c,"bait",1);
st(game).chum={x:r1(wx),z:r1(wz),until:game.time+300};
return{ok:true,msg:"you scatter bait on the water. the fish here will bite faster for a while"};
};
H.catchBug=function(game,c,it){
if(!it||it.gone)return{ok:false,msg:""};
if(SB.dist(c.x,c.z,it.x,it.z)>2.6)return{ok:false,msg:"get closer. slowly"};
SB.World.remove(game.world,it);
give(game,c,"bait",2);
return{ok:true,msg:"got it! 2 bait"};
};
function struct(id,noun,lab,emoji,r,cost,desc){if(!SK[id])SK[id]={noun:noun,label:lab,emoji:emoji,r:r,cost:cost,work:1,desc:desc};}
["","1","2","3"].forEach(function(sfx){struct("gardenbed"+sfx,"material","garden bed","🟫",0.5,{},"tilled by hand. sow it, water it, harvest it.");});
H.MACH={
dryrack:{label:"drying rack",emoji:"🧵",r:0.6,cost:{stick:4,vine:1},time:300,cap:4,word:"drying",takes:"fruit, fish or meat",make:function(k){return GROUPS["fruit*"].is(k)?["driedfruit",1]:GROUPS["fish*"].is(k)||k==="meat"?["jerky",1]:null;},desc:"fruit, fish and meat dry here into food that never goes bad."},
smoker:{label:"smoker",emoji:"♨️",r:0.6,cost:{stone:3,stick:2},time:220,cap:4,word:"smoking",takes:"fish, meat or crab",make:function(k){return GROUPS["fish*"].is(k)||k==="meat"||k==="crab"||k==="clam"?["smokedfish",1]:null;},desc:"smokes fish so it feeds more and keeps for ages."},
crock:{label:"crock",emoji:"🏺",r:0.5,cost:{clay:3},time:400,cap:4,word:"working",takes:"fruit, roots and pods, or honeycomb",make:function(k){return k==="banana"&&K.wobbly?["wobbly",1]:k==="roe"&&K.caviar?["caviar",1]:GROUPS["fruit*"].is(k)?["jam",1]:GROUPS["veg*"].is(k)?["pickles",1]:k==="honey"?["fizz",1]:null;},desc:"a big clay jar. fruit turns to jam, roots to pickles, honeycomb to honey fizz."},
quern:{label:"quern",emoji:"⚙️",r:0.5,cost:{stone:4,stick:1},time:120,cap:6,word:"grinding",takes:"grain, marsh rice, or fish (for compost)",make:function(k){return k==="grain"||k==="rice"?["flour",1]:k==="crystal"&&K.dust?["dust",4]:GROUPS["fish*"].is(k)?["compost",2]:null;},desc:"two stones that grind grain into flour, and fish into compost."},
heap:{label:"compost heap",emoji:"🟤",r:0.6,cost:{stick:3,leaves:3},time:240,cap:6,word:"rotting down",takes:"scraps: any food, leaves, weed, an old boot",make:function(k){return k==="leaves"||GROUPS["scrap*"].is(k)?["compost",1]:null;},desc:"scraps in, compost out."},
beebox:{label:"bee box",emoji:"🐝",r:0.5,cost:{stick:4,honey:1},time:700,cap:2,gen:"honey",word:"the bees are busy",desc:"a hive you keep. honeycomb now and then (not in winter), and beds nearby grow faster."},
crabpot:{label:"crab pot",emoji:"🧺",r:0.45,cost:{fiber:3,stick:2},time:520,cap:2,gen:"crab",water:2.6,word:"waiting",desc:"a woven trap. set it at the water's edge and come back later. bait makes it quicker."},
scarecrow:{label:"scarecrow",emoji:"🧑‍🌾",r:0.4,cost:{stick:3,leaves:2,fiber:1},helper:1,reach:7,desc:"keeps the birds off every garden bed within seven steps."},
sprinkler:{label:"water pipe",emoji:"🎋",r:0.4,cost:{stick:4,fiber:2},helper:1,reach:3.6,water:10,desc:"hollow sticks from the nearest water. keeps every bed within three steps watered."}
};
for(var mk in H.MACH)struct(mk,"material",H.MACH[mk].label,H.MACH[mk].emoji,H.MACH[mk].r,H.MACH[mk].cost,H.MACH[mk].desc);
H.MAX_BEDS=30;
function isBed(b){return!!b&&typeof b.kind==="string"&&b.kind.indexOf("gardenbed")===0;}
H.isBed=isBed;
H.beds=function(game){return game.world.structures.filter(isBed);};
function free(game,x,z,r,c){
var W=SB.World,w=game.world,ok=true;
if(!W.walkable(w,x,z,false)||W.depthAt(w,x,z)>0.02)return false;
if(W.isSeen&&!W.isSeen(w,x,z))return false;
if(c&&SB.dist(c.x,c.z,x,z)<r+0.35)return false;
for(var i=0;i<w.structures.length;i++){var o=w.structures[i];if(SB.dist(x,z,o.x,o.z)<r+(SK[o.kind]?SK[o.kind].r:0.6)+0.12)return false;}
W.eachNodeNear(w,x,z,r+1.2,function(n){if(!n.nop&&n.state!=="gone"&&SB.dist(n.x,n.z,x,z)<r+(NK[n.kind]?NK[n.kind].r:0.4)*(n.s||1)*0.7)ok=false;});
return ok;
}
H.spot=function(game,c,r,needWater){
var P=Ps(),ag=P&&P.active&&P.c===c&&P.aimGround?P.aimGround(game,c,5):null;
var d0=r+1.1,sx=ag&&!ag.far?ag.x:c.x+Math.sin(c.facing||0)*d0,sz=ag&&!ag.far?ag.z:c.z+Math.cos(c.facing||0)*d0;
function good(x,z){return free(game,x,z,r,c)&&(!needWater||!!waterNear(game,x,z,needWater));}
if(good(sx,sz))return{x:sx,z:sz};
for(var rr=0.7;rr<=(needWater?6:4.2);rr+=0.7)for(var k=0;k<8;k++){var a=k*0.785,x=sx+Math.sin(a)*rr,z=sz+Math.cos(a)*rr;if(SB.dist(x,z,c.x,c.z)<7&&good(x,z))return{x:x,z:z};}
return null;
};
function put(game,c,kindId,x,z,data){
var b={id:SB.Game.newId(game),type:"struct",kind:kindId,noun:SK[kindId].noun,x:r1(x),z:r1(z),rot:isBed({kind:kindId})?0:(hashKey(kindId+":"+r1(x)+":"+r1(z))%628)/100,s:1,
done:true,work:0,need:{},tribe:c&&c.tribe?c.tribe:0,builders:[],data:data||{},born:game.time,name:null};
game.world.structures.push(b);mark(game,b);
return b;
}
H.remove=function(game,c,b){
if(!b)return{ok:false,msg:""};
var m=H.MACH[b.kind],d=b.data||{};
if(m&&(d.n>0||(d.box&&(Array.isArray(d.box)?d.box.length:Object.keys(d.box).length))))return{ok:false,msg:"empty it first"};
SB.World.removeStructure(game.world,b);
if(m)for(var k in m.cost)give(game,c,k,m.cost[k]);
emit("harvestRemoved",{c:c,kind:b.kind});
return{ok:true,msg:m?"you take the "+m.label+" down. the pieces are back in your bag":"you rake the bed flat"};
};
H.till=function(game,c,x,z){
if(c.tier<2)return{ok:false,msg:"you need hands to till"};
if(Sv().heldKind(c)!=="hoe")return{ok:false,msg:"hold a hoe to till a bed"};
if(H.beds(game).length>=H.MAX_BEDS)return{ok:false,msg:"that's as many beds as one island's smols can keep ("+H.MAX_BEDS+")"};
var p=x!=null&&free(game,x,z,0.5,c)?{x:x,z:z}:H.spot(game,c,0.5);
if(!p)return{ok:false,msg:"no room for a bed here: it needs open, dry ground"};
var soil=H.soilAt?H.soilAt(game,p.x,p.z):1;
var b=put(game,c,"gardenbed",p.x,p.z,{g:0,wet:raining(game)?200:0,soil:soil}),v=Sv().inv(c);
Sv().wear(c,game,v.sel,1);xp(c,"farm",2);
emit("bedTilled",{c:c,st:b});
return{ok:true,st:b,msg:"🟫 a garden bed"+(H.soilWord&&H.soilWord(soil)?" in "+H.soilWord(soil):"")+". hold seeds and look at it to sow"};
};
function wildCrop(game,b){var se=season(game),pool=H.CROPS.filter(function(cr){return!cr.found&&cr.s.indexOf(se)>=0;});return pool.length?pool[Math.floor(rnd(game,"wild"+b.id+":"+day(game))()*pool.length)]:null;}
function beesNear(game,b){
var yes=false;
SB.World.eachNodeNear(game.world,b.x,b.z,8,function(n){if(n.kind==="hive"&&n.state!=="gone")yes=true;});
return yes||SB.World.structsNear(game.world,b.x,b.z,8,function(o){return o.kind==="beebox";}).length>0;
}
H.sow=function(game,c,b,seedKind){
var d=b&&b.data;
if(!isBed(b)||!d)return{ok:false,msg:""};
if(d.crop)return{ok:false,msg:"something is growing here already"};
var cr=seedKind==="seed"?wildCrop(game,b):CROP_SEED[seedKind],se=season(game);
if(!cr)return{ok:false,msg:seedKind==="seed"?"nothing wild will come up in "+SEASON[se]+". glowcap and snowbulb beds grow in winter":"those aren't seeds"};
var whyG=H.whyNotGrow?H.whyNotGrow(game,b,cr):cr.s.indexOf(se)<0?cr.label+" won't grow in "+SEASON[se]+": sow it in "+seasonsText(cr.s):"";
if(whyG)return{ok:false,msg:whyG};
if(!Sv().take(c,seedKind,1).length)return{ok:false,msg:"no seeds"};
d.crop=cr.id;d.g=0.02;d.age=0;d.care=0;d.dead=0;d.q=0;d.giant=0;d.pecked=0;
d.sk=bonus(c,"farm");d.paddy=waterNear(game,b.x,b.z,2.6)?1:0;d.bee=beesNear(game,b)?1:0;
if(H.inGlass&&H.inGlass(game,b))d.soil=Math.max(d.soil||1,1.1);
restage(game,b);xp(c,"farm",1);
emit("bedSown",{c:c,st:b,crop:cr.id});
return{ok:true,crop:cr.id,msg:"🌱 "+cr.label+(seedKind==="seed"?" came out of the wild seeds":"")+", sown. "+(cr.damp?"it needs no watering":d.paddy&&cr.paddy?"the water beside it will do the watering":"keep it watered: a pot or a leaf cup, or rain")};
};
H.water=function(game,c,b){
var d=b&&b.data;
if(!isBed(b)||!d)return{ok:false,msg:""};
if((c.sip||0)<=0)return{ok:false,msg:"nothing to water with: fill a pot or a leaf cup at any water"};
if(d.wet>120)return{ok:false,msg:"this bed is still wet"};
c.sip--;
var wetFor=400*(lv(c,"farm")>=2?1.5:1)*(H.has(c,"green",game)?2:1),more=0;
d.wet=wetFor;
if(Sv().heldKind(c)==="pot")SB.World.structsNear(game.world,b.x,b.z,1.6,function(o){return o!==b&&isBed(o)&&o.data.crop&&!o.data.dead&&!CROP[o.data.crop].damp&&!(o.data.wet>120);}).forEach(function(o){if(c.sip>0){c.sip--;o.data.wet=wetFor;restage(game,o);more++;}});
restage(game,b);xp(c,"farm",1+more);
emit("bedWatered",{c:c,st:b,more:more});
return{ok:true,more:more,msg:"💧 watered"+(more?", and "+more+" beside it":"")+" ("+c.sip+" left)"};
};
H.fill=function(game,c){
var hk=Sv().heldKind(c),cap=H.WATER[hk];
if(!cap)return{ok:false,msg:"hold a pot or a leaf cup"};
if((c.sip||0)>=cap)return{ok:false,msg:"it's full"};
c.sip=cap;
return{ok:true,msg:"💧 full: "+cap+" waterings"};
};
H.feed=function(game,c,b){
var d=b&&b.data;
if(!isBed(b)||!d)return{ok:false,msg:""};
if(d.fert)return{ok:false,msg:"this bed is well fed already"};
if(!Sv().take(c,"compost",1).length)return{ok:false,msg:"no compost"};
d.fert=1;
if(d.crop&&!d.dead&&d.g<1)d.g=Math.min(0.99,d.g+0.15);
restage(game,b);xp(c,"farm",1);
emit("bedFed",{c:c,st:b});
return{ok:true,msg:"🟤 compost dug in: it grows faster, and comes up better"};
};
function stageOf(d){return!d.crop?0:d.dead?1:d.g>=1?3:d.g>=0.45?2:1;}
H.ripe=function(b){return isBed(b)&&!!b.data.crop&&!b.data.dead&&b.data.g>=1;};
function restage(game,b){
var d=b.data,sg=stageOf(d),k="gardenbed"+(sg||""),s=d.giant&&sg===3?1.5:1,tint=d.dead?"d":d.wet>0?"w":"";
var sig=k+s+tint;
b.kind=k;b.noun=SK[k].noun;b.s=s;
if(tint==="d")b.tint=[0.62,0.52,0.42];else if(tint==="w")b.tint=[0.8,0.76,0.74];else b.tint=null;
if(b._sig!==sig){b._sig=sig;mark(game,b);}
}
function ripen(game,b){
var d=b.data,cr=CROP[d.crop],P=Ps(),me=P&&P.active?P.c:null;
var ratio=cr.damp?1:d.care/Math.max(1,d.age),q=ratio>=0.9&&(d.fert||(d.sk||0)>=0.25)?2:ratio>=0.6?1:0;
d.g=1;d.q=q;d.giant=0;
if(cr.giant&&q===2){
var near=SB.World.structsNear(game.world,b.x,b.z,2.7,function(o){return o!==b&&isBed(o)&&o.data.crop===d.crop&&!o.data.dead;}).length;
var p=0.12+Math.min(3,near)*0.1+(me&&H.has(me,"lucky",game)?0.1:0)+((d.sk||0)>=0.3?0.1:0);
if(rnd(game,"giant"+b.id+":"+Math.floor(game.time))()<p)d.giant=1;
}
emit("bedRipe",{st:b,crop:cr.id,q:q,giant:!!d.giant});
}
function growBed(game,b,step,pipes,rain){
var d=b.data,cr=CROP[d.crop];
if(rain)d.wet=Math.max(d.wet||0,200);
for(var i=0;i<pipes.length;i++)if(SB.dist(pipes[i].x,pipes[i].z,b.x,b.z)<=(pipes[i].data.wide?6.6:H.MACH.sprinkler.reach)){d.wet=Math.max(d.wet||0,60);if(pipes[i].data.drip>0&&cr&&!d.dead&&!d.fert){pipes[i].data.drip--;d.fert=1;}break;}
if(cr&&!d.dead&&d.g<1){
if(d.paddy&&cr.paddy)d.wet=Math.max(d.wet||0,60);
var wet=d.wet>0||cr.damp;
var rate=(wet?1:0.3)*(d.fert?1.35:1)*(d.bee?1.15:1)*(d.paddy&&cr.paddy?1.4:1)*(1+(d.sk||0))*(d.soil||1)*(d.trellis?1.25:1)*(game.world.night?(cr.id==="glowcap"||cr.id==="glowgourd"?1.2:0.85):1);
d.age=(d.age||0)+step;if(wet)d.care=(d.care||0)+step;
d.g=Math.min(1,d.g+step/cr.grow*rate);
if(d.g>=1)ripen(game,b);
}
d.wet=Math.max(0,(d.wet||0)-step);
restage(game,b);
}
H.harvest=function(game,c,b){
if(!H.ripe(b))return{ok:false,msg:"not ripe yet"};
var d=b.data,cr=CROP[d.crop],s=st(game),q=d.q||0,sickle=Sv().heldKind(c)==="sickle";
var r=rnd(game,"hv"+b.id+":"+(s.hv=(s.hv||0)+1));
var n=d.giant?6+q:cr.y[0]+Math.floor(r()*(cr.y[1]-cr.y[0]+1))+q;
if(H.has(c,"green",game))n++;
if(sickle)n++;
if(d.trellis)n+=2;
if(H.worn&&H.worn(c,"strawhat"))n++;
var sn=d.giant?2:(lv(c,"farm")>=4||r()<0.35+0.2*q+(sickle?0.2:0))?1:0,giant=!!d.giant;
give(game,c,cr.out,n);give(game,c,cr.seed,sn);
var e=s.crops[cr.id]||(s.crops[cr.id]={n:0,q:0,g:0}),first=e.n===0;
e.n+=n;if(q>e.q)e.q=q;if(giant)e.g++;
xp(c,"farm",3+q+(giant?4:0));
var se=season(game);
if(cr.regrow&&(H.whyNotGrow?!H.whyNotGrow(game,b,cr):cr.s.indexOf(se)>=0)){d.g=Math.max(0.45,1-cr.regrow/cr.grow);d.age=0;d.care=0;d.q=0;d.giant=0;}
else{d.crop=null;d.g=0;d.fert=0;d.giant=0;d.q=0;d.trellis=0;}
restage(game,b);
emit("bedHarvest",{c:c,st:b,crop:cr.id,n:n,q:q,giant:giant,seeds:sn,first:first});
return{ok:true,crop:cr.id,n:n,q:q,giant:giant,seeds:sn,msg:(giant?"🌟 a GIANT "+label(cr.out)+"! ":"")+n+" "+label(cr.out)+(q?" "+(q===2?"★★":"★"):"")+(sn?" and "+(sn>1?sn+" lots of seeds":"seeds"):"")+(cr.regrow&&d.crop?". it will fruit again":"")};
};
H.reap=function(game,c,b){
var first=H.harvest(game,c,b);
if(!first.ok||Sv().heldKind(c)!=="sickle")return first;
var more=0,v=Sv().inv(c);
SB.World.structsNear(game.world,b.x,b.z,2.7,function(o){return o!==b&&H.ripe(o);}).forEach(function(o){if(H.harvest(game,c,o).ok)more++;});
Sv().wear(c,game,v.sel,1);
if(more)first.msg+=" · the sickle reaped "+more+" more bed"+(more>1?"s":"");
first.more=more;
return first;
};
H.clear=function(game,c,b){
if(!isBed(b))return{ok:false,msg:""};
var d=b.data;d.crop=null;d.dead=0;d.g=0;d.giant=0;d.q=0;d.trellis=0;
restage(game,b);
return{ok:true,msg:"you pull the dead stalks. the bed is ready again"};
};
H.bedText=function(game,b){
var d=b.data,cr=CROP[d.crop];
if(!cr)return"an empty "+(d.pot?"planter":"bed")+(d.fert?" (fed)":"")+(H.soilWord&&H.soilWord(d.soil||1)?" · "+H.soilWord(d.soil||1):"")+": hold seeds to sow it";
if(d.dead)return"withered "+cr.label+": the season turned";
if(d.g>=1)return(d.giant?"a GIANT ":"ripe ")+cr.label+(d.q?" "+(d.q===2?"★★":"★"):"");
var wet=d.wet>0||cr.damp||(d.paddy&&cr.paddy);
return cr.label+": "+(d.g<0.25?"just sown":d.g<0.6?"growing":"nearly ripe")+(wet?"":" · dry! it needs water")+(d.fert?" · fed":"");
};
H.farmCare=function(game,c,f,how,seedKind){
if(!f||f.kind!=="farm"||!f.done)return{ok:false,msg:""};
var d=f.data;
if(how==="sow"){
var cr=CROP_SEED[seedKind];
if(!cr||!Sv().take(c,seedKind,1).length)return{ok:false,msg:"no seeds"};
d.crop=cr.out;xp(c,"farm",2);mark(game,f);
emit("farmSown",{c:c,st:f,crop:cr.id});
return{ok:true,msg:"🌾 the farm will grow "+label(cr.out)+" from now on"};
}
if(how==="water"){
if((c.sip||0)<=0)return{ok:false,msg:"nothing to water with"};
if(d.hvWet&&game.time-d.hvWet<120)return{ok:false,msg:"the farm is still wet"};
c.sip--;d.hvWet=game.time;d.grow=Math.min(1,(d.grow||0)+0.12);
}else{
if(d.hvFed&&game.time-d.hvFed<240)return{ok:false,msg:"the farm is well fed already"};
if(!Sv().take(c,"compost",1).length)return{ok:false,msg:"no compost"};
d.hvFed=game.time;d.grow=Math.min(1,(d.grow||0)+0.25);
}
xp(c,"farm",1);mark(game,f);
emit("farmCared",{c:c,st:f,how:how});
return{ok:true,msg:how==="water"?"💧 the farm drinks it up":"🟤 the farm shoots up"};
};
H.machText=function(b){
var m=H.MACH[b.kind],d=b.data||{};
if(!m)return"";
if(m.helper)return m.label+": "+m.desc;
if(ready(b))return label(d.out)+(d.n>1?" ×"+d.n:"")+" ready";
if(m.gen)return m.word+"… "+(d.t>0?"about "+Math.max(1,Math.ceil(d.t/60))+" min":"soon");
if(d.n>0)return m.word+"… about "+Math.max(1,Math.ceil(d.t/60))+" min";
return"an empty "+m.label+": hold "+m.takes;
};
H.load=function(game,c,b,k){
var m=H.MACH[b.kind],d=b.data,mk2=m&&m.make?m.make(k):null;
if(!mk2)return{ok:false,msg:m?"that doesn't go in a "+m.label+". it takes "+m.takes:""};
if(ready(b))return{ok:false,msg:"take out what's ready first"};
if(d.n>0&&d.out!==mk2[0])return{ok:false,msg:"it's busy making "+label(d.out)};
if((d.n||0)>=m.cap*mk2[1])return{ok:false,msg:"the "+m.label+" is full"};
if(!Sv().take(c,k,1).length)return{ok:false,msg:""};
d.out=mk2[0];d.n=(d.n||0)+mk2[1];d.t=(m.timeOf?m.timeOf(k):m.time)*(lv(c,"cook")>=5?0.8:1)*(SB.World.structsNear(game.world,b.x,b.z,4,function(o){return o.kind==="workbench";}).length?0.75:1);
mark(game,b);
emit("machLoaded",{c:c,st:b,kind:k,out:d.out});
return{ok:true,msg:label(k)+" in the "+m.label+". "+m.word+"…"};
};
H.unload=function(game,c,b){
var m=H.MACH[b.kind],d=b.data;
if(!m||!ready(b))return{ok:false,msg:m?H.machText(b):""};
var k=d.out,n=d.n;
give(game,c,k,n);
if(m.bonus&&K[m.bonus])give(game,c,m.bonus,1);
d.n=0;d.out=null;d.t=m.gen?m.time:0;if(m.gen)d.baited=0;
xp(c,m.gen==="crab"?"fish":m.gen?"farm":"cook",2);
if(FISH_BY[k]){var e=st(game).fish[k]||(st(game).fish[k]={n:0,best:0,d:day(game)});e.n+=n;if(!e.best)e.best=FISH_BY[k].min+2;}
mark(game,b);
emit("machTaken",{c:c,st:b,kind:k,n:n});
return{ok:true,kind:k,n:n,msg:"you take "+n+" "+label(k)+" from the "+m.label};
};
H.baitPot=function(game,c,b){
var d=b.data;
if(b.kind!=="crabpot"||d.baited)return{ok:false,msg:"it's baited already"};
if(!Sv().take(c,"bait",1).length)return{ok:false,msg:"no bait"};
d.baited=1;d.t=Math.min(d.t||0,H.MACH.crabpot.time*0.5);
return{ok:true,msg:"baited. it won't be long now"};
};
function runMach(game,b,step){
var m=H.MACH[b.kind],d=b.data;
if(!m||m.helper)return;
if(m.gen){
if((d.n||0)>=m.cap)return;
if(m.gen==="honey"&&season(game)===3)return;
if(d.t==null)d.t=m.time;
if((d.t-=step)>0)return;
var out=m.gen;
if(m.gen==="crab"){var wn=waterNear(game,b.x,b.z,3),wk=wn?H.waterKind(game,wn.x,wn.z):"pond",r=rnd(game,"pot"+b.id+":"+Math.floor(game.time))();out=r<0.5?"crab":r<0.75?(wk==="sea"?"clam":"minnow"):wk==="sea"?"seaweed":"pondweed";}
if(d.n>0&&d.out!==out)out=d.out;
d.out=out;d.n=(d.n||0)+1;d.baited=0;
d.t=d.n>=m.cap?0:m.time;
mark(game,b);
return;
}
if(d.n>0&&d.t>0){d.t-=step;if(d.t<=0){d.t=0;mark(game,b);emit("machReady",{st:b,kind:d.out,n:d.n});}}
}
function ready(b){var m=H.MACH[b.kind],d=b.data||{};return!!m&&!m.helper&&d.n>0&&(!!m.gen||!(d.t>0));}
H.ready=ready;
function dug(game){var s=st(game),dd=day(game);if(!s.dug||s.dug.d!==dd)s.dug={d:dd,ids:{}};return s.dug;}
H.canForage=function(game,n){
if(!n||n.state!=="ok"||n.grow!=null&&n.grow<1)return false;
if(dug(game).ids[n.id])return false;
var se=season(game);
return!!H.SEED_NODE[n.kind]||H.FORAGE.some(function(f){return f.s===se&&f.nodes.indexOf(n.kind)>=0;})||(!!H.canForage2&&H.canForage2(game,n))||(!!H.fruitOf&&!!H.fruitOf(game,n));
};
H.forage=function(game,c,n){
if(!H.canForage(game,n))return{ok:false,msg:"you've looked here today"};
if(SB.dist(c.x,c.z,n.x,n.z)>4.5)return{ok:false,msg:"get closer"};
dug(game).ids[n.id]=1;
var se=season(game),r=rnd(game,"fg"+n.id+":"+day(game)),s=st(game),lucky=(H.has(c,"lucky",game)?0.15:0)+luck3(c,game),got=null;
var fl=bonus(c,"forage");
H.FORAGE.forEach(function(f){if(!got&&f.s===se&&f.nodes.indexOf(n.kind)>=0&&r()<f.p+lucky+fl*0.4)got=f.id;});
if(!got&&H.SEED_NODE[n.kind]&&r()<0.4+lucky+fl*0.4)got=H.SEED_NODE[n.kind];
xp(c,"forage",1);
if(!got&&forage2)got=forage2(game,c,n);
var fr=H.fruitOf?H.fruitOf(game,n):null;
if(fr){give(game,c,fr.k,fr.n);if(!got){emit("foraged",{c:c,kind:fr.k,node:n});return{ok:true,found:fr.k,msg:"an old tree gives more: "+fr.n+" "+label(fr.k)};}}
if(!got)return{ok:true,found:null,msg:se===3?"you dig under the snow. nothing here today":"you poke about. nothing here today"};
give(game,c,got,1);
s.forage[got]=(s.forage[got]||0)+1;
emit("foraged",{c:c,kind:got,node:n});
return{ok:true,found:got,msg:(se===3?"under the snow: ":"you found ")+(CROP_SEED[got]?label(got):(/^[aeiou]/.test(label(got))?"an ":"a ")+label(got))+"!"+(s.forage[got]===1&&!CROP_SEED[got]?" ("+SEASON[se]+" only)":"")};
};
H.tapState=function(game,n){
var t=st(game).taps[n.id];
if(t==null)return null;
return(game.time-t)>=H.TAP_SECS?"ready":"dripping";
};
H.tap=function(game,c,n){
if(!n||!H.TAP_TREES[n.kind]||n.state!=="ok")return{ok:false,msg:"that won't give sap"};
if(st(game).taps[n.id]!=null)return{ok:false,msg:"this tree is tapped already"};
if(!Sv().take(c,"tapper",1).length)return{ok:false,msg:"you need a tree tap"};
st(game).taps[n.id]=game.time;
emit("treeTapped",{c:c,node:n});
return{ok:true,msg:"tapped. come back in a while for the sap"};
};
H.collectSap=function(game,c,n){
if(H.tapState(game,n)!=="ready")return{ok:false,msg:"still dripping. come back later"};
st(game).taps[n.id]=game.time;
give(game,c,"sap",n.kind==="maple"?2:1);xp(c,"forage",2);
return{ok:true,msg:"🍯 sweet sap"+(n.kind==="maple"?" (maples give double)":"")};
};
H.nearFire=function(game,c){
var s=game.world.structures;
for(var i=0;i<s.length;i++)if(s[i].done&&(s[i].kind==="campfire"||s[i].kind==="kiln")&&s[i].data&&s[i].data.lit&&SB.dist(s[i].x,s[i].z,c.x,c.z)<3.8)return true;
return!!(SB.Home&&SB.Home.has&&SB.Home.has(game,"hearth")&&SB.Home.at(game,c));
};
H.knows=function(game,c,id){var d=DISH[id];return!!d&&(!!st(game).dishes[id]||d.lvl<=lv(c,"cook"));};
H.whyNotCook=function(game,c,id){
var d=DISH[id];
if(!d)return"that's not a dish";
if(c.tier<2)return"it takes hands to cook";
if(lacks(c,d.in))return"it needs "+H.costText(d.in);
if(d.pot&&!Sv().count(c,"pot",true))return"it needs a pot";
if(d.snow&&!(H.snowy&&H.snowy(game,c)))return"it needs snow: winter, or the snowfield";
if(!d.cold&&!H.nearFire(game,c))return"cook it by a lit fire, a kiln or your hearth";
return"";
};
H.cook=function(game,c,id){
var why=H.whyNotCook(game,c,id),d=DISH[id],Id=SB.Ideas;
if(why)return{ok:false,msg:why};
for(var k in d.in)takeOf(c,k,d.in[k]);
if(Id&&!d.cold&&!Id.known(c,"cook")&&Id.canHold(c,"cook")){try{if(!game.culture.found.cook)Id.discover(c,"cook",game);else Id.learn(c,"cook",1,game,"figured out");}catch(e){}}
var s=st(game),e=s.dishes[id],first=!e,n=1;
if(!e)e=s.dishes[id]={n:0,d:day(game)};
if(SB.Body&&SB.Body.roll(c,"cook"))n=2;
e.n+=n;
give(game,c,id,n);
xp(c,"cook",3);if(SB.Body)SB.Body.count(c,"cooked");
emit("dishCooked",{c:c,id:id,first:first,n:n});
return{ok:true,first:first,n:n,msg:d.emoji+" "+d.label+(n>1?" ×2: you made it stretch":"")+(first?"! a new one for the cookbook":"")};
};
H.cookable=function(game,c){return H.DISHES.filter(function(d){return!H.whyNotCook(game,c,d.id);});};
function holdsSome(c,d){for(var k in d.in)if(countOf(c,k)>0)return true;return false;}
H.CRAFTS=[
{id:"hoe",out:"hoe",n:1,cost:{stick:2,stone:1,vine:1}},
{id:"dipper",out:"dipper",n:1,cost:{leaves:2,vine:1}},
{id:"sickle",out:"sickle",n:1,cost:{flint:1,stick:1,vine:1}},
{id:"finerod",out:"finerod",n:1,cost:{rod:1,stick:2,fiber:2}},
{id:"bait",out:"bait",n:3,cost:{"meat*":1},note:"or catch a beetle or a flutterby"},
{id:"lure",out:"lure",n:3,cost:{"fish*":1,fiber:1},note:"draws more of the fish you made it from"},
{id:"compost",out:"compost",n:2,cost:{leaves:3,"scrap*":1}},
{id:"tapper",out:"tapper",n:1,cost:{stick:1,flint:1}}
];
for(var mk3 in H.MACH)H.CRAFTS.push({id:mk3,build:mk3,cost:H.MACH[mk3].cost,note:H.MACH[mk3].desc});
var CRAFT={};H.CRAFTS.forEach(function(x){CRAFT[x.id]=x;});
H.whyNotMake=function(game,c,id){
var x=CRAFT[id];
if(!x)return"nobody knows how to make that";
if(c.tier<2)return"it takes hands: a tool-user and up";
for(var ck in x.cost)if(!GROUPS[ck]&&!K[ck])return"nobody on this island has found what that takes yet";
if(lacks(c,x.cost))return"it needs "+H.costText(x.cost);
return H.whyNotHere?H.whyNotHere(game,c,x):"";
};
H.make=function(game,c,id){
var why=H.whyNotMake(game,c,id),x=CRAFT[id];
if(why)return{ok:false,msg:why};
if(x.build){
var m=H.MACH[x.build],p=H.spot(game,c,m.r,m.water||0);
if(!p)return{ok:false,msg:m.water?"it has to stand near water"+(x.build==="sprinkler"?" (within ten steps)":": go to the edge"):"no room here: it needs open, dry ground"};
for(var k in x.cost)takeOf(c,k,x.cost[k]);
var b=put(game,c,x.build,p.x,p.z,m.gen?{n:0,t:m.time}:{});
if(m.born)m.born(game,c,b);
emit("harvestBuilt",{c:c,st:b});
return{ok:true,st:b,msg:m.emoji+" a "+m.label+", just ahead of you. "+m.desc};
}
if(x.bed){
if(H.beds(game).length>=H.MAX_BEDS)return{ok:false,msg:"that's as many beds as one island's smols can keep ("+H.MAX_BEDS+")"};
var pp=H.spot(game,c,0.5);
if(!pp)return{ok:false,msg:"no room here: it needs open, dry ground"};
for(var kb in x.cost)takeOf(c,kb,x.cost[kb]);
var pb=put(game,c,"gardenbed",pp.x,pp.z,{g:0,wet:0,soil:1.1,pot:1});
emit("bedTilled",{c:c,st:pb});
return{ok:true,st:pb,msg:"🪴 a planter. hold seeds and look at it to sow"};
}
var taken={};
for(var k2 in x.cost)taken[k2]=takeOf(c,k2,x.cost[k2]);
if(id==="lure")st(game).lureFor=taken["fish*"][0];
give(game,c,x.out,x.n);
if(K[x.out].tool&&bonus(c,"craft")){var v=Sv().inv(c);for(var i=0;i<v.s.length;i++)if(v.s[i]&&v.s[i].k===x.out&&v.s[i].w===Sv().uses(x.out)){v.s[i].w=Math.round(Sv().uses(x.out)*(1+bonus(c,"craft")));break;}}
var wq=H.WEAR&&H.WEAR[x.out]?H.stampWear(game,c,x.out):-1;
st(game).last=id;
xp(c,"craft",2);
emit("harvestMade",{c:c,kind:x.out,n:x.n,q:wq});
return{ok:true,q:wq,msg:"made "+(x.n>1?x.n+" ":"a ")+(wq>=0&&wq!==1?["shoddy ","","fine ","masterwork "][wq]:"")+label(x.out)+(id==="lure"?" for "+label(st(game).lureFor):"")};
};
H.saveSeeds=function(game,c,out){
var cr=CROP_OUT[out];
if(!cr||c.tier<2)return{ok:false,msg:"no seeds in that"};
if(!Sv().take(c,out,1).length)return{ok:false,msg:"you have none"};
give(game,c,cr.seed,2);xp(c,"farm",1);
return{ok:true,msg:"2 "+label(cr.seed)+" saved from a "+label(out)};
};
var acc=0;
H.slow=function(game,step){
var sts=game.world.structures,pipes=[],rain=raining(game),i;
for(i=0;i<sts.length;i++)if(sts[i].kind==="sprinkler")pipes.push(sts[i]);
for(i=0;i<sts.length;i++){
var b=sts[i];
if(!b.data)continue;
if(isBed(b))growBed(game,b,step,pipes,rain);
else if(H.MACH[b.kind])runMach(game,b,step);
}
if(H.slow2)H.slow2(game,step);
};
H.tick=function(game,dt){
if(!game||game.offline||!game.world)return;
if(!linked.all&&(linked.tries=(linked.tries||0)+1)<600)linked.all=H.link();
fishTick(game,dt);
buffTick(game,dt);
if(H.tick2)H.tick2(game,dt);
if((acc+=dt)<2)return;
var step=acc;acc=0;
H.slow(game,step);
};
H.dawn=function(game){
var crows=SB.World.structsNear(game.world,0,0,1e9,function(o){return o.kind==="scarecrow";}),pecked=0,dd=day(game);
H.beds(game).forEach(function(b){
var d=b.data;
d.bee=beesNear(game,b)?1:0;
if(!d.crop||d.dead||d.pot||CROP[d.crop].damp||d.crop==="snapper")return;
for(var i=0;i<crows.length;i++)if(SB.dist(crows[i].x,crows[i].z,b.x,b.z)<=H.MACH.scarecrow.reach)return;
if(rnd(game,"crow"+b.id+":"+dd)()<0.2){d.g=Math.max(0.05,d.g-0.35);d.q=0;d.giant=0;d.pecked=dd;pecked++;restage(game,b);}
});
if(pecked){emit("bedsPecked",{n:pecked});say("🐦 birds got at "+pecked+" of your beds in the night. a scarecrow would stop that");}
return pecked;
};
H.turn=function(game){
var se=season(game),n=0;
H.beds(game).forEach(function(b){
var d=b.data,cr=CROP[d.crop];
if(!cr||d.dead||d.g>=1||cr.s.indexOf(se)>=0||(H.inGlass&&H.inGlass(game,b)))return;
d.dead=1;d.giant=0;n++;restage(game,b);
});
if(n){emit("bedsWithered",{n:n,season:se});say("🍂 "+SEASON[se]+": "+n+" of your beds withered. pull the stalks and sow something for the season");}
return n;
};
function done(x,r,snd){if(r&&r.msg)x.say(r.msg);if(r&&r.ok&&snd)x.audio(snd,0.7);return!!(r&&r.ok);}
H.options=function(game,c,r,o,x){
if(!c||c.tier<2||!Sv())return;
var hk=x.hk,op=x.op,no=x.no,s=st(game);
if(F&&F.cid===c.id){
o.use=op(F.phase==="bite"?"hook it!":"wait for a bite",function(){var rr=H.pull(game,c);if(rr.msg)x.say(rr.msg);if(rr.ok){if(x.swing)x.swing();x.audio(rr.first||rr.crate?"achievement":"craft",0.7);}return rr.ok;},null);
if(!r||r.type==="water")o.pick=null;
return;
}
if(r&&r.type==="water"){
if(H.RODS[hk])o.use=op("cast your line",function(){var rr=H.cast(game,c,r.x!=null?r.x:c.x,r.z!=null?r.z:c.z);if(x.swing)x.swing();x.say(rr.msg);return rr.ok;},null);
else if(H.WATER[hk])o.use=(c.sip||0)>=H.WATER[hk]?no("your "+label(hk)+" is full of water"):op("fill your "+label(hk),function(){return done(x,H.fill(game,c),"craft");},null);
else if(hk==="bait")o.use=op("throw bait in",function(){return done(x,H.chum(game,c,r.x,r.z),"craft");},null);
return;
}
if(r&&r.type==="struct"){
var b=r.ref,d=b.data||{};
if(isBed(b)){
var cr=CROP[d.crop];
if(!cr){
if(hk==="seed"||CROP_SEED[hk])o.use=op("sow "+(hk==="seed"?"wild seeds":CROP_SEED[hk].label),function(){return done(x,H.sow(game,c,b,hk),"build");},null);
else if(hk==="compost"&&!d.fert)o.use=op("dig in compost",function(){return done(x,H.feed(game,c,b),"build");},null);
else o.use=no(H.bedText(game,b));
if(hk==="hoe")o.place=op("rake the bed flat",function(){return done(x,H.remove(game,c,b),"build");},null);
}else if(d.dead)o.use=op("pull the dead stalks",function(){return done(x,H.clear(game,c,b),"build");},null);
else if(d.g>=1){o.use=op("harvest the "+cr.label,function(){if(x.swing)x.swing();var rr=H.reap(game,c,b);return done(x,rr,rr.giant?"achievement":"craft");},null);o.pick=o.use;}
else if(H.WATER[hk]&&!cr.damp)o.use=(c.sip||0)<=0?no("your "+label(hk)+" is empty: fill it at any water"):d.wet>120?no(H.bedText(game,b)+" · wet"):op("water the "+cr.label,function(){return done(x,H.water(game,c,b),"craft");},null);
else if(hk==="compost"&&!d.fert)o.use=op("dig in compost",function(){return done(x,H.feed(game,c,b),"build");},null);
else o.use=no(H.bedText(game,b));
if(o.use&&!o.use.locked&&!o.place)o.place=o.use;
return;
}
var m=H.MACH[b.kind];
if(m){
if(m.helper)o.use=no(H.machText(b));
else if(ready(b)){o.use=op("take the "+label(d.out)+(d.n>1?" ×"+d.n:""),function(){return done(x,H.unload(game,c,b),"craft");},null);o.pick=o.use;}
else if(b.kind==="crabpot"&&hk==="bait"&&!d.baited)o.use=op("bait the pot",function(){return done(x,H.baitPot(game,c,b),"craft");},null);
else if(m.make&&hk&&m.make(hk)&&(!(d.n>0)||(d.out===m.make(hk)[0]&&d.n<m.cap*m.make(hk)[1])))o.use=op("put your "+label(hk)+" in",function(){return done(x,H.load(game,c,b,hk),"craft");},null);
else o.use=no(H.machText(b));
if(!(d.n>0)||m.helper)o.place=op("take the "+m.label+" down",function(){return done(x,H.remove(game,c,b),"build");},null);
else if(o.use&&!o.use.locked)o.place=o.use;
return;
}
if(b.kind==="farm"&&b.done){
if(H.WATER[hk]&&(c.sip||0)>0)o.place=op("water the farm",function(){return done(x,H.farmCare(game,c,b,"water"),"craft");},null);
else if(hk==="compost")o.place=op("feed the farm compost",function(){return done(x,H.farmCare(game,c,b,"feed"),"build");},null);
else if(CROP_SEED[hk])o.place=op("sow "+CROP_SEED[hk].label+" here",function(){return done(x,H.farmCare(game,c,b,"sow",hk),"build");},null);
return;
}
if((b.kind==="campfire"||b.kind==="kiln")&&b.done&&d.lit&&!o.pick&&H.cookable(game,c).length)o.pick=op("cook a dish",function(){page="cook";x.openBag("harvest");return true;},null);
return;
}
if(r&&r.type==="node"){
var n=r.ref,ts=H.TAP_TREES[n.kind]&&n.state==="ok"?H.tapState(game,n):null;
if(ts==="ready")o.pick=op("collect the sap",function(){return done(x,H.collectSap(game,c,n),"craft");},null);
else if(hk==="tapper"&&H.TAP_TREES[n.kind]&&n.state==="ok"&&!ts)o.place=op("tap the "+(NK[n.kind]?NK[n.kind].label:"tree"),function(){return done(x,H.tap(game,c,n),"build");},null);
else if(H.canForage(game,n)&&(!o.place||/^put down/.test(o.place.label||"")))o.place=op(season(game)===3?"dig under the snow":"look for wild food",function(){return done(x,H.forage(game,c,n),"craft");},null);
return;
}
if(r&&r.type==="item"){
if((r.kind==="beetle"||r.kind==="butterfly")&&!o.pick)o.pick=op("catch it for bait",function(){return done(x,H.catchBug(game,c,r.ref),"craft");},null);
return;
}
if(!r&&hk==="hoe"){
var ag=x.state&&x.state.aim?x.state.aim:null;
o.use=op("till a bed here",function(){if(x.swing)x.swing();return done(x,H.till(game,c,ag&&!ag.far?ag.x:null,ag&&!ag.far?ag.z:null),"build");},null);
}
void s;
};
var page="cook";
function esc(s){return String(s).replace(/[&<>"']/g,function(ch){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch];});}
H.found=function(game){
var s=st(game),f=0,d=0,cr=0;
H.FISH.forEach(function(x){if(s.fish[x.id]&&s.fish[x.id].n>0)f++;});
H.DISHES.forEach(function(x){if(s.dishes[x.id])d++;});
H.CROPS.forEach(function(x){if(s.crops[x.id])cr++;});
return{fish:f,fishOf:H.FISH.length,dishes:d,dishesOf:H.DISHES.length,crops:cr,cropsOf:H.CROPS.length,n:f+d+cr,of:H.FISH.length+H.DISHES.length+H.CROPS.length};
};
function needHtml(c,cost,icon){
var out=[];
for(var k in cost){var n=countOf(c,k);out.push("<span class='"+(n>=cost[k]?"ok":"no")+"'>"+(GROUPS[k]?"":icon(k,16)+" ")+Math.min(n,cost[k])+"/"+cost[k]+(GROUPS[k]?" "+esc(GROUPS[k].name):"")+"</span>");}
return"<div class='need'>"+out.join("")+"</div>";
}
H.PERKS={
farm:[[2,"watering lasts half as long again"],[4,"seeds back from every harvest"],[5,"two-star crops without compost"],[6,"more giant crops"]],
cook:[[2,"berry tart and fish pie"],[3,"boosts last a quarter longer"],[4,"gourd soup and fire stew"],[5,"machines work faster for you"],[6,"honey cake and fisher's bowl"],[8,"bean pot and the harvest feast"]],
fish:[[2,"longer to hook a bite"],[5,"far less junk"],[6,"now and then two small fish at once"],[8,"rare fish bite more"]]
};
function cookHtml(game,c,icon){
var s=st(game),fire=H.nearFire(game,c),out="<div class='lbl'>"+(fire?"🔥 you're by a fire: cook away":"cook by a lit fire, a kiln or your hearth")+(Sv().count(c,"pot",true)?" · you have a pot":" · no pot: some dishes need one")+"</div><div class='rlist'>",hidden=0;
H.DISHES.forEach(function(d){
var known=H.knows(game,c,d.id),why=H.whyNotCook(game,c,d.id),e=s.dishes[d.id],bd=d.buff?H.BUFFS[d.buff]:null;
if(!known&&!holdsSome(c,d)){hidden++;return;}
if(known)out+="<div class='rc'><span class='big'>"+d.emoji+"</span><div class='t'>"+esc(d.label)+(d.drink?" <small>(a drink)</small>":"")+"<small>"+(d.fx?esc(d.fx):bd?bd.icon+" "+esc(bd.name)+" "+Math.round(d.secs/60)+" min":"❓ a surprise")+(d.pot?" · pot":"")+(d.cold?" · no fire":"")+(e?" · cooked ×"+e.n:"")+"</small>"+needHtml(c,d.in,icon)+"</div><button class='btn go' data-hvcook='"+d.id+"' "+(why?"disabled":"")+">cook</button></div>";
else out+="<div class='rc'><span class='big'>❓</span><div class='t'>a dish you don't know<small>"+esc(d.riddle)+"</small></div><button class='btn go' data-hvcook='"+d.id+"' "+(why?"disabled":"")+">try it</button></div>";
});
out+="</div>";
if(hidden)out+="<p class='help'>"+hidden+" more to find. carry an ingredient and a hint shows up here.</p>";
return out;
}
function makeHtml(game,c,icon){
var out="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px'>"+H.GROUPS_MAKE.map(function(g){return"<button class='btn"+(makeG===g[0]?" go":"")+"' data-hvg='"+g[0]+"'>"+g[1]+"</button>";}).join("")+"</div><div class='rlist'>";
H.CRAFTS.forEach(function(x){
if(x.g!==makeG)return;
if(x.bed){var wb=H.whyNotMake(game,c,x.id);out+="<div class='rc'><span class='big'>🪴</span><div class='t'>planter<small>"+esc(x.note)+"</small>"+needHtml(c,x.cost,icon)+"</div><button class='btn go' data-hvmake='"+x.id+"' "+(wb?"disabled":"")+">set up</button></div>";return;}
var m=x.build?H.MACH[x.build]:null,k=x.out,why=H.whyNotMake(game,c,x.id);
out+="<div class='rc'><span class='big'>"+(m?m.emoji:icon(k,28))+"</span><div class='t'>"+esc(m?m.label:label(k))+(x.n>1?" ×"+x.n:"")+"<small>"+esc(m?m.desc:(K[k].desc||"")+(x.note?" "+x.note+".":"")+(x.at?" made at "+(x.at==="bench"?"a workbench":x.at==="kiln"?"a lit kiln":"the water")+".":""))+"</small>"+needHtml(c,x.cost,icon)+"</div><button class='btn go' data-hvmake='"+x.id+"' "+(why?"disabled":"")+">"+(m?"set up":"make")+"</button></div>";
});
out+="</div>";
if(makeG!=="hand")return out;
var seeds=[];
H.CROPS.forEach(function(cr){if(CROP_OUT[cr.out]===cr&&Sv().count(c,cr.out,true)>0)seeds.push("<button class='btn' data-hvseed='"+cr.out+"'>"+icon(cr.out,16)+" "+esc(label(cr.out))+" → 2 seeds</button>");});
out+="<div class='lbl'>save seeds from a crop</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>"+(seeds.length?seeds.join(""):"<span class='help'>carry something you grew (or found) and you can thresh it for seeds</span>")+"</div>";
if(SB.Body){
out+="<div class='lbl'>what practice gives you</div>";
["farm","cook","fish"].forEach(function(id){
var l=lv(c,id),sk=SB.Body.BY_ID[id];
out+="<p class='help'><b>"+(sk?sk.emoji+" "+esc(sk.label):id)+" "+l+"</b> · "+H.PERKS[id].map(function(p){return"<span class='"+(l>=p[0]?"ok":"no")+"'>"+p[0]+": "+esc(p[1])+"</span>";}).join(" · ")+"</p>";
});
}
return out;
}
function fishHtml(game,c,icon){
var s=st(game),fd=H.found(game),out="<div class='lbl'>the fish log · "+fd.fish+" of "+fd.fishOf+" kinds"+(s.junk?" · junk "+s.junk:"")+(s.crates?" · crates "+s.crates:"")+(s.lureFor?" · your lures draw "+esc(label(s.lureFor)):"")+"</div><div class='rlist'>";
H.FISH.forEach(function(f){
var e=s.fish[f.id],got=e&&e.n>0;
out+="<div class='rc'><span class='big'>"+(got?f.emoji:"❔")+"</span><div class='t'>"+(got?esc(f.label):"not caught yet")+" <small>("+RARE_WORD[f.rare]+")</small><small>"+(got?"caught ×"+e.n+" · biggest "+e.best+" cm · ":"")+esc(H.fishHint(f))+"</small></div>"+(got?"<span class='ok'>✓</span>":"")+"</div>";
});
return out+"</div>";
}
function cropHtml(game,c,icon){
var s=st(game),fd=H.found(game),beds=H.beds(game),ripe=0,dry=0,se=season(game);
beds.forEach(function(b){var d=b.data,cr=CROP[d.crop];if(H.ripe(b))ripe++;else if(cr&&!d.dead&&!cr.damp&&!(d.wet>0))dry++;});
var out="<div class='lbl'>your beds: "+beds.length+(ripe?" · "+ripe+" ripe":"")+(dry?" · "+dry+" dry":"")+" · it's "+SEASON[se]+((c.sip||0)>0?" · 💧 "+c.sip+" waterings carried":"")+"</div><div class='rlist'>";
H.CROPS.forEach(function(cr){
var e=s.crops[cr.id],now=cr.s.indexOf(se)>=0;
out+="<div class='rc'><span class='big'>"+icon(cr.out,28)+"</span><div class='t'>"+esc(cr.label)+" <small class='"+(now?"ok":"no")+"'>"+esc(seasonsText(cr.s))+"</small><small>"+(e?"grown ×"+e.n+(e.q?" · best "+(e.q===2?"★★":"★"):"")+(e.g?" · giants "+e.g:"")+" · ":"")+(cr.regrow?"fruits again":"one harvest")+(cr.giant?" · can grow giant":"")+(cr.paddy?" · loves wet feet":"")+(cr.damp?" · no watering":"")+(cr.found?" · seeds are found, not wild":"")+"</small></div>"+(e?"<span class='ok'>✓</span>":"")+"</div>";
});
out+="</div><div class='lbl'>found in the wild</div><p class='help'>";
out+=H.FORAGE.map(function(f){return(s.forage[f.id]?"<span class='ok'>"+K[f.id].emoji+" "+esc(label(f.id))+" ×"+s.forage[f.id]+"</span>":"<span class='no'>❔ "+SEASON[f.s]+"</span>");}).join(" · ")+"</p>";
out+="<p class='help'>crops "+fd.crops+"/"+fd.cropsOf+". till a bed with a hoe, sow, water. care gives stars: a bigger harvest. no scarecrow, and the birds come.</p>";
return out;
}
H.html=function(game,c,icon){
icon=icon||function(){return"";};
var fd=H.found(game),tabs=[["cook","🍲 cook "+fd.dishes+"/"+fd.dishesOf],["make","🛠 make"],["fish","🐟 fish "+fd.fish+"/"+fd.fishOf],["crops","🌱 crops "+fd.crops+"/"+fd.cropsOf],["bench","🔨 bench"],["wear","🧥 wear"],["brew","🧪 brew"]];
var out="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px'>"+tabs.map(function(t){return"<button class='btn"+(page===t[0]?" go":"")+"' data-hvpage='"+t[0]+"'>"+t[1]+"</button>";}).join("")+"</div>";
var bf=H.buffs(c,game);
if(bf.length)out+="<div class='lbl'>"+bf.map(function(b){return b.def.icon+" "+esc(b.def.name)+" "+Math.max(1,Math.ceil(b.left/60))+" min";}).join(" · ")+"</div>";
if(c.tier>=2&&(page==="bench"||page==="wear"||page==="brew"))return out+H.html2(game,c,icon,page);
if(c.tier<2&&(page==="cook"||page==="make"||page==="bench"||page==="wear"||page==="brew"))return out+"<p><b>it takes hands.</b> a tool-user and up can fish, till, cook and build these. the logs fill in as you go.</p>";
return out+(page==="make"?makeHtml(game,c,icon):page==="fish"?fishHtml(game,c,icon):page==="crops"?cropHtml(game,c,icon):cookHtml(game,c,icon));
};
H.wire=function(root,game,c,redraw,sayFn){
function fin(r){if(r&&r.msg&&sayFn)sayFn(r.msg);if(r&&r.ok)sound(r.first?"achievement":"craft");redraw();}
root.querySelectorAll("[data-hvpage]").forEach(function(b){b.addEventListener("click",function(){page=b.getAttribute("data-hvpage");redraw();});});
root.querySelectorAll("[data-hvcook]").forEach(function(b){b.addEventListener("click",function(){fin(H.cook(game,c,b.getAttribute("data-hvcook")));});});
root.querySelectorAll("[data-hvmake]").forEach(function(b){b.addEventListener("click",function(){fin(H.make(game,c,b.getAttribute("data-hvmake")));});});
root.querySelectorAll("[data-hvseed]").forEach(function(b){b.addEventListener("click",function(){fin(H.saveSeeds(game,c,b.getAttribute("data-hvseed")));});});
if(H.wire2)H.wire2(root,game,c,redraw,fin);
};
H.setPage=function(p){page=p;};
H.chips=function(game,c){
var out=[];
if(F&&c&&F.cid===c.id)out.push(F.phase==="bite"?{icon:"❗",text:"a bite!",bad:true,tip:"press use now"}:{icon:"🎣",text:"line out",tip:"keep still. press use when it bites"});
H.buffs(c,game).forEach(function(b){out.push({icon:b.def.icon,text:b.def.name+" "+Math.max(1,Math.ceil(b.left/60))+"m",tip:label(b.id)+": "+b.def.tip});});
if(c&&(c.sip||0)>0&&Sv()&&H.WATER[Sv().heldKind(c)])out.push({icon:"💧",text:c.sip+" waterings",tip:"look at a garden bed or a farm to water it"});
return H.chips2?out.concat(H.chips2(game,c)):out;
};
var QF=[0.125,0.25,0.5,0.75],QM=[0.75,1,1.25,1.5],QN=["shoddy","plain","fine","masterwork"],UNIT=0.00006;
function fracOf(w){return typeof w==="number"?w-Math.floor(w):0;}
function baseOf(w){var f=fracOf(w)+1e-7;return f>=0.75?0.75:f>=0.5?0.5:f>=0.25?0.25:f>=0.125?0.125:0;}
function qOf(w){var b=baseOf(w);return b===0.125?0:b===0.5?2:b===0.75?3:1;}
H.qOf=qOf;
H.bits=function(w){
var b=baseOf(w),code=Math.round((fracOf(w)-b)/UNIT);
if(!(code>0))code=0;
return{n:Math.floor(w||0),base:b,gem:code%6,temper:Math.floor(code/6)%3,reps:Math.floor(code/18)%4,heir:Math.floor(code/72)%2};
};
function setBits(sl,t){sl.w=t.n+t.base+(t.gem+6*t.temper+18*t.reps+72*t.heir)*UNIT;return sl.w;}
H.setBits=setBits;
function isTool(k){return!!(K[k]&&K[k].tool);}
function fullOf(sl){return Math.round(Sv().uses(sl.k)*(SB.Fight&&SB.Fight.QUAL?SB.Fight.QUAL[qOf(sl.w)].uses:1));}
function heldTool(c){var sl=Sv().held(c);return sl&&isTool(sl.k)&&typeof sl.w==="number"&&!WEAR[sl.k]&&!TACKLE[sl.k]?sl:null;}
function cur(){return SB.Game&&SB.Game.current;}
function me(){var P=Ps();return P&&P.active?P.c:null;}
function giveW(game,c,k,n,w){if(!K[k]||n<=0)return;var left=Sv().add(c,k,n,w);if(left>0&&Sv().spawn)Sv().spawn(game,k,left,c.x+0.5,c.z+0.3,{by:c.id,w:w});}
function nearStruct(game,c,kindId,r){return SB.World.structsNear(game.world,c.x,c.z,r||3.8,function(b){return b.kind===kindId&&b.done;})[0]||null;}
H.atBench=function(game,c){return!!nearStruct(game,c,"workbench")||!!(SB.Town&&SB.Town.has&&SB.Home&&SB.Town.has(game,"bench")&&SB.Home.at(game,c));};
H.atKiln=function(game,c){return!!Sv().nearKiln&&Sv().nearKiln(c,game);};
function grumpsNear(game,x,z,r,fn){var cs=game.creatures||[];for(var i=0;i<cs.length;i++){var g=cs[i];if(g&&g.alive&&g.species==="grump"&&!g.heldBy&&SB.dist(g.x,g.z,x,z)<=r)fn(g);}}
function bossDown(game){var B=SB.Bosses,s;try{s=B&&B.state?B.state(game):null;}catch(e){s=null;}if(!s||!s.list)return false;for(var k in s.list)if(s.list[k]&&s.list[k].beaten)return true;return false;}
function year(game){return Math.floor((day(game)-1)/(4*(SB.seasonDays?SB.seasonDays(game):2)))+1;}
mat("cloth","seed","cloth","🧵",0xe8dcc0,"reed fibre off a loom. hats, scarves, packs and banners start here.");
mat("leather","seed","leather","🟫",0x9a6a44,"fur tanned with bark, by the water. tough.");
mat("bark","seed","birch bark","📜",0xe6dcc8,"peels off a felled birch. tans fur into leather, and makes a brown dye.");
mat("resin","jar","pine resin","🟡",0xd9a020,"sticky gold from a felled pine. glue, torch fuel, and a stone to set in a tool.");
mat("hardwood","seed","hardwood","🪵",0x6a4424,"the heart of an apple tree, a maple or a jungle giant. handles and benches.");
mat("petals","veg","blossom petals","🌸",0xf5b8d0,"from a blossom tree. a pink dye.");
mat("moss","veg","moss","🟢",0x5a8a4a,"grows on old trees. soft: it lines wraps and feeds a compost heap.");
mat("charcoal","seed","charcoal","⚫",0x2a2a2e,"wood burnt slowly in a pit. one piece fills a fire, and a kiln runs hot on it.");
mat("oil","jar","nut oil","🫗",0xe8d070,"pressed from hardnuts. burns in a lamp for a long time.");
mat("glass","seed","glass","🪟",0xcfeef5,"sand fired in a kiln. windows for a glasshouse, a cover for a lamp.");
mat("sand","seed","sand","🏖",0xf0dca4,"from the beach or a river pan. a kiln turns it into glass.");
mat("goldfleck","seed","gold flecks","✨",0xffd24a,"panned out of river gravel. three of them smelt into gold.");
mat("gold","seed","gold","🥇",0xffc83a,"soft, shiny and quick to work. gold tools are fast and do not last.");
mat("obsidian","seed","obsidian","⬛",0x2a2238,"volcano glass from basalt and steam vents. only a good pick gets it out.");
mat("ochre","seed","ochre","🟧",0xc8643a,"red earth from red rock. it is a dye already.");
mat("cutblock","seed","cut stone","🧱",0xa8a4b0,"rocks squared off at a workbench. cellars, ponds and carvings.");
mat("cutgem","seed","cut crystal","💠",0xc8f4ff,"a thought crystal cut at a workbench. set in a tool it does more than a rough one.");
mat("dust","seed","crystal dust","❇️",0xd8f6ff,"a crystal ground in a quern. a pinch in your bag makes the next dish last half as long again.");
mat("shell","seed","shell","🐚",0xf5e6d8,"picked up on a beach. caps, charms, and a lucky stone for a tool.");
mat("arkpart","tool","ark part","⚙️",0x9ab0c0,"a piece of the old ship, from a wreck or a pod. late things are built around one.");
mat("gloomdust","seed","gloom dust","🌫",0x4a3a5a,"a penned grump sheds it when it is fed or tickled. a black dye, and a bane for a tool.");
food("roe","jar","roe","🫧",0xf2a060,0.15,"fish eggs from a pond you keep. a crock turns them into something grand.",{rots:600});
food("caviar","jar","potted roe","🫙",0x3a3a48,0.5,"roe out of a crock. never goes bad. smols think it very fancy.",{rots:0});
food("cutlet","veg","cutlet","🥩",0xc86a5a,0.35,"meat cut up properly with a blade. two from one.",{raw:true,rots:240,chem:{glucose:0.1,fat:0.25}});
food("stew","bowl","plain stew","🍲",0xb89060,0.55,"whatever went in the stew pot. plain, hot, safe.",{rots:1500});
food("cocoa","veg","cocoa pod","🫘",0x7a4a2a,0.25,"from the jungle. a treat, a hot drink, and a brown dye.",{food:{hunger:-0.25,bored:-0.1}});
food("blinkfruit","veg","blinkfruit","🔹",0x9ad0ff,0.2,"only on the crystal steppe. eat it and you are a few steps ahead of yourself.",{glow:1});
food("ashroot","veg","ashroot","🥀",0x6a4a52,0.1,"an ashlands herb. a third thing in a tonic makes it strong, and you pay for it after.");
mat("emberbloom","veg","emberbloom","🌺",0xff7a2a,"an old flower grown from ruin seeds. a flame-coloured dye.");
food("glowgourd","veg","glow gourd","🎃",0x8af0c0,0.6,"a gourd crossed with a glowcap. it shines.",{glow:1,r:0.2});
food("starberry","veg","starberries","🫐",0xffe27a,0.3,"bramble crossed with star melon. lucky for a little while.");
food("dawnlily","veg","dawn lily","🌼",0xfff6d0,0.15,"it only came back after a captain fell. mends you, and makes a white dye.");
BUFF_OF.starberry={k:"lucky",secs:120,slot:"food"};
BUFF_OF.dawnlily={k:"hearty",secs:300,slot:"food"};
kind("wobbly","jar",{noun:"medicine",label:"wobbly brew",emoji:"🍺",r:0.15,color:0xe8b040,food:{hunger:-0.1,bored:-0.3},chem:{glucose:0.2},rots:0,desc:"sunfruit left in a crock too long. braver and harder-hitting for 4 min, and clumsy with it."});
kind("mead","jar",{noun:"medicine",label:"cellar fizz",emoji:"🍾",r:0.15,color:0xf7e08a,food:{hunger:-0.1,bored:-0.4,lonely:-0.2},chem:{glucose:0.3},rots:0,desc:"honey fizz aged in a cellar. lucky for 10 min."});
kind("nectar","jar",{noun:"medicine",label:"aged nectar",emoji:"🍷",r:0.15,color:0x8a3a8a,food:{hunger:-0.1,bored:-0.3},chem:{glucose:0.3},rots:0,desc:"berry juice aged in a cellar. quick for 8 min."});
BUFF_OF.mead={k:"lucky",secs:600,slot:"drink"};
BUFF_OF.nectar={k:"quick",secs:480,slot:"drink"};
H.BUFFS.tipsy={icon:"🥴",name:"wobbly",tip:"braver, and you hit a little harder. but you wobble, and bites are harder to hook"};
H.BUFFS.glow={icon:"✨",name:"glowing",tip:"mighty, quick and peppy all at once. you will feel flat afterwards"};
BUFF_OF.wobbly={k:"tipsy",secs:240,slot:"drink"};
tool("shears","shears","✂️",0x8a8694,"clip","two flints on a spring of vine. clips leaves, petals and fibre off a plant without felling it.",{wood:0,stone:0,ore:0,dmg:0.3,uses:100});
tool("whetstone","whetstone","🪨",0x7a7684,"whet","keep it in your bag: it brings a worn tool part of the way back for a rock.",{wood:0,stone:0,ore:0,dmg:0,uses:12});
tool("striker","fire striker","🔥",0x6a6a72,"strike","flint on metal. lights a cold fire or a kiln, and sets a dead tree burning down to charcoal.",{wood:0,stone:0,ore:0,dmg:0.2,uses:40});
tool("goldpick","gold pick","⛏",0xffc83a,"mine","soft gold on a stick. nothing breaks rock faster, and nothing wears out sooner.",{wood:0.5,stone:5,ore:3,dmg:0.6,uses:60});
tool("glassblade","obsidian blade","🗡",0x2a2238,"whack","volcano glass with an edge like nothing else on the island.",{wood:0.5,stone:0,ore:0,dmg:2.2,uses:260});
tool("staraxe","star axe","🪓",0xdfe8ff,"chop","star metal on hardwood. trees fall over when they see it.",{wood:10,stone:0.5,ore:0,dmg:1.5,uses:900});
tool("copperrod","copper rod","🎣",0xe08a4a,"fish","a rod with a copper hook that snags on things: far more sunk crates.",{wood:0,stone:0,ore:0,dmg:0.2,uses:260});
tool("crystalrod","crystal rod","🎣",0xbfefff,"fish","a bamboo rod with a crystal on the line. rare fish come to look.",{wood:0,stone:0,ore:0,dmg:0.2,uses:300});
tool("staff","lantern staff","🪄",0xbfefff,"shine","a lens on a stick, holding a little of the Lantern's light. six uses, then feed it a crystal or a mote.",{wood:0,stone:0,ore:0,dmg:0.4,uses:7});
tool("candle","candle","🕯",0xfff0c0,"light","beeswax and a reed wick. a small light in your paw.",{wood:0,stone:0,ore:0,dmg:0,uses:300});
tool("oillamp","oil lamp","🪔",0xe8b060,"light","nut oil in a clay cup. a good light in your paw, for a long time.",{wood:0,stone:0,ore:0,dmg:0,uses:900});
mat("thunderpot","jar","thunder pot","🧨",0x5a4a4a,"a thinker's idea: charcoal and resin packed in a pot. it breaks a whole rock at once, and no grump stays to see what it was.");
mat("glowpod","seed","glow pod","🟢",0x9dffc0,"a glowcap wrapped in a leaf. throw it and it lights the spot where it lands for a while.");
mat("beetlejar","jar","beetle jar","🫙",0xc86a5a,"a jar of cross beetles. throw it and the grumps nearby have something else to think about.");
mat("bellows","tool","bellows","🌬",0x9a6a44,"leather and two planks. carried at a lit kiln, some smelts come out double.");
mat("pack","tool","back pack","🎒",0xb89a6a,"cloth and leather with straps. nine more slots, on top of a basket.");
mat("pouch","seed","spill pouch","👝",0xc8b48a,"when your bag is full, what you pick up goes in here instead of staying on the ground.");
mat("blanket","seed","blanket","🛏",0xd8c8a8,"woven and warm. carry it and sleeping out is not cold.");
kind("hanging","seed",{noun:"toy",label:"wall hanging",emoji:"🖼",r:0.15,color:0xc86a8a,desc:"a little woven picture. smols love to be given one."});
var TACKLE=H.TACKLE={
float:{n:12,tip:"longer to hook a bite"},
spinner:{n:12,tip:"bites come sooner"},
strongline:{n:20,tip:"a fish that fights is landed on the first hook"},
emberhook:{n:8,tip:"fish the pool at a steam vent"}
};
mat("float","seed","float","🔴",0xe04a3a,"a stick and a blob of resin. tie it on: longer to hook a bite. good for 12 casts.");
mat("spinner","seed","spinner","🪝",0xa9c4cf,"a chip of flint that flashes. tie it on: bites come sooner. good for 12 casts.");
mat("strongline","seed","strong line","🧵",0xd9c98a,"three fibres twisted with resin. a fighting fish comes in on the first hook. good for 20 casts.");
mat("emberhook","seed","ember hook","🪝",0x2a2238,"an obsidian hook that does not mind the heat. cast it into a steam vent's pool. good for 8 casts.");
H.RODS.copperrod={win:1.1,line:1,crate:3};
H.RODS.crystalrod={win:1.3,line:1,rare:1.7};
fish("cinderfin","cinderfin","🐠",0xff6a3a,["vent"],{rare:3,min:12,max:28,hunger:0.45,safe:1,glow:1,desc:"lives in the hot pool at a steam vent. it comes out already cooked."});
H.MOVES={mudcarp:"nibble",whiskerfish:"nibble",flatfish:"nibble",puffer:"nibble",leaper:"fight",mooneel:"fight",oldbarnacle:"fight",riverghost:"fight",grandcarp:"fight",moonscale:"fight",gloop:"fight",cinderfin:"fight",trout:"dart",sunperch:"dart",coralfin:"dart",glimmerfin:"dart"};
H.MOVE_TEXT={steady:"bites cleanly",nibble:"nibbles first: wait for the real bite",fight:"fights: hook it twice",dart:"darts: a short window, a bigger fish"};
var WEAR=H.WEAR={cloak:{slot:"body",warm:2,rain:0.5,tip:"warm, and sheds half the rain"}};
H.SLOTS=[["head","hat"],["body","body"],["feet","feet"],["c1","charm"],["c2","charm"]];
var SLOT_NAME={head:"hat",body:"cloak or vest",feet:"feet",charm:"charm"};
function wearable(id,slot,lab,emoji,color,tip,o){
o=o||{};
kind(id,"tool",{noun:"tool",label:lab,emoji:emoji,r:0.15,color:color,tool:"wear",desc:"worn ("+SLOT_NAME[slot]+"). "+tip+"."});
TOOLS[id]={wood:0,stone:0,ore:0,dmg:0,uses:100};
WEAR[id]={slot:slot,warm:o.warm||0,rain:o.rain||0,tip:tip,light:o.light||0};
}
wearable("glowhat","head","glowcap hat","🍄",0x67d4ff,"a light on your head, so both paws are free",{light:7});
wearable("clamcap","head","clam-shell cap","🐚",0xe8dccc,"deep water takes much longer to hurt you");
wearable("gourdmask","head","gourd mask","🎃",0xf59b2b,"grumps that are not close lose track of you, until you hit one");
wearable("fisherhat","head","fisher's hat","🎣",0x8ab0a0,"longer to hook a bite");
wearable("strawhat","head","straw hat","👒",0xe8cf8a,"work wear for the garden: one more from every bed you harvest");
wearable("parasol","head","leaf parasol","☂️",0x6fbf4a,"the rain does not soak you",{rain:1});
wearable("thorncloak","body","thorn cloak","🌵",0x5a9a4a,"cactus spines all over. whatever bites you gets hurt back",{warm:1});
wearable("canevest","body","cane vest","🎋",0xb8c46a,"split bamboo over cloth. every bite hurts less");
wearable("scarf","body","scarf","🧣",0xd86a5a,"summer-light and a bit warm",{warm:1});
wearable("pawwraps","feet","paw wraps","🧦",0xc8b48a,"dry feet: wading barely soaks you");
wearable("furboots","feet","fur boots","🥾",0xc8b48a,"warm feet in the snow",{warm:1});
wearable("crystalcharm","charm","crystal charm","📿",0xa8e6ff,"your pep comes back faster");
wearable("shellcharm","charm","shell charm","🐚",0xf5e6d8,"a little luck: better finds, rarer fish");
wearable("goldring","charm","gold ring","💍",0xffc83a,"smols love the look of it. you are never bored or lonely for long");
wearable("wordcharm","charm","whisper charm","🧿",0xc0a8ff,"your words of power come back sooner");
wearable("gemcharm","charm","cut-crystal charm","💠",0xc8f4ff,"you hit a tenth harder, and it keeps a little cold out",{warm:1});
function wearOf(c){if(!c.wear||typeof c.wear!=="object")c.wear={};return c.wear;}
H.worn=function(c,id){
var w=c&&c.wear;
if(!w)return 0;
for(var i=0;i<H.SLOTS.length;i++){var r=w[H.SLOTS[i][0]];if(r&&r.k===id)return QM[qOf(r.w)];if(r&&r.k2===id)return QM[qOf(r.w2)];}
return 0;
};
H.wornList=function(c){var out=[],w=c&&c.wear;if(!w)return out;H.SLOTS.forEach(function(s){var r=w[s[0]];if(r&&WEAR[r.k]){out.push(r.k);if(r.k2&&WEAR[r.k2])out.push(r.k2);}});return out;};
H.warmth=function(c){var n=0;H.wornList(c).forEach(function(k){n+=WEAR[k].warm*H.worn(c,k);});return Math.round(n*10)/10;};
function recName(r){return r?(qOf(r.w)!==1?QN[qOf(r.w)]+" ":"")+(r.dye&&DYE[r.dye]?DYE[r.dye].name+" ":"")+label(r.k)+(r.k2?" + "+label(r.k2):""):"";}
H.recName=recName;
function giveBack(game,c,r){if(!r)return;giveW(game,c,r.k,1,r.w);if(r.k2)giveW(game,c,r.k2,1,r.w2);}
H.putOn=function(game,c,id){
var def=WEAR[id],v=Sv().inv(c),i=-1;
if(!def)return{ok:false,msg:"that isn't something to wear"};
if(c.tier<2)return{ok:false,msg:"it takes hands to dress"};
for(var j=0;j<v.s.length;j++)if(v.s[j]&&v.s[j].k===id){i=j;break;}
if(i<0)return{ok:false,msg:"you don't have one"};
var w=wearOf(c),slot=def.slot==="charm"?(!w.c1?"c1":!w.c2?"c2":"c1"):def.slot;
var sl=Sv().removeAt(c,i,1),old=w[slot];
w[slot]={k:id,w:sl.w!=null?sl.w:100.25};
if(c.dyes&&c.dyes[id])w[slot].dye=c.dyes[id];
giveBack(game,c,old);
emit("wearOn",{c:c,kind:id,slot:slot});
return{ok:true,slot:slot,msg:(K[id].emoji||"")+" you put on the "+recName(w[slot])+". "+def.tip};
};
H.takeOff=function(game,c,slot){
var w=wearOf(c),r=w[slot];
if(!r)return{ok:false,msg:"nothing there"};
w[slot]=null;giveBack(game,c,r);
emit("wearOff",{c:c,kind:r.k,slot:slot});
return{ok:true,msg:"you take off the "+label(r.k)};
};
H.bind=function(game,c){
var w=wearOf(c);
if(!w.c1||!w.c2)return{ok:false,msg:"wear two charms first"};
if(w.c1.k2||w.c2.k2)return{ok:false,msg:"one of them is two charms already"};
if(!H.atBench(game,c))return{ok:false,msg:"binding charms takes a workbench"};
if(countOf(c,"vine")<1)return{ok:false,msg:"it needs 1 vine"};
takeOf(c,"vine",1);
w.c1.k2=w.c2.k;w.c1.w2=w.c2.w;w.c2=null;
emit("charmsBound",{c:c});
return{ok:true,msg:"📿 two charms on one cord: "+label(w.c1.k)+" and "+label(w.c1.k2)+". the other slot is free"};
};
H.saveOutfit=function(c,i){
var w=wearOf(c),o={};
H.SLOTS.forEach(function(s){o[s[0]]=w[s[0]]?w[s[0]].k:null;});
if(!Array.isArray(c.outfits))c.outfits=[null,null];
c.outfits[i?1:0]=o;
return{ok:true,msg:"outfit "+(i?2:1)+" remembered"};
};
H.useOutfit=function(game,c,i){
var o=c.outfits&&c.outfits[i?1:0],w=wearOf(c),n=0;
if(!o)return{ok:false,msg:"no outfit remembered there yet"};
H.SLOTS.forEach(function(s){
var want=o[s[0]],have=w[s[0]]?w[s[0]].k:null;
if(want===have)return;
if(have){H.takeOff(game,c,s[0]);n++;}
if(want&&Sv().count(c,want,true)>0){var r=H.putOn(game,c,want);if(r.ok&&r.slot!==s[0]){w[s[0]]=w[r.slot];w[r.slot]=null;}n++;}
});
return{ok:true,n:n,msg:n?"you change into outfit "+(i?2:1):"you are wearing it already"};
};
var DYE=H.DYE={},DYE_FROM=H.DYE_FROM={};
[["red","red",[1,0.5,0.46],["firepod","cherry","apple"]],["purple","purple",[0.72,0.56,1],["berry"]],["yellow","yellow",[1,0.92,0.5],["banana","honey"]],
["orange","orange",[1,0.7,0.42],["carrot","pumpkin"]],["green","green",[0.6,0.95,0.56],["leaves","mint","moss"]],["brown","brown",[0.72,0.56,0.42],["cocoa","bark"]],
["pink","pink",[1,0.72,0.84],["petals"]],["blue","blue",[0.55,0.78,1],["glowcap","blinkfruit"]],["black","black",[0.42,0.4,0.46],["charcoal","gloomdust"]],
["white","white",[1.15,1.15,1.15],["dawnlily","shell"]],["flame","flame",[1.2,0.62,0.3],["emberbloom"]]].forEach(function(d){
var id="dye_"+d[0];
DYE[id]={id:id,name:d[1],rgb:d[2]};
mat(id,"jar",d[1]+" dye","🎨",Math.round(Math.min(1,d[2][0])*200)*65536+Math.round(Math.min(1,d[2][1])*200)*256+Math.round(Math.min(1,d[2][2])*200),"a pot of "+d[1]+". dye what you wear (the wear page), or hold it and look at a building to paint it.");
d[3].forEach(function(k){DYE_FROM[k]=id;});
});
DYE.ochre={id:"ochre",name:"rust",rgb:[0.95,0.58,0.4]};
GROUPS["dye*"]={name:"dye (any)",is:function(k){return!!DYE[k];}};
GROUPS["wood*"]={name:"wood (any)",is:inList(["stick","plank","log","firewood","hardwood"])};
H.crush=function(game,c,k){
var id=DYE_FROM[k];
if(!id)return{ok:false,msg:"that makes no colour"};
if(c.tier<2)return{ok:false,msg:"it takes hands"};
if(!waterNear(game,c.x,c.z,4))return{ok:false,msg:"dye is made at the water: it needs rinsing"};
if(Sv().count(c,k,true)<2)return{ok:false,msg:"it takes 2 "+label(k)};
Sv().take(c,k,2);give(game,c,id,2);xp(c,"craft",1);
emit("dyeMade",{c:c,kind:id});
return{ok:true,kind:id,msg:"🎨 2 "+label(id)};
};
H.dyeWorn=function(game,c,slot,id){
var r=wearOf(c)[slot];
if(!r||!DYE[id])return{ok:false,msg:""};
if(!Sv().take(c,id,1).length)return{ok:false,msg:"you have no "+label(id)};
r.dye=id;if(!c.dyes||typeof c.dyes!=="object")c.dyes={};c.dyes[r.k]=id;
emit("dyed",{c:c,kind:r.k,dye:id});
return{ok:true,msg:"🎨 a "+recName(r)};
};
function applyDye(game,b){var d=DYE[b.data&&b.data.dye];if(d){b.tint=d.rgb.slice();b._dyed=b.data.dye;mark(game,b);}}
H.paint=function(game,c,b,id){
if(!b||!b.done||isBed(b)||!DYE[id])return{ok:false,msg:""};
if(!Sv().take(c,id,1).length)return{ok:false,msg:"no dye"};
b.data=b.data||{};b.data.dye=id;applyDye(game,b);
emit("painted",{c:c,st:b,dye:id});
return{ok:true,msg:"🎨 the "+(SK[b.kind]?SK[b.kind].label:"building")+" is "+DYE[id].name+" now"};
};
H.GEMS=[null,
{id:1,k:"crystal",name:"bright",tip:"hits a sixth harder",lvl:0},
{id:2,k:"resin",name:"lasting",tip:"wears half as fast",lvl:3},
{id:3,k:"shell",name:"lucky",tip:"now and then one more of what it breaks loose",lvl:5},
{id:4,k:"mote",alt:["duskshard","gloomdust"],name:"bane",tip:"hits grumps much harder",lvl:6},
{id:5,k:"cutgem",name:"great",tip:"hits a third harder and wears half as fast",lvl:4}];
var TEMPER=["","honed","razor"],GEM_DMG=[1,1.16,1,1,1.4,1.33];
var PART={primtool:"stone",stoneaxe:"flint",stonepick:"sharpstone",axe:"metal",hammer:"stone",club:"stone",spear:"flint",blade:"flint",ironaxe:"iron",ironpick:"iron",sword:"iron",rod:"fiber",finerod:"fiber",hoe:"stone",sickle:"flint",goldpick:"gold",glassblade:"obsidian",shears:"flint",copperrod:"metal",crystalrod:"crystal",staff:"crystal",crystalblade:"crystal",maul:"log",bow:"fiber",shield:"plank",silverpick:"silver",starpick:"starmetal",starblade:"starmetal",staraxe:"starmetal",lightblade:"starmetal",striker:"flint",torch:"stick"};
H.partOf=function(k){return PART[k]&&K[PART[k]]?PART[k]:WEAR[k]?"fiber":"stick";};
var JUNK=H.JUNK={oldboot:["leather",1],pondweed:["fiber",1],seaweed:["fiber",1],tooth:["sharpstone",1],hanging:["cloth",1],blanket:["cloth",2],pack:["cloth",2],pouch:["cloth",1]};
H.knowsGem=function(game,c,g){return!!g&&(!!(st(game).sets||{})[g.id]||lv(c,"craft")>=g.lvl);};
H.heirName=function(game,k){var h=(st(game).heir||{})[k];return h?h.nm:"";};
H.toolName=function(game,sl){
if(!sl)return"";
if(!isTool(sl.k)||typeof sl.w!=="number")return label(sl.k);
var t=H.bits(sl.w),q=qOf(sl.w),nm=(t.temper?TEMPER[t.temper]+" ":"")+(q!==1?QN[q]+" ":"")+label(sl.k)+(t.gem?" · "+H.GEMS[t.gem].name:"");
return t.heir&&H.heirName(game,sl.k)?H.heirName(game,sl.k)+" ("+nm+")":nm;
};
function kin(game,c,by){
if(!c||by==null)return false;
if(c.id===by)return true;
var ids=(c.parents||[]).slice(),n=0;
while(ids.length&&n++<14){var id=ids.shift();if(id===by)return true;var p=SB.Game.byId?SB.Game.byId(game,id):null;if(p&&p.parents)ids=ids.concat(p.parents);}
return false;
}
H.kin=kin;
H.temper=function(game,c){
var sl=heldTool(c);
if(!sl)return{ok:false,msg:"hold the tool you want sharpened"};
var t=H.bits(sl.w),full=fullOf(sl);
if(t.temper>=2)return{ok:false,msg:"it is as sharp as it gets"};
if(t.temper===1&&lv(c,"craft")<3)return{ok:false,msg:"a razor edge takes crafting level 3"};
if(t.n<=Math.ceil(full*0.1)+1)return{ok:false,msg:"there is not enough of it left to grind. mend it first"};
t.n-=Math.ceil(full*0.1);t.temper++;setBits(sl,t);xp(c,"craft",2);
emit("toolTempered",{c:c,kind:sl.k,step:t.temper});
return{ok:true,step:t.temper,msg:"🪨 "+TEMPER[t.temper]+": your "+label(sl.k)+" hits "+(t.temper===1?"a tenth":"a fifth")+" harder"};
};
H.whet=function(game,c){
var sl=heldTool(c),v=Sv().inv(c),wi=-1;
if(!sl)return{ok:false,msg:"hold the tool you want whetted"};
for(var i=0;i<v.s.length;i++)if(v.s[i]&&v.s[i].k==="whetstone"){wi=i;break;}
if(wi<0)return{ok:false,msg:"you need a whetstone in your bag"};
var t=H.bits(sl.w),full=fullOf(sl);
if(t.n>=full)return{ok:false,msg:"your "+label(sl.k)+" is as good as new"};
if(Sv().count(c,"stone",true)<1)return{ok:false,msg:"whetting takes a rock"};
Sv().take(c,"stone",1);
t.n=Math.min(full,t.n+Math.ceil(full*0.35));setBits(sl,t);
Sv().wear(c,game,wi,1);
emit("toolWhetted",{c:c,kind:sl.k});
return{ok:true,msg:"🪨 whetted: "+t.n+" of "+full+" uses"};
};
H.repairCost=function(sl){return{k:H.partOf(sl.k),n:1+H.bits(sl.w).reps};};
H.repair=function(game,c){
var sl=heldTool(c);
if(!sl)return{ok:false,msg:"hold the tool you want mended"};
if(!H.atBench(game,c))return{ok:false,msg:"mending takes a workbench"};
var t=H.bits(sl.w),full=fullOf(sl),cost=H.repairCost(sl);
if(t.n>=full)return{ok:false,msg:"your "+label(sl.k)+" is as good as new"};
if(t.reps>=3)return{ok:false,msg:"it has been patched too often to take another. take it apart for its "+label(cost.k)};
if(countOf(c,cost.k)<cost.n)return{ok:false,msg:"it needs "+cost.n+" "+label(cost.k)};
takeOf(c,cost.k,cost.n);
t.n=full;t.reps++;setBits(sl,t);xp(c,"craft",2);
emit("toolMended",{c:c,kind:sl.k,reps:t.reps});
return{ok:true,reps:t.reps,msg:"🔨 mended, as good as new"+(t.reps<3?". the next mend will cost "+(1+t.reps):". that was its last mend")};
};
H.apart=function(game,c){
var held=Sv().held(c),v=Sv().inv(c);
if(!held)return{ok:false,msg:"hold what you want taken apart"};
if(!H.atBench(game,c))return{ok:false,msg:"taking things apart takes a workbench"};
if(JUNK[held.k]){var j=JUNK[held.k];Sv().removeAt(c,v.sel,1);give(game,c,j[0],j[1]);emit("tookApart",{c:c,kind:held.k,got:j[0]});return{ok:true,got:j[0],msg:"the "+label(held.k)+" comes apart: "+j[1]+" "+label(j[0])};}
if(!isTool(held.k)||typeof held.w!=="number"||held.k==="basket"||held.k==="pot")return{ok:false,msg:"that won't come apart"};
var t=H.bits(held.w),full=fullOf(held),part=t.n>=full*0.25?H.partOf(held.k):"stick",k=held.k,s=st(game),learned=false;
Sv().removeAt(c,v.sel,1);
give(game,c,part,1);
if(t.gem){var g=H.GEMS[t.gem];give(game,c,g.k,1);if(!s.sets)s.sets={};if(!H.knowsGem(game,c,g)){s.sets[g.id]=1;learned=true;}}
if(t.heir&&s.heir)delete s.heir[k];
xp(c,"craft",1);
emit("tookApart",{c:c,kind:k,got:part,gem:t.gem,learned:learned});
return{ok:true,got:part,gem:t.gem,learned:learned,msg:"the "+label(k)+" comes apart: 1 "+label(part)+(part==="stick"&&H.partOf(k)!=="stick"?" (too worn for more)":"")+(t.gem?", and its "+label(H.GEMS[t.gem].k)+(learned?". now you know how a "+H.GEMS[t.gem].name+" stone is set":""):"")};
};
H.gemItem=function(c,g){if(Sv().count(c,g.k,true)>0)return g.k;for(var i=0;g.alt&&i<g.alt.length;i++)if(Sv().count(c,g.alt[i],true)>0)return g.alt[i];return null;};
H.setGem=function(game,c,id){
var sl=heldTool(c),g=H.GEMS[id];
if(!sl||!g)return{ok:false,msg:"hold the tool you want a stone set in"};
if(!(Sv().power(sl.k).dmg>0))return{ok:false,msg:"a stone does nothing for that"};
if(!H.atBench(game,c)&&!H.atKiln(game,c))return{ok:false,msg:"setting a stone takes a workbench or a lit kiln"};
var t=H.bits(sl.w),it=H.gemItem(c,g);
if(t.gem)return{ok:false,msg:"it holds a "+H.GEMS[t.gem].name+" stone already. take it apart to get it back"};
if(!H.knowsGem(game,c,g))return{ok:false,msg:"you don't know that setting yet: crafting level "+g.lvl+", or take apart a tool that has one"};
if(!it)return{ok:false,msg:"it needs 1 "+label(g.k)};
Sv().take(c,it,1);
t.gem=id;setBits(sl,t);xp(c,"craft",3);
emit("gemSet",{c:c,kind:sl.k,gem:id});
return{ok:true,msg:"💎 a "+g.name+" "+label(sl.k)+": "+g.tip};
};
var HEIR_NAMES=["Old Biter","Mister Thunk","Second Breakfast","The Polite One","Wobble","Auntie","Clonk","Sunday Best","Thumbfinder","Good Enough"];
H.HEIR_SAYS=["that was a tree, not a grump. just so you know.","i was made for better than this. carry on.","mind the edge. it is my best feature.","your grandparent swung me straighter.","more of that, please.","i shall be telling the whetstone about this."];
H.nameTool=function(game,c){
var sl=heldTool(c),s=st(game);
if(!sl)return{ok:false,msg:"hold the tool you want to name"};
if(!H.atBench(game,c))return{ok:false,msg:"naming a tool is done at a workbench"};
var t=H.bits(sl.w);
if(t.heir)return{ok:false,msg:"it has a name: "+H.heirName(game,sl.k)};
if(!t.temper&&qOf(sl.w)<2)return{ok:false,msg:"only a fine or a sharpened tool earns a name"};
if(!s.heir)s.heir={};
if(s.heir[sl.k])return{ok:false,msg:"the island already has a named "+label(sl.k)+": "+s.heir[sl.k].nm};
var nm=HEIR_NAMES[(hashKey(sl.k)^(game.seed>>>0)^c.id)%HEIR_NAMES.length];
s.heir[sl.k]={nm:nm,by:c.id,who:c.name||""};
t.heir=1;setBits(sl,t);
emit("toolNamed",{c:c,kind:sl.k,name:nm});
return{ok:true,name:nm,msg:"🏷 this "+label(sl.k)+" is "+nm+" now. it will never break, and "+(c.name||"its maker")+"'s family will always swing it best"};
};
H.hitMul=function(game,c){
var k=1,sl=c?Sv().held(c):null;
if(sl&&isTool(sl.k)&&typeof sl.w==="number"){
var t=H.bits(sl.w),h=(st(game).heir||{})[sl.k];
k*=GEM_DMG[t.gem]*(1+t.temper*0.1);
if(t.heir&&h&&kin(game,c,h.by))k*=1.25;
}
if(H.worn(c,"gemcharm"))k*=1+0.1*H.worn(c,"gemcharm");
if(H.has(c,"tipsy",game))k*=1.15;
if(H.has(c,"glow",game))k*=1.3;
return k;
};
function persona(game,c){
var sl=Sv().held(c),s=st(game);
if(!sl||typeof sl.w!=="number"||!H.bits(sl.w).heir||!H.heirName(game,sl.k))return;
if(s.heirT&&game.time-s.heirT<150)return;
s.heirT=game.time;s.heirN=(s.heirN||0)+1;
say("🗣 "+H.heirName(game,sl.k)+": “"+H.HEIR_SAYS[s.heirN%H.HEIR_SAYS.length]+"”");
}
H.staff=function(game,c){
var sl=Sv().held(c),v=Sv().inv(c);
if(!sl||sl.k!=="staff")return{ok:false,msg:"hold the lantern staff"};
if(Math.floor(sl.w)<=1)return{ok:false,msg:"the staff is dark. feed it a thought crystal or a light mote (the bench page)"};
Sv().wear(c,game,v.sel,1);
c.chem.health=Math.min(1,(c.chem.health||0)+0.15);if(c.chem.cold!=null)c.chem.cold=Math.max(0,c.chem.cold-0.3);
var n=0;grumpsNear(game,c.x,c.z,7,function(g){g.whacked=(g.whacked||0)+0.5;n++;});
if(SB.FX&&SB.FX.burst)SB.FX.burst("sparkle",c.x,SB.World.groundY(game.world,c.x,c.z)+0.8,c.z,14);
emit("staffUsed",{c:c,grumps:n});
return{ok:true,grumps:n,msg:"🪄 light pours out of the staff"+(n?". "+n+" grump"+(n>1?"s":"")+" reel back":": you feel mended")+" ("+(Math.floor(sl.w)-1)+" left)"};
};
H.chargeStaff=function(game,c){
var sl=Sv().held(c),it;
if(!sl||sl.k!=="staff")return{ok:false,msg:"hold the lantern staff"};
if(Math.floor(sl.w)>=7)return{ok:false,msg:"the staff is full"};
it=Sv().count(c,"mote",true)?"mote":Sv().count(c,"crystal",true)?"crystal":null;
if(!it)return{ok:false,msg:"it needs a thought crystal or a light mote"};
Sv().take(c,it,1);sl.w=(it==="mote"?7:Math.min(7,Math.floor(sl.w)+3))+fracOf(sl.w);
return{ok:true,msg:"🪄 the staff drinks the "+label(it)+": "+(Math.floor(sl.w)-1)+" uses"};
};
H.WOOD={oak:"hardwood",maple:"hardwood",giant:"hardwood",mangrove:"hardwood",pine:"resin",birch:"bark",sakura:"petals"};
H.POUCH=24;
function pouchN(c){var n=0,p=c.pouch;if(p)for(var k in p)n+=p[k];return n;}
H.pouchN=pouchN;
H.afterHit=function(game,c,n,tk,res){
if(!res.gave||!res.gave.length){if(res.kind==="chop"||res.kind==="mine"||res.kind==="chip")persona(game,c);return;}
var r=rnd(game,"hit"+n.id+":"+(n.left||0)+":"+Math.floor(game.time))(),pw=Sv().power(tk||"paws"),extra=null,sl=Sv().held(c);
if((n.kind==="basalt"||n.kind==="vent")&&pw.ore>=2.5&&r<0.5)extra="obsidian";
else if(n.kind==="redrock"&&r<0.4)extra="ochre";
else if(sl&&typeof sl.w==="number"&&H.bits(sl.w).gem===3&&r>0.55)extra=res.gave[0];
if(!extra||!K[extra])return;
Sv().spawn(game,extra,1,c.x+(n.x-c.x)*0.5,c.z+(n.z-c.z)*0.5,{by:c.id});
res.gave.push(extra);res.msg=(res.msg?res.msg+" ":"")+"and "+label(extra)+"!";
emit("bonusFind",{c:c,kind:extra,node:n});
};
H.afterFell=function(game,c,n,kindWas,gave){
var k=H.WOOD[kindWas],cnt=kindWas==="giant"?2:1;
if(!k||!K[k])return;
Sv().spawn(game,k,cnt,n.x+0.4,n.z+0.3,{by:c.id});
if((n.s||1)>1.1&&K.moss)Sv().spawn(game,"moss",1,n.x-0.3,n.z+0.4,{by:c.id});
if(gave&&gave.push)for(var i=0;i<cnt;i++)gave.push(k);
emit("woodKind",{c:c,kind:k,tree:kindWas});
};
function wraps(S){
var ow=S.wear,oh=S.hitNode,ofl=S.fell,ob=S.bagN,op=S.pickup;
if(ow)S.wear=function(c,game,i,amount){
var v=S.inv(c),sl=v.s[i];
if(sl&&isTool(sl.k)&&typeof sl.w==="number"){
var t=H.bits(sl.w);
if(t.gem===2||t.gem===5){sl._alt=!sl._alt;if(sl._alt)return false;}
if(t.heir&&sl.w-(amount||1)<1)return false;
}
return ow.call(S,c,game,i,amount);
};
if(oh)S.hitNode=function(c,game,n,tk){
var res=oh.call(S,c,game,n,tk);
try{if(res&&res.ok&&c&&c._pov&&n)H.afterHit(game,c,n,tk,res);}catch(e){}
return res;
};
if(ofl)S.fell=function(c,game,n){
var kindWas=n&&n.kind,gave=ofl.call(S,c,game,n);
try{if(c&&c._pov)H.afterFell(game,c,n,kindWas,gave);}catch(e){}
return gave;
};
if(ob)S.bagN=function(c){
var n=ob.call(S,c);
if(n&&c.inv&&c.inv.s)for(var i=0;i<c.inv.s.length;i++)if(c.inv.s[i]&&c.inv.s[i].k==="pack"){n+=9;break;}
if(n&&c.bagx>0)n+=3*Math.min(3,c.bagx|0);
return n;
};
if(op)S.pickup=function(c,game,o){
var took=op.call(S,c,game,o);
try{
if(o&&!o.gone&&c&&c.inv&&K[o.kind]&&!K[o.kind].tool&&!(o.data&&(o.data.rotten||o.data.pod||o.data.starter))&&(o.heldBy==null||o.heldBy===c.id)&&!S.whyNot(c,o.kind)&&S.count(c,"pouch",true)>0){
var left=S.pileN(o),t=Math.min(left,H.POUCH-pouchN(c));
if(t>0){
if(!c.pouch||typeof c.pouch!=="object")c.pouch={};
c.pouch[o.kind]=(c.pouch[o.kind]||0)+t;
if(t>=left)SB.World.remove(game.world,o);else{o.data.n=left-t;if(o.data.n===1)delete o.data.n;}
took+=t;emit("pouched",{c:c,kind:o.kind,n:t});
}
}
}catch(e){}
return took;
};
}
H.emptyPouch=function(game,c){
var p=c.pouch,n=0;
if(!p||!pouchN(c))return{ok:false,msg:"the pouch is empty"};
for(var k in p){var left=K[k]?Sv().add(c,k,p[k]):0;n+=p[k]-left;if(left>0)p[k]=left;else delete p[k];}
return n?{ok:true,n:n,msg:"you tip "+n+" thing"+(n>1?"s":"")+" out of the pouch into your bag"+(pouchN(c)?" ("+pouchN(c)+" still in it)":"")}:{ok:false,msg:"no room in your bag for what is in the pouch"};
};
function daily(game,key,max){var d=dug(game);d.ids[key]=(d.ids[key]||0)+1;return d.ids[key]<=(max||1);}
function dailyLeft(game,key,max){return(dug(game).ids[key]||0)<(max||1);}
function pickW(r,table){var tot=0,i;for(i=0;i<table.length;i++)if(K[table[i][0]])tot+=table[i][1];var x=r*tot;for(i=0;i<table.length;i++)if(K[table[i][0]]&&(x-=table[i][1])<=0)return table[i][0];return table[0][0];}
H.PAN={fresh:[["stone",30],["sand",22],["flint",15],["clay",10],["ore",9],["goldfleck",9],["crystal",2],["geode",3]],sea:[["sand",45],["shell",25],["stone",15],["seaweed",10],["pearl",5]]};
H.pan=function(game,c,wx,wz){
if(Sv().heldKind(c)!=="basket")return{ok:false,msg:"hold a basket to pan with"};
var key="p"+Math.floor(wx/6)+","+Math.floor(wz/6);
if(!dailyLeft(game,key,3))return{ok:false,msg:"this stretch is panned out for today. try further along"};
daily(game,key,3);
var s=st(game),wk=H.waterKind(game,wx,wz),got=pickW(rnd(game,"pan"+(s.pans=(s.pans||0)+1))(),wk==="sea"?H.PAN.sea:H.PAN.fresh);
give(game,c,got,1);xp(c,"forage",1);
emit("panned",{c:c,kind:got});
return{ok:true,kind:got,msg:(got==="goldfleck"?"✨ gold in the pan!":got==="stone"?"you swirl the gravel. a rock":"you swirl the gravel: "+label(got))};
};
H.COMB=[["shell",35],["sand",25],["seaweed",15],["stick",15],["pearl",5],["clam",5]];
H.canComb=function(game,c){return biomeId(game,c.x,c.z)==="beach"&&dailyLeft(game,"b"+Math.floor(c.x/5)+","+Math.floor(c.z/5),1);};
H.comb=function(game,c){
if(!H.canComb(game,c))return{ok:false,msg:"nothing more on this bit of beach today"};
daily(game,"b"+Math.floor(c.x/5)+","+Math.floor(c.z/5),1);
var s=st(game),got=pickW(rnd(game,"comb"+(s.combs=(s.combs||0)+1))(),H.COMB);
give(game,c,got,1);xp(c,"forage",1);
emit("combed",{c:c,kind:got});
return{ok:true,kind:got,msg:"🐚 on the tide line: "+label(got)};
};
H.canClip=function(game,n){return!!n&&n.state==="ok"&&!!NK[n.kind]&&NK[n.kind].noun==="plant"&&n.kind!=="hive"&&n.kind!=="clams"&&dailyLeft(game,"c"+n.id,1);};
H.clip=function(game,c,n){
var v=Sv().inv(c);
if(Sv().heldKind(c)!=="shears")return{ok:false,msg:"hold shears"};
if(!H.canClip(game,n))return{ok:false,msg:"this one has been clipped today"};
daily(game,"c"+n.id,1);
var k=n.kind==="reeds"||n.kind==="bamboo"||n.kind==="mangrove"?"fiber":n.kind==="sakura"?"petals":n.kind==="cactus"?"s_cactus":"leaves",cnt=k==="s_cactus"?1:2;
give(game,c,k,cnt);Sv().wear(c,game,v.sel,1);xp(c,"forage",1);
emit("clipped",{c:c,kind:k,node:n});
return{ok:true,kind:k,msg:"✂️ "+cnt+" "+label(k)+", and the "+NK[n.kind].label+" is none the worse"};
};
H.strike=function(game,c,target){
var v=Sv().inv(c);
if(Sv().heldKind(c)!=="striker")return{ok:false,msg:"hold a fire striker"};
if(target&&target.type==="struct"){
if((target.kind!=="campfire"&&target.kind!=="kiln")||!target.done||target.data.lit)return{ok:false,msg:"that is not a cold fire"};
target.data.fuel=Math.max(target.data.fuel||0,0.5);target.data.lit=true;Sv().wear(c,game,v.sel,1);
emit("fireLit",{c:c,st:target});
return{ok:true,msg:"🔥 a spark, and it catches"};
}
if(target&&target.kind==="deadtree"&&target.state==="ok"){
target.state="gone";target.regrowT=1500;target.hp=null;mark(game,target);Sv().wear(c,game,v.sel,1);
Sv().spawn(game,"charcoal",2,target.x+0.3,target.z+0.3,{by:c.id});
emit("treeBurnt",{c:c,node:target});
return{ok:true,msg:"🔥 the dead tree goes up, and burns down to 2 charcoal"};
}
return{ok:false,msg:"nothing here will catch"};
};
H.boom=function(game,c,n){
var rk=n&&Sv().ROCKS?Sv().ROCKS[n.kind]:null;
if(!rk||n.state!=="ok")return{ok:false,msg:"set it against a rock"};
if(!Sv().take(c,"thunderpot",1).length)return{ok:false,msg:"no thunder pot"};
var left=n.left==null?rk.left:n.left,scared=0;
Sv().spawn(game,rk.item,left,n.x+(c.x-n.x)*0.4,n.z+(c.z-n.z)*0.4,{by:c.id});
n.left=0;n.state="gone";n.regrowT=1500;n.hp=null;mark(game,n);
grumpsNear(game,n.x,n.z,10,function(g){if(g.boss)return;g.whacked=(g.whacked||0)+2;if(g.chem)g.chem.fear=1;scared++;});
if(SB.FX&&SB.FX.burst)SB.FX.burst("crumbs",n.x,SB.World.groundY(game.world,n.x,n.z)+0.5,n.z,24);
emit("rockGone",{c:c,node:n});emit("thunder",{c:c,node:n,n:left,scared:scared});
return{ok:true,n:left,scared:scared,msg:"💥 BOOM. "+left+" "+label(rk.item)+(scared?", and "+scared+" grump"+(scared>1?"s":"")+" running":"")};
};
H.glows=[];
H.throwPod=function(game,c,ag){
var k=Sv().heldKind(c),x=ag&&!ag.far?ag.x:c.x+Math.sin(c.facing||0)*4,z=ag&&!ag.far?ag.z:c.z+Math.cos(c.facing||0)*4,n=0;
if(k!=="glowpod"&&k!=="beetlejar")return{ok:false,msg:""};
Sv().take(c,k,1);
if(k==="glowpod"){H.glows.push({x:x,z:z,until:game.time+90});if(H.glows.length>6)H.glows.shift();emit("glowThrown",{c:c,x:x,z:z});return{ok:true,msg:"🟢 it lands and lights the spot"};}
grumpsNear(game,x,z,5,function(g){if(g.boss)return;g.whacked=(g.whacked||0)+0.6;g.attn=null;g.action=null;n++;});
emit("jarThrown",{c:c,x:x,z:z,n:n});
return{ok:true,n:n,msg:n?"🐞 beetles everywhere. "+n+" grump"+(n>1?"s have":" has")+" something else to think about":"🐞 the beetles scatter. no grump was near enough to mind"};
};
H.rake=function(game,c,it){
if(!it||it.gone||!(it.data&&it.data.rotten))return{ok:false,msg:""};
var n=Sv().pileN?Sv().pileN(it):1;
SB.World.remove(game.world,it);give(game,c,"compost",Math.max(1,Math.ceil(n/2)));xp(c,"farm",1);
return{ok:true,msg:"🟤 you rake the rot into compost. nothing wasted"};
};
H.tie=function(game,c,k){
if(!TACKLE[k]||!Sv().take(c,k,1).length)return{ok:false,msg:""};
if(c.tackle&&c.tackle.k&&c.tackle.n===TACKLE[c.tackle.k].n)give(game,c,c.tackle.k,1);
c.tackle={k:k,n:TACKLE[k].n};
return{ok:true,msg:"🪝 "+label(k)+" tied on: "+TACKLE[k].tip+" ("+TACKLE[k].n+" casts)"};
};
H.trellis=function(game,c,b){
var d=b&&b.data;
if(!isBed(b)||!d||d.crop!=="bean"||d.trellis)return{ok:false,msg:""};
if(countOf(c,"stick")<2)return{ok:false,msg:"a trellis takes 2 sticks"};
takeOf(c,"stick",2);d.trellis=1;restage(game,b);
return{ok:true,msg:"🎋 a trellis. the beans climb: they grow faster and give two more"};
};
H.pipeAdd=function(game,c,b,how){
var d=b&&b.data;
if(!b||b.kind!=="sprinkler")return{ok:false,msg:""};
if(how==="wide"){if(d.wide)return{ok:false,msg:"it has a wide spout already"};if(countOf(c,"clay")<2)return{ok:false,msg:"a wide spout takes 2 clay"};takeOf(c,"clay",2);d.wide=1;mark(game,b);return{ok:true,msg:"the pipe has a wide spout now: it reaches six steps"};}
if(!Sv().take(c,"compost",1).length)return{ok:false,msg:"no compost"};
d.drip=(d.drip||0)+3;
return{ok:true,msg:"compost in the pipe's drip: it will feed the next three beds it waters"};
};
food("canepiece","seed","sweet cane","🎋",0xc8d87a,0.2,"bamboo you grew yourself. chewy and sweet, and it counts as something sweet in a dish.",{rots:0});
GROUPS["sweet*"].is=inList(["honey","sap","jam","canepiece"]);
crop("cactus","cactus","pricklypear",[1,2],380,[1,2],{regrow:200,damp:1,col:0xd9467a,note:"needs no watering. clip a cactus with shears for the seeds"});
crop("bamboo","bamboo","canepiece",[0,1,2],240,[2,3],{regrow:110,note:"shoots up, and keeps coming"});
crop("cocoa","cocoa","cocoa",[0,1,2],420,[1,2],{regrow:220,found:1,col:0x7a4a2a,note:"only grows in jungle ground (or under glass)"});
crop("emberbloom","emberbloom","emberbloom",[1,2],400,[1,2],{found:1,col:0xff7a2a,note:"old seeds from ruins"});
crop("glowgourd","glow gourd","glowgourd",[1,2],480,[1,1],{giant:1,found:1,col:0x8af0c0,note:"a cross: a gourd seed and a glowcap seed"});
crop("starberry","starberry","starberry",[0,1],340,[2,3],{regrow:170,found:1,col:0xffe27a,note:"a cross: a bramble seed and a star melon seed"});
crop("snapper","snapper","bait",[0,1,2],360,[2,3],{regrow:180,found:1,col:0x8a4a6a,note:"it eats bugs (bait for you) and nips any grump that comes close. found in swamps"});
H.CROP.cocoa.biome=["jungle","mangrove","bamboo"];
if(CROP_OUT.bait===H.CROP.snapper)delete CROP_OUT.bait;
H.FORAGE2=[
{id:"moss",p:0.4,nodes:["deadtree","giant","mangrove","oak","maple","pine"]},
{id:"ashroot",p:0.45,nodes:["deadtree","basalt","vent","cactus"],b:["ash"]},
{id:"blinkfruit",p:0.4,nodes:["crystals","pine","boulder","flintrock","bush"],b:["crystal"]},
{id:"cocoa",p:0.4,nodes:["giant","palm","bamboo","bush"],b:["jungle"]},
{id:"s_cocoa",p:0.2,nodes:["giant","palm"],b:["jungle"]},
{id:"s_snapper",p:0.3,nodes:["reeds","mangrove","birch","bush"],b:["swamp","mangrove"]},
{id:"dawnlily",p:0.25,nodes:["oak","birch","maple","sakura","pine","giant"],need:bossDown}
];
H.SOIL={meadow:1.1,forest:1.1,jungle:1.2,blossom:1.1,maple:1.05,swamp:1.1,mangrove:1.05,bamboo:1.1,flowers:1.15,savanna:0.9,taiga:0.9,beach:0.75,mountain:0.75,crystal:0.8,shroom:1,mesa:0.7,ash:0.7,desert:0.6,tundra:0.6};
H.soilAt=function(game,x,z){var s=H.SOIL[biomeId(game,x,z)];return s==null?1:s;};
H.soilWord=function(s){return s>=1.1?"rich soil":s<=0.8?"poor soil":"";};
H.inGlass=function(game,b){return SB.World.structsNear(game.world,b.x,b.z,H.MACH.glasshouse.reach,function(o){return o.kind==="glasshouse";}).length>0;};
H.whyNotGrow=function(game,b,cr){
var se=season(game);
if(H.inGlass(game,b))return"";
if(cr.s.indexOf(se)<0)return cr.label+" won't grow in "+SEASON[se]+": sow it in "+seasonsText(cr.s)+", or under glass";
if(cr.biome&&cr.biome.indexOf(biomeId(game,b.x,b.z))<0)return cr.label+" only grows in jungle ground, or under glass";
return"";
};
function forage2(game,c,n){
var b=biomeId(game,n.x,n.z),r=rnd(game,"fg2"+n.id+":"+day(game)),got=null,lucky=(H.has(c,"lucky",game)||H.worn(c,"shellcharm")?0.12:0)+luck3(c,game);
H.FORAGE2.forEach(function(f){if(got||f.nodes.indexOf(n.kind)<0||(f.b&&f.b.indexOf(b)<0)||(f.need&&!f.need(game))||!K[f.id])return;if(r()<f.p+lucky)got=f.id;});
return got;
}
H.canForage2=function(game,n){var b=biomeId(game,n.x,n.z);return H.FORAGE2.some(function(f){return f.nodes.indexOf(n.kind)>=0&&(!f.b||f.b.indexOf(b)>=0)&&(!f.need||f.need(game));});};
H.fruitOf=function(game,n){var d=NK[n.kind],y=Math.min(3,year(game)-1);return d&&d.drops&&K[d.drops]&&K[d.drops].noun==="food"&&Sv().edible(d.drops)&&y>0?{k:d.drops,n:y}:null;};
H.EFFECT={herb:["hearty","green"],firepod:["warm","mighty"],mint:["pep","keen"],tealeaf:["pep","quick"],glowcap:["keen","lucky"],honey:["hearty","lucky"],sap:["quick","warm"],nutmeat:["mighty","hearty"],
seaweed:["keen","green"],morel:["lucky","pep"],truffle:["lucky","mighty"],snowroot:["warm","hearty"],banana:["quick","pep"],berry:["quick","green"],leek:["green","hearty"],cocoa:["pep","warm"],blinkfruit:["quick","keen"],moss:["green","keen"]};
H.TONIC_SECS=180;
["pep","warm","mighty","quick","lucky","hearty","keen","green"].forEach(function(e){
var b=H.BUFFS[e];
kind("tonic_"+e,"jar",{noun:"medicine",label:b.name+" tonic",emoji:"🧪",r:0.13,color:0x8de0c0,food:{hunger:-0.02},chem:{},rots:0,desc:"a tonic. "+b.name+" for 3 min. "+b.tip+"."});
kind("stonic_"+e,"jar",{noun:"medicine",label:"strong "+b.name+" tonic",emoji:"⚗️",r:0.13,color:0xc86a8a,food:{hunger:-0.02},chem:{},rots:0,desc:"ashroot made it strong. "+b.name+" for 6 min, then you feel flat for 2."});
BUFF_OF["tonic_"+e]={k:e,secs:H.TONIC_SECS,slot:"drink"};
BUFF_OF["stonic_"+e]={k:e,secs:H.TONIC_SECS*2,slot:"drink",flat:120};
});
function know(game){var s=st(game);if(!s.know||typeof s.know!=="object")s.know={};return s.know;}
H.learnEffect=function(game,k,e){var ef=H.EFFECT[k],i=ef?ef.indexOf(e):-1,kn=know(game);if(i<0)return false;var had=kn[k]|0;kn[k]=had|(1<<i);return kn[k]!==had;};
H.knownEffects=function(game,k){var ef=H.EFFECT[k],m=know(game)[k]|0;return ef?ef.map(function(e,i){return m&(1<<i)?e:null;}):[];};
H.whyNotMix=function(game,c,a,b){
if(c.tier<2)return"it takes hands to brew";
if(!H.EFFECT[a]||!H.EFFECT[b]||a===b)return"pick two different things to brew";
if(Sv().count(c,a,true)<1||Sv().count(c,b,true)<1)return"you need one of each";
if(!Sv().count(c,"pot",true))return"brewing takes a pot";
if(!H.nearFire(game,c))return"brew by a lit fire, a kiln or your hearth";
return"";
};
H.mix=function(game,c,a,b,strong){
var why=H.whyNotMix(game,c,a,b);
if(why)return{ok:false,msg:why};
if(strong&&Sv().count(c,"ashroot",true)<1)return{ok:false,msg:"a strong tonic needs ashroot"};
var e=null;H.EFFECT[a].forEach(function(x){if(!e&&H.EFFECT[b].indexOf(x)>=0)e=x;});
Sv().take(c,a,1);Sv().take(c,b,1);xp(c,"cook",2);
if(!e){emit("brewed",{c:c,a:a,b:b,e:null});return{ok:true,e:null,msg:"🫧 murky water. "+label(a)+" and "+label(b)+" have nothing in common. now you know"};}
if(strong)Sv().take(c,"ashroot",1);
var out=(strong?"stonic_":"tonic_")+e,n=SB.Body&&SB.Body.roll(c,"cook")?2:1,isNew=H.learnEffect(game,a,e);
isNew=H.learnEffect(game,b,e)||isNew;
give(game,c,out,n);
emit("brewed",{c:c,a:a,b:b,e:e,strong:!!strong,n:n});
return{ok:true,e:e,out:out,n:n,learned:isNew,msg:"🧪 "+label(out)+(n>1?" ×2":"")+(isNew?". both of them are "+H.BUFFS[e].name+": written down":"")};
};
dish("homebrew","homeward brew","🏠",0x9ad0b0,{herb:1,glowcap:1},null,0,0.05,{pot:1,drink:1,fx:"takes you home",riddle:"a root that heals and a cap that glows, in a pot",desc:"a drink. one sip and you are standing by your own bed."});
dish("glowsap","glowsap","🌟",0xbfffd0,{sap:1,glowcap:1,ashroot:1},"glow",480,0.2,{pot:1,riddle:"sweet sap, a cap that glows and the ashlands herb, in a pot",desc:"mighty, quick and peppy at once. afterwards you feel flat until you have another, or it wears off."});
dish("snowcone","snow cone","🍧",0xe8f6ff,{"sweet*":1},"pep",180,0.2,{cold:1,snow:1,riddle:"something sweet, and snow. no fire",desc:"snow with something sweet on it. only where there is snow."});
dish("hotcocoa","hot cocoa","☕",0x7a4a2a,{cocoa:2,"sweet*":1},"warm",480,0.25,{pot:1,drink:1,riddle:"two jungle pods and something sweet, in a pot",desc:"a drink. nobody is cold after one."});
H.snowy=function(game,c){return season(game)===3||biomeId(game,c.x,c.z)==="tundra";};
H.goHome=function(game,c){
var h=SB.Home&&SB.Home.get?SB.Home.get(game):null,n=game.world.T&&game.world.T.nest,t=h||n;
if(!t)return false;
for(var a=0;a<6.28;a+=0.785){var x=t.x+Math.sin(a)*1.6,z=t.z+Math.cos(a)*1.6;if(SB.World.walkable(game.world,x,z,false)){c.x=x;c.z=z;if(c.px!=null){c.px=x;c.pz=z;}return true;}}
return false;
};
H.ate2=function(game,c,k,bo){
var msg=null,b=c.buff||{};
if(H.EFFECT[k]&&H.learnEffect(game,k,H.EFFECT[k][0]))msg="📖 "+label(k)+" is "+H.BUFFS[H.EFFECT[k][0]].name+". good to know for brewing";
if(bo&&Sv().count(c,"dust",true)>0&&b[bo.slot]&&b[bo.slot].id===k){Sv().take(c,"dust",1);b[bo.slot].until+=(b[bo.slot].until-game.time)*0.5;msg="❇️ a pinch of crystal dust: it lasts half as long again";}
if(bo&&bo.flat&&b[bo.slot])c.due={at:b[bo.slot].until,secs:bo.flat};
if(k==="glowsap"){c.flat=0;c.due={at:b.food?b.food.until:game.time,secs:240};}
if(k==="homebrew")msg=H.goHome(game,c)?"🏠 the world folds up, and you are home":"🏠 nothing happens. there is nowhere to go home to";
if(k==="blinkfruit"){for(var d=5;d>=2;d--){var x=c.x+Math.sin(c.facing||0)*d,z=c.z+Math.cos(c.facing||0)*d;if(SB.World.walkable(game.world,x,z,false)){c.x=x;c.z=z;if(c.px!=null){c.px=x;c.pz=z;}msg="🔹 blink! you are "+d+" steps ahead of yourself";break;}}}
if(k==="wobbly"&&c.chem.fear!=null)c.chem.fear=0;
if(Sv().edible(k)){
if(!Array.isArray(c.diet))c.diet=[];
c.diet.push(k);if(c.diet.length>6)c.diet.shift();
var seen={},kinds=0;c.diet.forEach(function(x){if(!seen[x]){seen[x]=1;kinds++;}});
if(c.diet.length>=6&&kinds>=5&&!(c.fed>game.time)){c.fed=game.time+300;msg=(msg?msg+". ":"")+"🥗 a varied diet: well fed for 5 min (your hearts mend)";}
else if(c.diet.length>=4&&c.diet.slice(-4).every(function(x){return x===k;})){c.chem.bored=Math.min(1,(c.chem.bored||0)+0.12);if(!msg)msg=label(k)+" again. you are getting sick of it: eat something else";}
}
if(msg)say(msg);
return msg;
};
function boxN(box){var n=0;if(box)for(var k in box)n+=box[k];return n;}
var AGE={fizz:"mead",berryjuice:"nectar",cheese:"agedcheese",roe:"caviar"};
if(K.cheese&&!K.agedcheese)food("agedcheese","veg","cellar cheese","🧀",0xe8b83a,0.7,"cheese that waited in a cellar. it was worth it.",{rots:0});
function station(id,def){H.MACH[id]=def;struct(id,"material",def.label,def.emoji,def.r,def.cost,def.desc);H.CRAFTS.push({id:id,build:id,cost:def.cost,note:def.desc,g:"stations",tier:def.tier});CRAFT[id]=H.CRAFTS[H.CRAFTS.length-1];}
station("workbench",{label:"workbench",emoji:"🔨",r:0.6,cost:{plank:4,stone:2},helper:1,desc:"mend, take apart, set stones, name a tool, bind charms, leave standing orders. some things can only be made at one, and a machine beside one works a quarter faster."});
station("loom",{label:"loom",emoji:"🧶",r:0.6,cost:{stick:6,vine:2},time:150,cap:6,word:"weaving",takes:"reed fibre",make:function(k){return k==="fiber"?["cloth",1]:null;},desc:"a weaving frame. reed fibre in, cloth out."});
station("charpit",{label:"charcoal pit",emoji:"⚫",r:0.6,cost:{stone:4,leaves:2},time:200,cap:6,word:"smouldering",takes:"logs, planks or firewood",make:function(k){return k==="log"||k==="hardwood"?["charcoal",2]:k==="plank"||k==="firewood"?["charcoal",1]:null;},desc:"wood burnt slowly under earth turns to charcoal."});
station("press",{label:"oil press",emoji:"🫗",r:0.5,cost:{stone:2,plank:2},time:120,cap:4,word:"pressing",takes:"hardnuts or nut meat",make:function(k){return k==="nut"||k==="nutmeat"?["oil",1]:null;},desc:"squeezes nuts into lamp oil."});
station("cellar",{label:"cold cellar",emoji:"🧊",r:0.7,cost:{cutblock:4,plank:2},time:900,cap:12,word:"keeping",takes:"any food to keep (it never rots down here), or honey fizz, berry juice, cheese or roe to age",
make:function(k){return AGE[k]&&K[AGE[k]]?[AGE[k],1]:Sv().edible(k)&&K[k].rots?[k,1]:null;},timeOf:function(k){return AGE[k]?900:1;},desc:"a cool pit lined with cut stone. food kept here stays good through every season, and fizz, juice and cheese age into something better."});
station("stewpot",{label:"stew pot",emoji:"🍲",r:0.5,cost:{clay:4,stone:2},time:90,cap:6,word:"simmering",takes:"any food at all",make:function(k){return k!=="stew"&&GROUPS["any*"].is(k)?["stew",1]:null;},desc:"the village pot. any food in, plain stew out, and hungry smols nearby help themselves."});
station("baitbin",{label:"worm bin",emoji:"🪱",r:0.45,cost:{plank:2,leaves:2},time:200,cap:4,word:"wriggling",takes:"scraps",make:function(k){return k!=="bait"&&(k==="leaves"||GROUPS["scrap*"].is(k))?["bait",2]:null;},desc:"scraps in, bait out."});
station("crystalbed",{label:"crystal bed",emoji:"💎",r:0.5,cost:{crystal:1,stone:3,clay:2},time:1500,cap:2,gen:"crystal",word:"growing, slowly",desc:"a seed crystal in a bed of clay. it grows another now and then."});
station("fishpond",{label:"fish pond",emoji:"🐟",r:0.8,cost:{cutblock:3,clay:3},time:600,cap:3,bonus:"roe",word:"the fish are settling in",takes:"one kind of fish (not a great one)",make:function(k){var f=FISH_BY[k];return f&&f.rare<4&&!f.pot?[k,2]:null;},desc:"a pond of your own. put a fish in, come back for two, and roe besides."});
station("helperhut",{label:"helper hut",emoji:"🛖",r:0.6,cost:{plank:4,leaves:3,honey:1},helper:1,reach:5,desc:"a tiny hut the smallest smols like. whoever moves in picks every ripe bed within five steps and keeps it for you: your own farm's takings."});
station("glasshouse",{label:"glasshouse",emoji:"🏡",r:0.7,cost:{glass:4,plank:4,arkpart:1},helper:1,reach:4.5,tier:5,desc:"a thinker's idea. every bed within four steps grows all year, whatever the season or the soil."});
station("crate",{label:"crate",emoji:"📦",r:0.45,cost:{plank:3,vine:1},helper:1,desc:"a box you can set down anywhere. six stacks go in. take it down when it is empty."});
station("torchpost",{label:"torch post",emoji:"🔥",r:0.3,cost:{stick:2,resin:1},helper:1,desc:"a torch on a pole. it lights the ground around it, day and night."});
station("sunlamp",{label:"sun lamp",emoji:"☀️",r:0.3,cost:{crystal:1,glass:1,stick:2},helper:1,desc:"a crystal under glass. it drinks the daylight and gives it back all night."});
station("banner",{label:"banner",emoji:"🚩",r:0.3,cost:{cloth:2,stick:2},helper:1,desc:"woven on a loom, hung on a pole. hold a dye and look at it to give it a colour."});
station("statue",{label:"carving",emoji:"🗿",r:0.5,cost:{cutblock:3},helper:1,born:function(game,c,b){b.data.mood=H.moodOf(game,c);b.data.by=c.name||"";},desc:"a smol carved in stone. it keeps the mood its maker was in, and whoever stops to look at it feels a little of that."});
H.moodOf=function(game,c){var ch=c.chem||{};return(ch.health!=null&&ch.health<0.5)||(ch.lonely||0)>0.6||(ch.fear||0)>0.5?"ache":H.buffs(c,game).length||(ch.bored||0)<0.3?"joy":"calm";};
H.look=function(game,c,b){
var d=b&&b.data,ch=c.chem;
if(!b||b.kind!=="statue"||!d)return{ok:false,msg:""};
if(d.seenT&&game.time-d.seenT<120)return{ok:false,msg:"you have only just looked. it is still with you"};
d.seenT=game.time;
if(d.mood==="joy"){ch.bored=Math.max(0,(ch.bored||0)-0.25);ch.lonely=Math.max(0,(ch.lonely||0)-0.1);}
else if(d.mood==="ache"){ch.lonely=Math.max(0,(ch.lonely||0)-0.2);if(ch.anger!=null)ch.anger=Math.max(0,ch.anger-0.2);}
else{if(ch.fear!=null)ch.fear=Math.max(0,ch.fear-0.25);if(ch.anger!=null)ch.anger=Math.max(0,ch.anger-0.25);}
emit("carvingSeen",{c:c,st:b,mood:d.mood});
return{ok:true,mood:d.mood,msg:"🗿 "+(d.by?d.by+" carved this":"somebody carved this")+(d.mood==="joy"?" on a good day. you can tell. it rubs off":d.mood==="ache"?" on a hard day. you are not the only one who has had those":" in a quiet hour. your shoulders come down")};
};
H.crateWhy=function(b,sl){var box=b.data.box||(b.data.box=[]);return!sl?"hold what you want to put in":sl.k==="plans"?"that stays with you":box.length>=6?"the crate is full (six stacks)":"";};
H.crateIn=function(game,c,b){
var v=Sv().inv(c),sl=v.s[v.sel],why=b&&b.kind==="crate"?H.crateWhy(b,sl):"no crate";
if(why)return{ok:false,msg:why};
b.data.box.push({k:sl.k,n:sl.n,w:sl.w});v.s[v.sel]=null;mark(game,b);
return{ok:true,msg:"📦 "+sl.n+" "+label(sl.k)+" in the crate ("+b.data.box.length+"/6)"};
};
H.crateOut=function(game,c,b){
var box=b&&b.data&&b.data.box,n=0;
if(!box||!box.length)return{ok:false,msg:"the crate is empty"};
for(var i=box.length-1;i>=0;i--){var e=box[i],left=K[e.k]?Sv().add(c,e.k,e.n,e.w):0;n+=e.n-left;if(left>0)e.n=left;else box.splice(i,1);}
mark(game,b);
return n?{ok:true,n:n,msg:"📦 you take "+n+" thing"+(n>1?"s":"")+" out"+(box.length?". the rest would not fit":"")}:{ok:false,msg:"no room in your bag"};
};
H.hutOut=function(game,c,b){
var box=b&&b.data&&b.data.box,n=boxN(box);
if(!n)return{ok:false,msg:"the helper has nothing for you yet"};
for(var k in box)give(game,c,k,box[k]);
b.data.box={};mark(game,b);xp(c,"farm",2);
return{ok:true,n:n,msg:"🛖 the helper hands over "+n+" thing"+(n>1?"s":"")+" from your beds"};
};
function hutWork(game,hut){
var d=hut.data,beds=SB.World.structsNear(game.world,hut.x,hut.z,H.MACH.helperhut.reach,function(o){return H.ripe(o);});
if(!beds.length||boxN(d.box)>=40)return false;
var b=beds[0],bd=b.data,cr=CROP[bd.crop],n=bd.giant?5:cr.y[0];
if(!d.box||typeof d.box!=="object")d.box={};
d.box[cr.out]=(d.box[cr.out]||0)+n;
if(cr.regrow&&!H.whyNotGrow(game,b,cr)){bd.g=Math.max(0.45,1-cr.regrow/cr.grow);bd.age=0;bd.care=0;bd.q=0;bd.giant=0;}
else{bd.crop=null;bd.g=0;bd.fert=0;bd.giant=0;bd.q=0;}
restage(game,b);mark(game,hut);
emit("helperPicked",{st:hut,bed:b,crop:cr.id,n:n});
return true;
}
function potServe(game,pot){
var d=pot.data,cs=game.creatures||[];
if(!(d.n>0)||d.t>0)return false;
for(var i=0;i<cs.length;i++){
var o=cs[i];
if(!o||!o.alive||o.species!=="smol"||o._pov||o.asleep||!(o.chem&&o.chem.hunger>0.55)||SB.dist(o.x,o.z,pot.x,pot.z)>7)continue;
o.chem.hunger=Math.max(0,o.chem.hunger-0.45);d.n--;if(d.n<=0){d.n=0;d.out=null;}
var s=st(game);s.served=(s.served||0)+1;mark(game,pot);
emit("stewServed",{c:o,st:pot});
return true;
}
return false;
}
H.MAX_ORDERS=4;
H.orderable=function(game){
var out=[];
H.CRAFTS.forEach(function(x){if(!x.build&&!x.bed&&x.out&&K[x.out])out.push({id:x.id,out:x.out,n:x.n||1,cost:x.cost,name:label(x.out)});});
if(SB.Ideas&&Sv().allRecipes){try{Sv().allRecipes().forEach(function(rc){if(rc.out&&K[rc.out]&&(!rc.d&&!rc.idea||(game.culture&&game.culture.found&&game.culture.found[rc.idea||rc.id])))out.push({id:"s:"+rc.id,out:rc.out,n:1,cost:rc.in,name:label(rc.out)});});}catch(e){}}
return out;
};
H.orders=function(game){var s=st(game);if(!Array.isArray(s.orders))s.orders=[];return s.orders;};
H.order=function(game,o){
var L=H.orders(game),rc=null;
H.orderable(game).forEach(function(x){if(x.id===o.id)rc=x;});
if(!rc)return{ok:false,msg:"the bench doesn't know how to make that"};
if(L.length>=H.MAX_ORDERS)return{ok:false,msg:"that is as many orders as one bench can keep in its head ("+H.MAX_ORDERS+")"};
var e={id:o.id,mode:o.mode==="once"||o.mode==="ever"?o.mode:"keep",n:Math.max(1,Math.min(24,o.n|0||3)),who:o.who||0,spare:o.spare?1:0,made:0};
L.push(e);
return{ok:true,order:e,msg:"📋 standing order: "+H.orderText(game,e)};
};
H.orderText=function(game,e){
var nm=e.id;H.orderable(game).forEach(function(x){if(x.id===e.id)nm=x.name;});
var who=e.who?SB.Game.byId(game,e.who):null;
return nm+" · "+(e.mode==="once"?e.n+" more, then stop":e.mode==="ever"?"for ever":"keep "+e.n+" in the chest")+" · "+(who?"only "+who.name:"any smol")+(e.spare?" · never the last of a thing":"");
};
H.orderEdit=function(game,i,what){
var L=H.orders(game),e=L[i],c=me();
if(!e)return false;
if(what==="x")L.splice(i,1);
else if(what==="mode")e.mode=e.mode==="once"?"keep":e.mode==="keep"?"ever":"once";
else if(what==="+")e.n=Math.min(24,e.n+1);
else if(what==="-")e.n=Math.max(1,e.n-1);
else if(what==="who")e.who=e.who?0:c?c.id:0;
else if(what==="spare")e.spare=e.spare?0:1;
return true;
};
function chestCount(ch,want,spare){var n=0;for(var i=0;i<ch.length;i++)if(ch[i]&&(GROUPS[want]?GROUPS[want].is(ch[i].k):ch[i].k===want))n+=ch[i].n-(spare?1:0);return Math.max(0,n);}
function chestTake(ch,want,n,spare){for(var i=0;i<ch.length&&n>0;i++){var sl=ch[i];if(!sl||!(GROUPS[want]?GROUPS[want].is(sl.k):sl.k===want))continue;var t=Math.min(n,sl.n-(spare?1:0));if(t<=0)continue;sl.n-=t;n-=t;if(sl.n<=0)ch[i]=null;}return n;}
H.workOrders=function(game){
var L=H.orders(game),Hm=SB.Home,s=st(game);
if(!L.length)return{ok:false,why:"no orders"};
if(!Hm||!Hm.has||!Hm.has(game,"chest"))return{ok:false,why:"orders need a chest at home: the bench works from it and into it"};
var benches=game.world.structures.filter(function(b){return b.kind==="workbench"&&b.done;});
if(!benches.length)return{ok:false,why:"no workbench"};
var ch=Hm.chest(game),cs=game.creatures||[],list=H.orderable(game);
function workerFor(e){
for(var i=0;i<cs.length;i++){var o=cs[i];if(!o||!o.alive||o.species!=="smol"||o.tier<2||o.asleep||(e.who&&o.id!==e.who))continue;for(var j=0;j<benches.length;j++)if(SB.dist(o.x,o.z,benches[j].x,benches[j].z)<=12)return o;}
return null;
}
for(var i=0;i<L.length;i++){
var e=L[i],rc=null,k,can=true;
list.forEach(function(x){if(x.id===e.id)rc=x;});
if(!rc)continue;
if(e.mode==="keep"&&chestCount(ch,rc.out)>=e.n)continue;
for(k in rc.cost)if(chestCount(ch,k,e.spare)<rc.cost[k])can=false;
if(!can){e.why="short of materials in the chest";continue;}
var w=workerFor(e);
if(!w){e.why=e.who?"its smol is not near the bench":"no smol with hands is near the bench";continue;}
for(k in rc.cost)chestTake(ch,k,rc.cost[k],e.spare);
var left=Hm.put(game,rc.out,rc.n,isTool(rc.out)?Sv().uses(rc.out)+0.25:undefined);
if(left>0&&Sv().spawn)Sv().spawn(game,rc.out,left,benches[0].x+0.8,benches[0].z+0.5,{});
e.made=(e.made||0)+rc.n;e.why="";s.ordersMade=(s.ordersMade||0)+rc.n;
if(SB.Body&&w)SB.Body.xp(w,"craft",1);
if(e.mode==="once"&&--e.n<=0)L.splice(i,1);
emit("orderMade",{c:w,id:rc.id,kind:rc.out,n:rc.n});
return{ok:true,kind:rc.out,n:rc.n,by:w};
}
return{ok:false,why:"nothing to do"};
};
H.again=function(game,c){
var id=st(game).last,n=0,r=null;
if(!id||!CRAFT[id]||CRAFT[id].build)return{ok:false,msg:"make something first"};
while(n<10&&!H.whyNotMake(game,c,id)){r=H.make(game,c,id);if(!r.ok)break;n++;}
return n?{ok:true,n:n,msg:"made "+n+" more: "+label(CRAFT[id].out)+(n>=10?" (ten at a go)":". that is all the makings you had")}:{ok:false,msg:H.whyNotMake(game,c,id)||"it didn't work"};
};
function craftAdd(x){H.CRAFTS.push(x);CRAFT[x.id]=x;return x;}
[{id:"shears",cost:{flint:2,vine:1}},{id:"whetstone",cost:{stone:2,flint:1}},{id:"striker",cost:{flint:1,metal:1}},
{id:"goldpick",cost:{gold:2,stick:1,vine:1}},{id:"glassblade",cost:{obsidian:2,stick:1,vine:1},at:"bench"},{id:"staraxe",cost:{starmetal:1,hardwood:1},at:"bench"},
{id:"copperrod",cost:{rod:1,metal:1}},{id:"crystalrod",cost:{finerod:1,crystal:1},at:"bench"},{id:"staff",cost:{lens:1,stick:1,vine:1},at:"bench"},
{id:"candle",n:2,cost:{honey:1,fiber:1}},{id:"oillamp",cost:{oil:1,clay:1,fiber:1}},{id:"thunderpot",cost:{pot:1,charcoal:3,resin:1},tier:5},
{id:"glowpod",n:2,cost:{glowcap:1,leaves:1}},{id:"beetlejar",cost:{bait:2,clay:1}},{id:"bellows",cost:{leather:1,plank:2}},
{id:"pack",cost:{cloth:3,leather:1,vine:2}},{id:"pouch",cost:{cloth:1,vine:1}},{id:"blanket",cost:{cloth:2,fur:1}},{id:"hanging",cost:{cloth:1,"dye*":1}},
{id:"float",cost:{stick:1,resin:1}},{id:"spinner",cost:{flint:1,fiber:1}},{id:"strongline",cost:{fiber:3,resin:1}},{id:"emberhook",cost:{obsidian:1,fiber:1}}
].forEach(function(x){x.out=x.id;x.n=x.n||1;x.g="tools";craftAdd(x);});
[{id:"leather",cost:{fur:1,bark:1},at:"water",note:"tanned at the water"},{id:"cutblock",cost:{stone:2},at:"bench"},{id:"cutgem",cost:{crystal:2},at:"bench"},
{id:"glass",cost:{sand:2,charcoal:1},at:"kiln"},{id:"gold",cost:{goldfleck:3,charcoal:1},at:"kiln"},
{id:"resmelt",out:"iron",cost:{metal:3,charcoal:1},at:"kiln",note:"three copper cooked down hard"},{id:"unsmelt",out:"metal",n:2,cost:{iron:1,charcoal:1},at:"kiln",note:"one iron let out into two copper"},
{id:"ironchar",out:"iron",cost:{ironore:1,charcoal:1},at:"kiln",note:"charcoal does a log's work"},
{id:"cutlet",n:2,cost:{meat:1},needs:"blade",note:"cut up with a blade"},
{id:"graftglow",out:"s_glowgourd",cost:{s_gourd:1,s_glowcap:1},note:"a cross"},{id:"graftstar",out:"s_starberry",cost:{s_berry:1,s_starmelon:1},note:"a cross"},
{id:"planter",bed:1,cost:{clay:2},note:"a clay pot that is a garden bed: no hoe needed, and the birds leave it alone"}
].forEach(function(x){x.out=x.bed?null:x.out||x.id;x.n=x.n||1;x.g="stuff";craftAdd(x);});
[["glowhat",{glowcap:2,cloth:1}],["clamcap",{shell:3,fiber:1}],["gourdmask",{pumpkin:1,vine:1}],["fisherhat",{cloth:1,fiber:2}],["strawhat",{grain:3,fiber:1}],["parasol",{leaves:4,stick:1}],
["thorncloak",{pricklypear:3,cloth:2}],["canevest",{stick:4,cloth:1,vine:1}],["scarf",{cloth:2}],["pawwraps",{leather:1,moss:1}],["furboots",{fur:2,leather:1}],
["crystalcharm",{crystal:1,vine:1}],["shellcharm",{shell:2,vine:1}],["goldring",{gold:1}],["wordcharm",{crystal:1,mote:1,vine:1}],["gemcharm",{cutgem:1,vine:1}]
].forEach(function(x){craftAdd({id:x[0],out:x[0],n:1,cost:x[1],g:"wear",at:WEAR[x[0]].slot==="charm"&&x[0]!=="shellcharm"?"bench":null});});
H.CRAFTS.forEach(function(x){if(!x.g)x.g="hand";});
H.GROUPS_MAKE=[["hand","🌾 farm and water"],["tools","🛠 tools"],["stuff","🧱 materials"],["wear","🧥 wear"],["stations","🏗 stations"]];
H.whyNotHere=function(game,c,x){
if(x.tier&&c.tier<x.tier)return"that is a "+(SB.TIERS&&SB.TIERS[x.tier]?SB.TIERS[x.tier].name:"bigger brain")+"'s idea";
if(x.at==="bench"&&!H.atBench(game,c))return"make it at a workbench";
if(x.at==="kiln"&&!H.atKiln(game,c))return"make it at a lit kiln";
if(x.at==="water"&&!waterNear(game,c.x,c.z,4))return"make it at the water";
if(x.needs&&!Sv().count(c,x.needs,true))return"you need a "+label(x.needs);
return"";
};
function stampWear(game,c,k){
var v=Sv().inv(c),s=st(game),q=1;
if(SB.Fight&&SB.Fight.rollQual){try{q=SB.Fight.rollQual(game,c);}catch(e){q=1;}}
else{var l=lv(c,"craft"),r=rnd(game,"wq"+(s.wq=(s.wq||0)+1))();q=r<(l-5)*0.06?3:r<0.08+l*0.05?2:r>0.7+l*0.06?0:1;}
for(var i=0;i<v.s.length;i++)if(v.s[i]&&v.s[i].k===k&&typeof v.s[i].w==="number"&&fracOf(v.s[i].w)===0){v.s[i].w=100+QF[q];return q;}
return-1;
}
H.stampWear=stampWear;
var LIT={candle:[5,1,0.85,0.55],oillamp:[8,1,0.8,0.5],glowgourd:[5,0.6,1,0.8],staff:[5,0.8,0.95,1]};
H.lightOf=function(c){var k=Sv()?Sv().heldKind(c):null,L=k&&LIT[k]?LIT[k][0]:0;if(H.worn(c,"glowhat"))L=Math.max(L,7);return L;};
var lampList=[],maskT=0;
H.lampsNear=function(){return lampList;};
function lightTick(game,c){
var R=SB.Render,w=game.world,i;
if(!R||!R.light||!c)return;
var k=Sv().heldKind(c),y=(c.y!=null?c.y:SB.World.groundY(w,c.x,c.z))+0.9;
if(H.worn(c,"glowhat"))R.light(c.x,y+0.3,c.z,7,0.55,0.9,1);
else if(k&&LIT[k])R.light(c.x,y,c.z,LIT[k][0],LIT[k][1],LIT[k][2],LIT[k][3]);
for(i=0;i<lampList.length;i++){var b=lampList[i];if(b.kind==="torchpost")R.light(b.x,b._gy+1.2,b.z,7,1,0.72,0.35);else if(w.night)R.light(b.x,b._gy+1.1,b.z,8,0.85,0.95,1);}
for(i=H.glows.length-1;i>=0;i--){var g=H.glows[i];if(g.until<game.time)H.glows.splice(i,1);else R.light(g.x,SB.World.groundY(w,g.x,g.z)+0.3,g.z,6,0.6,1,0.75);}
}
function wearTick(game,c,dt){
var P=Ps(),S=P&&P.state?P.state():null,ch=c.chem,b=c.body,w=c.wear,t=game.time;
if(c.due&&t>=c.due.at){c.flat=t+c.due.secs;c.due=null;say("😮‍💨 it has worn off. you feel flat for a while");}
if(c.flat>t){if(S&&typeof S.stam==="number")S.stam=Math.max(0,S.stam-dt*0.012);ch.bored=Math.min(1,(ch.bored||0)+dt*0.002);}
if(c.fed>t&&ch.health>0&&ch.health<1)ch.health=Math.min(1,ch.health+dt*0.003);
if(H.has(c,"glow",game)){if(S&&typeof S.stam==="number")S.stam=Math.min(1,S.stam+dt*0.07);}
if(H.has(c,"tipsy",game)&&!c.asleep&&Math.random()<dt*0.6){var a=(c.facing||0)+1.57,d=(Math.random()-0.5)*0.16,nx=c.x+Math.sin(a)*d,nz=c.z+Math.cos(a)*d;if(SB.World.walkable(game.world,nx,nz,false)){c.x=nx;c.z=nz;}}
if(Sv().count(c,"blanket",true)&&c.asleep&&ch.cold!=null)ch.cold=Math.max(0,ch.cold-dt*0.03);
if(!w)return;
var warm=H.warmth(c),rain=raining(game);
if(warm&&ch.cold!=null)ch.cold=Math.max(0,ch.cold-dt*0.006*warm);
if(b&&b.wet>0){
var shed=Math.max(H.worn(c,"parasol")?1:0,w.body&&WEAR[w.body.k]?WEAR[w.body.k].rain:0);
if(rain&&shed)b.wet=Math.max(0,b.wet-dt*0.02*shed);
if(H.worn(c,"pawwraps")&&SB.World.depthAt(game.world,c.x,c.z)>0.02)b.wet=Math.max(0,b.wet-dt/5);
}
if(H.worn(c,"clamcap")&&c.drownT>0){c.drownT=Math.max(0,c.drownT-dt*0.7);ch.health=Math.min(1,ch.health+dt*0.02);}
if(H.worn(c,"crystalcharm")&&S&&typeof S.stam==="number")S.stam=Math.min(1,S.stam+dt*0.02*H.worn(c,"crystalcharm"));
if(H.worn(c,"goldring")){ch.bored=Math.max(0,(ch.bored||0)-dt*0.004);ch.lonely=Math.max(0,(ch.lonely||0)-dt*0.004);}
if(H.worn(c,"gourdmask")&&(maskT+=dt)>1){maskT=0;H.maskTick(game,c);}
}
H.maskTick=function(game,c){
var F=SB.Fight,n=0;
if(c._maskOff>game.time)return 0;
grumpsNear(game,c.x,c.z,16,function(g){
if(g.boss||g.scout||g.goingHome||SB.dist(g.x,g.z,c.x,c.z)<3)return;
if(F&&F.aware&&!F.aware(g,c))return;
g.attn=null;g.action=null;n++;
});
return n;
};
function wearSlow(game,step){
var c=me(),cs=game.creatures||[],i;
if(c){
if(H.worn(c,"wordcharm")&&game.quests&&game.quests.powers&&game.quests.powers.cd){var cd=game.quests.powers.cd;for(var k in cd)if(k.indexOf("w:")===0&&cd[k]>game.time)cd[k]-=step*0.5*H.worn(c,"wordcharm");}
var hk=Sv().heldKind(c);
if(raining(game)&&H.WATER[hk]&&(c.sip||0)<H.WATER[hk])c.sip=H.WATER[hk];
lampList=SB.World.structsNear(game.world,c.x,c.z,40,function(b){return b.kind==="torchpost"||b.kind==="sunlamp";});
lampList.forEach(function(b){if(b._gy==null)b._gy=SB.World.groundY(game.world,b.x,b.z);});
}else lampList=[];
for(i=0;i<cs.length;i++){var o=cs[i];if(o&&o.alive&&o!==c&&o.wear&&o.wear.body&&o.chem&&o.chem.cold>0)o.chem.cold=Math.max(0,o.chem.cold-step*0.004*H.warmth(o));}
}
H.dressAll=function(game){
var n=0;
(game.creatures||[]).forEach(function(o){
if(!o||!o.alive||o.species!=="smol"||o.tier<2||!o.inv||!o.inv.s||(o.wear&&o.wear.body))return;
var k=o.inv.s.some(function(sl){return sl&&sl.k==="cloak";})?"cloak":o.inv.s.some(function(sl){return sl&&sl.k==="scarf";})?"scarf":null;
if(k&&H.putOn(game,o,k).ok)n++;
});
if(n)emit("dressed",{n:n});
return n;
};
H.bitten=function(game,c,g){
if(!c||!g||!c.wear)return;
var th=H.worn(c,"thorncloak"),ve=H.worn(c,"canevest");
if(th){g.whacked=(g.whacked||0)+0.6*th;emit("thorns",{c:c,g:g});}
if(ve&&c.chem)c.chem.health=Math.min(1,c.chem.health+0.025*ve);
};
var ordAcc=0;
H.slow2=function(game,step){
var sts=game.world.structures,i;
for(i=0;i<sts.length;i++){
var b=sts[i],d=b.data;
if(!d)continue;
if(d.dye&&b._dyed!==d.dye)applyDye(game,b);
if(b.kind==="helperhut"){if((d.hv=(d.hv||0)+step)>=30){d.hv=0;hutWork(game,b);}}
else if(b.kind==="stewpot"&&d.n>0&&!(d.t>0)){if((d.sv=(d.sv||0)+step)>=20){d.sv=0;potServe(game,b);}}
else if(isBed(b)&&d.crop==="snapper"&&d.g>=1)grumpsNear(game,b.x,b.z,2.6,function(g){if(!g.boss){g.whacked=(g.whacked||0)+0.5;emit("snapperNip",{st:b,g:g});}});
}
if((ordAcc+=step)>=30){ordAcc=0;if(st(game).orders&&st(game).orders.length)H.workOrders(game);}
wearSlow(game,step);
};
H.tick2=function(game,dt){
var c=me();
if(!c||!c.alive)return;
wearTick(game,c,dt);
lightTick(game,c);
};
function freePlace(o){return!o.place||o.place.locked||/^put down/.test(o.place.label||"");}
H.options2=function(game,c,r,o,x){
if(!c||c.tier<2||!Sv()||(F&&F.cid===c.id))return;
var hk=x.hk,op=x.op,no=x.no,held=Sv().held(c),ag=x.state&&x.state.aim?x.state.aim:null;
function bench(){page="bench";x.openBag("harvest");return true;}
if(r&&r.type==="struct"){
var b=r.ref,d=b.data||{};
if(DYE[hk]&&b.done&&!isBed(b)){o.use=op("paint the "+(SK[b.kind]?SK[b.kind].label:"building")+" "+DYE[hk].name,function(){return done(x,H.paint(game,c,b,hk),"build");},null);return;}
if(b.kind==="workbench"){o.use=op("use the workbench",bench,null);o.pick=o.use;return;}
if(b.kind==="crate"){
var n=(d.box||[]).length;
o.use=held?(H.crateWhy(b,held)?no(H.crateWhy(b,held)):op("put your "+label(hk)+" in the crate",function(){return done(x,H.crateIn(game,c,b),"craft");},null)):no(n?"a crate: "+n+" stack"+(n>1?"s":"")+" inside":"an empty crate: hold something to put it in");
if(n)o.pick=op("take everything out of the crate",function(){return done(x,H.crateOut(game,c,b),"craft");},null);
o.place=n?o.pick:op("take the crate down",function(){return done(x,H.remove(game,c,b),"build");},null);
return;
}
if(b.kind==="helperhut"){
var hn=boxN(d.box);
o.use=hn?op("take what the helper picked ("+hn+")",function(){return done(x,H.hutOut(game,c,b),"craft");},null):no("the helper is watching your beds. nothing picked yet");
if(hn){o.pick=o.use;o.place=o.use;}
return;
}
if(b.kind==="statue"){o.use=op("look at the carving",function(){return done(x,H.look(game,c,b),"chime");},null);o.pick=o.use;}
if(b.kind==="sprinkler"){
if(hk==="clay"&&!d.wide)o.use=op("fit a wide spout (2 clay)",function(){return done(x,H.pipeAdd(game,c,b,"wide"),"build");},null);
else if(hk==="compost")o.use=op("fill the pipe's compost drip",function(){return done(x,H.pipeAdd(game,c,b,"drip"),"build");},null);
return;
}
if(isBed(b)){
if(d.crop==="bean"&&!d.trellis&&!d.dead&&d.g<1&&(hk==="stick"||hk==="plank"))o.place=op("put up a trellis (2 sticks)",function(){return done(x,H.trellis(game,c,b),"build");},null);
return;
}
if((b.kind==="campfire"||b.kind==="kiln")&&b.done&&!d.lit&&hk==="striker"){o.use=op("strike a light",function(){return done(x,H.strike(game,c,b),"craft");},null);return;}
return;
}
if(r&&r.type==="node"){
var nd=r.ref,rock=Sv().ROCKS&&Sv().ROCKS[nd.kind];
if(hk==="thunderpot"&&rock&&nd.state==="ok"){o.use=op("set off the thunder pot",function(){return done(x,H.boom(game,c,nd),"bonk");},null);return;}
if(hk==="striker"&&nd.kind==="deadtree"&&nd.state==="ok"){o.use=op("set the dead tree alight",function(){return done(x,H.strike(game,c,nd),"craft");},null);return;}
if(hk==="shears"&&H.canClip(game,nd)){o.use=op("clip the "+NK[nd.kind].label,function(){if(x.swing)x.swing();return done(x,H.clip(game,c,nd),"craft");},null);return;}
if(nd.kind==="vent"&&H.RODS[hk]&&H.RODS[hk].line&&c.tackle&&c.tackle.k==="emberhook"){o.use=op("cast into the vent pool",function(){var rr=H.cast(game,c,nd.x,nd.z,"vent");if(x.swing)x.swing();x.say(rr.msg);return rr.ok;},null);return;}
if(rock&&!rock.ore&&nd.state==="ok"&&heldTool(c)&&Sv().power(hk).dmg>0&&H.bits(held.w).temper<2&&freePlace(o))o.place=op("sharpen your "+label(hk)+" on the rock",function(){return done(x,H.temper(game,c),"craft");},null);
return;
}
if(r&&r.type==="water"){
if(hk==="basket")o.use=op("pan the gravel",function(){return done(x,H.pan(game,c,r.x!=null?r.x:c.x,r.z!=null?r.z:c.z),"craft");},null);
else if(DYE_FROM[hk]&&Sv().count(c,hk,true)>=2&&(!o.use||o.use===o.place))o.use=op("crush 2 "+label(hk)+" into "+DYE[DYE_FROM[hk]].name+" dye",function(){return done(x,H.crush(game,c,hk),"craft");},null);
return;
}
if(r&&r.type==="item"){
if(r.ref&&r.ref.data&&r.ref.data.rotten)o.pick=op("rake it into compost",function(){return done(x,H.rake(game,c,r.ref),"craft");},null);
return;
}
if(r)return;
if(WEAR[hk])o.use=op("put on the "+label(hk),function(){return done(x,H.putOn(game,c,hk),"craft");},null);
else if(TACKLE[hk])o.use=op("tie the "+label(hk)+" to your line",function(){return done(x,H.tie(game,c,hk),"craft");},null);
else if(hk==="staff")o.use=op("raise the staff",function(){if(x.swing)x.swing();return done(x,H.staff(game,c),"chime");},null);
else if(hk==="glowpod"||hk==="beetlejar")o.use=op("throw the "+label(hk),function(){if(x.swing)x.swing();return done(x,H.throwPod(game,c,ag),"craft");},null);
if(H.canComb(game,c)&&freePlace(o)&&!(hk==="hoe"))o.place=op("comb the beach",function(){return done(x,H.comb(game,c),"craft");},null);
};
var mixSel=[],mixStrong=false,makeG="hand";
H.setMakeGroup=function(g){makeG=g;};
function benchHtml(game,c,icon){
var sl=heldTool(c),held=Sv().held(c),at=H.atBench(game,c),out="<div class='lbl'>"+(at?"🔨 you're at a workbench":"no workbench here: set one up from the make page (4 planks, 2 rocks)")+"</div>";
if(sl){
var t=H.bits(sl.w),full=fullOf(sl),cost=H.repairCost(sl);
out+="<div class='rc'><span class='big'>"+icon(sl.k,28)+"</span><div class='t'>"+esc(H.toolName(game,sl))+"<small>"+t.n+" of "+full+" uses"+(t.reps?" · mended ×"+t.reps:"")+(t.gem?" · "+esc(H.GEMS[t.gem].tip):"")+"</small></div></div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
out+="<button class='btn' data-hvtool='whet' "+(Sv().count(c,"whetstone",true)&&t.n<full?"":"disabled")+">🪨 whet (1 rock)</button>";
out+="<button class='btn' data-hvtool='repair' "+(at&&t.n<full&&t.reps<3?"":"disabled")+">🔨 mend ("+cost.n+" "+esc(label(cost.k))+")</button>";
out+="<button class='btn' data-hvtool='apart' "+(at?"":"disabled")+">take apart</button>";
if(!t.heir)out+="<button class='btn' data-hvtool='name' "+(at&&(t.temper||qOf(sl.w)>=2)?"":"disabled")+">🏷 name it</button>";
if(sl.k==="staff")out+="<button class='btn' data-hvtool='charge'>🪄 feed the staff</button>";
out+="</div>";
if(!t.gem&&Sv().power(sl.k).dmg>0){
out+="<div class='lbl'>set a stone in it (workbench or lit kiln)</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
H.GEMS.forEach(function(g){if(!g)return;var kn=H.knowsGem(game,c,g);out+="<button class='btn' data-hvgem='"+g.id+"' "+(kn&&H.gemItem(c,g)&&(at||H.atKiln(game,c))?"":"disabled")+">"+(kn?icon(g.k,16)+" "+esc(g.name)+": "+esc(g.tip):"❔ crafting "+g.lvl)+"</button>";});
out+="</div>";
}
if(t.temper<2)out+="<p class='help'>look at a boulder with it in your paw to sharpen it"+(t.temper?" again (crafting 3)":"")+".</p>";
}else if(held&&JUNK[held.k])out+="<div class='row'><button class='btn' data-hvtool='apart' "+(at?"":"disabled")+">break the "+esc(label(held.k))+" down</button></div>";
else out+="<p class='help'>hold a tool to whet it, mend it, take it apart, set a stone in it or name it.</p>";
var s=st(game),L=H.orders(game);
out+="<div class='lbl'>make another</div><div class='row'><button class='btn' data-hvtool='again' "+(s.last&&CRAFT[s.last]&&!H.whyNotMake(game,c,s.last)?"":"disabled")+">🔁 "+(s.last&&CRAFT[s.last]?esc(label(CRAFT[s.last].out))+", while the makings last":"make something first")+"</button></div>";
out+="<div class='lbl'>standing orders "+L.length+"/"+H.MAX_ORDERS+(s.ordersMade?" · made so far "+s.ordersMade:"")+"</div>";
L.forEach(function(e,i){
out+="<div class='rc'><div class='t'>"+esc(H.orderText(game,e))+(e.why?"<small class='no'>"+esc(e.why)+"</small>":"")+"</div><button class='btn' data-hvord='"+i+":mode'>mode</button><button class='btn' data-hvord='"+i+":-'>−</button><button class='btn' data-hvord='"+i+":+'>+</button><button class='btn' data-hvord='"+i+":who'>who</button><button class='btn' data-hvord='"+i+":spare'>spare</button><button class='btn' data-hvord='"+i+":x'>✕</button></div>";
});
if(L.length<H.MAX_ORDERS){out+="<div class='row' style='display:flex;gap:4px'><select data-hvordsel='1'>";H.orderable(game).forEach(function(x){out+="<option value='"+esc(x.id)+"'>"+esc(x.name)+"</option>";});out+="</select><button class='btn go' data-hvordadd='1'>add order</button></div>";}
out+="<p class='help'>orders are worked at a workbench by any smol with hands who is near it, out of the chest at home and back into it.</p>";
return out;
}
function wearHtml(game,c,icon){
var w=wearOf(c),v=Sv().inv(c),out="<div class='lbl'>what "+esc(c.name||"this smol")+" is wearing · warmth "+H.warmth(c)+"</div><div class='rlist'>",dyes=[],seen={};
v.s.forEach(function(sl){if(sl&&DYE[sl.k]&&!seen[sl.k]){seen[sl.k]=1;dyes.push(sl.k);}});
H.SLOTS.forEach(function(s,i){
var r=w[s[0]];
out+="<div class='rc'><span class='big'>"+(r?icon(r.k,28):"·")+"</span><div class='t'>"+(i<3?SLOT_NAME[s[1]]||s[1]:"charm "+(i-2))+": "+(r?esc(recName(r)):"nothing")+(r?"<small>"+esc(WEAR[r.k].tip+(r.k2?" · "+WEAR[r.k2].tip:""))+"</small>":"")+"</div>";
if(r){dyes.forEach(function(dk){out+="<button class='btn' data-hvdye='"+s[0]+":"+dk+"'>🎨 "+esc(DYE[dk].name)+"</button>";});out+="<button class='btn' data-hvoff='"+s[0]+"'>take off</button>";}
out+="</div>";
});
out+="</div>";
var on=[];seen={};
v.s.forEach(function(sl){if(sl&&WEAR[sl.k]&&!seen[sl.k]){seen[sl.k]=1;on.push("<button class='btn go' data-hvon='"+sl.k+"'>"+icon(sl.k,16)+" put on "+esc(label(sl.k))+"</button>");}});
out+="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>"+(on.length?on.join(""):"<span class='help'>nothing to wear in your bag. the make page has hats, cloaks, wraps and charms.</span>")+"</div>";
out+="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px;margin-top:6px'>";
[0,1].forEach(function(i){out+="<button class='btn' data-hvset='save:"+i+"'>remember as outfit "+(i+1)+"</button><button class='btn' data-hvset='use:"+i+"' "+(c.outfits&&c.outfits[i]?"":"disabled")+">wear outfit "+(i+1)+"</button>";});
if(w.c1&&w.c2&&!w.c1.k2&&!w.c2.k2)out+="<button class='btn' data-hvset='bind:0' "+(H.atBench(game,c)?"":"disabled")+">📿 bind the two charms (1 vine, at a bench)</button>";
out+="</div>";
if(Sv().count(c,"pouch",true)||pouchN(c))out+="<div class='lbl'>spill pouch "+pouchN(c)+"/"+H.POUCH+"</div><div class='row'><button class='btn' data-hvset='pouch:0' "+(pouchN(c)?"":"disabled")+">tip it into your bag</button></div>";
var tk=[];seen={};
v.s.forEach(function(sl){if(sl&&TACKLE[sl.k]&&!seen[sl.k]){seen[sl.k]=1;tk.push("<button class='btn' data-hvtie='"+sl.k+"'>🪝 tie on the "+esc(label(sl.k))+"</button>");}});
if(tk.length)out+="<div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>"+tk.join("")+"</div>";
if(c.tackle&&c.tackle.k)out+="<p class='help'>🪝 on your line: "+esc(label(c.tackle.k))+", "+c.tackle.n+" casts left.</p>";
if(c.bagx)out+="<p class='help'>deep pockets: "+3*Math.min(3,c.bagx)+" more bag slots, for good.</p>";
return out;
}
function brewHtml(game,c,icon){
var have=[],out="<div class='lbl'>"+(H.nearFire(game,c)?"🔥 by a fire":"brew by a lit fire")+(Sv().count(c,"pot",true)?" · you have a pot":" · you need a pot")+" · pick two things that share an effect</div><div class='row' style='display:flex;flex-wrap:wrap;gap:4px'>";
for(var k in H.EFFECT)if(K[k]&&Sv().count(c,k,true)>0)have.push(k);
mixSel=mixSel.filter(function(x){return have.indexOf(x)>=0;});
have.forEach(function(x){
var ef=H.knownEffects(game,x);
out+="<button class='btn"+(mixSel.indexOf(x)>=0?" go":"")+"' data-hvmixsel='"+x+"'>"+icon(x,16)+" "+esc(label(x))+" <small>"+ef.map(function(e){return e?H.BUFFS[e].icon:"❔";}).join("")+"</small></button>";
});
if(!have.length)out+="<span class='help'>nothing to brew with. herbs, leaves, sap, honey, mushrooms and berries all do something: eat one to learn its first effect.</span>";
out+="</div>";
if(Sv().count(c,"ashroot",true))out+="<div class='row'><button class='btn"+(mixStrong?" go":"")+"' data-hvmixstrong='1'>⚗️ add ashroot: twice as long, then flat for a while</button></div>";
var why=mixSel.length===2?H.whyNotMix(game,c,mixSel[0],mixSel[1]):"pick two";
out+="<div class='row'><button class='btn go' data-hvmix='1' "+(why?"disabled":"")+">🧪 brew"+(mixSel.length===2?": "+esc(label(mixSel[0]))+" + "+esc(label(mixSel[1])):"")+"</button></div>";
out+="<div class='lbl'>what you know</div><p class='help'>";
var kn=[];
for(var k2 in H.EFFECT){var e2=H.knownEffects(game,k2);if(K[k2]&&(e2[0]||e2[1]))kn.push(esc(label(k2))+": "+e2.map(function(e){return e?H.BUFFS[e].icon+" "+H.BUFFS[e].name:"❔";}).join(", "));}
out+=(kn.length?kn.join(" · "):"nothing yet")+"</p>";
if(c.flat>game.time)out+="<p class='help no'>😮‍💨 you feel flat for another "+Math.ceil((c.flat-game.time)/60)+" min.</p>";
return out;
}
H.html2=function(game,c,icon,pg){return pg==="bench"?benchHtml(game,c,icon):pg==="wear"?wearHtml(game,c,icon):brewHtml(game,c,icon);};
H.wire2=function(root,game,c,redraw,fin){
function on(sel,fn){root.querySelectorAll(sel).forEach(function(b){b.addEventListener("click",function(){fn(b);});});}
on("[data-hvg]",function(b){makeG=b.getAttribute("data-hvg");redraw();});
on("[data-hvtool]",function(b){var a=b.getAttribute("data-hvtool");fin(a==="whet"?H.whet(game,c):a==="repair"?H.repair(game,c):a==="apart"?H.apart(game,c):a==="name"?H.nameTool(game,c):a==="charge"?H.chargeStaff(game,c):H.again(game,c));});
on("[data-hvgem]",function(b){fin(H.setGem(game,c,+b.getAttribute("data-hvgem")));});
on("[data-hvord]",function(b){var p=b.getAttribute("data-hvord").split(":");H.orderEdit(game,+p[0],p[1]);redraw();});
on("[data-hvordadd]",function(){var s=root.querySelector("[data-hvordsel]");if(s)fin(H.order(game,{id:s.value,mode:"keep",n:3}));});
on("[data-hvon]",function(b){fin(H.putOn(game,c,b.getAttribute("data-hvon")));});
on("[data-hvtie]",function(b){fin(H.tie(game,c,b.getAttribute("data-hvtie")));});
on("[data-hvoff]",function(b){fin(H.takeOff(game,c,b.getAttribute("data-hvoff")));});
on("[data-hvdye]",function(b){var p=b.getAttribute("data-hvdye").split(":");fin(H.dyeWorn(game,c,p[0],p[1]));});
on("[data-hvset]",function(b){var p=b.getAttribute("data-hvset").split(":"),i=+p[1];fin(p[0]==="save"?H.saveOutfit(c,i):p[0]==="use"?H.useOutfit(game,c,i):p[0]==="bind"?H.bind(game,c):H.emptyPouch(game,c));});
on("[data-hvmixsel]",function(b){var k=b.getAttribute("data-hvmixsel"),i=mixSel.indexOf(k);if(i>=0)mixSel.splice(i,1);else{mixSel.push(k);if(mixSel.length>2)mixSel.shift();}redraw();});
on("[data-hvmixstrong]",function(){mixStrong=!mixStrong;redraw();});
on("[data-hvmix]",function(){if(mixSel.length===2)fin(H.mix(game,c,mixSel[0],mixSel[1],mixStrong&&Sv().count(c,"ashroot",true)>0));});
};
H.chips2=function(game,c){
var out=[];
if(!c)return out;
if(c.flat>game.time)out.push({icon:"😮‍💨",text:"flat",bad:true,tip:"it wore off. your pep runs down for a while"});
if(c.fed>game.time)out.push({icon:"🥗",text:"well fed",tip:"a varied diet: your hearts mend"});
if(pouchN(c)>0)out.push({icon:"👝",text:pouchN(c)+" in the pouch",tip:"tip it out from the harvest tab's wear page"});
return out;
};
H.MODELS2={
workbench:function(ME){var b=ME.builder();b.color(0x8a6440);[[-0.4,-0.2],[0.4,-0.2],[-0.4,0.2],[0.4,0.2]].forEach(function(p){b.push().translate(p[0],0,p[1]).cyl(4,0.04,0.04,0.45).pop();});b.color(0xc9935a).push().translate(0,0.48,0).box(1.0,0.07,0.55).pop();b.color(0x8e8a96).push().translate(0.25,0.56,0).box(0.2,0.09,0.12).pop();b.color(0x6a4424).push().translate(-0.2,0.55,0.05).rotZ(1.57).cyl(4,0.02,0.02,0.3).pop();return b.finish();},
loom:function(ME){var b=ME.builder(),i;b.color(0x8a6440);[-0.4,0.4].forEach(function(px){b.push().translate(px,0,0).cyl(4,0.04,0.04,1.0).pop();});b.push().translate(0,0.95,0).box(0.9,0.05,0.05).pop().push().translate(0,0.2,0).box(0.9,0.05,0.05).pop();b.color(0xe8dcc0);for(i=0;i<6;i++)b.push().translate(-0.3+i*0.12,0.57,0).box(0.02,0.72,0.02).pop();b.color(0xd86a5a).push().translate(0,0.35,0.01).box(0.7,0.24,0.03).pop();return b.finish();},
charpit:function(ME){var b=ME.builder();b.color(0x4a3424).push().translate(0,0.02,0).scale(0.55,0.3,0.55).sphere(1).pop();b.color(0x2a2a2e).push().translate(0,0.3,0).scale(0.14,0.06,0.14).sphere(0).pop();b.color(0x8e8a96);[0,1.57,3.14,4.71].forEach(function(a){b.push().translate(Math.sin(a)*0.5,0.04,Math.cos(a)*0.5).scale(0.12,0.08,0.12).sphere(0).pop();});return b.finish();},
press:function(ME){var b=ME.builder();b.color(0x8e8a96).cyl(8,0.3,0.3,0.2);b.color(0x8a6440).push().translate(-0.26,0.2,0).cyl(4,0.04,0.04,0.6).pop().push().translate(0.26,0.2,0).cyl(4,0.04,0.04,0.6).pop().push().translate(0,0.78,0).box(0.64,0.06,0.1).pop();b.color(0xa8a4b0).push().translate(0,0.3,0).cyl(8,0.22,0.22,0.12).pop();b.color(0xe8d070).push().translate(0.36,0.02,0.1).scale(0.07,0.03,0.07).sphere(0).pop();return b.finish();},
cellar:function(ME){var b=ME.builder();b.color(0xa8a4b0).push().translate(0,0.08,0).box(1.1,0.16,1.1).pop();b.color(0x3a342e).push().translate(0,0.17,0).box(0.7,0.02,0.7).pop();b.color(0x8a6440).push().translate(0.12,0.2,0).rotZ(0.25).box(0.74,0.05,0.74).pop();b.color(0xdfeef8).push().translate(-0.42,0.2,0.42).scale(0.08).sphere(0).pop();return b.finish();},
stewpot:function(ME){var b=ME.builder();b.color(0x8e8a96);[0,2.09,4.19].forEach(function(a){b.push().translate(Math.sin(a)*0.3,0,Math.cos(a)*0.3).scale(0.1,0.1,0.1).sphere(0).pop();});b.color(0x3a342e).push().translate(0,0.16,0).cyl(8,0.26,0.34,0.32).pop();b.color(0xb89060).push().translate(0,0.47,0).cyl(8,0.3,0.3,0.02).pop();return b.finish();},
baitbin:function(ME){var b=ME.builder();b.color(0x8a6440).push().translate(0,0.17,0).box(0.6,0.34,0.5).pop();b.color(0x4a3424).push().translate(0,0.35,0).box(0.52,0.02,0.42).pop();b.color(0xc98a7a).push().translate(0.1,0.38,0.05).scale(0.05,0.02,0.03).sphere(0).pop();return b.finish();},
crystalbed:function(ME){var b=ME.builder();b.color(0xb0603a).push().translate(0,0.05,0).box(0.7,0.1,0.7).pop();if(b.glow)b.glow(0.6);b.color(0xa8e6ff).push().translate(0,0.1,0).cone(5,0.1,0.42).pop().push().translate(0.18,0.1,0.1).cone(5,0.06,0.24).pop().push().translate(-0.15,0.1,-0.12).cone(5,0.07,0.3).pop();return b.finish();},
fishpond:function(ME){var b=ME.builder(),i;b.color(0xa8a4b0);for(i=0;i<8;i++)b.push().translate(Math.sin(i*0.785)*0.68,0.03,Math.cos(i*0.785)*0.68).scale(0.16,0.1,0.16).sphere(0).pop();b.color(0x4f9fd0).push().translate(0,0.03,0).cyl(10,0.62,0.62,0.03).pop();b.color(0xe58a6a).push().translate(0.15,0.07,0.1).scale(0.1,0.02,0.04).sphere(0).pop();return b.finish();},
helperhut:function(ME){var b=ME.builder();b.color(0xc9935a).cyl(7,0.34,0.3,0.4);b.color(0x6fbf4a).push().translate(0,0.4,0).cone(7,0.46,0.4).pop();b.color(0x3a2a1a).push().translate(0,0.12,0.3).box(0.16,0.24,0.05).pop();b.color(0xf2c860).push().translate(0,0.84,0).scale(0.05).sphere(0).pop();return b.finish();},
glasshouse:function(ME){var b=ME.builder();b.color(0x8a6440);[[-0.45,-0.45],[0.45,-0.45],[-0.45,0.45],[0.45,0.45]].forEach(function(p){b.push().translate(p[0],0,p[1]).cyl(4,0.03,0.03,0.8).pop();});b.color(0xcfeef5).push().translate(0,0.45,0.45).box(0.9,0.7,0.02).pop().push().translate(0,0.45,-0.45).box(0.9,0.7,0.02).pop().push().translate(0.45,0.45,0).box(0.02,0.7,0.9).pop().push().translate(-0.45,0.45,0).box(0.02,0.7,0.9).pop();b.push().translate(0,0.8,0).cone(4,0.7,0.34).pop();return b.finish();},
crate:function(ME){var b=ME.builder();b.color(0xc9935a).push().translate(0,0.2,0).box(0.56,0.4,0.56).pop();b.color(0x8a6440).push().translate(0,0.2,0.285).box(0.6,0.06,0.02).pop().push().translate(0,0.41,0).box(0.6,0.03,0.6).pop();return b.finish();},
torchpost:function(ME){var b=ME.builder();b.color(0x8a6440).cyl(4,0.04,0.035,1.1);if(b.glow)b.glow(0.8);b.color(0xffa040).push().translate(0,1.1,0).cone(5,0.09,0.22).pop();return b.finish();},
sunlamp:function(ME){var b=ME.builder();b.color(0x8a6440).cyl(4,0.04,0.035,0.95);b.color(0xcfeef5).push().translate(0,0.95,0).box(0.2,0.22,0.2).pop();if(b.glow)b.glow(0.7);b.color(0xfff2a0).push().translate(0,1.06,0).scale(0.07).sphere(0).pop();return b.finish();},
banner:function(ME){var b=ME.builder();b.color(0x8a6440).cyl(4,0.03,0.03,1.5).push().translate(0.22,1.42,0).box(0.5,0.03,0.03).pop();b.color(0xf0e6d8).push().translate(0.24,1.05,0).box(0.42,0.7,0.02).pop();return b.finish();},
statue:function(ME){var b=ME.builder();b.color(0xa8a4b0).push().translate(0,0.08,0).box(0.6,0.16,0.6).pop().push().translate(0,0.42,0).scale(0.24,0.28,0.22).sphere(1).pop().push().translate(0,0.8,0).scale(0.2).sphere(1).pop();b.push().translate(-0.1,0.98,0).cone(4,0.05,0.14).pop().push().translate(0.1,0.98,0).cone(4,0.05,0.14).pop();return b.finish();}
};
var linked={};
H.link=function(){
var S=Sv(),B=SB.Body,L=SB.Loot;
if(S&&S.TOOL&&!linked.tool){linked.tool=1;for(var t in TOOLS)if(!S.TOOL[t])S.TOOL[t]=TOOLS[t];if(S.FUEL){if(!S.FUEL.seaweed)S.FUEL.seaweed=0.25;if(!S.FUEL.sap)S.FUEL.sap=0.5;if(!S.FUEL.charcoal)S.FUEL.charcoal=1;if(!S.FUEL.resin)S.FUEL.resin=0.6;if(!S.FUEL.hardwood)S.FUEL.hardwood=1;}}
if(S&&S.wear&&!linked.wrap){linked.wrap=1;wraps(S);}
if(B&&B.SKILLS&&B.BY_ID&&!linked.body){linked.body=1;if(!B.BY_ID.farm){var fs={id:"farm",label:"farming",emoji:"🌱",perk:"crops grow faster, and come up better"};B.SKILLS.push(fs);B.BY_ID.farm=fs;}}
if(L&&L.TABLES&&!linked.loot){
linked.loot=1;
var LT=L.TABLES;
if(LT.ruin)LT.ruin.items.push(["s_snowbulb",1,2,2]);
if(LT.wreck)LT.wreck.items.push(["s_starmelon",1,2,2]);
if(LT.pod)LT.pod.items.push(["s_starmelon",1,1,2]);
if(LT.nest)LT.nest.items.push(["s_berry",2,3,1]);
if(L.PACK)L.PACK.push(["s_starmelon",2,4],["s_snowbulb",2,3],["s_tea",2,2]);
if(LT.ruin)LT.ruin.items.push(["s_emberbloom",1,2,2]);
if(LT.wreck)LT.wreck.items.push(["arkpart",1,2,3]);
if(LT.pod)LT.pod.items.push(["arkpart",1,1,2]);
}
return linked.tool&&linked.body&&linked.loot;
};
H.link();
var hooked=false;
H.hook=function(){
if(hooked||!SB.bus)return;hooked=true;
function cur(){return SB.Game&&SB.Game.current;}
SB.bus.on("povEat",function(d){var game=cur();if(game&&d&&d.c)H.ate(game,d.c,d.kind);});
SB.bus.on("dawn",function(){var game=cur();if(game&&!game.offline&&game.world)H.dawn(game);});
SB.bus.on("season",function(){var game=cur();if(game&&!game.offline&&game.world){H.turn(game);if(season(game)===3&&H.dressAll(game)&&me()&&me().wear&&me().wear.body)say("🧥 winter. you put your "+label(me().wear.body.k)+" on");}});
SB.bus.on("scoutHit",function(d){var game=cur();if(game&&d&&d.c&&d.g)H.bitten(game,d.c,d.g);});
SB.bus.on("fightHit",function(d){var game=cur();if(game&&d&&d.c)d.c._maskOff=game.time+20;});
SB.bus.on("grumpChased",function(d){var game=cur();if(game&&d&&d.c)d.c._maskOff=game.time+20;});
function gloom(d){var game=cur();if(!game||!d||!d.c)return;var s=st(game);s.gloomN=(s.gloomN||0)+1;if(rnd(game,"gloom"+s.gloomN)()<0.4){give(game,d.c,"gloomdust",1);say("🌫 it sheds a pinch of gloom dust");}}
SB.bus.on("grumpFed",gloom);SB.bus.on("grumpTickled",gloom);
SB.bus.on("chestOpened",function(d){
var game=cur();if(!game||!d||!d.st)return;
var r=rnd(game,"gear"+(d.key||d.st.id));
if(r()>=0.15)return;
var k=["stoneaxe","stonepick","blade","club"][Math.floor(r()*4)],gem=1+Math.floor(r()*3),sl={k:k,w:0};
setBits(sl,{n:Sv().uses(k),base:0.25,gem:gem,temper:0,reps:0,heir:0});
Sv().spawn(game,k,1,d.st.x+0.6,d.st.z+0.4,{w:sl.w,by:d.c?d.c.id:undefined});
emit("oldTool",{c:d.c,kind:k,gem:gem,w:sl.w});
say("🔮 and an old "+label(k)+" with a "+H.GEMS[gem].name+" stone set in it");
});
SB.bus.on("bossBeaten",function(d){
var game=cur(),c=d&&d.c,id=game&&game.settings&&game.settings.diff&&game.settings.diff.id;
if(!c||(id!=="hard"&&id!=="brutal")||(c.bagx|0)>=3)return;
c.bagx=(c.bagx|0)+1;emit("deepPocket",{c:c,n:c.bagx});
say("👝 its hide makes a deep pocket: three more bag slots, for good");
});
SB.bus.on("craft",function(d){
var game=cur(),c=d&&d.c,k=d&&d.item&&d.item.kind;
if(!game||!c||!d.pov||(k!=="metal"&&k!=="iron")||!Sv().count(c,"bellows",true))return;
var s=st(game);s.bellN=(s.bellN||0)+1;
if(s.bellN%2){give(game,c,k,1);emit("bellows",{c:c,kind:k});say("🌬 the bellows got a second "+label(k)+" out of it");}
});
if(SB.Ext){
SB.Ext.on("tick",H.tick);
SB.Ext.on("options",H.options);
SB.Ext.on("options",H.options2);
SB.Ext.on("damage",function(game,c){return c?(H.has(c,"mighty",game)?1.3:1)*H.hitMul(game,c):1;});
SB.Ext.on("vitals",H.chips);
SB.Ext.on("goals",function(game,add){if(!game.quests||!game.quests.harvest)return;var fd=H.found(game);if(fd.n>0)add("fill the harvest book: fish, dishes and crops",fd.n+"/"+fd.of,fd.n>=fd.of,false);});
SB.Ext.tab({id:"harvest",label:function(){return"🌾 harvest";},show:function(game,c){return c.tier>=2||H.found(game).n>0;},html:H.html,wire:H.wire});
}
};
H.hook();
var ME=SB.Meshes||SB.ME;
function bedModel(stage){
return function(){
var b=ME.builder(),i,j;
b.color(0x5a3a22).push().translate(0,0.03,0).box(0.92,0.07,0.92).pop();
b.color(0x7a5236);
for(i=0;i<3;i++)b.push().translate(-0.28+i*0.28,0.08,0).box(0.18,0.06,0.84).pop();
if(!stage)return b.finish();
var h=stage===1?0.1:stage===2?0.24:0.3;
for(i=0;i<3;i++)for(j=0;j<3;j++){
var px=-0.28+i*0.28,pz=-0.28+j*0.28;
b.color(stage===1?0x8fd06a:0x4f9a3a).push().translate(px,0.1,pz).cone(5,stage===1?0.04:0.09,h).pop();
if(stage===3)b.color(0xf2b84b).push().translate(px+0.05,0.1+h*0.6,pz+0.03).scale(0.055).sphere(0).pop();
}
return b.finish();
};
}
var MODELS={
gardenbed:bedModel(0),gardenbed1:bedModel(1),gardenbed2:bedModel(2),gardenbed3:bedModel(3),
dryrack:function(){
var b=ME.builder(),i;
b.color(0x8a6440);
[-0.45,0.45].forEach(function(px){b.push().translate(px,0,-0.18).rotX(0.3).cyl(4,0.03,0.025,0.85).pop().push().translate(px,0,0.18).rotX(-0.3).cyl(4,0.03,0.025,0.85).pop();});
b.push().translate(0,0.78,0).box(1.0,0.04,0.04).pop().push().translate(0,0.5,0).box(0.96,0.03,0.03).pop();
for(i=0;i<4;i++)b.color(i%2?0xd98a5a:0x9a5a4a).push().translate(-0.3+i*0.2,0.66,0).box(0.07,0.2,0.02).pop();
return b.finish();
},
smoker:function(){
var b=ME.builder();
b.color(0x8e8a96).cyl(7,0.38,0.32,0.5);
b.color(0x2a2522).push().translate(0,0.16,0.3).box(0.2,0.22,0.1).pop();
b.color(0x6a4a2e).push().translate(0,0.5,0).cone(7,0.44,0.34).pop();
b.color(0xbdbdc6).push().translate(0,0.9,0).scale(0.09).sphere(0).pop();
return b.finish();
},
crock:function(){
var b=ME.builder();
b.color(0xb0603a).cyl(8,0.22,0.3,0.3).push().translate(0,0.3,0).cyl(8,0.3,0.2,0.22).pop();
b.color(0x8a4a2e).push().translate(0,0.52,0).cyl(8,0.22,0.22,0.05).pop().push().translate(0,0.57,0).scale(0.05).sphere(0).pop();
return b.finish();
},
quern:function(){
var b=ME.builder();
b.color(0x8e8a96).cyl(8,0.36,0.36,0.16);
b.color(0xa8a4b0).push().translate(0,0.18,0).cyl(8,0.3,0.3,0.14).pop();
b.color(0x8a6440).push().translate(0.2,0.32,0).cyl(4,0.025,0.025,0.22).pop();
b.color(0xf0e6cf).push().translate(0.42,0.03,0.1).scale(0.09,0.04,0.09).sphere(0).pop();
return b.finish();
},
heap:function(){
var b=ME.builder();
b.color(0x8a6440);
[[-0.42,0],[0.42,0]].forEach(function(p){b.push().translate(p[0],0.18,p[1]).box(0.05,0.36,0.8).pop();});
b.push().translate(0,0.18,-0.4).box(0.86,0.36,0.05).pop();
b.color(0x4a3424).push().translate(0,0.12,0).scale(0.36,0.26,0.34).sphere(1).pop();
b.color(0x6fbf4a).push().translate(0.1,0.36,0.05).scale(0.08,0.03,0.08).sphere(0).pop();
return b.finish();
},
beebox:function(){
var b=ME.builder();
b.color(0x8a6440);
[[-0.2,-0.16],[0.2,-0.16],[-0.2,0.16],[0.2,0.16]].forEach(function(p){b.push().translate(p[0],0,p[1]).cyl(4,0.03,0.03,0.2).pop();});
b.color(0xf2c860).push().translate(0,0.38,0).box(0.5,0.36,0.42).pop();
b.color(0x3a2a1a).push().translate(0,0.38,0.215).box(0.5,0.05,0.01).pop().push().translate(0,0.26,0.215).box(0.16,0.04,0.02).pop();
b.color(0x9a6a3c).push().translate(0,0.59,0).box(0.6,0.06,0.52).pop();
return b.finish();
},
crabpot:function(){
var b=ME.builder();
b.color(0xc9a05a).cyl(8,0.3,0.24,0.3,false);
b.color(0xa8804a).push().translate(0,0.3,0).cyl(8,0.24,0.1,0.08,false).pop();
b.color(0x8a6440).push().translate(0.34,0,0).cyl(4,0.02,0.02,0.6).pop();
b.color(0xe5484d).push().translate(0.34,0.62,0).scale(0.06).sphere(0).pop();
return b.finish();
},
scarecrow:function(){
var b=ME.builder();
b.color(0x8a6440).cyl(4,0.035,0.035,1.0).push().translate(0,0.72,0).rotZ(1.5708).translate(0,-0.32,0).cyl(4,0.028,0.028,0.64).pop();
b.color(0xd96a4a).push().translate(0,0.56,0).box(0.28,0.3,0.12).pop();
b.color(0xe8cf8a).push().translate(0,0.94,0).scale(0.12).sphere(1).pop();
b.color(0xd9b86a).push().translate(0,1.02,0).cyl(7,0.2,0.03,0.12).pop();
return b.finish();
},
sprinkler:function(){
var b=ME.builder();
b.color(0x8a6440).push().translate(-0.25,0,0).cyl(4,0.03,0.03,0.4).pop().push().translate(0.25,0,0).cyl(4,0.03,0.03,0.34).pop();
b.color(0xb8c46a).push().translate(-0.36,0.42,0).rotZ(-1.66).cyl(6,0.045,0.045,0.74).pop();
b.color(0x7fb7d6).push().translate(0.4,0.14,0).scale(0.03,0.14,0.03).sphere(0).pop().push().translate(0.4,0.02,0).scale(0.12,0.015,0.12).sphere(0).pop();
return b.finish();
}
};
Object.keys(H.MODELS2||{}).forEach(function(id){var f=H.MODELS2[id];MODELS[id]=function(){return f(ME);};});
function itemModel(k){
var b=ME.builder(),col=K[k].color||0xffffff,sh=SHAPE[k];
if(K[k].glow&&b.glow)b.glow(0.6);
if(sh==="fish"){
var big=FISH_BY[k]&&FISH_BY[k].rare===4?1.5:1;
b.color(col).push().translate(0,0.08*big,0).scale(0.2*big,0.08*big,0.06*big).sphere(1).pop();
b.push().translate(-0.2*big,0.08*big,0).box(0.1*big,0.12*big,0.02).pop();
b.color(0x1a1a22).push().translate(0.13*big,0.1*big,0.05*big).scale(0.015).sphere(0).pop();
}else if(sh==="bowl"){
b.color(0x9a6a3c).cyl(8,0.08,0.15,0.09);
b.color(col).push().translate(0,0.09,0).scale(0.13,0.05,0.13).sphere(1).pop();
}else if(sh==="jar"){
b.color(col).cyl(7,0.08,0.09,0.16);
b.color(0x8a5a33).push().translate(0,0.16,0).cyl(7,0.07,0.07,0.03).pop();
}else if(sh==="veg"){
b.color(col).push().translate(0,0.09,0).scale(0.1,0.09,0.1).sphere(1).pop();
b.color(0x4f9a3a).push().translate(0,0.17,0).cone(4,0.04,0.08).pop();
}else if(sh==="tool"){
b.color(0x8a5a33).push().translate(-0.22,0.04,0).rotZ(-1.5).cyl(4,0.025,0.02,0.46).pop();
b.color(col).push().translate(0.2,0.05,0).box(0.12,0.05,0.14).pop();
}else{
b.color(0xc9a05a).push().translate(0,0.06,0).scale(0.09,0.07,0.09).sphere(1).pop();
b.color(col).push().translate(0,0.13,0).scale(0.05).sphere(0).pop();
}
return b.finish();
}
if(ME&&ME.STRUCT_BUILDERS&&ME.builder){
try{
for(var mm in MODELS)if(!ME.STRUCT_BUILDERS[mm])ME.STRUCT_BUILDERS[mm]=MODELS[mm];
if(ME.itemMesh&&!ME.itemMesh._harvest){
var old=ME.itemMesh;
ME.itemMesh=function(k){if(SHAPE[k]&&K[k]){try{return itemModel(k);}catch(e){}}return old(k);};
ME.itemMesh._harvest=1;
}
}catch(e){}
}
H.MODELS=MODELS;
})();
