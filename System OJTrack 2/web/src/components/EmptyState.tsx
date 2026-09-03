import React from 'react'

interface EmptyStateProps {
  title: string
  subtitle?: string
}

/** Friendly icon + message used wherever a list has nothing to show yet. */
const EmptyState: React.FC<EmptyStateProps> = ({ title, subtitle }) => (
  <div className="empty-state">
    <svg
      width={40}
      height={40}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="empty-state-icon"
    >
      <path
        d="M9 20L14 8H34L39 20"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 20V38C9 39.1 9.9 40 11 40H37C38.1 40 39 39.1 39 38V20"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 20H19C19 22.8 21.2 25 24 25C26.8 25 29 22.8 29 20H39"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
    <p className="empty-state-title">{title}</p>
    {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
  </div>
)

export default EmptyState
