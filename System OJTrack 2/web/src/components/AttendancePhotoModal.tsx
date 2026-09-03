import React from 'react'
import type { AttendanceLogRecord, UserRecord } from '../types'

interface AttendancePhotoModalProps {
  studentUser: UserRecord | undefined
  dateLabel: string
  timeInLog?: AttendanceLogRecord
  timeOutLog?: AttendanceLogRecord
  onClose: () => void
  onVerify: (logId: string) => void
  onFlag: (logId: string) => void
}

const formatTime = (value: unknown): string => {
  if (!value) return '—'
  const date = typeof value === 'string' ? new Date(value) : (value as { toDate?: () => Date }).toDate?.()
  if (!date) return '—'
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
}

/**
 * This is where a coordinator actually verifies attendance: each captured
 * photo is reviewed here, side by side with its own Verify/Flag action — the
 * daily roster table (renderClassAttendanceTab in App.tsx) only surfaces the
 * outcome, it doesn't carry the action itself.
 */
const AttendancePhotoModal: React.FC<AttendancePhotoModalProps> = ({
  studentUser,
  dateLabel,
  timeInLog,
  timeOutLog,
  onClose,
  onVerify,
  onFlag,
}) => {
  const renderLogPanel = (label: string, log: AttendanceLogRecord | undefined) => {
    if (!log) {
      return (
        <div className="attendance-photo-panel attendance-photo-panel-empty">
          <span className="profile-field-label">{label}</span>
          <p className="modal-hint">Not recorded yet.</p>
        </div>
      )
    }

    return (
      <div className="attendance-photo-panel">
        <div className="attendance-photo-panel-header">
          <div>
            <span className="profile-field-label">{label}</span>
            <p className="attendance-photo-time">{formatTime(log.timestamp)}</p>
          </div>
          <span className={`status-badge status-${log.status}`}>{log.status}</span>
        </div>
        {log.photoUrl ? (
          <a href={log.photoUrl} target="_blank" rel="noreferrer">
            <img src={log.photoUrl} alt={`${label} capture`} className="attendance-photo-image" />
          </a>
        ) : (
          <p className="modal-hint">No photo attached.</p>
        )}
        {log.type === 'time_out' && typeof log.computedHours === 'number' && (
          <p className="modal-hint">{log.computedHours}h computed for this shift.</p>
        )}
        {log.status === 'pending' && (
          <div className="review-actions">
            <button className="secondary-button" onClick={() => onFlag(log.id)}>
              Flag
            </button>
            <button className="primary-button" onClick={() => onVerify(log.id)}>
              Verify
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-card-wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>{studentUser?.displayName || 'Student'}</h3>
            <p>{dateLabel}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div className="attendance-photo-grid">
            {renderLogPanel('Time In', timeInLog)}
            {renderLogPanel('Time Out', timeOutLog)}
          </div>
        </div>
        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default AttendancePhotoModal
