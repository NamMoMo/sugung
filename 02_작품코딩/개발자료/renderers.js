function glowCircle(x,y,r,gold=false,alpha=1){
 const t=performance.now()/1000,tw=Math.sin(t*.85+x*.01);
 ctx.save();ctx.globalAlpha=alpha;
 // 광원은 원 내부가 아니라 얇은 비눗막의 가장자리에 집중: 중심은 배경이 비침
 let halo=ctx.createRadialGradient(x,y,r*.66,x,y,r*1.28);
 halo.addColorStop(0,'rgba(20,90,150,0)');
 halo.addColorStop(.7,'rgba(67,192,255,.015)');
 halo.addColorStop(.9,gold?'rgba(255,208,96,.11)':'rgba(123,222,255,.085)');
 halo.addColorStop(1,'rgba(70,170,255,0)');
 ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*1.28,0,TAU);ctx.fill();
 ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.clip();
 // 중심부는 거의 투명하고 가장자리만 볼록하게 반사되는 렌즈
 const glass=ctx.createRadialGradient(x-r*.26,y-r*.38,r*.12,x,y,r*1.03);
 glass.addColorStop(0,'rgba(240,255,255,.035)');
 glass.addColorStop(.40,'rgba(70,190,240,.025)');
 glass.addColorStop(.72,'rgba(19,68,109,.018)');
 glass.addColorStop(.88,gold?'rgba(255,217,143,.13)':'rgba(116,222,255,.10)');
 glass.addColorStop(1,gold?'rgba(255,225,162,.24)':'rgba(210,244,255,.23)');
 ctx.fillStyle=glass;ctx.fillRect(x-r,y-r,r*2,r*2);
 // 실제 비눗방울처럼 움직이는 넓은 무지갯빛 간섭무늬
 ctx.save();ctx.translate(x,y);ctx.rotate(t*.09+tw*.04);
 for(let k=0;k<4;k++){
  const theta=t*.21+k*Math.PI/2;
  const gx=Math.cos(theta)*r*.48,gy=Math.sin(theta)*r*.48;
  const film=ctx.createRadialGradient(gx,gy,2,gx,gy,r*.8);
  const hues=[['255,132,232','115,240,255'],['112,244,222','184,132,255'],['255,222,146','124,185,255'],['141,170,255','255,170,214']][k];
  film.addColorStop(0,`rgba(${hues[0]},.045)`);
  film.addColorStop(.55,`rgba(${hues[1]},.09)`);
  film.addColorStop(1,`rgba(${hues[0]},0)`);
  ctx.fillStyle=film;ctx.beginPath();ctx.arc(gx,gy,r*.8,0,TAU);ctx.fill();
 }
 ctx.restore();
 // 굴절 띠: 화면의 반짝이는 윤슬이 비눗막에 감기는 듯한 움직임
 for(let k=0;k<4;k++){
  const shift=t*.12+k*1.47;
  ctx.beginPath();
  ctx.ellipse(x+Math.sin(shift)*r*.14,y+Math.cos(shift)*r*.09,
              r*(.78-k*.09),r*(.86-k*.11),Math.sin(shift)*.3,shift+.7,shift+2.4);
  ctx.strokeStyle=[
   'rgba(151,239,255,.24)','rgba(248,151,248,.19)',
   'rgba(255,225,158,.18)','rgba(122,244,223,.16)'][k];
  ctx.lineWidth=5-k*.7;ctx.shadowBlur=7;ctx.shadowColor='#b4e9ff';ctx.stroke();
 }
 // 위쪽 커다란 반사광과 하단의 얇은 곡면 반사
 ctx.shadowBlur=12;ctx.shadowColor='#fff';
 ctx.beginPath();ctx.ellipse(x-r*.28,y-r*.64,r*.48,r*.12,-.38,-.05,2.8);
 ctx.strokeStyle='rgba(255,255,255,.58)';ctx.lineWidth=4;ctx.stroke();
 ctx.beginPath();ctx.ellipse(x+r*.24,y+r*.63,r*.44,r*.08,-.35,.1,2.8);
 ctx.strokeStyle='rgba(193,244,255,.40)';ctx.lineWidth=2.4;ctx.stroke();
 ctx.restore(); // clipping
 // 얇고 선명한 외곽선, 색이 시간에 따라 바뀌는 이리데슨트 링
 ctx.shadowBlur=gold?21:15;ctx.shadowColor=gold?'#ffd57d':'#83ddff';
 for(let k=0;k<7;k++){
  const start=t*.18+k*TAU/7;
  ctx.beginPath();ctx.arc(x,y,r-k*.37,start,start+TAU/7+.07);
  ctx.lineWidth=k%2?2.5:3.1;
  ctx.strokeStyle=gold?
    ['#fff7d7','#ffdf9a','#ffd17c','#fff2bd','#ffcf82','#ffe9af','#fff8dc'][k]:
    ['rgba(212,253,255,.85)','rgba(148,240,251,.8)','rgba(252,169,249,.77)',
     'rgba(178,156,255,.73)','rgba(255,216,159,.82)','rgba(141,245,225,.79)','rgba(221,249,255,.9)'][k];
  ctx.stroke();
 }
 ctx.shadowBlur=0;
 // 작은 물방울 표면의 빛점이 움직이며 반짝임
 for(let i=0;i<6;i++){
  const angle=t*(i%2?.15:-.18)+i*TAU/6;
  const px=x+Math.cos(angle)*(r-1),py=y+Math.sin(angle)*(r-1);
  const pulse=.6+.4*Math.sin(t*2.7+i);
  ctx.globalAlpha=alpha*pulse;ctx.shadowBlur=12;ctx.shadowColor='#ffffff';
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(px,py,i%3===0?3.3:1.8,0,TAU);ctx.fill();
 }
 ctx.globalAlpha=alpha;ctx.shadowBlur=0;
 if(gold){
  const goldLight=ctx.createRadialGradient(x,y,r*.05,x,y,r);
  goldLight.addColorStop(0,'rgba(255,225,133,.26)');
  goldLight.addColorStop(.75,'rgba(255,207,102,.10)');
  goldLight.addColorStop(1,'rgba(255,200,75,.05)');
  ctx.fillStyle=goldLight;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function bubbleWord(w,x,y,r,gold=false,progress=0){glowCircle(x,y,r,gold);let words=w.split(' ');ctx.save();ctx.shadowBlur=14;ctx.shadowColor=gold?'#ffd47d':'#7ddfff';if(words.length===1)fillText(w,x,y,31,'#fff','600');else{fillText(words.slice(0,Math.ceil(words.length/2)).join(' '),x,y-19,26,'#fff','600');fillText(words.slice(Math.ceil(words.length/2)).join(' '),x,y+19,26,'#fff','600')}ctx.restore();if(progress>0){ctx.beginPath();ctx.arc(x,y,r+9,-Math.PI/2,-Math.PI/2+TAU*progress);ctx.strokeStyle='#ffe3a2';ctx.shadowColor='#ffd375';ctx.shadowBlur=17;ctx.lineWidth=6;ctx.stroke();ctx.shadowBlur=0}}
function emit(x,y,gold=true,n=28){for(let i=0;i<n;i++)particles.push({x,y,vx:rnd(-5,5),vy:rnd(-6,2),life:rnd(28,78),max:78,size:rnd(1,4),gold})}
function drawParticles(dt){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=particles.length-1;i>=0;i--){let p=particles[i];p.x+=p.vx*dt*.06;p.y+=p.vy*dt*.06;p.vx*=.992;p.vy+=.025;p.life-=dt/16.7;if(p.life<=0){particles.splice(i,1);continue}ctx.globalAlpha=clamp(p.life/p.max,0,1);ctx.fillStyle=p.gold?'#ffe1a0':'#9feaff';ctx.shadowColor=ctx.fillStyle;ctx.shadowBlur=10;ctx.beginPath();ctx.arc(p.x,p.y,p.size,0,TAU);ctx.fill()}ctx.restore()}
function water(xBase,yBase,tilt,t,amplitude=20){ctx.save();ctx.beginPath();for(let x=-25;x<=W+25;x+=8){const y=yBase+tilt*(x-W/2)+Math.sin(x*.012+t*1.7)*amplitude+Math.sin(x*.027-t*1.2)*amplitude*.28;if(x===-25)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.lineTo(W+25,H);ctx.lineTo(-25,H);ctx.closePath();let g=ctx.createLinearGradient(0,yBase,0,H);g.addColorStop(0,'rgba(36,181,227,.23)');g.addColorStop(1,'rgba(0,25,52,.48)');ctx.fillStyle=g;ctx.fill();ctx.strokeStyle='#6bdcff';ctx.shadowColor='#3dcfff';ctx.shadowBlur=22;ctx.lineWidth=4;ctx.stroke();ctx.restore()}

function addSplash(x,y,t){
 sound.play('water_touch',{pan:(x/W-.5)*1.4,volume:.32});
 splashes.push({x,y,born:clock*1000,seed:rnd(0,TAU)});
 emit(x,y,false,12);
}

function drawSplashes(now){
 for(let i=splashes.length-1;i>=0;i--){
  const s=splashes[i],p=(now-s.born)/1050;
  if(p>=1){splashes.splice(i,1);continue}
  ctx.save();ctx.globalAlpha=(1-p)*.78;ctx.strokeStyle='#9aeaff';ctx.shadowColor='#63d9ff';ctx.shadowBlur=14;
  ctx.lineWidth=2.2*(1-p)+.6;
  ctx.beginPath();ctx.ellipse(s.x,s.y,8+p*66,2+p*12,0,0,TAU);ctx.stroke();
  ctx.beginPath();ctx.ellipse(s.x,s.y,3+p*39,1+p*8,0,0,TAU);ctx.stroke();
  for(let j=0;j<7;j++){
   const a=j*TAU/7+s.seed;
   const px=s.x+Math.cos(a)*(8+p*39),py=s.y-Math.sin(p*Math.PI)*((j%3)+1)*21+Math.sin(a)*7;
   ctx.fillStyle='#d6f7ff';ctx.beginPath();ctx.arc(px,py,2.6*(1-p)+.5,0,TAU);ctx.fill();
  }
  ctx.restore();
 }
}
