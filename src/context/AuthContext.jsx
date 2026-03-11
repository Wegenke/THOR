import { createContext, useContext, useEffect, useState } from "react";
import { getSession, logout as apiLogout } from "../api/auth";

const AuthContext = createContext(null)

export function AuthProvider({children}){
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    getSession()
      .then(setUser)
      .catch(()=> setUser(null))
      .finally(()=> setLoading(false))
  },[])

  const login = (userData) => setUser(userData)

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{user, login, logout, loading}}>
      {children}
    </AuthContext.Provider>

  )
}

export const useAuth = () => useContext(AuthContext)