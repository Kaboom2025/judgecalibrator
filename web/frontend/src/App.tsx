import { useState, useEffect, useRef } from 'react';
import { AppTab } from './types';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { LandingPage } from './components/LandingPage';
import { FoolTheJudge } from './components/FoolTheJudge';
import { AuditDashboard, AuditDashboardRef } from './components/AuditDashboard';

function tabFromHash(): AppTab {
  const h = window.location.hash;
  if (h === '#demo') return 'demo';
  if (h === '#audit') { window.location.hash = ''; return 'home'; }
  return 'home';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>(tabFromHash);
  const auditRef = useRef<AuditDashboardRef>(null);

  useEffect(() => {
    function onHashChange() {
      setActiveTab(tabFromHash());
    }
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function handleTabChange(tab: AppTab) {
    window.location.hash = tab === 'home' ? '' : tab;
    setActiveTab(tab);
  }

  function handleRunAudit() {
    auditRef.current?.triggerSubmit();
  }

  return (
    <div className="min-h-screen flex flex-col selection:bg-primary/30 selection:text-primary">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRunAudit={handleRunAudit}
      />
      <main className="flex-grow">
        {activeTab === 'home' && <LandingPage onTabChange={handleTabChange} />}
        {activeTab === 'demo' && <FoolTheJudge />}
        {activeTab === 'audit' && (
          <AuditDashboard ref={auditRef} />
        )}
      </main>
      <Footer />
    </div>
  );
}
