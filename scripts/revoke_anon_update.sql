-- くま！おる！熊！ bear_sightings の anon UPDATE権限を剥奪
-- 対象Supabaseプロジェクト: luckrsgiflqqjdpcprnt（funnyo-yameteと共有プロジェクト）
--
-- 背景: 「修正する」「緊急にする」「対応状況を更新」を
-- /api/edit-sighting, /api/update-status（service role key経由）に
-- 移行したため、クライアントから直接bear_sightingsをUPDATEする経路は
-- 不要になった。migration_phase1.sql の
--   "anon can update bear_sightings" (using(true) with check(true))
-- を残すと、RLSを迂回してAPIを経由しない直接更新（他人の投稿の改ざん）が
-- 可能なままになるため、多層防御としてanonのUPDATE権限自体を剥奪する。
--
-- 実行前に必ずChromeの自動翻訳をオフにしてから実行してください
-- （SQLキーワードが日本語に翻訳され構文エラーになるため）。

drop policy if exists "anon can update bear_sightings" on bear_sightings;
revoke update on table bear_sightings from anon;
