// Auth API backed by the real HTTP backend.
// Mirrors the synchronous authApi.ts interface but uses async HTTP calls.
import { apiFetch } from './apiFetch';
import { setToken } from './token';
import type { AuthUser, UserRole } from '../types';

export async function loginUser(
  username: string,
  password: string,
): Promise<AuthUser | null> {
  try {
    const data = await apiFetch<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(data.token);
    return data.user;
  } catch {
    return null;
  }
}

export async function listUsers(): Promise<AuthUser[]> {
  return apiFetch<AuthUser[]>('/users');
}

/** Throws with a human-readable message on failure (duplicate, etc.). */
export async function createUser(
  username: string,
  password: string,
  role: UserRole,
): Promise<AuthUser> {
  return apiFetch<AuthUser>('/users', {
    method: 'POST',
    body: JSON.stringify({ username, password, role }),
  });
}

/** Throws with a human-readable message if deletion is not allowed. */
export async function deleteUser(id: string): Promise<void> {
  await apiFetch<void>(`/users/${id}`, { method: 'DELETE' });
}
