import type { Metadata } from 'next';
import { WeddingCardPage } from '../components/wedding-card-page';

export const metadata: Metadata = {
  title: '송대석 · 김다인 결혼 소식',
  description:
    '2026년 8월 22일, 송대석과 김다인이 가족과 가까운 지인분들과 함께 결혼합니다.',
  openGraph: {
    title: '송대석 · 김다인 결혼 소식',
    description:
      '송대석과 김다인의 새로운 시작에 따뜻한 축복을 보내주세요.',
    images: ['/assets/images/wedding-card/hero-photo.jpg'],
  },
  twitter: {
    images: ['/assets/images/wedding-card/hero-photo.jpg'],
  },
};

export default function HomePage(): JSX.Element {
  return <WeddingCardPage publicHome />;
}
