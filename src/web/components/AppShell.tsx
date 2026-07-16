import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import PageHeader from './PageHeader'
import DailyBriefPage from '@/pages/DailyBriefPage'
import TimelinePage from '@/pages/TimelinePage'
import SourcesPage from '@/pages/SourcesPage'

interface AppShellProps {
  activeTab: 'brief' | 'timeline' | 'sources'
  setActiveTab: (tab: 'brief' | 'timeline' | 'sources') => void
}

export default function AppShell({ activeTab, setActiveTab }: AppShellProps) {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')

  useEffect(() => {
    let active = true
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/health')
        if (res.ok) {
          const data = await res.json()
          if (data && data.ok && active) {
            setApiStatus('connected')
            return
          }
        }
        if (active) setApiStatus('disconnected')
      } catch (err) {
        if (active) setApiStatus('disconnected')
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, 10000)

    return () => {
      active = false
      clearInterval(interval)
    }
  }, [])

  const getPageTitle = () => {
    switch (activeTab) {
      case 'brief':
        return 'Daily Brief'
      case 'timeline':
        return 'Activity Timeline'
      case 'sources':
        return 'Ingestion Sources'
    }
  }

  const renderActivePage = () => {
    switch (activeTab) {
      case 'brief':
        return <DailyBriefPage />
      case 'timeline':
        return <TimelinePage />
      case 'sources':
        return <SourcesPage />
    }
  }

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
  )
}
