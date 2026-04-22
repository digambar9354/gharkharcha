import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { fmt } from '../components/index.jsx'

export default function Members() {
  const { fetchMembers, addMember, members, expenses, currency, gid, showToast } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [link, setLink] = useState('')

  useEffect(() => { fetchMembers() }, [gid])

  const handleAdd = async () => {
    if (!name.trim() || !email.includes('@')) { showToast('Enter valid name and Gmail'); return }
    const ok = await addMember(name.trim(), email.trim(), role)
    if (ok) { setName(''); setEmail('') }
  }

  const genLink = () => {
    const l = `${window.location.origin}?join=${gid}`
    setLink(l)
    navigator.clipboard.writeText(l).then(() => showToast('Invite link copied!'))
  }

  return (
    <div className="view active">
      <div className="members-grid stagger">
        {members.length === 0
          ? <div className="empty" style={{ gridColumn: '1/-1' }}>No members yet. Create a group and invite people!</div>
          : members.map(m => {
            const memberExpenses = expenses.filter(e => e.paidBy === m.name)
            const spent = memberExpenses.reduce((s, e) => s + Number(e.amount), 0)
            return (
              <div key={m.email} className="mem-card">
                <div className="mem-head">
                  <div className="mem-av" style={{ background: m.color, color: m.textColor }}>{m.initials}</div>
                  <div>
                    <div className="mem-name">{m.name}</div>
                    <div className="mem-email">{m.email}</div>
                    <span className="mem-role-badge">{m.role}</span>
                  </div>
                </div>
                <div className="mem-stats">
                  Spent: <strong>{fmt(spent, currency)}</strong> · {memberExpenses.length} expenses
                </div>
              </div>
            )
          })}
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-hd"><div className="pt">Invite to group</div></div>
        <div className="invite-box">
          <div className="invite-link-row">
            <input className="fi" type="text" value={link} readOnly placeholder="Generate invite link..." style={{ flex: 1 }} />
            <button className="btn-save" onClick={genLink}>Generate & copy link</button>
          </div>
          <div className="invite-sep">or invite by email</div>
          <div className="invite-email-row">
            <input className="fi" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={{ width: 130 }} />
            <input className="fi" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Gmail address" style={{ flex: 1 }} />
            <select className="fi" value={role} onChange={e => setRole(e.target.value)} style={{ width: 120 }}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="view">View only</option>
            </select>
            <button className="btn-save" onClick={handleAdd}>Add</button>
          </div>
        </div>
      </div>
    </div>
  )
}
