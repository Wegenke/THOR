import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { KboardProvider } from './context/KboardContext'
import VirtualKeyboard from './components/VirtualKeyboard'
import useIdleTimer from './hooks/useIdleTimer'
import ReconnectingBanner from './components/ReconnectingBanner'
import LoginView from './views/LoginView'
import ParentView from './views/ParentView'
import ChildView from './views/ChildView'

const queryClient = new QueryClient()

function AuthenticatedShell({ children }) {
  useIdleTimer()
  return (
    <>
      <ReconnectingBanner />
      {children}
    </>
  )
}

function AppShell(){
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <LoginView />
  if (user.role === 'child') return <AuthenticatedShell><ChildView /></AuthenticatedShell>
  if (user.role === 'parent') return <AuthenticatedShell><ParentView /></AuthenticatedShell>
}

export default function App(){
  return(
    <QueryClientProvider client={queryClient}>
      <KboardProvider>
        <AuthProvider>
          <AppShell />
          <VirtualKeyboard />
        </AuthProvider>
      </KboardProvider>
    </QueryClientProvider>
  )
}