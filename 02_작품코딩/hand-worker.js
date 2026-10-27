let detector;
self.onmessage=async({data})=>{
  try{
    if(data.type==='init'){
      const {HandLandmarker,FilesetResolver}=await import('./vendor/vision_bundle.mjs');
      const files=await FilesetResolver.forVisionTasks('./vendor/wasm');
      detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:'./vendor/hand_landmarker.task',delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.6,minHandPresenceConfidence:.6,minTrackingConfidence:.6});
      self.postMessage({type:'ready'});
    }else if(data.type==='frame'){
      try{const result=detector.detectForVideo(data.bitmap,data.timestamp);self.postMessage({type:'result',hands:result.landmarks,timestamp:data.timestamp});}finally{data.bitmap.close();}
    }
  }catch(error){self.postMessage({type:'error',message:error.message});}
};
