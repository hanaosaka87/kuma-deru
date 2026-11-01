-- くま！おる！熊！ Phase4b
-- エリア通知登録に「種別」を追加（個人 / 学校・教育機関 / 自治体・行政）
-- 種別ごとに通知メールの文面を出し分けるために使用する。
-- Supabase SQL Editorで実行してください

alter table bear_area_subscriptions
  add column if not exists subscriber_type text not null default '個人';

-- 確認クエリ
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'bear_area_subscriptions'
order by ordinal_position;
