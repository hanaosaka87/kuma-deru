-- くま！おる！熊！ Phase3
-- ニュース自動集約・地域別ランキング機能のためのカラム追加
-- Supabase SQL Editorで実行してください

-- 1. 投稿元の区別（'user': ユーザー投稿 / 'news_auto': ニュース自動集約）
alter table bear_sightings add column if not exists source text not null default 'user';

-- 2. ニュース記事URL（重複登録防止用。ユーザー投稿はnullのまま）
alter table bear_sightings add column if not exists source_url text;

create unique index if not exists idx_bear_sightings_source_url
  on bear_sightings (source_url)
  where source_url is not null;

-- 3. 都道府県（地域別ランキング・リスク表示の集計を高速化するため。
--    既存データは未設定のままでよい。/areasページではarea文字列からのフォールバック抽出も行う）
alter table bear_sightings add column if not exists prefecture text;

create index if not exists idx_bear_sightings_prefecture on bear_sightings (prefecture);

-- 確認クエリ
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'bear_sightings'
order by ordinal_position;
