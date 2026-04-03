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
  /** 是否显示时间选择（精确到分钟） */
  showTime?: boolean
}

export function DatePickerInput({
  value,
  onChange,
  placeholder = "YYYY-MM-DD",
  disabled,
  fromDate,
  id,
  showTime = false,
}: DatePickerInputProps) {
  const displayValue = value
    ? showTime
      ? format(value, "yyyy-MM-dd HH:mm")
      : format(value, "yyyy-MM-dd")
    : ""

  const handleDaySelect = (day?: Date) => {
    if (!day) { onChange?.(undefined); return }
    const next = new Date(day)
    if (value) {
      next.setHours(value.getHours(), value.getMinutes(), 0, 0)
    } else {
      next.setHours(0, 0, 0, 0)
    }
    onChange?.(next)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const [h, m] = e.target.value.split(":").map(Number)
    const next = value ? new Date(value) : new Date()
    next.setHours(h ?? 0, m ?? 0, 0, 0)
    onChange?.(next)
  }

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
            value={displayValue}
            placeholder={showTime ? "YYYY-MM-DD HH:mm" : placeholder}
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
          onSelect={handleDaySelect}
          disabled={fromDate ? { before: fromDate } : undefined}
        />
        {showTime && (
          <div className="border-t pt-2 mt-1 px-1 flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Time</span>
            <input
              type="time"
              value={value ? format(value, "HH:mm") : ""}
              onChange={handleTimeChange}
              className="flex-1 rounded-md border border-input px-2 py-1 text-sm bg-background outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        )}
      </Popover.Content>
    </Popover.Root>
  )
}
