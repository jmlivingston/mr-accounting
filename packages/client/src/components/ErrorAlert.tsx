import type { ReactNode } from 'react';

export function ErrorAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="error-alert">
      {children}
    </p>
  );
}
