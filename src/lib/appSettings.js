import { supabase } from './supabaseClient'

const TABLE_NAME = 'app_settings'
const SETTINGS_ID = 1

/**
 * 保存済みの1日のカフェイン目標値(mg)を取得する。
 *
 * 戻り値:
 * - 0以上の数値: 設定済み（0mgも有効な設定値として扱う）
 * - null: 未設定
 *
 * app_settingsのid=1行は事前にmigrationで作成されている前提であり、
 * アプリ側からは新規作成（INSERT）しない。行が取得できない場合は
 * アプリ側で補完せず、取得エラーとして呼び出し元へ伝える。
 */
export async function fetchGoal() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('daily_caffeine_goal_mg')
    .eq('id', SETTINGS_ID)
    .single()

  if (error) {
    throw error
  }

  // NULL(未設定)と0(設定済み)を混同しないよう、明示的にnullかどうかを判定する。
  return data.daily_caffeine_goal_mg === null ? null : Number(data.daily_caffeine_goal_mg)
}

/**
 * 1日のカフェイン目標値(mg)を保存する。
 *
 * goalMgにnullを渡すと「未設定」として保存する（0とnullは区別する）。
 * app_settingsに対してはUPDATEのみを行い、INSERTは行わない。
 */
export async function saveGoal(goalMg) {
  const { error } = await supabase
    .from(TABLE_NAME)
    .update({
      daily_caffeine_goal_mg: goalMg,
      updated_at: new Date().toISOString(),
    })
    .eq('id', SETTINGS_ID)

  if (error) {
    throw error
  }
}
