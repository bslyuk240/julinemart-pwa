import { ReactNode } from 'react';

interface ReturnMethodCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

export default function ReturnMethodCard({
  title,
  description,
  icon,
  selected,
  onClick,
}: ReturnMethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left border rounded-xl p-4 transition-all ${
        selected ? 'border-primary-600 bg-primary-50 shadow-sm' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-1 text-primary-600">{icon}</div> : null}
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {selected ? (
              <span className="text-xs font-medium text-primary-700 bg-primary-100 px-2 py-1 rounded-full">
                Selected
              </span>
            ) : null}
          </div>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
      </div>
    </button>
  );
}
