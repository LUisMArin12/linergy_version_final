import { useState, ReactNode } from 'react';
import { SidebarContext } from './SidebarContextDefinition';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isMapSidebarCollapsed, setIsMapSidebarCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ isMapSidebarCollapsed, setIsMapSidebarCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}
