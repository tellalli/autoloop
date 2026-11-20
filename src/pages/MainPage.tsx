import { LogOut } from 'lucide-react';
import { useAuth } from '@/auth/auth.context';
import { Brand } from '@/components/Brand';
import { RequestsWorkspace } from '@/features/requests/RequestsWorkspace';

export function MainPage() {
  const { user, logout } = useAuth();
  return (
    <div className="app-page">
      <header className="app-header">
        <Brand />
        <div className="user-menu">
          <span className="user-name">{user?.name || user?.username}</span>
          <button className="button button-outline button-small" onClick={logout}>
            <LogOut size={16} aria-hidden="true" />Sign out
          </button>
        </div>
      </header>
      <main className="workspace">
        {user && <RequestsWorkspace key={JSON.stringify([user.accountId, user.id || user.username])} user={user} />}
      </main>
    </div>
  );
}
