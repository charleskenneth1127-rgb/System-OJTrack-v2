import React from 'react'

interface PhotoLightboxProps {
  photoUrl: string
  alt: string
  onClose: () => void
}

/** Full-size view of a profile photo, opened by clicking its avatar thumbnail. */
const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ photoUrl, alt, onClose }) => (
  <div className="modal-overlay photo-lightbox-overlay" onClick={onClose}>
    <div className="photo-lightbox-card" onClick={(e) => e.stopPropagation()}>
      <button className="modal-close photo-lightbox-close" onClick={onClose} aria-label="Close">
        ✕
      </button>
      <img src={photoUrl} alt={alt} className="photo-lightbox-image" />
    </div>
  </div>
)

export default PhotoLightbox
