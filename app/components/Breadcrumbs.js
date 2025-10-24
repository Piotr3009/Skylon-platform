'use client'

import { useRouter } from 'next/navigation'

export default function Breadcrumbs({ items = [] }) {
  const router = useRouter()

  if (items.length === 0) return null

  return (
    <nav className="flex items-center space-x-2 text-sm mb-4">
      {items.map((item, index) => (
        <div key={index} className="flex items-center">
          {index > 0 && (
            <svg
              className="w-4 h-4 text-gray-400 mx-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
          {item.href ? (
            <button
              onClick={() => router.push(item.href)}
              className="text-blue-600 hover:text-blue-800 hover:underline transition"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-gray-500 font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}
