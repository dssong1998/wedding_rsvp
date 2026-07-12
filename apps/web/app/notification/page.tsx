import type { Metadata } from "next";
import { NotificationPage } from "../../components/notification-page";

export const metadata: Metadata = {
  title: "결혼식 공지",
  description: "결혼식 당일 전후 공지사항 안내 페이지",
  openGraph: {
    images: ["/assets/images/wedding_poster.jpeg"]
  },
  twitter: {
    images: ["/assets/images/wedding_poster.jpeg"]
  }
};

export default function NotificationRoutePage(): JSX.Element {
  return <NotificationPage />;
}
