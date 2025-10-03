import React, { useState, useEffect } from "react";
import { Copy, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { skytapAPI } from "@/lib/skytap-api";

interface CopyResult {
  copyId: string;
  name: string;
  projectId: string;
}

interface CopyFormData {
  projectId: string;
  masterEnvironmentId: string;
  desiredCopies: number;
  namePrefix: string;
}

interface CopyEnvironmentProps {
  projectId: string;
  onComplete: (results: any) => void;
  stepResults?: Record<string, any>;
}

const CopyEnvironment: React.FC<CopyEnvironmentProps> = ({ projectId, onComplete, stepResults }) => {
  const [formData, setFormData] = useState<CopyFormData>({
    projectId: projectId || '',
    masterEnvironmentId: '',
    desiredCopies: 1,
    namePrefix: ''
  });
  const [isCopying, setIsCopying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<CopyResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLogsOpen, setIsLogsOpen] = useState(true);

  // Update projectId when prop changes
  useEffect(() => {
    if (projectId) {
      setFormData(prev => ({ ...prev, projectId }));
    }
  }, [projectId]);

  const handleChange = (field: keyof CopyFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'desiredCopies' 
      ? Math.max(1, parseInt(e.target.value) || 1)
      : e.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  // Remove the processResults function - we'll track results directly

  const handleCopyEnvironment = async () => {
    // Validation
    if (!formData.projectId.trim()) {
      setError('Project ID is required');
      return;
    }
    if (!formData.masterEnvironmentId.trim()) {
      setError('Master Environment ID is required');
      return;
    }
    if (!formData.namePrefix.trim()) {
      setError('Name Prefix is required');
      return;
    }
    if (formData.desiredCopies < 1) {
      setError('Desired copies must be at least 1');
      return;
    }

    setIsCopying(true);
    setError(null);
    setLogs([]);
    setResults([]);
    setProgress(0);

    try {
      const { projectId, masterEnvironmentId, desiredCopies, namePrefix } = formData;
      
      addLog(`Starting copy process for ${desiredCopies} environment(s)`);
      addLog(`Master Environment ID: ${masterEnvironmentId}`);
      addLog(`Project ID: ${projectId}`);
      addLog(`Name Prefix: ${namePrefix}`);

      const copyIds: string[] = [];
      const copyResults: CopyResult[] = [];
      const totalSteps = desiredCopies * 3; // Create + Name + Project for each copy
      let currentStep = 0;

      // Step 1: Create copies with 10-second delays
      addLog('Step 1: Creating environment copies...');
      for (let i = 0; i < desiredCopies; i++) {
        try {
          addLog(`Creating copy ${i + 1} of ${desiredCopies}...`);
          const copyResponse = await skytapAPI.copyEnvironment(masterEnvironmentId);
          const copyId = String(copyResponse.id);
          copyIds.push(copyId);
          
          addLog(`Successfully created copy ${i + 1} with ID ${copyId}`);
          currentStep++;
          setProgress((currentStep / totalSteps) * 100);

          // Wait 10 seconds before next copy (except for the last one)
          if (i < desiredCopies - 1) {
            addLog('Waiting 10 seconds before creating next copy...');
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Failed to create copy ${i + 1}: ${errorMessage}`);
        }
      }

      // Step 2: Update names
      addLog('Step 2: Updating environment names...');
      for (let i = 0; i < copyIds.length; i++) {
        try {
          const copyId = copyIds[i];
          const name = `${namePrefix} - ${String(i + 1).padStart(2, '0')}`;
          
          addLog(`Updating name for copy ${i + 1} (ID: ${copyId}) to "${name}"`);
          await skytapAPI.updateEnvironmentName(copyId, name);
          addLog(`Successfully updated name for copy ${copyId} to "${name}"`);
          
          // Track the result
          copyResults.push({
            copyId: copyId,
            name: name,
            projectId: projectId
          });
          
          currentStep++;
          setProgress((currentStep / totalSteps) * 100);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Failed to update name for copy ${copyIds[i]}: ${errorMessage}`);
        }
      }

      // Step 3: Add to project
      addLog('Step 3: Adding copies to project...');
      for (let i = 0; i < copyIds.length; i++) {
        try {
          const copyId = copyIds[i];
          
          addLog(`Adding copy ${i + 1} (ID: ${copyId}) to project ${projectId}`);
          await skytapAPI.addEnvironmentToProject(copyId, projectId);
          addLog(`Successfully added copy ${copyId} to project ${projectId}`);
          
          currentStep++;
          setProgress((currentStep / totalSteps) * 100);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Failed to add copy ${copyIds[i]} to project: ${errorMessage}`);
        }
      }

      // Set results and complete
      setResults(copyResults);
      setProgress(100);

      addLog(`Copy process completed! Created ${copyResults.length} environment(s)`);
      
      // Call onComplete with results
      onComplete({
        success: true,
        results: copyResults,
        logs: logs,
        totalCopies: copyResults.length
      });
      
      toast({
        title: "Copy Process Complete",
        description: `Successfully created ${copyResults.length} environment(s)`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy environments';
      setError(errorMessage);
      addLog(`Copy process failed: ${errorMessage}`);
      
      onComplete({
        success: false,
        error: errorMessage,
        logs: logs
      });
      
      toast({
        title: "Copy Process Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="masterEnvironmentId">Master Environment ID</Label>
          <Input
            id="masterEnvironmentId"
            value={formData.masterEnvironmentId}
            onChange={handleChange('masterEnvironmentId')}
            placeholder="Enter master environment ID"
            disabled={isCopying}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="desiredCopies">Desired Copies</Label>
          <Input
            id="desiredCopies"
            type="number"
            min="1"
            max="50"
            value={formData.desiredCopies}
            onChange={handleChange('desiredCopies')}
            placeholder="Number of copies to create"
            disabled={isCopying}
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="namePrefix">Name Prefix</Label>
          <Input
            id="namePrefix"
            value={formData.namePrefix}
            onChange={handleChange('namePrefix')}
            placeholder="e.g., Training"
            disabled={isCopying}
          />
        </div>
      </div>

      <Button 
        onClick={handleCopyEnvironment} 
        disabled={isCopying || !projectId}
        className="w-full"
      >
        <Copy className="h-4 w-4 mr-2" />
        {isCopying ? "Copying Environments..." : "Copy Environment"}
      </Button>

      {isCopying && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Copy Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

      {logs.length > 0 && (
        <Card>
          <Collapsible open={isLogsOpen} onOpenChange={setIsLogsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Copy Process Log</CardTitle>
                    <CardDescription>
                      Real-time log of the copy process
                    </CardDescription>
                  </div>
                  {isLogsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="bg-muted rounded-md p-4 font-mono text-sm space-y-1 max-h-64 overflow-y-auto">
                  {logs.map((log, index) => (
                    <div key={index} className="text-foreground">
                      {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Copy Results</CardTitle>
            <CardDescription>
              Successfully created environments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result, index) => (
                <Card key={result.copyId} className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-green-800">Copy {index + 1}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div><strong>ID:</strong> {result.copyId}</div>
                      <div><strong>Name:</strong> {result.name}</div>
                      <div><strong>Project:</strong> {result.projectId}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CopyEnvironment;