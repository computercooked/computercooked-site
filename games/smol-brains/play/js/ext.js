/* smol brains: ext.js (built from src/ext.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB=window.SB||{};
var X=SB.Ext={};
var H={tick:[],options:[],damage:[],key:[],goals:[],vitals:[]};
X.tabs=[];
X.on=function(what,fn){if(H[what]&&typeof fn==="function")H[what].push(fn);return fn;};
X.tab=function(t){if(t&&t.id&&!X.tabs.some(function(o){return o.id===t.id;}))X.tabs.push(t);return t;};
function run(what,each){
var L=H[what];
for(var i=0;i<L.length;i++){
if(L[i]._off)continue;
try{each(L[i]);}catch(e){L[i]._off=true;if(typeof console!=="undefined"&&console.warn)console.warn("ext "+what+" handler switched off:",e);}
}
}
X.tick=function(game,dt){run("tick",function(f){f(game,dt);});};
X.options=function(game,c,r,o,x){run("options",function(f){f(game,c,r,o,x);});return o;};
X.damage=function(game,c,target,info){var k=1;run("damage",function(f){var v=f(game,c,target,info);if(typeof v==="number"&&isFinite(v)&&v>=0)k*=v;});return k;};
X.key=function(game,c,key,down,e){var used=false;run("key",function(f){if(f(game,c,key,down,e)===true)used=true;});return used;};
X.goals=function(game,add){run("goals",function(f){f(game,add);});};
X.vitals=function(game,c){var out=[];run("vitals",function(f){var v=f(game,c);if(v&&v.length)v.forEach(function(o){if(o&&o.text!=null)out.push(o);});});return out;};
X.shownTabs=function(game,c){var out=[];X.tabs.forEach(function(t){try{if(!t.show||t.show(game,c))out.push(t);}catch(e){}});return out;};
X.GROUPS=[
{id:"people",label:"👥 people",tabs:["friends","life","words","book"]},
{id:"body",label:"💪 body",tabs:["wear","fight","grow","motion3"]},
{id:"land",label:"🌍 land",tabs:["deep","land","harvest","animals","helpers3"]},
{id:"tribe",label:"🏘 tribe",tabs:["town","dark","lantern"]}
];
X.groupOf=function(id){for(var i=0;i<X.GROUPS.length;i++)if(X.GROUPS[i].tabs.indexOf(id)>=0)return X.GROUPS[i];return null;};
X.layout=function(game,c,open){
var shown=X.shownTabs(game,c),top=[],sub=[],seen={},og=X.groupOf(open);
shown.forEach(function(t){
var g=X.groupOf(t.id);
if(!g){top.push(t);return;}
if(og===g)sub.push(t);
if(seen[g.id])return;
seen[g.id]=1;top.push({group:g,first:t.id,on:og===g});
});
sub.sort(function(a,b){return og.tabs.indexOf(a.id)-og.tabs.indexOf(b.id);});
top.forEach(function(e){if(e.group){var m=shown.filter(function(t){return e.group.tabs.indexOf(t.id)>=0;}).sort(function(a,b){return e.group.tabs.indexOf(a.id)-e.group.tabs.indexOf(b.id);});e.first=m[0].id;}});
return{top:top,sub:sub};
};
X.tabById=function(id){for(var i=0;i<X.tabs.length;i++)if(X.tabs[i].id===id)return X.tabs[i];return null;};
X._handlers=H;
})();
