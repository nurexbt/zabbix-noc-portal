import React, { useState } from 'react';
import { 
  Activity, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Server,
  ArrowRight
} from 'lucide-react';

export default function LoginView({ onLoginSuccess }) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDefault = () => {
    setUsername('admin');
    setPassword('admin');
    setError(null);
  };

  return (
    <div className="min-h-screen w-screen bg-[#070b14] flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 shadow-xl shadow-rose-950/60 border border-rose-500/30 mb-4 relative">
            <Activity className="w-8 h-8 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#070b14]"></div>
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center justify-center gap-2">
            ZABBIX NOC PORTAL
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              7.0 LTS
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1.5">
            Enterprise Operations Center & JSON-RPC Gateway
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800/80">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
              <ShieldCheck className="w-4 h-4 text-rose-400" />
              <span>Operator Authentication</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              Zabbix Node Online
            </span>
          </div>

          {/* Quick Default Credentials Banner */}
          <div className="mb-5 p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-200">Default Credentials:</div>
              <div className="font-mono text-slate-400">admin / admin <span className="text-slate-500">(or Admin / zabbix)</span></div>
            </div>
            <button
              type="button"
              onClick={handleFillDefault}
              className="text-[10px] font-mono px-2.5 py-1 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition"
            >
              Autofill
            </button>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoFocus
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Note on Password Change Requirement */}
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>First-time logins will be prompted to change default password</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-950/50 border border-rose-500/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Authenticating with Zabbix...</span>
                </>
              ) : (
                <>
                  <span>Sign In to NOC Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] font-mono text-slate-500 flex items-center justify-center gap-3">
          <span className="flex items-center gap-1">
            <Server className="w-3 h-3 text-slate-400" />
            103.166.230.229
          </span>
          <span>•</span>
          <span>JSON-RPC 2.0 Auth</span>
        </div>

      </div>
    </div>
  );
}
