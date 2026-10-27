(()=>{'use strict';
  class CameraInput{
    constructor(video,onResult,onStatus){this.video=video;this.onResult=onResult;this.onStatus=onStatus;this.gestures=new WaveGestures.Tracker();this.ready=false;this.connecting=false;this.inFlight=false;this.lastVideoTime=-1;this.lastResult=0;this.lastDetect=0;this.session=0;}
    clear(){this.gestures.reset();this.onResult({hands:[],events:[]});}
    stop(){this.session++;this.ready=false;this.clear();if(this.rejectInit){this.rejectInit(new Error('연결이 중단되었습니다.'));this.rejectInit=null;}this.worker?.terminate();this.worker=null;this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.srcObject=null;this.inFlight=false;this.lastVideoTime=-1;}
    fail(error){this.stop();const messages={NotAllowedError:'카메라 권한을 허용한 뒤 다시 연결해 주세요.',NotFoundError:'웹캠 연결을 확인해 주세요.',NotReadableError:'카메라를 사용하는 다른 앱을 닫아 주세요.'};this.onStatus('error',messages[error.name]||error.message);}
    async connect(){
      if(this.connecting)return false;
      if(location.protocol==='file:'){this.onStatus('error','start.bat를 실행한 localhost 주소로 열어 주세요.');return false;}
      this.connecting=true;this.stop();const session=this.session;this.onStatus('loading','카메라와 손 인식을 준비하고 있습니다.');
      try{
        if(!isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new Error('localhost 또는 HTTPS에서 실행해 주세요.');
        const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480}}});
        if(this.session!==session){stream.getTracks().forEach(t=>t.stop());return false;}
        this.stream=stream;this.video.srcObject=stream;await this.video.play();
        this.worker=new Worker('hand-worker.js');
        await new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>reject(new Error('손 인식 준비 시간이 초과되었습니다. 다시 연결해 주세요.')),30000);
          this.rejectInit=error=>{clearTimeout(timer);reject(error);};
          this.worker.onerror=()=>{const e=new Error('손 인식 파일을 읽지 못했습니다. vendor 폴더와 로컬 서버를 확인해 주세요.');if(this.rejectInit)this.rejectInit(e);else this.fail(e);};
          this.worker.onmessage=({data})=>{
            if(this.session!==session)return;
            if(data.type==='ready'){clearTimeout(timer);this.rejectInit=null;resolve();}
            else if(data.type==='error'){const e=new Error('손 인식 오류: '+data.message);if(this.rejectInit)this.rejectInit(e);else this.fail(e);}
            else if(data.type==='result'){this.inFlight=false;const now=performance.now();if(document.hidden||now-data.timestamp>350){this.clear();return;}this.lastResult=now;const value=this.gestures.update(data.hands,now);this.onResult(value);this.onStatus(value.hands.length?'tracking':'waiting',value.hands.length?'손 인식 중':'카메라에 손을 보여 주세요.');}
          };
          this.worker.postMessage({type:'init'});
        });
        this.ready=true;stream.getVideoTracks()[0].onended=()=>this.fail(new Error('카메라 연결이 끊겼습니다. 다시 연결해 주세요.'));this.onStatus('waiting','카메라에 손을 보여 주세요.');return true;
      }catch(error){if(this.session===session)this.fail(error);return false;}finally{this.connecting=false;}
    }
    async tick(now,active){
      if(this.lastResult&&now-this.lastResult>350){this.clear();this.lastResult=0;}
      if(!active||document.hidden||!this.ready)return;
      if(this.inFlight){if(now-this.frameSent>5000)this.fail(new Error('손 인식이 응답하지 않습니다. 다시 연결해 주세요.'));return;}
      if(now-this.lastDetect<50||this.video.readyState<2||this.video.currentTime===this.lastVideoTime)return;
      this.lastDetect=now;this.lastVideoTime=this.video.currentTime;this.inFlight=true;this.frameSent=now;const worker=this.worker;
      try{const bitmap=await createImageBitmap(this.video);if(worker!==this.worker||!this.ready){bitmap.close();return;}worker.postMessage({type:'frame',bitmap,timestamp:now},[bitmap]);}catch(error){if(worker===this.worker){this.inFlight=false;this.fail(error);}}
    }
  }
  window.CameraInput=CameraInput;
})();
