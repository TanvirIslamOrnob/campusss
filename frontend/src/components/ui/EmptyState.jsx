export default function EmptyState({ icon: Icon, title, hint }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-volt-500" aria-hidden />}
      <p className="font-semibold">{title}</p>
      {hint && <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  );
}
