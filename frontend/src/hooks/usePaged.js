import { useEffect, useState } from 'react';

/** Loads page 0 whenever `deps` change, then appends more pages on demand. */
export function usePaged(fetchPage, deps, size = 10) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setStatus('loading'); setError('');
    fetchPage(0).then(r => { if (live) { setItems(r); setPage(0); setMore(r.length === size); setStatus('ready'); } })
      .catch(e => { if (live) { setError(e.message); setStatus('error'); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const loadMore = async () => {
    try { const r = await fetchPage(page + 1); setItems(p => [...p, ...r]); setPage(page + 1); setMore(r.length === size); } catch (e) { setError(e.message); }
  };
  return { items, setItems, status, error, more, loadMore };
}
