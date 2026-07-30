import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Gavel, Users, Briefcase, Eye, EyeOff, LogIn, AlertCircle, ChevronDown } from 'lucide-react';
import { useMockDb } from '../context/MockDbContext';
import { DEMO_USERS, DemoUser } from '../data/users';

type Role = 'judge' | 'lawyer' | 'litigant';

const ROLE_CONFIG: Record<Role, { label: string; icon: React.FC<any>; accent: string; bg: string; border: string; path: string }> = {
  judge:    { label: "Hon'ble Judge",   icon: Gavel,     accent: 'bg-judicial-600 hover:bg-judicial-700', bg: 'bg-judicial-50', border: 'border-judicial-200', path: '/judge' },
  lawyer:   { label: 'Legal Counsel',   icon: Briefcase,  accent: 'bg-emerald-600 hover:bg-emerald-700',   bg: 'bg-emerald-50',  border: 'border-emerald-200',  path: '/lawyer' },
  litigant: { label: 'Litigant / Citizen', icon: Users,  accent: 'bg-indigo-600 hover:bg-indigo-700',    bg: 'bg-indigo-50',   border: 'border-indigo-200',   path: '/litigant' },
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useMockDb();

  const [selectedRole, setSelectedRole] = useState<Role>('judge');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [showCredentials, setShowCredentials] = useState(false);

  const roleUsers = DEMO_USERS.filter(u => u.role === selectedRole);
  const cfg = ROLE_CONFIG[selectedRole];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const user = DEMO_USERS.find(
      u => u.email.trim().toLowerCase() === email.trim().toLowerCase()
        && u.password === password
        && u.role === selectedRole
    );

    if (!user) {
      setError('Invalid credentials. Check email & password for the selected role.');
      return;
    }

    login(user.email, user.role, user.name);
    navigate(cfg.path);
  };

  const fillCredentials = (u: DemoUser) => {
    setEmail(u.email);
    setPassword(u.password);
    setShowCredentials(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-judicial-950 to-slate-900 flex flex-col items-center justify-center p-4">

      {/* Header */}
      <div className="text-center mb-10 animate-fade-in-up">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-judicial-500 rounded-2xl mb-5 shadow-2xl shadow-judicial-500/40">
          <Scale size={40} className="text-white" />
        </div>
        <h1 className="text-5xl font-black text-white mb-3 font-serif tracking-tight">Nyaya-Gati</h1>
        <p className="text-slate-400 text-base max-w-md mx-auto">
          AI-Powered Judicial Case Management System
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">

          {/* Role Selector Tabs */}
          <div className="flex rounded-2xl bg-slate-800/60 p-1.5 mb-8 gap-1">
            {(Object.keys(ROLE_CONFIG) as Role[]).map(role => {
              const rc = ROLE_CONFIG[role];
              const RoleIcon = rc.icon;
              return (
                <button
                  key={role}
                  onClick={() => { setSelectedRole(role); setEmail(''); setPassword(''); setError(''); }}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    selectedRole === role
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <RoleIcon size={16} />
                  <span className="hidden sm:block">{rc.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">
                {cfg.label} Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={`e.g. ${roleUsers[0]?.email}`}
                required
                className="w-full px-4 py-3 rounded-xl bg-slate-800/60 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-judicial-400 focus:border-transparent transition text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full px-4 py-3 pr-12 rounded-xl bg-slate-800/60 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-judicial-400 focus:border-transparent transition text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 bg-red-900/30 border border-red-700/50 text-red-300 rounded-xl px-4 py-3 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all ${cfg.accent}`}
            >
              <LogIn size={18} />
              Login as {cfg.label}
            </button>
          </form>

          {/* Demo Credentials Collapsible */}
          <div className="mt-6 border border-white/10 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowCredentials(p => !p)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-slate-400 hover:text-white hover:bg-white/5 transition text-sm font-bold"
            >
              <span>📋 Demo Credentials for {cfg.label}</span>
              <ChevronDown size={16} className={`transition-transform ${showCredentials ? 'rotate-180' : ''}`} />
            </button>

            {showCredentials && (
              <div className="border-t border-white/10 divide-y divide-white/5">
                {roleUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => fillCredentials(u)}
                    className="w-full px-5 py-4 flex items-center gap-4 hover:bg-white/5 transition text-left group"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black flex-shrink-0 ${u.avatarBg}`}>
                      {u.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm truncate">{u.name}</p>
                      <p className="text-slate-400 text-xs truncate font-mono">{u.email}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{u.title}</p>
                    </div>
                    <span className="text-xs font-bold text-judicial-400 group-hover:text-judicial-300 flex-shrink-0">
                      Fill →
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          All passwords for demo accounts: <span className="font-mono text-slate-400">judge123 / lawyer123 / litigant123</span>
        </p>
      </div>
    </div>
  );
};

export default Login;
