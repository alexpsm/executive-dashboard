/**
 * 2026 KPI Goals for Executive Dashboard
 *
 * These are the target metrics for tracking business performance.
 * Values can also be dynamically loaded from the kpi_targets table in Supabase.
 */

export const KPI_GOALS_2026 = {
  // ==========================================
  // MAIN FINANCIAL GOALS
  // ==========================================
  REVENUE: 100000,           // Cross-platform revenue target (£)
  COST_SAVINGS: 75000,       // Running costs saved target (£)
  B2B_DIGITAL_SALES: 50000,  // B2B digital sales from Xero (£)

  // Gen Z Audience (16-24 age range)
  GEN_Z_AUDIENCE: 1152222,   // Total across all platforms
  GEN_Z_FB_IG_TIKTOK: 483722, // Facebook + Instagram + TikTok combined
  GEN_Z_YOUTUBE: 688500,      // YouTube subscribers in Gen Z range

  // ==========================================
  // YOUTUBE GOALS
  // ==========================================
  YOUTUBE: {
    VIEWS: 5100000,              // Total views
    REVENUE: 20000,              // Ad revenue (£)
    CTR_PERCENT: 5.1,            // Impression click-through rate (%)
    SUBSCRIBERS: 78000,          // Total subscribers
    SHORTS_VIEWS: 33250000,      // Shorts views
    ENGAGEMENT_RATE: 2.33,       // Video engagement rate (%)
    SHORTS_ENGAGEMENT_RATE: 3.15, // Shorts engagement rate (%)
    AVG_VIDEO_VIEWS: 2500,       // Average views per video
    AVG_SHORTS_VIEWS: 6300,      // Average views per short
    PRICE_PER_POST: 96           // HypeAuditor estimated price per post (£)
  },

  // ==========================================
  // INSTAGRAM GOALS
  // ==========================================
  INSTAGRAM: {
    FOLLOWERS: 300000,       // Total followers
    ENGAGEMENT_RATE: 0.30,   // Engagement rate (%)
    AVG_REACH_POST: 127500,  // Average reach per post
    AVG_REACH_STORY: 26250,  // Average reach per story
    PRICE_PER_POST: 4725,    // HypeAuditor estimated price per post (£)
    PRICE_PER_STORY: 566     // HypeAuditor estimated price per story (£)
  },

  // ==========================================
  // TIKTOK GOALS
  // ==========================================
  TIKTOK: {
    NEW_FOLLOWERS: 40000,    // New followers gained
    ENGAGEMENT_RATE: 6.25,   // Engagement rate (%)
    REACH_PER_POST: 3750,    // Average reach per post
    PRICE_PER_POST: 100      // HypeAuditor estimated price per post (£)
  },

  // ==========================================
  // FACEBOOK GOALS
  // ==========================================
  FACEBOOK: {
    FOLLOWERS: 188000,       // Total followers
    REVENUE: 80000,          // Platform revenue (£)
    TOTAL_VIEWS: 670000000,  // Total video views (670M)
    VIEWS_3S: 75000000,      // 3-second views (75M)
    VIEWS_1MIN: 11250000     // 1-minute views (11.25M)
  }
}

// Helper function to calculate progress percentage
export function calculateProgress(current: number, target: number): number {
  if (!target || target === 0) return 0
  return Math.min(Math.round((current / target) * 100), 100)
}

// Helper function to format currency
export function formatCurrency(value: number, currency = '£'): string {
  return `${currency}${value.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

// Helper function to format large numbers
export function formatNumber(value: number): string {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(1)}B`
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}
