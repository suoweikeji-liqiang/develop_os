'use client'

// Supporting input for Requirement signoff. Kept local to the Requirement route
// so the signoff flow no longer depends on exploration-owned UI.

interface ChecklistItemState {
  key: string
  label: string
  checked: boolean
}

interface Props {
  items: ChecklistItemState[]
  onChange: (key: string, checked: boolean) => void
  disabled?: boolean
}

export function ReviewChecklist({ items, onChange, disabled }: Props) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-2">
          <input
            type="checkbox"
            id={item.key}
            checked={item.checked}
            disabled={disabled}
            onChange={(e) => onChange(item.key, e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
          />
          <label
            htmlFor={item.key}
            className="text-sm text-gray-700 cursor-pointer select-none"
          >
            {item.label}
          </label>
        </li>
      ))}
    </ul>
  )
}
