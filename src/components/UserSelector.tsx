import React from 'react';
import { SIMULATED_USERS } from '../types';
import { useStore } from '../store/useStore';

export const UserSelector: React.FC = () => {
  const currentUser = useStore((s) => s.currentUser);
  const setCurrentUser = useStore((s) => s.setCurrentUser);

  const current = SIMULATED_USERS.find((u) => u.name === currentUser);

  return (
    <div className="user-selector">
      <span className="user-label">Active user:</span>
      {SIMULATED_USERS.map((user) => (
        <button
          key={user.id}
          className={`user-btn${currentUser === user.name ? ' active' : ''}`}
          style={{ '--user-color': user.color } as React.CSSProperties}
          onClick={() => setCurrentUser(user.name)}
          title={`Switch to ${user.name}`}
        >
          <span
            className="user-avatar"
            style={{ backgroundColor: user.color }}
          >
            {user.name[0]}
          </span>
          {user.name}
        </button>
      ))}
      {current && (
        <span className="user-indicator" style={{ color: current.color }}>
          ● editing as {current.name}
        </span>
      )}
    </div>
  );
};
