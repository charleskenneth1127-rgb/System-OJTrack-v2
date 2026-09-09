import React, { useState } from 'react'
import type { AttendanceLogRecord, HteRecord, StudentRecord, UserRecord } from '../types'
import Avatar from './Avatar'
import PhotoLightbox from './PhotoLightbox'

interface StudentProfileModalProps {
  student: StudentRecord
  studentUser: UserRecord | undefined
  hte: HteRecord | undefined
  className: string
  attendanceLogs: AttendanceLogRecord[]
  onClose: () => void
  onAssignHte: () => void
  onRemove: () => void
  onSendFeedback: (message: string) => Promise<void> | void
}

const formatLogDate = (value: unknown): string => {
  if (!value) return 'Unknown date'
  if (typeof value === 'string') return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  return 'Unknown date'
}

/** Same three-tier read as the Members table (getComplianceTier in App.tsx) — kept in sync there. */
function tierFor(pct: number): { label: string; className: string; color: string } {
  if (pct >= 80) return { label: 'Active', className: 'status-pill-success', color: 'var(--success)' }
  if (pct >= 50) return { label: 'Warning', className: 'status-pill-warning', color: 'var(--warning)' }
  return { label: 'At Risk', className: 'status-pill-danger', color: 'var(--danger)' }
}

const RING_RADIUS = 52
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const StudentProfileModal: React.FC<StudentProfileModalProps> = ({
  student,
  studentUser,
  hte,
  className,
  attendanceLogs,
  onClose,
  onAssignHte,
  onRemove,
  onSendFeedback,
}) => {
  const name = studentUser?.displayName || 'Unnamed student'
  const pct = student.requiredHours > 0 ? Math.round((student.renderedHours / student.requiredHours) * 100) : 0
  const clampedPct = Math.min(100, pct)
  const tier = tierFor(pct)
  const dashOffset = RING_CIRCUMFERENCE * (1 - clampedPct / 100)

  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)
  const [feedbackSent, setFeedbackSent] = useState(false)
  const [viewingPhoto, setViewingPhoto] = useState(false)

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return
    setSendingFeedback(true)
    setFeedbackSent(false)
    try {
      await onSendFeedback(feedbackMessage)
      setFeedbackMessage('')
      setFeedbackSent(true)
    } finally {
      setSendingFeedback(false)
    }
  }

  const recentLogs = [...attendanceLogs]
    .sort((a, b) => {
      const at = typeof a.timestamp === 'string' ? new Date(a.timestamp).getTime() : a.timestamp?.toDate?.().getTime() || 0
      const bt = typeof b.timestamp === 'string' ? new Date(b.timestamp).getTime() : b.timestamp?.toDate?.().getTime() || 0
      return bt - at
    })
    .slice(0, 5)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Student Profile</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="profile-identity">
            {studentUser?.photoUrl ? (
              <button
                type="button"
                className="avatar-click-target"
                onClick={() => setViewingPhoto(true)}
                aria-label={`View ${name}'s photo`}
              >
                <Avatar name={name} photoUrl={studentUser.photoUrl} seed={student.userId} size={84} />
              </button>
            ) : (
              <Avatar name={name} photoUrl={undefined} seed={student.userId} size={84} />
            )}
            <div>
              <strong className="profile-name">{name}</strong>
              <span className="mono profile-id">{studentUser?.studentIdCode || studentUser?.email || student.userId}</span>
              <div className="profile-tags">
                <span className={`status-pill ${tier.className}`}>{tier.label}</span>
                <span className="profile-class-tag">{className}</span>
              </div>
            </div>
          </div>

          <div className="profile-field-grid">
            <div>
              <span className="profile-field-label">HTE</span>
              <p>{hte?.name || 'Not assigned'}</p>
            </div>
            <div>
              <span className="profile-field-label">Supervisor</span>
              <p>{hte?.supervisorName || '—'}</p>
            </div>
            <div>
              <span className="profile-field-label">Email</span>
              <p>{studentUser?.contactEmail || studentUser?.email || '—'}</p>
            </div>
            <div>
              <span className="profile-field-label">Absences</span>
              <p>
                {student.absenceCount ? `${student.absenceCount} total` : 'None recorded'}
                {!!student.consecutiveAbsenceDays && ` · ${student.consecutiveAbsenceDays} consecutive`}
              </p>
            </div>
          </div>

          <div className="roster-divider" />

          <h4>Hours Progress</h4>
          <div className="profile-hours-row">
            <div className="profile-ring">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={RING_RADIUS} fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  fill="none"
                  stroke={tier.color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="profile-ring-label">
                <strong>{pct}%</strong>
                <span>Complete</span>
              </div>
            </div>
            <div className="profile-hours-detail">
              <div className="profile-hours-detail-top">
                <span>Rendered</span>
                <strong>{student.renderedHours}h</strong>
              </div>
              <div className="hrs-progress-track">
                <div className="hrs-progress-fill" style={{ width: `${clampedPct}%`, background: tier.color }} />
              </div>
              <span className="review-meta no-capitalize">of {student.requiredHours}h required</span>
            </div>
          </div>

          <div className="roster-divider" />

          <h4>Recent Attendance</h4>
          {recentLogs.length === 0 ? (
            <p className="modal-hint">No attendance logs yet.</p>
          ) : (
            <div className="profile-attendance-list">
              {recentLogs.map((log) => (
                <div className="profile-attendance-row" key={log.id}>
                  <span className="profile-attendance-date">{formatLogDate(log.timestamp)}</span>
                  <span className="profile-attendance-type">{log.type === 'time_in' ? 'Time in' : 'Time out'}</span>
                  <span className={`status-badge status-${log.status}`}>{log.status}</span>
                </div>
              ))}
            </div>
          )}

          <div className="roster-divider" />

          <h4>Send Feedback</h4>
          <label className="modal-field">
            Message to {name}
            <textarea
              value={feedbackMessage}
              onChange={(e) => {
                setFeedbackMessage(e.target.value)
                setFeedbackSent(false)
              }}
              placeholder="e.g. Great work on your last weekly report — keep it up."
              rows={3}
            />
          </label>
          <div className="button-row">
            <button
              className="secondary-button"
              onClick={handleSendFeedback}
              disabled={!feedbackMessage.trim() || sendingFeedback}
            >
              {sendingFeedback ? 'Sending…' : 'Send Feedback'}
            </button>
            {feedbackSent && <span className="preferences-saved-note">Sent</span>}
          </div>
        </div>

        <div className="modal-footer-split">
          <button className="danger-button" onClick={onRemove}>
            Remove from class
          </button>
          <div className="modal-footer-right">
            <button className="secondary-button" onClick={onAssignHte}>
              {hte ? 'Change HTE' : 'Assign HTE'}
            </button>
          </div>
        </div>
      </div>
      {viewingPhoto && studentUser?.photoUrl && (
        <PhotoLightbox photoUrl={studentUser.photoUrl} alt={`${name}'s photo`} onClose={() => setViewingPhoto(false)} />
      )}
    </div>
  )
}

export default StudentProfileModal
