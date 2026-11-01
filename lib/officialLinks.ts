export type OfficialLink = {
  label: string
  url: string
}

export type PrefectureLinks = {
  name: string
  links: OfficialLink[]
}

export type RegionLinks = {
  region: string
  emoji: string
  accent: string
  prefectures: PrefectureLinks[]
}

// 各都道府県・自治体が公開しているクマ出没情報マップ・ページへのリンク集
// 掲載内容は変更される場合があります。最新情報は各リンク先でご確認ください。
export const OFFICIAL_LINKS: RegionLinks[] = [
  {
    region: '北海道',
    emoji: '🐾',
    accent: 'sky',
    prefectures: [
      {
        name: '北海道',
        links: [
          { label: 'ひぐまっぷ', url: 'https://higumap.info/recent' },
          { label: '札幌市「クマ出没情報」', url: 'https://www.city.sapporo.jp/kurashi/animal/choju/kuma/syutsubotsu/' },
        ],
      },
    ],
  },
  {
    region: '東北',
    emoji: '🌲',
    accent: 'emerald',
    prefectures: [
      { name: '青森県', links: [{ label: 'クマに関する注意喚起', url: 'https://www.pref.aomori.lg.jp/soshiki/kankyo/shizen/kuma_cyuui.html' }] },
      { name: '岩手県', links: [{ label: 'ツキノワグマの出没情報', url: 'https://www.pref.iwate.jp/kurashikankyou/shizen/yasei/1049881/1056087.html' }] },
      { name: '宮城県', links: [{ label: '出没マップ（Googleマイマップ）', url: 'https://www.google.com/maps/d/u/0/viewer?mid=1Naf83SkzDSx69lxgWxg402f9abvXOLo&ll=38.38369647205529%2C140.85414165708124&z=9' }] },
      {
        name: '秋田県',
        links: [
          { label: '出没情報', url: 'https://www.pref.akita.lg.jp/pages/archive/23295' },
          { label: 'クマダス', url: 'https://kumadas.net/' },
        ],
      },
      { name: '山形県', links: [{ label: '出没マップ（Googleマイマップ）', url: 'https://www.google.com/maps/d/u/0/viewer?mid=1da3oBtt7Foif1w2r_UPO9-RdwuElVis&ll=38.435830761391536%2C139.85408055931688&z=8' }] },
      { name: '福島県', links: [{ label: 'ツキノワグマ目撃情報', url: 'https://www.pref.fukushima.lg.jp/sec/16035b/tukinowaguma-mokugeki.html' }] },
    ],
  },
  {
    region: '関東',
    emoji: '🏞️',
    accent: 'violet',
    prefectures: [
      { name: '茨城県', links: [{ label: '茨城県公式サイト', url: 'https://www.pref.ibaraki.jp/' }] },
      {
        name: '栃木県',
        links: [
          { label: '日光湯元ビジターセンター', url: 'http://www.nikkoyumoto-vc.com/nature/kuma_d.html' },
          { label: 'ツキノワグマ管理計画', url: 'https://www.pref.tochigi.lg.jp/d04/eco/shizenkankyou/shizen/kumahogokannri3.html' },
          { label: '下野新聞「クマ目撃情報」', url: 'https://www.shimotsuke.co.jp/feature/theme/%E3%81%A8%E3%81%A1%E3%81%8E%E3%82%AF%E3%83%9E%E7%9B%AE%E6%92%83%E6%83%85%E5%A0%B1' },
        ],
      },
      {
        name: '群馬県',
        links: [
          { label: '尾瀬のクマ目撃情報', url: 'https://oze-fnd.or.jp/ozd/br/' },
          { label: '出没マップ（ダッシュボード）', url: 'https://pref-gunma.maps.arcgis.com/apps/dashboards/5276d2ebf02a42da8595ed2a51a334c8' },
          { label: '前橋市 出没情報マップ', url: 'https://searchizu-maebashi.geocloud.jp/webgis/?p=0&bt=0&mp=266-3&' },
        ],
      },
      { name: '埼玉県', links: [{ label: '出没マップ（ダッシュボード）', url: 'https://www.arcgis.com/apps/dashboards/6851a59c5a76496e9c9e3b54b2e67ff9' }] },
      { name: '千葉県', links: [{ label: '千葉県公式サイト', url: 'https://www.pref.chiba.lg.jp/' }] },
      { name: '東京都', links: [{ label: '東京都公式サイト', url: 'https://www.metro.tokyo.lg.jp/' }] },
      { name: '神奈川県', links: [{ label: 'クマに関する情報', url: 'https://www.pref.kanagawa.jp/docs/t4i/cnt/f3813/index.html' }] },
    ],
  },
  {
    region: '中部',
    emoji: '⛰️',
    accent: 'cyan',
    prefectures: [
      { name: '新潟県', links: [{ label: '出没マップ（ダッシュボード）', url: 'https://www.arcgis.com/apps/dashboards/20b4d06fb3b34776959a4e69c7a8511a' }] },
      { name: '富山県', links: [{ label: '富山県公式サイト', url: 'https://www.pref.toyama.jp/' }] },
      {
        name: '石川県',
        links: [
          { label: '出没マップ', url: 'https://www.pref.ishikawa.lg.jp/sizen/kuma/r5map.html' },
          { label: 'クマ出没情報ナビ', url: 'https://www.pref.ishikawa.lg.jp/sizen/kuma/navi01.html' },
        ],
      },
      { name: '福井県', links: [{ label: 'ツキノワグマ出没情報', url: 'https://tsukinowaguma.pref.fukui.lg.jp/' }] },
      { name: '山梨県', links: [{ label: 'クマに関する情報', url: 'https://www.pref.yamanashi.jp/shizen/kuma2.html' }] },
      {
        name: '長野県',
        links: [
          { label: '出没マップ', url: 'https://www.pref.nagano.lg.jp/shinrin/sangyo/ringyo/choju/joho/kuma-map.html' },
          { label: '上田市 出没情報', url: 'https://www.city.ueda.nagano.jp/soshiki/sinrin/67323.html' },
        ],
      },
      { name: '岐阜県', links: [{ label: '出没マップ（GIS）', url: 'https://gis-gifu.jp/gifu/PositionSelect?mid=10538' }] },
      { name: '静岡県', links: [{ label: '静岡県公式サイト', url: 'https://www.pref.shizuoka.jp/' }] },
      { name: '愛知県', links: [{ label: '愛知県公式サイト', url: 'https://www.pref.aichi.jp/' }] },
    ],
  },
  {
    region: '関西',
    emoji: '⛩️',
    accent: 'rose',
    prefectures: [
      { name: '三重県', links: [{ label: 'クマに関する情報', url: 'https://www.pref.mie.lg.jp/JTAISAKU/HP/m0114900048.htm' }] },
      { name: '滋賀県', links: [{ label: '大津市 出没マップ（Googleマイマップ）', url: 'https://www.google.com/maps/d/viewer?mid=1rE5HcSdJnm2gX3iT1FMt0aCVuQ9ArDs&ll=35.15107165524794%2C135.96526679335938&z=9' }] },
      { name: '京都府', links: [{ label: '出没マップ（GIS）', url: 'https://g-kyoto.gis.pref.kyoto.lg.jp/g-kyoto/PositionSelect?mid=676&mtp=pfm' }] },
      { name: '大阪府', links: [{ label: '大阪府公式サイト', url: 'https://www.pref.osaka.lg.jp/index.html' }] },
      { name: '兵庫県', links: [{ label: '兵庫県森林動物研究センター', url: 'https://www.wmi-hyogo.jp/' }] },
      { name: '奈良県', links: [{ label: 'クマ出没情報', url: 'https://www.pref.nara.jp/secure/233023/' }] },
      { name: '和歌山県', links: [{ label: 'ツキノワグマ出没情報', url: 'https://www.pref.wakayama.lg.jp/prefg/032600/index.html' }] },
    ],
  },
  {
    region: '中国',
    emoji: '🍁',
    accent: 'indigo',
    prefectures: [
      { name: '鳥取県', links: [{ label: 'クマに関する情報', url: 'https://www.pref.tottori.lg.jp/280334.htm' }] },
      { name: '島根県', links: [{ label: 'クマ出没情報', url: 'https://www.pref.shimane.lg.jp/police/kakusho/kawamoto/sesaku/k-news-r40901.html' }] },
      { name: '岡山県', links: [{ label: '岡山県公式サイト', url: 'https://www.pref.okayama.jp/' }] },
      { name: '広島県', links: [{ label: '広島県公式サイト', url: 'https://www.pref.hiroshima.lg.jp/' }] },
      { name: '山口県', links: [{ label: '出没マップ（オープンデータ）', url: 'https://yamaguchi-opendata.jp/dashboard?org=35000&res=9565b85b-f459-4c0e-912d-e30578822e09' }] },
    ],
  },
  {
    region: '四国',
    emoji: '🍊',
    accent: 'orange',
    prefectures: [
      { name: '徳島県', links: [{ label: '徳島県公式サイト', url: 'https://www.pref.tokushima.lg.jp/' }] },
      { name: '香川県', links: [{ label: '香川県公式サイト', url: 'https://www.pref.kagawa.lg.jp/' }] },
      { name: '愛媛県', links: [{ label: '愛媛県公式サイト', url: 'https://www.pref.ehime.jp/' }] },
      { name: '高知県', links: [{ label: '高知県公式サイト', url: 'https://www.pref.kochi.lg.jp/' }] },
    ],
  },
  {
    region: '九州・沖縄',
    emoji: '🌺',
    accent: 'amber',
    prefectures: [
      { name: '福岡県', links: [{ label: '福岡県公式サイト（クマ生息域外）', url: 'https://www.pref.fukuoka.lg.jp/' }] },
      { name: '佐賀県', links: [{ label: '佐賀県公式サイト（クマ生息域外）', url: 'https://www.pref.saga.lg.jp/' }] },
      { name: '長崎県', links: [{ label: '長崎県公式サイト（クマ生息域外）', url: 'https://www.pref.nagasaki.jp/' }] },
      { name: '熊本県', links: [{ label: '熊本県公式サイト（クマ生息域外）', url: 'https://www.pref.kumamoto.jp/' }] },
      { name: '大分県', links: [{ label: '大分県公式サイト（クマ生息域外）', url: 'https://www.pref.oita.jp/' }] },
      { name: '宮崎県', links: [{ label: '宮崎県公式サイト（クマ生息域外）', url: 'https://www.pref.miyazaki.lg.jp/' }] },
      { name: '鹿児島県', links: [{ label: '鹿児島県公式サイト（クマ生息域外）', url: 'https://www.pref.kagoshima.jp/' }] },
      { name: '沖縄県', links: [{ label: '沖縄県公式サイト（クマ生息域外）', url: 'https://www.pref.okinawa.lg.jp/' }] },
    ],
  },
]
