import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { CampaignsProvider } from './contexts/CampaignsContext'

  const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <CampaignsProvider>
        <App />
      </CampaignsProvider>
    </QueryClientProvider>
  </StrictMode>,
)
