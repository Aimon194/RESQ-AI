import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, Ambulance, BadgeCheck, Bell, Check, ChevronDown,
  ClipboardList, CloudOff, FileCheck2, Flame, HeartPulse, House, LifeBuoy,
  LoaderCircle, MapPin, Menu, Plus, RefreshCw, Search, Send, ShieldAlert,
  Siren, Tent, Waves, X,
} from './icons.jsx'
import { getPendingReports, removePendingReport, savePendingReport } from './services/offlineReports.js'
import './App.css'

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
const sampleReports = [
  { id: 'INC-FLD-0142', category: 'Flooding', description: 'Water rising rapidly near Riverside Market; several families need help.', location: 'Riverside Market', lat: 22.5726, lon: 88.3639, people: 8, trapped: false, injuries: false, danger: true, priority: 'High', priority_score: 51, status: 'Open', verification: 'Awaiting verification', created_at: new Date().toISOString() },
  { id: 'INC-FLD-0143', category: 'Flooding', description: 'Flood water rising at Riverside Market, families are asking for rescue.', location: 'Riverside Market', lat: 22.573, lon: 88.3642, people: 6, trapped: false, injuries: false, danger: true, priority: 'High', priority_score: 49, status: 'Open', verification: 'Awaiting verification', created_at: new Date().toISOString() },
  { id: 'INC-COL-0144', category: 'Building collapse', description: 'A wall collapsed after heavy rain. Two people are trapped inside.', location: 'Old Town, Ward 4', lat: 22.575, lon: 88.37, people: 2, trapped: true, injuries: true, danger: true, priority: 'Critical', priority_score: 100, status: 'Open', verification: 'Needs review', created_at: new Date().toISOString() },
  { id: 'INC-MED-0145', category: 'Medical emergency', description: 'Elderly resident needs urgent medical attention.', location: 'Community Hall', lat: 22.568, lon: 88.359, people: 1, trapped: false, injuries: true, danger: true, priority: 'High', priority_score: 54, status: 'Assigned', verification: 'Verified', created_at: new Date().toISOString() },
  { id: 'INC-RDB-0146', category: 'Road blockage', description: 'Large tree blocking the road after the storm.', location: null, lat: null, lon: null, people: null, trapped: false, injuries: false, danger: false, priority: 'Low', priority_score: 8, status: 'Open', verification: 'Awaiting verification', created_at: new Date().toISOString() },
]
const sampleResources = [
  { id: 'RES-BOAT-01', type: 'boat', name: 'Rescue Boat 01', capability: 'water rescue', status: 'Available', location: 'Riverside Depot', capacity: 8 },
  { id: 'RES-BOAT-02', type: 'boat', name: 'Rescue Boat 02', capability: 'water rescue', status: 'Available', location: 'North Bank', capacity: 6 },
  { id: 'RES-TEAM-A', type: 'team', name: 'Rescue Team Alpha', capability: 'search and rescue', status: 'Available', location: 'Central Station', capacity: 6 },
  { id: 'RES-TEAM-B', type: 'team', name: 'Rescue Team Bravo', capability: 'urban rescue', status: 'Available', location: 'West Station', capacity: 5 },
  { id: 'RES-MED-01', type: 'medical', name: 'Medical Team 01', capability: 'medical triage', status: 'Available', location: 'Community Hall', capacity: 4 },
  { id: 'RES-AMB-01', type: 'ambulance', name: 'Ambulance 01', capability: 'medical transport', status: 'Available', location: 'Central Station', capacity: 3 },
  { id: 'RES-SHELTER-A', type: 'shelter', name: 'Temporary Shelter A', capability: 'evacuation shelter', status: 'Available', location: 'Community Hall', capacity: 120 },
]
const navigation = [
  ['Overview', 'overview', Activity], ['Live Incidents', 'incidents', Siren],
  ['Incident Map', 'map', MapPin], ['Report Verification', 'verification', FileCheck2],
  ['Resource Allocation', 'resources', LifeBuoy], ['Audit History', 'audit', ClipboardList],
  ['Settings', 'settings', Activity],
]
const categories = ['Flooding', 'Fire', 'Building collapse', 'Landslide', 'Medical emergency', 'Trapped people', 'Road blockage', 'Other']
const categoryIcons = [Waves, Flame, House, Activity, HeartPulse, LifeBuoy, MapPin, Plus]
const newId = () => globalThis.crypto?.randomUUID?.() || `report-${Date.now()}-${Math.random().toString(16).slice(2)}`

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options)
  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try { message = (await response.json()).detail || message } catch { /* keep fallback message */ }
    throw new Error(message)
  }
  return response.json()
}

function Badge({ children, tone = '' }) { return <span className={`tag ${tone}`}>{children}</span> }
function Severity({ value }) { return <span className={`priority ${(value || 'low').toLowerCase()}`}><i />{value || 'Unknown'}</span> }
function Metric({ icon: Icon, title, value, note, tone }) {
  return <article className="metric"><div className={`metric-icon ${tone}`}><Icon size={18} /></div><div><span>{title}</span><strong>{value}</strong><small>{note}</small></div></article>
}

export default function App() {
  const [page, setPage] = useState(() => location.pathname === '/report' ? 'report' : 'overview')
  const [reports, setReports] = useState([])
  const [resources, setResources] = useState([])
  const [events, setEvents] = useState([])
  const [connected, setConnected] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState([])
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [toast, setToast] = useState('')
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [recommendations, setRecommendations] = useState([])

  const refresh = useCallback(async () => {
    try {
      const [reportData, resourceData, auditData] = await Promise.all([
        request('/reports'), request('/resources'), request('/audit'),
      ])
      setReports(reportData.items)
      setResources(resourceData)
      setEvents(auditData)
      setConnected(true)
    } catch { setConnected(false) }
  }, [])

  const syncPending = useCallback(async () => {
    if (!navigator.onLine) return
    const queue = await getPendingReports()
    const failed = []
    for (const report of queue) {
      try {
        await request('/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) })
        await removePendingReport(report.id)
      } catch { failed.push(report) }
    }
    setPending(failed)
    if (failed.length < queue.length) {
      setToast(`${queue.length - failed.length} report(s) synchronized`)
      refresh()
    }
  }, [refresh])

  useEffect(() => {
    const start = setTimeout(() => refresh(), 0)
    getPendingReports().then(queue => setPending(queue))
    const onlineHandler = () => { setOnline(true); syncPending() }
    const offlineHandler = () => setOnline(false)
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    const timer = setInterval(() => refresh(), 30000)
    return () => {
      clearTimeout(start)
      clearInterval(timer)
      window.removeEventListener('online', onlineHandler)
      window.removeEventListener('offline', offlineHandler)
    }
  }, [refresh, syncPending])

  useEffect(() => {
    const onPopState = () => setPage(location.pathname === '/report' ? 'report' : location.pathname.includes('/incidents/') ? 'detail' : location.pathname.slice(1) === 'dashboard' ? 'overview' : location.pathname.slice(1) || 'overview')
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  useEffect(() => {
    if (!toast) return undefined
    const timer = setTimeout(() => setToast(''), 3500)
    return () => clearTimeout(timer)
  }, [toast])
  useEffect(() => {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/service-worker.js').catch(() => {})
  }, [])

  const rows = connected ? reports : sampleReports
  const shown = useMemo(() => rows.filter(report =>
    (priorityFilter === 'All' || report.priority === priorityFilter) &&
    `${report.id} ${report.category} ${report.location || ''} ${report.description}`.toLowerCase().includes(query.toLowerCase()),
  ), [rows, priorityFilter, query])
  const available = resources.filter(resource => resource.status === 'Available').length

  function navigate(destination) {
    setPage(destination)
    setMenuOpen(false)
    const path = destination === 'overview' ? '/dashboard' : destination === 'report' ? '/report' : destination === 'detail' && selected ? `/incidents/${selected.id}` : `/${destination}`
    history.pushState({}, '', path)
  }
  async function loadDemo() {
    setLoading(true)
    try {
      await request('/demo/load', { method: 'POST' })
      await refresh()
      setToast('Synthetic flood scenario loaded')
    } catch {
      setReports(sampleReports)
      setResources(sampleResources)
      setToast('Backend unavailable; local preview shown')
    } finally { setLoading(false) }
  }
  async function resetDemo() {
    if (!confirm('Restore the original synthetic scenario and clear current reports and assignments?')) return
    try {
      await request('/demo/reset', { method: 'POST' })
      await refresh()
      setToast('Original synthetic scenario restored')
    } catch {
      setReports(sampleReports)
      setResources(sampleResources)
      setToast('Local synthetic preview restored')
    }
  }
  async function toggleResource(resource) {
    const status = resource.status === 'Available' ? 'Unavailable' : 'Available'
    try {
      await request(`/resources/${resource.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      refresh()
    } catch { setResources(current => current.map(item => item.id === resource.id ? { ...item, status } : item)) }
    setToast(`${resource.name} marked ${status.toLowerCase()}`)
  }
  async function generateRecommendations() {
    try {
      const data = await request('/allocations/recommend', { method: 'POST' })
      setRecommendations(data.items)
      setToast('Recommendations generated; coordinator approval required')
    } catch { setToast('Allocation engine unavailable while API is disconnected') }
  }
  async function approveAssignment(reportId, resourceId) {
    if (!confirm(`Assign ${resourceId} to ${reportId}?`)) return
    try {
      await request('/allocations/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report_id: reportId, resource_id: resourceId }) })
      await refresh()
      await generateRecommendations()
      setToast('Assignment approved and recorded')
    } catch (error) { setToast(error.message) }
  }
  async function submitCitizenReport(report, photo) {
    if (navigator.onLine) {
      try {
        await request('/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(report) })
        if (photo) {
          const form = new FormData()
          form.append('file', photo)
          try { await request(`/evidence/upload?report_id=${encodeURIComponent(report.id)}`, { method: 'POST', body: form }) }
          catch { setToast('Report synchronized; the attached photo could not be stored') }
        }
        refresh()
        setToast('Report synchronized to the prototype dashboard')
        return 'submitted'
      } catch { /* queue report below */ }
    }
    await savePendingReport(report)
    setPending(await getPendingReports())
    setToast('Saved on this device - not yet delivered')
    return 'queued'
  }
  async function updateIncident(reportId, patch) {
    try {
      const result = await request(`/reports/${reportId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
      setSelected(result)
      refresh()
    } catch (error) { setToast(error.message) }
  }
  async function setVerification(reportId, status) {
    try {
      const result = await request(`/reports/${reportId}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      setSelected(result)
      refresh()
    } catch (error) { setToast(error.message) }
  }

  const total = rows.length
  const critical = rows.filter(row => row.priority === 'Critical').length
  const waiting = rows.filter(row => row.verification !== 'Verified').length
  const title = page === 'detail' ? 'Incident review' : navigation.find(item => item[1] === page)?.[0] || 'Overview'

  return <div className="shell">
    {page !== 'report' && <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <a className="brand" onClick={() => navigate('overview')}><span className="brand-mark"><Waves size={19} /></span><span><b>RESQ <em>AI</em></b><small>RESPONSE INTELLIGENCE</small></span></a>
      <div className="scenario-card"><span className="scenario-dot" /><div><small>ACTIVE SCENARIO</small><b>Monsoon Flood Response</b><span>SIMULATED ENVIRONMENT</span></div></div>
      <div className="nav-caption">OPERATIONS</div>
      <nav>{navigation.map(([label, id, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span>{id === 'incidents' && <small>{rows.length}</small>}</button>)}</nav>
      <div className="sidebar-bottom"><button className="new-report" onClick={() => navigate('report')}><Plus size={17} /> New citizen report</button><div className="profile"><span className="avatar">OC</span><div><b>Operations Coordinator</b><small>Prototype workspace</small></div><ChevronDown size={15} /></div></div>
    </aside>}

    <main className={`main ${page === 'report' ? 'report-main' : ''}`}>
      <header className="topbar">
        {page !== 'report' && <button className="menu-button" onClick={() => setMenuOpen(open => !open)} aria-label="Toggle navigation"><Menu /></button>}
        <div className="crumb">{page === 'report' ? 'Citizen reporting' : title}<span> / </span><b>Simulated flood response</b></div>
        <div className="top-right"><span className={`connection ${online && connected ? 'good' : online ? 'warn' : 'offline'}`}><i />{!online ? 'Offline' : connected ? 'API connected' : 'Demo preview'}</span><button className="bell" aria-label="Notifications"><Bell size={17} />{pending.length > 0 && <i />}</button><span className="top-avatar">OC</span></div>
      </header>

      {page === 'report' ? <CitizenReport onSubmit={submitCitizenReport} onBack={() => navigate('overview')} pending={pending} onSync={syncPending} /> : <div className="page-content">
        <div className="page-title"><div><div className="eyebrow">EMERGENCY OPERATIONS CENTER <span>SIMULATION</span></div><h1>{title}</h1><p>{pageDescription(page)}</p></div><div className="title-actions"><button className="btn secondary" onClick={() => navigate('report')}><Plus size={16} /> New report</button><button className="btn primary" onClick={loadDemo} disabled={loading}>{loading ? <LoaderCircle className="spin" size={16} /> : <RefreshCw size={16} />} Load demo scenario</button></div></div>

        {page === 'overview' && <>
          {!connected && <div className="alert-strip"><CloudOff size={17} /><span><b>Backend unavailable.</b> Local simulated preview only; new reports are not synchronized.</span></div>}
          <div className="alert-strip"><ShieldAlert size={17} /><span><b>Prototype only.</b> This system does not contact emergency services. All scenarios and resources are simulated.</span><button onClick={resetDemo}>Reset demo</button></div>
          <div className="metrics"><Metric icon={ClipboardList} title="Total incidents" value={total} note="All reported incidents" tone="blue" /><Metric icon={AlertTriangle} title="Critical incidents" value={critical} note="Requires immediate review" tone="red" /><Metric icon={FileCheck2} title="Awaiting verification" value={waiting} note="Human review needed" tone="amber" /><Metric icon={LifeBuoy} title="Available resources" value={available} note="Across resource types" tone="green" /></div>
          <div className="overview-grid"><section className="panel queue-panel"><div className="panel-head"><div><h2>Priority incident queue</h2><p>Sorted by explainable priority score</p></div><button className="text-button" onClick={() => navigate('incidents')}>View all</button></div><IncidentTable rows={shown.slice(0, 6)} onSelect={report => { setSelected(report); navigate('detail') }} /></section><OperationsStatus onResources={() => navigate('resources')} /></div>
          <MapPanel reports={rows} resources={resources} onSelect={report => { setSelected(report); navigate('detail') }} />
        </>}

        {(page === 'incidents' || page === 'verification') && <section className="panel full-panel"><TableTools query={query} setQuery={setQuery} priority={priorityFilter} setPriority={setPriorityFilter} onRefresh={refresh} /><IncidentTable rows={page === 'verification' ? shown.filter(row => row.verification !== 'Verified') : shown} onSelect={report => { setSelected(report); navigate('detail') }} /></section>}
        {page === 'map' && <><MapPanel reports={shown} resources={resources} onSelect={report => { setSelected(report); navigate('detail') }} large /><section className="panel full-panel"><TableTools query={query} setQuery={setQuery} priority={priorityFilter} setPriority={setPriorityFilter} onRefresh={refresh} /><IncidentTable rows={shown} onSelect={report => { setSelected(report); navigate('detail') }} /></section></>}
        {page === 'detail' && <IncidentDetail report={selected || rows[0]} onBack={() => navigate('incidents')} onUpdate={updateIncident} onVerify={setVerification} />}
        {page === 'resources' && <ResourcePage resources={resources.length ? resources : sampleResources} recommendations={recommendations} onToggle={toggleResource} onGenerate={generateRecommendations} onApprove={approveAssignment} onRefresh={refresh} />}
        {page === 'audit' && <AuditPage events={connected ? events : []} />}
        {page === 'settings' && <SettingsPage connected={connected} pending={pending.length} />}
        <footer>RESQ AI - Demonstration prototype <span>Not connected to emergency services - all data shown is simulated</span></footer>
      </div>}
    </main>
    {toast && <div className="toast"><Check size={17} />{toast}<button onClick={() => setToast('')} aria-label="Dismiss"><X size={15} /></button></div>}
  </div>
}

function pageDescription(page) {
  return ({ overview: 'A clear operational picture for the simulated Monsoon Flood Response scenario.', incidents: 'Review, verify, and prioritize citizen reports.', map: 'Simulated incident and resource positions; map details are illustrative.', verification: 'Review uncertain, incomplete, or potentially duplicated reports.', resources: 'Availability and coordinator-approved resource assignments.', audit: 'Chronological record of prototype decisions and changes.', settings: 'Connection and local reporting configuration.', detail: 'Review the original report, extracted fields, and decisions.' })[page] || ''
}

function TableTools({ query, setQuery, priority, setPriority, onRefresh }) {
  return <div className="table-toolbar"><div className="searchbox"><Search size={16} /><input aria-label="Search incidents" placeholder="Search reports, IDs, locations..." value={query} onChange={event => setQuery(event.target.value)} /></div><select aria-label="Filter by priority" value={priority} onChange={event => setPriority(event.target.value)}><option>All</option>{['Critical', 'High', 'Medium', 'Low'].map(value => <option key={value}>{value}</option>)}</select><button className="btn secondary" onClick={onRefresh}><RefreshCw size={15} /> Refresh</button></div>
}

function IncidentTable({ rows, onSelect }) {
  return <div className="table-scroll"><table><thead><tr><th>INCIDENT</th><th>TYPE</th><th>LOCATION</th><th>PRIORITY</th><th>VERIFICATION</th><th>PEOPLE</th><th>STATUS</th></tr></thead><tbody>
    {rows.map(report => <tr key={report.id} onClick={() => onSelect(report)} onKeyDown={event => event.key === 'Enter' && onSelect(report)} tabIndex="0"><td><b>{report.id}</b><small>{new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</small></td><td>{report.category}</td><td>{report.location || <span className="unknown">Location unknown</span>}</td><td><Severity value={report.priority} /></td><td><Badge tone={report.verification === 'Verified' ? 'verified' : 'review'}>{report.verification || 'Awaiting verification'}</Badge></td><td>{report.people ?? '-'}</td><td><Badge tone={report.status === 'Resolved' ? 'verified' : 'neutral'}>{report.status || 'Open'}</Badge></td></tr>)}
    {!rows.length && <tr><td colSpan="7"><div className="empty"><ClipboardList size={28} /><b>No incidents found</b><span>Load the simulated scenario or adjust your search.</span></div></td></tr>}
  </tbody></table></div>
}

function OperationsStatus({ onResources }) {
  return <section className="panel side-panel"><div className="panel-head"><div><h2>Operational status</h2><p>Simulated scenario snapshot</p></div><Activity size={18} color="#218b71" /></div><div className="status-list"><div><span>Scenario</span><b>Monsoon flood</b></div><div><span>Blocked route</span><b>Old Town bridge</b></div><div><span>Shelter</span><b>Community Hall</b></div><div><span>Routing</span><b>Unavailable</b></div></div><button className="wide-action" onClick={onResources}>Review resource allocation <span>-&gt;</span></button></section>
}

function MapPanel({ reports, resources, onSelect, large = false }) {
  const plotted = reports.filter(report => report.lat && report.lon)
  return <section className="panel map-preview"><div className="panel-head"><div><h2>Simulated incident map</h2><p>Illustrative positions - no live tiles or routing connected</p></div><Badge tone="review">SIMULATED</Badge></div><div className={`sim-map ${large ? 'large' : ''}`}><div className="map-grid" /><div className="river river-one" /><div className="river river-two" /><div className="road road-one" /><div className="road road-two" /><div className="route-block"><span>x</span> Simulated blocked route</div><div className="shelter-marker" style={{ left: '66%', top: '65%' }}><Tent size={15} /> Community Hall</div>
    {plotted.map((report, index) => <button key={report.id} title={`${report.id} ${report.category}`} className={`map-marker ${(report.priority || 'low').toLowerCase()}`} style={{ left: `${18 + (index * 17) % 68}%`, top: `${24 + (index * 21) % 53}%` }} onClick={() => onSelect(report)}><span>{report.priority === 'Critical' ? '!' : '*'}</span><small>{report.id.slice(-4)}</small></button>)}
    {(resources || []).filter(resource => resource.status === 'Available').map((resource, index) => <span key={resource.id} title={`${resource.name} simulated`} className="resource-pin" style={{ left: `${12 + (index * 13) % 76}%`, top: `${77 + (index % 2) * 8}%` }}><LifeBuoy size={14} /></span>)}<span className="map-attribution">No offline map available</span></div></section>
}

function CitizenReport({ onSubmit, onBack, pending, onSync }) {
  const [category, setCategory] = useState('Flooding')
  const [description, setDescription] = useState('')
  const [locationText, setLocationText] = useState('')
  const [people, setPeople] = useState('')
  const [trapped, setTrapped] = useState(false)
  const [injuries, setInjuries] = useState(false)
  const [danger, setDanger] = useState(false)
  const [coordinates, setCoordinates] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [audioUrl, setAudioUrl] = useState('')
  const [recorder, setRecorder] = useState(null)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [reference, setReference] = useState('')
  const [busy, setBusy] = useState(false)

  function useLocation() {
    if (!navigator.geolocation) { setError('Location is not supported; describe a nearby landmark instead.'); return }
    navigator.geolocation.getCurrentPosition(position => setCoordinates({ lat: position.coords.latitude, lon: position.coords.longitude }), () => setError('Could not access location. You can describe it manually.'))
  }
  async function startVoice() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const next = new MediaRecorder(stream)
      const chunks = []
      next.ondataavailable = event => chunks.push(event.data)
      next.onstop = () => {
        setAudioUrl(URL.createObjectURL(new Blob(chunks, { type: next.mimeType })))
        stream.getTracks().forEach(track => track.stop())
        setRecorder(null)
      }
      next.start()
      setRecorder(next)
    } catch { setError('Microphone unavailable. Attach an audio file or continue with text.') }
  }
  async function submit(event) {
    event.preventDefault()
    if (!description.trim()) { setError('Add a short description before submitting.'); return }
    const report = { id: newId(), category, description: description.trim(), location: locationText.trim() || null, lat: coordinates?.lat ?? null, lon: coordinates?.lon ?? null, people: people ? Number(people) : null, trapped, injuries, danger, created_at: new Date().toISOString() }
    setBusy(true)
    const delivery = await onSubmit(report, photo)
    setReference(report.id)
    setResult(delivery)
    setBusy(false)
  }

  return <div className="report-wrap"><div className="report-head"><a className="brand" onClick={onBack}><span className="brand-mark"><Waves size={19} /></span><span><b>RESQ <em>AI</em></b><small>DISASTER REPORTING PROTOTYPE</small></span></a><span className={`connection ${navigator.onLine ? 'good' : 'offline'}`}><i />{navigator.onLine ? 'Online' : 'Offline'}</span></div>
    <div className="disclaimer"><AlertTriangle size={19} /><p><b>RESQ AI is a prototype and does not contact emergency services.</b> For a real emergency, contact the appropriate official emergency service. Offline reports remain on this device until successfully synchronized.</p></div>
    {result ? <section className="submitted"><div className="success-icon"><Check /></div><h1>Report saved</h1><p>{result === 'submitted' ? 'Your report reached the prototype dashboard.' : 'Saved on this device - not yet delivered.'}</p><div className="reference">REPORT REFERENCE <b>{reference}</b></div><button className="btn primary" onClick={() => { setResult(null); setDescription(''); setLocationText(''); setPeople('') }}>Submit another report</button><button className="text-button" onClick={onBack}>Return to dashboard</button></section> : <form className="report-form" onSubmit={submit}>
      <div className="form-title"><span className="eyebrow">CITIZEN & VOLUNTEER PORTAL</span><h1>Report an emergency</h1><p>Share what you know. An exact location or affected-person count is optional.</p></div>
      {error && <div className="form-error"><AlertTriangle size={16} />{error}<button type="button" onClick={() => setError('')}><X size={15} /></button></div>}
      <label className="field-label">Incident category</label><div className="category-grid">{categories.map((item, index) => { const Icon = categoryIcons[index]; return <button type="button" key={item} className={category === item ? 'selected' : ''} onClick={() => setCategory(item)}><span><Icon size={17} /></span>{item}</button> })}</div>
      <label className="field-label" htmlFor="report-description">What is happening? <i>Required</i></label><textarea id="report-description" rows="4" maxLength="1500" value={description} onChange={event => setDescription(event.target.value)} placeholder="Describe what you can see, nearby landmarks, and immediate dangers." /><div className="char-count">{description.length}/1500</div>
      <div className="section-divider" /><label className="field-label" htmlFor="report-location">Location <i>Optional</i></label><div className="location-row"><input id="report-location" value={locationText} onChange={event => setLocationText(event.target.value)} placeholder="Address, landmark, neighborhood..." /><button type="button" className="btn secondary" onClick={useLocation}><MapPin size={16} /> Use my location</button></div>{coordinates && <small className="coords">Coordinates attached: {coordinates.lat.toFixed(5)}, {coordinates.lon.toFixed(5)}</small>}
      <label className="field-label" htmlFor="people-count">People affected <i>Optional</i></label><input id="people-count" type="number" min="0" max="100000" value={people} onChange={event => setPeople(event.target.value)} placeholder="If known" />
      <div className="checks"><label><input type="checkbox" checked={trapped} onChange={event => setTrapped(event.target.checked)} /> People trapped</label><label><input type="checkbox" checked={injuries} onChange={event => setInjuries(event.target.checked)} /> Injuries reported</label><label><input type="checkbox" checked={danger} onChange={event => setDanger(event.target.checked)} /> Immediate danger</label></div>
      <div className="section-divider" /><label className="field-label">Add evidence <i>Optional</i></label><div className="upload-row"><label className="upload-box"><input type="file" accept="image/*" onChange={event => setPhoto(event.target.files?.[0] || null)} /><Plus size={18} /><span>{photo?.name || 'Add a photo'}</span></label><label className="upload-box"><input type="file" accept="audio/*" onChange={event => { const file = event.target.files?.[0]; if (file) setAudioUrl(URL.createObjectURL(file)) }} /><Plus size={18} /><span>Choose audio</span></label><button type="button" className={`upload-box ${recorder ? 'recording' : ''}`} onClick={() => recorder ? recorder.stop() : startVoice()}>{recorder ? <span className="rec-dot" /> : <Activity size={18} />}<span>{recorder ? 'Stop recording' : 'Record voice'}</span></button></div>
      {photo && <div className="file-preview">{photo.type.startsWith('image/') && <img src={URL.createObjectURL(photo)} alt="Selected report evidence" />}<span>{photo.name}</span><button type="button" onClick={() => setPhoto(null)} aria-label="Remove photo"><X size={15} /></button></div>}{audioUrl && <audio className="audio-player" controls src={audioUrl} />}<p className="transcription-note">Transcription is unavailable in this prototype. No speech text is invented.</p>
      {pending.length > 0 && <div className="pending-box"><CloudOff size={18} /><div><b>{pending.length} report(s) pending synchronization</b><small>Pending reports are stored on this device only.</small></div><button type="button" className="btn secondary" onClick={onSync}>Retry sync</button></div>}
      <button className="btn secondary" type="button" onClick={() => { localStorage.setItem('resq-draft', JSON.stringify({ category, description, locationText, people, trapped, injuries, danger })); setError('Draft saved on this device.') }}>Save draft</button><button className="btn submit-report" type="submit" disabled={busy}>{busy ? <LoaderCircle className="spin" size={16} /> : <Send size={17} />} Submit report</button><small className="privacy-note">No name or contact details are requested. This prototype does not route reports to emergency services.</small>
    </form>}
  </div>
}

function IncidentDetail({ report, onBack, onUpdate, onVerify }) {
  const [editing, setEditing] = useState(false)
  const [duplicates, setDuplicates] = useState([])
  const [note, setNote] = useState('')
  const [evidence, setEvidence] = useState([])
  const [evidenceStatus, setEvidenceStatus] = useState({})
  const [priorityResult, setPriorityResult] = useState(null)
  useEffect(() => {
    if (!report) return undefined
    let active = true
    request(`/reports/${report.id}/evidence`).then(items => { if (active) setEvidence(items) }).catch(() => { if (active) setEvidence([]) })
    request(`/reports/${report.id}/calculate-priority`, { method: 'POST' }).then(result => { if (active) setPriorityResult(result) }).catch(() => { if (active) setPriorityResult(null) })
    return () => { active = false }
  }, [report])
  if (!report) return <div className="empty">Select an incident to review.</div>
  const missing = [!report.location && report.lat == null ? 'location' : null, report.people == null ? 'people affected' : null].filter(Boolean)
  return <><button className="back-link" onClick={onBack}>Back to incidents</button><div className="detail-grid"><section className="panel detail-main"><div className="detail-header"><div><div className="eyebrow">{report.id}</div><h2>{report.category}</h2><p>Reported {new Date(report.created_at).toLocaleString()}</p></div><Severity value={report.priority} /></div>
    <div className="original-report"><small>ORIGINAL CITIZEN REPORT - UNCHANGED</small><p>{report.description}</p></div><div className="panel-subhead"><h3>Structured fields</h3><button className="text-button" onClick={() => setEditing(value => !value)}>{editing ? 'Cancel' : 'Edit fields'}</button></div>
    {editing ? <EditFields report={report} onSave={changes => { onUpdate(report.id, changes); setEditing(false) }} /> : <div className="extract-grid">{[['Category', report.category], ['Location', report.location || 'Unknown'], ['Affected people', report.people ?? 'Unknown'], ['People trapped', report.trapped ? 'Reported' : 'Not reported'], ['Injuries', report.injuries ? 'Reported' : 'Not reported'], ['Immediate danger', report.danger ? 'Reported' : 'Not reported']].map(([label, value]) => <div key={label}><small>{label}</small><b>{value}</b></div>)}</div>}
    <div className="uncertain"><AlertTriangle size={16} /><span><b>Missing information:</b> {missing.length ? missing.join(', ') : 'None detected. Human verification is still recommended.'}</span></div>
    <div className="panel-subhead"><h3>Potential duplicates</h3><button className="btn secondary" onClick={async () => { try { const result = await request(`/reports/${report.id}/find-duplicates`, { method: 'POST' }); setDuplicates(result.candidates) } catch { setDuplicates([]) } }}><Search size={14} /> Check similar reports</button></div>
    {duplicates.map(candidate => <div className="dupe-card" key={candidate.candidate_id}><div><b>{candidate.candidate_id}</b><p>{candidate.reasons.join(' - ')}</p></div><Badge tone="review">{Math.round(candidate.similarity * 100)}% possible match</Badge><button className="text-button" onClick={async () => { if (!confirm('Record this report as a duplicate?')) return; await request(`/reports/${report.id}/mark-duplicate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ candidate_id: candidate.candidate_id }) }) }}>Confirm</button></div>)}
    {!duplicates.length && <p className="muted">A duplicate check is a human review prompt; reports are never automatically merged.</p>}
    <div className="panel-subhead"><h3>Priority explanation</h3></div><div className="score-box"><div className="score-number">{priorityResult?.score ?? report.priority_score ?? '-'}<small>/100</small></div><div><Severity value={priorityResult?.priority || report.priority} /><p>{priorityResult?.explanation || 'Scoring uses explicit danger indicators, affected people when known, and incident category.'}</p>{priorityResult?.factors?.map(factor => <small key={factor.factor}>{factor.factor}: +{factor.points} </small>)}{priorityResult?.missing?.map(item => <small key={item}>Unknown: {item} </small>)}</div></div>
    <div className="panel-subhead"><h3>Internal note</h3></div><div className="location-row"><input value={note} onChange={event => setNote(event.target.value)} placeholder="Add a coordinator note" /><button className="btn secondary" onClick={() => { if (note.trim()) { onUpdate(report.id, { internal_note: note }); setNote('') } }}>Save note</button></div>
    <div className="panel-subhead"><h3>Evidence</h3></div>{evidence.length ? evidence.map(file => <div className="dupe-card" key={file.id}><div><b>{file.filename}</b><p>SHA-256 {file.sha256}</p></div><Badge tone={evidenceStatus[file.id] === 'Hash matches' ? 'verified' : 'neutral'}>{evidenceStatus[file.id] || 'Hash recorded'}</Badge><button className="text-button" onClick={async () => { const result = await request(`/evidence/${file.id}/verify`, { method: 'POST' }); setEvidenceStatus(current => ({ ...current, [file.id]: result.status })) }}>Check hash</button></div>) : <p className="muted">No evidence attached. A matching hash checks file consistency only; it does not establish authenticity or truth.</p>}
  </section><aside className="panel detail-aside"><h3>Coordinator actions</h3><label className="field-label">Verification status</label><select value={report.verification || 'Awaiting verification'} onChange={event => onVerify(report.id, event.target.value)}><option>Awaiting verification</option><option>Needs review</option><option>Verified</option><option>Rejected</option></select><label className="field-label">Incident status</label><select value={report.status || 'Open'} onChange={event => onUpdate(report.id, { status: event.target.value })}><option>Open</option><option>Assigned</option><option>In progress</option><option>Resolved</option></select><div className="audit-mini"><h4>Decision trail</h4><p><BadgeCheck size={15} /> Changes are recorded in the audit history.</p><small>Prototype log is not tamper-proof.</small></div></aside></div></>
}

function EditFields({ report, onSave }) {
  const [category, setCategory] = useState(report.category)
  const [locationText, setLocationText] = useState(report.location || '')
  const [people, setPeople] = useState(report.people ?? '')
  return <div className="edit-fields"><label>Category<input value={category} onChange={event => setCategory(event.target.value)} /></label><label>Location<input value={locationText} onChange={event => setLocationText(event.target.value)} /></label><label>People affected<input type="number" value={people} onChange={event => setPeople(event.target.value)} /></label><button className="btn primary" onClick={() => onSave({ category, location: locationText || null, people: people === '' ? null : Number(people) })}>Save correction</button></div>
}

function ResourcePage({ resources, recommendations, onToggle, onGenerate, onApprove, onRefresh }) {
  const [type, setType] = useState('team')
  const [name, setName] = useState('')
  async function createResource(event) {
    event.preventDefault()
    try { await request('/resources', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, name, capability: type === 'boat' ? 'water rescue' : type === 'medical' ? 'medical triage' : 'search and rescue', status: 'Available', location: 'Demo base' }) }); setName(''); onRefresh() } catch { /* API error is reflected by the connection state */ }
  }
  return <div className="resource-layout"><section className="panel full-panel"><div className="panel-head"><div><h2>Response resources</h2><p>Simulated inventory; availability is checked again before approval</p></div><button className="btn primary" onClick={onGenerate}><RefreshCw size={15} /> Generate recommendations</button></div>
    <div className="resource-grid">{resources.map(resource => <article className="resource-card" key={resource.id}><span className="resource-icon">{resource.type === 'boat' ? <Waves /> : resource.type === 'medical' ? <HeartPulse /> : resource.type === 'ambulance' ? <Ambulance /> : resource.type === 'shelter' ? <Tent /> : <LifeBuoy />}</span><div><Badge tone={resource.status === 'Available' ? 'verified' : 'review'}>{resource.status}</Badge><h3>{resource.name}</h3><p>{resource.capability}</p><small>{resource.location} - Capacity {resource.capacity ?? '-'}</small></div><button className="btn secondary" onClick={() => onToggle(resource)}>{resource.status === 'Available' ? 'Mark unavailable' : 'Mark available'}</button></article>)}</div>
    <form className="add-resource" onSubmit={createResource}><h3>Add resource</h3><select value={type} onChange={event => setType(event.target.value)}><option value="team">Rescue team</option><option value="boat">Rescue boat</option><option value="medical">Medical team</option><option value="ambulance">Ambulance</option><option value="shelter">Shelter</option></select><input required placeholder="Resource name" value={name} onChange={event => setName(event.target.value)} /><button className="btn secondary"><Plus size={15} /> Add</button></form>
  </section><section className="panel full-panel"><div className="panel-head"><div><h2>Recommended allocations</h2><p>Greedy capability matches; coordinator approval required</p></div></div>{recommendations.length ? recommendations.map(item => <div className="recommendation" key={item.report_id}><div><b>{item.report_id}</b><Badge tone="review">{item.priority}</Badge>{item.warning ? <p className="unknown">{item.warning}</p> : item.recommendations.map(resource => <p key={resource.resource_id}>{resource.resource_name} - {resource.rationale}</p>)}</div>{item.recommendations?.map(resource => <button className="btn primary" key={resource.resource_id} onClick={() => onApprove(item.report_id, resource.resource_id)}>Approve assignment</button>)}</div>) : <div className="empty"><LifeBuoy size={28} /><b>No recommendations generated</b><span>Generate a plan to see capability matches.</span></div>}</section></div>
}

function AuditPage({ events }) {
  return <section className="panel full-panel"><div className="panel-head"><div><h2>Audit history</h2><p>Prototype event log; not tamper-proof.</p></div><Badge tone="review">SIMULATED</Badge></div>{events.length ? <div className="timeline">{events.map(event => <article key={event.id}><i /><time>{new Date(event.at).toLocaleString()}</time><b>{event.event.replaceAll('_', ' ')}</b><p>{event.description}</p><small>{event.actor}{event.related_id ? ` - ${event.related_id}` : ''}</small></article>)}</div> : <div className="empty"><ClipboardList size={28} /><b>Audit events are not available</b><span>Connect the backend and load the demo scenario.</span></div>}</section>
}

function SettingsPage({ connected, pending }) {
  return <section className="panel full-panel"><div className="panel-head"><div><h2>Prototype settings</h2><p>Connection and local reporting configuration</p></div></div><div className="status-list"><div><span>API base URL</span><b>{API}</b></div><div><span>Backend connection</span><b>{connected ? 'Connected' : 'Unavailable'}</b></div><div><span>Local pending reports</span><b>{pending}</b></div><div><span>Coordinator authentication</span><b>Not implemented in prototype</b></div></div><p className="muted">Change the API address with VITE_API_BASE_URL. Do not use this demo for real emergency response.</p></section>
}
