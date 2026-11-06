export function Field({ label, children }) {
  return <label className="block text-sm font-semibold">{label}<div className="mt-1 font-normal">{children}</div></label>;
}
export const inputCls = 'w-full rounded-xl border border-mist bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-navy-950';
export const Input = props => <input {...props} className={inputCls} />;
export const Message = ({ kind = 'error', children }) => children ? (
  <p role={kind === 'error' ? 'alert' : 'status'} className={`rounded-xl px-3 py-2 text-sm ${kind === 'error' ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>{children}</p>
) : null;
