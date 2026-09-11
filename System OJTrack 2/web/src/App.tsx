import { useEffect, useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import './App.css'
import Login from './components/Login'
import Avatar from './components/Avatar'
import PhotoLightbox from './components/PhotoLightbox'
import EditHoursModal from './components/EditHoursModal'
import EditClassModal from './components/EditClassModal'
import EditHteModal from './components/EditHteModal'
import CreateClassModal from './components/CreateClassModal'
import CeacMark from './components/CeacMark'
import NotificationsBell from './components/NotificationsBell'
import HteEvaluationForm from './components/HteEvaluationForm'
import EmptyState from './components/EmptyState'
import AssignHteModal from './components/AssignHteModal'
import ConfirmLogoutModal from './components/ConfirmLogoutModal'
import AttendancePhotoModal from './components/AttendancePhotoModal'
import ReviewRowList from './components/ReviewRowList'
import type { ReviewRow } from './components/ReviewRowList'
import SimpleBarChart from './components/SimpleBarChart'
import type { BarChartDatum } from './components/SimpleBarChart'
import type {
  UserRecord,
  ClassRecord,
  ClassJoinRequestRecord,
  StudentRecord,
  NotificationRecord,
  ReportRecord,
  PreOjtDocumentRecord,
  PortfolioItemRecord,
  AttendanceLogRecord,
  HteEvaluationLinkRecord,
  HteEvaluationRecord,
  HteRecord,
  SystemPreferencesRecord,
  ActivityLogRecord,
} from './types'
import { auth, createCoordinatorAccount, db, generateUniqueJoinCode, studentIdToEmail, uploadAvatar } from './firebase'
import { resizeImageFile } from './utils/imageResize'
import { isLate } from './utils/attendance'
import { registerPushNotifications } from './push'
import { avatarColor, classCardStyle, initials } from './utils/avatarStyle'
import { TERM_OPTIONS } from './constants'
import { onAuthStateChanged } from 'firebase/auth'
import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

// Grouped for the sidebar so a first-time coordinator isn't scanning eight
// flat items — Monitoring (read/track), Management (create/edit/act), System
// (accounts, settings, audit). Activity Log sits under System rather than
// Monitoring to match the paper's own System Administration Module, which
// bundles account management, settings, and activity logs together.
const moduleGroups: { label: string; items: string[] }[] = [
  { label: 'Monitoring', items: ['Dashboard', 'HTE Evaluation Results'] },
  {
    label: 'Management',
    items: ['Class Management', 'Enroll HTE', 'Final Assessment & Completion', 'SIPP/CHED Report Generation'],
  },
  { label: 'System', items: ['Activity Log', 'Settings/Profile'] },
]
const modules = moduleGroups.flatMap((group) => group.items)

// One small stroke icon per sidebar module — same hand-drawn style already
// used for the topbar's theme toggle / notification bell, kept as plain
// inline SVG rather than an icon library dependency.
const moduleIcons: Record<string, React.ReactNode> = {
  Dashboard: (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  'Class Management': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 9L12 4.5L21.5 9L12 13.5L2.5 9Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M6.5 11V16C6.5 16 8.5 18 12 18C15.5 18 17.5 16 17.5 16V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21.5 9V15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  'Enroll HTE': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4.5" y="7" width="11" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.5 20V4.5C15.5 3.9 15 3.5 14.5 3.5H8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M19.5 20V10.5C19.5 9.9 19 9.5 18.5 9.5H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7.5 10.5H12.5M7.5 13.5H12.5M7.5 16.5H12.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  'HTE Evaluation Results': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4.5" y="4" width="15" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 3.5H15V6H9V3.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 12L10.5 14.5L16 9" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'Final Assessment & Completion': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="11" r="7.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 11L11 13L15.5 8.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8.5 17.5L7 21.5L12 19.5L17 21.5L15.5 17.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  ),
  'SIPP/CHED Report Generation': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3.5H14L18.5 8V20.5H6V3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3.5V8H18.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 12V17M12 17L9.5 14.5M12 17L14.5 14.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'Activity Log': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7.5V12L15 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  'Settings/Profile': (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 3.5V5.5M12 18.5V20.5M20.5 12H18.5M5.5 12H3.5M17.7 6.3L16.3 7.7M7.7 16.3L6.3 17.7M17.7 17.7L16.3 16.3M7.7 7.7L6.3 6.3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
}

type ClassTab = 'members' | 'attendance' | 'reports' | 'portfolio'

const initialClasses: ClassRecord[] = [
  { id: 'class-1', name: 'BSIT 4A', coordinatorId: 'coord-1', schoolYear: '2025-2026', term: '2nd Semester', requiredHours: 600, joinCode: 'DEMO01' },
  { id: 'class-2', name: 'BSIT 4B', coordinatorId: 'coord-1', schoolYear: '2025-2026', term: '2nd Semester', requiredHours: 600, joinCode: 'DEMO02' },
]

const initialClassJoinRequests: ClassJoinRequestRecord[] = []

const initialStudents: StudentRecord[] = [
  { id: 'student-1', userId: 'user-1', classId: 'class-1', assignedHteId: 'hte-1', requiredHours: 600, renderedHours: 120 },
  { id: 'student-2', userId: 'user-2', classId: 'class-1', assignedHteId: 'hte-2', requiredHours: 600, renderedHours: 600, completionStatus: 'in_progress' },
]

const initialHtes: HteRecord[] = [
  {
    id: 'hte-1',
    name: 'Marbel City IT Solutions',
    address: 'National Highway, Koronadal City, South Cotabato',
    supervisorName: 'Engr. Santos',
    supervisorEmail: 'santos@example.com',
    supervisorPhone: '0917-000-0001',
  },
  {
    id: 'hte-2',
    name: 'South Cotabato Data Systems',
    address: 'Alunan Ave, Koronadal City, South Cotabato',
    supervisorName: 'Ms. Reyes',
    supervisorEmail: 'reyes@example.com',
    supervisorPhone: '0917-000-0002',
  },
]

const initialUsers: Record<string, UserRecord> = {
  'user-1': {
    id: 'user-1',
    email: studentIdToEmail('25-0001'),
    displayName: 'Jane Doe',
    role: 'student',
    createdAt: new Date().toISOString(),
    studentIdCode: '25-0001',
  },
  'user-2': {
    id: 'user-2',
    email: studentIdToEmail('25-0002'),
    displayName: 'John Smith',
    role: 'student',
    createdAt: new Date().toISOString(),
    studentIdCode: '25-0002',
  },
}

/** Hours-progress ring on the student detail page's Overview tab. */
const STUDENT_RING_RADIUS = 52
const STUDENT_RING_CIRCUMFERENCE = 2 * Math.PI * STUDENT_RING_RADIUS

const DEFAULT_PREFERENCES: SystemPreferencesRecord = {
  institutionName: 'Notre Dame of Marbel University',
  department: 'CEAC',
  defaultRequiredHours: 480,
  academicYear: '2025-2026',
  semester: '2nd Semester',
  absenceAlertThresholdDays: 2,
  lateThresholdMinutes: 15,
  portfolioInstructions: '',
}

const initialCoordinators: Record<string, UserRecord> = {}

const initialNotifications: NotificationRecord[] = [
  { id: 'note-1', recipientId: 'coord-1', type: 'attendance', message: 'Student Jane Doe submitted a new attendance log.', read: false, createdAt: new Date().toISOString() },
  { id: 'note-2', recipientId: 'coord-1', type: 'report', message: 'Weekly report submitted for BSIT 4A.', read: false, createdAt: new Date().toISOString() },
]

const initialHteEvaluationLinks: HteEvaluationLinkRecord[] = []

const initialHteEvaluations: HteEvaluationRecord[] = [
  {
    id: 'eval-1',
    studentId: 'user-2',
    submittedByLinkToken: 'demo-token',
    scores: {
      'Work Quality': 5,
      'Punctuality & Attendance': 4,
      'Communication Skills': 5,
      'Initiative & Willingness to Learn': 5,
      'Professionalism': 5,
    },
    comments: 'John has been an excellent addition to our team — proactive, reliable, and a fast learner.',
    supervisorName: 'Engr. Santos',
    submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
]

const initialReports: ReportRecord[] = [
  {
    id: 'report-1',
    studentId: 'user-1',
    type: 'daily',
    content: 'Assisted with QA testing for the new patient intake module and logged 3 bugs.',
    status: 'pending',
    submittedAt: new Date().toISOString(),
  },
  {
    id: 'report-2',
    studentId: 'user-2',
    type: 'weekly',
    content: 'Completed the onboarding checklist and shadowed the network team for server migration tasks.',
    status: 'approved',
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
  },
]

const initialPreOjtDocuments: PreOjtDocumentRecord[] = [
  {
    id: 'doc-1',
    studentId: 'user-1',
    docType: 'MOA',
    fileUrl: '',
    status: 'pending',
  },
  {
    id: 'doc-2',
    studentId: 'user-2',
    docType: 'waiver',
    fileUrl: '',
    status: 'approved',
  },
]

const initialPortfolioItems: PortfolioItemRecord[] = []

const initialAttendanceLogs: AttendanceLogRecord[] = [
  {
    id: 'log-1',
    studentId: 'user-1',
    type: 'time_in',
    timestamp: new Date(Date.now() - 5 * 3600000).toISOString(),
    photoUrl: '',
    status: 'pending',
  },
  {
    id: 'log-2',
    studentId: 'user-2',
    type: 'time_out',
    timestamp: new Date(Date.now() - 1 * 3600000).toISOString(),
    photoUrl: '',
    status: 'verified',
  },
]

const formatTimestamp = (value: unknown): string => {
  if (!value) return ''
  if (typeof value === 'string') return new Date(value).toLocaleString()
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().toLocaleString()
  }
  return ''
}

const timestampToDate = (value: unknown): Date | undefined => {
  if (!value) return undefined
  if (typeof value === 'string') return new Date(value)
  return (value as { toDate?: () => Date }).toDate?.()
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('ojtrack_theme')
      if (stored === 'light' || stored === 'dark') return stored
    } catch {}
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('ojtrack_theme', theme)
    } catch {}
  }, [theme])

  const [user, setUser] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedModule, setSelectedModule] = useState(modules[0])
  const [classes, setClasses] = useState<ClassRecord[]>(initialClasses)
  const [students, setStudents] = useState<StudentRecord[]>(initialStudents)
  const [htes, setHtes] = useState<HteRecord[]>(initialHtes)
  const [users, setUsers] = useState<Record<string, UserRecord>>(initialUsers)
  const [coordinators, setCoordinators] = useState<Record<string, UserRecord>>(initialCoordinators)
  const [reports, setReports] = useState<ReportRecord[]>(initialReports)
  const [preOjtDocuments, setPreOjtDocuments] = useState<PreOjtDocumentRecord[]>(initialPreOjtDocuments)
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItemRecord[]>(initialPortfolioItems)
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogRecord[]>(initialAttendanceLogs)
  const [hteEvaluationLinks, setHteEvaluationLinks] = useState<HteEvaluationLinkRecord[]>(initialHteEvaluationLinks)
  const [hteEvaluations, setHteEvaluations] = useState<HteEvaluationRecord[]>(initialHteEvaluations)
  const [generatedHteLink, setGeneratedHteLink] = useState<{ studentId: string; url: string } | null>(null)
  const [classJoinRequests, setClassJoinRequests] = useState<ClassJoinRequestRecord[]>(initialClassJoinRequests)
  const [creatingClass, setCreatingClass] = useState(false)
  const [preferences, setPreferences] = useState<SystemPreferencesRecord>(DEFAULT_PREFERENCES)
  const [savingPreferences, setSavingPreferences] = useState(false)
  const [preferencesSaved, setPreferencesSaved] = useState(false)
  const [notifications, setNotifications] = useState<NotificationRecord[]>(initialNotifications)
  const [activityLogs, setActivityLogs] = useState<ActivityLogRecord[]>([])
  const [dashboardLoading, setDashboardLoading] = useState(true)
  // Set the moment any live listener below errors (most commonly a rules
  // problem) — without this, a failed listener just silently stops updating
  // and every screen reading it looks like "no data" instead of "broken".
  const [syncError, setSyncError] = useState<string | null>(null)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)
  const [openClassId, setOpenClassId] = useState<string | null>(null)
  const [classTab, setClassTab] = useState<ClassTab>('members')
  const [editingClass, setEditingClass] = useState<ClassRecord | null>(null)
  const [assigningHte, setAssigningHte] = useState<StudentRecord | null>(null)
  const [viewingStudent, setViewingStudent] = useState<StudentRecord | null>(null)
  const [studentDetailTab, setStudentDetailTab] = useState<'overview' | 'attendance' | 'reports' | 'documents' | 'portfolio'>(
    'overview',
  )
  const [studentReportTypeFilter, setStudentReportTypeFilter] = useState<'all' | 'daily' | 'weekly' | 'narrative'>('all')
  const [studentAttendancePeriod, setStudentAttendancePeriod] = useState<'week' | 'month' | 'all'>('week')
  const [viewingStudentPhoto, setViewingStudentPhoto] = useState(false)
  const [studentFeedbackMessage, setStudentFeedbackMessage] = useState('')
  const [sendingStudentFeedback, setSendingStudentFeedback] = useState(false)
  const [studentFeedbackSent, setStudentFeedbackSent] = useState(false)
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'present' | 'pending' | 'absent'>('all')
  const [viewingAttendanceDay, setViewingAttendanceDay] = useState<StudentRecord | null>(null)
  const [newHteName, setNewHteName] = useState('')
  const [newHteAddress, setNewHteAddress] = useState('')
  const [newHteSupervisorName, setNewHteSupervisorName] = useState('')
  const [newHteSupervisorEmail, setNewHteSupervisorEmail] = useState('')
  const [newHteSupervisorPhone, setNewHteSupervisorPhone] = useState('')
  const [newHteExpectedTimeIn, setNewHteExpectedTimeIn] = useState('')
  const [editingHte, setEditingHte] = useState<HteRecord | null>(null)
  const [addingHte, setAddingHte] = useState(false)
  const [addHteError, setAddHteError] = useState('')
  const [newCoordinatorName, setNewCoordinatorName] = useState('')
  const [newCoordinatorEmail, setNewCoordinatorEmail] = useState('')
  const [newCoordinatorPassword, setNewCoordinatorPassword] = useState('')
  const [addingCoordinator, setAddingCoordinator] = useState(false)
  const [addCoordinatorError, setAddCoordinatorError] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')
  const [viewingOwnPhoto, setViewingOwnPhoto] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [nameError, setNameError] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          setUser({ ...userDoc.data() as UserRecord, id: firebaseUser.uid })
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!user) {
      setDashboardLoading(false)
      return undefined
    }

    registerPushNotifications(user.id)

    // A listener that errors (most often a rules/permission problem) just
    // stops emitting — without a visible signal, every screen reading its
    // state quietly looks like "no data" instead of "this is broken", which
    // is exactly the failure mode that made past rules bugs hard to spot.
    const onSyncError = (source: string) => (error: Error) => {
      console.error(`Failed to sync ${source}:`, error)
      setSyncError(`Live updates for "${source}" stopped working — ${error.message}. Try refreshing the page.`)
    }

    const classesUnsubscribe = onSnapshot(
      collection(db, 'classes'),
      (snapshot) => {
        const loadedClasses = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<ClassRecord, 'id'>),
        }))
        setClasses(loadedClasses)
      },
      onSyncError('classes'),
    )

    const preferencesUnsubscribe = onSnapshot(
      doc(db, 'settings', 'global'),
      (snap) => {
        if (snap.exists()) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...(snap.data() as Partial<SystemPreferencesRecord>) })
        }
      },
      onSyncError('settings'),
    )

    const studentsUnsubscribe = onSnapshot(
      collection(db, 'students'),
      (snapshot) => {
        const loadedStudents = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<StudentRecord, 'id'>),
        }))
        setStudents(loadedStudents)
      },
      onSyncError('students'),
    )

    const classJoinRequestsUnsubscribe = onSnapshot(
      query(collection(db, 'class_join_requests'), where('status', '==', 'pending')),
      (snapshot) => {
        const loadedRequests = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ClassJoinRequestRecord, 'id'>),
        }))
        setClassJoinRequests(loadedRequests)
      },
      onSyncError('join requests'),
    )

    const htesUnsubscribe = onSnapshot(
      collection(db, 'htes'),
      (snapshot) => {
        const loadedHtes = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<HteRecord, 'id'>),
        }))
        setHtes(loadedHtes)
      },
      onSyncError('HTEs'),
    )

    const usersUnsubscribe = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'student')),
      (snapshot) => {
        const loadedUsers: Record<string, UserRecord> = {}
        snapshot.docs.forEach((docSnap) => {
          loadedUsers[docSnap.id] = { id: docSnap.id, ...(docSnap.data() as Omit<UserRecord, 'id'>) }
        })
        setUsers(loadedUsers)
      },
      onSyncError('students'),
    )

    const coordinatorsUnsubscribe = onSnapshot(
      query(collection(db, 'users'), where('role', 'in', ['coordinator', 'admin'])),
      (snapshot) => {
        const loadedCoordinators: Record<string, UserRecord> = {}
        snapshot.docs.forEach((docSnap) => {
          loadedCoordinators[docSnap.id] = { id: docSnap.id, ...(docSnap.data() as Omit<UserRecord, 'id'>) }
        })
        setCoordinators(loadedCoordinators)
      },
      onSyncError('coordinators'),
    )

    const reportsUnsubscribe = onSnapshot(
      collection(db, 'reports'),
      (snapshot) => {
        const loadedReports = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ReportRecord, 'id'>),
        }))
        setReports(loadedReports)
      },
      onSyncError('reports'),
    )

    const documentsUnsubscribe = onSnapshot(
      collection(db, 'pre_ojt_documents'),
      (snapshot) => {
        const loadedDocuments = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PreOjtDocumentRecord, 'id'>),
        }))
        setPreOjtDocuments(loadedDocuments)
      },
      onSyncError('documents'),
    )

    const portfolioUnsubscribe = onSnapshot(
      collection(db, 'portfolio_items'),
      (snapshot) => {
        const loadedPortfolioItems = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<PortfolioItemRecord, 'id'>),
        }))
        setPortfolioItems(loadedPortfolioItems)
      },
      onSyncError('portfolio'),
    )

    const attendanceUnsubscribe = onSnapshot(
      collection(db, 'attendance_logs'),
      (snapshot) => {
        const loadedLogs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<AttendanceLogRecord, 'id'>),
        }))
        setAttendanceLogs(loadedLogs)
      },
      onSyncError('attendance'),
    )

    const hteLinksUnsubscribe = onSnapshot(
      collection(db, 'hte_evaluation_links'),
      (snapshot) => {
        const loadedLinks = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<HteEvaluationLinkRecord, 'id'>),
        }))
        setHteEvaluationLinks(loadedLinks)
      },
      onSyncError('HTE evaluation links'),
    )

    const hteEvaluationsUnsubscribe = onSnapshot(
      collection(db, 'hte_evaluations'),
      (snapshot) => {
        const loadedEvaluations = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<HteEvaluationRecord, 'id'>),
        }))
        setHteEvaluations(loadedEvaluations)
      },
      onSyncError('HTE evaluations'),
    )

    const notificationsUnsubscribe = onSnapshot(
      query(collection(db, 'notifications'), where('recipientId', '==', user.id)),
      (snapshot) => {
        const loadedNotifications = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<NotificationRecord, 'id'>),
        }))
        setNotifications(loadedNotifications)
      },
      onSyncError('notifications'),
    )

    const activityLogUnsubscribe = onSnapshot(
      query(collection(db, 'activity_logs'), orderBy('createdAt', 'desc'), limit(200)),
      (snapshot) => {
        const loadedActivityLogs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<ActivityLogRecord, 'id'>),
        }))
        setActivityLogs(loadedActivityLogs)
      },
      onSyncError('activity log'),
    )

    setDashboardLoading(false)
    return () => {
      classesUnsubscribe()
      preferencesUnsubscribe()
      studentsUnsubscribe()
      classJoinRequestsUnsubscribe()
      htesUnsubscribe()
      usersUnsubscribe()
      coordinatorsUnsubscribe()
      reportsUnsubscribe()
      documentsUnsubscribe()
      portfolioUnsubscribe()
      attendanceUnsubscribe()
      hteLinksUnsubscribe()
      hteEvaluationsUnsubscribe()
      notificationsUnsubscribe()
      activityLogUnsubscribe()
    }
  }, [user])

  const unassignedHteCount = useMemo(() => students.filter((s) => !s.assignedHteId).length, [students])

  const systemActivityLog = useMemo(() => {
    const items: { id: string; icon: string; text: string; time: number }[] = []

    reports.forEach((r) => {
      const time = new Date(formatTimestamp(r.submittedAt) || 0).getTime()
      if (!time) return
      const name = users[r.studentId]?.displayName || users[r.studentId]?.studentIdCode || 'A student'
      items.push({ id: `report-${r.id}`, icon: '📄', text: `${name} submitted a ${r.type} report.`, time })
      if (r.status !== 'pending') {
        items.push({
          id: `report-status-${r.id}`,
          icon: r.status === 'approved' ? '✅' : '❌',
          text: `${name}'s ${r.type} report was ${r.status}.`,
          time: time + 1,
        })
      }
    })

    attendanceLogs.forEach((log) => {
      const time = new Date(formatTimestamp(log.timestamp) || 0).getTime()
      if (!time) return
      const name = users[log.studentId]?.displayName || users[log.studentId]?.studentIdCode || 'A student'
      const action = log.type === 'time_in' ? 'time-in' : 'time-out'
      items.push(
        log.status === 'flagged'
          ? { id: `log-${log.id}`, icon: '⚠️', text: `${name}'s ${action} log was flagged for review.`, time }
          : { id: `log-${log.id}`, icon: '🕒', text: `${name} logged a ${action}.`, time },
      )
    })

    hteEvaluations.forEach((ev) => {
      const time = new Date(formatTimestamp(ev.submittedAt) || 0).getTime()
      if (!time) return
      const name = users[ev.studentId]?.displayName || users[ev.studentId]?.studentIdCode || 'A student'
      items.push({ id: `eval-${ev.id}`, icon: '🔗', text: `HTE evaluation submitted for ${name}.`, time })
    })

    students.forEach((s) => {
      if (s.completionStatus !== 'completed' || !s.completedAt) return
      const time = new Date(s.completedAt).getTime()
      if (!time) return
      const name = users[s.userId]?.displayName || users[s.userId]?.studentIdCode || 'A student'
      items.push({ id: `completed-${s.id}`, icon: '🎓', text: `${name}'s internship was marked complete.`, time })
    })

    return items.sort((a, b) => b.time - a.time)
  }, [reports, attendanceLogs, hteEvaluations, students, users])

  const recentActivity = useMemo(() => systemActivityLog.slice(0, 5), [systemActivityLog])

  const totalInterns = students.length
  const pendingReviewsCount =
    reports.filter((r) => r.status === 'pending').length + preOjtDocuments.filter((d) => d.status === 'pending').length
  const attendanceCompliance = students.length
    ? Math.round(
        (students.reduce((sum, student) => sum + student.renderedHours, 0) /
          students.reduce((sum, student) => sum + student.requiredHours, 0)) *
          100,
      )
    : 0
  const liveUpdatesActive = !dashboardLoading

  /**
   * Writes one immutable entry to the Activity Log (System Administration).
   * Fire-and-forget — a logging failure shouldn't block the action it's
   * describing, so errors are swallowed rather than surfaced to the coordinator.
   */
  const logActivity = (action: string, details: string) => {
    if (!user) return
    addDoc(collection(db, 'activity_logs'), {
      actorId: user.id,
      actorName: user.displayName,
      action,
      details,
      createdAt: new Date().toISOString(),
    }).catch((error) => console.error('Failed to write activity log:', error))
  }

  /** A free-text note from the coordinator, distinct from the automated absence/status notifications. */
  const sendFeedbackToStudent = async (studentId: string, message: string) => {
    const trimmed = message.trim()
    if (!user || !trimmed) return
    const context = classes.find((c) => c.id === students.find((s) => s.userId === studentId)?.classId)
    await addDoc(collection(db, 'notifications'), {
      recipientId: studentId,
      type: 'coordinator_feedback',
      message: trimmed,
      read: false,
      createdAt: new Date().toISOString(),
      ...(context ? { classId: context.id } : {}),
      studentId,
    })
    logActivity('feedback_sent', `Sent feedback to ${users[studentId]?.displayName || studentId}: "${trimmed}"`)
  }

  const addClass = async (input: { name: string; schoolYear: string; term: string; requiredHours: number }) => {
    const joinCode = await generateUniqueJoinCode()
    await addDoc(collection(db, 'classes'), {
      ...input,
      coordinatorId: user?.id || 'unknown',
      joinCode,
    })
    logActivity('class_created', `Created class "${input.name}" (${input.schoolYear}, ${input.term}).`)
  }

  const respondToJoinRequest = async (
    request: ClassJoinRequestRecord,
    decision: 'approved' | 'rejected',
  ) => {
    const classItem = classes.find((c) => c.id === request.classId)

    setClassJoinRequests((current) => current.filter((r) => r.id !== request.id))
    if (decision === 'approved' && classItem) {
      setStudents((current) => [
        ...current,
        { id: request.studentUid, userId: request.studentUid, classId: request.classId, requiredHours: classItem.requiredHours, renderedHours: 0 },
      ])
    }

    if (user) {
      try {
        if (decision === 'approved' && classItem) {
          await setDoc(doc(db, 'students', request.studentUid), {
            userId: request.studentUid,
            classId: request.classId,
            requiredHours: classItem.requiredHours,
            renderedHours: 0,
          })
        }
        await updateDoc(doc(db, 'class_join_requests', request.id), {
          status: decision,
          respondedAt: new Date().toISOString(),
          respondedBy: user.id,
        })
        logActivity(
          `join_request_${decision}`,
          `${decision === 'approved' ? 'Approved' : 'Rejected'} ${request.studentName}'s request to join ${classItem?.name || 'a class'}.`,
        )
      } catch (error) {
        console.error('Failed to respond to join request:', error)
      }
    }
    await markStudentNotificationsRead(request.studentUid, ['class_join_request'])
  }

  const updateClass = async (
    classId: string,
    updates: { name: string; schoolYear: string; term: string; requiredHours: number },
  ) => {
    setClasses((current) => current.map((c) => (c.id === classId ? { ...c, ...updates } : c)))
    if (user) {
      try {
        await updateDoc(doc(db, 'classes', classId), updates)
        logActivity('class_updated', `Updated class "${updates.name}".`)
      } catch (error) {
        console.error('Failed to update class:', error)
      }
    }
    setEditingClass(null)
  }

  const deleteClass = async (classId: string) => {
    const affectedStudents = students.filter((s) => s.classId === classId)
    const className = classes.find((c) => c.id === classId)?.name || classId

    setStudents((current) => current.map((s) => (s.classId === classId ? { ...s, classId: '' } : s)))
    setClasses((current) => current.filter((c) => c.id !== classId))

    if (user) {
      try {
        await Promise.all(
          affectedStudents.map((s) => updateDoc(doc(db, 'students', s.id), { classId: '' })),
        )
        await deleteDoc(doc(db, 'classes', classId))
        logActivity('class_deleted', `Deleted class "${className}" (${affectedStudents.length} student(s) unassigned).`)
      } catch (error) {
        console.error('Failed to delete class:', error)
      }
    }
    setEditingClass(null)
  }

  const updateReportStatus = async (reportId: string, status: 'approved' | 'rejected') => {
    const report = reports.find((r) => r.id === reportId)
    setReports((current) => current.map((r) => (r.id === reportId ? { ...r, status } : r)))
    if (user) {
      try {
        await updateDoc(doc(db, 'reports', reportId), { status })
        const name = report ? users[report.studentId]?.displayName || report.studentId : reportId
        logActivity(`report_${status}`, `${status === 'approved' ? 'Approved' : 'Rejected'} ${name}'s ${report?.type || ''} report.`)
      } catch (error) {
        console.error('Failed to update report status:', error)
      }
    }
    if (report) await markStudentNotificationsRead(report.studentId, ['report'])
  }

  const updateDocumentStatus = async (documentId: string, status: 'approved' | 'rejected') => {
    const document = preOjtDocuments.find((d) => d.id === documentId)
    setPreOjtDocuments((current) => current.map((d) => (d.id === documentId ? { ...d, status } : d)))
    if (user) {
      try {
        await updateDoc(doc(db, 'pre_ojt_documents', documentId), { status })
        const name = document ? users[document.studentId]?.displayName || document.studentId : documentId
        logActivity(
          `document_${status}`,
          `${status === 'approved' ? 'Approved' : 'Rejected'} ${name}'s ${document?.docType || ''} document.`,
        )
      } catch (error) {
        console.error('Failed to update document status:', error)
      }
    }
    if (document) await markStudentNotificationsRead(document.studentId, ['document'])
  }

  const updatePortfolioItemStatus = async (itemId: string, status: 'approved' | 'rejected', coordinatorNote?: string) => {
    const item = portfolioItems.find((i) => i.id === itemId)
    setPortfolioItems((current) =>
      current.map((i) => (i.id === itemId ? { ...i, status, ...(coordinatorNote ? { coordinatorNote } : {}) } : i)),
    )
    if (user) {
      try {
        await updateDoc(doc(db, 'portfolio_items', itemId), {
          status,
          ...(coordinatorNote ? { coordinatorNote } : {}),
        })
        const name = item ? users[item.studentId]?.displayName || item.studentId : itemId
        logActivity(
          `portfolio_${status}`,
          `${status === 'approved' ? 'Approved' : 'Rejected'} ${name}'s portfolio item "${item?.title || ''}".`,
        )
      } catch (error) {
        console.error('Failed to update portfolio item status:', error)
      }
    }
    if (item) await markStudentNotificationsRead(item.studentId, ['portfolio'])
  }

  const markStudentCompleted = async (studentId: string) => {
    const completedAt = new Date().toISOString()
    setStudents((current) =>
      current.map((s) => (s.id === studentId ? { ...s, completionStatus: 'completed', completedAt } : s)),
    )
    if (user) {
      try {
        await updateDoc(doc(db, 'students', studentId), { completionStatus: 'completed', completedAt })
        logActivity('student_completed', `Marked ${users[studentId]?.displayName || studentId}'s internship as complete.`)
      } catch (error) {
        console.error('Failed to mark student completed:', error)
      }
    }
  }

  const reopenStudentInternship = async (studentId: string) => {
    setStudents((current) =>
      current.map((s) => (s.id === studentId ? { ...s, completionStatus: 'in_progress' } : s)),
    )
    if (user) {
      try {
        await updateDoc(doc(db, 'students', studentId), { completionStatus: 'in_progress' })
        logActivity('student_reopened', `Reopened ${users[studentId]?.displayName || studentId}'s internship.`)
      } catch (error) {
        console.error('Failed to reopen internship:', error)
      }
    }
  }

  const markAllNotificationsRead = async () => {
    const unread = notifications.filter((n) => !n.read)
    setNotifications((current) => current.map((n) => ({ ...n, read: true })))
    if (user) {
      try {
        await Promise.all(unread.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true })))
      } catch (error) {
        console.error('Failed to mark all notifications read:', error)
      }
    }
  }

  /**
   * Clears the notify dot next to a student's name (see renderClassMembersTab
   * / renderClassAttendanceTab) once the coordinator has acted on whatever
   * triggered it — or immediately, if they click the dot itself.
   */
  const markStudentNotificationsRead = async (studentId: string, types: string[]) => {
    const matching = notifications.filter((n) => !n.read && n.studentId === studentId && types.includes(n.type))
    if (matching.length === 0) return
    setNotifications((current) =>
      current.map((n) => (matching.some((m) => m.id === n.id) ? { ...n, read: true } : n)),
    )
    if (user) {
      try {
        await Promise.all(matching.map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true })))
      } catch (error) {
        console.error('Failed to mark student notifications read:', error)
      }
    }
  }

  const openClass = (classId: string, tab: ClassTab = 'members') => {
    setSelectedModule('Class Management')
    setOpenClassId(classId)
    setClassTab(tab)
  }

  const generateHteEvaluationLink = async (studentId: string) => {
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    const url = `${window.location.origin}${window.location.pathname}?evaluate=${token}`

    try {
      await addDoc(collection(db, 'hte_evaluation_links'), { studentId, token, expiresAt, submitted: false })
    } catch (error) {
      console.error('Failed to generate evaluation link:', error)
      return
    }
    setGeneratedHteLink({ studentId, url })
  }

  const updateAttendanceLogStatus = async (logId: string, status: 'verified' | 'flagged') => {
    const log = attendanceLogs.find((l) => l.id === logId)
    setAttendanceLogs((current) => current.map((log) => (log.id === logId ? { ...log, status } : log)))
    if (user) {
      try {
        await updateDoc(doc(db, 'attendance_logs', logId), { status })
        const name = log ? users[log.studentId]?.displayName || log.studentId : logId
        logActivity(`attendance_${status}`, `${status === 'verified' ? 'Verified' : 'Flagged'} ${name}'s ${log?.type || ''} log.`)
      } catch (error) {
        console.error('Failed to update attendance log status:', error)
      }
    }
    if (log) await markStudentNotificationsRead(log.studentId, ['attendance', 'attendance_error'])
  }

  /**
   * Only ever called on a still-pending log (AttendancePhotoModal only offers
   * this while status === 'pending') — so students/{id}.renderedHours has
   * nothing to reconcile yet; re-verifying afterward credits hours off the
   * freshly recomputed computedHours below, same as any normal verification.
   */
  const correctAttendanceLogTime = async (log: AttendanceLogRecord, newTimestamp: Date, reason: string) => {
    const newTs = Timestamp.fromDate(newTimestamp)
    const updates: Record<string, unknown> = {
      timestamp: newTs,
      lastTimeCorrection: {
        previousTimestamp: log.timestamp,
        newTimestamp: newTs,
        reason,
        correctedBy: user?.id || 'unknown',
        correctedAt: new Date().toISOString(),
      },
    }

    if (log.type === 'time_in') {
      const student = students.find((s) => s.userId === log.studentId)
      const hte = student?.assignedHteId ? htes.find((h) => h.id === student.assignedHteId) : undefined
      updates.late = isLate(newTimestamp, hte?.expectedTimeIn, preferences.lateThresholdMinutes)
    }

    if (log.pairedWithLogId) {
      const pairedSnap = await getDoc(doc(db, 'attendance_logs', log.pairedWithLogId))
      const pairedTimestamp = pairedSnap.data()?.timestamp
      const pairedDate = timestampToDate(pairedTimestamp)
      if (pairedDate) {
        const timeIn = log.type === 'time_in' ? newTimestamp : pairedDate
        const timeOut = log.type === 'time_out' ? newTimestamp : pairedDate
        const hours = (timeOut.getTime() - timeIn.getTime()) / (1000 * 60 * 60)
        const computedHours = hours > 0 && hours <= 16 ? Math.round(hours * 100) / 100 : undefined
        if (log.type === 'time_out') {
          updates.computedHours = computedHours ?? deleteField()
        } else {
          await updateDoc(doc(db, 'attendance_logs', log.pairedWithLogId), { computedHours: computedHours ?? deleteField() })
        }
      }
    }

    await updateDoc(doc(db, 'attendance_logs', log.id), updates)
    logActivity(
      'attendance_time_corrected',
      `Corrected ${users[log.studentId]?.displayName || log.studentId}'s ${log.type} log to ${newTimestamp.toLocaleString()}. Reason: ${reason}`,
    )
  }

  const removeStudentFromClass = async (student: StudentRecord) => {
    setStudents((current) =>
      current.map((s) => (s.id === student.id ? { ...s, classId: '' } : s)),
    )
    if (user) {
      try {
        await updateDoc(doc(db, 'students', student.id), { classId: '' })
        logActivity('student_removed', `Removed ${users[student.userId]?.displayName || student.userId} from their class.`)
      } catch (error) {
        console.error('Failed to remove student from class:', error)
      }
    }
  }

  const addHte = async (payload: Omit<HteRecord, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, 'htes'), payload)
    logActivity('hte_enrolled', `Enrolled HTE "${payload.name}".`)
    return docRef.id
  }

  const updateHte = async (
    hteId: string,
    updates: {
      name: string
      address: string
      supervisorName: string
      supervisorEmail: string
      supervisorPhone: string
      expectedTimeIn?: string
    },
  ) => {
    const { expectedTimeIn, ...rest } = updates
    await updateDoc(doc(db, 'htes', hteId), {
      ...rest,
      expectedTimeIn: expectedTimeIn || deleteField(),
    })
    logActivity('hte_updated', `Updated HTE "${updates.name}".`)
    setEditingHte(null)
  }

  const assignStudentHte = async (studentId: string, hteId: string) => {
    setStudents((current) =>
      current.map((s) => (s.id === studentId ? { ...s, assignedHteId: hteId } : s)),
    )
    if (user) {
      try {
        await updateDoc(doc(db, 'students', studentId), { assignedHteId: hteId })
        logActivity(
          'hte_assigned',
          `Assigned ${users[studentId]?.displayName || studentId} to ${htes.find((h) => h.id === hteId)?.name || hteId}.`,
        )
      } catch (error) {
        console.error('Failed to assign HTE:', error)
      }
    }
  }

  const addCoordinatorAccount = async (fullName: string, email: string, password: string) => {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedName = fullName.trim()
    if (!trimmedName || !trimmedEmail || !password) {
      throw new Error('Enter a name, email, and temporary password.')
    }
    const taken = Object.values(coordinators).some((c) => c.email.toLowerCase() === trimmedEmail)
    if (taken) {
      throw new Error('An account with this email already exists.')
    }

    const uid = await createCoordinatorAccount(trimmedEmail, password)
    await setDoc(doc(db, 'users', uid), {
      email: trimmedEmail,
      displayName: trimmedName,
      role: 'coordinator',
      createdAt: new Date().toISOString(),
    })
    logActivity('coordinator_created', `Created coordinator account for ${trimmedName} (${trimmedEmail}).`)
  }


  const saveHoursCorrection = async (newRequiredHours: number, newRenderedHours: number, reason: string) => {
    if (!editingStudent) return
    const previousRequiredHours = editingStudent.requiredHours
    const previousRenderedHours = editingStudent.renderedHours
    setStudents((current) =>
      current.map((student) =>
        student.id === editingStudent.id
          ? { ...student, requiredHours: newRequiredHours, renderedHours: newRenderedHours }
          : student,
      ),
    )

    if (user) {
      try {
        await updateDoc(doc(db, 'students', editingStudent.id), {
          requiredHours: newRequiredHours,
          renderedHours: newRenderedHours,
          lastHoursCorrection: {
            previousRequiredHours,
            newRequiredHours,
            previousRenderedHours,
            newRenderedHours,
            reason,
            correctedBy: user.id,
            correctedAt: new Date().toISOString(),
          },
        })
        logActivity(
          'hours_corrected',
          `Corrected ${users[editingStudent.userId]?.displayName || editingStudent.userId}'s hours to ${newRenderedHours}/${newRequiredHours}. Reason: ${reason}`,
        )
      } catch (error) {
        console.error('Failed to save hours correction:', error)
      }
    }

    setEditingStudent(null)
  }

  const sippReportRows = () =>
    students.map((s) => {
      const cls = classes.find((c) => c.id === s.classId)
      const hte = htes.find((h) => h.id === s.assignedHteId)
      return {
        studentId: users[s.userId]?.studentIdCode || s.userId,
        name: users[s.userId]?.displayName || '',
        classAndYear: `${cls?.name || 'Unassigned'} — ${cls?.schoolYear || ''} ${cls?.term || ''}`.trim(),
        hteName: hte?.name || 'Not assigned',
        hteAddress: hte?.address || '',
        supervisorName: hte?.supervisorName || '',
        supervisorContact: [hte?.supervisorEmail, hte?.supervisorPhone].filter(Boolean).join(' / '),
        requiredHours: s.requiredHours,
        renderedHours: s.renderedHours,
        status: s.completionStatus === 'completed' ? 'Completed' : 'In Progress',
        completedAt: s.completedAt ? new Date(s.completedAt).toLocaleDateString() : '',
      }
    })

  const exportCsv = () => {
    const header = [
      'Student ID',
      'Name',
      'Class / School Year / Term',
      'HTE Name',
      'HTE Address',
      'Supervisor Name',
      'Supervisor Contact',
      'Required Hours',
      'Rendered Hours',
      'Status',
      'Completion Date',
    ]
    const rows = sippReportRows().map((r) => [
      r.studentId,
      r.name,
      r.classAndYear,
      r.hteName,
      r.hteAddress,
      r.supervisorName,
      r.supervisorContact,
      String(r.requiredHours),
      String(r.renderedHours),
      r.status,
      r.completedAt,
    ])
    const csvContent = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ojtrack-sipp-report-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportPdf = () => {
    const rows = sippReportRows()
      .map(
        (r) => `<tr>
          <td>${r.studentId}</td>
          <td>${r.name}</td>
          <td>${r.classAndYear}</td>
          <td>${r.hteName}${r.hteAddress ? `<br><span class="muted">${r.hteAddress}</span>` : ''}</td>
          <td>${r.supervisorName}${r.supervisorContact ? `<br><span class="muted">${r.supervisorContact}</span>` : ''}</td>
          <td>${r.renderedHours} / ${r.requiredHours}</td>
          <td>${r.status}${r.completedAt ? `<br><span class="muted">${r.completedAt}</span>` : ''}</td>
        </tr>`,
      )
      .join('')

    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <html>
        <head>
          <title>OJTrack SIPP Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { font-size: 18px; margin-bottom: 2px; }
            .muted { color: #64748b; font-size: 10.5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; vertical-align: top; }
            th { background: #eff6ff; }
            .signature-row { display: flex; justify-content: space-between; margin-top: 64px; }
            .signature-block { width: 45%; text-align: center; }
            .signature-line { border-top: 1px solid #0f172a; margin-top: 40px; padding-top: 6px; font-size: 11px; }
          </style>
        </head>
        <body>
          <h1>OJTrack — Student Internship Placement Program (SIPP) Report</h1>
          <p>College of Engineering, Architecture and Computing, Notre Dame of Marbel University</p>
          <p class="muted">Generated ${new Date().toLocaleString()} by ${user?.displayName || 'Coordinator'}</p>
          <table>
            <thead>
              <tr>
                <th>Student ID</th><th>Name</th><th>Class / SY / Term</th><th>Host Training Establishment</th>
                <th>Supervisor</th><th>Hours</th><th>Status</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="signature-row">
            <div class="signature-block">
              <div class="signature-line">Prepared by: ${user?.displayName || 'OJT Coordinator'}</div>
            </div>
            <div class="signature-block">
              <div class="signature-line">Noted by: Department Chairperson / Dean</div>
            </div>
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const renderDashboard = () => {
    const hoursData: BarChartDatum[] = students
      .slice()
      .sort((a, b) => b.renderedHours - a.renderedHours)
      .slice(0, 8)
      .map((s) => ({
        label: (users[s.userId]?.displayName || 'Student').split(' ')[0],
        value: s.renderedHours,
        color: 'var(--primary)',
        displayValue: `${s.renderedHours}h`,
      }))

    const complianceByClass: BarChartDatum[] = classes.map((c) => {
      const classStudents = students.filter((s) => s.classId === c.id)
      const avgPct = classStudents.length
        ? Math.round(
            classStudents.reduce(
              (sum, s) => sum + (s.requiredHours > 0 ? Math.min(100, (s.renderedHours / s.requiredHours) * 100) : 0),
              0,
            ) / classStudents.length,
          )
        : 0
      const color = avgPct >= 80 ? 'var(--success)' : avgPct >= 50 ? 'var(--warning)' : 'var(--danger)'
      return { label: c.name, value: avgPct, color, displayValue: `${avgPct}%` }
    })

    const atRiskStudents = students
      .map((student) => ({ student, tier: getComplianceTier(student) }))
      .filter(({ tier }) => tier.label !== 'Active')
      .sort((a, b) => a.tier.pct - b.tier.pct)
      .slice(0, 5)

    return (
      <>
        <div className="stat-tile-grid">
          <div className="stat-tile">
            <div className="stat-tile-icon" style={{ background: 'var(--primary-light)', color: 'var(--primary-dark)' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M3.5 19c0-3 2.5-5.2 5.5-5.2s5.5 2.2 5.5 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M15.5 6.5a3 3 0 010 5.8M18 19c0-2.4-1.6-4.4-3.8-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <span className="stat-tile-label">Total Interns</span>
              <p className="stat-tile-value">{totalInterns}</p>
              <span className="stat-tile-caption">{classes.length} class{classes.length === 1 ? '' : 'es'} active</span>
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-icon" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="5" y="3.5" width="14" height="17" rx="1.6" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8.5 8.5H15.5M8.5 12H15.5M8.5 15.5H12.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <span className="stat-tile-label">Pending Reviews</span>
              <p className="stat-tile-value">{pendingReviewsCount}</p>
              <span className="stat-tile-caption">Reports &amp; documents</span>
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-icon" style={{ background: 'rgba(22,163,74,0.14)', color: 'var(--success)' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 16L9.5 10L13.5 14L20 6.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M14.5 6.5H20V12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <span className="stat-tile-label">Attendance Compliance</span>
              <p className="stat-tile-value">{attendanceCompliance}%</p>
              <span className="stat-tile-caption">Avg. across all classes</span>
            </div>
          </div>
          <div className="stat-tile">
            <div className="stat-tile-icon" style={{ background: 'rgba(220,38,38,0.12)', color: 'var(--danger)' }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="4.5" y="7" width="11" height="13" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M15.5 20V4.5C15.5 3.9 15 3.5 14.5 3.5H8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M19.5 20V10.5C19.5 9.9 19 9.5 18.5 9.5H15.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <span className="stat-tile-label">Unassigned HTE</span>
              <p className="stat-tile-value">{unassignedHteCount}</p>
              <span className="stat-tile-caption">Needs HTE assignment</span>
            </div>
          </div>
        </div>

        <div className="chart-row">
          <div className="chart-card">
            <h3>Hours Rendered</h3>
            <p>Highest logged hours across all interns.</p>
            {hoursData.length === 0 ? (
              <EmptyState title="No hours logged yet" subtitle="Rendered hours will show up here once interns start logging attendance." />
            ) : (
              <SimpleBarChart data={hoursData} />
            )}
          </div>
          <div className="chart-card">
            <h3>Compliance by Class</h3>
            <p>Average hours compliance per class.</p>
            {complianceByClass.length === 0 ? (
              <EmptyState title="No classes yet" subtitle="Create a class to start tracking compliance." />
            ) : (
              <SimpleBarChart data={complianceByClass} maxValue={100} />
            )}
          </div>
        </div>

        <div className="module-row">
          <div className="report-card">
            <h3>Recent activity</h3>
            {recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" subtitle="Student submissions and attendance events will show up here." />
            ) : (
              <ul className="activity-list">
                {recentActivity.map((item) => (
                  <li className="activity-item" key={item.id}>
                    <span className={`activity-dot${item.icon === '⚠️' || item.icon === '❌' ? ' activity-dot-danger' : ''}`} />
                    <p className="activity-text">{item.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="report-card">
            <h3>Students at risk</h3>
            {atRiskStudents.length === 0 ? (
              <EmptyState title="No students at risk" subtitle="Everyone is compliant with their required hours." />
            ) : (
              <div className="at-risk-list">
                {atRiskStudents.map(({ student, tier }) => {
                  const name = users[student.userId]?.displayName || 'Unnamed student'
                  const color = avatarColor(student.userId)
                  return (
                    <button className="at-risk-row" key={student.id} onClick={() => setViewingStudent(student)}>
                      <span className="review-item-avatar" style={{ background: color.bg, color: color.fg }}>
                        {initials(name)}
                      </span>
                      <span className="at-risk-info">
                        <strong>{name}</strong>
                        <span style={{ color: tier.color }}>{tier.pct}% compliance</span>
                      </span>
                      <span className="at-risk-chevron">›</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  const renderClassManagement = () => {
    if (openClassId) {
      const classItem = classes.find((c) => c.id === openClassId)
      if (!classItem) {
        setOpenClassId(null)
        return null
      }
      return renderClassDetail(classItem)
    }

    return (
      <div className="class-card-grid">
        {classes.map((item) => {
          const style = classCardStyle(item.id)
          const studentCount = students.filter((s) => s.classId === item.id).length
          const pendingCount = classJoinRequests.filter((r) => r.classId === item.id).length
          return (
            <button key={item.id} className="class-card" onClick={() => openClass(item.id)}>
              {pendingCount > 0 && <span className="class-card-pending-badge">{pendingCount} pending</span>}
              <div className="class-card-banner" style={{ background: style.bg, color: style.fg }}>
                <span className="class-card-icon">{style.icon}</span>
              </div>
              <div className="class-card-body">
                <h4>{item.name}</h4>
                <p>{item.term} · {item.schoolYear}</p>
                <div className="class-card-meta">
                  <span>{studentCount} student{studentCount === 1 ? '' : 's'}</span>
                  <span
                    className="join-code-pill"
                    title="Class join code"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigator.clipboard?.writeText(item.joinCode)
                    }}
                  >
                    {item.joinCode}
                  </span>
                </div>
              </div>
              <div className="class-card-actions">
                <span
                  className="class-card-edit"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingClass(item)
                  }}
                >
                  Edit
                </span>
              </div>
            </button>
          )
        })}
        <button className="class-card class-card-create" onClick={() => setCreatingClass(true)}>
          <span className="class-card-create-icon">+</span>
          <span>Create class</span>
        </button>
      </div>
    )
  }

  const hasUnreadForStudent = (classId: string, studentUserId: string) =>
    notifications.some((n) => !n.read && n.classId === classId && n.studentId === studentUserId)

  /** Opens a student's full-page profile, reset to a clean tab/filter state each time. */
  const openStudent = (student: StudentRecord) => {
    setStudentDetailTab('overview')
    setStudentReportTypeFilter('all')
    setStudentAttendancePeriod('week')
    setViewingStudentPhoto(false)
    setStudentFeedbackMessage('')
    setStudentFeedbackSent(false)
    setViewingStudent(student)
  }

  /** Same thresholds the student detail page reads (tierFor in renderStudentDetail). */
  const getComplianceTier = (student: StudentRecord) => {
    const pct = student.requiredHours > 0 ? Math.round((student.renderedHours / student.requiredHours) * 100) : 0
    if (pct >= 80) return { pct, label: 'Active', pillClass: 'status-pill-success', color: 'var(--success)' }
    if (pct >= 50) return { pct, label: 'Warning', pillClass: 'status-pill-warning', color: 'var(--warning)' }
    return { pct, label: 'At Risk', pillClass: 'status-pill-danger', color: 'var(--danger)' }
  }

  const renderClassDetail = (classItem: ClassRecord) => {
    if (viewingStudent) return renderStudentDetail(viewingStudent)
    const classStudents = students.filter((s) => s.classId === classItem.id)
    const tabs: { key: ClassTab; label: string }[] = [
      { key: 'members', label: 'Members' },
      { key: 'attendance', label: 'Attendance & Compliance' },
      { key: 'reports', label: 'Reports & Documents' },
      { key: 'portfolio', label: 'Portfolio' },
    ]

    return (
      <div className="class-detail">
        <div className="class-detail-header">
          <button className="class-detail-back" onClick={() => setOpenClassId(null)}>
            ← All classes
          </button>
          <div className="class-detail-heading">
            <h2>{classItem.name}</h2>
            <p>
              {classItem.term} · {classItem.schoolYear} · {classStudents.length} student
              {classStudents.length === 1 ? '' : 's'} · Join code:{' '}
              <span
                className="join-code-pill"
                title="Copy join code"
                onClick={() => navigator.clipboard?.writeText(classItem.joinCode)}
              >
                {classItem.joinCode}
              </span>
            </p>
          </div>
        </div>
        <div className="class-tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={classTab === tab.key ? 'class-tab-button active' : 'class-tab-button'}
              onClick={() => setClassTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {classTab === 'members' && renderClassMembersTab(classItem, classStudents)}
        {classTab === 'attendance' && renderClassAttendanceTab(classItem, classStudents)}
        {classTab === 'reports' && renderClassReportsTab(classStudents)}
        {classTab === 'portfolio' && renderClassPortfolioTab(classStudents)}
      </div>
    )
  }

  const renderClassMembersTab = (classItem: ClassRecord, classStudents: StudentRecord[]) => {
    const pendingRequests = classJoinRequests.filter((r) => r.classId === classItem.id)
    const unassignedCount = classStudents.filter((s) => !s.assignedHteId).length

    return (
      <section className="module-card">
        {pendingRequests.length > 0 && (
            <>
              <h3>Pending join requests</h3>
              <div className="review-list">
                {pendingRequests.map((request) => (
                  <div className="review-item" key={request.id}>
                    <div className="review-item-header">
                      <div>
                        <strong>{request.studentName}</strong>
                        <span className="review-meta no-capitalize">{request.studentEmail}</span>
                      </div>
                      <span className="status-badge status-pending">pending</span>
                    </div>
                    <div className="review-actions">
                      <button className="secondary-button" onClick={() => respondToJoinRequest(request, 'rejected')}>
                        Reject
                      </button>
                      <button className="primary-button" onClick={() => respondToJoinRequest(request, 'approved')}>
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="roster-divider" />
            </>
          )}

          <h3>Members</h3>
          {classStudents.length === 0 ? (
            <EmptyState
              title="No students yet"
              subtitle={`Share the join code (${classItem.joinCode}) with your students — they'll request to join from the app.`}
            />
          ) : (
            <div className="table-wrap">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>HTE</th>
                    <th>Rendered Hrs</th>
                    <th>Compliance</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student) => {
                    const assignedHte = htes.find((h) => h.id === student.assignedHteId)
                    const studentUser = users[student.userId]
                    const name = studentUser?.displayName || 'Unnamed student'
                    const tier = getComplianceTier(student)
                    return (
                      <tr key={student.id} className="member-row" onClick={() => openStudent(student)}>
                        <td>
                          <span className="member-id-cell">
                            <Avatar name={name} photoUrl={studentUser?.photoUrl} seed={student.userId} size={32} />
                            <span className="mono">{studentUser?.studentIdCode || studentUser?.email || student.userId}</span>
                          </span>
                        </td>
                        <td>
                          <span className="member-name-cell member-name-link">
                            {name}
                            {hasUnreadForStudent(classItem.id, student.userId) && (
                              <span
                                className="notify-dot"
                                title="New activity from this student"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markStudentNotificationsRead(student.userId, [
                                    'attendance',
                                    'attendance_error',
                                    'report',
                                    'document',
                                    'class_join_request',
                                    'hte_evaluation',
                                  ])
                                }}
                              />
                            )}
                          </span>
                        </td>
                        <td>{assignedHte?.name || 'Unassigned'}</td>
                        <td>
                          <div className="hrs-progress-cell">
                            <div className="hrs-progress-track">
                              <div
                                className="hrs-progress-fill"
                                style={{ width: `${Math.min(100, tier.pct)}%`, background: tier.color }}
                              />
                            </div>
                            <span className="mono">{student.renderedHours}h</span>
                          </div>
                        </td>
                        <td>
                          <span className="compliance-cell" style={{ color: tier.color }}>
                            {tier.pct}%
                          </span>
                        </td>
                        <td>
                          <span className={`status-pill ${tier.pillClass}`}>{tier.label}</span>
                        </td>
                        <td>
                          <span className="member-row-chevron" aria-hidden="true">
                            ›
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {classStudents.length > 0 && (
            <div className={`status-pill${unassignedCount === 0 ? ' status-pill-success' : ''}`} style={{ marginTop: 12 }}>
              {unassignedCount === 0
                ? 'All students have an assigned HTE'
                : `${unassignedCount} student${unassignedCount === 1 ? '' : 's'} need HTE assignment`}
            </div>
          )}
      </section>
    )
  }

  const attendanceDayStatus = (
    timeInLog: AttendanceLogRecord | undefined,
    timeOutLog: AttendanceLogRecord | undefined,
  ): 'verified' | 'pending' | 'flagged' | 'absent' => {
    if (!timeInLog) return 'absent'
    if (timeInLog.status === 'flagged' || timeOutLog?.status === 'flagged') return 'flagged'
    if (timeOutLog && timeInLog.status === 'verified' && timeOutLog.status === 'verified') return 'verified'
    return 'pending'
  }

  const formatClockTime = (value: unknown): string => {
    if (!value) return '—'
    const date = typeof value === 'string' ? new Date(value) : (value as { toDate?: () => Date }).toDate?.()
    if (!date) return '—'
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const exportAttendanceCsv = (
    className: string,
    rows: { name: string; studentIdCode: string; dateLabel: string; timeIn: string; timeOut: string; hours: string; status: string }[],
  ) => {
    const header = ['Student', 'Student ID', 'Date', 'Time In', 'Time Out', 'Hours', 'Status']
    const csvRows = rows.map((r) => [r.name, r.studentIdCode, r.dateLabel, r.timeIn, r.timeOut, r.hours, r.status])
    const csvContent = [header, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${className.replace(/\s+/g, '-').toLowerCase()}-attendance-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const renderClassAttendanceTab = (classItem: ClassRecord, classStudents: StudentRecord[]) => {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const dateLabel = todayStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

    const classStudentIds = new Set(classStudents.map((s) => s.userId))
    const todaysLogs = attendanceLogs.filter((log) => {
      if (!classStudentIds.has(log.studentId)) return false
      const logTime = new Date(formatTimestamp(log.timestamp) || 0)
      return logTime >= todayStart
    })

    const dayRows = classStudents.map((student) => {
      const studentLogs = todaysLogs.filter((log) => log.studentId === student.userId)
      const timeInLog = studentLogs.find((log) => log.type === 'time_in')
      const timeOutLog = studentLogs.find((log) => log.type === 'time_out')
      const status = attendanceDayStatus(timeInLog, timeOutLog)
      return { student, timeInLog, timeOutLog, status }
    })

    const presentCount = dayRows.filter((r) => r.status === 'verified').length
    const pendingCount = dayRows.filter((r) => r.status === 'pending' || r.status === 'flagged').length
    const absentCount = dayRows.filter((r) => r.status === 'absent').length

    const filteredRows =
      attendanceFilter === 'all'
        ? dayRows
        : dayRows.filter((r) =>
            attendanceFilter === 'present'
              ? r.status === 'verified'
              : attendanceFilter === 'pending'
                ? r.status === 'pending' || r.status === 'flagged'
                : r.status === 'absent',
          )

    return (
      <section className="module-card">
        <div className="attendance-toolbar">
          <div>
            <h3>Attendance & Compliance</h3>
            <p>Photo-verified time-in / time-out logs · {dateLabel}</p>
          </div>
          <div className="attendance-toolbar-actions">
            <select
              className="attendance-filter-select"
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as typeof attendanceFilter)}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="present">Present</option>
              <option value="pending">Pending</option>
              <option value="absent">Absent</option>
            </select>
            <button
              className="secondary-button"
              onClick={() =>
                exportAttendanceCsv(
                  classItem.name,
                  filteredRows.map((r) => ({
                    name: users[r.student.userId]?.displayName || 'Unnamed student',
                    studentIdCode: users[r.student.userId]?.studentIdCode || r.student.userId,
                    dateLabel,
                    timeIn: formatClockTime(r.timeInLog?.timestamp),
                    timeOut: formatClockTime(r.timeOutLog?.timestamp),
                    hours: r.timeOutLog?.computedHours != null ? String(r.timeOutLog.computedHours) : r.timeInLog ? '—' : '0',
                    status: r.status,
                  })),
                )
              }
            >
              ⭳ Export
            </button>
          </div>
        </div>

        <div className="stat-tile-grid attendance-stat-grid">
          <div className="stat-tile">
            <div>
              <p className="stat-tile-value" style={{ color: 'var(--success)' }}>
                {presentCount}
              </p>
              <span className="stat-tile-label">Present</span>
            </div>
          </div>
          <div className="stat-tile">
            <div>
              <p className="stat-tile-value" style={{ color: 'var(--warning)' }}>
                {pendingCount}
              </p>
              <span className="stat-tile-label">Pending</span>
            </div>
          </div>
          <div className="stat-tile">
            <div>
              <p className="stat-tile-value" style={{ color: 'var(--danger)' }}>
                {absentCount}
              </p>
              <span className="stat-tile-label">Absent</span>
            </div>
          </div>
          <div className="stat-tile">
            <div>
              <p className="stat-tile-value">{dayRows.length}</p>
              <span className="stat-tile-label">Total</span>
            </div>
          </div>
        </div>

        {classStudents.length === 0 ? (
          <EmptyState title="No students yet" subtitle="Approve a class join request to start tracking attendance." />
        ) : (
          <div className="table-wrap">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Date</th>
                  <th>Time In</th>
                  <th>Time Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Photo</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map(({ student, timeInLog, timeOutLog, status }) => {
                  const name = users[student.userId]?.displayName || 'Unnamed student'
                  const hours = timeOutLog?.computedHours != null ? timeOutLog.computedHours : timeInLog ? null : 0
                  return (
                    <tr key={student.id}>
                      <td>
                        <span className="member-name-cell">
                          {name}
                          {hasUnreadForStudent(classItem.id, student.userId) && (
                            <span
                              className="notify-dot"
                              title="New activity from this student"
                              onClick={() => markStudentNotificationsRead(student.userId, ['attendance', 'attendance_error'])}
                            />
                          )}
                        </span>
                      </td>
                      <td className="mono">{dateLabel}</td>
                      <td className="mono">
                        {timeInLog ? formatClockTime(timeInLog.timestamp) : '—'}
                        {timeInLog?.late && (
                          <span className="status-badge status-flagged late-tag" title="Later than the assigned HTE's expected time-in">
                            late
                          </span>
                        )}
                      </td>
                      <td className="mono">{timeOutLog ? formatClockTime(timeOutLog.timestamp) : '—'}</td>
                      <td className="mono">{hours === null ? '—' : hours}</td>
                      <td>
                        <span className={`status-pill ${status === 'verified' ? 'status-pill-success' : status === 'absent' || status === 'flagged' ? 'status-pill-danger' : 'status-pill-warning'}`}>
                          {status === 'verified' ? 'Verified' : status === 'absent' ? 'Absent' : status === 'flagged' ? 'Flagged' : 'Pending'}
                        </span>
                      </td>
                      <td>
                        {timeInLog && (
                          <button
                            className="eye-button"
                            title="View photo & verify"
                            onClick={() => setViewingAttendanceDay(student)}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M4.5 8.5L6.2 5.5H9.8L11.5 8.5H19.5C20.05 8.5 20.5 8.95 20.5 9.5V18.5C20.5 19.05 20.05 19.5 19.5 19.5H4.5C3.95 19.5 3.5 19.05 3.5 18.5V9.5C3.5 8.95 3.95 8.5 4.5 8.5Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinejoin="round"
                              />
                              <circle cx="12" cy="14" r="3.2" stroke="currentColor" strokeWidth="1.7" />
                            </svg>
                          </button>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button className="eye-button" title="View student profile" onClick={() => setViewingStudent(student)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M2 12C2 12 5.5 5.5 12 5.5C18.5 5.5 22 12 22 12C22 12 18.5 18.5 12 18.5C5.5 18.5 2 12 2 12Z"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                              />
                              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                            </svg>
                          </button>
                          <button className="eye-button" title="Edit rendered hours" onClick={() => setEditingStudent(student)}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path
                                d="M4 20L4.7 16.6L15.3 6C15.9 5.4 16.9 5.4 17.5 6L18.5 7C19.1 7.6 19.1 8.6 18.5 9.2L7.9 19.8L4 20Z"
                                stroke="currentColor"
                                strokeWidth="1.7"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  const renderClassReportsTab = (classStudents: StudentRecord[]) => {
    const classStudentIds = new Set(classStudents.map((s) => s.userId))
    const sortedReports = [...reports]
      .filter((r) => classStudentIds.has(r.studentId))
      .sort(
        (a, b) => new Date(formatTimestamp(b.submittedAt) || 0).getTime() - new Date(formatTimestamp(a.submittedAt) || 0).getTime(),
      )
    const classDocuments = preOjtDocuments.filter((d) => classStudentIds.has(d.studentId))

    const reportRows: ReviewRow[] = sortedReports.map((report) => ({
      id: report.id,
      studentLabel: users[report.studentId]?.displayName || users[report.studentId]?.studentIdCode || report.studentId,
      typeLabel: `${report.type.charAt(0).toUpperCase()}${report.type.slice(1)} report`,
      status: report.status,
      submittedLabel: `Submitted ${formatTimestamp(report.submittedAt) || 'on an unknown date'}`,
      content: report.content,
      fileUrl: report.fileUrl,
      fileLinkLabel: 'View attachment',
      onApprove: () => updateReportStatus(report.id, 'approved'),
      onReject: () => updateReportStatus(report.id, 'rejected'),
    }))

    const documentRows: ReviewRow[] = classDocuments.map((document) => ({
      id: document.id,
      studentLabel: users[document.studentId]?.displayName || users[document.studentId]?.studentIdCode || document.studentId,
      typeLabel: document.docType,
      status: document.status,
      submittedLabel: 'Submitted for review',
      fileUrl: document.fileUrl,
      fileLinkLabel: 'View document',
      onApprove: () => updateDocumentStatus(document.id, 'approved'),
      onReject: () => updateDocumentStatus(document.id, 'rejected'),
    }))

    return (
      <div className="module-grid">
        <ReviewRowList
          title="Submitted reports"
          subtitle="Daily, weekly, and narrative reports submitted by students."
          emptyTitle="No reports submitted yet"
          emptySubtitle="Daily, weekly, and narrative reports from students will show up here."
          items={reportRows}
        />
        <ReviewRowList
          title="Pre-OJT documents"
          subtitle="MOA, waivers, and other onboarding documents."
          emptyTitle="No documents submitted yet"
          emptySubtitle="MOA, waivers, and other onboarding documents from students will show up here."
          items={documentRows}
        />
      </div>
    )
  }

  const renderClassPortfolioTab = (classStudents: StudentRecord[]) => {
    const classStudentIds = new Set(classStudents.map((s) => s.userId))
    const sortedPortfolioItems = [...portfolioItems]
      .filter((item) => classStudentIds.has(item.studentId))
      .sort((a, b) => new Date(formatTimestamp(b.uploadedAt) || 0).getTime() - new Date(formatTimestamp(a.uploadedAt) || 0).getTime())

    const portfolioRows: ReviewRow[] = sortedPortfolioItems.map((item) => ({
      id: item.id,
      studentLabel: users[item.studentId]?.displayName || users[item.studentId]?.studentIdCode || item.studentId,
      typeLabel: item.title,
      status: item.status,
      submittedLabel: `Uploaded ${formatTimestamp(item.uploadedAt) || 'on an unknown date'}`,
      fileUrl: item.fileUrl,
      fileLinkLabel: 'View item',
      coordinatorNote: item.coordinatorNote,
      onApprove: () => updatePortfolioItemStatus(item.id, 'approved'),
      onRejectWithNote: (note) => updatePortfolioItemStatus(item.id, 'rejected', note || undefined),
    }))

    return (
      <div className="module-grid">
        {preferences.portfolioInstructions.trim() && (
          <div className="module-card">
            <h3>Portfolio instructions given to students</h3>
            <p className="review-content">{preferences.portfolioInstructions}</p>
            <p className="modal-hint">Edit this under Settings → System Preferences.</p>
          </div>
        )}
        <ReviewRowList
          title="Student portfolios"
          subtitle="Review each item against your portfolio instructions — approve it, or reject it with a note on what to fix."
          emptyTitle="No portfolio items yet"
          emptySubtitle="Items students add to their portfolio will show up here."
          items={portfolioRows}
        />
      </div>
    )
  }

  /**
   * A student's full-page profile — opened from the Members roster (click a
   * row, Schoology's own Members-list pattern) instead of the small modal
   * this used to be. Tabbed like a class itself (Overview/Attendance/
   * Reports/Documents/Portfolio), each tab scoped to just this one student.
   */
  const renderStudentDetail = (student: StudentRecord) => {
    const studentUser = users[student.userId]
    const name = studentUser?.displayName || 'Unnamed student'
    const hte = htes.find((h) => h.id === student.assignedHteId)
    const className = classes.find((c) => c.id === student.classId)?.name || 'Unassigned'
    const tier = getComplianceTier(student)
    const clampedPct = Math.min(100, tier.pct)
    const dashOffset = STUDENT_RING_CIRCUMFERENCE * (1 - clampedPct / 100)

    const tabs: { key: typeof studentDetailTab; label: string }[] = [
      { key: 'overview', label: 'Overview' },
      { key: 'attendance', label: 'Attendance' },
      { key: 'reports', label: 'Reports' },
      { key: 'documents', label: 'Documents' },
      { key: 'portfolio', label: 'Portfolio' },
    ]

    return (
      <div className="class-detail">
        <div className="class-detail-header">
          <button className="class-detail-back" onClick={() => setViewingStudent(null)}>
            ← Back to Members
          </button>
          <div className="profile-identity">
            {studentUser?.photoUrl ? (
              <button
                type="button"
                className="avatar-click-target"
                onClick={() => setViewingStudentPhoto(true)}
                aria-label={`View ${name}'s photo`}
              >
                <Avatar name={name} photoUrl={studentUser.photoUrl} seed={student.userId} size={72} />
              </button>
            ) : (
              <Avatar name={name} photoUrl={undefined} seed={student.userId} size={72} />
            )}
            <div>
              <strong className="profile-name">{name}</strong>
              <span className="mono profile-id">{studentUser?.studentIdCode || studentUser?.email || student.userId}</span>
              <div className="profile-tags">
                <span className={`status-pill ${tier.pillClass}`}>{tier.label}</span>
                <span className="profile-class-tag">{className}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="class-tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={studentDetailTab === tab.key ? 'class-tab-button active' : 'class-tab-button'}
              onClick={() => setStudentDetailTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {studentDetailTab === 'overview' && renderStudentOverviewTab(student, studentUser, hte, tier, dashOffset, clampedPct)}
        {studentDetailTab === 'attendance' && renderStudentAttendanceTab(student)}
        {studentDetailTab === 'reports' && renderStudentReportsTab(student, name)}
        {studentDetailTab === 'documents' && renderStudentDocumentsTab(student, name)}
        {studentDetailTab === 'portfolio' && renderStudentPortfolioTab(student, name)}

        {viewingStudentPhoto && studentUser?.photoUrl && (
          <PhotoLightbox photoUrl={studentUser.photoUrl} alt={`${name}'s photo`} onClose={() => setViewingStudentPhoto(false)} />
        )}
      </div>
    )
  }

  const renderStudentOverviewTab = (
    student: StudentRecord,
    studentUser: UserRecord | undefined,
    hte: HteRecord | undefined,
    tier: { pct: number; label: string; pillClass: string; color: string },
    dashOffset: number,
    clampedPct: number,
  ) => {
    const name = studentUser?.displayName || 'Unnamed student'
    return (
      <div className="module-grid">
        <section className="module-card">
          <h3>Details</h3>
          <div className="profile-field-grid">
            <div>
              <span className="profile-field-label">HTE</span>
              <p>{hte?.name || 'Not assigned'}</p>
            </div>
            <div>
              <span className="profile-field-label">Supervisor</span>
              <p>{hte?.supervisorName || '—'}</p>
            </div>
            <div>
              <span className="profile-field-label">Email</span>
              <p>{studentUser?.contactEmail || studentUser?.email || '—'}</p>
            </div>
            <div>
              <span className="profile-field-label">Absences</span>
              <p>
                {student.absenceCount ? `${student.absenceCount} total` : 'None recorded'}
                {!!student.consecutiveAbsenceDays && ` · ${student.consecutiveAbsenceDays} consecutive`}
              </p>
            </div>
          </div>

          <div className="roster-divider" />

          <h4>Hours Progress</h4>
          <div className="profile-hours-row">
            <div className="profile-ring">
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={STUDENT_RING_RADIUS} fill="none" stroke="var(--border)" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r={STUDENT_RING_RADIUS}
                  fill="none"
                  stroke={tier.color}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={STUDENT_RING_CIRCUMFERENCE}
                  strokeDashoffset={dashOffset}
                  transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="profile-ring-label">
                <strong>{clampedPct}%</strong>
                <span>Complete</span>
              </div>
            </div>
            <div className="profile-hours-detail">
              <div className="profile-hours-detail-top">
                <span>Rendered</span>
                <strong>{student.renderedHours}h</strong>
              </div>
              <div className="hrs-progress-track">
                <div className="hrs-progress-fill" style={{ width: `${clampedPct}%`, background: tier.color }} />
              </div>
              <span className="review-meta no-capitalize">of {student.requiredHours}h required</span>
            </div>
          </div>

          <div className="roster-divider" />

          <div className="button-row">
            <button
              className="secondary-button"
              onClick={() => {
                setAssigningHte(student)
                setViewingStudent(null)
              }}
            >
              {hte ? 'Change HTE' : 'Assign HTE'}
            </button>
            <button
              className="danger-button"
              onClick={() => {
                removeStudentFromClass(student)
                setViewingStudent(null)
              }}
            >
              Remove from class
            </button>
          </div>
        </section>

        <section className="module-card">
          <h3>Send Feedback</h3>
          <label className="modal-field">
            Message to {name}
            <textarea
              value={studentFeedbackMessage}
              onChange={(e) => {
                setStudentFeedbackMessage(e.target.value)
                setStudentFeedbackSent(false)
              }}
              placeholder="e.g. Great work on your last weekly report — keep it up."
              rows={4}
            />
          </label>
          <div className="button-row">
            <button
              className="primary-button"
              disabled={!studentFeedbackMessage.trim() || sendingStudentFeedback}
              onClick={async () => {
                if (!studentFeedbackMessage.trim()) return
                setSendingStudentFeedback(true)
                setStudentFeedbackSent(false)
                try {
                  await sendFeedbackToStudent(student.userId, studentFeedbackMessage)
                  setStudentFeedbackMessage('')
                  setStudentFeedbackSent(true)
                } finally {
                  setSendingStudentFeedback(false)
                }
              }}
            >
              {sendingStudentFeedback ? 'Sending…' : 'Send Feedback'}
            </button>
            {studentFeedbackSent && <span className="preferences-saved-note">Sent</span>}
          </div>
        </section>
      </div>
    )
  }

  const renderStudentAttendanceTab = (student: StudentRecord) => {
    const now = new Date()
    const periodStart = new Date(now)
    if (studentAttendancePeriod === 'week') periodStart.setDate(periodStart.getDate() - 7)
    else if (studentAttendancePeriod === 'month') periodStart.setMonth(periodStart.getMonth() - 1)
    else periodStart.setFullYear(2000) // 'all'

    const logs = attendanceLogs
      .filter((log) => log.studentId === student.userId)
      .filter((log) => new Date(formatTimestamp(log.timestamp) || 0) >= periodStart)
      .sort((a, b) => new Date(formatTimestamp(b.timestamp) || 0).getTime() - new Date(formatTimestamp(a.timestamp) || 0).getTime())

    const periodOptions: { key: typeof studentAttendancePeriod; label: string }[] = [
      { key: 'week', label: 'This week' },
      { key: 'month', label: 'This month' },
      { key: 'all', label: 'All time' },
    ]

    return (
      <section className="module-card">
        <h3>Attendance history</h3>
        <div className="filter-tabs">
          {periodOptions.map((opt) => (
            <button
              key={opt.key}
              className={studentAttendancePeriod === opt.key ? 'filter-tab active' : 'filter-tab'}
              onClick={() => setStudentAttendancePeriod(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {logs.length === 0 ? (
          <EmptyState title="No attendance logs" subtitle="Nothing recorded for this period yet." />
        ) : (
          <div className="table-wrap">
            <table className="members-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Time</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{formatTimestamp(log.timestamp).split(',').slice(0, 2).join(',') || '—'}</td>
                    <td>{log.type === 'time_in' ? 'Time in' : 'Time out'}</td>
                    <td>{formatClockTime(log.timestamp)}</td>
                    <td className="mono">{log.computedHours != null ? `${log.computedHours}h` : '—'}</td>
                    <td>
                      <span className={`status-badge status-${log.status}`}>
                        {log.status}
                        {log.late ? ' · late' : ''}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    )
  }

  const renderStudentReportsTab = (student: StudentRecord, studentLabel: string) => {
    const typeOptions: { key: typeof studentReportTypeFilter; label: string }[] = [
      { key: 'all', label: 'All' },
      { key: 'daily', label: 'Daily' },
      { key: 'weekly', label: 'Weekly' },
      { key: 'narrative', label: 'Narrative' },
    ]
    const studentReports = reports
      .filter((r) => r.studentId === student.userId)
      .filter((r) => studentReportTypeFilter === 'all' || r.type === studentReportTypeFilter)
      .sort((a, b) => new Date(formatTimestamp(b.submittedAt) || 0).getTime() - new Date(formatTimestamp(a.submittedAt) || 0).getTime())

    const reportRows: ReviewRow[] = studentReports.map((report) => ({
      id: report.id,
      studentLabel,
      typeLabel: `${report.type.charAt(0).toUpperCase()}${report.type.slice(1)} report`,
      status: report.status,
      submittedLabel: `Submitted ${formatTimestamp(report.submittedAt) || 'on an unknown date'}`,
      content: report.content,
      fileUrl: report.fileUrl,
      fileLinkLabel: 'View attachment',
      onApprove: () => updateReportStatus(report.id, 'approved'),
      onReject: () => updateReportStatus(report.id, 'rejected'),
    }))

    return (
      <div className="module-grid">
        <section className="module-card">
          <h3>Filter by type</h3>
          <div className="filter-tabs">
            {typeOptions.map((opt) => (
              <button
                key={opt.key}
                className={studentReportTypeFilter === opt.key ? 'filter-tab active' : 'filter-tab'}
                onClick={() => setStudentReportTypeFilter(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
        <ReviewRowList
          title={`${studentLabel}'s reports`}
          subtitle="Daily, weekly, and narrative reports submitted by this student."
          emptyTitle="No reports submitted"
          emptySubtitle="Nothing matches this filter yet."
          items={reportRows}
        />
      </div>
    )
  }

  const renderStudentDocumentsTab = (student: StudentRecord, studentLabel: string) => {
    const documentRows: ReviewRow[] = preOjtDocuments
      .filter((d) => d.studentId === student.userId)
      .map((document) => ({
        id: document.id,
        studentLabel,
        typeLabel: document.docType,
        status: document.status,
        submittedLabel: 'Submitted for review',
        fileUrl: document.fileUrl,
        fileLinkLabel: 'View document',
        onApprove: () => updateDocumentStatus(document.id, 'approved'),
        onReject: () => updateDocumentStatus(document.id, 'rejected'),
      }))

    return (
      <ReviewRowList
        title={`${studentLabel}'s documents`}
        subtitle="MOA, waivers, and other onboarding documents."
        emptyTitle="No documents submitted"
        emptySubtitle="Documents this student submits will show up here."
        items={documentRows}
      />
    )
  }

  const renderStudentPortfolioTab = (student: StudentRecord, studentLabel: string) => {
    const portfolioRows: ReviewRow[] = portfolioItems
      .filter((item) => item.studentId === student.userId)
      .sort((a, b) => new Date(formatTimestamp(b.uploadedAt) || 0).getTime() - new Date(formatTimestamp(a.uploadedAt) || 0).getTime())
      .map((item) => ({
        id: item.id,
        studentLabel,
        typeLabel: item.title,
        status: item.status,
        submittedLabel: `Uploaded ${formatTimestamp(item.uploadedAt) || 'on an unknown date'}`,
        fileUrl: item.fileUrl,
        fileLinkLabel: 'View item',
        coordinatorNote: item.coordinatorNote,
        onApprove: () => updatePortfolioItemStatus(item.id, 'approved'),
        onRejectWithNote: (note) => updatePortfolioItemStatus(item.id, 'rejected', note || undefined),
      }))

    return (
      <ReviewRowList
        title={`${studentLabel}'s portfolio`}
        subtitle="Review each item against your portfolio instructions."
        emptyTitle="No portfolio items yet"
        emptySubtitle="Items this student adds to their portfolio will show up here."
        items={portfolioRows}
      />
    )
  }

  const renderHteEvaluations = () => (
    <div className="module-card">
      <h3>HTE evaluation results</h3>
      <p>
        Generate a secure link for each student's HTE supervisor — they don't need an account. Results appear here
        automatically once submitted.
      </p>
      <div className="review-list">
        {students.length === 0 && (
          <EmptyState title="No students yet" subtitle="Add students to a class to start collecting HTE evaluations." />
        )}
        {students.map((student) => {
          const link = [...hteEvaluationLinks]
            .filter((l) => l.studentId === student.userId)
            .sort((a, b) => new Date(b.expiresAt || 0).getTime() - new Date(a.expiresAt || 0).getTime())[0]
          const evaluation = hteEvaluations.find((e) => e.studentId === student.userId)
          const label = users[student.userId]?.displayName || users[student.userId]?.studentIdCode || student.userId
          const statusClass = evaluation ? 'status-approved' : link ? 'status-pending' : 'status-eligible'
          const statusLabel = evaluation ? 'Submitted' : link ? 'Awaiting response' : 'Not sent'
          const avatarStyle = avatarColor(student.userId)

          return (
            <div className="review-item" key={student.id}>
              <div className="review-item-header">
                <div className="review-item-person">
                  <span className="review-item-avatar" style={{ background: avatarStyle.bg, color: avatarStyle.fg }}>
                    {initials(label)}
                  </span>
                  <div>
                    <strong>{label}</strong>
                    <span className="review-meta">
                      {classes.find((c) => c.id === student.classId)?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
                <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
              </div>

              {evaluation ? (
                <div className="hte-scores">
                  {Object.entries(evaluation.scores).map(([criterion, score]) => (
                    <div className="hte-score-row" key={criterion}>
                      <span>{criterion}</span>
                      <strong>{score}/5</strong>
                    </div>
                  ))}
                  {evaluation.comments && <p className="review-content">"{evaluation.comments}"</p>}
                  {evaluation.supervisorName && (
                    <p className="review-meta">— {evaluation.supervisorName}, HTE Supervisor</p>
                  )}
                </div>
              ) : (
                <div className="review-actions">
                  <button className="secondary-button" onClick={() => generateHteEvaluationLink(student.userId)}>
                    {link ? 'Generate new link' : 'Generate evaluation link'}
                  </button>
                </div>
              )}

              {generatedHteLink?.studentId === student.userId && !evaluation && (
                <div className="credential-panel">
                  <p className="modal-hint hte-link-ready">Evaluation link ready</p>
                  <div className="hte-link-value">{generatedHteLink.url}</div>
                  <button
                    className="secondary-button"
                    onClick={() => navigator.clipboard.writeText(generatedHteLink.url)}
                  >
                    Copy link
                  </button>
                  <p className="modal-hint">
                    Share this with the student's HTE supervisor. It expires in 14 days and can only be used once.
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderFinalAssessment = () => {
    const eligible = students.filter(
      (s) => s.renderedHours >= s.requiredHours && s.completionStatus !== 'completed',
    )
    const completed = students.filter((s) => s.completionStatus === 'completed')

    const renderRow = (student: StudentRecord, action: React.ReactNode) => {
      const name = users[student.userId]?.displayName || users[student.userId]?.studentIdCode || student.userId
      const avatarStyle = avatarColor(student.userId)
      return (
        <div className="review-item" key={student.id}>
          <div className="review-item-header">
            <div className="review-item-person">
              <span className="review-item-avatar" style={{ background: avatarStyle.bg, color: avatarStyle.fg }}>
                {initials(name)}
              </span>
              <div>
                <strong>{name}</strong>
                <span className="review-meta">
                  {classes.find((c) => c.id === student.classId)?.name || 'Unassigned'} · {student.renderedHours}/
                  {student.requiredHours} hrs
                </span>
              </div>
            </div>
            <span className={`status-badge ${student.completionStatus === 'completed' ? 'status-completed' : 'status-eligible'}`}>
              {student.completionStatus === 'completed' ? 'Completed' : 'Eligible'}
            </span>
          </div>
          {action}
        </div>
      )
    }

    return (
      <div className="module-grid">
        <section className="module-card">
          <h3>Eligible for completion</h3>
          <p>Students who have met their required OJT hours and are ready to be confirmed complete.</p>
          <div className="review-list">
            {eligible.length === 0 && (
              <EmptyState
                title="No students are currently eligible"
                subtitle="Students appear here once they've met their required OJT hours."
              />
            )}
            {eligible.map((student) =>
              renderRow(
                student,
                <div className="review-actions">
                  <button className="primary-button" onClick={() => markStudentCompleted(student.id)}>
                    Mark internship completed
                  </button>
                </div>,
              ),
            )}
          </div>
        </section>
        <section className="module-card">
          <h3>Completed internships</h3>
          <p>Students whose OJT has been confirmed complete for this school year.</p>
          <div className="review-list">
            {completed.length === 0 && (
              <EmptyState
                title="No completed internships yet"
                subtitle="Students appear here once their OJT is marked complete."
              />
            )}
            {completed.map((student) =>
              renderRow(
                student,
                <div className="review-actions">
                  <button className="secondary-button" onClick={() => reopenStudentInternship(student.id)}>
                    Reopen
                  </button>
                </div>,
              ),
            )}
          </div>
        </section>
      </div>
    )
  }

  const renderSipp = () => (
    <div className="module-card">
      <h3>SIPP report</h3>
      <p>
        Export a Student Internship Placement Program summary — student, HTE placement, supervisor contact, hours,
        and completion status, with a signature block for endorsement.
      </p>
      <div className="button-row">
        <button className="primary-button" onClick={exportPdf}>
          Export PDF
        </button>
        <button className="secondary-button" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
      <p className="modal-hint">
        Field set is based on standard SIPP placement reporting. Cross-check against the current CMO 104 s. 2017
        requirements before citing this as fully compliant.
      </p>
    </div>
  )

  const renderActivityLog = () => (
    <div className="module-card">
      <h3>Activity Log</h3>
      <p>An audit trail of coordinator actions — approvals, corrections, enrollments, and settings changes.</p>
      {activityLogs.length === 0 ? (
        <EmptyState title="No activity yet" subtitle="Actions you take across OJTrack will show up here." />
      ) : (
        <div className="review-list">
          {activityLogs.map((entry) => (
            <div className="review-item" key={entry.id}>
              <div className="review-item-header">
                <div>
                  <strong>{entry.actorName}</strong>
                  <span className="review-meta no-capitalize">{formatTimestamp(entry.createdAt)}</span>
                </div>
              </div>
              <p className="review-content">{entry.details}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )

  const handleAddHte = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!newHteName.trim() || !newHteSupervisorName.trim()) {
      setAddHteError('Enter at least the company name and supervisor name.')
      return
    }
    setAddHteError('')
    setAddingHte(true)
    try {
      await addHte({
        name: newHteName.trim(),
        address: newHteAddress.trim(),
        supervisorName: newHteSupervisorName.trim(),
        supervisorEmail: newHteSupervisorEmail.trim(),
        supervisorPhone: newHteSupervisorPhone.trim(),
        ...(newHteExpectedTimeIn ? { expectedTimeIn: newHteExpectedTimeIn } : {}),
      })
      setNewHteName('')
      setNewHteAddress('')
      setNewHteSupervisorName('')
      setNewHteSupervisorEmail('')
      setNewHteSupervisorPhone('')
      setNewHteExpectedTimeIn('')
    } catch (error) {
      setAddHteError(error instanceof Error ? error.message : 'Could not enroll this HTE. Please try again.')
    } finally {
      setAddingHte(false)
    }
  }

  const renderHteManagement = () => (
    <div className="module-grid">
      <div className="module-card">
        <h3>Enrolled HTEs</h3>
        <p>Host Training Establishments available for student assignment.</p>
        <div className="review-list">
          {htes.length === 0 && (
            <EmptyState title="No HTEs enrolled yet" subtitle="Enroll one using the form to make it assignable to students." />
          )}
          {htes.map((hte) => {
            const chipStyle = avatarColor(hte.id)
            return (
              <div className="review-item" key={hte.id}>
                <div className="review-item-header">
                  <div className="review-item-person">
                    <span className="hte-avatar" style={{ background: chipStyle.bg, color: chipStyle.fg }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="4.5" y="3.5" width="11" height="17" rx="1" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M15.5 20V9.5C15.5 8.9 16 8.5 16.5 8.5H19C19.6 8.5 20 8.9 20 9.5V20" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M7.5 7H12.5M7.5 10H12.5M7.5 13H12.5M7.5 16H12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </span>
                    <div>
                      <strong>{hte.name}</strong>
                      <span className="review-meta no-capitalize">{hte.address || 'No address on file'}</span>
                    </div>
                  </div>
                  <button className="eye-button" title="Edit HTE" onClick={() => setEditingHte(hte)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M4 20L4.7 16.6L15.3 6C15.9 5.4 16.9 5.4 17.5 6L18.5 7C19.1 7.6 19.1 8.6 18.5 9.2L7.9 19.8L4 20Z"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
                <p className="review-content">
                  {hte.supervisorName}
                  {hte.supervisorEmail ? ` · ${hte.supervisorEmail}` : ''}
                  {hte.supervisorPhone ? ` · ${hte.supervisorPhone}` : ''}
                  {hte.expectedTimeIn ? ` · Time-in ${hte.expectedTimeIn}` : ''}
                </p>
              </div>
            )
          })}
        </div>
      </div>
      <div className="module-card">
        <h3>Enroll HTE</h3>
        <p>Add a new Host Training Establishment your students can be assigned to.</p>
        <form className="module-form" onSubmit={handleAddHte}>
          <label>
            Company name
            <input value={newHteName} onChange={(e) => setNewHteName(e.target.value)} placeholder="e.g. Marbel City IT Solutions" />
          </label>
          <label>
            Address
            <input value={newHteAddress} onChange={(e) => setNewHteAddress(e.target.value)} placeholder="e.g. Koronadal City" />
          </label>
          <label>
            Supervisor name
            <input
              value={newHteSupervisorName}
              onChange={(e) => setNewHteSupervisorName(e.target.value)}
              placeholder="e.g. Engr. Santos"
            />
          </label>
          <label>
            Supervisor email
            <input
              type="email"
              value={newHteSupervisorEmail}
              onChange={(e) => setNewHteSupervisorEmail(e.target.value)}
              placeholder="supervisor@company.com"
            />
          </label>
          <label>
            Supervisor phone
            <input
              value={newHteSupervisorPhone}
              onChange={(e) => setNewHteSupervisorPhone(e.target.value)}
              placeholder="09XX-XXX-XXXX"
            />
          </label>
          <label>
            Expected time-in (optional)
            <input type="time" value={newHteExpectedTimeIn} onChange={(e) => setNewHteExpectedTimeIn(e.target.value)} />
          </label>
          <p className="modal-hint">
            Every student assigned to this HTE inherits this start time for lateness tracking — set once here rather
            than per student.
          </p>
          {addHteError && <p className="error-text">{addHteError}</p>}
          <button type="submit" className="primary-button" disabled={addingHte}>
            {addingHte ? 'Enrolling…' : 'Enroll HTE'}
          </button>
        </form>
      </div>
    </div>
  )

  const handleAddCoordinator = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setAddCoordinatorError('')
    setAddingCoordinator(true)
    try {
      await addCoordinatorAccount(newCoordinatorName, newCoordinatorEmail, newCoordinatorPassword)
      setNewCoordinatorName('')
      setNewCoordinatorEmail('')
      setNewCoordinatorPassword('')
    } catch (error) {
      setAddCoordinatorError(error instanceof Error ? error.message : 'Could not create the account. Please try again.')
    } finally {
      setAddingCoordinator(false)
    }
  }

  const updatePreferencesField = <K extends keyof SystemPreferencesRecord>(field: K, value: SystemPreferencesRecord[K]) => {
    setPreferences((current) => ({ ...current, [field]: value }))
    setPreferencesSaved(false)
  }

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user) return

    setAvatarError('')
    setUploadingAvatar(true)
    try {
      // Displayed at 52px at most — no reason to ship a multi-megapixel file.
      const resized = await resizeImageFile(file, 512)
      const photoUrl = await uploadAvatar(user.id, resized)
      await updateDoc(doc(db, 'users', user.id), { photoUrl })
      setUser((current) => (current ? { ...current, photoUrl } : current))
    } catch (error) {
      console.error('Failed to upload avatar:', error)
      setAvatarError('Could not upload that photo. Please try again.')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim()
    if (!user || !trimmed) {
      setNameError('Enter a name.')
      return
    }
    setNameError('')
    setSavingName(true)
    try {
      await updateDoc(doc(db, 'users', user.id), { displayName: trimmed })
      setUser((current) => (current ? { ...current, displayName: trimmed } : current))
      logActivity('profile_updated', `Updated own display name to "${trimmed}".`)
      setEditingName(false)
    } catch (error) {
      console.error('Failed to update display name:', error)
      setNameError('Could not save your name. Please try again.')
    } finally {
      setSavingName(false)
    }
  }

  const handleSavePreferences = async () => {
    setSavingPreferences(true)
    try {
      if (user) {
        await setDoc(doc(db, 'settings', 'global'), preferences, { merge: true })
        logActivity('settings_updated', 'Updated system preferences.')
      }
      setPreferencesSaved(true)
    } catch (error) {
      console.error('Failed to save system preferences:', error)
    } finally {
      setSavingPreferences(false)
    }
  }

  const renderSettings = () => {
    if (!user) return null
    const coordinatorList = Object.values(coordinators).sort((a, b) => a.displayName.localeCompare(b.displayName))

    return (
      <div className="module-grid">
        <div className="module-card">
          <h3>System Preferences</h3>
          <div className="preferences-grid">
            <label className="preferences-row">
              <span className="preferences-label">Institution Name</span>
              <input
                value={preferences.institutionName}
                onChange={(e) => updatePreferencesField('institutionName', e.target.value)}
              />
            </label>
            <label className="preferences-row">
              <span className="preferences-label">Department</span>
              <input value={preferences.department} onChange={(e) => updatePreferencesField('department', e.target.value)} />
            </label>
            <label className="preferences-row">
              <span className="preferences-label">Required OJT Hours</span>
              <input
                type="number"
                min={0}
                value={preferences.defaultRequiredHours}
                onChange={(e) => updatePreferencesField('defaultRequiredHours', Number(e.target.value) || 0)}
              />
            </label>
            <label className="preferences-row">
              <span className="preferences-label">Academic Year</span>
              <input value={preferences.academicYear} onChange={(e) => updatePreferencesField('academicYear', e.target.value)} />
            </label>
            <label className="preferences-row">
              <span className="preferences-label">Semester</span>
              <select value={preferences.semester} onChange={(e) => updatePreferencesField('semester', e.target.value)}>
                {TERM_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="preferences-row">
              <span className="preferences-label">Absence Alert Threshold</span>
              <input
                type="number"
                min={1}
                value={preferences.absenceAlertThresholdDays}
                onChange={(e) => updatePreferencesField('absenceAlertThresholdDays', Math.max(1, Number(e.target.value) || 1))}
              />
            </label>
            <label className="preferences-row">
              <span className="preferences-label">Late Grace Period (minutes)</span>
              <input
                type="number"
                min={0}
                value={preferences.lateThresholdMinutes}
                onChange={(e) => updatePreferencesField('lateThresholdMinutes', Math.max(0, Number(e.target.value) || 0))}
              />
            </label>
          </div>
          <p className="modal-hint">
            These defaults are used when creating a new class. The absence alert threshold controls how many
            consecutive no-time-in days trigger a coordinator notification, and the late grace period is how many
            minutes past an HTE's expected time-in (set per HTE under Enroll HTE) before a time-in is marked late.
          </p>
          <label className="modal-field">
            Portfolio instructions
            <textarea
              value={preferences.portfolioInstructions}
              onChange={(e) => updatePreferencesField('portfolioInstructions', e.target.value)}
              placeholder="e.g. Include your certificate of completion, a one-page reflection, and at least 3 work samples."
              rows={3}
            />
          </label>
          <p className="modal-hint">
            Shown to students on their mobile Portfolio screen, so they know what to include before you review it.
          </p>
          <button className="primary-button" onClick={handleSavePreferences} disabled={savingPreferences}>
            {savingPreferences ? 'Saving…' : 'Save Changes'}
          </button>
          {preferencesSaved && <span className="preferences-saved-note">Saved</span>}
        </div>

        <div className="module-card">
          <h3>Coordinator accounts</h3>
          <p>Manage who has access to this coordinator portal.</p>
          <div className="review-list">
            {coordinatorList.map((c) => (
              <div className="review-item" key={c.id}>
                <div className="review-item-header">
                  <div>
                    <strong>{c.displayName}</strong>
                    <span className="review-meta no-capitalize">{c.email}</span>
                  </div>
                  <span className="status-badge status-approved">{c.role}</span>
                </div>
              </div>
            ))}
          </div>
          <form className="module-form" onSubmit={handleAddCoordinator}>
            <h4>Add coordinator</h4>
            <label>
              Full name
              <input value={newCoordinatorName} onChange={(e) => setNewCoordinatorName(e.target.value)} placeholder="e.g. Maria Cruz" />
            </label>
            <label>
              Email
              <input
                type="email"
                value={newCoordinatorEmail}
                onChange={(e) => setNewCoordinatorEmail(e.target.value)}
                placeholder="coordinator@ndmu.edu.ph"
              />
            </label>
            <label>
              Temporary password
              <input
                type="password"
                value={newCoordinatorPassword}
                onChange={(e) => setNewCoordinatorPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </label>
            {addCoordinatorError && <p className="error-text">{addCoordinatorError}</p>}
            <button type="submit" className="primary-button" disabled={addingCoordinator}>
              {addingCoordinator ? 'Creating…' : 'Create coordinator account'}
            </button>
          </form>
        </div>

        <div className="module-card">
          <h3>Profile & settings</h3>
          <p>Your coordinator profile.</p>
          <div className="profile-identity">
            {user.photoUrl ? (
              <button
                type="button"
                className="avatar-click-target"
                onClick={() => setViewingOwnPhoto(true)}
                aria-label="View your photo"
              >
                <Avatar name={user.displayName} photoUrl={user.photoUrl} seed={user.id} size={52} />
              </button>
            ) : (
              <Avatar name={user.displayName} photoUrl={undefined} seed={user.id} size={52} />
            )}
            <div>
              {editingName ? (
                <div className="profile-name-edit">
                  <input
                    className="profile-name-input"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    placeholder="Full name"
                    autoFocus
                  />
                  <button className="primary-button" onClick={handleSaveName} disabled={savingName}>
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                  <button className="secondary-button" onClick={() => { setEditingName(false); setNameError('') }} disabled={savingName}>
                    Cancel
                  </button>
                </div>
              ) : (
                <strong className="profile-name">
                  {user.displayName}{' '}
                  <button
                    className="profile-name-edit-trigger"
                    title="Edit name"
                    onClick={() => {
                      setNameDraft(user.displayName)
                      setNameError('')
                      setEditingName(true)
                    }}
                  >
                    ✎
                  </button>
                </strong>
              )}
              <span className="profile-id">{user.email}</span>
            </div>
          </div>
          {nameError && <p className="error-text">{nameError}</p>}
          <label className="secondary-button avatar-upload-button">
            {uploadingAvatar ? 'Uploading…' : 'Change photo'}
            <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={uploadingAvatar} hidden />
          </label>
          {avatarError && <p className="error-text">{avatarError}</p>}
          <p className="modal-hint">
            Your sign-in email can't be changed here — contact another coordinator with access to update it via
            Firebase if it's ever wrong.
          </p>
        </div>
        {viewingOwnPhoto && user.photoUrl && (
          <PhotoLightbox photoUrl={user.photoUrl} alt="Your photo" onClose={() => setViewingOwnPhoto(false)} />
        )}
      </div>
    )
  }

  const [confirmingLogout, setConfirmingLogout] = useState(false)

  const handleLogout = async () => {
    setConfirmingLogout(false)
    try {
      await auth.signOut()
    } catch (error) {
      console.error('Logout failed:', error)
    }
    setUser(null)
  }

  const renderModule = () => {
    switch (selectedModule) {
      case 'Dashboard':
        return renderDashboard()
      case 'Class Management':
        return renderClassManagement()
      case 'Enroll HTE':
        return renderHteManagement()
      case 'HTE Evaluation Results':
        return renderHteEvaluations()
      case 'Final Assessment & Completion':
        return renderFinalAssessment()
      case 'SIPP/CHED Report Generation':
        return renderSipp()
      case 'Activity Log':
        return renderActivityLog()
      case 'Settings/Profile':
        return renderSettings()
      default:
        return <p>Module unavailable.</p>
    }
  }

  const evaluationToken = new URLSearchParams(window.location.search).get('evaluate')
  if (evaluationToken) {
    return <HteEvaluationForm token={evaluationToken} />
  }

  if (loading || dashboardLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <span>Loading OJTrack…</span>
      </div>
    )
  }

  if (!user) {
    return <Login onLoginSuccess={setUser} />
  }

  return (
    <div className="app-shell">
      {syncError && (
        <div className="sync-error-banner" role="alert">
          <span>⚠ {syncError}</span>
          <button onClick={() => setSyncError(null)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand">
            <CeacMark size={26} />
            <h1>OJTrack</h1>
          </div>
          <p>College of Engineering, Architecture and Computing</p>
        </div>
        <nav>
          {moduleGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-group-label">{group.label}</span>
              {group.items.map((module) => (
                <button
                  key={module}
                  className={selectedModule === module ? 'nav-button active' : 'nav-button'}
                  onClick={() => setSelectedModule(module)}
                >
                  <span className="nav-button-icon">{moduleIcons[module]}</span>
                  <span>{module}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <p>{user.displayName}</p>
          <button onClick={() => setConfirmingLogout(true)} className="logout-button">Logout</button>
        </div>
      </aside>
      {confirmingLogout && (
        <ConfirmLogoutModal onConfirm={handleLogout} onCancel={() => setConfirmingLogout(false)} />
      )}
      <main className="main-panel">
        <header className="topbar">
          <div>
            <h2>{selectedModule}</h2>
            <p>Managing internship coordination for the College of Engineering, Architecture and Computing.</p>
          </div>
          <div className="badge-wrap">
            {liveUpdatesActive && <div className="live-badge">Live updates</div>}
            <button
              className="theme-toggle-button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to night mode'}
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to night mode'}
            >
              {theme === 'dark' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2" />
                  <path
                    d="M12 2.5V5M12 19V21.5M4.2 4.2L6 6M18 18L19.8 19.8M2.5 12H5M19 12H21.5M4.2 19.8L6 18M18 6L19.8 4.2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M20.5 14.5A8.5 8.5 0 119.5 3.5a7 7 0 0011 11z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
            <NotificationsBell
              notifications={notifications}
              classes={classes}
              onMarkAllRead={markAllNotificationsRead}
              onOpenClass={(classId) => openClass(classId)}
            />
            <div className="badge">{user.role.toUpperCase()}</div>
          </div>
        </header>

        <section className="content-area">{renderModule()}</section>
      </main>

      {editingStudent && (
        <EditHoursModal
          student={editingStudent}
          studentLabel={`Student ID: ${users[editingStudent.userId]?.studentIdCode || editingStudent.userId}`}
          onClose={() => setEditingStudent(null)}
          onSave={saveHoursCorrection}
        />
      )}

      {creatingClass && (
        <CreateClassModal
          onClose={() => setCreatingClass(false)}
          onCreate={addClass}
          defaults={{
            schoolYear: preferences.academicYear,
            term: preferences.semester,
            requiredHours: preferences.defaultRequiredHours,
          }}
        />
      )}

      {assigningHte && (
        <AssignHteModal
          student={assigningHte}
          studentUser={users[assigningHte.userId]}
          htes={htes}
          onClose={() => setAssigningHte(null)}
          onAssign={(hteId) => assignStudentHte(assigningHte.id, hteId)}
        />
      )}


      {viewingAttendanceDay &&
        (() => {
          const todayStart = new Date()
          todayStart.setHours(0, 0, 0, 0)
          const todaysStudentLogs = attendanceLogs.filter(
            (log) => log.studentId === viewingAttendanceDay.userId && new Date(formatTimestamp(log.timestamp) || 0) >= todayStart,
          )
          return (
            <AttendancePhotoModal
              studentUser={users[viewingAttendanceDay.userId]}
              dateLabel={todayStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              timeInLog={todaysStudentLogs.find((log) => log.type === 'time_in')}
              timeOutLog={todaysStudentLogs.find((log) => log.type === 'time_out')}
              onClose={() => setViewingAttendanceDay(null)}
              onVerify={(logId) => updateAttendanceLogStatus(logId, 'verified')}
              onFlag={(logId) => updateAttendanceLogStatus(logId, 'flagged')}
              onCorrectTime={correctAttendanceLogTime}
            />
          )
        })()}

      {editingClass && (
        <EditClassModal
          classItem={editingClass}
          studentCount={students.filter((s) => s.classId === editingClass.id).length}
          onClose={() => setEditingClass(null)}
          onSave={(updates) => updateClass(editingClass.id, updates)}
          onDelete={() => deleteClass(editingClass.id)}
        />
      )}
      {editingHte && (
        <EditHteModal
          hte={editingHte}
          onClose={() => setEditingHte(null)}
          onSave={(updates) => updateHte(editingHte.id, updates)}
        />
      )}
    </div>
  )
}

export default App
