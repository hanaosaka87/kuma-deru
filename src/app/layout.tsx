import type { Metadata, Viewport } from "next";
import { Zen_Kaku_Gothic_New } from "next/font/google";
import FeedbackWidget from "@/components/FeedbackWidget";
import AdsenseLoader from "@/components/AdsenseLoader";
import GA4Loader from "@/components/GA4Loader";
import IOSInstallBanner from "@/components/IOSInstallBanner";
import "./globals.css";

const zenKaku = Zen_Kaku_Gothic_New({
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-zen-kaku",
  display: "swap",
});

export const metadata: Metadata = {
  title: "くま！おる！熊！ - 熊出没情報共有マップ",
  description: "地域の熊出没情報をリアルタイムで投稿・共有する安全マップ",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "くま！おる！熊！",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C1322",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const mapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return (
    <html lang="ja" className={`h-full ${zenKaku.variable}`}>
      <head>
        <script
          src={`https://maps.googleapis.com/maps/api/js?key=${mapsApiKey}`}
          async
        />
      </head>
      <body className="h-full flex flex-col bg-kuma-bg text-kuma-ink">
        <AdsenseLoader />
        <GA4Loader />
        <IOSInstallBanner />
        <div className="flex-1">{children}</div>
        <FeedbackWidget appName="kuma-deru" />
        <footer className="bg-kuma-card border-t border-kuma-line text-center text-xs text-kuma-faint py-3 px-4 flex gap-4 justify-center flex-wrap">
          <a href="/" className="hover:text-kuma-ink font-bold text-kuma-sub">🏠 トップページ</a>
          <a href="/tracking" className="hover:text-kuma-ink">🐾 AI移動追跡</a>
          <a href="/sos-setup" className="hover:text-kuma-ink font-bold text-red-400">🆘 SOS設定</a>
          <a href="/gear" className="hover:text-kuma-ink">🛒 クマ対策グッズ</a>
          <a href="/partnership" className="hover:text-kuma-ink">🏛️ 自治体・猟友会の方へ</a>
          <a href="/sponsor" className="hover:text-kuma-ink">🤝 スポンサー募集</a>
          <a href="/media" className="hover:text-kuma-ink">📰 メディア・取材</a>
          <a href="https://hana.trickster.biz/privacy-policy.html" className="hover:text-kuma-ink">プライバシーポリシー</a>
          <a href="https://hana.trickster.biz/tokushoho.html" className="hover:text-kuma-ink">特定商取引法</a>
          <a href="/admin" className="hover:text-kuma-ink">🔐 管理</a>
          <span>© 株式会社華</span>
        </footer>
      </body>
    </html>
  );
}
