import { FilesetResolver, GestureRecognizer, ImageSegmenter, PoseLandmarker } from '@mediapipe/tasks-vision';

export async function createVision() {
  const files = await FilesetResolver.forVisionTasks('/mediapipe');
  const init = async delegate => {
    let hands,detailHands,segmenter,pose;
    try {
      hands = await GestureRecognizer.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/mediapipe/gesture_recognizer.task', delegate },
        runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence: .4,
        minHandPresenceConfidence: .4, minTrackingConfidence: .4,
      });
      detailHands=await GestureRecognizer.createFromOptions(files,{
        baseOptions:{modelAssetPath:'/mediapipe/gesture_recognizer.task',delegate},runningMode:'IMAGE',numHands:2,
        minHandDetectionConfidence:.35,minHandPresenceConfidence:.35,
      });
      segmenter = await ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/mediapipe/selfie_multiclass.tflite', delegate },
        runningMode: 'VIDEO', outputCategoryMask: false, outputConfidenceMasks: true,
      });
      pose=await PoseLandmarker.createFromOptions(files,{
        baseOptions:{modelAssetPath:'/mediapipe/pose_landmarker_lite.task',delegate},
        runningMode:'VIDEO',numPoses:1,minPoseDetectionConfidence:.4,minPosePresenceConfidence:.4,
        minTrackingConfidence:.5,outputSegmentationMasks:false,
      });
      return { hands, detailHands, segmenter, pose, delegate };
    } catch (error) { hands?.close();detailHands?.close();segmenter?.close();pose?.close();throw error; }
  };
  try { return await init('GPU'); } catch { return await init('CPU'); }
}

export function readHands(result) {
  return result.landmarks.map((points, i) => {
    const category = result.gestures[i]?.[0];
    let gesture = 'unknown';
    if (category?.score > .45) {
      if (category.categoryName === 'Closed_Fist') gesture = 'fist';
      if (category.categoryName === 'Open_Palm') gesture = 'open';
    }
    if(gesture==='unknown')gesture=landmarkGesture(result.worldLandmarks?.[i]||points);
    // Cursor follows the wrist, in mirrored screen coordinates.
    return { id: result.handedness[i]?.[0]?.categoryName || `hand-${i}`, x: 1 - points[0].x, y: points[0].y, gesture, points };
  });
}
export function foregroundMask(result){
 const background=result.confidenceMasks?.[0];if(!background)return null;
 const values=background.getAsFloat32Array(),data=new Float32Array(values.length);
 for(let i=0;i<data.length;i++)data[i]=1-values[i];
 return {width:background.width,height:background.height,data};
}
export function remapHand(hand,roi){
 const points=hand.points.map(p=>({...p,x:roi.x+p.x*roi.w,y:roi.y+p.y*roi.h}));
 return {...hand,points,x:1-points[0].x,y:points[0].y};
}
export class HandSearch {
 constructor(canvas){this.canvas=canvas;this.context=canvas.getContext('2d');this.last=null;this.lastAt=0;this.scan=0;this.lastDetail=0;}
 detect(vision,video,now,{detail=true}={}){
  let hands=readHands(vision.hands.recognizeForVideo(video,now));
  const small=!hands.length||hands.some(h=>Math.max(...h.points.map(p=>p.x))-Math.min(...h.points.map(p=>p.x))<.13);
  if(detail&&small&&vision.detailHands&&now-this.lastDetail>110){
   this.lastDetail=now;
   let roi;
   const tracking=hands[0]||(now-this.lastAt<2000?this.last:null);
   if(tracking){
    const xs=tracking.points.map(p=>p.x),ys=tracking.points.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
    const w=Math.max(.18,Math.min(.55,(Math.max(...xs)-Math.min(...xs))*3.5));
    const h=Math.max(.25,Math.min(.70,(Math.max(...ys)-Math.min(...ys))*3.5));
    roi={x:Math.max(0,Math.min(1-w,cx-w/2)),y:Math.max(0,Math.min(1-h,cy-h/2)),w,h};
   }else{const windows=[];for(const y of [.02,.27,.52])for(const x of [.14,.36,.58])windows.push([x,y]);const [x,y]=windows[this.scan++%windows.length];roi={x,y,w:.28,h:.46};}
   const vw=video.videoWidth,vh=video.videoHeight;
   this.canvas.width=512;this.canvas.height=Math.round(512*(roi.h*vh)/(roi.w*vw));
   this.context.drawImage(video,roi.x*vw,roi.y*vh,roi.w*vw,roi.h*vh,0,0,this.canvas.width,this.canvas.height);
   const detail=readHands(vision.detailHands.recognize(this.canvas)).map(h=>remapHand(h,roi));
   for(const h of detail){const i=hands.findIndex(old=>Math.hypot(old.x-h.x,old.y-h.y)<.15);if(i>=0)hands[i]={...h,id:hands[i].id};else hands.push(h);}
  }
  if(hands.length){this.last=hands[0];this.lastAt=now;}
  return hands;
 }
}
export function landmarkGesture(points){
 if(!points?.[20])return 'unknown';
 const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
 let closed=0,open=0;
 for(const [tip,pip] of [[8,6],[12,10],[16,14],[20,18]]){
  const base=distance(points[pip],points[0]);if(base<1e-5)continue;
  const ratio=distance(points[tip],points[0])/base;
  if(ratio<1.12)closed++;
  if(ratio>1.38)open++;
 }
 if(closed>=3&&open===0)return 'fist';
 if(open>=3&&closed===0)return 'open';
 return 'unknown';
}
