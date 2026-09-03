import React, { useState } from 'react'
import { TERM_OPTIONS } from '../constants'

interface CreateClassModalProps {
  onClose: () => void
  onCreate: (input: { name: string; schoolYear: string; term: string; requiredHours: number }) => Promise<void> | void
  defaults?: { schoolYear: string; term: string; requiredHours: number }
}

const CreateClassModal: React.FC<CreateClassModalProps> = ({ onClose, onCreate, defaults }) => {
  const [name, setName] = useState('')
  const [schoolYear, setSchoolYear] = useState(defaults?.schoolYear ?? '2025-2026')
  const [term, setTerm] = useState<string>(defaults?.term ?? TERM_OPTIONS[0])
  const [requiredHours, setRequiredHours] = useState(String(defaults?.requiredHours ?? 600))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const parsedHours = Number(requiredHours)
  const isValid = name.trim() !== '' && schoolYear.trim() !== '' && term.trim() !== '' && !Number.isNaN(parsedHours) && parsedHours >= 0

  const handleCreate = async () => {
    if (!isValid) {
      setError('Fill in all fields with a valid required-hours value.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onCreate({ name: name.trim(), schoolYear: schoolYear.trim(), term: term.trim(), requiredHours: parsedHours })
      onClose()
    } catch (err) {
      console.error('Failed to create class:', err)
      setError(err instanceof Error ? err.message : 'Could not create the class. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Create class</h3>
            <p>Students will join using the code generated for this class.</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <label className="modal-field">
            Class name
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. BSIT 4A" autoFocus />
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
            Required OJT hours (default for students in this class)
            <input
              type="number"
              min={0}
              value={requiredHours}
              onChange={(e) => setRequiredHours(e.target.value)}
            />
          </label>
          {error && <p className="error-text">{error}</p>}
        </div>

        <div className="modal-footer">
          <button className="secondary-button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="primary-button" onClick={handleCreate} disabled={!isValid || saving}>
            {saving ? 'Creating…' : 'Create class'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateClassModal
