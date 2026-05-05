import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  LayoutDashboard, 
  Send, 
  BarChart3, 
  Users, 
  Calendar,
  Settings,
  Bell,
  Sparkles,
  Search,
  Zap,
  TrendingUp,
  Target,
  ArrowUpRight,
  Monitor,
  MessageSquare
} from 'lucide-react';
import PostComposer from './PostComposer';
import SocialAnalytics from './SocialAnalytics';
import AutomationSettings from './AutomationSettings';
import UnifiedInbox from './UnifiedInbox';
import { Comment, Post, SocialAccount } from '../social-types';

const mockAccounts: SocialAccount[] = [
  { id: 'fb-1', name: 'Tech Solutions Page', platform: 'facebook', avatar: 'https://i.pravatar.cc/150?u=fb1', handle: 'techsolutions' },
  { id: 'fb-2', name: 'Digital Nomads Hub', platform: 'facebook', avatar: 'https://i.pravatar.cc/150?u=fb2', handle: 'digitalnomads' },
  { id: 'ig-1', name: 'Official Instagram', platform: 'instagram', avatar: 'https://i.pravatar.cc/150?u=ig1', handle: '@official_tech' },
  { id: 'tk-1', name: 'TikTok Creator', platform: 'tiktok', avatar: 'https://i.pravatar.cc/150?u=tk1', handle: '@creator_tk' },
];

const mockComments: Comment[] = [
  {
    id: '1',
    postId: 'p1',
    platform: 'facebook',
    userName: 'Alex Johnson',
    userAvatar: 'https://i.pravatar.cc/150?u=alex',
    message: 'What is the price of this service? I am interested in signing up today!',
    timestamp: new Date().toISOString(),
    status: 'unreplied',
    sentiment: 'positive',
    intent: 'buying',
    priority: 'high',
    aiSuggestedReply: 'Hello Alex! Our plans start at $29/mo. Would you like a demo?'
  },
  {
    id: '2',
    postId: 'p1',
    platform: 'instagram',
    userName: 'Sarah Miller',
    userAvatar: 'https://i.pravatar.cc/150?u=sarah',
    message: 'I am having trouble logging in after the last update.',
    timestamp: new Date().toISOString(),
    status: 'unreplied',
    sentiment: 'negative',
    intent: 'complaint',
    priority: 'urgent',
    aiSuggestedReply: 'Hi Sarah, sorry to hear that. I\'ve just DM\'d you to resolve this!'
  },
  {
    id: '3',
    postId: 'p2',
    platform: 'facebook',
    userName: 'Mark Wilson',
    userAvatar: 'https://i.pravatar.cc/150?u=mark',
    message: 'Great content as always! Keep it up.',
    timestamp: new Date().toISOString(),
    status: 'unreplied',
    sentiment: 'positive',
    intent: 'praise',
    priority: 'low'
  }
];

/**
 * SocialDashboard - Main Hub for Social Media Management
 * 
 * This component coordinates:
 * 1. KPI Overview (Engagement, Response Time, AI Resolution)
 * 2. Unified Comment/Inbox System
 * 3. Multi-platform Post Composer
 * 4. Advanced Analytics
 * 
 * @param {any} appColors - Global theme colors for consistent UI
 */
const SocialDashboard: React.FC<{ appColors: any, ai: any }> = ({ appColors, ai }) => {
  // Navigation state for the dashboard sub-views
  const [activeTab, setActiveTab] = useState<'overview' | 'inbox' | 'composer' | 'analytics'>('overview');
  
  // Local state for social interactions (comments)
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [posts, setPosts] = useState<Post[]>([]);
  
  // Logic toggle for the AI Automation configuration modal
  const [isAutomationOpen, setIsAutomationOpen] = useState(false);

  // Load posts from Supabase if configured
  React.useEffect(() => {
    const loadPosts = async () => {
      if (!isSupabaseConfigured) return;
      try {
        const { data } = await supabase.from('social_posts').select('*').order('created_at', { ascending: false });
        if (data) setPosts(data as any);
      } catch (e) {
        console.error("Supabase post load error:", e);
      }
    };
    loadPosts();

    // Subscribe to changes
    let channel: any;
    if (isSupabaseConfigured) {
      channel = supabase.channel('social-posts-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'social_posts' }, () => loadPosts())
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Updates the status of a comment when a reply is sent.
   */
  const handleReply = (id: string, text: string) => {
    setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'replied' } : c));
  };

  const handlePostSchedule = async (post: any) => {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.from('social_posts').insert({
          platform: post.selectedAccountIds.join(','),
          content: post.content,
          media_url: post.imageUrl,
          scheduled_for: post.scheduledAt || new Date().toISOString(),
          status: post.scheduledAt ? 'Scheduled' : 'Published'
        }).select().single();

        if (data) setPosts(prev => [data as any, ...prev]);
        if (error) console.error("Post save error:", error);
      } catch (e) {
        console.error("Supabase post save exception:", e);
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <AnimatePresence>
        {isAutomationOpen && (
          <AutomationSettings appColors={appColors} onClose={() => setIsAutomationOpen(false)} />
        )}
      </AnimatePresence>
      {/* Mini-Stat Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Engagement', val: '48.2k', trend: '+12.5%', icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Avg. Response Time', val: '2.4m', trend: '-18%', icon: Zap, color: 'text-indigo-400' },
          { label: 'AI Resolution Rate', val: '92%', trend: '+4%', icon: Sparkles, color: 'text-purple-400' },
          { label: 'Comment to Lead', val: '14.8%', trend: '+2.1%', icon: Target, color: 'text-blue-400' },
        ].map((s, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-slate-900/40 rounded-[2rem] border border-white/5 relative overflow-hidden group"
          >
             <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{s.label}</span>
                <s.icon className={`w-4 h-4 ${s.color}`} />
             </div>
             <div className="flex items-baseline gap-3">
                <h3 className="text-3xl font-black text-white tracking-tighter">{s.val}</h3>
                <span className={`text-[10px] font-black ${s.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>{s.trend}</span>
             </div>
             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none transform translate-x-4 -translate-y-4 group-hover:translate-x-0 group-hover:translate-y-0 transition-all">
                <s.icon className="w-16 h-16" />
             </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div 
        className="flex items-center gap-2 p-1 rounded-2xl border border-white/5 w-fit"
        style={{ backgroundColor: `${appColors.cardBg}80` }}
      >
        {[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard },
          { id: 'inbox', label: 'Comments', icon: MessageSquare },
          { id: 'composer', label: 'Compose', icon: Send },
          { id: 'analytics', label: 'Analytics', icon: BarChart3 }
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-xs font-bold tracking-tight transition-all ${activeTab === t.id ? 'text-white shadow-xl' : 'text-slate-400 hover:text-slate-200'}`}
            style={{ 
              backgroundColor: activeTab === t.id ? appColors.primaryAccent : 'transparent',
              boxShadow: activeTab === t.id ? `0 10px 15px -3px ${appColors.primaryAccent}40` : 'none'
            }}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* 
          Main Content Area 
          Animated transition between sub-views (Overview, Inbox, Composer, Analytics)
      */}
      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.3 }}
        >
          {/* Universal Comment Management System */}
          {activeTab === 'inbox' && (
            <UnifiedInbox appColors={appColors} comments={comments} onReply={handleReply} onAssign={() => {}} />
          )}

          {/* AI-Powered Multi-Platform Post Creator */}
          {activeTab === 'composer' && (
            <PostComposer appColors={appColors} accounts={mockAccounts} ai={ai} onSchedule={handlePostSchedule} />
          )}

          {/* High-Level Dashboard Landing View */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-12 gap-8">
               <div className="col-span-12 lg:col-span-8 space-y-8">
                  {/* Recent Activity Feed */}
                  <div 
                    className="rounded-[2.5rem] border border-white/5 p-8"
                    style={{ backgroundColor: `${appColors.cardBg}80` }}
                  >
                     <div className="flex items-center justify-between mb-8">
                        <div>
                           <h3 className="text-xl font-bold text-white tracking-tight">Recent Engagement</h3>
                           <p className="text-xs text-slate-500 mt-1">Activities across all platforms in the last 24h</p>
                        </div>
                        <button 
                          className="flex items-center gap-2 text-xs font-bold"
                          style={{ color: appColors.primaryAccent }}
                        >
                           View Full Record
                           <ArrowUpRight className="w-4 h-4" />
                        </button>
                     </div>
                     <div className="space-y-4">
                        {comments.slice(0, 3).map(c => (
                          <div key={c.id} className="p-4 bg-slate-950/40 rounded-2xl border border-white/5 flex items-center justify-between hover:border-white/10 transition-colors">
                             <div className="flex items-center gap-4">
                                <img src={c.userAvatar} alt="" className="w-10 h-10 rounded-xl" />
                                <div>
                                   <p className="text-sm text-slate-200 font-medium">
                                      <span className="font-bold text-white">{c.userName}</span> commented on your post
                                   </p>
                                   <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">Platform: {c.platform}</p>
                                </div>
                             </div>
                             <div className="flex items-center gap-3">
                                <span className={`text-[10px] font-black px-2 py-1 rounded border ${c.sentiment === 'positive' ? 'text-emerald-400 border-emerald-400/20' : 'text-rose-400 border-rose-400/20'}`}>
                                   {c.sentiment.toUpperCase()}
                                </span>
                                <button 
                                  className="p-2.5 rounded-xl transition-all"
                                  style={{ backgroundColor: `${appColors.primaryAccent}10`, color: appColors.primaryAccent }}
                                >
                                   <MessageSquare className="w-4 h-4" />
                                </button>
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>
               </div>

               <div className="col-span-12 lg:col-span-4 space-y-8">
                   <div 
                    className="p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl"
                    style={{ background: `linear-gradient(to bottom right, ${appColors.primaryAccent}, ${appColors.sidebarMiddle})` }}
                   >
                      <div className="relative z-10 space-y-6">
                         <div className="p-2 bg-white/10 rounded-xl w-fit border border-white/20">
                            <Monitor className="w-5 h-5 text-white" />
                         </div>
                         <h3 className="text-2xl font-black text-white tracking-tight leading-tight">Automation System Active</h3>
                         <p className="text-sm text-white/70 leading-relaxed">
                            AI is monitoring 12 active streams. Auto-reply is enabled for <span className="font-bold text-white underline decoration-emerald-400">Buying Intent</span> keywords.
                         </p>
                         <button 
                          onClick={() => setIsAutomationOpen(true)}
                          className="w-full py-4 bg-white font-bold rounded-2xl shadow-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
                          style={{ color: appColors.primaryAccent }}
                         >
                            Configure AI Logic
                            <Settings className="w-4 h-4" />
                         </button>
                      </div>
                      <div className="absolute -bottom-10 -right-10 opacity-10">
                         <Zap className="w-48 h-48 text-white" />
                      </div>
                   </div>
               </div>
            </div>
          )}

          {activeTab === 'analytics' && (
             <SocialAnalytics appColors={appColors} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default SocialDashboard;
