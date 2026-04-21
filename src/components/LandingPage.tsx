
import React from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { FlaskConical, LogIn, ShieldCheck, Zap, Globe } from 'lucide-react';
import { motion } from 'motion/react';

export function LandingPage() {
  const { signIn } = useAuth();

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
            <FlaskConical className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight">NutraFlow</span>
        </div>
        <Button 
          variant="outline" 
          className="bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-xl h-11 px-6 backdrop-blur-md transition-all"
          onClick={signIn}
        >
          Sign In
        </Button>
      </nav>

      <main className="container mx-auto px-6 pt-20 pb-32 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1]">
              The Ultimate <span className="text-emerald-400">CRM</span> for <br />
              Nutraceutical Growth.
            </h1>
          </motion.div>

          <motion.p 
            className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Manage leads, automate order fulfillment, and track batch inventory
            all in one powerful dashboard designed specifically for health brand founders.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button 
              size="lg" 
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-10 h-14 text-lg font-semibold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95 group"
              onClick={signIn}
            >
              Get Started with Google <LogIn className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-24"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
          >
            {[
              { icon: Zap, title: "Lead Velocity", desc: "Automate lead tracking and status transitions." },
              { icon: ShieldCheck, title: "Batch Security", desc: "Precise inventory tracking with low-stock alerts." },
              { icon: Globe, title: "Omnichannel", desc: "Centralize orders from all your sales channels." }
            ].map((feature, i) => (
              <div key={i} className="p-8 bg-white/5 border border-white/10 rounded-3xl backdrop-blur-md hover:bg-white/[0.07] transition-colors text-left space-y-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit">
                  <feature.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </main>

      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-6 text-center text-slate-600 text-sm">
          &copy; 2024 NutraFlow CRM. Powering healthy outcomes.
        </div>
      </footer>
    </div>
  );
}
