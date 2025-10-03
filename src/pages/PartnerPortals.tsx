import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { skytapAPI } from "@/lib/skytap-api";

interface PublishSet {
  id: string;
  name: string;
  configuration_name: string;
  desktops_url: string;
  runtime_left_in_seconds: number;
  url: string;
  publish_set_type: string;
  runtime_limit: number;
  auto_suspend_description: string;
  created_at: string;
  expiration_date: string | null;
  expiration_date_tz: string | null;
  start_time: string | null;
  end_time: string | null;
  time_zone: string | null;
  multiple_url: boolean;
  password: string | null;
  use_smart_client: boolean;
  configurationRunstate?: string;
  configurationId?: string;
}

interface ConfigurationData {
  configurationId: string;
  configurationName: string;
  configurationRunstate: string;
  publishSets: PublishSet[];
  error?: string;
}

interface SharingPortalsData {
  projectId: string;
  totalConfigurations: number;
  sharingPortals: ConfigurationData[];
}

const PartnerPortals = () => {
  const navigate = useNavigate();
  const [projectId, setProjectId] = useState("");
  const [sharingPortals, setSharingPortals] = useState<SharingPortalsData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPortal, setSelectedPortal] = useState<{
    id: string;
    name: string;
    runtime_left_in_seconds: number;
    configurationId: string;
  } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRuntimeHours, setNewRuntimeHours] = useState("");
  const [updatingRuntime, setUpdatingRuntime] = useState(false);

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

  const formatRuntime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const handleLookupSharingPortals = async () => {
    if (!projectId.trim()) {
      setError('Please enter a project ID');
      toast({
        title: "Error",
        description: "Please enter a Project ID",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Get all configurations for the project
      const configurationsResponse = await skytapAPI.getProjectConfigurations(projectId.trim());
      const configurations = configurationsResponse;

      // Step 2: Get sharing portal details for each configuration
      const sharingPortalsData: ConfigurationData[] = [];
      
      for (const config of configurations) {
        try {
          const publishSetsResponse = await skytapAPI.getPublishSets(config.id);
          const publishSets = publishSetsResponse || [];
          
          sharingPortalsData.push({
            configurationId: config.id,
            configurationName: config.name,
            configurationRunstate: config.runstate,
            publishSets
          });
        } catch (error) {
          // Handle individual configuration errors
          sharingPortalsData.push({
            configurationId: config.id,
            configurationName: config.name,
            configurationRunstate: config.runstate,
            publishSets: [],
            error: error instanceof Error ? error.message : 'Failed to load publish sets'
          });
        }
      }

      setSharingPortals({
        projectId: projectId.trim(),
        totalConfigurations: configurations.length,
        sharingPortals: sharingPortalsData
      });

      const totalPortals = sharingPortalsData.reduce((sum, config) => sum + config.publishSets.length, 0);
      toast({
        title: "Portals Loaded",
        description: `Found ${totalPortals} sharing portals across ${configurations.length} configurations`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load sharing portal details';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Collect all publish sets from all configurations and filter based on search
  const allPublishSets = sharingPortals?.sharingPortals.flatMap(portal => 
    portal.error ? [] : portal.publishSets.map(publishSet => ({
      ...publishSet,
      configurationRunstate: portal.configurationRunstate,
      configurationId: portal.configurationId
    }))
  ) || [];

  const filteredPublishSets = allPublishSets.filter(publishSet =>
    publishSet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleManagePortal = (portal: PublishSet, configurationId: string) => {
    setSelectedPortal({
      id: portal.id,
      name: portal.name,
      runtime_left_in_seconds: portal.runtime_left_in_seconds,
      configurationId
    });
    setNewRuntimeHours("");
    setIsModalOpen(true);
  };

  const handleSaveRuntime = async () => {
    if (!selectedPortal || !newRuntimeHours.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid number of hours",
        variant: "destructive",
      });
      return;
    }

    const hours = parseFloat(newRuntimeHours);
    if (isNaN(hours) || hours <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid number of hours",
        variant: "destructive",
      });
      return;
    }

    // Skytap API expects runtime_limit in minutes
    const runtimeLimitMinutes = Math.floor(hours * 60);
    // Convert hours to seconds for runtime_left_in_seconds
    const runtimeLeftInSeconds = Math.floor(hours * 3600);
    setUpdatingRuntime(true);

    try {
      await skytapAPI.updatePublishSet(
        selectedPortal.configurationId,
        selectedPortal.id,
        { 
          runtime_limit: runtimeLimitMinutes,
          runtime_left_in_seconds: runtimeLeftInSeconds
        }
      );
      
      toast({
        title: "Runtime Updated",
        description: `Portal ${selectedPortal.id} runtime updated to ${hours} hours`,
      });
      
      setIsModalOpen(false);
      setSelectedPortal(null);
      setNewRuntimeHours("");
      
      // Refresh the sharing portals data
      if (projectId.trim()) {
        await handleLookupSharingPortals();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update runtime';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUpdatingRuntime(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/partner")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Partner Environments
          </Button>
          <h1 className="text-2xl font-bold">Manage Partner Portals</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure and oversee partner portal settings
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Lookup Sharing Portals</CardTitle>
              <CardDescription>Enter a project ID to view associated sharing portals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="projectId">Project ID</Label>
                  <Input
                    id="projectId"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="Enter project ID"
                    disabled={isLoading}
                  />
                </div>
                <Button onClick={handleLookupSharingPortals} disabled={isLoading}>
                  {isLoading ? "Loading..." : "Lookup Sharing Portals"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {sharingPortals && (
            <Card>
              <CardHeader>
                <CardTitle>Sharing Portal Details</CardTitle>
                <CardDescription>
                  Project: {sharingPortals.projectId} | Total Configurations: {sharingPortals.totalConfigurations} | Total Portals: {allPublishSets.length}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search portals by name"
                    className="pl-9"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPublishSets.map((portal) => (
                    <Card key={portal.id} className="flex flex-col">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base leading-tight">{portal.name}</CardTitle>
                          <Badge variant="secondary" className={`shrink-0 ${getRunstateColor(portal.configurationRunstate || 'unknown')}`}>
                            {portal.configurationRunstate}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col justify-between space-y-3">
                        <div className="space-y-1 text-sm">
                          <div>
                            <span className="font-semibold">ID:</span> {portal.id}
                          </div>
                          <div>
                            <span className="font-semibold">Runtime Left:</span> {formatRuntime(portal.runtime_left_in_seconds)}
                          </div>
                          <div>
                            <span className="font-semibold">Configuration:</span> {portal.configuration_name}
                          </div>
                          <a
                            href={portal.desktops_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 break-all"
                          >
                            {portal.desktops_url}
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>
                        <Button
                          onClick={() => handleManagePortal(portal, portal.configurationId || '')}
                          className="w-full"
                        >
                          MANAGE PORTAL
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredPublishSets.length === 0 && searchQuery && (
                  <div className="text-center py-8 text-muted-foreground">
                    No portals found matching "{searchQuery}"
                  </div>
                )}

                {filteredPublishSets.length === 0 && !searchQuery && allPublishSets.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No sharing portals found in this project
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Portal Runtime</DialogTitle>
              <DialogDescription>
                Update the runtime limit for this sharing portal
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <span className="font-semibold">Portal ID:</span> {selectedPortal?.id}
              </div>
              <div>
                <span className="font-semibold">Name:</span> {selectedPortal?.name}
              </div>
              <div>
                <span className="font-semibold">Current Runtime Left:</span> {selectedPortal ? formatRuntime(selectedPortal.runtime_left_in_seconds) : 'N/A'}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newRuntimeHours">New Runtime (hours)</Label>
                <Input
                  id="newRuntimeHours"
                  type="number"
                  step="0.1"
                  min="0"
                  value={newRuntimeHours}
                  onChange={(e) => setNewRuntimeHours(e.target.value)}
                  placeholder="Enter hours (e.g., 20.5)"
                  disabled={updatingRuntime}
                />
                <p className="text-sm text-muted-foreground">
                  Enter the total runtime in hours. This will set both the runtime limit and remaining time.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={updatingRuntime}>
                CANCEL
              </Button>
              <Button onClick={handleSaveRuntime} disabled={updatingRuntime}>
                {updatingRuntime ? "UPDATING..." : "SAVE"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default PartnerPortals;
