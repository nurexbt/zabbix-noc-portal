import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Flame, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  ExternalLink,
  Check,
  MessageSquare,
  X,
  Radio,
  Send,
  RotateCw,
  XCircle,
  PowerOff
} from 'lucide-react';

export default function AlertsView({ problems, onRefresh }) {
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');
  
  // Acknowledge & Close modal state
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [modalMode, setModalMode] = useState('ack'); // 'ack' or 'close'
  const [ackMessage, setAckMessage] = useState('Acknowledged via NOC Portal by Operator');
  const [closeProblem, setCloseProblem] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ackSuccess, setAckSuccess] = useState(null);

  const filtered = (problems || []).filter(p => {
    const matchSearch = 
      (p.problem || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.hostName || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.opdata || '').toLowerCase().includes(search.toLowerCase());

    if (severityFilter === 'all') return matchSearch;
    return matchSearch && p.severity === parseInt(severityFilter, 10);
  });

  const handleOpenAckModal = (prob, mode = 'ack') => {
    setSelectedProblem(prob);
    setModalMode(mode);
    if (mode === 'close') {
      setCloseProblem(true);
      setAckMessage(`Closed via NOC Portal: Resolved ${prob.problem.slice(0, 60)}`);
    } else {
      setCloseProblem(false);
      setAckMessage(`Acknowledged via NOC Portal: Investigating ${prob.problem.slice(0, 60)}`);
    }
    setAckSuccess(null);
  };

  const handleConfirmAcknowledge = async () => {
    if (!selectedProblem) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/problems/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedProblem.eventId,
          message: ackMessage,
          closeProblem: closeProblem || modalMode === 'close'
        })
      });

      const data = await res.json();
      if (data.success) {
        const actionDone = (closeProblem || modalMode === 'close') 
          ? `Problem #${selectedProblem.eventId} acknowledged and closed in Zabbix!` 
          : `Problem #${selectedProblem.eventId} successfully acknowledged in Zabbix!`;
        setAckSuccess(actionDone);
        setTimeout(() => {
          setSelectedProblem(null);
          setAckSuccess(null);
          if (onRefresh) onRefresh();
        }, 1200);
      } else {
        alert(data.error || 'Failed to update problem in Zabbix');
      }
    } catch (err) {
      console.error('Ack error:', err);
      alert('Network error while communicating with Zabbix');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search & Severity Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-lg">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search problem name, operational data, or host..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 text-xs text-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 placeholder-slate-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs text-slate-400 font-medium pl-1">Severity:</span>
          {[
            { id: 'all', label: 'All' },
            { id: '5', label: 'Disaster (5)' },
            { id: '4', label: 'High (4)' },
            { id: '3', label: 'Average (3)' },
            { id: '2', label: 'Warning (2)' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSeverityFilter(item.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                severityFilter === item.id
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Problems Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Active Problem Incidents ({filtered.length})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live triggers from Zabbix engine with real-time bidirectional acknowledgement
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800">
              {problems.filter(p => !p.acknowledged).length} Unacknowledged
            </span>
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh problem feed"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-xl bg-slate-950/40 border border-dashed border-slate-800">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-2 opacity-80" />
            <div className="text-sm font-semibold text-slate-200">No Incidents Matching Criteria</div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              There are currently no active problems or threshold violations matching your search filters.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Severity</th>
                  <th className="py-3 px-3">Host Node</th>
                  <th className="py-3 px-3">Alert Trigger & Operational Data</th>
                  <th className="py-3 px-3">Trigger Time</th>
                  <th className="py-3 px-3">Ack Status</th>
                  <th className="py-3 px-3 text-right">Acknowledgement Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filtered.map((prob) => {
                  let badgeBg = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
                  if (prob.severity === 5) badgeBg = 'bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold';
                  else if (prob.severity === 4) badgeBg = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
                  else if (prob.severity === 3) badgeBg = 'bg-amber-500/15 text-amber-400 border-amber-500/30';

                  return (
                    <tr key={prob.eventId} className="hover:bg-slate-850 transition">
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] uppercase font-mono border ${badgeBg}`}>
                          {prob.severityName}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-semibold text-slate-200 whitespace-nowrap">
                        {prob.hostName}
                      </td>

                      <td className="py-3.5 px-3">
                        <div className="text-slate-100 font-medium">
                          {prob.problem}
                        </div>
                        {prob.opdata && (
                          <div className="text-[11px] font-mono text-cyan-400/90 mt-0.5">
                            Telemetry: {prob.opdata}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {new Date(prob.clock * 1000).toLocaleString()}
                      </td>

                      {/* Ack Status with quick interactive badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {prob.acknowledged ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] font-bold">
                            <Check className="w-3.5 h-3.5" />
                            Acknowledged
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenAckModal(prob)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-mono text-[11px] font-bold transition group"
                            title="Click to acknowledge in Zabbix"
                          >
                            <AlertCircle className="w-3.5 h-3.5 group-hover:animate-pulse" />
                            <span>Unacknowledged</span>
                          </button>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAckModal(prob, 'ack')}
                            className={`px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold shadow-md transition flex items-center gap-1.5 ${
                              prob.acknowledged
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                            }`}
                            title="Acknowledge with message in Zabbix"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>{prob.acknowledged ? 'Add Comment' : 'Ack'}</span>
                          </button>

                          <button
                            onClick={() => handleOpenAckModal(prob, 'close')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-[11px] font-bold shadow-md shadow-rose-950/50 transition flex items-center gap-1.5"
                            title="Close / Resolve problem in Zabbix"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Close Problem</span>
                          </button>

                          <a
                            href={`http://103.166.230.229/zabbix.php?action=problem.view`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                            title="Inspect in Zabbix Web GUI"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Acknowledgment Modal Dialog */}
      {selectedProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl border ${
                  closeProblem || modalMode === 'close'
                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}>
                  {closeProblem || modalMode === 'close' ? (
                    <XCircle className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    {closeProblem || modalMode === 'close' 
                      ? 'Close & Acknowledge Problem in Zabbix' 
                      : 'Acknowledge Problem in Zabbix'}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Event ID: #{selectedProblem.eventId} • Target: {selectedProblem.hostName}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedProblem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Problem Details */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Severity:</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  {selectedProblem.severityName}
                </span>
              </div>
              <div className="text-xs font-bold text-slate-200">
                {selectedProblem.problem}
              </div>
              {selectedProblem.opdata && (
                <div className="text-[11px] font-mono text-cyan-400 bg-slate-900 p-2 rounded border border-slate-800">
                  Current Telemetry: {selectedProblem.opdata}
                </div>
              )}
            </div>

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 block flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-rose-400" />
                <span>Operator Note (stored into Zabbix event history):</span>
              </label>
              <textarea
                rows={3}
                value={ackMessage}
                onChange={(e) => setAckMessage(e.target.value)}
                placeholder="Enter acknowledgment or resolution notes..."
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
              />
            </div>

            {/* Optional Close Problem Checkbox */}
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <input
                type="checkbox"
                id="closeProblemCheck"
                checked={closeProblem}
                onChange={(e) => setCloseProblem(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500 accent-rose-600 cursor-pointer"
              />
              <div className="text-xs">
                <label htmlFor="closeProblemCheck" className="text-slate-200 font-medium cursor-pointer block">
                  Close this problem immediately in Zabbix
                </label>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Sends Zabbix API <code className="font-mono text-slate-300">action: 1 (close) + 2 (ack) + 4 (message)</code> to mark the event resolved.
                </span>
              </div>
            </div>

            {/* Success notification if confirmed */}
            {ackSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>{ackSuccess}</span>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProblem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAcknowledge}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-xs font-bold font-mono shadow-lg transition disabled:opacity-50 ${
                  closeProblem || modalMode === 'close'
                    ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-950'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-amber-950'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Syncing with Zabbix...</span>
                  </>
                ) : (
                  <>
                    {closeProblem || modalMode === 'close' ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {closeProblem || modalMode === 'close'
                        ? 'Confirm & Close in Zabbix'
                        : 'Confirm & Acknowledge'}
                    </span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
