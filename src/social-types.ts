/**
 * Supported social media platforms.
 */
export type Platform = 'facebook' | 'instagram' | 'tiktok' | 'facebook_direct' | 'messenger';

/**
 * Represents a connected social media account or page.
 */
export interface SocialAccount {
  id: string;
  name: string;
  platform: Platform;
  avatar: string;
  handle: string;
}

/**
 * Represents a social media post across one or more platforms.
 */
export interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  platforms: Platform[];
  scheduledAt?: string;
  status: 'scheduled' | 'published' | 'failed';
  engagement: {
    likes: number;
    comments: number;
    shares: number;
  };
}

/**
 * Represents a comment received on a post.
 * Includes AI-driven analysis features like sentiment and intent.
 */
export interface Comment {
  id: string;
  postId: string;
  platform: Platform;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: string;
  status: 'unreplied' | 'replied' | 'assigned';
  assignedTo?: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: 'question' | 'buying' | 'complaint' | 'praise';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  aiSuggestedReply?: string;
}

/**
 * Represents a support or sales agent managing the social accounts.
 */
export interface SocialAgent {
  id: string;
  name: string;
  avatar: string;
  activeWorkload: number;
  responseTime: number;
  performanceScore: number;
}
