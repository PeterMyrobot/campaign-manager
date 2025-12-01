import * as React from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { DateRange, DateRangePreset } from "@/types/campaign"
import { DATE_RANGE_OPTIONS, getDateRangeFromPreset } from "@/lib/dateRanges"
import { format } from "date-fns"

interface DateRangeFilterProps {
  value?: DateRange
  onChange: (range: DateRange | undefined) => void
  placeholder?: string
  className?: string
}

export function DateRangeFilter({
  value,
  onChange,
  placeholder = "Select date range",
  className,
}: DateRangeFilterProps) {
  const [preset, setPreset] = React.useState<DateRangePreset>('all')
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset)
    if (newPreset === 'custom') {
      setIsCalendarOpen(true)
    } else {
      const range = getDateRangeFromPreset(newPreset)
      onChange(range)
      setIsCalendarOpen(false)
    }
  }

  const handleDateSelect = (range: DateRange | undefined) => {
    onChange(range)
  }

  const displayText = React.useMemo(() => {
    if (!value || (!value.from && !value.to)) {
      return placeholder
    }
    if (value.from && value.to) {
      return `${format(value.from, 'MMM d, yyyy')} - ${format(value.to, 'MMM d, yyyy')}`
    }
    if (value.from) {
      return `From ${format(value.from, 'MMM d, yyyy')}`
    }
    if (value.to) {
      return `Until ${format(value.to, 'MMM d, yyyy')}`
    }
    return placeholder
  }, [value, placeholder])

  return (
    <div className={cn("flex gap-2", className)}>
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {DATE_RANGE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === 'custom' && (
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[280px] justify-start text-left font-normal",
                !value && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {displayText}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={{ from: value?.from, to: value?.to }}
              onSelect={handleDateSelect}
              numberOfMonths={1}
            />
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
