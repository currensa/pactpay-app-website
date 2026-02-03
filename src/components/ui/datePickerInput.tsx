import { Input } from "@/components/ui/input"
import * as Popover from "@radix-ui/react-popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"

import "react-day-picker/dist/style.css"

type DatePickerInputProps = {
  value?: Date
  onChange?: (date?: Date) => void
  placeholder?: string
  disabled?: boolean
  /** 最早可选日期，该日期之前的日期将被禁用 */
  fromDate?: Date
  id?: string
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  disabled,
  fromDate,
  id,
}: DatePickerInputProps) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          type="button"
          className="relative w-full text-left"
        >
          <Input
            id={id}
            type="text"
            readOnly
            value={value ? format(value, "yyyy-MM-dd") : ""}
            placeholder={placeholder}
            disabled={disabled}
          />
          <CalendarIcon className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
        </button>
      </Popover.Trigger>

      <Popover.Content
        align="start"
        sideOffset={4}
        className="rounded-md border bg-popover p-2 shadow-md"
      >
        <DayPicker
          mode="single"
          selected={value}
          onSelect={onChange}
          disabled={fromDate ? { before: fromDate } : undefined}
        />
      </Popover.Content>
    </Popover.Root>
  )
}
