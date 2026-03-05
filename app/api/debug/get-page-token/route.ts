import { NextResponse } from 'next/server'
import axios from 'axios'

const GRAPH_API_URL = 'https://graph.facebook.com/v19.0'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// This endpoint exchanges a User Access Token for a Page Access Token
export async function GET() {
  const userAccessToken = process.env.FACEBOOK_ACCESS_TOKEN
  const targetPageId = process.env.FACEBOOK_PAGE_ID

  if (!userAccessToken) {
    return NextResponse.json({ error: 'No Facebook access token configured' }, { status: 400 })
  }

  try {
    // Get list of pages the user manages
    const response = await axios.get(`${GRAPH_API_URL}/me/accounts`, {
      params: {
        access_token: userAccessToken,
        fields: 'id,name,access_token'
      }
    })

    const pages = response.data?.data || []

    if (pages.length === 0) {
      return NextResponse.json({
        error: 'No pages found. Make sure you have pages_show_list and pages_read_engagement permissions.',
        hint: 'In Graph API Explorer, add these permissions: pages_show_list, pages_read_engagement'
      }, { status: 400 })
    }

    // Find the target page
    const targetPage = pages.find((p: any) => p.id === targetPageId)

    if (!targetPage) {
      return NextResponse.json({
        error: `Page ${targetPageId} not found in your managed pages`,
        availablePages: pages.map((p: any) => ({ id: p.id, name: p.name })),
        hint: 'Update FACEBOOK_PAGE_ID in .env.local to one of the available pages'
      }, { status: 400 })
    }

    // Return the Page Access Token
    return NextResponse.json({
      success: true,
      pageId: targetPage.id,
      pageName: targetPage.name,
      pageAccessToken: targetPage.access_token,
      instruction: 'Copy the pageAccessToken and update FACEBOOK_ACCESS_TOKEN in your .env.local file'
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.response?.data?.error?.message || error.message,
      hint: 'Make sure your token has pages_show_list permission to list pages'
    }, { status: 500 })
  }
}
