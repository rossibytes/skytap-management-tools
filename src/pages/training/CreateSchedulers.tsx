import React, { useState, useEffect } from "react";
import { Calendar, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/hooks/use-toast";
import { skytapAPI } from "@/lib/skytap-api";
import { format } from "date-fns";

interface SchedulerFormData {
  projectId: string;
  staggerMinutes: number;
  timeZone: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  hoursPerDay: string;
  title: string;
  recurringDays: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

interface SchedulerResult {
  configurationId: string;
  configurationName: string;
  schedulerId: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface CreateSchedulersProps {
  projectId: string;
  onComplete: (results: any) => void;
  stepResults?: Record<string, any>;
}

const TIMEZONE_OPTIONS: Record<string, string> = {
  'Central Time (US & Canada)': '-06:00',
  'Eastern Time (US & Canada)': '-05:00',
  'London': '+00:00',
  'Mountain Time (US & Canada)': '-07:00',
  'Mumbai': '+05:30',
  'Pacific Time (US & Canada)': '-08:00',
  'Rome': '+01:00',
  'Stockholm': '+01:00'
};

const CreateSchedulers: React.FC<CreateSchedulersProps> = ({ projectId, onComplete, stepResults }) => {
  const [formData, setFormData] = useState<SchedulerFormData>({
    projectId: projectId || '',
    staggerMinutes: 10,
    timeZone: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    hoursPerDay: '',
    title: '',
    recurringDays: {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    }
  });
  const [isCreating, setIsCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SchedulerResult[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLogsOpen, setIsLogsOpen] = useState(true);
  const [isResultsOpen, setIsResultsOpen] = useState(true);

  // Update projectId when prop changes
  useEffect(() => {
    if (projectId) {
      setFormData(prev => ({ ...prev, projectId }));
    }
  }, [projectId]);

  const validateForm = () => {
    if (!formData.staggerMinutes || formData.staggerMinutes < 1) return 'Stagger Minutes must be at least 1';
    if (!formData.timeZone) return 'Time Zone is required';
    if (!formData.startDate) return 'Start Date is required';
    if (!formData.startTime) return 'Start Time is required';
    if (!formData.endDate) return 'End Date is required';
    if (!formData.endTime) return 'End Time is required';
    if (!formData.hoursPerDay) return 'Hours Per Day is required';
    if (!formData.projectId) return 'Project ID is required';
    if (!formData.title) return 'Scheduler Title is required';
    if (!Object.values(formData.recurringDays).some(day => day)) {
      return 'At least one recurring day must be selected';
    }
    return null;
  };

  const handleChange = (field: keyof SchedulerFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field === 'staggerMinutes' 
      ? Math.max(1, parseInt(e.target.value) || 1)
      : e.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTimezoneChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      timeZone: value
    }));
  };

  const handleRecurringDayChange = (day: keyof SchedulerFormData['recurringDays']) => (
    checked: boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      recurringDays: {
        ...prev.recurringDays,
        [day]: checked
      }
    }));
  };

  const addLog = (message: string) => {
    setLogs(prev => [...prev, message]);
  };

  const formatWithTimezone = (date: Date, timeZone: string) => {
    const offset = TIMEZONE_OPTIONS[timeZone] || '+00:00';
    return format(date, `yyyy/MM/dd HH:mm:ss '${offset}'`);
  };

  const handleCreateSchedulers = async () => {
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError(null);
    setLogs([]);
    setResults([]);
    setProgress(0);

    try {
      const { projectId, staggerMinutes, timeZone, startDate, startTime, endDate, endTime, hoursPerDay, title, recurringDays } = formData;

      addLog(`Starting scheduler creation for project ${projectId}`);
      addLog(`Stagger Minutes: ${staggerMinutes}`);
      addLog(`Time Zone: ${timeZone}`);
      addLog(`Hours Per Day: ${hoursPerDay}`);

      // First, fetch all configurations for the project
      addLog('Fetching project configurations...');
      const configurationsResponse = await skytapAPI.getProjectConfigurations(projectId);
      const configurations = configurationsResponse;

      if (!configurations || configurations.length === 0) {
        throw new Error('No configurations found in the specified project');
      }

      addLog(`Found ${configurations.length} configuration(s) in project`);

      // Parse start and end times
      const startTimeDate = new Date(`${startDate}T${startTime}`);
      const endTimeDate = new Date(`${endDate}T${endTime}`);
      const baseStartMinutes = startTimeDate.getHours() * 60 + startTimeDate.getMinutes();

      // Convert recurring days to array format (uppercase for Skytap API)
      const recurringDaysArray = Object.entries(recurringDays)
        .filter(([_, selected]) => selected)
        .map(([day, _]) => day.toUpperCase());

      addLog(`Recurring days: ${recurringDaysArray.join(', ')}`);

      const totalSteps = configurations.length;
      let currentStep = 0;
      const schedulerResults: SchedulerResult[] = [];

      // Create a scheduler for each configuration with staggered start times
      for (let i = 0; i < configurations.length; i++) {
        const config = configurations[i];
        
        try {
          // Calculate staggered start time (configurable minutes between each)
          const staggeredMinutes = baseStartMinutes + (i * staggerMinutes);
          const staggeredHours = Math.floor(staggeredMinutes / 60);
          const staggeredMins = staggeredMinutes % 60;

          // Create new date objects for start and end times
          const schedulerStartDate = new Date(startDate);
          schedulerStartDate.setHours(staggeredHours, staggeredMins, 0);

          const schedulerEndDate = new Date(endDate);
          schedulerEndDate.setHours(endTimeDate.getHours(), endTimeDate.getMinutes(), 0);

          addLog(`Creating scheduler for ${config.name} (staggered start: ${staggeredHours}:${staggeredMins.toString().padStart(2, '0')} - ${staggerMinutes}min delay)`);

          const schedulerPayload = {
            title: `${title} - ${config.name}`,
            configuration_id: config.id,
            actions: [
              { type: 'run', offset: 0 },
              { type: 'suspend', offset: parseInt(hoursPerDay) * 3600 }
            ],
            next_action_name: 'run',
            next_action_time: formatWithTimezone(schedulerStartDate, timeZone),
            start_at: formatWithTimezone(schedulerStartDate, timeZone),
            end_at: formatWithTimezone(schedulerEndDate, timeZone),
            notify_user: true,
            delete_at_end: false,
            executions: [],
            recurring_days: recurringDaysArray,
            time_zone: timeZone
          };

          addLog(`Sending scheduler payload: ${JSON.stringify(schedulerPayload, null, 2)}`);
          
          const schedulerResponse = await skytapAPI.createScheduler(schedulerPayload);
          
          addLog(`Scheduler API response: ${JSON.stringify(schedulerResponse, null, 2)}`);
          addLog(`Successfully created scheduler for ${config.name} (ID: ${schedulerResponse.id})`);

          schedulerResults.push({
            configurationId: config.id,
            configurationName: config.name,
            schedulerId: schedulerResponse.id,
            title: schedulerPayload.title,
            startTime: formatWithTimezone(schedulerStartDate, timeZone),
            endTime: formatWithTimezone(schedulerEndDate, timeZone)
          });

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          addLog(`Failed to create scheduler for ${config.name}: ${errorMessage}`);
        }

        currentStep++;
        setProgress((currentStep / totalSteps) * 100);
      }

      setResults(schedulerResults);
      setProgress(100);
      addLog(`Scheduler creation completed! Created ${schedulerResults.length} scheduler(s)`);
      
      // Call onComplete with results
      onComplete({
        success: true,
        results: schedulerResults,
        logs: logs,
        totalSchedulers: schedulerResults.length
      });
      
      toast({
        title: "Schedulers Created",
        description: `Successfully created ${schedulerResults.length} scheduler(s)`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create schedulers';
      setError(errorMessage);
      addLog(`Scheduler creation failed: ${errorMessage}`);
      
      onComplete({
        success: false,
        error: errorMessage,
        logs: logs
      });
      
      toast({
        title: "Scheduler Creation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
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
          <Label htmlFor="staggerMinutes">Stagger Minutes</Label>
          <Input
            id="staggerMinutes"
            type="number"
            min="1"
            max="60"
            value={formData.staggerMinutes}
            onChange={handleChange('staggerMinutes')}
            placeholder="Minutes between scheduler starts"
            disabled={isCreating}
          />
          <p className="text-xs text-muted-foreground">
            Minutes to stagger between each environment's start time
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Scheduler Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={handleChange('title')}
            placeholder="e.g., Training Schedule"
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeZone">Time Zone</Label>
          <Select value={formData.timeZone} onValueChange={handleTimezoneChange} disabled={isCreating}>
            <SelectTrigger>
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(TIMEZONE_OPTIONS).map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hoursPerDay">Hours Per Day</Label>
          <Input
            id="hoursPerDay"
            type="number"
            min="1"
            max="24"
            value={formData.hoursPerDay}
            onChange={handleChange('hoursPerDay')}
            placeholder="Hours per day"
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange('startDate')}
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="time"
            value={formData.startTime}
            onChange={handleChange('startTime')}
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange('endDate')}
            disabled={isCreating}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="time"
            value={formData.endTime}
            onChange={handleChange('endTime')}
            disabled={isCreating}
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label>Recurring Days</Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(formData.recurringDays).map(([day, checked]) => (
            <div key={day} className="flex items-center space-x-2">
              <Checkbox
                id={day}
                checked={checked}
                onCheckedChange={handleRecurringDayChange(day as keyof SchedulerFormData['recurringDays'])}
                disabled={isCreating}
              />
              <Label htmlFor={day} className="text-sm capitalize">
                {day}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Button 
        onClick={handleCreateSchedulers} 
        disabled={isCreating || !projectId}
        className="w-full"
      >
        <Calendar className="h-4 w-4 mr-2" />
        {isCreating ? "Creating Schedulers..." : "Create Schedulers"}
      </Button>

      {isCreating && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Scheduler Creation Progress</span>
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
                    <CardTitle className="text-lg">Scheduler Creation Log</CardTitle>
                    <CardDescription>
                      Real-time log of the scheduler creation process
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
          <Collapsible open={isResultsOpen} onOpenChange={setIsResultsOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Scheduler Results</CardTitle>
                    <CardDescription>
                      Successfully created {results.length} scheduler{results.length !== 1 ? 's' : ''}
                    </CardDescription>
                  </div>
                  {isResultsOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((result, index) => (
                    <Card key={result.schedulerId} className="border-blue-200 bg-blue-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-blue-800">Scheduler {index + 1}</span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div><strong>Configuration:</strong> {result.configurationName}</div>
                          <div><strong>Title:</strong> {result.title}</div>
                          <div><strong>Scheduler ID:</strong> {result.schedulerId}</div>
                          <div><strong>Start Time:</strong> {result.startTime}</div>
                          <div><strong>End Time:</strong> {result.endTime}</div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}
    </div>
  );
};

export default CreateSchedulers;