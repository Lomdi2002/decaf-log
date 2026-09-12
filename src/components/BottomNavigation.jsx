import { NavLink } from 'react-router-dom'

function navLinkClassName({ isActive }) {
  return isActive ? 'bottom-nav-item bottom-nav-item-active' : 'bottom-nav-item'
}

function BottomNavigation() {
  return (
    <nav className="bottom-nav" aria-label="メインナビゲーション">
      <NavLink to="/" end className={navLinkClassName}>
        ホーム
      </NavLink>
      <NavLink to="/record" className={navLinkClassName}>
        記録
      </NavLink>
      <NavLink to="/history" className={navLinkClassName}>
        履歴
      </NavLink>
    </nav>
  )
}

export default BottomNavigation
