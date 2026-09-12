import { DRINK_PRESETS } from '../lib/drinkPresets'

function DrinkPresetPicker({ onSelect, disabled }) {
  return (
    <div className="drink-preset-picker">
      <div className="drink-preset-list">
        {DRINK_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            className="drink-preset-chip"
            onClick={() => onSelect(preset)}
            disabled={disabled}
          >
            {preset.name}（{preset.caffeineMg}mg）
          </button>
        ))}
      </div>
      <p className="drink-preset-note">※カフェイン量は目安です。選択後に変更できます。</p>
    </div>
  )
}

export default DrinkPresetPicker
