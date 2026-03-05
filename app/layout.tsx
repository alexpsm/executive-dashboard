import type { Metadata } from 'next'
import { Inter, Fjalla_One } from 'next/font/google'
import './globals.css'
import AiAssistant from '@/components/AiAssistant'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const fjallaOne = Fjalla_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-fjalla'
})

export const metadata: Metadata = {
  title: 'Executive Dashboard',
  description: 'AI-powered operations dashboard with ClickUp, Calendar, and Email integrations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${fjallaOne.variable} font-sans`}>
        {children}
        <AiAssistant />
      </body>
    </html>
  )
}
