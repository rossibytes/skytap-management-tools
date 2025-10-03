import React, { useState, useEffect } from "react";
import { Link, Download, Copy, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { skytapAPI } from "@/lib/skytap-api";

interface UrlResult {
  configurationName: string;
  desktopUrl: string;
}

interface LookupUrlsProps {
  projectId: string;
  onComplete: (results: any) => void;
  stepResults?: Record<string, any>;
}

const LookupUrls: React.FC<LookupUrlsProps> = ({ projectId, onComplete, stepResults }) => {
  const [urlResults, setUrlResults] = useState<UrlResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLogsOpen, setIsLogsOpen] = useState(true);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const handleLookup = async () => {
    if (!projectId.trim()) {
      setError('Project ID is required');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUrlResults([]);
    setLogs([]);

    try {
      addLog(`Starting URL lookup for project ${projectId}`);
      
      // First get all configurations in the project
      const configsResponse = await skytapAPI.getProjectConfigurations(projectId.trim());
      const configurations = configsResponse;

      addLog(`Found ${configurations.length} configuration(s) in project`);

      if (!configurations || configurations.length === 0) {
        setError('No configurations found in the specified project');
        addLog('No configurations found in the specified project');
        return;
      }

      // For each configuration, get its publish sets
      const results: UrlResult[] = [];
      for (const config of configurations) {
        try {
          addLog(`Checking publish sets for configuration ${config.id} (${config.name})`);
          const publishSetsResponse = await skytapAPI.getPublishSets(config.id);
          const publishSets = publishSetsResponse;
          
          if (publishSets && publishSets.length > 0) {
            const result = {
              configurationName: publishSets[0].configuration_name || config.name,
              desktopUrl: publishSets[0].desktops_url
            };
            results.push(result);
            addLog(`Found sharing portal for ${result.configurationName}: ${result.desktopUrl}`);
          } else {
            addLog(`No sharing portals found for configuration ${config.id}`);
          }
        } catch (error) {
          console.error(`Error fetching publish sets for configuration ${config.id}:`, error);
          addLog(`Error fetching publish sets for configuration ${config.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          // Continue processing other configurations even if one fails
        }
      }

      setUrlResults(results);
      addLog(`URL lookup completed. Found ${results.length} sharing portal URL(s)`);
      
      // Call onComplete with results
      onComplete({
        success: true,
        results: results,
        logs: logs,
        totalUrls: results.length
      });
      
      if (results.length === 0) {
        setError('No sharing portals found in the specified project');
        addLog('No sharing portals found in the specified project');
      } else {
        toast({
          title: "URLs Retrieved",
          description: `Found ${results.length} sharing portal URL(s)`,
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to lookup URLs';
      setError(errorMessage);
      addLog(`URL lookup failed: ${errorMessage}`);
      
      onComplete({
        success: false,
        error: errorMessage,
        logs: logs
      });
      
      toast({
        title: "URL Lookup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    const textToCopy = urlResults
      .map(result => `${result.configurationName}\n${result.desktopUrl}`)
      .join('\n\n');
    
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 3000);
        toast({
          title: "Copied to Clipboard",
          description: "URLs have been copied to your clipboard",
        });
      })
      .catch(err => {
        console.error('Failed to copy text:', err);
        setError('Failed to copy to clipboard');
        toast({
          title: "Copy Failed",
          description: "Failed to copy URLs to clipboard",
          variant: "destructive",
        });
      });
  };

  const handleDownloadCsv = () => {
    const csvContent = [
      ['Configuration Name', 'Desktop URL'],
      ...urlResults.map(result => [result.configurationName, result.desktopUrl])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `skytap_urls_${projectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "CSV Downloaded",
      description: "URLs have been downloaded as CSV file",
    });
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button 
        onClick={handleLookup} 
        disabled={isLoading || !projectId}
        className="w-full"
      >
        <Link className="h-4 w-4 mr-2" />
        {isLoading ? "Looking up..." : "Lookup URLs"}
      </Button>

      {logs.length > 0 && (
        <Card>
          <Collapsible open={isLogsOpen} onOpenChange={setIsLogsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">URL Lookup Log</CardTitle>
                    <CardDescription>
                      Real-time log of the URL lookup process
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

      {urlResults.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sharing Portal URLs</CardTitle>
              <CardDescription>
                Found {urlResults.length} sharing portal URL(s) in project {projectId}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Configuration Name</TableHead>
                      <TableHead>Desktop URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {urlResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">
                          {result.configurationName}
                        </TableCell>
                        <TableCell>
                          <a
                            href={result.desktopUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline break-all"
                          >
                            {result.desktopUrl}
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Options</CardTitle>
              <CardDescription>
                Export the URLs in different formats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <Button 
                  onClick={handleCopyToClipboard}
                  variant="outline"
                  className="flex-1"
                >
                  {copySuccess ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy to Clipboard
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleDownloadCsv}
                  variant="outline"
                  className="flex-1"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {urlResults.length === 0 && !isLoading && !error && projectId && (
        <Card>
          <CardContent className="py-16 text-center">
            <Link className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No URLs Found</h3>
            <p className="text-muted-foreground">
              No sharing portal URLs were found in project {projectId}. Make sure the project contains environments with sharing portals.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LookupUrls;