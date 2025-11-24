# Campaign Manager

A modern web application for managing campaigns.

## Tech Stack

### Core Framework
- **React 19.2** - UI library for building component-based interfaces
- **TypeScript 5.9** - Type-safe JavaScript for enhanced developer experience
- **Vite 7.2** - Fast build tool and development server

### Styling
- **Tailwind CSS 4.1** - Utility-first CSS framework
- **@tailwindcss/vite** - Tailwind CSS integration for Vite
- **tw-animate-css** - Animation utilities for Tailwind
- **class-variance-authority** - For creating variant-based component APIs
- **clsx** & **tailwind-merge** - Utility for conditional class names

### UI Components
- **Radix UI** - Unstyled, accessible component primitives
- **Lucide React** - Icon library with React components

### State Management & Data Fetching
- **TanStack Query (React Query) 5.90** - Powerful data synchronization and caching

### Backend & Database
- **Firebase 12.6** - Backend as a Service (BaaS) for authentication, database, and hosting

### Development Tools
- **ESLint 9.39** - JavaScript/TypeScript linter
- **eslint-plugin-react-hooks** - Linting rules for React Hooks
- **eslint-plugin-react-refresh** - Support for React Fast Refresh

## Project Structure

- Path aliases configured with `@/*` pointing to `./src/*`
- TypeScript with strict type checking
- ESM modules

## Getting Started

### Prerequisites
- Node.js (LTS version recommended)
- Yarn package manager

### Installation

```bash
yarn install
```

### Development

```bash
yarn dev
```

### Build

```bash
yarn build
```

### Lint

```bash
yarn lint
```

### Preview Production Build

```bash
yarn preview
```

## Environment Variables

Create a `.env` file in the root directory for environment-specific configuration (this file is git-ignored for security).
