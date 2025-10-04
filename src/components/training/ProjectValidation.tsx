// ProjectValidation Component
// A form component for entering and validating Skytap project IDs

import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Props for the ProjectValidation component
 */
interface ProjectValidationProps {
  /** Current project ID value */
  projectId: string;
  /** Whether validation is in progress */
  isValidating: boolean;
  /** Whether the project ID is valid */
  projectValid: boolean;
  /** Error message if validation fails */
  error: string | null;
  /** Project name for display in success message */
  projectName?: string;
  /** Callback when project ID input changes */
  onProjectIdChange: (value: string) => void;
  /** Callback to trigger project validation */
  onValidate: () => void;
}

/**
 * ProjectValidation Component
 * 
 * Provides a form interface for users to enter and validate a Skytap project ID.
 * The validated project ID is used across all training environment operations.
 * 
 * @param props - ProjectValidationProps object
 */
export const ProjectValidation: React.FC<ProjectValidationProps> = ({
  projectId,
  isValidating,
  projectValid,
  error,
  projectName,
  onProjectIdChange,
  onValidate
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5" />
          Project Configuration
        </CardTitle>
        <CardDescription>
          Enter a project ID to use across all training environment steps. This project ID will persist throughout your training environment operations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Project ID input and validation button */}
        <div className="flex gap-4 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="projectId">Project ID</Label>
            <Input
              id="projectId"
              value={projectId}
              onChange={(e) => onProjectIdChange(e.target.value)}
              placeholder="Enter project ID"
              disabled={isValidating}
            />
          </div>
          <Button 
            onClick={onValidate} 
            disabled={isValidating || !projectId.trim()}
          >
            {isValidating ? "Validating..." : "Validate Project"}
          </Button>
        </div>

        {/* Success message when project is validated */}
        {projectValid && (
          <Alert>
            <AlertDescription>
              ✅ Project - <strong>{projectName || projectId}</strong> has been validated and ready for training environment operations.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
