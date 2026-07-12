import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://dae-da.com";
const OG_IMAGE_PATH = "/assets/images/wedding_poster.jpeg";

export const metadata: Metadata = {
  title: "Daeseok & Dain",
  description: "Wedding invitation and RSVP",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "다인과 대석의 결혼식",
    description: "저희의 결혼식에 자리를 채워 빛내주시면 정말 행복할 것 같습니다.",
    url: SITE_URL,
    type: "website",
    images: [OG_IMAGE_PATH]
  },
  twitter: {
    card: "summary_large_image",
    title: "다인과 대석의 결혼식",
    description: "저희의 결혼식에 자리를 채워 빛내주시면 정말 행복할 것 같습니다.",
    images: [OG_IMAGE_PATH]
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
