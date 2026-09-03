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
