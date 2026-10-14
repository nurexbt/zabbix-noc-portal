import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import OverviewView from './components/OverviewView';
import HostInspectorView from './components/HostInspectorView';
import AlertsView from './components/AlertsView';
import AlertChannelsView from './components/AlertChannelsView';
import ServerDetailsView from './components/ServerDetailsView';
import AccessControlView from './components/AccessControlView';
import LoginView from './components/LoginView';
import ChangePasswordModal from './components/ChangePasswordModal';
import { AlertCircle } from 'lucide-react';

export default function App() {
  // 1. Session & Auth State
  const [auth, setAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('zabbix_noc_auth');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // 2. Active Tab State
  const validTabs = ['overview', 'hosts', 'alerts', 'channels', 'access', 'server'];

  const getInitialTab = () => {
    const hash = window.location.hash.replace('#', '').trim();
    if (validTabs.includes(hash)) {
      return hash;
    }
    const saved = localStorage.getItem('noc_active_tab');
    if (validTabs.includes(saved)) {
      return saved;
    }
    return 'overview';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('noc_sidebar_collapsed') === 'true';
  });

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    localStorage.setItem('noc_active_tab', tab);
    window.location.hash = tab;
  }, []);

  const handleToggleSidebar = (collapsed) => {
    setSidebarCollapsed(collapsed);
    localStorage.setItem('noc_sidebar_collapsed', String(collapsed));
  };

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (validTabs.includes(hash)) {
        setActiveTab(hash);
        localStorage.setItem('noc_active_tab', hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // 3. Auto-Refresh & NOC Data
  const [autoRefresh, setAutoRefresh] = useState(15);
  const [countdown, setCountdown] = useState(15);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [overview, setOverview] = useState(null);
  const [hosts, setHosts] = useState([]);
  const [problems, setProblems] = useState([]);
  const [usersCount, setUsersCount] = useState(0);

  const countdownTimerRef = useRef(null);

  const fetchData = useCallback(async (isManual = false) => {
    if (!auth?.token) return;
    if (isManual) setIsRefreshing(true);

    try {
      const [overviewRes, hostsRes, problemsRes, usersRes] = await Promise.all([
        fetch('/api/overview').then(r => r.json()).catch(() => ({})),
        fetch('/api/hosts').then(r => r.json()).catch(() => ({})),
        fetch('/api/problems').then(r => r.json()).catch(() => ({})),
        fetch('/api/users').then(r => r.json()).catch(() => ({}))
      ]);

      if (overviewRes.success) {
        setOverview(overviewRes);
        setError(null);
      } else if (overviewRes.error) {
        setError(overviewRes.error);
      }

      if (hostsRes.hosts) {
        setHosts(hostsRes.hosts);
      }

      if (problemsRes.problems) {
        setProblems(problemsRes.problems);
      }

      if (usersRes.users) {
        setUsersCount(usersRes.users.length);
      }
    } catch (err) {
      console.error('Failed to fetch NOC data:', err);
      setError('Unable to communicate with Zabbix NOC Backend.');
    } finally {
      setIsRefreshing(false);
      setCountdown(autoRefresh);
    }
  }, [autoRefresh, auth]);

  // Initial fetch when authenticated
  useEffect(() => {
    if (auth?.token) {
      fetchData();
    }
  }, [fetchData, auth]);

  // Auto-refresh timer countdown
  useEffect(() => {
    if (!auth?.token || autoRefresh === 0) {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      return;
    }

    setCountdown(autoRefresh);

    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchData();
          return autoRefresh;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [autoRefresh, fetchData, auth]);

  // 4. Auth Action Handlers
  const handleLoginSuccess = (loginData) => {
    setAuth(loginData);
    localStorage.setItem('zabbix_noc_auth', JSON.stringify(loginData));
    if (loginData.mustChangePassword) {
      setShowChangePasswordModal(true);
    }
  };

  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem('zabbix_noc_auth');
  };

  const handlePasswordChangeSuccess = () => {
    setShowChangePasswordModal(false);
    if (auth) {
      const updated = { ...auth, mustChangePassword: false };
      setAuth(updated);
      localStorage.setItem('zabbix_noc_auth', JSON.stringify(updated));
    }
  };

  // If not logged in, display the Login Screen
  if (!auth || !auth.token) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  const selectedHostName = hosts.find(h => h.hostid === '10683')?.name || hosts[0]?.name;

  return (
    <div className="flex h-screen w-screen bg-[#0b0f19] text-slate-100 font-sans overflow-hidden">
      
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        collapsed={sidebarCollapsed}
        setCollapsed={handleToggleSidebar}
        problemsCount={problems.length}
        hostsCount={hosts.length}
        usersCount={usersCount}
      />

      {/* 2. Main Full-Page Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        
        {/* Top Control Bar with User Controls */}
        <TopBar
          activeTab={activeTab}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          onManualRefresh={() => fetchData(true)}
          isRefreshing={isRefreshing}
          countdown={countdown}
          selectedHostName={selectedHostName}
          currentUser={auth.user}
          onOpenChangePassword={() => setShowChangePasswordModal(true)}
          onLogout={handleLogout}
        />

        {/* Scrollable Full-Page View Container */}
        <main className="flex-1 overflow-y-auto px-6 py-6 w-full space-y-6">
          
          {/* Error Alert */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => fetchData(true)}
                className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition font-mono"
              >
                Retry
              </button>
            </div>
          )}

          {/* Tab Views */}
          {activeTab === 'overview' && (
            <OverviewView
              overview={overview}
              onSelectHostTab={() => handleTabChange('hosts')}
              onSelectAlertsTab={() => handleTabChange('alerts')}
            />
          )}

          {activeTab === 'hosts' && (
            <HostInspectorView
              hosts={hosts}
              onRefresh={() => fetchData(true)}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              problems={problems}
              onRefresh={() => fetchData(true)}
            />
          )}

          {activeTab === 'channels' && (
            <AlertChannelsView />
          )}

          {activeTab === 'access' && (
            <AccessControlView currentUser={auth.user} />
          )}

          {activeTab === 'server' && (
            <ServerDetailsView
              connectionInfo={overview?.connection}
            />
          )}

        </main>

        {/* Status Mini Footer */}
        <footer className="border-t border-slate-800/80 px-6 py-2.5 bg-slate-950/70 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span>Zabbix Enterprise NOC</span>
            <span>•</span>
            <span className="text-slate-400">Node: 103.166.230.229</span>
          </div>

          <div className="flex items-center gap-3 text-slate-400">
            <span className="text-emerald-400 font-semibold">SNMP Poller Active</span>
            <span>•</span>
            <span>Authenticated: {auth.user?.username || 'Operator'}</span>
          </div>
        </footer>

      </div>

      {/* Mandatory or Voluntary Change Password Modal */}
      {(showChangePasswordModal || auth?.mustChangePassword) && (
        <ChangePasswordModal
          user={auth.user}
          mandatory={Boolean(auth?.mustChangePassword)}
          onClose={() => setShowChangePasswordModal(false)}
          onSuccess={handlePasswordChangeSuccess}
        />
      )}

    </div>
  );
}
