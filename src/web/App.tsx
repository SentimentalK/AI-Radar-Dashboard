import { useState } from 'react'
import AppShell from './components/AppShell'

export default function App() {
  const [activeTab, setActiveTab] = useState<'brief' | 'timeline' | 'sources'>('brief')

  return (
    <AppShell activeTab={activeTab} setActiveTab={setActiveTab} />
  )
}
