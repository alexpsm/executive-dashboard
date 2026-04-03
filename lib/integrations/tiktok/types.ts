export interface TikTokTokens {
  access_token: string
  open_id: string
  refresh_token: string
  scope: string
  expires_at: number
  obtained_at: number
}

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
