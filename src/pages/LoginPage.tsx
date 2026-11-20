import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Brand } from '@/components/Brand';
import { useAuth } from '@/auth/auth.context';

export function LoginPage() {
  const auth = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (auth.user) return <Navigate to="/app" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    setPending(true);
    try {
      await auth.login(username, password);
      setPassword('');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to sign in. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-panel">
        <header><Brand /></header>
        <main className="login-main">
          <div className="login-form-container">
            <p className="eyebrow">Your next chapter starts here</p>
            <h1>Welcome back.</h1>
            <p className="muted">Sign in to AutoLoop with your BeWhere account.</p>
            <form onSubmit={handleSubmit} aria-busy={pending}>
              <fieldset disabled={pending}>
                <div className="field">
                  <label htmlFor="username">Username</label>
                  <input id="username" name="username" type="text" autoComplete="username"
                    autoCapitalize="none" spellCheck={false} required value={username}
                    onChange={(event) => setUsername(event.target.value)} />
                </div>
                <div className="field">
                  <label htmlFor="password">Password</label>
                  <div className="password-input">
                    <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password" required value={password}
                      onChange={(event) => setPassword(event.target.value)} />
                    <button className="password-toggle" type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                    </button>
                  </div>
                </div>
                {error && <p className="error" role="alert">{error}</p>}
                <button className="button sign-in-button" type="submit">
                  {pending ? 'Signing in…' : 'Sign in'}
                </button>
              </fieldset>
            </form>
            <p className="login-help">Use your existing BeWhere username and password.</p>
            <Link className="back-link" to="/">Back to home</Link>
          </div>
        </main>
        <footer className="login-footer">© {new Date().getFullYear()} AutoLoop</footer>
      </div>
      <aside className="login-aside" aria-label="About AutoLoop">
        <p className="eyebrow">AutoLoop</p>
        <h2>Good ideas<br />deserve a<br />clear path.</h2>
        <p>From customer request to release.</p>
      </aside>
    </div>
  );
}
