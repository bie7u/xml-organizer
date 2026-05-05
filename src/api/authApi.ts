import type { AuthUser, UserRole } from '../types';

const USERS_KEY = 'xml_organizer_users';

// Internal stored record (includes hashed-ish password for POC)
interface StoredUser extends AuthUser {
  password: string;
}

const AVATAR_COLORS = [
  '#4f86c6', '#e07b39', '#5cb85c', '#9b59b6',
  '#e74c3c', '#1abc9c', '#f39c12', '#3498db',
];

/** Seed the user list on first run */
function ensureSeed(): void {
  if (localStorage.getItem(USERS_KEY)) return;
  const seed: StoredUser[] = [
    { id: 'u-admin', username: 'admin', password: 'admin', role: 'admin', color: '#e05555' },
    { id: 'u-alice', username: 'Alice', password: 'alice', role: 'user', color: '#4f86c6' },
    { id: 'u-bob',   username: 'Bob',   password: 'bob',   role: 'user', color: '#e07b39' },
    { id: 'u-carol', username: 'Carol', password: 'carol', role: 'user', color: '#5cb85c' },
  ];
  localStorage.setItem(USERS_KEY, JSON.stringify(seed));
}

function readUsers(): StoredUser[] {
  ensureSeed();
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)!) as StoredUser[];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

/** Attempt login. Returns the AuthUser (without password) or null. */
export function loginUser(username: string, password: string): AuthUser | null {
  const users = readUsers();
  const match = users.find(
    (u) =>
      u.username.toLowerCase() === username.toLowerCase() &&
      u.password === password,
  );
  if (!match) return null;
  const { password: _pw, ...authUser } = match;
  return authUser;
}

/** List all users (strip passwords). */
export function listUsers(): AuthUser[] {
  return readUsers().map(({ password: _pw, ...u }) => u);
}

/** Create a new user. Returns null if username is already taken. */
export function createUser(
  username: string,
  password: string,
  role: UserRole,
): AuthUser | null {
  const users = readUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return null; // duplicate
  }
  const color = AVATAR_COLORS[users.length % AVATAR_COLORS.length];
  const newUser: StoredUser = {
    id: `u-${Date.now()}`,
    username,
    password,
    role,
    color,
  };
  writeUsers([...users, newUser]);
  const { password: _pw, ...authUser } = newUser;
  return authUser;
}

/** Delete a user by id. Returns false if the user is the last admin. */
export function deleteUser(id: string): boolean {
  const users = readUsers();
  const target = users.find((u) => u.id === id);
  if (!target) return false;
  if (target.role === 'admin' && users.filter((u) => u.role === 'admin').length <= 1) {
    return false; // can't delete the last admin
  }
  writeUsers(users.filter((u) => u.id !== id));
  return true;
}
