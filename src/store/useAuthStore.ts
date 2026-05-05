import { create } from 'zustand';
import type { AuthUser, UserRole } from '../types';
import { loginUser, listUsers, createUser, deleteUser } from '../api/authApi';

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

  // Actions
  login: (username: string, password: string) => boolean;
  logout: () => void;
  loadUsers: () => void;
  addUser: (username: string, password: string, role: UserRole) => string | null;
  removeUser: (id: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: readSession(),
  users: [],
  loginError: null,

  login: (username, password) => {
    const user = loginUser(username, password);
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
    set({ currentUser: null });
  },

  loadUsers: () => {
    set({ users: listUsers() });
  },

  /** Returns an error string on failure, null on success. */
  addUser: (username, password, role) => {
    if (!username.trim()) return 'Nazwa użytkownika nie może być pusta.';
    if (!password.trim()) return 'Hasło nie może być puste.';
    const result = createUser(username.trim(), password, role);
    if (!result) return `Użytkownik "${username}" już istnieje.`;
    // Refresh users list
    get().loadUsers();
    return null;
  },

  removeUser: (id) => {
    const ok = deleteUser(id);
    if (ok) get().loadUsers();
    return ok;
  },
}));
