import CalendarView from '@/components/CalendarView'

export default function CalendrierPage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)' }}>📆 Calendrier</h1>
        <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Vue d&apos;ensemble de toutes vos réservations</p>
      </div>
      <CalendarView />
    </div>
  )
}
