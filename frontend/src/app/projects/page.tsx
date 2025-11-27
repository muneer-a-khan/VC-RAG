"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Folder } from "lucide-react"

export default function ProjectsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Projects</h1>
            <p className="text-slate-600">Manage your portfolio companies and research projects</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Placeholder - will be populated from API */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Folder className="h-5 w-5 text-blue-600" />
                <CardTitle>Sample Project</CardTitle>
              </div>
              <CardDescription>Portfolio Company</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Click to view project details and uploaded documents
              </p>
            </CardContent>
          </Card>

          {/* Add Project Card */}
          <Card className="border-dashed hover:border-solid hover:shadow-lg transition-all cursor-pointer">
            <CardContent className="flex items-center justify-center h-full min-h-[200px]">
              <div className="text-center">
                <Plus className="h-12 w-12 mx-auto mb-2 text-slate-400" />
                <p className="text-sm text-slate-600">Create New Project</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

