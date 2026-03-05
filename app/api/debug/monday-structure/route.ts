import { NextResponse } from 'next/server'
import axios from 'axios'

const MONDAY_API_URL = 'https://api.monday.com/v2'
const MONDAY_TOKEN = process.env.MONDAY_API_TOKEN
const DEALS_BOARD_ID = '2036553068'

export async function GET() {
  try {
    if (!MONDAY_TOKEN) {
      return NextResponse.json({ error: 'MONDAY_API_TOKEN not set' }, { status: 500 })
    }

    const headers = {
      'Authorization': MONDAY_TOKEN,
      'Content-Type': 'application/json',
      'API-Version': '2023-10'
    }

    // Get full board structure
    const query = `
      query {
        boards(ids: [${DEALS_BOARD_ID}]) {
          id
          name
          description
          columns {
            id
            title
            type
            settings_str
          }
          groups {
            id
            title
            color
            position
          }
          items_page(limit: 5) {
            items {
              id
              name
              group {
                id
                title
              }
              column_values {
                id
                text
                value
                type
              }
            }
          }
        }
      }
    `

    const response = await axios.post(MONDAY_API_URL, { query }, { headers })

    if (response.data.errors) {
      return NextResponse.json({ error: response.data.errors }, { status: 500 })
    }

    const board = response.data.data.boards[0]

    return NextResponse.json({
      success: true,
      board: {
        id: board.id,
        name: board.name,
        description: board.description
      },
      columns: board.columns,
      groups: board.groups,
      sampleItems: board.items_page.items
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
