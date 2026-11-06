import { useState } from 'react';
import { Flag, Heart, MessageCircle, Share2, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { timeAgo } from '../utils/time.js';
import Avatar from './ui/Avatar.jsx';
import { Message, inputCls } from './ui/Form.jsx';

export default function PostCard({ post, onChange, onDelete }) {
  const { user } = useAuth();
  const isStaff = user.role === 'MODERATOR' || user.role === 'SUPER_ADMIN';
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [note, setNote] = useState('');
  const flash = msg => { setNote(msg); setTimeout(() => setNote(''), 2500); };
  const run = fn => async () => {
    setErr('');
    try { await fn(); } catch (e) { if (e.name !== 'AbortError') setErr(e.message); }
  };

  const like = run(async () => { const r = await api.likePost(post.id); onChange({ ...post, liked: r.liked, likes: r.likes }); });
  const toggleComments = run(async () => { if (!open && comments === null) setComments(await api.comments(post.id)); setOpen(!open); });
  const send = e => {
    e.preventDefault();
    if (!text.trim()) return;
    run(async () => { const list = await api.addComment(post.id, text); setComments(list); setText(''); onChange({ ...post, comments: list.length }); })();
  };
  const share = run(async () => {
    const url = `${location.origin}/community#post-${post.id}`;
    if (navigator.share) await navigator.share({ title: 'CAMPUSX post', url });
    else { await navigator.clipboard.writeText(url); flash('Link copied'); }
  });
  const removeComment = id => run(async () => {
    if (!confirm('Delete this comment?')) return;
    const list = await api.deleteComment(post.id, id); setComments(list); onChange({ ...post, comments: list.length });
  })();
  const remove = run(async () => { if (!confirm('Delete this post?')) return; await api.deletePost(post.id); onDelete(post.id); });
  const report = run(async () => {
    const reason = prompt('Why are you reporting this post? (5+ characters)');
    if (!reason) return;
    await api.reportPost(post.id, reason); flash('Report sent to moderators');
  });

  const btn = 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-mist dark:text-slate-400 dark:hover:bg-white/10';
  return (
    <article id={`post-${post.id}`} className="card space-y-3">
      <header className="flex items-center gap-3">
        <Avatar name={post.authorName} url={post.authorAvatarUrl} />
        <div className="min-w-0 flex-1"><p className="truncate font-semibold">{post.authorName}</p><p className="text-xs text-slate-500 dark:text-slate-400">{timeAgo(post.createdAt)}</p></div>
        {(post.mine || isStaff) && <button onClick={remove} className={btn} aria-label="Delete post" title="Delete post"><Trash2 className="h-4 w-4" /></button>}
        {!post.mine && <button onClick={report} className={btn} aria-label="Report post" title="Report post"><Flag className="h-4 w-4" /></button>}
      </header>
      <p className="whitespace-pre-wrap break-words">{post.content}</p>
      {post.imageUrl && <img src={post.imageUrl} alt="Attached to the post" className="max-h-96 w-full rounded-xl object-cover" loading="lazy" />}
      <div className="flex flex-wrap items-center gap-1">
        <button onClick={like} className={`${btn} ${post.liked ? 'font-semibold text-volt-600 dark:text-volt-400' : ''}`} aria-pressed={post.liked}>
          <Heart className={`h-4 w-4 ${post.liked ? 'fill-current' : ''}`} />{post.likes}
        </button>
        <button onClick={toggleComments} className={btn} aria-expanded={open}><MessageCircle className="h-4 w-4" />{post.comments}</button>
        <button onClick={share} className={btn}><Share2 className="h-4 w-4" />Share</button>
        {note && <span role="status" className="ml-2 text-xs text-emerald-600 dark:text-emerald-400">{note}</span>}
      </div>
      <Message>{err}</Message>
      {open && (
        <div className="space-y-3 border-t border-mist pt-3 dark:border-white/10">
          {comments?.length === 0 && <p className="text-sm text-slate-500">No comments yet. Start the conversation.</p>}
          {comments?.map(c => (
            <div key={c.id} className="flex gap-2">
              <Avatar name={c.authorName} url={c.authorAvatarUrl} size={28} />
              <div className="min-w-0 text-sm"><span className="font-semibold">{c.authorName}</span> <span className="text-xs text-slate-500">{timeAgo(c.createdAt)}</span>
                <p className="whitespace-pre-wrap break-words">{c.content}</p></div>
              {(c.authorId === user.id || post.mine || isStaff) && (
                <button onClick={() => removeComment(c.id)} className={`${btn} ml-auto h-fit`} aria-label="Delete comment" title="Delete comment"><Trash2 className="h-3.5 w-3.5" /></button>
              )}
            </div>
          ))}
          <form onSubmit={send} className="flex gap-2">
            <input className={inputCls} value={text} maxLength={1000} onChange={e => setText(e.target.value)} placeholder="Write a comment" aria-label="Write a comment" />
            <button className="btn-primary">Comment</button>
          </form>
        </div>
      )}
    </article>
  );
}
