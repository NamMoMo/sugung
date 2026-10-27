const config=require('../config.js');
function experience({timeout=false}={}){
 const chosen=config.questions.map(q=>q[2][0]),caught=timeout?{}:{[chosen[0]]:15};
 const startedAt=1760000000000,finishedAt=startedAt+240000;
 const history=chosen.map((word,i)=>({type:'choice',question_index:i,word,at:new Date(startedAt+1000*(i+1)).toISOString()}));
 for(let i=0;i<(timeout?0:15);i++)history.push({type:'capture',word:chosen[0],gesture:'주먹',at:new Date(startedAt+10000+1000*i).toISOString()});
 return{chosen,caught,caughtTotal:timeout?0:15,lastCaught:timeout?'':chosen[0],rainActive:timeout?60:30,mode:'camera',test:false,startedAt,finishedAt,history};
}
module.exports={config,experience};
