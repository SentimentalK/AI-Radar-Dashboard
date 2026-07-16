import { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import PageHeader from './PageHeader';
import DailyBriefPage from '@/pages/DailyBriefPage';
import TimelinePage from '@/pages/TimelinePage';
import SourcesPage from '@/pages/SourcesPage';
import RunsPage from '@/pages/RunsPage';

interface AppShellProps {
  activeTab: 'brief' | 'timeline' | 'sources' | 'runs';
  setActiveTab: (tab: 'brief' | 'timeline' | 'sources' | 'runs') => void;
}

export default function AppShell({ activeTab, setActiveTab }: AppShellProps) {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    let active = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health');
        if (res.ok) {
          const data = await res.json();
          if (data && data.ok && active) {
            setApiStatus('connected');
            return;
          }
        }
        if (active) setApiStatus('disconnected');
      } catch (err) {
        if (active) setApiStatus('disconnected');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'brief':
        return 'Daily Brief';
      case 'timeline':
        return 'Activity Timeline';
      case 'sources':
        return 'Ingestion Sources';
      case 'runs':
        return 'Sync Runs';
    }
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'brief':
        return <DailyBriefPage />;
      case 'timeline':
        return <TimelinePage />;
      case 'sources':
        return <SourcesPage />;
      case 'runs':
        return <RunsPage />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <PageHeader title={getPageTitle()} apiStatus={apiStatus} />
        <main className="flex-1 overflow-y-auto bg-background">
          {renderActivePage()}
        </main>
      </div>
    </div>
  );
}
