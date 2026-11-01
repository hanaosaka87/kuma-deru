// @ts-check
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

// くま！おる！熊！ブランドカラー
// Background: #0C1322 (kuma-bg dark)
// Bear paw: #D97706 (kuma-primary amber)
// Alert badge: #EF4444 (kuma-accent red)

const svgIcon = `
<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- 角丸背景 -->
  <rect width="512" height="512" rx="100" fill="#0C1322"/>

  <!-- 肉球（メインパッド） -->
  <ellipse cx="256" cy="330" rx="100" ry="88" fill="#D97706"/>

  <!-- 肉球（指パッド・大） -->
  <ellipse cx="165" cy="222" rx="52" ry="48" fill="#D97706"/>
  <ellipse cx="256" cy="198" rx="52" ry="48" fill="#D97706"/>
  <ellipse cx="347" cy="222" rx="52" ry="48" fill="#D97706"/>

  <!-- 肉球（指パッド・小・両サイド） -->
  <ellipse cx="112" cy="298" rx="36" ry="34" fill="#D97706"/>
  <ellipse cx="400" cy="298" rx="36" ry="34" fill="#D97706"/>

  <!-- 爪のアクセントライン（メインパッドに2本） -->
  <line x1="210" y1="345" x2="210" y2="385" stroke="#92400E" stroke-width="8" stroke-linecap="round"/>
  <line x1="256" y1="348" x2="256" y2="390" stroke="#92400E" stroke-width="8" stroke-linecap="round"/>
  <line x1="302" y1="345" x2="302" y2="385" stroke="#92400E" stroke-width="8" stroke-linecap="round"/>

  <!-- 緊急アラートバッジ（右上） -->
  <circle cx="390" cy="118" r="82" fill="#EF4444"/>
  <circle cx="390" cy="118" r="74" fill="#EF4444"/>

  <!-- ! マーク -->
  <rect x="380" y="72" width="20" height="54" rx="10" fill="white"/>
  <circle cx="390" cy="148" r="12" fill="white"/>
</svg>
`

const svgBuffer = Buffer.from(svgIcon)
const outDir = path.join(__dirname, '..', 'public')

async function generate() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(outDir, 'icon-192.png'))
  console.log('✅ icon-192.png 生成完了')

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'icon-512.png'))
  console.log('✅ icon-512.png 生成完了')

  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(outDir, 'apple-touch-icon.png'))
  console.log('✅ apple-touch-icon.png 生成完了')

  // ファビコン用（32px）
  await sharp(svgBuffer)
    .resize(32, 32)
    .png()
    .toFile(path.join(outDir, 'favicon-32.png'))
  console.log('✅ favicon-32.png 生成完了')

  console.log('\n🐾 全アイコン生成完了！')
}

generate().catch(console.error)
