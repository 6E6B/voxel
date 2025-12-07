import { Minus } from 'lucide-react'

interface CustomCheckboxProps {
  checked: boolean
  indeterminate?: boolean
  disabled?: boolean
  onChange: () => void
}

const CustomCheckbox = ({
  checked,
  indeterminate,
  disabled = false,
  onChange
}: CustomCheckboxProps) => {
  const isCheckVisible = checked && !indeterminate

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        if (!disabled) {
          onChange()
        }
      }}
      className={`
        relative w-5 h-5 rounded border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 overflow-hidden
        ${
          checked || indeterminate
            ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-[var(--accent-color-foreground)]'
            : 'bg-transparent border-neutral-600 hover:border-neutral-400'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
      aria-disabled={disabled}
    >
      <svg
        viewBox="0 0 16 16"
        className="absolute inset-0 pointer-events-none"
        stroke="currentColor"
        fill="none"
      >
        <path
          d="M4 8.5L7 11.5L12 4.5"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 14,
            strokeDashoffset: isCheckVisible ? 0 : 14,
            transition: 'stroke-dashoffset 400ms ease, opacity 400ms ease',
            opacity: isCheckVisible ? 1 : 0
          }}
        />
      </svg>
      {indeterminate && <Minus size={14} strokeWidth={3} />}
    </div>
  )
}

export default CustomCheckbox
