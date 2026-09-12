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
 * 記録を1件削除する。
 */
export async function deleteRecord(id) {
  const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id)

  if (error) {
    throw error
  }
}
