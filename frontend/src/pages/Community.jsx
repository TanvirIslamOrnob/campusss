import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquareText } from 'lucide-react';
import { api } from '../services/api.js';
import PostCard from '../components/PostCard.jsx';
import PostComposer from '../components/PostComposer.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import { Message } from '../components/ui/Form.jsx';

const PAGE = 10; // must match PostService.PAGE

export default function Community() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    setStatus('loading');
    api.posts(q, 0).then(r => { setPosts(r); setPage(0); setMore(r.length === PAGE); setStatus('ready'); })
      .catch(e => { setError(e.message); setStatus('error'); });
  }, [q]);

  useEffect(() => { // jump to a shared post if it is on the first page
    if (status === 'ready' && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [status]);

  const loadMore = async () => {
    try { const r = await api.posts(q, page + 1); setPosts(p => [...p, ...r]); setPage(page + 1); setMore(r.length === PAGE); } catch (e) { setError(e.message); }
  };
  const update = u => setPosts(p => p.map(x => (x.id === u.id ? u : x)));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-extrabold">Community</h1>
      <PostComposer onCreated={p => setPosts(prev => [p, ...prev])} />
      {q && <p className="text-sm">Showing posts matching “{q}”. <button className="font-semibold text-volt-600 dark:text-volt-400" onClick={() => setParams({})}>Clear search</button></p>}
      <Message>{error}</Message>
      {status === 'loading' && <p className="py-6 text-center text-sm">Loading posts…</p>}
      {status === 'ready' && posts.length === 0 && (
        <div className="card"><EmptyState icon={MessageSquareText} title={q ? 'No posts match your search' : 'No posts yet'} hint={q ? 'Try a different word.' : 'Be the first to post something for your campus.'} /></div>
      )}
      {posts.map(p => <PostCard key={p.id} post={p} onChange={update} onDelete={id => setPosts(prev => prev.filter(x => x.id !== id))} />)}
      {more && <button onClick={loadMore} className="btn-primary mx-auto">Load more</button>}
    </div>
  );
}
