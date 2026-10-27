// 항목 목록: 체험 화면(index.html)·직원 화면(staff.html)·빔 화면(display.html)이 함께 씁니다.
// 이전 관객 기록과 이미 배포된 QR을 읽기 위한 과거 항목입니다. 새 선택 목록은 아래 INTEREST_ITEMS입니다.
export const LEGACY_CATEGORY = {
  '양치하기':'want','샤워하기':'want','물 마시기':'want','밥 챙겨 먹기':'want','스트레칭하기':'want','일찍 눕기':'want',
  '창문 열기':'strength','이불 정리':'strength','옷 갈아입기':'strength','설거지하기':'strength','화분 돌보기':'strength',
  '산책하기':'way','햇볕 쬐기':'way','안부 전하기':'way','노래 듣기':'way',
};
export const CAT_NAME = { interest:'내가 좋아하는 것', want:'몸 돌보기', strength:'공간 돌보기', way:'마음 돌보기' };
// 영어 (외국인 관람객용). 항목을 바꾸거나 더하면 여기에도 같은 이름으로 넣어 주세요
export const ITEM_EN = {
  '양치하기':'Brush teeth','샤워하기':'Take a shower','물 마시기':'Drink water','밥 챙겨 먹기':'Eat a meal','스트레칭하기':'Stretch','일찍 눕기':'Rest early',
  '창문 열기':'Open a window','이불 정리':'Make the bed','옷 갈아입기':'Get dressed','설거지하기':'Do the dishes','화분 돌보기':'Tend a plant',
  '산책하기':'Take a walk','햇볕 쬐기':'Get some sun','안부 전하기':'Say hello','노래 듣기':'Listen to music',
};
export const CAT_NAME_EN = { interest:'What I enjoy', want:'Caring for my body', strength:'Caring for my space', way:'Caring for my heart' };
export const CAT_COLOR = { interest:'#D9A441', want:'#D9A441', strength:'#2F7D6D', way:'#3D6FA3' };

// 현재 선택 목록. DB에는 짧은 항목명을 저장하고 화면에는 문장 전체를 표시합니다.
export const INTEREST_ITEMS = {
  "사람과 마음": {
    "treasure": "마음의 진주",
    "statement": "나는 사람들의 이야기를 듣고, 그 사람이 어떤 마음인지 알아가는 게 좋다.",
    "en": "People and feelings",
    "statementEn": "I enjoy listening to people’s stories and getting to know how they feel."
  },
  "자연과 생명": {
    "treasure": "생명의 잎사귀",
    "statement": "나는 동식물을 관찰하고, 생명이 자라고 변하는 모습을 알아가는 게 좋다.",
    "en": "Nature and life",
    "statementEn": "I enjoy observing plants and animals and learning how living things grow and change."
  },
  "음악과 소리": {
    "treasure": "울림의 조개",
    "statement": "나는 음악과 소리를 듣고, 마음에 드는 리듬이나 멜로디를 찾아보는 게 좋다.",
    "en": "Music and sound",
    "statementEn": "I enjoy listening to music and sounds and discovering rhythms or melodies I like."
  },
  "숫자와 규칙": {
    "treasure": "규칙의 결정",
    "statement": "나는 숫자나 패턴 속에서 규칙을 찾아 문제를 풀어보는 게 좋다.",
    "en": "Numbers and patterns",
    "statementEn": "I enjoy finding rules in numbers or patterns and using them to solve problems."
  },
  "이야기와 상상": {
    "treasure": "이야기의 두루마리",
    "statement": "나는 ‘만약에?’를 상상하며 새로운 인물이나 이야기를 만들어보는 게 좋다.",
    "en": "Stories and imagination",
    "statementEn": "I enjoy imagining “what if?” and creating new characters or stories."
  },
  "기술과 도구": {
    "treasure": "원리의 톱니",
    "statement": "나는 도구나 기계가 어떻게 움직이는지 알아보고, 직접 다뤄보는 게 좋다.",
    "en": "Technology and tools",
    "statementEn": "I enjoy learning how tools and machines work and trying them out myself."
  },
  "음식과 미각": {
    "treasure": "풍미의 작은 술",
    "statement": "나는 여러 음식의 맛과 향을 비교하고, 새로운 조합을 시도해보는 게 좋다.",
    "en": "Food and taste",
    "statementEn": "I enjoy comparing the tastes and aromas of different foods and trying new combinations."
  },
  "운동과 움직임": {
    "treasure": "움직임의 바람",
    "statement": "나는 몸을 움직이고, 새로운 동작을 익히거나 운동에 도전하는 게 좋다.",
    "en": "Exercise and movement",
    "statementEn": "I enjoy moving my body, learning new movements, and trying physical activities."
  },
  "예술과 디자인": {
    "treasure": "빛깔의 보석",
    "statement": "나는 색과 모양을 조합해, 내가 떠올린 모습을 눈에 보이게 표현하는 게 좋다.",
    "en": "Art and design",
    "statementEn": "I enjoy combining colors and shapes to bring what I imagine to life."
  },
  "게임과 놀이": {
    "treasure": "즐거움의 주사위",
    "statement": "나는 게임과 놀이에서 전략을 궁리하고, 새로운 즐거움을 찾아보는 게 좋다.",
    "en": "Games and play",
    "statementEn": "I enjoy thinking up strategies in games and play and finding new ways to have fun."
  }
};
export const CATEGORY = Object.fromEntries(Object.keys(INTEREST_ITEMS).map(label => [label, "interest"]));
export const itemStatement = (label, lang = "ko") => INTEREST_ITEMS[label]?.[lang === "en" ? "statementEn" : "statement"] || (lang === "en" ? ITEM_EN[label] || label : label);
export const categoryOf = label => CATEGORY[label] || LEGACY_CATEGORY[label] || "want";
export const offlineLabels = (encoded, version) => {
  const labels = Object.keys(version === "2" ? CATEGORY : LEGACY_CATEGORY);
  return encoded.split(".").map(value => /^\d+$/.test(value) ? labels[Number(value)] : undefined).filter(Boolean);
};
Object.entries(INTEREST_ITEMS).forEach(([label, item]) => { ITEM_EN[label] = item.en; });
