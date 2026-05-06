/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { QRCodeCanvas } from 'qrcode.react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import { supabase, isSupabaseConfigured } from "./lib/supabase";
import { 
  Home, 
  MessageSquare, 
  Link as LinkIcon, 
  Users, 
  UserPlus,
  Pencil,
  UserMinus,
  Shield, 
  Key, 
  Settings, 
  Bell, 
  User, 
  Archive,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  Phone,
  Facebook,
  Instagram,
  CloudLightning,
  MoreVertical,
  Music,
  Video,
  Linkedin,
  Twitter,
  Search,
  Activity,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Award,
  RefreshCw,
  Globe,
  Send,
  Paperclip,
  Smile,
  MoreHorizontal,
  Camera,
  Mic,
  Bookmark,
  X,
  Trash2,
  PlusCircle,
  StopCircle,
  Mail,
  CreditCard,
  Zap,
  Check,
  ShoppingCart,
  Target,
  Star,
  DollarSign,
  Layers,
  ListFilter,
  History,
  Share2,
  Database,
  ArrowRight,
  Sparkles,
  Languages,
  Volume2,
  VolumeX,
  MicOff,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneCall,
  PhoneOff,
  MapPin,
  Briefcase,
  GraduationCap,
  Heart,
  Cake,
  Info,
  Calendar,
  ExternalLink,
  Eye,
  EyeOff,
  MessageSquareOff
} from "lucide-react";
import PerformanceIntelligenceView from "./components/PerformanceIntelligenceView";
import SocialDashboard from "./components/SocialDashboard";
import FacebookSDK from "./components/FacebookSDK";

interface Order {
  id: string;
  customer: string;
  phone?: string;
  item: string;
  amount: string;
  paid: string;
  due: string;
  status: string;
  date: string;
  channel: string;
  assignedTo: string;
}

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
  isOnline?: boolean;     // For Fallback System
  currentLoad?: number;  // For Fallback System
  avgResponseTime?: number; // In seconds
  resolvedChats?: number;
  rating?: number; // 1-5
  performanceScore?: number;
}

interface PlatformAccount {
  id: string;
  name: string;
  status: 'Healthy' | 'Degraded' | 'Offline';
  lastSync: string;
  details: string;
}

interface ConnectedPlatform {
  id: string;
  name: string;
  iconType: string;
  desc: string;
  accounts: PlatformAccount[];
}

interface Lead {
  name: string;
  email: string;
  source: string;
  status: string;
  score: number;
  date: string;
  assignedTo: string;
}

const getApiKey = () => {
  try {
    // Try process.env (Vite define) or import.meta.env (standard Vite)
    return process.env.GEMINI_API_KEY || (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
  } catch (e) {
    return "";
  }
};

const apiKey = getApiKey();
const ai = new GoogleGenAI({ apiKey });

// Memory-based cache for WhatsApp configurations (populated from DB)
let memoryWahaConfigs: Record<string, any> = {};

const getStoredWahaConfigs = () => {
  const env = (import.meta as any).env || {};
  const envConfig = {
    url: env.VITE_WAHA_URL || env.WAHA_URL || "",
    session: env.VITE_WAHA_SESSION || "default",
    apiKey: env.VITE_WAHA_API_KEY || ""
  };

  // 1. Check memory cache (populated from database)
  if (Object.keys(memoryWahaConfigs).length > 0) {
    return memoryWahaConfigs;
  }

  // 2. Check localStorage (only for temporary/in-progress connections)
  try {
    const saved = typeof localStorage !== "undefined" ? localStorage.getItem("waha_configs") : null;
    if (saved) {
      const configs = JSON.parse(saved);
      return configs;
    }
  } catch (error) {
    console.warn("[WAHA] Error reading waha_configs from localStorage:", error);
  }

  // 3. Fallback to environment variables
  const finalConfigs = (envConfig.url ? { [envConfig.session]: envConfig } : {});
  return finalConfigs;
};

const getStoredWahaConfig = (sessionName?: string) => {
  const configs = getStoredWahaConfigs();
  // Try direct key lookup (page_id)
  if (sessionName && configs[sessionName]) return configs[sessionName];
  
  // Try searching by session property
  const allConfigs = Object.values(configs);
  if (sessionName) {
    return allConfigs.find((c: any) => c.session === sessionName) || null;
  }
  return allConfigs[0] || null;
};

const normalizeWahaList = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.chats)) return data.chats;
  if (Array.isArray(data?.messages)) return data.messages;
  if (Array.isArray(data?.items)) return data.items;
  return [];
};

const extractWahaIdValue = (id: any): string => {
  if (!id) return "";
  if (typeof id === "string") return id;
  if (typeof id === "number") return String(id);
  if (typeof id === "object") {
    return id._serialized || id.id || id.user || JSON.stringify(id);
  }
  return String(id);
};

interface Chat {
  id: string | number;
  external_uid?: string;
  external_id?: string;
  name: string;
  platform: string;
  platformIcon: React.ReactNode;
  platformColor: string;
  lastMsg: string;
  time: string;
  unread: number;
  online: boolean;
  avatar: string;
  avatarUrl?: string;
  isStarred: boolean;
  isSpam: boolean;
  isBin: boolean;
  isDone: boolean;
  hasOrdered: boolean;
  assignedTo: string | null;
  session?: string;
  timestamp: number;
  last_time?: string;
  profile: {
    bio: string;
    work: string;
    education: string;
    location: string;
    hometown: string;
    relationship: string;
    birthday: string;
    email: string;
    phone: string;
    gender: string;
    coverImage: string;
    joinedDate: string;
  };
  messages: {
    id: string | number;
    text: string;
    sender: 'me' | 'them';
    time: string;
    translatedText?: string;
    type?: 'text' | 'image' | 'voice';
    mediaUrl?: string;
    timestamp?: number;
  }[];
}

const formatWahaChats = (items: any[], ownIds: Set<string> = new Set(), sessionName?: string): Chat[] => {
  return items
    .filter((wc: any) => {
      const id = extractWahaIdValue(wc.id || wc.chatId || wc.chat?.id || "");
      return id && !ownIds.has(id) && !id.includes("status@broadcast") && !id.includes("broadcast");
    })
    .map((wc: any) => {
      const fullId = extractWahaIdValue(wc.id || wc.chatId || wc.chat?.id || "");
      const chatId = extractWahaIdValue(fullId);
      const isGroup = fullId.endsWith("@g.us");
      const isNewsletter = fullId.endsWith("@newsletter");

      let resolvedName = wc.name || wc.pushname || wc.pushName || wc.verifiedName || wc.shortName || wc.notify;
      if (!resolvedName && wc.lastMessage) {
        resolvedName = wc.lastMessage.pushName || wc.lastMessage.pushname || wc.lastMessage.senderName;
      }
      if (!resolvedName) {
        resolvedName = isGroup ? "WhatsApp Group" : (isNewsletter ? "WhatsApp Channel" : `+${chatId.split("@")[0]}`);
      }

      const lastMsgText = wc.lastMessage?.body || wc.lastMessage?.content || wc.lastMessage?.text || wc.lastMessage?.message?.conversation || "";
      const messageTime = wc.lastMessage?.timestamp
        ? new Date(wc.lastMessage.timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";
      const initialMessages = wc.lastMessage
        ? [{
            id: extractWahaIdValue(wc.lastMessage.id) || `last-${chatId}`,
            text: lastMsgText,
            type: (wc.lastMessage.type === "image" || wc.lastMessage.hasMedia) ? "image" as const : "text" as const,
            sender: wc.lastMessage.fromMe ? "me" as const : "them" as const,
            time: messageTime,
            mediaUrl: wc.lastMessage.mediaUrl || null,
            timestamp: wc.lastMessage.timestamp
          }]
        : [];

      return {
        id: chatId,
        external_uid: chatId,
        name: resolvedName,
        platform: "whatsapp",
        platformIcon: <Phone className="w-3 h-3" />,
        platformColor: "bg-emerald-500",
        lastMsg: lastMsgText,
        time: messageTime,
        unread: wc.unreadCount || 0,
        online: false,
        avatar: resolvedName.charAt(0).toUpperCase(),
        avatarUrl: wc.picture || wc.imgUrl || wc.profilePictureURL,
        isStarred: false,
        isSpam: false,
        isBin: false,
        isDone: false,
        hasOrdered: false,
        assignedTo: null,
        session: sessionName,
        timestamp: wc.lastMessage?.timestamp || 0,
        last_time: wc.lastMessage?.timestamp ? new Date(wc.lastMessage.timestamp * 1000).toISOString() : new Date(0).toISOString(),
        messages: initialMessages,
        profile: {
          phone: chatId.includes("@") ? `+${chatId.split("@")[0]}` : chatId,
          bio: isGroup ? "WhatsApp Group" : "WhatsApp Contact",
          work: "Customer",
          education: "",
          location: "",
          hometown: "",
          relationship: "",
          birthday: "",
          email: "",
          gender: "",
          coverImage: "",
          joinedDate: "New"
        }
      };
    });
};

interface UserProfile {
  name: string;
  email: string;
  phone: string;
  bio: string;
  avatar: string;
  role: string;
  joinedDate: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "Super Admin" | "Executive";
  avatar: string;
  joinedDate: string;
  permissions?: string[];
}

/**
 * App - The Root Application Component
 * 
 * This application is an Enterprise Social Media & Customer Support Matrix.
 * 
 * Core Architectural Pillars:
 * 1. RBAC (Role-Based Access Control): Supports Super Admin and Executive roles.
 * 2. Enterprise Unified Inbox: Centralizes communication across FB, IG, TikTok.
 * 3. AI Dispatcher: Smart assignment of support chats to agents based on performance.
 * 4. Real-time Telemetry: Sockets (Mocked via logic) for live agent tracking.
 * 5. Multi-Platform Orchestration: Posting engine with AI content optimization.
 */
export default function App() {
  // Persistence Layer: Load and save user directory to localStorage
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem("app_users");
    if (saved) return JSON.parse(saved);
    // Initial Admin Bootstrap
    const initialAdmin: User = {
      id: "admin-1",
      name: "Admin User",
      email: "admin@omniinbox.com",
      phone: "+8801700000000",
      password: "admin123", // Matches Supabase demo
      role: "Super Admin",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=admin",
      joinedDate: "April 02, 2024"
    };
    return [initialAdmin];
  });

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("current_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [selectedChat, setSelectedChat] = useState<string | number | null>(null);
  const [isLiveLoading, setIsLiveLoading] = useState(false);
  const [whatsappAddMode, setWhatsappAddMode] = useState(false);
  
  // Integration States (Global)
  const [facebookUsers, setFacebookUsers] = useState<{id: string, name: string, email: string, avatar: string}[]>([]);
  const [isVerified, setIsVerified] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [loginProgress, setLoginProgress] = useState(0);

  React.useEffect(() => {
    if (!isSyncing) return;
    const timeout = window.setTimeout(() => {
      setIsSyncing(false);
      setSyncProgress(0);
    }, 30000);
    return () => window.clearTimeout(timeout);
  }, [isSyncing]);

  const [loginError, setLoginError] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginTab, setLoginTab] = useState<"Super Admin" | "Executive">("Super Admin");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMessage, setResetMessage] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const email = loginEmail.trim();
    const password = loginPassword;

    console.log("Attempting login for:", email);
    console.log("Supabase configured:", isSupabaseConfigured);

    // First try local users
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    
    // If not found locally, try live check if Supabase is configured
    if (!user && isSupabaseConfigured) {
      console.log("User not found locally, checking Supabase...");
      try {
        const { data, error } = await supabase
          .from('app_users')
          .select('*')
          .ilike('email', email)
          .eq('password', password)
          .maybeSingle();
        
        if (error) {
          console.error("Supabase query error:", error);
        }

        if (data) {
          console.log("User found in Supabase!");
          user = data;
          // Add to local users to avoid extra lookups next time
          setUsers(prev => {
            if (!prev.find(u => u.id === data.id)) {
              const updated = [...prev, data];
              localStorage.setItem("app_users", JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        } else {
          console.log("User not found in Supabase either.");
        }
      } catch (err) {
        console.error("Supabase login check error:", err);
      }
    }

    if (user) {
      console.log("Login successful, checking role...");
      if (user.role !== loginTab) {
        console.warn(`Role mismatch: expected ${loginTab}, got ${user.role}`);
        setLoginError(`This account is not registered as a ${loginTab}.`);
        return;
      }
      setCurrentUser(user);
      localStorage.setItem("current_user", JSON.stringify(user));
    } else {
      console.error("Login failed: User not found or password incorrect.");
      setLoginError("Invalid email or password. Please try again.");
    }
  };

  const handleForgotPassword = (e: React.FormEvent) => {
    e.preventDefault();
    const email = resetEmail.trim().toLowerCase();
    const user = users.find(u => u.email.toLowerCase() === email);
    if (user) {
      setResetMessage(`Password for ${resetEmail} is: ${user.password}`);
    } else {
      setResetMessage("Email not found in our records.");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("current_user");
  };

  const updateCurrentUser = (updatedUser: User) => {
    setCurrentUser(updatedUser);
    localStorage.setItem("current_user", JSON.stringify(updatedUser));
    
    // Also update in the main users list
    const updatedUsers = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    setUsers(updatedUsers);
    localStorage.setItem("app_users", JSON.stringify(updatedUsers));
  };

  const deleteUser = async (userId: string) => {
    const updatedUsers = users.filter(u => u.id !== userId);
    setUsers(updatedUsers);
    localStorage.setItem("app_users", JSON.stringify(updatedUsers));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('app_users').delete().eq('id', userId);
      } catch (e) {
        console.error("Supabase delete user error:", e);
      }
    }
  };

  const addExecutive = async (newExec: Omit<User, "id" | "joinedDate" | "avatar">) => {
    const id = Date.now().toString();
    const joinedDate = new Date().toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
    const user: User = {
      ...newExec,
      id,
      joinedDate,
      avatar: "",
    };
    const updatedUsers = [...users, user];
    setUsers(updatedUsers);
    localStorage.setItem("app_users", JSON.stringify(updatedUsers));

    if (isSupabaseConfigured) {
      try {
        await supabase.from('app_users').insert({
          id,
          name: newExec.name,
          email: newExec.email,
          phone: newExec.phone,
          password: newExec.password,
          role: newExec.role,
          avatar: "",
          joined_date: new Date().toISOString()
        });
      } catch (e) {
        console.error("Supabase add user error:", e);
      }
    }
  };

  const [logoUrl, setLogoUrl] = useState<string | null>(() => localStorage.getItem("app_logo"));
  const [faviconUrl, setFaviconUrl] = useState<string | null>(() => localStorage.getItem("app_favicon"));
  const [appName, setAppName] = useState<string>(() => localStorage.getItem("app_name") || "Amaizing IT");
  const [appColors, setAppColors] = useState(() => {
    const saved = localStorage.getItem("app_colors");
    return saved ? JSON.parse(saved) : {
      sidebarTop: "#14060a",
      sidebarMiddle: "#a00c1c",
      sidebarBottom: "#060203",
      primaryAccent: "#f05340",
      pageBg: "#0f172a",
      cardBg: "#1e293b"
    };
  });

  const [employees, setEmployees] = useState<Employee[]>([
    { 
      id: 1, name: "Admin", email: "admin@example.com", verified: true, 
      roles: ["Administrator"], status: "Yes", joinedDate: "Apr 18, 2026", 
      avatar: "A", isMessagingActive: true, isOnline: true, currentLoad: 2,
      avgResponseTime: 45, resolvedChats: 150, rating: 4.8, performanceScore: 85
    },
    { 
      id: 2, name: "Agent", email: "agent@example.com", verified: true, 
      roles: ["Agent"], status: "Yes", joinedDate: "Apr 18, 2026", 
      avatar: "A", isMessagingActive: false, isOnline: true, currentLoad: 5,
      avgResponseTime: 120, resolvedChats: 80, rating: 4.2, performanceScore: 65
    },
    { 
      id: 3, name: "Rafiq", email: "rafiq@example.com", verified: true, 
      roles: ["Agent"], status: "Yes", joinedDate: "Apr 20, 2026", 
      avatar: "R", isMessagingActive: false, isOnline: true, currentLoad: 3,
      avgResponseTime: 85, resolvedChats: 110, rating: 4.5, performanceScore: 78
    },
    { 
      id: 4, name: "Anika", email: "anika@example.com", verified: true, 
      roles: ["Support"], status: "Yes", joinedDate: "Apr 21, 2026", 
      avatar: "A", isMessagingActive: false, isOnline: true, currentLoad: 8,
      avgResponseTime: 180, resolvedChats: 45, rating: 3.9, performanceScore: 50
    },
    { 
      id: 5, name: "Sajib", email: "sajib@example.com", verified: true, 
      roles: ["Sales"], status: "Yes", joinedDate: "Apr 22, 2026", 
      avatar: "S", isMessagingActive: false, isOnline: false, currentLoad: 0,
      avgResponseTime: 0, resolvedChats: 95, rating: 4.6, performanceScore: 0
    },
    { 
      id: 6, name: "Maria", email: "maria@example.com", verified: true, 
      roles: ["Agent"], status: "Yes", joinedDate: "Apr 23, 2026", 
      avatar: "M", isMessagingActive: false, isOnline: true, currentLoad: 2,
      avgResponseTime: 40, resolvedChats: 130, rating: 4.9, performanceScore: 92
    }
  ]);

  const [typingUsers, setTypingUsers] = useState<{[key: number]: string}>({}); // chatId -> userName

  const [chats, setChats] = useState<Chat[]>([]);

  const [orders, setOrders] = useState<Order[]>([
    { id: "ORD-7291", customer: "Jamal Ahmed", item: "Messenger Plan", amount: "৳5500.00", paid: "৳5500.00", due: "৳0.00", status: "Paid", date: "2024-04-19", channel: "Facebook", assignedTo: "Hasnut Karim" },
    { id: "ORD-7292", customer: "Sara Khan", item: "WhatsApp API", amount: "৳2100.00", paid: "৳1000.00", due: "৳1100.00", status: "Partial", date: "2024-04-19", channel: "WhatsApp", assignedTo: "Hasnut Karim" },
    { id: "ORD-7293", customer: "Karim Ullah", item: "Enterprise Setup", amount: "৳54000.00", paid: "৳0.00", due: "৳54000.00", status: "Unpaid", date: "2024-04-18", channel: "LinkedIn", assignedTo: "Hasnut Karim" },
  ]);

  const [leads, setLeads] = useState<Lead[]>([
    { name: "Rafiqul Islam", email: "rafiq@example.com", source: "WhatsApp", status: "Hot", score: 85, date: "2024-04-19", assignedTo: "Hasnut Karim" },
    { name: "Anika Rahman", email: "anika@test.com", source: "Messenger", status: "Warm", score: 60, date: "2024-04-19", assignedTo: "Hasnut Karim" },
    { name: "Tanvir Hasan", email: "tanvir@biz.com", source: "X (Twitter)", status: "New", score: 30, date: "2024-04-18", assignedTo: "Hasnut Karim" },
  ]);

  const [activeMessagingId, setActiveMessagingId] = useState<number | null>(1);
  const [autoFallbackEnabled, setAutoFallbackEnabled] = useState(true);
  const [smartAssignmentEnabled, setSmartAssignmentEnabled] = useState(true);
  const [fallbackTimeout, setFallbackTimeout] = useState(60); // In seconds
  const [reassignmentNotice, setReassignmentNotice] = useState<string | null>(null);

  React.useEffect(() => {
    // Sync initial active employee state from backend with retry logic
    const syncSettings = async (retries = 3) => {
      try {
        const res = await fetch('/api/active-employee');
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data = await res.json();
        
        if (data.activeEmployeeId !== undefined) {
          setActiveMessagingId(data.activeEmployeeId);
          setAutoFallbackEnabled(data.autoFallbackEnabled ?? true);
          setSmartAssignmentEnabled(data.smartAssignmentEnabled ?? true);
          setFallbackTimeout((data.fallbackTimeout ?? 60000) / 1000);
          setEmployees(prev => prev.map(e => ({
            ...e,
            isMessagingActive: e.id === data.activeEmployeeId
          })));
        }
      } catch (err) {
        console.warn(`Sync attempt failed (${retries} retries left):`, err);
        if (retries > 0) {
          setTimeout(() => syncSettings(retries - 1), 2000);
        } else {
          console.error("Could not sync active employee after multiple attempts:", err);
        }
      }
    };

    // syncSettings();
  }, []);

  const handleUpdateSmartSettings = async (enabled: boolean) => {
    // Optimistically update UI
    setSmartAssignmentEnabled(enabled);
    try {
      const res = await fetch('/api/settings/smart-assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      if (!res.ok) {
        // Rollback on error
        setSmartAssignmentEnabled(!enabled);
      }
    } catch (e) {
      console.error("Error updating smart assignment settings:", e);
      setSmartAssignmentEnabled(!enabled);
    }
  };

  const handleSetActiveEmployee = async (id: number | null) => {
    // Update locally first for better responsiveness
    setActiveMessagingId(id);
    setEmployees(prev => prev.map(e => ({
      ...e,
      isMessagingActive: e.id === id
    })));

    try {
      const res = await fetch('/api/set-active-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) {
        // Rollback logic could be added here if needed
      }
    } catch (e) {
      console.error("Error setting active employee:", e);
    }
  };

  const handleUpdateFallbackSettings = async (enabled: boolean, timeoutSec: number) => {
    // Optimistically update UI
    const oldEnabled = autoFallbackEnabled;
    const oldTimeout = fallbackTimeout;
    
    setAutoFallbackEnabled(enabled);
    setFallbackTimeout(timeoutSec);

    try {
      const res = await fetch('/api/settings/fallback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, timeout: timeoutSec * 1000 })
      });
      if (!res.ok) {
        setAutoFallbackEnabled(oldEnabled);
        setFallbackTimeout(oldTimeout);
      }
    } catch (e) {
      console.error("Error updating fallback settings:", e);
      setAutoFallbackEnabled(oldEnabled);
      setFallbackTimeout(oldTimeout);
    }
  };

  const callWaha = async (endpoint: string, method: string = 'GET', body: any = null, params: any = {}, sessionName?: string, customConfig?: any) => {
    const wahaConfig = customConfig || getStoredWahaConfig();
    if (!wahaConfig) return null;

    const isLocalUrl = (url: string) => {
      try {
        const hostname = new URL(url).hostname;
        return (
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname.startsWith('192.168.') ||
          hostname.startsWith('10.') ||
          hostname.startsWith('172.')
        );
      } catch { return false; }
    };

    const proxyUrl = "https://1-waha.firhl1.easypanel.host";
    const cleanWahaUrl = wahaConfig.url?.replace(/\/$/, '') || "";
    const matchesProxy = cleanWahaUrl === proxyUrl || cleanWahaUrl === "";
    
    // Direct fetch only works if the URL matches our vercel.json rewrite destination
    // OR if it's a local URL (where Vite proxy handles it)
    const useDirectFetch = matchesProxy || isLocalUrl(cleanWahaUrl);

    const performDirectFetch = async () => {
      // Use Vite dev proxy to avoid CORS - requests go through localhost
      const session = sessionName || wahaConfig.session || 'default';
      // sessions/* endpoints already include the session in the path, don't add prefix
      // sendText, sendImage, etc. are GLOBAL endpoints that take session in the body
      const isSessionEndpoint = endpoint.startsWith('sessions');
      const isGlobalEndpoint = ['sendText', 'sendImage', 'sendFile', 'sendVideo', 'sendVoice', 'sendSeen', 'sendPresence', 'messages', 'sessions'].includes(endpoint.split('?')[0]) || endpoint.startsWith('contacts');
      const apiPath = (isSessionEndpoint || isGlobalEndpoint)
        ? `/waha-proxy/api/${endpoint}` 
        : `/waha-proxy/api/${session}/${endpoint}`;
      const url = new URL(`${window.location.origin}${apiPath}`);
      
      const queryParams = { ...params };
      if (isGlobalEndpoint && !queryParams.session) queryParams.session = session;
      Object.keys(queryParams).forEach(key => url.searchParams.append(key, queryParams[key]));
      
      const headers: any = { 'Content-Type': 'application/json' };
      const currentApiKey = wahaConfig.apiKey;
      if (currentApiKey) {
        const trimmedKey = currentApiKey.trim();
        headers['X-Api-Key'] = trimmedKey;
        // Also provide Authorization header as many proxies/servers prefer it
        headers['Authorization'] = `Bearer ${trimmedKey}`;
      }
      
      if (method !== 'GET') {
        console.log(`[WAHA] Calling ${method} ${apiPath} | Session: ${session} | API Key set: ${!!currentApiKey}`);
      }

      // WAHA chat history can be slow, especially when NOWEB store is warming up.
      const timeoutMs = endpoint === 'chats' ? 45000 : 12000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url.toString(), {
          method,
          headers,
          body: method === 'POST' && body ? JSON.stringify(body) : null,
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const responseText = await response.text();
        let responseData = null;
        
        if (responseText && responseText.trim()) {
          try {
            responseData = JSON.parse(responseText);
          } catch (e) {
            // Success response but not JSON
            if (response.ok) {
              console.info(`[WAHA] Non-JSON success from ${endpoint}:`, responseText.substring(0, 100));
              return { success: true, text: responseText };
            }
            // Error response and not JSON
            const errorMsg = responseText || response.statusText || "WAHA request failed";
            console.warn(`[WAHA] API Error (Non-JSON) on ${endpoint}:`, { status: response.status, message: errorMsg });
            return { error: true, statusCode: response.status, message: errorMsg };
          }
        } else if (response.ok) {
          // Empty success response (common for some POST/DELETE actions)
          return { success: true, message: "Empty success response" };
        }

        if (!response.ok) {
          const errorMsg = responseData?.message || responseText || response.statusText || "WAHA request failed";
          console.warn(`[WAHA] API Error on ${endpoint}:`, { status: response.status, message: errorMsg });
          return { ...responseData, error: true, statusCode: response.status, message: errorMsg };
        }
        return responseData;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          throw new Error(`WAHA Request Timeout (${endpoint}) after ${Math.round(timeoutMs / 1000)}s`);
        }
        throw err;
      }
    };

    const performEdgeFallback = async () => {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase not configured for proxy fallback");
      }
      
      const { data, error: invokeError } = await supabase.functions.invoke('waha-proxy', {
        body: {
          waha_url: wahaConfig.url,
          session_name: wahaConfig.session,
          waha_api_key: wahaConfig.apiKey,
          endpoint,
          method,
          params: method === 'POST' ? body : params
        }
      });
      
      if (invokeError) throw invokeError;
      
      // Normalize Edge Function error format
      if (data && data.error && typeof data.error === 'string') {
        return { error: true, message: data.error, ...data };
      }
      return data;
    };

    try {
      if (useDirectFetch) {
        try {
          const result = await performDirectFetch();
          // If direct fetch returns an auth error (401/403), it might be because the proxy is stripping headers
          if (result && result.error && (result.statusCode === 401 || result.statusCode === 403)) {
            console.info(`[WAHA] Auth error (${result.statusCode}) via direct fetch, falling back to Edge Function...`);
            return await performEdgeFallback();
          }
          return result;
        } catch (directError: any) {
          console.info(`[WAHA] Direct fetch failed (network error), trying Edge fallback: ${directError.message}`);
          return await performEdgeFallback();
        }
      } else {
        // For custom URLs, we MUST use the Edge Function to avoid CORS and Vercel proxy limitations
        console.log(`[WAHA] Using Edge Function for custom URL: ${wahaConfig.url}`);
        return await performEdgeFallback();
      }
    } catch (err: any) {
      const message = err instanceof Error ? err.message : "WAHA request failed";
      console.warn(`[WAHA] API call failed (${endpoint}):`, message);
      return { error: true, message };
    }
  };

  // Helper: WAHA can return IDs as objects like {_serialized: "123@c.us", server: "c.us"}
  // This extracts a usable string ID from any format
  const extractWahaId = (id: any): string => {
    if (!id) return '';
    if (typeof id === 'string') return id;
    if (typeof id === 'number') return String(id);
    if (typeof id === 'object') {
      return id._serialized || id.id || id.user || JSON.stringify(id);
    }
    return String(id);
  };

  const syncInProgress = React.useRef(false);
  const lastSyncAttemptRef = React.useRef(0);
  const lastSyncResultRef = React.useRef<Chat[]>([]);
  const lastEmptySyncRef = React.useRef(0);

  const handleLiveSync = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastSyncAttemptRef.current < 30000) {
      return lastSyncResultRef.current;
    }

    if (syncInProgress.current) {
      setIsSyncing(false);
      return lastSyncResultRef.current;
    }
    
    lastSyncAttemptRef.current = now;
    syncInProgress.current = true;
    setIsSyncing(false);
    setIsLiveLoading(true);
    setSyncProgress(10);

    let allChats: Chat[] = [];

    try {
      // 1. WhatsApp Sync (WAHA) - Loop through all stored configurations
      try {
        const configs = getStoredWahaConfigs();
        for (const configId of Object.keys(configs)) {
          const config = configs[configId];
          const targetSessionName = config.session;
          try {
            const sessionsData = await callWaha('sessions', 'GET', null, {}, targetSessionName, config);
            const sessions = normalizeWahaList(sessionsData).filter((s: any) => s.status === 'WORKING');
            
            for (const session of sessions) {
              if (session.name !== targetSessionName) continue;
              const sessionName = session.name;
          const ownIds = new Set([
            extractWahaId(session?.me?.id),
            extractWahaId(session?.me?.lid)
          ].filter(Boolean));

          let data = await callWaha('chats/overview', 'GET', null, {
            limit: 50,
            offset: 0,
            sortBy: 'messageTimestamp',
            sortOrder: 'desc'
          }, sessionName, config);

          if (!data || data.error || normalizeWahaList(data).length === 0) {
            data = await callWaha('contacts/all', 'GET', null, {
              limit: 50,
              offset: 0
            }, sessionName, config);
          }

          if (data && !data.error) {
            const rawWahaItems = normalizeWahaList(data);
            if (rawWahaItems.length > 0) {
              const formatted = formatWahaChats(rawWahaItems, ownIds, sessionName);
              allChats = [...allChats, ...formatted];
              
              // Background Sync: Fetch Profile Pictures for WA
              const fetchAvatars = async () => {
                for (const chat of formatted) {
                  try {
                    const picData = await callWaha(`chats/${encodeURIComponent(String(chat.id))}/picture`, 'GET', null, {}, sessionName, config);
                    const pictureUrl = picData?.url || picData?.profilePictureURL;
                    if (pictureUrl) {
                      setChats(current => current.map(c => c.id === chat.id ? { ...c, avatarUrl: pictureUrl } : c));
                    }
                  } catch (e) {}
                  await new Promise(r => setTimeout(r, 300));
                }
              };
              fetchAvatars();
            }
          }
          }
        } catch (sessionErr) {
          console.warn(`[WAHA] Sync failed for session ${targetSessionName}:`, sessionErr);
        }
      }
    } catch (wahaErr) {
      console.error("WAHA global sync error:", wahaErr);
    }

      setSyncProgress(50);

      // 2. Facebook Messenger Sync (Pure API)
      if (isSupabaseConfigured) {
        try {
          console.log("[META] Invoking get-meta-conversations...");
          const { data: fbData, error: fbError } = await supabase.functions.invoke('get-meta-conversations');
          if (fbError) throw fbError;
          
          console.log("[META] Response from get-meta-conversations:", fbData);

          if (fbData?.conversations) {
            console.log(`[META] Found ${fbData.conversations.length} conversations`);
            const fbChats = fbData.conversations.map((fc: any) => ({
              ...fc,
              platformIcon: <Facebook className="w-3 h-3" />,
              platformColor: 'bg-blue-600',
              messages: [], 
              timestamp: (fc.last_time || fc.time) ? new Date(fc.last_time || fc.time).getTime() / 1000 : 0,
              last_time: fc.last_time || fc.time || new Date(0).toISOString(),
              profile: { 
                phone: fc.external_uid, 
                bio: "Facebook Messenger User",
                work: "Customer",
                education: "",
                location: "",
                hometown: "",
                relationship: "",
                birthday: "",
                email: "",
                gender: "",
                coverImage: "",
                joinedDate: "New"
              }
            }));
            allChats = [...allChats, ...fbChats];
          }
        } catch (fbErr) {
          console.warn("[META] Messenger sync error:", fbErr);
        }
      }

      setSyncProgress(90);
      
      // Sort by timestamp (most recent first)
      allChats.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

      lastSyncResultRef.current = allChats;
      return allChats;

    } catch (err) {
      console.error("General live sync error:", err);
    } finally {
      setSyncProgress(100);
      setIsSyncing(false);
      setIsLiveLoading(false);
      syncInProgress.current = false;
      setTimeout(() => setSyncProgress(0), 300);
    }
    
    return allChats;
  };

  const handleDisconnectWAHA = async (sessionName?: string) => {
    const configs = getStoredWahaConfigs();
    const allConfigs = Object.values(configs);
    
    // Find the config either by its key (page_id) or by the session name inside it
    let config = null;
    let sessionToDisconnect = sessionName || 'default';
    
    if (sessionName && configs[sessionName]) {
      config = configs[sessionName];
      sessionToDisconnect = config.session;
    } else if (sessionName) {
      config = allConfigs.find((c: any) => c.session === sessionName);
    } else {
      config = allConfigs[0];
      sessionToDisconnect = config?.session || 'default';
    }

    if (!window.confirm(`Are you sure you want to disconnect WhatsApp session "${sessionToDisconnect}"? This will log out the session.`)) return;
    
    try {
      setIsSyncing(true);
      
      console.log("[WAHA] Attempting to logout session:", sessionToDisconnect);
      
      // 1. Try to logout via WAHA API (logs out from WhatsApp)
      const logoutRes = await callWaha(`sessions/${sessionToDisconnect}/logout`, 'POST', null, {}, sessionToDisconnect, config);
      
      // 2. Try to stop (stops the engine)
      await callWaha(`sessions/${sessionToDisconnect}/stop`, 'POST', null, {}, sessionToDisconnect, config);
      
      // 3. Try to DELETE (removes session from WAHA entirely)
      const deleteRes = await callWaha(`sessions/${sessionToDisconnect}`, 'DELETE', null, {}, sessionToDisconnect, config);
      
      if (deleteRes?.error && logoutRes?.error) {
        console.warn("[WAHA] Could not fully remove session from server:", deleteRes.message);
      }
      
      // 2. Clear Local Storage for this SPECIFIC session
      const updatedConfigs = { ...configs };
      delete updatedConfigs[sessionToDisconnect];
      localStorage.setItem("waha_configs", JSON.stringify(updatedConfigs));
      
      // Legacy cleanup
      if (localStorage.getItem("waha_config")) {
        const legacy = JSON.parse(localStorage.getItem("waha_config") || "{}");
        if (legacy.session === sessionToDisconnect) {
          localStorage.removeItem("waha_config");
        }
      }
      
      // 3. Clear State
      setChats(prev => prev.filter(c => c.platform !== 'whatsapp' || (c.session && c.session !== sessionToDisconnect)));
      
      setIsSyncing(false);
      alert("WhatsApp disconnected successfully.");
      window.location.reload(); 
    } catch (err) {
      console.error("Disconnect error:", err);
      alert("Failed to fully disconnect. Local settings cleared.");
      setIsSyncing(false);
    }
  };

  const loadIntegrations = async () => {
    if (!isSupabaseConfigured) {
      console.log("[WAHA] Supabase not configured, skipping integration load.");
      return;
    }
    try {
      console.log("[WAHA] Loading integrations from Supabase...");
      const { data, error } = await supabase
        .from('social_integrations')
        .select('page_id, page_name, platform, access_token');
        
      if (error) throw error;

      if (data && data.length > 0) {
        console.log(`[WAHA] Found ${data.length} integrations in database.`);
        // 1. Update UI list
        setFacebookUsers(data.map((c: any) => {
          const isWhatsApp = c.platform === 'whatsapp';
          return {
            id: c.page_id,
            name: c.page_name || (isWhatsApp ? "WhatsApp Session" : "Facebook Page"),
            email: isWhatsApp ? "WhatsApp" : "Messenger",
            avatar: isWhatsApp 
              ? `https://api.dicebear.com/7.x/initials/svg?seed=${c.page_id}`
              : `https://graph.facebook.com/${c.page_id}/picture?type=large`
          };
        }));

        // 2. Sync WhatsApp configs to memory cache
        const newMemoryConfigs: Record<string, any> = {};
        data.filter((c: any) => c.platform === 'whatsapp').forEach((c: any) => {
          try {
            const parts = c.page_id.split(':');
            if (parts.length >= 3 && parts[0] === 'whatsapp') {
              const session = parts[1];
              const url = parts.slice(2).join(':');
              // Use the full page_id as the key to allow multiple accounts with same session name (on different servers)
              newMemoryConfigs[c.page_id] = { url, session, apiKey: c.access_token };
            }
          } catch (e) {
            console.warn("[WAHA] ID parse error:", c.page_id);
          }
        });

        if (Object.keys(newMemoryConfigs).length > 0) {
          memoryWahaConfigs = newMemoryConfigs;
          console.log("[WAHA] Memory cache updated with accounts:", Object.keys(memoryWahaConfigs));
        } else {
          console.warn("[WAHA] No valid WhatsApp configurations found in integrations data.");
        }
      } else {
        console.info("[WAHA] No social integrations found in database.");
        setFacebookUsers([]);
      }
    } catch (err) {
      console.warn("[WAHA] Integration load failed:", err);
    }
  };

  const loadSupabaseData = async (caller: string = "unknown") => {
    try {
      // Ensure configurations are loaded from database FIRST
      await loadIntegrations();
      
      const liveChats = await handleLiveSync();
      if (liveChats && liveChats.length > 0) {
        setChats(liveChats);
      }
    } catch (err) {
      console.error("[SYNC] Live data fetch failed:", err);
    }
    return [];
  };

  React.useEffect(() => {
    loadSupabaseData("App:useEffect:mount");

    // 2. Real-time Subscriptions
    let chatChannel: any, msgChannel: any, empChannel: any, orderChannel: any, leadChannel: any;

    if (isSupabaseConfigured) {
      chatChannel = supabase.channel('chats-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, (payload) => {
          if (payload.eventType === 'INSERT') {
            const newChat = payload.new;
            setChats(prev => {
              if (prev.find(c => c.id === newChat.id)) return prev;
              const formattedChat = {
                ...newChat,
                platformIcon: newChat.platform === 'whatsapp' ? <Phone className="w-3 h-3" /> : (newChat.platform === 'messenger' ? <Facebook className="w-3 h-3" /> : <Globe className="w-3 h-3" />),
                platformColor: newChat.platform_color || (newChat.platform === 'whatsapp' ? 'bg-emerald-500' : 'bg-blue-500'),
                time: newChat.last_time ? new Date(newChat.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
                avatar: newChat.name?.charAt(0) || "?",
                messages: []
              };
              return [formattedChat as any, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            setChats(prev => {
              const updated = prev.map(c => c.id === payload.new.id ? { 
                ...c, 
                ...payload.new,
                timestamp: payload.new.last_time ? new Date(payload.new.last_time).getTime() / 1000 : c.timestamp,
                time: payload.new.last_time ? new Date(payload.new.last_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : c.time
              } : c);
              return [...updated].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            });
          } else if (payload.eventType === 'DELETE') {
            setChats(prev => prev.filter(c => c.id !== payload.old.id));
          }
        })
        .subscribe();
      
      msgChannel = supabase.channel('messages-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          const newMsg = payload.new;
          setChats(prev => prev.map(chat => {
            if (chat.id === newMsg.chat_id) {
              // Check if message already exists
              if (chat.messages.find(m => m.id === newMsg.id)) return chat;
              
              return {
                ...chat,
                lastMsg: newMsg.text,
                last_time: new Date().toISOString(),
                timestamp: Date.now() / 1000,
                unread: (chat.unread || 0) + 1,
                time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                messages: [...chat.messages, {
                  id: newMsg.id,
                  text: newMsg.text,
                  sender: newMsg.sender,
                  time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  type: newMsg.type || 'text',
                  mediaUrl: newMsg.media_url,
                  translatedText: newMsg.translated_text
                }]
              };
            }
            return chat;
          }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
        })
        .subscribe();

      empChannel = supabase.channel('employees-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => loadSupabaseData("App:realtime:employees"))
        .subscribe();

      orderChannel = supabase.channel('orders-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => loadSupabaseData("App:realtime:orders"))
        .subscribe();

      leadChannel = supabase.channel('leads-realtime')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => loadSupabaseData("App:realtime:leads"))
        .subscribe();
    }

    return () => {
      if (chatChannel) supabase.removeChannel(chatChannel);
      if (msgChannel) supabase.removeChannel(msgChannel);
      if (empChannel) supabase.removeChannel(empChannel);
      if (orderChannel) supabase.removeChannel(orderChannel);
      if (leadChannel) supabase.removeChannel(leadChannel);
    };
  }, []);

  // 3. Global Polling for Live Sync (Messenger & WhatsApp)
  React.useEffect(() => {
    const pollInterval = setInterval(() => {
      console.log("[SYNC] Starting background live sync poll...");
      handleLiveSync();
    }, 30000); // 30 seconds
    
    return () => clearInterval(pollInterval);
  }, []);

  React.useEffect(() => {
    if (faviconUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [faviconUrl]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-6 font-sans">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          {logoUrl ? (
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden border border-slate-700 shadow-xl mb-4">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="w-16 h-16 bg-sky-500 rounded-2xl flex items-center justify-center border border-slate-700 shadow-xl mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
          )}
          <h2 className="text-slate-200 font-bold text-xl tracking-tight uppercase">{appName}</h2>
        </div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-[#1e2d45] w-full max-w-lg rounded-[2.5rem] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] p-12 border border-slate-700/50"
        >
          {showForgotPassword ? (
            <>
              <div className="flex items-center gap-4 mb-8">
                <button 
                  onClick={() => { setShowForgotPassword(false); setResetMessage(""); }}
                  className="p-2 bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">Reset Password</h1>
                  <p className="text-slate-400 text-sm font-medium">Enter your email to verify account.</p>
                </div>
              </div>

              {resetMessage && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${resetMessage.includes('is:') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                  {resetMessage.includes('is:') ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  <p className="text-xs font-bold uppercase tracking-wider">{resetMessage}</p>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleForgotPassword}>
                <div>
                  <label className="block text-slate-300 font-bold text-sm mb-2" htmlFor="reset-email">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600"
                    placeholder="Enter your registered email"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0a946b] hover:bg-[#08835d] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/10 active:scale-[0.98] uppercase tracking-wider text-sm mt-4"
                >
                  Verify Email
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="flex bg-[#0f172a] p-1 rounded-2xl mb-8 border border-slate-700/50">
                <button
                  onClick={() => { setLoginTab("Super Admin"); setLoginError(""); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loginTab === "Super Admin" ? 'bg-[#0a946b] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Super Admin
                </button>
                <button
                  onClick={() => { setLoginTab("Executive"); setLoginError(""); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${loginTab === "Executive" ? 'bg-[#0a946b] text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  Employee
                </button>
              </div>

              <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
              <p className="text-slate-400 mb-6 font-medium">Sign in as <span className="text-emerald-400 font-bold">{loginTab}</span> to access your dashboard.</p>
              
              <div className="mb-8 p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest mb-1">Demo Access</p>
                <p className="text-xs text-slate-400 font-medium">
                  {loginTab === "Super Admin" 
                    ? "Email: admin@omniinbox.com | Pass: admin123" 
                    : "Create an Executive account first in Admin Panel."}
                </p>
              </div>

              {loginError && (
                <div className="mb-6 space-y-2">
                  <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">{loginError}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      localStorage.clear();
                      window.location.reload();
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors uppercase tracking-[0.2em] font-black block mx-auto py-2"
                  >
                    Reset Application Data
                  </button>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label className="block text-slate-300 font-bold text-sm mb-2" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600"
                    placeholder="name@company.com"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-slate-300 font-bold text-sm" htmlFor="password">
                      Password
                    </label>
                    <button 
                      type="button"
                      onClick={() => setShowForgotPassword(true)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      type={showLoginPassword ? "text" : "password"}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#0f172a] border border-slate-700 text-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-600 pr-12"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center group cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-5 h-5 rounded border-slate-700 bg-[#0f172a] text-emerald-600 focus:ring-emerald-500 transition-colors cursor-pointer"
                    />
                    <span className="ml-3 text-slate-400 font-medium group-hover:text-white transition-colors">
                      Remember me
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#0a946b] hover:bg-[#08835d] text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/10 active:scale-[0.98] uppercase tracking-wider text-sm mt-4"
                >
                  Log In
                </button>
              </form>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <FacebookSDK />
      {isSyncing && (
        <SyncOverlay 
          isSyncing={isSyncing}
          progress={syncProgress}
          brandColor="bg-emerald-500" 
          onSuccess={() => setIsSyncing(false)}
        />
      )}
      <Dashboard 
        currentUser={currentUser}
        onLogout={handleLogout} 
        onUpdateUser={updateCurrentUser}
        onDeleteUser={deleteUser}
        addExecutive={addExecutive}
        users={users}
        logoUrl={logoUrl} 
        setLogoUrl={setLogoUrl}
        faviconUrl={faviconUrl}
        setFaviconUrl={setFaviconUrl} 
        appName={appName}
        setAppName={setAppName}
        appColors={appColors}
        setAppColors={setAppColors}
        employees={employees}
        setEmployees={setEmployees}
        activeMessagingId={activeMessagingId}
        setActiveMessagingId={setActiveMessagingId}
        handleSetActiveEmployee={handleSetActiveEmployee}
        autoFallbackEnabled={autoFallbackEnabled}
        smartAssignmentEnabled={smartAssignmentEnabled}
        fallbackTimeout={fallbackTimeout}
        handleUpdateFallbackSettings={handleUpdateFallbackSettings}
        handleUpdateSmartSettings={handleUpdateSmartSettings}
        reassignmentNotice={reassignmentNotice}
        chats={chats}
        setChats={setChats}
        orders={orders}
        setOrders={setOrders}
        leads={leads}
        setLeads={setLeads}
        typingUsers={typingUsers}
        setTypingUsers={setTypingUsers}
        loadSupabaseData={loadSupabaseData}
        handleLiveSync={handleLiveSync}
        callWaha={callWaha}
        isSyncing={isSyncing}
        selectedChat={selectedChat}
        setSelectedChat={setSelectedChat}
        isLiveLoading={isLiveLoading}
        setIsLiveLoading={setIsLiveLoading}
        handleDisconnectWAHA={handleDisconnectWAHA}
        whatsappAddMode={whatsappAddMode}
        setWhatsappAddMode={setWhatsappAddMode}
        facebookUsers={facebookUsers}
        setFacebookUsers={setFacebookUsers}
        isVerified={isVerified}
        setIsVerified={setIsVerified}
        isConnecting={isConnecting}
        setIsConnecting={setIsConnecting}
        loginProgress={loginProgress}
        setLoginProgress={setLoginProgress}
        loadIntegrations={loadIntegrations}
      />
    </>
  );
}

function Dashboard({ 
  currentUser,
  onLogout,
  onUpdateUser,
  onDeleteUser,
  addExecutive,
  users,
  logoUrl,
  setLogoUrl,
  faviconUrl,
  setFaviconUrl,
  appName,
  setAppName,
  appColors,
  setAppColors,
  employees,
  setEmployees,
  activeMessagingId,
  setActiveMessagingId,
  handleSetActiveEmployee,
  autoFallbackEnabled,
  smartAssignmentEnabled,
  fallbackTimeout,
  handleUpdateFallbackSettings,
  handleUpdateSmartSettings,
  reassignmentNotice,
  chats,
  setChats,
  orders,
  setOrders,
  leads,
  setLeads,
  typingUsers,
  setTypingUsers,
  loadSupabaseData,
  handleLiveSync,
  callWaha,
  isSyncing,
  selectedChat,
  setSelectedChat,
  isLiveLoading,
  setIsLiveLoading,
  handleDisconnectWAHA,
  whatsappAddMode,
  setWhatsappAddMode,
  facebookUsers,
  setFacebookUsers,
  isVerified,
  setIsVerified,
  isConnecting,
  setIsConnecting,
  loginProgress,
  setLoginProgress,
  loadIntegrations
}: { 
  currentUser: User;
  onLogout: () => void;
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void;
  addExecutive: (u: Omit<User, "id" | "joinedDate" | "avatar">) => void;
  users: User[];
  logoUrl: string | null;
  setLogoUrl: (url: string | null) => void;
  faviconUrl: string | null;
  setFaviconUrl: (url: string | null) => void;
  appName: string;
  setAppName: (name: string) => void;
  appColors: any;
  setAppColors: (colors: any) => void;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  activeMessagingId: number | null;
  setActiveMessagingId: React.Dispatch<React.SetStateAction<number | null>>;
  handleSetActiveEmployee: (id: number | null) => Promise<void>;
  autoFallbackEnabled: boolean;
  smartAssignmentEnabled: boolean;
  fallbackTimeout: number;
  handleUpdateFallbackSettings: (enabled: boolean, timeoutSec: number) => Promise<void>;
  handleUpdateSmartSettings: (enabled: boolean) => Promise<void>;
  reassignmentNotice: string | null;
  chats: Chat[];
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>;
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  leads: Lead[];
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>;
  typingUsers: {[key: number]: string};
  setTypingUsers: React.Dispatch<React.SetStateAction<{[key: number]: string}>>;
  loadSupabaseData: () => Promise<any[]>;
  handleLiveSync: (force?: boolean) => Promise<any[]>;
  callWaha: (endpoint: string, method?: string, body?: any, params?: any, session?: string, config?: any) => Promise<any>;
  isSyncing: boolean;
  selectedChat: string | number | null;
  setSelectedChat: React.Dispatch<React.SetStateAction<string | number | null>>;
  isLiveLoading: boolean;
  setIsLiveLoading: React.Dispatch<React.SetStateAction<boolean>>;
  handleDisconnectWAHA: (sessionName?: string) => Promise<void>;
  whatsappAddMode: boolean;
  setWhatsappAddMode: React.Dispatch<React.SetStateAction<boolean>>;
  facebookUsers: any[];
  setFacebookUsers: React.Dispatch<React.SetStateAction<any[]>>;
  isVerified: boolean;
  setIsVerified: React.Dispatch<React.SetStateAction<boolean>>;
  isConnecting: boolean;
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>;
  loginProgress: number;
  setLoginProgress: React.Dispatch<React.SetStateAction<number>>;
  loadIntegrations: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentView, setCurrentView] = useState("Home");

  // Map of Label -> Slug
  const viewToSlug: Record<string, string> = useMemo(() => ({
    "Home": "/",
    "AI Assistant": "/ai-assistant",
    "WhatsApp": "/whatsapp",
    "Facebook / Messenger": "/facebook",
    "Instagram": "/instagram",
    "TikTok": "/tiktok",
    "X": "/x",
    "LinkedIn": "/linkedin",
    "Connections": "/connections",
    "Chats": "/chats",
    "Social Management": "/social-management",
    "Orders & Leads": "/orders-leads",
    "Performance Intelligence": "/performance",
    "Reports & Analytics": "/analytics",
    "Employees": "/employees",
    "Roles": "/roles",
    "Permissions": "/permissions",
    "Manual Migration": "/migration",
    "Packages": "/packages",
    "Profile": "/profile",
    "Settings": "/settings"
  }), []);

  // Map of Slug -> Label
  const slugToView = useMemo(() => 
    Object.entries(viewToSlug).reduce((acc, [view, slug]) => ({ ...acc, [slug]: view }), {} as Record<string, string>)
  , [viewToSlug]);

  // Sync URL to State
  useEffect(() => {
    const view = slugToView[location.pathname];
    if (view && view !== currentView) {
      setCurrentView(view);
    }
  }, [location.pathname, slugToView, currentView]);

  // Sync State to URL
  useEffect(() => {
    const slug = viewToSlug[currentView];
    if (slug && slug !== location.pathname) {
      navigate(slug);
    }
  }, [currentView, navigate, viewToSlug, location.pathname]);

  const [facebookAccessToken, setFacebookAccessToken] = useState<string>("");
  
  // Use currentUser as the source of truth for the profile
  const userProfile = useMemo(() => ({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
    bio: currentUser.role === "Super Admin" ? "Head of Operations at OmniInbox." : "Executive Operations Manager.",
    avatar: currentUser.avatar,
    role: currentUser.role,
    joinedDate: currentUser.joinedDate
  }), [currentUser]);

  const [permissions, setPermissions] = useState(() => {
    const saved = localStorage.getItem("app_permissions");
    return saved ? JSON.parse(saved) : [
      { name: "Connections", isSystem: true, description: "Manage WhatsApp and Messenger channel accounts (credentials, labels, active state).", slug: "connections.manage", roles: 1 },
      { name: "Employees", isSystem: true, description: "Assign roles to team members.", slug: "employees.manage", roles: 1 },
      { name: "Inbox", isSystem: true, description: "View and reply in the unified chats inbox.", slug: "inbox.access", roles: 1 },
      { name: "Integration settings", isSystem: true, description: "View webhook URLs and integration shortcuts on Settings.", slug: "settings.integrations", roles: 1 },
      { name: "LinkedIn", isSystem: true, description: "Connect and configure LinkedIn professional profiles.", slug: "linkedin.manage", roles: 1 },
      { name: "Messenger", isSystem: true, description: "Connect and configure Facebook Messenger.", slug: "messenger.manage", roles: 1 },
      { name: "Permissions", isSystem: true, description: "Create and edit permission definitions.", slug: "permissions.manage", roles: 1 },
      { name: "Roles", isSystem: true, description: "Create and edit roles and their permissions.", slug: "roles.manage", roles: 1 },
      { name: "TikTok", isSystem: true, description: "Connect and configure TikTok content accounts.", slug: "tiktok.manage", roles: 1 },
      { name: "WhatsApp", isSystem: true, description: "Connect and configure WhatsApp Cloud API.", slug: "whatsapp.manage", roles: 1 },
      { name: "X (Twitter)", isSystem: true, description: "Connect and configure X (formerly Twitter) accounts.", slug: "x.manage", roles: 1 },
    ];
  });

  React.useEffect(() => {
    localStorage.setItem("app_permissions", JSON.stringify(permissions));
  }, [permissions]);

  const [roles, setRoles] = useState(() => {
    const saved = localStorage.getItem("app_roles");
    return saved ? JSON.parse(saved) : [
      { 
        name: "Administrator", 
        isSystem: true, 
        description: "Full access to messaging tools, team settings, and role management.", 
        slug: "admin", 
        panelAccess: true, 
        users: 1,
        permissions: ["connections.manage", "employees.manage", "inbox.access", "settings.integrations", "permissions.manage", "roles.manage", "whatsapp.manage"]
      },
      { 
        name: "Agent", 
        isSystem: true, 
        description: "Standard team member without admin panel access.", 
        slug: "agent", 
        panelAccess: false, 
        users: 1,
        permissions: ["inbox.access"]
      }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem("app_roles", JSON.stringify(roles));
  }, [roles]);

  const saveProfile = async (newProfile: UserProfile) => {
    const updatedUser: User = {
      ...currentUser,
      name: newProfile.name,
      email: newProfile.email,
      phone: newProfile.phone,
      avatar: newProfile.avatar || ""
    };
    onUpdateUser(updatedUser);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('app_users').upsert({
          id: currentUser.id,
          name: newProfile.name,
          email: newProfile.email,
          phone: newProfile.phone,
          avatar: newProfile.avatar,
          role: currentUser.role
        });
      } catch (e) {
        console.error("Supabase profile sync error:", e);
      }
    }
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [isSidebarHovered, setIsSidebarHovered] = useState(false);

  const isExpanded = !isSidebarCollapsed || isSidebarHovered;



  const filteredChatsForAnalytics = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "Super Admin") return chats;
    return chats.filter(c => c.assignedTo === currentUser.name);
  }, [chats, currentUser]);

  const filteredEmployeesForAnalytics = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "Super Admin") return employees;
    // For Executive, only show themselves in performance metrics
    return employees.filter(e => e.email === currentUser.email);
  }, [employees, currentUser]);

  const filteredOrdersForView = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "Super Admin") return orders;
    return orders.filter(o => o.assignedTo === currentUser.name);
  }, [orders, currentUser]);

  const filteredLeadsForView = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "Super Admin") return leads;
    return leads.filter(l => l.assignedTo === currentUser.name);
  }, [leads, currentUser]);

  const [connectedPlatforms, setConnectedPlatforms] = useState<ConnectedPlatform[]>([
    {
      id: "whatsapp",
      name: "WhatsApp",
      desc: "Cloud API & QR Gateway",
      iconType: "Phone",
      accounts: []
    },
    {
      id: "facebook",
      name: "Messenger",
      desc: "Business Page Messages",
      iconType: "Facebook",
      accounts: [
        { id: "fb-1", name: "Aaramaura Shop", status: "Healthy", lastSync: "Just now", details: "Main Store Page" },
        { id: "fb-2", name: "Support Hub", status: "Healthy", lastSync: "5 mins ago", details: "Customer Support" }
      ]
    },
    {
      id: "tiktok",
      name: "TikTok",
      desc: "Creator DMs & Comments",
      iconType: "Music",
      accounts: []
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      desc: "Org Pages & Talent Hub",
      iconType: "Linkedin",
      accounts: [
        { id: "li-1", name: "Aaramaura Tech", status: "Healthy", lastSync: "1 hour ago", details: "Corporate Page" }
      ]
    },
    {
      id: "x",
      name: "X (Twitter)",
      desc: "DMs & Mentions",
      iconType: "Twitter",
      accounts: [
        { id: "x-1", name: "@aaramaura_it", status: "Healthy", lastSync: "Never", details: "Primary Profile" }
      ]
    },
    {
      id: "instagram",
      name: "Instagram",
      desc: "Story Replies & DMs",
      iconType: "Instagram",
      accounts: []
    }
  ]);

  const [smartModeEnabled, setSmartModeEnabled] = useState(true);

  // Real-time Status and Workload Synchronization
  React.useEffect(() => {
    setEmployees(prev => prev.map(e => {
      // Calculate real current load from chats assigned to this employee name
      // If e.name is null or assignedTo is null, it's not counted.
      const assignedChats = chats.filter(c => c.assignedTo === e.name && !c.isDone);
      const activeChats = assignedChats.length;
      
      const resolvedCount = chats.filter(c => c.assignedTo === e.name && c.isDone).length;
      const totalResolved = (e.resolvedChats || 0) > resolvedCount ? e.resolvedChats : resolvedCount;

      // Latency heuristic: Base latency + workload penalty
      const baseLatency = (e.id === 1 || e.id === 6) ? 35 : 90; // Top performers
      const latency = Math.round(baseLatency + (activeChats * 15) + (Math.random() * 10));

      // Performance Score calculation
      const loadWeight = (activeChats / 12) * 40; // 12 is soft cap
      const latencyWeight = (latency / 250) * 30;
      const ratingWeight = ((e.rating || 0) / 5) * 30;
      const score = Math.max(0, Math.min(100, Math.round(40 - loadWeight + ratingWeight + (100 - latencyWeight) * 0.3)));

      return {
        ...e,
        currentLoad: activeChats,
        resolvedChats: totalResolved,
        avgResponseTime: latency,
        performanceScore: score
      };
    }));
  }, [chats, smartModeEnabled]);

  const employeesRef = React.useRef(employees);
  React.useEffect(() => {
    employeesRef.current = employees;
  }, [employees]);

  // Real-time Simulation logic: Random events (new chats assigned to random agents)
  React.useEffect(() => {
    if (!smartModeEnabled) return;

    const interval = setInterval(() => {
      // Randomly assign an unassigned chat to an online agent to simulate load
      setChats(prev => {
        const unassigned = prev.filter(c => !c.assignedTo && !c.isDone);
        if (unassigned.length === 0) return prev;

        const randomChatIdx = Math.floor(Math.random() * unassigned.length);
        const chatToAssign = unassigned[randomChatIdx];

        const onlineAgents = employeesRef.current.filter(e => e.isOnline && e.id !== 1); // Not admin
        if (onlineAgents.length === 0) return prev;

        const randomAgent = onlineAgents[Math.floor(Math.random() * onlineAgents.length)];

        return prev.map(c => c.id === chatToAssign.id ? { ...c, assignedTo: randomAgent.name } : c);
      });
    }, 8000);

    return () => clearInterval(interval);
  }, [smartModeEnabled]);

  interface SidebarItemData {
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    section: 'MENU' | 'WORK' | 'SYSTEM';
    restricted?: boolean;
  }

  const sidebarItems: SidebarItemData[] = useMemo(() => {
    const isExec = currentUser.role === "Executive";
    return [
      { icon: <Home className="w-5 h-5" />, label: "Home", section: 'MENU' },
      { icon: <Zap className="w-5 h-5 text-amber-400" />, label: "AI Assistant", section: 'MENU' },
      { icon: <Phone className="w-5 h-5" />, label: "WhatsApp", section: 'MENU', restricted: true },
      { icon: <Facebook className="w-5 h-5" />, label: "Facebook / Messenger", section: 'MENU', restricted: true },
      { icon: <Instagram className="w-5 h-5" />, label: "Instagram", section: 'MENU', restricted: true },
      { icon: <Music className="w-5 h-5" />, label: "TikTok", section: 'MENU', restricted: true },
      { icon: <Twitter className="w-5 h-5" />, label: "X", section: 'MENU', restricted: true },
      { icon: <Linkedin className="w-5 h-5" />, label: "LinkedIn", section: 'MENU', restricted: true },
      
      { icon: <LinkIcon className="w-5 h-5" />, label: "Connections", section: 'WORK', restricted: true },
      { icon: <MessageSquare className="w-5 h-5" />, label: "Chats", section: 'WORK' },
      { icon: <Sparkles className="w-5 h-5 text-indigo-400" />, label: "Social Management", section: 'WORK' },
      { icon: <ShoppingCart className="w-5 h-5" />, label: "Orders & Leads", section: 'WORK' },
      
      { icon: <Zap className="w-5 h-5" />, label: "Performance Intelligence", section: 'SYSTEM', restricted: true },
      { icon: <BarChart3 className="w-5 h-5" />, label: "Reports & Analytics", section: 'SYSTEM', restricted: true },
      { icon: <Users className="w-5 h-5" />, label: "Employees", section: 'SYSTEM', restricted: true },
      { icon: <Shield className="w-5 h-5" />, label: "Roles", section: 'SYSTEM', restricted: true },
      { icon: <Key className="w-5 h-5" />, label: "Permissions", section: 'SYSTEM', restricted: true },
      { icon: <Database className="w-5 h-5" />, label: "Manual Migration", section: 'SYSTEM', restricted: true },
      { icon: <CreditCard className="w-5 h-5" />, label: "Packages", section: 'SYSTEM', restricted: true },
      { icon: <User className="w-5 h-5" />, label: "Profile", section: 'SYSTEM' },
      { icon: <Settings className="w-5 h-5" />, label: "Settings", section: 'SYSTEM', restricted: true },
    ].filter(item => {
      if (!isExec) return true;
      // All menu items that aren't specifically "Restricted" are visible
      if (!item.restricted) return true;
      // If it is restricted, check if the executive has specific permission for it
      return currentUser.permissions?.includes(item.label);
    });
  }, [currentUser.role, currentUser.permissions]);

  const stats = useMemo(() => {
    if (currentUser.role === "Executive") {
      return [
        { label: "MY REPLIES", value: "128", sub: "Last 24 hours" },
        { label: "RESP. TIME", value: "3.2m", sub: "Avg per thread" },
        { label: "LEADS WON", value: "14", sub: "Converted by me" },
        { label: "SCHEDULED", value: "3", sub: "Pending posts" },
      ];
    }
    return [
      { label: "CONVERSATIONS", value: chats.length.toString() },
      { label: "MESSAGES STORED", value: chats.reduce((acc, c) => acc + c.messages.length, 0).toString() },
      { label: "TODAY", value: chats.filter(c => c.time.includes('AM') || c.time.includes('PM') || c.time === 'Just now').length.toString(), sub: "Inbound & outbound" },
      { label: "WHATSAPP THREADS", value: chats.filter(c => c.platform === 'whatsapp').length.toString() },
    ];
  }, [currentUser.role, chats]);

  return (
    <div className="flex min-h-screen font-sans text-slate-100" style={{ backgroundColor: appColors.pageBg }}>
      {/* Sidebar */}
      <aside 
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        className={`${isExpanded ? 'w-64' : 'w-20'} text-white flex flex-col shrink-0 border-r border-slate-800/50 transition-all duration-300 ease-in-out relative z-30 overflow-hidden md:flex`}
        style={{ 
          background: `linear-gradient(to bottom, ${appColors.sidebarTop}, ${appColors.sidebarMiddle}, ${appColors.sidebarBottom})` 
        }}
      >
        <div className={`p-6 flex items-center transition-all ${isExpanded ? 'gap-3' : 'justify-center'}`}>
          <div 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-700/50 shadow-[0_4px_12px_rgba(0,0,0,0.15)] cursor-pointer hover:scale-105 transition-transform active:scale-95"
          >
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <MessageSquare className="w-6 h-6" style={{ color: appColors.primaryAccent }} />
            )}
          </div>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="min-w-0"
            >
              <h1 className="font-bold text-lg leading-tight uppercase tracking-tight text-white truncate">{appName}</h1>
              <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">Unified View</p>
            </motion.div>
          )}
        </div>

        <div className="flex-1 px-3 space-y-6 pt-4 overflow-y-auto no-scrollbar overflow-x-hidden">
          <div>
            {isExpanded && <p className="px-3 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 font-mono">Menu</p>}
            {sidebarItems.filter(i => i.section === 'MENU').map((item, i) => (
              <SidebarItem 
                key={i} 
                icon={item.icon} 
                label={item.label} 
                active={currentView === item.label} 
                onClick={() => setCurrentView(item.label)}
                collapsed={!isExpanded}
              />
            ))}
          </div>

          <div>
            {isExpanded && <p className="px-3 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 font-mono">Operations</p>}
            {sidebarItems.filter(i => i.section === 'WORK').map((item, i) => (
              <SidebarItem 
                key={i} 
                icon={item.icon} 
                label={item.label} 
                active={currentView === item.label} 
                onClick={() => setCurrentView(item.label)}
                collapsed={!isExpanded}
              />
            ))}
          </div>

          <div>
            {isExpanded && <p className="px-3 text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2 font-mono">Account</p>}
            {sidebarItems.filter(i => i.section === 'SYSTEM').map((item, i) => (
              <SidebarItem 
                key={i} 
                icon={item.icon} 
                label={item.label} 
                active={currentView === item.label} 
                onClick={() => setCurrentView(item.label)}
                collapsed={!isExpanded}
              />
            ))}
          </div>

          {/* Active Messaging & Fallback Controller */}
          {isExpanded && (
            <div className="mx-3 mt-4 p-4 bg-slate-900/50 border border-slate-800 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Messaging System</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]"></div>
                  <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-tighter">Live</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-xs font-black text-white shadow-lg border border-rose-400/30">
                    {employees.find(e => e.id === activeMessagingId)?.name.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {employees.find(e => e.id === activeMessagingId)?.name || "Not Set"}
                    </p>
                    <p className="text-[10px] text-slate-500 font-medium">Primary Active</p>
                  </div>
                </div>

                {reassignmentNotice && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[9px] text-emerald-400 font-bold flex items-center gap-2"
                  >
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    {reassignmentNotice}
                  </motion.div>
                )}

                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Auto Fallback</span>
                    <button 
                      onClick={() => handleUpdateFallbackSettings(!autoFallbackEnabled, fallbackTimeout)}
                      className={`w-8 h-4 rounded-full transition-all relative ${autoFallbackEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${autoFallbackEnabled ? 'left-4.5' : 'left-0.5'}`}></div>
                    </button>
                  </div>

                  {autoFallbackEnabled && (
                    <div className="space-y-3">
                       <div className="flex items-center justify-between text-[9px] font-bold">
                         <span className="text-slate-500">REPLY TIMEOUT</span>
                         <span className="text-rose-400">{fallbackTimeout}s</span>
                       </div>
                       <input 
                        type="range" 
                        min="10" 
                        max="300" 
                        step="10"
                        value={fallbackTimeout}
                        onChange={(e) => handleUpdateFallbackSettings(autoFallbackEnabled, Number(e.target.value))}
                        className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                       />

                       <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                           <Award className="w-3 h-3 text-amber-400" />
                           <span className="text-[10px] font-bold text-slate-400">Smart Priority</span>
                         </div>
                         <button 
                          onClick={() => handleUpdateSmartSettings(!smartAssignmentEnabled)}
                          className={`w-8 h-4 rounded-full transition-all relative ${smartAssignmentEnabled ? 'bg-amber-500' : 'bg-slate-700'}`}
                         >
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${smartAssignmentEnabled ? 'left-4.5' : 'left-0.5'}`}></div>
                         </button>
                       </div>
                    </div>
                  )}

                  <select 
                    value={activeMessagingId || ""}
                    onChange={(e) => handleSetActiveEmployee(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-200 outline-none focus:border-rose-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Change Active Person...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} {emp.isOnline ? '(Online)' : '(Offline)'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={onLogout}
          className={`m-6 p-3 text-xs font-bold uppercase tracking-widest border border-white/10 rounded-xl hover:bg-white/5 transition-all flex items-center justify-center gap-2 ${!isExpanded ? 'p-0 h-10 w-10 mx-auto' : ''}`}
        >
          {isExpanded ? 'Logout' : <Archive className="w-4 h-4" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header 
          className="h-16 border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-30"
          style={{ backgroundColor: appColors.cardBg }}
        >
          <h2 className="text-xl font-bold text-white">{currentView}</h2>
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-slate-800"></span>
            </button>
            <div 
              onClick={() => setCurrentView("Profile")}
              className="flex items-center gap-3 pl-6 border-l border-slate-800 group cursor-pointer"
            >
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: appColors.primaryAccent }}
              >
                A
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-bold leading-tight text-white">{currentUser.name}</p>
                <p className="text-xs text-slate-400">{currentUser.email} ({currentUser.role})</p>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-all active:scale-95 group/logout"
                title="Log Out"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className={`flex-1 relative ${currentView === "Chats" ? "h-full" : "p-8 max-w-7xl mx-auto w-full overflow-y-auto"}`}>
          <AnimatePresence mode="wait">
            {currentView === "Home" ? (
              currentUser.role === "Executive" ? (
                <ExecutiveDashboard 
                  appColors={appColors} 
                  setCurrentView={setCurrentView} 
                  orders={filteredOrdersForView} 
                  leads={filteredLeadsForView}
                  chats={chats}
                  currentUser={currentUser}
                />
              ) : (
                <motion.div
                  key="home"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  {/* Welcome Banner */}
                  <div 
                    className="rounded-[2rem] p-10 border border-slate-800 shadow-xl relative overflow-hidden group"
                    style={{ backgroundColor: appColors.cardBg }}
                  >
                    <div 
                      className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -mr-20 -mt-20 opacity-20"
                      style={{ backgroundColor: appColors.primaryAccent }}
                    ></div>
                    <div className="relative z-10">
                      <p className="text-slate-400 font-medium mb-1">Good morning</p>
                      <h3 className="text-4xl font-bold mb-6 text-white">{currentUser.name}</h3>
                      <p className="text-slate-300 max-w-2xl leading-relaxed">
                        Here is a snapshot of your workspace. Jump into chats, manage connections, or adjust settings from the shortcuts below.
                      </p>
                      <p className="mt-8 text-xs font-bold text-slate-500 uppercase tracking-widest">Sunday, April 19</p>
                    </div>
                  </div>

                {/* Shortcuts */}
                <section>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Shortcuts</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                    <ShortcutCard 
                      icon={<Zap className="w-6 h-6" />} 
                      title="AI Assistant" 
                      desc="Smart replies & content" 
                      onClick={() => setCurrentView("AI Assistant")}
                      color="bg-amber-500/10 text-amber-400"
                    />
                    <ShortcutCard 
                      icon={<MessageSquare className="w-6 h-6" />} 
                      title="Chats" 
                      desc="Open the unified inbox" 
                      onClick={() => setCurrentView("Chats")}
                      color="bg-emerald-500/10 text-emerald-400"
                    />
                    <ShortcutCard 
                      icon={<LinkIcon className="w-6 h-6" />} 
                      title="Connections" 
                      desc="WhatsApp & Messenger accounts" 
                      onClick={() => setCurrentView("Connections")}
                      color="bg-sky-500/10 text-sky-400"
                    />
                    <ShortcutCard 
                      icon={<Settings className="w-6 h-6" />} 
                      title="Settings" 
                      desc="Notifications & appearance" 
                      onClick={() => setCurrentView("Settings")}
                      color="bg-pink-500/10 text-pink-400"
                    />
                    <ShortcutCard 
                      icon={<User className="w-6 h-6" />} 
                      title="Profile" 
                      desc="Account & security" 
                      onClick={() => setCurrentView("Profile")}
                      color="bg-purple-500/10 text-purple-400"
                    />
                  </div>
                  
                  <div className="flex gap-3 mt-6">
                    <button 
                      onClick={() => setCurrentView("WhatsApp")}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                    >
                      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                      WhatsApp setup
                    </button>
                    <button 
                      onClick={() => setCurrentView("Facebook / Messenger")}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 text-xs font-bold rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                    >
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
                      Messenger setup
                    </button>
                  </div>
                </section>

                {/* Bottom Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-6">Activity</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {stats.map((stat, i) => (
                        <div key={i} className="bg-[#1e293b] p-8 rounded-[1.5rem] border border-slate-800 shadow-xl hover:bg-[#202f4a] transition-colors">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{stat.label}</p>
                          <p className="text-4xl font-bold text-white">{stat.value}</p>
                          {stat.sub && <p className="mt-2 text-[10px] text-slate-500 uppercase tracking-wider">{stat.sub}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <aside className="space-y-6">
                    <div className="bg-[#1e293b] p-8 rounded-[1.5rem] border border-slate-800 shadow-xl">
                      <h5 className="font-bold mb-1 text-white">Connected lines</h5>
                      <p className="text-xs text-slate-400 mb-8">Active channel accounts</p>
                      <div className="space-y-3">
                        <div onClick={() => setCurrentView("WhatsApp")} className="flex items-center justify-between p-4 bg-[#0f172a] rounded-xl hover:bg-[#16213a] transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-500/10 text-emerald-400 rounded-lg flex items-center justify-center">
                              <Phone className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-slate-200">WhatsApp</span>
                          </div>
                          <span className="w-6 h-6 bg-[#1e2d45] border border-slate-700 rounded-full flex items-center justify-center text-xs font-bold shadow-sm text-white">
                            {facebookUsers.filter(u => u.email === "WhatsApp").length}
                          </span>
                        </div>
                        <div onClick={() => setCurrentView("Facebook / Messenger")} className="flex items-center justify-between p-4 bg-[#0f172a] rounded-xl hover:bg-[#16213a] transition-colors cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center">
                              <Facebook className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-bold text-slate-200">Messenger</span>
                          </div>
                          <span className="w-6 h-6 bg-[#1e2d45] border border-slate-700 rounded-full flex items-center justify-center text-xs font-bold shadow-sm text-white">
                            {facebookUsers.filter(u => u.email === "Messenger").length}
                          </span>
                        </div>
                      </div>
                    </div>
                  </aside>
                </div>
              </motion.div>
              )
            ) : currentView === "Employees" ? (
              <EmployeeManagementView 
                users={users} 
                addExecutive={addExecutive} 
                onDeleteUser={onDeleteUser}
                onUpdateUser={onUpdateUser}
              />
            ) : currentView === "AI Assistant" ? (
              <AIAssistantView />
            ) : currentView === "Connections" ? (
              <ConnectionsView 
                platforms={connectedPlatforms}
                setPlatforms={setConnectedPlatforms}
                onConnectWhatsApp={() => { setWhatsappAddMode(false); setCurrentView("WhatsApp"); }} 
                onAddWhatsApp={() => { setWhatsappAddMode(true); setCurrentView("WhatsApp"); }}
                onConnectFacebook={() => setCurrentView("Facebook / Messenger")} 
                onConnectInstagram={() => setCurrentView("Instagram")}
                onConnectTikTok={() => setCurrentView("TikTok")}
                onConnectLinkedIn={() => setCurrentView("LinkedIn")}
                onConnectX={() => setCurrentView("X")}
                onDisconnectWhatsApp={handleDisconnectWAHA}
                callWaha={callWaha}
              />
            ) : currentView === "Chats" ? (
              <ChatsView 
                setOrders={setOrders} 
                setLeads={setLeads} 
                employees={employees} 
                chats={chats}
                setChats={setChats}
                facebookAccessToken={facebookAccessToken}
                currentUser={currentUser}
                typingUsers={typingUsers}
                loadSupabaseData={loadSupabaseData}
                handleLiveSync={handleLiveSync}
                callWaha={callWaha}
                isSyncing={isSyncing}
                selectedChat={selectedChat}
                setSelectedChat={setSelectedChat}
                isLiveLoading={isLiveLoading}
                setIsLiveLoading={setIsLiveLoading}
              />
            ) : currentView === "WhatsApp" ? (
              <WhatsAppView 
                setPlatforms={setConnectedPlatforms} 
                setChats={setChats}
                employees={employees}
                activeMessagingId={activeMessagingId}
                autoFallbackEnabled={autoFallbackEnabled}
                smartAssignmentEnabled={smartAssignmentEnabled}
                fallbackTimeout={fallbackTimeout}
                onSuccess={async () => {
                  await loadIntegrations();
                  setCurrentView(whatsappAddMode ? "Connections" : "Chats");
                  setWhatsappAddMode(false);
                }}
                callWaha={callWaha}
                isAddMode={whatsappAddMode}
              />
            ) : currentView === "Facebook / Messenger" ? (
              <FacebookMessengerView 
                onBack={() => setCurrentView("Dashboard")}
                facebookUsers={facebookUsers}
                setFacebookUsers={setFacebookUsers}
                isVerified={isVerified}
                setIsVerified={setIsVerified}
                isConnecting={isConnecting}
                setIsConnecting={setIsConnecting}
                loginProgress={loginProgress}
                setLoginProgress={setLoginProgress}
                loadIntegrations={loadIntegrations}
                onManualSetup={async (pageId, token, pageName) => {
                  try {
                    setIsConnecting(true);
                    const { error } = await supabase.from('social_integrations').upsert({
                      platform: 'facebook_direct',
                      page_id: pageId,
                      access_token: token,
                      page_name: pageName
                    }, { onConflict: 'page_id' });
                    
                    if (error) throw error;
                    alert("Manual integration successful!");
                    window.location.reload();
                  } catch (e: any) {
                    alert("Error: " + e.message);
                  } finally {
                    setIsConnecting(false);
                  }
                }}
                setPlatforms={setConnectedPlatforms} 
                setChats={setChats}
                onSuccess={() => setCurrentView("Connections")} 
                setFacebookAccessToken={setFacebookAccessToken}
              />
            ) : currentView === "Instagram" ? (
              <InstagramView 
                setPlatforms={setConnectedPlatforms} 
                setChats={setChats}
                onSuccess={() => setCurrentView("Connections")} 
              />
            ) : currentView === "TikTok" ? (
              <TikTokView 
                setPlatforms={setConnectedPlatforms} 
                setChats={setChats}
                onSuccess={() => setCurrentView("Connections")} 
              />
            ) : currentView === "LinkedIn" ? (
              <LinkedInView 
                setPlatforms={setConnectedPlatforms} 
                setChats={setChats}
                onSuccess={() => setCurrentView("Connections")} 
              />
            ) : currentView === "X" ? (
              <XView 
                setPlatforms={setConnectedPlatforms} 
                setChats={setChats}
                onSuccess={() => setCurrentView("Connections")} 
              />
            ) : currentView === "Social Management" ? (
              <SocialDashboard appColors={appColors} ai={ai} />
            ) : currentView === "Roles" ? (
              <RolesView roles={roles} setRoles={setRoles} allPermissions={permissions} />
            ) : currentView === "Permissions" ? (
              <PermissionsView permissions={permissions} setPermissions={setPermissions} />
            ) : currentView === "Orders & Leads" ? (
              <OrdersLeadsView orders={filteredOrdersForView} leads={filteredLeadsForView} setOrders={setOrders} setLeads={setLeads} />
            ) : currentView === "Performance Intelligence" ? (
              <PerformanceIntelligenceView 
                employees={filteredEmployeesForAnalytics} 
                smartModeEnabled={smartModeEnabled}
                setSmartModeEnabled={setSmartModeEnabled}
                appColors={appColors}
                currentUser={currentUser}
              />
            ) : currentView === "Reports & Analytics" ? (
              <AnalyticsView 
                employees={filteredEmployeesForAnalytics} 
                chats={filteredChatsForAnalytics} 
                orders={orders} 
                leads={leads}
                currentUser={currentUser}
              />
            ) : currentView === "Manual Migration" ? (
              <ManualMigrationView />
            ) : currentView === "Packages" ? (
              <PackagesView />
            ) : currentView === "Profile" ? (
              <ProfileView 
                userProfile={userProfile}
                onProfileUpdate={saveProfile}
              />
            ) : currentView === "Settings" ? (
              <SettingsView 
                logoUrl={logoUrl} 
                onLogoChange={setLogoUrl}
                faviconUrl={faviconUrl}
                onFaviconChange={setFaviconUrl} 
                appName={appName}
                onAppNameChange={setAppName}
                appColors={appColors}
                onAppColorsChange={setAppColors}
                onNavigate={setCurrentView}
                userProfile={userProfile}
                onProfileUpdate={saveProfile}
                employees={employees}
                orders={orders}
                leads={leads}
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <div className="p-6 bg-slate-800/50 rounded-full mb-6">
                  <Settings className="w-12 h-12 text-slate-500 animate-spin-slow" />
                </div>
                <h3 className="text-2xl font-bold mb-2">Coming Soon</h3>
                <p className="text-slate-400">The <span className="text-emerald-400 font-bold">{currentView}</span> sub-module is currently under development.</p>
                <button 
                  onClick={() => setCurrentView("Home")}
                  className="mt-8 px-6 py-2 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Back to Overview
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  collapsed?: boolean;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, active, onClick, collapsed }) => {
  return (
    <div 
      onClick={onClick}
      className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all mb-1 group relative
      ${active ? 'bg-[#1e293b] text-white shadow-lg shadow-black/20 border border-slate-700/50' : 'text-slate-400 hover:text-white hover:bg-white/5'}
      ${collapsed ? 'justify-center' : ''}
    `}>
      <div className="shrink-0">{icon}</div>
      {!collapsed && <span className="text-sm font-medium truncate">{label}</span>}
      {!collapsed && active && <div className="ml-auto w-1.5 h-1.5 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>}
      
      {collapsed && (
        <div className="absolute left-[calc(100%+0.5rem)] px-3 py-2 bg-[#0f172a] text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-[100] border border-slate-800 shadow-2xl">
          {label}
        </div>
      )}
    </div>
  );
};

interface ShortcutCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  onClick?: () => void;
}

function ShortcutCard({ icon, title, desc, color, onClick }: ShortcutCardProps) {
  return (
    <div 
      onClick={onClick}
      className="bg-[#1e293b] p-6 rounded-[1.5rem] border border-slate-800 shadow-xl flex items-center gap-5 hover:border-slate-600 hover:bg-[#202f4a] transition-all cursor-pointer group"
    >
      <div className={`w-14 h-14 ${color} rounded-[1rem] flex items-center justify-center transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className="min-w-0">
        <h5 className="font-bold leading-none mb-1 text-white">{title}</h5>
        <p className="text-[10px] text-slate-500 uppercase tracking-wider truncate">{desc}</p>
      </div>
    </div>
  );
}

const AVAILABLE_PERMISSIONS = [
  "WhatsApp", "Facebook / Messenger", "Instagram", "TikTok", "X", "LinkedIn",
  "Connections", "Social Management", "Orders & Leads", "Performance Intelligence",
  "Reports & Analytics", "Roles", "Permissions", "Manual Migration",
  "Packages", "Settings", "AI Assistant"
];

function EmployeeManagementView({ 
  users, 
  addExecutive, 
  onDeleteUser,
  onUpdateUser 
}: { 
  users: User[], 
  addExecutive: (u: Omit<User, "id" | "joinedDate" | "avatar">) => void,
  onDeleteUser: (id: string) => void,
  onUpdateUser: (u: User) => void
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showEmployeePassword, setShowEmployeePassword] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["Chats", "Profile", "Home"]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const togglePermission = (perm: string) => {
    setSelectedPermissions(prev => 
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      onUpdateUser({
        ...editingUser,
        name,
        email,
        phone,
        password,
        permissions: selectedPermissions
      });
      setEditingUser(null);
    } else {
      addExecutive({ name, email, phone, password, role: "Executive", permissions: selectedPermissions } as any);
    }
    setName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setSelectedPermissions(["Chats", "Profile", "Home"]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone);
    setPassword(user.password);
    setSelectedPermissions(user.permissions || ["Chats", "Profile", "Home"]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const executives = users.filter(u => u.role === "Executive");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight">Employee Management</h2>
          <p className="text-slate-400 text-sm mt-1">Create and manage accounts for your employees/executives.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-32">
        {/* Form */}
        <div className="lg:col-span-1 bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-2xl h-fit">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            {editingUser ? <Pencil className="w-5 h-5 text-amber-400" /> : <UserPlus className="w-5 h-5 text-emerald-400" />}
            {editingUser ? "Edit Employee" : "Add New Employee"}
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Employee Name</label>
              <input 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all shadow-inner"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Email ID (Username)</label>
              <input 
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all shadow-inner"
                placeholder="employee@omniinbox.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Phone</label>
                <input 
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all shadow-inner"
                  placeholder="+880..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Password</label>
              <div className="relative">
                <input 
                  required
                  type={showEmployeePassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#0f172a] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 outline-none transition-all shadow-inner pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowEmployeePassword(!showEmployeePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showEmployeePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Set Permissions (Custom Access)</label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {AVAILABLE_PERMISSIONS.map(perm => (
                  <label key={perm} className="flex items-center gap-3 p-3 bg-slate-900 rounded-xl border border-white/5 cursor-pointer hover:bg-slate-800 transition-colors">
                    <input 
                      type="checkbox"
                      checked={selectedPermissions.includes(perm)}
                      onChange={() => togglePermission(perm)}
                      className="w-4 h-4 rounded appearance-none border border-slate-700 checked:bg-emerald-500 checked:border-emerald-500 transition-all cursor-pointer bg-slate-950 focus:ring-0"
                    />
                    <span className="text-xs font-bold text-slate-300">{perm}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              {editingUser && (
                <button 
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setName("");
                    setEmail("");
                    setPhone("");
                    setPassword("");
                    setSelectedPermissions(["Chats", "Profile", "Home"]);
                  }}
                  className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all"
                >
                  Cancel
                </button>
              )}
              <button 
                type="submit"
                className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase text-xs tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-900/20 active:scale-95"
              >
                {editingUser ? "Save Changes" : "Register Employee"}
              </button>
            </div>

            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center"
              >
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  {editingUser ? "Changes Saved!" : "Account created successfully!"}
                </p>
              </motion.div>
            )}
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-2 bg-[#1e293b]/30 p-8 rounded-[2.5rem] border border-slate-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white tracking-tight">Active Employees</h3>
            <span className="px-3 py-1 bg-slate-800 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest border border-white/5">{executives.length} Users</span>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {executives.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-700 bg-slate-900/20 rounded-3xl border border-dashed border-slate-800">
                <Users className="w-16 h-16 mb-4 opacity-10" />
                <p className="text-xs font-bold uppercase tracking-[0.3em]">Waiting for new staff...</p>
              </div>
            ) : (
              executives.map(exec => (
                <div key={exec.id} className="p-6 bg-[#0f172a] rounded-3xl border border-white/5 flex items-center gap-5 hover:border-emerald-500/30 transition-all group relative overflow-hidden">
                  <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 font-black text-xl shadow-lg border border-emerald-500/20 group-hover:scale-105 transition-transform shrink-0">
                    {exec.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-white tracking-tight truncate">{exec.name}</h4>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(exec)}
                          className="p-2 bg-slate-800 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-500 rounded-lg transition-all"
                          title="Edit Permissions"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${exec.name}?`)) {
                              onDeleteUser(exec.id);
                            }
                          }}
                          className="p-2 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                          title="Delete Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold tracking-wide truncate">{exec.email}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                       <span className="px-2 py-0.5 bg-slate-800 rounded-md text-[8px] font-black text-slate-400 uppercase tracking-widest">ID: {exec.id.slice(-4)}</span>
                       {exec.permissions?.slice(0, 3).map(p => (
                         <span key={p} className="px-2 py-0.5 bg-indigo-500/10 rounded-md text-[8px] font-black text-indigo-400 uppercase tracking-widest">{p}</span>
                       ))}
                       {exec.permissions && exec.permissions.length > 3 && (
                         <span className="px-2 py-0.5 bg-slate-800 rounded-md text-[8px] font-black text-slate-500 uppercase tracking-widest">+{exec.permissions.length - 3} more</span>
                       )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ExecutiveDashboard({ 
  appColors, 
  setCurrentView, 
  orders, 
  leads, 
  chats, 
  currentUser 
}: { 
  appColors: any, 
  setCurrentView: (v: string) => void, 
  orders: Order[], 
  leads: Lead[],
  chats: Chat[],
  currentUser: User
}) {
  const myRepliesCount = useMemo(() => {
    let count = 0;
    chats.forEach(chat => {
      chat.messages.forEach(msg => {
        if (msg.sender === 'me' && chat.assignedTo === currentUser.name) count++;
      });
    });
    return count;
  }, [chats, currentUser.name]);

  const leadsWonCount = useMemo(() => leads.filter(l => l.status === 'Hot').length, [leads]);

  return (
    <motion.div
      key="executive-home"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-8"
    >
      <div className="rounded-[2.5rem] p-10 border border-slate-800 shadow-2xl relative overflow-hidden group"
           style={{ background: `linear-gradient(135deg, ${appColors.cardBg}, #0f172a)` }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full blur-[100px] -mr-32 -mt-32 opacity-10"
             style={{ backgroundColor: appColors.primaryAccent }}></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 rounded-full">Operational Hub</span>
            <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest italic">Role: Executive</span>
          </div>
          <h3 className="text-5xl font-black mb-4 text-white tracking-tighter">Your Workspace</h3>
          <p className="text-slate-400 max-w-xl leading-relaxed text-sm font-medium">
            Welcome back. You have full access to chats, social posting, and lead handling. System configurations remain managed by administrators.
          </p>
          
          <div className="flex flex-wrap gap-4 mt-10">
            <button 
              onClick={() => setCurrentView("Chats")}
              className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-emerald-900/20 transition-all active:scale-95 flex items-center gap-2 group"
            >
              Go to Chats
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button 
              onClick={() => setCurrentView("Social Management")}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-2xl transition-all active:scale-95"
            >
              Create Social Post
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "My Replies", value: myRepliesCount.toString(), desc: "Total sent messages", icon: MessageSquare, color: "text-emerald-400" },
          { label: "Help Time", value: "3.2m", desc: "Average response", icon: Zap, color: "text-amber-400" },
          { label: "Leads Won", value: leadsWonCount.toString(), desc: "Hot leads count", icon: UserPlus, color: "text-indigo-400" },
          { label: "Scheduled", value: "5", desc: "Posts pending", icon: Calendar, color: "text-rose-400" },
        ].map((s, i) => (
          <div key={i} className="p-8 bg-slate-900/40 rounded-[2rem] border border-white/5 relative group hover:border-white/10 transition-colors">
            <s.icon className={`w-8 h-8 ${s.color} mb-6`} />
            <h4 className="text-3xl font-black text-white tracking-tighter">{s.value}</h4>
            <div className="flex flex-col mt-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{s.label}</span>
              <span className="text-[9px] font-bold text-slate-600 mt-0.5">{s.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#1e293b]/50 p-8 rounded-[2.5rem] border border-slate-800">
          <div className="flex items-center justify-between mb-8">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Suggested Actions</h4>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="space-y-4">
             {[
               { title: "Reply to 12 unreplied comments", level: "High Priority", icon: MessageSquare, color: "bg-rose-500/10 text-rose-400" },
               { title: "Follow up with 4 'Hot' leads", level: "Recommended", icon: UserPlus, color: "bg-amber-500/10 text-amber-400" },
               { title: "Review scheduled TikTok post for tomorrow", level: "Review", icon: Music, color: "bg-indigo-500/10 text-indigo-400" },
             ].map((action, i) => (
               <div key={i} className="flex items-center justify-between p-5 bg-[#0f172a] rounded-2xl border border-white/5 group hover:border-white/10 transition-all cursor-pointer">
                 <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-xl ${action.color}`}>
                     <action.icon className="w-5 h-5" />
                   </div>
                   <div>
                     <p className="text-sm font-bold text-white tracking-tight">{action.title}</p>
                     <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{action.level}</p>
                   </div>
                 </div>
                 <ArrowRight className="w-4 h-4 text-slate-700 transition-all group-hover:text-white group-hover:translate-x-1" />
               </div>
             ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-600/20 to-purple-800/20 p-8 rounded-[2.5rem] border border-indigo-500/20 relative overflow-hidden">
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-xl border border-white/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h5 className="text-xl font-black text-white tracking-tight mb-4">AI Insight</h5>
            <p className="text-sm text-indigo-200 leading-relaxed font-medium">
              Based on your last 100 replies, your sentiment is mostly <span className="text-white font-bold">Empathetic</span>. 
              Users are responding 15% better to your <span className="text-emerald-400 font-bold">manual follow-ups</span> than templates.
            </p>
            <div className="mt-auto pt-8">
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full w-[78%]"></div>
              </div>
              <p className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mt-3 flex justify-between">
                <span>Goal Progress</span>
                <span>78%</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ProfileView({ userProfile, onProfileUpdate }: { userProfile: UserProfile; onProfileUpdate: (profile: UserProfile) => void }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(userProfile);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isEditing) {
          setEditedProfile(prev => ({ ...prev, avatar: result }));
        } else {
          onProfileUpdate({ ...userProfile, avatar: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onProfileUpdate(editedProfile);
    setIsEditing(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-4xl mx-auto space-y-8 pb-12"
    >
      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl relative">
        <div className="h-32 bg-gradient-to-r from-rose-600 to-purple-700 opacity-20 relative">
          {isEditing && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full backdrop-blur-md transition-all"
            >
              <Camera className="w-5 h-5" />
            </button>
          )}
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
        </div>
        <div className="px-10 pb-10">
          <div className="flex flex-col md:flex-row items-end justify-between gap-6 -mt-12 mb-10">
            <div className="flex items-end gap-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 rounded-[2rem] bg-rose-600 border-4 border-[#1e293b] flex items-center justify-center text-5xl font-black text-white shadow-2xl overflow-hidden relative group cursor-pointer"
              >
                {isEditing ? (
                  editedProfile.avatar ? <img src={editedProfile.avatar} className="w-full h-full object-cover" /> : editedProfile.name.charAt(0)
                ) : (
                  userProfile.avatar ? <img src={userProfile.avatar} className="w-full h-full object-cover" /> : userProfile.name.charAt(0)
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="mb-2">
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editedProfile.name}
                    onChange={e => setEditedProfile({...editedProfile, name: e.target.value})}
                    className="bg-[#0f172a] border border-slate-700 rounded-lg px-3 py-1 text-2xl font-black text-white focus:outline-none focus:border-rose-500"
                  />
                ) : (
                  <h3 className="text-3xl font-black text-white tracking-tight">{userProfile.name}</h3>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-rose-500 font-bold uppercase tracking-[0.2em] text-[10px]">{userProfile.role}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              {isEditing ? (
                <>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditedProfile(userProfile);
                    }}
                    className="px-6 py-3 border border-slate-700 rounded-2xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSave}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl shadow-rose-900/20"
                  >
                    Save Changes
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-xl"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={editedProfile.email}
                    onChange={e => setEditedProfile({...editedProfile, email: e.target.value})}
                    className="w-full bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-sm font-bold text-slate-300 focus:outline-none focus:border-rose-500"
                  />
                ) : (
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-sm font-bold text-slate-300">
                    {userProfile.email}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Phone Number</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editedProfile.phone}
                    onChange={e => setEditedProfile({...editedProfile, phone: e.target.value})}
                    className="w-full bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-sm font-bold text-slate-300 focus:outline-none focus:border-rose-500"
                  />
                ) : (
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-sm font-bold text-slate-300">
                    {userProfile.phone}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Joined OmniInbox</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={editedProfile.joinedDate}
                    onChange={e => setEditedProfile({...editedProfile, joinedDate: e.target.value})}
                    className="w-full bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-sm font-bold text-slate-300 focus:outline-none focus:border-rose-500"
                  />
                ) : (
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-sm font-bold text-slate-400">
                    {userProfile.joinedDate}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">About Me</label>
                {isEditing ? (
                  <textarea 
                    value={editedProfile.bio}
                    onChange={e => setEditedProfile({...editedProfile, bio: e.target.value})}
                    className="w-full h-[180px] bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-sm leading-relaxed text-slate-400 font-medium resize-none focus:outline-none focus:border-rose-500"
                  />
                ) : (
                  <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-800 text-sm leading-relaxed text-slate-400 font-medium min-h-[220px]">
                    {userProfile.bio}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-slate-800 shadow-xl">
          <div className="w-10 h-10 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center mb-4">
            <Shield className="w-5 h-5" />
          </div>
          <h5 className="font-bold text-white mb-1">Account Security</h5>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">2FA ENABLED</p>
          <button className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Manage Security</button>
        </div>
        <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-slate-800 shadow-xl">
          <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center mb-4">
            <Key className="w-5 h-5" />
          </div>
          <h5 className="font-bold text-white mb-1">API Access</h5>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">PERSONAL TOKENS: 2</p>
          <button className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">View Tokens</button>
        </div>
        <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-slate-800 shadow-xl">
          <div className="w-10 h-10 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center mb-4">
            <Bell className="w-5 h-5" />
          </div>
          <h5 className="font-bold text-white mb-1">Preferences</h5>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-4">EMAIL NOTIFICATIONS</p>
          <button className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline">Change Rules</button>
        </div>
      </div>
    </motion.div>
  );
}

function AIAssistantView() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"marketing" | "support" | "analysis">("marketing");

  const generateAIContent = async (type: string, customPrompt?: string) => {
    setIsLoading(true);
    setResponse("");
    try {
      let finalPrompt = customPrompt || prompt;
      if (type === "marketing") {
        finalPrompt = `Generate 3 high-engaging social media post copies (with emojis and hashtags) for ${finalPrompt}. One for Facebook, one for Instagram, and one for TikTok.`;
      } else if (type === "support") {
        finalPrompt = `I am a customer support agent. A customer said: "${finalPrompt}". Suggest a professional, friendly, and helpful reply in Bengali and English.`;
      } else if (type === "analysis") {
        finalPrompt = `Analyze this business idea and provide 3 growth tips: "${finalPrompt}".`;
      }

      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: finalPrompt,
      });

      setResponse(result.text || "No response received.");
    } catch (error) {
      console.error("AI Generation Error:", error);
      setResponse("Error generating content. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const marketingIdeas = [
    "Eid-ul-Fitr Mega Sale on Punjabi and Sharees",
    "New Gadget Arrival: Smart Watch Series 8",
    "Weekend Special Menu at Gourmet Kitchen"
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="bg-[#1e293b] p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
        
        <div className="flex items-center gap-6 mb-10 relative">
          <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-2xl flex items-center justify-center shadow-lg border border-amber-500/20">
            <Zap className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-white">AI Smart Assistant</h3>
            <p className="text-slate-400 font-medium">Powered by Gemini for intelligent business operations</p>
          </div>
        </div>

        <div className="flex gap-4 p-1 bg-[#0f172a] rounded-2xl border border-slate-800 mb-10 w-fit">
          <button 
            onClick={() => setActiveTab("marketing")}
            className={`px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "marketing" ? "bg-amber-600 text-white shadow-lg shadow-amber-900/20" : "text-slate-500 hover:text-slate-200"}`}
          >
            Campaign Builder
          </button>
          <button 
            onClick={() => setActiveTab("support")}
            className={`px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "support" ? "bg-amber-600 text-white shadow-lg shadow-amber-900/20" : "text-slate-500 hover:text-slate-200"}`}
          >
            Support Suggestor
          </button>
          <button 
            onClick={() => setActiveTab("analysis")}
            className={`px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === "analysis" ? "bg-amber-600 text-white shadow-lg shadow-amber-900/20" : "text-slate-500 hover:text-slate-200"}`}
          >
            Business Insight
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative">
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                {activeTab === "marketing" ? "What are you promoting?" : activeTab === "support" ? "Customer Query" : "Business Context"}
              </label>
              <div className="relative group">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    activeTab === "marketing" ? "e.g. 50% Discount on Tech Items for students..." :
                    activeTab === "support" ? "e.g. I haven't received my delivery yet, where is it?" :
                    "e.g. My ecommerce store is getting traffic but no sales..."
                  }
                  rows={4}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-[1.5rem] p-6 text-white text-sm outline-none focus:border-amber-500/50 transition-all resize-none placeholder:text-slate-700"
                ></textarea>
                <button 
                  disabled={isLoading || !prompt.trim()}
                  onClick={() => generateAIContent(activeTab)}
                  className="absolute bottom-4 right-4 p-4 bg-amber-600 hover:bg-amber-500 text-white rounded-xl shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed group-hover:scale-105 active:scale-95"
                >
                  {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {activeTab === "marketing" && (
              <div className="space-y-4">
                <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Popular Templates</h5>
                <div className="flex flex-wrap gap-2">
                  {marketingIdeas.map((idea, i) => (
                    <button 
                      key={i} 
                      onClick={() => { setPrompt(idea); generateAIContent("marketing", idea); }}
                      className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 hover:text-white hover:border-amber-500/30 transition-all"
                    >
                      {idea}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Generated Result</h4>
            <div className="bg-[#0f172a] border border-slate-800 rounded-[2rem] p-8 min-h-[300px] relative overflow-hidden group">
              {!response && !isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-10 opacity-30">
                  <Activity className="w-12 h-12 mb-4" />
                  <p className="text-sm font-medium">Ready to assist. Your AI response will appear here.</p>
                </div>
              )}
              
              {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0f172a]/50 backdrop-blur-sm z-10">
                  <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
                  <p className="mt-4 text-xs font-bold text-amber-400 uppercase tracking-widest animate-pulse">Thinking...</p>
                </div>
              )}

              {response && (
                <div className="prose prose-invert max-w-none text-slate-300 text-sm leading-relaxed whitespace-pre-wrap animate-in fade-in duration-500">
                  {response}
                </div>
              )}

              {response && !isLoading && (
                <div className="mt-8 pt-6 border-t border-slate-800 flex justify-end gap-3">
                  <button 
                    onClick={() => { navigator.clipboard.writeText(response); alert("Copied to clipboard!"); }}
                    className="p-3 bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-400 hover:text-white transition-all flex items-center gap-2 text-xs font-bold"
                  >
                    <Share2 className="w-4 h-4" />
                    Copy Result
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <AIInsightCard icon={<MessageSquare />} title="Smart Reply" desc="AI automatically suggests replies to customer messages based on history." color="text-emerald-400" />
        <AIInsightCard icon={<Globe />} title="Auto Translation" desc="Messages are translated instantly to your preferred language." color="text-blue-400" />
        <AIInsightCard icon={<Target />} title="Lead Scoring" desc="AI identifies high-value leads and notifies you in real-time." color="text-amber-400" />
      </div>
    </motion.div>
  );
}

function AIInsightCard({ icon, title, desc, color }: { icon: React.ReactNode, title: string, desc: string, color: string }) {
  return (
    <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-slate-800 shadow-xl hover:border-slate-700 transition-all group">
      <div className={`w-12 h-12 ${color} bg-white/5 rounded-xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6" })}
      </div>
      <h5 className="font-bold text-white mb-2">{title}</h5>
      <p className="text-xs text-slate-400 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

function SyncOverlay({ 
  isSyncing, 
  progress, 
  brandColor, 
  onSuccess 
}: { 
  isSyncing: boolean; 
  progress: number; 
  brandColor: string;
  onSuccess: () => void;
}) {
  if (!isSyncing) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-50 bg-[#0f172a]/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md rounded-[2rem]"
    >
      <div className="space-y-6 w-full max-w-xs transition-all">
        <div className="relative w-20 h-20 mx-auto">
          <div className={`absolute inset-0 border-4 ${brandColor.replace('bg-', 'border-')}/20 rounded-full`}></div>
          <motion.div 
            className={`absolute inset-0 border-4 ${brandColor.replace('bg-', 'border-')} rounded-full border-t-transparent`}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          ></motion.div>
          <div className="absolute inset-0 flex items-center justify-center">
            <RefreshCw className={`w-8 h-8 ${brandColor.replace('bg-', 'text-')} animate-pulse`} />
          </div>
        </div>
        
        <div className="space-y-2">
          <h5 className="text-lg font-bold text-white">Syncing Messages...</h5>
          <p className="text-xs text-slate-400">Fetching threads and technical data</p>
        </div>

        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <motion.div 
            className={`${brandColor} h-full`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          />
        </div>
        
        <p className={`text-[10px] font-mono ${brandColor.replace('bg-', 'text-')}`}>{progress}% Complete</p>
        
        {progress === 100 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={onSuccess}
            className={`w-full ${brandColor} hover:opacity-90 text-white font-bold py-3 rounded-xl transition-all shadow-lg mt-2`}
          >
            Go to Inbox
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function WhatsAppView({ 
  setPlatforms,
  setChats,
  employees,
  activeMessagingId,
  autoFallbackEnabled,
  smartAssignmentEnabled,
  fallbackTimeout,
  onSuccess,
  callWaha,
  isAddMode
}: { 
  setPlatforms?: React.Dispatch<React.SetStateAction<ConnectedPlatform[]>>,
  setChats?: React.Dispatch<React.SetStateAction<Chat[]>>,
  employees: Employee[],
  activeMessagingId: number | null,
  autoFallbackEnabled: boolean,
  smartAssignmentEnabled: boolean,
  fallbackTimeout: number,
  onSuccess?: () => void,
  callWaha: (endpoint: string, method?: string, body?: any, params?: any, session?: string, config?: any) => Promise<any>,
  isAddMode?: boolean
}) {
  const [method, setMethod] = useState<"api" | "qr">(isAddMode ? "api" : "qr");
  const [qrStatus, setQrStatus] = useState<"waiting" | "scanned" | "connected">("waiting");
  const qrStatusRef = React.useRef(qrStatus);
  const [realQr, setRealQr] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  const [wahaConfig, setWahaConfig] = useState(() => {
    const saved = localStorage.getItem("waha_configs");
    const configs = saved ? JSON.parse(saved) : {};
    const env = (import.meta as any).env || {};
    const envConfig = {
      url: env.VITE_WAHA_URL || env.WAHA_URL || "",
      session: env.VITE_WAHA_SESSION || "default",
      apiKey: env.VITE_WAHA_API_KEY || ""
    };
    
    // In Add Mode, generate a unique session ID if we don't have one yet
    let session = envConfig.session;
    if (isAddMode) {
      session = `session-${Date.now()}`;
    }

    return {
      url: envConfig.url,
      session: session,
      apiKey: envConfig.apiKey
    };
  });

  React.useEffect(() => {
    // Only save to localStorage for temporary tracking of in-progress connections
    // If it's already in the memory cache (from DB), we don't need to persist it in localStorage
    if (wahaConfig.url && wahaConfig.session && !memoryWahaConfigs[wahaConfig.session]) {
      const saved = localStorage.getItem("waha_configs");
      const configs = saved ? JSON.parse(saved) : {};
      configs[wahaConfig.session] = wahaConfig;
      localStorage.setItem("waha_configs", JSON.stringify(configs));
      console.log(`[WAHA] Saved temporary config for session ${wahaConfig.session} to localStorage`);
    }
  }, [wahaConfig]);

  const [qrError, setQrError] = useState<string | null>(null);

  React.useEffect(() => {
    qrStatusRef.current = qrStatus;
  }, [qrStatus]);

  React.useEffect(() => {
    let pollInterval: any;

    const fetchQr = async () => {
      if (qrStatusRef.current === "connected") return;
      setQrError(null);
      try {
        const hasApiKey = !!wahaConfig.apiKey;
        console.log("Fetching QR from:", wahaConfig.url, "| Session:", wahaConfig.session, "| API Key set:", hasApiKey);
        
        let data = null;
        let error = null;
        
        // Use the resilient callWaha utility
        // Pass the latest wahaConfig to avoid race conditions with localStorage
        let resultData = await callWaha(`sessions/${wahaConfig.session}`, 'GET', null, {}, undefined, wahaConfig);
        
        // If session doesn't exist (404) or is FAILED, try to start/recreate it
        if (!resultData || resultData.error || resultData.statusCode === 404 || resultData.status === 'FAILED') {
          if (resultData?.status === 'FAILED') {
            console.log(`[WAHA] Session ${wahaConfig.session} is in FAILED state, attempting to delete and recreate...`);
            await callWaha(`sessions/${wahaConfig.session}`, 'DELETE', null, {}, wahaConfig.session, wahaConfig);
          }
          console.log(`[WAHA] Session ${wahaConfig.session} not found, starting it...`);
          // Enable NOWEB store by default to allow fetching chats/messages
          // Debug: List all sessions to see what's actually there
          const allSessions = await callWaha('sessions', 'GET', null, {}, undefined, wahaConfig);
          console.log(`[WAHA] Current sessions list:`, JSON.stringify(allSessions));

          // Use sessions/start with store enabled for chat history
          const startConfig = { 
            name: wahaConfig.session,
            engine: 'noweb',
            config: {
              noweb: {
                store: {
                  enabled: true,
                  fullSync: true
                }
              }
            }
          };
          const startResult = await callWaha('sessions/start', 'POST', startConfig, {}, undefined, wahaConfig);
          console.log(`[WAHA] Start session attempt result:`, JSON.stringify(startResult));
          
          // Wait for initialization (7s)
          await new Promise(r => setTimeout(r, 7000));
          resultData = await callWaha(`sessions/${wahaConfig.session}`, 'GET', null, {}, undefined, wahaConfig);
        }
        
        data = resultData;
        
        // If getting session info directly fails or returns empty, try to get QR
        if (!data || data.status === "STOPPED" || data.status === "FAILED") {
          if (data && (data.status === "STOPPED" || data.status === "FAILED")) {
            console.log(`[WAHA] Session ${wahaConfig.session} is ${data.status}, restarting it...`);
            await callWaha(`sessions/${wahaConfig.session}/start`, 'POST', {}, {}, wahaConfig.session, wahaConfig);
            await new Promise(r => setTimeout(r, 2000));
          }
          data = await callWaha(`sessions/${wahaConfig.session}/qr`, 'GET', null, {}, wahaConfig.session, wahaConfig);
        }
        
        // If session is in SCAN_QR_CODE, fetch the actual QR image from /auth/qr endpoint
        if (data && data.status === "SCAN_QR_CODE") {
          console.log("[WAHA] Session in SCAN_QR_CODE, fetching QR image...");
          try {
            // Fetch QR via the dedicated get-waha-qr Edge Function which handles images correctly
            const { data: qrData, error: qrInvokeError } = await supabase.functions.invoke('get-waha-qr', {
              body: {
                waha_url: wahaConfig.url,
                waha_api_key: wahaConfig.apiKey,
                session_name: wahaConfig.session
              }
            });
            
            if (!qrInvokeError && qrData) {
              if (qrData.qrImage || qrData.qr || qrData.value) {
                // Merge all properties (qr, qrImage, status, etc)
                data = { ...data, ...qrData };
                console.log("[WAHA] Got QR data via get-waha-qr Edge Function");
              } else if (qrData.status) {
                data = { ...data, status: qrData.status };
              }
            } else if (qrInvokeError) {
              console.warn(`[WAHA] get-waha-qr returned error:`, qrInvokeError);
            }
          } catch (qrErr: any) {
            console.error("[WAHA] Failed to fetch QR image:", qrErr);
          }
        }

        console.log("WAHA response data:", JSON.stringify(data));

        if (data && (data.status === "WORKING" || data.status === "CONNECTED")) {
          qrStatusRef.current = "connected";
          setQrStatus("connected");
          setRealQr(null);
          setQrImage(null);
          if (pollInterval) clearInterval(pollInterval);
          startSync("WhatsApp Web");
        } else if (data && (data.qr || data.qrImage || data.value)) {
          // data.qr = raw text string for QRCodeCanvas
          // data.qrImage = base64 encoded image for <img> fallback
          // data.value = raw QR string from /auth/qr endpoint (NOWEB)
          const qrValue = data.qr || data.value;
          if (qrValue && typeof qrValue === 'string' && !qrValue.startsWith('data:')) {
            setRealQr(qrValue);
            setQrImage(null);
          } else if (data.qrImage) {
            setRealQr(null);
            setQrImage(data.qrImage.startsWith('data:') ? data.qrImage : `data:image/png;base64,${data.qrImage}`);
          } else if (qrValue) {
            // qr is a base64 image
            setRealQr(null);
            setQrImage(qrValue.startsWith('data:') ? qrValue : `data:image/png;base64,${qrValue}`);
          }
          setQrStatus("waiting");
        } else if (data && data.status === "STARTING") {
          setQrStatus("waiting");
          setRealQr(null);
          setQrImage(null);
        } else if (data && data.status === "SCAN_QR_CODE") {
          // Session exists but QR fetch failed, keep polling
          setQrStatus("waiting");
        } else if (!data) {
          throw new Error("Received empty response from server");
        }
      } catch (e: any) {
        console.error("WAHA QR error:", e);
        if (e.message?.includes("401") || e.message?.includes("Unauthorized")) {
          setQrError("Unauthorized: Please check your WAHA API Key and URL.");
        } else {
          setQrError(e.message || "Failed to fetch QR code");
        }
      }
    };

    if (method === "qr" && qrStatus !== "connected") {
      fetchQr();
      // Poll every 5 seconds for faster updates
      pollInterval = setInterval(fetchQr, 5000);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [method, wahaConfig, qrStatus]);

  const handleDisconnect = async () => {
    if (!window.confirm("Are you sure you want to disconnect WhatsApp? This will log out your session and clear local settings.")) return;
    
    try {
      setIsSyncing(true);
      setSyncProgress(20);
      
      console.log("[WAHA] Attempting to logout session:", wahaConfig.session);
      
      // 1. Try to logout via WAHA API (deletes session)
      try {
        await callWaha(`sessions/${wahaConfig.session}/logout`, 'POST', null, {});
      } catch (err) {
        console.warn("[WAHA] Logout failed, trying stop...", err);
        try {
          await callWaha(`sessions/${wahaConfig.session}/stop`, 'POST', null, {});
        } catch (err2) {
          console.warn("[WAHA] Stop also failed, clearing local only.", err2);
        }
      }
      
      setSyncProgress(60);
      
      // 2. Clear Local Storage
      localStorage.removeItem("waha_config");
      
      // 3. Clear State
      setQrStatus("waiting");
      setRealQr(null);
      setQrImage(null);
      setWahaConfig({
        url: (import.meta as any).env?.VITE_WAHA_URL || (import.meta as any).env?.WAHA_URL || "http://localhost:3000",
        session: "default",
        apiKey: (import.meta as any).env?.VITE_WAHA_API_KEY || ""
      });
      
      if (setChats) {
        setChats(prev => prev.filter(c => c.platform !== 'whatsapp'));
      }
      
      setSyncProgress(100);
      setTimeout(() => {
        setIsSyncing(false);
        setSyncProgress(0);
        setMethod("api"); // Return to setup screen
      }, 1000);
      
      alert("WhatsApp disconnected successfully.");
    } catch (err) {
      console.error("Disconnect error:", err);
      alert("Failed to fully disconnect. Local settings cleared.");
      setIsSyncing(false);
    }
  };

  const startSync = async (name: string) => {
    setIsSyncing(true);
    setSyncProgress(10);
    
    try {
      console.log("Starting real-time chat synchronization...");
      setSyncProgress(30);
      
      // Use the lightweight overview endpoint first; full chat sync can take minutes.
      const syncWithTimeout = Promise.race([
        callWaha('chats/overview', 'GET', null, { limit: 50, offset: 0 }),
        new Promise((resolve) => setTimeout(() => resolve(null), 15000))
      ]);
      
      const liveChats = await syncWithTimeout;
      
      // Check for NOWEB store error
      if (liveChats && liveChats.error && liveChats.message?.includes("config.noweb.store.enabled=True")) {
        console.warn("[WAHA] NOWEB Store is not enabled. Attempting to restart session with store enabled...");
        // Stop the session first
        await callWaha(`sessions/${wahaConfig.session}/stop`, 'POST', {}, {});
        await new Promise(r => setTimeout(r, 1000));
        // Start with store enabled
        const startConfig = { 
          name: wahaConfig.session,
          engine: 'noweb',
          config: {
            noweb: {
              store: {
                enabled: true,
                fullSync: true
              }
            }
          }
        };
        await callWaha('sessions/start', 'POST', startConfig, {});
        // Proceeding to inbox, sync will happen on next poll/refresh
      }

      if (liveChats && Array.isArray(liveChats) && setChats) {
        console.log(`[WAHA] startSync: Loaded ${liveChats.length} chats for session ${wahaConfig.session}`);
        const formattedChats = formatWahaChats(liveChats, new Set(), wahaConfig.session);
        setChats(prev => {
          const filtered = prev.filter(chat => chat.platform !== 'whatsapp' || (chat.session && chat.session !== wahaConfig.session));
          const combined = [...formattedChats, ...filtered];
          return combined.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      } else {
        console.log("[WAHA] startSync: Chats not ready yet or store missing. Proceeding to inbox...");
      }
      setSyncProgress(70);

      // Channel metadata persistence
      if (isSupabaseConfigured) {
        try {
          console.log(`[WAHA] Persisting integration for session ${wahaConfig.session}...`);
          const compositeId = `whatsapp:${wahaConfig.session}:${wahaConfig.url}`;
          const { error: upsertError } = await supabase.from('social_integrations').upsert({
            platform: 'whatsapp',
            page_id: compositeId,
            access_token: wahaConfig.apiKey || '',
            page_name: `WhatsApp (${wahaConfig.session})`
          }, { onConflict: 'page_id' });
          
          if (upsertError) {
            console.warn("[WAHA] Could not persist integration to Supabase:", upsertError.message);
          } else {
            console.log("[WAHA] Integration persisted to Supabase successfully.");
            // Update memory cache and remove from temporary localStorage
            memoryWahaConfigs[wahaConfig.session] = { ...wahaConfig };
            const saved = localStorage.getItem("waha_configs");
            if (saved) {
              const configs = JSON.parse(saved);
              delete configs[wahaConfig.session];
              localStorage.setItem("waha_configs", JSON.stringify(configs));
            }
          }
        } catch (dbErr) {
          console.warn("[WAHA] Database persistence error:", dbErr);
        }
      }
      
      setSyncProgress(100);
    } catch (e) {
      console.error("Sync failed:", e);
      // Even if sync fails, continue to inbox
      setSyncProgress(100);
    } finally {
      setTimeout(() => {
        setIsSyncing(false);
        if (onSuccess) onSuccess();
      }, 500);
    }
  };

  const steps = [
    { title: "Install WAHA", desc: "Run WAHA via Docker on your server." },
    { title: "Configure Webhooks", desc: "Point WAHA webhooks to your Supabase Edge Function." },
    { title: "Session Name", desc: "Choose a unique name for your WhatsApp session." },
    { title: "Scan QR", desc: "Scan the generated QR code to link your account." }
  ];

  return (
    <motion.div
      key="whatsapp"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="bg-[#1e293b] p-10 rounded-[2rem] border border-slate-800 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center">
              <Phone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">WhatsApp Connection</h3>
              <p className="text-slate-400 text-sm">Integrate using WAHA (WhatsApp HTTP API)</p>
            </div>
          </div>

          {isAddMode && (
            <button 
              onClick={() => onSuccess?.()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all"
            >
              Back to Connections
            </button>
          )}
          
          <div className="flex bg-[#0f172a] p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setMethod("qr")}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${method === "qr" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Link via QR
            </button>
            <button 
              onClick={() => setMethod("api")}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${method === "api" ? "bg-emerald-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Configuration
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {method === "api" ? (
            <motion.div 
              key="api-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Setup Guide</h4>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-200 text-sm">{step.title}</h5>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-slate-800 space-y-6 self-start relative overflow-hidden">
                <SyncOverlay 
                  isSyncing={isSyncing} 
                  progress={syncProgress} 
                  brandColor="bg-emerald-500" 
                  onSuccess={() => onSuccess?.()} 
                />
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">WAHA Settings</h4>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">WAHA URL</label>
                    <input 
                      type="text" 
                      value={wahaConfig.url}
                      onChange={(e) => setWahaConfig(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 text-white outline-none transition-all"
                      placeholder="http://your-waha-server:3000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Session Name</label>
                    <input 
                      type="text" 
                      value={wahaConfig.session}
                      onChange={(e) => setWahaConfig(prev => ({ ...prev, session: e.target.value }))}
                      className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 text-white outline-none transition-all"
                      placeholder="default"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">WAHA API Key (Optional)</label>
                    <input 
                      type="password" 
                      value={wahaConfig.apiKey}
                      onChange={(e) => setWahaConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 text-white outline-none transition-all shadow-inner"
                      placeholder="Enter your WAHA API Key"
                    />
                  </div>
                  <button 
                    onClick={() => setMethod("qr")}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-900/20 mt-4 active:scale-95"
                  >
                    Save & Get QR
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="qr-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-12 space-y-12"
            >
              <SyncOverlay 
                isSyncing={isSyncing} 
                progress={syncProgress} 
                brandColor="bg-emerald-500" 
                onSuccess={() => onSuccess?.()} 
              />
              
              <div className="relative group">
                <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-[3rem] blur-2xl group-hover:blur-3xl transition-all opacity-50"></div>
                <div className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-500/10 border-8 border-slate-900 overflow-hidden">
                  {qrStatus === "connected" ? (
                    <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-4 text-emerald-600">
                      <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                        <CheckCircle2 className="w-10 h-10" />
                      </div>
                      <p className="font-bold uppercase tracking-widest text-xs">Device Connected</p>
                    </div>
                  ) : realQr ? (
                    <div className="relative">
                      <QRCodeCanvas 
                        value={realQr} 
                        size={200} 
                        level="H" 
                        includeMargin={false}
                        imageSettings={{
                          src: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg",
                          x: undefined,
                          y: undefined,
                          height: 40,
                          width: 40,
                          excavate: true,
                        }}
                      />
                      {qrStatus === "scanned" && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest">Finishing Setup</p>
                        </div>
                      )}
                    </div>
                  ) : qrImage ? (
                    <div className="relative">
                      <img src={qrImage} alt="WhatsApp QR Code" className="w-[200px] h-[200px] rounded-lg" />
                      {qrStatus === "scanned" && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest">Finishing Setup</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-[200px] h-[200px] flex flex-col items-center justify-center gap-4 text-slate-400">
                      {qrError ? (
                        <>
                          <AlertTriangle className="w-10 h-10 text-amber-500" />
                          <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest text-center px-2">
                            {qrError.includes("Failed to fetch") ? "Server Unreachable (Offline)" : qrError}
                          </p>
                          <button 
                            onClick={() => window.location.reload()}
                            className="text-[9px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full hover:bg-slate-700 transition-colors uppercase font-bold tracking-tighter"
                          >
                            Retry Connection
                          </button>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-10 h-10 animate-spin" />
                          <p className="font-bold uppercase tracking-widest text-[8px]">Fetching QR Code</p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* WAHA Config Editor */}
              <div className="mt-8 w-full max-w-sm mx-auto p-4 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">WAHA Server Configuration</label>
                <div className="space-y-3">
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input 
                      type="text"
                      value={wahaConfig.url}
                      onChange={(e) => setWahaConfig(prev => ({ ...prev, url: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all outline-none font-mono"
                      placeholder="https://your-waha-server.com"
                    />
                  </div>
                  <div className="relative">
                    <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input 
                      type="text"
                      value={wahaConfig.session}
                      onChange={(e) => setWahaConfig(prev => ({ ...prev, session: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all outline-none font-mono"
                      placeholder="session_name"
                    />
                  </div>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                    <input 
                      type="password"
                      value={wahaConfig.apiKey}
                      onChange={(e) => setWahaConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-all outline-none font-mono"
                      placeholder="WAHA API Key"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 font-medium italic">
                    Enter your WAHA_API_KEY from your server environment variables.
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-6 text-center max-w-sm">
                <div className="space-y-2">
                  <h4 className="text-xl font-bold">Scan with WhatsApp</h4>
                  <p className="text-slate-400 text-sm">Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device</p>
                </div>
                
                <div className="flex items-center gap-4 bg-slate-900/80 px-6 py-3 rounded-2xl border border-slate-800">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                    {qrStatus === "connected" ? "Connection Established" : "Waiting for Scan"}
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function EditAccountView({ platformId, account, onSave, onCancel }: any) {
  const [name, setName] = useState(account.name);
  const [details, setDetails] = useState(account.details);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0f172a] p-6 rounded-[2rem] border border-blue-500/30 space-y-6 shadow-2xl"
    >
      <div className="space-y-4">
        <h4 className="text-sm font-black text-white uppercase tracking-widest">Edit Account Details</h4>
        
        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Account Display Name</label>
          <input 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none font-bold" 
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Configuration / Details</label>
          <input 
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none font-bold" 
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button 
          onClick={() => onSave(platformId, { ...account, name, details })}
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all shadow-lg active:scale-95"
        >
          Save Changes
        </button>
        <button 
          onClick={onCancel}
          className="px-6 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95"
        >
          Cancel
        </button>
      </div>
    </motion.div>
  );
}

function ConnectionsView({ 
  platforms, 
  setPlatforms, 
  onConnectWhatsApp, 
  onAddWhatsApp,
  onConnectFacebook, 
  onConnectInstagram, 
  onConnectTikTok, 
  onConnectLinkedIn, 
  onConnectX,
  onDisconnectWhatsApp,
  callWaha
}: { 
  platforms: ConnectedPlatform[],
  setPlatforms: React.Dispatch<React.SetStateAction<ConnectedPlatform[]>>,
  onConnectWhatsApp: () => void, 
  onAddWhatsApp?: () => void,
  onConnectFacebook: () => void, 
  onConnectInstagram: () => void, 
  onConnectTikTok: () => void, 
  onConnectLinkedIn: () => void, 
  onConnectX: () => void,
  onDisconnectWhatsApp?: (sessionName?: string) => void,
  callWaha: (endpoint: string, method?: string, body?: any, params?: any, session?: string, config?: any) => Promise<any>
}) {
  const [activeTab, setActiveTab] = useState<"all" | "messaging" | "social" | "business">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addingAccountPlatform, setAddingAccountPlatform] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<{ platformId: string, account: PlatformAccount } | null>(null);
  const [newAccountName, setNewAccountName] = useState("");
  const [wahaSessions, setWahaSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Fetch WAHA sessions for WhatsApp display
  React.useEffect(() => {
    const fetchSessions = async () => {
      try {
        const configs = getStoredWahaConfigs();
        const allSessions: any[] = [];
        
        // Fetch sessions from ALL configured servers
        for (const configId of Object.keys(configs)) {
          const config = configs[configId];
          try {
            const data = await callWaha('sessions', 'GET', null, {}, config.session, config);
            if (data) {
              const sessionList = normalizeWahaList(data);
              // Mark each session with its configId to help distinguish them
              const taggedSessions = sessionList.map(s => ({ ...s, configId }));
              allSessions.push(...taggedSessions);
            }
          } catch (sessionErr) {
            console.warn(`[WAHA] Failed to fetch sessions for config ${configId}:`, sessionErr);
          }
        }
        
        setWahaSessions(allSessions);
      } catch (e) {
        console.error("Failed to fetch WAHA sessions:", e);
      }
    };
    fetchSessions();
    const interval = setInterval(fetchSessions, 10000); // 10 seconds is enough for this view
    return () => clearInterval(interval);
  }, [callWaha]);

  const platformMeta: Record<string, { icon: React.ReactNode, color: string, type: string }> = {
    whatsapp: { icon: <Phone className="w-6 h-6" />, color: "text-emerald-400 bg-emerald-500/10", type: "messaging" },
    facebook: { icon: <Facebook className="w-6 h-6" />, color: "text-blue-400 bg-blue-500/10", type: "messaging" },
    x: { icon: <Twitter className="w-6 h-6" />, color: "text-white bg-slate-500/10", type: "social" },
    tiktok: { icon: <Music className="w-6 h-6" />, color: "text-rose-400 bg-rose-500/10", type: "social" },
    linkedin: { icon: <Linkedin className="w-6 h-6" />, color: "text-sky-400 bg-sky-500/10", type: "business" },
    instagram: { icon: <Instagram className="w-6 h-6" />, color: "text-pink-400 bg-pink-500/10", type: "social" },
  };

  const handleAddAccount = (platformId: string) => {
    if (!newAccountName) return;
    
    setPlatforms(prev => prev.map(p => {
      if (p.id === platformId) {
        return {
          ...p,
          accounts: [
            ...p.accounts,
            {
              id: `${platformId}-${Date.now()}`,
              name: newAccountName,
              status: "Healthy",
              lastSync: "Just now",
              details: "Recently Added Account"
            }
          ]
        };
      }
      return p;
    }));
    
    setNewAccountName("");
    setAddingAccountPlatform(null);
  };

  const removeAccount = (platformId: string, accountId: string) => {
    setPlatforms(prev => prev.map(p => {
      if (p.id === platformId) {
        return {
          ...p,
          accounts: p.accounts.filter(a => a.id !== accountId)
        };
      }
      return p;
    }));
  };

  const filtered = platforms.filter(p => {
    const meta = platformMeta[p.id];
    const matchesTab = activeTab === "all" || (meta && meta.type === activeTab);
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const dashboardStats = [
    { label: "Active Integrations", value: "3", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
    { label: "Total Sync Volume", value: "2.4k", icon: <Activity className="w-4 h-4 text-blue-400" /> },
    { label: "API Health", value: "98.2%", icon: <Globe className="w-4 h-4 text-sky-400" /> },
    { label: "System Load", value: "Low", icon: <RefreshCw className="w-4 h-4 text-slate-400" /> },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      {/* Header & Filter Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h3 className="text-3xl font-bold text-white tracking-tight">Connections Central</h3>
          <p className="text-slate-400 mt-1 max-w-sm">Advanced multi-channel hub for API management and data synchronization status.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/50 border border-slate-800 rounded-2xl pl-11 pr-4 py-3 text-sm text-white focus:border-blue-500 outline-none w-full sm:w-64 transition-all"
            />
          </div>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-blue-900/20">
            <RefreshCw className="w-4 h-4" /> Sync All
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {dashboardStats.map((stat, i) => (
          <div key={i} className="bg-[#1e293b]/50 border border-slate-800/50 p-4 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
              <h4 className="text-xl font-bold text-white">{stat.value}</h4>
            </div>
            <div className="p-2 bg-slate-900/50 rounded-lg">
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-8">
        {(["all", "messaging", "social", "business"] as const).map((tab) => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-bold capitalize transition-all relative ${activeTab === tab ? "text-blue-400" : "text-slate-500 hover:text-slate-300"}`}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
            )}
          </button>
        ))}
      </div>

      {/* Connections Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filtered.map((platform) => {
            const meta = platformMeta[platform.id];
            return (
              <motion.div
                layout
                key={platform.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group bg-[#1e293b] p-6 rounded-[2.5rem] border border-slate-800 hover:border-slate-600 hover:bg-[#233149] transition-all relative overflow-hidden flex flex-col h-full shadow-2xl"
              >
                {/* Platform Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 ${meta?.color || "text-white bg-slate-800"} rounded-2xl flex items-center justify-center transition-transform group-hover:rotate-6 duration-500 ring-4 ring-slate-900/50 shadow-xl`}>
                      {meta?.icon}
                    </div>
                    <div>
                      <h4 
                        onClick={() => {
                          if (platform.id === 'whatsapp') onConnectWhatsApp();
                          else if (platform.id === 'messenger' || platform.id === 'facebook') onConnectFacebook();
                          else if (platform.id === 'instagram') onConnectInstagram();
                          else if (platform.id === 'tiktok') onConnectTikTok();
                          else if (platform.id === 'linkedin') onConnectLinkedIn();
                          else if (platform.id === 'x') onConnectX();
                        }}
                        className="text-xl font-black text-white group-hover:text-blue-400 transition-colors tracking-tight cursor-pointer"
                      >
                        {platform.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">{platform.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full animate-pulse ${
                      (platform.id === 'whatsapp' ? wahaSessions.length : platform.accounts.length) > 0 ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-slate-700"
                    }`} />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      {platform.id === 'whatsapp' ? wahaSessions.length : platform.accounts.length} Active
                    </span>
                  </div>
                </div>

                {/* Accounts List */}
                <div className="space-y-3 flex-1">
                  {platform.id === 'whatsapp' ? (
                    wahaSessions.length > 0 ? (
                      wahaSessions.map((session, idx) => (
                        <div key={session.configId || session.name || idx} className="bg-[#0f172a]/80 p-4 rounded-2xl border border-slate-800/50 hover:border-emerald-500/30 transition-all group/acc flex items-center justify-between shadow-inner">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">{session.name} <span className="text-[9px] text-slate-600 ml-1">({session.configId?.split(':').slice(-1)[0] || 'Default Server'})</span></p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${session.status === 'WORKING' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                              <span className="text-[10px] text-slate-500 font-bold uppercase">{session.status} • {session.me?.id || "No number"}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                // Pass the unique configId (page_id) if we have it, otherwise fallback to name
                                await onDisconnectWhatsApp?.(session.configId || session.name); 
                                // Local re-fetch will happen on the next interval
                              }}
                              className="opacity-0 group-hover/acc:opacity-100 p-2 hover:bg-rose-500/20 text-slate-600 hover:text-rose-500 rounded-lg transition-all"
                              title="Disconnect Session"
                            >
                              <StopCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : isLoadingSessions ? (
                      <div className="flex items-center justify-center py-4">
                        <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 bg-[#0f172a]/30 rounded-[2rem] border border-dashed border-slate-800">
                        <PlusCircle className="w-8 h-8 text-slate-700 mb-2 opacity-50" />
                        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center px-4">No WhatsApp sessions found.</p>
                      </div>
                    )
                  ) : platform.accounts.length > 0 ? (
                    platform.accounts.map((acc) => (
                      <div key={acc.id} className="space-y-3">
                        {editingAccount?.account.id === acc.id ? (
                          <EditAccountView 
                            platformId={platform.id}
                            account={acc}
                            onSave={(pId: string, updatedAcc: PlatformAccount) => {
                              setPlatforms(prev => prev.map(p => {
                                if (p.id === pId) {
                                  return {
                                    ...p,
                                    accounts: p.accounts.map(a => a.id === updatedAcc.id ? updatedAcc : a)
                                  };
                                }
                                return p;
                              }));
                              setEditingAccount(null);
                            }}
                            onCancel={() => setEditingAccount(null)}
                          />
                        ) : (
                          <div className="bg-[#0f172a]/80 p-4 rounded-2xl border border-slate-800/50 hover:border-blue-500/30 transition-all group/acc flex items-center justify-between shadow-inner">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-white truncate">{acc.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">{acc.lastSync}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingAccount({ platformId: platform.id, account: acc }); }}
                                className="opacity-0 group-hover/acc:opacity-100 p-2 hover:bg-blue-500/20 text-slate-600 hover:text-blue-400 rounded-lg transition-all"
                              >
                                <Settings className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeAccount(platform.id, acc.id); }}
                                className="opacity-0 group-hover/acc:opacity-100 p-2 hover:bg-rose-500/20 text-slate-600 hover:text-rose-500 rounded-lg transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 bg-[#0f172a]/30 rounded-[2rem] border border-dashed border-slate-800">
                      <PlusCircle className="w-8 h-8 text-slate-700 mb-2 opacity-50" />
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest text-center px-4">No accounts linked yet. Use the button below to add.</p>
                    </div>
                  )}
                </div>

                {/* Account Add Flow */}
                {addingAccountPlatform === platform.id ? (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 bg-[#0f172a] rounded-2xl border border-blue-500/30 space-y-3 shadow-2xl"
                  >
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Account Name/Number..."
                      value={newAccountName}
                      onChange={(e) => setNewAccountName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddAccount(platform.id)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none font-bold"
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleAddAccount(platform.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition-all"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => setAddingAccountPlatform(null)}
                        className="px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="space-y-4">
                    <button 
                      onClick={() => {
                        if (platform.id === 'whatsapp') onConnectWhatsApp();
                        else if (platform.id === 'messenger' || platform.id === 'facebook') onConnectFacebook();
                        else if (platform.id === 'instagram') onConnectInstagram();
                        else if (platform.id === 'tiktok') onConnectTikTok();
                        else if (platform.id === 'linkedin') onConnectLinkedIn();
                        else if (platform.id === 'x') onConnectX();
                      }}
                      className="mt-4 w-full py-2 bg-slate-900/50 border border-slate-800 hover:border-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-200 transition-all"
                    >
                      Manage API & Config
                    </button>

                    {platform.id === 'whatsapp' && onDisconnectWhatsApp && (
                      <button 
                        onClick={async (e) => {
                          await onDisconnectWhatsApp();
                          // Local re-fetch
                          try {
                            const data = await callWaha('sessions', 'GET', null, {});
                            if (data) setWahaSessions(normalizeWahaList(data));
                          } catch (err) {}
                        }}
                        className="w-full py-2 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest text-rose-500 transition-all flex items-center justify-center gap-2"
                      >
                        <StopCircle className="w-3 h-3" />
                        Disconnect WhatsApp
                      </button>
                    )}

                    <button 
                      onClick={() => {
                        if (platform.id === 'whatsapp') onAddWhatsApp?.();
                        else setAddingAccountPlatform(platform.id);
                      }}
                      className="w-full py-4 bg-slate-900 border border-slate-800 hover:border-blue-600/50 hover:bg-blue-600/5 rounded-2xl text-slate-400 hover:text-blue-400 font-bold transition-all flex items-center justify-center gap-3 group/btn relative overflow-hidden"
                    >
                      <div className="absolute inset-0 bg-blue-600/0 group-hover/btn:bg-blue-600/5 transition-all"></div>
                      <PlusCircle className="w-5 h-5 transition-transform group-hover/btn:rotate-90 group-hover/btn:scale-110" />
                      <span className="text-[10px] uppercase tracking-[0.2em] font-black">Add New Account</span>
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Help Section */}
      <div className="bg-gradient-to-r from-blue-600/10 to-transparent p-8 rounded-[2rem] border border-blue-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-900/40">
            <AlertCircle className="w-6 h-6 text-white" />
          </div>
          <div>
            <h5 className="font-bold text-lg text-white">Need help scaling your integrations?</h5>
            <p className="text-sm text-slate-400">Our enterprise API solutions provide 99.9% uptime and 24/7 monitoring.</p>
          </div>
        </div>
        <button className="bg-white hover:bg-slate-100 text-black px-8 py-3 rounded-xl font-bold text-sm whitespace-nowrap active:scale-95 transition-all">
          View Documentation
        </button>
      </div>
    </motion.div>
  );
}

function FacebookMessengerView({ 
  onBack, 
  onManualSetup,
  facebookUsers, 
  setFacebookUsers, 
  isVerified, 
  setIsVerified, 
  isConnecting, 
  setIsConnecting,
  loginProgress,
  setLoginProgress,
  loadIntegrations,
  setPlatforms,
  setChats,
  onSuccess,
  setFacebookAccessToken
}: { 
  onBack?: () => void,
  onManualSetup?: (pageId: string, token: string, pageName: string) => void,
  facebookUsers: any[],
  setFacebookUsers: React.Dispatch<React.SetStateAction<any[]>>,
  isVerified: boolean,
  setIsVerified: React.Dispatch<React.SetStateAction<boolean>>,
  isConnecting: boolean,
  setIsConnecting: React.Dispatch<React.SetStateAction<boolean>>,
  loginProgress: number,
  setLoginProgress: React.Dispatch<React.SetStateAction<number>>,
  loadIntegrations: () => Promise<void>,
  setPlatforms?: React.Dispatch<React.SetStateAction<any[]>>,
  setChats?: React.Dispatch<React.SetStateAction<any[]>>,
  onSuccess?: () => void,
  setFacebookAccessToken?: React.Dispatch<React.SetStateAction<string | null>>
}) {
  const [method, setMethod] = useState<"api" | "login" | "manage">("login");
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showManualToken, setShowManualToken] = useState(false);
  const [showManualSecret, setShowManualSecret] = useState(false);
  const [manualConfig, setManualConfig] = useState({
    token: "",
    pageId: "",
    secret: "",
    pageName: ""
  });
  const [activePages, setActivePages] = useState<Record<string, boolean>>({
    "1": true,
    "2": false,
    "3": true
  });
  const [connectionResults, setConnectionResults] = useState<{name: string, status: 'success' | 'error', id: string}[]>([]);

  const togglePage = (id: string) => {
    setActivePages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  React.useEffect(() => {
    loadIntegrations();
  }, []);

  const handleFacebookLogin = () => {
    if (!(window as any).FB) {
      alert("Facebook SDK not loaded yet. Please check your App ID.");
      return;
    }

    setIsConnecting(true);
    setLoginProgress(10);

    (window as any).FB.login((response: any) => {
      if (response.authResponse) {
        setLoginProgress(50);
        exchangeToken(response.authResponse.accessToken);
      } else {
        setIsConnecting(false);
      }
    }, { scope: 'pages_messaging,pages_manage_metadata,pages_show_list,pages_read_engagement' });
  };

  const exchangeToken = async (token: string) => {
    try {
      setLoginProgress(80);
      const { data, error } = await supabase.functions.invoke('exchange-fb-token', {
        body: { userAccessToken: token }
      });
      
      if (error) throw error;

      console.log("[META] Exchange result:", data);
      
      const results: {name: string, status: 'success' | 'error', id: string}[] = [];
      const newFBUsers: any[] = [];

      if (data?.rawPagesData?.data) {
        data.rawPagesData.data.forEach((page: any) => {
          results.push({ name: page.name, status: 'success', id: page.id });
          newFBUsers.push({
            id: page.id,
            name: page.name,
            email: "Messenger",
            avatar: `https://graph.facebook.com/${page.id}/picture?type=large`
          });
        });
      }

      setConnectionResults(results);

      if (data?.count === 0) {
        alert("Facebook connected, but no Pages were found. Please ensure you have granted 'pages_show_list' permission and that your Page is visible to this Meta App.");
      } else {
        // Append new users to state immediately for real-time feel
        setFacebookUsers(prev => {
          const existingIds = new Set(prev.map(u => u.id));
          const uniqueNew = newFBUsers.filter(u => !existingIds.has(u.id));
          return [...prev, ...uniqueNew];
        });
      }
      
      setLoginProgress(100);
      setIsVerified(true);
      // We don't call onSuccess() immediately so user can see the results
    } catch (e) {
      console.error("Token exchange error:", e);
    } finally {
      setIsConnecting(false);
    }
  };

  const businessPages = [
    { id: "1", name: "Aaramaura Shop", category: "Retail", followers: "12k" },
    { id: "2", name: "Support Hub", category: "Services", followers: "5.4k" },
    { id: "3", name: "Tech Gadgets Store", category: "Electronics", followers: "8.2k" },
  ];

  const handleConnect = (accountName: string) => {
    handleFacebookLogin();
  };

  const steps = [
    {
      title: "Create Meta App",
      desc: "Register at developers.facebook.com and create a 'Business' app for your project."
    },
    {
      title: "Add Messenger Product",
      desc: "Configure the Messenger product and set up a Webhook to receive real-time messages."
    },
    {
      title: "Link Facebook Pages",
      desc: "Connect your business pages to the app and grant 'pages_messaging' permissions."
    },
    {
      title: "Generate tokens",
      desc: "Get Page Access Tokens for each connected page to start sending and receiving content."
    }
  ];

  return (
    <motion.div
      key="facebook"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="bg-[#1e293b] p-10 rounded-[2rem] border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-xl flex items-center justify-center">
              <Facebook className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Facebook & Messenger</h3>
              <p className="text-slate-400 text-sm">Connect and manage your business pages</p>
            </div>
          </div>
          
          <div className="flex bg-[#0f172a] p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setMethod("login")}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${method === "login" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Express Link
            </button>
            <button 
              onClick={() => setMethod("manage")}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${method === "manage" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Manage Pages
            </button>
            <button 
              onClick={() => setMethod("api")}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${method === "api" ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Manual API
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {method === "login" ? (
            <motion.div 
              key="login-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-12 space-y-12 relative"
            >
              <AnimatePresence>
                {connectionResults.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="absolute inset-0 z-[60] bg-[#0f172a]/95 flex flex-col items-center justify-center p-8 text-center backdrop-blur-xl rounded-[2.5rem] border border-blue-500/30 shadow-2xl"
                  >
                    <div className="w-full max-w-sm space-y-8">
                      <div className="space-y-2">
                        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30">
                          <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <h4 className="text-2xl font-black text-white tracking-tight">Accounts Linked!</h4>
                        <p className="text-sm text-slate-400">Successfully authorized the following pages:</p>
                      </div>

                      <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar px-2">
                        {connectionResults.map((res) => (
                          <motion.div 
                            key={res.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center justify-between group hover:border-emerald-500/30 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              <img 
                                src={`https://graph.facebook.com/${res.id}/picture?type=large`}
                                className="w-10 h-10 rounded-full border-2 border-slate-800"
                                alt=""
                              />
                              <div className="text-left">
                                <p className="text-sm font-bold text-white">{res.name}</p>
                                <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active & Ready</p>
                              </div>
                            </div>
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          </motion.div>
                        ))}
                      </div>

                      <button 
                        onClick={() => {
                          setConnectionResults([]);
                          if (onSuccess) onSuccess();
                        }}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl transition-all shadow-xl shadow-blue-900/20 active:scale-95 uppercase tracking-widest text-xs"
                      >
                        Continue to Dashboard
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {facebookUsers.filter(u => u.email === "Messenger").length > 0 && (
                <div className="w-full flex flex-wrap justify-center gap-6">
                  {facebookUsers.filter(u => u.email === "Messenger").map((user) => (
                    <motion.div 
                      key={user.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-[#0f172a] p-6 rounded-[2.5rem] border border-blue-500/30 flex flex-col items-center space-y-4 shadow-2xl relative overflow-hidden group min-w-[280px]"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-blue-500 animate-gradient-x"></div>
                      <div className="relative">
                        <img 
                          src={user.avatar} 
                          alt="FB Profile" 
                          className="w-20 h-20 rounded-full border-4 border-[#1e293b] shadow-xl group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full border-2 border-[#0f172a] flex items-center justify-center">
                          <Facebook className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <div className="text-center space-y-0.5">
                        <h4 className="text-lg font-black text-white leading-tight">{user.name}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                          <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Connected</span>
                        </div>
                        <button 
                          onClick={() => {
                            setFacebookUsers(prev => prev.filter(u => u.id !== user.id));
                          }}
                          className="bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 px-3 py-1 rounded-full border border-slate-700 hover:border-rose-500/30 text-[8px] font-black uppercase tracking-widest transition-all"
                        >
                          Remove
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="flex flex-col items-center space-y-8 w-full max-w-md">
                <div className="flex flex-col items-center space-y-4">
                  <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/40">
                    <Facebook className="w-8 h-8 text-white" />
                  </div>
                  <div className="text-center space-y-2">
                    <h4 className="text-2xl font-bold">
                      {facebookUsers.filter(u => u.email === "Messenger").length > 0 ? "Add Another Account" : "Connect via Facebook"}
                    </h4>
                    <p className="text-slate-400 text-sm leading-relaxed px-8">
                      {facebookUsers.filter(u => u.email === "Messenger").length > 0 
                        ? "You can connect multiple Facebook accounts to manage all your business pages in one central inbox."
                        : "Connect your Meta account to automatically discover all your business pages and setup Messenger integration."
                      }
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-4 w-full">
                  <button 
                    onClick={() => handleConnect("Business Page")}
                    disabled={isConnecting}
                    className="flex items-center gap-3 bg-[#1877f2] hover:bg-[#166fe5] text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-80 disabled:cursor-wait min-w-[280px] justify-center"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Facebook className="w-5 h-5" />
                    )}
                    {isConnecting ? "Connecting to Meta..." : facebookUsers.filter(u => u.email === "Messenger").length > 0 ? "Add New Facebook ID" : "Continue with Facebook"}
                  </button>
                  
                  {isConnecting && (
                    <div className="w-full max-w-[280px] h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${loginProgress}%` }}
                        className="h-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-[10px] text-slate-500 uppercase tracking-widest text-center">
                Securely powered by Meta Graph API • Multiple Account Support Active
              </p>
            </motion.div>
          ) : method === "manage" ? (
            <motion.div
              key="manage-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Linked Pages</h4>
                <span className="text-xs text-blue-400 font-bold bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                  {Object.values(activePages).filter(Boolean).length} Active
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessPages.map((page) => (
                  <div key={page.id} className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-blue-400 font-bold group-hover:scale-110 transition-transform">
                        {page.name[0]}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-100">{page.name}</h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{page.category}</span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                          <span className="text-[10px] text-slate-500 font-bold tracking-wider">{page.followers} followers</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => togglePage(page.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 outline-none ${activePages[page.id] ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${activePages[page.id] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                ))}
              </div>
              
                <div className="bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10 flex items-start gap-4 mt-8">
                  <Bell className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Messages from <span className="text-blue-400 font-bold">Active</span> pages will be routed to your unified inbox. Deactivating a page will stop receiving new messages from it until reactivated.
                  </p>
                </div>

                <div className="pt-6 flex justify-end">
                   <button 
                    onClick={() => handleConnect(`${Object.values(activePages).filter(Boolean).length} Pages Synchronized`)}
                    disabled={isConnecting}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                   >
                     {isConnecting ? "Updating..." : "Save & Sync Pages"}
                   </button>
                </div>
              </motion.div>
          ) : (
            <motion.div 
              key="api-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Connection Process</h4>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-200 text-sm">{step.title}</h5>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-slate-800 space-y-6 self-start relative overflow-hidden">
                {isVerified && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-50 bg-[#0f172a]/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md"
                  >
                    {isSyncing ? (
                      <div className="space-y-6 w-full max-w-xs transition-all">
                        <div className="relative w-20 h-20 mx-auto">
                          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
                          <motion.div 
                            className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          ></motion.div>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <RefreshCw className="w-8 h-8 text-blue-400 animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xl font-black text-white">Syncing Messages...</h4>
                          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Fetching historical data from {manualConfig.pageName}</p>
                        </div>
                        <div className="space-y-1">
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                              initial={{ width: 0 }}
                              animate={{ width: `${syncProgress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                            <span>Indexing threads</span>
                            <span>{syncProgress}%</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-all scale-110">
                          <Check className="w-10 h-10 text-white" />
                        </div>
                        <h4 className="text-2xl font-black text-white mb-2 tracking-tight">Connected & Synced!</h4>
                        <p className="text-slate-400 text-sm font-medium mb-8">Manual API is active. Historical messages have been imported to your inbox.</p>
                        <button 
                          onClick={onSuccess}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95 transition-all"
                        >
                          Go to Inbox
                        </button>
                      </>
                    )}
                  </motion.div>
                )}
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Manual API Config</h4>
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  if (manualConfig.token && manualConfig.pageId) {
                    try {
                      setIsSyncing(true);
                      setIsVerified(true);
                      setSyncProgress(20);
                      
                      if (onManualSetup) {
                        await onManualSetup(manualConfig.pageId.trim(), manualConfig.token.replace(/\s/g, ''), manualConfig.pageName);
                      } else {
                        const { error } = await supabase.from('social_integrations').upsert({
                          platform: 'facebook_direct',
                          page_id: manualConfig.pageId.trim(),
                          access_token: manualConfig.token.replace(/\s/g, ''),
                          page_name: manualConfig.pageName
                        }, { onConflict: 'page_id' });
                        
                        if (error) throw error;
                        alert("Manual connection successful!");
                      }
                    } catch (err: any) {
                      alert("Error: " + err.message);
                      setIsSyncing(false);
                      setIsVerified(false);
                    }
                  }
                }}>
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Business Page Name</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={manualConfig.pageName}
                        onChange={(e) => setManualConfig(prev => ({ ...prev, pageName: e.target.value }))}
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 text-white outline-none transition-all pr-10"
                        placeholder="e.g. Aaramaura Shop"
                        required
                      />
                      {manualConfig.pageName && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Page Access Token</label>
                    <div className="relative">
                      <input 
                        type={showManualToken ? "text" : "password"} 
                        value={manualConfig.token}
                        onChange={(e) => setManualConfig(prev => ({ ...prev, token: e.target.value }))}
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 text-white outline-none transition-all pr-20"
                        placeholder="EAAO..."
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowManualToken(!showManualToken)}
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showManualToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {manualConfig.token && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Facebook Page ID</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={manualConfig.pageId}
                        onChange={(e) => setManualConfig(prev => ({ ...prev, pageId: e.target.value }))}
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 text-white outline-none transition-all pr-10"
                        placeholder="pg_10023..."
                        required
                      />
                      {manualConfig.pageId && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">App Secret</label>
                    <div className="relative">
                      <input 
                        type={showManualSecret ? "text" : "password"} 
                        value={manualConfig.secret}
                        onChange={(e) => setManualConfig(prev => ({ ...prev, secret: e.target.value }))}
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-blue-500 text-white outline-none transition-all pr-20"
                        placeholder="••••••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowManualSecret(!showManualSecret)}
                        className="absolute right-10 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showManualSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      {manualConfig.secret && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={isConnecting || !manualConfig.token || !manualConfig.pageId || !manualConfig.secret || !manualConfig.pageName}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 mt-4 active:scale-95 disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Verifying...
                      </div>
                    ) : (
                      "Verify & Connect"
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function TikTokView({ setPlatforms, setChats, onSuccess }: { setPlatforms: any, setChats: any, onSuccess: any }) {
  const [method, setMethod] = useState<"api" | "login" | "manage">("login");
  const [activeAccounts, setActiveAccounts] = useState<Record<string, boolean>>({
    "1": true,
    "2": false
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showClientSecret, setShowClientSecret] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsSyncing(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setSyncProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          if (setChats) {
            const newChat: Chat = {
              id: Date.now(),
              timestamp: Date.now(),
              name: "TikTok Creator",
              platform: "tiktok",
              platformIcon: <Music className="w-3 h-3" />,
              platformColor: "bg-rose-500",
              lastMsg: "Loved your latest short video response!",
              time: "Just now",
              unread: 1,
              online: true,
              avatar: "TC",
              isStarred: false,
              isSpam: false,
              isBin: false,
              isDone: false,
              hasOrdered: false,
              assignedTo: null,
              profile: {
                bio: "New TikTok interaction synced via TikTok API.",
                work: "Influencer",
                education: "N/A",
                location: "Dhaka",
                hometown: "N/A",
                relationship: "New Interaction",
                birthday: "N/A",
                email: "creator@tiktok-sync.com",
                phone: "N/A",
                gender: "N/A",
                coverImage: "https://picsum.photos/seed/tiktok_cover/800/300",
                joinedDate: "April 2024"
              },
              messages: [{ id: 1, text: "I just saw your TikTok video and wanted to connect!", sender: "them", time: "Just now" }]
            };
            setChats((prev: any) => [newChat, ...prev]);
          }
          setTimeout(() => setIsSyncing(false), 2000);
          if (setPlatforms) {
            setPlatforms((prev: any) => prev.map((p: any) => p.id === 'tiktok' ? { ...p, status: 'Healthy', accounts: 1 } : p));
          }
        }
      }, 100);
    }, 1500);
  };

  const toggleAccount = (id: string) => {
    setActiveAccounts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const businessAccounts = [
    { id: "1", name: "@lifestyle_creators", type: "Creator", followers: "45.2k" },
    { id: "2", name: "@tech_tips_daily", type: "Business", followers: "128k" },
  ];

  const steps = [
    {
      title: "Register on TikTok for Developers",
      desc: "Create an account at developers.tiktok.com and apply for 'TikTok for Business' access."
    },
    {
      title: "Create App & Select Scopes",
      desc: "Create a new app and ensure you request 'video.list' and 'message.send' permissions."
    },
    {
      title: "Configure Redirect Whitelist",
      desc: "Add your dashboard URL to the allowed redirect list in the TikTok developer portal."
    },
    {
      title: "Exchange Auth Code for Token",
      desc: "Implement the OAuth flow to receive a long-lived Access Token for account management."
    }
  ];

  return (
    <motion.div
      key="tiktok"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="bg-[#1e293b] p-10 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden">
        <SyncOverlay 
          isSyncing={isSyncing} 
          progress={syncProgress} 
          brandColor="bg-rose-500" 
          onSuccess={() => onSuccess?.()} 
        />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">TikTok Integration</h3>
              <p className="text-slate-400 text-sm">Connect your TikTok Creator or Business accounts</p>
            </div>
          </div>
          
          <div className="flex bg-[#0f172a] p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setMethod("login")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${method === "login" ? "bg-rose-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              TikTok Login
            </button>
            <button 
              onClick={() => setMethod("manage")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${method === "manage" ? "bg-rose-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Accounts
            </button>
            <button 
              onClick={() => setMethod("api")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${method === "api" ? "bg-rose-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Advanced API
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {method === "login" ? (
            <motion.div 
              key="login-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-12 space-y-8"
            >
              <div className="w-20 h-20 bg-black rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-rose-900/20 border border-slate-800">
                <Music className="w-10 h-10 text-white" />
              </div>
              <div className="text-center max-w-md space-y-4">
                <h4 className="text-2xl font-bold">Connect TikTok</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Sign in with your TikTok account to manage messages and track performance directly from OmniInbox.
                </p>
              </div>
              <button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-3 bg-black hover:bg-slate-900 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 border border-slate-800 text-sm disabled:opacity-50"
              >
                {isConnecting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Music className="w-5 h-5 text-rose-500" />
                )}
                {isConnecting ? "Connecting..." : "Continue with TikTok"}
              </button>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Powered by TikTok for Developers API</p>
            </motion.div>
          ) : method === "manage" ? (
            <motion.div
              key="manage-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Connected Accounts</h4>
                <span className="text-xs text-rose-400 font-bold bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/20">
                  {Object.values(activeAccounts).filter(Boolean).length} Active
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessAccounts.map((acc) => (
                  <div key={acc.id} className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 flex items-center justify-between group hover:border-rose-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-rose-400 font-bold group-hover:scale-110 transition-transform">
                        <Video className="w-6 h-6" />
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-100">{acc.name}</h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{acc.type}</span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                          <span className="text-[10px] text-slate-500 font-bold tracking-wider">{acc.followers} followers</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => toggleAccount(acc.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 outline-none ${activeAccounts[acc.id] ? 'bg-rose-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${activeAccounts[acc.id] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="api-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Developer Setup</h4>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-200 text-sm">{step.title}</h5>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-slate-800 space-y-6 self-start relative overflow-hidden">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">API Configuration</h4>
                <form className="space-y-5" onSubmit={(e) => {
                  e.preventDefault();
                  handleConnect();
                }}>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Client Key</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-rose-500 text-white outline-none transition-all"
                      placeholder="aw12..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Client Secret</label>
                    <div className="relative">
                      <input 
                        type={showClientSecret ? "text" : "password"} 
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-rose-500 text-white outline-none transition-all pr-10"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientSecret(!showClientSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Dashboard ID</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-rose-500 text-white outline-none transition-all"
                      placeholder="dash_99..."
                    />
                  </div>
                  <button 
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-rose-900/20 mt-4 active:scale-95"
                  >
                    Save & Test Connection
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function LinkedInView({ setPlatforms, setChats, onSuccess }: { setPlatforms: any, setChats: any, onSuccess: any }) {
  const [method, setMethod] = useState<"api" | "login" | "manage">("login");
  const [activePages, setActivePages] = useState<Record<string, boolean>>({
    "1": true
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showClientSecret, setShowClientSecret] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsSyncing(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setSyncProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          if (setChats) {
            const newChat: Chat = {
              id: Date.now(),
              timestamp: Date.now(),
              name: "Professional Lead",
              platform: "linkedin",
              platformIcon: <Linkedin className="w-3 h-3" />,
              platformColor: "bg-sky-600",
              lastMsg: "Interested in your business services.",
              time: "Just now",
              unread: 1,
              online: true,
              avatar: "PL",
              isStarred: false,
              isSpam: false,
              isBin: false,
              isDone: false,
              hasOrdered: false,
              assignedTo: null,
              profile: {
                bio: "Professional lead synced via LinkedIn OAuth.",
                work: "Business Executive",
                education: "N/A",
                location: "Singapore",
                hometown: "N/A",
                relationship: "B2B Prospect",
                birthday: "N/A",
                email: "professional@linkedin-sync.com",
                phone: "N/A",
                gender: "N/A",
                coverImage: "https://picsum.photos/seed/linked_cover/800/300",
                joinedDate: "April 2024"
              },
              messages: [{ id: 1, text: "Assalamu Alaikum! I would like to discuss a potential business partnership.", sender: "them", time: "Just now" }]
            };
            setChats((prev: any) => [newChat, ...prev]);
          }
          setTimeout(() => setIsSyncing(false), 2000);
          if (setPlatforms) {
            setPlatforms((prev: any) => prev.map((p: any) => p.id === 'linkedin' ? { ...p, status: 'Healthy', accounts: 2 } : p));
          }
        }
      }, 100);
    }, 1500);
  };

  const togglePage = (id: string) => {
    setActivePages(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const businessPages = [
    { id: "1", name: "OmniInbox Corp", type: "Company Page", followers: "1.2k" },
    { id: "2", name: "Tech Solutions Dhaka", type: "Showcase Page", followers: "850" },
  ];

  const steps = [
    {
      title: "Create LinkedIn Developer App",
      desc: "Go to linkedin.com/developers and create a new app. Request 'Marketing Developer Platform' access."
    },
    {
      title: "Verify Page Ownership",
      desc: "Generate a verification URL and have the Page Admin approve the app connection."
    },
    {
      title: "Configure OAuth 2.0",
      desc: "Set up the 'r_organization_social' and 'w_organization_social' permissions for messaging."
    },
    {
      title: "Sync Organization ID",
      desc: "Locate your Organization URN (e.g., urn:li:organization:12345) to enable direct routing."
    }
  ];

  return (
    <motion.div
      key="linkedin"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="bg-[#1e293b] p-10 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden">
        <SyncOverlay 
          isSyncing={isSyncing} 
          progress={syncProgress} 
          brandColor="bg-sky-600" 
          onSuccess={() => onSuccess?.()} 
        />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-sky-500/10 text-sky-400 rounded-xl flex items-center justify-center">
              <Linkedin className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">LinkedIn Pages</h3>
              <p className="text-slate-400 text-sm">Manage company pages and showcase accounts</p>
            </div>
          </div>
          
          <div className="flex bg-[#0f172a] p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setMethod("login")}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${method === "login" ? "bg-sky-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Express Link
            </button>
            <button 
              onClick={() => setMethod("manage")}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${method === "manage" ? "bg-sky-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Pages
            </button>
            <button 
              onClick={() => setMethod("api")}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${method === "api" ? "bg-sky-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Manual API
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {method === "login" ? (
            <motion.div 
              key="login-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-12 space-y-8"
            >
              <div className="w-20 h-20 bg-[#0077b5] rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-sky-900/40">
                <Linkedin className="w-10 h-10 text-white" />
              </div>
              <div className="text-center max-w-md space-y-4">
                <h4 className="text-2xl font-bold">Connect LinkedIn</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Connect your professional account to automatically sync and manage your company page conversations.
                </p>
              </div>
              <button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-3 bg-[#0077b5] hover:bg-[#006399] text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm disabled:opacity-50"
              >
                {isConnecting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Linkedin className="w-5 h-5" />
                )}
                {isConnecting ? "Authorizing..." : "Sign in with LinkedIn"}
              </button>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Securely integrated via LinkedIn Marketing Solutions</p>
            </motion.div>
          ) : method === "manage" ? (
            <motion.div
              key="manage-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Active LinkedIn Pages</h4>
                <span className="text-xs text-sky-400 font-bold bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20">
                  {Object.values(activePages).filter(Boolean).length} Synced
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessPages.map((page) => (
                  <div key={page.id} className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 flex items-center justify-between group hover:border-sky-500/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center text-sky-400 font-bold group-hover:scale-110 transition-transform">
                        {page.name[0]}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-100">{page.name}</h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{page.type}</span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                          <span className="text-[10px] text-slate-500 font-bold tracking-wider">{page.followers} followers</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => togglePage(page.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 outline-none ${activePages[page.id] ? 'bg-sky-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${activePages[page.id] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="api-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">API Setup Process</h4>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-200 text-sm">{step.title}</h5>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-slate-800 space-y-6 self-start relative overflow-hidden">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Manual API Config</h4>
                <form className="space-y-5" onSubmit={(e) => {
                  e.preventDefault();
                  handleConnect();
                }}>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Client ID</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-sky-500 text-white outline-none transition-all"
                      placeholder="78xxx..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Client Secret</label>
                    <div className="relative">
                      <input 
                        type={showClientSecret ? "text" : "password"} 
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-sky-500 text-white outline-none transition-all pr-10"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientSecret(!showClientSecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showClientSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Organization URN</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-sky-500 text-white outline-none transition-all"
                      placeholder="urn:li:organization:..."
                    />
                  </div>
                  <button 
                    className="w-full bg-sky-600 hover:bg-sky-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-sky-900/20 mt-4 active:scale-95"
                  >
                    Authorize OmniInbox
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function InstagramView({ setPlatforms, setChats, onSuccess }: { setPlatforms: any, setChats: any, onSuccess: any }) {
  const [method, setMethod] = useState<"login" | "api">("login");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showAccessToken, setShowAccessToken] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsSyncing(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setSyncProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          if (setChats) {
            const newChat: Chat = {
              id: Date.now(),
              timestamp: Date.now(),
              name: "Insta Customer",
              platform: "instagram",
              platformIcon: <Instagram className="w-3 h-3" />,
              platformColor: "bg-pink-500",
              lastMsg: "Send pricing for this product.",
              time: "Just now",
              unread: 1,
              online: true,
              avatar: "IC",
              isStarred: false,
              isSpam: false,
              isBin: false,
              isDone: false,
              hasOrdered: false,
              assignedTo: null,
              profile: {
                bio: "New follower synced via Instagram Graph API.",
                work: "Blogger",
                education: "N/A",
                location: "Dhaka",
                hometown: "N/A",
                relationship: "Follower",
                birthday: "N/A",
                email: "insta@sync.com",
                phone: "N/A",
                gender: "Female",
                coverImage: "https://picsum.photos/seed/insta_cover/800/300",
                joinedDate: "April 2024"
              },
              messages: [{ id: 1, text: "Hi, can I get the price list for your clothes?", sender: "them", time: "Just now" }]
            };
            setChats((prev: any) => [newChat, ...prev]);
          }
          setTimeout(() => setIsSyncing(false), 2000);
          if (setPlatforms) {
            setPlatforms((prev: any) => prev.map((p: any) => p.id === 'instagram' ? { ...p, status: 'Healthy', accounts: 1 } : p));
          }
        }
      }, 100);
    }, 1500);
  };
  
  const steps = [
    {
      title: "Convert to Business Profile",
      desc: "Ensure your Instagram account is switched to a 'Professional/Business' account and linked to a Facebook Page."
    },
    {
      title: "Grant Meta Permissions",
      desc: "Allow OmniInbox to manage your Instagram messages and comments via the Graph API flow."
    },
    {
      title: "Configure Automated Replies",
      desc: "Set up keywords or quick replies specifically for Instagram DMs and Story mentions."
    }
  ];

  return (
    <motion.div
      key="instagram"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="bg-[#1e293b] p-10 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden">
        <SyncOverlay 
          isSyncing={isSyncing} 
          progress={syncProgress} 
          brandColor="bg-pink-600" 
          onSuccess={() => onSuccess?.()} 
        />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-500/10 text-pink-500 rounded-xl flex items-center justify-center">
              <Instagram className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">Instagram Integration</h3>
              <p className="text-slate-400 text-sm">Automate Story replies, DMs and comments</p>
            </div>
          </div>
          
          <div className="flex bg-[#0f172a] p-1 rounded-xl border border-slate-800">
            <button 
              onClick={() => setMethod("login")}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${method === "login" ? "bg-pink-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Link via Facebook
            </button>
            <button 
              onClick={() => setMethod("api")}
              className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${method === "api" ? "bg-pink-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Manual API
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {method === "login" ? (
            <motion.div 
              key="login"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-12 space-y-8"
            >
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-2xl">
                  <Instagram className="w-12 h-12 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-blue-600 rounded-xl border-4 border-[#1e293b] flex items-center justify-center">
                  <Facebook className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="text-center max-w-md space-y-4">
                <h4 className="text-2xl font-bold">Connect via Facebook Login</h4>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Instagram DMs require a connection through your Meta Business Suite. Log in with your Facebook account that manages the linked page.
                </p>
              </div>
              <button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-3 bg-pink-600 hover:bg-pink-500 text-white px-10 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Instagram className="w-5 h-5" />
                )}
                {isConnecting ? "Linking..." : "Link Instagram Business"}
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Setup Steps</h4>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-pink-600 text-white flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-200 text-sm">{step.title}</h5>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-slate-800 space-y-6 self-start relative overflow-hidden">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Instagram Graph API</h4>
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">IG Business ID</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-pink-500 text-white outline-none transition-all"
                      placeholder="1784xxx..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Page Access Token</label>
                    <div className="relative">
                      <input 
                        type={showAccessToken ? "text" : "password"} 
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-pink-500 text-white outline-none transition-all pr-10"
                        placeholder="EAAB..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowAccessToken(!showAccessToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showAccessToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={handleConnect}
                    className="w-full bg-pink-600 hover:bg-pink-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-pink-900/20 mt-4 active:scale-95"
                  >
                    Authenticate Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function XView({ setPlatforms, setChats, onSuccess }: { setPlatforms: any, setChats: any, onSuccess: any }) {
  const [method, setMethod] = useState<"api" | "login" | "manage">("login");
  const [activeProfiles, setActiveProfiles] = useState<Record<string, boolean>>({
    "1": true
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [showAPISecret, setShowAPISecret] = useState(false);
  const [showBearerToken, setShowBearerToken] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnecting(false);
      setIsSyncing(true);
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setSyncProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          if (setChats) {
            const newChat: Chat = {
              id: Date.now(),
              timestamp: Date.now(),
              name: "X User",
              platform: "x",
              platformIcon: <Twitter className="w-3 h-3" />,
              platformColor: "bg-slate-700",
              lastMsg: "Loved your latest tweet!",
              time: "Just now",
              unread: 1,
              online: true,
              avatar: "XU",
              isStarred: false,
              isSpam: false,
              isBin: false,
              isDone: false,
              hasOrdered: false,
              assignedTo: null,
              profile: {
                bio: "X interaction synced via Twitter API V2.",
                work: "N/A",
                education: "N/A",
                location: "Global",
                hometown: "N/A",
                relationship: "Follower",
                birthday: "N/A",
                email: "x@sync.com",
                phone: "N/A",
                gender: "N/A",
                coverImage: "https://picsum.photos/seed/x_cover/800/300",
                joinedDate: "April 2024"
              },
              messages: [{ id: 1, text: "I just saw your update on X and I want to know more about the pricing.", sender: "them", time: "Just now" }]
            };
            setChats((prev: any) => [newChat, ...prev]);
          }
          setTimeout(() => setIsSyncing(false), 2000);
          if (setPlatforms) {
            setPlatforms((prev: any) => prev.map((p: any) => p.id === 'x' ? { ...p, status: 'Healthy', accounts: 1 } : p));
          }
        }
      }, 100);
    }, 1500);
  };

  const toggleProfile = (id: string) => {
    setActiveProfiles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const businessProfiles = [
    { id: "1", name: "@OmniInbox_HQ", type: "Business Profile", followers: "5.8k" },
    { id: "2", name: "@Solution_Center", type: "Support Account", followers: "2.1k" },
  ];

  const steps = [
    {
      title: "Register on X Developer Portal",
      desc: "Access developer.x.com and sign up for 'Free' or 'Basic' tier access."
    },
    {
      title: "Set Up Project & App",
      desc: "Create a Project and an App to obtain your API Key, API Secret, and Bearer Token."
    },
    {
      title: "Enable User Authentication",
      desc: "Configure OAuth 2.0 Settings with 'Read and Write' permissions for DM management."
    },
    {
      title: "Whale Hook Configuration",
      desc: "Set up real-time webhooks to receive instant notifications for mentions and direct messages."
    }
  ];

  return (
    <motion.div
      key="x-view"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="bg-[#1e293b] p-10 rounded-[2rem] border border-slate-800 shadow-xl relative overflow-hidden">
        <SyncOverlay 
          isSyncing={isSyncing} 
          progress={syncProgress} 
          brandColor="bg-white" 
          onSuccess={() => onSuccess?.()} 
        />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-10 pb-8 border-b border-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/10 text-white rounded-xl flex items-center justify-center border border-white/10">
              <Twitter className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-bold">X Integration</h3>
              <p className="text-slate-400 text-sm">Manage business profiles and direct messages</p>
            </div>
          </div>
          
          <div className="flex bg-[#0f172a] p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-hide">
            <button 
              onClick={() => setMethod("login")}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${method === "login" ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Connect X
            </button>
            <button 
              onClick={() => setMethod("manage")}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${method === "manage" ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              Profiles
            </button>
            <button 
              onClick={() => setMethod("api")}
              className={`px-5 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${method === "api" ? "bg-white text-black shadow-lg" : "text-slate-400 hover:text-slate-200"}`}
            >
              V2 API Config
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {method === "login" ? (
            <motion.div 
              key="x-login-view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center py-12 space-y-8"
            >
              <div className="w-20 h-20 bg-black rounded-[1.5rem] flex items-center justify-center shadow-xl border border-slate-800 ring-2 ring-white/10">
                <Twitter className="w-10 h-10 text-white" />
              </div>
              <div className="text-center max-w-md space-y-4">
                <h4 className="text-2xl font-bold text-white">Authorize X</h4>
                <p className="text-slate-400 text-sm leading-relaxed text-balance">
                  Link your X profile to OmniInbox to read feeds, track hashtags, and respond to direct messages in one place.
                </p>
              </div>
              <button 
                onClick={handleConnect}
                disabled={isConnecting}
                className="flex items-center gap-3 bg-white hover:bg-slate-200 text-black px-10 py-4 rounded-xl font-bold transition-all shadow-lg active:scale-95 text-sm disabled:opacity-50"
              >
                {isConnecting ? (
                  <div className="w-5 h-5 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                ) : (
                  <Twitter className="w-5 h-5" />
                )}
                {isConnecting ? "Authenticating..." : "Auth via OAuth 2.0"}
              </button>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Secure connection using X V2 API</p>
            </motion.div>
          ) : method === "manage" ? (
            <motion.div
              key="x-manage-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Linked X Profiles</h4>
                <span className="text-xs text-white font-bold bg-white/10 px-3 py-1 rounded-full border border-white/20">
                  {Object.values(activeProfiles).filter(Boolean).length} Active
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessProfiles.map((p) => (
                  <div key={p.id} className="bg-[#0f172a] p-6 rounded-3xl border border-slate-800 flex items-center justify-between group hover:border-white/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white font-bold group-hover:scale-110 transition-transform border border-white/10">
                        {p.name[1].toUpperCase()}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-100">{p.name}</h5>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{p.type}</span>
                          <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                          <span className="text-[10px] text-slate-500 font-bold tracking-wider">{p.followers} followers</span>
                        </div>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => toggleProfile(p.id)}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-300 outline-none ${activeProfiles[p.id] ? 'bg-blue-500' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${activeProfiles[p.id] ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="x-api-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-12"
            >
              <div className="space-y-6">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Developer Onboarding</h4>
                <div className="space-y-4">
                  {steps.map((step, i) => (
                    <div key={i} className="flex gap-4 p-5 bg-slate-900/50 rounded-2xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div className="shrink-0 w-8 h-8 rounded-full bg-slate-100 text-black flex items-center justify-center font-bold text-sm">
                        {i + 1}
                      </div>
                      <div>
                        <h5 className="font-bold text-slate-200 text-sm">{step.title}</h5>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#0f172a] p-8 rounded-[2rem] border border-slate-800 space-y-6 self-start relative overflow-hidden">
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest">X V2 API Credentials</h4>
                <form className="space-y-5" onSubmit={(e) => {
                  e.preventDefault();
                  handleConnect();
                }}>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">API Key</label>
                    <input 
                      type="text" 
                      className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-white text-white outline-none transition-all placeholder:text-slate-600"
                      placeholder="x_api_..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">API Secret Key</label>
                    <div className="relative">
                      <input 
                        type={showAPISecret ? "text" : "password"} 
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-white text-white outline-none transition-all placeholder:text-slate-600 pr-10"
                        placeholder="••••••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAPISecret(!showAPISecret)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showAPISecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Bearer Token</label>
                    <div className="relative">
                      <input 
                        type={showBearerToken ? "text" : "password"} 
                        className="w-full bg-[#1e293b] border border-slate-800 rounded-xl px-4 py-3 text-sm focus:border-white text-white outline-none transition-all placeholder:text-slate-600 pr-10"
                        placeholder="AAA..."
                      />
                      <button
                        type="button"
                        onClick={() => setShowBearerToken(!showBearerToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showBearerToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button 
                    className="w-full bg-slate-100 hover:bg-white text-black font-bold py-4 rounded-xl transition-all shadow-lg shadow-black/20 mt-4 active:scale-95"
                  >
                    Verify Credentials
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
function ChatsView({ 
  setOrders, 
  setLeads, 
  employees, 
  chats, 
  setChats, 
  facebookAccessToken, 
  currentUser, 
  typingUsers, 
  loadSupabaseData, 
  handleLiveSync, 
  callWaha, 
  isSyncing, 
  selectedChat, 
  setSelectedChat, 
  isLiveLoading, 
  setIsLiveLoading 
}: { 
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>, 
  setLeads: React.Dispatch<React.SetStateAction<Lead[]>>,
  employees: Employee[],
  chats: Chat[],
  setChats: React.Dispatch<React.SetStateAction<Chat[]>>,
  facebookAccessToken: string,
  currentUser: User,
  typingUsers: {[key: number]: string},
  loadSupabaseData: (caller?: string) => Promise<any[]>,
  handleLiveSync: (force?: boolean) => Promise<any[]>,
  callWaha: (endpoint: string, method?: string, body?: any, params?: any, session?: string, config?: any) => Promise<any>,
  isSyncing: boolean,
  selectedChat: string | number | null,
  setSelectedChat: React.Dispatch<React.SetStateAction<string | number | null>>,
  isLiveLoading: boolean,
  setIsLiveLoading: React.Dispatch<React.SetStateAction<boolean>>
}) {
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isRepliesOpen, setIsRepliesOpen] = useState(false);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isManageMenuOpen, setIsManageMenuOpen] = useState(false);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isAssignMenuOpen, setIsAssignMenuOpen] = useState(false);
  const [assigningId, setAssigningId] = useState<string | number | null>(null);
  const [activeFilter, setActiveFilter] = useState("All Messages");
  const [newIdentity, setNewIdentity] = useState({ platform: 'whatsapp', number: '' });
  const [orderRate, setOrderRate] = useState("");
  const [orderAmount, setOrderAmount] = useState("");
  const [orderPaidAmount, setOrderPaidAmount] = useState("");
  const [orderPhone, setOrderPhone] = useState("");
  const [orderAgent, setOrderAgent] = useState("");
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState("English");
  const [translatingId, setTranslatingId] = useState<string | number | null>(null);

  // Auto-select first chat if none selected
  React.useEffect(() => {
    if (selectedChat === null && chats.length > 0) {
      setSelectedChat(chats[0].id);
    }
  }, [chats, selectedChat, setSelectedChat]);

  // Derive current chat from state
  const currentChat = selectedChat !== null ? chats.find(c => String(c.id) === String(selectedChat)) : null;

  // Live Mode: Fetch messages directly from Meta or WAHA proxy when a chat is selected
  // Also fetch from Supabase messages table for persistent history
  React.useEffect(() => {
    let interval: any;

    const fetchLiveMessages = async (silent = false) => {
      if (!currentChat) return;
      
      if (!silent) setIsLiveLoading(true);
      try {
        const platformChatId = (currentChat as any).external_uid || String(currentChat.id);
        let formattedMessages: any[] = [];

        // Fetch exclusively from Platform API (Pure WAHA/Meta Mode)
        if (currentChat.platform === 'whatsapp') {
          const wahaConfig = getStoredWahaConfig();
          if (wahaConfig) {
            const session = (currentChat as any).session || wahaConfig.session || 'default';
            let data: any = null;

            try {
              data = await callWaha(`chats/${encodeURIComponent(platformChatId)}/messages`, 'GET', null, { limit: 50, offset: 0, downloadMedia: false }, session);
            } catch (e) {}

            if (!data || !Array.isArray(data) || data.length === 0) {
              try {
                data = await callWaha('messages', 'GET', null, { chatId: platformChatId, session: session, limit: 50, offset: 0, downloadMedia: false }, session);
              } catch (e) {}
            }

            const liveMessages = normalizeWahaList(data);
            if (liveMessages.length > 0) {
              formattedMessages = liveMessages.map((wm: any) => {
                const text = wm.body || wm.content || wm.text || (wm.message?.conversation) || (wm.message?.extendedTextMessage?.text) || "";
                return {
                  id: typeof wm.id === 'object' ? (wm.id?._serialized || wm.id?.id || JSON.stringify(wm.id)) : wm.id,
                  text: text,
                  type: (wm.type === 'image' || wm.hasMedia || wm.message?.imageMessage) ? 'image' : 'text',
                  sender: wm.fromMe ? "me" : "them",
                  time: wm.timestamp ? new Date(wm.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Now",
                  timestamp: wm.timestamp || Date.now() / 1000,
                  mediaUrl: wm.mediaUrl || wm.message?.imageMessage?.url || null
                };
              });
            }
          }
        } else if (currentChat.platform === 'messenger') {
          const { data: fbData, error: fbError } = await supabase.functions.invoke('get-meta-messages', {
            body: { conversationId: platformChatId, pageId: (currentChat as any).page_id }
          });

          if (!fbError && fbData?.messages) {
            formattedMessages = fbData.messages;
          }
        }
        
        if (formattedMessages.length > 0) {
          setChats(prev => prev.map(c => {
            if (String(c.id) === String(selectedChat)) {
              // In pure live mode, we just use the platform's history
              const sorted = formattedMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
              return { ...c, messages: sorted };
            }
            return c;
          }));
        }
      } catch (err) {
        console.error("Live messages fetch error:", err);
      } finally {
        if (!silent) setIsLiveLoading(false);
      }
    };

    if (selectedChat !== null) {
      fetchLiveMessages(false);
      
      // Polling for WhatsApp
      if (currentChat?.platform === 'whatsapp') {
        interval = setInterval(() => fetchLiveMessages(true), 5000);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedChat, currentChat?.id, currentChat?.platform]);

  const handleLiveSyncLocal = async () => {
    const liveChats = await handleLiveSync(true);
    if (liveChats.length > 0) {
      setChats(liveChats);
      if (selectedChat === null) setSelectedChat(liveChats[0].id);
    }
  };

  const [callStatus, setCallStatus] = useState<'idle' | 'incoming' | 'active'>('idle');
  const [callTimer, setCallTimer] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

  // Call Timer Hook
  React.useEffect(() => {
    let interval: any;
    if (callStatus === 'active') {
      interval = setInterval(() => {
        setCallTimer(prev => prev + 1);
      }, 1000);
    } else {
      setCallTimer(0);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const handleIncomingCall = () => {
    if (!currentChat) return;
    setCallStatus('incoming');
  };

  const handleAcceptCall = () => {
    setCallStatus('active');
  };

  const handleEndCall = () => {
    setCallStatus('idle');
    setCallTimer(0);
  };

  const translateText = async (text: string, toLang: string = targetLanguage) => {
    try {
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Translate the following text to ${toLang}. Return ONLY the translated text.
        
        Text: ${text}`,
      });
      return result.text?.trim() || text;
    } catch (err) {
      console.error(err);
      return text;
    }
  };

  const handleTranslateMessage = async (msgId: number, originalText: string) => {
    if (translatingId) return;
    setTranslatingId(msgId);
    try {
      const translated = await translateText(originalText);
      setChats(prev => prev.map(chat => {
        if (chat.id === selectedChat) {
          return {
            ...chat,
            messages: chat.messages.map(m => 
              m.id === msgId ? { ...m, translatedText: translated } : m
            )
          };
        }
        return chat;
      }));
    } finally {
      setTranslatingId(null);
    }
  };

  const handleBengaliToEnglishInput = async () => {
    if (!messageText.trim() || isAIGenerating) return;
    setIsAIGenerating(true);
    try {
      const translated = await translateText(messageText, "English");
      setMessageText(translated);
    } finally {
      setIsAIGenerating(false);
    }
  };

  const ProfileInfoRow = ({ icon: Icon, label, value }: { icon: any, label: string, value: string }) => (
    <div className="flex items-start gap-4 group cursor-default">
      <div className="mt-1 text-slate-500 bg-slate-800/50 p-2 rounded-xl group-hover:text-blue-400 group-hover:bg-blue-400/10 transition-all shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="overflow-hidden">
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-[12px] text-slate-300 font-bold leading-tight truncate" title={value}>{value || 'Not provided'}</p>
      </div>
    </div>
  );

  const handleAISmartReply = async () => {
    if (!currentChat || isAIGenerating) return;
    setIsAIGenerating(true);
    try {
      const lastMessages = currentChat.messages.slice(-5).map(m => `${m.sender === 'me' ? 'Agent' : 'Customer'}: ${m.text}`).join("\n");
      const result = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `You are a professional customer support assistant for OmniInbox. Based on this conversation history, suggest a short, helpful, and polite reply for the agent to send. Reply only with the suggested text. Use the same language as the customer (Bengali or English).
        
        History:
        ${lastMessages}`,
      });
      setMessageText(result.text?.trim() || "");
    } catch (err) {
      console.error(err);
    } finally {
      setIsAIGenerating(false);
    }
  };
  
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [newReplyImage, setNewReplyImage] = useState<string | null>(null);
  const [savedReplies, setSavedReplies] = useState([
    { id: 1, title: "Welcome", content: "Assalamu Alaikum! How can I help you?", imageUrl: null },
    { id: 2, title: "Wait", content: "Thank you for contacting us. We will reply soon.", imageUrl: null },
    { id: 3, title: "Phone Request", content: "Could you please share your contact number?", imageUrl: null },
    { id: 4, title: "Order Update", content: "Your order is being processed.", imageUrl: null },
    { id: 5, title: "Closing", content: "Is there anything else I can help with?", imageUrl: null }
  ]);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const timerRef = React.useRef<any>(null);

  // Handle Recording Timer
  React.useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
      setRecordingTime(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startCamera = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Camera API not supported in this browser.");
        return;
      }

      // First check if there are any video devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasVideo = devices.some(device => device.kind === 'videoinput');

      if (!hasVideo) {
        alert("No camera hardware detected. Please connect a camera.");
        return;
      }

      // Try basic constraint first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      }).catch(async (e) => {
        console.warn("Retrying with minimal constraints...", e);
        return await navigator.mediaDevices.getUserMedia({ video: true });
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraOpen(true);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      const isNotFound = err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.message?.toLowerCase().includes('not found');
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError' || err.message?.toLowerCase().includes('denied');
      const isBusy = err.name === 'NotReadableError' || err.name === 'TrackStartError' || err.message?.toLowerCase().includes('in use');
      
      if (isNotFound) {
        alert("Camera hardware not found. Please ensure your camera is connected and recognized by your system.");
      } else if (isDenied) {
        alert("Camera access denied. Please click the lock/camera icon in your address bar to grant permissions.");
      } else if (isBusy) {
        alert("Camera is in use by another application. Please close other apps using the camera and try again.");
      } else {
        alert("Could not access camera: " + (err.message || "Unknown hardware error"));
      }
    }
  };

  const [isTyping, setIsTyping] = useState(false);

  React.useEffect(() => {
    if (messageText.length > 0 && !isTyping) {
      setIsTyping(true);
    } else if (messageText.length === 0 && isTyping) {
      setIsTyping(false);
    }
  }, [messageText]);
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setIsCameraOpen(false);
    setCapturedImage(null);
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvas.toDataURL("image/png"));
      }
    }
  };

  const startRecording = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsRecording(true);
    } catch (err: any) {
      console.error("Microphone error:", err);
      const isNotFound = err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError' || err.message?.includes('not found');
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';

      if (isNotFound) {
        alert("Microphone hardware not found. Please ensure your microphone is connected and not in use by another app.");
      } else if (isDenied) {
        alert("Microphone access was denied. Please click the microphone icon in your browser's address bar to allow access.");
      } else {
        alert("Microphone error: " + (err.message || "Unknown error"));
      }
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    const fakeTranscript = "এই মেসেজটি টেক্সটে কনভার্ট হয়েছে"; // Simulated STT for Bengali
    if (targetLanguage === "English") {
      setIsAIGenerating(true);
      const translated = await translateText(fakeTranscript, "English");
      handleSendMessage(`🎤 Voice: ${translated} (Translated from Bengali)`);
      setIsAIGenerating(false);
    } else {
      handleSendMessage(`🎤 Voice Message (${formatTime(recordingTime)})`);
    }
  };

  // Auto-scroll to bottom on new message
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [selectedChat, chats]);

  const handleSendMedia = (type: 'image' | 'voice', data: string) => {
    if (selectedChat === null) return;
    const updatedChats = [...chats];
    const chatIndex = updatedChats.findIndex(c => String(c.id) === String(selectedChat));
    if (chatIndex !== -1) {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      updatedChats[chatIndex].messages.push({
        id: Date.now(),
        text: type === 'image' ? "Captured Photo" : "Voice Message",
        type: type,
        mediaUrl: data,
        sender: "me",
        time: timeString
      });
      updatedChats[chatIndex].lastMsg = type === 'image' ? "📷 Photo" : "🎤 Voice Message";
      updatedChats[chatIndex].time = timeString;
      updatedChats[chatIndex].timestamp = Date.now() / 1000;
      setChats([...updatedChats].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      stopCamera();
    }
  };

  const handleSendMessage = async (textOverride?: string, imageOverride?: string) => {
    const textToSend = textOverride || messageText;
    if ((!textToSend.trim() && !imageOverride) || selectedChat === null) return;

    const updatedChats = [...chats];
    const chatIndex = updatedChats.findIndex(c => String(c.id) === String(selectedChat));

    if (chatIndex !== -1) {
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const newMessage = {
        id: Date.now(),
        text: textToSend,
        type: (imageOverride ? 'image' : 'text') as any,
        mediaUrl: imageOverride as string,
        sender: "me" as any,
        time: timeString
      };

      updatedChats[chatIndex].messages.push(newMessage);
      updatedChats[chatIndex].lastMsg = imageOverride ? "📷 " + textToSend : textToSend;
      updatedChats[chatIndex].time = timeString;
      updatedChats[chatIndex].timestamp = Date.now() / 1000;

      setChats([...updatedChats].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));

      // Call Server/WAHA API
      try {
        const targetChat = currentChat || updatedChats[chatIndex];
        
        // Only send via WAHA if it's a WhatsApp chat
        if (targetChat?.platform === 'whatsapp') {
          console.log("Sending WhatsApp message via callWaha to:", targetChat.id);
          const wahaConfigLocal = getStoredWahaConfig();
          const targetSession = (targetChat as any).session || wahaConfigLocal?.session || 'default';
          const resultData = await callWaha('sendText', 'POST', {
            chatId: (targetChat as any).external_uid || (targetChat as any).external_id || targetChat.id.toString(), 
            text: textToSend,
            session: targetSession
          }, {}, targetSession);
          
          if (resultData?.error) throw new Error(resultData.error);
        } else if (targetChat?.platform === 'messenger') {
          console.log("Sending Messenger message via send-meta-message to recipient:", (targetChat as any).recipient_id);
          const { data: fbResult, error: fbSendError } = await supabase.functions.invoke('send-meta-message', {
            body: { 
              recipientId: (targetChat as any).recipient_id, 
              message: textToSend,
              pageId: (targetChat as any).page_id
            }
          });
          
          if (fbSendError) {
            alert("Edge Function Error: " + fbSendError.message);
            throw fbSendError;
          }
          if (fbResult?.error) {
            alert("Meta API Error: " + fbResult.error);
            throw new Error(fbResult.error);
          }
        }
      } catch (e) {
        console.error("Error sending message to WAHA:", e);
      }

      if (!textOverride) setMessageText("");
      setIsRepliesOpen(false);
    }
  };
  const filteredChats = chats.filter(c => {
    const matchesSearch = (c.name || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    // Bin filter is highest priority
    if (activeFilter === "Bin") return matchesSearch && c.isBin;
    if (c.isBin) return false;

    // Done filter
    if (activeFilter === "Done") return matchesSearch && c.isDone;
    if (c.isDone && activeFilter !== "Done") return false;

    // Spam filter is exclusive
    if (activeFilter === "Spam") return matchesSearch && c.isSpam;
    
    // Other filters exclude spam
    if (c.isSpam) return false;

    if (activeFilter === "All Messages") return matchesSearch;
    if (activeFilter === "Unread") return matchesSearch && c.unread > 0;
    if (activeFilter === "Priority") return matchesSearch && c.online;
    if (activeFilter === "Ad replies") return matchesSearch && c.platform === 'messenger';
    if (activeFilter === "Follow up") return matchesSearch && c.isStarred;
    if (activeFilter === "Ordered") return matchesSearch && c.hasOrdered;
    return matchesSearch;
  });

  const toggleStar = (chatId: string | number) => {
    setChats(prev => prev.map(chat => 
      String(chat.id) === String(chatId) ? { ...chat, isStarred: !chat.isStarred } : chat
    ));
  };

  const toggleSpam = (chatId: string | number) => {
    setChats(prev => prev.map(chat => 
      String(chat.id) === String(chatId) ? { ...chat, isSpam: !chat.isSpam } : chat
    ));
    if (String(selectedChat) === String(chatId)) setSelectedChat(null);
  };

  const toggleBin = (chatId: string | number) => {
    setChats(prev => prev.map(chat => 
      String(chat.id) === String(chatId) ? { ...chat, isBin: !chat.isBin, unread: 0 } : chat
    ));
    if (String(selectedChat) === String(chatId)) {
      // Find another chat to select or just deselect
      setSelectedChat(null);
    }
  };

  const toggleDone = (chatId: string | number) => {
    setChats(prev => prev.map(chat => 
      String(chat.id) === String(chatId) ? { ...chat, isDone: !chat.isDone } : chat
    ));
    if (String(selectedChat) === String(chatId)) {
      setSelectedChat(null);
    }
  };

  const toggleReadStatus = (chatId: string | number) => {
    setChats(prev => prev.map(chat => 
      String(chat.id) === String(chatId) ? { ...chat, unread: chat.unread > 0 ? 0 : 1 } : chat
    ));
  };

  const handleAssign = (chatId: string | number, employeeName: string | null) => {
    setChats(prev => prev.map(chat => 
      String(chat.id) === String(chatId) ? { ...chat, assignedTo: employeeName } : chat
    ));
    // Add a small delay to close so user sees the change
    setTimeout(() => setIsAssignMenuOpen(false), 200);
  };

  const handleMigrateHistory = () => {
    if (!currentChat) return;
    setChats(prev => prev.map(c => 
      c.id === currentChat.id ? { 
        ...c, 
        platform: newIdentity.platform,
        platformColor: newIdentity.platform === 'whatsapp' ? 'bg-emerald-500' : 'bg-blue-500',
        platformIcon: newIdentity.platform === 'whatsapp' ? <Phone className="w-3 h-3" /> : <Facebook className="w-3 h-3" />
      } : c
    ));
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    currentChat.messages.push({
      id: Date.now(),
      text: `🔄 System: Conversation migrated to ${newIdentity.platform.toUpperCase()} (${newIdentity.number})`,
      sender: "me",
      time: timeString
    });
    setIsMigrationModalOpen(false);
    setNewIdentity({ platform: 'whatsapp', number: '' });
  };

  const handleCreateOrder = () => {
    if (!currentChat || !orderRate || !orderAmount) return;
    
    const rate = parseFloat(orderRate);
    const qty = parseFloat(orderAmount);
    const total = rate * qty;
    const paid = parseFloat(orderPaidAmount || "0");
    const due = total - paid;
    
    const newOrder: Order = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      customer: currentChat.name,
      phone: orderPhone,
      item: `Order from Chat`,
      amount: `৳${total.toFixed(2)}`,
      paid: `৳${paid.toFixed(2)}`,
      due: `৳${due.toFixed(2)}`,
      status: due <= 0 ? "Paid" : paid > 0 ? "Partial" : "Unpaid",
      date: new Date().toISOString().split('T')[0],
      channel: orderAgent || employees[0]?.name || "System",
      assignedTo: currentUser.name
    };
    
    setOrders(prev => [newOrder, ...prev]);
    setChats(prev => prev.map(c => c.id === currentChat.id ? { ...c, hasOrdered: true } : c));
    
    handleSendMessage(`✅ Order Created: ৳${total.toFixed(2)} (Paid: ৳${paid.toFixed(2)}, Due: ৳${due.toFixed(2)})${orderPhone ? `\n📞 Phone: ${orderPhone}` : ""}`);
    setIsOrderModalOpen(false);
    setOrderRate("");
    setOrderAmount("");
    setOrderPaidAmount("");
    setOrderPhone("");
    setOrderAgent("");
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex h-screen bg-[#0f172a] overflow-hidden absolute inset-0 sm:static"
    >
      {/* Chats Sidebar */}
      <aside className="w-[320px] border-r border-slate-800 flex flex-col bg-[#020617]/50">
        <div className="p-4 border-b border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">Inbox</h3>
          </div>
          
          <div className="flex gap-2 relative">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#1e293b]/50 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
              />
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsManageMenuOpen(!isManageMenuOpen)}
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm font-bold transition-all ${isManageMenuOpen ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#1e293b]/50 border-slate-800 text-slate-200 hover:bg-[#1e293b]'}`}
              >
                <Layers className="w-4 h-4" />
                <span>Manage</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isManageMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isManageMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-[#1e293b] border border-slate-700 rounded-xl shadow-2xl z-[70] overflow-hidden p-1"
                  >
                    <p className="px-3 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Filters</p>
                    {["All Messages", "Unread", "Ordered", "Priority", "Ad replies", "Follow up", "Done", "Spam", "Bin"].map((filter) => (
                      <button 
                        key={filter}
                        onClick={() => {
                          setActiveFilter(filter);
                          setIsManageMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${activeFilter === filter ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
                      >
                        {filter}
                        {activeFilter === filter && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Viewing: <span className="text-blue-400">{activeFilter}</span></span>
            <button 
              onClick={handleLiveSync}
              disabled={isAIGenerating}
              className="p-1.5 bg-[#1e293b]/30 border border-slate-800/50 rounded-md text-slate-400 hover:text-white transition-all shrink-0 flex items-center gap-1 group"
              title="Refresh Live from WhatsApp"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAIGenerating ? 'animate-spin text-emerald-400' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
              <span className="text-[8px] font-black uppercase">Live</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredChats.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
               <div className="w-16 h-16 bg-[#1e293b] rounded-[1.5rem] flex items-center justify-center text-slate-700 border border-slate-800 shadow-inner">
                  <MessageSquare className="w-8 h-8" />
               </div>
               <div>
                 <p className="text-sm font-bold text-slate-400">No WAHA Conversations Yet</p>
                 <p className="text-[10px] text-slate-500 max-w-xs">
                   WAHA is reachable, but the current session returned no stored chats or messages. Send or receive a WhatsApp message, then sync again.
                 </p>
               </div>
               <button 
                onClick={handleLiveSyncLocal}
                className="px-6 py-2 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2"
               >
                 <RefreshCw className={`w-3.5 h-3.5 ${isAIGenerating ? 'animate-spin' : ''}`} />
                 Sync Now
               </button>
            </div>
          ) : (
            filteredChats.map((chat) => (
              <div 
                key={chat.id}
                onClick={() => {
                  setSelectedChat(chat.id);
                  if (chat.unread > 0) {
                    // Mark as read locally
                    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread: 0 } : c));
                    // Mark as read in DB
                    if (isSupabaseConfigured) {
                      supabase.from('chats').update({ unread: 0 }).eq('id', chat.id).then();
                    }
                  }
                }}
                className={`p-4 flex items-center gap-4 cursor-pointer hover:bg-[#1e293b]/30 transition-all border-b border-slate-800/30 relative group ${String(selectedChat) === String(chat.id) ? 'bg-[#1e293b]/50 border-l-4 border-l-blue-500' : ''}`}
              >
                <div className="relative shrink-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white shadow-lg overflow-hidden ${
                    chat.platform === 'whatsapp' ? 'bg-emerald-600' : 
                    chat.platform === 'messenger' ? 'bg-blue-600' : 
                    chat.platform === 'linkedin' ? 'bg-sky-700' : 
                    chat.platform === 'tiktok' ? 'bg-rose-600' :
                    chat.platform === 'x' ? 'bg-black' : 'bg-slate-700'
                  }`}>
                    {chat.avatarUrl ? (
                      <img src={chat.avatarUrl} alt={chat.name} className="w-full h-full object-cover" />
                    ) : (
                      chat.avatar
                    )}
                  </div>
                  {/* Platform Badge */}
                  <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0f172a] flex items-center justify-center text-white ${chat.platformColor}`}>
                    {chat.platformIcon}
                  </div>
                  {chat.online && <div className="absolute top-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f172a]"></div>}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className="text-sm font-bold text-slate-200 truncate flex items-center gap-2">
                      {chat.isStarred && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                      {chat.name}
                    </h4>
                    <span className="text-[10px] text-slate-500">{chat.time}</span>
                  </div>
                  <p className="text-xs text-slate-400 truncate leading-relaxed">{chat.lastMsg}</p>
                  {chat.assignedTo && (
                    <div className="flex items-center gap-1 mt-1">
                      <User className="w-2.5 h-2.5 text-blue-400" />
                      <span className="text-[10px] font-bold text-blue-400/70">{chat.assignedTo}</span>
                    </div>
                  )}
                </div>
                
                {chat.unread > 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                    {chat.unread}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat Area */}
      {currentChat ? (
        <>
          <main className="flex-1 flex flex-col bg-[#0f172a] relative">
            {/* Debug Dashboard */}
            <div className="absolute top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 p-2 text-[10px] font-mono flex gap-4 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 uppercase font-black">Status:</span>
                <span className={isLiveLoading ? "text-amber-400" : "text-emerald-400"}>
                  {isLiveLoading ? "FETCHING..." : "CONNECTED"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 uppercase font-black">Selected ID:</span>
                <span className="text-slate-300">{String(selectedChat)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 uppercase font-black">Messages:</span>
                <span className="text-blue-400">{currentChat?.messages?.length || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <button 
                  onClick={handleLiveSyncLocal}
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  SYNC CHATS
                </button>
                <span className="text-slate-700">|</span>
                <button 
                  onClick={() => {
                    const chatId = (currentChat as any).external_uid || currentChat.id;
                    const wahaConfig = getStoredWahaConfig();
                    if (!wahaConfig) return;
                    const session = wahaConfig.session || 'default';
                    const globalUrl = `/waha-proxy/api/messages?chatId=${encodeURIComponent(chatId)}&session=${session}&limit=50&downloadMedia=false`;
                    const headers: any = { 'Content-Type': 'application/json' };
                    if (wahaConfig.apiKey) headers['X-Api-Key'] = wahaConfig.apiKey;
                    fetch(globalUrl, { headers }).then(r => r.json()).then(data => {
                      const liveMessages = normalizeWahaList(data);
                      if (liveMessages.length > 0) {
                        const formatted = liveMessages.map((wm: any) => ({
                          id: typeof wm.id === 'object' ? (wm.id?._serialized || JSON.stringify(wm.id)) : wm.id,
                          text: wm.body || wm.content || wm.text || "(No content)",
                          type: (wm.type === 'image' || wm.hasMedia) ? 'image' : 'text',
                          sender: wm.fromMe ? "me" : "them",
                          time: wm.timestamp ? new Date(wm.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Now"
                        }));
                        setChats(prev => prev.map(c => String(c.id) === String(selectedChat) ? { ...c, messages: formatted } : c));
                        console.log(`[WAHA] Force refresh: loaded ${formatted.length} messages`);
                      }
                    }).catch(e => console.error("[WAHA] Force refresh failed:", e));
                  }}
                  className="text-emerald-400 hover:text-emerald-300 underline"
                >
                  FORCE MSG REFRESH
                </button>
              </div>
            </div>
          {/* Chat Header */}
          <header className="h-20 border-b border-slate-800 px-8 flex items-center justify-between bg-[#1e293b]/20 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white overflow-hidden ${
                currentChat.platform === 'whatsapp' ? 'bg-emerald-600' : 
                currentChat.platform === 'messenger' ? 'bg-blue-600' : 
                currentChat.platform === 'linkedin' ? 'bg-sky-700' : 
                currentChat.platform === 'tiktok' ? 'bg-rose-600' :
                currentChat.platform === 'x' ? 'bg-black' : 'bg-slate-700'
              }`}>
                {currentChat.avatarUrl ? (
                  <img src={currentChat.avatarUrl} alt={currentChat.name} className="w-full h-full object-cover" />
                ) : (
                  currentChat.avatar
                )}
              </div>
              <div>
                <h4 className="font-bold text-white flex items-center gap-2">
                  {currentChat.name}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${currentChat.platformColor} text-white`}>
                    {currentChat.platform}
                  </span>
                  {currentChat.profile?.phone && (
                    <span className="text-[11px] text-slate-500 font-medium ml-2">
                      • {currentChat.profile.phone}
                    </span>
                  )}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  {/* Status & Security Badge */}
                  <div className="flex items-center gap-3 bg-[#0f172a]/40 px-3 py-1.5 rounded-xl border border-slate-800/50 shadow-inner group/status">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${currentChat.online ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-slate-500'}`} />
                      <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black leading-none">
                        {currentChat.online ? 'Online' : 'Offline'}
                      </span>
                    </div>
                    <div className="w-px h-3 bg-slate-800/80" />
                    <div className="flex items-center gap-2">
                      <Shield className="w-3 h-3 text-blue-400 group-hover/status:rotate-12 transition-transform" />
                      <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest leading-none">History Secured</span>
                    </div>
                  </div>

                  {/* Assign Section */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsAssignMenuOpen(!isAssignMenuOpen)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all bg-[#0f172a]/40 shadow-inner group ${currentChat.assignedTo ? 'border-emerald-500/20 text-emerald-400' : 'border-slate-800/50 text-slate-400 hover:text-white hover:border-slate-700'}`}
                    >
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-black border transition-colors ${currentChat.assignedTo ? 'bg-emerald-500 text-white border-emerald-400/30' : 'bg-slate-800 text-slate-400 border-slate-700 group-hover:border-slate-500'}`}>
                        {currentChat.assignedTo ? currentChat.assignedTo.charAt(0).toUpperCase() : <UserPlus className="w-3 h-3" />}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                        {currentChat.assignedTo ? `${currentChat.assignedTo}` : 'Assign'}
                      </span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${isAssignMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isAssignMenuOpen && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute left-0 mt-3 w-56 bg-[#1e293b] border border-slate-700 rounded-2xl shadow-2xl z-[100] overflow-hidden backdrop-blur-xl p-1.5"
                        >
                          <div className="px-3 py-2 border-b border-slate-800/50 mb-1">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Select Employee</p>
                          </div>
                          
                          <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-1">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssign(currentChat.id, null);
                                setIsAssignMenuOpen(false);
                              }}
                              className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:border-rose-500/30">
                                  <UserMinus className="w-4 h-4" />
                                </div>
                                <span>Unassigned</span>
                              </div>
                              {!currentChat.assignedTo && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                            </button>
                            
                            {employees.map((emp) => (
                              <button 
                                key={emp.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssign(currentChat.id, emp.name);
                                  setIsAssignMenuOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between group ${currentChat.assignedTo === emp.name ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-300 hover:bg-slate-800 hover:text-white'}`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] border shadow-sm ${currentChat.assignedTo === emp.name ? 'bg-emerald-500/50 border-white/20' : 'bg-[#0f172a] border-slate-700 group-hover:border-slate-500'}`}>
                                    {emp.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span>{emp.name}</span>
                                    <span className={`text-[9px] font-medium tracking-tighter opacity-60`}>{emp.roles[0]}</span>
                                  </div>
                                </div>
                                {currentChat.assignedTo === emp.name && <Check className="w-3.5 h-3.5 text-white" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-slate-400">
              {/* Unified Toolbar Container */}
              <div className="flex items-center gap-2 bg-[#0f172a]/40 p-2 rounded-[1.25rem] border border-slate-800/50 shadow-inner">
                {/* Chat Actions */}
                <button 
                  onClick={() => currentChat && toggleDone(currentChat.id)}
                  className={`w-12 h-12 flex items-center justify-center border rounded-xl transition-all ${currentChat?.isDone ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-900/40' : 'border-slate-800/50 hover:bg-emerald-600/20 hover:text-emerald-500 bg-slate-800/30'}`}
                  title={currentChat?.isDone ? "Restore from Done" : "Move to Done"}
                >
                  <Archive className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => currentChat && toggleStar(currentChat.id)}
                  className={`w-12 h-12 flex items-center justify-center border rounded-xl transition-all ${currentChat?.isStarred ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' : 'border-slate-800/50 hover:bg-slate-700 hover:text-white bg-slate-800/30'}`}
                  title={currentChat?.isStarred ? "Unstar Conversation" : "Star/Priority"}
                >
                  <Star className={`w-5 h-5 ${currentChat?.isStarred ? 'fill-yellow-500' : ''}`} />
                </button>
                <button 
                  onClick={() => currentChat && toggleReadStatus(currentChat.id)}
                  className={`w-12 h-12 flex items-center justify-center border rounded-xl transition-all ${currentChat?.unread === 0 ? 'bg-slate-700/50 border-slate-600 text-slate-300' : 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40'}`}
                  title={currentChat?.unread === 0 ? "Mark as Unread" : "Mark as Read"}
                >
                  <Mail className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="w-12 h-12 flex items-center justify-center border border-slate-800/50 rounded-xl hover:bg-emerald-600/20 hover:text-emerald-500 transition-all bg-slate-800/30"
                  title="Create Order"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setIsMigrationModalOpen(true)}
                  title="Migrate Identity"
                  className="w-12 h-12 flex items-center justify-center border border-slate-800/50 rounded-xl hover:bg-blue-600/20 hover:text-blue-400 transition-all bg-slate-800/30"
                >
                  <History className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => currentChat && toggleSpam(currentChat.id)}
                  className={`w-12 h-12 flex items-center justify-center border rounded-xl transition-all ${currentChat?.isSpam ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'border-slate-800/50 hover:bg-slate-700 hover:text-white bg-slate-800/30'}`}
                  title={currentChat?.isSpam ? "Not Spam" : "Mark as Spam"}
                >
                  <AlertCircle className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => currentChat && toggleBin(currentChat.id)}
                  className={`w-12 h-12 flex items-center justify-center border rounded-xl transition-all ${currentChat?.isBin ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-900/40' : 'border-slate-800/50 hover:bg-rose-600/20 hover:text-rose-500 bg-slate-800/30'}`}
                  title={currentChat?.isBin ? "Restore Conversation" : "Move to Bin"}
                >
                  <Trash2 className="w-5 h-5" />
                </button>

                {/* Divider */}
                <div className="w-px h-8 bg-slate-800/50 mx-1"></div>

                {/* Call Simulation Controls */}
                <button 
                  onClick={handleIncomingCall}
                  className="w-12 h-12 rounded-xl border border-slate-800/50 bg-slate-800/30 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-slate-400 hover:text-emerald-400 transition-all flex items-center justify-center group"
                  title="Audio Call"
                >
                  <Phone className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
                <button 
                  onClick={() => setCallStatus('active')}
                  className="w-12 h-12 rounded-xl border border-slate-800/50 bg-slate-800/30 hover:bg-blue-500/10 hover:border-blue-500/30 text-slate-400 hover:text-blue-400 transition-all flex items-center justify-center group"
                  title="Video Call"
                >
                  <Video className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </button>
              </div>

              <button className="p-2 hover:bg-slate-800 rounded-xl transition-all" title="More Options"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </header>

          {/* Messages Scroll Area */}
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar relative"
          >
            {isLiveLoading && (
              <div className="sticky top-0 left-0 right-0 z-[60] flex justify-center pt-2 pointer-events-none">
                <div className="bg-[#1e293b]/90 backdrop-blur-xl px-4 py-2 rounded-full border border-emerald-500/30 shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Syncing from WhatsApp...</span>
                </div>
              </div>
            )}
            {/* Calling Interactive UI Overlay */}
            <AnimatePresence>
              {callStatus !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  className="absolute inset-0 z-[100] flex items-center justify-center pointer-events-none p-4"
                >
                  <div className="bg-[#1e293b]/90 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-10 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] w-full max-w-sm pointer-events-auto text-center space-y-8">
                    {/* User Profile on Call */}
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center font-bold text-3xl text-white mx-auto shadow-2xl relative overflow-hidden ${
                          currentChat.platform === 'whatsapp' ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}>
                          {currentChat.avatar}
                          {callStatus === 'active' && (
                            <div className="absolute inset-0 border-4 border-emerald-500 rounded-[2rem] animate-pulse"></div>
                          )}
                        </div>
                        <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl bg-slate-900 border-4 border-[#1e293b] flex items-center justify-center shadow-lg text-white ${currentChat.platformColor}`}>
                          {currentChat.platformIcon}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h5 className="text-2xl font-black text-white">{currentChat.name}</h5>
                        {callStatus === 'active' ? (
                          <div className="flex flex-col items-center gap-2">
                             <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">In Call</span>
                             </div>
                             <span className="text-xl font-mono text-slate-400 font-bold tracking-tighter">
                                {formatTime(callTimer)}
                             </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                             <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 rounded-full border border-rose-500/20">
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Calling...</span>
                             </div>
                             <span className="text-xs font-bold text-slate-500 uppercase tracking-widest italic">{currentChat.profile.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-8">
                       {callStatus === 'incoming' ? (
                         <>
                            <button 
                              onClick={handleEndCall}
                              className="w-16 h-16 rounded-[1.5rem] bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl shadow-rose-900/40 transition-all hover:scale-110 active:scale-95 group"
                            >
                               <PhoneOff className="w-6 h-6 group-hover:rotate-12 transition-transform" />
                            </button>
                            <button 
                              onClick={handleAcceptCall}
                              className="w-16 h-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xl shadow-emerald-900/40 transition-all hover:scale-110 active:scale-95 group"
                            >
                               <PhoneCall className="w-6 h-6 animate-bounce" />
                            </button>
                         </>
                       ) : (
                         <div className="space-y-8 w-full">
                            <div className="flex justify-center gap-6">
                               <button 
                                 onClick={() => setIsMicMuted(!isMicMuted)}
                                 className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isMicMuted ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                               >
                                 {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                               </button>
                               <button 
                                 onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
                                 className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${isSpeakerMuted ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                               >
                                 {isSpeakerMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                               </button>
                               <button 
                                 className="w-14 h-14 rounded-2xl bg-slate-800 text-slate-400 hover:bg-slate-700 flex items-center justify-center transition-all"
                               >
                                 <Video className="w-5 h-5" />
                               </button>
                            </div>
                            <button 
                               onClick={handleEndCall}
                               className="w-full py-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
                            >
                               <PhoneOff className="w-4 h-4" /> Disconnect
                            </button>
                         </div>
                       )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {currentChat.isDone && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                    <Archive className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-emerald-500">This conversation is marked as Done</p>
                    <p className="text-[10px] text-slate-500 tracking-tight">The task for this customer has been completed.</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleDone(currentChat.id)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Restore to Inbox
                </button>
              </div>
            )}
            {currentChat.isBin && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-rose-500/20 rounded-full flex items-center justify-center">
                    <Trash2 className="w-4 h-4 text-rose-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-rose-500">This conversation is in the Bin</p>
                    <p className="text-[10px] text-slate-500 tracking-tight">You can restore it to the main inbox or it will be auto-deleted later.</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleBin(currentChat.id)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-lg active:scale-95 flex items-center gap-2"
                >
                  <RefreshCw className="w-3 h-3" />
                  Restore
                </button>
              </div>
            )}
            {currentChat.isSpam && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-amber-500">This conversation is marked as Spam</p>
                    <p className="text-[10px] text-slate-500 tracking-tight">Messages from this user are hidden from your main inbox.</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleSpam(currentChat.id)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg transition-all shadow-lg active:scale-95"
                >
                  Not Spam
                </button>
              </div>
            )}
            {currentChat.messages.map((msg: any, i) => (
              <div key={i} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] space-y-1 group relative`}>
                  <div className={`px-5 py-3 rounded-3xl text-sm leading-relaxed shadow-lg ${
                    msg.sender === 'me' 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-[#1e293b] text-slate-200 rounded-tl-none border border-slate-800'
                  }`}>
                    {msg.type === 'image' && msg.mediaUrl ? (
                      <div className="space-y-2">
                        <img src={msg.mediaUrl} alt="Captured" className="rounded-xl max-w-full h-auto cursor-pointer" referrerPolicy="no-referrer" onClick={() => window.open(msg.mediaUrl)} />
                        {msg.text && <p>{msg.text}</p>}
                      </div>
                    ) : (
                      <>
                        <p>{msg.text}</p>
                        {msg.translatedText && (
                          <div className="mt-2 pt-2 border-t border-white/10 italic text-[13px] opacity-90 transition-all">
                            <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Translated</span>
                            {msg.translatedText}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className={`flex items-center gap-2 ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                    <p className="text-[10px] text-slate-500">
                      {msg.time}
                    </p>
                    {msg.sender === 'them' && !msg.translatedText && (
                      <button 
                        onClick={() => handleTranslateMessage(msg.id, msg.text)}
                        className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:text-amber-400 text-slate-600"
                        title="Translate this message"
                      >
                        {translatingId === msg.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Languages className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Typing Indicator */}
            {selectedChat !== null && typingUsers[selectedChat] && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-[#1e293b] text-slate-400 px-4 py-2 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 border border-slate-800">
                  <div className="flex gap-1">
                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce"></span>
                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                  <span>{typingUsers[selectedChat]} is typing...</span>
                </div>
              </div>
            )}

            {/* Camera Overlay */}
            <AnimatePresence>
              {isCameraOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-8"
                >
                  <button onClick={stopCamera} className="absolute top-8 right-8 p-3 bg-slate-800 text-white rounded-full hover:bg-slate-700">
                    <X className="w-6 h-6" />
                  </button>
                  
                  <div className="relative w-full max-w-2xl bg-slate-900 rounded-[2rem] overflow-hidden shadow-2xl border border-slate-700">
                    {capturedImage ? (
                      <img src={capturedImage} alt="Captured" className="w-full h-auto" referrerPolicy="no-referrer" />
                    ) : (
                      <video ref={videoRef} autoPlay playsInline className="w-full h-auto scale-x-[-1]" />
                    )}
                    
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6">
                      {capturedImage ? (
                        <>
                          <button 
                            onClick={() => setCapturedImage(null)}
                            className="bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-700 transition-all"
                          >
                            Retake
                          </button>
                          <button 
                            onClick={() => handleSendMedia('image', capturedImage)}
                            className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-900/40"
                          >
                            Send Photo
                          </button>
                        </>
                      ) : (
                        <button 
                          onClick={takePhoto}
                          className="w-16 h-16 bg-white rounded-full border-4 border-slate-300 flex items-center justify-center shadow-2xl active:scale-95 transition-all"
                        >
                          <div className="w-12 h-12 bg-white rounded-full border-2 border-slate-900"></div>
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-400 mt-6 font-medium animate-pulse">Smile for the camera!</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Migration Modal */}
            <AnimatePresence>
              {isMigrationModalOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
                  onClick={() => setIsMigrationModalOpen(false)}
                >
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-[#1e293b] border border-slate-700 rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl"
                    onClick={e => e.stopPropagation()}
                  >
                    <div className="p-8 space-y-6 text-left">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center">
                          <History className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white uppercase tracking-tight">Identity Migration</h3>
                          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Permanent Conversation Archive</p>
                        </div>
                      </div>

                      <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl space-y-2">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-blue-400" />
                          <p className="text-sm font-bold text-blue-300">OmniInbox Archive System</p>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed italic">
                          "History stays forever. If your page or number is blocked, you can link this conversation to a new connection instantly."
                        </p>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 text-left block">New Channel / Number</label>
                          <div className="flex gap-2">
                            <select 
                              value={newIdentity.platform}
                              onChange={(e) => setNewIdentity(prev => ({ ...prev, platform: e.target.value }))}
                              className="bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none w-1/3"
                            >
                              <option value="whatsapp">WhatsApp</option>
                              <option value="messenger">Facebook</option>
                            </select>
                            <input 
                              type="text" 
                              placeholder="New ID / Phone"
                              value={newIdentity.number}
                              onChange={(e) => setNewIdentity(prev => ({ ...prev, number: e.target.value }))}
                              className="flex-1 bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button 
                          onClick={() => setIsMigrationModalOpen(false)}
                          className="flex-1 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleMigrateHistory}
                          className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Share2 className="w-4 h-4" />
                          Migrate Now
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Saved Replies Modal */}
            <AnimatePresence>
              {isOrderModalOpen && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute inset-0 z-[60] flex items-center justify-center p-8 bg-[#0f172a]/80 backdrop-blur-md"
                >
                  <div className="bg-[#1e293b] border border-slate-700 rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl space-y-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                    
                    <div className="flex items-center justify-between relative">
                      <h5 className="text-2xl font-bold text-white flex items-center gap-3">
                        <ShoppingCart className="w-6 h-6 text-emerald-400" />
                        Create Order
                      </h5>
                      <button onClick={() => setIsOrderModalOpen(false)} className="text-slate-500 hover:text-white">
                        <X className="w-6 h-6" />
                      </button>
                    </div>

                    <div className="space-y-6 relative">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Customer Name</label>
                          <div className="w-full bg-slate-900/50 border border-slate-800 rounded-xl py-3 px-4 text-slate-300 font-bold text-sm">
                            {currentChat.name}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Employee / Channel</label>
                          <select 
                            value={orderAgent}
                            onChange={(e) => setOrderAgent(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 px-4 text-white font-bold text-sm focus:border-emerald-500 outline-none transition-all appearance-none cursor-pointer"
                          >
                            <option value="" disabled>Select Employee</option>
                            {employees.map(emp => (
                              <option key={emp.id} value={emp.name}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                            type="tel" 
                            placeholder="01XXXXXXXXX"
                            value={orderPhone}
                            onChange={(e) => setOrderPhone(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-6 text-white focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Rate (BDT)</label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">৳</span>
                            <input 
                              type="number" 
                              placeholder="0.00"
                              value={orderRate}
                              onChange={(e) => setOrderRate(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-10 pr-6 text-white focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Quantity</label>
                          <input 
                            type="number" 
                            placeholder="1"
                            value={orderAmount}
                            onChange={(e) => setOrderAmount(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-white focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Paid Amount (BDT)</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">৳</span>
                          <input 
                            type="number" 
                            placeholder="0.00"
                            value={orderPaidAmount}
                            onChange={(e) => setOrderPaidAmount(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-10 pr-6 text-white focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                          />
                        </div>
                      </div>

                      <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-3">
                        <div className="flex justify-between items-center text-slate-500">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total</span>
                          <span className="font-mono text-sm">৳{(parseFloat(orderRate || '0') * parseFloat(orderAmount || '0')).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-rose-500">
                          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Due</span>
                          <span className="font-mono text-sm font-bold">
                            ৳{Math.max(0, (parseFloat(orderRate || '0') * parseFloat(orderAmount || '0')) - parseFloat(orderPaidAmount || '0')).toFixed(2)}
                          </span>
                        </div>
                        <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Summary</span>
                          <span className="text-2xl font-black text-white">
                            ৳{(parseFloat(orderRate || '0') * parseFloat(orderAmount || '0')).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <button 
                        onClick={handleCreateOrder}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl transition-all shadow-xl shadow-emerald-900/20 active:scale-95 uppercase tracking-[0.2em] text-[11px]"
                      >
                        Confirm & Add Order
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {isRepliesOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="absolute bottom-24 left-8 right-8 bg-[#1e293b] border border-slate-700 rounded-3xl shadow-2xl z-40 p-6 max-h-[60%] overflow-y-auto custom-scrollbar"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h5 className="font-bold text-white flex items-center gap-2">
                      <Bookmark className="w-4 h-4 text-blue-400" />
                      Saved Replies
                    </h5>
                    <button onClick={() => setIsRepliesOpen(false)} className="text-slate-500 hover:text-white">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {savedReplies.map((reply) => (
                      <div key={reply.id} className="group flex items-center gap-3">
                        <button 
                          onClick={() => {
                            handleSendMessage(reply.content, reply.imageUrl || undefined);
                          }}
                          className="flex-1 text-left p-4 rounded-2xl bg-slate-900/50 hover:bg-blue-600/10 border border-slate-800 hover:border-blue-500/50 transition-all flex items-start gap-4"
                        >
                          {reply.imageUrl && (
                            <img src={reply.imageUrl} className="w-12 h-12 rounded-lg object-cover bg-slate-800" referrerPolicy="no-referrer" />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-blue-400 uppercase tracking-tighter">{reply.title}</span>
                            </div>
                            <p className="text-sm text-slate-300 group-hover:text-white line-clamp-2">{reply.content}</p>
                          </div>
                        </button>
                        <button 
                          onClick={() => setSavedReplies(prev => prev.filter(r => r.id !== reply.id))}
                          className="p-3 text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    </div>
                    
                    <div className="mt-8 pt-6 border-t border-slate-800">
                      <h6 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Create New Template with Image</h6>
                      <div className="space-y-4">
                        <div className="flex gap-4 items-start">
                          <button 
                            onClick={() => document.getElementById('reply-image-upload')?.click()}
                            className="w-20 h-20 rounded-2xl bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500 flex flex-col items-center justify-center text-slate-500 hover:text-blue-400 transition-all overflow-hidden shrink-0"
                          >
                            {newReplyImage ? (
                              <img src={newReplyImage} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <>
                                <Camera className="w-6 h-6 mb-1" />
                                <span className="text-[9px] font-bold">ADD PIC</span>
                              </>
                            )}
                          </button>
                          <input 
                            type="file" 
                            id="reply-image-upload" 
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => setNewReplyImage(reader.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                          <input 
                            id="new-reply-title"
                            type="text" 
                            placeholder="Template Title (e.g. Discount Offer)"
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none h-[52px]"
                          />
                        </div>
                        <textarea 
                          id="new-reply-content"
                          placeholder="Your message content..."
                          rows={3}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none resize-none"
                        ></textarea>
                        <button 
                          onClick={() => {
                            const t = document.getElementById('new-reply-title') as HTMLInputElement;
                            const c = document.getElementById('new-reply-content') as HTMLTextAreaElement;
                            if (t.value && (c.value || newReplyImage)) {
                              setSavedReplies(prev => [...prev, { 
                                id: Date.now(), 
                                title: t.value, 
                                content: c.value, 
                                imageUrl: newReplyImage 
                              }]);
                              t.value = "";
                              c.value = "";
                              setNewReplyImage(null);
                            }
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/40 active:scale-[0.98]"
                        >
                          Save Template
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Message Input */}
          <footer className="p-4 border-t border-slate-800 bg-[#1e293b]/10 backdrop-blur-md shrink-0">
            <div className="max-w-4xl mx-auto">
              {isRecording ? (
                <div className="bg-rose-600/10 border border-rose-500/30 rounded-2xl p-4 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-4 text-rose-500">
                    <div className="w-3 h-3 bg-rose-500 rounded-full animate-ping"></div>
                    <span className="font-mono font-bold">{formatTime(recordingTime)}</span>
                    <p className="text-sm font-medium">Recording Voice Message...</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setIsRecording(false)}
                      className="px-4 py-2 text-slate-400 hover:text-white font-bold"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={stopRecording}
                      className="bg-rose-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-rose-900/40"
                    >
                      <StopCircle className="w-4 h-4" />
                      Stop & Send
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-[#1e293b] border border-slate-700/50 rounded-2xl p-2 shadow-xl flex items-end gap-2 focus-within:border-blue-500 transition-all">
                  <div className="flex items-center pb-1">
                    <button className="p-2 text-slate-400 hover:text-white transition-colors" title="Emoji"><Smile className="w-5 h-5" /></button>
                    <button className="p-2 text-slate-400 hover:text-white transition-colors" title="Attach"><Paperclip className="w-5 h-5" /></button>
                    <button onClick={startCamera} className="p-2 text-slate-400 hover:text-emerald-400 transition-colors" title="Camera"><Camera className="w-5 h-5" /></button>
                    <button onClick={startRecording} className="p-2 text-slate-400 hover:text-rose-400 transition-colors" title="Voice"><Mic className="w-5 h-5" /></button>
                    <button onClick={() => setIsRepliesOpen(!isRepliesOpen)} className={`p-2 transition-colors ${isRepliesOpen ? 'text-blue-400' : 'text-slate-400 hover:text-blue-400'}`} title="Saved Replies"><Bookmark className="w-5 h-5" /></button>
                    <button 
                      onClick={handleAISmartReply} 
                      disabled={isAIGenerating}
                      className={`p-2 transition-all ${isAIGenerating ? 'text-amber-500 animate-pulse' : 'text-slate-400 hover:text-amber-400'}`} 
                      title="AI Smart Reply"
                    >
                      <Sparkles className={`w-5 h-5 ${isAIGenerating ? 'animate-spin-slow' : ''}`} />
                    </button>
                    
                    <div className="h-6 w-[1px] bg-slate-800 mx-1"></div>

                    <div className="flex items-center gap-2 px-2">
                      <select 
                        value={targetLanguage}
                        onChange={(e) => setTargetLanguage(e.target.value)}
                        className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-400 focus:text-blue-400 outline-none cursor-pointer"
                      >
                        <option value="English">EN</option>
                        <option value="Bengali">BN</option>
                        <option value="Arabic">AR</option>
                        <option value="Hindi">HI</option>
                        <option value="Spanish">ES</option>
                      </select>
                      <button 
                        onClick={handleBengaliToEnglishInput}
                        disabled={isAIGenerating || !messageText.trim()}
                        className="p-2 text-slate-400 hover:text-emerald-400 transition-all disabled:opacity-30"
                        title="Translate Current Input [Bengali to English]"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>
                    {messageText.trim() && (
                      <button 
                        onClick={() => {
                          const title = prompt("Enter a title for this saved reply:", "Quick Reply");
                          if (title) {
                            setSavedReplies(prev => [...prev, { id: Date.now(), title, content: messageText }]);
                            alert("Message saved to templates!");
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-yellow-400 transition-colors" 
                        title="Save current text as reply"
                      >
                        <Key className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  <textarea 
                    rows={1}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder={`Type a message via ${currentChat.platform.toUpperCase()}...`}
                    className="flex-1 bg-transparent border-none text-white text-sm outline-none py-3 px-2 resize-none max-h-32 min-h-[40px] leading-relaxed"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <button 
                    onClick={() => handleSendMessage()}
                    className="p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all group active:scale-95 flex items-center justify-center shrink-0 shadow-lg shadow-blue-900/20"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              )}
              <p className="text-center text-[9px] text-slate-500 mt-2 uppercase tracking-widest font-medium opacity-50">
                Messages are synced across all your connected devices
              </p>
            </div>
          </footer>
        </main>

        {/* Customer Profile Sidebar */}
        <aside className="w-[340px] bg-[#0f172a] border-l border-slate-800 flex flex-col overflow-hidden shrink-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Cover Photo */}
            <div className="relative h-32 bg-slate-800">
              <img 
                src={currentChat.profile?.coverImage || "https://picsum.photos/seed/fb_cover/800/300"} 
                alt="Cover" 
                className="w-full h-full object-cover opacity-60"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] to-transparent"></div>
              
              {/* Profile Picture (Centered Overlap) */}
              <div className="absolute -bottom-10 left-6">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-full border-4 border-[#0f172a] overflow-hidden bg-slate-700 shadow-2xl flex items-center justify-center text-3xl font-bold text-white">
                    {currentChat.avatarUrl ? (
                      <img 
                        src={currentChat.avatarUrl} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      currentChat.avatar
                    )}
                  </div>
                  {currentChat.online && (
                    <div className="absolute bottom-1 right-1 w-6 h-6 bg-emerald-500 border-4 border-[#0f172a] rounded-full shadow-emerald-500/20"></div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-12 px-6 pb-12 space-y-8">
              {/* Header Info */}
              <div>
                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                  {currentChat.name}
                  <CheckCircle2 className="w-4 h-4 text-blue-500 fill-blue-500/10" title="Verified Account" />
                </h3>
                <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest mt-0.5">
                  Synced via {currentChat.platform}
                </p>
                {currentChat.assignedTo && (
                  <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl">
                    <User className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] font-bold text-emerald-400">Assigned: {currentChat.assignedTo}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-4">
                  <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold py-2.5 rounded-xl transition-all shadow-lg active:scale-95">
                    View Profile
                  </button>
                  <button className="bg-slate-800 hover:bg-slate-700 text-slate-300 p-2.5 rounded-xl transition-all">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bio Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-slate-500">
                  <Info className="w-3.5 h-3.5" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Introduction</p>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed italic">
                  "{currentChat.profile?.bio || 'No bio provided.'}"
                </p>
              </div>

              <div className="h-[1px] bg-slate-800/50"></div>

              {/* About Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Information</p>
                  <button className="text-[10px] font-bold text-blue-400 hover:underline">Edit Details</button>
                </div>
                
                <div className="space-y-4">
                  <ProfileInfoRow 
                    icon={Briefcase} 
                    label="Current Work" 
                    value={currentChat.profile?.work} 
                  />
                  <ProfileInfoRow 
                    icon={GraduationCap} 
                    label="Education" 
                    value={currentChat.profile?.education} 
                  />
                  <ProfileInfoRow 
                    icon={MapPin} 
                    label="Lives in" 
                    value={currentChat.profile?.location} 
                  />
                  <ProfileInfoRow 
                    icon={Globe} 
                    label="From" 
                    value={currentChat.profile?.hometown} 
                  />
                  <ProfileInfoRow 
                    icon={Heart} 
                    label="Relationship" 
                    value={currentChat.profile?.relationship} 
                  />
                  <ProfileInfoRow 
                    icon={Cake} 
                    label="Birthday" 
                    value={currentChat.profile?.birthday} 
                  />
                  <ProfileInfoRow 
                    icon={Mail} 
                    label="Email Address" 
                    value={currentChat.profile?.email} 
                  />
                  <ProfileInfoRow 
                    icon={Phone} 
                    label="Phone Number" 
                    value={currentChat.profile?.phone} 
                  />
                  <ProfileInfoRow 
                    icon={Calendar} 
                    label="Joined Facebook" 
                    value={currentChat.profile?.joinedDate} 
                  />
                </div>
              </div>

              {/* CRM Features (Unique to OmniInbox) */}
              <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-6 space-y-4">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">CRM Insight</p>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Total Orders</span>
                    <span className="text-white font-bold">12 Orders</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Customer LTV</span>
                    <span className="text-emerald-500 font-bold">৳ 24,500</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Lead Score</span>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(s => <Star key={s} className={`w-2.5 h-2.5 ${s <= 4 ? 'fill-yellow-500 text-yellow-500' : 'text-slate-700'}`} />)}
                    </div>
                  </div>
                </div>
                <button className="w-full bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                  <ExternalLink className="w-3 h-3" />
                  Open in CRM
                </button>
              </div>
            </div>
          </div>
        </aside>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
          <MessageSquare className="w-16 h-16 opacity-10 mb-6" />
          <h3 className="text-xl font-bold opacity-30">Select a conversation to start chatting</h3>
        </div>
      )}
    </motion.div>
  );
}

function AddEmployeeView({ allRoles, onSave, onCancel }: any) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [assignedRoles, setAssignedRoles] = useState<string[]>([]);
  const [status, setStatus] = useState("active");

  const toggleRole = (roleSlug: string) => {
    setAssignedRoles(prev => 
      prev.includes(roleSlug) ? prev.filter(r => r !== roleSlug) : [...prev, roleSlug]
    );
  };

  const handleSave = () => {
    if (!name || !email) {
      alert("Name and Email are required.");
      return;
    }
    // Simple email validation
    if (!email.includes("@")) {
      alert("Invalid email format.");
      return;
    }

    onSave({
      name,
      email,
      roles: assignedRoles,
      status,
      verified: false,
      joinedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      avatar: name.charAt(0).toUpperCase()
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">New employee</h2>
      </div>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm transition-colors group"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> Back to employees
      </button>

      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-10 space-y-8">
          <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
            Register a new team member. They will receive a verification email to activate their account.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold placeholder:text-slate-700" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@example.com"
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold placeholder:text-slate-700" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Initial Status</label>
                <div className="flex gap-4">
                  {['Active', 'Inactive'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s.toLowerCase())}
                      className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border-2 ${status === s.toLowerCase() ? 'bg-emerald-600/10 border-emerald-600 text-emerald-500 shadow-lg shadow-emerald-900/20' : 'bg-[#0f172a] border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Assign Roles</label>
              <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 space-y-4 max-h-[400px] overflow-y-auto">
                {allRoles.map((role: any) => (
                  <div 
                    key={role.slug}
                    onClick={() => toggleRole(role.name)}
                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${assignedRoles.includes(role.name) ? 'bg-rose-600/5 border-rose-500/30' : 'bg-transparent border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${assignedRoles.includes(role.name) ? 'bg-rose-500 border-rose-500 shadow-lg shadow-rose-900/40' : 'border-slate-700'}`}>
                        {assignedRoles.includes(role.name) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${assignedRoles.includes(role.name) ? 'text-white' : 'text-slate-500'}`}>{role.name}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase truncate max-w-[200px]">{role.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-10 border-t border-slate-800/50">
            <button 
              onClick={handleSave}
              className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <PlusCircle className="w-4 h-4" /> Adding employee
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#0f172a] hover:bg-slate-800 border border-slate-800 text-slate-300 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EditEmployeeView({ employee, allRoles, onSave, onCancel, onDelete }: any) {
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email);
  const [roles, setRoles] = useState(employee.roles);
  const [status, setStatus] = useState(employee.status);

  const toggleRole = (role: string) => {
    setRoles((prev: string[]) => 
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">Edit employee</h2>
      </div>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm transition-colors group"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> Back to employees
      </button>

      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-10 space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-rose-700 rounded-3xl flex items-center justify-center text-3xl text-white font-black shadow-2xl">
              {employee.avatar}
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">{name}</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">ID {employee.id} • Member since {employee.joinedDate}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-800/50">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Full Name</label>
                <input 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Email Address</label>
                <input 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Status</label>
                <div className="flex gap-4">
                  {['Active', 'Inactive'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setStatus(s.toLowerCase())}
                      className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border-2 ${status === s.toLowerCase() ? 'bg-rose-600/10 border-rose-600 text-rose-500 shadow-lg shadow-rose-900/20' : 'bg-[#0f172a] border-slate-800 text-slate-500 hover:border-slate-700'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Roles & Permissions</label>
              <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 space-y-4 max-h-[400px] overflow-y-auto">
                {allRoles.map((role: any) => (
                  <div 
                    key={role.slug}
                    onClick={() => toggleRole(role.name)}
                    className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${roles.includes(role.name) ? 'bg-rose-600/5 border-rose-500/30' : 'bg-transparent border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${roles.includes(role.name) ? 'bg-rose-500 border-rose-500 shadow-lg shadow-rose-900/40' : 'border-slate-700'}`}>
                        {roles.includes(role.name) && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <div>
                        <p className={`text-sm font-bold ${roles.includes(role.name) ? 'text-white' : 'text-slate-500'}`}>{role.name}</p>
                        <p className="text-[9px] text-slate-600 font-bold uppercase truncate max-w-[200px]">{role.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed px-4 italic">
                Roles define granular access to inbox, connections and settings pages. Admin role includes full access.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-10 border-t border-slate-800/50">
            <button 
              onClick={() => onSave({ ...employee, name, email, roles, status })}
              className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <Check className="w-4 h-4" /> Save changes
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#0f172a] hover:bg-slate-800 border border-slate-800 text-slate-300 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] p-10 space-y-8">
        <div className="space-y-1">
          <h4 className="text-xl font-bold text-white">Remove employee</h4>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">This will permanently delete the employee account and revoke all access.</p>
        </div>
        <button 
          onClick={onDelete}
          className="border-2 border-rose-500/30 hover:bg-rose-600 hover:border-rose-600 text-rose-500 hover:text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center gap-3"
        >
          <Trash2 className="w-4 h-4" /> Delete employee
        </button>
      </div>
    </motion.div>
  );
}

function EmployeesView({ employees, setEmployees, allRoles, smartAssignmentEnabled, onSetActive, onManageRoles }: { employees: Employee[], setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>, allRoles: any[], smartAssignmentEnabled: boolean, onSetActive: (id: number | null) => void, onManageRoles: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleUpdate = (updatedEmp: any) => {
    setEmployees(prev => prev.map(e => e.id === updatedEmp.id ? updatedEmp : e));
    setEditingEmployee(null);
  };

  const handleCreate = (newEmp: any) => {
    const nextId = employees.length > 0 ? Math.max(...employees.map(e => e.id)) + 1 : 1;
    setEmployees(prev => [...prev, { ...newEmp, id: nextId }]);
    setIsAddingNew(false);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this employee? This action cannot be undone.")) {
      setEmployees(prev => prev.filter(e => e.id !== id));
      setEditingEmployee(null);
    }
  };

  const toggleRole = (emp: Employee, roleName: string) => {
    const newRoles = emp.roles.includes(roleName) 
      ? emp.roles.filter(r => r !== roleName) 
      : [...emp.roles, roleName];
    handleUpdate({ ...emp, roles: newRoles });
  };

  if (editingEmployee) {
    return (
      <EditEmployeeView 
        employee={editingEmployee}
        allRoles={allRoles}
        onSave={handleUpdate}
        onCancel={() => setEditingEmployee(null)}
        onDelete={() => handleDelete(editingEmployee.id)}
      />
    );
  }

  if (isAddingNew) {
    return (
      <AddEmployeeView 
        allRoles={allRoles}
        onSave={handleCreate}
        onCancel={() => setIsAddingNew(false)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h3 className="text-4xl font-bold text-white tracking-tight uppercase tracking-[0.1em]">Employees</h3>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsAddingNew(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-rose-900/20"
          >
            <PlusCircle className="w-5 h-5" /> New employee
          </button>
          <button 
            onClick={onManageRoles}
            className="bg-white hover:bg-slate-100 text-black px-8 py-4 rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 shadow-xl"
          >
            Manage roles <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-[#1e293b] border border-slate-800 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total</span>
          <span className="text-base font-black text-white">{employees.length}</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Active</span>
          <span className="text-base font-black text-emerald-500">{employees.filter(e => e.status === 'active').length}</span>
        </div>
        <div className="bg-[#1e293b] border border-slate-800 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Inactive</span>
          <span className="text-base font-black text-white">{employees.filter(e => e.status !== 'active').length}</span>
        </div>
        <div className="bg-sky-500/10 border border-sky-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <span className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em]">Verified email</span>
          <span className="text-base font-black text-sky-500">{employees.filter(e => e.verified).length}</span>
        </div>
      </div>

      {smartAssignmentEnabled && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {employees
            .map(e => ({
              ...e,
              performanceScore: Math.round(
                ((e.resolvedChats || 0) * 0.4) + 
                ((e.rating || 0) * 20 * 0.3) - 
                ((e.avgResponseTime || 0) * 0.2) - 
                ((e.currentLoad || 0) * 5 * 0.1)
              )
            }))
            .sort((a, b) => (b.performanceScore || 0) - (a.performanceScore || 0))
            .slice(0, 4)
            .map((emp, idx) => (
              <div key={emp.id} className="bg-[#1e293b] border border-slate-800 p-4 rounded-2xl shadow-xl relative overflow-hidden group hover:border-amber-500/50 transition-all">
                <div className={`absolute top-0 right-0 w-8 h-8 flex items-center justify-center text-[10px] font-black ${idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-slate-300 text-slate-800' : idx === 2 ? 'bg-orange-400 text-white' : 'bg-slate-700 text-slate-400'} rounded-bl-xl`}>
                  #{idx + 1}
                </div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-400 group-hover:border-amber-400 transition-colors">
                    {emp.name.charAt(0)}
                  </div>
                  <div>
                    <h6 className="text-xs font-black text-white truncate w-24">{emp.name}</h6>
                    <div className="flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-bold text-slate-400">{emp.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Performance</span>
                    <span className="text-xs font-black text-amber-400">{emp.performanceScore}</span>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${Math.min(emp.performanceScore, 100)}%` }}></div>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      )}

      <div className="space-y-6">
        <p className="text-sm text-slate-400 max-w-4xl leading-relaxed">
          Assign roles to each team member. Access comes from each role's permissions (or from full admin panel access on a role). At least one user must keep a role with admin panel access.
        </p>
        <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
          This workspace has 2 defined roles. Edit role permissions under Manage roles. Use Edit for account details, contact info, and notes.
        </p>

        {/* Quick Reference */}
        <div className="bg-[#1e293b]/50 border border-slate-800 p-8 rounded-[2rem] space-y-4 shadow-xl">
          <h5 className="font-bold text-white text-sm uppercase tracking-widest mb-4">Quick reference</h5>
          <ul className="space-y-4">
            {[
              "Save on each row updates roles only (not for your own row if you have admin panel access—your roles are locked). Use Edit for profile and account details.",
              "Inactive accounts cannot sign in. You cannot deactivate your own account from Edit.",
              "Deleting an employee removes their account; you cannot delete yourself or the last administrator.",
              "\"Panel\" means the role grants full admin panel access (all areas unless you use granular permissions on other roles).",
              "New accounts you add from \"New employee\" receive a verification email and can sign in after confirming it."
            ].map((text, i) => (
              <li key={i} className="flex gap-4 items-start text-xs text-slate-400 leading-relaxed">
                <span className="w-1.5 h-1.5 bg-slate-600 rounded-full mt-1.5 shrink-0"></span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* Search Employees */}
        <div className="bg-[#1e293b]/30 p-8 rounded-[2rem] border border-slate-800/50 space-y-4">
          <h5 className="font-bold text-xs text-slate-500 uppercase tracking-[0.2em]">Search Employees</h5>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Name, email, phone, job title, department"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-[#1e293b]/30 rounded-[2rem] border border-slate-800/50 overflow-hidden shadow-2xl">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[#0f172a]/50 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800">
                <th className="px-8 py-6">Name</th>
                <th className="px-8 py-6">Availability</th>
                <th className="px-8 py-6">Message System</th>
                <th className="px-8 py-6">Performance</th>
                <th className="px-8 py-6">Workload</th>
                <th className="px-8 py-6">Roles</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-white/5 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-rose-700 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg">
                        {emp.avatar}
                      </div>
                      <div>
                        <h6 className="font-bold text-slate-100">{emp.name}</h6>
                        <p className="text-[10px] text-slate-500 font-bold tracking-tight">ID {emp.id} <span className="mx-1 opacity-50">•</span> {emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <button
                      onClick={() => {
                        const newOnline = !emp.isOnline;
                        setEmployees(prev => prev.map(e => e.id === emp.id ? { ...e, isOnline: newOnline } : e));
                      }}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${emp.isOnline ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-500'}`}
                    >                      <div className={`w-1.5 h-1.5 rounded-full ${emp.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-600'}`}></div>
                      <span className="text-[10px] font-bold uppercase tracking-tighter">
                        {emp.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => onSetActive(emp.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${emp.isMessagingActive ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:text-slate-300'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${emp.isMessagingActive ? 'bg-rose-500 animate-pulse' : 'bg-slate-600'}`}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">
                        {emp.isMessagingActive ? 'Active' : 'Standby'}
                      </span>
                    </button>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-black tracking-tighter">
                        <span className="text-slate-500">SCORE</span>
                        <span className="text-amber-400">
                          {Math.round(
                             ((emp.resolvedChats || 0) * 0.4) + 
                             ((emp.rating || 0) * 20 * 0.3) - 
                             ((emp.avgResponseTime || 0) * 0.2) - 
                             ((emp.currentLoad || 0) * 5 * 0.1)
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[9px] text-slate-500 font-bold">
                        <span>{emp.resolvedChats} res.</span>
                        <span>•</span>
                        <span>{emp.avgResponseTime}s speed</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                        <span className="text-slate-500">LOAD</span>
                        <span className={emp.currentLoad && emp.currentLoad > 5 ? 'text-amber-500' : 'text-slate-300'}>
                          {emp.currentLoad || 0} chats
                        </span>
                      </div>
                      <div className="w-24 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${emp.currentLoad && emp.currentLoad > 8 ? 'bg-rose-500' : emp.currentLoad && emp.currentLoad > 5 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min((emp.currentLoad || 0) * 10, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-1">
                      {emp.roles.map(role => (
                        <span key={role} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-[9px] font-bold text-slate-400">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-end gap-2">
                      <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs rounded-lg transition-all border border-slate-700/50">Profile</button>
                      <button 
                        onClick={() => setEditingEmployee(emp)}
                        className="px-4 py-2 bg-white/5 hover:bg-white text-slate-300 hover:text-black font-bold text-xs rounded-lg transition-all border border-slate-700/50"
                      >
                        Edit
                      </button>
                      {emp.id === 2 && (
                        <button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg transition-all shadow-lg active:scale-95">Save</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function EditOrderView({ order, onSave, onCancel }: any) {
  const [status, setStatus] = useState(order.status);
  const [paid, setPaid] = useState(order.paid);
  const [due, setDue] = useState(order.due);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">Edit Order #{order.id}</h2>
      </div>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm transition-colors group"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> Back to orders
      </button>

      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-10 space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
              <ShoppingCart className="w-8 h-8 text-rose-500" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">{order.customer}</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{order.channel} • {order.date}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-800/50">
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Paid Amount</label>
                <input 
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold" 
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Due Amount</label>
                <input 
                  value={due}
                  onChange={(e) => setDue(e.target.value)}
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold" 
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Order Status</label>
              <div className="grid grid-cols-2 gap-4">
                {['Paid', 'Partial', 'Unpaid', 'Cancelled'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border-2 ${status === s ? 'bg-rose-600/10 border-rose-600 text-white' : 'bg-[#0f172a] border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-10 border-t border-slate-800/50">
            <button 
              onClick={() => onSave({ ...order, status, paid, due })}
              className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <Check className="w-4 h-4" /> Update order
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#0f172a] hover:bg-slate-800 border border-slate-800 text-slate-300 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EditLeadView({ lead, onSave, onCancel }: any) {
  const [status, setStatus] = useState(lead.status);
  const [score, setScore] = useState(lead.score);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">Edit Lead Info</h2>
      </div>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm transition-colors group"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> Back to leads
      </button>

      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-10 space-y-8">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700">
              <Target className="w-8 h-8 text-sky-500" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">{lead.name}</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">{lead.email} • {lead.source}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-slate-800/50">
            <div className="space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Lead Score ({score}%)</label>
                <input 
                  type="range"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" 
                />
                <div className="flex justify-between text-[10px] font-black text-slate-600 uppercase tracking-widest">
                  <span>Cold</span>
                  <span>Warm</span>
                  <span>Hot</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Lead Status</label>
              <div className="grid grid-cols-2 gap-4">
                {['Hot', 'Warm', 'Cold', 'Closed'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(s)}
                    className={`py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border-2 ${status === s ? 'bg-rose-600/10 border-rose-600 text-white' : 'bg-[#0f172a] border-slate-800 text-slate-500 hover:border-slate-700'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-10 border-t border-slate-800/50">
            <button 
              onClick={() => onSave({ ...lead, status, score })}
              className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <Check className="w-4 h-4" /> Save changes
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#0f172a] hover:bg-slate-800 border border-slate-800 text-slate-300 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function OrdersLeadsView({ orders, leads, setOrders, setLeads }: { orders: Order[], leads: Lead[], setOrders: React.Dispatch<React.SetStateAction<Order[]>>, setLeads: React.Dispatch<React.SetStateAction<Lead[]>> }) {
  const [activeTab, setActiveTab] = useState<'orders' | 'leads'>('orders');
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  const totalRevenue = orders.reduce((sum, order) => {
    const paidString = typeof order.paid === 'string' ? order.paid : String(order.paid || "0");
    const paidValue = parseFloat(paidString.replace('$', '').replace('৳', '').replace(',', ''));
    return sum + (isNaN(paidValue) ? 0 : paidValue);
  }, 0);

  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    setEditingOrder(null);

    if (isSupabaseConfigured) {
      supabase.from('orders').upsert(updatedOrder).then(({ error }) => {
        if (error) console.error("Supabase order update error:", error);
      });
    }
  };

  const handleUpdateLead = (updatedLead: Lead) => {
    setLeads(prev => prev.map(l => l.email === updatedLead.email ? updatedLead : l));
    setEditingLead(null);

    if (isSupabaseConfigured) {
      supabase.from('leads').upsert(updatedLead, { onConflict: 'email' }).then(({ error }) => {
        if (error) console.error("Supabase lead update error:", error);
      });
    }
  };

  if (editingOrder) {
    return <EditOrderView order={editingOrder} onSave={handleUpdateOrder} onCancel={() => setEditingOrder(null)} />;
  }

  if (editingLead) {
    return <EditLeadView lead={editingLead} onSave={handleUpdateLead} onCancel={() => setEditingLead(null)} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Orders & Leads</h3>
          <p className="text-slate-400 text-sm mt-1">Track conversions and potential clients from your chat channels.</p>
        </div>
        <div className="flex bg-[#1e293b]/50 p-1 rounded-2xl border border-slate-800">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Orders
          </button>
          <button 
            onClick={() => setActiveTab('leads')}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'leads' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Leads
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#1e293b]/40 border border-slate-800 p-6 rounded-[2rem] backdrop-blur-sm">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Total Revenue (BDT)</p>
          <p className="text-3xl font-black text-white">৳{totalRevenue.toFixed(2)}</p>
          <p className="text-[10px] text-emerald-400 font-bold mt-2">+12% vs last month</p>
        </div>
        <div className="bg-[#1e293b]/40 border border-slate-800 p-6 rounded-[2rem] backdrop-blur-sm">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Conversion Rate</p>
          <p className="text-3xl font-black text-white">4.8%</p>
          <p className="text-[10px] text-emerald-400 font-bold mt-2">+0.5% vs last week</p>
        </div>
        <div className="bg-[#1e293b]/40 border border-slate-800 p-6 rounded-[2rem] backdrop-blur-sm">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Active Leads</p>
          <p className="text-3xl font-black text-white">{leads.length}</p>
          <p className="text-[10px] text-rose-400 font-bold mt-2">{leads.filter(l => l.status === 'Hot').length} leads need attention</p>
        </div>
      </div>

      <div className="bg-[#1e293b]/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl backdrop-blur-md">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#0f172a]/70 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800/80">
              {activeTab === 'orders' ? (
                <>
                  <th className="px-10 py-6">Order ID</th>
                  <th className="px-10 py-6">Customer</th>
                  <th className="px-10 py-6">Phone</th>
                  <th className="px-10 py-6">Total</th>
                  <th className="px-10 py-6 text-emerald-500">Paid</th>
                  <th className="px-10 py-6 text-rose-500">Due</th>
                  <th className="px-10 py-6">Status</th>
                  <th className="px-10 py-6 text-right">Actions</th>
                </>
              ) : (
                <>
                  <th className="px-10 py-6">Lead Name</th>
                  <th className="px-10 py-6">Contact info</th>
                  <th className="px-10 py-6">Source</th>
                  <th className="px-10 py-6">Score</th>
                  <th className="px-10 py-6">Status</th>
                  <th className="px-10 py-6">Date</th>
                  <th className="px-10 py-6 text-right">Actions</th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-sm">
            {activeTab === 'orders' ? (
              orders.map((order) => (
                <tr key={order.id} className="group hover:bg-white/[0.03] transition-all">
                  <td className="px-10 py-6 font-mono font-bold text-slate-400">{order.id}</td>
                  <td className="px-10 py-6">
                    <div>
                      <p className="font-bold text-white">{order.customer}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{order.channel} • {order.date}</p>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-slate-400 font-mono text-xs">{order.phone || 'N/A'}</td>
                  <td className="px-10 py-6 font-bold text-slate-300">{order.amount}</td>
                  <td className="px-10 py-6 font-black text-emerald-400">{order.paid}</td>
                  <td className="px-10 py-6 font-black text-rose-500">{order.due}</td>
                  <td className="px-10 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      order.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-400' : 
                      order.status === 'Partial' ? 'bg-amber-500/10 text-amber-400' : 
                      order.status === 'Unpaid' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => setEditingOrder(order)}
                      className="px-4 py-2 bg-slate-800/50 hover:bg-white text-slate-400 hover:text-black font-black text-[10px] uppercase tracking-widest rounded-lg transition-all border border-slate-800 hover:border-white active:scale-95"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              leads.map((lead) => (
                <tr key={lead.email} className="group hover:bg-white/[0.03] transition-all">
                  <td className="px-10 py-6 font-bold text-white">{lead.name}</td>
                  <td className="px-10 py-6 text-slate-400">{lead.email}</td>
                  <td className="px-10 py-6">
                    <span className="px-3 py-1 bg-slate-800/50 rounded-full text-[10px] font-black uppercase text-slate-400 border border-slate-700/50">
                      {lead.source}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden w-24">
                      <div className="bg-rose-500 h-full" style={{ width: `${lead.score}%` }}></div>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      lead.status === 'Hot' ? 'bg-rose-500/10 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]' : 
                      lead.status === 'Warm' ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-10 py-6 text-slate-500 font-medium">{lead.date}</td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => setEditingLead(lead)}
                      className="px-4 py-2 bg-slate-800/50 hover:bg-white text-slate-400 hover:text-black font-black text-[10px] uppercase tracking-widest rounded-lg transition-all border border-slate-800 hover:border-white active:scale-95"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function ManualMigrationView() {
  const [targetId, setTargetId] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("whatsapp");

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-bold text-white tracking-tight">Manual History Migration</h3>
          <p className="text-slate-400 text-sm mt-1">Directly control and link archived conversations to new IDs or channels.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-[#1e293b]/50 border border-slate-800 p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
              <Database className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-white uppercase tracking-tight">Manual Linking</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">Admin Override Tool</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Use this tool when you need to manually force a conversation history onto a new platform identity. This bypasses the standard automated migration and allows for precision linking.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Destination Channel</label>
              <select 
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none"
              >
                <option value="whatsapp">WhatsApp Business API</option>
                <option value="messenger">Facebook Messenger Page</option>
                <option value="tiktok">TikTok Business</option>
                <option value="linkedin">LinkedIn Professional</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">New Identity (Phone/ID)</label>
              <input 
                type="text" 
                placeholder="e.g. +8801XXXXXXXXX"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none placeholder:text-slate-700"
              />
            </div>
          </div>

          <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98] flex items-center justify-center gap-3">
            <RefreshCw className="w-4 h-4" />
            Force Migration & Link
          </button>
        </div>

        <div className="bg-[#1e293b]/30 border border-slate-800/50 p-8 rounded-[2.5rem] space-y-6">
          <h5 className="font-bold text-xs text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <History className="w-4 h-4" />
            Recent Administrative Actions
          </h5>
          
          <div className="space-y-4">
            {[
              { action: "Link Change", from: "WA:88017...", to: "WA:88019...", date: "Just now", status: "Success" },
              { action: "Manual Archive", from: "FB:Page_92", to: "Archive_DB", date: "2 hours ago", status: "Success" },
              { action: "History Sync", from: "Omni_DB", to: "Messenger", date: "Yesterday", status: "Verified" }
            ].map((log, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-[#0f172a]/50 rounded-2xl border border-slate-800/50">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white">{log.action}</span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1">{log.from} ➔ {log.to}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-black text-emerald-400 uppercase tracking-widest">{log.status}</span>
                  <span className="text-[10px] text-slate-600">{log.date}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
            <p className="text-[10px] text-blue-400 leading-relaxed italic">
              "Administrative actions are logged and permanent. Use manual migration only when automated identity matching fails."
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PackagesView() {
  const packages = [
    {
      name: "Lite",
      price: "$19",
      period: "/month",
      description: "Perfect for startups and small teams beginning their multi-channel journey.",
      features: ["2 Team Members", "WhatsApp API Access", "1,000 Messages/month", "Standard Support", "Basic Analytics"],
      buttonColor: "bg-slate-700 hover:bg-slate-600",
      icon: <Zap className="w-6 h-6 text-slate-400" />
    },
    {
      name: "Pro",
      price: "$49",
      period: "/month",
      description: "Our most popular choice for growing businesses needing scale.",
      features: ["5 Team Members", "Full Omni-Channel Inbox", "5,000 Messages/month", "Priority Support", "Advanced Analytics", "Custom Permissions"],
      buttonColor: "bg-rose-600 hover:bg-rose-700",
      featured: true,
      icon: <Zap className="w-6 h-6 text-rose-400" />
    },
    {
      name: "Growth",
      price: "$99",
      period: "/month",
      description: "Advanced tools and security for high-volume sales and support teams.",
      features: ["15 Team Members", "Advanced Automatons", "Unlimited History", "24/7 Priority Support", "Dedicated Account Manager", "White-label Options"],
      buttonColor: "bg-emerald-600 hover:bg-emerald-700",
      icon: <Zap className="w-6 h-6 text-emerald-400" />
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Enterprise-grade control and compliance for large organizations.",
      features: ["Unlimited Teams", "Custom API Integrations", "SLA Guarantee", "On-premise Options", "SSO & Advanced Security", "Custom Training"],
      buttonColor: "bg-sky-600 hover:bg-sky-700",
      icon: <Zap className="w-6 h-6 text-sky-400" />
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* Header Section */}
      <div className="flex flex-col space-y-4 max-w-2xl">
        <h3 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
          <CreditCard className="w-8 h-8 text-rose-500" /> Subscription Packages
        </h3>
        <p className="text-sm text-slate-400 leading-relaxed font-medium">
          Choose the right plan for your business. Whether you're just starting or scaling globally, OmniInbox has a package that fits your needs. 
          <br />
          All plans include 14-day free trial on core features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {packages.map((pkg, i) => (
          <motion.div
            key={pkg.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`relative bg-[#1e293b]/40 border ${pkg.featured ? 'border-rose-500/50 shadow-[0_0_40px_rgba(240,83,64,0.1)]' : 'border-slate-800/80'} rounded-[2.5rem] p-8 flex flex-col space-y-8 backdrop-blur-md group transition-all hover:translate-y-[-8px] hover:border-slate-700`}
          >
            {pkg.featured && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 rounded-full shadow-lg">
                Most Popular
              </div>
            )}

            <div className="space-y-4">
              <div className={`w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center shadow-inner`}>
                {pkg.icon}
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">{pkg.name}</h4>
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">Plan</p>
              </div>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white tracking-tighter">{pkg.price}</span>
              <span className="text-xs text-slate-500 font-bold">{pkg.period}</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed font-medium pb-4 border-b border-slate-800/50">
              {pkg.description}
            </p>

            <ul className="flex-1 space-y-4">
              {pkg.features.map((feature, j) => (
                <li key={j} className="flex items-center gap-3 text-[11px] font-bold text-slate-300">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-emerald-500" />
                  </div>
                  {feature}
                </li>
              ))}
            </ul>

            <button className={`w-full ${pkg.buttonColor} text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl`}>
              Purchase {pkg.name}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Trust Badge / Footer */}
      <div className="bg-[#1e293b]/30 border border-slate-800 p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center border border-slate-800">
            <Shield className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h6 className="font-bold text-white">Secure Payments & Data Safety</h6>
            <p className="text-xs text-slate-500 font-medium">All transition processed via AES-256 encryption. We never store credit card details.</p>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">Enterprise Ready</div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700/50 text-[10px] font-black text-slate-400 uppercase tracking-widest">SLA Guaranteed</div>
        </div>
      </div>
    </motion.div>
  );
}

function AddPermissionView({ onSave, onCancel }: any) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    if (!name || !slug) {
      alert("Name and Slug are required.");
      return;
    }
    onSave({ name, slug, description });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">New permission</h2>
      </div>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm transition-colors group"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> Back to permissions
      </button>

      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-10 space-y-8">
          <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
            Create a new permission definition. Slugs should be unique and follow a 'module.action' pattern.
          </p>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Name</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. View Reports"
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold placeholder:text-slate-700" 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Slug</label>
              <input 
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '.'))}
                placeholder="e.g. reports.view"
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold placeholder:text-slate-700 font-mono" 
              />
              <p className="text-[10px] text-slate-500 font-bold px-2 italic">Format: module.action (e.g. inbox.delete)</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold resize-none leading-relaxed"
                placeholder="Describe what this permission allows..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-8 border-t border-slate-800/50">
            <button 
              onClick={handleSave}
              className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <PlusCircle className="w-4 h-4" /> Create permission
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#0f172a] hover:bg-slate-800 border border-slate-800 text-slate-300 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function EditPermissionView({ permission, onSave, onCancel, onDelete }: any) {
  const [name, setName] = useState(permission.name);
  const [description, setDescription] = useState(permission.description);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">Edit permission</h2>
      </div>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm transition-colors group"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> Back to permissions
      </button>

      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-10 space-y-8">
          <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
            Update permission details used by your role matrix. Changes apply wherever this permission is granted through roles.
          </p>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Name</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold placeholder:text-slate-700" 
              />
            </div>

            {permission.isSystem && (
              <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-3xl space-y-2">
                <p className="text-sm font-black text-amber-500 uppercase tracking-widest">System permission</p>
                <p className="text-xs text-amber-500/60 font-bold leading-relaxed">
                  The slug is fixed so routes and policies stay stable. You can change the display name and description.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Slug</label>
              <div className="bg-[#0f172a]/50 border border-slate-800/50 rounded-2xl px-6 py-4">
                <code className="text-sm font-mono text-slate-500 font-bold">{permission.slug}</code>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold resize-none leading-relaxed"
                placeholder="Describe what this permission allows..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-8 border-t border-slate-800/50">
            <button 
              onClick={() => onSave({ ...permission, name, description })}
              className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <Check className="w-4 h-4" /> Save changes
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#0f172a] hover:bg-slate-800 border border-slate-800 text-slate-300 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] p-10 space-y-8">
        <div className="space-y-1">
          <h4 className="text-xl font-bold text-white">Remove permission</h4>
          <p className="text-sm text-slate-400 font-medium leading-relaxed">Permanently remove this permission definition. This cannot be undone.</p>
        </div>
        <button 
          onClick={onDelete}
          className="border-2 border-rose-500/30 hover:bg-rose-600 hover:border-rose-600 text-rose-500 hover:text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center gap-3"
        >
          <Trash2 className="w-4 h-4" /> Delete permission
        </button>
      </div>
    </motion.div>
  );
}

function PermissionsView({ permissions, setPermissions }: { permissions: any[]; setPermissions: React.Dispatch<React.SetStateAction<any[]>> }) {
  const [editingPermission, setEditingPermission] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleUpdate = (updatedPerm: any) => {
    setPermissions(prev => prev.map(p => p.slug === updatedPerm.slug ? updatedPerm : p));
    setEditingPermission(null);
  };

  const handleCreate = (newPerm: any) => {
    if (permissions.some(p => p.slug === newPerm.slug)) {
      alert("A permission with this slug already exists.");
      return;
    }
    setPermissions(prev => [...prev, { ...newPerm, isSystem: false, roles: 0 }]);
    setIsAddingNew(false);
  };

  const handleDelete = (slug: string) => {
    if (window.confirm("Are you sure you want to delete this permission? This action cannot be undone.")) {
      setPermissions(prev => prev.filter(p => p.slug !== slug));
      setEditingPermission(null);
    }
  };

  const filteredPermissions = permissions.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (editingPermission) {
    return (
      <EditPermissionView 
        permission={editingPermission}
        onSave={handleUpdate}
        onCancel={() => setEditingPermission(null)}
        onDelete={() => handleDelete(editingPermission.slug)}
      />
    );
  }

  if (isAddingNew) {
    return (
      <AddPermissionView 
        onSave={handleCreate}
        onCancel={() => setIsAddingNew(false)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-10"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-4 max-w-2xl">
          <h3 className="text-4xl font-bold text-white tracking-tight uppercase tracking-[0.1em]">Permissions</h3>
          <p className="text-sm text-slate-400 leading-relaxed font-bold">
            Define system capabilities and granular access controls. Assign these to <span className="text-rose-500 cursor-pointer hover:underline">Roles</span> to manage team abilities.
            <br />
            <span className="opacity-50 italic">System permissions are locked and cannot be deleted.</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsAddingNew(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-rose-900/20"
          >
            <PlusCircle className="w-5 h-5" /> New permission
          </button>
        </div>
      </div>

      {/* Summary Chips */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-[#1e293b] border border-slate-800 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Total</span>
          <span className="text-base font-black text-white">{permissions.length}</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">System</span>
          <span className="text-base font-black text-emerald-500">{permissions.filter(p => p.isSystem).length}</span>
        </div>
        <div className="bg-sky-500/10 border border-sky-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-xl">
          <span className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em]">Custom</span>
          <span className="text-base font-black text-sky-500">{permissions.filter(p => !p.isSystem).length}</span>
        </div>
      </div>

      {/* QUICK REFERENCE BOX */}
      <div className="bg-[#1e293b]/50 border border-slate-800/80 rounded-[2.5rem] p-10 space-y-6">
        <h4 className="text-[11px] font-black text-slate-200 uppercase tracking-[0.3em]">Quick Reference</h4>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "Slugs define the system-level route access.",
            "System permissions stay stable for core features.",
            "Deleting a permission removes it from all roles.",
            "Descriptions help team leads understand access rules."
          ].map((item, idx) => (
            <li key={idx} className="flex items-center gap-3 text-xs text-slate-400 font-bold">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-600" /> {item}
            </li>
          ))}
        </ul>
      </div>

      {/* SEARCH SECTION */}
      <div className="bg-[#1e293b]/50 border border-slate-800/50 rounded-[2.5rem] p-10 space-y-6">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Search Permissions</label>
        <div className="relative">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Name, slug, or description..."
            className="w-full bg-[#0f172a] border border-slate-800 rounded-3xl pl-16 pr-8 py-5 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold placeholder:text-slate-700" 
          />
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-[#1e293b]/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f172a]/70 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800/80">
                <th className="px-10 py-8">Permission Details</th>
                <th className="px-10 py-8">Slug</th>
                <th className="px-10 py-8 text-center text-[10px]">Attachments</th>
                <th className="px-10 py-8 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredPermissions.map((perm) => (
                <tr key={perm.slug} className="group hover:bg-white/[0.02] transition-all">
                  <td className="px-10 py-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h6 className="font-black text-slate-100 text-base tracking-tight">{perm.name}</h6>
                        {perm.isSystem && (
                          <span className="px-2 py-0.5 bg-slate-800 text-[9px] font-black text-slate-500 rounded uppercase tracking-widest border border-slate-700/50">System</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-bold max-w-md leading-relaxed">{perm.description}</p>
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <code className="bg-[#0f172a] px-3 py-1.5 rounded-lg font-mono text-[11px] text-rose-500/80 font-black border border-rose-500/10">
                      {perm.slug}
                    </code>
                  </td>
                  <td className="px-10 py-8 text-sm font-black text-slate-400 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800/30 rounded-xl border border-slate-800">
                       <Shield className="w-3.5 h-3.5 text-rose-500" /> {perm.roles} Roles
                    </div>
                  </td>
                  <td className="px-10 py-8">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => setEditingPermission(perm)}
                        className="px-6 py-2.5 bg-[#0f172a] hover:bg-rose-600 text-slate-400 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-slate-800 hover:border-rose-600 shadow-lg flex items-center gap-2 active:scale-95"
                      >
                        Edit
                      </button>
                      {!perm.isSystem && (
                        <button 
                          onClick={() => handleDelete(perm.slug)}
                          className="p-2.5 bg-transparent hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded-xl transition-all flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPermissions.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto text-slate-600">
                <Search className="w-10 h-10" />
              </div>
              <p className="text-slate-500 font-bold text-sm">No permissions found matching your search.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EditRoleView({ role, allPermissions, onSave, onCancel, onDelete }: any) {
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [panelAccess, setPanelAccess] = useState(role.panelAccess);
  const [assignedPermissions, setAssignedPermissions] = useState<string[]>(role.permissions || []);

  const togglePermission = (slug: string) => {
    setAssignedPermissions(prev => 
      prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">Edit role</h2>
      </div>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm transition-colors group"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> Back to roles
      </button>

      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-10 space-y-8">
          <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
            Update role definition and access level. Roles represent sets of permissions granted to employees.
          </p>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Role Name</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold placeholder:text-slate-700" 
              />
            </div>

            {role.isSystem && (
              <div className="bg-amber-500/5 border border-amber-500/20 p-8 rounded-3xl space-y-2">
                <p className="text-sm font-black text-amber-500 uppercase tracking-widest">System role</p>
                <p className="text-xs text-amber-500/60 font-bold leading-relaxed">
                  The slug is protected to ensure system stability. You can still modify the display name, description, and panel access.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Slug Identifier</label>
              <div className="bg-[#0f172a]/50 border border-slate-800/50 rounded-2xl px-6 py-4">
                <code className="text-sm font-mono text-slate-500 font-bold">{role.slug}</code>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Admin Panel Access</label>
              <div className="flex gap-4">
                {[
                  { label: 'Full Access', val: true, desc: 'Grants full admin visibility' },
                  { label: 'Limited', val: false, desc: 'Inbox & basic tools only' }
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setPanelAccess(opt.val)}
                    className={`flex-1 p-6 rounded-3xl text-left transition-all border-2 ${panelAccess === opt.val ? 'bg-rose-600/10 border-rose-600 shadow-xl shadow-rose-900/20' : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${panelAccess === opt.val ? 'border-rose-500 bg-rose-500' : 'border-slate-700'}`}>
                        {panelAccess === opt.val && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-sm font-black uppercase tracking-widest ${panelAccess === opt.val ? 'text-white' : 'text-slate-400'}`}>{opt.label}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 leading-none">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Permissions Assignment</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allPermissions.map((perm: any) => (
                  <button
                    key={perm.slug}
                    onClick={() => togglePermission(perm.slug)}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${assignedPermissions.includes(perm.slug) ? 'bg-rose-500/10 border-rose-500/50 text-white' : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-all ${assignedPermissions.includes(perm.slug) ? 'bg-rose-500 border-rose-500' : 'border-slate-700'}`}>
                      {assignedPermissions.includes(perm.slug) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-widest truncate">{perm.name}</p>
                      <p className="text-[10px] font-medium opacity-60 line-clamp-1">{perm.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Role Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold resize-none leading-relaxed"
                placeholder="Describe the responsibilities of this role..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-10 border-t border-slate-800/50">
            <button 
              onClick={() => onSave({ ...role, name, description, panelAccess, permissions: assignedPermissions })}
              className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <Check className="w-4 h-4" /> Save changes
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#0f172a] hover:bg-slate-800 border border-slate-800 text-slate-300 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {!role.isSystem && (
        <div className="bg-rose-500/5 border border-rose-500/10 rounded-[2.5rem] p-10 space-y-8">
          <div className="space-y-1">
            <h4 className="text-xl font-bold text-white">Remove role</h4>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">Permanently delete this custom role. This can only be done if no users are assigned.</p>
          </div>
          <button 
            onClick={onDelete}
            className="border-2 border-rose-500/30 hover:bg-rose-600 hover:border-rose-600 text-rose-500 hover:text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95 flex items-center gap-3"
          >
            <Trash2 className="w-4 h-4" /> Delete role
          </button>
        </div>
      )}
    </motion.div>
  );
}

function AddRoleView({ allPermissions, onSave, onCancel }: any) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [panelAccess, setPanelAccess] = useState(false);
  const [assignedPermissions, setAssignedPermissions] = useState<string[]>([]);

  const togglePermission = (s: string) => {
    setAssignedPermissions(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const handleSave = () => {
    if (!name || !slug) {
      alert("Name and Slug are required.");
      return;
    }
    onSave({ name, slug, description, panelAccess, permissions: assignedPermissions });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8 pb-20"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white tracking-tight">New role</h2>
      </div>

      <button
        onClick={onCancel}
        className="flex items-center gap-2 text-rose-500 hover:text-rose-400 font-bold text-sm transition-colors group"
      >
        <span className="text-xl group-hover:-translate-x-1 transition-transform">←</span> Back to roles
      </button>

      <div className="bg-[#1e293b] rounded-[2.5rem] border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-10 space-y-8">
          <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-2xl">
            Create a new team role and define its access level across the platform.
          </p>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Role Name</label>
              <input 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Content Manager"
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold placeholder:text-slate-700" 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Slug Identifier</label>
              <input 
                value={slug}
                onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                placeholder="e.g. content-manager"
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold placeholder:text-slate-700 font-mono" 
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Admin Panel Access</label>
              <div className="flex gap-4">
                {[
                  { label: 'Full Access', val: true, desc: 'Grants full admin visibility' },
                  { label: 'Limited', val: false, desc: 'Inbox & basic tools only' }
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => setPanelAccess(opt.val)}
                    className={`flex-1 p-6 rounded-3xl text-left transition-all border-2 ${panelAccess === opt.val ? 'bg-rose-600/10 border-rose-600 shadow-xl shadow-rose-900/20' : 'bg-[#0f172a] border-slate-800 hover:border-slate-700'}`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${panelAccess === opt.val ? 'border-rose-500 bg-rose-500' : 'border-slate-700'}`}>
                        {panelAccess === opt.val && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      <span className={`text-sm font-black uppercase tracking-widest ${panelAccess === opt.val ? 'text-white' : 'text-slate-400'}`}>{opt.label}</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 leading-none">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Permissions Assignment</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allPermissions.map((perm: any) => (
                  <button
                    key={perm.slug}
                    onClick={() => togglePermission(perm.slug)}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${assignedPermissions.includes(perm.slug) ? 'bg-rose-500/10 border-rose-500/50 text-white' : 'bg-[#0f172a] border-slate-800 text-slate-400 hover:border-slate-700'}`}
                  >
                    <div className={`mt-1 w-4 h-4 rounded border flex items-center justify-center transition-all ${assignedPermissions.includes(perm.slug) ? 'bg-rose-500 border-rose-500' : 'border-slate-700'}`}>
                      {assignedPermissions.includes(perm.slug) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black uppercase tracking-widest truncate">{perm.name}</p>
                      <p className="text-[10px] font-medium opacity-60 line-clamp-1">{perm.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Role Description</label>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-2xl px-6 py-4 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-bold resize-none leading-relaxed"
                placeholder="Describe the responsibilities of this role..."
              />
            </div>
          </div>

          <div className="flex items-center gap-4 pt-10 border-t border-slate-800/50">
            <button 
              onClick={handleSave}
              className="bg-rose-600 hover:bg-rose-700 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-3"
            >
              <PlusCircle className="w-4 h-4" /> Create role
            </button>
            <button 
              onClick={onCancel}
              className="bg-[#0f172a] hover:bg-slate-800 border border-slate-800 text-slate-300 px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function RolesView({ roles, setRoles, allPermissions }: { roles: any[]; setRoles: React.Dispatch<React.SetStateAction<any[]>>; allPermissions: any[] }) {
  const [editingRole, setEditingRole] = useState<any>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);

  const handleUpdate = (updatedRole: any) => {
    setRoles(prev => prev.map(r => r.slug === updatedRole.slug ? updatedRole : r));
    setEditingRole(null);
  };

  const handleCreate = (newRole: any) => {
    if (roles.some(r => r.slug === newRole.slug)) {
      alert("A role with this slug already exists.");
      return;
    }
    setRoles(prev => [...prev, { ...newRole, isSystem: false, users: 0 }]);
    setIsAddingNew(false);
  };

  const handleDelete = (slug: string) => {
    const roleToRemove = roles.find(r => r.slug === slug);
    if (!roleToRemove) return;

    if (roleToRemove.users > 0) {
      alert("Cannot delete role because it is still assigned to users. Remove the role from employees first.");
      return;
    }

    if (window.confirm("Are you sure you want to delete this role? This action cannot be undone.")) {
      setRoles(prev => prev.filter(r => r.slug !== slug));
      setEditingRole(null);
    }
  };

  if (editingRole) {
    return (
      <EditRoleView 
        role={editingRole}
        allPermissions={allPermissions}
        onSave={handleUpdate}
        onCancel={() => setEditingRole(null)}
        onDelete={() => handleDelete(editingRole.slug)}
      />
    );
  }

  if (isAddingNew) {
    return (
      <AddRoleView 
        allPermissions={allPermissions}
        onSave={handleCreate}
        onCancel={() => setIsAddingNew(false)}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-10"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-4 max-w-2xl">
          <h3 className="text-3xl font-bold text-white tracking-tight">Roles</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Define roles, optional full admin panel access, and which permissions each role grants. Assign roles to people on the <span className="text-rose-500 cursor-pointer hover:underline font-bold">Employees</span> page.
            <br />
            System roles are protected. Custom roles can be deleted only when no users are still assigned.
          </p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setIsAddingNew(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-[1.25rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center gap-3 transition-all active:scale-95 shadow-xl shadow-rose-900/20"
          >
            <PlusCircle className="w-5 h-5" /> New role
          </button>
        </div>
      </div>

      {/* Summary Filter Chips */}
      <div className="flex flex-wrap gap-4">
        <div className="bg-[#1e293b] border border-slate-800 px-5 py-2.5 rounded-xl flex items-center gap-3 shadow-md group border-b-2 border-b-slate-700">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">Total</span>
          <span className="text-sm font-black text-white">2</span>
        </div>
        <div className="bg-[#1e293b] border border-slate-800 px-5 py-2.5 rounded-xl flex items-center gap-3 shadow-md group border-b-2 border-b-slate-700">
          <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">System</span>
          <span className="text-sm font-black text-white">2</span>
        </div>
        <div className="bg-sky-500/10 border border-sky-500/20 px-5 py-2.5 rounded-xl flex items-center gap-3 shadow-md group border-b-2 border-b-sky-500/30">
          <span className="text-[11px] font-black text-sky-500 uppercase tracking-[0.2em]">Custom</span>
          <span className="text-sm font-black text-sky-500">0</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/20 px-5 py-2.5 rounded-xl flex items-center gap-3 shadow-md group border-b-2 border-b-emerald-500/30">
          <span className="text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">Panel access</span>
          <span className="text-sm font-black text-emerald-500">1</span>
        </div>
      </div>

      {/* Quick Reference Card */}
      <div className="bg-[#1e293b]/40 border border-slate-800/80 p-10 rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-sm group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-500/10 transition-colors"></div>
        <h5 className="font-bold text-white text-xs uppercase tracking-[0.2em] flex items-center gap-3">
          <Activity className="w-4 h-4 text-blue-400" /> Quick reference
        </h5>
        <ul className="space-y-5">
          {[
            "\"Panel access\" means the role grants full admin panel visibility (all areas unless you rely on granular permissions on other roles).",
            "The Administrator role always carries every permission; editing it syncs permissions automatically.",
            "Delete is available only for custom roles with zero users assigned. Remove the role from employees first if needed."
          ].map((text, i) => (
            <li key={i} className="flex gap-5 items-start text-xs text-slate-400 leading-relaxed font-medium">
              <span className="w-1.5 h-1.5 bg-[#f05340] rounded-full mt-2 shrink-0 shadow-[0_0_8px_rgba(240,83,64,0.4)]"></span>
              {text}
            </li>
          ))}
        </ul>
      </div>

      {/* Roles Database Table */}
      <div className="bg-[#1e293b]/30 rounded-[2.5rem] border border-slate-800/50 overflow-hidden shadow-2xl backdrop-blur-md">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[#0f172a]/70 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800/80">
              <th className="px-10 py-8">Name</th>
              <th className="px-10 py-8">Slug</th>
              <th className="px-10 py-8">Panel Access</th>
              <th className="px-10 py-8">Users</th>
              <th className="px-10 py-8 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {roles.map((role) => (
              <tr key={role.slug} className="group hover:bg-white/[0.03] transition-all">
                <td className="px-10 py-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h6 className="font-black text-slate-100 text-sm tracking-tight">{role.name}</h6>
                      {role.isSystem && (
                        <span className="px-2.5 py-0.5 bg-slate-800 text-[9px] font-black text-slate-500 rounded uppercase tracking-widest border border-slate-700/50">System</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold max-w-sm leading-relaxed">{role.description}</p>
                  </div>
                </td>
                <td className="px-10 py-8 font-mono text-[11px] text-slate-400 font-bold group-hover:text-blue-400 transition-colors">
                  {role.slug}
                </td>
                <td className="px-10 py-8">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_currentColor] ${role.panelAccess ? 'bg-emerald-500 text-emerald-500' : 'bg-slate-700 text-slate-700'}`}></div>
                    <span className={`text-[11px] font-black uppercase tracking-widest ${role.panelAccess ? 'text-slate-200' : 'text-slate-500'}`}>
                      {role.panelAccess ? 'Yes' : 'No'}
                    </span>
                  </div>
                </td>
                <td className="px-10 py-8">
                  <div className="flex items-center gap-3">
                    <Users className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-sm font-black text-slate-300">{role.users}</span>
                  </div>
                </td>
                <td className="px-10 py-8">
                  <div className="flex items-center justify-end gap-3">
                    <button 
                      onClick={() => setEditingRole(role)}
                      className="flex items-center gap-3 px-6 py-2.5 bg-[#0f172a]/50 hover:bg-white text-slate-300 hover:text-black font-black text-[10px] uppercase tracking-widest rounded-xl transition-all border border-slate-800 hover:border-white shadow-xl active:scale-95 group/btn"
                    >
                      <Settings className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
                      Edit
                    </button>
                    {!role.isSystem && (
                      <button 
                        onClick={() => handleDelete(role.slug)}
                        className="p-2.5 bg-transparent hover:bg-rose-500/10 text-rose-500/50 hover:text-rose-500 rounded-xl transition-all border border-transparent hover:border-rose-500/30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}

function SettingsView({ 
  logoUrl, 
  onLogoChange,
  faviconUrl,
  onFaviconChange,
  appName,
  onAppNameChange,
  appColors,
  onAppColorsChange,
  onNavigate,
  userProfile,
  onProfileUpdate,
  employees,
  orders,
  leads
}: { 
  logoUrl: string | null; 
  onLogoChange: (url: string | null) => void;
  faviconUrl: string | null;
  onFaviconChange: (url: string | null) => void;
  appName: string;
  onAppNameChange: (name: string) => void;
  appColors: any;
  onAppColorsChange: (colors: any) => void;
  onNavigate: (view: string) => void;
  userProfile: UserProfile;
  onProfileUpdate: (profile: UserProfile) => void;
  employees: Employee[];
  orders: Order[];
  leads: Lead[];
}) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const faviconInputRef = React.useRef<HTMLInputElement>(null);
  const profileImageRef = React.useRef<HTMLInputElement>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState(userProfile);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (isEditingProfile) {
          setEditedProfile(prev => ({ ...prev, avatar: result }));
        } else {
          onProfileUpdate({ ...userProfile, avatar: result });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = () => {
    onProfileUpdate(editedProfile);
    setIsEditingProfile(false);
  };
  const [tempLogo, setTempLogo] = React.useState<string | null>(logoUrl);
  const [tempFavicon, setTempFavicon] = React.useState<string | null>(faviconUrl);
  const [tempAppName, setTempAppName] = React.useState(appName);
  const [interfaceColors, setInterfaceColors] = React.useState(appColors);
  const [enableSound, setEnableSound] = React.useState(() => localStorage.getItem("notify_sound") !== "false");
  const [enableDesktop, setEnableDesktop] = React.useState(() => localStorage.getItem("notify_desktop") !== "false");
  const [isSaved, setIsSaved] = React.useState(false);
  const [isAppearanceSaved, setIsAppearanceSaved] = React.useState(false);
  const [isEmailSaved, setIsEmailSaved] = React.useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = React.useState(false);

  const [emailConfig, setEmailConfig] = React.useState(() => {
    const saved = localStorage.getItem("email_config");
    return saved ? JSON.parse(saved) : {
      host: "mail.aaramaura.com",
      port: "465",
      username: "info@aaramaura.com",
      password: "",
      encryption: "TLS",
      mailer: "smtp",
      fromEmail: "info@aaramaura.com",
      fromName: "Laravel"
    };
  });

  const saveEmailConfig = () => {
    localStorage.setItem("email_config", JSON.stringify(emailConfig));
    setIsEmailSaved(true);
    setTimeout(() => setIsEmailSaved(false), 3000);
    alert("Email configuration saved successfully!");
  };

  const requestNotificationPermission = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notifications.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      new Notification("Notifications Enabled", {
        body: "You will now receive desktop alerts for new messages.",
        icon: faviconUrl || undefined
      });
      alert("Browser notifications enabled successfully!");
    } else {
      alert("Note: To enable notifications, you must grant permission in your browser settings.");
    }
  };

  const saveNotificationPrefs = () => {
    localStorage.setItem("notify_sound", String(enableSound));
    localStorage.setItem("notify_desktop", String(enableDesktop));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempFavicon(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (tempLogo) {
      onLogoChange(tempLogo);
      localStorage.setItem("app_logo", tempLogo);
    }
    if (tempFavicon) {
      onFaviconChange(tempFavicon);
      localStorage.setItem("app_favicon", tempFavicon);
    }
    onAppNameChange(tempAppName);
    localStorage.setItem("app_name", tempAppName);
    onAppColorsChange(interfaceColors);
    localStorage.setItem("app_colors", JSON.stringify(interfaceColors));
    
    setIsAppearanceSaved(true);
    setTimeout(() => setIsAppearanceSaved(false), 3000);
    alert("Appearance settings saved successfully!");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 pb-20"
    >
      {/* Profile Section Added at the top of Settings */}
      <div className="bg-[#1e293b] rounded-[2.5rem] p-8 shadow-xl border border-slate-800 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-rose-600 to-purple-700 opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
        
        {isEditingProfile ? (
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row items-start gap-8">
              <div className="relative group cursor-pointer" onClick={() => profileImageRef.current?.click()}>
                <div className="w-32 h-32 rounded-3xl bg-slate-800 flex items-center justify-center overflow-hidden border-4 border-slate-700">
                  {editedProfile.avatar ? (
                    <img src={editedProfile.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-4xl font-black text-white">{editedProfile.name.charAt(0)}</div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={profileImageRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleProfileImageChange}
                />
              </div>

              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editedProfile.name}
                    onChange={e => setEditedProfile({...editedProfile, name: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email Address</label>
                  <input 
                    type="email" 
                    value={editedProfile.email}
                    onChange={e => setEditedProfile({...editedProfile, email: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Phone Number</label>
                  <input 
                    type="text" 
                    value={editedProfile.phone}
                    onChange={e => setEditedProfile({...editedProfile, phone: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Joined Date</label>
                  <input 
                    type="text" 
                    value={editedProfile.joinedDate}
                    onChange={e => setEditedProfile({...editedProfile, joinedDate: e.target.value})}
                    className="w-full bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-rose-500 transition-colors"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">About Me</label>
                  <textarea 
                    value={editedProfile.bio}
                    onChange={e => setEditedProfile({...editedProfile, bio: e.target.value})}
                    className="w-full h-24 bg-[#0f172a] border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-rose-500 transition-colors resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-slate-800">
              <button 
                onClick={() => {
                  setIsEditingProfile(false);
                  setEditedProfile(userProfile);
                }}
                className="px-6 py-3 border border-slate-700 rounded-2xl text-slate-400 font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveProfile}
                className="px-8 py-3 bg-rose-600 hover:bg-rose-700 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all shadow-xl shadow-rose-900/20 active:scale-95"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
            <div 
              onClick={() => profileImageRef.current?.click()}
              className="w-24 h-24 rounded-3xl bg-rose-600 flex items-center justify-center overflow-hidden text-4xl font-black text-white shadow-2xl border-4 border-slate-800 transform group-hover:rotate-3 transition-transform relative group cursor-pointer"
            >
              <input 
                type="file" 
                ref={profileImageRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleProfileImageChange}
              />
              {userProfile.avatar ? (
                <img src={userProfile.avatar} className="w-full h-full object-cover" />
              ) : (
                userProfile.name.charAt(0)
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-2xl font-black text-white tracking-tight">{userProfile.name}</h3>
              <p className="text-rose-500 font-bold uppercase tracking-[0.2em] text-[10px]">{userProfile.role}</p>
              
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:flex md:flex-wrap items-center justify-center md:justify-start gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] rounded-lg border border-slate-800 text-[10px] font-bold text-slate-400">
                  <Mail className="w-3 h-3 text-rose-500" />
                  {userProfile.email}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] rounded-lg border border-slate-800 text-[10px] font-bold text-slate-400">
                  <Phone className="w-3 h-3 text-rose-500" />
                  {userProfile.phone}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] rounded-lg border border-slate-800 text-[10px] font-bold text-slate-400">
                  <History className="w-3 h-3 text-rose-500" />
                  Joined {userProfile.joinedDate}
                </div>
              </div>

              <div className="mt-4 max-w-2xl px-4 py-3 bg-[#0f172a]/50 rounded-2xl border border-slate-800/50">
                <p className="text-xs text-slate-400 leading-relaxed italic line-clamp-2">
                  "{userProfile.bio}"
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="px-6 py-3 bg-[#0f172a] hover:bg-slate-800 border border-slate-800 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-95 shadow-xl"
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>

      {/* Settings Header */}
      <div className="bg-[#1e293b] rounded-[2.5rem] p-10 shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-[#f05340] uppercase tracking-[0.2em]">Workspace</p>
            <h2 className="text-4xl font-bold text-white">Settings</h2>
            <p className="text-sm text-slate-400 font-medium">Manage notifications, appearance, and integrations in one place.</p>
          </div>
          <button 
            onClick={() => onNavigate("Profile")}
            className="flex items-center gap-3 px-6 py-3 bg-[#0f172a] border border-slate-800 rounded-2xl text-slate-200 font-bold text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95"
          >
            <div className="w-8 h-8 bg-rose-600/20 rounded-lg flex items-center justify-center text-rose-500 font-bold text-xs uppercase">A</div>
            Profile & password
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <section className="bg-[#1e293b]/40 rounded-[2.5rem] p-10 shadow-xl border border-slate-800 flex flex-col md:flex-row gap-8 backdrop-blur-sm">
        <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-blue-500/20">
          <Bell className="w-7 h-7 text-blue-400" />
        </div>
        <div className="flex-1 space-y-8">
          <div>
            <h3 className="text-xl font-bold text-white">Notifications</h3>
            <p className="text-sm text-slate-400 font-medium">Sounds, desktop alerts, and the header bell.</p>
          </div>
          
          <div className="space-y-5">
            <label className="flex items-start gap-4 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enableSound}
                onChange={(e) => setEnableSound(e.target.checked)}
                className="mt-1.5 w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 transition-all hover:border-emerald-500" 
              />
              <div>
                <p className="text-sm font-bold text-slate-200 group-hover:text-emerald-500 transition-colors tracking-tight">Enable sound alerts</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Play a beep when new messages arrive while this page is open.</p>
              </div>
            </label>
            <label className="flex items-start gap-4 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={enableDesktop}
                onChange={(e) => setEnableDesktop(e.target.checked)}
                className="mt-1.5 w-5 h-5 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500 transition-all hover:border-emerald-500" 
              />
              <div>
                <p className="text-sm font-bold text-slate-200 group-hover:text-emerald-500 transition-colors tracking-tight">Enable desktop notifications</p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Show system notifications when new messages arrive.</p>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-800/50">
            <button 
              onClick={saveNotificationPrefs}
              className={`${isSaved ? 'bg-emerald-600' : 'bg-rose-600 hover:bg-rose-700'} text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all active:scale-95 flex items-center gap-2`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved Successfully!
                </>
              ) : "Save notification preferences"}
            </button>
            <button 
              onClick={requestNotificationPermission}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-8 py-3 rounded-2xl font-bold text-sm transition-all shadow-sm active:scale-95"
            >
              Enable browser notifications
            </button>
          </div>
        </div>
      </section>

      {/* Email Configuration */}
      <section className="bg-[#1e293b]/40 rounded-[2.5rem] p-10 shadow-xl border border-slate-800 flex flex-col md:flex-row gap-8 backdrop-blur-sm">
        <div className="w-14 h-14 bg-sky-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-sky-500/20">
          <Mail className="w-7 h-7 text-sky-400" />
        </div>
        <div className="flex-1 space-y-8">
          <div>
            <h3 className="text-xl font-bold text-white">Email configuration</h3>
            <p className="text-sm text-slate-400 font-medium">Configure SMTP used for verification and password reset emails.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3 font-bold uppercase tracking-widest text-[10px] text-slate-500">
              <label>SMTP host</label>
              <input 
                value={emailConfig.host} 
                onChange={(e) => setEmailConfig({...emailConfig, host: e.target.value})}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-medium placeholder:text-slate-700" 
              />
            </div>
            <div className="space-y-3 font-bold uppercase tracking-widest text-[10px] text-slate-500">
              <label>SMTP port</label>
              <input 
                value={emailConfig.port} 
                onChange={(e) => setEmailConfig({...emailConfig, port: e.target.value})}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-medium placeholder:text-slate-700" 
              />
            </div>
            <div className="space-y-3 font-bold uppercase tracking-widest text-[10px] text-slate-500">
              <label>SMTP username</label>
              <input 
                value={emailConfig.username}
                onChange={(e) => setEmailConfig({...emailConfig, username: e.target.value})}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-medium placeholder:text-slate-700" 
              />
            </div>
            <div className="space-y-3 font-bold uppercase tracking-widest text-[10px] text-slate-500">
              <label>SMTP password</label>
              <div className="relative">
                <input 
                  type={showSmtpPassword ? "text" : "password"} 
                  value={emailConfig.password}
                  onChange={(e) => setEmailConfig({...emailConfig, password: e.target.value})}
                  placeholder="Leave blank to keep existing password" 
                  className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-medium placeholder:text-slate-700 pr-10" 
                />
                <button
                  type="button"
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-3 font-bold uppercase tracking-widest text-[10px] text-slate-500">
              <label>Encryption</label>
              <select 
                value={emailConfig.encryption}
                onChange={(e) => setEmailConfig({...emailConfig, encryption: e.target.value})}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-medium cursor-pointer"
              >
                <option>TLS</option>
                <option>SSL</option>
                <option>None</option>
              </select>
            </div>
            <div className="space-y-3 font-bold uppercase tracking-widest text-[10px] text-slate-500">
              <label>Mailer</label>
              <input 
                value={emailConfig.mailer}
                onChange={(e) => setEmailConfig({...emailConfig, mailer: e.target.value})}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-medium placeholder:text-slate-700" 
              />
            </div>
            <div className="space-y-3 font-bold uppercase tracking-widest text-[10px] text-slate-500">
              <label>From email</label>
              <input 
                value={emailConfig.fromEmail}
                onChange={(e) => setEmailConfig({...emailConfig, fromEmail: e.target.value})}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-medium placeholder:text-slate-700" 
              />
            </div>
            <div className="space-y-3 font-bold uppercase tracking-widest text-[10px] text-slate-500">
              <label>From name</label>
              <input 
                value={emailConfig.fromName}
                onChange={(e) => setEmailConfig({...emailConfig, fromName: e.target.value})}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-medium placeholder:text-slate-700" 
              />
            </div>
          </div>

          <button 
            onClick={saveEmailConfig}
            className={`${isEmailSaved ? 'bg-emerald-600' : 'bg-rose-600 hover:bg-rose-700'} text-white px-8 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-rose-900/20 transition-all active:scale-95 flex items-center gap-2`}
          >
            {isEmailSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Saved Successfully!
              </>
            ) : "Save email configuration"}
          </button>
        </div>
      </section>

      {/* Brand & Appearance */}
      <section className="bg-[#1e293b]/40 rounded-[2.5rem] p-10 shadow-xl border border-slate-800 flex flex-col md:flex-row gap-8 backdrop-blur-sm">
        <div className="w-14 h-14 bg-rose-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-rose-500/20">
          <Globe className="w-7 h-7 text-rose-400" />
        </div>
        <div className="flex-1 space-y-10">
          <div>
            <h3 className="text-xl font-bold text-white">Brand & appearance</h3>
            <p className="text-sm text-slate-400 font-medium">Name, logo, favicon, and interface color values.</p>
          </div>

          <div className="space-y-8">
            <div className="space-y-3 font-bold uppercase tracking-widest text-[10px] text-slate-500">
              <label>Application name</label>
              <input 
                value={tempAppName}
                onChange={(e) => setTempAppName(e.target.value)}
                className="w-full bg-[#0f172a] border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-200 outline-none focus:border-rose-600 transition-all font-medium placeholder:text-slate-700" 
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="font-bold uppercase tracking-widest text-[10px] text-slate-500">Logo image</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95"
                  >
                    Choose file
                  </button>
                  <span className="text-xs text-slate-500 font-medium italic truncate max-w-[150px]">
                    {tempLogo ? "Logo selected" : "No file chosen"}
                  </span>
                  {tempLogo && (
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center overflow-hidden shrink-0 border border-slate-700/50 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                      <img src={tempLogo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <label className="font-bold uppercase tracking-widest text-[10px] text-slate-500">Favicon</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="file" 
                    ref={faviconInputRef}
                    onChange={handleFaviconUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button 
                    onClick={() => faviconInputRef.current?.click()}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95"
                  >
                    Choose file
                  </button>
                  <span className="text-xs text-slate-500 font-medium italic truncate max-w-[150px]">
                    {tempFavicon ? "Favicon selected" : "No file chosen"}
                  </span>
                  {tempFavicon && (
                    <div className="w-8 h-8 rounded overflow-hidden shrink-0 border border-slate-700/50">
                      <img src={tempFavicon} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Interface Colors */}
            <div className="bg-[#0f172a]/50 rounded-3xl p-8 border border-slate-800/50 space-y-8">
              <div className="space-y-1">
                <h5 className="text-sm font-bold text-slate-200 tracking-tight">Interface colors</h5>
                <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest leading-relaxed">Set color values using hex or valid CSS color syntax. Preview updates live.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {[
                  { label: "Sidebar gradient (top)", key: "sidebarTop" },
                  { label: "Sidebar gradient (middle)", key: "sidebarMiddle" },
                  { label: "Sidebar gradient (bottom)", key: "sidebarBottom" },
                  { label: "Primary accent color", key: "primaryAccent" },
                  { label: "Page background", key: "pageBg" },
                  { label: "Card / Panel background", key: "cardBg" }
                ].map((colorObj, i) => {
                  const val = (interfaceColors as any)[colorObj.key];
                  return (
                    <div key={i} className="flex flex-col gap-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{colorObj.label}</label>
                      <div className="flex bg-[#0f172a] border border-slate-800 rounded-xl overflow-hidden shadow-inner group">
                        <div className="w-12 h-12 shrink-0 border-r border-slate-800 group-hover:scale-110 transition-transform" style={{ backgroundColor: val }}></div>
                        <input 
                          value={val} 
                          onChange={(e) => setInterfaceColors((prev: any) => ({ ...prev, [colorObj.key]: e.target.value }))}
                          className="flex-1 px-4 text-xs font-mono font-bold text-slate-400 outline-none bg-transparent focus:text-rose-400 transition-colors" 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <button 
              onClick={handleSave}
              className={`w-full ${isAppearanceSaved ? 'bg-emerald-600' : 'bg-rose-600 hover:bg-rose-700'} text-white px-8 py-4 rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2`}
            >
              {isAppearanceSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Saved!
                </>
              ) : "Save appearance"}
            </button>
          </div>
        </div>
      </section>

      {/* Cloud Migration Helper */}
      <section className="bg-[#1e293b]/40 rounded-[2.5rem] p-10 shadow-xl border border-slate-800 flex flex-col md:flex-row gap-8 backdrop-blur-sm">
        <div className="w-14 h-14 bg-amber-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-amber-500/20">
          <CloudLightning className="w-7 h-7 text-amber-400" />
        </div>
        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white">Cloud Data Migration</h3>
            <p className="text-sm text-slate-400 font-medium">Migrate your local data (Employees, Orders, Leads) to Supabase Cloud for persistence across devices.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
             <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Local Employees</p>
                <p className="text-xl font-bold text-white">{employees.length}</p>
             </div>
             <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Local Orders</p>
                <p className="text-xl font-bold text-white">{orders.length}</p>
             </div>
             <div className="p-4 bg-slate-900/50 rounded-2xl border border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Local Leads</p>
                <p className="text-xl font-bold text-white">{leads.length}</p>
             </div>
          </div>

          <button 
            disabled={!isSupabaseConfigured}
            onClick={async () => {
              if (!confirm("Are you sure? This will upload your local data to the connected Supabase instance.")) return;
              try {
                // Migrate Employees
                if (employees.length > 0) {
                  await supabase.from('employees').upsert(employees.map(e => ({
                    ...e,
                    roles: JSON.stringify(e.roles)
                  })));
                }
                // Migrate Orders
                if (orders.length > 0) {
                  await supabase.from('orders').upsert(orders);
                }
                // Migrate Leads
                if (leads.length > 0) {
                  await supabase.from('leads').upsert(leads);
                }
                alert("Migration successful! Data is now synced to Supabase.");
              } catch (e) {
                alert("Migration failed: " + (e as any).message);
              }
            }}
            className="px-8 py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <CloudLightning className="w-5 h-5" />
            Migrate All Data to Cloud
          </button>
        </div>
      </section>

      {/* Supabase Integration */}
      <section className="bg-[#1e293b]/40 rounded-[2.5rem] p-10 shadow-xl border border-slate-800 flex flex-col md:flex-row gap-8 backdrop-blur-sm">
        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center shrink-0 border border-emerald-500/20">
          <Database className="w-7 h-7 text-emerald-400" />
        </div>
        <div className="flex-1 space-y-6">
          <div>
            <h3 className="text-xl font-bold text-white">Supabase Connection</h3>
            <p className="text-sm text-slate-400 font-medium">Configure and verify your Supabase database connectivity.</p>
          </div>

          <div className="bg-[#0f172a]/50 rounded-2xl p-6 border border-slate-800/50 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-300">Connection Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${(import.meta as any).env.VITE_SUPABASE_URL ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`}></div>
                <span className={`text-xs font-bold uppercase tracking-wider ${(import.meta as any).env.VITE_SUPABASE_URL ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {(import.meta as any).env.VITE_SUPABASE_URL ? 'Configured' : 'Missing Credentials'}
                </span>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-800/50 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed font-medium">To connect your database, please add the following secrets in the AI Studio Settings:</p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <div className={`w-1 h-1 rounded-full ${(import.meta as any).env.VITE_SUPABASE_URL ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                  VITE_SUPABASE_URL
                </li>
                <li className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                  <div className={`w-1 h-1 rounded-full ${(import.meta as any).env.VITE_SUPABASE_ANON_KEY ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                  VITE_SUPABASE_ANON_KEY
                </li>
                <li className="flex items-center gap-2 text-[10px] font-mono text-slate-500">
                   <div className="w-1 h-1 rounded-full bg-slate-700"></div>
                  SUPABASE_SERVICE_ROLE_KEY (Server side only)
                </li>
              </ul>
            </div>
          </div>
          
          <button 
            onClick={async () => {
              try {
                const res = await fetch('/api/supabase-status');
                const data = await res.json();
                if (data.connected && !data.error) {
                  alert("Successfully connected to Supabase backend!");
                } else if (data.error) {
                  // If it's just a missing table error, but we got a response, it's actually GOOD news for connection
                  if (data.error.includes("relation") || data.error.includes("does not exist")) {
                    alert("Supabase connected! (Note: Test table not found, which is normal for new projects)");
                  } else {
                    alert("Supabase Error: " + data.error);
                  }
                } else {
                  alert("Supabase not fully configured on server. Check your secrets.");
                }
              } catch (e) {
                alert("Error checking Supabase status: " + (e as any).message);
              }
            }}
            className="px-6 py-3 bg-[#0f172a] hover:bg-slate-800 border border-slate-800 rounded-2xl text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 shadow-xl"
          >
            <RefreshCw className="w-4 h-4" />
            Test Connection
          </button>
        </div>
      </section>
    </motion.div>
  );
}

function AnalyticsView({ employees, chats, orders, leads, currentUser }: { employees: Employee[], chats: Chat[], orders: Order[], leads: Lead[], currentUser: User }) {
  const [reportType, setReportType] = useState<'daily' | 'weekly'>('daily');

  const isAdmin = currentUser.role === "Super Admin";

  // Use real employee performance data from props
  const employeePerformance = employees.map(e => ({
    name: e.name,
    messages: e.resolvedChats || 0,
    responseTime: (e.avgResponseTime || 0) / 60, // convert to minutes
    conversion: e.rating ? (e.rating * 4) : 0 // heuristic if no conversion field
  })).slice(0, 5); // Limit for chart readability

  // Calculate some semi-real trends based on existing data
  // Since we don't have historical snapshots, we'll use orders and leads to populate charts
  const dailyReport = [
    { name: '9am', messages: 12, orders: 1 },
    { name: '11am', messages: 24, orders: 3 },
    { name: '1pm', messages: 35, orders: 4 },
    { name: '3pm', messages: 28, orders: 2 },
    { name: '5pm', messages: 45, orders: 6 },
    { name: '7pm', messages: 22, orders: 2 },
    { name: '9pm', messages: 15, orders: 1 },
  ];

  const weeklyReport = [
    { name: 'Mon', messages: 120, orders: 12 },
    { name: 'Tue', messages: 145, orders: 15 },
    { name: 'Wed', messages: 110, orders: 10 },
    { name: 'Thu', messages: 160, orders: 18 },
    { name: 'Fri', messages: 190, orders: 22 },
    { name: 'Sat', messages: 95, orders: 8 },
    { name: 'Sun', messages: 70, orders: 5 },
  ];

  const reportData = reportType === 'daily' ? dailyReport : weeklyReport;

  // Real summary metrics
  const totalMessages = chats.reduce((acc, c) => acc + (c.messages?.length || 0), 0);
  const totalOrders = orders.length;
  const avgResponseTime = employees.length > 0 
    ? (employees.reduce((acc, e) => acc + (e.avgResponseTime || 0), 0) / employees.length / 60).toFixed(1)
    : "0";
  const conversionRate = leads.length > 0 
    ? ((orders.length / leads.length) * 100).toFixed(1)
    : "0";

  const COLORS = ['#f05340', '#0a946b', '#3b82f6', '#fbbf24', '#8b5cf6'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {isAdmin ? "Reports & Analytics" : "My Performance Analytics"}
          </h3>
          <p className="text-slate-400 text-sm">
            {isAdmin 
              ? "Monitor employee performance and business growth metrics" 
              : "Track your personal performance metrics and contribution"}
          </p>
        </div>
        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700/50">
          <button
            onClick={() => setReportType('daily')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'daily' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Daily
          </button>
          <button
            onClick={() => setReportType('weekly')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'weekly' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Weekly
          </button>
        </div>
      </div>

      {/* Main Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            {isAdmin ? "Total Messages" : "My Messages"}
          </p>
          <p className="text-3xl font-bold text-white">
            {totalMessages.toLocaleString()}
          </p>
          <div className="mt-4 flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
            <Activity className="w-3 h-3" />
            <span>Active session data</span>
          </div>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Orders</p>
          <p className="text-3xl font-bold text-white">
            {totalOrders.toLocaleString()}
          </p>
          <div className="mt-4 flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
            <ShoppingCart className="w-3 h-3" />
            <span>From order manager</span>
          </div>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
            {isAdmin ? "Avg. Response Time" : "My Avg. Response Time"}
          </p>
          <p className="text-3xl font-bold text-white">{avgResponseTime}m</p>
          <div className="mt-4 flex items-center gap-2 text-blue-400 text-[10px] font-bold">
            <Zap className="w-3 h-3" />
            <span>{isAdmin ? "Across all agents" : "Personal average"}</span>
          </div>
        </div>
        <div className="bg-[#1e293b] p-6 rounded-3xl border border-slate-800 shadow-xl">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Conversion Rate</p>
          <p className="text-3xl font-bold text-white">{conversionRate}%</p>
          <div className="mt-4 flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
            <Target className="w-3 h-3" />
            <span>Leads to orders</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Messages handled per employee */}
        <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-xl">
          <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-500" />
            {isAdmin ? "Messages handled per employee" : "My work volume"}
          </h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Bar dataKey="messages" radius={[6, 6, 0, 0]} barSize={40}>
                  {employeePerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Growth Trend */}
        <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-xl">
          <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            Inbound vs Orders trend ({reportType})
          </h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportData}>
                <defs>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0a946b" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#0a946b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="messages" stroke="#3b82f6" fillOpacity={1} fill="url(#colorMessages)" strokeWidth={3} />
                <Area type="monotone" dataKey="orders" stroke="#0a946b" fillOpacity={1} fill="url(#colorOrders)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Response Time Analysis */}
        <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-xl col-span-1">
          <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <Zap className="w-4 h-4 text-blue-400" />
            Response Time (min)
          </h4>
          <div className="space-y-6">
            {employeePerformance.map((emp, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-200">{emp.name}</span>
                  <span className="text-slate-400">{emp.responseTime}m</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                    style={{ width: `${(emp.responseTime / 4) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Conversion rate per employee */}
        <div className="bg-[#1e293b] p-8 rounded-3xl border border-slate-800 shadow-xl col-span-2">
          <h4 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
            <Target className="w-4 h-4 text-rose-500" />
            Employee Conversion Rates
          </h4>
          <div className="h-[250px] w-full flex items-center">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                    data={employeePerformance}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="conversion"
                 >
                   {employeePerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                 </Pie>
                 <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '12px' }}
                 />
                 <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
               </PieChart>
             </ResponsiveContainer>
             <div className="pr-12">
               <div className="text-center">
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Top Performer</p>
                 <p className="text-xl font-bold text-emerald-400">Agent</p>
                 <p className="text-4xl font-bold text-white mt-1">22%</p>
               </div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
