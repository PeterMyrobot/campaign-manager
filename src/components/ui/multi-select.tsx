import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  label: string
  value: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select options",
  className,
}: MultiSelectProps) {
  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((v) => v !== value)
      : [...selected, value]
    onChange(newSelected)
  }

  const displayText = selected.length > 0
    ? `${selected.length} selected`
    : placeholder

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-full justify-between", className)}
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-2" align="start">
        <div className="max-h-60 overflow-y-auto">
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No options available
            </div>
          ) : (
            options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer"
              >
                <Checkbox
                  checked={selected.includes(option.value)}
                  onCheckedChange={() => toggleOption(option.value)}
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
