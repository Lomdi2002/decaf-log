-- Decaf Log - Version 1.1
-- app_settings テーブル定義とRLSポリシー
--
-- 前提:
-- MVP同様、認証機能を前提としない。
-- app_settingsは常に1行のみ（id = 1固定）で運用する単一設定テーブル。
-- daily_caffeine_goal_mgはNULL（未設定）を許可する。
--
-- 適用方法:
-- Supabaseダッシュボードの SQL Editor でこのファイルの内容を実行する。
-- CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING / DROP POLICY IF EXISTS
-- を使用しているため、誤って複数回実行しても安全（冪等）。

create table if not exists public.app_settings (
  id smallint primary key default 1 check (id = 1),
  daily_caffeine_goal_mg numeric check (daily_caffeine_goal_mg is null or daily_caffeine_goal_mg >= 0),
  updated_at timestamptz not null default now()
);

-- RLSを有効化
alter table public.app_settings
enable row level security;

-- anonに必要な権限だけを明示的に付与する（INSERT・DELETEは不許可）
grant select, update
on table public.app_settings
to anon;

revoke insert, delete
on table public.app_settings
from anon;

-- 既存ポリシーがある場合に備えて削除
drop policy if exists "Allow public read access to app_settings"
on public.app_settings;

drop policy if exists "Allow public update access to app_settings"
on public.app_settings;

-- 公開読み取り
create policy "Allow public read access to app_settings"
on public.app_settings
for select
to anon
using (true);

-- 公開更新（値の妥当性はテーブルのCHECK制約で担保する）
create policy "Allow public update access to app_settings"
on public.app_settings
for update
to anon
using (true)
with check (true);

-- INSERT/DELETEポリシーは作成しない

-- 初期行（id = 1, 未設定）を1件だけ作成する
insert into public.app_settings (id, daily_caffeine_goal_mg)
values (1, null)
on conflict (id) do nothing;
