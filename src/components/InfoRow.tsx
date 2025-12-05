import type { ReactNode } from 'react';

interface InfoRowProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  className?: string;
}

function InfoRow({ label, value, icon, className = '' }: InfoRowProps) {
  return (
    <div className={`flex justify-between items-baseline ${className}`}>
      <span className="text-muted-foreground flex items-center gap-2">
        {icon}
        {label}
      </span>
      {typeof value === 'string' ? <span className="font-medium">{value}</span> : value}
    </div>
  );
}

export default InfoRow;
