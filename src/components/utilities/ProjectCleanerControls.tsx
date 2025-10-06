import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface EmptyProject {
  id: string;
  name: string;
  configurationCount: number;
  templateCount: number;
}

interface ProjectCleanerControlsProps {
  projectCount: number;
  emptyProjects: EmptyProject[];
  selectedProjects: Set<string>;
  isLoading: boolean;
  isDeleting: boolean;
  error: string | null;
  showDeleteConfirm: boolean;
  deleteType: "selected" | "all";
  onProjectCountChange: (count: number) => void;
  onFindEmptyProjects: () => void;
  onDeleteSelected: () => void;
  onDeleteAll: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

export const ProjectCleanerControls: React.FC<ProjectCleanerControlsProps> = ({
  projectCount,
  emptyProjects,
  selectedProjects,
  isLoading,
  isDeleting,
  error,
  showDeleteConfirm,
  deleteType,
  onProjectCountChange,
  onFindEmptyProjects,
  onDeleteSelected,
  onDeleteAll,
  onConfirmDelete,
  onCancelDelete
}) => {
  return (
    <>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Label htmlFor="projectCount">Count</Label>
          <Input
            id="projectCount"
            type="number"
            min="1"
            max="1000"
            value={projectCount}
            onChange={(e) => onProjectCountChange(parseInt(e.target.value) || 200)}
            placeholder="Number of projects to fetch"
            disabled={isLoading || isDeleting}
          />
        </div>
        <Button 
          onClick={onFindEmptyProjects} 
          disabled={isLoading || isDeleting}
        >
          {isLoading ? "Finding..." : "Find Empty Projects"}
        </Button>
      </div>

      {emptyProjects.length > 0 && (
        <div className="flex gap-3">
          <Button 
            onClick={onDeleteSelected}
            disabled={selectedProjects.size === 0 || isDeleting}
            variant="destructive"
          >
            {isDeleting ? "Deleting..." : `Delete Selected (${selectedProjects.size})`}
          </Button>
          <Button 
            onClick={onDeleteAll}
            disabled={emptyProjects.length === 0 || isDeleting}
            variant="destructive"
          >
            {isDeleting ? "Deleting..." : `Delete All Empty Projects (${emptyProjects.length})`}
          </Button>
        </div>
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={onCancelDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteType === "selected" 
                ? `Are you sure you want to delete ${selectedProjects.size} selected project(s)? This action cannot be undone.`
                : `Are you sure you want to delete all ${emptyProjects.length} empty project(s)? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={onCancelDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

