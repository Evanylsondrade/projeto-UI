import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  icon: LucideIcon;
  color: string;
  count?: number;
  onClick: () => void;
}

export function DashboardCard({ title, icon: Icon, color, count, onClick }: DashboardCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-left"
    >
      <div 
        className="w-14 h-14 rounded-xl flex items-center justify-center mb-3 mx-auto"
        style={{ backgroundColor: color }}
      >
        <Icon size={28} className="text-white" strokeWidth={2} />
      </div>
      <div className="text-center">
        <div className="font-semibold" style={{ color: '#333333' }}>{title}</div>
        {count !== undefined && (
          <div className="text-sm mt-1" style={{ color: '#666' }}>{count} cadastrados</div>
        )}
      </div>
    </button>
  );
}
