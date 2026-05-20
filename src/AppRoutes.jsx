import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Navbar from './components/Navbar'
import MainframeShell from './components/MainframeShell'
import { ProtectedRoute, AdminRoute } from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import WorldViewOpsPage from './pages/WorldViewOpsPage'
import DataHubPage from './pages/DataHubPage'
import DataPage from './pages/DataPage'
import CoverageMatrixPage from './pages/CoverageMatrixPage'
import HistoryPage from './pages/HistoryPage'
import HistorySeriesPage from './pages/HistorySeriesPage'
import EconomicCalendarPage from './pages/EconomicCalendarPage'
import NotificationsPage from './pages/NotificationsPage'
import DashboardPage from './pages/DashboardPage'
import GeneralPage from './pages/GeneralPage'
import EndogenousOpsPage from './pages/EndogenousOpsPage'
import ModelInputsPage from './pages/ModelInputsPage'
import EndogenousBetasPage from './pages/EndogenousBetasPage'
import ExogenousOpsPage from './pages/ExogenousOpsPage'
import TimingOpsPage from './pages/TimingOpsPage'
import RiskOpsPage from './pages/RiskOpsPage'
import ExecutionOpsPage from './pages/ExecutionOpsPage'
import JournalPage from './pages/JournalPage'
import PerformancePage from './pages/PerformancePage'
import BacktestPage from './pages/BacktestPage'
import ScenarioLibraryPage from './pages/ScenarioLibraryPage'
import CapitalAllocationPage from './pages/CapitalAllocationPage'
import EmergingMarketsOpsPage from './pages/EmergingMarketsOpsPage'
import TradeMonitorPage from './pages/TradeMonitorPage'
import SettingsPage from './pages/SettingsPage'
import { FXTrendLayerPage, EquitiesMacroLayerPage } from './pages/LayerModulePage'
import BriefExtensionModulePage from './pages/BriefExtensionModulePage'
import { briefExtensionModules } from './data/modules'

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary antialiased">
      <Navbar />
      <MainframeShell />
      {children ?? <Outlet />}
    </div>
  )
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<AdminRoute><Layout /></AdminRoute>}>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/data" element={<DataHubPage />} />
        <Route path="/data/raw" element={<DataPage />} />
        <Route path="/data/coverage-matrix" element={<CoverageMatrixPage />} />
        <Route path="/data/history" element={<HistoryPage />} />
        <Route path="/data/history/:sourceId" element={<HistorySeriesPage />} />
        <Route path="/data/economic-calendar" element={<EconomicCalendarPage />} />
        <Route path="/data/notifications" element={<NotificationsPage />} />
      </Route>

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/general" element={<GeneralPage />} />
        <Route path="/world-view" element={<WorldViewOpsPage />} />
        <Route path="/endogenous" element={<EndogenousOpsPage />} />
        <Route path="/model-inputs" element={<ModelInputsPage />} />
        <Route path="/endogenous/zscores" element={<ModelInputsPage />} />
        <Route path="/endogenous/betas" element={<EndogenousBetasPage />} />
        <Route path="/exogenous/operativa" element={<ExogenousOpsPage />} />
        <Route path="/timing/operativa" element={<TimingOpsPage />} />
        <Route path="/risk/operativa" element={<RiskOpsPage />} />
        <Route path="/execution/operativa" element={<ExecutionOpsPage />} />
        <Route path="/journal" element={<JournalPage />} />
        <Route path="/performance" element={<PerformancePage />} />
        <Route path="/backtest" element={<BacktestPage />} />
        <Route path="/scenario-library" element={<ScenarioLibraryPage />} />
        <Route path="/capital-allocation" element={<CapitalAllocationPage />} />
        <Route path="/emerging-markets" element={<EmergingMarketsOpsPage />} />
        <Route path="/trade" element={<TradeMonitorPage />} />
        <Route path="/fx-trend-layer" element={<FXTrendLayerPage />} />
        <Route path="/equities-macro-layer" element={<EquitiesMacroLayerPage />} />
        {briefExtensionModules.map((module) => (
          <Route
            key={module.id}
            path={module.route}
            element={<BriefExtensionModulePage moduleId={module.id} />}
          />
        ))}
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}
