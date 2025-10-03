# Skytap Management Console
Created by: rossibytes

A comprehensive, modern web application for managing Skytap Cloud resources. This toolkit provides an intuitive interface for environment management, training workflows, partner operations, and administrative utilities.

## 🚀 Overview

The Skytap Management Console is designed to streamline Skytap Cloud operations through three main categories:

- **🎓 Training Environments**: Automated training environment setup with step-by-step workflows
- **👥 Partner Environments**: Partner portal management and environment deployment
- **🔧 General Utilities**: Administrative tools for project management, billing, and resource optimization

## ✨ Key Features

### Training Environment Management
- **Automated Environment Copying**: Create multiple training environments from master templates
- **Staggered Scheduling**: Set up automated schedules to prevent resource conflicts
- **Power Management**: Disable auto-shutdown to prevent unexpected suspensions
- **URL Generation**: Automatically generate and export student access URLs
- **Project Validation**: Verify project IDs before operations

### Partner Environment Operations
- **Environment Deployment**: Deploy partner environments from templates
- **Portal Management**: Create and manage sharing portals for partner access
- **Publish Set Configuration**: Set up secure sharing configurations

### Administrative Utilities
- **Project Cleaner**: Identify and remove empty projects to optimize costs
- **IP Address Management**: Acquire, attach, and release public IP addresses
- **User Management**: View and manage user accounts and permissions
- **Billing & Cost Analysis**: Generate detailed usage and cost reports
- **Usage Analytics**: Track resource utilization across environments

## 🛠️ Technology Stack

This application is built with modern web technologies for optimal performance and developer experience:

### Frontend Framework
- **React 18** - Modern UI framework with hooks and concurrent features
- **TypeScript** - Type-safe JavaScript for better development experience
- **Vite** - Lightning-fast build tool and development server

### UI & Styling
- **shadcn/ui** - High-quality, accessible UI components
- **Tailwind CSS** - Utility-first CSS framework for rapid styling
- **Radix UI** - Unstyled, accessible UI primitives
- **Lucide React** - Beautiful, customizable icons

### State Management & Data Fetching
- **TanStack Query** - Powerful data synchronization for React
- **React Router** - Declarative routing for React applications

### Development Tools
- **ESLint** - Code linting and quality assurance
- **PostCSS** - CSS processing and optimization
- **SWC** - Fast TypeScript/JavaScript compiler

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/) or [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** or **yarn** package manager
- **Git** for version control
- **Skytap Cloud account** with API access

### 📥 Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/skytap-toolkit-hub.git
   cd skytap-toolkit-hub
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**:
   ```bash
   # Create your environment configuration file
   touch .env
   ```

4. **Configure your Skytap API credentials** in the `.env` file:
   ```bash
   # Edit the .env file with your actual Skytap credentials
   nano .env
   # or
   code .env
   # or use your preferred text editor
   ```
   
   Add the following content to your `.env` file, replacing the placeholder values with your actual Skytap credentials:
   ```env
   # Skytap Cloud API Credentials
   # Get these from your Skytap Cloud account under API Access
   SKYTAP_USER=your_actual_skytap_username
   SKYTAP_TOKEN=your_actual_skytap_api_token
   
   # Optional: API Base URL (for production with backend proxy)
   # API_BASE_URL=https://your-backend-proxy.com/api
   ```
   
   **Important**: 
   - Get your API credentials from your Skytap Cloud account under **API Access** settings
   - Replace `your_actual_skytap_username` with your real Skytap username
   - Replace `your_actual_skytap_api_token` with your real API token
   - Never commit the `.env` file to version control (it's already in `.gitignore`)
   - Keep your API token secure and don't share it with others

### 🔑 Getting Skytap API Credentials

To obtain your Skytap API credentials:

1. **Log in** to your Skytap Cloud account
2. **Navigate** to your account settings or profile
3. **Find** the "API Access" or "API Tokens" section
4. **Generate** a new API token if you don't have one
5. **Copy** both your username and the generated API token
6. **Store** these credentials securely in your `.env` file

**Note**: If you don't see API access options, contact your Skytap administrator as API access may need to be enabled for your account.

### 🏃‍♂️ Running the Application

```bash
# Start the development server
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:8080`.

### 📋 Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run build:dev    # Build in development mode
npm run preview      # Preview production build
npm run lint         # Run ESLint

# Package management
npm install          # Install dependencies
npm update           # Update dependencies
```

## 🔌 API Integration

### Development Mode

The application uses a **local proxy configuration** for development that:

- **Proxies API requests** from `/api/*` to `https://cloud.skytap.com`
- **Automatically adds Basic Authentication** headers using environment variables
- **Handles CORS** and other development-specific concerns
- **Manages redirects** from the Skytap API
- **Provides error logging** for debugging

### 🚨 Production Security Warning

**⚠️ CRITICAL: The current proxy configuration is for DEVELOPMENT ONLY and should NEVER be used in production.**

### 🏗️ Production Architecture Requirements

For production deployment, you **MUST** implement a secure backend proxy with the following architecture:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend Proxy  │    │   Skytap API    │
│   (React App)   │───▶│   (Node.js/      │───▶│   (cloud.       │
│                 │    │    Express)      │    │    skytap.com)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### 🔒 Production Security Requirements

Your backend proxy **MUST** implement:

1. **🔐 Server-Side Authentication**
   - Store API credentials securely on the server
   - Never expose credentials to the client
   - Use environment variables or secure key management

2. **✅ Request Validation**
   - Validate and sanitize all incoming requests
   - Implement input validation and type checking
   - Prevent injection attacks

3. **⏱️ Rate Limiting**
   - Implement proper rate limiting to prevent API abuse
   - Use sliding window or token bucket algorithms
   - Set appropriate limits per user/IP

4. **🛡️ Error Handling**
   - Provide appropriate error responses without exposing sensitive information
   - Log errors securely for monitoring
   - Implement proper HTTP status codes

5. **📊 Logging & Monitoring**
   - Log all API interactions for monitoring and debugging
   - Implement audit trails for compliance
   - Monitor for unusual patterns or abuse

6. **🔒 HTTPS & Security Headers**
   - Ensure all communications use HTTPS
   - Implement proper security headers (CSP, HSTS, etc.)
   - Use secure cookie settings

7. **🌍 Environment Separation**
   - Use different API credentials for different environments
   - Implement proper environment configuration management
   - Separate development, staging, and production configurations

### 🛠️ Recommended Backend Proxy Features

Your backend proxy should include:

- **Authentication Management**: Handle Skytap API authentication
- **Request/Response Transformation**: Modify requests and responses as needed
- **Caching**: Implement intelligent caching to reduce API calls
- **Retry Logic**: Handle temporary failures gracefully
- **Circuit Breaker**: Prevent cascade failures
- **Metrics & Monitoring**: Track API usage and performance
- **Audit Logging**: Log all operations for compliance

## 📚 API Documentation

The application integrates with the **Skytap Cloud API v2**. For comprehensive API documentation, see:

- **`SKYTAP_API_SPECIFICATION.md`** - Complete API reference including:
  - Authentication methods and requirements
  - Available endpoints and operations
  - Request/response formats and schemas
  - Error handling and status codes
  - Rate limiting considerations
  - Best practices and examples

### Key API Endpoints Used

- **Projects**: `/v2/projects` - Project management and listing
- **Configurations**: `/v2/configurations` - Environment management
- **Templates**: `/v2/templates` - Template operations
- **IP Addresses**: `/v2/ips` - Public IP management
- **Users**: `/v2/users` - User account management
- **Reports**: `/reports` - Billing and usage reports
- **Schedules**: `/v2/schedules` - Automated scheduling

## 🚀 Deployment

### Development Environment

For local development, simply run:
```bash
npm run dev
```

The application will be available at `http://localhost:8080` with hot reloading enabled.

### Production Deployment

#### 1. Build the Application

```bash
# Create production build
npm run build

# The built files will be in the `dist/` directory
```

#### 2. Deploy Frontend

Deploy the contents of the `dist/` directory to your hosting platform:

- **Static Hosting**: Vercel, Netlify, AWS S3, GitHub Pages
- **CDN**: CloudFlare, AWS CloudFront
- **Web Server**: Nginx, Apache

#### 3. Implement Backend Proxy

**CRITICAL**: You must implement a secure backend proxy as described in the [Production Security Requirements](#-production-security-requirements) section.

#### 4. Environment Configuration

Configure the following on your production server:

```bash
# Create production environment file
touch .env.production
```

Then edit `.env.production` with your production values:

```env
# Production environment variables
NODE_ENV=production
SKYTAP_USER=your_production_username
SKYTAP_TOKEN=your_production_api_token
API_BASE_URL=https://your-backend-proxy.com/api
```

**Security Note**: Use different API credentials for production than development, and ensure these are stored securely on your production server.

#### 5. Security Checklist

- [ ] HTTPS enabled for all communications
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] API credentials stored securely on server
- [ ] Rate limiting implemented
- [ ] Error handling configured
- [ ] Logging and monitoring set up
- [ ] Environment variables properly configured

## 🔒 Security Considerations

### Development Security
- **Never expose** Skytap API credentials in client-side code
- **Use environment variables** for all sensitive configuration
- **Keep credentials secure** and never commit them to version control
- **Use HTTPS** for all API communications

### Production Security
- **Implement proper CORS policies** to restrict cross-origin requests
- **Use HTTPS** for all communications in production
- **Regularly rotate API tokens** and credentials
- **Monitor API usage** for unusual patterns or abuse
- **Implement proper authentication** and authorization
- **Use secure headers** (CSP, HSTS, X-Frame-Options, etc.)
- **Validate all inputs** to prevent injection attacks
- **Log security events** for monitoring and auditing

### Best Practices
- **Principle of least privilege**: Only grant necessary API permissions
- **Regular security audits**: Review and update security measures
- **Dependency updates**: Keep all dependencies up to date
- **Error handling**: Don't expose sensitive information in error messages

## 🧪 Testing

### Running Tests
```bash
# Run linting
npm run lint

# Build and verify
npm run build
npm run preview
```

### Manual Testing Checklist
- [ ] All pages load correctly
- [ ] API integration works with valid credentials
- [ ] Error handling works with invalid credentials
- [ ] Responsive design works on different screen sizes
- [ ] All interactive elements function properly

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and ensure they follow the coding standards
4. **Test thoroughly** - ensure all functionality works as expected
5. **Run linting**: `npm run lint` to check for code quality issues
6. **Commit your changes**: `git commit -m 'Add amazing feature'`
7. **Push to your branch**: `git push origin feature/amazing-feature`
8. **Submit a pull request** with a clear description of your changes

### Development Guidelines
- Follow the existing code style and patterns
- Add appropriate comments and documentation
- Ensure TypeScript types are properly defined
- Test your changes thoroughly
- Update documentation if needed

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- **Documentation**: Check this README and the API specification
- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions and community support

### Common Issues
- **API Authentication**: Ensure your credentials are correct and have proper permissions
- **CORS Issues**: These are handled by the development proxy
- **Build Errors**: Check Node.js version compatibility (v18+)
- **Environment Variables**: Ensure `.env` file is properly configured

## 🗺️ Roadmap

### Planned Features
- [ ] Enhanced error handling and user feedback
- [ ] Advanced filtering and search capabilities
- [ ] Bulk operations for better efficiency
- [ ] Real-time notifications and updates
- [ ] Advanced reporting and analytics
- [ ] Mobile-responsive improvements
- [ ] Dark mode support
- [ ] Internationalization (i18n)

### Known Limitations
- Development proxy should not be used in production
- Some API operations may have rate limits
- Large datasets may require pagination improvements

---

**Built with ❤️ for the Skytap community**
