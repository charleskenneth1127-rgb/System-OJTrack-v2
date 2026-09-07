import React, { useState } from 'react'
import type { HteRecord } from '../types'

interface EditHteModalProps {
  hte: HteRecord
  onClose: () => void
  onSave: (updates: {
    name: string
    address: string
    supervisorName: string
    supervisorEmail: string
    supervisorPhone: string
    expectedTimeIn?: string
  }) => Promise<void> | void
}

const EditHteModal: React.FC<EditHteModalProps> = ({ hte, onClose, onSave }) => {
  const [name, setName] = useState(hte.name)
  const [address, setAddress] = useState(hte.address)
  const [supervisorName, setSupervisorName] = useState(hte.supervisorName)
  const [supervisorEmail, setSupervisorEmail] = useState(hte.supervisorEmail)
  const [supervisorPhone, setSupervisorPhone] = useState(hte.supervisorPhone)
  const [expectedTimeIn, setExpectedTimeIn] = useState(hte.expectedTimeIn || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isValid = name.trim() !== '' && supervisorName.trim() !== ''

  const handleSave = async () => {
    if (!isValid) {
      setError('Enter at least the company name and supervisor name.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        address: address.trim(),
        supervisorName: supervisorName.trim(),
        supervisorEmail: supervisorEmail.trim(),
        supervisorPhone: supervisorPhone.trim(),
        expectedTimeIn: expectedTimeIn || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Edit HTE</h3>
            <p>{hte.name}</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="modal-body">
          <label className="modal-field">
            Company name
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="modal-field">
            Address
            <input value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label className="modal-field">
            Supervisor name
            <input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} />
          </label>
          <label className="modal-field">
            Supervisor email
            <input type="email" value={supervisorEmail} onChange={(e) => setSupervisorEmail(e.target.value)} />
          </label>
          <label className="modal-field">
            Supervisor phone
            <input value={supervisorPhone} onChange={(e) => setSupervisorPhone(e.target.value)} />
          </label>
          <label className="modal-field">
            Expected time-in (optional)
            <input type="time" value={expectedTimeIn} onChange={(e) => setExpectedTimeIn(e.target.value)} />
          </label>
          <p className="modal-hint">Every student assigned to this HTE inherits this start time for lateness tracking.</p>
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

export default EditHteModal
