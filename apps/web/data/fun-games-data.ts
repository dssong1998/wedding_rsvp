/**
 * fun 페이지 미니게임 데이터.
 * 이 파일만 수정하면 fun 페이지의 O/X 퀴즈와 밸런스 게임 내용이 바뀝니다.
 * (수정 후 fun 페이지를 새로고침하면 반영됩니다.)
 */

export type QuizQuestion = {
  /** O/X 문항 내용 */
  question: string;
  /** 정답이 'O'(맞다)이면 true, 'X'(아니다)이면 false */
  answer: boolean;
  /** 정답 공개 시 함께 보여줄 부연 설명 */
  detail: string;
};

/** 밸런스 게임에서 각 선택지가 대석/다인 중 누구의 성향인지 */
export type BalanceSide = 'dae' | 'dain';

export type BalanceChoice = {
  /** 선택지 문구 */
  text: string;
  /** 이 선택지를 고르면 누구의 타입에 가까운지 */
  side: BalanceSide;
};

export type BalanceQuestion = {
  /** 밸런스 질문 */
  question: string;
  /** 선택지 두 개 (왼쪽, 오른쪽) */
  choices: [BalanceChoice, BalanceChoice];
};

export type WeddingWordleWord = {
  /** 정답 한글 단어. 플레이 시 자모(초성·중성·종성)로 분절됩니다. */
  answer: string;
  /** 세 번째 오답부터 표시할 힌트 */
  hint: string;
};

/**
 * O/X 퀴즈 문항 풀.
 * 아무리 많이 추가해도 게임 시작 시 이 중 랜덤 5문항만 노출됩니다.
 */
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question: '대석과 다인의 결혼식은 2026년 8월 22일이다.',
    answer: true,
    detail: '맞아요! 2026년 8월 22일 토요일입니다.',
  },
  {
    question: '결혼식은 일요일 낮 12시에 시작한다.',
    answer: false,
    detail: '아니에요. 토요일 오후 5시에 시작합니다.',
  },
  {
    question: '두 사람이 처음 만난건 2024년이다.',
    answer: true,
    detail: '맞아요. 두 사람은 24년에 회사 신입사원 교육에서 처음 만났어요.',
  },
  {
    question: '두 사람은 처음 만난 날 함께 소주를 마셨다.',
    answer: true,
    detail:
      '맞아요. 첫날부터 그랬듯 여전히 맛있는 음식에 술을 먹는 것이 두 사람이 가장 좋아하는 취미에요',
  },
  {
    question: '두 사람의 첫번째 여행지는 일본 후쿠오카이다.',
    answer: false,
    detail: '아니에요. 두 사람은 제주도로 첫 여행을 떠났어요.',
  },
  {
    question: '대석과 다인은 함께 탁구를 친다.',
    answer: false,
    detail: '아니에요. 둘은 25년부터 꾸준히 함께 테니스를 치고 있답니다.',
  },
  {
    question: '다인은 초록색, 대석은 파란색 잠옷을 입는다.',
    answer: true,
    detail: '아니에요. 대석의 잠옷이 초록색, 다인의 잠옷이 파란색입니다.',
  },
  {
    question: '결혼식에서 대석은 다인의 드레스입은 모습을 처음 본다.',
    answer: true,
    detail:
      '맞아요. 대석은 다인이 고른 드레스와, 드레스 입은 모습을 전혀 모른 채 결혼식에 참석합니다.',
  },
  {
    question: '다인과 대석의 최애 음식은 떡볶이이다.',
    answer: false,
    detail: '아니에요. 두 사람은 치킨을 가장 좋아한답니다. 닭들아 미안해...',
  },
  {
    question: '다인과 대석은 결혼식 다음날 포루투갈로 신혼여행을 간다.',
    answer: false,
    detail:
      '아니에요. 두 사람은 지난 2월 포루투갈에서 미리 신혼여행을 즐기며 웨딩사진을 찍고 왔어요.',
  },
];

/** 게임 시작 시 노출할 퀴즈 문항 수 */
export const QUIZ_ROUND_SIZE = 5;

/** 결혼 밸런스 게임 문항 */
export const BALANCE_QUESTIONS: BalanceQuestion[] = [
  {
    question: '완벽한 신혼여행은?',
    choices: [
      { text: '계획 없이 편안하게 쉬는 휴양지 여행', side: 'dain' },
      { text: '도시의 문화와 사는 방식을 경험하는 도시 여행', side: 'dae' },
    ],
  },
  {
    question: '최고의 결혼기념일을 보내는 방법은?',
    choices: [
      { text: '맛있는 음식을 먹고 함께 추억을 남기는 데이트', side: 'dae' },
      { text: '한적한 공간에서 전하는 마음이 담긴 손편지', side: 'dain' },
    ],
  },
  {
    question: '유난히 지치는 날 배우자가 해주길 바라는 것은?',
    choices: [
      { text: '함께 나가서 산책하기', side: 'dae' },
      { text: '달달한 빵 사주기', side: 'dain' },
    ],
  },
  {
    question: '육아와 교육에 대한 가치관은?',
    choices: [
      { text: '좋아하는 것는 찾을 수 있게 길잡이의 역할을 하기', side: 'dain' },
      {
        text: '원하는 것을 직접 해보고 스스로 느낄 수 있도록 자유를 주기',
        side: 'dae',
      },
    ],
  },
  {
    question: '이상적인 가족은?',
    choices: [
      { text: '늘 무엇이든 함께하고 끈끈하게 연결되어있는 가족', side: 'dain' },
      {
        text: '구성원 모두가 각자의 자리에서 성취를 이루고있는 가족',
        side: 'dae',
      },
    ],
  },
];

/**
 * 웨딩 꼬들 정답 풀.
 * 게임을 시작할 때 아래 단어 중 하나가 무작위로 선택됩니다.
 * 입력한 한글은 자음·모음(자모)으로 분절되어 판정됩니다.
 * 예: "사랑" → ㅅㅏㄹㅏㅇ (5칸)
 */
export const WEDDING_WORDLE_WORDS: WeddingWordleWord[] = [
  { answer: '결혼', hint: '두 사람의 여정의 시작' },
  { answer: '여름', hint: '두 사람이 만나고 결혼하는 계절' },
  { answer: '사랑', hint: '사람에게 가장 중요한 것' },
  { answer: '반지', hint: '서로의 손에 끼워주는 약속의 상징' },
  { answer: '가족', hint: '두 사람이 만나 이루게 된 새로운 집단' },
  { answer: '신랑', hint: '오늘 결혼식의 주인공' },
  { answer: '신부', hint: '오늘 결혼식의 주인공' },
  { answer: '행진', hint: '결혼식의 하이라이트' },
  { answer: '뷔페', hint: '결혼식의 식사 제공 방식' },
  { answer: '빵', hint: '신부가 사랑하는 것' },
  { answer: '청혼', hint: '결혼을 하자고 말하는 것' },
];

export type FunGamesData = {
  quizQuestions: QuizQuestion[];
  quizRoundSize: number;
  balanceQuestions: BalanceQuestion[];
  wordleWords: WeddingWordleWord[];
};

export function getFunGamesData(): FunGamesData {
  return {
    quizQuestions: QUIZ_QUESTIONS,
    quizRoundSize: QUIZ_ROUND_SIZE,
    balanceQuestions: BALANCE_QUESTIONS,
    wordleWords: WEDDING_WORDLE_WORDS,
  };
}
