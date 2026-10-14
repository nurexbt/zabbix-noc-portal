import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Smartphone, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Save, 
  RotateCw, 
  Zap, 
  Check, 
  Info, 
  Sliders, 
  Users, 
  Server, 
  Plus, 
  Trash2, 
  Edit3, 
  X,
  UserCheck
} from 'lucide-react';

export default function AlertChannelsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState(null);

  // Telegram state
  const [tgEnabled, setTgEnabled] = useState(true);
  const [tgBotToken, setTgBotToken] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgParseMode, setTgParseMode] = useState('HTML');

  // MSISDN SMS state (Gennet SMS Provider)
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [smsMsisdn, setSmsMsisdn] = useState('8801912345678');
  const [smsGatewayUrl, setSmsGatewayUrl] = useState('https://isms.gennet.com.bd/api/v3/send-sms');
  const [smsApiToken, setSmsApiToken] = useState('$2y$12$XNtXdQgifD9//JpPjlFEu.WjMgny9BNlJgROfGkeNxRAZUHAp3Alq');
  const [smsSid, setSmsSid] = useState('TeamzeroNONMASKING');

  // Device-specific routing rules and users
  const [rules, setRules] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [users, setUsers] = useState([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [ruleSaving, setRuleSaving] = useState(false);
  const [ruleSuccessMsg, setRuleSuccessMsg] = useState('');

  // Add / Edit Rule Modal State with Multi-User selection
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [ruleHostId, setRuleHostId] = useState('');
  const [ruleUserIds, setRuleUserIds] = useState([]); // Multiple User IDs array!
  const [ruleInterface, setRuleInterface] = useState(true);
  const [ruleUnreach, setRuleUnreach] = useState(true);
  const [ruleEnabled, setRuleEnabled] = useState(true);

  // User Management Modal State
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [userNameInput, setUserNameInput] = useState('');
  const [userPhoneInput, setUserPhoneInput] = useState('');
  const [userSaving, setUserSaving] = useState(false);

  // Test notification states
  const [testingTg, setTestingTg] = useState(false);
  const [tgTestResult, setTgTestResult] = useState(null);
  const [testingSms, setTestingSms] = useState(false);
  const [smsTestResult, setSmsTestResult] = useState(null);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts/settings');
      const data = await res.json();
      if (data.success && data.settings) {
        const { telegram, sms } = data.settings;
        setTgEnabled(telegram.enabled);
        setTgBotToken(telegram.botToken || '');
        setTgChatId(telegram.chatId || '');
        setTgParseMode(telegram.parseMode || 'HTML');

        setSmsEnabled(sms.enabled);
        setSmsMsisdn(sms.msisdn || '8801912345678');
        setSmsGatewayUrl(sms.gatewayUrl || 'https://isms.gennet.com.bd/api/v3/send-sms');
        if (sms.apiToken) setSmsApiToken(sms.apiToken);
        if (sms.sid) setSmsSid(sms.sid);
        setError(null);
      } else {
        setError(data.error || 'Failed to load alert channel settings');
      }
    } catch (err) {
      console.error('Failed to fetch alert channels:', err);
      setError('Network error while connecting to Zabbix alert backend');
    } finally {
      setLoading(false);
    }
  };

  const fetchRulesAndUsers = async () => {
    setRulesLoading(true);
    try {
      const res = await fetch('/api/alerts/rules');
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
        setHosts(data.hosts || []);
        setUsers(data.users || []);
        if (data.hosts && data.hosts.length > 0 && !ruleHostId) {
          setRuleHostId(data.hosts[0].hostid);
        }
        if (data.users && data.users.length > 0 && ruleUserIds.length === 0) {
          setRuleUserIds([data.users[0].userid]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch rules and users:', err);
    } finally {
      setRulesLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchRulesAndUsers();
  }, []);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError(null);

    try {
      const res = await fetch('/api/alerts/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram: {
            enabled: tgEnabled,
            botToken: tgBotToken,
            chatId: tgChatId,
            parseMode: tgParseMode
          },
          sms: {
            enabled: smsEnabled,
            msisdn: smsMsisdn,
            gatewayUrl: smsGatewayUrl,
            apiToken: smsApiToken,
            sid: smsSid
          }
        })
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error || 'Failed to update alert channels');
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Network error while saving settings to Zabbix');
    } finally {
      setSaving(false);
    }
  };

  // Toggle user checkbox for rule
  const toggleUserSelection = (userId) => {
    setRuleUserIds(prev => {
      if (prev.includes(userId)) {
        if (prev.length === 1) return prev; // Keep at least one user
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // Open Rule Modal for Add
  const handleOpenAddRule = () => {
    setEditingRuleId(null);
    setRuleHostId(hosts[0] ? hosts[0].hostid : '');
    setRuleUserIds(users[0] ? [users[0].userid] : []);
    setRuleInterface(true);
    setRuleUnreach(true);
    setRuleEnabled(true);
    setShowRuleModal(true);
  };

  // Open Rule Modal for Edit
  const handleOpenEditRule = (rule) => {
    setEditingRuleId(rule.actionid);
    setRuleHostId(rule.hostId || (hosts[0] ? hosts[0].hostid : ''));
    setRuleUserIds(rule.userIds && rule.userIds.length > 0 ? rule.userIds : (rule.userId ? [rule.userId] : []));
    setRuleInterface(rule.notifyInterface);
    setRuleUnreach(rule.notifyUnreachable);
    setRuleEnabled(rule.enabled);
    setShowRuleModal(true);
  };

  // Save Rule (Add or Edit with multiple users)
  const handleSaveRule = async (e) => {
    if (e) e.preventDefault();
    if (!ruleHostId || ruleUserIds.length === 0) {
      alert('Please select a target device and at least one recipient user.');
      return;
    }
    setRuleSaving(true);
    try {
      const res = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionid: editingRuleId,
          hostId: ruleHostId,
          userIds: ruleUserIds,
          notifyInterface: ruleInterface,
          notifyUnreachable: ruleUnreach,
          enabled: ruleEnabled
        })
      });
      const data = await res.json();
      if (data.success) {
        setRuleSuccessMsg(editingRuleId ? 'Device rule updated and synced in Zabbix!' : 'New device rule created in Zabbix!');
        setTimeout(() => setRuleSuccessMsg(''), 4000);
        setShowRuleModal(false);
        fetchRulesAndUsers();
      } else {
        alert(data.error || 'Failed to save device alert rule');
      }
    } catch (err) {
      alert('Error saving alert rule: ' + err.message);
    } finally {
      setRuleSaving(false);
    }
  };

  // Delete Rule
  const handleDeleteRule = async (actionid) => {
    if (!confirm('Are you sure you want to remove this device alert routing rule from Zabbix?')) return;
    try {
      const res = await fetch(`/api/alerts/rules/${actionid}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setRuleSuccessMsg('Device alert rule deleted from Zabbix.');
        setTimeout(() => setRuleSuccessMsg(''), 4000);
        fetchRulesAndUsers();
      } else {
        alert(data.error || 'Failed to delete rule');
      }
    } catch (err) {
      alert('Error deleting rule: ' + err.message);
    }
  };

  // Open User Edit Mode
  const handleEditUser = (u) => {
    setEditingUserId(u.userid);
    setUserNameInput(u.name);
    setUserPhoneInput(u.smsPhone || '');
  };

  const handleCancelUserEdit = () => {
    setEditingUserId(null);
    setUserNameInput('');
    setUserPhoneInput('');
  };

  // Save User (Create or Update)
  const handleSaveUser = async (e) => {
    e.preventDefault();
    if (!userNameInput || !userPhoneInput) return;
    setUserSaving(true);
    try {
      const res = await fetch('/api/alerts/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userid: editingUserId,
          username: userNameInput.toLowerCase().replace(/\s+/g, '_'),
          name: userNameInput,
          smsPhone: userPhoneInput
        })
      });
      const data = await res.json();
      if (data.success) {
        handleCancelUserEdit();
        fetchRulesAndUsers();
      } else {
        alert(data.error || 'Failed to save user in Zabbix');
      }
    } catch (err) {
      alert('Error saving user: ' + err.message);
    } finally {
      setUserSaving(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (userid, name) => {
    if (!confirm(`Are you sure you want to delete user "${name}" from Zabbix?`)) return;
    try {
      const res = await fetch(`/api/alerts/users/${userid}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchRulesAndUsers();
      } else {
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Error deleting user: ' + err.message);
    }
  };

  const handleTestTelegram = async () => {
    if (!tgChatId) {
      alert('Please specify a Telegram Chat ID or Group ID (e.g. -1001234567890)');
      return;
    }
    setTestingTg(true);
    setTgTestResult(null);

    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'telegram',
          recipient: tgChatId,
          botToken: tgBotToken
        })
      });
      const data = await res.json();
      if (data.success) {
        setTgTestResult({ ok: true, msg: 'Test Telegram message delivered successfully!' });
      } else {
        setTgTestResult({ ok: false, msg: data.result?.description || data.error || 'Telegram API rejected dispatch' });
      }
    } catch (err) {
      setTgTestResult({ ok: false, msg: err.message });
    } finally {
      setTestingTg(false);
    }
  };

  const handleTestSms = async (targetPhone = null) => {
    const phoneToSend = targetPhone || smsMsisdn;
    if (!phoneToSend) {
      alert('Please specify an MSISDN phone number (e.g. 88019xxxxxxxx)');
      return;
    }
    setTestingSms(true);
    setSmsTestResult(null);

    try {
      const res = await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'sms',
          recipient: phoneToSend,
          apiToken: smsApiToken,
          sid: smsSid,
          gatewayUrl: smsGatewayUrl
        })
      });
      const data = await res.json();
      if (data.success) {
        setSmsTestResult({ ok: true, msg: `SMS request sent to ${phoneToSend}!` });
      } else {
        setSmsTestResult({ 
          ok: false, 
          msg: data.message || (data.gatewayResponse ? JSON.stringify(data.gatewayResponse) : 'Failed to deliver SMS') 
        });
      }
    } catch (err) {
      setSmsTestResult({ ok: false, msg: err.message });
    } finally {
      setTestingSms(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] text-slate-400">
        <RotateCw className="w-8 h-8 animate-spin text-purple-400 mb-3" />
        <span className="font-mono text-xs">Loading alert configurations from Zabbix Server...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-xl border border-purple-500/30">
              <Bell className="w-5 h-5 text-purple-400" />
            </div>
            <h1 className="text-xl font-bold font-mono tracking-tight text-white">Alert Routing & SMS Setup</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Zabbix 7.0 Actions Active
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono">
            Automated SMS & Telegram dispatch for <span className="text-rose-400 font-bold">Device Unreachable/Recover</span> and <span className="text-amber-400 font-bold">Interface Down/Up</span> events with <span className="text-cyan-400 font-bold">multi-user device routing</span>.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchSettings(); fetchRulesAndUsers(); }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 text-xs font-mono transition border border-slate-700/50"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {ruleSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-lg">
          <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{ruleSuccessMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: PER-DEVICE USER ALERT ROUTING */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold font-mono text-white">Per-Device SMS Alert Rules (Multi-User Target Routing)</h2>
            </div>
            <p className="text-[11px] font-mono text-slate-400 mt-1">
              Assign one or more engineers to receive SMS alerts for each device. You can select multiple recipients per device.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => { handleCancelUserEdit(); setShowUsersModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition border border-slate-700"
            >
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Edit Users ({users.length})</span>
            </button>
            <button
              onClick={handleOpenAddRule}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold transition shadow-md shadow-cyan-950"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Device Rule</span>
            </button>
          </div>
        </div>

        {/* Device Rules List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                <th className="py-2.5 px-3 font-medium">Target Device (Host)</th>
                <th className="py-2.5 px-3 font-medium">Assigned Recipients (Users)</th>
                <th className="py-2.5 px-3 font-medium">Trigger Scope</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rules.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No custom device rules defined. Default action notifies all Zabbix administrators.
                  </td>
                </tr>
              ) : (
                rules.map((rule) => {
                  const assignedList = rule.users && rule.users.length > 0 ? rule.users : (rule.userName ? [{ name: rule.userName, smsPhone: rule.userPhone }] : []);
                  return (
                    <tr key={rule.actionid} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Server className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-white font-bold">{rule.hostName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5 items-center">
                          {assignedList.map((u, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-950/40 border border-purple-800/50 text-[11px] text-purple-200"
                            >
                              <Users className="w-3 h-3 text-purple-400" />
                              <strong className="text-purple-300">{u.name}</strong>
                              {u.smsPhone && (
                                <span className="text-emerald-400 font-mono text-[10px]">
                                  ({u.smsPhone})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-wrap gap-1.5">
                          {rule.notifyUnreachable && (
                            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[10px]">
                              Device Down/Recover
                            </span>
                          )}
                          {rule.notifyInterface && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[10px]">
                              Interface Down/Up
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          rule.enabled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${rule.enabled ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                          {rule.enabled ? 'Active in Zabbix' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {assignedList[0]?.smsPhone && (
                            <button
                              type="button"
                              onClick={() => handleTestSms(assignedList[0].smsPhone)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-cyan-300 border border-slate-700 mr-1"
                              title={`Send Test SMS to ${assignedList[0].smsPhone}`}
                            >
                              Test SMS
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditRule(rule)}
                            className="p-1.5 rounded bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 transition"
                            title="Edit Device Rule"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRule(rule.actionid)}
                            className="p-1.5 rounded bg-slate-800/80 hover:bg-rose-950/50 text-rose-400 hover:text-rose-300 transition"
                            title="Delete Rule"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal: Add or Edit Rule with Multi-User Checkboxes */}
        {showRuleModal && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-cyan-500/40 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-2">
                {editingRuleId ? <Edit3 className="w-4 h-4 text-cyan-400" /> : <Plus className="w-4 h-4 text-cyan-400" />}
                {editingRuleId ? 'Edit Device SMS Alert Rule (Multiple Users Supported)' : 'Create Device SMS Alert Rule'}
              </span>
              <button 
                onClick={() => setShowRuleModal(false)} 
                className="text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 block mb-1.5 font-bold">Target Device (Host):</label>
                  <select
                    value={ruleHostId}
                    onChange={(e) => setRuleHostId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2.5 rounded-xl focus:ring-1 focus:ring-cyan-500"
                    required
                  >
                    {hosts.map(h => (
                      <option key={h.hostid} value={h.hostid}>{h.name || h.host}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1.5 font-bold">Trigger Events:</label>
                  <div className="flex items-center gap-4 bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl">
                    <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ruleUnreach}
                        onChange={(e) => setRuleUnreach(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span>Device Down/Recover</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={ruleInterface}
                        onChange={(e) => setRuleInterface(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span>Interface Down/Up</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Multi-User Selection Box */}
              <div>
                <label className="text-slate-300 block mb-1.5 font-bold flex items-center justify-between">
                  <span>Assigned Recipients (Select all users who will receive SMS for this device):</span>
                  <span className="text-[10px] text-cyan-400 font-normal">
                    {ruleUserIds.length} recipient{ruleUserIds.length > 1 ? 's' : ''} selected
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800 max-h-48 overflow-y-auto">
                  {users.map(u => {
                    const isChecked = ruleUserIds.includes(String(u.userid));
                    return (
                      <label 
                        key={u.userid}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition ${
                          isChecked 
                            ? 'bg-purple-950/40 border-purple-500/60 text-white' 
                            : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleUserSelection(String(u.userid))}
                          className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-0"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold truncate text-slate-200">{u.name}</span>
                          <span className="text-[10px] text-emerald-400 font-mono truncate">{u.smsPhone || 'No MSISDN'}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ruleSaving || ruleUserIds.length === 0}
                  className="py-2 px-6 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-cyan-950"
                >
                  {ruleSaving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingRuleId ? 'Update in Zabbix' : 'Deploy to Zabbix'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal: Manage & Edit Users */}
        {showUsersModal && (
          <div className="p-5 rounded-2xl bg-slate-950 border border-purple-500/40 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold font-mono text-purple-300 flex items-center gap-2">
                <Users className="w-4 h-4" /> Manage & Edit NOC Users (Recipients)
              </span>
              <button 
                onClick={() => { setShowUsersModal(false); handleCancelUserEdit(); }} 
                className="text-slate-400 hover:text-white text-xs font-mono flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Close
              </button>
            </div>

            {/* User Form: Add or Edit */}
            <form onSubmit={handleSaveUser} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="text-slate-300 block mb-1 font-bold">
                  {editingUserId ? 'Edit Name / Label:' : 'New User Name:'}
                </label>
                <input
                  type="text"
                  placeholder="e.g. NOC Tech One"
                  value={userNameInput}
                  onChange={(e) => setUserNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-bold">MSISDN Mobile Number:</label>
                <input
                  type="text"
                  placeholder="e.g. 88019xxxxxxxx"
                  value={userPhoneInput}
                  onChange={(e) => setUserPhoneInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 px-3 py-2 rounded-xl focus:ring-1 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={userSaving}
                  className="flex-1 py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-md shadow-purple-950"
                >
                  {userSaving ? <RotateCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{editingUserId ? 'Save User' : 'Add User'}</span>
                </button>
                {editingUserId && (
                  <button
                    type="button"
                    onClick={handleCancelUserEdit}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            {/* Users List Table with Edit and Delete */}
            <div className="space-y-2">
              <span className="text-[11px] text-slate-400 font-mono font-bold block">Configured Zabbix Alert Recipients:</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 text-[11px]">
                      <th className="py-2 px-3">Username</th>
                      <th className="py-2 px-3">Display Name</th>
                      <th className="py-2 px-3">MSISDN Phone</th>
                      <th className="py-2 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {users.map(u => (
                      <tr key={u.userid} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 text-slate-400">{u.username}</td>
                        <td className="py-2.5 px-3 text-purple-300 font-bold">{u.name}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{u.smsPhone || 'No Phone'}</td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleEditUser(u)}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-cyan-300 flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </button>
                            {u.userid !== '1' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.userid, u.name)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-950/60 text-[11px] text-rose-400 flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: GATEWAY CREDENTIALS (SMS & TELEGRAM) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. MSISDN SMS Gateway Configuration (Gennet SMS Provider) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <Smartphone className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-mono text-white">Gennet SMS Gateway (MSISDN)</h2>
                <span className="text-[10px] text-slate-400 font-mono">Direct API v3 Integration</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>Default Admin MSISDN Mobile Number:</span>
                <span className="text-[10px] text-slate-500">88019xxxxxxxx</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 88019xxxxxxxx"
                value={smsMsisdn}
                onChange={(e) => setSmsMsisdn(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Sender ID (SID):</span>
                  <span className="text-[10px] text-slate-500">sid</span>
                </label>
                <input
                  type="text"
                  placeholder="TeamzeroNONMASKING"
                  value={smsSid}
                  onChange={(e) => setSmsSid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Provider Endpoint:</span>
                  <span className="text-[10px] text-emerald-400">Gennet v3</span>
                </label>
                <input
                  type="text"
                  value={smsGatewayUrl}
                  onChange={(e) => setSmsGatewayUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-400 px-3.5 py-2 rounded-xl font-mono text-[11px]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>SMS Provider API Token:</span>
                <span className="text-[10px] text-slate-500">api_token</span>
              </label>
              <input
                type="password"
                placeholder="$2y$12$XNtXdQgifD9//JpPjlFEu..."
                value={smsApiToken}
                onChange={(e) => setSmsApiToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="text-slate-300 font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-emerald-400" />
                <span>Gennet isms.gennet.com.bd JSON Gateway</span>
              </div>
              <p>Sends JSON payload with <code className="text-slate-300">api_token</code>, <code className="text-slate-300">sid: TeamzeroNONMASKING</code>, and unique <code className="text-slate-300">csms_id</code> per incident.</p>
            </div>

            {/* Test Action */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleTestSms()}
                disabled={testingSms || !smsMsisdn}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold transition disabled:opacity-50"
              >
                {testingSms ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending SMS...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Send Test SMS</span>
                  </>
                )}
              </button>

              {smsTestResult && (
                <span className={`text-[11px] font-mono ${smsTestResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {smsTestResult.msg}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Telegram Alert Channel */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20">
                <Send className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-mono text-white">Telegram Bot Alerts</h2>
                <span className="text-[10px] text-slate-400 font-mono">Zabbix Webhook ID 65</span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tgEnabled}
                onChange={(e) => setTgEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>Telegram Bot API Token:</span>
                <span className="text-[10px] text-slate-500">From @BotFather</span>
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                value={tgBotToken}
                onChange={(e) => setTgBotToken(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Chat ID / Channel ID:</span>
                  <span className="text-[10px] text-slate-500">Group or User</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. -1001234567890 or 987654321"
                  value={tgChatId}
                  onChange={(e) => setTgChatId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1.5 flex items-center justify-between">
                  <span>Parse Mode:</span>
                  <span className="text-[10px] text-slate-500">Formatting</span>
                </label>
                <select
                  value={tgParseMode}
                  onChange={(e) => setTgParseMode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 px-3.5 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                >
                  <option value="HTML">HTML</option>
                  <option value="Markdown">Markdown</option>
                  <option value="None">None</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
              <div className="text-slate-300 font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                <span>Quick Telegram Setup Guide</span>
              </div>
              <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                <li>Create your bot with <code className="text-slate-300">@BotFather</code> on Telegram to get token.</li>
                <li>Add bot to your NOC operations group and grant Admin message privileges.</li>
                <li>Paste Bot Token and Chat ID above and click test.</li>
              </ol>
            </div>

            {/* Test Action */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={testingTg || !tgChatId}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition disabled:opacity-50"
              >
                {testingTg ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Send Test Message</span>
                  </>
                )}
              </button>

              {tgTestResult && (
                <span className={`text-[11px] font-mono ${tgTestResult.ok ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {tgTestResult.msg}
                </span>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Save Button Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Synchronizes parameters to Zabbix Media Types & Administrator user profile.</span>
        </div>

        <div className="flex items-center gap-3">
          {saveSuccess && (
            <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Saved & Enabled in Zabbix!
            </span>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-mono font-bold shadow-lg shadow-purple-950 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Applying to Zabbix...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Alert Setup in Zabbix</span>
              </>
            )}
          </button>
        </div>
      </div>

    </div>
  );
}
