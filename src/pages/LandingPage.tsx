import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  MessageSquare, 
  Zap, 
  Shield, 
  Globe, 
  ArrowRight, 
  CheckCircle2, 
  Phone, 
  Facebook, 
  Instagram, 
  Twitter 
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-emerald-500/30 selection:text-emerald-400">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">OmniInbox</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#solutions" className="hover:text-emerald-400 transition-colors">Solutions</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="px-5 py-2.5 text-sm font-bold text-white hover:text-emerald-400 transition-colors">
              Log In
            </Link>
            <Link to="/dashboard" className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-sm font-bold transition-all hover:scale-105 active:scale-95">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-20 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full -z-10"></div>
        
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-6">
              <Zap className="w-3 h-3" /> Now with AI Assistance
            </span>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
              The Unified Command Center <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                For Your Business
              </span>
            </h1>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed">
              Connect WhatsApp, Messenger, LinkedIn, and more. Manage your entire team, 
              automate responses with AI, and never miss a lead again.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/dashboard" className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-[#020617] rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-xl shadow-emerald-500/20">
                Get Started Free <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-bold transition-all">
                Schedule Demo
              </button>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mt-20 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-transparent to-transparent z-10"></div>
            <div className="relative rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="h-12 bg-white/5 border-b border-white/10 flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
              </div>
              <div className="aspect-[16/9] bg-slate-900 flex items-center justify-center">
                <p className="text-slate-500 font-mono text-sm">Dashboard Interface Preview</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-24 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm font-bold text-slate-500 uppercase tracking-widest mb-12">Trusted by modern teams across platforms</p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-40 grayscale hover:grayscale-0 transition-all duration-500">
            <Phone className="w-8 h-8" title="WhatsApp" />
            <Facebook className="w-8 h-8" title="Messenger" />
            <Instagram className="w-8 h-8" title="Instagram" />
            <Twitter className="w-8 h-8" title="X" />
            <Globe className="w-8 h-8" title="Web" />
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Everything you need to scale</h2>
            <p className="text-slate-400 max-w-xl mx-auto">One platform, unlimited possibilities. Build reliable customer relationships without the chaos.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Globe className="w-10 h-10 text-emerald-400" />}
              title="Unified Inbox"
              desc="Read and reply to messages from every social platform in a single, high-performance interface."
            />
            <FeatureCard 
              icon={<Zap className="w-10 h-10 text-amber-500" />}
              title="AI Automations"
              desc="Deploy custom AI agents that understand your business and handle routine queries 24/7."
            />
            <FeatureCard 
              icon={<Shield className="w-10 h-10 text-indigo-400" />}
              title="Role-Based Security"
              desc="Enterprise-grade permissions. Control exactly what your agents can see and do."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold">OmniInbox</span>
            </div>
            <p className="text-slate-400 max-w-sm mb-8">
              The world's most advanced social inbox for high-growth businesses. 
              Built for speed, security, and scale.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-slate-400">
              <li><a href="#" className="hover:text-emerald-400 transition-colors text-sm">Dashboard</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors text-sm">Integrations</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors text-sm">AI Copilot</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-slate-400">
              <li><a href="#" className="hover:text-emerald-400 transition-colors text-sm">About Us</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors text-sm">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-emerald-400 transition-colors text-sm">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 font-bold tracking-widest uppercase">© 2026 OMNIINBOX CORP. ALL RIGHTS RESERVED.</p>
          <div className="flex items-center gap-6 opacity-40">
             <Twitter className="w-5 h-5 hover:text-emerald-400 transition-colors cursor-pointer" />
             <Facebook className="w-5 h-5 hover:text-emerald-400 transition-colors cursor-pointer" />
             <Instagram className="w-5 h-5 hover:text-emerald-400 transition-colors cursor-pointer" />
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all group">
      <div className="mb-6 p-4 rounded-2xl bg-white/5 inline-block group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-4">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
    </div>
  );
}
