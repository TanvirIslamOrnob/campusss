import { useRef, useState } from 'react';
import { ImagePlus } from 'lucide-react';
import { api } from '../services/api.js';
import { Message, inputCls } from './ui/Form.jsx';

export default function PostComposer({ onCreated }) {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef();

  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      onCreated(await api.createPost(content, file));
      setContent(''); setFile(null); if (fileRef.current) fileRef.current.value = '';
    } catch (e2) { setErr(e2.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="card space-y-3">
      <textarea rows={3} maxLength={2000} className={inputCls} value={content} onChange={e => setContent(e.target.value)} placeholder="Share something with your campus…" aria-label="New post" />
      <Message>{err}</Message>
      <div className="flex items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-volt-600 dark:text-volt-400">
          <ImagePlus className="h-4 w-4" aria-hidden />{file ? file.name : 'Add image'}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={e => setFile(e.target.files[0] || null)} />
        </label>
        <button className="btn-primary ml-auto disabled:opacity-60" disabled={busy || !content.trim()}>{busy ? 'Posting…' : 'Post'}</button>
      </div>
    </form>
  );
}
