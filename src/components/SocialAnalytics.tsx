import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Share2, 
  Heart,
  Facebook,
  Instagram,
  Video,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { motion } from 'motion/react';

const data = [
  { name: 'Mon', fb: 4000, ig: 2400, tk: 2400 },
  { name: 'Tue', fb: 3000, ig: 1398, tk: 2210 },
  { name: 'Wed', fb: 2000, ig: 9800, tk: 2290 },
  { name: 'Thu', fb: 2780, ig: 3908, tk: 2000 },
  { name: 'Fri', fb: 1890, ig: 4800, tk: 2181 },
  { name: 'Sat', fb: 2390, ig: 3800, tk: 2500 },
  { name: 'Sun', fb: 3490, ig: 4300, tk: 2100 },
];

const sentimentData = [
  { name: 'Positive', value: 65, color: '#10b981' },
  { name: 'Neutral', value: 25, color: '#6366f1' },
  { name: 'Negative', value: 10, color: '#f43f5e' },
];

const topKeywords = [
  { word: 'Price', count: 124, growth: '+12%' },
  { word: 'Shipping', count: 89, growth: '+5%' },
  { word: 'Quality', count: 76, growth: '+8%' },
  { word: 'Discount', count: 65, growth: '+24%' },
  { word: 'Love', count: 54, growth: '+15%' },
];

/**
 * SocialAnalytics - Visual Data Insights Component
 * 
 * Renders various charts using Recharts to display:
 * - Followers growth & KPIs
 * - Multi-platform engagement velocity (Area Chart)
 * - Audience sentiment (Pie Chart)
 * - Trending keywords & Platform comparison
 * 
 * @param {any} appColors - Global theme colors for consistent UI
 */
const SocialAnalytics: React.FC<{ appColors: any }> = ({ appColors }) => {
  return (
    <div className="space-y-8">
      {/* Top Level KPIs: High-impact metric summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Follower Growth', val: '+12,402', sub: 'Last 30 days', icon: Users, color: appColors.primaryAccent, trend: 'up' },
          { label: 'Total Reach', val: '1.2M', sub: 'Across 3 platforms', icon: TrendingUp, color: '#10b981', trend: 'up' },
          { label: 'Avg Engagement', val: '4.8%', sub: '+0.5% from avg', icon: Heart, color: '#f43f5e', trend: 'up' },
        ].map((kpi, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group"
            style={{ backgroundColor: `${appColors.cardBg}80` }}
          >
            <div className="flex items-center justify-between mb-6">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{kpi.label}</span>
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black text-white tracking-tighter">{kpi.val}</h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{kpi.sub}</p>
            </div>
            <div className="absolute top-0 right-0 p-6 opacity-5">
              <kpi.icon className="w-24 h-24" style={{ color: kpi.color }} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Main Engagement Chart */}
        <div 
          className="col-span-12 lg:col-span-8 p-8 rounded-[3rem] border border-white/5"
          style={{ backgroundColor: `${appColors.cardBg}80` }}
        >
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Engagement Velocity</h3>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time interaction mapping</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: appColors.primaryAccent }} />
                <span className="text-[10px] font-bold text-slate-500 uppercase">FB</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ec4899' }} />
                <span className="text-[10px] font-bold text-slate-500 uppercase">IG</span>
              </div>
            </div>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={appColors.primaryAccent} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={appColors.primaryAccent} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorIg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  dx={-10}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: appColors.pageBg, 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    borderRadius: '16px',
                    fontSize: '10px',
                    color: '#fff'
                  }} 
                />
                <Area type="monotone" dataKey="fb" stroke={appColors.primaryAccent} strokeWidth={3} fillOpacity={1} fill="url(#colorPrimary)" />
                <Area type="monotone" dataKey="ig" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorIg)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment & Keyword Analysis */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div 
            className="p-8 rounded-[3rem] border border-white/5"
            style={{ backgroundColor: `${appColors.cardBg}80` }}
          >
            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-8">Audience Sentiment</h3>
            <div className="h-[200px] w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData.map(s => s.name === 'Neutral' ? { ...s, color: appColors.primaryAccent } : s)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.name === 'Neutral' ? appColors.primaryAccent : entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                 <p className="text-2xl font-black text-white">82%</p>
                 <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Positive</p>
              </div>
            </div>
          </div>

          <div 
            className="p-8 rounded-[3rem] border border-white/5"
            style={{ backgroundColor: `${appColors.cardBg}80` }}
          >
             <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6">Trending Keywords</h3>
             <div className="space-y-4">
                {topKeywords.map((k, i) => (
                  <div key={i} className="flex items-center justify-between group">
                     <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black border border-white/5 transition-all"
                          style={{ color: appColors.primaryAccent, backgroundColor: `${appColors.primaryAccent}10` }}
                        >
                           #{i + 1}
                        </div>
                        <span className="text-sm font-bold text-slate-200">{k.word}</span>
                     </div>
                     <div className="text-right">
                        <p className="text-xs font-black text-white">{k.count}</p>
                        <span className="text-[9px] text-emerald-400 font-bold">{k.growth}</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>
        </div>
      </div>

      {/* Platform Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[
          { platform: 'Facebook', icon: Facebook, color: 'text-blue-500', reach: '420k', engagement: '3.2%', growth: '+4.2%' },
          { platform: 'Instagram', icon: Instagram, color: 'text-pink-500', reach: '890k', engagement: '6.8%', growth: '+12.4%' },
          { platform: 'TikTok', icon: Video, color: 'text-rose-500', reach: '1.4M', engagement: '8.2%', growth: '+28.1%' },
        ].map((p, i) => (
          <div key={i} className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/40 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <p.icon className={`w-5 h-5 ${p.color}`} />
                 </div>
                 <h4 className="text-lg font-bold text-white tracking-tight">{p.platform}</h4>
              </div>
              <span className="text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-md">
                 {p.growth}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 bg-black/20 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">TOTAL REACH</p>
                  <p className="text-xl font-black text-white tracking-tighter">{p.reach}</p>
               </div>
               <div className="p-4 bg-black/20 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">ENG. RATE</p>
                  <p className="text-xl font-black text-white tracking-tighter">{p.engagement}</p>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SocialAnalytics;
