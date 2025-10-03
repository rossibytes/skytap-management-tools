import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Calendar, Power, Link, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { skytapAPI } from "@/lib/skytap-api";

// Import the individual tool components
import CopyEnvironment from "./training/CopyEnvironment";
import CreateSchedulers from "./training/CreateSchedulers";
import PowerOptions from "./training/PowerOptions";
import LookupUrls from "./training/LookupUrls";

// Import modular components
import { StepNavigation } from "@/components/training/StepNavigation";
import { ProjectValidation } from "@/components/training/ProjectValidation";
import { StepContent } from "@/components/training/StepContent";
import { StepNavigationButtons } from "@/components/training/StepNavigationButtons";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
  completed: boolean;
}

const TrainingEnvironments = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [projectValid, setProjectValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepResults, setStepResults] = useState<Record<string, any>>({});
  const [steps, setSteps] = useState<Step[]>([]);


  const initialSteps: Step[] = [
    {
      id: "copy-environment",
      title: "Copy Environment",
      description: "Create multiple copies of a master environment with automated naming",
      icon: <Copy className="h-6 w-6" />,
      component: CopyEnvironment,
      completed: false
    },
    {
      id: "create-schedulers",
      title: "Create Schedulers",
      description: "Set up staggered schedulers for all environments",
      icon: <Calendar className="h-6 w-6" />,
      component: CreateSchedulers,
      completed: false
    },
    {
      id: "power-options",
      title: "Power Options",
      description: "Disable auto-shutdown to prevent unexpected suspensions",
      icon: <Power className="h-6 w-6" />,
      component: PowerOptions,
      completed: false
    },
    {
      id: "lookup-urls",
      title: "Lookup URLs",
      description: "Generate and export student access URLs",
      icon: <Link className="h-6 w-6" />,
      component: LookupUrls,
      completed: false
    }
  ];

  const validateProject = async () => {
    if (!projectId.trim()) {
      setError("Please enter a project ID");
      setProjectValid(false);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Try to get project configurations to validate the project exists
      await skytapAPI.getProjectConfigurations(projectId.trim());
      setProjectValid(true);
      toast({
        title: "Project Validated",
        description: `Project ${projectId} is valid and ready for training environment operations`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate project';
      setError(`Invalid project ID: ${errorMessage}`);
      setProjectValid(false);
      toast({
        title: "Project Validation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleStepComplete = (stepId: string, results: any) => {
    // Only mark as completed if the operation was successful
    if (results && results.success !== false) {
      setStepResults(prev => ({ ...prev, [stepId]: results }));
      setSteps(prev => prev.map(step => 
        step.id === stepId ? { ...step, completed: true } : step
      ));
      
      toast({
        title: "Step Completed",
        description: `${steps.find(s => s.id === stepId)?.title} completed successfully`,
      });
    }
  };

  const handleNextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || steps[stepIndex - 1]?.completed) {
      setCurrentStep(stepIndex);
    }
  };

  // Initialize steps state
  useEffect(() => {
    setSteps(initialSteps);
  }, []);

  // Load project ID from sessionStorage on component mount
  useEffect(() => {
    const savedProjectId = sessionStorage.getItem('trainingProjectId');
    if (savedProjectId) {
      setProjectId(savedProjectId);
      // Auto-validate if we have a saved project ID
      setProjectValid(true);
    }
  }, []);

  // Store project ID in sessionStorage when it changes
  useEffect(() => {
    if (projectId.trim()) {
      sessionStorage.setItem('trainingProjectId', projectId.trim());
    }
  }, [projectId]);

  const currentStepComponent = steps[currentStep]?.component;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-2xl font-bold">Training Environments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Step-by-step training environment setup and management
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Project ID Configuration */}
          <ProjectValidation
            projectId={projectId}
            isValidating={isValidating}
            projectValid={projectValid}
            error={error}
            onProjectIdChange={(value) => {
              setProjectId(value);
              setProjectValid(false);
              setError(null);
            }}
            onValidate={validateProject}
          />

          {/* Progress Indicator */}
          {projectValid && (
            <Card>
              <CardHeader>
                <CardTitle>Training Environment Setup Progress</CardTitle>
                <CardDescription>
                  Complete each step in sequence to set up your training environments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Overall Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="w-full" />
                </div>

                {/* Step Navigation */}
                <StepNavigation
                  steps={steps}
                  currentStep={currentStep}
                  projectValid={projectValid}
                  onStepClick={handleStepClick}
                />
              </CardContent>
            </Card>
          )}

          {/* Current Step Content */}
          {projectValid && (
            <StepContent
              currentStep={currentStep}
              steps={steps}
              projectId={projectId}
              projectValid={projectValid}
              stepResults={stepResults}
              onStepComplete={handleStepComplete}
            />
          )}

          {/* Navigation Buttons */}
          {projectValid && (
            <StepNavigationButtons
              currentStep={currentStep}
              steps={steps}
              onPreviousStep={handlePreviousStep}
              onNextStep={handleNextStep}
            />
          )}

          {/* Workflow Information */}
          <Card>
            <CardHeader>
              <CardTitle>Training Environment Workflow</CardTitle>
              <CardDescription>
                Recommended sequence for setting up training environments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                    1
                  </div>
                  <h4 className="font-semibold">Copy Environment</h4>
                  <p className="text-sm text-muted-foreground">Create multiple copies of master environment</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                    2
                  </div>
                  <h4 className="font-semibold">Create Schedulers</h4>
                  <p className="text-sm text-muted-foreground">Set up staggered schedules for all environments</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                    3
                  </div>
                  <h4 className="font-semibold">Power Options</h4>
                  <p className="text-sm text-muted-foreground">Disable auto-shutdown to prevent suspensions</p>
                </div>
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto text-sm font-bold">
                    4
                  </div>
                  <h4 className="font-semibold">Lookup URLs</h4>
                  <p className="text-sm text-muted-foreground">Generate and export student access URLs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default TrainingEnvironments;