-- くま！おる！熊！ Phase6
-- bear_sightingsテーブルの変更をSupabase Realtime（postgres_changes）で配信できるようにする。
-- 既にanonへselectを許可済み（Phase1）のため、RLSポリシーの追加変更は不要。
-- Supabase SQL Editorで実行するか、Dashboard > Database > Replication で bear_sightings を有効化してください

alter publication supabase_realtime add table bear_sightings;
