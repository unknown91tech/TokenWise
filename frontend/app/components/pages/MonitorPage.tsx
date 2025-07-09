'use client';

import React from 'react';
import { RealTimeMonitor } from '../RealTimeMonitor';

export function MonitorPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Real-Time Monitor</h1>
        <p className="text-gray-600 dark:text-gray-400">Live transaction monitoring and wallet activity</p>
      </div>
      
      <RealTimeMonitor />
    </div>
  );
}