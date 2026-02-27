import React from "react";

type EmptyStateProps = {
  message: string;
  action?: React.ReactNode;
};

export default function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="card" role="status" aria-live="polite">
      <p className="muted">{message}</p>
      {action ? <div className="actionRow" style={{ marginTop: 12 }}>{action}</div> : null}
    </div>
  );
}

