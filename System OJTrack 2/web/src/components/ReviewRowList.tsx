import React, { useMemo, useState } from 'react'
import EmptyState from './EmptyState'

export interface ReviewRow {
  id: string
  studentLabel: string
  typeLabel: string
  status: 'pending' | 'approved' | 'rejected'
  submittedLabel: string
  content?: string
  fileUrl?: string
  fileLinkLabel?: string
  onApprove?: () => void
  onReject?: () => void
}

interface ReviewRowListProps {
  title: string
  subtitle?: string
  emptyTitle: string
  emptySubtitle: string
  items: ReviewRow[]
}

type Filter = 'all' | 'pending' | 'approved' | 'rejected'

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic']

/** Storage download URLs carry a `?alt=media&token=...` query string after the extension. */
const getFileExtension = (url: string): string => {
  const withoutQuery = url.split('?')[0]
  const dotIndex = withoutQuery.lastIndexOf('.')
  return dotIndex === -1 ? '' : withoutQuery.slice(dotIndex + 1).toLowerCase()
}

/**
 * Dense, filterable review list — used for both Submitted Reports and
 * Pre-OJT Documents in the class Reports & Documents tab. One row per
 * submission (student · type, submitted date) with the status pill, a
 * detail view, and inline approve/reject for pending items, plus a
 * status filter strip so a coordinator can jump straight to what's
 * outstanding instead of scrolling a mixed list.
 */
const ReviewRowList: React.FC<ReviewRowListProps> = ({ title, subtitle, emptyTitle, emptySubtitle, items }) => {
  const [filter, setFilter] = useState<Filter>('all')
  const [viewing, setViewing] = useState<ReviewRow | null>(null)

  const counts = useMemo(
    () => ({
      all: items.length,
      pending: items.filter((i) => i.status === 'pending').length,
      approved: items.filter((i) => i.status === 'approved').length,
      rejected: items.filter((i) => i.status === 'rejected').length,
    }),
    [items],
  )

  const filtered = filter === 'all' ? items : items.filter((i) => i.status === filter)

  return (
    <section className="module-card">
      <h3>{title}</h3>
      {subtitle && <p>{subtitle}</p>}

      {items.length > 0 && (
        <div className="review-list-toolbar">
          <div className="filter-tabs">
            {(['all', 'pending', 'approved', 'rejected'] as Filter[]).map((key) => (
              <button
                key={key}
                className={filter === key ? 'filter-tab active' : 'filter-tab'}
                onClick={() => setFilter(key)}
              >
                {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)}
                {key !== 'all' && ` (${counts[key]})`}
              </button>
            ))}
          </div>
          <span className="results-count">{filtered.length} result{filtered.length === 1 ? '' : 's'}</span>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      ) : filtered.length === 0 ? (
        <EmptyState title="Nothing here" subtitle="No submissions match this filter." />
      ) : (
        <div className="review-row-list">
          {filtered.map((item) => (
            <div className="review-row" key={item.id}>
              <div className="review-row-main">
                <div className="review-row-title">
                  <strong>{item.studentLabel}</strong>
                  <span className="review-row-sep">·</span>
                  <span>{item.typeLabel}</span>
                </div>
                <div className="review-row-meta">{item.submittedLabel}</div>
              </div>
              <div className="review-row-actions">
                <span className={`status-badge status-${item.status}`}>{item.status}</span>
                <button className="eye-button" title="View details" onClick={() => setViewing(item)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M2 12C2 12 5.5 5.5 12 5.5C18.5 5.5 22 12 22 12C22 12 18.5 18.5 12 18.5C5.5 18.5 2 12 2 12Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </button>
                {item.status === 'pending' && item.onApprove && item.onReject && (
                  <>
                    <button className="reject-button" onClick={item.onReject}>
                      Reject
                    </button>
                    <button className="primary-button" onClick={item.onApprove}>
                      Approve
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewing && (
        <div className="modal-overlay" onClick={() => setViewing(null)}>
          <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{viewing.typeLabel}</h3>
                <p>
                  {viewing.studentLabel} · {viewing.submittedLabel}
                </p>
              </div>
              <button className="modal-close" onClick={() => setViewing(null)} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <span className={`status-badge status-${viewing.status}`}>{viewing.status}</span>
              {viewing.content && <p className="review-content">{viewing.content}</p>}
              {viewing.fileUrl &&
                (() => {
                  const extension = getFileExtension(viewing.fileUrl)
                  if (IMAGE_EXTENSIONS.includes(extension)) {
                    return (
                      <a href={viewing.fileUrl} target="_blank" rel="noreferrer">
                        <img src={viewing.fileUrl} alt={viewing.fileLinkLabel || 'Attachment preview'} className="review-file-image" />
                      </a>
                    )
                  }
                  if (extension === 'pdf') {
                    return <embed src={viewing.fileUrl} type="application/pdf" className="review-file-pdf" />
                  }
                  return null
                })()}
              {viewing.fileUrl && (
                <a href={viewing.fileUrl} target="_blank" rel="noreferrer" className="review-file-link">
                  {viewing.fileLinkLabel || 'View attachment'} ↗
                </a>
              )}
              {!viewing.content && !viewing.fileUrl && <p className="modal-hint">No additional details attached.</p>}
            </div>
            <div className="modal-footer">
              {viewing.status === 'pending' && viewing.onApprove && viewing.onReject ? (
                <>
                  <button
                    className="reject-button"
                    onClick={() => {
                      viewing.onReject?.()
                      setViewing(null)
                    }}
                  >
                    Reject
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => {
                      viewing.onApprove?.()
                      setViewing(null)
                    }}
                  >
                    Approve
                  </button>
                </>
              ) : (
                <button className="secondary-button" onClick={() => setViewing(null)}>
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default ReviewRowList
