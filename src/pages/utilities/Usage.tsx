import { useNavigate } from "react-router-dom";
import { ArrowLeft, Code, Grid3x3, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { skytapAPI, SkytapConfiguration, SkytapTemplate, SkytapLabel } from "@/lib/skytap-api";
import { Box, Typography, Slider } from "@mui/material";

interface BillingCategory {
  name: string;
  count: number;
  meteredRam: number;
  storage: number;
}

interface TemplateBillingCategory {
  name: string;
  count: number;
}

const Usage = () => {
  const navigate = useNavigate();
  
  // Shared batch configuration state
  const [batchSize, setBatchSize] = useState<number>(10);
  const [delayMs, setDelayMs] = useState<number>(1000);

  // Environment states
  const [envCount, setEnvCount] = useState(10);
  const [envProgress, setEnvProgress] = useState(0);
  const [envFetching, setEnvFetching] = useState(false);
  const [envResults, setEnvResults] = useState<BillingCategory[] | null>(null);
  const [envTotalRam, setEnvTotalRam] = useState(0);
  const [envTotalStorage, setEnvTotalStorage] = useState(0);

  // Template states
  const [templateCount, setTemplateCount] = useState(3);
  const [templateProgress, setTemplateProgress] = useState(0);
  const [templateFetching, setTemplateFetching] = useState(false);
  const [templateResults, setTemplateResults] = useState<TemplateBillingCategory[] | null>(null);

  // Slider event handlers
  const handleBatchSizeChange = (_event: Event, newValue: number | number[]) => {
    setBatchSize(newValue as number);
  };

  const handleDelayChange = (_event: Event, newValue: number | number[]) => {
    setDelayMs(newValue as number);
  };

  const handleFetchEnvironments = async () => {
    setEnvFetching(true);
    setEnvProgress(0);
    setEnvResults(null);

    try {
      console.log('Starting environment analysis...');
      
      // Fetch all configurations
      const configurations = await skytapAPI.getAllConfigurations(envCount, 0);
      console.log('Configurations fetched:', configurations);
      
      const billingCounts: Record<string, { count: number; svms: number; storage: number }> = {};
      let totalRam = 0;
      let totalStorage = 0;
      const unlabeledConfigurations: string[] = [];

      // Calculate totals from all configurations
      configurations.forEach((configuration: any) => {
        totalRam += configuration.svms || 0;
        totalStorage += (configuration.storage || 0) / 1024; // Convert MB to GB
      });

      console.log('Environment totals:', { 
        totalRam, 
        totalStorageMB: totalStorage * 1024, 
        totalStorageGB: totalStorage 
      });

      // Extract configuration IDs for batch processing
      const configurationIds = configurations.map((configuration: any) => configuration.id);
      console.log('Configuration IDs extracted:', configurationIds);

      // Process configurations in batches
      const totalBatches = Math.ceil(configurationIds.length / batchSize);
      console.log(`Processing ${configurationIds.length} configurations in ${totalBatches} batches of ${batchSize}`);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, configurationIds.length);
        const batchConfigurationIds = configurationIds.slice(startIndex, endIndex);
        
        console.log(`Processing batch ${batchIndex + 1}/${totalBatches}: configurations ${startIndex + 1}-${endIndex}`);

        // Process each configuration in the batch
        for (const configurationId of batchConfigurationIds) {
          try {
            const labels = await skytapAPI.getConfigurationLabels(configurationId);
            
            // Filter for billing category labels
            const billingCategoryTags = labels.filter(
              (label: SkytapLabel) => label.type === 'Billing Category'
            );

            if (billingCategoryTags.length === 0) {
              const configurationUrl = `https://cloud.skytap.com/configurations/${configurationId}`;
              unlabeledConfigurations.push(configurationUrl);
              continue;
            }

            // Find the configuration data for resource calculation
            const config = configurations.find(c => c.id === configurationId);
            if (!config) continue;

            // Calculate resources for this configuration
            const configSvms = config.svms || 0;
            const configStorage = (config.storage || 0) / 1024; // Convert MB to GB

            // Add to billing category counts
            for (const billingTag of billingCategoryTags) {
              const text = billingTag.text;
              if (!billingCounts[text]) {
                billingCounts[text] = { count: 0, svms: 0, storage: 0 };
              }
              billingCounts[text].count += 1;
              billingCounts[text].svms += configSvms;
              billingCounts[text].storage += configStorage;
            }
          } catch (error) {
            console.warn(`Error fetching labels for configuration ${configurationId}:`, error);
            const configurationUrl = `https://cloud.skytap.com/configurations/${configurationId}`;
            unlabeledConfigurations.push(configurationUrl);
          }
        }

        // Update progress
        const currentProgress = ((batchIndex + 1) / totalBatches) * 100;
        setEnvProgress(currentProgress);

        // Wait for the batch delay (except after the last batch)
        if (batchIndex < totalBatches - 1) {
          console.log(`Waiting ${delayMs}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      console.log('Environment billing counts:', billingCounts);
      console.log('Unlabeled configuration URLs:', unlabeledConfigurations);

      // Convert to array format
      const results: BillingCategory[] = Object.entries(billingCounts).map(([name, data]) => ({
        name,
        count: data.count,
        meteredRam: data.svms,
        storage: Number(data.storage.toFixed(2))
      }));

      setEnvTotalRam(totalRam);
      setEnvTotalStorage(Number(totalStorage.toFixed(2)));
      setEnvResults(results);
      
      toast({
        title: "Environments Fetched",
        description: `Successfully analyzed ${configurations.length} environment(s). Found ${results.length} billing categories.`,
      });

      if (unlabeledConfigurations.length > 0) {
        toast({
          title: "Unlabeled Environments",
          description: `${unlabeledConfigurations.length} environment(s) have no billing category labels.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch environments';
      console.error('Error:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setEnvFetching(false);
    }
  };

  const handleFetchTemplates = async () => {
    setTemplateFetching(true);
    setTemplateProgress(0);
    setTemplateResults(null);

    try {
      console.log('Starting template analysis...');
      
      // Fetch all templates
      const allTemplates = await skytapAPI.getAllTemplates(templateCount, 0);
      console.log('All templates fetched:', allTemplates);
      
      // Filter templates that have owner_name
      const templates = allTemplates.filter(
        (template: SkytapTemplate) => template.owner_name
      );
      console.log('Templates with owner_name:', templates);
      console.log(`Filtered out ${allTemplates.length - templates.length} templates without owner_name`);

      const billingCounts: Record<string, number> = {};
      const unlabeledTemplates: string[] = [];

      // Extract template IDs for batch processing
      const templateIds = templates.map((template: SkytapTemplate) => template.id);
      console.log('Template IDs extracted:', templateIds);

      // Process templates in batches
      const totalBatches = Math.ceil(templateIds.length / batchSize);
      console.log(`Processing ${templateIds.length} templates in ${totalBatches} batches of ${batchSize}`);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, templateIds.length);
        const batchTemplateIds = templateIds.slice(startIndex, endIndex);
        
        console.log(`Processing batch ${batchIndex + 1}/${totalBatches}: templates ${startIndex + 1}-${endIndex}`);

        // Process each template in the batch
        for (const templateId of batchTemplateIds) {
          try {
            const labels = await skytapAPI.getTemplateLabels(templateId);
            
            // Filter for billing category labels
            const billingCategoryTags = labels.filter(
              (label: SkytapLabel) => label.type === 'Billing Category'
            );

            if (billingCategoryTags.length === 0) {
              const templateUrl = `https://cloud.skytap.com/templates/${templateId}`;
              unlabeledTemplates.push(templateUrl);
              continue;
            }

            // Count templates by billing category
            for (const billingTag of billingCategoryTags) {
              const text = billingTag.text;
              billingCounts[text] = (billingCounts[text] || 0) + 1;
            }
          } catch (error) {
            console.warn(`Error fetching labels for template ${templateId}:`, error);
            const templateUrl = `https://cloud.skytap.com/templates/${templateId}`;
            unlabeledTemplates.push(templateUrl);
          }
        }

        // Update progress
        const currentProgress = ((batchIndex + 1) / totalBatches) * 100;
        setTemplateProgress(currentProgress);

        // Wait for the batch delay (except after the last batch)
        if (batchIndex < totalBatches - 1) {
          console.log(`Waiting ${delayMs}ms before next batch...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }

      console.log('Billing counts:', billingCounts);
      console.log('Unlabeled template URLs:', unlabeledTemplates);

      // Convert to array format
      const results: TemplateBillingCategory[] = Object.entries(billingCounts).map(([name, count]) => ({
        name,
        count
      }));

      setTemplateResults(results);
      
      toast({
        title: "Templates Fetched",
        description: `Successfully analyzed ${templates.length} template(s). Found ${results.length} billing categories.`,
      });

      if (unlabeledTemplates.length > 0) {
        toast({
          title: "Unlabeled Templates",
          description: `${unlabeledTemplates.length} template(s) have no billing category labels.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch templates';
      console.error('Error:', error);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setTemplateFetching(false);
    }
  };

  const copyTableToClipboard = () => {
    if (!envResults) return;
    
    const headers = "Billing Category\tEnvironment Count\tMetered RAM\tStorage (GB)\n";
    const rows = envResults.map(cat => 
      `${cat.name}\t${cat.count}\t${cat.meteredRam}\t${cat.storage}`
    ).join("\n");
    
    navigator.clipboard.writeText(headers + rows);
    toast({
      title: "Copied to Clipboard",
      description: "Table data copied successfully",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/utilities")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to General Utilities
          </Button>
          <div className="flex items-center gap-2">
            <Code className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Usage by Code</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Analyze and track usage patterns by code identifiers.
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="environments" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="environments" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                ENVIRONMENTS
              </TabsTrigger>
              <TabsTrigger value="templates" className="flex items-center gap-2">
                <Grid3x3 className="h-4 w-4" />
                TEMPLATES
              </TabsTrigger>
            </TabsList>

            <TabsContent value="environments" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Environments Usage</CardTitle>
                  <CardDescription>
                    Track and analyze environment usage patterns by billing category identifiers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="envCount">Environment Count</Label>
                      <Input
                        id="envCount"
                        type="number"
                        value={envCount}
                        onChange={(e) => setEnvCount(Number(e.target.value))}
                        disabled={envFetching}
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of environments to fetch from Skytap API
                      </p>
                    </div>
                    <Button onClick={handleFetchEnvironments} disabled={envFetching}>
                      {envFetching ? "Fetching..." : "FETCH ENVIRONMENTS"}
                    </Button>
                  </div>

                  {envFetching && (
                    <div className="space-y-2">
                      <Progress value={envProgress} className="w-full" />
                      <p className="text-sm text-center text-muted-foreground">
                        {Math.round(envProgress)}% Complete
                      </p>
                    </div>
                  )}

                  <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Batch Configuration
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
                      <Box>
                        <Typography gutterBottom>
                          Batch Size: {batchSize} environments per batch
                        </Typography>
                        <Slider
                          value={batchSize}
                          onChange={handleBatchSizeChange}
                          min={1}
                          max={50}
                          step={1}
                          marks={[
                            { value: 1, label: '1' },
                            { value: 10, label: '10' },
                            { value: 25, label: '25' },
                            { value: 50, label: '50' }
                          ]}
                          disabled={envFetching}
                        />
                      </Box>
                      <Box>
                        <Typography gutterBottom>
                          Delay: {delayMs}ms between batches
                        </Typography>
                        <Slider
                          value={delayMs}
                          onChange={handleDelayChange}
                          min={500}
                          max={10000}
                          step={250}
                          marks={[
                            { value: 500, label: '0.5s' },
                            { value: 1000, label: '1s' },
                            { value: 2000, label: '2s' },
                            { value: 5000, label: '5s' },
                            { value: 10000, label: '10s' }
                          ]}
                          disabled={envFetching}
                        />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {envResults && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Environment Resource Totals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <Card>
                          <CardHeader className="pb-3">
                            <CardDescription>Metered RAM</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{envTotalRam}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-3">
                            <CardDescription>Storage</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="text-3xl font-bold">{envTotalStorage.toFixed(2)} GB</div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <h3 className="text-xl font-semibold mb-2">Billing Category Results</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Environments with billing category tags grouped by text value:
                    </p>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {envResults.map((category) => (
                        <Card key={category.name}>
                          <CardHeader>
                            <CardTitle className="text-lg">{category.name}</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-1 text-sm">
                            <div>
                              <span className="text-muted-foreground">Environment Count:</span>{" "}
                              <span className="font-semibold">{category.count}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Metered RAM:</span>{" "}
                              <span className="font-semibold">{category.meteredRam}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Storage:</span>{" "}
                              <span className="font-semibold">{category.storage} GB</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>Data Table</CardTitle>
                        <Button variant="outline" size="sm" onClick={copyTableToClipboard}>
                          <Copy className="h-4 w-4 mr-2" />
                          COPY TABLE
                        </Button>
                      </div>
                      <CardDescription>
                        Table with borders and formatting ready for export to Word, Excel, Google Docs, or other applications:
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Billing Category</TableHead>
                            <TableHead>Environment Count</TableHead>
                            <TableHead>Metered RAM</TableHead>
                            <TableHead>Storage (GB)</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {envResults.map((category) => (
                            <TableRow key={category.name}>
                              <TableCell>{category.name}</TableCell>
                              <TableCell>{category.count}</TableCell>
                              <TableCell>{category.meteredRam}</TableCell>
                              <TableCell>{category.storage}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="templates" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Templates Usage</CardTitle>
                  <CardDescription>
                    Monitor template usage and deployment patterns by code identifiers.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor="templateCount">Template Count</Label>
                      <Input
                        id="templateCount"
                        type="number"
                        value={templateCount}
                        onChange={(e) => setTemplateCount(Number(e.target.value))}
                        disabled={templateFetching}
                      />
                      <p className="text-xs text-muted-foreground">
                        Number of templates to fetch from Skytap API
                      </p>
                    </div>
                    <Button onClick={handleFetchTemplates} disabled={templateFetching}>
                      {templateFetching ? "Fetching..." : "FETCH TEMPLATES"}
                    </Button>
                  </div>

                  {templateFetching && (
                    <div className="space-y-2">
                      <Progress value={templateProgress} className="w-full" />
                      <p className="text-sm text-center text-muted-foreground">
                        {Math.round(templateProgress)}% Complete
                      </p>
                    </div>
                  )}

                  <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      Batch Configuration
                    </Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
                      <Box>
                        <Typography gutterBottom>
                          Batch Size: {batchSize} templates per batch
                        </Typography>
                        <Slider
                          value={batchSize}
                          onChange={handleBatchSizeChange}
                          min={1}
                          max={50}
                          step={1}
                          marks={[
                            { value: 1, label: '1' },
                            { value: 10, label: '10' },
                            { value: 25, label: '25' },
                            { value: 50, label: '50' }
                          ]}
                          disabled={templateFetching}
                        />
                      </Box>
                      <Box>
                        <Typography gutterBottom>
                          Delay: {delayMs}ms between batches
                        </Typography>
                        <Slider
                          value={delayMs}
                          onChange={handleDelayChange}
                          min={500}
                          max={10000}
                          step={250}
                          marks={[
                            { value: 500, label: '0.5s' },
                            { value: 1000, label: '1s' },
                            { value: 2000, label: '2s' },
                            { value: 5000, label: '5s' },
                            { value: 10000, label: '10s' }
                          ]}
                          disabled={templateFetching}
                        />
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              {templateResults && (
                <div>
                  <h3 className="text-xl font-semibold mb-2">Billing Category Results</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Templates with billing category tags grouped by text value:
                  </p>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {templateResults.map((category) => (
                      <Card key={category.name}>
                        <CardHeader>
                          <CardTitle className="text-lg">{category.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1 text-sm">
                          <div>
                            <span className="text-muted-foreground">Template Count:</span>{" "}
                            <span className="font-semibold">{category.count}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Usage;
