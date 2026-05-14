import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ModelDataProvider } from './store/ModelDataContext'
import AppRoutes from './AppRoutes'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ModelDataProvider>
          <AppRoutes />
        </ModelDataProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
