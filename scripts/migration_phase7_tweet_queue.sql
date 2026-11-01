-- くま！おる！熊！ Phase7
-- Xくまおるくま速報bot（承認キュー方式）: ニュース自動集約で新規登録された投稿の速報文を
-- いったんキューに入れ、社長のワンタップ承認を経てからXへ投稿する（誤判定の自動発信を防ぐため）。
-- Supabase SQL Editorで実行してください

create table if not exists bear_tweet_queue (
  id bigint generated always as identity primary key,
  sighting_id bigint references bear_sightings(id) on delete set null,
  text text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'posted')),
  created_at timestamptz not null default now(),
  posted_at timestamptz
);

create index if not exists idx_bear_tweet_queue_status
  on bear_tweet_queue (status);

-- 管理画面（service role経由のAPI route）からのみ読み書きするため、anonへの権限付与は不要
alter table bear_tweet_queue enable row level security;

-- 確認クエリ
select * from bear_tweet_queue;
