import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import WorldViewTheoryPage from './pages/WorldViewTheoryPage'
import WorldViewOpsPage from './pages/WorldViewOpsPage'
import DataPage from './pages/DataPage'
import DashboardPage from './pages/DashboardPage'
import EndogenousOpsPage from './pages/EndogenousOpsPage'

export default function AppRoutes() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary antialiased">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/world-view" element={<WorldViewTheoryPage />} />
        <Route path="/world-view/operativa" element={<WorldViewOpsPage />} />
        <Route path="/endogenous" element={<EndogenousOpsPage />} />
        <Route path="/data" element={<DataPage />} />
      </Routes>
    </div>
  )
}





