import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, 
  Award, 
  Sparkles, 
  Activity, 
  Globe, 
  AlertTriangle, 
  TrendingUp, 
  Cpu, 
  Target, 
  Clock, 
  ArrowUpRight, 
  ShieldCheck, 
  MessageCircle, 
  LayoutGrid, 
  Search,
  Filter,
  BarChart4,
  BrainCircuit,
  Lightbulb,
  MousePointer2,
  ChevronRight,
  TrendingDown,
  Timer,
  Info,
  Settings,
  MoreVertical
} from "lucide-react";
import { 
  LineChart, 
  Line, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  CartesianGrid
} from 'recharts';

interface Employee {
  id: number;
  name: string;
  email: string;
  verified: boolean;
  roles: string[];
  status: string;
  joinedDate: string;
  avatar: string;
  isMessagingActive?: boolean;
  isOnline?: boolean;
  currentLoad?: number;
  avgResponseTime?: number;
  resolvedChats?: number;
  rating?: number;
  performanceScore?: number;
}

interface PerformanceIntelligenceViewProps {
  employees: Employee[];
  smartModeEnabled: boolean;
  setSmartModeEnabled: (val: boolean) => void;
  appColors: {
    sidebarTop: string;
    sidebarMiddle: string;
    sidebarBottom: string;
    primaryAccent: string;
    pageBg: string;
    cardBg: string;
  };
  currentUser: any;
}

// Extends base Employee with historical data for trend analysis
interface AgentIntelligence extends Employee {
  trend: { time: string; score: number }[];
  predictedLoad: number;
  sentimentAverage: number;
  slaRisk: boolean;
}

/**
 * PerformanceIntelligenceView - Agent Monitoring & Decision Matrix
 * 
 * Provides a high-fidelity overview of the workforce performance using real-time telemetry.
 * 
 * Key Features:
 * - Real-time Performance Simulation with historical trend charts
 * - SLA Monitoring and Risk Alert system
 * - AI Dispatcher Engine: Uses a weighted algorithm (Performance, Response, Load, Rating)
 *   to determine the best available agent for incoming streams.
 * - Dynamic Activity Streams: Real-time event log for operational visibility
 */
const PerformanceIntelligenceView: React.FC<PerformanceIntelligenceViewProps> = ({ 
  employees, 
  smartModeEnabled, 
  setSmartModeEnabled,
  appColors,
  currentUser
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"All" | "High Performance" | "At Risk" | "Online">("All");
  
  // Historical data for trend visualization (Recharts)
  const [simulationData, setSimulationData] = useState<{ [key: number]: number[] }>({});
  
  // System activity log
  const [activityLog, setActivityLog] = useState<{ id: string; msg: string; type: 'info' | 'success' | 'alert'; time: string }[]>([]);
  
  // Weights for the AI assignment decision engine
  const [reassignmentWeights, setReassignmentWeights] = useState({ perf: 40, response: 20, load: 20, rating: 20 });
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  const isAdmin = currentUser.role === "Super Admin";

  /**
   * Performance Telemetry Simulator
   * Periodically generates mock data to simulate real-time performance fluctuations
   * across the fleet of agents.
   */
  useEffect(() => {
    const handle = setInterval(() => {
      setSimulationData(prev => {
        const newData = { ...prev };
        employees.forEach(e => {
          if (!newData[e.id]) {
             newData[e.id] = Array(10).fill(e.performanceScore || 0);
          }
          newData[e.id] = [...newData[e.id].slice(1), e.performanceScore || Math.round(50 + Math.random() * 50)];
        });
        return newData;
      });

      // Periodic random events for the log
      if (Math.random() > 0.6) {
        const onlineAgents = employees.filter(e => e.isOnline);
        if (onlineAgents.length > 0) {
          const randomAgent = onlineAgents[Math.floor(Math.random() * onlineAgents.length)];
          const types: ('info' | 'success' | 'alert')[] = ['info', 'success', 'alert'];
          const msgs = [
            `Agent ${randomAgent.name} resolved 3 chats in 2mins`,
            `High priority lead assigned to ${randomAgent.name}`,
            `SLA threshold reached for ${randomAgent.name}`,
            `Sentiment score for ${randomAgent.name}'s active queue is rising`,
            `Predictive bottleneck detected for ${randomAgent.name}`
          ];
          const eventType = types[Math.floor(Math.random() * types.length)];
          setActivityLog(prev => [{
            id: Math.random().toString(36),
            msg: msgs[Math.floor(Math.random() * msgs.length)],
            type: eventType,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          }, ...prev.slice(0, 10)]);
        }
      }
    }, 4000 / simulationSpeed);

    return () => clearInterval(handle);
  }, [employees, simulationSpeed]);

  // Derived Intelligence Data
  const intelligentAgents = useMemo((): AgentIntelligence[] => {
    return employees.map(e => ({
      ...e,
      trend: (simulationData[e.id] || Array(10).fill(e.performanceScore || 0)).map((score, i) => ({ time: i.toString(), score })),
      predictedLoad: Math.round((e.currentLoad || 0) + (Math.random() * 2)),
      sentimentAverage: Math.round(70 + (Math.random() * 30)),
      slaRisk: (e.currentLoad || 0) > 10 || (e.avgResponseTime || 0) > 180 || (e.performanceScore || 0) < 40
    }));
  }, [employees, simulationData]);

  const filteredAgents = intelligentAgents.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "High Performance") return (a.performanceScore || 0) > 85;
    if (activeFilter === "At Risk") return a.slaRisk;
    if (activeFilter === "Online") return a.isOnline;
    return true;
  });

  /**
   * The "Engine": Best Agent Calculation
   * 
   * Calculates a holistic score for each agent based on:
   * - Performance Score (historical output quality)
   * - Latency (average response time)
   * - Current Workload (capacity vs active tasks)
   * - Customer Rating (CSAT)
   */
  const bestAgent = useMemo(() => {
    const pool = intelligentAgents.filter(a => a.isOnline);
    if (pool.length === 0) return null;

    return pool.reduce((prev, curr) => {
      const getScore = (a: AgentIntelligence) => {
        const perf = (a.performanceScore || 0) * (reassignmentWeights.perf / 100);
        const resp = (1 - Math.min(1, (a.avgResponseTime || 0) / 300)) * (reassignmentWeights.response / 100) * 100;
        const load = (1 - Math.min(1, (a.currentLoad || 0) / 15)) * (reassignmentWeights.load / 100) * 100;
        const rate = ((a.rating || 0) / 5) * (reassignmentWeights.rating / 100) * 100;
        return perf + resp + load + rate;
      };
      return getScore(curr) > getScore(prev) ? curr : prev;
    });
  }, [intelligentAgents, reassignmentWeights]);

  const getConfidence = (a: AgentIntelligence) => {
    return Math.round((a.performanceScore || 0) * 0.95);
  };

  const getStatusColor = (a: AgentIntelligence) => {
    if (!a.isOnline) return "bg-slate-600";
    if (a.slaRisk) return "bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.6)]";
    if ((a.currentLoad || 0) > 7) return "bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]";
    return "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)]";
  };

  return (
    <div className="min-h-screen text-slate-200 p-4 md:p-8 font-sans selection:bg-rose-500/30" style={{ backgroundColor: appColors.pageBg }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Outfit:wght@300;400;600;800&display=swap');
        .font-sans { font-family: 'Outfit', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .bg-grid { background-image: radial-gradient(#ffffff0a 1px, transparent 1px); background-size: 40px 40px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 4s ease-in-out infinite; }
        .accent-shadow { filter: drop-shadow(0 0 10px ${appColors.primaryAccent}40); }
        .sidebar-grad { background: linear-gradient(135deg, ${appColors.sidebarTop}, ${appColors.sidebarMiddle}); }
      `}</style>
      
      <div className="max-w-[1700px] mx-auto space-y-8 relative">
        <div className="absolute inset-0 bg-grid -z-10" />
        
        {/* HEADER SECTION */}
        <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 pb-4 border-b border-white/5">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="px-2 py-0.5 rounded-md border" style={{ backgroundColor: `${appColors.primaryAccent}10`, borderColor: `${appColors.primaryAccent}20` }}>
                <span className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: appColors.primaryAccent }}>System Ready</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: appColors.primaryAccent }} />
                 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Telemetry Active</span>
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
               {isAdmin ? "Intelligence " : "Performance "}
               <span style={{ color: appColors.primaryAccent }}>{isAdmin ? "Matrix" : "Intelligence"}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="backdrop-blur-xl border border-white/5 p-1 rounded-2xl flex items-center gap-1" style={{ backgroundColor: `${appColors.cardBg}80` }}>
              {(["All", "Online", "High Performance", "At Risk"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-5 py-2 rounded-xl text-xs font-bold tracking-tight transition-all ${activeFilter === f ? 'text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                  style={activeFilter === f ? { backgroundColor: appColors.primaryAccent, boxShadow: `0 10px 20px ${appColors.primaryAccent}30` } : {}}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-emerald-500 transition-colors" style={{ color: searchQuery ? appColors.primaryAccent : '' }} />
              <input 
                type="text" 
                placeholder="Search agents..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="backdrop-blur-xl border border-white/5 pl-11 pr-6 py-3 rounded-2xl text-sm w-full md:min-w-[320px] focus:outline-none transition-all font-mono"
                style={{ backgroundColor: `${appColors.cardBg}80` }}
              />
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: STATS & HEATMAP */}
          <div className="col-span-12 xl:col-span-9 space-y-8">
            
            {/* TOP STATS BENTO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Network Integrity', value: '99.9', sub: 'EST: 4ms', icon: Globe, color: 'text-blue-400', trend: '+0.1%' },
                { label: 'Fleet Efficiency', value: '92.4', sub: '+4% vs avg', icon: Zap, color: 'text-rose-400', trend: 'OPTIMAL' },
                { label: 'Workload Pressure', value: 'LOW', sub: '3.2/agent', icon: LayoutGrid, color: 'text-amber-400', trend: 'STABLE' },
                { label: 'Active Insights', value: '42', sub: 'Analyzed 2s ago', icon: BrainCircuit, color: 'text-purple-400', trend: 'LIVE' },
              ].map((stat, i) => (
                <motion.div 
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-6 rounded-[2rem] border border-white/5 relative group overflow-hidden"
                  style={{ backgroundColor: appColors.cardBg }}
                >
                  <div className="absolute top-0 right-0 p-4 transform translate-x-4 -translate-y-4 opacity-5 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
                    <stat.icon className="w-16 h-16" />
                  </div>
                  <div className="flex justify-between items-start mb-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{stat.label}</p>
                    <span className={`text-[9px] font-black ${stat.color} bg-black/40 px-2 py-0.5 rounded border border-white/5`}>{stat.trend}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-4xl font-black text-white tracking-tighter">{stat.value}</h3>
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">{stat.sub}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* MAIN HEATMAP GRID */}
            <div className="border border-white/5 rounded-[3rem] p-8 min-h-[600px] relative" style={{ backgroundColor: appColors.cardBg }}>
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl flex items-center justify-center border" style={{ backgroundColor: `${appColors.primaryAccent}10`, borderColor: `${appColors.primaryAccent}20` }}>
                        <LayoutGrid className="w-5 h-5" style={{ color: appColors.primaryAccent }} />
                     </div>
                     <div>
                        <h2 className="text-xl font-black text-white tracking-tight">Agent Telemetry</h2>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Real-time status synchronization</p>
                     </div>
                  </div>
                  <div className="flex items-center gap-4 px-4 py-2 bg-black/40 rounded-2xl border border-white/5">
                     <div className="flex items-center gap-2 pr-4 border-r border-white/10">
                        <Filter className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[10px] font-bold text-slate-400">Sorting by Performance</span>
                     </div>
                     <button className="p-1.5 hover:bg-white/5 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {filteredAgents.map((agent) => (
                      <AgentCard key={agent.id} agent={agent} statusColor={getStatusColor(agent)} appColors={appColors} />
                    ))}
                  </AnimatePresence>
               </div>
            </div>

            {/* ANALYTICS TRENDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="p-8 rounded-[2.5rem] border border-white/5" style={{ backgroundColor: appColors.cardBg }}>
                  <div className="flex items-center justify-between mb-8">
                     <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                        <TrendingUp className="w-5 h-5" style={{ color: appColors.primaryAccent }} />
                        Fleet Performance Velocity
                     </h3>
                     <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-mono">Last 60m</span>
                  </div>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={intelligentAgents[0]?.trend || []}>
                        <defs>
                          <linearGradient id="colorPerf" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={appColors.primaryAccent} stopOpacity={0.3}/>
                            <stop offset="95%" stopColor={appColors.primaryAccent} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="score" stroke={appColors.primaryAccent} strokeWidth={3} fillOpacity={1} fill="url(#colorPerf)" />
                        <RechartsTooltip 
                          contentStyle={{ background: appColors.cardBg, border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', color: '#fff' }}
                          labelStyle={{ display: 'none' }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="p-8 rounded-[2.5rem] border border-white/5 flex flex-col" style={{ backgroundColor: appColors.cardBg }}>
                  <div className="flex items-center justify-between mb-10">
                     <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-3">
                        <ShieldCheck className="w-5 h-5 text-blue-400" />
                        SLA Compliance Target
                     </h3>
                     <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">ABOVE AVG</span>
                  </div>
                  <div className="flex-1 flex items-center justify-around">
                    <div className="relative w-48 h-48">
                       <svg className="w-full h-full -rotate-90">
                          <circle cx="96" cy="96" r="80" className="stroke-slate-900 fill-none" strokeWidth="16" />
                          <circle 
                            cx="96" cy="96" r="80" 
                            className="fill-none transition-all duration-1000" 
                            style={{ stroke: appColors.primaryAccent }}
                            strokeWidth="16" 
                            strokeDasharray={`${2 * Math.PI * 80}`}
                            strokeDashoffset={`${2 * Math.PI * 80 * 0.15}`}
                            strokeLinecap="round"
                          />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-4xl font-black text-white tracking-tighter">85%</span>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Active Met</span>
                       </div>
                    </div>
                    <div className="space-y-6">
                       {[
                         { l: 'Critical', v: '2', c: 'bg-rose-500' },
                         { l: 'Healthy', v: '18', c: 'bg-emerald-500' },
                         { l: 'Degraded', v: '4', c: 'bg-amber-500' }
                       ].map(i => (
                         <div key={i.l} className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                               <div className={`w-1.5 h-1.5 rounded-full ${i.c}`} />
                               {i.l}
                            </span>
                            <span className="text-xl font-black text-white">{i.v}</span>
                         </div>
                       ))}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* RIGHT COLUMN: AI & DECISIONS */}
          <div className="col-span-12 xl:col-span-3 space-y-8">
            
            {/* OPTIMIZATION ENGINE */}
            <div className="p-8 rounded-[3rem] border border-white/5 relative overflow-hidden" style={{ backgroundColor: appColors.cardBg }}>
               <div className="absolute -top-10 -right-10 opacity-5">
                  <Sparkles className="w-48 h-48" style={{ color: appColors.primaryAccent }} />
               </div>
               <div className="flex items-center gap-3 mb-8">
                  <div className="p-2 rounded-xl border" style={{ backgroundColor: `${appColors.primaryAccent}10`, borderColor: `${appColors.primaryAccent}20` }}>
                    <Sparkles className="w-4 h-4" style={{ color: appColors.primaryAccent }} />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">AI Dispatcher</h3>
               </div>

               {bestAgent ? (
                 <div className="space-y-6 relative z-10">
                    <div className="p-6 rounded-[2.5rem] border text-center space-y-4" style={{ backgroundColor: `${appColors.primaryAccent}05`, borderColor: `${appColors.primaryAccent}10` }}>
                       <div className="mx-auto w-20 h-20 rounded-3xl bg-slate-900 flex items-center justify-center text-4xl border border-white/10 shadow-2xl relative">
                          {bestAgent.avatar}
                          <div className="absolute -bottom-2 -right-2 text-white w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black border-4 shadow-xl" style={{ backgroundColor: appColors.primaryAccent, borderColor: appColors.cardBg }}>
                             1st
                          </div>
                       </div>
                       <div>
                          <h4 className="text-2xl font-black text-white tracking-tighter">{bestAgent.name}</h4>
                          <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: appColors.primaryAccent }}>Optimization Match {getConfidence(bestAgent)}%</p>
                       </div>
                    </div>

                    <div className="p-5 bg-black/40 rounded-3xl border border-white/5 space-y-3">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Decision Logic</p>
                       <p className="text-xs text-slate-400 leading-relaxed italic">
                         "Top availability identified. Agent maintains <span className="text-white font-bold">Resilience</span> threshold under pressure."
                       </p>
                    </div>

                    <button 
                      className="w-full py-4 text-white font-black rounded-2xl shadow-2xl transition-all active:scale-[0.98] uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3"
                      style={{ backgroundColor: appColors.primaryAccent, boxShadow: `0 20px 40px ${appColors.primaryAccent}20` }}
                    >
                       Assign Priority Stream
                       <ChevronRight className="w-4 h-4" />
                    </button>
                 </div>
               ) : (
                 <div className="py-20 text-center text-slate-600 font-mono italic text-xs tracking-widest">SYNCHRONIZING TELEMETRY...</div>
               )}
            </div>

            {/* LIVE FEED */}
            <div className="p-8 rounded-[3rem] border border-white/5 h-[480px] flex flex-col" style={{ backgroundColor: appColors.cardBg }}>
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                     <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                     <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Network Stream</h3>
                  </div>
                  <span className="text-[9px] font-mono font-bold px-2.5 py-1 rounded-full border" style={{ color: appColors.primaryAccent, backgroundColor: `${appColors.primaryAccent}10`, borderColor: `${appColors.primaryAccent}20` }}>LIVE</span>
               </div>

               <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
                  <AnimatePresence mode="popLayout" initial={false}>
                    {activityLog.map((log) => (
                      <motion.div 
                        key={log.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-4 bg-black/20 rounded-2xl border border-white/5 flex gap-4 transition-all hover:bg-white/5"
                      >
                         <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${log.type === 'alert' ? 'bg-rose-500' : log.type === 'success' ? 'bg-emerald-500' : 'bg-blue-400'}`} />
                         <div className="space-y-1">
                            <p className="text-xs text-slate-300 font-medium leading-normal">{log.msg}</p>
                            <span className="text-[9px] font-mono text-slate-600 font-bold">{log.time}</span>
                         </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
               </div>
            </div>

              {/* ADMIN CONTROLS */}
              {isAdmin && (
                <div className="p-8 rounded-[3rem] border border-white/5" style={{ backgroundColor: appColors.cardBg }}>
                    <div className="flex items-center gap-3 mb-8">
                      <Settings className="w-5 h-5 text-slate-400" />
                      <h3 className="text-lg font-bold text-white tracking-tight">Parametrization</h3>
                    </div>

                    <div className="space-y-8">
                      {[
                        { label: 'Performance Weight', key: 'perf', value: reassignmentWeights.perf },
                        { label: 'Latency Limit', key: 'response', value: reassignmentWeights.response },
                        { label: 'Sim Velocity', key: 'speed', value: simulationSpeed, type: 'speed' }
                      ].map((slider) => (
                        <div key={slider.label} className="space-y-3 text-sm">
                            <div className="flex justify-between items-baseline">
                              <span className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{slider.label}</span>
                              <span className="text-xs font-black font-mono" style={{ color: appColors.primaryAccent }}>{slider.value}{slider.type !== 'speed' ? '%' : 'x'}</span>
                            </div>
                            <input 
                              type="range" 
                              min={slider.type === 'speed' ? 0.5 : 0} 
                              max={slider.type === 'speed' ? 10 : 100} 
                              step={slider.type === 'speed' ? 0.5 : 1}
                              value={slider.value}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (slider.type === 'speed') setSimulationSpeed(val);
                                else setReassignmentWeights(prev => ({ ...prev, [slider.key]: val }));
                              }}
                              className="w-full h-1 bg-slate-900 rounded-full appearance-none cursor-pointer"
                              style={{ accentColor: appColors.primaryAccent }}
                            />
                        </div>
                      ))}
                    </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AgentCard: React.FC<{ agent: AgentIntelligence; statusColor: string; appColors: any }> = ({ agent, statusColor, appColors }) => {
  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{ y: -8, scale: 1.02 }}
      className={`group relative rounded-[2.5rem] border border-white/5 transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-7 ${!agent.isOnline && 'grayscale pointer-events-none opacity-30 select-none'}`}
      style={{ backgroundColor: appColors.cardBg }}
    >
      <div className="flex items-start justify-between mb-8">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center text-3xl font-black text-white relative border border-white/5 group-hover:border-white/20 transition-all shadow-2xl">
            {agent.avatar}
          </div>
          <motion.div 
            animate={{ scale: agent.slaRisk ? [1, 1.25, 1] : 1 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full border-[4px] z-10 transition-colors ${statusColor}`} 
            style={{ borderColor: appColors.cardBg }}
          />
        </div>
        <div className="text-right">
          <div className="flex items-baseline justify-end gap-1.5">
             <span className="text-4xl font-black text-white tracking-tighter transition-colors leading-none" style={{ color: (agent.performanceScore || 0) > 80 ? appColors.primaryAccent : '' }}>
               {agent.performanceScore}
             </span>
             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Efficiency</span>
          </div>
          <div className="flex items-center justify-end gap-2 mt-1 text-[10px] font-mono font-bold">
            {agent.trend.length > 1 && agent.trend[agent.trend.length-1].score >= agent.trend[agent.trend.length-2].score ? (
               <TrendingUp className="w-3.5 h-3.5" style={{ color: appColors.primaryAccent }} />
            ) : (
               <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span style={{ color: agent.trend.length > 1 && agent.trend[agent.trend.length-1].score >= agent.trend[agent.trend.length-2].score ? appColors.primaryAccent : '#f43f5e' }}>
              {agent.trend.length > 1 ? Math.abs(agent.trend[agent.trend.length-1].score - agent.trend[agent.trend.length-2].score) : 0}% Vol
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1 mb-8">
        <h4 className="text-xl font-bold text-white tracking-tight leading-tight">{agent.name}</h4>
        <div className="flex items-center gap-1.5 flex-wrap">
          {agent.roles.slice(0, 2).map(r => (
            <span key={r} className="text-[9px] font-black uppercase tracking-widest text-slate-500 bg-black px-2 py-1 rounded-md border border-white/5">
              {r}
            </span>
          ))}
        </div>
      </div>

      <div className="h-12 w-full mb-8 filter group-hover:brightness-150 transition-all">
        <ResponsiveContainer width="100%" height="100%">
           <LineChart data={agent.trend}>
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke={agent.slaRisk ? '#f43f5e' : (agent.performanceScore || 0) > 80 ? appColors.primaryAccent : '#f59e0b'} 
                strokeWidth={3} 
                dot={false}
                animationDuration={2000}
              />
           </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-black rounded-[1.5rem] border border-white/5 space-y-2">
           <div className="flex justify-between items-center">
             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
               <MessageCircle className="w-3 h-3" />
               Load
             </span>
             <span className="text-xs font-black text-white">{agent.currentLoad}</span>
           </div>
           <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
             <motion.div 
               animate={{ width: `${Math.min(100, ((agent.currentLoad || 0) / 15) * 100)}%` }}
               className="h-full"
               style={{ backgroundColor: (agent.currentLoad || 0) > 10 ? '#f43f5e' : appColors.primaryAccent }}
             />
           </div>
        </div>
        <div className="p-4 bg-black rounded-[1.5rem] border border-white/5">
           <div className="flex items-center gap-1.5 mb-1">
             <Timer className="w-3 h-3 text-slate-500" />
             <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Latency</span>
           </div>
           <p className={`text-base font-black ${agent.slaRisk ? 'text-rose-500' : 'text-white'} leading-none`}>
             {agent.avgResponseTime}<span className="text-[10px] font-bold text-slate-500 ml-1">S</span>
           </p>
        </div>
      </div>

      {agent.slaRisk && (
        <div className="absolute inset-0 border-2 border-rose-500/20 rounded-[2.5rem] pointer-events-none animate-pulse" />
      )}
    </motion.div>
  );
};

export default PerformanceIntelligenceView;
