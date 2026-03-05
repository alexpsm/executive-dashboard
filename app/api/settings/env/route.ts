import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const ENV_PATH = path.join(process.cwd(), '.env.local')

export async function GET() {
    try {
        let envContent = ''
        if (fs.existsSync(ENV_PATH)) {
            envContent = fs.readFileSync(ENV_PATH, 'utf-8')
        }

        const envVars: any = {}
        envContent.split('\n').forEach(line => {
            const match = line.match(/^([^=]+)=(.*)$/)
            if (match) {
                const key = match[1].trim()
                const value = match[2].trim()
                // Mask value if it looks sensitive
                if (key.includes('KEY') || key.includes('SECRET') || key.includes('TOKEN') || key.includes('PASSWORD')) {
                    envVars[key] = value ? (value.length > 8 ? value.substring(0, 4) + '...' + value.substring(value.length - 4) : '****') : ''
                } else {
                    envVars[key] = value
                }
            }
        })

        return NextResponse.json({ success: true, env: envVars })
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { updates } = body // { KEY: "NEW_VALUE" }

        let envContent = ''
        if (fs.existsSync(ENV_PATH)) {
            envContent = fs.readFileSync(ENV_PATH, 'utf-8')
        }

        let lines = envContent.split('\n')

        Object.keys(updates).forEach(key => {
            const newValue = updates[key]
            if (newValue === undefined || newValue === null) return

            // Check if key exists
            const index = lines.findIndex(line => line.startsWith(`${key}=`))
            if (index !== -1) {
                lines[index] = `${key}=${newValue}`
            } else {
                lines.push(`${key}=${newValue}`)
            }
        })

        // Remove empty lines at end and join
        const newContent = lines.join('\n').replace(/\n+$/, '') + '\n'
        fs.writeFileSync(ENV_PATH, newContent, 'utf-8')

        return NextResponse.json({ success: true, message: 'Settings saved. Server restart may be required.' })
    } catch (error: any) {
        console.error('Error saving .env:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }
}
