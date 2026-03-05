export interface InstagramAccount {
  id: string
  username: string
  followers_count: number
  follows_count: number
  media_count: number
}

export interface InstagramMedia {
  id: string
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS'
  caption: string
  timestamp: string
  permalink: string
  like_count: number
  comments_count: number
  reach?: number
  insights?: {
    reach: number
    impressions: number
    engagement: number
    saved: number
    shares: number
  }
}

export interface InstagramInsights {
  followers: number
  reach: number
  impressions: number
  profileViews: number
  websiteClicks: number
}

export interface InstagramSyncResult {
  success: boolean
  data?: {
    account?: InstagramAccount
    posts?: number
    stories?: number
    avgReachPost?: number
    avgReachStory?: number
    engagementRate?: number
  }
  error?: string
}

export interface FacebookPage {
  id: string
  name: string
  fan_count: number
  followers_count: number
}

export interface FacebookVideoInsights {
  id: string
  title: string
  created_time: string
  views: number
  views_3s: number
  views_60s: number
  reactions: number
  comments: number
  shares: number
}

export interface FacebookPageInsights {
  followers: number
  pageViews: number
  reach: number
  engagement: number
}

export interface FacebookSyncResult {
  success: boolean
  data?: {
    page?: FacebookPage
    videos?: number
    totalViews?: number
    views3s?: number
    views1min?: number
    platformRevenue?: number
  }
  error?: string
}
