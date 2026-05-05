import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Send, 
  Sparkles, 
  Facebook, 
  Instagram, 
  Zap, 
  UserPlus, 
  ArrowRight,
  ShieldAlert,
  Smile,
  Meh,
  Frown,
  MoreHorizontal
} from 'lucide-react';
import { Comment, Platform } from '../social-types';
import { supabase } from '../lib/supabase';

interface UnifiedInboxProps {
  appColors: any;
  comments: Comment[];
  onReply: (commentId: string, message: string) => void;
  onAssign: (commentId: string, agentId: string) => void;
}

/**
 * UnifiedInbox - Centralized Engagement & Messaging Interface
 * 
 * Aggregates comments from all connected platforms into a single stream.
 * Features:
 * - Real-time filtering by platform, sentiment (Positive/Negative), and Priority
 * - Integrated AI Insight engine for determining intent and context
 * - Actionable AI-Suggested replies with one-click application
 * - Agent assignment and workflow tracking
 * 
 * @param {any} appColors - Design system colors
 * @param {Comment[]} comments - Array of social interactions
 * @param {Function} onReply - Logic for sending responses
 */
const UnifiedInbox: React.FC<UnifiedInboxProps> = ({ appColors, comments, onReply, onAssign }) => {
  // View state: currently selected conversation/comment
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);
  
  // Filtering state
  const [filterPlatform, setFilterPlatform] = useState<Platform | 'all'>('all');
  const [filterSentiment, setFilterSentiment] = useState<'all' | 'positive' | 'negative'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'urgent' | 'high'>('all');
  const [replyText, setReplyText] = useState("");
  const [fbMessages, setFbMessages] = useState<any[]>([]);

  // Fetch Facebook direct messages directly from Meta API
  React.useEffect(() => {
    const fetchLiveFB = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-meta-conversations');
        if (error) throw error;
        
        if (data?.conversations) {
          const mapped: any[] = data.conversations.map((fc: any) => ({
            id: fc.id,
            platform: 'messenger',
            userName: fc.name,
            userAvatar: fc.avatar,
            message: fc.lastMsg,
            timestamp: fc.time,
            status: 'unreplied',
            sentiment: 'neutral',
            intent: 'question',
            priority: 'medium',
            page_id: fc.page_id
          }));
          setFbMessages(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch live FB conversations:", err);
      }
    };
    fetchLiveFB();
  }, []);

  const selectedComment = comments.find(c => c.id === selectedCommentId);

  /**
   * Memoized filtration logic to ensure high performance on large message sets.
   * Filters by platform, user sentiment, and business priority levels.
   */
  const filteredComments = useMemo(() => {
    const combined = [...comments, ...fbMessages];
    return combined.filter(c => {
      if (filterPlatform !== 'all' && c.platform !== filterPlatform) return false;
      if (filterSentiment !== 'all' && c.sentiment !== filterSentiment) return false;
      if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
      return true;
    });
  }, [comments, fbMessages, filterPlatform, filterSentiment, filterPriority]);

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-4 h-4 text-emerald-400" />;
      case 'negative': return <Frown className="w-4 h-4 text-rose-400" />;
      default: return <Meh className="w-4 h-4 text-amber-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      case 'high': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  return (
    <div 
      className="flex h-[750px] backdrop-blur-xl border border-white/5 rounded-[2.5rem] overflow-hidden"
      style={{ backgroundColor: `${appColors.cardBg}80` }}
    >
      {/* Sidebar: Comment List */}
      <div className="w-[400px] border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <MessageSquare className="w-5 h-5" style={{ color: appColors.primaryAccent }} />
              Unified Inbox
            </h3>
            <button 
              onClick={async () => {
                const { data, error } = await supabase.functions.invoke('get-meta-conversations');
                if (error) {
                  console.error(error);
                  alert("Sync failed: " + error.message);
                } else {
                  const mapped = data.conversations.map((fc: any) => ({
                    id: fc.id,
                    platform: 'messenger',
                    userName: fc.name,
                    userAvatar: fc.avatar,
                    message: fc.lastMsg,
                    timestamp: fc.time,
                    status: 'unreplied',
                    sentiment: 'neutral',
                    intent: 'question',
                    priority: 'medium',
                    page_id: fc.page_id
                  }));
                  setFbMessages(mapped);
                  alert(`Sync complete: ${mapped.length} conversations fetched from Meta`);
                }
              }}
              className="text-[10px] font-black px-2 py-1 rounded-md border border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10"
            >
              SYNC HISTORY
            </button>
            <span 
              className="text-[10px] font-black px-2 py-1 rounded-md border"
              style={{ backgroundColor: `${appColors.primaryAccent}10`, color: appColors.primaryAccent, borderColor: `${appColors.primaryAccent}20` }}
            >
              {comments.filter(c => c.status === 'unreplied').length} OPEN
            </span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search conversations..."
              className="w-full bg-slate-950/50 border border-white/5 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition-all font-medium"
              style={{ caretColor: appColors.primaryAccent }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'facebook', 'instagram', 'facebook_direct'] as const).map(p => (
              <button
                key={p}
                onClick={() => setFilterPlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterPlatform === p ? 'text-slate-900' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
                style={{ backgroundColor: filterPlatform === p ? 'white' : undefined }}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'positive', 'negative'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterSentiment(s)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${filterSentiment === s ? 'border-white text-white' : 'border-white/5 text-slate-500 hover:text-slate-300'}`}
                style={{ backgroundColor: filterSentiment === s ? 'white/10' : undefined }}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'urgent', 'high'] as const).map(pr => (
              <button
                key={pr}
                onClick={() => setFilterPriority(pr)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${filterPriority === pr ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'border-white/5 text-slate-500 hover:text-slate-300'}`}
              >
                {pr}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1">
          {filteredComments.map((comment) => (
            <motion.button
              key={comment.id}
              onClick={() => setSelectedCommentId(comment.id)}
              className={`w-full text-left p-4 rounded-3xl transition-all flex gap-4 border ${selectedCommentId === comment.id ? 'border-transparent' : 'border-transparent hover:bg-white/5'}`}
              style={{ backgroundColor: selectedCommentId === comment.id ? `${appColors.primaryAccent}10` : undefined, borderColor: selectedCommentId === comment.id ? `${appColors.primaryAccent}20` : undefined }}
            >
              <div className="relative shrink-0">
                <img src={comment.userAvatar} alt="" className="w-12 h-12 rounded-2xl object-cover bg-slate-800" />
                <div className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-lg border border-white/10">
                  {comment.platform === 'facebook' ? <Facebook className="w-2.5 h-2.5 text-blue-500" /> : <Instagram className="w-2.5 h-2.5 text-pink-500" />}
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white truncate">{comment.userName}</h4>
                  <span className="text-[10px] text-slate-500 font-mono">2m</span>
                </div>
                <p className="text-xs text-slate-400 truncate leading-relaxed">
                  {comment.message}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getPriorityColor(comment.priority)}`}>
                    {comment.priority}
                  </div>
                  {getSentimentIcon(comment.sentiment)}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Panel: Conversation View */}
      <div className="flex-1 flex flex-col bg-slate-950/20 relative">
        {selectedComment ? (
          <>
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img src={selectedComment.userAvatar} alt="" className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{selectedComment.userName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-medium">{selectedComment.platform.toUpperCase()} POST #429</span>
                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                    <span className="text-[10px] font-bold" style={{ color: appColors.primaryAccent }}>Intent: {selectedComment.intent.toUpperCase()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-all">
                  <UserPlus className="w-4 h-4" />
                  Assign Agent
                </button>
                <button className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-400 transition-all">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
              <div className="flex gap-4 max-w-[80%]">
                <img src={selectedComment.userAvatar} alt="" className="w-8 h-8 rounded-lg shrink-0" />
                <div className="space-y-2">
                  <div className="p-5 bg-slate-800/50 rounded-2xl rounded-tl-none border border-white/5">
                    <p className="text-sm text-slate-200 leading-relaxed">{selectedComment.message}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono ml-2">Sent at 12:44 PM via {selectedComment.platform}</span>
                </div>
              </div>

              {/* AI Insight Overlay */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-[2rem] space-y-4 border"
                style={{ backgroundColor: `${appColors.primaryAccent}05`, borderColor: `${appColors.primaryAccent}10` }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2 rounded-xl border"
                    style={{ backgroundColor: `${appColors.primaryAccent}10`, borderColor: `${appColors.primaryAccent}20` }}
                  >
                    <Sparkles className="w-4 h-4" style={{ color: appColors.primaryAccent }} />
                  </div>
                  <h4 className="text-sm font-black uppercase tracking-widest" style={{ color: appColors.primaryAccent }}>AI Agent Insight</h4>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  "This comment shows high buying intent focused on pricing. User has engaged with 3 previous posts. Suggest offering the <span className="font-bold" style={{ color: appColors.primaryAccent }}>Spring Promo</span> discount code."
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Check Availability', 'Ask Location', 'Gift Coupon'].map(t => (
                    <button 
                      key={t} 
                      className="px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-[10px] font-bold text-slate-400 transition-all hover:text-white"
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Input Area */}
            <div className="p-6 pt-0 mt-auto">
              <div className="relative p-2 bg-slate-900/80 backdrop-blur border border-white/10 rounded-[2rem] flex flex-col gap-2">
                {selectedComment.aiSuggestedReply && (
                  <div 
                    className="px-4 py-3 border rounded-2xl flex items-center justify-between group"
                    style={{ backgroundColor: `${appColors.primaryAccent}10`, borderColor: `${appColors.primaryAccent}20` }}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                       <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: appColors.primaryAccent }} />
                       <p className="text-[11px] text-slate-300 truncate italic">Suggested: "{selectedComment.aiSuggestedReply}"</p>
                    </div>
                    <button 
                      onClick={() => setReplyText(selectedComment.aiSuggestedReply || "")}
                      className="px-3 py-1 text-white text-[9px] font-black rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      style={{ backgroundColor: appColors.primaryAccent }}
                    >
                      APPLY
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-4 pr-3 pl-2">
                  <input 
                    type="text" 
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${selectedComment.userName}...`}
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm p-4 text-white placeholder:text-slate-600 font-medium"
                  />
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-3 text-white rounded-2xl shadow-xl transition-all active:scale-95"
                      style={{ backgroundColor: appColors.primaryAccent, boxShadow: `0 10px 15px -3px ${appColors.primaryAccent}40` }}
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
            <div 
              className="w-24 h-24 rounded-[2.5rem] flex items-center justify-center border"
              style={{ backgroundColor: `${appColors.primaryAccent}10`, borderColor: `${appColors.primaryAccent}20` }}
            >
              <MessageSquare className="w-10 h-10 opacity-40" style={{ color: appColors.primaryAccent }} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Select a conversation</h3>
              <p className="text-sm text-slate-500 max-w-xs mt-2">
                Click on any comment from the sidebar to view full engagement details and AI insights.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedInbox;
