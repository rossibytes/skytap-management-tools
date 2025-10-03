import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { skytapAPI, SkytapProject } from "@/lib/skytap-api";
import { ProjectTable } from "@/components/utilities/ProjectTable";
import { ProjectCleanerControls } from "@/components/utilities/ProjectCleanerControls";

interface EmptyProject {
  id: string;
  name: string;
  configurationCount: number;
  templateCount: number;
}

const ProjectCleaner = () => {
  const navigate = useNavigate();
  const [emptyProjects, setEmptyProjects] = useState<EmptyProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sortField, setSortField] = useState<"configurationCount" | "templateCount">("configurationCount");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteType, setDeleteType] = useState<"selected" | "all">("selected");
  const [projectCount, setProjectCount] = useState<number>(200);

  const handleFindEmptyProjects = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const projects = await skytapAPI.findEmptyProjects(projectCount);
      const emptyProjectsData: EmptyProject[] = projects.map(project => ({
        id: project.id,
        name: project.name,
        configurationCount: project.configuration_count,
        templateCount: project.template_count,
      }));
      
      setEmptyProjects(emptyProjectsData);
      setSelectedProjects(new Set());
      
      toast({
        title: "Empty Projects Found",
        description: `Found ${emptyProjectsData.length} empty projects from ${projectCount} total projects`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch empty projects';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(new Set(emptyProjects.map(p => p.id)));
    } else {
      setSelectedProjects(new Set());
    }
  };

  const handleSelectProject = (projectId: string, checked: boolean) => {
    const newSelected = new Set(selectedProjects);
    if (checked) {
      newSelected.add(projectId);
    } else {
      newSelected.delete(projectId);
    }
    setSelectedProjects(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedProjects.size === 0) return;
    setDeleteType("selected");
    setShowDeleteConfirm(true);
  };

  const handleDeleteAll = () => {
    if (emptyProjects.length === 0) return;
    setDeleteType("all");
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setShowDeleteConfirm(false);
    setIsDeleting(true);
    setError(null);
    
    try {
      const projectIds = deleteType === "selected" 
        ? Array.from(selectedProjects)
        : emptyProjects.map(p => p.id);
      
      const results = await skytapAPI.deleteProjects(projectIds);
      
      // Remove successfully deleted projects from the list
      const successfulIds = new Set(results.success);
      setEmptyProjects(emptyProjects.filter(p => !successfulIds.has(p.id)));
      setSelectedProjects(new Set());
      
      // Show success message
      if (results.success.length > 0) {
        toast({
          title: "Projects Deleted Successfully",
          description: `${results.success.length} empty project(s) have been deleted`,
        });
      }
      
      // Show error message for any failures
      if (results.failed.length > 0) {
        setError(`Failed to delete ${results.failed.length} project(s): ${results.failed.map(f => f.id).join(', ')}`);
        toast({
          title: "Some Deletions Failed",
          description: `${results.failed.length} project(s) could not be deleted`,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete projects';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };


  const handleSort = (field: "configurationCount" | "templateCount") => {
    let newDirection: "asc" | "desc";
    
    if (field === sortField) {
      // Same field, toggle direction
      newDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
      // New field, start with ascending
      newDirection = "asc";
    }
    
    setSortField(field);
    setSortDirection(newDirection);
    
    const sorted = [...emptyProjects].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];
      
      if (newDirection === "asc") {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    setEmptyProjects(sorted);
  };

  const isAllSelected = emptyProjects.length > 0 && selectedProjects.size === emptyProjects.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/utilities")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to General Utilities
          </Button>
          <h1 className="text-2xl font-bold">Project Cleaner</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Clean up and organize project resources
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Find Empty Projects</CardTitle>
              <CardDescription>Locate and remove projects with no configurations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ProjectCleanerControls
                projectCount={projectCount}
                emptyProjects={emptyProjects}
                selectedProjects={selectedProjects}
                isLoading={isLoading}
                isDeleting={isDeleting}
                error={error}
                showDeleteConfirm={showDeleteConfirm}
                deleteType={deleteType}
                onProjectCountChange={setProjectCount}
                onFindEmptyProjects={handleFindEmptyProjects}
                onDeleteSelected={handleDeleteSelected}
                onDeleteAll={handleDeleteAll}
                onConfirmDelete={confirmDelete}
                onCancelDelete={() => setShowDeleteConfirm(false)}
              />
            </CardContent>
          </Card>

          {emptyProjects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Empty Projects Found</CardTitle>
                <CardDescription>
                  Found {emptyProjects.length} empty project(s). Select projects to delete or delete all.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProjectTable
                  emptyProjects={emptyProjects}
                  selectedProjects={selectedProjects}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSelectProject={handleSelectProject}
                  onSelectAll={handleSelectAll}
                  onSort={handleSort}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </main>

    </div>
  );
};

export default ProjectCleaner;
