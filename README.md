# Mindful-AI

> AI-powered mental health practice management platform for solo therapists

## 🎯 Product Overview

Mindful-AI is a comprehensive practice management solution designed specifically for mental health professionals. The platform streamlines administrative workflows, automates documentation, and provides AI-assisted tools to help therapists focus on patient care.

### Current Status
- **Stage**: MVP/Prototype (85-90% complete)
- **Development Method**: Built with Lovable (AI-powered rapid prototyping platform)
- **Target Users**: Solo therapy practitioners
- **Key Focus**: HIPAA-compliant practice management with AI note-taking and billing automation

## 🏗️ Technical Architecture

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Components**: Tailwind CSS with shadcn/ui component library
- **State Management**: React Context API + hooks
- **Routing**: React Router v6

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage for document management
- **Functions**: Supabase Edge Functions (Deno runtime)
- **Hosting**: Lovable platform (currently)

### Key Integrations
- AI APIs for automated clinical note generation
- Billing system integrations (planned)
- Calendar/scheduling systems

## 📂 Project Structure

```
src/
├── components/     # React components
├── contexts/       # Context providers for state management
├── data/          # Static data and constants
├── hooks/         # Custom React hooks
├── integrations/  # Third-party service integrations
│   └── supabase/  # Supabase client configuration
├── lib/           # Utility functions and helpers
├── pages/         # Route-level page components
└── utils/         # Additional utilities
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (for backend services)

### Installation

```bash
# Clone the repository
git clone https://github.com/mharnisch05/mindful-ai.git
cd mindful-ai

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# Run development server
npm run dev
```

### Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 🔐 Security & Compliance

### HIPAA Considerations
- **Data Encryption**: All PHI encrypted at rest and in transit
- **Access Controls**: Role-based access control (RBAC) implementation
- **Audit Logging**: Activity tracking for compliance requirements
- **BAA**: Business Associate Agreement required with Supabase

### Current Security Measures
- Row-level security (RLS) policies in Supabase
- Secure authentication flow
- Environment-based secrets management

### TODO: Security Hardening
- [ ] Complete HIPAA compliance audit
- [ ] Implement additional encryption layers for sensitive fields
- [ ] Set up comprehensive audit logging
- [ ] Penetration testing
- [ ] Security headers and CSP configuration

## 🎨 Key Features

### Implemented
- ✅ User authentication and authorization
- ✅ Patient management dashboard
- ✅ AI-assisted clinical note generation
- ✅ Appointment scheduling interface
- ✅ Document storage and retrieval
- ✅ Basic billing/invoicing views

### In Progress
- 🔄 Advanced reporting and analytics
- 🔄 Integration with external EHR systems
- 🔄 Mobile-responsive optimizations

### Planned
- 📋 Automated insurance claim submission
- 📋 Telehealth integration
- 📋 Multi-practitioner support
- 📋 Advanced AI features (treatment recommendations, risk assessment)

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
```

### Code Quality
- TypeScript for type safety
- ESLint + Prettier for code formatting
- Component-based architecture
- Custom hooks for reusable logic

## 📊 Database Schema

Core tables:
- `users` - User accounts and profiles
- `patients` - Patient records (PHI)
- `appointments` - Scheduling data
- `notes` - Clinical documentation
- `invoices` - Billing records
- `documents` - File attachments

*(Full schema documentation available in `/docs/schema.md` once populated)*

## 🔧 Technical Debt & Known Issues

### Current Limitations
1. **Lovable Platform Dependency**: Code currently hosted on Lovable; migration to standard hosting needed
2. **Limited Test Coverage**: Minimal unit/integration tests implemented
3. **Performance Optimization**: Bundle size and load time optimization needed
4. **Error Handling**: Needs more robust error boundaries and user feedback
5. **Database Migrations**: No formal migration system in place

### Refactoring Opportunities
- Consolidate similar components (reduce duplication)
- Implement proper state management solution (consider Zustand or Redux Toolkit)
- Add comprehensive API error handling middleware
- Establish design system and component library standards

## 📈 Scaling Considerations

### Current Architecture Bottlenecks
- Single Supabase instance (need regional replication strategy)
- No CDN for static assets
- Limited caching strategy
- No background job processing system

### Recommended Next Steps for Production
1. Migrate to containerized deployment (Docker/Kubernetes)
2. Implement CI/CD pipeline (GitHub Actions)
3. Set up monitoring and observability (Sentry, DataDog, etc.)
4. Establish backup and disaster recovery procedures
5. Load testing and performance benchmarking
6. Multi-tenant architecture design (for group practices)

## 🤝 CTO Review Checklist

Key areas for technical evaluation:

- [ ] **Code Quality**: Review component structure, TypeScript usage, and code organization
- [ ] **Security**: Assess security measures, especially HIPAA compliance readiness
- [ ] **Scalability**: Evaluate architecture for multi-user and growth scenarios
- [ ] **Technical Debt**: Identify areas needing refactoring or architectural changes
- [ ] **DevOps**: Recommend deployment, CI/CD, and infrastructure improvements
- [ ] **Testing**: Assess current test coverage and recommend testing strategy
- [ ] **Performance**: Review bundle size, load times, and optimization opportunities
- [ ] **Database Design**: Evaluate schema design and query optimization needs
- [ ] **API Design**: Review API patterns and suggest improvements
- [ ] **Documentation**: Assess code documentation and suggest improvements

## 📞 Questions for CTO Candidate

1. What would be your first 30-60-90 day priorities for this codebase?
2. What are the biggest technical risks you see, and how would you mitigate them?
3. What infrastructure changes would you recommend for production deployment?
4. How would you approach HIPAA compliance validation and certification?
5. What team structure and hiring priorities would you recommend?

## 📄 License

Proprietary - All rights reserved

---

**Note**: This README is specifically prepared for CTO candidate technical review. For questions or access requests, please contact the repository owner.
