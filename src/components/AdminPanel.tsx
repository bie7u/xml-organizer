import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types';

interface Props {
  onClose: () => void;
}

export const AdminPanel: React.FC<Props> = ({ onClose }) => {
  const users = useAuthStore((s) => s.users);
  const currentUser = useAuthStore((s) => s.currentUser);
  const loadUsers = useAuthStore((s) => s.loadUsers);
  const addUser = useAuthStore((s) => s.addUser);
  const removeUser = useAuthStore((s) => s.removeUser);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAdd = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      setFormSuccess(null);
      const err = await addUser(newUsername, newPassword, newRole);
      if (err) {
        setFormError(err);
      } else {
        setFormSuccess(`Użytkownik "${newUsername}" został dodany.`);
        setNewUsername('');
        setNewPassword('');
        setNewRole('user');
      }
    },
    [addUser, newUsername, newPassword, newRole],
  );

  const handleRemove = useCallback(
    async (id: string, username: string) => {
      if (!window.confirm(`Usunąć użytkownika "${username}"?`)) return;
      const ok = await removeUser(id);
      if (!ok) {
        alert('Nie można usunąć ostatniego administratora.');
      }
    },
    [removeUser],
  );

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Panel administratora">
      <div className="admin-panel">
        <div className="admin-header">
          <h2 className="admin-title">Panel administratora</h2>
          <button className="btn-close" onClick={onClose} title="Zamknij">✕</button>
        </div>

        {/* User list */}
        <section className="admin-section">
          <h3 className="admin-section-title">Użytkownicy ({users.length})</h3>
          <table className="users-table">
            <thead>
              <tr>
                <th>Użytkownik</th>
                <th>Rola</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.id === currentUser?.id ? 'users-table-self' : ''}>
                  <td>
                    <span className="user-avatar-sm" style={{ backgroundColor: u.color }}>
                      {u.username[0].toUpperCase()}
                    </span>
                    {u.username}
                    {u.id === currentUser?.id && <span className="you-badge">ty</span>}
                  </td>
                  <td>
                    <span className={`role-badge role-${u.role}`}>{u.role}</span>
                  </td>
                  <td>
                    {u.id !== currentUser?.id && (
                      <button
                        className="btn-danger-sm"
                        title={`Usuń ${u.username}`}
                        onClick={() => handleRemove(u.id, u.username)}
                      >
                        Usuń
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Add user form */}
        <section className="admin-section">
          <h3 className="admin-section-title">Dodaj użytkownika</h3>
          <form className="add-user-form" onSubmit={handleAdd}>
            <div className="add-user-fields">
              <input
                type="text"
                placeholder="Nazwa użytkownika"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                autoComplete="off"
              />
              <input
                type="password"
                placeholder="Hasło"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}>
                <option value="user">Użytkownik</option>
                <option value="admin">Admin</option>
              </select>
              <button className="btn-primary" type="submit">Dodaj</button>
            </div>
            {formError && <p className="form-error">{formError}</p>}
            {formSuccess && <p className="form-success">{formSuccess}</p>}
          </form>
        </section>
      </div>
    </div>
  );
};
