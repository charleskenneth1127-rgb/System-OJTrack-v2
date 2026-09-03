import React, { useEffect, useMemo, useRef, useState } from 'react'
import type { ClassRecord, NotificationRecord } from '../types'

interface NotificationsBellProps {
  notifications: NotificationRecord[]
  classes: ClassRecord[]
  onMarkAllRead: () => void
  onOpenClass: (classId: string) => void
}

interface ClassGroup {
  classId: string
  className: string
  unreadCount: number
  latestMessage: string
  latestTime: number
}

const formatWhen = (value: unknown): string => {
  if (!value) return ''
  if (typeof value === 'string') return new Date(value).toLocaleString()
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toLocaleString()
  }
  return ''
}

const timeValue = (value: unknown): number => {
  const formatted = formatWhen(value)
  return formatted ? new Date(formatted).getTime() : 0
}

const NotificationsBell: React.FC<NotificationsBellProps> = ({ notifications, classes, onMarkAllRead, onOpenClass }) => {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter((n) => !n.read).length

  const groups = useMemo<ClassGroup[]>(() => {
    const byClass = new Map<string, NotificationRecord[]>()
    notifications.forEach((n) => {
      const key = n.classId || 'general'
      const list = byClass.get(key) || []
      list.push(n)
      byClass.set(key, list)
    })

    return Array.from(byClass.entries())
      .map(([classId, items]) => {
        const sorted = [...items].sort((a, b) => timeValue(b.createdAt) - timeValue(a.createdAt))
        const className = classId === 'general' ? 'General updates' : classes.find((c) => c.id === classId)?.name || 'Unknown class'
        return {
          classId,
          className,
          unreadCount: items.filter((n) => !n.read).length,
          latestMessage: sorted[0]?.message || '',
          latestTime: timeValue(sorted[0]?.createdAt),
        }
      })
      .sort((a, b) => b.latestTime - a.latestTime)
  }, [notifications, classes])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="notification-bell-wrap" ref={wrapRef}>
      <button
        type="button"
        className="notification-bell-button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M12 3C9.5 3 7.5 5 7.5 7.5V11C7.5 11.8 7.15 12.56 6.55 13.1L5.3 14.2C4.8 14.65 5.12 15.5 5.8 15.5H18.2C18.88 15.5 19.2 14.65 18.7 14.2L17.45 13.1C16.85 12.56 16.5 11.8 16.5 11V7.5C16.5 5 14.5 3 12 3Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M9.5 18.5C9.79 19.44 10.81 20 12 20C13.19 20 14.21 19.44 14.5 18.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount > 0 && <span className="notification-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button type="button" className="notification-mark-all" onClick={onMarkAllRead}>
                Mark all read
              </button>
            )}
          </div>
          <div className="notification-dropdown-list">
            {groups.length === 0 && <p className="modal-hint">No notifications yet.</p>}
            {groups.map((group) => (
              <div
                key={group.classId}
                className={`notification-item notification-group-item ${group.unreadCount > 0 ? 'unread' : 'read'}`}
                onClick={() => {
                  setOpen(false)
                  if (group.classId !== 'general') onOpenClass(group.classId)
                }}
              >
                <div className="notification-group-header">
                  <strong>{group.className}</strong>
                  {group.unreadCount > 0 && (
                    <span className="notification-group-badge">{group.unreadCount} new</span>
                  )}
                </div>
                <p>{group.latestMessage}</p>
                <span>{group.latestTime ? new Date(group.latestTime).toLocaleString() : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationsBell
