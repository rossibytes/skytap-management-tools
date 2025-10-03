import React, { useState, useEffect } from "react";
import { Power, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { skytapAPI } from "@/lib/skytap-api";

interface StatusResult {
  id: string;
  name: string;
  status: string;
  autoShutdownStatus: string;
}

interface PowerOptionsProps {
  projectId: string;
  onComplete: (results: any) => void;
  stepResults?: Record<string, any>;
}

const PowerOptions: React.FC<PowerOptionsProps> = ({ projectId, onComplete, stepResults }) => {
  const [statusResults, setStatusResults] = useState<StatusResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLogsOpen, setIsLogsOpen] = useState(true);

  const getRunstateColor = (runstate: string) => {
    switch (runstate.toLowerCase()) {
      case 'running':
        return 'bg-green-500 text-white hover:bg-green-600';
      case 'stopped':
        return 'bg-red-500 text-white hover:bg-red-600';
      case 'suspended':
        return 'bg-orange-500 text-white hover:bg-orange-600';
      default:
        return 'bg-gray-500 text-white hover:bg-gray-600';
    }
  };

  const getAutoShutdownColor = (status: string) => {
    if (status === 'Auto-Shutdown is Disabled') {
      return 'bg-green-100 border-green-300 text-green-800';
    } else {
      return 'bg-red-100 border-red-300 text-red-800';
    }
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const handleCheckStatus = async () => {
    if (!projectId.trim()) {
      setError('Project ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setLogs([]);

    try {
      addLog(`Starting status check for project ${projectId}`);
      
      // Get all configurations in the project
      const response = await skytapAPI.getProjectConfigurations(projectId.trim());
      const configurations = response;
      
      addLog(`Found ${configurations.length} configuration(s) in project`);
      
      if (!configurations || configurations.length === 0) {
        setError('No configurations found in the specified project');
        addLog('No configurations found in the specified project');
        return;
      }

      // Get status for each configuration
      const results: StatusResult[] = [];
      for (const config of configurations) {
        try {
          addLog(`Checking status for configuration ${config.id} (${config.name})`);
          const statusResponse = await skytapAPI.getConfigurationStatus(config.id);
          const status = statusResponse;
          
          const autoShutdownStatus = status.auto_suspend_description 
            ? status.auto_suspend_description 
            : 'Auto-Shutdown is Disabled';
          
          addLog(`Configuration ${config.id}: ${status.runstate}, Auto-shutdown: ${autoShutdownStatus}`);
          
          results.push({
            id: status.id,
            name: status.name,
            status: status.runstate,
            autoShutdownStatus: autoShutdownStatus
          });
        } catch (error) {
          console.error(`Error getting status for configuration ${config.id}:`, error);
          addLog(`Error getting status for configuration ${config.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          results.push({
            id: config.id,
            name: config.name,
            status: 'Unknown',
            autoShutdownStatus: 'Error retrieving status'
          });
        }
      }
      
      setStatusResults(results);
      addLog(`Status check completed. Retrieved status for ${results.length} environment(s)`);
      
      // Call onComplete with results
      onComplete({
        success: true,
        results: results,
        logs: logs,
        totalEnvironments: results.length
      });
      
      toast({
        title: "Status Retrieved",
        description: `Retrieved status for ${results.length} environment(s)`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retrieve status';
      setError(errorMessage);
      addLog(`Status check failed: ${errorMessage}`);
      
      onComplete({
        success: false,
        error: errorMessage,
        logs: logs
      });
      
      toast({
        title: "Status Check Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisableAutoshutdown = async () => {
    if (!projectId.trim()) {
      setError('Project ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setLogs([]);

    try {
      addLog(`Starting auto-shutdown disable for project ${projectId}`);
      
      // Get all configurations first
      const response = await skytapAPI.getProjectConfigurations(projectId.trim());
      const configurations = response;
      
      addLog(`Found ${configurations.length} configuration(s) in project`);
      
      if (!configurations || configurations.length === 0) {
        setError('No configurations found in the specified project');
        addLog('No configurations found in the specified project');
        return;
      }

      // Disable autoshutdown for each configuration
      let successCount = 0;
      for (const config of configurations) {
        try {
          addLog(`Disabling auto-shutdown for configuration ${config.id} (${config.name})`);
          await skytapAPI.disableConfigurationAutoshutdown(config.id);
          successCount++;
          addLog(`Successfully disabled auto-shutdown for configuration ${config.id}`);
        } catch (error) {
          console.error(`Error disabling autoshutdown for configuration ${config.id}:`, error);
          addLog(`Error disabling auto-shutdown for configuration ${config.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      const successMessage = `Successfully disabled autoshutdown for ${successCount} environment(s) in the project`;
      setSuccess(successMessage);
      addLog(successMessage);
      
      // Call onComplete with results
      onComplete({
        success: true,
        results: {
          totalEnvironments: configurations.length,
          disabledCount: successCount,
          environments: configurations.map(config => ({
            id: config.id,
            name: config.name
          }))
        },
        logs: logs,
        message: successMessage
      });
      
      toast({
        title: "Auto-Shutdown Disabled",
        description: `Disabled auto-shutdown for ${successCount} environment(s)`,
      });

      // Refresh status after disabling
      addLog('Refreshing status after auto-shutdown changes...');
      await handleCheckStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable autoshutdown';
      setError(errorMessage);
      addLog(`Auto-shutdown disable failed: ${errorMessage}`);
      
      onComplete({
        success: false,
        error: errorMessage,
        logs: logs
      });
      
      toast({
        title: "Auto-Shutdown Disable Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Button 
          onClick={handleCheckStatus} 
          disabled={isLoading || !projectId}
        >
          <Power className="h-4 w-4 mr-2" />
          {isLoading ? "Checking..." : "Check Status"}
        </Button>
        <Button 
          onClick={handleDisableAutoshutdown} 
          disabled={isLoading || !projectId}
          variant="destructive"
        >
          <XCircle className="h-4 w-4 mr-2" />
          {isLoading ? "Disabling..." : "Disable Auto-Shutdown"}
        </Button>
      </div>

      {logs.length > 0 && (
        <Card>
          <Collapsible open={isLogsOpen} onOpenChange={setIsLogsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Power Options Log</CardTitle>
                    <CardDescription>
                      Real-time log of power operations
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

      {statusResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environment Status</CardTitle>
            <CardDescription>
              Current power and auto-shutdown status for project environments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {statusResults.map((result) => (
                <Card 
                  key={result.id} 
                  className={`transition-all duration-200 ${
                    result.autoShutdownStatus === 'Auto-Shutdown is Disabled' 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm truncate" title={result.name}>
                          {result.name}
                        </h4>
                        <Badge 
                          variant="secondary" 
                          className={`shrink-0 ${getRunstateColor(result.status)}`}
                        >
                          {result.status}
                        </Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="text-xs">
                          <strong>ID:</strong> {result.id}
                        </div>
                        
                        <div className={`p-2 rounded text-xs border ${getAutoShutdownColor(result.autoShutdownStatus)}`}>
                          <div className="flex items-center gap-1">
                            {result.autoShutdownStatus === 'Auto-Shutdown is Disabled' ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <AlertTriangle className="h-3 w-3" />
                            )}
                            <strong>Auto-Shutdown:</strong>
                          </div>
                          <div className="mt-1">
                            {result.autoShutdownStatus}
                          </div>
                        </div>
                      </div>
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

export default PowerOptions;