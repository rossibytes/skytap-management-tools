// Skytap API Service
// This module provides a centralized interface for all Skytap API interactions

export interface SkytapProject {
  id: string;
  name: string;
  configuration_count: number;
  template_count: number;
  url?: string;
  summary?: string;
  auto_add_role_name?: string;
  show_project_members?: boolean;
  created_at?: string;
  owner_name?: string;
  owner_url?: string;
  user_role?: string;
  user_count?: number;
  can_edit?: boolean;
  asset_count?: number;
}

export interface SkytapIPAddress {
  id: string;
  address: string;
  region: string;
  nic_count: number;
  connect_type: string;
  dns_name: string;
  nics: {
    id: string;
    deployed: boolean;
  }[];
}

export interface SkytapConfiguration {
  id: string;
  name: string;
  description?: string;
  runstate: string;
  vm_count: number;
  storage: number;
  region: string;
  created_at: string;
  vms?: Array<{
    id: string;
    name: string;
    runstate: string;
    hardware: {
      cpus: number;
      ram: number;
      storage: number;
    };
  }>;
}

export interface SkytapTemplate {
  id: string;
  name: string;
  description?: string;
  vm_count: number;
  storage: number;
  region: string;
  created_at: string;
  vms?: Array<{
    id: string;
    name: string;
    runstate: string;
    hardware: {
      cpus: number;
      ram: number;
      storage: number;
      guestOS?: string;
      architecture?: string;
    };
  }>;
}

export interface SkytapLabel {
  id: string;
  text: string;
  type: string;
  created_at?: string;
  updated_at?: string;
}

export interface SkytapUser {
  id: string;
  url: string;
  first_name: string;
  last_name: string;
  login_name: string;
  email: string;
  title: string;
  deleted: boolean;
  default_region: string;
  can_add_resources: boolean;
  activated: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

class SkytapAPI {
  private baseURL = '/api';

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Handle 204 No Content responses (typical for DELETE operations)
    if (response.status === 204) {
      return {} as T;
    }

    // Handle 200 OK responses (also valid for DELETE operations)
    if (response.status === 200) {
      // For DELETE operations, we might not have a response body
      try {
        const text = await response.text();
        return text ? JSON.parse(text) : {} as T;
      } catch {
        return {} as T;
      }
    }

    return response.json();
  }

  // Project Management
  async getAllProjects(count: number = 200, offset: number = 0): Promise<SkytapProject[]> {
    return this.makeRequest<SkytapProject[]>(`/v2/projects?count=${count}&offset=${offset}`);
  }

  async getProject(projectId: string): Promise<SkytapProject> {
    return this.makeRequest<SkytapProject>(`/v2/projects/${projectId}.json`);
  }

  async deleteProject(projectId: string): Promise<void> {
    return this.makeRequest<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  async getProjectConfigurations(projectId: string): Promise<SkytapConfiguration[]> {
    return this.makeRequest<SkytapConfiguration[]>(`/v2/projects/${projectId}/configurations.json`);
  }

  async getProjectTemplates(projectId: string): Promise<SkytapTemplate[]> {
    // Note: Skytap API doesn't have a direct endpoint for project templates
    // This would need to be implemented based on available endpoints
    return this.makeRequest<SkytapTemplate[]>(`/v2/projects/${projectId}/templates.json`);
  }

  // Configuration Management
  async getAllConfigurations(count: number = 200, offset: number = 0): Promise<SkytapConfiguration[]> {
    return this.makeRequest<SkytapConfiguration[]>(`/v2/configurations?count=${count}&offset=${offset}`);
  }

  async getConfiguration(configId: string): Promise<SkytapConfiguration> {
    return this.makeRequest<SkytapConfiguration>(`/v2/configurations/${configId}`);
  }

  async deleteConfiguration(configId: string): Promise<void> {
    return this.makeRequest<void>(`/configurations/${configId}.json`, {
      method: 'DELETE',
    });
  }

  // Template Management
  async getAllTemplates(count: number = 200, offset: number = 0): Promise<SkytapTemplate[]> {
    return this.makeRequest<SkytapTemplate[]>(`/v2/templates?count=${count}&offset=${offset}`);
  }

  async getTemplate(templateId: string): Promise<SkytapTemplate> {
    return this.makeRequest<SkytapTemplate>(`/v2/templates/${templateId}`);
  }

  // Label Management
  async getConfigurationLabels(configId: string): Promise<SkytapLabel[]> {
    return this.makeRequest<SkytapLabel[]>(`/v2/configurations/${configId}/labels.json`);
  }

  async getTemplateLabels(templateId: string): Promise<SkytapLabel[]> {
    return this.makeRequest<SkytapLabel[]>(`/v2/templates/${templateId}/labels.json`);
  }

  // Utility methods for Project Cleaner
  async findEmptyProjects(count: number = 200): Promise<SkytapProject[]> {
    try {
      const projects = await this.getAllProjects(count);
      
      // Filter projects that have 0 configurations
      // The configuration_count is already available in the API response
      const emptyProjects = projects.filter(project => project.configuration_count === 0);
      
      return emptyProjects;
    } catch (error) {
      console.error('Error finding empty projects:', error);
      throw error;
    }
  }

  async deleteProjects(projectIds: string[]): Promise<{success: string[], failed: {id: string, error: string}[]}> {
    const results = { success: [] as string[], failed: [] as {id: string, error: string}[] };
    
    for (const projectId of projectIds) {
      try {
        await this.deleteProject(projectId);
        results.success.push(projectId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ id: projectId, error: errorMessage });
        console.error(`Failed to delete project ${projectId}:`, error);
      }
    }
    
    return results;
  }

  // IP Address Management
  async getIPAddressesByRegion(region: string, count: number = 100, offset: number = 0): Promise<SkytapIPAddress[]> {
    return this.makeRequest<SkytapIPAddress[]>(`/v2/ips.json?count=${count}&offset=${offset}&query=region:${region}`);
  }

  async acquirePublicIP(region: string): Promise<SkytapIPAddress> {
    return this.makeRequest<SkytapIPAddress>('/v2/ips/acquire.json', {
      method: 'POST',
      body: JSON.stringify({ region }),
    });
  }

  async attachIPToInterface(configId: string, vmId: string, interfaceId: string, ip: string): Promise<void> {
    return this.makeRequest<void>(`/v2/configurations/${configId}/vms/${vmId}/interfaces/${interfaceId}/ips.json`, {
      method: 'POST',
      body: JSON.stringify({ ip }),
    });
  }

  async releaseIPAddress(ipId: string): Promise<void> {
    return this.makeRequest<void>(`/v2/ips/${ipId}/release.json`, {
      method: 'POST',
    });
  }

  async releaseIPAddresses(ipIds: string[]): Promise<{success: string[], failed: {id: string, error: string}[]}> {
    const results = { success: [] as string[], failed: [] as {id: string, error: string}[] };
    
    for (const ipId of ipIds) {
      try {
        await this.releaseIPAddress(ipId);
        results.success.push(ipId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.failed.push({ id: ipId, error: errorMessage });
        console.error(`Failed to release IP ${ipId}:`, error);
      }
    }
    
    return results;
  }

  // Billing and Reporting
  async createX86Report(startDate: string, endDate: string, customerId: string = "83689"): Promise<{id: string}> {
    return this.makeRequest<{id: string}>('/reports.json', {
      method: 'POST',
      body: JSON.stringify({
        aggregate_by: "month",
        customer_id: customerId,
        end_date: endDate,
        federated_account_key: null,
        group_by: "region",
        label_type: "none",
        groupings: [],
        region: "All Regions",
        start_date: startDate,
        utc: true,
        resource_type: "svms"
      }),
    });
  }

  async createStorageReport(startDate: string, endDate: string, customerId: string = "83689"): Promise<{id: string}> {
    return this.makeRequest<{id: string}>('/reports.json', {
      method: 'POST',
      body: JSON.stringify({
        aggregate_by: "month",
        customer_id: customerId,
        end_date: endDate,
        federated_account_key: null,
        group_by: "region",
        label_type: "none",
        groupings: [],
        region: "All Regions",
        start_date: startDate,
        utc: true,
        resource_type: "storage_size"
      }),
    });
  }

  async getReportResults(reportId: string): Promise<any> {
    return this.makeRequest<any>(`/reports/${reportId}.json`);
  }

  // Environment Management
  async deployFromTemplate(templateId: string, environmentName: string): Promise<any> {
    return this.makeRequest<any>('/configurations.json', {
      method: 'POST',
      body: JSON.stringify({
        template_id: templateId,
        name: environmentName
      }),
    });
  }

  async addConfigurationToProject(configId: string, projectId: string = "385982"): Promise<void> {
    return this.makeRequest<void>(`/v2/projects/${projectId}/configurations/${configId}`, {
      method: 'POST',
    });
  }

  // Note: These methods are duplicates of acquirePublicIP and attachIPToInterface above
  // Keeping for backward compatibility but consider removing in future cleanup
  async acquirePublicIp(region: string): Promise<SkytapIPAddress> {
    return this.acquirePublicIP(region);
  }

  async attachIpToInterface(configId: string, vmId: string, interfaceId: string, ip: string): Promise<void> {
    return this.attachIPToInterface(configId, vmId, interfaceId, ip);
  }

  async createPublishSet(configId: string, payload: any): Promise<any> {
    return this.makeRequest<any>(`/v2/configurations/${configId}/publish_sets.json`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getPublishSet(configId: string, publishSetId: string): Promise<any> {
    return this.makeRequest<any>(`/v2/configurations/${configId}/publish_sets/${publishSetId}.json`);
  }

  // Note: getProjectConfigurations is already defined above - this is a duplicate
  // Keeping for backward compatibility but consider removing in future cleanup

  async getPublishSets(configId: string): Promise<any> {
    return this.makeRequest<any>(`/v2/configurations/${configId}/publish_sets.json?count=20&offset=0`);
  }

  async updatePublishSet(configId: string, publishSetId: string, payload: any): Promise<any> {
    return this.makeRequest<any>(`/v2/configurations/${configId}/publish_sets/${publishSetId}.json`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Training Environment Management
  async copyEnvironment(masterEnvironmentId: string): Promise<any> {
    return this.makeRequest<any>('/configurations.json', {
      method: 'POST',
      body: JSON.stringify({
        configuration_id: masterEnvironmentId
      }),
    });
  }

  async updateEnvironmentName(configId: string, name: string): Promise<any> {
    return this.makeRequest<any>(`/configurations/${configId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async addEnvironmentToProject(configId: string, projectId: string): Promise<void> {
    return this.makeRequest<void>(`/projects/${projectId}/configurations/${configId}.json`, {
      method: 'POST',
    });
  }

  async createScheduler(payload: any): Promise<any> {
    return this.makeRequest<any>('/v2/schedules.json', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getConfigurationStatus(configId: string): Promise<any> {
    return this.makeRequest<any>(`/v2/configurations/${configId}`);
  }

  async disableConfigurationAutoshutdown(configId: string): Promise<any> {
    return this.makeRequest<any>(`/v2/configurations/${configId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ suspend_type: "" }),
    });
  }

  // User Management Methods
  async getAllUsers(count: number = 50): Promise<SkytapUser[]> {
    let allUsers: SkytapUser[] = [];
    let offset = 0;
    const batchSize = Math.min(count, 100); // Max 100 per request
    let hasMore = true;

    while (hasMore && allUsers.length < count) {
      const endpoint = `/v2/users?count=${batchSize}&offset=${offset}`;
      console.log(`Fetching users batch: ${endpoint}`);
      
      const batch = await this.makeRequest<SkytapUser[]>(endpoint);
      
      if (!batch || batch.length === 0) {
        console.log('No more users found');
        hasMore = false;
        break;
      }
      
      console.log(`Batch returned ${batch.length} users`);
      allUsers = allUsers.concat(batch);
      offset += batchSize;
      
      // Stop if we got fewer users than requested (end of data)
      if (batch.length < batchSize) {
        hasMore = false;
      }
    }

    console.log(`Total users fetched: ${allUsers.length}`);
    return allUsers.slice(0, count); // Ensure we don't exceed requested count
  }

  // Running Environments Dashboard
  async getRunningConfigurations(): Promise<SkytapConfiguration[]> {
    return this.makeRequest<SkytapConfiguration[]>('/v2/configurations?query=status%3Arunning');
  }
}

// Export a singleton instance
export const skytapAPI = new SkytapAPI();
export default skytapAPI;
