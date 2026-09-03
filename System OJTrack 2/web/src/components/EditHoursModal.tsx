import React, { useState } from 'react'
import type { StudentRecord } from '../types'

interface EditHoursModalProps {
  student: StudentRecord
  studentLabel: string
  onClose: () => void
  onSave: (newRequiredHours: number, newRenderedHours: number, reason: string) => Promise<void> | void
}

const EditHoursModal: React.FC<EditHoursModalProps> = ({ student, studentLabel, onClose, onSave }) => {
  const [requiredHours, setRequiredHours] = useState(String(student.requiredHours))
  const [renderedHours, setRenderedHours] = useState(String(student.renderedHours))
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const parsedRequired = Number(requiredHours)
  const parsedRendered = Number(renderedHours)
  const isValid =
    requiredHours.trim() !== '' &&
    renderedHours.trim() !== '' &&
    !Number.isNaN(parsedRequired) &&
    !Number.isNaN(parsedRendered) &&
    parsedRequired >= 0 &&
    parsedRendered >= 0 &&
    reason.trim().length >= 5

  const handleSave = async () => {
    if (!isValid) {
      setError('Enter valid hour values and a reason (at least 5 characters).')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave(parsedRequired, parsedRendered, reason.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Edit Student Hours</h3>
            <p>{studentLabel}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-current-hours">
            <div>
              <span>Current rendered</span>
              <strong>{student.renderedHours} hrs</strong>
            </div>
            <div>
              <span>Current required</span>
              <strong>{student.requiredHours} hrs</strong>
            </div>
          </div>

          <label className="modal-field">
            Required hours (OJT target for this student)
            <input
              type="number"
              min={0}
              step={1}
              value={requiredHours}
              onChange={(e) => setRequiredHours(e.target.value)}
            />
          </label>

          <label className="modal-field">
            Rendered hours (logged so far)
            <input
              type="number"
              min={0}
              step={0.5}
              value={renderedHours}
              onChange={(e) => setRenderedHours(e.target.value)}
            />
          </label>

          <label className="modal-field">
            Reason for change
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Attendance log missed a time-out scan on July 18"
              rows={3}
            />
          </label>

          {error && <p className="error-text">{error}</p>}
          <p className="modal-hint">
            Use this to correct data-entry or attendance-capture errors, or to adjust a student's required-hours
            target for an approved exception.
          </p>
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

export default EditHoursModal
