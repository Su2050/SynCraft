// frontend-refactored/src/components/PasswordLayout.tsx
import React from 'react';

interface PasswordLayoutProps {
  children: React.ReactNode;
}

export default function PasswordLayout({ children }: PasswordLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
