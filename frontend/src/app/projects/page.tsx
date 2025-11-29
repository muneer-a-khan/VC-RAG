"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Navbar } from "@/components/layout/navbar"
import { Plus, Folder, FileText, MessageSquare, Trash2, Loader2, X } from "lucide-react"
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newProject, setNewProject] = useState({
    name: "",
    description: "",
    type: "portfolio_company",
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
      setNewProject({ name: "", description: "", type: "portfolio_company" })
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
      portfolio_company: "Portfolio Company",
      prospect: "Prospect",
      research: "Research",
    }
    return types[type] || type
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-slate-600">Manage your portfolio companies and research projects</p>
          </div>
          <Button onClick={() => setShowNewProject(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
            <button 
              onClick={() => setError(null)} 
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* New Project Modal */}
        {showNewProject && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Create New Project</CardTitle>
                  <button onClick={() => setShowNewProject(false)}>
                    <X className="h-5 w-5 text-slate-500 hover:text-slate-700" />
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Project Name</Label>
                  <Input
                    id="name"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (optional)</Label>
                  <Input
                    id="description"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Project Type</Label>
                  <select
                    id="type"
                    value={newProject.type}
                    onChange={(e) => setNewProject({ ...newProject, type: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="portfolio_company">Portfolio Company</option>
                    <option value="prospect">Prospect</option>
                    <option value="research">Research</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowNewProject(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={createProject}
                    disabled={creating || !newProject.name.trim()}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Project"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <span className="ml-2 text-slate-500">Loading projects...</span>
          </div>
        ) : (
          /* Projects Grid */
          <div className="grid md:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card 
                key={project.id} 
                className="hover:shadow-lg transition-shadow cursor-pointer group"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Folder className="h-5 w-5 text-blue-600" />
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteProject(project.id, project.name)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                  <CardDescription>{getProjectTypeLabel(project.type)}</CardDescription>
                </CardHeader>
                <CardContent>
                  {project.description && (
                    <p className="text-sm text-slate-600 mb-3">{project.description}</p>
                  )}
                  <div className="flex gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {project.document_count} docs
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {project.chat_count} chats
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Add Project Card */}
            <Card 
              className="border-dashed hover:border-solid hover:shadow-lg transition-all cursor-pointer"
              onClick={() => setShowNewProject(true)}
            >
              <CardContent className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center">
                  <Plus className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                  <p className="text-sm text-slate-600">Create New Project</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
