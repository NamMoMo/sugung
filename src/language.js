const words = {실력:'Ability',자유:'Freedom',연봉:'Salary',명예:'Recognition',봉사:'Service',성장:'Growth',안정:'Stability'};
export const isLanguageScene = scene => ['mainReady','main','photo'].includes(scene);
export function displayLabel(label,language){return language==='en'&&!label.own ? words[label.text]||label.text : label.text;}
export const EN = {
 '나에게 맞지 않는 말은 내려놓고, 소중한 말을 더해보세요.':'Let go of what does not fit you. Add what matters to you.',
 '지금의 모습을 휴대폰으로 남겨보세요.':'Capture this moment with your phone.',
 '이동':'Move','펴기':'Open hand','완료한 상호작용':'Interactions completed','확인':'Confirm',
 '손이 닿았어요 · 주먹을 쥐어주세요':'Hand in position · Make a fist',
 '주먹 3초 유지 또는 클릭':'Hold a fist for 3 seconds or click',
 '버튼 위에서 주먹을 3초간 유지해주세요':'Hold a fist over the button for 3 seconds',
 '화면에 손을 펴서 보여주세요 · 손목 위치가 빛으로 표시됩니다':'Show an open hand to the camera · The light follows your wrist',
 '내려놓기':'Let go','나의 기준 더하기':'Add your own values',
 '2초 눌러 잡고, 몸 밖으로 옮겨 놓기':'Hold for 2 seconds, move outside your body, then release',
 '주먹 2초로 잡고, 몸 밖에서 손 펴기':'Hold a fist for 2 seconds; open your hand outside your body',
 '나만의 기준을 적어보세요':'Type what matters to you',
 '키워드 추가':'Add keyword','시작하기':'Start','운영':'Operator',
 '손으로 확인했습니다.':'Confirmed with your hand.',
 '손을 놓쳐 라벨을 원래 자리로 돌려놓았어요.':'Tracking lost. The label has returned to its place.',
 '실루엣 키워드':'Silhouette keywords','진행 횟수':'Interaction count',
 '관객 실루엣과 빛 입자':'Visitor silhouette and light particles',
 '좌우 반전 웹캠 미리보기':'Mirrored webcam preview',
 '최종결과 페이드아웃':'Result fade out','메인 콘텐츠 배경음악':'Main scene background music',
 'main_BGM.mp3 파일을 재생할 수 없습니다.':'Unable to play main_BGM.mp3.',
 '카메라 권한 대기 취소':'Cancel camera permission request',
};
export const translate = (text,language) => language==='en' ? EN[text]||text : text;
