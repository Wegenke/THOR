import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from './context/AuthContext'
import { KboardProvider } from './context/KboardContext'
import VirtualKeyboard from './components/VirtualKeyboard'
import LoginView from './views/LoginView'
import ParentView from './views/ParentView'
import ChildView from './views/ChildView'

const queryClient = new QueryClient()

function AppShell(){
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <LoginView />
  if (user.role === 'child') return <ChildView />
  if (user.role === 'parent') return <ParentView />
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