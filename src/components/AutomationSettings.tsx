import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Save, 
  X, 
  Zap, 
  Bot, 
  ShieldCheck,
  MessageSquare,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Rule {
  id: string;
  trigger: string;
  response: string;
  platform: 'all' | 'facebook' | 'instagram' | 'tiktok';
  active: boolean;
}

interface AutomationSettingsProps {
  appColors: any;
  onClose: () => void;
}

/**
 * AutomationSettings - AI Logic configuration modal
 * 
 * Allows users to:
 * 1. Set global AI tone (Friendly, Sales, Support)
 * 2. Configure Keyword Response Rules (Auto-reply engine)
 * 3. Toggle Public-to-Private flow (Auto-DM triggered by intent)
 */
const AutomationSettings: React.FC<AutomationSettingsProps> = ({ appColors, onClose }) => {
  // Collection of rules that trigger auto-replies based on character matching or AI intent
  const [rules, setRules] = useState<Rule[]>([
    { id: '1', trigger: 'price, cost, how much', response: 'Hi! Our pricing starts from $29. Check your DMs for details!', platform: 'all', active: true },
    { id: '2', trigger: 'shipping, delivery', response: 'We ship worldwide! Standard delivery takes 3-5 business days.', platform: 'all', active: true },
  ]);
  
  const [aiTone, setAiTone] = useState<'friendly' | 'sales' | 'support'>('sales');
  const [autoDM, setAutoDM] = useState(true);

  const addRule = () => {
    const newRule: Rule = {
      id: Date.now().toString(),
      trigger: '',
      response: '',
      platform: 'all',
      active: true
    };
    setRules([...rules, newRule]);
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const updateRule = (id: string, updates: Partial<Rule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-20"
    >
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" 
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-slate-900 border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: appColors.cardBg }}
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-950/50">
           <div className="flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                style={{ backgroundColor: `${appColors.primaryAccent}10`, borderColor: `${appColors.primaryAccent}20` }}
              >
                 <Bot className="w-6 h-6" style={{ color: appColors.primaryAccent }} />
              </div>
              <div>
                 <h2 className="text-xl font-bold text-white tracking-tight">AI Automation Logic</h2>
                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Control how AI interacts with your customers</p>
              </div>
           </div>
           <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all"
           >
              <X className="w-5 h-5 text-slate-400" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 no-scrollbar">
          {/* Global AI Config */}
          <section className="space-y-6">
             <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4" style={{ color: appColors.primaryAccent }} />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Global Intelligence</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-950/50 rounded-[2rem] border border-white/5 space-y-4">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Autonomous Tone</p>
                   <div className="flex gap-2">
                      {['friendly', 'sales', 'support'].map(t => (
                        <button
                          key={t}
                          onClick={() => setAiTone(t as any)}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${aiTone === t ? 'text-white' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                          style={{ 
                            backgroundColor: aiTone === t ? appColors.primaryAccent : undefined,
                            borderColor: aiTone === t ? appColors.primaryAccent : undefined,
                            boxShadow: aiTone === t ? `0 10px 15px -3px ${appColors.primaryAccent}40` : 'none'
                          }}
                        >
                          {t}
                        </button>
                      ))}
                   </div>
                </div>
                
                <div className="p-6 bg-slate-950/50 rounded-[2rem] border border-white/5 flex items-center justify-between">
                   <div className="space-y-1">
                      <p className="text-sm font-bold text-white">Public to Private Flow</p>
                      <p className="text-[10px] text-slate-500">Auto-DM users who trigger buying intent</p>
                   </div>
                   <button 
                    onClick={() => setAutoDM(!autoDM)}
                    className={`w-12 h-6 rounded-full transition-all relative ${autoDM ? '' : 'bg-slate-800'}`}
                    style={{ backgroundColor: autoDM ? appColors.primaryAccent : undefined }}
                   >
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${autoDM ? 'right-1' : 'left-1'}`} />
                   </button>
                </div>
             </div>
          </section>

          {/* Keyword Rules */}
          <section className="space-y-6">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <ShieldCheck className="w-4 h-4 text-emerald-400" />
                   <h3 className="text-sm font-black text-white uppercase tracking-widest">Keyword Response Rules</h3>
                </div>
                <button 
                  onClick={addRule}
                  className="px-4 py-2 border rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 hover:text-white"
                  style={{ backgroundColor: `${appColors.primaryAccent}10`, color: appColors.primaryAccent, borderColor: `${appColors.primaryAccent}20` }}
                >
                   <Plus className="w-3.5 h-3.5" />
                   Add New Rule
                </button>
             </div>

             <div className="space-y-4">
                {rules.map((rule) => (
                  <motion.div 
                    layout
                    key={rule.id}
                    className="p-6 bg-slate-950/50 rounded-[2.5rem] border border-white/5 group hover:border-white/10 transition-all space-y-4"
                  >
                    <div className="flex items-center justify-between">
                       <div className="flex-1 max-w-[40%]">
                          <input 
                            value={rule.trigger}
                            onChange={(e) => updateRule(rule.id, { trigger: e.target.value })}
                            placeholder="Enter keywords (comma separated)..."
                            className="bg-transparent border-none text-white font-bold text-sm focus:outline-none w-full"
                          />
                          <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-1">If comment contains</p>
                       </div>
                       <div className="flex items-center gap-4">
                          <select 
                            value={rule.platform}
                            onChange={(e) => updateRule(rule.id, { platform: e.target.value as any })}
                            className="bg-slate-900 border border-white/5 rounded-lg text-[10px] font-black text-slate-400 px-3 py-1 focus:outline-none"
                          >
                             <option value="all">ALL PLATFORMS</option>
                             <option value="facebook">FACEBOOK ONLY</option>
                             <option value="instagram">INSTAGRAM ONLY</option>
                          </select>
                          <button 
                            onClick={() => removeRule(rule.id)}
                            className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
                          >
                             <Trash2 className="w-4 h-4" />
                          </button>
                       </div>
                    </div>
                    <div className="pt-2">
                       <textarea 
                        value={rule.response}
                        onChange={(e) => updateRule(rule.id, { response: e.target.value })}
                        placeholder="Type response template..."
                        className="w-full bg-slate-900/50 border border-white/5 rounded-xl p-4 text-xs text-slate-300 placeholder:text-slate-700 focus:outline-none transition-all resize-none h-20"
                        style={{ focusBorderColor: `${appColors.primaryAccent}40` }}
                       />
                       <p className="text-[9px] text-slate-600 font-black uppercase tracking-widest mt-2">Auto Reply Message</p>
                    </div>
                  </motion.div>
                ))}
             </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-950/80 border-t border-white/5 flex items-center justify-end gap-4">
           <button 
            onClick={onClose}
            className="px-8 py-4 bg-slate-900 border border-white/10 rounded-2xl text-[10px] font-black text-slate-500 tracking-widest uppercase hover:text-slate-300 transition-all font-sans"
           >
              Cancel
           </button>
           <button 
            onClick={() => {
              alert("Automation rules updated successfully!");
              onClose();
            }}
            className="px-10 py-4 text-white rounded-2xl text-[10px] font-black tracking-widest uppercase shadow-2xl transition-all flex items-center gap-3 font-sans"
            style={{ backgroundColor: appColors.primaryAccent, boxShadow: `0 10px 15px -3px ${appColors.primaryAccent}40` }}
           >
              <Save className="w-4 h-4" />
              Save Configuration
           </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AutomationSettings;
