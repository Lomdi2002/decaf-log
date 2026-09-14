-- Decaf Log - Version 1.6
-- caffeine_records テーブルへのUPDATE権限追加（カフェイン記録編集機能）
--
-- 前提:
-- Version 1.6で追加する「記録編集」機能では、既存の1件のcaffeine_recordsを
-- 編集できるようにする。編集可能な項目は drink_name / caffeine_mg / consumed_at
-- の3つのみであり、id と created_at はユーザーが変更できないようにする。
--
-- そのため、anonロールへテーブル全体のUPDATE権限を与えるのではなく、
-- 上記3カラムに限定したカラムレベルのGRANTのみを許可する。
-- RLSポリシーは行レベルのアクセス制御のみを担当し、カラムレベルの制限は
-- このGRANTによって担保する。
--
-- 適用方法:
-- Supabaseダッシュボードの SQL Editor でこのファイルの内容を実行する。
-- REVOKE / GRANT（カラム指定） / DROP POLICY IF EXISTS を使用しており、
-- 誤って複数回実行しても安全（冪等）。

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
