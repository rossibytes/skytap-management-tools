import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, FileDown, ChevronDown, Download, Trash2, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import { skytapAPI } from "@/lib/skytap-api";


const configurationSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  usTemplateId: z.string().min(1, "US Template ID is required"),
  emeaTemplateId: z.string().min(1, "EMEA Template ID is required"),
  apacTemplateId: z.string().min(1, "APAC Template ID is required"),
});

const deploymentSchema = z.object({
  partnerName: z.string().min(1, "Partner name is required"),
  skytapRegion: z.string().min(1, "Skytap region is required"),
});

type ConfigurationForm = z.infer<typeof configurationSchema>;
type DeploymentForm = z.infer<typeof deploymentSchema>;

interface DeploymentData {
  projectId: string;
  templateId: string;
  environmentId: string;
  environmentName: string;
  environmentState: string;
  ip1: string;
  ip2: string;
  portalId: string;
  portalUrl: string;
  configId: string;
}

interface DeploymentLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface SkytapVMRef {
  id: string;
  name: string;
  interfaces: { id: string }[];
}

interface EnvironmentDetails {
  id: string;
  name: string;
  vms: SkytapVMRef[];
}

const PartnerDeploy = () => {
  const navigate = useNavigate();
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<DeploymentLog[]>([]);
  const [deploymentData, setDeploymentData] = useState<DeploymentData | null>(null);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [envDetails, setEnvDetails] = useState<EnvironmentDetails | null>(null);
  const [ip1, setIp1] = useState<string | null>(null);
  const [ip2, setIp2] = useState<string | null>(null);
  const [portalDesktopsUrl, setPortalDesktopsUrl] = useState<string | null>(null);
  const [hours, setHours] = useState<number | null>(null);

  const { register: registerConfig, watch: watchConfig, formState: { errors: configErrors } } = useForm<ConfigurationForm>({
    resolver: zodResolver(configurationSchema),
    defaultValues: {
      projectId: "",
      usTemplateId: "",
      emeaTemplateId: "",
      apacTemplateId: "",
    }
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<DeploymentForm>({
    resolver: zodResolver(deploymentSchema),
  });

  const partnerName = watch("partnerName");
  const selectedRegion = watch("skytapRegion");
  const projectId = watchConfig("projectId");
  const usTemplateId = watchConfig("usTemplateId");
  const emeaTemplateId = watchConfig("emeaTemplateId");
  const apacTemplateId = watchConfig("apacTemplateId");

  const getTemplateIdForRegion = (region: string) => {
    switch (region) {
      case "US-Central":
        return usTemplateId;
      case "EMEA":
        return emeaTemplateId;
      case "APAC":
        return apacTemplateId;
      default:
        return "";
    }
  };

  const addLogMessage = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: DeploymentLog = {
      timestamp,
      message,
      type
    };
    setDeploymentLogs(prev => [...prev, newLog]);
  };

  const deployPartnerEnvironment = async (data: DeploymentForm): Promise<DeploymentData> => {
    const templateId = getTemplateIdForRegion(data.skytapRegion);
    const projectId = watchConfig("projectId");
    
    if (!templateId) {
      throw new Error(`No template ID found for region: ${data.skytapRegion}`);
    }

    addLogMessage(`Using Project ID: ${projectId}`, 'info');
    addLogMessage(`Using Template ID: ${templateId}`, 'info');
    
    // Step 1: Create Environment (0-20%)
    addLogMessage("Creating Environment...", 'info');
    const environmentName = `HCL Commerce+ Partner - ${data.partnerName}`;
    const response = await skytapAPI.deployFromTemplate(templateId, environmentName);
    const environmentData = response;
    setProgress(20);
    
    addLogMessage("Environment Deployed Successfully", 'success');
    addLogMessage(`Environment ID: ${environmentData.id}`, 'success');
    addLogMessage(`Environment Name: ${environmentData.name}`, 'success');
    addLogMessage(`Environment State: ${environmentData.runstate}`, 'success');

    // Extract VM and interface information
    const vms: SkytapVMRef[] = Array.isArray(environmentData.vms)
      ? environmentData.vms.map((vm: any) => ({
          id: String(vm.id ?? ''),
          name: String(vm.name ?? ''),
          interfaces: Array.isArray(vm.interfaces)
            ? vm.interfaces.map((iface: any) => ({ id: String(iface.id ?? '') }))
            : []
        }))
      : [];
    setEnvDetails({ id: String(environmentData.id ?? ''), name: String(environmentData.name ?? ''), vms });

    // Step 2: Add to Project (20-35%)
    addLogMessage("Adding environment to Partner Project...", 'info');
    await skytapAPI.addConfigurationToProject(String(environmentData.id), projectId);
    setProgress(35);
    addLogMessage("Environment added to project successfully", 'success');

    // Step 3: Acquire IPs (35-55%)
    addLogMessage("Acquiring First IP Address...", 'info');
    const ipResp1 = await skytapAPI.acquirePublicIp(data.skytapRegion);
    const acquiredIp1 = ipResp1.address;
    setIp1(acquiredIp1);
    addLogMessage(`IP1 Acquired: ${acquiredIp1}`, 'success');

    addLogMessage("Acquiring Second IP Address...", 'info');
    const ipResp2 = await skytapAPI.acquirePublicIp(data.skytapRegion);
    const acquiredIp2 = ipResp2.address;
    setIp2(acquiredIp2);
    addLogMessage(`IP2 Acquired: ${acquiredIp2}`, 'success');
    setProgress(55);

    // Step 4: Attach IPs to VMs (55-80%)
    if (vms.length >= 2) {
      const vm1 = vms[0];
      const vm2 = vms[1];
      const iface1 = vm1.interfaces[0]?.id;
      const iface2 = vm2.interfaces[0]?.id;

      if (iface1) {
        addLogMessage("Attaching IP1 to VM1...", 'info');
        await skytapAPI.attachIpToInterface(String(environmentData.id), vm1.id, iface1, acquiredIp1);
        addLogMessage("IP1 attached to VM1 successfully", 'success');
      }

      if (iface2) {
        addLogMessage("Attaching IP2 to VM2...", 'info');
        await skytapAPI.attachIpToInterface(String(environmentData.id), vm2.id, iface2, acquiredIp2);
        addLogMessage("IP2 attached to VM2 successfully", 'success');
      }
    }
    setProgress(80);

    // Step 5: Create Portal (80-90%)
    addLogMessage(`Creating sharing portal for configuration ${environmentData.id}...`, 'info');
    const payload = {
      name: `Partner Portal - ${data.partnerName}`,
      runtime_limit: 1200, // 20 hours
      publish_set_type: 'single_url',
      vms: vms.map(vm => ({
        vm_ref: `https://cloud.skytap.com/v2/configurations/${environmentData.id}/vms/${vm.id}`,
        access: 'run_and_use'
      }))
    };
    const portalResp = await skytapAPI.createPublishSet(String(environmentData.id), payload);
    const ps = portalResp;
    setProgress(90);
    addLogMessage(`Portal created successfully with ID: ${ps.id}`, 'success');

    // Step 6: Get Portal URL (90-100%)
    addLogMessage(`Fetching Sharing Portal Details: (id: ${ps.id})`, 'info');
    const psDetailsResp = await skytapAPI.getPublishSet(String(environmentData.id), String(ps.id));
    const psd = psDetailsResp;
    setPortalDesktopsUrl(psd?.desktops_url || null);
    setHours(20); // 20 hours runtime limit
    setProgress(100);
    
    if (psd?.desktops_url) {
      addLogMessage(`Portal Desktop URL: ${psd.desktops_url}`, 'success');
    }

    return {
      projectId,
      templateId,
      environmentId: String(environmentData.id),
      environmentName: environmentData.name,
      environmentState: environmentData.runstate,
      ip1: acquiredIp1,
      ip2: acquiredIp2,
      portalId: String(ps.id),
      portalUrl: psd?.desktops_url || '',
      configId: String(environmentData.id),
    };
  };

  const onSubmit = async (data: DeploymentForm) => {
    setIsDeploying(true);
    setDeploymentLogs([]);
    setProgress(0);
    setIsLogOpen(true);
    setIsDetailsOpen(false);
    
    // Reset state
    setEnvDetails(null);
    setIp1(null);
    setIp2(null);
    setPortalDesktopsUrl(null);
    setHours(null);
    
    try {
      const deployment = await deployPartnerEnvironment(data);
      setDeploymentData(deployment);
      setIsDetailsOpen(true);
      toast({
        title: "Deployment Complete",
        description: `Partner environment for ${data.partnerName} has been deployed successfully.`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during deployment';
      addLogMessage(`Deployment failed: ${errorMessage}`, 'error');
      toast({
        title: "Deployment Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsDeploying(false);
    }
  };

  const buildDetailsText = (): string => {
    const lines: string[] = [];
    
    // Header
    lines.push(`Dear ${partnerName},`);
    lines.push('');
    lines.push('Below are the specific details for your HCL Commerce+ Partner Environment:');
    lines.push('');
    
    // Configuration Details
    lines.push('📋 CONFIGURATION DETAILS');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push(`Configuration Name: ${envDetails?.name || 'N/A'}`);
    lines.push(`Configuration ID: ${envDetails?.id || 'N/A'}`);
    lines.push('');
    
    // Hosts file entries
    if (ip1 || ip2) {
      lines.push('🌐 HOSTS FILE ENTRIES');
      lines.push('═══════════════════════════════════════════════════════════════');
      if (ip1) {
        lines.push(`${ip1}    es-db2.hclcomdev.com`);
        lines.push(`${ip1}    es-db2-data.hclcomdev.com`);
      }
      if (ip2) {
        lines.push(`${ip2}    es-db2-live.hclcomdev.com`);
      }
      lines.push('');
    }
    
    // Portal information
    if (portalDesktopsUrl || hours != null) {
      lines.push('🔗 PORTAL INFORMATION');
      lines.push('═══════════════════════════════════════════════════════════════');
      if (portalDesktopsUrl) {
        lines.push(`Your Portal URL: ${portalDesktopsUrl}`);
      }
      if (hours != null) {
        lines.push(`Granted Runtime: ${hours} hours`);
      }
      lines.push('');
    }
    
    // HCL Commerce+ endpoints
    lines.push('🚀 HCL COMMERCE+ ENDPOINTS');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('Ruby B2C Store:    https://es-db2.hclcomdev.com:6443/ruby');
    lines.push('Ruby B2B Store:    http://es-db2.hclcomdev.com:6443/ruby2b');
    lines.push('Commerce Lab:      https://es-db2.hclcomdev.com:7443/tooling/');
    lines.push('');
    lines.push('🔐 CREDENTIALS');
    lines.push('═══════════════════════════════════════════════════════════════');
    lines.push('Username: wcsadmin');
    lines.push('Password: wcs1admin');
    lines.push('');
    lines.push('Best regards,');
    lines.push('HCL Commerce+ Team');
    
    return lines.join('\n');
  };

  const buildDetailsHtml = (): string => {
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">HCL Commerce+ Partner Environment</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Environment Deployment Details</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e1e5e9; border-top: none;">
          <p style="font-size: 16px; margin-bottom: 20px;">Dear <strong>${partnerName}</strong>,</p>
          
          <p style="margin-bottom: 25px;">Below are the specific details for your HCL Commerce+ Partner Environment:</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #007bff;">
            <h3 style="margin: 0 0 15px 0; color: #007bff; font-size: 18px;">📋 Configuration Details</h3>
            <p style="margin: 5px 0;"><strong>Configuration Name:</strong> ${envDetails?.name || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Configuration ID:</strong> ${envDetails?.id || 'N/A'}</p>
          </div>
          
          ${ip1 || ip2 ? `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #28a745;">
            <h3 style="margin: 0 0 15px 0; color: #28a745; font-size: 18px;">🌐 Hosts File Entries</h3>
            ${ip1 ? `
              <p style="margin: 5px 0; font-family: monospace; background: white; padding: 8px; border-radius: 4px;">${ip1} &nbsp;&nbsp;&nbsp; es-db2.hclcomdev.com</p>
              <p style="margin: 5px 0; font-family: monospace; background: white; padding: 8px; border-radius: 4px;">${ip1} &nbsp;&nbsp;&nbsp; es-db2-data.hclcomdev.com</p>
            ` : ''}
            ${ip2 ? `
              <p style="margin: 5px 0; font-family: monospace; background: white; padding: 8px; border-radius: 4px;">${ip2} &nbsp;&nbsp;&nbsp; es-db2-live.hclcomdev.com</p>
            ` : ''}
          </div>
          ` : ''}
          
          ${portalDesktopsUrl || hours != null ? `
          <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 15px 0; color: #e0a800; font-size: 18px;">🔗 Portal Information</h3>
            ${portalDesktopsUrl ? `
              <p style="margin: 5px 0;"><strong>Your Portal URL:</strong></p>
              <p style="margin: 5px 0; font-family: monospace; background: white; padding: 8px; border-radius: 4px; word-break: break-all;">${portalDesktopsUrl}</p>
            ` : ''}
            ${hours != null ? `
              <p style="margin: 5px 0;"><strong>Granted Runtime:</strong> ${hours} hours</p>
            ` : ''}
          </div>
          ` : ''}
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #dc3545;">
            <h3 style="margin: 0 0 15px 0; color: #dc3545; font-size: 18px;">🚀 HCL Commerce+ Endpoints</h3>
            <p style="margin: 5px 0;"><strong>Ruby B2C Store:</strong> <a href="https://es-db2.hclcomdev.com:6443/ruby" style="color: #007bff;">https://es-db2.hclcomdev.com:6443/ruby</a></p>
            <p style="margin: 5px 0;"><strong>Ruby B2B Store:</strong> <a href="http://es-db2.hclcomdev.com:6443/ruby2b" style="color: #007bff;">http://es-db2.hclcomdev.com:6443/ruby2b</a></p>
            <p style="margin: 5px 0;"><strong>Commerce Lab:</strong> <a href="https://es-db2.hclcomdev.com:7443/tooling/" style="color: #007bff;">https://es-db2.hclcomdev.com:7443/tooling/</a></p>
          </div>
          
          <div style="background: #fff3cd; padding: 20px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #ffc107;">
            <h3 style="margin: 0 0 15px 0; color: #856404; font-size: 18px;">🔐 Credentials</h3>
            <p style="margin: 5px 0;"><strong>Username:</strong> wcsadmin</p>
            <p style="margin: 5px 0;"><strong>Password:</strong> wcs1admin</p>
          </div>
          
          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e1e5e9;">
            <p style="margin: 0; color: #6c757d;">Best regards,<br><strong>HCL Commerce+ Team</strong></p>
          </div>
        </div>
      </div>
    `;
    return html;
  };

  const getEmailContent = () => {
    return buildDetailsText();
  };

  const copyDetailsToClipboard = async () => {
    const text = buildDetailsText();
    const html = buildDetailsHtml();
    const item = new ClipboardItem({
      'text/html': new Blob([html], { type: 'text/html' }),
      'text/plain': new Blob([text], { type: 'text/plain' })
    });
    await navigator.clipboard.write([item]);
    toast({
      title: "Copied to Clipboard",
      description: "Partner environment details have been copied to your clipboard.",
    });
  };

  const downloadDetailsAsPdf = () => {
    const text = buildDetailsText();
    const html = `<!doctype html><html><head><title>Partner Environment Details</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
        h1 { font-size: 20px; margin: 0 0 12px; }
      </style>
    </head><body>
      <h1>Partner Environment Details</h1>
      <div class="content">${text}</div>
      <script>window.onload = function(){ window.print(); }</script>
    </body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html);
  };

  const exportLogs = () => {
    const logContent = deploymentLogs.map(log => 
      `[${log.timestamp}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    a.click();
  };

  const clearLogs = () => {
    setDeploymentLogs([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/partner")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Partner Environments
          </Button>
          <h1 className="text-2xl font-bold">Deploy Partner Environments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and configure new partner environments
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Partner Environment Configurations</CardTitle>
              <CardDescription>Configure Skytap project and template settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="projectId">Project ID</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Enter the Skytap project ID where environments will be deployed</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="projectId"
                  {...registerConfig("projectId")}
                  placeholder="Enter project ID (e.g., 123456)"
                  disabled={isDeploying}
                />
                {configErrors.projectId && (
                  <p className="text-sm text-destructive">{configErrors.projectId.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="usTemplateId">US Template ID</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Template ID for US region deployments</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="usTemplateId"
                    {...registerConfig("usTemplateId")}
                    placeholder="US Template ID (e.g., 1234567)"
                    disabled={isDeploying}
                  />
                  {configErrors.usTemplateId && (
                    <p className="text-sm text-destructive">{configErrors.usTemplateId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="emeaTemplateId">EMEA Template ID</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Template ID for EMEA region deployments</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="emeaTemplateId"
                    {...registerConfig("emeaTemplateId")}
                    placeholder="EMEA Template ID (e.g., 1234567)"
                    disabled={isDeploying}
                  />
                  {configErrors.emeaTemplateId && (
                    <p className="text-sm text-destructive">{configErrors.emeaTemplateId.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="apacTemplateId">APAC Template ID</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Template ID for APAC region deployments</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="apacTemplateId"
                    {...registerConfig("apacTemplateId")}
                    placeholder="APAC Template ID (e.g., 1234567)"
                    disabled={isDeploying}
                  />
                  {configErrors.apacTemplateId && (
                    <p className="text-sm text-destructive">{configErrors.apacTemplateId.message}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deployment Configuration</CardTitle>
              <CardDescription>Configure your partner environment deployment</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="partnerName">Partner Name</Label>
                  <Input
                    id="partnerName"
                    {...register("partnerName")}
                    placeholder="Enter partner name"
                    disabled={isDeploying}
                  />
                  {errors.partnerName && (
                    <p className="text-sm text-destructive">{errors.partnerName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skytapRegion">Skytap Region</Label>
                  <Select 
                    onValueChange={(value) => setValue("skytapRegion", value, { shouldValidate: true })} 
                    disabled={isDeploying}
                    value={selectedRegion}
                  >
                    <SelectTrigger id="skytapRegion">
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="US-Central">US-Central</SelectItem>
                      <SelectItem value="EMEA">EMEA</SelectItem>
                      <SelectItem value="APAC">APAC</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.skytapRegion && (
                    <p className="text-sm text-destructive">{errors.skytapRegion.message}</p>
                  )}
                </div>

                {selectedRegion && (
                  <div className="pt-2 pb-2">
                    <p className="text-sm text-muted-foreground">
                      Configuration: Project ID: {projectId} | Template ID: {getTemplateIdForRegion(selectedRegion)}
                    </p>
                  </div>
                )}

                <Button type="submit" disabled={isDeploying} className="w-full">
                  {isDeploying ? "Deploying..." : "Deploy Environment"}
                </Button>

                {isDeploying && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Deployment Progress</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {deploymentLogs.length > 0 && (
            <Collapsible open={isLogOpen} onOpenChange={setIsLogOpen}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Deployment Log Console</CardTitle>
                    <ChevronDown className={`h-5 w-5 transition-transform ${isLogOpen ? "rotate-180" : ""}`} />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="bg-muted rounded-md p-4 font-mono text-sm space-y-1 max-h-96 overflow-y-auto">
                      {deploymentLogs.map((log, index) => (
                        <div key={index} className={`flex items-start space-x-2 ${
                          log.type === 'success' ? 'text-green-600' :
                          log.type === 'error' ? 'text-red-600' :
                          log.type === 'warning' ? 'text-yellow-600' :
                          'text-foreground'
                        }`}>
                          <span className="text-muted-foreground text-xs mt-0.5">[{log.timestamp}]</span>
                          <span className="flex-1">
                            {log.type === 'success' && '✅ '}
                            {log.type === 'error' && '❌ '}
                            {log.type === 'warning' && '⚠️ '}
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={exportLogs} variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export Logs
                      </Button>
                      <Button onClick={clearLogs} variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Logs
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}

          {deploymentData && (
            <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
              <Card>
                <CollapsibleTrigger className="w-full">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg">Environment Details</CardTitle>
                    <ChevronDown className={`h-5 w-5 transition-transform ${isDetailsOpen ? "rotate-180" : ""}`} />
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <div className="bg-muted rounded-md p-4">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {getEmailContent()}
                      </pre>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={copyDetailsToClipboard} variant="outline" className="flex-1">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy to Clipboard
                      </Button>
                      <Button onClick={downloadDetailsAsPdf} variant="outline" className="flex-1">
                        <FileDown className="h-4 w-4 mr-2" />
                        Export as PDF
                      </Button>
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          )}
        </div>
      </main>
    </div>
  );
};

export default PartnerDeploy;
