import React from 'react';
import TopBar from '@/components/layout/TopBar';

export default function WorkerDashboard() {
  return (
    <div>
      <TopBar title="Worker Dashboard" />
      <div className="p-6 max-w-7xl mx-auto">
        <h2 className="text-2xl font-heading font-semibold text-foreground">Worker Overview</h2>
        <p className="text-sm text-muted-foreground">Placeholder worker dashboard.</p>
      </div>
    </div>
  );
}
