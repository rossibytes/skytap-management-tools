// StepNavigation Component
// A visual navigation component that displays training workflow steps with completion status

import React from "react";
import { CheckCircle } from "lucide-react";

/**
 * Step interface defining the structure of each workflow step
 */
interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
  completed: boolean;
}

/**
 * Props for the StepNavigation component
 */
interface StepNavigationProps {
  /** Array of step objects to display */
  steps: Step[];
  /** Index of the currently active step */
  currentStep: number;
  /** Whether the project has been validated (affects step availability) */
  projectValid: boolean;
  /** Callback function when a step is clicked */
  onStepClick: (stepIndex: number) => void;
}

/**
 * StepNavigation Component
 * 
 * Renders a grid of step cards that show the training workflow progress.
 * Each step can be in one of three states:
 * - Current: Highlighted as the active step
 * - Completed: Shows checkmark and green styling
 * - Pending: Disabled until previous steps are completed
 * 
 * @param props - StepNavigationProps object
 */
export const StepNavigation: React.FC<StepNavigationProps> = ({
  steps,
  currentStep,
  projectValid,
  onStepClick
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {steps.map((step, index) => {
        // Determine step state and styling
        const isCurrent = index === currentStep;
        const isCompleted = step.completed;
        const isDisabled = !projectValid || (index > 0 && !steps[index - 1]?.completed && index !== currentStep);
        
        return (
          <div
            key={step.id}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
              isCurrent
                ? 'border-primary bg-primary/5 shadow-md'
                : isCompleted
                ? 'border-green-500 bg-green-50 hover:bg-green-100'
                : 'border-muted-foreground/20 bg-card hover:bg-muted/50'
            } ${
              isDisabled ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => !isDisabled && onStepClick(index)}
          >
            <div className="flex items-center gap-3 mb-2">
              {/* Step icon or completion checkmark */}
              {isCompleted ? (
                <CheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <div className={`h-6 w-6 ${
                  isCurrent ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {step.icon}
                </div>
              )}
              
              {/* Step title with appropriate styling */}
              <h3 className={`font-semibold ${
                isCurrent ? 'text-primary' : isCompleted ? 'text-green-700' : 'text-foreground'
              }`}>
                {step.title}
              </h3>
            </div>
            
            {/* Step description */}
            <p className="text-sm text-muted-foreground">
              {step.description}
            </p>
          </div>
        );
      })}
    </div>
  );
};
