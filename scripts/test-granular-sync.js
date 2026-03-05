const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

// Since this is a test script, I'll copy the logic from SocialClient if I can't easily import TS from JS
// Or I can just write the logic directly here using the environment variables

async function syncJanPeriod() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabase = createClient(url, key)

    console.log(`URL: ${url}`)
    console.log(`Key: ${key ? 'SET' : 'MISSING'}`)

    // Dates for YouTube search
    const start = '2026-01-01T00:00:00Z'
    const end = '2026-01-03T23:59:59Z'

    // For this test, I'll use the socialClient methods I just added if possible
    // But since this is a clean JS script, I'll implement a fallback if the import fails

    let ytPosts = []
    try {
        // Note: In local dev with Next.js, importing from lib might be tricky in a standalone script
        // I'll re-implement the fetch here for maximum reliability in this one-shot script
        const { google } = require('googleapis')
        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        )
        oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client })

        const chRes = await youtube.channels.list({
            part: ['snippet', 'contentDetails'],
            mine: true
        })
        const channelId = chRes.data.items?.[0]?.id
        console.log(`LOG_CHANNEL: ${channelId}`)

        const broadRes = await youtube.search.list({
            part: ['snippet'],
            channelId: channelId,
            type: 'video',
            maxResults: 5
        })
        console.log(`LOG_BROAD: ${broadRes.data.items?.length || 0}`)

        const janEnd = '2026-01-31T23:59:59Z'
        const janRes = await youtube.search.list({
            part: ['snippet'],
            channelId: channelId,
            type: 'video',
            publishedAfter: start,
            publishedBefore: janEnd,
            maxResults: 50
        })
        console.log(`LOG_JAN_FULL: ${janRes.data.items?.length || 0}`)

        const videoIds = janRes.data.items?.map(i => i.id.videoId).filter(Boolean)
        if (videoIds && videoIds.length > 0) {
            const detailRes = await youtube.videos.list({
                part: ['statistics', 'snippet', 'contentDetails'],
                id: videoIds
            })
            ytPosts = detailRes.data.items.map(v => {
                const duration = v.contentDetails.duration
                const isShort = duration.includes('S') && !duration.includes('M') && !duration.includes('H')
                return {
                    external_id: v.id,
                    platform: 'youtube',
                    post_type: isShort ? 'short' : 'video',
                    title: v.snippet.title,
                    published_at: v.snippet.publishedAt,
                    views: parseInt(v.statistics.viewCount || '0'),
                    likes: parseInt(v.statistics.likeCount || '0'),
                    comments: parseInt(v.statistics.commentCount || '0'),
                    url: `https://youtube.com/watch?v=${v.id}`
                }
            })
        }
    } catch (e) {
        console.error('YT Fetch Error:', e.response?.data?.error || e.message)
    }

    console.log(`Found ${ytPosts.length} YouTube posts.`)

    // Upsert into social_posts
    if (ytPosts.length > 0) {
        const { error } = await supabase.from('social_posts').upsert(ytPosts)
        if (error) console.error('Supabase Store Error:', error.message)
        else console.log('Stored posts in database.')
    }

    // 2. Fetch Instagram (Reels + Media)
    let igPosts = []
    try {
        const axios = require('axios')
        const FB_TOKEN = process.env.FACEBOOK_ACCESS_TOKEN
        const IG_ID = process.env.INSTAGRAM_ACCOUNT_ID

        console.log('Fetching IG media...')
        const igRes = await axios.get(`https://graph.facebook.com/v19.0/${IG_ID}/media`, {
            params: {
                fields: 'id,caption,media_type,media_product_type,timestamp,like_count,comments_count,permalink',
                access_token: FB_TOKEN
            }
        })

        igPosts = (igRes.data.data || []).map(m => ({
            external_id: m.id,
            platform: 'instagram',
            post_type: m.media_product_type === 'REELS' ? 'reel' :
                m.media_type === 'VIDEO' ? 'video' : 'image',
            title: m.caption,
            published_at: m.timestamp,
            likes: m.like_count || 0,
            comments: m.comments_count || 0,
            url: m.permalink
        }))
    } catch (e) {
        console.error('IG Fetch Error:', e.response?.data?.error || e.message)
    }

    console.log(`Found ${igPosts.length} IG posts.`)
    if (igPosts.length > 0) {
        await supabase.from('social_posts').upsert(igPosts)
    }

    // 3. Update Metrics with Averages
    const platforms = ['youtube', 'instagram']
    for (const platform of platforms) {
        // Find all unique dates from posts
        const { data: dates } = await supabase
            .from('social_posts')
            .select('published_at')
            .eq('platform', platform)

        const uniqueDates = [...new Set(dates?.map(d => d.published_at.split('T')[0]))]

        for (const dateStr of uniqueDates) {
            const nextDay = new Date(dateStr)
            nextDay.setDate(nextDay.getDate() + 1)
            const nextDayStr = nextDay.toISOString().split('T')[0]

            const { data: dayPosts } = await supabase
                .from('social_posts')
                .select('*')
                .eq('platform', platform)
                .gte('published_at', dateStr)
                .lt('published_at', nextDayStr)

            if (dayPosts && dayPosts.length > 0) {
                const shorts = dayPosts.filter(p => p.post_type === 'short' || p.post_type === 'reel')
                const longs = dayPosts.filter(p => p.post_type === 'video')

                const avgShorts = shorts.length > 0 ? shorts.reduce((s, p) => s + (p.views || 0), 0) / shorts.length : 0
                const avgLongs = longs.length > 0 ? longs.reduce((s, p) => s + (p.views || 0), 0) / longs.length : 0

                console.log(`Date: ${dateStr} | Platform: ${platform} | Avg Shorts/Reels: ${avgShorts} | Avg Video: ${avgLongs}`)

                await supabase.from('social_metrics').upsert({
                    platform,
                    metric_date: dateStr,
                    avg_shorts_views: Math.floor(avgShorts),
                    avg_video_views: Math.floor(avgLongs)
                }, { onConflict: 'platform, metric_date' })
            }
        }
    }

    console.log('--- Sync Done ---')
}

syncJanPeriod().catch(console.error)
