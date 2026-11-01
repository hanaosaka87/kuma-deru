-- くま！おる！熊！ Phase8
-- 投稿者が「対応状況の変化（対応中／確保済み／駆除済み）」を個別のPush通知で受け取れるようにする紐付けテーブル。
-- push_subscriptions(endpoint) と bear_sightings(id) を結びつけ、
-- update-statusでのステータス変更時にこのテーブルに登録されたendpointへのみ個別通知を送る。
-- テスターフィードバック対応（2026-10-19）：「投稿後その後の捕獲・駆除等の連絡が返るシステムにしてほしい」
-- Supabase SQL Editorで実行してください

create table if not exists bear_sighting_watchers (
  sighting_id bigint not null references bear_sightings(id) on delete cascade,
  endpoint text not null,
  created_at timestamptz not null default now(),
  primary key (sighting_id, endpoint)
);

alter table bear_sighting_watchers enable row level security;
-- クライアントから直接の読み書きは行わない（API Route（service role）経由のみ）。anonへの権限は付与しない。
