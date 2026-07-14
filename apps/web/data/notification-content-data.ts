import type {
  ArticleCardData,
  ArticleDetailContent,
  ArticleSectionData
} from "./article-content-types";

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

// Information 상세 본문은 이 객체에서 id 기준으로 자유롭게 수정할 수 있습니다.

export const NOTIFICATION_DETAIL_CONTENT: Record<string, ArticleDetailContent> = {
  "notice-latest": {
    lead:
      "최신 공지는 단일 문서에서 확인하되, 실제 운영 우선순위에 맞춰 읽을 수 있도록 시간·동선·예외 순서로 배치했습니다.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "시간 변동, 동선 변경, 우천 대응 등 가장 먼저 확인해야 할 공지 사항입니다.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 2분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 공지",
          "예상 읽기 시간: 2분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "확인 포인트",
        paragraphs: [
          "아래 항목만 우선 확인해도 대부분의 당일 혼선을 줄일 수 있습니다."
        ],
        bullets: [
          "공지 상단의 업데이트 시각을 먼저 확인해 주세요.",
          "동선 관련 변경은 현장 스태프 안내를 우선해 주세요.",
          "이동 중일 때는 최신 공지 1건만 빠르게 재확인해 주세요."
        ]
      }
    ],
    exploreLinks: []
  },
  "notice-entry": {
    lead:
      "입장 시 필요한 확인 절차와 도착 권장 시간을 간단히 확인해 주세요. 현장 대기 시간을 줄일 수 있는 순서로 안내를 구성했습니다.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "입장 시 필요한 확인 절차와 도착 권장 시간을 간단히 확인해 주세요.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 1분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 체크인",
          "예상 읽기 시간: 1분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "체크인 체크리스트",
        paragraphs: [
          "체크인 절차는 짧지만 현장 밀집 시간에는 대기 체감이 커질 수 있으므로 순서대로 확인해 주세요."
        ],
        bullets: [
          "도착 시간은 본식 시작 30~40분 전을 권장합니다.",
          "동행자와 체크인 위치를 먼저 맞춘 뒤 이동해 주세요.",
          "예외 상황은 현장 안내 데스크에서 바로 도움을 받을 수 있습니다."
        ]
      }
    ],
    exploreLinks: []
  },
  "notice-weather": {
    lead:
      "당일 기상 상황에 따라 야외/실내 동선 공지가 반영됩니다. 기상 공지는 짧게 먼저 갱신되고 이후 상세 항목이 순차 반영됩니다.",
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
    ],
    exploreLinks: []
  },
  "update-schedule": {
    lead:
      "교통 상황에 따라 웰컴/세레모니 시작 시간, 셔틀 출발 시간이 소폭 조정될 수 있습니다. 변경 시 즉시 반영됩니다.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "교통 상황에 따라 웰컴/세레모니 시작 시간, 셔틀 출발 시간이 소폭 조정될 수 있습니다. 변경 시 즉시 반영됩니다.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 2분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 타임라인",
          "예상 읽기 시간: 2분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "변경 확인 방법",
        paragraphs: [
          "시간 변경 공지는 본문 상단에서 먼저 갱신되며, 세부 일정은 뒤이어 반영됩니다."
        ],
        bullets: [
          "이동 전에 최신 업데이트 시각을 확인해 주세요.",
          "셔틀 이용 예정자는 출발 10분 전에 재확인해 주세요.",
          "현장 안내 시간표와 페이지 시간이 다르면 현장 기준을 우선해 주세요."
        ]
      }
    ],
    exploreLinks: []
  },
  "update-traffic": {
    lead:
      "예상 혼잡 시간은 16:30~17:10입니다. 이 구간에는 대중교통 또는 셔틀 이용을 권장합니다.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "예상 혼잡 시간은 16:30~17:10입니다. 이 구간에는 대중교통 또는 셔틀 이용을 권장합니다.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 2분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 교통",
          "예상 읽기 시간: 2분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "이동 전략",
        paragraphs: [
          "혼잡 시간대에는 차량 진입보다 대중교통/셔틀이 도착 시각 예측이 더 안정적입니다."
        ],
        bullets: [
          "혼잡 시간 전후 20분은 대기 시간이 길어질 수 있습니다.",
          "차량 이용 시 동행자 하차 지점을 먼저 공유해 주세요.",
          "지연이 예상되면 일정 변경 공지를 함께 확인해 주세요."
        ]
      }
    ],
    exploreLinks: []
  },
  "update-parking": {
    lead:
      "현장 주차가 만차일 경우 인근 대체 주차 안내와 도보 이동 경로를 순차적으로 제공할 예정입니다.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "현장 주차가 만차일 경우 인근 대체 주차 안내와 도보 이동 경로를 순차적으로 제공할 예정입니다.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 2분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 주차",
          "예상 읽기 시간: 2분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "만차 대응 절차",
        paragraphs: [
          "현장 주차 만차 시에는 대체 주차장 위치와 도보 동선이 순서대로 공지됩니다."
        ],
        bullets: [
          "대체 주차 안내는 공지 상단에서 먼저 확인해 주세요.",
          "도보 이동 시 우선 동선 표지와 스태프 안내를 따라 주세요.",
          "노약자 동행 시 하차 우선 구역을 먼저 요청해 주세요."
        ]
      }
    ],
    exploreLinks: []
  },
  "checklist-rsvp": {
    lead:
      "참석/불참, 애프터 참석 여부, 주소 정보가 최신인지 한 번 더 확인해 주세요. 변경이 있으면 즉시 갱신 가능합니다.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "참석/불참, 애프터 참석 여부, 주소 정보가 최신인지 한 번 더 확인해 주세요. 변경이 있으면 즉시 갱신 가능합니다.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 1분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 참석회신",
          "예상 읽기 시간: 1분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "확인 체크리스트",
        paragraphs: [
          "RSVP 정보가 최신이면 좌석/동선/안내 품질이 함께 안정됩니다."
        ],
        bullets: [
          "참석 인원과 동행자 정보를 최종 확인해 주세요.",
          "애프터 참석 여부를 포함해 상태를 맞춰 주세요.",
          "변경이 생기면 가능한 빠르게 수정해 주세요."
        ]
      }
    ],
    exploreLinks: []
  },
  "checklist-dress": {
    lead:
      "화이트/아이보리/그린 포인트 중 한 가지를 추천드립니다. 야외 동선을 고려해 편한 신발도 함께 준비해 주세요.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "화이트/아이보리/그린 포인트 중 한 가지를 추천드립니다. 야외 동선을 고려해 편한 신발도 함께 준비해 주세요.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 2분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 복장",
          "예상 읽기 시간: 2분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "준비 포인트",
        paragraphs: [
          "복장은 사진 톤과 이동 편의성을 함께 고려하면 가장 만족도가 높습니다."
        ],
        bullets: [
          "포인트 컬러 1가지를 중심으로 톤을 맞춰 주세요.",
          "야외 동선이 있어 보행 가능한 신발을 권장합니다.",
          "기온 변화가 큰 경우 얇은 겉옷을 함께 준비해 주세요."
        ]
      }
    ],
    exploreLinks: []
  },
  "checklist-camera": {
    lead:
      "중앙 동선을 장시간 점유하지 않도록 부탁드립니다. 플래시 사용은 최소화하면 더 좋은 결과물을 남길 수 있습니다.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "중앙 동선을 장시간 점유하지 않도록 부탁드립니다. 플래시 사용은 최소화하면 더 좋은 결과물을 남길 수 있습니다.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 1분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 촬영",
          "예상 읽기 시간: 1분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "촬영 매너",
        paragraphs: [
          "촬영은 분위기를 해치지 않는 범위에서 자유롭게 즐겨 주세요."
        ],
        bullets: [
          "메인 동선 앞 장시간 정지는 피해 주세요.",
          "플래시는 순간 장면에서만 짧게 사용해 주세요.",
          "촬영 후에는 다음 하객 이동을 위해 자리 정리를 부탁드립니다."
        ]
      }
    ],
    exploreLinks: []
  },
  "faq-kids": {
    lead:
      "아이와 함께 참석하실 수 있습니다. 좌석과 이동 동선 준비를 위해 RSVP 인원에 포함해 미리 알려주시면 더욱 편하게 안내해 드립니다.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "가능합니다. 다만 좌석/동선 준비를 위해 RSVP 인원에 포함해서 미리 알려주시면 더 편안하게 준비하겠습니다.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 1분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 문의",
          "예상 읽기 시간: 1분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "동행 안내",
        paragraphs: [
          "아이 동반 시에는 좌석 위치와 이동 편의성을 함께 고려해 안내를 준비합니다."
        ],
        bullets: [
          "아이 포함 인원수를 RSVP에 반영해 주세요.",
          "유모차 이용 여부를 미리 알려주시면 동선 안내가 쉬워집니다.",
          "현장에서 도움이 필요하면 스태프에게 바로 요청해 주세요."
        ]
      }
    ],
    exploreLinks: []
  },
  "faq-late": {
    lead:
      "본식 중간 입장은 현장 스태프가 안내합니다. 식장 내부 소음을 최소화하기 위해 지정 동선으로 이동 부탁드립니다.",
    blocks: [
      {
        heading: "핵심 요약",
        paragraphs: [
          "본식 중간 입장은 현장 스태프가 안내합니다. 식장 내부 소음을 최소화하기 위해 지정 동선으로 이동 부탁드립니다.",
          "당일 변동사항을 빠르게 반영할 수 있도록 우선순위 중심으로 핵심 정보만 배치했습니다.",
          "이 항목은 1분 내에 확인할 수 있도록 구성했습니다."
        ],
        bullets: [
          "분류: 문의",
          "예상 읽기 시간: 1분",
          "대상: 공지 확인이 필요한 전체 하객"
        ]
      },
      {
        heading: "늦은 도착 시 안내",
        paragraphs: [
          "늦은 도착은 자연스러운 상황이므로, 안내 인력 지시에 맞춰 안전하게 입장해 주세요."
        ],
        bullets: [
          "입장 전 현재 진행 순서를 스태프에게 확인해 주세요.",
          "지정된 사이드 동선으로 조용히 이동해 주세요.",
          "촬영/좌석 문의는 입장 후 안내 데스크에서 도와드립니다."
        ]
      }
    ],
    exploreLinks: []
  },
  "faq-contact": {
    lead:
      "당일 연락처와 운영 담당 알림은 초대장 하단과 관리자 공지로 동일하게 안내됩니다. 필요 시 즉시 연락 주세요.",
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
    ],
    exploreLinks: []
  }
};
