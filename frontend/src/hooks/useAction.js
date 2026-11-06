import { useState } from 'react';

/** Wraps button handlers: shows the server's error message, or a short success note. */
export function useAction() {
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const flash = m => { setNote(m); setTimeout(() => setNote(''), 2500); };
  const run = fn => async (...a) => {
    setErr('');
    try { await fn(...a); } catch (e) { if (e.name !== 'AbortError') setErr(e.message); }
  };
  return { err, note, flash, run };
}
