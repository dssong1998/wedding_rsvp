export type GiftPerson = {
  id: string;
  name: string;
  role: string;
  bank: string | null;
  accountNumber: string | null;
  kakaoPayUrl: string | null;
  tossUrl: string | null;
};

export type GiftGroup = {
  id: string;
  title: string;
  people: GiftPerson[];
};

type GiftPersonKey =
  | 'GROOM'
  | 'BRIDE'
  | 'GROOM_FATHER'
  | 'GROOM_MOTHER'
  | 'BRIDE_FATHER'
  | 'BRIDE_MOTHER';

type GiftPersonMeta = {
  id: string;
  name: string;
  role: string;
  envKey: GiftPersonKey;
};

const GIFT_PERSON_META: Record<
  'couple' | 'groom-parents' | 'bride-parents',
  { title: string; people: GiftPersonMeta[] }
> = {
  couple: {
    title: '신랑 · 신부',
    people: [
      { id: 'groom', name: '송대석', role: '신랑', envKey: 'GROOM' },
      { id: 'bride', name: '김다인', role: '신부', envKey: 'BRIDE' },
    ],
  },
  'groom-parents': {
    title: '신랑측 혼주',
    people: [
      {
        id: 'groom-parents',
        name: '송기재 & 주현숙',
        role: '신랑 부모님',
        envKey: 'GROOM_FATHER',
      },
    ],
  },
  'bride-parents': {
    title: '신부측 혼주',
    people: [
      {
        id: 'bride-parents',
        name: '김현철 & 강민경',
        role: '신부 부모님',
        envKey: 'BRIDE_FATHER',
      },
    ],
  },
};

function readEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

/** 토스 딥링크용 은행명 (앱이 인식하는 짧은 표기) */
export function tossBankName(bank: string): string {
  if (bank.includes('우리')) return '우리';
  if (bank.includes('농협') || bank.includes('NH')) return '농협';
  if (bank.includes('국민') || bank.includes('KB')) return '국민';
  if (bank.includes('신한')) return '신한';
  if (bank.includes('하나')) return '하나';
  if (bank.includes('카카오')) return '카카오';
  if (bank.includes('토스')) return '토스';
  if (bank.includes('새마을')) return '새마을';
  return bank.replace(/은행$/, '').replace(/금고$/, '');
}

export function buildTossSendUrl(bank: string, accountNumber: string): string {
  const params = new URLSearchParams({
    bank: tossBankName(bank),
    accountNo: accountNumber.replace(/-/g, ''),
  });
  return `supertoss://send?${params.toString()}`;
}

function buildPersonFromEnv(meta: GiftPersonMeta): GiftPerson {
  const bank = readEnv(`GIFT_${meta.envKey}_BANK`);
  const accountNumber = readEnv(`GIFT_${meta.envKey}_ACCOUNT`);
  const kakaoPayUrl = readEnv(`GIFT_${meta.envKey}_KAKAO_URL`);
  const tossUrl =
    bank && accountNumber ? buildTossSendUrl(bank, accountNumber) : null;

  return {
    id: meta.id,
    name: meta.name,
    role: meta.role,
    bank,
    accountNumber,
    kakaoPayUrl,
    tossUrl,
  };
}

export function getWeddingGiftGroups(): GiftGroup[] {
  return (
    Object.entries(GIFT_PERSON_META) as Array<
      [
        keyof typeof GIFT_PERSON_META,
        (typeof GIFT_PERSON_META)[keyof typeof GIFT_PERSON_META],
      ]
    >
  ).map(([id, group]) => ({
    id,
    title: group.title,
    people: group.people.map(buildPersonFromEnv),
  }));
}
