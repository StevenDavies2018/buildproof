export const RAW_STATE_OPTIONS = [
  { value: '', label: 'All states' },
  { value: 'successful', label: 'Funded successfully' },
  { value: 'failed', label: 'Ended without funding' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'submitted', label: 'Submitted for review' },
  { value: 'live', label: 'Live now' },
  { value: 'started', label: 'Launched / in progress' },
  { value: 'suspended', label: 'Suspended' },
] as const

export function formatRawStateLabel(value: string | null | undefined) {
  if (!value) return 'Unknown state'
  const match = RAW_STATE_OPTIONS.find((option) => option.value === value)
  return match?.label ?? value
}

export function formatNormalizedStatusLabel(value: string | null | undefined) {
  switch (value) {
    case 'successful':
      return 'Funded'
    case 'unsuccessful':
      return 'Not funded'
    case 'live':
      return 'Live now'
    case 'prelaunch':
      return 'Pre-launch'
    default:
      return 'Status unclear'
  }
}
