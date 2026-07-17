import type { Metadata } from "next";
import { WeddingCardPage } from "../../components/wedding-card-page";

export const metadata: Metadata = {
  title: "송대석 · 김다인 모바일 청첩장",
  description: "2026년 8월 22일, 송대석과 김다인의 결혼식에 초대합니다.",
  openGraph: {
    images: ["/assets/images/wedding-card/hero-photo.jpg"],
  },
  twitter: {
    images: ["/assets/images/wedding-card/hero-photo.jpg"],
  },
};

export default function WeddingCardRoutePage(): JSX.Element {
  return <WeddingCardPage />;
}
