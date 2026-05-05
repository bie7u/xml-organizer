import { create } from 'zustand';
import type { AuthUser, UserRole } from '../types';
import { loginUser, listUsers, createUser, deleteUser } from '../api/serverAuthApi';
import { setToken } from '../api/token';

const SESSION_KEY = 'xml_organizer_session';

function readSession(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

function writeSession(user: AuthUser | null): void {
  if (user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

interface AuthState {
  currentUser: AuthUser | null;
  users: AuthUser[];
  loginError: string | null;
  loginLoading: boolean;

  // Actions
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loadUsers: () => Promise<void>;
  addUser: (username: string, password: string, role: UserRole) => Promise<string | null>;
  removeUser: (id: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: readSession(),
  users: [],
  loginError: null,
  loginLoading: false,

  login: async (username, password) => {
    set({ loginLoading: true, loginError: null });
    const user = await loginUser(username, password);
    set({ loginLoading: false });
    if (!user) {
      set({ loginError: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
      return false;
    }
    writeSession(user);
    set({ currentUser: user, loginError: null });
    return true;
  },

  logout: () => {
    writeSession(null);
    setToken(null);
    set({ currentUser: null });
  },

  loadUsers: async () => {
    try {
      const users = await listUsers();
      set({ users });
    } catch {
      // ignore (e.g. if token expired)
    }
  },

  /** Returns an error string on failure, null on success. */
  addUser: async (username, password, role) => {
    if (!username.trim()) return 'Nazwa użytkownika nie może być pusta.';
    if (!password.trim()) return 'Hasło nie może być puste.';
    try {
      await createUser(username.trim(), password, role);
      await get().loadUsers();
      return null;
    } catch (e) {
      return (e as Error).message;
    }
  },

  removeUser: async (id) => {
    try {
      await deleteUser(id);
      await get().loadUsers();
      return true;
    } catch {
      return false;
    }
  },
}));
