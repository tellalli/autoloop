import { useAuth } from '@/auth/auth.context';

export function DashboardPage() {
  const { user } = useAuth();
  return user && <h1>Welcome, {user.name || user.username}.</h1>;
}
