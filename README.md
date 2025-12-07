# Campaign Manager

A modern web application for managing advertising campaigns, line items, and invoices for digital media publishers. Built as a solution to demonstrate a comprehensive order management system (OMS) similar to Placements.io, enabling finance teams to manage billing adjustments and generate invoices efficiently.

**🚀 Live Demo:** [https://campaign-invoice-manager.web.app](https://campaign-invoice-manager.web.app)

## Overview

This application manages the complete lifecycle of advertising campaigns, from creation to invoicing. It enables users to:

- Track campaigns with associated line items
- Manage invoices with dynamic adjustments
- View comprehensive analytics and metrics
- Maintain audit trails of all billing changes
- Export data for reporting and analysis

The primary use case targets finance personnel conducting end-of-month billing, who need to make billing adjustments and generate accurate invoices based on campaign performance.

## Features Implemented

### Bucket 1: Core Features

#### Backend Data Model & Seeding
- Complete data model with Campaigns, Line Items, Invoices, and Change Logs
- Firebase/Firestore backend with real-time synchronization
- Automated relationship management between entities

#### List & Detail Views
- **Campaigns**: Comprehensive list with filters, search, and detail pages showing related line items and invoices
- **Line Items**: Filterable list with campaign associations and invoice assignments
- **Invoices**: Advanced filtering by status, dates, and campaigns with detailed breakdowns
- **Dashboard**: Analytics overview with key metrics and visualizations
- Responsive tables with pagination, sorting, and bulk actions

#### Invoice Adjustments Editing
- Interactive adjustment modal with real-time calculation
- Automatic total recalculation (Actual Amount + Adjustments)
- Validation and error handling
- Optimistic UI updates with Firebase sync

### Bucket 2: Advanced Features (2 Implemented)

#### 1. Change History for Editable Objects 
**Why this feature?** Audit trails are critical for financial applications. This feature demonstrates:
- Data integrity and compliance awareness


**Implementation:**
- Comprehensive change log tracking for all adjustment modifications
- Displays previous/new values, differences, and timestamps
- Filterable change log page with search by entity, campaign, or invoice
- Integrated into detail views showing relevant history

#### 2. CSV Export Functionality 
**Why this feature?** Data portability is essential for finance workflows, enabling integration with accounting systems and custom reporting.

**Implementation:**
- Utility function for exporting any dataset to CSV
- Column customization support
- Proper handling of dates, arrays, and special characters
- Export buttons integrated into all list views (Campaigns, Invoices, Line Items, Change Logs)

**TODO**
not well adjust what data to export

### Additional Features

- **Analytics Dashboard**: Real-time metrics with charts (revenue trends, campaign status distribution, invoice aging)
- **Advanced Filtering**: Multi-criteria filtering with date ranges and status selection
  - **Searchable Filters**: Campaign and invoice filters with built-in search capability for handling 200-300+ items efficiently
  - Applied across all pages: Invoices, Line Items, and Change Logs
  - Real-time search filtering with keyboard navigation support
- **Modern UI**: Clean, professional interface with consistent design system
- **Performance**: Cursor-based pagination, optimistic updates, and React Query caching

## Tech Stack

### Core Framework
- **React 19.2** - Latest React with concurrent features and improved performance
- **TypeScript 5.9** - Type-safe development with strict mode enabled
- **Vite 7.2** - Lightning-fast build tool with HMR

### Styling & UI
- **Tailwind CSS 4.1** - Utility-first CSS framework for rapid UI development
- **Lucide React** - Modern icon library with 1000+ icons
- **class-variance-authority** - Type-safe variant management for components

### State Management & Data
- **TanStack Query 5.90** - Powerful async state management with automatic caching, background refetching, and optimistic updates
- **React Router 7.9** - Client-side routing with data loading
- **Firebase 12.6** - Backend-as-a-Service providing:
  - Firestore for NoSQL database
  - Real-time data synchronization
  - Cloud hosting capabilities

### Data Visualization
- **Recharts** - Revenue trends, campaign status distribution, invoice aging analysis

### Development & Quality
- **Vitest 4.0** - Fast unit testing framework with native ESM support
- **Testing Library** - User-centric testing utilities
- **ESLint 9.39** - Code quality and consistency enforcement
- **TypeScript ESLint** - TypeScript-specific linting rules

### Utilities
- **date-fns 4.1** - Modern date manipulation and formatting
- **Sonner** - Toast notification system
- **dotenv** - Environment variable management

## Project Structure

```
campaign-manager/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # Base UI primitives (shadcn/ui style)
│   │   │   ├── searchable-select.tsx  # Searchable dropdown for large datasets
│   │   │   ├── multi-select.tsx
│   │   │   ├── date-range-filter.tsx
│   │   │   └── ...
│   │   ├── AdjustmentModal.tsx
│   │   ├── ChangeLogList.tsx
│   │   ├── DataTable.tsx
│   │   └── ...
│   ├── pages/              # Route components
│   │   ├── Dashboard.tsx
│   │   ├── Campaigns.tsx
│   │   ├── CampaignDetail.tsx
│   │   ├── Invoices.tsx
│   │   ├── InvoiceDetail.tsx
│   │   ├── LineItems.tsx
│   │   └── ChangeLogs.tsx
│   ├── services/           # Business logic & API layer
│   │   └── firebase/       # Firebase service modules
│   │       ├── campaignService.ts
│   │       ├── invoiceService.ts
│   │       ├── lineItemService.ts
│   │       └── changeLogService.ts
│   ├── hooks/              # Custom React hooks
│   │   ├── useCampaigns.ts
│   │   ├── useInvoices.ts
│   │   ├── useLineItems.ts
│   │   ├── useChangeLog.ts
│   │   ├── useDashboardMetrics.ts
│   │   └── useCursorPagination.ts
│   ├── types/              # TypeScript interfaces
│   │   ├── campaign.ts
│   │   ├── invoice.ts
│   │   ├── lineItem.ts
│   │   └── changeLog.ts
│   ├── lib/                # Utility functions
│   │   ├── exportToCsv.ts
│   │   ├── dateRanges.ts
│   │   └── utils.ts
│   ├── contexts/           # React Context providers
│   └── test/               # Test configuration
├── scripts/                # Build & seed scripts
│   ├── seed.ts            # Database seeding script
│   └── placements_teaser_data.json
├── spec/                   # Requirements documentation
│   └── coding_challenge.md
└── public/                 # Static assets
```

**Architecture Patterns:**
- **Service Layer Pattern**: Separation of Firebase logic from UI components
- **Custom Hooks**: Encapsulation of data fetching and business logic
- **Component Composition**: Reusable UI primitives composed into features
- **Type Safety**: Comprehensive TypeScript interfaces for all entities

## Getting Started

### Prerequisites
- **Node.js** (v18+ LTS recommended)
- **Yarn** package manager
- **Firebase Project** (for database and hosting)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd campaign-manager
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Configure Firebase**

   Create a `.env` file in the root directory with your Firebase configuration:

   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Seed the database**
   ```bash
   yarn seed
   ```
   This will:
   - Clear existing data
   - Import sample data from `scripts/placements_teaser_data.json`
   - Create campaigns, line items, and invoices with realistic relationships
   - Generate sample change logs for demonstration

5. **Start development server**
   ```bash
   yarn dev
   ```

   Navigate to `http://localhost:5173`

## Available Scripts

| Command | Description |
|---------|-------------|
| `yarn dev` | Start Vite development server with HMR |
| `yarn build` | Build for production (TypeScript compilation + Vite bundle) |
| `yarn preview` | Preview production build locally |
| `yarn lint` | Run ESLint for code quality checks |
| `yarn test` | Run unit tests with Vitest |
| `yarn test:ui` | Open Vitest UI for interactive testing |
| `yarn test:coverage` | Generate test coverage report |
| `yarn seed` | Seed Firestore database with sample data |
| `yarn deploy` | Build and deploy to Firebase Hosting |



## Design Decisions & Trade-offs

### 1. Firebase vs. Traditional Backend

**Decision**: Use Firebase/Firestore

**Rationale:**
- Focus development effort on UI/UX rather than backend infrastructure
- Real-time sync improves multi-user scenarios
- Built-in hosting simplifies deployment
- Generous free tier for demos

**Trade-offs:**
- Vendor lock-in to Google ecosystem
- Limited query capabilities (no joins, complex aggregations)
- Higher cost at scale vs. self-hosted
- Less control over backend logic

**Mitigation:**
- Service layer abstraction allows backend swapping
- Client-side aggregations for complex queries
- Cursor pagination reduces read operations

### 2. Client-Side vs. Server-Side Filtering

**Decision**: Server-side filtering for most criteria, client-side for text search only

**Rationale:**
- Firestore `where` clauses handle status, date ranges, and IDs efficiently
- Server-side filtering reduces data transfer and improves performance
- Client-side text search only needed because Firestore lacks full-text search
- Cursor-based pagination works seamlessly with server filters

**Implementation:**
- **Server-side**: Status filters, date ranges (createdAt, startDate, endDate, issueDate, etc.), campaign/invoice IDs
- **Client-side**: Keyword/name search (applied after fetching paginated results)

**Trade-offs:**
- Firestore allows only one range filter per query (index limitation)
- Text search requires fetching all records on current page, then filtering
- For true full-text search, would need Algolia/Elasticsearch integration

**For Production:**
- Add Algolia or Elasticsearch for advanced text search
- Create composite Firestore indexes for multi-field range queries
- Consider Cloud Functions for complex aggregations

### 3. Optimistic Updates vs. Wait-for-Server

**Decision**: Optimistic updates with rollback

**Rationale:**
- Perceived performance is critical for user satisfaction
- Firebase SDK provides automatic retry and offline support
- Error states are rare in practice

**Implementation:**
- React Query `onMutate` updates cache immediately
- `onError` rolls back to previous state
- Toast notifications communicate success/failure


## Testing


### Running Tests

```bash
# Run all tests
yarn test

# Interactive UI
yarn test:ui

# Coverage report
yarn test:coverage
```

### Testing Strategy

- **Service Layer**: Mock Firestore SDK, test business logic
- **Hooks**: Test with React Testing Library, verify state updates
- **Utilities**: Pure function testing with edge cases
- **Components**: User-centric testing (click, type, assert)

**Future Improvements:**
- E2E tests with Playwright/Cypress
- Visual regression testing
- Integration tests against Firebase emulator

## Future Enhancements


### Code Improvements & Refactoring

The three main list pages (Campaigns, Line Items, and Invoices) currently share similar functionality for filtering, bulk actions, and table display. While this approach works well, there's an opportunity to reduce code duplication and improve maintainability.

**Current State:**
- Each page implements its own filtering, sorting, and bulk action logic
- Similar patterns repeated across ~360 lines of code

**Future Improvement:**
- Consolidate shared logic into reusable components and hooks
- Reduce codebase size by approximately 18%
- Make future feature additions easier to implement

This refactoring was intentionally deferred to focus on delivering core features first.


### High Priority (Bucket 2 Features)

1. **Archive Functionality** (~4 hours)
   - Soft delete for campaigns, invoices, line items
   - Archive/restore UI with visual indicators
   - Filter to show/hide archived items

2. **Currency Conversion Integration** (~6 hours)
   - Integrate external currency API (e.g., Exchange Rate API)
   - Multi-currency display toggle
   - Rate caching and historical tracking

3. **Commenting System** (~8 hours)
   - User comments on campaigns and invoices
   - @mention tagging with notifications
   - Real-time comment updates

### Medium Priority

4. **User Authentication**
   - Firebase Auth integration
   - Role-based access control (admin, finance, viewer)
   - User profile management

5. **Email Notifications**
   - Invoice sent/overdue reminders
   - Campaign milestone alerts
   - Change log summaries

6. **Advanced Reporting**
   - Custom report builder
   - Scheduled report generation
   - PDF invoice generation

### Performance & Scalability

7. **Backend Aggregations**
   - Cloud Functions for dashboard metrics
   - Pre-computed totals to reduce client queries
   - Materialized views for reporting

8. **Infinite Scroll / Virtual Lists**
   - Handle 10,000+ records efficiently
   - Window-based rendering with react-virtual

9. **Search Service**
   - Algolia or Elasticsearch integration
   - Full-text search across entities
   - Fuzzy matching and typo tolerance

### Developer Experience

10. **Storybook Integration**
    - Component library documentation
    - Visual testing and QA

11. **CI/CD Pipeline**
    - Automated testing on PR
    - Preview deployments
    - Production deployment automation

## License

Private project for demonstration purposes.
