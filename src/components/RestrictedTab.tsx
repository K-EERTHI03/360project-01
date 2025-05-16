import React from 'react';
import { useTabAccess } from '../hooks/useTabAccess';

interface RestrictedTabProps {
  name: string;
  children: React.ReactNode;
}

export const RestrictedTab: React.FC<RestrictedTabProps> = ({ 
  name, 
  children 
}) => {
  const hasAccess = useTabAccess(name);
  
  if (hasAccess === undefined || !hasAccess) return null;
  
  return <>{children}</>;
};