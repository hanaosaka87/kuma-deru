-- くま！おる！熊！ Phase4c
-- LINE公式アカウント経由のエリア通知登録に対応する
-- Supabase SQL Editorで実行してください

-- LINE登録はメールアドレスを持たないため email を任意に変更
alter table bear_area_subscriptions
  alter column email drop not null;

-- LINEのユーザーIDを保存する列を追加
alter table bear_area_subscriptions
  add column if not exists line_user_id text;

create index if not exists idx_bear_area_subscriptions_line_user_id
  on bear_area_subscriptions (line_user_id);

-- 同じLINEユーザーが同じエリアを重複登録しないようにする（再送信時はupsertで更新）
create unique index if not exists idx_bear_area_subscriptions_line_area
  on bear_area_subscriptions (line_user_id, area)
  where line_user_id is not null;

-- メール・LINEのどちらか一方は必須
alter table bear_area_subscriptions
  add constraint bear_area_subscriptions_contact_check
  check (email is not null or line_user_id is not null);

-- 確認クエリ
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_name = 'bear_area_subscriptions'
order by ordinal_position;
