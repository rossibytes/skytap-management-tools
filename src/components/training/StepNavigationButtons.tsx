import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
  completed: boolean;
}

interface StepNavigationButtonsProps {
  currentStep: number;
  steps: Step[];
  onPreviousStep: () => void;
  onNextStep: () => void;
}

export const StepNavigationButtons: React.FC<StepNavigationButtonsProps> = ({
  currentStep,
  steps,
  onPreviousStep,
  onNextStep
}) => {
  const navigate = useNavigate();

  const handleCompleteSetup = () => {
    toast({
      title: "Training Setup Complete!",
      description: "All training environment steps have been completed successfully.",
    });
    navigate("/");
  };

  return (
    <div className="flex justify-between mt-6">
      <Button
        onClick={onPreviousStep}
        disabled={currentStep === 0}
        variant="outline"
      >
        <ChevronLeft className="h-4 w-4 mr-2" /> Previous
      </Button>
      {currentStep < steps.length - 1 ? (
        <Button
          onClick={onNextStep}
          disabled={!steps[currentStep]?.completed}
        >
          Next Step
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      ) : (
        <Button
          onClick={handleCompleteSetup}
          disabled={!steps[currentStep]?.completed}
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Complete Setup
        </Button>
      )}
    </div>
  );
};

