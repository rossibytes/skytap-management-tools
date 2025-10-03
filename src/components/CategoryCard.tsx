// CategoryCard Component
// A reusable card component for displaying application categories with icons and descriptions

import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Props for the CategoryCard component
 */
interface CategoryCardProps {
  /** The title displayed on the card */
  title: string;
  /** The description text shown below the title */
  description: string;
  /** Lucide React icon component to display */
  icon: LucideIcon;
  /** Click handler function */
  onClick: () => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * CategoryCard Component
 * 
 * A clickable card that displays a category with an icon, title, and description.
 * Features hover animations and gradient styling for visual appeal.
 * 
 * @param props - CategoryCardProps object containing title, description, icon, onClick, and optional className
 */
export function CategoryCard({ title, description, icon: Icon, onClick, className }: CategoryCardProps) {
  return (
    <Card 
      className={cn(
        // Base styles with hover effects and animations
        "cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 group",
        className
      )}
      onClick={onClick}
    >
      <CardHeader>
        <div className="flex items-center gap-4">
          {/* Icon container with gradient background and hover animation */}
          <div className="p-3 rounded-lg bg-gradient-primary text-primary-foreground group-hover:scale-110 transition-transform">
            <Icon className="h-6 w-6" />
          </div>
          
          {/* Text content area */}
          <div className="flex-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-1.5">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
