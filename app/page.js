'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (data) setProjects(data)
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-2xl">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-indigo-600">Skylon Platform</h1>
          <div className="space-x-4">
            <button
              onClick={() => router.push('/login')}
              className="px-4 py-2 text-indigo-600 hover:text-indigo-800"
            >
              Login
            </button>
            <button
              onClick={() => router.push('/register')}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-5xl font-bold text-gray-800 mb-4">
          Find Construction Projects
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          Browse active projects and submit your bids
        </p>
      </section>

      {/* Projects Grid - Zigzag Layout */}
      <section className="max-w-7xl mx-auto px-4 pb-16">
        {projects.length === 0 ? (
          <div className="text-center text-gray-500 text-xl">
            No active projects at the moment
          </div>
        ) : (
          <div className="space-y-12">
            {projects.map((project, index) => (
              <div
                key={project.id}
                className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="bg-white rounded-2xl shadow-xl p-8 w-full md:w-2/3 lg:w-1/2 cursor-pointer hover:shadow-2xl transition-all transform hover:scale-105"
                >
                  {/* Tree Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="text-8xl">🌳</div>
                  </div>

                  {/* Project Info */}
                  <h3 className="text-3xl font-bold text-center mb-4 text-gray-800">
                    {project.name}
                  </h3>
                  
                  {project.description && (
                    <p className="text-gray-600 text-center mb-6">
                      {project.description}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                    {project.start_date && (
                      <div>
                        <span className="font-semibold">Start:</span>{' '}
                        {new Date(project.start_date).toLocaleDateString()}
                      </div>
                    )}
                    {project.end_date && (
                      <div>
                        <span className="font-semibold">End:</span>{' '}
                        {new Date(project.end_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 text-center">
                    <span className="inline-block px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                      {project.status}
                    </span>
                  </div>

                  <div className="mt-6 text-center">
                    <button className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold">
                      View Project →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-white mt-16 py-8 border-t">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600">
          <p>© 2025 Skylon Platform. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}