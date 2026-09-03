import React from 'react'

interface CeacMarkProps {
  size?: number
  className?: string
}

/**
 * Circuit/IC-chip mark used across the coordinator portal to signal the
 * College of Engineering, Architecture and Computing (CEAC) — engineering
 * and computing represented literally; kept abstract enough not to overclaim
 * a specific department logo, since NDMU hasn't published one publicly.
 */
const CeacMark: React.FC<CeacMarkProps> = ({ size = 28, className }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="14" y="14" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="2.4" />
    <rect x="20" y="20" width="8" height="8" rx="1.5" fill="currentColor" />
    <line x1="24" y1="14" x2="24" y2="7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="24" y1="34" x2="24" y2="41" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="14" y1="24" x2="7" y2="24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="34" y1="24" x2="41" y2="24" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    <line x1="17.5" y1="17.5" x2="11.5" y2="11.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="30.5" y1="17.5" x2="36.5" y2="11.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="17.5" y1="30.5" x2="11.5" y2="36.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    <line x1="30.5" y1="30.5" x2="36.5" y2="36.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
)

export default CeacMark
