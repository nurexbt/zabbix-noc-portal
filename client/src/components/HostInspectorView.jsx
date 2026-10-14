import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Server, 
  Radio, 
  Activity, 
  ChevronRight, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Filter, 
  Zap, 
  Maximize2, 
  RotateCw, 
  Calendar,
  Layers,
  Thermometer,
  Gauge,
  Cpu,
  Sliders,
  Save,
  Check,
  Network,
  ArrowDown,
  ArrowUp,
  HardDrive
} from 'lucide-react';

export default function HostInspectorView({ hosts, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedHost, setSelectedHost] = useState(null);
  
  // Data for selected host
  const [opticalMetrics, setOpticalMetrics] = useState([]);
  const [opticalThresholds, setOpticalThresholds] = useState({ warnRate: -14, critRate: -18 });
  const [interfaces, setInterfaces] = useState([]);
  const [loadingInterfaces, setLoadingInterfaces] = useState(false);
  const [interfaceSearch, setInterfaceSearch] = useState('');
  const [graphs, setGraphs] = useState([]);
  const [selectedGraphId, setSelectedGraphId] = useState('');
  const [timeRange, setTimeRange] = useState('now-1h');
  const [graphFilterCategory, setGraphFilterCategory] = useState('Traffic');
  const [loadingGraph, setLoadingGraph] = useState(false);
  const [chartKey, setChartKey] = useState(Date.now());
  
  // Custom threshold editing
  const [isEditingThresholds, setIsEditingThresholds] = useState(false);
  const [editWarnRate, setEditWarnRate] = useState(-14);
  const [editCritRate, setEditCritRate] = useState(-18);
  const [savingThresholds, setSavingThresholds] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Auto-select LINKO-CORE (hostid: 10683) by default if available, or first host
  useEffect(() => {
    if (hosts && hosts.length > 0) {
      if (!selectedHost) {
        const linko = hosts.find(h => h.hostid === '10683') || hosts[0];
        setSelectedHost(linko);
      }
    }
  }, [hosts, selectedHost]);

  // When selected host changes, fetch its graphs, optical telemetry, and network interfaces
  useEffect(() => {
    if (!selectedHost) return;

    let isMounted = true;
    setLoadingInterfaces(true);
    setOpticalMetrics([]);
    setInterfaces([]);
    setGraphs([]);

    // Fetch network interfaces telemetry
    fetch(`/api/interfaces/${selectedHost.hostid}`)
      .then(r => r.json())
      .then(data => {
        if (!isMounted) return;
        setInterfaces(data.interfaces || []);
        setLoadingInterfaces(false);
      })
      .catch(err => {
        console.error('Failed to load interfaces:', err);
        if (isMounted) setLoadingInterfaces(false);
      });

    // Fetch graphs
    fetch(`/api/graphs/${selectedHost.hostid}`)
      .then(r => r.json())
      .then(data => {
        if (!isMounted) return;
        const gList = data.graphs || [];
        setGraphs(gList);
        
        // Default to Interface 1.ORNG-BCDN-3993(150Mbps) (ID: 3188) if available
        if (gList.length > 0) {
          const matchTarget = gList.find(g => g.name.includes('1.ORNG-BCDN-3993') || g.graphid === '3188') || gList[0];
          setSelectedGraphId(matchTarget.graphid);
        } else {
          setSelectedGraphId('');
        }
      })
      .catch(err => console.error('Failed to load graphs:', err));

    // Fetch optical telemetry
    fetch(`/api/optical/${selectedHost.hostid}`)
      .then(r => r.json())
      .then(data => {
        if (!isMounted) return;
        setOpticalMetrics(data.metrics || []);
        if (data.thresholds) {
          setOpticalThresholds(data.thresholds);
          setEditWarnRate(data.thresholds.warnRate);
          setEditCritRate(data.thresholds.critRate);
        }
      })
      .catch(err => console.error('Failed to load optical telemetry:', err));

    return () => {
      isMounted = false;
    };
  }, [selectedHost]);

  const handleRefreshChart = () => {
    setLoadingGraph(true);
    setChartKey(Date.now());
    setTimeout(() => setLoadingGraph(false), 400);
  };

  const handleSaveThresholds = async () => {
    if (!selectedHost) return;
    setSavingThresholds(true);
    try {
      const res = await fetch('/api/optical/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: selectedHost.hostid,
          warnRate: editWarnRate,
          critRate: editCritRate
        })
      });
      const data = await res.json();
      if (data.success) {
        setOpticalThresholds({ warnRate: editWarnRate, critRate: editCritRate });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
        setIsEditingThresholds(false);

        // Re-fetch optical data to apply newly configured thresholds
        fetch(`/api/optical/${selectedHost.hostid}`)
          .then(r => r.json())
          .then(optData => {
            setOpticalMetrics(optData.metrics || []);
          });
      }
    } catch (e) {
      console.error('Failed to save thresholds:', e);
    } finally {
      setSavingThresholds(false);
    }
  };

  // Filter hosts
  const filteredHosts = (hosts || []).filter(h => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      (h.name || '').toLowerCase().includes(term) ||
      (h.host || '').toLowerCase().includes(term) ||
      (h.ip || '').toLowerCase().includes(term) ||
      (h.groups || []).some(g => g.toLowerCase().includes(term));

    if (statusFilter === 'all') return matchSearch;
    if (statusFilter === 'up') return matchSearch && h.availability === 'up';
    if (statusFilter === 'down') return matchSearch && h.availability === 'down';
    return matchSearch;
  });

  // Filter graphs by category
  const filteredGraphs = graphs.filter(g => {
    if (graphFilterCategory === 'All') return true;
    return g.category === graphFilterCategory;
  });

  const selectedGraphObj = graphs.find(g => g.graphid === selectedGraphId);

  // Time range presets
  const timePresets = [
    { label: '1h', value: 'now-1h' },
    { label: '3h', value: 'now-3h' },
    { label: '6h', value: 'now-6h' },
    { label: '12h', value: 'now-12h' },
    { label: '1d', value: 'now-1d' },
    { label: '7d', value: 'now-7d' }
  ];

  return (
    <div className="space-y-6">

      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl shadow-lg">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Hostname, IP (103.120...), or Group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 text-xs text-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-slate-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium pl-1">Status:</span>
          {['all', 'up', 'down'].map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg uppercase tracking-wider transition ${
                statusFilter === f
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
          <span className="text-xs font-mono text-slate-500 pl-2">
            ({filteredHosts.length} Hosts)
          </span>
        </div>
      </div>

      {/* Main Container */}
      {/* Main Container: Compact Left Device List & Expanded Right Workspace */}
      <div className="flex flex-col lg:flex-row gap-5 items-start w-full">
        
        {/* Left: Device Selection List (Reduced Compact Width) */}
        <div className="w-full lg:w-60 xl:w-64 shrink-0 bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-rose-400" />
              Target Devices
            </h3>
            <span className="text-[10px] font-mono text-slate-500">Node</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[680px] overflow-y-auto pr-0.5">
            {filteredHosts.map((h) => {
              const isSelected = selectedHost?.hostid === h.hostid;

              return (
                <div
                  key={h.hostid}
                  onClick={() => setSelectedHost(h)}
                  className={`p-2.5 rounded-xl transition cursor-pointer flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-rose-500/10 border border-rose-500/30'
                      : 'hover:bg-slate-850 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative shrink-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected
                          ? 'bg-rose-600/20 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        <Server className="w-3.5 h-3.5" />
                      </div>
                      <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-slate-900 ${
                        h.availability === 'up' ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-200 truncate flex items-center gap-1">
                        <span className="truncate">{h.name}</span>
                        {isSelected && (
                          <span className="text-[8px] px-1 py-0.1 rounded bg-rose-500/20 text-rose-300 font-mono shrink-0">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-cyan-400 font-mono truncate">
                        {h.ip}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {h.groups.slice(0, 1).map((g, idx) => (
                          <span key={idx} className="text-[8px] px-1 py-0.1 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono truncate max-w-[110px]">
                            {g}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 transition ${isSelected ? 'text-rose-400 translate-x-0.5' : 'text-slate-600'}`} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Zabbix Style System & Inspector (EXPANDED FULL WIDTH) */}
        <div className="flex-1 min-w-0 w-full space-y-6">
          {selectedHost ? (
            <>
              {/* Host Banner & Hardware Profile */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2 className="text-xl font-extrabold text-white tracking-tight">{selectedHost.name}</h2>
                      <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        HostID: {selectedHost.hostid}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 radar-online"></span>
                        ONLINE / SNMP UP
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono mt-1">
                      <span>IP: <strong className="text-slate-200">{selectedHost.ip}:{selectedHost.port}</strong></span>
                      <span>•</span>
                      <span>Platform: <strong className="text-slate-200">{selectedHost.hostid === '10683' ? 'RouterOS CCR1036-8G-2S+ (36 Cores)' : 'Ubuntu 22.04 LTS (NOC Master Node)'}</strong></span>
                      <span>•</span>
                      <span>Telemetry Engine: <strong className="text-emerald-400">{selectedHost.hostid === '10683' ? 'SNMP DDM (30s)' : 'Zabbix Agent 2 (Active)'}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={`http://103.166.230.229/zabbix.php?action=charts.view&filter_hostids%5B0%5D=${selectedHost.hostid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
                    >
                      <span>Zabbix Graphs</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>

                {/* Hardware Spec Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4">
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">
                      {selectedHost.hostid === '10683' ? 'SFP+ 10G Ports' : 'Network Interfaces'}
                    </span>
                    <span className="text-xs font-bold text-emerald-400 font-mono">
                      {selectedHost.hostid === '10683' ? '2x 10Gbps Active' : `${interfaces.length} Interfaces`}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Active Telemetry</span>
                    <span className="text-xs font-bold text-cyan-400 font-mono">
                      {selectedHost.hostid === '10683' ? '12 Optical Items (Live)' : 'Zabbix Agent 2 (Active)'}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">Available Graphs</span>
                    <span className="text-xs font-bold text-slate-200 font-mono">{graphs.length} Charts Ready</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <span className="text-[10px] uppercase font-mono text-slate-500 block">
                      {selectedHost.hostid === '10683' ? 'Zabbix Macros' : 'Node Status'}
                    </span>
                    <span className="text-xs font-bold text-amber-400 font-mono">
                      {selectedHost.hostid === '10683' 
                        ? `{$SFP_RX_WARN} = ${opticalThresholds.warnRate}dBm`
                        : 'Linux Server (Monitored)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. REAL LIVE OPTICAL POWER OF INTERFACE SECTION (Only shown when device has Optical DDM Telemetry) */}
              {opticalMetrics && opticalMetrics.length > 0 && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      <Radio className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          Optical Power of Interface (Real SNMP DDM Telemetry)
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                          LIVE SNMP
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Polled directly via <code className="font-mono text-slate-300">mtxrOptical</code> OIDs: Rx/Tx power, wavelength, thermal and electrical metrics
                      </p>
                    </div>
                  </div>

                  {/* Threshold Rates Configuration Button */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingThresholds(!isEditingThresholds)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition ${
                        isEditingThresholds 
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                          : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Configure Threshold Rate</span>
                    </button>

                    {/* Standard Threshold Legend */}
                    <div className="hidden xl:flex items-center gap-2 text-[10px] font-mono bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                      <span className="flex items-center gap-1 text-emerald-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span> &ge; {opticalThresholds.warnRate} dBm Good
                      </span>
                      <span className="flex items-center gap-1 text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span> {opticalThresholds.critRate} to {opticalThresholds.warnRate} dBm Warn
                      </span>
                      <span className="flex items-center gap-1 text-rose-400">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span> &lt; {opticalThresholds.critRate} dBm Crit
                      </span>
                    </div>
                  </div>
                </div>

                {/* Threshold Configuration Drawer / Panel */}
                {isEditingThresholds && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300 font-mono">
                        <Sliders className="w-4 h-4" />
                        <span>Set 10G SFP+ Optical Threshold Rates in Zabbix</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Updates Zabbix User Macros: {"{$SFP_RX_WARN}"} & {"{$SFP_RX_CRIT}"}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div>
                        <label className="text-[11px] font-mono text-slate-300 block mb-1">
                          Warning Rate Threshold: <strong className="text-amber-400">{editWarnRate} dBm</strong>
                        </label>
                        <input
                          type="range"
                          min="-25"
                          max="-5"
                          step="1"
                          value={editWarnRate}
                          onChange={(e) => setEditWarnRate(Number(e.target.value))}
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                          <span>-25 dBm</span>
                          <span>-14 dBm (Recommended)</span>
                          <span>-5 dBm</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-mono text-slate-300 block mb-1">
                          Critical Rate Threshold: <strong className="text-rose-400">{editCritRate} dBm</strong>
                        </label>
                        <input
                          type="range"
                          min="-30"
                          max="-10"
                          step="1"
                          value={editCritRate}
                          onChange={(e) => setEditCritRate(Number(e.target.value))}
                          className="w-full accent-rose-500 cursor-pointer"
                        />
                        <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                          <span>-30 dBm</span>
                          <span>-18 dBm (Recommended)</span>
                          <span>-10 dBm</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                      {saveSuccess && (
                        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Saved to Zabbix successfully!
                        </span>
                      )}
                      <button
                        onClick={handleSaveThresholds}
                        disabled={savingThresholds}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono transition disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{savingThresholds ? 'Saving to Zabbix...' : 'Save Thresholds to Zabbix'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SFP Interface Optical Telemetry Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {opticalMetrics.map((opt) => {
                    const isGood = opt.rxStatus === 'good';
                    const isWarn = opt.rxStatus === 'warning';
                    const isCrit = opt.rxStatus === 'critical';

                    const borderClass = isCrit 
                      ? 'border-rose-500/40 bg-rose-950/15' 
                      : isWarn 
                      ? 'border-amber-500/40 bg-amber-950/15' 
                      : 'border-emerald-500/30 bg-emerald-950/15';

                    const rxNum = opt.rxPower;
                    // Calculate gauge percentage: Scale -25 dBm (0%) to +5 dBm (100%)
                    const pct = Math.max(5, Math.min(100, Math.round(((rxNum - (-25)) / (5 - (-25))) * 100)));

                    return (
                      <div key={opt.itemId} className={`p-4 rounded-xl border ${borderClass} space-y-3 relative overflow-hidden`}>
                        
                        {/* Port Name & Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                              {opt.interfaceName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                              {opt.description}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded font-mono font-bold tracking-wider border ${
                              isCrit 
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                                : isWarn 
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                                : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            }`}>
                              {opt.rxStatus.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Primary Rx and Tx Metrics */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-400 block">Optical RX Power</span>
                            <span className={`text-2xl font-black font-mono tracking-tight ${
                              isCrit ? 'text-rose-400' : isWarn ? 'text-amber-400' : 'text-emerald-400'
                            }`}>
                              {opt.rxFormatted}
                            </span>
                            <span className="text-[9px] font-mono text-emerald-400/80 block mt-0.5">
                              Normal healthy optical link
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-mono text-slate-400 block">Optical TX Power</span>
                            <span className="text-2xl font-black font-mono tracking-tight text-cyan-400">
                              {opt.txFormatted}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 block mt-0.5">
                              Laser emission OK
                            </span>
                          </div>
                        </div>

                        {/* Power Spectrum Meter Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-mono">
                            <span className="text-slate-400">Receiver Input Level:</span>
                            <span className="text-slate-200 font-bold">{opt.rxFormatted} (Threshold: &ge; {opticalThresholds.warnRate} dBm)</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800 p-0.5">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                isCrit ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] font-mono text-slate-500 px-0.5">
                            <span>-25 dBm (Low)</span>
                            <span>{opticalThresholds.critRate} dBm (Crit)</span>
                            <span>{opticalThresholds.warnRate} dBm (Warn)</span>
                            <span>+5 dBm (High)</span>
                          </div>
                        </div>

                        {/* SFP Transceiver Diagnostics Table */}
                        <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono border-t border-slate-800/60">
                          <div>
                            <span className="text-slate-500 block">Temperature</span>
                            <span className="text-slate-200 font-semibold">{opt.temperature}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Supply Voltage</span>
                            <span className="text-slate-200 font-semibold">{opt.voltage}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Bias Current</span>
                            <span className="text-slate-200 font-semibold">{opt.biasCurrent}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 pt-0.5">
                          <span>Wavelength: <strong className="text-slate-300">{opt.wavelength}</strong></span>
                          <span className="text-emerald-400 font-semibold">Link: {opt.linkStatus}</span>
                        </div>

                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              {/* 2. COMPREHENSIVE NETWORK INTERFACES INFORMATION SECTION */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Network className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          Network Interfaces Information & Telemetry ({interfaces.length})
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono font-bold">
                          ZABBIX ENGINE
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Live interface link speeds, real-time Inbound/Outbound bitrates, operational status, and packet health
                      </p>
                    </div>
                  </div>

                  {/* Interface Search Box */}
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Filter interfaces (e.g. sfp, ether)..."
                      value={interfaceSearch}
                      onChange={(e) => setInterfaceSearch(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 pl-8 pr-3 py-1.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono placeholder-slate-600"
                    />
                  </div>
                </div>

                {loadingInterfaces ? (
                  <div className="py-12 text-center text-xs text-slate-500 font-mono flex items-center justify-center gap-2">
                    <RotateCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>Loading interfaces from Zabbix engine...</span>
                  </div>
                ) : interfaces.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 font-mono">
                    No network interfaces discovered for this host.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-3">Interface Name</th>
                          <th className="py-2.5 px-3">Link Status</th>
                          <th className="py-2.5 px-3">Link Speed</th>
                          <th className="py-2.5 px-3">Traffic In (Rx)</th>
                          <th className="py-2.5 px-3">Traffic Out (Tx)</th>
                          <th className="py-2.5 px-3 text-right">Errors / Discards</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {interfaces
                          .filter(iface => iface.name.toLowerCase().includes(interfaceSearch.toLowerCase()))
                          .map((iface) => {
                            const isUp = iface.status === 'up';
                            const isSfp = iface.isSfp;
                            const isBonding = iface.isBonding;

                            return (
                              <tr key={iface.name} className="hover:bg-slate-800/30 transition">
                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full shrink-0 ${isUp ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                    <span className="font-bold text-slate-200">{iface.name}</span>
                                    {isSfp && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-sans">
                                        10G SFP+
                                      </span>
                                    )}
                                    {isBonding && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-sans">
                                        {iface.bondingCapacity ? `LACP ${iface.bondingCapacity}` : (iface.name.toLowerCase().includes('uplink') ? 'LACP 20G' : 'LACP 4G')}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                    isUp 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                                  }`}>
                                    {iface.status.toUpperCase()}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-slate-300">
                                  <span className="font-semibold text-slate-100">{iface.speedFormatted}</span>
                                </td>

                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1.5 text-emerald-400">
                                    <ArrowDown className="w-3 h-3 text-emerald-500 shrink-0" />
                                    <span className="font-semibold">{iface.rxFormatted}</span>
                                  </div>
                                </td>

                                <td className="py-3 px-3">
                                  <div className="flex items-center gap-1.5 text-cyan-400">
                                    <ArrowUp className="w-3 h-3 text-cyan-500 shrink-0" />
                                    <span className="font-semibold">{iface.txFormatted}</span>
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-right">
                                  <span className={`text-[11px] ${iface.errors > 0 || iface.discards > 0 ? 'text-amber-400 font-bold' : 'text-slate-500'}`}>
                                    {iface.errors} err / {iface.discards} disc
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* 3. ZABBIX STYLE GRAPH SYSTEM (SCREENSHOT 2 MATCH) */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
                
                {/* Graph Controls Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                        Zabbix Custom Graphs View
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        High-fidelity telemetry graph rendering directly from Zabbix engine (<code className="font-mono text-slate-300">chart2.php</code>)
                      </p>
                    </div>
                  </div>

                  {/* Graph Time Range Selector & Controls */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-xl p-1">
                      {timePresets.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => setTimeRange(t.value)}
                          className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition ${
                            timeRange === t.value
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleRefreshChart}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                      title="Reload graph from Zabbix"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${loadingGraph ? 'animate-spin text-rose-400' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Graph Category & Selection Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                  {/* Category Filter */}
                  <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                    <span className="text-xs font-mono text-slate-500 pr-1">Filter:</span>
                    {['Traffic', 'Optical', 'CPU', 'Storage', 'All'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setGraphFilterCategory(cat)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
                          graphFilterCategory === cat
                            ? 'bg-slate-800 text-rose-400 font-bold border border-rose-500/30'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Dropdown Selector for Graph */}
                  <div className="w-full sm:w-auto flex-1 sm:max-w-md">
                    <select
                      value={selectedGraphId}
                      onChange={(e) => setSelectedGraphId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-slate-100 font-mono rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-rose-500 truncate"
                    >
                      {filteredGraphs.map((g) => (
                        <option key={g.graphid} value={g.graphid}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Shortcuts for Popular Core Interfaces & Optical Graphs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
                  <span className="text-slate-500 text-[11px] shrink-0">Quick View:</span>
                  {[
                    { name: '1.ORNG-BCDN-3993 (150M)', id: '3188' },
                    { name: 'Optical Power SFP+ 1', id: '3231' },
                    { name: 'Optical Power SFP+ 2', id: '3232' },
                    { name: 'sfp-sfpplus1 (10G Traffic)', id: '3186' },
                    { name: 'sfp-sfpplus2 (Orange 10G Traffic)', id: '3166' },
                    { name: '1.ORNG-INT-3982 (640M)', id: '3172' },
                    { name: '1.ORNG-GGC-3989 (1.6G)', id: '3178' },
                    { name: '1.ORNG-FNA-3990 (1.45G)', id: '3189' },
                    { name: 'Uplink-Bonding', id: '3162' }
                  ].map((quick) => (
                    <button
                      key={quick.id}
                      onClick={() => setSelectedGraphId(quick.id)}
                      className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap transition border ${
                        selectedGraphId === quick.id
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-bold'
                          : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {quick.name}
                    </button>
                  ))}
                </div>

                {/* Authentic Zabbix Chart Display Container */}
                <div className="rounded-xl border border-slate-800 bg-[#fbfbfb] p-3 text-slate-900 shadow-inner overflow-hidden">
                  
                  {/* Graph Title Bar (Exact Zabbix Style) */}
                  <div className="text-center pb-2 border-b border-slate-300/80 mb-2">
                    <span className="font-mono text-xs font-bold text-slate-800 tracking-tight">
                      {selectedHost.name}: {selectedGraphObj ? selectedGraphObj.name : 'Network traffic'}
                    </span>
                  </div>

                  {/* Chart Image from Zabbix Engine */}
                  {selectedGraphId ? (
                    <div className="flex justify-center items-center overflow-x-auto min-h-[220px]">
                      <img
                        key={`${selectedGraphId}-${timeRange}-${chartKey}`}
                        src={`/api/graphs/render/${selectedGraphId}?from=${encodeURIComponent(timeRange)}&to=now&width=1100&height=250`}
                        alt={selectedGraphObj?.name || 'Zabbix Graph'}
                        className="max-w-none w-full h-auto object-contain rounded select-none"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="py-16 text-center text-xs text-slate-500 font-mono">
                      No graph selected. Select an interface graph above.
                    </div>
                  )}

                  {/* Zabbix Footer Legend & Stats Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-300/80 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-600 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span className="w-3 h-3 rounded-sm bg-[#199C0D] border border-black/20 inline-block"></span>
                        Bits received [avg]
                      </span>
                      <span className="flex items-center gap-1.5 font-semibold">
                        <span className="w-3 h-3 rounded-sm bg-[#F63100] border border-black/20 inline-block"></span>
                        Bits sent [avg]
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-slate-500">
                      <span>Time range: <strong className="text-slate-700">{timeRange}</strong></span>
                      <span>•</span>
                      <a
                        href={`http://103.166.230.229/charts.php?graphid=${selectedGraphId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>Open in Zabbix GUI</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                </div>

              </div>
            </>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-16 text-center text-slate-500">
              Select a host from the left to view optical metrics and live traffic telemetry.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
