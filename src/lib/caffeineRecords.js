import { supabase } from './supabaseClient'

const TABLE_NAME = 'caffeine_records'

// Supabase(snake_case) -> アプリ内部(camelCase) の変換
function toRecord(row) {
  return {
    id: row.id,
    drinkName: row.drink_name,
    caffeineMg: Number(row.caffeine_mg),
    consumedAt: row.consumed_at,
    createdAt: row.created_at,
  }
}

/**
 * 記録を摂取日時の新しい順で取得する。
 */
export async function fetchRecords() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .order('consumed_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []).map(toRecord)
}

/**
 * 記録を1件、IDを指定して取得する。
 *
 * 該当する記録が存在しない場合（削除済み・不正なIDなど）はnullを返す。
 * 通信・取得エラーの場合はエラーをthrowする。
 * maybeSingle()を使うことで、この2つを区別する（Version 1.6）。
 */
export async function fetchRecordById(id) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data ? toRecord(data) : null
}

/**
 * 記録を1件登録する。
 */
export async function insertRecord({ drinkName, caffeineMg, consumedAt }) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      drink_name: drinkName,
      caffeine_mg: caffeineMg,
      consumed_at: consumedAt,
    })
    .select()
    .single()

  if (error) {
    throw error
  }

  return toRecord(data)
}

/**
 * 記録を1件更新する（Version 1.6：飲み物名・カフェイン量・摂取日時のみ）。
 *
 * idとcreated_atは更新payloadに含めない（登録日時は変更しない）。
 */
export async function updateRecord(id, { drinkName, caffeineMg, consumedAt }) {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .update({
      drink_name: drinkName,
      caffeine_mg: caffeineMg,
      consumed_at: consumedAt,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw error
  }

  return toRecord(data)
}

/**
 * 記録を1件削除する。
 */
export async function deleteRecord(id) {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)

  if (error) {
    throw error
  }
}
