import { AppTab } from '../types';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onRunAudit?: () => void;
  auditRunning?: boolean;
}

export function Header({ activeTab, onTabChange, onRunAudit, auditRunning }: HeaderProps) {
  const navLink = (tab: AppTab, label: string) => (
    <button
      onClick={() => onTabChange(tab)}
      className={`transition-colors ${
        activeTab === tab
          ? 'text-zinc-100 font-semibold border-b-2 border-zinc-100 pb-1'
          : 'text-on-surface-variant hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <header className="fixed top-0 w-full border-b border-outline-variant/15 bg-surface/90 backdrop-blur-md z-50">
      <div className="flex items-center justify-between px-8 lg:px-16 h-16 max-w-[1440px] mx-auto">
        <button
          onClick={() => onTabChange('home')}
          className="text-xl font-bold tracking-tight text-zinc-100 font-headline hover:opacity-80 transition-opacity"
        >
          JudgeCalibrator
        </button>
        <nav className="hidden md:flex items-center gap-8 text-sm tracking-wide">
          {navLink('home', 'Home')}
          {navLink('demo', 'Try the Demo')}
          {navLink('audit', 'Live Audit')}
        </nav>
        {activeTab === 'audit' && onRunAudit && (
          <button
            onClick={onRunAudit}
            disabled={auditRunning}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2 rounded-md text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {auditRunning ? 'Running...' : 'Run Audit'}
          </button>
        )}
        {activeTab !== 'audit' && (
          <button
            onClick={() => onTabChange('demo')}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-5 py-2 rounded-md text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
          >
            Try Demo
          </button>
        )}
      </div>
    </header>
  );
}
