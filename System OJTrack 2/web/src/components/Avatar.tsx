import React from 'react'
import { avatarColor, initials } from '../utils/avatarStyle'

interface AvatarProps {
  name: string
  photoUrl?: string | null
  /** Id to derive the fallback color from when there's no photo — defaults to `name`. */
  seed?: string
  size?: number
}

/** A user's profile picture, or a deterministic initials-in-a-circle fallback when none is set. */
const Avatar: React.FC<AvatarProps> = ({ name, photoUrl, seed, size = 32 }) => {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="avatar-photo"
        style={{ width: size, height: size }}
      />
    )
  }

  const color = avatarColor(seed || name)
  return (
    <span
      className="avatar-initials"
      style={{ width: size, height: size, fontSize: size * 0.34, background: color.bg, color: color.fg }}
    >
      {initials(name)}
    </span>
  )
}

export default Avatar
