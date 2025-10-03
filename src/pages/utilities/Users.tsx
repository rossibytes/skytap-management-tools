import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { skytapAPI, SkytapUser } from "@/lib/skytap-api";

type SortField = 'id' | 'last_name' | 'first_name' | 'activated' | 'last_login';
type SortOrder = 'asc' | 'desc';

const Users = () => {
  const navigate = useNavigate();
  const [maxResults, setMaxResults] = useState(20);
  const [showNotActivatedOnly, setShowNotActivatedOnly] = useState(false);
  const [users, setUsers] = useState<SkytapUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('last_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  const handleListUsers = async () => {
    if (!maxResults || maxResults <= 0) {
      setError('Please enter a valid number of results');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('Fetching users with count:', maxResults);
      const fetchedUsers = await skytapAPI.getAllUsers(maxResults);
      console.log('Fetched users:', fetchedUsers);
      
      setUsers(fetchedUsers);
      setSuccess(`Found ${fetchedUsers.length} user(s)`);
      
      toast({
        title: "Users Retrieved",
        description: `Found ${fetchedUsers.length} user(s)`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      console.error('Error fetching users:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return 'Never';
    }
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Sort users based on current sort field and order
  const sortedUsers = [...users].sort((a, b) => {
    let aValue: string | number | boolean;
    let bValue: string | number | boolean;

    switch (sortField) {
      case 'id':
        aValue = parseInt(a.id);
        bValue = parseInt(b.id);
        break;
      case 'last_name':
        aValue = a.last_name.toLowerCase();
        bValue = b.last_name.toLowerCase();
        break;
      case 'first_name':
        aValue = a.first_name.toLowerCase();
        bValue = b.first_name.toLowerCase();
        break;
      case 'activated':
        aValue = a.activated;
        bValue = b.activated;
        break;
      case 'last_login':
        aValue = a.last_login || '';
        bValue = b.last_login || '';
        break;
      default:
        aValue = a.last_name.toLowerCase();
        bValue = b.last_name.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
    }
  });

  // Filter users based on activation status
  const filteredUsers = showNotActivatedOnly 
    ? sortedUsers.filter(user => !user.activated)
    : sortedUsers;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/utilities")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to General Utilities
          </Button>
          <h1 className="text-2xl font-bold">Manage Users</h1>
          <p className="text-sm text-muted-foreground mt-1">
            User administration and permissions
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>List All Users</CardTitle>
              <CardDescription>
                Retrieve and filter user accounts from your Skytap environment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="flex-1 max-w-xs space-y-2">
                    <Label htmlFor="maxResults">Max Results To Return</Label>
                    <Input
                      id="maxResults"
                      type="number"
                      value={maxResults}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Remove leading zeros and convert to number
                        const numericValue = value === '' ? 0 : parseInt(value, 10);
                        setMaxResults(numericValue);
                      }}
                      disabled={isLoading}
                      min="1"
                      max="1000"
                    />
                    <p className="text-xs text-muted-foreground">
                      Number of users to retrieve (1-1000)
                    </p>
                  </div>
                  <Button onClick={handleListUsers} disabled={isLoading}>
                    <Search className="h-4 w-4 mr-2" />
                    {isLoading ? "Loading..." : "LIST ALL USERS"}
                  </Button>
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                
                {/* Success Message */}
                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-600">{success}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {users.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notActivated"
                      checked={showNotActivatedOnly}
                      onCheckedChange={(checked) => setShowNotActivatedOnly(checked as boolean)}
                    />
                    <label
                      htmlFor="notActivated"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Show Not Activated Only
                    </label>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h2 className="text-xl font-semibold mb-4">
                  Users Found ({filteredUsers.length} users)
                </h2>
                
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('id')}>
                            <div className="flex items-center gap-2">
                              ID
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('last_name')}>
                            <div className="flex items-center gap-2">
                              Last Name
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('first_name')}>
                            <div className="flex items-center gap-2">
                              First Name
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('activated')}>
                            <div className="flex items-center gap-2">
                              Activated
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('last_login')}>
                            <div className="flex items-center gap-2">
                              Last Login
                              <ArrowUpDown className="h-4 w-4" />
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>{user.id}</TableCell>
                            <TableCell>{user.last_name}</TableCell>
                            <TableCell>{user.first_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${user.activated ? 'bg-green-500' : 'bg-red-500'}`} />
                                {user.activated ? 'Yes' : 'No'}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(user.last_login)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Users;
