export function Tooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="bs-tooltip-wrap">
      {children}
      <span role="tooltip" className="bs-tooltip-bubble">{label}</span>
    </span>
  )
}
