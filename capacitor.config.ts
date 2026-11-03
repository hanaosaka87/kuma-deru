import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'biz.trickster.hana.kumaoru.app',
  appName: 'くま！おる！熊！',
  webDir: 'public',
  // Next.jsのAPI Routes・Supabase認証をそのまま使うため、静的バンドルではなく
  // 本番URLをそのままネイティブWebViewで開くリモート方式を採用（Android TWA方式と同じ発想）
  server: {
    url: 'https://kuma-oru.hana.trickster.biz',
    cleartext: false,
  },
  ios: {
    // コンテンツがステータスバー/ホームインジケーターに重なる問題の対策（クレゲーで確立済み）。
    // 常にセーフエリア分の余白を確保してWebViewを配置する
    contentInset: 'always',
  },
};

export default config;
