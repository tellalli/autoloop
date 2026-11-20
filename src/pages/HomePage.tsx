import { Link } from 'react-router-dom';
import { Brand } from '@/components/Brand';
import { useAuth } from '@/auth/auth.context';

export function HomePage() {
  const { user } = useAuth();
  return (
    <div className="public-page">
      <header className="site-header">
        <Brand />
        <nav aria-label="Main navigation">
          <Link className="button button-small" to={user ? '/app' : '/login'}>
            {user ? 'Open AutoLoop' : 'Sign in'}
          </Link>
        </nav>
      </header>
      <main className="hero">
        <p className="eyebrow">From customer request to release</p>
        <h1>A clear path from<br />idea to shipped.</h1>
        <p className="hero-description">
          Turn a customer request into a released feature, with people deciding
          what gets built and what ships.
        </p>
        <Link className="button" to={user ? '/app' : '/login'}>
          {user ? 'Open AutoLoop' : 'Get started'}
        </Link>
      </main>
      <footer className="site-footer">© {new Date().getFullYear()} AutoLoop</footer>
    </div>
  );
}
