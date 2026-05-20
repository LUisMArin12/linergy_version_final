import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSearch } from '../../contexts/SearchContext';

interface AppLayoutProps {
  onShare: () => void;
}

export default function AppLayout({ onShare }: AppLayoutProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { searchQuery, setSearchQuery } = useSearch();

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 768) setMobileSidebarOpen(false);
    };
    window.addEventListener('resize', onResize);
    onResize();
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)]">
      <div className="pointer-events-none absolute inset-0 grid-backdrop opacity-40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[rgba(21,122,90,0.08)] to-transparent" />

      <Sidebar mobileOpen={mobileSidebarOpen} onCloseMobile={() => setMobileSidebarOpen(false)} />

      <div className="relative md:pl-[92px]">
        <Header
          onOpenMobileSidebar={() => setMobileSidebarOpen(true)}
          onShare={onShare}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main className="px-4 pb-6 pt-2 sm:px-6 sm:pb-8 sm:pt-3">
          <div className="mx-auto w-full max-w-screen-2xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
