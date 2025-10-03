import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
  completed: boolean;
}

interface StepContentProps {
  currentStep: number;
  steps: Step[];
  projectId: string;
  projectValid: boolean;
  stepResults: Record<string, any>;
  onStepComplete: (stepId: string, results: any) => void;
}

export const StepContent: React.FC<StepContentProps> = ({
  currentStep,
  steps,
  projectId,
  projectValid,
  stepResults,
  onStepComplete
}) => {
  const currentStepComponent = steps[currentStep]?.component;

  if (!currentStepComponent) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {steps[currentStep]?.icon}
          {steps[currentStep]?.title}
        </CardTitle>
        <CardDescription>{steps[currentStep]?.description}</CardDescription>
      </CardHeader>
      <CardContent>
        {projectValid ? (
          React.createElement(currentStepComponent, {
            projectId: projectId,
            onComplete: (results: any) => onStepComplete(steps[currentStep].id, results),
            stepResults: stepResults,
          })
        ) : (
          <Alert variant="destructive">
            <AlertDescription>
              Please validate a Project ID to proceed with the training environment setup.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
