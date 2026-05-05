import React from 'react';
import { useStore } from '../store/useStore';
import { useAuthStore } from '../store/useAuthStore';

export const PresenceBar: React.FC = () => {
  const viewers = useStore((s) => s.viewers);
  const currentUser = useAuthStore((s) => s.currentUser);

  if (viewers.length === 0) return null;

  return (
    <div className="presence-bar" title="Kto teraz jest przy tym dokumencie">
      {viewers.map((v) => {
        const isMe = v.username === currentUser?.username;
        return (
          <div
            key={v.username}
            className={`presence-user${v.status === 'editing' ? ' presence-editing' : ''}`}
            title={`${v.username} – ${v.status === 'editing' ? 'edytuje' : 'przegląda'}`}
          >
            <span
              className="presence-avatar"
              style={{ backgroundColor: v.color }}
            >
              {v.username[0].toUpperCase()}
            </span>
            <span className="presence-name">
              {isMe ? 'Ty' : v.username}
            </span>
            <span className={`presence-status${v.status === 'editing' ? ' presence-status-editing' : ''}`}>
              {v.status === 'editing' ? 'edytuje' : 'przegląda'}
            </span>
          </div>
        );
      })}
    </div>
  );
};
