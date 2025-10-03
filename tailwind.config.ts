// Tailwind CSS Configuration for Skytap Management Console
// This configuration extends Tailwind with custom design tokens and animations

import type { Config } from "tailwindcss";

export default {
  // Enable class-based dark mode
  darkMode: ["class"],
  
  // Content paths for Tailwind to scan for classes
  content: [
    "./pages/**/*.{ts,tsx}", 
    "./components/**/*.{ts,tsx}", 
    "./app/**/*.{ts,tsx}", 
    "./src/**/*.{ts,tsx}"
  ],
  prefix: "",
  
  theme: {
    // Container configuration for responsive layouts
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px", // Max container width
      },
    },
    
    extend: {
      // Custom color palette using CSS variables for theming
      colors: {
        // Base colors
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Primary color scheme
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        
        // Secondary color scheme
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        
        // Destructive/error colors
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        
        // Muted/subtle colors
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        
        // Accent colors
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        
        // Popover colors
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        // Card colors
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // Sidebar colors (for future sidebar components)
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      
      // Custom border radius values
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      
      // Custom background gradients
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-card': 'var(--gradient-card)',
      },
      
      // Custom shadow values
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      },
      
      // Custom keyframe animations
      keyframes: {
        // Accordion animations for collapsible content
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        
        // Fade-in animation for smooth page transitions
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },
      
      // Animation classes
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.5s ease-out",
      },
    },
  },
  
  // Tailwind plugins
  plugins: [require("tailwindcss-animate")], // Adds animation utilities
} satisfies Config;
