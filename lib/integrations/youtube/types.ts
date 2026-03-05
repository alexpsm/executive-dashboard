export interface YouTubeChannelStats {
  subscriberCount: number
  viewCount: number
  videoCount: number
  hiddenSubscriberCount: boolean
}

export interface YouTubeVideo {
  id: string
  title: string
  publishedAt: string
  duration: string
  durationSeconds: number
  isShort: boolean
  thumbnailUrl: string
  viewCount: number
  likeCount: number
  commentCount: number
}

export interface YouTubeAnalytics {
  views: number
  estimatedRevenue: number
  estimatedMinutesWatched: number
  averageViewDuration: number
  subscribersGained: number
  subscribersLost: number
  likes: number
  comments: number
  shares: number
  engagementRate: number
  impressions: number
  impressionsCTR: number
}

export interface YouTubeDemographics {
  ageGroup: string
  percentage: number
}

export interface YouTubeSyncResult {
  success: boolean
  data?: {
    channelStats?: YouTubeChannelStats
    videos?: number
    shorts?: number
    analytics?: YouTubeAnalytics
    avgVideoViews?: number
    avgShortsViews?: number
  }
  error?: string
}
