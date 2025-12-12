import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { 
  ChartBarIcon, 
  CogIcon, 
  DocumentTextIcon, 
  HomeIcon,
  XMarkIcon,
  Bars3Icon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Strategies', href: '/strategies', icon: ChartBarIcon },
  { name: 'Orders', href: '/orders', icon: DocumentTextIcon },
  { name: 'Sessions', href: '/sessions', icon: DocumentTextIcon },
  { name: 'Settings', href: '/settings', icon: CogIcon },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { user, signOut } = useAuth()
  const location = useLocation()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-dark-900/80" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-dark-800">
          <div className="flex h-16 items-center justify-between px-4">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-primary-500" />
              <span className="ml-2 text-xl font-bold text-white">Trading Terminal</span>
            </div>
            <button
              type="button"
              className="rounded-md p-2 text-dark-400 hover:bg-dark-700 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary-900 text-white'
                      : 'text-dark-300 hover:bg-dark-700 hover:text-white'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  {item.name}
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-dark-700 p-4">
            <div className="flex items-center">
              <UserCircleIcon className="h-8 w-8 text-dark-400" />
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-dark-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="mt-4 flex w-full items-center rounded-md px-2 py-2 text-sm font-medium text-dark-300 hover:bg-dark-700 hover:text-white"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-dark-800 px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <ChartBarIcon className="h-8 w-8 text-primary-500" />
            <span className="ml-2 text-xl font-bold text-white">Trading Terminal</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {navigation.map((item) => {
                    const isActive = location.pathname === item.href
                    return (
                      <li key={item.name}>
                        <Link
                          to={item.href}
                          className={`group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 transition-colors ${
                            isActive
                              ? 'bg-primary-900 text-white'
                              : 'text-dark-300 hover:bg-dark-700 hover:text-white'
                          }`}
                        >
                          <item.icon className="h-6 w-6 shrink-0" />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="border-t border-dark-700 pt-4">
                  <div className="flex items-center">
                    <UserCircleIcon className="h-8 w-8 text-dark-400" />
                    <div className="ml-3">
                      <p className="text-sm font-medium text-white">{user?.name}</p>
                      <p className="text-xs text-dark-400">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="mt-4 flex w-full items-center gap-x-3 rounded-md p-2 text-sm font-semibold leading-6 text-dark-300 hover:bg-dark-700 hover:text-white"
                  >
                    <ArrowRightOnRectangleIcon className="h-6 w-6 shrink-0" />
                    Sign out
                  </button>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-dark-700 bg-dark-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-dark-400 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Separator */}
          <div className="h-6 w-px bg-dark-700 lg:hidden" />

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <h1 className="text-lg font-semibold leading-6 text-white">
                {navigation.find(item => item.href === location.pathname)?.name || 'Dashboard'}
              </h1>
            </div>
          <div className="flex items-center gap-x-4 lg:gap-x-6 ml-auto">
            <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-dark-700" />
            <div className="flex items-center gap-x-2">
              <div className="h-2 w-2 rounded-full bg-success-400"></div>
              <span className="text-sm text-dark-300">Connected</span>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-4 inline-flex items-center gap-2 rounded-md px-3 py-1.5 bg-dark-700 text-white hover:bg-dark-600"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
              Sign out
            </button>
          </div>
          </div>
        </div>

        <main className="py-6 lg:px-8">
          <div className="px-4 sm:px-6 lg:px-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
