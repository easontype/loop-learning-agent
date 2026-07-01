import { Inter } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-loop',
})

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${inter.variable} font-[family-name:var(--font-loop)] bg-[var(--loop-canvas-soft)] min-h-screen`}>
      {children}
    </div>
  )
}
