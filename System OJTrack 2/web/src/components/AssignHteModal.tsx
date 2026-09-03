import React, { useState } from 'react'
import type { HteRecord, StudentRecord, UserRecord } from '../types'

interface AssignHteModalProps {
  student: StudentRecord
  studentUser: UserRecord | undefined
  htes: HteRecord[]
  onClose: () => void
  onAssign: (hteId: string) => Promise<void> | void
}

/**
 * HTEs are enrolled separately (see the "Enroll HTE" module) — this modal is
 * a pure dropdown picker so assigning one to a student is a single choice
 * rather than a typing task.
 */
const AssignHteModal: React.FC<AssignHteModalProps> = ({ student, studentUser, htes, onClose, onAssign }) => {
  const [selectedHteId, setSelectedHteId] = useState(student.assignedHteId || htes[0]?.id || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!selectedHteId) {
      setError('Select an HTE to assign.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onAssign(selectedHteId)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleUnassign = async () => {
    setSaving(true)
    try {
      await onAssign('')
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Assign HTE</h3>
            <p>{studentUser?.displayName || 'Student'}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {htes.length === 0 ? (
            <p className="modal-hint">
              No HTEs are enrolled yet. Enroll one from the "Enroll HTE" page first, then come back to assign it.
            </p>
          ) : (
            <label className="modal-field">
              Host Training Establishment
              <select value={selectedHteId} onChange={(e) => setSelectedHteId(e.target.value)}>
                {htes.map((hte) => (
                  <option key={hte.id} value={hte.id}>
                    {hte.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {error && <p className="error-text">{error}</p>}
          <p className="modal-hint">
            Assigning an HTE lets you generate an evaluation link for this student's on-site supervisor.
          </p>
        </div>

        <div className="modal-footer-split">
          {student.assignedHteId ? (
            <button className="danger-button" onClick={handleUnassign} disabled={saving}>
              Unassign
            </button>
          ) : (
            <span />
          )}
          <div className="modal-footer-right">
            <button className="secondary-button" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="primary-button" onClick={handleSave} disabled={saving || htes.length === 0}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AssignHteModal
