import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Check what Facebook Pages and Instagram accounts the token has access to
export async function GET() {
  const accessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const instagramAccountId = process.env.INSTAGRAM_ACCOUNT_ID
  const facebookPageId = process.env.FACEBOOK_PAGE_ID

  if (!accessToken) {
    return NextResponse.json({ error: 'No Facebook access token configured' }, { status: 400 })
  }

  try {
    // First, check what the token is (user or page)
    const meResponse = await fetch(
      `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${accessToken}`
    )
    const meData = await meResponse.json()

    // Try to get the Instagram account info directly
    let instagramInfo = null
    if (instagramAccountId) {
      const igResponse = await fetch(
        `https://graph.facebook.com/v19.0/${instagramAccountId}?fields=id,username,followers_count&access_token=${accessToken}`
      )
      instagramInfo = await igResponse.json()
    }

    // Try to get page info
    let pageInfo = null
    if (facebookPageId) {
      const pageResponse = await fetch(
        `https://graph.facebook.com/v19.0/${facebookPageId}?fields=id,name,instagram_business_account{id,username,followers_count}&access_token=${accessToken}`
      )
      pageInfo = await pageResponse.json()
    }

    return NextResponse.json({
      success: true,
      token_type: meData.error ? 'unknown' : 'page_or_user',
      token_info: meData,
      configured: {
        instagram_account_id: instagramAccountId,
        facebook_page_id: facebookPageId
      },
      instagram: instagramInfo,
      facebook_page: pageInfo,
      note: 'To add another Instagram account, you need its Business Account ID and the token must have access to the linked Facebook Page'
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
