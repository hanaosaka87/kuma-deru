-- くま！おる！熊！ Phase4d
-- LINE登録のON CONFLICT判定を修正する
-- (部分インデックスはON CONFLICT (line_user_id, area)のターゲットとして認識されないため)
-- Supabase SQL Editorで実行してください

drop index if exists idx_bear_area_subscriptions_line_area;

-- NULL同士は重複とみなされないため、メール登録(line_user_id = NULL)には影響しない
alter table bear_area_subscriptions
  add constraint bear_area_subscriptions_line_area_unique unique (line_user_id, area);

-- 確認クエリ
select indexname, indexdef
from pg_indexes
where tablename = 'bear_area_subscriptions';
