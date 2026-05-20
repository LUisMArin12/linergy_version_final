import { createContext } from 'react';

export interface SidebarContextType {
  isMapSidebarCollapsed: boolean;
  setIsMapSidebarCollapsed: (value: boolean) => void;
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined);
