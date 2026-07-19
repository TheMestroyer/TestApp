import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | success | error
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await login(email, password);
      setStatus('success');
      // GuestRoute redirects to / as soon as the user is set — no manual navigate needed
      // (and a delayed one here would be a stale timer waiting to fire on whatever page
      // the user has since moved to).
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Could not log in.');
      setSubmitting(false);
      setTimeout(() => setStatus('idle'), 900);
    }
  }

  return (
    <div className="authScreen">
      <div className={`authGlowWrap ${status}`}>
        <div className="authGlow" />
        <div className="authCard">
          <div className="authBrand">
            <span className="authBrandDot" />
            <span className="authBrandName">Study Test App</span>
          </div>
          <h1 className="authTitle">Welcome back</h1>
          <p className="authSubtitle">Log in to pick up your tests where you left off.</p>

          <form className="authForm" onSubmit={handleSubmit}>
            {error && <div className="authError">{error}</div>}
            <div className="formField">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="field-input"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="formField">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="field-input"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-block" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <div className="authSwitch">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
