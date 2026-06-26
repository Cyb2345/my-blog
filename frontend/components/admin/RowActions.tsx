import type { ReactNode } from "react";

import {
  AdminTableActionButton,
  AdminTableActions,
  adminTableActionIconClass,
} from "@/components/admin/AdminTableActionButton";

export type RowAction = {
  key: string;
  label: string;
  icon: ReactNode;
  variant?: "edit" | "delete" | "warning" | "success" | "neutral";
  disabled?: boolean;
  onClick: () => void;
};

type RowActionsProps = {
  actions: RowAction[];
  className?: string;
};

export { adminTableActionIconClass as rowActionIconClass };

export function RowActions({ actions, className }: RowActionsProps) {
  return (
    <AdminTableActions className={className}>
      {actions.map((action) => (
        <AdminTableActionButton
          key={action.key}
          variant={action.variant}
          disabled={action.disabled}
          onClick={action.onClick}
          title={action.label}
          aria-label={action.label}
        >
          {action.icon}
        </AdminTableActionButton>
      ))}
    </AdminTableActions>
  );
}
