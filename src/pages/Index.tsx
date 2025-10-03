// Index Page Component
// The main landing page that displays the three main categories of Skytap management tools

import { useNavigate } from "react-router-dom";
import { GraduationCap, Users, Wrench } from "lucide-react";
import { CategoryCard } from "@/components/CategoryCard";

/**
 * Index Component
 * 
 * The main landing page that presents users with three main categories:
 * - Training Environments: For managing training setups
 * - Partner Environments: For partner-related operations
 * - General Utilities: For various administrative tools
 */
const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Application header with branding */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Skytap Management Console
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Powerful tools to manage your Skytap environments
            </p>
          </div>
        </div>
      </header>

      {/* Main content area with category selection */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {/* Page introduction */}
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-3xl font-bold mb-3">Choose a Category</h2>
            <p className="text-muted-foreground text-lg">
              Select one of the management tools below to get started
            </p>
          </div>

          {/* Category cards grid - responsive layout */}
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3 animate-fade-in">
            {/* Training Environments Card */}
            <CategoryCard
              title="Training Environments"
              description="Deploy and manage training environments with automated scheduling"
              icon={GraduationCap}
              onClick={() => navigate("/training")}
            />
            
            {/* Partner Environments Card */}
            <CategoryCard
              title="Partner Environments"
              description="Deploy partner environments and manage partner portals"
              icon={Users}
              onClick={() => navigate("/partner")}
            />
            
            {/* General Utilities Card */}
            <CategoryCard
              title="General Utilities"
              description="Access various tools for project management and billing"
              icon={Wrench}
              onClick={() => navigate("/utilities")}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
