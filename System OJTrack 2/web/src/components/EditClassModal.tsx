import React, { useState } from 'react'
import type { ClassRecord } from '../types'
import { TERM_OPTIONS } from '../constants'

interface EditClassModalProps {
  classItem: ClassRecord
  studentCount: number
  onClose: () => void
  onSave: (updates: { name: string; schoolYear: string; term: string; requiredHours: number }) => Promise<void> | void
  onDelete: () => Promise<void> | void
}

const EditClassModal: React.FC<EditClassModalProps> = ({ classItem, studentCount, onClose, onSave, onDelete }) => {
  const [name, setName] = useState(classItem.name)
  const [schoolYear, setSchoolYear] = useState(classItem.schoolYear)
  const [term, setTerm] = useState(classItem.term)
  const [requiredHours, setRequiredHours] = useState(String(classItem.requiredHours))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState('')

  const parsedHours = Number(requiredHours)
  const isValid = name.trim() !== '' && schoolYear.trim() !== '' && term.trim() !== '' && !Number.isNaN(parsedHours) && parsedHours >= 0

  const handleSave = async () => {
    if (!isValid) {
      setError('Fill in all fields with a valid required-hours value.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave({ name: name.trim(), schoolYear: schoolYear.trim(), term: term.trim(), requiredHours: parsedHours })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Edit Class</h3>
            <p>{classItem.name}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {confirmingDelete ? (
            <div className="confirm-panel">
              <p>
                Delete <strong>{classItem.name}</strong>? {studentCount > 0
                  ? `${studentCount} enrolled student${studentCount === 1 ? '' : 's'} will be unassigned (their accounts and hours are kept).`
                  : 'This class has no enrolled students.'}{' '}
                This can't be undone.
              </p>
              <div className="confirm-panel-actions">
                <button className="secondary-button" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                  Cancel
                </button>
                <button className="danger-button" onClick={handleDelete} disabled={deleting}>
                  {deleting ? 'Deleting…' : 'Yes, delete class'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <label className="modal-field">
                Class name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="modal-field">
                School year
                <input value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} />
              </label>
              <label className="modal-field">
                Term
                <select value={term} onChange={(e) => setTerm(e.target.value)}>
                  {TERM_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="modal-field">
                Required OJT hours
                <input
                  type="number"
                  min={0}
                  value={requiredHours}
                  onChange={(e) => setRequiredHours(e.target.value)}
                />
              </label>
              {error && <p className="error-text">{error}</p>}
            </>
          )}
        </div>

        {!confirmingDelete && (
          <div className="modal-footer-split">
            <button className="danger-button" onClick={() => setConfirmingDelete(true)}>
              Delete class
            </button>
            <div className="modal-footer-right">
              <button className="secondary-button" onClick={onClose} disabled={saving}>
                Cancel
              </button>
              <button className="primary-button" onClick={handleSave} disabled={!isValid || saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditClassModal
