import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Network, FileText, Users2, Calculator, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const utilities = [
  {
    title: "Project Cleaner",
    description: "Clean up and organize project resources",
    icon: Trash2,
    path: "/utilities/project-cleaner",
  },
  {
    title: "IP Address Management",
    description: "Manage and track IP address allocations",
    icon: Network,
    path: "/utilities/ip-management",
  },
  {
    title: "Billing Reports",
    description: "View and export billing information",
    icon: FileText,
    path: "/utilities/billing",
  },
  {
    title: "Manage Users",
    description: "User administration and permissions",
    icon: Users2,
    path: "/utilities/users",
  },
  {
    title: "Cost Calculator",
    description: "Calculate and estimate resource costs",
    icon: Calculator,
    path: "/utilities/cost-calculator",
  },
  {
    title: "Usage by Code",
    description: "Analyze usage metrics by code",
    icon: BarChart3,
    path: "/utilities/usage",
  },
];

const GeneralUtilities = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">General Utilities</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access various tools for project management and billing
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {utilities.map((utility) => {
              const Icon = utility.icon;
              return (
                <Card
                  key={utility.path}
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 group"
                  onClick={() => navigate(utility.path)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-gradient-primary text-primary-foreground group-hover:scale-110 transition-transform">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{utility.title}</CardTitle>
                        <CardDescription className="mt-1 text-sm">
                          {utility.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GeneralUtilities;
