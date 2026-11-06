export const ghostBtn = 'rounded-xl border border-mist px-3 py-1.5 text-sm font-semibold hover:bg-mist dark:border-white/10 dark:hover:bg-white/10';
export const dangerBtn = 'rounded-xl border border-rose-300 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/10';
export const statusTone = s => ({ ACTIVE: 'green', PENDING: 'amber', SUSPENDED: 'red', INVESTIGATING: 'amber', RESOLVED: 'green', REJECTED: 'gray' }[s] || 'gray');
export const fmt = iso => new Date(iso).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
