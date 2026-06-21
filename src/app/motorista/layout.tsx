import { Fuel } from 'lucide-react'
import Link from 'next/link'

export default function MotoristaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* App header */}
      <header className="bg-blue-600 px-6 py-4 flex items-center justify-between shadow-sm">
        <Link href="/motorista" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
            <Fuel size={14} className="text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">FuelLink</span>
        </Link>
        <span className="text-xs text-blue-200 font-medium">App do Motorista</span>
      </header>

      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  )
}
