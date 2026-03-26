import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JudgeCalibrator',
  description: 'Audit the reliability of LLM judges',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-bold text-slate-900">JudgeCalibrator</h1>
            <p className="text-sm text-slate-500">Audit the reliability of LLM judges</p>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
        <footer className="bg-slate-100 border-t border-slate-200 mt-12">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <p className="text-sm text-slate-600">
              JudgeCalibrator - Open source LLM judge auditing library
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
