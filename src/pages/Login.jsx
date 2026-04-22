import { useEffect } from 'react'
import { useApp } from '../context/AppContext'
import config from '../config.js'

export default function Login() {
  const { login } = useApp()

  useEffect(() => {
    window.handleGoogleLogin = login
    if (window.google) initGoogle()
    else window.addEventListener('load', initGoogle)
    return () => window.removeEventListener('load', initGoogle)
  }, [login])

  function initGoogle() {
    window.google?.accounts.id.initialize({
      client_id: config.google.clientId,
      callback: login,
    })
    window.google?.accounts.id.renderButton(
      document.getElementById('google-btn'),
      { theme: 'outline', size: 'large', width: 320 }
    )
  }

  return (
    <div className="login-screen">
      <div className="login-bg">
        <div className="orb o1" />
        <div className="orb o2" />
        <div className="orb o3" />
        <div className="grid-bg" />
      </div>
      <div className="login-card">
        <div className="login-brand">
          <svg viewBox="0 0 40 40" width="42" height="42">
            <rect width="40" height="40" rx="10" fill="#0f2744" />
            <text x="20" y="30" fontFamily="serif" fontSize="24" fontWeight="bold" fill="#60a5fa" textAnchor="middle">घ</text>
          </svg>
          <div>
            <div className="brand-name">GharKharcha</div>
            <div className="brand-sub">घर खर्चा · Smart Expense Tracker</div>
          </div>
        </div>
        <div className="login-sep" />
        <div className="login-features">
          <div className="lf-row"><span className="lf-ic">👥</span><span>Groups — share expenses with anyone</span></div>
          <div className="lf-row"><span className="lf-ic">💳</span><span>Track all payment types — UPI, cash, cards</span></div>
          <div className="lf-row"><span className="lf-ic">💵</span><span>Cash in/out flow with running balance</span></div>
          <div className="lf-row"><span className="lf-ic">📊</span><span>CSV import, reports, split & settle</span></div>
        </div>
        <div id="google-btn" style={{ marginBottom: '1rem' }} />
        <div className="login-note">Your data is stored securely in AWS · No password required</div>
      </div>
    </div>
  )
}
