const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const BASE = 'C:/Users/info/dev';

const apps = [
  {
    dir: 'tabi-compuri',
    name: '旅コンプリ',
    short_name: '旅コンプリ',
    description: '日本全国制覇マップ。道の駅・温泉・お城など1万件超のスポットをコンプリートしよう',
    start_url: '/',
    bg: '#1E40AF',
    theme: '#1E40AF',
    label: '旅',
    url: 'https://tabi-compuri.hana.trickster.biz',
  },
  {
    dir: 'iitokodori',
    name: 'いいとこどり',
    short_name: 'いいとこどり',
    description: 'ホテル・旅館のいいところだけをシェア。マイナス投稿なしのポジティブ宿泊レビュー',
    start_url: '/',
    bg: '#D97706',
    theme: '#D97706',
    label: '良',
    url: 'https://iitokodori.hana.trickster.biz',
  },
  {
    dir: 'attara-iine',
    name: 'あったらいいね！',
    short_name: 'あったらいいね',
    description: '日常の「こんなものがあったら」アイデアを投稿。開発者に届いてすぐ実現するかも',
    start_url: '/',
    bg: '#059669',
    theme: '#059669',
    label: '案',
    url: 'https://attara-iine.hana.trickster.biz',
  },
  {
    dir: 'yattara',
    name: 'やったらこうなる',
    short_name: 'やったらこうなる',
    description: '犯罪結果シミュレーター。法律を楽しく学んで犯罪抑止。年齢別・カテゴリ別に解説',
    start_url: '/',
    bg: '#DC2626',
    theme: '#DC2626',
    label: '法',
    url: 'https://yattara.hana.trickster.biz',
  },
  {
    dir: 'toilet-map',
    name: 'トイレはどこ？',
    short_name: 'トイレ検索',
    description: '現在地から最寄りのトイレを即検索。全国10,574件の公共トイレを地図で確認',
    start_url: '/',
    bg: '#0284C7',
    theme: '#0284C7',
    label: 'WC',
    url: 'https://toilet-map.hana.trickster.biz',
  },
  {
    dir: 'mimitable',
    name: 'ミミタボ',
    short_name: 'ミミタボ',
    description: '耳たぶをひたすら引っ張るシュールな暇つぶしゲーム。福の神が現れるか？',
    start_url: '/',
    bg: '#7C3AED',
    theme: '#7C3AED',
    label: '耳',
    url: 'https://mimitable.hana.trickster.biz',
  },
];

function makeSvg(size, bg, label) {
  const fontSize = label.length > 1 ? size * 0.32 : size * 0.42;
  const radius = Math.round(size * 0.18);
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/>
  <text
    x="50%" y="54%"
    font-size="${fontSize}"
    font-weight="bold"
    font-family="'Noto Sans JP','Hiragino Sans','Yu Gothic','sans-serif'"
    text-anchor="middle"
    dominant-baseline="middle"
    fill="white"
    letter-spacing="-2"
  >${label}</text>
</svg>`;
}

async function run() {
  for (const app of apps) {
    const pubDir = path.join(BASE, app.dir, 'public');
    if (!fs.existsSync(pubDir)) {
      fs.mkdirSync(pubDir, { recursive: true });
      console.log(`📁 created: ${pubDir}`);
    }

    // アイコン生成
    for (const size of [192, 512]) {
      const svg = makeSvg(size, app.bg, app.label);
      const outPath = path.join(pubDir, `icon-${size}.png`);
      await sharp(Buffer.from(svg)).png().toFile(outPath);
      console.log(`🎨 icon-${size}.png → ${app.dir}`);
    }

    // apple-touch-icon (180x180)
    const svgApple = makeSvg(180, app.bg, app.label);
    await sharp(Buffer.from(svgApple)).png().toFile(path.join(pubDir, 'apple-touch-icon.png'));
    console.log(`🍎 apple-touch-icon.png → ${app.dir}`);

    // favicon (32x32)
    const svgFav = makeSvg(32, app.bg, app.label);
    await sharp(Buffer.from(svgFav)).png().toFile(path.join(pubDir, 'favicon-32.png'));
    console.log(`⭐ favicon-32.png → ${app.dir}`);

    // manifest.json
    const manifest = {
      name: app.name,
      short_name: app.short_name,
      description: app.description,
      start_url: '/',
      display: 'standalone',
      background_color: app.bg,
      theme_color: app.theme,
      lang: 'ja',
      icons: [
        { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
        { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    };
    fs.writeFileSync(
      path.join(pubDir, 'manifest.json'),
      JSON.stringify(manifest, null, 2),
      'utf8'
    );
    console.log(`📋 manifest.json → ${app.dir}`);
  }
  console.log('\n✅ 全6アプリ完了！');
}

run().catch(console.error);
