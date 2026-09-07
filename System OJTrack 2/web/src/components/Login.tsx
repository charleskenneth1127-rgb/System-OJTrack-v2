import React, { useState } from 'react'
import { auth, db } from '../firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import type { UserRecord } from '../types'
import CeacMark from './CeacMark'

interface LoginProps {
  onLoginSuccess: (user: UserRecord) => void
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid))

      if (userDoc.exists()) {
        const userData = userDoc.data() as UserRecord
        if (userData.role === 'coordinator' || userData.role === 'admin') {
          onLoginSuccess({ ...userData, id: userCredential.user.uid })
        } else {
          setError('Access denied. This portal is for coordinators only.')
          await auth.signOut()
        }
      } else {
        setError('User record not found in database.')
        await auth.signOut()
      }
    } catch (err: any) {
      setError(err.message || 'Failed to login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-hero">
          <div className="login-mark">
            <CeacMark size={30} />
          </div>
          <h1>OJTrack</h1>
          <p className="login-eyebrow">College of Engineering, Architecture and Computing</p>
          <p>Internship coordination for CEAC, built for the way engineers work.</p>
        </div>
        <p className="login-subline">Coordinator Portal</p>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="coordinator@ndmu.edu.ph"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
