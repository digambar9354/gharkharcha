import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const NAV = [
  {
    label: 'Overview', items: [
      { path: '/dashboard', label: 'Dashboard', icon: <DashIcon /> },
      { path: '/expenses', label: 'Expenses', icon: <ListIcon /> },
      { path: '/cashflow', label: 'Cash Flow', icon: <FlowIcon /> },
    ]
  },
  {
    label: 'Actions', items: [
      { path: '/add', label: 'Add Expense', icon: <PlusIcon /> },
      { path: '/scan', label: 'Scan Receipt', icon: <CamIcon /> },
      { path: '/import', label: 'Import CSV', icon: <UpIcon /> },
    ]
  },
  {
    label: 'Group', items: [
      { path: '/members', label: 'Members', icon: <PeopleIcon /> },
      { path: '/settle', label: 'Split & Settle', icon: <SwapIcon /> },
      { path: '/reports', label: 'Reports', icon: <ChartIcon /> },
    ]
  },
  {
    label: 'Settings', items: [
      { path: '/settings', label: 'Settings', icon: <GearIcon /> },
    ]
  },
]

const MONTHS = [
  ['2026-04', 'Apr 2026'], ['2026-03', 'Mar 2026'], ['2026-02', 'Feb 2026'], ['2026-01', 'Jan 2026'],
  ['2025-12', 'Dec 2025'], ['2025-11', 'Nov 2025'], ['2025-10', 'Oct 2025'], ['2025-09', 'Sep 2025'],
  ['2025-08', 'Aug 2025'], ['2025-07', 'Jul 2025'], ['2025-06', 'Jun 2025'], ['2025-05', 'May 2025'],
  ['2025-04', 'Apr 2025'],
]

export default function Layout({ children }) {
  const { user, logout, groups, currentGroup, switchGroup, createGroup, theme, setTheme, showToast } = useApp()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [month, setMonth] = useState('2026-04')
  const [searchQ, setSearchQ] = useState('')

  const pageTitle = NAV.flatMap(s => s.items).find(i => i.path === location.pathname)?.label || 'GharKharcha'

  const handleNav = (path) => {
    navigate(path)
    setSidebarOpen(false)
  }

  const handleSearch = (e) => {
    setSearchQ(e.target.value)
    // Broadcast to pages via sessionStorage
    sessionStorage.setItem('gk_search', e.target.value)
    window.dispatchEvent(new Event('gk_search'))
  }

  const handleMonthChange = (e) => {
    setMonth(e.target.value)
    sessionStorage.setItem('gk_month', e.target.value)
    window.dispatchEvent(new Event('gk_month'))
  }

  return (
    <div className="app">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay show" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sb-brand">
          <BrandLogo />
          <div>
            <div className="sb-name">GharKharcha</div>
            <div className="sb-group">{currentGroup?.name || 'No group selected'}</div>
          </div>
        </div>

        {/* Group switcher */}
        <div className="group-switcher">
          <select
            className="group-select"
            value={currentGroup?.groupId || ''}
            onChange={e => switchGroup(e.target.value)}
          >
            <option value="">Select group...</option>
            {groups.map(g => <option key={g.groupId} value={g.groupId}>{g.icon} {g.name}</option>)}
          </select>
          <button className="group-new-btn" onClick={() => setShowGroupModal(true)} title="New group">+</button>
        </div>

        {/* Nav */}
        <nav className="nav">
          {NAV.map(section => (
            <div key={section.label}>
              <div className="nav-label">{section.label}</div>
              {section.items.map(item => (
                <a
                  key={item.path}
                  className={`nav-item${location.pathname === item.path ? ' active' : ''}`}
                  onClick={() => handleNav(item.path)}
                >
                  <span className="ni">{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="sb-foot">
          <div className="sb-user">
            <div className="s-av">
              {user?.picture
                ? <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" />
                : user?.initials}
            </div>
            <div className="s-info">
              <div className="s-name">{user?.name}</div>
              <div className="s-email">{user?.email}</div>
            </div>
            <button className="s-out" onClick={logout} title="Sign out"><LogoutIcon /></button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="m-topbar">
        <button className="hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          <span /><span /><span />
        </button>
        <div className="m-logo"><BrandLogoSm /> GharKharcha</div>
        <div className="m-av">
          {user?.picture ? <img src={user.picture} alt={user.name} referrerPolicy="no-referrer" /> : user?.initials}
        </div>
      </div>

      {/* Main */}
      <main className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">{pageTitle}</div>
            <div className="topbar-date">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>
          <div className="topbar-right">
            <div className="search-wrap">
              <SearchIcon />
              <input className="search-input" type="text" placeholder="Search expenses..." value={searchQ} onChange={handleSearch} />
            </div>
            <select className="month-sel" value={month} onChange={handleMonthChange}>
              {MONTHS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button className="btn-add" onClick={() => navigate('/add')}>+ Add</button>
            <button className="theme-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>

        <div className="views">
          {children}
        </div>
      </main>

      {/* Create Group Modal */}
      {showGroupModal && <CreateGroupModal onClose={() => setShowGroupModal(false)} onCreate={createGroup} />}
    </div>
  )
}

function CreateGroupModal({ onClose, onCreate }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [type, setType] = useState('home')

  const handle = () => {
    if (!name.trim()) return
    onCreate(name.trim(), desc.trim(), type)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Create new group</div>
        <div className="fg"><label className="fl">Group name</label><input className="fi" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Patil Home Expenses" /></div>
        <div className="fg"><label className="fl">Description (optional)</label><input className="fi" value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. All home expenses for 2026" /></div>
        <div className="fg">
          <label className="fl">Type</label>
          <select className="fi" value={type} onChange={e => setType(e.target.value)}>
            <option value="home">🏠 Home</option>
            <option value="trip">✈️ Trip</option>
            <option value="office">🏢 Office</option>
            <option value="other">📦 Other</option>
          </select>
        </div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handle}>Create group</button>
        </div>
      </div>
    </div>
  )
}

// ── Icons ──
function DashIcon() { return <svg viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" /><rect x="10" y="1" width="7" height="6" rx="1.5" fill="currentColor" opacity=".4" /><rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity=".4" /><rect x="11" y="10" width="6" height="7" rx="1.5" fill="currentColor" opacity=".4" /></svg> }
function ListIcon() { return <svg viewBox="0 0 18 18" fill="none"><path d="M2 4.5h14M2 9h14M2 13.5h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg> }
function FlowIcon() { return <svg viewBox="0 0 18 18" fill="none"><path d="M9 2v14M5 6l4-4 4 4M5 12l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function PlusIcon() { return <svg viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.5" /><path d="M9 5.5v7M5.5 9h7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg> }
function CamIcon() { return <svg viewBox="0 0 18 18" fill="none"><rect x="1.5" y="4.5" width="15" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" /><circle cx="9" cy="10" r="2.8" stroke="currentColor" strokeWidth="1.3" /><path d="M6.5 1.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg> }
function UpIcon() { return <svg viewBox="0 0 18 18" fill="none"><path d="M9 2v10M5 8l4 4 4-4M3 15h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function PeopleIcon() { return <svg viewBox="0 0 18 18" fill="none"><circle cx="6.5" cy="6" r="2.8" stroke="currentColor" strokeWidth="1.4" /><circle cx="13" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.3" /><path d="M1.5 15c0-2.8 2-4.5 5-4.5s5 1.7 5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M13 10.5c1.8 0 3.5 1.2 3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg> }
function SwapIcon() { return <svg viewBox="0 0 18 18" fill="none"><path d="M2 9h14M2 9l4-4M2 9l4 4M16 9l-4-4M16 9l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function ChartIcon() { return <svg viewBox="0 0 18 18" fill="none"><path d="M3 14V8M6.5 14V4M10 14V9.5M13.5 14V6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg> }
function GearIcon() { return <svg viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.4" /><path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg> }
function LogoutIcon() { return <svg viewBox="0 0 16 16" fill="none" width="14" height="14"><path d="M11 8H4M11 8l-2.5-2.5M11 8l-2.5 2.5M6 4V3a1.5 1.5 0 011.5-1.5h5A1.5 1.5 0 0114 3v10a1.5 1.5 0 01-1.5 1.5h-5A1.5 1.5 0 016 13v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg> }
function SearchIcon() { return <svg viewBox="0 0 16 16" fill="none" width="14" height="14" className="search-icon"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.4" /><path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg> }
function BrandLogo() { return <svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="8" fill="rgba(255,255,255,0.1)" /><text x="16" y="24" fontFamily="serif" fontSize="19" fontWeight="bold" fill="#60a5fa" textAnchor="middle">घ</text></svg> }
function BrandLogoSm() { return <svg viewBox="0 0 24 24" width="20" height="20"><rect width="24" height="24" rx="6" fill="#0f2744" /><text x="12" y="18" fontFamily="serif" fontSize="14" fontWeight="bold" fill="#60a5fa" textAnchor="middle">घ</text></svg> }
