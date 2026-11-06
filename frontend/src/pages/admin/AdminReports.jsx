import { useState } from 'react';
import { Flag } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAction } from '../../hooks/useAction.js';
import { usePaged } from '../../hooks/usePaged.js';
import { dangerBtn, fmt, ghostBtn, statusTone } from '../../components/admin/ui.jsx';
import Badge from '../../components/ui/Badge.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import ListState from '../../components/ui/ListState.jsx';
import { Message, inputCls } from '../../components/ui/Form.jsx';

function ReportCard({ r, onChange }) {
  const { err, run } = useAction();
  const closed = r.status === 'RESOLVED' || r.status === 'REJECTED';
  const set = status => run(async () => { await api.adminReportStatus(r.id, status); onChange({ ...r, status }); });
  const removeContent = run(async () => {
    if (!confirm('Remove the reported content and resolve this report? The author is notified.')) return;
    await api.adminRemoveReported(r.id); onChange({ ...r, status: 'RESOLVED', preview: r.preview });
  });
  return (
    <article className="card space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="purple">{r.targetType}</Badge><Badge tone={statusTone(r.status)}>{r.status}</Badge>
        <span className="ml-auto text-xs text-slate-500">{fmt(r.createdAt)}</span>
      </div>
      <p className="text-sm"><span className="font-semibold">Reported by {r.reporterName}:</span> {r.reason}</p>
      <p className="break-words rounded-xl bg-paper p-3 text-sm dark:bg-navy-950">{r.preview ?? <em className="text-slate-500">This content no longer exists.</em>}</p>
      {r.handledBy && <p className="text-xs text-slate-500">Handled by {r.handledBy}</p>}
      {!closed && (
        <div className="flex flex-wrap gap-2">
          {r.status === 'PENDING' && <button className={ghostBtn} onClick={set('INVESTIGATING')}>Investigate</button>}
          {r.targetType !== 'USER' && r.preview != null && <button className={dangerBtn} onClick={removeContent}>Remove content &amp; resolve</button>}
          <button className={ghostBtn} onClick={set('RESOLVED')}>Resolve</button>
          <button className={ghostBtn} onClick={set('REJECTED')}>Reject as invalid</button>
        </div>
      )}
      <Message>{err}</Message>
    </article>
  );
}

export default function AdminReports() {
  const [f, setF] = useState({ status: 'PENDING', type: '' });
  const { items, setItems, status, error, more, loadMore } = usePaged(p => api.adminReports({ ...f, page: p }), [f]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-extrabold">Reports</h1>
      <div className="card flex flex-wrap gap-3">
        <select className={`${inputCls} w-auto`} aria-label="Status" value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="">All statuses</option><option value="PENDING">Pending</option><option value="INVESTIGATING">Investigating</option><option value="RESOLVED">Resolved</option><option value="REJECTED">Rejected</option></select>
        <select className={`${inputCls} w-auto`} aria-label="Type" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="">All types</option><option value="POST">Posts</option><option value="MATERIAL">Study files</option><option value="LISTING">Listings</option></select>
      </div>
      <ListState status={status} error={error} count={items.length} more={more} onMore={loadMore} empty={<EmptyState icon={Flag} title="No reports here" hint="Nothing needs review with these filters." />}>
        {items.map(r => <ReportCard key={r.id} r={r} onChange={u => setItems(p => p.map(x => (x.id === u.id ? u : x)))} />)}
      </ListState>
    </div>
  );
}
