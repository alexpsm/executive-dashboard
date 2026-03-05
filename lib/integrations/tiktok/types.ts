export interface TikTokAccount {
  followers: number
  following: number
  likes: number
  videos: number
}

export interface TikTokMetrics {
  followers: number
  followersGained: number
  engagementRate: number
  reachPerPost: number
  forYouRate: number
  totalViews: number
}

export interface TikTokSyncResult {
  success: boolean
  data?: TikTokMetrics
  requiresManualInput: boolean
  error?: string
}
