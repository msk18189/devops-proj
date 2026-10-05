import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User } from '../types/index.ts';
import { authService, LoginPayload, RegisterPayload } from '../services/authService.ts';
import { storage } from '../utils/storage.ts';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => storage.getUser<User>());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = storage.getToken();
    if (token) {
      authService.getCurrentUser()
        .then(userData => setUser(userData))
        .catch(() => {
          storage.clearToken();
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (payload: LoginPayload) => {
    const data = await authService.login(payload);
    setUser(data.user);
  };

  const register = async (payload: RegisterPayload) => {
    await authService.register(payload);
    await login({ email: payload.email, password: payload.password });
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
