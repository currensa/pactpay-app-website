import { create } from 'zustand'

export interface HeaderStep {
  label: string
  active: boolean
}

export interface BreadcrumbItem {
  label: string
  /** If undefined, renders as plain text (current page) */
  href?: string
}

interface HeaderState {
  steps: HeaderStep[] | null
  breadcrumb: BreadcrumbItem[] | null
  backUrl: string | null
  setHeader: (options: { steps?: HeaderStep[]; breadcrumb?: BreadcrumbItem[]; backUrl?: string }) => void
  clearHeader: () => void
}

const useHeaderStore = create<HeaderState>(set => ({
  steps: null,
  breadcrumb: null,
  backUrl: null,
  setHeader: ({ steps, breadcrumb, backUrl }) =>
    set({
      steps: steps ?? null,
      breadcrumb: breadcrumb ?? null,
      backUrl: backUrl ?? null,
    }),
  clearHeader: () => set({ steps: null, breadcrumb: null, backUrl: null }),
}))

export default useHeaderStore
