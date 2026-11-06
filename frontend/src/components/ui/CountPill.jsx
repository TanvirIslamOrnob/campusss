export default function CountPill({ n, className = '' }) {
  if (!n) return null;
  return <span className={`inline-grid min-w-[1.25rem] place-items-center rounded-full bg-rose-500 px-1.5 text-xs font-bold leading-5 text-white ${className}`} aria-label={`${n} unread`}>{n > 99 ? '99+' : n}</span>;
}
