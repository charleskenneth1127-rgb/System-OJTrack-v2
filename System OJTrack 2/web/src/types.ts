export type UserRole = 'coordinator' | 'admin' | 'student'

export interface UserRecord {
  id: string
  email: string
  displayName: string
  role: UserRole
  createdAt: string
  studentIdCode?: string
  mustChangePassword?: boolean
  contactEmail?: string
  fcmToken?: string | null
  photoUrl?: string
}

export interface ClassRecord {
  id: string
  name: string
  coordinatorId: string
  schoolYear: string
  term: string
  requiredHours: number
  joinCode: string
}

export interface ClassJoinRequestRecord {
  id: string // == studentUid
  classId: string
  joinCode: string
  studentUid: string
  studentName: string
  studentEmail: string
  status: 'pending' | 'approved' | 'rejected'
  requestedAt: string
  respondedAt?: string
  respondedBy?: string
}

export interface StudentRecord {
  id: string
  userId: string
  classId: string
  assignedHteId?: string
  requiredHours: number
  renderedHours: number
  absenceCount?: number
  consecutiveAbsenceDays?: number
  completionStatus?: 'in_progress' | 'completed'
  completedAt?: string
}

export interface HteRecord {
  id: string
  name: string
  address: string
  supervisorName: string
  supervisorEmail: string
  supervisorPhone: string
  /** "HH:mm" 24h local time — every student assigned here inherits it for lateness checks. */
  expectedTimeIn?: string
}

export interface AttendanceLogRecord {
  id: string
  studentId: string
  timestamp: any // Firestore Timestamp
  type: 'time_in' | 'time_out'
  photoUrl: string
  status: 'pending' | 'verified' | 'flagged'
  /** Set by onAttendanceLogCreated once paired with a time_in — only credited to renderedHours on verify. */
  computedHours?: number
  paired?: boolean
  pairedWithLogId?: string
  /** time_in only — actual time vs. the assigned HTE's expectedTimeIn + the grace period in settings/global. */
  late?: boolean
  lastTimeCorrection?: {
    previousTimestamp: any
    newTimestamp: any
    reason: string
    correctedBy: string
    correctedAt: string
  }
}

export interface PreOjtDocumentRecord {
  id: string
  studentId: string
  docType: 'MOA' | 'waiver' | 'other'
  fileUrl: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface ReportRecord {
  id: string
  studentId: string
  type: 'daily' | 'weekly' | 'narrative'
  content: string
  fileUrl?: string
  submittedAt: any // Firestore Timestamp
  status: 'pending' | 'approved' | 'rejected'
}

export interface PortfolioItemRecord {
  id: string
  studentId: string
  fileUrl: string
  title: string
  uploadedAt: any // Firestore Timestamp
  status: 'pending' | 'approved' | 'rejected'
  /** Coordinator's note on why an item was rejected / what to fix — shown back to the student. */
  coordinatorNote?: string
}

export interface HteEvaluationLinkRecord {
  id: string
  studentId: string
  token: string
  expiresAt: any // Firestore Timestamp
  submitted: boolean
}

export interface HteEvaluationRecord {
  id: string
  studentId: string
  submittedByLinkToken: string
  scores: Record<string, number>
  comments: string
  supervisorName?: string
  submittedAt: any // Firestore Timestamp
}

/** Single global doc at settings/global. */
export interface SystemPreferencesRecord {
  institutionName: string
  department: string
  defaultRequiredHours: number
  academicYear: string
  semester: string
  /** Consecutive no-time-in days before dailyAbsenceCheck notifies the coordinator. */
  absenceAlertThresholdDays: number
  /** Grace period after an HTE's expectedTimeIn before a time-in log is marked late. */
  lateThresholdMinutes: number
  /** Shown to students on the mobile Portfolio screen so they know what's expected before they upload. */
  portfolioInstructions: string
}

/** An immutable audit trail entry — see the Activity Log under System Administration. */
export interface ActivityLogRecord {
  id: string
  actorId: string
  actorName: string
  action: string
  details: string
  createdAt: any // Firestore Timestamp
}

export interface NotificationRecord {
  id: string
  recipientId: string
  type: string
  message: string
  read: boolean
  createdAt: any // Firestore Timestamp
  classId?: string
  studentId?: string
}
