import React from 'react'

interface ConfirmLogoutModalProps {
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmLogoutModal: React.FC<ConfirmLogoutModalProps> = ({ onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3>Log out?</h3>
        <button className="modal-close" onClick={onCancel} aria-label="Close">
          ✕
        </button>
      </div>
      <div className="modal-body">
        <p>You'll need to sign back in to access the coordinator portal.</p>
      </div>
      <div className="modal-footer">
        <button className="secondary-button" onClick={onCancel}>
          Cancel
        </button>
        <button className="danger-button" onClick={onConfirm}>
          Log out
        </button>
      </div>
    </div>
  </div>
)

export default ConfirmLogoutModal
