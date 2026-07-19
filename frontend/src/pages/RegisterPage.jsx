import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | success | error
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setStatus('error');
      setError('Password must be at least 8 characters.');
      setTimeout(() => setStatus('idle'), 900);
      return;
    }
    if (password !== confirmPassword) {
      setStatus('error');
      setError('Passwords do not match.');
      setTimeout(() => setStatus('idle'), 900);
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password, displayName);
      setStatus('success');
      // GuestRoute redirects to / as soon as the user is set — no manual navigate needed
      // (and a delayed one here would be a stale timer waiting to fire on whatever page
      // the user has since moved to).
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Could not create your account.');
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
          <h1 className="authTitle">Create your account</h1>
          <p className="authSubtitle">Your tests and progress get saved to your account.</p>

          <form className="authForm" onSubmit={handleSubmit}>
            {error && <div className="authError">{error}</div>}
            <div className="formField">
              <label htmlFor="displayName">Name (optional)</label>
              <input
                id="displayName"
                type="text"
                className="field-input"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
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
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="formField">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input
                id="confirmPassword"
                type="password"
                className="field-input"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-block" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="authSwitch">
            Already have an account? <Link to="/login">Log in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
