import { LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/auth/auth.context';
import { Brand } from '@/components/Brand';

export function AppLayout() {
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
      <div className="app-body">
        <nav className="app-nav" aria-label="Workspace">
          <NavLink to="/app" end>Requests</NavLink>
          <NavLink to="/app/dashboard">Dashboard</NavLink>
        </nav>
        <main className="workspace"><Outlet /></main>
      </div>
    </div>
  );
}
