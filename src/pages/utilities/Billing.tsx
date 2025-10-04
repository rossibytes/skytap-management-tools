import { useNavigate } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw, BarChart3, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { skytapAPI } from "@/lib/skytap-api";

interface BillingResults {
  period: string;
  x86RamHours: number;
  x86RamRate: number;
  x86RamCost: number;
  storageHours: number;
  storageRate: number;
  storageCost: number;
  totalCost: number;
  monthlyBreakdown: {
    period: string;
    startDate: string;
    endDate: string;
    x86RamHours: number;
    storageHours: number;
    x86RamCost: number;
    storageCost: number;
    totalCost: number;
  }[];
}

interface MonthlyBreakdown {
  period: string;
  startDate: string;
  endDate: string;
  x86RamHours: number;
  storageHours: number;
}

const Billing = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [customerId, setCustomerId] = useState<string>("");
  const [results, setResults] = useState<BillingResults | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Billing rates (hardcoded as per specification)
  const X86_RAM_RATE = 0.03861;  // $0.03861 per hour
  const STORAGE_RATE = 0.00011;  // $0.00011 per hour

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      setError("Please select both start and end dates");
      toast({
        title: "Error",
        description: "Please select both start and end dates",
        variant: "destructive",
      });
      return;
    }

    if (!customerId.trim()) {
      setError("Please enter a customer ID");
      toast({
        title: "Error",
        description: "Please enter a customer ID",
        variant: "destructive",
      });
      return;
    }

    if (startDate >= endDate) {
      setError("End date must be after start date");
      toast({
        title: "Error",
        description: "End date must be after start date",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Format dates for Skytap API (MM/DD/YYYY)
      const formatDateForAPI = (date: Date) => {
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      };

      // Add one day to end date to make it exclusive (matches Skytap UI behavior)
      const adjustedEndDate = new Date(endDate);
      adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);

      const startDateStr = formatDateForAPI(startDate);
      const endDateStr = formatDateForAPI(adjustedEndDate);


      // Create both reports simultaneously
      const [x86CreateResponse, storageCreateResponse] = await Promise.all([
        skytapAPI.createX86Report(startDateStr, endDateStr, customerId.trim()),
        skytapAPI.createStorageReport(startDateStr, endDateStr, customerId.trim())
      ]);

      const x86ReportId = x86CreateResponse.id;
      const storageReportId = storageCreateResponse.id;


      // Poll for results
      let x86Ready = false;
      let storageReady = false;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout

      let x86RamHours = 0;
      let storageHours = 0;
      let x86MonthlyBreakdown: MonthlyBreakdown[] = [];
      let storageMonthlyBreakdown: MonthlyBreakdown[] = [];

      while ((!x86Ready || !storageReady) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

        // Poll x86 RAM report
        if (!x86Ready) {
          try {
            const x86ResultsResponse = await skytapAPI.getReportResults(x86ReportId);
            
            if (x86ResultsResponse.ready) {
              x86Ready = true;
              // Process x86 RAM data
              const allRegionsGrouping = x86ResultsResponse.results?.groupings?.find((grouping: any) => 
                grouping.key === "__all__" || grouping.name === "All Regions"
              );

              if (allRegionsGrouping && allRegionsGrouping.periods) {
                allRegionsGrouping.periods.forEach((period: any) => {
                  const usage = period.total_usage || 0;
                  x86RamHours += usage;
                  
                  x86MonthlyBreakdown.push({
                    period: period.period || 'For Billing Period',
                    startDate: period.start_date || '',
                    endDate: period.end_date || '',
                    x86RamHours: usage,
                    storageHours: 0
                  });
                });
              }
            }
          } catch (error) {
          }
        }

        // Poll storage report
        if (!storageReady) {
          try {
            const storageResultsResponse = await skytapAPI.getReportResults(storageReportId);
            
            if (storageResultsResponse.ready) {
              storageReady = true;
              // Process storage data
              const allRegionsGrouping = storageResultsResponse.results?.groupings?.find((grouping: any) => 
                grouping.key === "__all__" || grouping.name === "All Regions"
              );

              if (allRegionsGrouping && allRegionsGrouping.periods) {
                allRegionsGrouping.periods.forEach((period: any) => {
                  const usage = period.total_usage || 0;
                  // Convert MB to TB, then multiply by 1024 for storage hours
                  const terabytes = usage / 1048576;
                  const periodStorageHours = terabytes * 1024;
                  storageHours += periodStorageHours;
                  
                  storageMonthlyBreakdown.push({
                    period: period.period || 'For Billing Period',
                    startDate: period.start_date || '',
                    endDate: period.end_date || '',
                    x86RamHours: 0,
                    storageHours: periodStorageHours
                  });
                });
              }
            }
          } catch (error) {
          }
        }

        attempts++;
      }

      if (!x86Ready || !storageReady) {
        throw new Error('Reports did not complete within the timeout period. Please try again.');
      }

      // Calculate costs
      const x86RamCost = x86RamHours * X86_RAM_RATE;
      const storageCost = storageHours * STORAGE_RATE;
      const totalCost = x86RamCost + storageCost;

      // Combine monthly breakdown data
      const monthlyBreakdown = x86MonthlyBreakdown.map((x86Month, index) => {
        const storageMonth = storageMonthlyBreakdown[index] || { storageHours: 0 };
        const monthX86RamCost = x86Month.x86RamHours * X86_RAM_RATE;
        const monthStorageCost = storageMonth.storageHours * STORAGE_RATE;
        const monthTotalCost = monthX86RamCost + monthStorageCost;

        return {
          period: x86Month.period,
          startDate: x86Month.startDate,
          endDate: x86Month.endDate,
          x86RamHours: x86Month.x86RamHours,
          storageHours: storageMonth.storageHours,
          x86RamCost: monthX86RamCost,
          storageCost: monthStorageCost,
          totalCost: monthTotalCost
        };
      });

      const billingResults: BillingResults = {
        period: `${format(startDate, "M/d/yyyy")} - ${format(endDate, "M/d/yyyy")}`,
        x86RamHours,
        x86RamRate: X86_RAM_RATE,
        x86RamCost,
        storageHours,
        storageRate: STORAGE_RATE,
        storageCost,
        totalCost,
        monthlyBreakdown
      };

      setResults(billingResults);
      setIsGenerating(false);

      toast({
        title: "Report Generated",
        description: `Billing report generated successfully. Total cost: $${totalCost.toFixed(2)}`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate billing report';
      setError(errorMessage);
      setIsGenerating(false);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleDownloadReport = () => {
    toast({
      title: "Downloading Report",
      description: "Your billing report is being downloaded",
    });
  };

  const handleRefreshData = () => {
    if (results) {
      handleGenerateReport();
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
          <h1 className="text-2xl font-bold">Billing Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and export billing information
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
              <CardTitle>Generate Billing Report</CardTitle>
              <CardDescription>
                Select a date range to generate billing reports for your Skytap environments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer ID</Label>
                <Input
                  id="customerId"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Enter customer ID (e.g., 12345)"
                  disabled={isGenerating}
                />
                <p className="text-xs text-muted-foreground">
                  Enter your Skytap customer ID for billing reports
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "MM/dd/yyyy") : "Select start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Select the start date for the billing period
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "MM/dd/yyyy") : "Select end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    Select the end date for the billing period
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleGenerateReport}
                  disabled={isGenerating}
                  className="flex-1 md:flex-none"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {isGenerating ? "Generating..." : "GENERATE REPORT"}
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleDownloadReport}
                  disabled={!results}
                >
                  <Download className="h-4 w-4 mr-2" />
                  DOWNLOAD REPORT
                </Button>
                <Button 
                  variant="outline"
                  onClick={handleRefreshData}
                  disabled={!results}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  REFRESH DATA
                </Button>
              </div>
            </CardContent>
          </Card>

          {!results && (
            <Card>
              <CardContent className="py-16 text-center">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">Generate a Billing Report</h3>
                <p className="text-muted-foreground">
                  Select a date range above and click "Generate Report" to see billing calculations.
                </p>
              </CardContent>
            </Card>
          )}

          {results && (
            <>
              <div>
                <h2 className="text-2xl font-bold mb-2">Billing Report Results</h2>
                <p className="text-muted-foreground mb-6">Period: {results.period}</p>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">x86 RAM Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-4xl font-bold text-primary">
                        {results.x86RamHours.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rate: ${results.x86RamRate.toFixed(5)} per hour
                      </div>
                      <div className="text-lg font-semibold">
                        Cost: ${results.x86RamCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl">Storage Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-4xl font-bold text-primary">
                        {results.storageHours.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Rate: ${results.storageRate.toFixed(5)} per hour
                      </div>
                      <div className="text-lg font-semibold">
                        Cost: ${results.storageCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card className="bg-primary text-primary-foreground mb-6">
                  <CardContent className="py-8">
                    <div className="text-lg font-medium mb-2">Total Cost</div>
                    <div className="text-5xl font-bold">
                      ${results.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </CardContent>
                </Card>

                <h3 className="text-xl font-semibold mb-4">Monthly Breakdown</h3>
                <div className="grid gap-4">
                  {results.monthlyBreakdown.map((month, index) => (
                    <Card key={index}>
                      <CardHeader>
                        <CardTitle className="text-lg">{month.period}</CardTitle>
                        <CardDescription>
                          {month.startDate ? format(new Date(month.startDate), "MM/dd/yyyy") : ''} - {month.endDate ? format(new Date(month.endDate), "MM/dd/yyyy") : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">x86 RAM:</span>
                          <span className="font-medium">
                            {month.x86RamHours.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hrs
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Storage:</span>
                          <span className="font-medium">
                            {month.storageHours.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} hrs
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">x86 RAM Cost:</span>
                          <span className="font-medium">
                            ${month.x86RamCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Storage Cost:</span>
                          <span className="font-medium">
                            ${month.storageCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex justify-between border-t pt-2 mt-2">
                          <span className="font-semibold">Total:</span>
                          <span className="font-bold text-primary">
                            ${month.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Billing;
