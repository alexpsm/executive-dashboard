import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import https from 'https'
import type { YouTubeChannelStats, YouTubeVideo } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Parse ISO 8601 duration to seconds
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = parseInt(match[1] || '0')
  const minutes = parseInt(match[2] || '0')
  const seconds = parseInt(match[3] || '0')
  return hours * 3600 + minutes * 60 + seconds
}

// Check if a video is a Short using YouTube oEmbed API
// Shorts have vertical dimensions (height > width)
async function checkIfShort(videoId: string): Promise<boolean> {
  return new Promise((resolve) => {
    const shortsUrl = encodeURIComponent(`https://www.youtube.com/shorts/${videoId}`)
    const url = `https://www.youtube.com/oembed?url=${shortsUrl}&format=json`

    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          // Shorts have vertical orientation (height > width)
          resolve(json.height > json.width)
        } catch {
          resolve(false)
        }
      })
    }).on('error', () => resolve(false))

    // Timeout after 3 seconds
    setTimeout(() => resolve(false), 3000)
  })
}

// Batch check multiple videos for Short status
async function checkIfShortssBatch(videoIds: string[]): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>()

  // Process in batches of 10 to avoid overwhelming the API
  const batchSize = 10
  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize)
    const checks = await Promise.all(batch.map(id => checkIfShort(id).then(isShort => ({ id, isShort }))))
    checks.forEach(({ id, isShort }) => results.set(id, isShort))
  }

  return results
}

class YouTubeDataClient {
  private oauth2Client: any = null

  private get supabase() {
    return createClient(supabaseUrl, supabaseServiceKey)
  }

  // Initialize OAuth2 client with stored tokens
  async getOAuth2Client() {
    if (this.oauth2Client) return this.oauth2Client

    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('Google OAuth credentials not configured')
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
    this.oauth2Client.setCredentials({ refresh_token: refreshToken })

    return this.oauth2Client
  }

  // Get authenticated YouTube API instance
  async getYouTubeAPI() {
    const auth = await this.getOAuth2Client()
    return google.youtube({ version: 'v3', auth })
  }

  // Get channel statistics
  async getChannelStats(channelId?: string): Promise<YouTubeChannelStats | null> {
    try {
      const youtube = await this.getYouTubeAPI()

      const response = await youtube.channels.list({
        part: ['statistics'],
        ...(channelId ? { id: [channelId] } : { mine: true })
      })

      const channel = response.data.items?.[0]
      if (!channel?.statistics) return null

      return {
        subscriberCount: parseInt(channel.statistics.subscriberCount || '0'),
        viewCount: parseInt(channel.statistics.viewCount || '0'),
        videoCount: parseInt(channel.statistics.videoCount || '0'),
        hiddenSubscriberCount: channel.statistics.hiddenSubscriberCount || false
      }
    } catch (error: any) {
      console.error('YouTube channel stats error:', error.message)
      throw error
    }
  }

  // Get all videos from channel
  // Uses oEmbed API to accurately detect Shorts (vertical videos) vs regular videos
  async getVideos(maxResults = 200): Promise<YouTubeVideo[]> {
    try {
      const youtube = await this.getYouTubeAPI()
      const videoData: Array<{
        id: string
        title: string
        publishedAt: string
        duration: string
        durationSeconds: number
        thumbnailUrl: string
        viewCount: number
        likeCount: number
        commentCount: number
      }> = []
      let nextPageToken: string | undefined

      // Get uploads playlist ID
      const channelResponse = await youtube.channels.list({
        part: ['contentDetails'],
        mine: true
      })
      const uploadsPlaylistId = channelResponse.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
      if (!uploadsPlaylistId) return []

      // Fetch all videos from uploads playlist
      do {
        const playlistResponse = await youtube.playlistItems.list({
          part: ['contentDetails', 'snippet'],
          playlistId: uploadsPlaylistId,
          maxResults: 50,
          pageToken: nextPageToken
        })

        const videoIds = playlistResponse.data.items?.map(item => item.contentDetails?.videoId).filter(Boolean) as string[]

        if (videoIds.length > 0) {
          // Get detailed video info
          const videoDetails = await youtube.videos.list({
            part: ['statistics', 'contentDetails', 'snippet'],
            id: videoIds
          })

          for (const video of videoDetails.data.items || []) {
            const durationSeconds = parseDuration(video.contentDetails?.duration || 'PT0S')

            videoData.push({
              id: video.id!,
              title: video.snippet?.title || '',
              publishedAt: video.snippet?.publishedAt || '',
              duration: video.contentDetails?.duration || '',
              durationSeconds,
              thumbnailUrl: video.snippet?.thumbnails?.default?.url || '',
              viewCount: parseInt(video.statistics?.viewCount || '0'),
              likeCount: parseInt(video.statistics?.likeCount || '0'),
              commentCount: parseInt(video.statistics?.commentCount || '0')
            })
          }
        }

        nextPageToken = playlistResponse.data.nextPageToken || undefined
      } while (nextPageToken && videoData.length < maxResults)

      // Batch check which videos are Shorts using oEmbed API (checks vertical orientation)
      console.log(`YouTube: Checking ${videoData.length} videos for Short status via oEmbed...`)
      const shortsMap = await checkIfShortssBatch(videoData.map(v => v.id))

      // Build final videos array with accurate isShort status
      const videos: YouTubeVideo[] = videoData.map(v => ({
        ...v,
        isShort: shortsMap.get(v.id) || false
      }))

      const shortsCount = videos.filter(v => v.isShort).length
      console.log(`YouTube: Found ${shortsCount} Shorts out of ${videos.length} total videos`)

      return videos
    } catch (error: any) {
      console.error('YouTube videos fetch error:', error.message)
      throw error
    }
  }

  // Get videos published in date range
  async getVideosByDateRange(startDate: string, endDate: string): Promise<YouTubeVideo[]> {
    const allVideos = await this.getVideos()
    return allVideos.filter(video => {
      const publishDate = video.publishedAt.split('T')[0]
      return publishDate >= startDate && publishDate <= endDate
    })
  }

  // Calculate average views for videos vs shorts
  async getAverageViews(startDate?: string): Promise<{ avgVideoViews: number; avgShortsViews: number }> {
    let videos = await this.getVideos()

    // Filter by start date if provided
    if (startDate) {
      videos = videos.filter(v => v.publishedAt >= startDate)
    }

    const regularVideos = videos.filter(v => !v.isShort)
    const shorts = videos.filter(v => v.isShort)

    const avgVideoViews = regularVideos.length > 0
      ? Math.round(regularVideos.reduce((sum, v) => sum + v.viewCount, 0) / regularVideos.length)
      : 0

    const avgShortsViews = shorts.length > 0
      ? Math.round(shorts.reduce((sum, v) => sum + v.viewCount, 0) / shorts.length)
      : 0

    return { avgVideoViews, avgShortsViews }
  }

  // Calculate engagement rates for videos published in date range
  async getEngagementRates(startDate?: string): Promise<{ videoEngagement: number; shortsEngagement: number }> {
    let videos = await this.getVideos()

    // Filter by start date if provided (for YTD calculations)
    if (startDate) {
      videos = videos.filter(v => v.publishedAt >= startDate)
    }

    const regularVideos = videos.filter(v => !v.isShort && v.viewCount > 0)
    const shorts = videos.filter(v => v.isShort && v.viewCount > 0)

    // Engagement = (likes + comments) / views * 100
    const videoEngagement = regularVideos.length > 0
      ? regularVideos.reduce((sum, v) => sum + ((v.likeCount + v.commentCount) / v.viewCount * 100), 0) / regularVideos.length
      : 0

    const shortsEngagement = shorts.length > 0
      ? shorts.reduce((sum, v) => sum + ((v.likeCount + v.commentCount) / v.viewCount * 100), 0) / shorts.length
      : 0

    return {
      videoEngagement: Math.round(videoEngagement * 100) / 100,
      shortsEngagement: Math.round(shortsEngagement * 100) / 100
    }
  }

  // Get total views for videos published in date range
  async getYTDVideoStats(startDate: string): Promise<{ totalViews: number; videoViews: number; shortsViews: number; videoCount: number; shortsCount: number }> {
    const videos = await this.getVideos()
    const ytdVideos = videos.filter(v => v.publishedAt >= startDate)

    const regularVideos = ytdVideos.filter(v => !v.isShort)
    const shorts = ytdVideos.filter(v => v.isShort)

    return {
      totalViews: ytdVideos.reduce((sum, v) => sum + v.viewCount, 0),
      videoViews: regularVideos.reduce((sum, v) => sum + v.viewCount, 0),
      shortsViews: shorts.reduce((sum, v) => sum + v.viewCount, 0),
      videoCount: regularVideos.length,
      shortsCount: shorts.length
    }
  }

  // Sync videos to content_posts table
  async syncVideosToSupabase(): Promise<number> {
    const videos = await this.getVideos()

    for (const video of videos) {
      await this.supabase
        .from('content_posts')
        .upsert({
          platform: 'youtube',
          external_id: video.id,
          post_type: video.isShort ? 'short' : 'video',
          title: video.title,
          published_at: video.publishedAt,
          views: video.viewCount,
          likes: video.likeCount,
          comments: video.commentCount,
          duration_seconds: video.durationSeconds,
          thumbnail_url: video.thumbnailUrl,
          url: `https://youtube.com/watch?v=${video.id}`
        }, { onConflict: 'platform,external_id' })
    }

    return videos.length
  }

  // Test connection
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.getChannelStats()
      return { success: true }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }
}

export const youtubeDataClient = new YouTubeDataClient()
