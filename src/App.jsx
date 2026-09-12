import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import BottomNavigation from './components/BottomNavigation'
import DashboardPage from './pages/DashboardPage'
import RecordPage from './pages/RecordPage'
import HistoryPage from './pages/HistoryPage'
import './App.css'

function App() {
  return (
    <div className="app">
      <Header />
      <main className="app-main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/record" element={<RecordPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
      <BottomNavigation />
    </div>
  )
}

export default App
