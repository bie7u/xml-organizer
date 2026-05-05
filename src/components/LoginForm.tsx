import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';

export const LoginForm: React.FC = () => {
  const login = useAuthStore((s) => s.login);
  const loginError = useAuthStore((s) => s.loginError);
  const loginLoading = useAuthStore((s) => s.loginLoading);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await login(username, password);
    },
    [login, username, password],
  );

  return (
    <div className="login-backdrop">
      <form className="login-card" onSubmit={handleSubmit} noValidate>
        <div className="login-logo">
          <span className="logo">{'</>'}</span>
        </div>
        <h1 className="login-title">XML Organizer</h1>
        <p className="login-subtitle">Zaloguj się, aby kontynuować</p>

        <div className="login-field">
          <label htmlFor="login-username">Nazwa użytkownika</label>
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="np. admin"
            disabled={loginLoading}
          />
        </div>

        <div className="login-field">
          <label htmlFor="login-password">Hasło</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            disabled={loginLoading}
          />
        </div>

        {loginError && <p className="login-error">{loginError}</p>}

        <button className="btn-primary login-submit" type="submit" disabled={loginLoading}>
          {loginLoading ? 'Logowanie…' : 'Zaloguj się'}
        </button>

        <p className="login-hint">
          Domyślne konto admin: <code>admin</code> / <code>admin</code>
        </p>
      </form>
    </div>
  );
};
