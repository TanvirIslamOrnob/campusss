const TONES = {
  purple: 'bg-volt-500/10 text-volt-600 dark:text-volt-400', green: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-700 dark:text-amber-400', gray: 'bg-mist text-slate-600 dark:bg-white/10 dark:text-slate-300', red: 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
};
export default function Badge({ tone = 'gray', children }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}
