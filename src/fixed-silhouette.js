// One vector outline drives the rendered image, label contour, drop mask and aura.
export const FIXED_BUST_BOUNDS={x:384,y:140,width:512,height:490};
export const FIXED_BUST_FRAME={x:.5,headX:.5,headY:.37,shoulderY:.63,width:.4};
const outline=[
 ['M',220,3],['C',185,-5,150,16,139,45],['C',130,64,132,90,135,109],
 ['C',125,106,129,139,141,147],['C',146,169,158,185,165,193],
 ['C',170,204,168,214,160,222],['C',145,237,126,244,94,252],
 ['C',70,258,45,262,30,275],['C',13,294,8,335,3,376],['L',0,400],
 ['L',425,400],['L',422,376],['C',418,335,414,293,398,276],
 ['C',382,263,355,257,332,250],['C',305,242,286,232,278,219],
 ['C',270,207,273,196,281,185],['C',290,170,296,155,299,143],
 ['C',310,136,312,109,302,109],['C',302,87,304,66,297,49],
 ['C',288,23,265,7,243,7],['C',234,4,228,3,220,3],['Z'],
];
export const FIXED_BUST_PATH=outline.map(([command,...values])=>command+values.join(' ')).join(' ');
export const FIXED_BUST_SVG=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 425 400"><path fill="#000" d="${FIXED_BUST_PATH}"/></svg>`;
export function drawFixedBust(context,path){
 const b=FIXED_BUST_BOUNDS;context.save();context.translate(b.x,b.y);context.scale(b.width/425,b.height/400);context.fill(path);context.restore();
}
function contour(){
 const points=[];let previous=[0,0];
 for(const [command,...v] of outline){
  if(command==='M'||command==='L'){previous=v;points.push(v);}
  else if(command==='C'){
   const start=previous;
   for(let step=1;step<=24;step++){const t=step/24,u=1-t;points.push([u*u*u*start[0]+3*u*u*t*v[0]+3*u*t*t*v[2]+t*t*t*v[4],u*u*u*start[1]+3*u*u*t*v[1]+3*u*t*t*v[3]+t*t*t*v[5]]);}
   previous=v.slice(4);
  }
 }
 return points;
}
export function createFixedBustMask(width=640,height=360){
 const polygon=contour(),b=FIXED_BUST_BOUNDS,data=new Float32Array(width*height);
 for(let row=0;row<height;row++){
  const y=((row+.5)*720/height-b.y)*400/b.height,xs=[];
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
   const a=polygon[j],c=polygon[i];
   if((a[1]>y)!==(c[1]>y))xs.push(a[0]+(y-a[1])*(c[0]-a[0])/(c[1]-a[1]));
  }
  xs.sort((a,c)=>a-c);
  for(let i=0;i+1<xs.length;i+=2){
   const left=(b.x+xs[i]*b.width/425)*width/1280,right=(b.x+xs[i+1]*b.width/425)*width/1280;
   for(let x=Math.max(0,Math.floor(left));x<Math.min(width,Math.ceil(right));x++)data[row*width+x]=Math.max(0,Math.min(x+1,right)-Math.max(x,left));
  }
 }
 return {width,height,data,mirrored:false};
}
