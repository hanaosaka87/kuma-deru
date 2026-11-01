-- くま！おる！熊！ Phase5
-- 同一個体の可能性がある投稿同士を紐づけるテーブル。
-- AIによる自由記述テキスト同士の類似判定結果を保存する（画像特徴量・埋め込みベクトルは使用しない）。
-- Supabase SQL Editorで実行してください

create table if not exists bear_individual_matches (
  id bigint generated always as identity primary key,
  sighting_id bigint not null references bear_sightings(id) on delete cascade,
  matched_sighting_id bigint not null references bear_sightings(id) on delete cascade,
  confidence text not null check (confidence in ('high', 'medium')),
  reason text,
  created_at timestamptz not null default now(),
  unique (sighting_id, matched_sighting_id)
);

create index if not exists idx_bear_individual_matches_sighting
  on bear_individual_matches (sighting_id);
create index if not exists idx_bear_individual_matches_matched
  on bear_individual_matches (matched_sighting_id);

alter table bear_individual_matches enable row level security;

-- 詳細パネル（anonクライアント）からの参照を許可。書き込みはservice role（API route）のみ
create policy "anon can select bear_individual_matches"
  on bear_individual_matches for select
  to anon
  using (true);

-- 確認クエリ
select * from bear_individual_matches;
