import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const PartnerEnvironments = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/")} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Partner Environments</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deploy partner environments and manage partner portals
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid gap-6 md:grid-cols-2">
            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 group"
              onClick={() => navigate("/partner/deploy")}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gradient-primary text-primary-foreground group-hover:scale-110 transition-transform">
                    <Plus className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Deploy Partner Environments</CardTitle>
                    <CardDescription className="mt-1.5">
                      Create and configure new partner environments
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 group"
              onClick={() => navigate("/partner/portals")}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gradient-primary text-primary-foreground group-hover:scale-110 transition-transform">
                    <Settings2 className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle>Manage Partner Portals</CardTitle>
                    <CardDescription className="mt-1.5">
                      Configure and oversee partner portal settings
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PartnerEnvironments;
