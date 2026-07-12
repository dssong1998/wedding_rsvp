export type ArticlePageKind = "information" | "notification";

export type ArticleCardData = {
  id: string;
  title: string;
  summary: string;
  image: string;
  tag: string;
  reading: string;
  href: string;
};

export type ArticleSectionData = {
  id: string;
  label: string;
  title: string;
  description: string;
  articles: ArticleCardData[];
};

export type ArticleDetailBlock = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  quote?: string;
};

export type ArticleLink = {
  label: string;
  href: string;
};

export type ArticleDetailData = {
  id: string;
  page: ArticlePageKind;
  title: string;
  summary: string;
  image: string;
  tag: string;
  reading: string;
  author: string;
  publishedOn: string;
  lead: string;
  blocks: ArticleDetailBlock[];
  exploreLinks: ArticleLink[];
};

type ArticleDetailOverride = Partial<
  Omit<
    ArticleDetailData,
    "id" | "page" | "title" | "summary" | "image" | "tag" | "reading"
  >
>;

const DEFAULT_AUTHOR = "다인 · 대석 웨딩팀";
const DEFAULT_PUBLISHED_AT = "2026.07.11 업데이트";

function uniqueArticles(
  featured: ArticleCardData[],
  sections: ArticleSectionData[]
): ArticleCardData[] {
  const byId = new Map<string, ArticleCardData>();
  for (const article of featured) {
    byId.set(article.id, article);
  }
  for (const section of sections) {
    for (const article of section.articles) {
      if (!byId.has(article.id)) {
        byId.set(article.id, article);
      }
    }
  }
  return Array.from(byId.values());
}

function createDefaultBlocks(
  page: ArticlePageKind,
  article: ArticleCardData
): ArticleDetailBlock[] {
  const isInformationPage = page === "information";
  const contextLine = isInformationPage
    ? "하객이 현장에서 길을 잃지 않도록 이동 순서와 확인 지점을 짧은 문단으로 압축했습니다."
    : "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.";

  const checklist = isInformationPage
    ? [
        "이동 전에 동행자와 도착 시각을 한 번 더 맞춰 주세요.",
        "현장 안내 인력의 동선 안내를 우선으로 따라 주세요.",
        "변경 공지는 공지 페이지에서 최신 순서로 확인해 주세요."
      ]
    : [
        "알림 업데이트 시간을 먼저 확인해 최신 상태인지 확인해 주세요.",
        "현장 공지와 페이지 공지가 다른 경우 현장 안내를 우선해 주세요.",
        "즉시 대응이 필요한 경우 관리자 공지 채널을 확인해 주세요."
      ];

  return [
    {
      heading: "핵심 요약",
      paragraphs: [
        article.summary,
        contextLine,
        `이 항목은 ${article.reading} 내에 확인할 수 있도록 구성했습니다.`
      ],
      bullets: [
        `분류: ${article.tag}`,
        `예상 읽기 시간: ${article.reading}`,
        isInformationPage ? "대상: 결혼식 하객" : "대상: 공지 확인이 필요한 전체 하객"
      ]
    },
    {
      heading: "현장 적용 가이드",
      paragraphs: [
        "안내 문구를 그대로 따라가기보다, 현재 위치와 시간대에 맞춰 필요한 정보부터 우선 적용하는 방식이 가장 효율적입니다.",
        "특히 이동·체크인·촬영처럼 시간 민감도가 높은 항목은 동행자와 동일한 기준으로 맞춰 두면 현장에서의 재확인이 크게 줄어듭니다."
      ],
      quote:
        "좋은 안내는 읽는 시간이 아니라, 실제 이동 시간을 줄여주는 방식으로 동작해야 합니다."
    },
    {
      heading: "체크 포인트",
      paragraphs: [
        "아래 항목만 먼저 확인해도 대부분의 현장 혼선을 예방할 수 있습니다."
      ],
      bullets: checklist
    }
  ];
}

function buildDetails(
  page: ArticlePageKind,
  articles: ArticleCardData[],
  overrides: Record<string, ArticleDetailOverride>
): Record<string, ArticleDetailData> {
  return Object.fromEntries(
    articles.map((article) => {
      const override = overrides[article.id];
      const detail: ArticleDetailData = {
        id: article.id,
        page,
        title: article.title,
        summary: article.summary,
        image: article.image,
        tag: article.tag,
        reading: article.reading,
        author: override?.author ?? DEFAULT_AUTHOR,
        publishedOn: override?.publishedOn ?? DEFAULT_PUBLISHED_AT,
        lead:
          override?.lead ??
          `${article.summary} 이 페이지에서는 참고 디자인의 아티클 문법을 따르되, 실제 결혼식 현장에서 바로 적용할 수 있는 형태로 정보를 재구성했습니다.`,
        blocks: override?.blocks ?? createDefaultBlocks(page, article),
        exploreLinks: override?.exploreLinks ?? []
      };
      return [article.id, detail];
    })
  );
}

export const INFORMATION_FEATURED_ARTICLES: ArticleCardData[] = [
  {
    id: "venue",
    title: "오시는 길",
    summary: "장소, 셔틀버스 등 오시는 길에 대한 상세한 정보를 확인하세요.",
    image: "/assets/images/gallery/pic-12.jpg",
    tag: "길찾기",
    reading: "2분",
    href: "/information/venue"
  },
  {
    id: "countdown",
    title: "타임라인",
    summary: "당일 예식 시간표를 확인하세요.",
    image: "/assets/images/gallery/pic-5.jpg",
    tag: "일정",
    reading: "3분",
    href: "/information/countdown"
  },
  {
    id: "guide",
    title: "가이드",
    summary: "웨딩파티를 즐기기 위한 가이드를 확인하세요.",
    image: "/assets/images/gallery/pic-18.jpg",
    tag: "스타일",
    reading: "4분",
    href: "/information/dress"
  }
];

export const INFORMATION_SECTIONS: ArticleSectionData[] = [
  {
    id: "arrival",
    label: "도착 안내",
    title: "오시는 길 & 동선 안내",
    description: "하객 이동 동선이 끊기지 않도록 가장 많이 묻는 순서대로 정리했습니다.",
    articles: [
      {
        id: "arrival-map",
        title: "네이버 지도 / 앱 바로 열기",
        summary:
          "링크 클릭 시 네이버 지도 웹과 앱으로 바로 이동할 수 있도록 구성되어 있습니다. 주소 복사 없이 길찾기가 가능합니다.",
        image: "/assets/images/gallery/pic-9.jpg",
        tag: "길찾기",
        reading: "2분",
        href: "/information/arrival-map"
      },
      {
        id: "arrival-shuttle",
        title: "셔틀 탑승 구간별 안내",
        summary:
          "양재역 출발과 귀가 셔틀 시간표를 분리해 배치했습니다. 출발 10분 전 도착을 권장합니다.",
        image: "/assets/images/gallery/pic-20.jpg",
        tag: "셔틀",
        reading: "3분",
        href: "/information/arrival-shuttle"
      },
      {
        id: "arrival-parking",
        title: "주차 및 하차 구간",
        summary:
          "혼잡 시간을 피할 수 있는 차량 진입 시간을 안내하고, 노약자 우선 하차 구역을 별도로 표기했습니다.",
        image: "/assets/images/gallery/pic-27.jpg",
        tag: "주차",
        reading: "2분",
        href: "/information/arrival-parking"
      }
    ]
  },
  {
    id: "event",
    label: "행사 안내",
    title: "예식 & 애프터파티 안내",
    description: "본식과 애프터파티를 포함한 일정 흐름을 아티클 단위로 볼 수 있습니다.",
    articles: [
      {
        id: "event-main",
        title: "본식 진행 순서 안내",
        summary:
        "식 시작 전 웰컴드링크부터 메인 세레모니, 저녁 식사까지 시간대별로 명확하게 확인할 수 있습니다.",
        image: "/assets/images/gallery/pic-31.jpg",
        tag: "본식",
        reading: "4분",
        href: "/information/event-main"
      },
      {
        id: "event-after",
        title: "애프터파티 참여 가이드",
        summary:
          "애프터는 19:00~21:00에 운영되며, 자유 좌석 중심으로 가볍게 대화하고 사진을 나누는 구성입니다.",
        image: "/assets/images/gallery/pic-36.jpg",
        tag: "애프터파티",
        reading: "3분",
        href: "/information/event-after"
      },
      {
        id: "event-camera",
        title: "촬영 매너와 공유 방식",
        summary:
          "플래시와 동선만 배려해 주시면 휴대폰/필름 모두 환영합니다. 촬영본은 애프터에서 공유해 주세요.",
        image: "/assets/images/gallery/pic-41.jpg",
        tag: "촬영",
        reading: "2분",
        href: "/information/event-camera"
      }
    ]
  },
  {
    id: "prepare",
    label: "준비 안내",
    title: "준비물 & 참고 안내",
    description: "복장, 우천 시 운영, 축의금 계좌 등 실질적으로 필요한 정보만 묶었습니다.",
    articles: [
      {
        id: "prepare-dress",
        title: "드레스코드 상세 가이드",
        summary:
          "화이트/아이보리/그린 포인트를 기준으로 톤온톤 매치를 추천합니다. 사진 톤을 위해 강한 네온 컬러는 피해주세요.",
        image: "/assets/images/gallery/pic-14.jpg",
        tag: "드레스코드",
        reading: "3분",
        href: "/information/prepare-dress"
      },
      {
        id: "prepare-rain",
        title: "우천 시 운영 플랜",
        summary:
          "비가 와도 예식은 예정대로 진행되며, 야외 동선은 실내 우선 동선으로 즉시 전환됩니다.",
        image: "/assets/images/gallery/pic-25.jpg",
        tag: "우천 계획",
        reading: "2분",
        href: "/information/prepare-rain"
      },
      {
        id: "prepare-gift",
        title: "축의금 계좌 안내",
        summary:
          "신랑/신부측 계좌를 분리해 표기하고, 모바일에서 즉시 복사할 수 있도록 안내되어 있습니다.",
        image: "/assets/images/gallery/pic-34.jpg",
        tag: "계좌",
        reading: "1분",
        href: "/information/prepare-gift"
      }
    ]
  }
];

export const NOTIFICATION_FEATURED_ARTICLES: ArticleCardData[] = [
  {
    id: "notice-latest",
    title: "최신 공지: 예식 당일 운영 업데이트",
    summary: "시간 변동, 동선 변경, 우천 대응 등 가장 먼저 확인해야 할 공지 사항입니다.",
    image: "/assets/images/gallery/pic-7.jpg",
    tag: "공지",
    reading: "2분",
    href: "/notification/notice-latest"
  },
  {
    id: "notice-entry",
    title: "체크인 안내",
    summary: "입장 시 필요한 확인 절차와 도착 권장 시간을 간단히 확인해 주세요.",
    image: "/assets/images/gallery/pic-16.jpg",
    tag: "체크인",
    reading: "1분",
    href: "/notification/notice-entry"
  },
  {
    id: "notice-weather",
    title: "날씨 알림",
    summary: "당일 기상 상황에 따라 야외/실내 동선 공지가 반영됩니다.",
    image: "/assets/images/gallery/pic-22.jpg",
    tag: "날씨",
    reading: "1분",
    href: "/notification/notice-weather"
  }
];

export const NOTIFICATION_SECTIONS: ArticleSectionData[] = [
  {
    id: "updates",
    label: "업데이트",
    title: "실시간 업데이트",
    description: "행사 전후로 가장 자주 바뀌는 안내를 빠르게 확인할 수 있습니다.",
    articles: [
      {
        id: "update-schedule",
        title: "타임라인 변경 공지",
        summary:
          "교통 상황에 따라 웰컴/세레모니 시작 시간, 셔틀 출발 시간이 소폭 조정될 수 있습니다. 변경 시 즉시 반영됩니다.",
        image: "/assets/images/gallery/pic-28.jpg",
        tag: "타임라인",
        reading: "2분",
        href: "/notification/update-schedule"
      },
      {
        id: "update-traffic",
        title: "혼잡 시간대 교통 안내",
        summary:
          "예상 혼잡 시간은 16:30~17:10입니다. 이 구간에는 대중교통 또는 셔틀 이용을 권장합니다.",
        image: "/assets/images/gallery/pic-33.jpg",
        tag: "교통",
        reading: "2분",
        href: "/notification/update-traffic"
      },
      {
        id: "update-parking",
        title: "주차 만차 시 대체 안내",
        summary:
          "현장 주차가 만차일 경우 인근 대체 주차 안내와 도보 이동 경로를 순차적으로 제공할 예정입니다.",
        image: "/assets/images/gallery/pic-38.jpg",
        tag: "주차",
        reading: "2분",
        href: "/notification/update-parking"
      }
    ]
  },
  {
    id: "checklist",
    label: "체크리스트",
    title: "하객 체크리스트",
    description: "당일에 헷갈리지 않도록 꼭 필요한 항목만 압축했습니다.",
    articles: [
      {
        id: "checklist-rsvp",
        title: "RSVP 최종 확인",
        summary:
          "참석/불참, 애프터 참석 여부, 주소 정보가 최신인지 한 번 더 확인해 주세요. 변경이 있으면 즉시 갱신 가능합니다.",
        image: "/assets/images/gallery/pic-11.jpg",
        tag: "참석회신",
        reading: "1분",
        href: "/notification/checklist-rsvp"
      },
      {
        id: "checklist-dress",
        title: "드레스코드 체크",
        summary:
          "화이트/아이보리/그린 포인트 중 한 가지를 추천드립니다. 야외 동선을 고려해 편한 신발도 함께 준비해 주세요.",
        image: "/assets/images/gallery/pic-19.jpg",
        tag: "복장",
        reading: "2분",
        href: "/notification/checklist-dress"
      },
      {
        id: "checklist-camera",
        title: "촬영 전 확인 사항",
        summary:
          "중앙 동선을 장시간 점유하지 않도록 부탁드립니다. 플래시 사용은 최소화하면 더 좋은 결과물을 남길 수 있습니다.",
        image: "/assets/images/gallery/pic-24.jpg",
        tag: "촬영",
        reading: "1분",
        href: "/notification/checklist-camera"
      }
    ]
  },
  {
    id: "faq",
    label: "자주 묻는 질문",
    title: "자주 묻는 질문",
    description: "알림 페이지에서 반복적으로 문의되는 질문을 아티클 형식으로 묶었습니다.",
    articles: [
      {
        id: "faq-kids",
        title: "아이와 함께 참석 가능한가요?",
        summary:
          "가능합니다. 다만 좌석/동선 준비를 위해 RSVP 인원에 포함해서 미리 알려주시면 더 편안하게 준비하겠습니다.",
        image: "/assets/images/gallery/pic-30.jpg",
        tag: "문의",
        reading: "1분",
        href: "/notification/faq-kids"
      },
      {
        id: "faq-late",
        title: "늦게 도착하면 어떻게 되나요?",
        summary:
          "본식 중간 입장은 현장 스태프가 안내합니다. 식장 내부 소음을 최소화하기 위해 지정 동선으로 이동 부탁드립니다.",
        image: "/assets/images/gallery/pic-35.jpg",
        tag: "문의",
        reading: "1분",
        href: "/notification/faq-late"
      },
      {
        id: "faq-contact",
        title: "당일 문의는 어디로 하면 되나요?",
        summary:
          "당일 연락처와 운영 담당 알림은 초대장 하단과 관리자 공지로 동일하게 안내됩니다. 필요 시 즉시 연락 주세요.",
        image: "/assets/images/gallery/pic-43.jpg",
        tag: "문의",
        reading: "1분",
        href: "/notification/faq-contact"
      }
    ]
  }
];

const informationOverrides: Record<string, ArticleDetailOverride> = {
  "arrival-map": {
    lead:
      "지도 링크는 주소 복사 단계를 없애기 위해 준비했습니다. 현장에서 바로 앱으로 열 수 있도록 외부 링크를 함께 제공합니다.",
    exploreLinks: [{ label: "네이버 지도 바로 열기", href: "https://naver.me/GYCqKhaF" }]
  },
  "prepare-gift": {
    blocks: [
      {
        heading: "안내 원칙",
        paragraphs: [
          "축의금 계좌 정보는 필요한 경우에만 확인할 수 있도록 최소한의 문맥으로 안내합니다.",
          "현장에서의 혼선을 줄이기 위해 신랑측/신부측 계좌를 분리 표기하고, 모바일 복사를 우선 흐름으로 구성합니다."
        ],
        bullets: [
          "계좌 표기 시 소유주명을 함께 확인해 주세요.",
          "송금 전 오탈자를 반드시 확인해 주세요.",
          "문의가 필요한 경우 현장 운영진에게 바로 요청해 주세요."
        ]
      },
      {
        heading: "모바일 사용 가이드",
        paragraphs: [
          "휴대폰에서는 계좌 번호를 길게 눌러 복사한 뒤, 뱅킹 앱에서 바로 붙여 넣는 동선이 가장 빠릅니다.",
          "연결 지연이 있는 환경에서도 복사-붙여넣기 방식은 안정적으로 동작합니다."
        ],
        quote:
          "복잡한 설명보다, 2번 이하의 터치로 완료되는 흐름이 실제 현장에서 가장 안전합니다."
      }
    ]
  },
  countdown: {
    blocks: [
      {
        heading: "당일 시간축",
        paragraphs: [
          "디데이 카운트와 본식 타임라인은 하객의 도착 시점 판단에 직접적으로 사용됩니다.",
          "예식 시작 직전에는 현장 체크인 대기 시간이 늘어날 수 있으므로, 권장 도착 시각을 기준으로 이동하는 것을 권장합니다."
        ],
        bullets: [
          "권장 도착: 본식 시작 40분 전",
          "체크인 여유: 최소 10분",
          "애프터 입장: 본식 종료 후 안내에 따라 이동"
        ]
      },
      {
        heading: "지연 상황 대응",
        paragraphs: [
          "교통·기상 변수로 이동이 늦어질 경우 공지 페이지의 최신 업데이트를 우선 확인해 주세요.",
          "시간 변경이 확정되면 타임라인과 공지가 동시에 갱신되도록 운영합니다."
        ]
      }
    ]
  }
};

const notificationOverrides: Record<string, ArticleDetailOverride> = {
  "notice-weather": {
    blocks: [
      {
        heading: "기상 대응 기준",
        paragraphs: [
          "당일 기상 상황은 이동 동선, 야외/실내 체류 시간, 촬영 포인트 운영 방식에 직접 영향을 줍니다.",
          "우천 또는 강풍 예보가 있을 경우 실내 우선 동선으로 빠르게 전환됩니다."
        ],
        bullets: [
          "우산/겉옷은 이동 구간 기준으로 준비해 주세요.",
          "현장 안내 표지와 스태프 지시를 우선해 주세요.",
          "외부 촬영은 시간대별로 유동 조정될 수 있습니다."
        ]
      },
      {
        heading: "실시간 공지 확인법",
        paragraphs: [
          "기상 관련 공지는 짧은 문장으로 먼저 반영되고, 이후 상세 항목이 순차 업데이트됩니다.",
          "같은 항목이라도 최신 시각 기준으로 다시 확인해 주세요."
        ]
      }
    ]
  },
  "notice-latest": {
    lead:
      "최신 공지는 단일 문서에서 확인하되, 실제 운영 우선순위에 맞춰 읽을 수 있도록 시간·동선·예외 순서로 배치했습니다."
  },
  "faq-contact": {
    blocks: [
      {
        heading: "당일 문의 채널",
        paragraphs: [
          "긴급 문의와 일반 문의를 구분하면 응답 속도가 크게 개선됩니다.",
          "현장 문의는 위치와 상황을 먼저 전달하면 안내 시간이 짧아집니다."
        ],
        bullets: [
          "현재 위치(예: 주차장 입구, 로비, 셔틀 승하차장)",
          "문의 유형(도착 지연, 좌석, 촬영, 동행자)",
          "필요한 응답 시간(즉시/여유)"
        ]
      },
      {
        heading: "응답 품질을 높이는 방식",
        paragraphs: [
          "질문을 한 번에 정리해 전달하면 중복 안내를 줄일 수 있습니다.",
          "동일 문의가 반복되는 경우 공지 페이지에 즉시 반영해 전체 하객이 함께 확인할 수 있도록 운영합니다."
        ]
      }
    ]
  }
};

const INFORMATION_ALL_ARTICLES = uniqueArticles(
  INFORMATION_FEATURED_ARTICLES,
  INFORMATION_SECTIONS
);
const NOTIFICATION_ALL_ARTICLES = uniqueArticles(
  NOTIFICATION_FEATURED_ARTICLES,
  NOTIFICATION_SECTIONS
);

const INFORMATION_DETAILS = buildDetails(
  "information",
  INFORMATION_ALL_ARTICLES,
  informationOverrides
);
const NOTIFICATION_DETAILS = buildDetails(
  "notification",
  NOTIFICATION_ALL_ARTICLES,
  notificationOverrides
);

export function getInformationArticleOrder(): string[] {
  return INFORMATION_ALL_ARTICLES.map((article) => article.id);
}

export function getNotificationArticleOrder(): string[] {
  return NOTIFICATION_ALL_ARTICLES.map((article) => article.id);
}

export function getInformationArticleDetail(
  articleId: string
): ArticleDetailData | undefined {
  return INFORMATION_DETAILS[articleId];
}

export function getNotificationArticleDetail(
  articleId: string
): ArticleDetailData | undefined {
  return NOTIFICATION_DETAILS[articleId];
}

export function getInformationRelatedArticles(
  currentArticleId: string,
  limit = 3
): ArticleCardData[] {
  return INFORMATION_ALL_ARTICLES.filter((article) => article.id !== currentArticleId).slice(
    0,
    limit
  );
}

export function getNotificationRelatedArticles(
  currentArticleId: string,
  limit = 3
): ArticleCardData[] {
  return NOTIFICATION_ALL_ARTICLES.filter((article) => article.id !== currentArticleId).slice(
    0,
    limit
  );
}
