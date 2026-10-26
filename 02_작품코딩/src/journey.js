import { actionCues } from "./action-cues.js";
import { treasures } from "./treasure-data.js";

export const STORAGE_KEY = "sugung-journey-v2";

export const chests = [
  {
    id: "outfit",
    number: "01",
    name: "내가 해보고 싶은 일",
    layer: "하고 싶은 역할",
    theme: "amber",
    icon: "Compass",
    english: "FOLLOW YOUR HEART",
    description: "해보고 싶은 역할을 골라, 마음이 향하는 보물을 찾아요.",
    prompt: "이 상황에서 어떤 역할을 맡아보고 싶나요?",
    scenes: [
      {
        id: "birthday-before",
        summary: "빌린 파티룸에서 친구의 생일파티를 준비해요. 나는 어떤 역할을 맡고 싶나요?",
        name: "친구의 생일파티를 준비해요",
        location: "빌린 파티룸 · 생일파티 준비",
        room: "birthday",
        phase: "before",
        story:
          "주말 오후, 빌린 파티룸에서 친구의 생일파티를 함께 준비하기로 했어요. 케이크와 카드, 장식, 간식, 게임을 준비해야 해요. 나는 어떤 역할을 맡아보고 싶나요?",
        quote: "잘할 수 있는 일보다, 내가 해보고 싶은 역할을 하나 골라 주세요.",
        actions: [
          "취향 알아보기",
          "축하 카드 구상하기",
          "파티 장식 만들기",
          "간식 준비 돕기",
          "게임 규칙 알려주기",
        ],
        options: [
          [
            "discover",
            "알아내기",
            "친구가 좋아하는 맛과 취향을 알아보고, 어울리는 케이크와 간식을 찾아보고 싶어요.",
            "Search",
          ],
          [
            "create",
            "창작하기",
            "친구와의 추억을 떠올려, 우리만의 생일 카드 그림과 새로운 축하 문구를 구상하고 싶어요.",
            "Palette",
          ],
          [
            "make",
            "제작하기",
            "색종이와 끈을 자르고 붙여, 파티 장식과 사진 촬영 소품을 직접 만들고 싶어요.",
            "Hammer",
          ],
          [
            "help",
            "돕기",
            "준비가 많이 남은 친구에게 필요한 일을 묻고, 간식과 접시를 함께 옮기고 싶어요.",
            "HeartHandshake",
          ],
          [
            "teach",
            "알려주기",
            "파티에서 함께 할 카드게임의 규칙을 익혀, 친구들에게 알려주는 역할을 맡고 싶어요.",
            "BookOpen",
          ],
        ],
      },
      {
        id: "birthday-after",
        summary: "파티가 끝나고, 파티룸을 나가기까지 시간이 조금 남았어요. 무엇을 하고 싶나요?",
        name: "파티 후, 시간이 조금 남았어요",
        location: "같은 파티룸 · 생일파티를 마친 뒤",
        room: "birthday",
        phase: "after",
        story:
          "함께 준비한 생일파티가 끝났어요. 케이크를 먹고 선물도 전했지만, 파티룸을 나가기까지 시간이 조금 남았어요. 친구들과 오늘을 어떻게 마무리하고 싶나요?",
        quote: "남은 시간에 내가 해보고 싶은 역할을 하나 골라 주세요.",
        actions: [
          "파티룸 앞에 뭐가 있는지 둘러보기",
          "축하 마음 표현하기",
          "남은 시간 기획하기",
          "혼자 있는 친구 챙기기",
          "친구들과 찍은 사진을 앨범에 모아 두기",
        ],
        options: [
          [
            "explore",
            "탐험하기",
            "파티룸 앞에 어떤 가게나 공간이 있는지 궁금해서, 잠깐 나가 둘러보고 싶어요.",
            "Compass",
          ],
          [
            "express",
            "표현하기",
            "친구에게 전하고 싶은 마음을 내 말과 몸짓으로 짧은 축하 영상에 담고 싶어요.",
            "Mic",
          ],
          [
            "plan",
            "기획하기",
            "친구들의 의견을 모아, 남은 시간에 할 활동과 순서를 짜보고 싶어요.",
            "NotebookPen",
          ],
          [
            "connect",
            "연결하기",
            "혼자 있는 친구에게 다가가 함께 대화할 수 있도록 자리를 만들어 주고 싶어요.",
            "Users",
          ],
          [
            "protect",
            "지키기",
            "친구들과 찍은 사진을 앨범에 모아, 함께한 추억을 오래 간직하고 싶어요.",
            "Shield",
          ],
        ],
      },
    ],
  },
  {
    id: "strength",
    number: "02",
    name: "나만의 강점",
    layer: "나의 강점",
    theme: "sage",
    icon: "Gem",
    english: "FIND YOUR INNER LIGHT",
    description: "평소의 나를 떠올리며, 숨은 빛을 발견해요.",
    prompt: "평소의 나를 떠올리면, 어떤 행동과 가장 가까운가요?",
    scenes: [
      {
        id: "tidy-before",
        summary: "가족과 거실을 정리하려고 해요. 나는 보통 무엇부터 하나요?",
        name: "주말에 거실을 정리해요",
        location: "우리 집 거실 · 정리를 시작할 때",
        room: "tidy",
        phase: "before",
        story:
          "주말 오후, 가족과 함께 거실을 정리하기로 했어요. 소파와 바닥에 책, 옷, 작은 물건들이 여기저기 놓여 있어요. 이럴 때 나는 보통 어떻게 하나요?",
        quote: "집에서 물건을 정리했던 때를 떠올리고, 평소의 나와 가까운 행동을 골라 주세요.",
        actions: [
          "작은 물건 발견하기",
          "자꾸 어질러지는 이유 생각하기",
          "새로운 정리 방법 떠올리기",
          "가족의 마음 헤아리기",
          "일단 하나부터 치우기",
        ],
        options: [
          [
            "observe",
            "관찰력",
            "소파 틈에 끼인 리모컨이나 바닥에 떨어진 작은 물건을 먼저 발견해요.",
            "ScanEye",
          ],
          [
            "analysis",
            "분석력",
            "물건이 자꾸 쌓이는 곳을 보고, 왜 그 자리가 늘 어질러지는지 생각해 봐요.",
            "Waypoints",
          ],
          [
            "creative",
            "창의력",
            "안 쓰는 상자를 나누어 쓰는 등, 집에 있는 물건으로 새롭게 정리할 방법을 떠올려요.",
            "Lightbulb",
          ],
          [
            "empathy",
            "공감력",
            "가족이 오래된 물건을 버리기 아쉬워하면, 어떤 추억이 있는지 이야기를 들어줘요.",
            "Heart",
          ],
          [
            "execute",
            "실행력",
            "어디부터 할지 오래 고민하기보다, 눈앞의 옷 한 벌이나 책 한 권부터 치우기 시작해요.",
            "Zap",
          ],
        ],
      },
      {
        id: "tidy-after",
        summary: "이제 물건을 제자리에 놓을 차례예요. 나는 어떤 일을 자연스럽게 하나요?",
        name: "물건마다 제자리를 찾아줘요",
        location: "같은 거실 · 정리를 마무리할 때",
        room: "tidy",
        phase: "after",
        story:
          "바닥이 조금씩 깨끗해졌어요. 이제 작은 물건을 담을 곳을 만들고, 책과 생활용품을 제자리에 넣으려고 해요. 나는 어떤 일을 자연스럽게 하나요?",
        quote: "정리를 끝내가는 상황에서, 내가 평소에 하는 행동과 가까운 것을 골라 주세요.",
        actions: [
          "수납 칸 만들기",
          "물건을 나누어 정리하기",
          "정리 방법 알려주기",
          "큰 상자 함께 옮기기",
          "남은 것까지 끝내기",
        ],
        options: [
          [
            "craft",
            "손재주",
            "빈 상자에 종이를 잘라 붙여, 작은 물건을 나누어 담을 수납 칸을 만들어요.",
            "Wrench",
          ],
          [
            "organize",
            "계획·정리",
            "물건을 종류별로 나누고, 자주 쓰는 것은 꺼내기 쉬운 자리에 놓아요.",
            "ListChecks",
          ],
          [
            "explain",
            "설명력",
            "충전선을 깔끔하게 감는 방법을 가족에게 직접 보여주며 쉽게 알려줘요.",
            "MessageCircle",
          ],
          [
            "cooperate",
            "협력",
            "혼자 들기 어려운 큰 상자는 가족과 양쪽을 잡고, 서로 속도를 맞춰 옮겨요.",
            "Handshake",
          ],
          [
            "persist",
            "끈기",
            "정리할 책과 물건이 아직 남아 있어도, 조금씩 이어가며 끝까지 마무리해요.",
            "Repeat2",
          ],
        ],
      },
    ],
  },
  {
    id: "aura",
    number: "03",
    name: "좋아하는 것",
    layer: "관심과 호기심",
    theme: "lavender",
    icon: "Sparkles",
    english: "LET YOUR CURIOSITY GLOW",
    description: "호기심이 머무는 곳에서, 나만의 빛이 피어나요.",
    prompt: "누가 시키지 않아도, 어떤 활동에 가장 마음이 가나요?",
    scenes: [
      {
        id: "break-before",
        summary: "친구들과 공원에서 잠깐 쉬기로 했어요. 나는 어떻게 쉬고 싶나요?",
        name: "공원에서 잠깐 쉬어가요",
        location: "집 근처 공원 · 느긋한 오후",
        room: "park",
        phase: "before",
        story:
          "쉬는 날 오후, 친구들과 집 근처 공원에 나왔어요. 잠시 각자 하고 싶은 것을 하며 쉬기로 했어요. 나는 어떻게 시간을 보내고 싶나요?",
        quote: "지금 가장 하고 싶은 활동을 하나 골라 주세요.",
        actions: [
          "친구랑 대화하기",
          "공원 벤치에 앉아 쉬기",
          "좋아하는 음악 듣기",
          "숫자 퍼즐 풀기",
          "웹툰이나 소설 읽기",
        ],
        options: [
          [
            "people",
            "사람과 마음",
            "친구랑 나란히 앉아, 요즘 있었던 일이나 재미있게 본 것에 대해 편하게 이야기하고 싶어요.",
            "Heart",
          ],
          [
            "nature",
            "자연과 생명",
            "공원 벤치에 앉아, 바람과 주변 풍경을 느끼며 쉬고 싶어요.",
            "Leaf",
          ],
          [
            "music",
            "음악과 소리",
            "이어폰을 끼고 좋아하는 노래를 들으며 쉬고 싶어요.",
            "Music2",
          ],
          [
            "numbers",
            "숫자와 규칙",
            "휴대전화로 숫자 퍼즐을 풀면서 빈칸을 하나씩 채워보고 싶어요.",
            "Shapes",
          ],
          [
            "story",
            "이야기와 상상",
            "읽던 웹툰이나 소설의 다음 이야기를 이어서 보고 싶어요.",
            "BookOpen",
          ],
        ],
      },
      {
        id: "break-after",
        summary: "집에 돌아와 저녁을 먹었어요. 잠들기 전 무엇을 하며 쉬고 싶나요?",
        name: "집에 돌아와 저녁을 보내요",
        location: "집 거실 · 공원에서 돌아온 저녁",
        room: "leisure",
        phase: "after",
        story:
          "공원에서 시간을 보내고 집에 돌아왔어요. 저녁을 먹고 나니 잠들기 전까지 여유가 있어요. 나는 무엇을 하며 쉬고 싶나요?",
        quote: "남은 저녁 시간에 가장 하고 싶은 활동을 하나 골라 주세요.",
        actions: [
          "새로 산 기기의 기능 둘러보기",
          "간식 만들어 먹기",
          "가볍게 몸 풀기",
          "사진 꾸미기",
          "게임하기",
        ],
        options: [
          [
            "tools",
            "기술과 도구",
            "새로 산 기기의 메뉴를 살펴보고, 여러 기능을 직접 눌러보고 싶어요.",
            "Cog",
          ],
          [
            "taste",
            "음식과 미각",
            "좋아하는 재료로 간단한 간식이나 음료를 만들어 먹고 싶어요.",
            "CookingPot",
          ],
          [
            "movement",
            "운동과 움직임",
            "좋아하는 노래를 틀어놓고, 가볍게 춤을 추거나 스트레칭을 하고 싶어요.",
            "Wind",
          ],
          [
            "art",
            "예술과 디자인",
            "오늘 찍은 사진에 마음에 드는 색과 스티커를 넣어 꾸미고 싶어요.",
            "Palette",
          ],
          [
            "play",
            "게임과 놀이",
            "친구와 함께하거나 혼자서 좋아하는 게임을 하며 놀고 싶어요.",
            "Dices",
          ],
        ],
      },
    ],
  },
];

export const emptyAnswers = () =>
  Object.fromEntries(chests.map((chest) => [chest.id, [null, null]]));

export function sanitizeAnswers(value) {
  const result = emptyAnswers();
  for (const chest of chests) {
    chest.scenes.forEach((scene, index) => {
      const candidate = value?.[chest.id]?.[index];
      if (scene.options.some((option) => option[0] === candidate))
        result[chest.id][index] = candidate;
    });
  }
  return result;
}

export function readProgress(storage) {
  try {
    return sanitizeAnswers(JSON.parse(storage.getItem(STORAGE_KEY)));
  } catch {
    return emptyAnswers();
  }
}

export function countAnswers(answers) {
  return chests.reduce(
    (total, chest) => total + answers[chest.id].filter(Boolean).length,
    0,
  );
}

export function selectedOptions(chest, answers) {
  return chest.scenes.flatMap((scene, index) => {
    const option = scene.options.find(
      (option) => option[0] === answers[chest.id][index],
    );
    return option
      ? [
          {
            id: option[0],
            label: option[1],
            action: actionCues[scene.id][scene.options.indexOf(option)],
            description: option[2],
            icon: option[3],
            treasure: treasures[option[0]],
            scene: scene.name,
            sceneIndex: index,
          },
        ]
      : [];
  });
}
