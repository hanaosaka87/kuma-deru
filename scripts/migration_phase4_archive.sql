-- くま！おる！熊！ Phase4
-- 3ヶ月データ保持ポリシー：投稿（写真・座標・説明等の詳細）は3ヶ月のみ保持し、
-- 3ヶ月を超えたものは都道府県別の集計件数のみ bear_sighting_archive_stats に残して削除する。
-- 観光地が「熊が出る場所」として地図上に恒久的に残ることを避けるための仕組み。
-- Supabase SQL Editorで実行してください

create table if not exists bear_sighting_archive_stats (
  prefecture text primary key,
  archived_count integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table bear_sighting_archive_stats enable row level security;

-- /areasページ（anonクライアント）からの参照を許可。書き込みはservice role（cron）のみ
create policy "anon can select bear_sighting_archive_stats"
  on bear_sighting_archive_stats for select
  to anon
  using (true);

-- 確認クエリ
select * from bear_sighting_archive_stats;
