// ProjectTable Component
// A data table component for displaying and managing empty Skytap projects

import React from "react";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * Interface for empty project data
 */
interface EmptyProject {
  id: string;
  name: string;
  configurationCount: number;
  templateCount: number;
}

/**
 * Props for the ProjectTable component
 */
interface ProjectTableProps {
  /** Array of empty projects to display */
  emptyProjects: EmptyProject[];
  /** Set of selected project IDs */
  selectedProjects: Set<string>;
  /** Current sort field */
  sortField: "configurationCount" | "templateCount";
  /** Current sort direction */
  sortDirection: "asc" | "desc";
  /** Callback when a project is selected/deselected */
  onSelectProject: (projectId: string, selected: boolean) => void;
  /** Callback when select all is toggled */
  onSelectAll: (selected: boolean) => void;
  /** Callback when sorting is requested */
  onSort: (field: "configurationCount" | "templateCount") => void;
}

/**
 * ProjectTable Component
 * 
 * Displays a table of empty Skytap projects with selection capabilities and sorting.
 * Features:
 * - Bulk selection with select all functionality
 * - Individual project selection
 * - Sortable columns for configurations and templates
 * - Indeterminate state for partial selections
 * 
 * @param props - ProjectTableProps object
 */
export const ProjectTable: React.FC<ProjectTableProps> = ({
  emptyProjects,
  selectedProjects,
  sortField,
  sortDirection,
  onSelectProject,
  onSelectAll,
  onSort
}) => {
  // Calculate selection states for the header checkbox
  const allSelected = emptyProjects.length > 0 && emptyProjects.every(project => selectedProjects.has(project.id));
  const someSelected = selectedProjects.size > 0 && selectedProjects.size < emptyProjects.length;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {/* Select all checkbox with indeterminate state support */}
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected;
                }}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Project Name</TableHead>
            <TableHead>Project ID</TableHead>
            
            {/* Sortable configuration count column */}
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort("configurationCount")}
                className="h-auto p-0 font-semibold"
              >
                Configurations
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
            
            {/* Sortable template count column */}
            <TableHead>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onSort("templateCount")}
                className="h-auto p-0 font-semibold"
              >
                Templates
                <ArrowUpDown className="ml-2 h-4 w-4" />
              </Button>
            </TableHead>
          </TableRow>
        </TableHeader>
        
        <TableBody>
          {/* Render each project as a table row */}
          {emptyProjects.map((project) => (
            <TableRow key={project.id}>
              {/* Individual project selection checkbox */}
              <TableCell>
                <Checkbox
                  checked={selectedProjects.has(project.id)}
                  onCheckedChange={(checked) => onSelectProject(project.id, checked as boolean)}
                />
              </TableCell>
              
              {/* Project information */}
              <TableCell className="font-medium">{project.name}</TableCell>
              <TableCell className="font-mono text-sm">{project.id}</TableCell>
              <TableCell>{project.configurationCount}</TableCell>
              <TableCell>{project.templateCount}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
