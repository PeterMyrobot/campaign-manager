import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { X } from 'lucide-react'

interface FilterBadgeProps {
  label: string
  value: string
  onRemove: () => void
  maxLength?: number
}

export function FilterBadge({ label, value, onRemove, maxLength = 30 }: FilterBadgeProps) {
  const isTruncated = value.length > maxLength
  const displayValue = isTruncated ? `${value.slice(0, maxLength)}...` : value

  const badgeContent = (
    <Badge variant="secondary" className="gap-1 pr-1 max-w-xs">
      <span className="text-xs truncate">
        <span className="font-medium">{label}:</span> {displayValue}
      </span>
      <button
        onClick={onRemove}
        className="ml-1 rounded-sm opacity-70 hover:opacity-100 flex-shrink-0"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )

  if (isTruncated) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeContent}
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs break-words">
              <span className="font-medium">{label}:</span> {value}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badgeContent
}
