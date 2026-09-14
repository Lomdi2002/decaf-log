-- Decaf Log - Version 1.0 MVP
-- caffeine_records テーブル定義とRLSポリシー

--
-- 前提:
-- MVPには認証機能がない。
-- 個人利用・デモ用途として、
-- anonロールへ caffeine_records テーブルに限定して
-- SELECT / INSERT / DELETE を許可する。
--
-- 将来的に一般ユーザー向けに公開する場合は、
-- Supabase Authを導入し、
-- caffeine_recordsにuser_idを追加した上で、
-- 本人のデータのみ操作可能なRLSへ変更する。
--

create table if not exists public.caffeine_records (
  id uuid primary key default gen_random_uuid(),
  drink_name text not null,
  caffeine_mg numeric not null check (caffeine_mg >= 0),
  consumed_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- RLSを有効化
alter table public.caffeine_records
enable row level security;

-- Automatically expose new tables をOFFにしているため、
-- anonに必要な権限だけを明示的に付与する
grant select, insert, delete
on table public.caffeine_records
to anon;

-- UPDATEはMVPでは使用しないため許可しない
revoke update
on table public.caffeine_records
from anon;

-- 既存ポリシーがある場合に備えて削除
drop policy if exists "Allow public read access to caffeine_records"
on public.caffeine_records;

drop policy if exists "Allow public insert access to caffeine_records"
on public.caffeine_records;

drop policy if exists "Allow public delete access to caffeine_records"
on public.caffeine_records;

-- 公開読み取り
create policy "Allow public read access to caffeine_records"
on public.caffeine_records
for select
to anon
using (true);

-- 公開追加
create policy "Allow public insert access to caffeine_records"
on public.caffeine_records
for insert
to anon
with check (true);

-- 公開削除
create policy "Allow public delete access to caffeine_records"
on public.caffeine_records
for delete
to anon
using (true);

-- UPDATEポリシーは作成しない


-- Decaf Log - Version 1.1
-- app_settings テーブル定義とRLSポリシー
--
-- 前提:
-- MVP同様、認証機能を前提としない。
-- app_settingsは常に1行のみ（id = 1固定）で運用する単一設定テーブル。
-- daily_caffeine_goal_mgはNULL（未設定）を許可する。

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


-- Decaf Log - Version 1.6
-- caffeine_records テーブルへのUPDATE権限追加（カフェイン記録編集機能）
--
-- 前提:
-- 編集可能な項目は drink_name / caffeine_mg / consumed_at の3つのみ。
-- id と created_at はanonからUPDATEできない状態を維持するため、
-- テーブル全体へのUPDATE権限ではなく、この3カラムに限定した
-- カラムレベルのGRANTのみを許可する。

-- Version 1.0で設定した「UPDATE不許可」を一旦取り消した上で、
-- 3カラムに限定したUPDATE権限のみを付与し直す。
revoke update
on table public.caffeine_records
from anon;

grant update (drink_name, caffeine_mg, consumed_at)
on table public.caffeine_records
to anon;

-- id・created_atはこのGRANTに含まれないため、anonからは引き続き
-- UPDATEできない。

-- 既存ポリシーがある場合に備えて削除
drop policy if exists "Allow public update access to caffeine_records"
on public.caffeine_records;

-- 公開更新（行レベルの制限はなし。カラムレベルの制限は上記GRANTで担保する）
create policy "Allow public update access to caffeine_records"
on public.caffeine_records
for update
to anon
using (true)
with check (true);