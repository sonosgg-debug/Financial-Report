'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ArrowRightLeft, Settings, LogOut } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Trades', href: '/trades', icon: ArrowRightLeft },
  // { name: 'Settings', href: '/settings', icon: Settings }, // Settings can be added later
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      <div className="md:hidden flex flex-col bg-[#111827] border-b border-slate-800 sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 border-b border-slate-800/50">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            StockDash
          </h1>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-slate-400 hover:text-red-400 p-1 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </form>
        </div>
        <div className="flex space-x-2 p-3 overflow-x-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center justify-center space-x-2 px-4 py-2 rounded-xl transition-all flex-1 whitespace-nowrap',
                  isActive
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                <item.icon className={clsx("w-4 h-4", isActive ? "text-blue-400" : "text-slate-500")} />
                <span className="text-sm font-medium">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>

      <div className="hidden md:flex w-64 h-full bg-[#111827] border-r border-slate-800 flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            StockDash
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200',
                  isActive
                    ? 'bg-blue-600/10 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                <item.icon className={clsx("w-5 h-5", isActive ? "text-blue-400" : "text-slate-500")} />
                <span className="font-medium">{item.name}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center space-x-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
