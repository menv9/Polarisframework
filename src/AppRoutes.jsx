import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import HomePage from './pages/HomePage'
import WorldViewTheoryPage from './pages/WorldViewTheoryPage'
import WorldViewOpsPage from './pages/WorldViewOpsPage'
import DataHubPage from './pages/DataHubPage'
import DataPage from './pages/DataPage'
import CoverageMatrixPage from './pages/CoverageMatrixPage'
import HistoryPage from './pages/HistoryPage'
import HistorySeriesPage from './pages/HistorySeriesPage'
import EconomicCalendarPage from './pages/EconomicCalendarPage'
import NotificationsPage from './pages/NotificationsPage'
import DashboardPage from './pages/DashboardPage'
import EndogenousOpsPage from './pages/EndogenousOpsPage'
import ModelInputsPage from './pages/ModelInputsPage'
import EndogenousBetasPage from './pages/EndogenousBetasPage'
import ExogenousOpsPage from './pages/ExogenousOpsPage'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary antialiased">
      <Navbar />
      {children}
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Ruta pública */}
      <Route path="/login" element={<LoginPage />} />

      {/* Ruta solo admin */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <Layout>
              <AdminPage />
            </Layout>
          </AdminRoute>
        }
      />

      {/* Rutas solo admin — Data */}
      <Route
        path="/data/*"
        element={
          <AdminRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<DataHubPage />} />
                <Route path="/raw" element={<DataPage />} />
                <Route path="/coverage-matrix" element={<CoverageMatrixPage />} />
                <Route path="/history" element={<HistoryPage />} />
                <Route path="/history/:sourceId" element={<HistorySeriesPage />} />
                <Route path="/economic-calendar" element={<EconomicCalendarPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
              </Routes>
            </Layout>
          </AdminRoute>
        }
      />

      {/* Rutas protegidas */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/world-view" element={<WorldViewTheoryPage />} />
                <Route path="/world-view/operativa" element={<WorldViewOpsPage />} />
                <Route path="/endogenous" element={<EndogenousOpsPage />} />
                <Route path="/model-inputs" element={<ModelInputsPage />} />
                <Route path="/endogenous/zscores" element={<ModelInputsPage />} />
                <Route path="/endogenous/betas" element={<EndogenousBetasPage />} />
                <Route path="/exogenous/operativa" element={<ExogenousOpsPage />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
