import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Field, Input, Message } from '../components/ui/Form.jsx';

function Shell({ title, subtitle, children }) {
  return (
    <div className="grid min-h-screen place-items-center bg-navy-950 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-navy-900 dark:text-slate-100 sm:p-8">
        <p className="text-xl font-extrabold tracking-tight">CAMPUS<span className="text-volt-500">X</span></p>
        <h1 className="mt-4 text-2xl font-bold">{title}</h1>
        <p className="mb-5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  );
}

/** Shared submit logic: busy flag + error text. */
function useSubmit(fn) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async e => {
    e.preventDefault(); setBusy(true); setError('');
    try { await fn(); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return { busy, error, setError, submit };
}
const Submit = ({ busy, children }) => <button className="btn-primary w-full justify-center disabled:opacity-60" disabled={busy}>{busy ? 'Please wait…' : children}</button>;
const linkCls = 'font-semibold text-volt-600 hover:underline dark:text-volt-400';

export function Login() {
  const { login } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ email: '', password: '' });
  const { busy, error, submit } = useSubmit(async () => { await login(f.email, f.password); nav('/'); });
  return (
    <Shell title="Welcome back" subtitle="Log in with your university email.">
      <form onSubmit={submit} className="space-y-4">
        <Message>{error}</Message>
        <Field label="Email"><Input type="email" required autoComplete="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Password"><Input type="password" required autoComplete="current-password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /></Field>
        <Submit busy={busy}>Log in</Submit>
      </form>
      <p className="text-sm"><Link to="/forgot-password" className={linkCls}>Forgot password?</Link></p>
      <p className="text-xs text-slate-500 dark:text-slate-400">Accounts are created by campus administration. Use the email and temporary password they gave you.</p>
    </Shell>
  );
}

/** Shown right after login when an admin issued a temporary password; also reachable from the profile page. */
export function ChangePassword() {
  const { user, setUser, logout } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const { busy, error, submit } = useSubmit(async () => {
    if (f.newPassword !== f.confirm) throw new Error('The new passwords do not match.');
    await api.changePassword({ currentPassword: f.currentPassword, newPassword: f.newPassword });
    setUser(await api.me()); nav('/');
  });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  return (
    <Shell title="Change your password" subtitle={user?.mustChangePassword ? 'Your account was created by an administrator. Choose your own password to continue.' : 'Choose a new password for your account.'}>
      <form onSubmit={submit} className="space-y-4">
        <Message>{error}</Message>
        <Field label={user?.mustChangePassword ? 'Temporary password from your admin' : 'Current password'}><Input type="password" required autoComplete="current-password" value={f.currentPassword} onChange={set('currentPassword')} /></Field>
        <Field label="New password (8+ characters)"><Input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.newPassword} onChange={set('newPassword')} /></Field>
        <Field label="Confirm new password"><Input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={f.confirm} onChange={set('confirm')} /></Field>
        <Submit busy={busy}>Update password</Submit>
      </form>
      {user?.mustChangePassword ? <button type="button" className={linkCls} onClick={() => { logout(); nav('/login'); }}>Log out</button> : <Link to="/profile" className={linkCls}>Back to profile</Link>}
    </Shell>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams(); const ran = useRef(false);
  const [state, setState] = useState({ status: 'loading', message: '' });
  useEffect(() => {
    if (ran.current) return; ran.current = true; // tokens are single-use: don't verify twice
    api.verifyEmail(params.get('token') || '').then(() => setState({ status: 'ok' })).catch(e => setState({ status: 'error', message: e.message }));
  }, [params]);
  return (
    <Shell title="Email verification" subtitle="">
      {state.status === 'loading' && <p className="text-sm">Verifying…</p>}
      {state.status === 'ok' && <Message kind="ok">Your email is verified. You can log in now.</Message>}
      {state.status === 'error' && <Message>{state.message}</Message>}
      <Link to="/login" className={linkCls}>Go to login</Link>
    </Shell>
  );
}

export function ForgotPassword() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false);
  const { busy, error, submit } = useSubmit(async () => { await api.forgotPassword(email); setSent(true); });
  return (
    <Shell title="Reset your password" subtitle="Enter your email and we'll send a reset link.">
      {sent ? <Message kind="ok">If that email is registered, a reset link is on its way. It expires in 1 hour.</Message> : (
        <form onSubmit={submit} className="space-y-4">
          <Message>{error}</Message>
          <Field label="Email"><Input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></Field>
          <Submit busy={busy}>Send reset link</Submit>
        </form>
      )}
      <Link to="/login" className={linkCls}>Back to login</Link>
    </Shell>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams(); const [password, setPassword] = useState(''); const [done, setDone] = useState(false);
  const { busy, error, submit } = useSubmit(async () => { await api.resetPassword(params.get('token') || '', password); setDone(true); });
  return (
    <Shell title="Choose a new password" subtitle="Use at least 8 characters.">
      {done ? <Message kind="ok">Password updated. You can log in now.</Message> : (
        <form onSubmit={submit} className="space-y-4">
          <Message>{error}</Message>
          <Field label="New password"><Input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
          <Submit busy={busy}>Update password</Submit>
        </form>
      )}
      <Link to="/login" className={linkCls}>Go to login</Link>
    </Shell>
  );
}
