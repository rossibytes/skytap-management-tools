import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, Monitor, HardDrive, Edit3, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface BillingRates {
  ramRate: number;
  storageRate: number;
}

interface InstanceFormData {
  startDate: string;
  endDate: string;
  ramPerInstance: string;
  storagePerInstance: string;
  numberOfInstances: string;
  runningHoursPerDay: string;
}

interface StorageFormData {
  storageAmount: string;
  storageUnit: 'GB' | 'TB';
}

interface CalculationResult {
  numberOfDays: number;
  ramCostPerInstance: number;
  storageCostPerInstance: number;
  totalRamCost: number;
  totalStorageCost: number;
  totalCost: number;
  ramHoursPerInstance: number;
  storageHoursPerInstance: number;
  inputRamGB: number;
  inputStorageGB: number;
  inputHoursPerDay: number;
}

const CostCalculator = () => {
  const navigate = useNavigate();
  
  // Billing rates state
  const [billingRates, setBillingRates] = useState<BillingRates>({
    ramRate: 0.03861,
    storageRate: 0.00011
  });
  
  const [isEditingRates, setIsEditingRates] = useState(false);
  const [tempRates, setTempRates] = useState<BillingRates>(billingRates);
  
  // Instance cost form state
  const [instanceFormData, setInstanceFormData] = useState<InstanceFormData>({
    startDate: '',
    endDate: '',
    ramPerInstance: '',
    storagePerInstance: '',
    numberOfInstances: '',
    runningHoursPerDay: ''
  });
  
  // Storage cost form state
  const [storageFormData, setStorageFormData] = useState<StorageFormData>({
    storageAmount: '',
    storageUnit: 'GB'
  });
  
  // Results state
  const [instanceResult, setInstanceResult] = useState<CalculationResult | null>(null);
  const [storageResult, setStorageResult] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRateEdit = () => {
    setTempRates(billingRates);
    setIsEditingRates(true);
  };

  const handleRateSave = () => {
    setBillingRates(tempRates);
    setIsEditingRates(false);
    toast({
      title: "Billing Rates Updated",
      description: "Your billing rates have been saved successfully.",
    });
  };

  const handleRateCancel = () => {
    setTempRates(billingRates);
    setIsEditingRates(false);
  };

  const calculateInstanceCost = () => {
    setError(null);
    
    // Validate required fields
    const requiredFields = ['startDate', 'endDate', 'ramPerInstance', 'storagePerInstance', 'numberOfInstances', 'runningHoursPerDay'];
    const missingFields = requiredFields.filter(field => !instanceFormData[field as keyof InstanceFormData]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }

    try {
      const startDate = new Date(instanceFormData.startDate);
      const endDate = new Date(instanceFormData.endDate);
      
      // Allow same-day ranges (1-day period). Only block when start is after end.
      if (startDate > endDate) {
        setError('End date must be after start date');
        return;
      }

      const timeDiff = endDate.getTime() - startDate.getTime();
      const numberOfDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
      
      const ramPerVM = parseFloat(instanceFormData.ramPerInstance);
      const storagePerVM = parseFloat(instanceFormData.storagePerInstance);
      const numberOfVMs = parseInt(instanceFormData.numberOfInstances);
      const hoursPerDay = parseFloat(instanceFormData.runningHoursPerDay);
      
      if (hoursPerDay < 0 || hoursPerDay > 24) {
        setError('Running hours per day must be between 0 and 24');
        return;
      }

      // Calculate hours used per instance
      const ramHoursPerInstance = ramPerVM * hoursPerDay * numberOfDays; // GB × hours × days
      const storageHoursPerInstance = storagePerVM * 24 * numberOfDays; // GB × 24h × days

      // Calculate costs
      const ramCostPerVM = ramHoursPerInstance * billingRates.ramRate;
      const storageCostPerVM = storageHoursPerInstance * billingRates.storageRate; // Storage charged 24/7
      
      const totalRamCost = ramCostPerVM * numberOfVMs;
      const totalStorageCost = storageCostPerVM * numberOfVMs;
      const totalCost = totalRamCost + totalStorageCost;

      setInstanceResult({
        numberOfDays,
        ramCostPerInstance: ramCostPerVM,
        storageCostPerInstance: storageCostPerVM,
        totalRamCost,
        totalStorageCost,
        totalCost,
        ramHoursPerInstance,
        storageHoursPerInstance,
        inputRamGB: ramPerVM,
        inputStorageGB: storagePerVM,
        inputHoursPerDay: hoursPerDay,
      });

      toast({
        title: "Cost Calculated",
        description: `Total estimated cost: $${totalCost.toFixed(2)}`,
      });

    } catch (error) {
      setError('Invalid input values. Please check your entries.');
    }
  };

  const calculateStorageCost = () => {
    setError(null);
    
    if (!storageFormData.storageAmount) {
      setError('Please enter storage amount');
      return;
    }

    try {
      const storageAmount = parseFloat(storageFormData.storageAmount);
      
      if (storageAmount <= 0) {
        setError('Storage amount must be greater than 0');
        return;
      }

      // Normalize to GB
      const storageGB = storageFormData.storageUnit === 'TB' ? storageAmount * 1024 : storageAmount;
      // Daily cost using same formula as Instance Cost storage (GB × 24 × rate)
      const dailyCost = storageGB * 24 * billingRates.storageRate;

      setStorageResult(dailyCost);

      toast({
        title: "Storage Cost Calculated",
        description: `Daily storage cost: $${dailyCost.toFixed(2)}`,
      });

    } catch (error) {
      setError('Invalid storage amount. Please enter a valid number.');
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
          <div className="flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Cost Calculator</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Calculate the total cost for your Skytap environment based on RAM, storage, and time usage.
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="instance" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="instance" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                INSTANCE COST
              </TabsTrigger>
              <TabsTrigger value="storage" className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                STORAGE COST
              </TabsTrigger>
            </TabsList>

            <TabsContent value="instance" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Billing Configuration</CardTitle>
                    {!isEditingRates ? (
                      <Button variant="ghost" size="sm" onClick={handleRateEdit}>
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit Rates
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleRateSave}>
                          <Save className="h-4 w-4 mr-2" />
                          Save
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleRateCancel}>
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ramRate">RAM Billing Rate ($/GB/hour)</Label>
                      <Input
                        id="ramRate"
                        type="number"
                        step="0.00001"
                        value={isEditingRates ? tempRates.ramRate : billingRates.ramRate}
                        onChange={(e) => isEditingRates && setTempRates({...tempRates, ramRate: parseFloat(e.target.value) || 0})}
                        disabled={!isEditingRates}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storageRate">Storage Billing Rate ($/GB/hour)</Label>
                      <Input
                        id="storageRate"
                        type="number"
                        step="0.00001"
                        value={isEditingRates ? tempRates.storageRate : billingRates.storageRate}
                        onChange={(e) => isEditingRates && setTempRates({...tempRates, storageRate: parseFloat(e.target.value) || 0})}
                        disabled={!isEditingRates}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Time Period</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date *</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={instanceFormData.startDate}
                        onChange={(e) => setInstanceFormData({...instanceFormData, startDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date *</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={instanceFormData.endDate}
                        onChange={(e) => setInstanceFormData({...instanceFormData, endDate: e.target.value})}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Environment Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ramPerInstance">RAM Per Environment (GB) *</Label>
                      <Input
                        id="ramPerInstance"
                        type="number"
                        value={instanceFormData.ramPerInstance}
                        onChange={(e) => setInstanceFormData({...instanceFormData, ramPerInstance: e.target.value})}
                        placeholder="e.g., 8"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storagePerInstance">Storage Per Environment (GB) *</Label>
                      <Input
                        id="storagePerInstance"
                        type="number"
                        value={instanceFormData.storagePerInstance}
                        onChange={(e) => setInstanceFormData({...instanceFormData, storagePerInstance: e.target.value})}
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numberOfInstances">Number of Environments *</Label>
                      <Input
                        id="numberOfInstances"
                        type="number"
                        value={instanceFormData.numberOfInstances}
                        onChange={(e) => setInstanceFormData({...instanceFormData, numberOfInstances: e.target.value})}
                        placeholder="e.g., 5"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="runningHoursPerDay">Running Hours Per Day *</Label>
                      <Input
                        id="runningHoursPerDay"
                        type="number"
                        min="0"
                        max="24"
                        step="0.5"
                        value={instanceFormData.runningHoursPerDay}
                        onChange={(e) => setInstanceFormData({...instanceFormData, runningHoursPerDay: e.target.value})}
                        placeholder="e.g., 8"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button onClick={calculateInstanceCost} size="lg" className="px-8">
                  <Calculator className="h-4 w-4 mr-2" />
                  CALCULATE COST
                </Button>
              </div>

              {instanceResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Cost Calculation Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Number of Days</Label>
                        <div className="text-lg font-semibold">{instanceResult.numberOfDays} days</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Calculation Formula</Label>
                        <div className="text-sm text-muted-foreground">
                          RAM Hours: {instanceResult.inputRamGB} GB × {instanceResult.inputHoursPerDay} h/day × {instanceResult.numberOfDays} day(s) = {instanceResult.ramHoursPerInstance.toFixed(2)} GB·h
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Storage Hours: {instanceResult.inputStorageGB} GB × 24 h/day × {instanceResult.numberOfDays} day(s) = {instanceResult.storageHoursPerInstance.toFixed(2)} GB·h
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Storage Cost Per Instance</Label>
                        <div className="text-lg font-semibold">${instanceResult.storageCostPerInstance.toFixed(2)}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Total RAM Cost</Label>
                        <div className="text-lg font-semibold">${instanceResult.totalRamCost.toFixed(2)}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Total Storage Cost</Label>
                        <div className="text-lg font-semibold">${instanceResult.totalStorageCost.toFixed(2)}</div>
                      </div>
                      <div className="space-y-2">
                        <Label>Total Cost</Label>
                        <div className="text-2xl font-bold text-primary">${instanceResult.totalCost.toFixed(2)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="storage" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Storage Cost Calculator</CardTitle>
                  <CardDescription>Calculate storage costs based on amount and duration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="storageAmount">Storage Amount *</Label>
                      <Input
                        id="storageAmount"
                        type="number"
                        value={storageFormData.storageAmount}
                        onChange={(e) => setStorageFormData({...storageFormData, storageAmount: e.target.value})}
                        placeholder="e.g., 100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storageUnit">Storage Unit</Label>
                      <select
                        id="storageUnit"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={storageFormData.storageUnit}
                        onChange={(e) => setStorageFormData({...storageFormData, storageUnit: e.target.value as 'GB' | 'TB'})}
                      >
                        <option value="GB">GB</option>
                        <option value="TB">TB</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-center">
                <Button onClick={calculateStorageCost} size="lg" className="px-8">
                  <Calculator className="h-4 w-4 mr-2" />
                  CALCULATE STORAGE COST
                </Button>
              </div>

              {storageResult !== null && (
                <Card>
                  <CardHeader>
                    <CardTitle>Storage Cost Results</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="grid gap-2">
                        <div>
                          <div className="text-sm text-muted-foreground">per hour</div>
                          <div className="text-2xl font-bold text-primary">${(storageResult / 24).toFixed(4)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">per day (24 hours)</div>
                          <div className="text-2xl font-bold text-primary">${storageResult.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">per month (30 days)</div>
                          <div className="text-2xl font-bold text-primary">${(storageResult * 30).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default CostCalculator;
