// Vite Configuration for Skytap Management Console
// This configuration sets up the development server with API proxying to Skytap Cloud

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Vite configuration for the Skytap Management Console
 * 
 * Key features:
 * - React with SWC for fast compilation
 * - API proxy to Skytap Cloud with authentication
 * - Path aliases for clean imports
 * - Development component tagging
 * - Dependency deduplication for better performance
 */
export default defineConfig(({ mode }) => {
  // Load environment variables for API authentication
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // Development server configuration
    server: {
      host: "::", // Listen on all interfaces
      port: 8080,
      proxy: {
        // Proxy API requests to Skytap Cloud
        '/api': {
          target: 'https://cloud.skytap.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
          configure: (proxy, options) => {
            // Add authentication headers to outgoing requests
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Add Basic Auth header from environment variables
              const username = env.SKYTAP_USER;
              const token = env.SKYTAP_TOKEN;
              if (username && token) {
                const auth = Buffer.from(`${username}:${token}`).toString('base64');
                proxyReq.setHeader('Authorization', `Basic ${auth}`);
              }
              proxyReq.setHeader('Content-Type', 'application/json');
              proxyReq.setHeader('Accept', 'application/json');
            });
            
            // Handle redirects from Skytap API
            proxy.on('proxyRes', (proxyRes, req, res) => {
              // Handle redirects by following them server-side
              if (proxyRes.statusCode === 302 || proxyRes.statusCode === 301) {
                const location = proxyRes.headers.location;
                if (location) {
                  // Make the redirect relative to our proxy
                  const redirectUrl = location.replace('https://cloud.skytap.com', '/api');
                  proxyRes.headers.location = redirectUrl;
                  console.log('Proxy redirect:', { from: req.url, to: redirectUrl });
                }
              }
            });
            
            // Log proxy errors for debugging
            proxy.on('error', (err, req, res) => {
              console.error('Proxy error:', err);
            });
          }
        }
      }
    },
    
    // Vite plugins
    plugins: [
      react(), // React with SWC for fast compilation
      mode === "development" && componentTagger() // Development-only component tagging
    ].filter(Boolean),
    
    // Module resolution configuration
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"), // Clean import paths
      },
      // Deduplicate common dependencies to avoid conflicts
      dedupe: [
        "react", 
        "react-dom", 
        "react/jsx-runtime", 
        "@radix-ui/react-context",
        "@radix-ui/react-tabs",
        "@radix-ui/react-direction",
        "react-hook-form"
      ],
    },
  };
});
