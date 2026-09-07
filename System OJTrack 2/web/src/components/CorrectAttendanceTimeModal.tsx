import React, { useState } from 'react'

interface CorrectAttendanceTimeModalProps {
  label: string
  currentTimestamp: Date
  onClose: () => void
  onSave: (newTimestamp: Date, reason: string) => Promise<void> | void
}

const toDateTimeLocal = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * Only offered for still-pending logs (see AttendancePhotoModal) — once a log
 * is verified its hours are already credited, so correcting it after the
 * fact would mean reconciling students/{id}.renderedHours too. Re-verifying
 * after a pending-log correction goes through the normal flow instead.
 */
const CorrectAttendanceTimeModal: React.FC<CorrectAttendanceTimeModalProps> = ({
  label,
  currentTimestamp,
  onClose,
  onSave,
}) => {
  const [value, setValue] = useState(toDateTimeLocal(currentTimestamp))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const parsed = new Date(value)
  const isValid = !Number.isNaN(parsed.getTime()) && reason.trim().length >= 5

  const handleSave = async () => {
    if (!isValid) {
      setError('Enter a valid time and a reason (at least 5 characters).')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave(parsed, reason.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Correct {label}</h3>
            <p>Only available while this log is still pending.</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <label className="modal-field">
            Actual time
            <input type="datetime-local" value={value} onChange={(e) => setValue(e.target.value)} />
          </label>
          <label className="modal-field">
            Reason for change
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Student's phone clock was set to the wrong time zone"
              rows={3}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleSave} disabled={!isValid || saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CorrectAttendanceTimeModal
