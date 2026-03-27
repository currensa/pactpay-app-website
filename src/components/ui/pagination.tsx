import { IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  totalItems?: number
  pageSize?: number
  itemLabel?: string
  summaryText?: string
}

function buildPageNumbers(currentPage: number, totalPages: number) {
  const pages: Array<number | 'ellipsis'> = []

  if (totalPages <= 5) {
    for (let page = 1; page <= totalPages; page += 1) {
      pages.push(page)
    }
    return pages
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 'ellipsis', totalPages]
  }

  if (currentPage >= totalPages - 2) {
    return [1, 'ellipsis', totalPages - 2, totalPages - 1, totalPages]
  }

  return [1, 'ellipsis', currentPage, 'ellipsis', totalPages]
}

function buildSummaryText(
  summaryText: string | undefined,
  currentPage: number,
  totalItems: number | undefined,
  pageSize: number | undefined,
  itemLabel: string
) {
  if (summaryText) return summaryText
  if (totalItems == null || pageSize == null) return null
  if (totalItems <= 0) return `Showing 0 of 0 ${itemLabel}`

  const start = (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  return `Showing ${start}-${end} of ${totalItems} ${itemLabel}`
}

function PaginationButton({
  children,
  onClick,
  active = false,
  disabled = false,
  ariaLabel,
}: {
  children: ReactNode
  onClick?: () => void
  active?: boolean
  disabled?: boolean
  ariaLabel?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(
        'relative flex size-[36px] items-center justify-center overflow-hidden rounded-[6px] text-[14px] leading-[22px] transition-colors',
        active ? 'rounded-[12px] text-[#606067]' : 'text-[#606067] hover:bg-[rgba(28,28,38,0.04)]',
        disabled && 'cursor-not-allowed text-[#bbbbbe] hover:bg-transparent'
      )}
    >
      {active && <span className="absolute inset-0 rounded-[12px] bg-[#1c1c26] opacity-10" aria-hidden="true" />}
      <span className="relative z-[1] flex items-center justify-center">{children}</span>
    </button>
  )
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  totalItems,
  pageSize,
  itemLabel = 'items',
  summaryText,
}: PaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const normalizedTotalPages = Math.max(1, totalPages)
  const pageNumbers = buildPageNumbers(currentPage, normalizedTotalPages)
  const resolvedSummaryText = buildSummaryText(summaryText, currentPage, totalItems, pageSize, itemLabel)

  if (normalizedTotalPages <= 1 && !resolvedSummaryText) {
    return null
  }

  return (
    <div className={cn('flex flex-col gap-[16px] sm:flex-row sm:items-center sm:justify-between', className)}>
      {resolvedSummaryText ? (
        <p className="text-[14px] leading-[22px] text-[#606067]">{resolvedSummaryText}</p>
      ) : (
        <div />
      )}

      {normalizedTotalPages > 1 && (
        <div className="flex items-center gap-[16px] self-end sm:self-auto">
          <div className="flex items-center gap-[4px]">
            <PaginationButton onClick={handlePrevious} disabled={currentPage === 1} ariaLabel="Previous page">
              <IconChevronLeft className="size-[18px]" stroke={1.75} />
            </PaginationButton>

            {pageNumbers.map((page, index) => {
              if (page === 'ellipsis') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="flex size-[36px] items-center justify-center text-[14px] leading-[22px] text-[#606067]"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                )
              }

              return (
                <PaginationButton
                  key={page}
                  active={currentPage === page}
                  onClick={() => onPageChange(page)}
                  ariaLabel={`Page ${page}`}
                >
                  {page}
                </PaginationButton>
              )
            })}

            <PaginationButton onClick={handleNext} disabled={currentPage === normalizedTotalPages} ariaLabel="Next page">
              <IconChevronRight className="size-[18px]" stroke={1.75} />
            </PaginationButton>
          </div>
        </div>
      )}
    </div>
  )
}
