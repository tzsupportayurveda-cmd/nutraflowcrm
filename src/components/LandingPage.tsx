
import React, { useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Stethoscope, LogIn, ShieldCheck, Zap, Globe, Loader2, AlertCircle, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export function LandingPage() {
  const { signIn, login, signup, error, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [view, setView] = useState<'login' | 'signup'>('login');

  const handleAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (view === 'login') {
      login(email, password);
    } else {
      signup(email, password, name);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-emerald-500/30 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-500 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600 rounded-full blur-[120px]"></div>
      </div>

      <nav className="container mx-auto px-6 py-8 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/20">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-white">TOZ Flow</span>
        </div>
      </nav>

      <main className="container mx-auto px-6 pt-10 pb-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-20 items-center max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1]">
              The Ultimate <span className="text-emerald-400">CRM</span> for <br />
              Nutraceutical Growth.
            </h1>
            <p className="text-slate-400 text-lg max-w-xl leading-relaxed">
              TOZ Flow helps health brand founders manage leads, automate orders, and track inventory in real-time.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 mt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">Restricted Access</p>
                  <p className="text-xs text-slate-500">Only approved agents can enter.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/5 rounded-lg border border-white/10 mt-1">
                  <Zap className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">Real-Time Sync</p>
                  <p className="text-xs text-slate-500">Fast updates across all agents.</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full max-w-md mx-auto lg:ml-auto"
          >
            <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 backdrop-blur-xl shadow-2xl relative">
              <div className="absolute -top-6 -right-6 p-4 bg-emerald-500 rounded-2xl shadow-xl shadow-emerald-500/20 rotate-12">
                <Lock className="w-6 h-6 text-white" />
              </div>

              <div className="flex p-1 bg-white/5 rounded-2xl mb-8">
                <button 
                  className={cn("flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all", view === 'login' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white")}
                  onClick={() => setView('login')}
                >
                  Login
                </button>
                <button 
                  className={cn("flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-xl transition-all", view === 'signup' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white")}
                  onClick={() => setView('signup')}
                >
                  Join Team
                </button>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white mb-2">{view === 'login' ? 'Secure Login' : 'Request Access'}</h2>
                <p className="text-slate-500 text-sm font-medium italic">
                  {view === 'login' ? 'Authorized personnel access only.' : 'Provide your details for admin approval.'}
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-200">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p className="text-sm font-medium italic">{error}</p>
                </div>
              )}

              <form onSubmit={handleAction} className="space-y-4">
                {view === 'signup' && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                    <Input 
                      placeholder="Agent Name" 
                      className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder:text-slate-600"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Work Email</label>
                  <Input 
                    type="email" 
                    placeholder="name@tozflow.com" 
                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder:text-slate-600"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Create Secret Key</label>
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="bg-white/5 border-white/10 h-12 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder:text-slate-600"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="pt-2">
                  <Button 
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98]" 
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (view === 'login' ? <LogIn className="w-5 h-5 mr-2" /> : <ShieldCheck className="w-5 h-5 mr-2" />)}
                    {view === 'login' ? 'Enter Workspace' : 'Send Request'}
                  </Button>
                </div>
              </form>

              <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                <Button 
                  variant="outline" 
                  className="w-full bg-transparent border-white/10 hover:bg-white/5 text-white h-11 rounded-xl transition-all"
                  onClick={signIn}
                  disabled={loading}
                >
                  <Globe className="w-4 h-4 mr-2" /> Continue with Google
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-8 mt-auto">
        <div className="container mx-auto px-6 text-center text-slate-600 text-xs">
          &copy; 2024 TOZ Flow CRM • Enterprise Security Active
        </div>
      </footer>
    </div>
  );
}
