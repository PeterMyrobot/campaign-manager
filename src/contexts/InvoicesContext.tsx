/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'
import { useAllInvoices } from '@/hooks/useInvoices'
import type { Invoice } from '@/types/invoice'

interface InvoicesContextType {
  invoices: Invoice[]
  isLoading: boolean
  getInvoiceNumber: (invoiceId: string) => string | undefined
  getInvoice: (invoiceId: string) => Invoice | undefined
}

const InvoicesContext = createContext<InvoicesContextType | undefined>(undefined)

export function InvoicesProvider({ children }: { children: ReactNode }) {
  const { data: invoices = [], isLoading } = useAllInvoices()

  const getInvoiceNumber = (invoiceId: string): string | undefined => {
    return invoices.find(inv => inv.id === invoiceId)?.invoiceNumber
  }

  const getInvoice = (invoiceId: string): Invoice | undefined => {
    return invoices.find(inv => inv.id === invoiceId)
  }

  return (
    <InvoicesContext.Provider value={{ invoices, isLoading, getInvoiceNumber, getInvoice }}>
      {children}
    </InvoicesContext.Provider>
  )
}

export function useInvoicesContext() {
  const context = useContext(InvoicesContext)
  if (context === undefined) {
    throw new Error('useInvoicesContext must be used within an InvoicesProvider')
  }
  return context
}
