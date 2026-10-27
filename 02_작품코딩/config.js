(function(root,factory){const value=factory();if(typeof module==='object'&&module.exports)module.exports=value;else root.WaveConfig=value;})(typeof globalThis!=='undefined'?globalThis:this,()=>{
  const questions=[
    ['직장 선택','내가 직장을 선택할 때\n가장 중요하게 생각하는 조건',['높은 연봉','고용 안정','워라밸','성장 기회']],
    ['업무 방식','내가 가장 선호하는 업무 방식',['자율성','체계성','협력','독립성']],
    ['직업적 보람','내가 일하면서\n가장 큰 보람을 느끼는 순간',['목표 달성','타인의 인정','정당한 보상','자기발전']],
    ['직업적 윤리','내가 중요한 결정을 내릴 때\n가장 우선하는 가치',['원칙 준수','융통성','공정성','인간적 배려']],
    ['몰입하는 순간','내가 가장 몰입할 수 있는 업무 환경',['아이디어 실현','깊이 있는 연구','규칙적인 업무','협업 프로젝트']],
    ['미래의 목표','내가 진로를 통해\n궁극적으로 얻고 싶은 것',['경제적 여유','전문성','사회적 영향력','시간적 자유']],
    ['포기할 수 없는 가치','내가 일을 통해 이루고 싶은\n가장 중요한 가치',['자아실현','경제적 독립','사회적 기여','명예']]
  ];
  // Curatorial classification: left = development; right = stability.
  const stable=new Set(['높은 연봉','고용 안정','워라밸','체계성','타인의 인정','정당한 보상','원칙 준수','공정성','인간적 배려','규칙적인 업무','경제적 여유','시간적 자유','경제적 독립','명예']);
  const words=questions.flatMap(q=>q[2]);
  const sideFor=word=>!words.includes(word)?null:stable.has(word)?'right':'left';
  const wordScores=Object.freeze(Object.fromEntries(words.map(word=>[word,Object.freeze({side:sideFor(word),development:stable.has(word)?0:1,stability:stable.has(word)?1:0})])));
  const destinations={left:{label:'발전하고자 하는 삶',value:'발전의 물결',realm:'용궁',film:'assets/result_left.mp4',ending:'assets/ending_revised_with_sfx.mp4'},right:{label:'안정적인 삶',value:'안정의 물결',realm:'육지',film:'assets/result_right_stability.mp4',ending:'assets/ending_revised_with_sfx.mp4'}};
  function resolveResult(caught,lastWord,selected=[]){
    const chosen=Array.isArray(selected)?selected:(selected?[selected]:[]);
    const selection={left:0,right:0},capture={left:0,right:0};
    for(const word of chosen){const side=sideFor(word);if(side)selection[side]++;}
    for(const [word,count] of Object.entries(caught)){const side=sideFor(word);if(side&&Number.isFinite(count)&&count>0)capture[side]+=Math.floor(count);}
    const left=selection.left+capture.left,right=selection.right+capture.right,total=left+right;
    // At a tie honor the last captured word, then last valid first-stage choice.
    const tieSide=sideFor(lastWord)||[...chosen].reverse().map(sideFor).find(Boolean)||'right';
    const side=left===right?tieSide:(left>right?'left':'right');
    return {side,left,right,development:left,stability:right,selection,capture,tie:left===right,total,bias:total?(right-left)/total:0,strength:total?Math.abs(right-left)/total:0,...destinations[side]};
  }
  return Object.freeze({questions,wordScores,sideFor,resolveResult,destinations,dwellMs:1000,catchTarget:15,rainMaxActiveSeconds:60,descentSeconds:6,gatherSeconds:6,width:720,height:1280,worldDepth:3840});
});
