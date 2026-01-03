import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { IconCheck, IconChevronDown } from '@tabler/icons-react'
import * as React from 'react'

import { cn } from '@/lib/utils'
import { Button } from './button'

interface SelectContextValue {
  value: string
  onValueChange: (value: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
}

const SelectContext = React.createContext<SelectContextValue | undefined>(undefined)

interface SelectProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
}

function Select({ value, defaultValue, onValueChange, children }: SelectProps) {
  const [open, setOpen] = React.useState(false)
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')

  const currentValue = value !== undefined ? value : internalValue

  const handleValueChange = (newValue: string) => {
    if (value === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
    setOpen(false)
  }

  return (
    <SelectContext.Provider
      value={{
        value: currentValue,
        onValueChange: handleValueChange,
        open,
        onOpenChange: setOpen
      }}
    >
      <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
        {children}
      </DropdownMenuPrimitive.Root>
    </SelectContext.Provider>
  )
}

interface SelectTriggerProps extends React.ComponentPropsWithoutRef<typeof Button> {
  placeholder?: string
}

const SelectTrigger = React.forwardRef<React.ElementRef<typeof Button>, SelectTriggerProps>(
  ({ className, children, placeholder, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error('SelectTrigger must be used within Select')

    return (
      <DropdownMenuPrimitive.Trigger asChild>
        <Button
          ref={ref}
          variant="outline"
          className={cn('w-full justify-between font-normal', !context.value && 'text-muted-foreground', className)}
          {...props}
        >
          <span>{children || placeholder || 'Select...'}</span>
          <IconChevronDown className="ml-2 size-4 opacity-50" />
        </Button>
      </DropdownMenuPrimitive.Trigger>
    )
  }
)
SelectTrigger.displayName = 'SelectTrigger'

const SelectContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        ref={ref}
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md',
          className
        )}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
})
SelectContent.displayName = 'SelectContent'

interface SelectItemProps extends React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> {
  value: string
}

const SelectItem = React.forwardRef<React.ElementRef<typeof DropdownMenuPrimitive.Item>, SelectItemProps>(
  ({ className, children, value, ...props }, ref) => {
    const context = React.useContext(SelectContext)
    if (!context) throw new Error('SelectItem must be used within Select')

    const isSelected = context.value === value

    return (
      <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
          'focus:bg-accent focus:text-accent-foreground relative flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm transition-colors outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
          className
        )}
        onSelect={() => context.onValueChange(value)}
        {...props}
      >
        {isSelected && <IconCheck className="mr-2 size-4" />}
        <span className={cn(!isSelected && 'ml-6')}>{children}</span>
      </DropdownMenuPrimitive.Item>
    )
  }
)
SelectItem.displayName = 'SelectItem'

export { Select, SelectContent, SelectItem, SelectTrigger }
