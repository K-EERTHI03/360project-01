import React from 'react';
import { RestrictedTab } from './RestrictedTab';
import { ReportsTab } from './ReportsTab';
import { AnalyticsTab } from './AnalyticsTab';

export const Layout: React.FC = () => {
  return (
    <div>
      <RestrictedTab name="reports">
        <ReportsTab />
      </RestrictedTab>

      <RestrictedTab name="analytics">
        <AnalyticsTab />
      </RestrictedTab>
    </div>
  );
};