import type { Metadata } from 'next';
import { WeddingGiftPage } from '../../components/wedding-gift-page';
import { getWeddingGiftGroups } from '../../data/wedding-gift-data';

export const metadata: Metadata = {
  title: '축의금 · 마음 전하기',
  description: '신랑·신부 및 혼주 계좌로 축의금을 편하게 전달하세요.',
  openGraph: {
    images: ['/assets/images/wedding_poster.jpeg'],
  },
  twitter: {
    images: ['/assets/images/wedding_poster.jpeg'],
  },
};

export default function WeddingGiftRoutePage(): JSX.Element {
  const groups = getWeddingGiftGroups();
  return <WeddingGiftPage groups={groups} />;
}
