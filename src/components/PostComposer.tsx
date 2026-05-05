import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Image as ImageIcon, 
  Video, 
  Calendar, 
  Globe, 
  Facebook, 
  Instagram, 
  Timer,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  Loader2,
  Clock
} from 'lucide-react';
import { Platform, SocialAccount } from '../social-types';
import { GoogleGenAI } from "@google/genai";

interface PostComposerProps {
  appColors: any;
  accounts: SocialAccount[];
  ai: any;
  onSchedule: (post: any) => void;
}

/**
 * PostComposer - Multi-Platform Content Creation & Scheduling
 * 
 * Features:
 * 1. AI-Powered Caption Optimization using Google Gemini
 * 2. Multi-account/page selection across Facebook, IG, and TikTok
 * 3. Media upload support for images and videos
 * 4. Real-time post preview simulation
 * 5. Scheduling system with date and time pickers
 * 
 * @param {any} appColors - UI Theme colors
 * @param {SocialAccount[]} accounts - List of available social accounts/pages
 * @param {Function} onSchedule - Callback triggered when a post is successfully ready
 */
const PostComposer: React.FC<PostComposerProps> = ({ appColors, accounts, ai, onSchedule }) => {
  // Input content for the post
  const [content, setContent] = useState("");
  
  // Track selected IDs for multi-platform distribution
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  
  // Media asset state
  const [imageUrl, setImageUrl] = useState("https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=1000&auto=format&fit=crop");
  
  // UI Loading states
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  
  // Temporal state for scheduling features
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Toggles selection of an account for publication.
   */
  const toggleAccount = (id: string) => {
    setSelectedAccountIds(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const selectedPlatforms = Array.from(new Set(
    accounts
      .filter(a => selectedAccountIds.includes(a.id))
      .map(a => a.platform)
  ));

  /**
   * Leverages Google Gemini AI to rewrite the caption for better engagement.
   * Prompts the model to optimize for social media reach and tone.
   */
  const handleOptimizeCaption = async () => {
    if (!content || !ai) return;
    setIsOptimizing(true);
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Rewrite this social media caption to be more engaging, professional, and optimized for high reach. Keep the hashtags if any, and add relevant ones. Output ONLY the caption.\n\nCaption: ${content}`,
      });
      
      const text = response.text;
      if (text) {
        setContent(text.trim());
      }
    } catch (error) {
      console.error("AI Optimization failed", error);
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageUrl(url);
      setMediaType(file.type.startsWith('video') ? 'video' : 'image');
    }
  };

  const handleSchedule = () => {
    if (selectedAccountIds.length === 0) {
      alert("Please select at least one account/page.");
      return;
    }
    if (!content && !imageUrl) {
      alert("Please provide content or media.");
      return;
    }

    setIsScheduling(true);
    // Simulate API call
    setTimeout(() => {
      onSchedule({
        content,
        imageUrl,
        selectedAccountIds,
        scheduledAt: scheduleDate && scheduleTime ? `${scheduleDate}T${scheduleTime}` : null
      });
      setIsScheduling(false);
      alert("Post scheduled successfully!");
    }, 1500);
  };

  return (
    <div className="grid grid-cols-12 gap-8 h-full">
      {/* Editor Panel */}
      <div 
        className="col-span-12 lg:col-span-7 rounded-[3rem] border border-white/5 p-8 flex flex-col backdrop-blur-xl"
        style={{ backgroundColor: `${appColors.cardBg}80` }}
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
             <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center border"
              style={{ backgroundColor: `${appColors.primaryAccent}10`, borderColor: `${appColors.primaryAccent}20` }}
             >
                <Plus className="w-5 h-5" style={{ color: appColors.primaryAccent }} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Create New Post</h2>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Multi-platform Content Engine</p>
             </div>
          </div>
        </div>

        <div className="flex-1 space-y-8 overflow-y-auto no-scrollbar pr-2">
          {/* Enhanced Account/Page Selection */}
          <div className="space-y-6">
             <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Select Accounts & Pages</label>
                <button 
                  onClick={() => setSelectedAccountIds(accounts.map(a => a.id))}
                  className="text-[10px] font-bold hover:underline"
                  style={{ color: appColors.primaryAccent }}
                >
                  SELECT ALL
                </button>
             </div>
             
             {/* Group by Platform */}
             {(['facebook', 'instagram', 'tiktok'] as Platform[]).map(platform => {
               const platformAccounts = accounts.filter(a => a.platform === platform);
               if (platformAccounts.length === 0) return null;

               return (
                 <div key={platform} className="space-y-3">
                    <div className="flex items-center gap-2">
                       {platform === 'facebook' ? <Facebook className="w-3 h-3 text-blue-500" /> : platform === 'instagram' ? <Instagram className="w-3 h-3 text-pink-500" /> : <Video className="w-3 h-3 text-rose-500" />}
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{platform}</span>
                    </div>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                       {platformAccounts.map((acc) => (
                         <button
                           key={acc.id}
                           onClick={() => toggleAccount(acc.id)}
                           className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 group relative overflow-hidden ${selectedAccountIds.includes(acc.id) ? 'border-transparent' : 'bg-slate-950/20 border-white/5 grayscale opacity-60 hover:opacity-100 hover:grayscale-0'}`}
                           style={{ 
                             backgroundColor: selectedAccountIds.includes(acc.id) ? `${appColors.primaryAccent}10` : undefined,
                             borderColor: selectedAccountIds.includes(acc.id) ? `${appColors.primaryAccent}20` : undefined
                           }}
                         >
                           <div className="relative shrink-0">
                              <img src={acc.avatar} alt="" className="w-10 h-10 rounded-xl" />
                              <div className="absolute -bottom-1 -right-1 p-1 bg-slate-900 rounded-lg border border-white/10 scale-75">
                                 {acc.platform === 'facebook' ? <Facebook className="w-3 h-3 text-blue-500" /> : acc.platform === 'instagram' ? <Instagram className="w-3 h-3 text-pink-500" /> : <Video className="w-3 h-3 text-rose-500" />}
                              </div>
                           </div>
                           <div className="text-center">
                              <p className="text-[9px] font-bold text-white truncate w-20">{acc.name}</p>
                              <p className="text-[8px] text-slate-500 font-mono">{acc.handle}</p>
                           </div>
                           {selectedAccountIds.includes(acc.id) && (
                              <div className="absolute top-1 right-1">
                                 <CheckCircle2 className="w-3" style={{ color: appColors.primaryAccent }} />
                              </div>
                           )}
                         </button>
                       ))}
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="space-y-3">
             <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Caption Content</label>
                <button 
                  onClick={handleOptimizeCaption}
                  disabled={isOptimizing || !content}
                  className="flex items-center gap-2 text-[10px] font-bold transition-colors disabled:opacity-50"
                  style={{ color: appColors.primaryAccent }}
                >
                   {isOptimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                   OPTIMIZE WITH AI
                </button>
             </div>
             <textarea 
               value={content}
               onChange={(e) => setContent(e.target.value)}
               placeholder="What's happening? #socialmedia #business"
               className="w-full bg-slate-950/50 border border-white/5 rounded-3xl p-6 text-sm text-slate-200 placeholder:text-slate-700 min-h-[160px] focus:outline-none transition-all font-medium leading-relaxed resize-none"
             />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Media Upload</label>
               <input 
                 type="file" 
                 ref={fileInputRef}
                 hidden 
                 onChange={handleMediaUpload}
                 accept="image/*,video/*"
               />
               <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/5 bg-slate-950/20 rounded-3xl p-8 flex flex-col items-center justify-center group transition-all cursor-pointer h-full"
               >
                  <div 
                    className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-4 transition-all"
                  >
                     {mediaType === 'image' ? <ImageIcon className="w-6 h-6 text-slate-500" /> : <Video className="w-6 h-6 text-slate-500" />}
                  </div>
                  <p className="text-xs font-bold text-slate-400">Change Media</p>
                  <p className="text-[9px] text-slate-600 mt-1 uppercase font-black text-center">JPG, PNG, MP4 up to 10MB</p>
               </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Schedule Time</label>
              <div className="bg-slate-950/50 border border-white/5 rounded-3xl p-4 flex flex-col gap-3 justify-center h-full transition-all">
                 <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: appColors.primaryAccent }} />
                    <input 
                      type="date" 
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      className="bg-transparent border-none text-xs text-white focus:outline-none w-full font-bold"
                    />
                 </div>
                 <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: appColors.primaryAccent }} />
                    <input 
                      type="time" 
                      value={scheduleTime}
                      onChange={(e) => setScheduleTime(e.target.value)}
                      className="bg-transparent border-none text-xs text-white focus:outline-none w-full font-bold"
                    />
                 </div>
                 <span className="text-[9px] font-bold text-slate-600 uppercase mt-1">GMT +6:00 Dhaka</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex gap-4">
           <button 
            onClick={() => {
               setContent("");
               setSelectedAccountIds([]);
               setScheduleDate("");
               setScheduleTime("");
            }}
            className="flex-1 py-4 bg-slate-900 border border-white/10 rounded-2xl text-xs font-black text-slate-400 tracking-[0.2em] uppercase hover:bg-slate-800 transition-all font-sans"
           >
              Clear
           </button>
           <button 
            onClick={handleSchedule}
            disabled={isScheduling}
            className="flex-[2] py-4 text-white rounded-2xl text-xs font-black tracking-[0.2em] uppercase transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 font-sans"
            style={{ 
              backgroundColor: appColors.primaryAccent,
              boxShadow: `0 10px 25px -5px ${appColors.primaryAccent}40`
            }}
           >
              {isScheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : "Schedule Optimized"}
              <ChevronRight className="w-4 h-4" />
           </button>
        </div>
      </div>

      {/* Preview Panel */}
      <div className="col-span-12 lg:col-span-5 flex flex-col">
         <div className="mb-6 flex items-center gap-3">
            <Eye className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">Real-time Preview</h3>
         </div>

         <div 
          className="flex-1 rounded-[3.5rem] border border-white/5 p-2 relative overflow-hidden flex flex-col shadow-2xl"
          style={{ backgroundColor: `${appColors.cardBg}80` }}
         >
            {/* Phone Frame look */}
            <div className="h-full bg-slate-950 rounded-[3rem] overflow-hidden flex flex-col">
               <div className="p-4 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-3">
                     <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-lg"
                      style={{ backgroundColor: appColors.primaryAccent }}
                     >
                      IT
                     </div>
                     <div>
                        <h4 className="text-sm font-bold text-white">Amaizing IT</h4>
                        <div className="flex items-center gap-2">
                           <Globe className="w-3 h-3 text-slate-500" />
                           <span className="text-[10px] text-slate-500 font-medium">Just now • Ad</span>
                        </div>
                     </div>
                  </div>
                  <X className="w-5 h-5 text-slate-500" />
               </div>

               <div className="flex-1 overflow-y-auto no-scrollbar">
                  <div className="p-4">
                     <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {content || "Your caption preview will appear here..."}
                     </p>
                  </div>
                  <div className="aspect-[4/5] bg-slate-900 mx-4 rounded-2xl overflow-hidden mb-4 border border-white/5">
                     {mediaType === 'image' ? (
                        <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                     ) : (
                        <video src={imageUrl} controls className="w-full h-full object-cover" />
                     )}
                  </div>
                  <div className="px-4 py-3 border-t border-white/5 flex items-center justify-around">
                     <span className="text-xs font-bold text-slate-500">Like</span>
                     <span className="text-xs font-bold text-slate-500">Comment</span>
                     <span className="text-xs font-bold text-slate-500">Share</span>
                  </div>
               </div>
            </div>
            
            {/* Platform Indicators Overlay */}
            <div className="absolute top-8 right-8 flex flex-col gap-2">
               {selectedPlatforms.map(p => (
                 <div key={p} className="p-2 bg-slate-900/80 backdrop-blur rounded-xl border border-white/10 shadow-xl">
                    {p === 'facebook' ? <Facebook className="w-4 h-4 text-blue-500" /> : p === 'instagram' ? <Instagram className="w-4 h-4 text-pink-500" /> : <Video className="w-4 h-4 text-rose-500" />}
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default PostComposer;
