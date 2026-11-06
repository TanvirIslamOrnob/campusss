export default function IconButton({ icon: Icon, label, active, ...props }) {
  return (
    <button {...props} className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm hover:bg-mist dark:hover:bg-white/10 ${active ? 'font-semibold text-volt-600 dark:text-volt-400' : 'text-slate-500 dark:text-slate-400'}`}>
      <Icon className={`h-4 w-4 ${active ? 'fill-current' : ''}`} aria-hidden />{label}
    </button>
  );
}
