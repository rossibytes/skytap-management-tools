// RunningNow Page Component
// A real-time dashboard for monitoring running Skytap environments

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Clock, Monitor, Globe, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { skytapAPI } from "@/lib/skytap-api";

/**
 * Interface for running environment data
 */
interface RunningEnvironment {
  id: string;
  name: string;
  runstate: string;
  last_run: string;
  suspend_on_idle: number;
  region: string;
  vm_count: number;
  storage: number;
  owner_name: string;
}

/**
 * Sort configuration for table columns
 */
type SortField = 'id' | 'name' | 'runstate' | 'last_run' | 'suspend_on_idle' | 'region';
type SortDirection = 'asc' | 'desc';

/**
 * RunningNow Component
 * 
 * A real-time dashboard that displays currently running Skytap environments
 * with configurable refresh intervals and sortable columns.
 */
const RunningNow = () => {
  const navigate = useNavigate();
  
  // State management
  const [environments, setEnvironments] = useState<RunningEnvironment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortField, setSortField] = useState<SortField>('last_run');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  /**
   * Fetch running environments from the API
   */
  const fetchRunningEnvironments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await skytapAPI.getRunningConfigurations();
      
      // Transform the data to match our interface
      const transformedData: RunningEnvironment[] = data.map(env => ({
        id: env.id,
        name: env.name,
        runstate: env.runstate,
        last_run: env.last_run,
        suspend_on_idle: env.suspend_on_idle,
        region: env.region,
        vm_count: env.vm_count,
        storage: env.storage,
        owner_name: (env as any).owner_name || 'Unknown'
      }));
      
      setEnvironments(transformedData);
      setLastRefresh(new Date());
      
      toast({
        title: "Dashboard Updated",
        description: `Found ${transformedData.length} running environments`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch running environments';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Calculate uptime in hours from last_run timestamp
   */
  const calculateUptime = (lastRun: string): number => {
    try {
      const lastRunDate = new Date(lastRun);
      const now = new Date();
      const diffMs = now.getTime() - lastRunDate.getTime();
      return Math.round(diffMs / (1000 * 60 * 60) * 10) / 10; // Round to 1 decimal place
    } catch {
      return 0;
    }
  };

  /**
   * Convert suspend_on_idle seconds to hours
   */
  const secondsToHours = (seconds: number): number => {
    return Math.round(seconds / 3600 * 10) / 10; // Round to 1 decimal place
  };

  /**
   * Handle column sorting
   */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  /**
   * Sort environments based on current sort configuration
   */
  const sortedEnvironments = [...environments].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];

    // Handle special cases for sorting
    if (sortField === 'last_run') {
      aValue = new Date(a.last_run).getTime();
      bValue = new Date(b.last_run).getTime();
    } else if (sortField === 'suspend_on_idle') {
      aValue = a.suspend_on_idle;
      bValue = b.suspend_on_idle;
    }

    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  /**
   * Set up auto-refresh interval
   */
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchRunningEnvironments, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, fetchRunningEnvironments]);

  /**
   * Initial data fetch
   */
  useEffect(() => {
    fetchRunningEnvironments();
  }, [fetchRunningEnvironments]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/utilities")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Utilities
          </Button>
          <div className="flex items-center gap-2 mb-2">
            <Monitor className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Running Now Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of running Skytap environments
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Dashboard Controls
              </CardTitle>
              <CardDescription>
                Configure refresh settings and monitor environment status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Refresh Interval */}
                <div className="space-y-2">
                  <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
                  <Input
                    id="refreshInterval"
                    type="number"
                    min="10"
                    max="300"
                    value={refreshInterval}
                    onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 30)}
                  />
                </div>

                {/* Auto Refresh Toggle */}
                <div className="space-y-2">
                  <Label>Auto Refresh</Label>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={autoRefresh ? "default" : "outline"}
                      size="sm"
                      onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                      {autoRefresh ? "Enabled" : "Disabled"}
                    </Button>
                  </div>
                </div>

                {/* Manual Refresh */}
                <div className="space-y-2">
                  <Label>Manual Refresh</Label>
                  <Button
                    onClick={fetchRunningEnvironments}
                    disabled={loading}
                    className="w-full"
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? "Refreshing..." : "Refresh Now"}
                  </Button>
                </div>
              </div>

              {/* Status Information */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {environments.length} running environment{environments.length !== 1 ? 's' : ''}
                </span>
                {lastRefresh && (
                  <span>
                    Last updated: {lastRefresh.toLocaleTimeString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Environments Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Running Environments
              </CardTitle>
              <CardDescription>
                Currently running Skytap environments with real-time status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('id')}
                      >
                        ID {sortField === 'id' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('name')}
                      >
                        Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('runstate')}
                      >
                        Status {sortField === 'runstate' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('last_run')}
                      >
                        Uptime (Hours) {sortField === 'last_run' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('suspend_on_idle')}
                      >
                        Suspend Idle (Hours) {sortField === 'suspend_on_idle' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleSort('region')}
                      >
                        Region {sortField === 'region' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedEnvironments.map((env) => (
                      <TableRow key={env.id}>
                        <TableCell className="font-mono text-sm">
                          {env.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {env.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className="bg-green-100 text-green-800">
                            {env.runstate}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">
                              {calculateUptime(env.last_run)}h
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono">
                            {secondsToHours(env.suspend_on_idle)}h
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-muted-foreground" />
                            <span>{env.region}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {environments.length === 0 && !loading && (
                <div className="text-center py-8 text-muted-foreground">
                  No running environments found
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default RunningNow;
