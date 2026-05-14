import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import WorldViewTheoryPage from './pages/WorldViewTheoryPage'
import WorldViewOpsPage from './pages/WorldViewOpsPage'
import DataPage from './pages/DataPage'
import CoverageMatrixPage from './pages/CoverageMatrixPage'
import HistoryPage from './pages/HistoryPage'
import HistorySeriesPage from './pages/HistorySeriesPage'
import DashboardPage from './pages/DashboardPage'
import EndogenousOpsPage from './pages/EndogenousOpsPage'
import ModelInputsPage from './pages/ModelInputsPage'
import EndogenousBetasPage from './pages/EndogenousBetasPage'

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
        <Route path="/model-inputs" element={<ModelInputsPage />} />
        <Route path="/endogenous/zscores" element={<ModelInputsPage />} />
        <Route path="/endogenous/betas" element={<EndogenousBetasPage />} />
        <Route path="/data" element={<DataPage />} />
        <Route path="/data/coverage-matrix" element={<CoverageMatrixPage />} />
        <Route path="/data/history" element={<HistoryPage />} />
        <Route path="/data/history/:sourceId" element={<HistorySeriesPage />} />
      </Routes>
    </div>
  )
}





