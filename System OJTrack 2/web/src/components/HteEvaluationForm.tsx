import React, { useEffect, useState } from 'react'
import { addDoc, collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../firebase'
import CeacMark from './CeacMark'

const CRITERIA = [
  'Work Quality',
  'Punctuality & Attendance',
  'Communication Skills',
  'Initiative & Willingness to Learn',
  'Professionalism',
]

type LoadState = 'loading' | 'valid' | 'invalid' | 'expired' | 'already-submitted' | 'done'

interface HteEvaluationFormProps {
  token: string
}

/**
 * Public, no-login page an HTE (partner company) supervisor opens from a
 * link the coordinator generates. Per the original spec, HTE supervisors are
 * never system users — this is their only touchpoint with OJTrack.
 */
const HteEvaluationForm: React.FC<HteEvaluationFormProps> = ({ token }) => {
  const [state, setState] = useState<LoadState>('loading')
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState('the student')
  const [supervisorName, setSupervisorName] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [comments, setComments] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const linkQuery = query(collection(db, 'hte_evaluation_links'), where('token', '==', token))
        const snap = await getDocs(linkQuery)
        if (snap.empty) {
          setState('invalid')
          return
        }
        const data = snap.docs[0].data()
        if (data.submitted) {
          setState('already-submitted')
          return
        }
        if (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
          setState('expired')
          return
        }
        setStudentId(data.studentId)
        const userSnap = await getDoc(doc(db, 'users', data.studentId))
        setStudentName((userSnap.data()?.displayName as string) || 'the student')
        setState('valid')
      } catch (err) {
        console.error(err)
        setState('invalid')
      }
    }
    load()
  }, [token])

  const allRated = CRITERIA.every((c) => (scores[c] || 0) > 0)

  const handleSubmit = async () => {
    if (!studentId) return
    if (!supervisorName.trim() || !allRated) {
      setError('Please enter your name and rate every category before submitting.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'hte_evaluations'), {
        studentId,
        submittedByLinkToken: token,
        scores,
        comments: comments.trim(),
        supervisorName: supervisorName.trim(),
        submittedAt: new Date().toISOString(),
      })
      setState('done')
    } catch (err) {
      console.error(err)
      setError('Something went wrong submitting your evaluation. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStatusScreen = (title: string, message: string) => (
    <div className="login-container">
      <div className="evaluation-card">
        <div className="evaluation-status-screen">
          <div className="login-mark">
            <CeacMark size={30} />
          </div>
          <h1>{title}</h1>
          <p>{message}</p>
        </div>
      </div>
    </div>
  )

  if (state === 'loading') return renderStatusScreen('Loading…', 'Fetching your evaluation form.')
  if (state === 'invalid') {
    return renderStatusScreen('Link not found', 'This evaluation link doesn’t look right. Please check the link your coordinator sent you.')
  }
  if (state === 'expired') {
    return renderStatusScreen('Link expired', 'This evaluation link has expired. Please contact the OJT coordinator for a new one.')
  }
  if (state === 'already-submitted') {
    return renderStatusScreen('Already submitted', 'An evaluation has already been submitted using this link. Thank you!')
  }
  if (state === 'done') {
    return renderStatusScreen('Thank you!', 'Your evaluation has been submitted and shared with the OJT coordinator.')
  }

  return (
    <div className="login-container">
      <div className="evaluation-card">
        <div className="evaluation-header">
          <div className="login-mark">
            <CeacMark size={30} />
          </div>
          <h1>Trainee Evaluation</h1>
          <p>
            You're evaluating <strong>{studentName}</strong>'s on-the-job training performance for the College of
            Engineering, Architecture and Computing.
          </p>
        </div>

        <label className="modal-field evaluation-supervisor-field">
          Your name (HTE supervisor)
          <input value={supervisorName} onChange={(e) => setSupervisorName(e.target.value)} placeholder="e.g. Engr. Dela Cruz" />
        </label>

        {CRITERIA.map((criterion) => (
          <div className="rating-group" key={criterion}>
            <label>{criterion}</label>
            <div className="rating-buttons">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rating-button ${scores[criterion] === value ? 'selected' : ''}`}
                  onClick={() => setScores((current) => ({ ...current, [criterion]: value }))}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}

        <label className="modal-field evaluation-comments-field">
          Additional comments (optional)
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            placeholder="Any feedback for the student or their coordinator..."
          />
        </label>

        {error && <p className="error-text">{error}</p>}

        <button type="button" className="primary-button evaluation-submit-button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Evaluation'}
        </button>
      </div>
    </div>
  )
}

export default HteEvaluationForm
