import type { ReactNode } from 'react';

export function Icon({ children }: { readonly children: ReactNode }) {
  return (
    <span className="icon" aria-hidden="true">
      {children}
    </span>
  );
}
