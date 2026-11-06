import { useLocation } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { NAV } from '../components/layout/nav.js';
import EmptyState from '../components/ui/EmptyState.jsx';

export default function ComingSoon() {
  const item = NAV.find(n => n.to === useLocation().pathname);
  return (
    <div className="card">
      <EmptyState icon={Hammer} title={`${item?.label ?? 'This page'} is not built yet`} hint={item ? `Planned for Phase ${item.phase}.` : 'This route does not exist.'} />
    </div>
  );
}
