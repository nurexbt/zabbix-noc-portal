import React, { useState } from 'react';
import { 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  X,
  ShieldCheck
} from 'lucide-react';

export default function ChangePasswordModal({ user, mandatory = false, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Compute password strength
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, text: 'None', color: 'bg-slate-700' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 10) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) return { score, text: 'Weak', color: 'bg-amber-500' };
    if (score <= 4) return { score, text: 'Good', color: 'bg-blue-500' };
    return { score, text: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getStrength(newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    const usernameStr = (user?.username || 'admin').toLowerCase();
    if (newPassword.toLowerCase().includes(usernameStr)) {
      setError(`Zabbix policy: Password cannot contain your username ("${user?.username || 'admin'}"). Try e.g. "NocPortal2026!" or "SecureOps2026!".`);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userid: user?.userid || '1',
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password');
      }

      setSuccessMsg('Password successfully updated in Zabbix!');
      setTimeout(() => {
        onSuccess(newPassword);
      }, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl shadow-black overflow-hidden relative">
        
        {/* Top Header */}
        <div className={`p-5 border-b border-slate-800/80 flex items-center justify-between ${
          mandatory ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-rose-950/40' : 'bg-slate-950/40'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              mandatory ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
            }`}>
              {mandatory ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <Key className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                {mandatory ? 'Mandatory Password Change' : 'Change Password'}
                {mandatory && (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    Required
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-400">
                Updating account: <span className="font-mono text-slate-200 font-bold">{user?.username || 'admin'}</span>
              </p>
            </div>
          </div>

          {!mandatory && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {mandatory && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                Default credentials were detected. To ensure NOC operations security, you must set a new password before accessing the dashboard.
                <div className="mt-1 text-[11px] text-amber-300/80 font-mono">
                  • Policy: Min 6 characters & must not contain username ("{user?.username || 'admin'}").
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1 font-semibold">{successMsg}</div>
            </div>
          )}

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                required
                autoFocus
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Meter */}
            {newPassword.length > 0 && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">Strength:</span>
                  <span className="text-slate-300 font-bold">{strength.text}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div 
                    className={`h-full transition-all duration-300 ${strength.color}`} 
                    style={{ width: `${Math.min(100, (strength.score / 5) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-[11px] text-rose-400 mt-1">Passwords do not match</p>
            )}
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-2 flex items-center gap-3">
            {!mandatory && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 transition"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={isLoading || !newPassword || newPassword !== confirmPassword}
              className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                mandatory
                  ? 'bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 shadow-amber-950/50'
                  : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-950/50'
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating Zabbix...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Save Password & Continue</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
