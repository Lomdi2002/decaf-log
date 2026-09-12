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