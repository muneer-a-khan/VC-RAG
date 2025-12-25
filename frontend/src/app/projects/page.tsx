"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { apiClient } from "@/lib/api"

interface Project {
  id: string
  name: string
  description: string | null
  type: string
  created_at: string
  updated_at: string
  document_count: number
  chat_count: number
}

const projectTypeConfig: Record<string, { color: string; icon: string }> = {
  portfolio_company: { color: "bg-blue-500/10 text-blue-500", icon: "solar_power" },
  prospect: { color: "bg-emerald-500/10 text-emerald-500", icon: "robot_2" },
  research: { color: "bg-purple-500/10 text-purple-500", icon: "map" },
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    type: "prospect",
  })

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      setError(null)
      const data = await apiClient.projects.list()
      setProjects(data)
    } catch (err: any) {
      setError(err.message || "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  async function createProject() {
    if (!newProject.name.trim()) return

    try {
      setCreating(true)
      await apiClient.projects.create({
        name: newProject.name,
        description: newProject.description || undefined,
        type: newProject.type,
      })
      setShowNewProject(false)
      setNewProject({ name: "", description: "", type: "prospect" })
      loadProjects()
    } catch (err: any) {
      setError(err.message || "Failed to create project")
    } finally {
      setCreating(false)
    }
  }

  async function deleteProject(projectId: string, projectName: string) {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return
    }

    try {
      await apiClient.projects.delete(projectId)
      loadProjects()
    } catch (err: any) {
      setError(err.message || "Failed to delete project")
    }
  }

  function getProjectTypeLabel(type: string) {
    const types: Record<string, string> = {
      portfolio_company: "Portfolio",
      prospect: "Prospect",
      research: "Research",
    }
    return types[type] || type
  }

  function getTimeSinceUpdate(dateStr: string): string {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `Updated ${diffMins}m ago`
    if (diffHours < 24) return `Updated ${diffHours}h ago`
    if (diffDays === 1) return "Updated yesterday"
    if (diffDays < 7) return `Updated ${diffDays} days ago`
    return `Updated ${Math.floor(diffDays / 7)} weeks ago`
  }

  return (
    <div className="bg-background-dark text-white min-h-screen flex flex-col overflow-x-hidden">
      {/* Top Navigation */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-border-dark px-6 py-3 bg-surface-dark sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 text-white cursor-pointer">
            <div className="size-8 text-primary">
              <svg className="w-full h-full" fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path clipRule="evenodd" d="M39.475 21.6262C40.358 21.4363 40.6863 21.5589 40.7581 21.5934C40.7876 21.655 40.8547 21.857 40.8082 22.3336C40.7408 23.0255 40.4502 24.0046 39.8572 25.2301C38.6799 27.6631 36.5085 30.6631 33.5858 33.5858C30.6631 36.5085 27.6632 38.6799 25.2301 39.8572C24.0046 40.4502 23.0255 40.7407 22.3336 40.8082C21.8571 40.8547 21.6551 40.7875 21.5934 40.7581C21.5589 40.6863 21.4363 40.358 21.6262 39.475C21.8562 38.4054 22.4689 36.9657 23.5038 35.2817C24.7575 33.2417 26.5497 30.9744 28.7621 28.762C30.9744 26.5497 33.2417 24.7574 35.2817 23.5037C36.9657 22.4689 38.4054 21.8562 39.475 21.6262ZM4.41189 29.2403L18.7597 43.5881C19.8813 44.7097 21.4027 44.9179 22.7217 44.7893C24.0585 44.659 25.5148 44.1631 26.9723 43.4579C29.9052 42.0387 33.2618 39.5667 36.4142 36.4142C39.5667 33.2618 42.0387 29.9052 43.4579 26.9723C44.1631 25.5148 44.659 24.0585 44.7893 22.7217C44.9179 21.4027 44.7097 19.8813 43.5881 18.7597L29.2403 4.41187C27.8527 3.02428 25.8765 3.02573 24.2861 3.36776C22.6081 3.72863 20.7334 4.58419 18.8396 5.74801C16.4978 7.18716 13.9881 9.18353 11.5858 11.5858C9.18354 13.988 7.18717 16.4978 5.74802 18.8396C4.58421 20.7334 3.72865 22.6081 3.36778 24.2861C3.02574 25.8765 3.02429 27.8527 4.41189 29.2403Z" fill="currentColor" fillRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-white text-lg font-bold tracking-tight">VC Copilot</h2>
          </Link>
          <label className="hidden md:flex flex-col w-64 h-10">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full bg-border-dark focus-within:ring-2 ring-primary/50 transition-all">
              <div className="text-text-secondary flex items-center justify-center pl-3 pr-1">
                <span className="material-symbols-outlined text-[20px]">search</span>
              </div>
              <input className="w-full bg-transparent border-none text-white placeholder:text-text-secondary focus:ring-0 text-sm outline-none" placeholder="Search projects..." />
            </div>
          </label>
        </div>
        <div className="flex items-center gap-4">
          <button className="text-text-secondary hover:text-white transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 size-2 bg-red-500 rounded-full border-2 border-surface-dark"></span>
          </button>
          <div className="h-8 w-[1px] bg-border-dark mx-1"></div>
          <button className="flex items-center gap-3 group">
            <div className="size-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 ring-2 ring-transparent group-hover:ring-primary transition-all"></div>
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 sm:px-8 py-8 flex justify-center">
        <div className="flex flex-col w-full max-w-[1200px] gap-8">
          {/* Page Heading & Actions */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-white text-3xl md:text-4xl font-black tracking-tight">Projects</h1>
              <p className="text-text-secondary text-base">Manage your deal flow, due diligence, and portfolio insights.</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="hidden md:flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-surface-dark hover:bg-border-dark border border-border-dark text-white text-sm font-medium transition-colors">
                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                <span>Filter</span>
              </button>
              <button
                onClick={() => setShowNewProject(true)}
                className="flex items-center justify-center gap-2 h-10 px-5 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all transform active:scale-95"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>New Project</span>
              </button>
            </div>
          </div>

          {/* Chips / Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button className="flex items-center gap-2 h-9 px-4 rounded-full bg-white text-background-dark text-sm font-semibold transition-colors">
              All Projects
            </button>
            <button className="flex items-center gap-2 h-9 px-4 rounded-full bg-surface-dark border border-border-dark text-text-secondary hover:text-white hover:border-gray-500 text-sm font-medium transition-colors whitespace-nowrap">
              <span className="size-2 rounded-full bg-blue-500"></span>
              Portfolio
            </button>
            <button className="flex items-center gap-2 h-9 px-4 rounded-full bg-surface-dark border border-border-dark text-text-secondary hover:text-white hover:border-gray-500 text-sm font-medium transition-colors whitespace-nowrap">
              <span className="size-2 rounded-full bg-emerald-500"></span>
              Prospects
            </button>
            <button className="flex items-center gap-2 h-9 px-4 rounded-full bg-surface-dark border border-border-dark text-text-secondary hover:text-white hover:border-gray-500 text-sm font-medium transition-colors whitespace-nowrap">
              <span className="size-2 rounded-full bg-purple-500"></span>
              Research
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-sm underline hover:no-underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Loading State */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <span className="material-symbols-outlined text-4xl text-gray-500 animate-spin">progress_activity</span>
              <span className="ml-3 text-gray-500">Loading projects...</span>
            </div>
          ) : (
            /* Projects Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Create New Card */}
              <button
                onClick={() => setShowNewProject(true)}
                className="group flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-border-dark hover:border-primary hover:bg-surface-dark/50 min-h-[240px] p-6 transition-all duration-200 cursor-pointer text-text-secondary hover:text-primary"
              >
                <div className="size-12 rounded-full bg-surface-dark group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-3xl">add</span>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-white group-hover:text-primary mb-1">Create New Project</h3>
                  <p className="text-sm font-normal opacity-80">Start a new due diligence or tracking project</p>
                </div>
              </button>

              {/* Project Cards */}
              {projects.map((project) => {
                const config = projectTypeConfig[project.type] || projectTypeConfig.prospect
                return (
                  <div
                    key={project.id}
                    className="group flex flex-col rounded-xl bg-surface-dark border border-border-dark hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 p-5 min-h-[240px] transition-all relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`size-10 rounded-lg ${config.color} flex items-center justify-center`}>
                          <span className="material-symbols-outlined">{config.icon}</span>
                        </div>
                        <div>
                          <h3 className="text-white font-bold text-base leading-tight">{project.name}</h3>
                          <span className="text-xs text-text-secondary">{getTimeSinceUpdate(project.updated_at)}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteProject(project.id, project.name)
                        }}
                        className="text-text-secondary hover:text-white p-1 rounded hover:bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[20px]">more_vert</span>
                      </button>
                    </div>
                    <div className="mb-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color} border border-current/20`}>
                        {getProjectTypeLabel(project.type)}
                      </span>
                    </div>
                    {project.description && (
                      <p className="text-text-secondary text-sm leading-relaxed line-clamp-2 mb-4">
                        {project.description}
                      </p>
                    )}
                    <div className="mt-auto pt-4 border-t border-border-dark flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[16px]">description</span>
                        <span>{project.document_count} Docs</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                        <span>{project.chat_count} Chats</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Load More */}
          {projects.length >= 8 && (
            <div className="flex justify-center mt-8">
              <button className="text-text-secondary hover:text-white text-sm font-medium flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-surface-dark transition-colors">
                <span>Load more projects</span>
                <span className="material-symbols-outlined text-[16px]">expand_more</span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm transition-opacity"
            onClick={() => setShowNewProject(false)}
          ></div>
          
          {/* Modal Content */}
          <div className="relative w-full max-w-lg bg-surface-dark border border-border-dark rounded-xl shadow-2xl p-6 sm:p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">New Project</h3>
              <button
                className="text-text-secondary hover:text-white p-1 rounded-full hover:bg-white/5"
                onClick={() => setShowNewProject(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createProject()
              }}
              className="flex flex-col gap-5"
            >
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white">Project Name</label>
                <input
                  className="w-full h-11 px-4 bg-background-dark border border-border-dark rounded-lg text-white placeholder:text-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="e.g. Acme Corp Series A"
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white">Type</label>
                <div className="relative">
                  <select
                    className="w-full h-11 px-4 bg-background-dark border border-border-dark rounded-lg text-white appearance-none focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all cursor-pointer"
                    value={newProject.type}
                    onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
                  >
                    <option value="prospect">Prospect</option>
                    <option value="portfolio_company">Portfolio Company</option>
                    <option value="research">Research Topic</option>
                  </select>
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none material-symbols-outlined">expand_more</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-white">Description</label>
                <textarea
                  className="w-full min-h-[100px] p-4 bg-background-dark border border-border-dark rounded-lg text-white placeholder:text-text-secondary focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none transition-all"
                  placeholder="Brief description of the company or research goals..."
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                ></textarea>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  className="px-5 h-10 rounded-lg text-sm font-medium text-text-secondary hover:text-white hover:bg-white/5 transition-colors"
                  onClick={() => setShowNewProject(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newProject.name.trim()}
                  className="px-5 h-10 rounded-lg bg-primary hover:bg-blue-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {creating ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                      Creating...
                    </>
                  ) : (
                    "Create Project"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
