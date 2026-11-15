/* smol brains: voxel.js (built from src/voxel.js by tools/strip.js: edit that file, not this one) */
(function(){
"use strict";
var SB=window.SB,R=SB.Render,GL=SB.GL;
var VX=(SB.Voxel={});
var UNIT=(VX.UNIT=0.38*2.2/16);
var P_BODY=0,P_HEAD=1,P_LEGA=2,P_LEGB=3,P_ARML=4,P_ARMR=5,P_TAIL=6,P_WING=7,P_FLOAT=8,P_EAR=9,NPART=10;
VX.PARTS={body:P_BODY,head:P_HEAD,legA:P_LEGA,legB:P_LEGB,armL:P_ARML,armR:P_ARMR,tail:P_TAIL,wing:P_WING,float:P_FLOAT,ear:P_EAR};
var WHITE=[255,255,255],PINK=[255,140,165],LIME=[197,255,73],GOLD=[255,214,92],CREAM=[245,232,205];
function mix(a,b,t){return[a[0]+(b[0]-a[0])*t|0,a[1]+(b[1]-a[1])*t|0,a[2]+(b[2]-a[2])*t|0];}
var GX=48,GY=54,GZ=48,OX=24,OY=2,OZ=24,SXS=1,SZS=GX,SYS=GX*GZ;
VX.GRID={x0:-OX+2,x1:GX-OX-2,y1:GY-OY-2,z0:-OZ+2,z1:GZ-OZ-2};
var col=new Int32Array(GX*GY*GZ),part=new Uint8Array(GX*GY*GZ);
var bb=null;
function idx(x,y,z){return(y+OY)*SYS+(z+OZ)*SZS+(x+OX);}
function inG(x,y,z){return x>=-OX+2&&x<GX-OX-2&&y>=0&&y<GY-OY-2&&z>=-OZ+2&&z<GZ-OZ-2;}
function pack(c,em){return 1+((c[0]&255)<<16)+((c[1]&255)<<8)+(c[2]&255)+(em?1<<25:0);}
function put(x,y,z,c,p,em){
x=Math.floor(x);y=Math.floor(y);z=Math.floor(z);
if(!c)return;
if(!inG(x,y,z)){VX.clipped=(VX.clipped||0)+1;return;}
var i=idx(x,y,z);col[i]=pack(c,em);part[i]=p;
if(x<bb[0])bb[0]=x;if(x>bb[1])bb[1]=x;if(y<bb[2])bb[2]=y;if(y>bb[3])bb[3]=y;if(z<bb[4])bb[4]=z;if(z>bb[5])bb[5]=z;
}
function get(x,y,z){return inG(x,y,z)?col[idx(x,y,z)]:0;}
function partAt(x,y,z){return inG(x,y,z)?part[idx(x,y,z)]:255;}
function recolor(x,y,z,c,em){if(get(x,y,z))col[idx(x,y,z)]=pack(c,em);}
function clear(){
if(bb&&bb[1]>=bb[0])for(var y=bb[2];y<=bb[3];y++)for(var z=bb[4];z<=bb[5];z++){var i0=idx(bb[0],y,z);col.fill(0,i0,i0+bb[1]-bb[0]+1);part.fill(0,i0,i0+bb[1]-bb[0]+1);}
bb=[1e9,-1e9,1e9,-1e9,1e9,-1e9];
}
var PU=new Float32Array(64),PV=new Float32Array(64),PW=new Float32Array(64);
function blob(cx,cy,cz,rx,ry,rz,p,colour,prt){
var x0=Math.floor(cx-rx),y0=Math.floor(cy-ry),z0=Math.floor(cz-rz),x1=Math.ceil(cx+rx),y1=Math.ceil(cy+ry),z1=Math.ceil(cz+rz),fn=typeof colour==="function";
for(var x=x0;x<=x1;x++)PU[x-x0]=Math.pow(Math.abs((x+0.5-cx)/rx),p);
for(var y=y0;y<=y1;y++)PV[y-y0]=Math.pow(Math.abs((y+0.5-cy)/ry),p);
for(var z=z0;z<=z1;z++)PW[z-z0]=Math.pow(Math.abs((z+0.5-cz)/rz),p);
for(y=y0;y<=y1;y++)for(z=z0;z<=z1;z++){
var vw=PV[y-y0]+PW[z-z0];
if(vw>1)continue;
for(x=x0;x<=x1;x++)if(PU[x-x0]+vw<=1)put(x,y,z,fn?colour(x,y,z,(x+0.5-cx)/rx,(y+0.5-cy)/ry,(z+0.5-cz)/rz):colour,prt);
}
}
function box(x0,y0,z0,w,h,d,c,prt,em){for(var y=y0;y<y0+h;y++)for(var z=z0;z<z0+d;z++)for(var x=x0;x<x0+w;x++)put(x,y,z,typeof c==="function"?c(x,y,z):c,prt,em);}
function topOf(prt,x,z){for(var y=GY-OY-3;y>=0;y--)if(get(x,y,z)&&part[idx(x,y,z)]===prt)return y;return-1;}
VX.SHAPE={torso:4,head:5,blob:3.6};
function rigid(a,b){return a===b||(a<=P_HEAD&&b<=P_HEAD);}
VX.build=function(c){
var PX=SB.Pixel,S=PX.spec(c),lk=S.lk,grump=S.grump,tier=S.tier,up=S.upright;
var base=S.base,light=S.light,dark=S.dark,second=S.second,belly=S.belly;
var pat=S.pat,acc=S.acc,classic=S.classic,seed=S.seed||1;
var L=!grump&&SB.Wear&&SB.Wear.look?SB.Wear.look(c):null;
clear();VX.clipped=0;
var pivots=new Float32Array(NPART*3);
function piv(p,x,y,z){pivots[p*3]=x;pivots[p*3+1]=y;pivots[p*3+2]=z;}
function skin(cx,cy,rx,ry,head){
return function(x,y,z,u,v,w){
var sx=16+x+(z>>1),sy=30-y,vv=-v;
var sp=S.special(sx,sy,u,vv);if(sp)return sp;
if(head)return(pat==="freckles"||pat==="gold"||pat==="calico"?S.patternAt(sx,sy,u,vv):null)||base;
if(!classic)return S.patternAt(sx,sy,u,vv)||base;
if(lk.pattern===1&&vv>0.05&&u>-0.2)return belly;
if(lk.pattern===3&&(Math.abs(vv+0.25)<0.16||Math.abs(vv-0.2)<0.16))return second;
if(lk.pattern===2&&SB.hash(x>>1,(y>>1)+(z>>1)*7,seed)<0.16)return second;
return base;
};
}
var legH=S.legH,legs=S.legs;
var bodyCY,bodyRX,bodyRY,bodyRZ,headCX=0,headCY,headRX,headRY,headRZ,headPart;
if(up){
var tw=S.tw,th=S.th,hr=S.hr,hry=S.hry;
if(R.voxel){hr=hr*1.3;hry=hry*1.3;}
bodyRX=Math.max(2,tw/2-0.5);bodyRY=th/2;bodyRZ=tw/2;bodyCY=legH+th/2;
var gap=tw>=6?1:0;
box(-1,0,-2-gap,2,legH+1,2,base,P_LEGA);box(-1,0,gap,2,legH+1,2,base,P_LEGB);
box(-1,0,-2-gap,3,1,2,dark,P_LEGA);box(-1,0,gap,3,1,2,dark,P_LEGB);
piv(P_LEGA,0,legH+0.5,-1-gap);piv(P_LEGB,0,legH+0.5,1+gap);
blob(0,bodyCY,0,bodyRX,bodyRY,bodyRZ,VX.SHAPE.torso,skin(0,bodyCY,bodyRX,bodyRY),P_BODY);
headRX=hr*0.92;headRY=hry;headRZ=hr;headCY=legH+th+hry-1;
blob(0,headCY,0,headRX,headRY,headRZ,R.voxel?9:VX.SHAPE.head,skin(0,headCY,headRX,headRY,true),P_HEAD);
headPart=P_HEAD;
var az=Math.ceil(bodyRZ),aLen=Math.max(3,th-1),ay=legH+th-1;
box(-1,ay-aLen+1,az,2,aLen,2,function(x,y){return y===ay-aLen+1?light:base;},P_ARMR);
box(-1,ay-aLen+1,-az-2,2,aLen,2,function(x,y){return y===ay-aLen+1?light:base;},P_ARML);
piv(P_ARMR,0,ay+0.5,az+1);piv(P_ARML,0,ay+0.5,-az-1);
if(!grump&&tier>=4&&!(L&&L.belt===false)){
var by=Math.round(bodyCY-bodyRY*0.3);
for(var bz=-OZ;bz<GZ-OZ;bz++)for(var bx=-8;bx<8;bx++)if(partAt(bx,by,bz)===P_BODY)recolor(bx,by,bz,L&&L.belt||[120,80,45]);
var bfx=-1;for(var fx=8;fx>-8;fx--)if(get(fx,by,0)){bfx=fx;break;}
recolor(bfx,by,0,GOLD);recolor(bfx,by,-1,GOLD);
box(-Math.ceil(bodyRX)-1,by-2,-3,1,2,2,[150,100,60],P_BODY);
}
}else{
bodyRX=S.bw/2*0.9;bodyRY=S.bh/2;bodyRZ=S.bw/2*0.92;bodyCY=legH+S.bh/2-(legs?0.5:0);
blob(0,bodyCY,0,bodyRX,bodyRY,bodyRZ,R.voxel?6:VX.SHAPE.blob,skin(0,bodyCY,bodyRX,bodyRY),P_BODY);
headRX=bodyRX;headRY=bodyRY;headRZ=bodyRZ;headCY=bodyCY;headPart=P_BODY;
if(legs){
var lz=Math.max(1,Math.round(bodyRZ*0.45)),lx=Math.max(1,Math.round(bodyRX*0.42));
var spots=legs===4?[[lx-1,-lz-1,P_LEGA],[lx-1,lz-1,P_LEGB],[-lx-1,-lz-1,P_LEGB],[-lx-1,lz-1,P_LEGA]]:[[-1,-lz-1,P_LEGA],[-1,lz-1,P_LEGB]];
spots.forEach(function(s){box(s[0],0,s[1],2,legH+2,2,base,s[2]);box(s[0],0,s[1],2,1,2,dark,s[2]);});
piv(P_LEGA,0,legH+1,0);piv(P_LEGB,0,legH+1,0);
}
if(lk.arms){
var sz2=Math.round(bodyRZ),say=Math.round(bodyCY);
box(0,say-3,sz2,2,3,2,function(x,y){return y===say-3?light:base;},P_ARMR);
box(0,say-3,-sz2-2,2,3,2,function(x,y){return y===say-3?light:base;},P_ARML);
piv(P_ARMR,1,say,sz2+1);piv(P_ARML,1,say,-sz2-1);
}
}
var hTop=Math.ceil(headCY+headRY)-1;
for(var tz=-2;tz<=1;tz++){var tt=topOf(headPart,0,tz);if(tt>hTop)hTop=tt;}
var hz=headRZ;
if(lk.fluff){
var fy=Math.floor(bodyCY-bodyRY+0.5);
for(var fz=-OZ;fz<GZ-OZ;fz++)for(var fxx=-12;fxx<12;fxx++)if(partAt(fxx,fy,fz)===P_BODY&&(!get(fxx+1,fy,fz)||!get(fxx-1,fy,fz)||!get(fxx,fy,fz+1)||!get(fxx,fy,fz-1)))recolor(fxx,fy,fz,(fxx+fz)&1?mix(belly,WHITE,0.4):mix(belly,WHITE,0.15));
}
var earC=lk.ears===2||lk.ears===3?second:base;
var ex=Math.round(headRZ*0.5);
if(lk.ears===1)[-1,1].forEach(function(s){
var z0=s>0?ex-1:-ex-2;
box(-1,hTop,z0,2,1,3,earC,P_EAR);box(-1,hTop+1,z0+(s>0?1:0),2,1,2,earC,P_EAR);box(-1,hTop+2,z0+(s>0?2:0),1,1,1,earC,P_EAR);
recolor(0,hTop,z0+1,PINK);
});
else if(lk.ears===2)[-1,1].forEach(function(s){
var z0=s>0?Math.max(1,ex-1):-Math.max(1,ex-1)-2;
box(-1,hTop,z0,1,6,2,earC,P_EAR);box(0,hTop+1,z0,1,4,2,function(x,y,z){return(s>0?z===z0:z===z0+1)?PINK:earC;},P_EAR);
});
else if(lk.ears===3)[-1,1].forEach(function(s){blob(-0.5,hTop+1,s*(ex+0.5),0.6,1.8,1.8,2,earC,P_EAR);});
else if(lk.ears===4)[-1,1].forEach(function(s){box(-1,Math.round(headCY)-3,s>0?Math.ceil(hz):-Math.ceil(hz)-1,2,4,1,earC,P_EAR);});
piv(P_EAR,0,hTop+0.5,0);
if(lk.antenna||grump){box(1,hTop+1,0,1,4,1,dark,P_EAR);box(1,hTop+5,0,2,2,2,grump?[210,80,255]:LIME,P_EAR,true);}
if(lk.horns)[-1,1].forEach(function(s){var z0=s>0?ex:-ex-2;box(0,hTop,z0,2,2,2,CREAM,P_HEAD);box(s>0?1:0,hTop+2,s>0?z0+1:z0,1,1,1,CREAM,P_HEAD);});
if(grump)for(var sp=0;sp<3;sp++){var sx0=-2-sp*2,sy0=topOf(P_BODY,sx0,0);if(sy0<0)continue;box(sx0,sy0+1,-1,2,1,2,dark,P_BODY);box(sx0,sy0+2,0,1,1,1,dark,P_BODY);}
var back=-Math.ceil(bodyRX),tailY=Math.round(up?legH+1:bodyCY-bodyRY*0.35);
if(lk.tail===1)blob(back-0.5,tailY+0.5,0,1.6,1.6,1.6,2,second,P_TAIL);
else if(lk.tail===2)for(var t2=0;t2<5;t2++)put(back-t2,tailY+Math.round(t2*0.8),0,dark,P_TAIL);
else if(lk.tail===3)blob(back-1.5,tailY+1,0,2.6,2.6,2.6,2,function(x,y,z,u,v){return v>0.25?WHITE:belly;},P_TAIL);
piv(P_TAIL,back+0.5,tailY+0.5,0);
if(lk.wings){
var wy=Math.round(up?legH+S.th:bodyCY+bodyRY*0.3),wx=back+(up?0:1),wc=mix(second,WHITE,0.5),wc2=mix(second,WHITE,0.72);
[-1,1].forEach(function(s){for(var k=0;k<5;k++){var hgt=3-(k>>1);for(var j=0;j<hgt;j++)put(wx-1-(k>>1),wy-1+j,s*(1+k)-(s<0?1:0),j===hgt-1?wc2:wc,P_WING);}});
piv(P_WING,wx,wy,0);
}
if(lk.fins)for(var fn=0;fn<3;fn++){var fxx2=-1-fn,fy2=topOf(up?P_BODY:P_BODY,fxx2,0);if(up)fy2=Math.max(fy2,legH+S.th-1);box(fxx2-(up?1:0),fy2+1,0,1,3-fn,1,second,P_BODY);}
var face=faceGeom(S,headCY,headRY,headRZ);
if(up&&tier<6&&!grump&&!(L&&L.band===false)){
var hb=Math.max(hTop-1,face.eyeY+2),fc=L&&L.feather||(tier>=4?[90,190,240]:[255,110,90]);
for(var hbz=-OZ;hbz<GZ-OZ;hbz++)for(var hbx=-10;hbx<10;hbx++)if(partAt(hbx,hb,hbz)===P_HEAD)recolor(hbx,hb,hbz,L&&L.band||(tier>=4?[220,80,70]:[240,190,60]));
box(-Math.round(headRX)+1,hb+1,-Math.ceil(hz),1,3,1,fc,P_HEAD);
box(-Math.round(headRX),hb+3,-Math.ceil(hz),1,1,1,mix(fc,WHITE,0.35),P_HEAD);
}
if(lk.brainy&&!grump){
var bry2=Math.max(2,headRX-1.5),brz2=Math.max(2,headRZ-1.5);
blob(-0.5,hTop+1,0,bry2,2.2,brz2,2.4,function(x,y,z){return(SB.hash(x,z+y*3,17)<0.3||z===0)?[222,104,140]:[255,150,180];},P_HEAD);
}
if(!grump&&(tier>=6||acc==="halo")){
var hc=tier>=6?GOLD:[190,240,255],hrad=tier>=6?3:2.4,hy=hTop+(lk.brainy?4:3);
for(var qz=-5;qz<=5;qz++)for(var qx=-5;qx<=5;qx++){var rr=Math.hypot(qx+0.5,qz+0.5);if(rr>hrad-0.7&&rr<hrad+0.6)put(qx,hy,qz,hc,P_FLOAT,true);}
}
if(acc==="bud"){box(0,hTop+1,-2,1,2,1,[80,170,80],P_HEAD);put(0,hTop+3,-2,GOLD,P_HEAD);[[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){put(d[0],hTop+3,-2+d[1],PINK,P_HEAD);});}
if(acc==="crown")for(var cz=-2;cz<=2;cz++)for(var cxx=-2;cxx<=2;cxx++){if(Math.max(Math.abs(cz),Math.abs(cxx))!==2)continue;put(cxx,hTop+1,cz,GOLD,P_HEAD);if(((cz+cxx)&1)===0)put(cxx,hTop+2,cz,GOLD,P_HEAD);if(cxx===2&&cz===0)put(cxx,hTop+1,cz,[255,90,150],P_HEAD);}
if(acc==="scarf"){
var scy=up?Math.round(legH+S.th-1):Math.round(headCY-headRY*0.45);
for(var sz3=-OZ;sz3<GZ-OZ;sz3++)for(var sx3=-12;sx3<12;sx3++)if(partAt(sx3,scy,sz3)<=P_HEAD&&get(sx3,scy,sz3))recolor(sx3,scy,sz3,(sx3+sz3)&1?[96,196,92]:[58,150,72]);
box(back,scy-2,-2,1,2,1,[58,150,72],P_BODY);
}
if(acc==="crystal")for(var cr=0;cr<3;cr++){var crx=-1-cr*2,cry=topOf(headPart,crx,0);if(cry<0)cry=hTop;box(crx,cry+1,-1,1,3-(cr===1?0:1),2,[120,220,255],headPart);put(crx,cry+4-(cr===1?0:1),-1,[220,250,255],headPart);}
if(acc==="moon"){box(2,hTop+1,Math.ceil(hz)+2,2,2,2,[235,230,255],P_FLOAT,true);}
if(c.leafy&&!(L&&L.head)){box(0,hTop+1,0,1,2,1,[70,160,70],headPart);put(1,hTop+2,0,[120,210,90],headPart);put(0,hTop+3,1,[120,210,90],headPart);}
if(L){
var u1,u2,u3,ui,uj,e=L.body,BLK=[0,0,0];
var ring=function(y,prt,fn){for(var z=bb[4];z<=bb[5];z++)for(var x=bb[0];x<=bb[1];x++)if(get(x,y,z)&&partAt(x,y,z)===prt){var cc=fn(x,z);if(cc)recolor(x,y,z,cc);}};
var side=function(x,y,s,prt,cc){for(var z=s>0?bb[5]:bb[4];z*s>0;z-=s)if(get(x,y,z)&&partAt(x,y,z)===prt){recolor(x,y,z,cc);return;}};
if(e){
var y0=Math.ceil(bodyCY-bodyRY*(up?1:0.8)),y1=up?Math.floor(bodyCY+bodyRY)-1:Math.min(Math.floor(bodyCY-bodyRY*0.2),face.eyeY-face.es-3),dk=mix(e.col,BLK,0.22),lt=mix(e.col,WHITE,0.35);
var cloth=function(x,z){
if(u2===y0&&e.trim)return(x+z)&1?e.trim:dk;
return e.pat===1?(u2&1?dk:e.col):e.pat===2?(SB.hash(x,u2*5+z,7)<0.14?lt:e.col):e.pat===3?((x+u2+z)&1?dk:e.col):e.col;
};
for(u2=y0;u2<=y1;u2++)ring(u2,P_BODY,cloth);
if(e.sh==="cloak"&&y1>=y0){u2=Math.max(1,y0-2);box(back-1,u2,-Math.floor(bodyRZ)+1,1,y1-u2+1,Math.max(1,Math.floor(bodyRZ)*2-2),function(x,y){return y===u2&&e.trim?e.trim:dk;},P_BODY);}
}
e=L.feet;
if(e&&legs)for(u2=0;u2<Math.min(2,legH);u2++)for(u3=bb[4];u3<=bb[5];u3++)for(u1=bb[0];u1<=bb[1];u1++){ui=partAt(u1,u2,u3);if((ui===P_LEGA||ui===P_LEGB)&&get(u1,u2,u3))recolor(u1,u2,u3,u2?e.col:mix(e.col,BLK,0.3));}
e=L.head;
if(e){
var hc=e.col,hd=mix(hc,BLK,0.25),hl=mix(hc,WHITE,0.4),sh=e.sh,low=Math.min(hTop,face.eyeY+(sh==="helm"?2:3));
var all=function(){return hc;};
if(sh==="band"){
ring(hTop-1,headPart,all);
[[2,0],[-3,0],[0,2],[0,-3]].forEach(function(p){var ty=topOf(headPart,p[0],p[1]);if(ty>=0)put(p[0],ty+1,p[1],hl,headPart);});
}else if(sh==="hood"){for(u2=Math.round(headCY-headRY*0.3);u2<=hTop;u2++)ring(u2,headPart,function(x){return x<1||u2>=hTop-1?hc:null;});}
else if(sh==="tall"){blob(0,hTop+0.5,0,3.6,0.5,3.6,2,hc,headPart);box(-2,hTop+1,-2,4,4,4,function(x,y){return y===hTop+1?hl:hc;},headPart);}
else if(sh==="cone"){for(ui=0;ui<5;ui++){uj=Math.max(1,4-ui);box(-(uj>>1),hTop+1+ui,-(uj>>1),uj,1,uj,ui&1?WHITE:hc,headPart);}put(0,hTop+6,0,GOLD,headPart,true);}
else if(sh==="ears")[-1,1].forEach(function(s){blob(-0.5,hTop+1.5,s*headRZ*0.75,0.7,2.2,2.2,2,hc,headPart);});
else{
for(u2=low;u2<=hTop;u2++)ring(u2,headPart,all);
if(sh==="brim")blob(0,hTop+0.5,0,headRX+2.2,0.5,headRZ+2.2,2,hd,headPart);
blob(0,hTop+1,0,headRX*0.8,sh==="brim"?1.3:1.6,headRZ*0.8,2,hc,headPart);
if(sh==="helm")box(-2,hTop+2,0,4,1,1,hl,headPart);else if(sh==="cap")put(0,hTop+3,0,hl,headPart);
}
}
if(L.mask){
ring(Math.min(hTop,face.eyeY+2),headPart,function(x){return x>=0?[106,90,122]:null;});
[-1,1].forEach(function(s){box(1,hTop+1,s>0?ex:-ex-1,1,2,1,[210,80,255],headPart);});
}
if(L.charm){u2=up?legH+S.th-2:Math.round(bodyCY-bodyRY*0.55);for(u1=bb[1];u1>=0;u1--)if(get(u1,u2,0)&&partAt(u1,u2,0)===P_BODY){put(u1+1,u2,0,L.charm.col,P_BODY,true);break;}}
var pc=L.paint?SB.Wear.PAINTS[L.paint][1]:WHITE,scar=mix(base,[255,205,205],0.65);
for(ui=0;ui<L.scars;ui++)for(uj=0;uj<3;uj++)side(-2+uj+ui*2,Math.round(headCY-headRY*0.3)+1-uj,1,headPart,scar);
if(L.paint&1)[-1,1].forEach(function(s){for(var q=0;q<4;q++)side(2-(q>>1)*2,face.eyeY-2-(q&1),s,headPart,pc);});
else if(L.paint)ring(Math.round(up?bodyCY:bodyCY-bodyRY*0.5),P_BODY,function(x,z){return(x+z)&1?pc:null;});
if(L.mark)for(ui=0;ui<25;ui++)if(L.mark>>ui&1){u2=Math.round(headCY)+2-(ui/5|0);u3=ui%5-2;for(u1=bb[0];u1<0;u1++)if(get(u1,u2,u3)&&partAt(u1,u2,u3)===headPart){recolor(u1,u2,u3,pc);break;}}
}
piv(P_FLOAT,0,hTop+3,0);
piv(P_HEAD,0,headCY,0);piv(P_BODY,0,0,0);
var mesh=meshGrid();
var front={};
for(var fy3=bb[2];fy3<=bb[3];fy3++)for(var fz3=bb[4];fz3<=bb[5];fz3++)for(var fx3=bb[1];fx3>=bb[0];fx3--){
var i3=idx(fx3,fy3,fz3);
if(col[i3]&&part[i3]===headPart){front[fy3*256+fz3+128]=fx3+1;break;}
}
var height=bb[3]+1,reach=Math.max(-bb[0],bb[1]+1,-bb[4],bb[5]+1);
return{verts:mesh.verts,index:mesh.index,quads:mesh.quads,pivots:pivots,front:front,face:face,headPart:headPart,S:S,
height:height,reach:reach,bounds:bb.slice(),clipped:VX.clipped,upright:up,grump:grump,tier:tier,bodyCY:bodyCY};
};
function faceGeom(S,headCY,headRY,headRZ){
var lk=S.lk,grown=S.grown,es=lk.eyes>1.15&&!grown?3:2;
var ey=Math.round(16-headRY*0.2)-(es===3?1:0),gap=headRZ>=5?4:2,e1=14-gap/2,e2=30-e1;
var rowY=Math.floor(headCY);
return{e1:e1,e2:e2,ey:ey,es:es,mx:16,my:ey+es+1,rowY:rowY,eyeY:rowY+16-ey};
}
var FACE_FRAMES=["idle0","blink","sleep","eat","happy","sad","scared"];
VX.FACE_FRAMES=FACE_FRAMES;
VX.buildFace=function(model,fi,mood){
var PX=SB.Pixel,S=model.S,g=model.face,F=32;
var f={d:new Uint8ClampedArray(F*F*4),tag:new Uint8Array(F*F)};
var fr={px:function(x,y,c,t){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=F||y>=F||!c)return;var i=(y*F+x)*4;f.d[i]=c[0];f.d[i+1]=c[1];f.d[i+2]=c[2];f.d[i+3]=255;f.tag[y*F+x]=t||1;}};
fr.rect=function(x,y,w,h,c,t){for(var j=0;j<h;j++)for(var i=0;i<w;i++)fr.px(x+i,y+j,c,t);};
var o={e1:g.e1,e2:g.e2,ey:g.ey,es:g.es,mx:g.mx,my:g.my,grown:S.grown,face:mood||S.face||"neutral",eyeT:S.eyeT,elder:S.elder,cheeks:S.lk.cheeks,dark:S.dark,outline:S.outline,grump:S.grump,glasses:S.tier===5&&!S.grump};
if(model.upright)PX.paintFace(fr,fi,o);else PX.cuteFace(fr,fi,o);
if(o.glasses)PX.glasses(fr,g.e1,g.e2,g.ey,g.es);
if(R.voxel)glowEyes(f,F,g,fi,S);
var q=[],EPS=0.06;
for(var y=0;y<F;y++)for(var x=0;x<F;x++){
var i=(y*F+x)*4;
if(!f.d[i+3])continue;
var vz=x-16,vy=g.rowY+16-y,fx=model.front[vy*256+vz+128];
if(fx==null)continue;
q.push(fx+EPS,vy,vz,f.d[i],f.d[i+1],f.d[i+2],f.tag[y*F+x]===9?1:0);
}
var n=q.length/7,verts=new Float32Array(n*4*VS),index=new Uint16Array(n*6);
for(var k=0;k<n;k++){
var b=k*7,o2=k*4*VS,cr=q[b+3]/255,cg=q[b+4]/255,cb=q[b+5]/255;
var corners=[[0,0],[1,0],[1,1],[0,1]];
for(var c4=0;c4<4;c4++){
var v=o2+c4*VS;
verts[v]=q[b];verts[v+1]=q[b+1]+corners[c4][0];verts[v+2]=q[b+2]+corners[c4][1];
verts[v+3]=1;verts[v+4]=0;verts[v+5]=0;
verts[v+6]=cr;verts[v+7]=cg;verts[v+8]=cb;verts[v+9]=q[b+6];
verts[v+10]=model.headPart;
}
index.set([k*4,k*4+1,k*4+2,k*4,k*4+2,k*4+3],k*6);
}
return{verts:verts,index:index,quads:n};
};
var EYE_GLOW=[255,247,214],EYE_GRUMP=[255,64,52];
function glowEyes(f,F,g,fi,S){
var FR=SB.Pixel.FR;
if(fi===FR.blink||fi===FR.sleep||fi===FR.happy)return;
var c=S.grump?EYE_GRUMP:EYE_GLOW,h=Math.max(2,g.es),y0=fi===FR.scared?g.ey-1:g.ey;
[g.e1,g.e2].forEach(function(ex){
for(var y=y0;y<g.ey+h;y++)for(var x=ex;x<ex+2;x++){
if(x<0||y<0||x>=F||y>=F)continue;
var i=(y*F+x)*4;
f.d[i]=c[0];f.d[i+1]=c[1];f.d[i+2]=c[2];f.d[i+3]=255;f.tag[y*F+x]=9;
}
});
}
var VS=11;
VX.STRIDE=VS;
var DIRS=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
var AO=[0.58,0.72,0.86,1];
var STR=[SXS,SYS,SZS],FACE=DIRS.map(function(D){
var ax=D[0]?0:D[1]?1:2,t1=ax===0?1:0,t2=ax===2?1:2,cs=[[0,0],[1,0],[1,1],[0,1]];
return{off:D[0]*SXS+D[1]*SYS+D[2]*SZS,n:D,shade:D[1]<0?0.82:1,corners:cs.map(function(c){
var v=[0,0,0];v[ax]=D[ax]>0?1:0;v[t1]=c[0];v[t2]=c[1];
return{v:v,a:(c[0]?1:-1)*STR[t1],b:(c[1]?1:-1)*STR[t2]};
})};
});
var MAXQ=16000,vbuf=new Float32Array(MAXQ*4*VS),ibuf=new Uint16Array(MAXQ*6),aoK=[0,0,0,0];
function meshGrid(){
var nq=0,o=0,io=0;
for(var y=bb[2];y<=bb[3];y++)for(var z=bb[4];z<=bb[5];z++)for(var x=bb[0];x<=bb[1];x++){
var i=idx(x,y,z),cv=col[i];
if(!cv)continue;
var p=part[i],pk=cv-1,em=pk&(1<<25)?1:0,jit=em?1:0.955+SB.hash(x,y*7+z*3,11)*0.09;
var r=(pk>>16&255)/255*jit,g=(pk>>8&255)/255*jit,b=(pk&255)/255*jit;
for(var d=0;d<6;d++){
var Fc=FACE[d],n=i+Fc.off;
if(col[n]&&rigid(p,part[n]))continue;
if(nq>=MAXQ)break;
for(var k=0;k<4;k++){
var C=Fc.corners[k],o1=col[n+C.a]?1:0,o2=col[n+C.b]?1:0,o3=col[n+C.a+C.b]?1:0;
aoK[k]=o1&&o2?0:3-o1-o2-o3;
var sh=em?1:AO[aoK[k]]*Fc.shade;
vbuf[o]=x+C.v[0];vbuf[o+1]=y+C.v[1];vbuf[o+2]=z+C.v[2];
vbuf[o+3]=Fc.n[0];vbuf[o+4]=Fc.n[1];vbuf[o+5]=Fc.n[2];
vbuf[o+6]=r*sh;vbuf[o+7]=g*sh;vbuf[o+8]=b*sh;vbuf[o+9]=em;vbuf[o+10]=p;
o+=VS;
}
var b0=nq*4;
if(aoK[0]+aoK[2]<aoK[1]+aoK[3]){ibuf[io]=b0+1;ibuf[io+1]=b0+2;ibuf[io+2]=b0+3;ibuf[io+3]=b0+1;ibuf[io+4]=b0+3;ibuf[io+5]=b0;}
else{ibuf[io]=b0;ibuf[io+1]=b0+1;ibuf[io+2]=b0+2;ibuf[io+3]=b0;ibuf[io+4]=b0+2;ibuf[io+5]=b0+3;}
io+=6;nq++;
}
}
return{verts:vbuf.slice(0,o),index:ibuf.slice(0,io),quads:nq};
}
function lookKey(c){
var lk=c.look;
return[c.species,lk.hue,lk.hue2,lk.sat|0,lk.light|0,lk.pattern,lk.ears,(lk.eyes*10)|0,lk.tail,(lk.body*10)|0,lk.legs,(lk.legLen*10)|0,lk.arms?1:0,
lk.head>0.4?1:0,lk.fins?1:0,lk.fluff?1:0,lk.horns?1:0,lk.wings?1:0,lk.antenna?1:0,lk.cheeks?1:0,c.tier,Math.min(4,c.stage||0),lk.spotsSeed,lk.cxKey||"",(lk.size*20)|0].join(",");
}
VX.lookKey=lookKey;
var cache={},cacheN=0,frameNo=0,budget=0,faceBudget=0;
VX.MAX_CACHE=48;
function maxCache(){return R.voxel?200:VX.MAX_CACHE;}
VX.stats={built:0,faces:0,buildMs:0,drawn:0,cache:0,sprites:0};
VX.modelFor=function(c,force){
var wl=SB.Wear&&SB.Wear.look?SB.Wear.look(c):null,wk=(wl?wl.key:"")+(c.leafy?"L":"")+(c.fit?Math.round(c.fit):"");
var key=c._vxKey&&c._vxLook===c.look&&c._vxTier===c.tier&&c._vxStage===c.stage&&c._vxW===wk?c._vxKey:null;
if(!key){key=lookKey(c)+wk;c._vxKey=key;c._vxLook=c.look;c._vxTier=c.tier;c._vxStage=c.stage;c._vxW=wk;}
var m=cache[key];
if(!m){
if(!force&&budget<=0)return null;
budget--;
var t0=(typeof performance!=="undefined"?performance.now():0);
m=cache[key]=VX.build(c);
m.key=key;m.faces={};cacheN++;
VX.stats.built++;VX.stats.buildMs+=(typeof performance!=="undefined"?performance.now():0)-t0;
if(cacheN>maxCache())evict();
}
m.used=frameNo;
return m;
};
VX.faceFor=function(m,fi,mood,force){
var fk=fi+":"+(mood||"");
var f=m.faces[fk];
if(!f){
if(!force&&faceBudget<=0)return null;
faceBudget--;
f=m.faces[fk]=VX.buildFace(m,fi,mood);
VX.stats.faces++;
}
return f;
};
function freeGpu(o){if(o&&o.gpu&&ctxRef){ctxRef.gl.deleteBuffer(o.gpu.vb);ctxRef.gl.deleteBuffer(o.gpu.ib);o.gpu=null;}}
function evict(){
var keys=Object.keys(cache).sort(function(a,b){return cache[a].used-cache[b].used;});
for(var i=0;i<keys.length&&cacheN>maxCache()*0.75;i++){
var m=cache[keys[i]];
if(m.used>=frameNo-2)break;
freeGpu(m);for(var k in m.faces)freeGpu(m.faces[k]);
delete cache[keys[i]];cacheN--;
}
}
VX.flush=function(){for(var k in cache){freeGpu(cache[k]);for(var f in cache[k].faces)freeGpu(cache[k].faces[f]);}cache={};cacheN=0;};
VX.cacheSize=function(){return cacheN;};
VX.tick=function(){frameNo++;budget=VX.BUILD_PER_FRAME+(R.voxel?2:0);faceBudget=budget*3;};
VX.BUILD_PER_FRAME=2;
VX.god=null;
try{
var pref=window.localStorage&&window.localStorage.getItem("smolbrains-smols");
if(pref==="3d")VX.god=true;else if(pref==="flat")VX.god=false;
if(/[?&]smols=3d/.test((window.location&&window.location.search)||""))VX.god=true;
if(/[?&]smols=flat/.test((window.location&&window.location.search)||""))VX.god=false;
}catch(e){}
VX.godOn=function(){return R.voxel||(VX.god==null?!!R.hd:VX.god);};
VX.setGod=function(on){VX.god=!!on;try{window.localStorage.setItem("smolbrains-smols",on?"3d":"flat");}catch(e){}};
VX.enabled=true;
VX.POV_FAR=26;
VX.POV_LOD=0.7;
VX.MAX_DRAWN=48;
VX.MAX_DRAWN_VOXEL=160;
VX.nearAlpha=function(d){var t=SB.clamp((d-0.04)/0.4,0,1);return t*t*(3-2*t);};
VX.bodyDist=function(ex,ey,ez,x,y,z,h,r){
var cy=SB.clamp(ey,y+r,y+Math.max(r,h-r));
return Math.max(0,Math.hypot(ex-x,ey-cy,ez-z)-r);
};
var list=[],ctxRef=null,prog=null;
var POSE0={sq:0,lean:0,hop:0,ear:0,wag:0,arms:null};
VX.pose=function(c,t,moving,legs){
var an=c.anim||{},a=c.action,V=SB.V||{},id=c.id||0,o={sq:0,lean:0,hop:0,ear:0,wag:0,arms:null};
if(c.corpse||c.heldBy==="hand")return POSE0;
if(c.asleep){
o.sq=Math.sin(t*1.3+id)*0.035;o.ear=-0.28;o.lean=0.12;
return o;
}
var doing=a&&a.phase==="do"?a.verb:null,em=an.emote;
if(an.flash>0||em==="ouch"){
var fk=Math.min(1,(an.flash||0.5)*2);
o.sq+=0.14*fk;o.lean-=0.3*fk;o.ear-=0.3;o.arms=[0.9,0.9];
}else if(doing===V.hit){
var sw=(t*2.6+id*0.37)%1,k=sw<0.45?sw/0.45:1-(sw-0.45)/0.55;
o.arms=[0.4,2.7*k-0.5];o.lean+=0.28*(sw<0.45?-k*0.6:(1-k));o.sq+=sw>0.45&&sw<0.6?0.08:0;
}else if(doing===V.eat||an.mouth==="chew"){
var ch=Math.abs(Math.sin(t*9+id));
o.lean+=0.1+ch*0.14;o.sq+=ch*0.05;o.arms=[1.25+ch*0.2,1.25+ch*0.2];o.wag+=0.25;
}else if(doing===V.talk||c.convo){
var tk=Math.sin(t*7+id);
o.sq+=Math.max(0,tk)*0.05;o.arms=[0.5+tk*0.5,0.2];o.ear+=tk*0.06;
}else if(doing===V.cuddle){o.arms=[1.5,1.5];o.lean+=0.16;o.sq+=Math.sin(t*2.2)*0.03;o.wag+=0.3;}
else if(doing===V.play){var pl=Math.abs(Math.sin(t*6+id));o.hop+=pl*(legs?1.6:0.6);o.arms=[2.2+pl*0.5,2.2-pl*0.5];o.wag+=0.35;}
else if(doing===V.pickup||doing===V.use){var rk=Math.sin(t*8+id);o.lean+=0.22;o.arms=[1.0+rk*0.35,1.0-rk*0.35];}
else if(doing===V.flee||em==="sad"&&moving){o.lean+=0.22;o.ear-=0.32;o.arms=[-0.9,-0.9];}
if(em==="happy"||em==="proud"||em==="yum"||em==="love"||em==="idea"){
var cz=Math.abs(Math.sin(t*8+id));
o.hop+=cz*(em==="idea"?2.2:1.4);o.sq-=cz*0.06;o.wag+=0.4;o.ear+=0.12;
if(!o.arms&&!moving)o.arms=[2.5+Math.sin(t*9)*0.3,2.5-Math.sin(t*9)*0.3];
}else if(em==="angry"){o.sq+=Math.abs(Math.sin(t*16))*0.05;o.lean+=0.14;o.ear-=0.2;if(!o.arms)o.arms=[0.7,0.7];}
else if(em==="huh"){o.lean-=0.1;o.ear+=0.22;o.sq-=0.04;}
else if(em==="sick"){o.lean+=0.2;o.sq+=0.08+Math.sin(t*2)*0.03;o.ear-=0.25;}
if(moving&&legs)o.sq+=Math.abs(Math.sin((an.walk||0)*1.6))*0.035-0.015;
if(!moving&&!doing&&!em){
var ph=(t*0.11+id*0.173)%1;
if(ph<0.06){var st=Math.sin(ph/0.06*Math.PI);o.sq-=st*0.1;o.arms=[2.8*st,2.8*st];}
else if(ph>0.45&&ph<0.52){o.lean+=Math.sin((ph-0.45)/0.07*Math.PI*2)*0.14;o.ear+=0.1;}
else if(ph>0.8&&ph<0.83){o.wag+=Math.sin(t*40)*0.5;o.sq+=Math.sin(t*40)*0.03;}
}
return o;
};
VX.creature=function(c,x,y,z,t,mo){
var cam=R.camera,pov=!!cam.pov,scale=UNIT;
if(!VX.enabled||!R.gl||!R.gl()||!SB.Pixel)return false;
if(list.length>=(R.voxel?VX.MAX_DRAWN_VOXEL:VX.MAX_DRAWN))return false;
var alpha=1;
if(pov){
var e=cam.eye,dd=Math.hypot(x-e[0],z-e[2]);
if(dd>VX.POV_FAR)return false;
var pp=R.ppuAt(x,y+0.3,z);
if(pp&&pp*UNIT<VX.POV_LOD)return false;
}else{
if(!R.pixel||!VX.godOn())return false;
if(R.voxel){
var vcs=R.canvasSize(),vppu=vcs.h/(2*cam.halfH);
if(0.38*2.2*vppu/16<0.22)return false;
}else{
var cs=R.canvasSize(),ppu=cs.h/(2*cam.halfH),ratio=0.38*2.2*ppu/16;
if(ratio<(VX.god?0.75:1.6))return false;
var k=ratio<0.8?ratio:Math.min(2,Math.max(1,Math.floor(ratio+0.3)));
scale=UNIT*k/ratio;
}
}
var m=VX.modelFor(c);
if(!m)return false;
var an=c.anim,fr=SB.Pixel.frameFor?SB.Pixel.frameFor(c,t):0,FR=SB.Pixel.FR;
var fi=fr===FR.idle1||(fr>=FR.walk0&&fr<=FR.walk3)?FR.idle0:fr;
var mood=m.upright?SB.Pixel.faceOf(c)||"neutral":"";
var fm=VX.faceFor(m,fi,mood)||VX.faceFor(m,FR.idle0,mood);
if(pov){
var h=m.height*scale,r=Math.min(0.45,m.reach*scale*0.8);
alpha=VX.nearAlpha(VX.bodyDist(cam.eye[0],cam.eye[1],cam.eye[2],x,y,z,h,r));
if(alpha<=0.01)return true;
}
if(c.dying)alpha*=Math.max(0,1-c.fade);
var moving=c.moving||(c.action&&c.action.phase==="go")||!!c.plan,legs=m.S.legs;
var walk=moving&&!c.asleep&&c.onGround!==false?an.walk:0;
var legSw=walk?Math.sin(an.walk*1.6)*0.62:0,hop=0,sq=mo?mo.sq:0;
if(!legs&&walk){var hp=Math.abs(Math.sin(an.walk*1.1));hop=hp*3;sq+=(1-hp)*0.12-0.06;}
if(!c.corpse&&!c.asleep)sq+=Math.sin(an.bob*1.3)*0.03;
if(c.asleep)sq=Math.max(sq,0.18);
if(c.heldBy==="hand")sq=an.squash||0;
var hold=c.holding!=null,armL,armR;
if(an.wave>0){var wv=Math.sin(t*9)*0.4;armL=2.6+wv;armR=2.6-wv;}
else if(hold){var work=c.plan||(c.action&&c.action.phase==="do");armL=armR=1.35+(work?Math.sin(t*10)*0.3:0);}
else{armL=-legSw*0.8;armR=legSw*0.8;}
var wag=Math.sin(t*(moving?9:3)+c.id)*0.35-(mo?mo.ln*0.8:0);
var flap=Math.sin(t*(c.tier>=6?3:1.5)+c.id)*0.35+(c.onGround===false?Math.sin(t*14)*0.4:0);
var ear=Math.sin(t*3+c.id)*0.08+(mo?SB.clamp(mo.sv*0.025,-0.3,0.3):0);
var bob=Math.sin(t*2+c.id)*0.6;
if(c.tier>=6&&c.species==="smol"&&!c.heldBy&&!c.corpse)y+=Math.sin(t*1.7+c.id)*0.06;
var cut=-1e9,w=SB.Game.current&&SB.Game.current.world;
if(w&&!c.heldBy&&c.onGround!==false){
var dep=SB.World.depthAt(w,x,z);
if(dep>0.15){cut=SB.World.groundY(w,x,z);y=cut-Math.min(0.55,(dep-0.15)*0.6+((c.drownT||0)>0?0.25:0))*m.height*scale;}
}
var face=mo?mo.face:c.facing;
var lean=mo?mo.ln*0.9:0,P=VX.pose(c,t,moving,legs);
sq+=P.sq;lean+=P.lean;hop+=P.hop;ear+=P.ear;wag+=P.wag;
if(P.arms){armL=P.arms[0];armR=P.arms[1];}
var Wr=SB.Wear,G=Wr&&Wr.gait&&!c.corpse&&!c.asleep?Wr.gait(c,t,walk):null,roll=0,big=Wr&&Wr.look&&Wr.look(c);
big=big&&big.big;
if(G){hop+=G.hop;lean+=G.lean;roll=G.roll;legSw*=G.leg;ear+=G.ear;if(!P.arms&&!hold&&!(an.wave>0)){armL*=G.arm;armR*=G.arm;}}
if(big){scale*=1.25;R.light(x,y+0.6,z,5,big[0]/255,big[1]/255,big[2]/255);}
c._vxH=m.height*scale;
list.push({m:m,f:fm,x:x,y:y+hop*scale,z:z,face:face,s:scale,a:[legSw,wag,flap,ear],arm:[armL,armR],b:[SB.clamp(sq,-0.35,0.45),SB.clamp(lean,-0.6,0.6),bob,roll],
alpha:alpha,cut:cut,glow:(c.look.glow?0.35+c.look.glow*0.4:0)+(big?0.5:0),flash:an.flash||0,grey:c.corpse?1:0,
id:(6+Math.floor(SB.hash(c.id,3,9)*240))/255});
if(R.project){var p0=R.project(x,y,z,pp0),p1=R.project(x,y+m.height*scale,z,pp1);c._pxH=Math.max(8,p0.y-p1.y+6);}
return true;
};
var pp0={},pp1={};
var VSRC=[
"attribute vec3 aPos; attribute vec3 aNrm; attribute vec4 aCol; attribute float aPart;",
"uniform mat4 uVP; uniform vec4 uM0; uniform vec4 uM1; uniform vec4 uM2;",
"uniform vec3 uPiv[10]; uniform vec4 uA; uniform vec2 uArm; uniform vec4 uB;",
"uniform vec4 uFog; uniform vec4 uCam;",
"varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vEm; varying float vFog;",
"vec3 rz(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x * c - p.y * s, p.x * s + p.y * c, p.z); }",
"vec3 ry(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x * c + p.z * s, p.y, -p.x * s + p.z * c); }",
"vec3 rx(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c); }",
"void main() {",
"  vec3 p = aPos, n = aNrm; float pt = aPart;",
"  if (pt > 1.5 && pt < 5.5) {",
"    float a = pt < 2.5 ? uA.x : pt < 3.5 ? -uA.x : pt < 4.5 ? uArm.x : uArm.y;",
"    vec3 pv = pt < 2.5 ? uPiv[2] : pt < 3.5 ? uPiv[3] : pt < 4.5 ? uPiv[4] : uPiv[5];",
"    p = rz(p - pv, a) + pv; n = rz(n, a);",
"  } else if (pt > 5.5 && pt < 6.5) { p = ry(p - uPiv[6], uA.y) + uPiv[6]; n = ry(n, uA.y); }",
"  else if (pt > 6.5 && pt < 7.5) { float a = (p.z > uPiv[7].z ? -1.0 : 1.0) * uA.z; p = rx(p - uPiv[7], a) + uPiv[7]; n = rx(n, a); }",
"  else if (pt > 7.5 && pt < 8.5) { p.y += uB.z; }",
"  else if (pt > 8.5) { float a = (p.z > 0.0 ? -1.0 : 1.0) * uA.w; p = rx(p - uPiv[9], a) + uPiv[9]; n = rx(n, a); }",
"  p.y *= 1.0 - uB.x; p.xz *= 1.0 + uB.x * 0.5;",
"  p = rz(p, -uB.y); n = rz(n, -uB.y);",
"  p = rx(p, uB.w); n = rx(n, uB.w);",
"  vec4 q = vec4(p, 1.0);",
"  vec3 w = vec3(dot(uM0, q), dot(uM1, q), dot(uM2, q));",
"  vN = normalize(vec3(dot(uM0.xyz, n), dot(uM1.xyz, n), dot(uM2.xyz, n)));",
"  vCol = aCol.rgb; vEm = aCol.a; vW = w;",
"  vFog = smoothstep(uFog.x, uFog.y, dot(w.xz - uCam.xy, uCam.zw)) * uFog.z;",
"  gl_Position = uVP * vec4(w, 1.0);",
"}"
].join("\n");
function fsrc(){
return[R.PREC,R.LIGHT_GLSL,
"uniform vec4 uView; uniform vec3 uEyeO; uniform vec4 uMisc; uniform float uCut; uniform float uId;",
"varying vec3 vCol; varying vec3 vN; varying vec3 vW; varying float vEm; varying float vFog;",
"float b2(vec2 p) { return mod(2.0 * p.x + 3.0 * p.y, 4.0); }",
"float bayer(vec2 f) { vec2 p = mod(floor(f), 4.0); return (4.0 * b2(mod(p, 2.0)) + b2(floor(p / 2.0)) + 0.5) / 16.0; }",
"void main() {",
"  if (vW.y < uCut) discard;",
"  if (uMisc.x < 0.999 && uMisc.x <= bayer(gl_FragCoord.xy)) discard;",
"  vec3 n = normalize(vN);",
"  vec3 V = uView.w > 0.5 ? normalize(uEyeO - vW) : uView.xyz;",
"  float rim = pow(1.0 - clamp(abs(dot(n, V)), 0.0, 1.0), 3.0);",
"  vec3 c = shade(vCol, n, vW, vEm * 0.8 + uMisc.y, vFog);",
"  c += (uSkyCol * 0.5 + uSunCol * 0.2) * rim * 0.3 * (1.0 - vFog) * (1.0 - uNight * 0.6);",
"  c = mix(c, vec3(1.0), uMisc.z * 0.7);",
"  if (uMisc.w > 0.5) { float g = dot(c, vec3(0.3, 0.59, 0.11)); c = mix(c, vec3(g * 0.8 + 0.06, g * 0.8 + 0.06, g * 0.85 + 0.1), 0.8); }",
"  gl_FragColor = vec4(c, uId);",
"}"].join("\n");
}
function upload(ctx,o){
if(o.gpu)return o.gpu;
var gl=ctx.gl,ib=gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,o.index,gl.STATIC_DRAW);
o.gpu={vb:GL.buffer(ctx,o.verts),ib:ib,n:o.index.length};
return o.gpu;
}
var mats={m0:new Float32Array(4),m1:new Float32Array(4),m2:new Float32Array(4)};
if(R.afterObjects)R.afterObjects(function(gl,ctx,VP,cam){
VX.stats.drawn=list.length;VX.stats.cache=cacheN;
VX.tick();
if(!list.length)return;
if(ctxRef!==ctx){if(ctxRef)VX.flush();ctxRef=ctx;prog=null;}
if(!prog)prog=GL.program(ctx,VSRC,fsrc());
var p=prog;
gl.useProgram(p.prog);
R.setLightUniforms(p);
if(cam.pov)gl.uniform4f(p.u.uView,0,0,0,1);else gl.uniform4f(p.u.uView,-cam.fwd[0],-cam.fwd[1],-cam.fwd[2],0);
gl.uniform3f(p.u.uEyeO,cam.eye[0],cam.eye[1],cam.eye[2]);
for(var i=0;i<list.length;i++){
var d=list[i],s=d.s,sn=Math.sin(d.face),cs=Math.cos(d.face);
gl.uniform4f(p.u.uM0,s*sn,0,s*cs,d.x);
gl.uniform4f(p.u.uM1,0,s,0,d.y);
gl.uniform4f(p.u.uM2,s*cs,0,-s*sn,d.z);
gl.uniform3fv(p.u.uPiv,d.m.pivots);
gl.uniform4f(p.u.uA,d.a[0],d.a[1],d.a[2],d.a[3]);
gl.uniform2f(p.u.uArm,d.arm[0],d.arm[1]);
gl.uniform4f(p.u.uB,d.b[0],d.b[1],d.b[2],d.b[3]);
gl.uniform4f(p.u.uMisc,d.alpha,d.glow,d.flash,d.grey);
gl.uniform1f(p.u.uCut,d.cut);
gl.uniform1f(p.u.uId,d.id);
var parts=[d.m,d.f];
for(var j=0;j<2;j++){
var o=parts[j];
if(!o||!o.index.length)continue;
var g=upload(ctx,o);
GL.attribs(ctx,g.vb,[[p.a.aPos,3],[p.a.aNrm,3],[p.a.aCol,4],[p.a.aPart,1]],VS,0);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,g.ib);
gl.drawElements(gl.TRIANGLES,g.n,gl.UNSIGNED_SHORT,0);
if(R.perf){R.perf.draws++;R.perf.tris+=g.n/3;}
}
}
list.length=0;
});
})();
