import { SidebarTrigger } from '@/components/ui/sidebar'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList } from '@/components/ui/breadcrumb'
import { Separator } from '@/components/ui/separator'
import { useLocation } from 'react-router-dom'
import { useMemo } from 'react'
import { getRouteMeta } from '@/router'

export default function AppHeader() {
  const location = useLocation()

  const pageTitle = useMemo(() => {
    const meta = getRouteMeta(location.pathname)
    return meta?.title
  }, [location.pathname])

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b">
      <div className="flex items-center gap-2 px-3">
        <SidebarTrigger />
        <Separator orientation="vertical" className="bg-border mr-2 h-4" />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink>{pageTitle}</BreadcrumbLink>
            </BreadcrumbItem>
            {/* <BreadcrumbSeparator className="hidden md:block" /> */}
            {/* <BreadcrumbItem>
              <BreadcrumbPage>Data Fetching</BreadcrumbPage>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>Data Fetching</BreadcrumbPage>
            </BreadcrumbItem> */}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
