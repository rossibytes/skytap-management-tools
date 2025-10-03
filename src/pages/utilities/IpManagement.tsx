import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Trash2, AlertCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { skytapAPI, SkytapIPAddress } from "@/lib/skytap-api";

const IpManagement = () => {
  const navigate = useNavigate();
  const [ipAddresses, setIpAddresses] = useState<SkytapIPAddress[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showReleaseConfirm, setShowReleaseConfirm] = useState(false);
  const [releaseType, setReleaseType] = useState<"single" | "all">("single");
  const [selectedIPId, setSelectedIPId] = useState<string>("");
  const [showNonAttachedOnly, setShowNonAttachedOnly] = useState<boolean>(false);

  // Filter IP addresses based on the non-attached filter
  const filteredIPAddresses = showNonAttachedOnly 
    ? ipAddresses.filter(ip => ip.nic_count === 0)
    : ipAddresses;

  const handleLookupRegion = async (region: string) => {
    setIsLoading(true);
    setError(null);
    setSelectedRegion(region);
    
    try {
      const ips = await skytapAPI.getIPAddressesByRegion(region, 100, 0);
      setIpAddresses(ips);
      
      toast({
        title: "IP Addresses Retrieved",
        description: `Found ${ips.length} IP addresses in ${region}`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch IP addresses';
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

  const handleReleaseIP = (ipId: string) => {
    setSelectedIPId(ipId);
    setReleaseType("single");
    setShowReleaseConfirm(true);
  };

  const handleReleaseAll = () => {
    setReleaseType("all");
    setShowReleaseConfirm(true);
  };

  const confirmRelease = async () => {
    setShowReleaseConfirm(false);
    setIsReleasing(true);
    setError(null);
    
    try {
      if (releaseType === "single") {
        await skytapAPI.releaseIPAddress(selectedIPId);
        setIpAddresses(ipAddresses.filter(ip => ip.id !== selectedIPId));
        
        toast({
          title: "IP Released Successfully",
          description: `IP address ${selectedIPId} has been released`,
        });
      } else {
        const ipIds = filteredIPAddresses.map(ip => ip.id);
        const results = await skytapAPI.releaseIPAddresses(ipIds);
        
        // Remove successfully released IPs from the list
        const successfulIds = new Set(results.success);
        setIpAddresses(ipAddresses.filter(ip => !successfulIds.has(ip.id)));
        
        // Show success message
        if (results.success.length > 0) {
          toast({
            title: "IPs Released Successfully",
            description: `${results.success.length} IP address(es) have been released`,
          });
        }
        
        // Show error message for any failures
        if (results.failed.length > 0) {
          setError(`Failed to release ${results.failed.length} IP address(es): ${results.failed.map(f => f.id).join(', ')}`);
          toast({
            title: "Some Releases Failed",
            description: `${results.failed.length} IP address(es) could not be released`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to release IP address(es)';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsReleasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/utilities")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to General Utilities
          </Button>
          <h1 className="text-2xl font-bold">IP Address Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track IP address allocations
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Lookup/Release IP Addresses By Region</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button 
                  onClick={() => handleLookupRegion("US-Central")}
                  disabled={isLoading}
                >
                  <Search className="h-4 w-4 mr-2" />
                  US-CENTRAL
                </Button>
                <Button 
                  onClick={() => handleLookupRegion("EMEA")}
                  disabled={isLoading}
                >
                  <Search className="h-4 w-4 mr-2" />
                  EMEA
                </Button>
                <Button 
                  onClick={() => handleLookupRegion("APAC-2")}
                  disabled={isLoading}
                >
                  <Search className="h-4 w-4 mr-2" />
                  APAC-2
                </Button>
              </div>
            </CardContent>
          </Card>

          {ipAddresses.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-semibold">
                    IP Addresses in {selectedRegion} ({filteredIPAddresses.length}{showNonAttachedOnly ? ` of ${ipAddresses.length}` : ''})
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Checkbox
                      id="nonAttachedFilter"
                      checked={showNonAttachedOnly}
                      onCheckedChange={(checked) => setShowNonAttachedOnly(checked === true)}
                    />
                    <Label htmlFor="nonAttachedFilter" className="text-sm">
                      Non-Attached Only (NIC Count = 0)
                    </Label>
                  </div>
                </div>
                <Button variant="destructive" onClick={handleReleaseAll} disabled={isReleasing}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isReleasing ? "Releasing..." : "RELEASE ALL"}
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>NIC Count</TableHead>
                        <TableHead>Connect Type</TableHead>
                        <TableHead>DNS Name</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredIPAddresses.map((ip) => (
                        <TableRow key={ip.id}>
                          <TableCell>{ip.id}</TableCell>
                          <TableCell>{ip.address}</TableCell>
                          <TableCell>{ip.region}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600">
                              {ip.nic_count}
                            </Badge>
                          </TableCell>
                          <TableCell>{ip.connect_type}</TableCell>
                          <TableCell>{ip.dns_name || "-"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleReleaseIP(ip.id)}
                              disabled={isReleasing}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              RELEASE IP
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={showReleaseConfirm} onOpenChange={setShowReleaseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm IP Release</AlertDialogTitle>
            <AlertDialogDescription>
              {releaseType === "single" 
                ? `Are you sure you want to release IP address ${selectedIPId}? This action cannot be undone.`
                : `Are you sure you want to release all ${filteredIPAddresses.length} IP address(es)${showNonAttachedOnly ? ' (non-attached only)' : ''} in ${selectedRegion}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRelease} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Release {releaseType === "single" ? "IP" : "All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IpManagement;
