-- くま！おる！熊！ Phase1
-- bear_area_subscriptions テーブル作成 + RLSポリシー + ストレージバケット設定
-- Supabase SQL Editorで実行してください

-- 1. エリア通知登録テーブル
create table if not exists bear_area_subscriptions (
  id bigint generated always as identity primary key,
  email text not null,
  area text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_bear_area_subscriptions_area on bear_area_subscriptions (area);

alter table bear_area_subscriptions enable row level security;

-- 登録フォームからの新規登録のみ許可（メールアドレスを含むため一般公開のSELECTは許可しない）
create policy "anon can insert bear_area_subscriptions"
  on bear_area_subscriptions for insert
  to anon
  with check (true);

-- 2. bear_sightings の RLSポリシー（cats テーブルと同様の方針）
alter table bear_sightings enable row level security;

create policy "anon can select bear_sightings"
  on bear_sightings for select
  to anon
  using (true);

create policy "anon can insert bear_sightings"
  on bear_sightings for insert
  to anon
  with check (true);

create policy "anon can update bear_sightings"
  on bear_sightings for update
  to anon
  using (true)
  with check (true);

-- 3. ストレージバケット bear-images の作成
insert into storage.buckets (id, name, public)
values ('bear-images', 'bear-images', true)
on conflict (id) do nothing;

create policy "public can read bear-images"
  on storage.objects for select
  to public
  using (bucket_id = 'bear-images');

create policy "anon can upload bear-images"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'bear-images');
