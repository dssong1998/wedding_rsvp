import type { Metadata } from "next";
import { InformationPage } from "../../components/information-page";

export const metadata: Metadata = {
  title: "결혼식 안내",
  description: "하객을 위한 결혼식 안내 페이지",
  openGraph: {
    images: ["/assets/images/wedding_poster.jpeg"]
  },
  twitter: {
    images: ["/assets/images/wedding_poster.jpeg"]
  }
};

export default function InformationRoutePage(): JSX.Element {
  return <InformationPage />;
}
