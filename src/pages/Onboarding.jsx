import React from 'react';
import TopBar from '@/components/layout/TopBar';

export default function Onboarding() {
  return (
    <div>
      <TopBar title="Onboarding" />
      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">Business Onboarding</h2>
        <p className="text-sm text-muted-foreground">This is a simple onboarding placeholder. Implement business creation flow here.</p>
      </div>
    </div>
  );
}
