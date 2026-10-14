import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Shield, 
  Key, 
  Trash2, 
  Edit3, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  Layers, 
  Activity,
  SlidersHorizontal,
  Server
} from 'lucide-react';

export default function AccessControlView({ currentUser }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users' | 'roles'
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [userGroups, setUserGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successNotice, setSuccessNotice] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // Modals state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [resetPasswordUser, setResetPasswordUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'user' | 'role', id, name }

  const showSuccess = (msg) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Fetch all access control data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [usersRes, rolesRes, groupsRes] = await Promise.all([
        fetch('/api/users').then(r => r.json()),
        fetch('/api/roles').then(r => r.json()),
        fetch('/api/usergroups').then(r => r.json())
      ]);

      if (usersRes.users) setUsers(usersRes.users);
      if (rolesRes.roles) setRoles(rolesRes.roles);
      if (groupsRes.groups) setUserGroups(groupsRes.groups);
    } catch (err) {
      console.error('Failed to load access control data:', err);
      setError('Failed to fetch users and roles from Zabbix API.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Delete Confirmation
  const handleExecuteDelete = async () => {
    if (!deleteTarget) return;
    setIsLoading(true);
    try {
      if (deleteTarget.type === 'user') {
        const res = await fetch(`/api/users/${deleteTarget.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete user');
        showSuccess(`User "${deleteTarget.name}" deleted successfully.`);
      } else if (deleteTarget.type === 'role') {
        const res = await fetch(`/api/roles/${deleteTarget.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete role');
        showSuccess(`Role "${deleteTarget.name}" deleted successfully.`);
      }
      setDeleteTarget(null);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtered users list
  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.surname || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    if (roleFilter === 'all') return matchesSearch;
    return matchesSearch && u.roleid === roleFilter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Zabbix Users</p>
              <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">{users.length}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Synchronized with Zabbix Engine</span>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Configured Roles</p>
              <h3 className="text-2xl font-extrabold text-white mt-1 font-mono">{roles.length}</h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono">
            {roles.filter(r => r.readonly === '1').length} System • {roles.filter(r => r.readonly !== '1').length} Custom
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Super Admins</p>
              <h3 className="text-2xl font-extrabold text-rose-400 mt-1 font-mono">
                {users.filter(u => u.role?.type === '3' || u.roleid === '3').length}
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono">
            Full Unrestricted Privileges
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Auth Backend</p>
              <h3 className="text-sm font-bold text-emerald-400 mt-2 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                Zabbix 7.0 JSON-RPC
              </h3>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Server className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-500 font-mono truncate">
            Node: 103.166.230.229
          </div>
        </div>

      </div>

      {/* Success Banner */}
      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Main Workspace Card with Tabs */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl shadow-xl overflow-hidden">
        
        {/* Navigation Tabs Bar */}
        <div className="border-b border-slate-800/80 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-950/40">
          
          <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'users'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Users Directory</span>
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20">
                {users.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'roles'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-950/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>User Roles</span>
              <span className="ml-1 text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-white/20">
                {roles.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
            </button>

            {activeTab === 'users' ? (
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition border border-rose-500/30 ml-auto sm:ml-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>Create User</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCreateRoleModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs shadow-lg shadow-rose-950/50 transition border border-rose-500/30 ml-auto sm:ml-0"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Create Role</span>
              </button>
            )}
          </div>

        </div>

        {/* Tab 1: Users Directory */}
        {activeTab === 'users' && (
          <div>
            
            {/* Search & Filter Bar */}
            <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search by username or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs text-slate-400 font-medium">Filter Role:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
                >
                  <option value="all">All Roles ({users.length})</option>
                  {roles.map(r => (
                    <option key={r.roleid} value={r.roleid}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-mono text-[10px] tracking-wider border-b border-slate-800/80">
                  <tr>
                    <th className="px-6 py-3.5">User Account</th>
                    <th className="px-6 py-3.5">Full Name</th>
                    <th className="px-6 py-3.5">Role</th>
                    <th className="px-6 py-3.5">Assigned Groups</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                        No users found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSuperAdmin = user.role?.type === '3' || user.roleid === '3';
                      const isAdmin = user.role?.type === '2' || user.roleid === '2';
                      const isRootAdmin = user.userid === '1';

                      return (
                        <tr key={user.userid} className="hover:bg-slate-800/40 transition">
                          
                          {/* Username & Avatar */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs uppercase shadow-md ${
                                isSuperAdmin 
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : isAdmin 
                                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              }`}>
                                {user.username.slice(0, 2)}
                              </div>
                              <div>
                                <div className="font-bold text-white flex items-center gap-2">
                                  <span>{user.username}</span>
                                  {isRootAdmin && (
                                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono">
                                      Root
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] font-mono text-slate-500">
                                  ID: {user.userid}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Full Name */}
                          <td className="px-6 py-4">
                            <div className="text-slate-200">
                              {(user.name || user.surname) ? `${user.name || ''} ${user.surname || ''}`.trim() : (
                                <span className="text-slate-500 italic">Not specified</span>
                              )}
                            </div>
                          </td>

                          {/* Role Badge */}
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                              isSuperAdmin
                                ? 'bg-rose-500/10 text-rose-300 border-rose-500/25'
                                : isAdmin
                                ? 'bg-blue-500/10 text-blue-300 border-blue-500/25'
                                : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/25'
                            }`}>
                              <Shield className="w-3 h-3" />
                              {user.role?.name || (isSuperAdmin ? 'Super admin' : 'User')}
                            </span>
                          </td>

                          {/* Groups */}
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1">
                              {user.usrgrps && user.usrgrps.length > 0 ? (
                                user.usrgrps.map(g => (
                                  <span key={g.usrgrpid} className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono">
                                    {g.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 italic text-[11px]">None</span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              
                              {/* Reset Password */}
                              <button
                                onClick={() => setResetPasswordUser(user)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                                title="Change / Reset Password"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-400" />
                              </button>

                              {/* Delete User */}
                              {!isRootAdmin && (
                                <button
                                  onClick={() => setDeleteTarget({ type: 'user', id: user.userid, name: user.username })}
                                  className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition"
                                  title="Delete User"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* Tab 2: User Roles */}
        {activeTab === 'roles' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {roles.map((role) => {
                const isReadonly = role.readonly === '1';
                const isSuperAdmin = role.type === '3';
                const isAdmin = role.type === '2';

                return (
                  <div 
                    key={role.roleid}
                    className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${
                            isSuperAdmin
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isAdmin
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}>
                            <Shield className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{role.name}</h4>
                            <span className="text-[10px] font-mono text-slate-500">ID: {role.roleid}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full font-bold border ${
                          isReadonly 
                            ? 'bg-slate-800 text-slate-400 border-slate-700'
                            : 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                        }`}>
                          {isReadonly ? 'System' : 'Custom'}
                        </span>
                      </div>

                      {/* Role Type */}
                      <div className="mt-4 pt-3 border-t border-slate-800/70 text-xs flex items-center justify-between text-slate-400">
                        <span>Role Type:</span>
                        <span className="font-bold text-slate-200">
                          {isSuperAdmin ? 'Super Administrator' : isAdmin ? 'Administrator' : 'Standard User'}
                        </span>
                      </div>

                      {/* Capabilities Summary */}
                      <div className="mt-2 text-[11px] text-slate-400 space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Monitoring Dashboards & Hosts</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Trigger Alerts & Acknowledge</span>
                        </div>
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span>System & User Administration</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="pt-3 border-t border-slate-800/70 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-mono">
                        {users.filter(u => u.roleid === role.roleid).length} assigned users
                      </span>

                      {!isReadonly && (
                        <button
                          onClick={() => setDeleteTarget({ type: 'role', id: role.roleid, name: role.name })}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs flex items-center gap-1.5 transition"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* MODAL 1: Create User Modal */}
      {showCreateUserModal && (
        <CreateUserModal
          roles={roles}
          userGroups={userGroups}
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={() => {
            setShowCreateUserModal(false);
            showSuccess('New user successfully created in Zabbix.');
            loadData();
          }}
        />
      )}

      {/* MODAL 2: Create Role Modal */}
      {showCreateRoleModal && (
        <CreateRoleModal
          onClose={() => setShowCreateRoleModal(false)}
          onSuccess={() => {
            setShowCreateRoleModal(false);
            showSuccess('New role successfully created in Zabbix.');
            loadData();
          }}
        />
      )}

      {/* MODAL 3: Reset / Change Password Modal */}
      {resetPasswordUser && (
        <ResetUserPasswordModal
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={() => {
            setResetPasswordUser(null);
            showSuccess(`Password for "${resetPasswordUser.username}" was updated in Zabbix.`);
            loadData();
          }}
        />
      )}

      {/* MODAL 4: Delete Confirmation */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-white">Confirm Deletion</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed mb-5">
              Are you sure you want to permanently delete {deleteTarget.type} <strong className="text-white">"{deleteTarget.name}"</strong> from Zabbix? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ----------------------------------------------------------------------
// Sub-Modal: Create User
// ----------------------------------------------------------------------
function CreateUserModal({ roles, userGroups, onClose, onSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleId, setRoleId] = useState(roles[0]?.roleid || '1');
  const [selectedGroups, setSelectedGroups] = useState(['7']); // default Zabbix administrators
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Username and password are required.');
      return;
    }

    if (password.length < 5) {
      setError('Password must be at least 5 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          passwd: password,
          name: firstName.trim(),
          surname: lastName.trim(),
          roleid: roleId,
          usrgrps: selectedGroups.map(gid => ({ usrgrpid: String(gid) }))
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create user in Zabbix');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Create New Zabbix User</h3>
              <p className="text-[11px] text-slate-400">Add an operator to Zabbix access control</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Username <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. noc_analyst_1"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
            />
          </div>

          {/* Name & Surname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Password & Confirm */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Confirm Password <span className="text-rose-400">*</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              User Role <span className="text-rose-400">*</span>
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-rose-500 font-medium"
            >
              {roles.map(r => (
                <option key={r.roleid} value={r.roleid}>
                  {r.name} ({r.type === '3' ? 'Super Admin' : r.type === '2' ? 'Admin' : 'User'})
                </option>
              ))}
            </select>
          </div>

          {/* User Groups */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Assign to User Group(s) <span className="text-rose-400">*</span>
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto p-2 bg-slate-950/80 border border-slate-800 rounded-xl">
              {userGroups.map(grp => {
                const checked = selectedGroups.includes(grp.usrgrpid);
                return (
                  <label key={grp.usrgrpid} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedGroups([...selectedGroups, grp.usrgrpid]);
                        } else {
                          setSelectedGroups(selectedGroups.filter(id => id !== grp.usrgrpid));
                        }
                      }}
                      className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                    />
                    <span className="text-slate-200 font-medium">{grp.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/50 transition flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Creating in Zabbix...' : 'Create User'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Sub-Modal: Create Role
// ----------------------------------------------------------------------
function CreateRoleModal({ onClose, onSuccess }) {
  const [roleName, setRoleName] = useState('');
  const [roleType, setRoleType] = useState('1'); // 1: User, 2: Admin
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) {
      setError('Role name is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName.trim(),
          type: parseInt(roleType, 10)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create role');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Create Custom Role</h3>
              <p className="text-[11px] text-slate-400">Define a new permission group in Zabbix</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Role Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="e.g. NOC Level-1 Operator"
              required
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Base Role Type <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <label 
                className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition ${
                  roleType === '1'
                    ? 'bg-rose-500/10 border-rose-500/40 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">User Role</span>
                  <input
                    type="radio"
                    name="roleType"
                    value="1"
                    checked={roleType === '1'}
                    onChange={() => setRoleType('1')}
                    className="text-rose-600"
                  />
                </div>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Standard NOC monitoring and problem acknowledgment.
                </span>
              </label>

              <label 
                className={`p-3 rounded-xl border cursor-pointer flex flex-col gap-1 transition ${
                  roleType === '2'
                    ? 'bg-blue-500/10 border-blue-500/40 text-white'
                    : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs">Admin Role</span>
                  <input
                    type="radio"
                    name="roleType"
                    value="2"
                    checked={roleType === '2'}
                    onChange={() => setRoleType('2')}
                    className="text-blue-600"
                  />
                </div>
                <span className="text-[10px] text-slate-400 leading-tight">
                  Advanced host configuration and maintenance privileges.
                </span>
              </label>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-950/50 transition flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Creating Role...' : 'Create Role'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Sub-Modal: Reset / Change Password
// ----------------------------------------------------------------------
function ResetUserPasswordModal({ user, onClose, onSuccess }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 5) {
      setError('Password must be at least 5 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userid: user.userid,
          newPassword
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update password');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Reset Password</h3>
              <p className="text-[11px] text-slate-400">Account: <span className="font-mono text-slate-200 font-bold">{user.username}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                required
                autoFocus
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Confirm New Password
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !newPassword || newPassword !== confirmPassword}
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-950/50 transition flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? 'Updating...' : 'Update Password'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
