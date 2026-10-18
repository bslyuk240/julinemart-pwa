'use client';

import type { ReactNode } from 'react';
import { clsx } from 'clsx';
import Sheet from './sheet';
import { haptic } from '@/lib/mobile/haptics';

export type ActionSheetItem = {
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  onSelect: () => void;
};

type ActionSheetProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: ActionSheetItem[];
};

/** A short list of actions plus Cancel (share, remove item, quick sort). */
export default function ActionSheet({ open, onClose, title, actions }: ActionSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title={title} headerAction={<span />}>
      <ul className="-mx-6">
        {actions.map((action) => (
          <li key={action.label}>
            <button
              type="button"
              onClick={() => {
                haptic(action.destructive ? 'warning' : 'selection');
                onClose();
                action.onSelect();
              }}
              className={clsx(
                'flex min-h-14 w-full items-center gap-4 px-6 text-left text-m-body-l active:bg-black/5',
                action.destructive ? 'text-m-error' : 'text-m-on-surface',
              )}
            >
              {action.icon && <span className="text-m-on-surface-variant">{action.icon}</span>}
              {action.label}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 h-12 w-full rounded-full bg-m-surface-container text-m-label-l text-m-on-surface active:bg-m-surface-high"
      >
        Cancel
      </button>
    </Sheet>
  );
}
