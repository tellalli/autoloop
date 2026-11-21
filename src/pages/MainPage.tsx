import { useAuth } from '@/auth/auth.context';
import { RequestsWorkspace } from '@/features/requests/RequestsWorkspace';

export function MainPage() {
  const { user } = useAuth();
  return user && <RequestsWorkspace key={JSON.stringify([user.accountId, user.id || user.username])} user={user} />;
}
