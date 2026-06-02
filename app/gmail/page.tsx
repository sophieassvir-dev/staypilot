'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function GmailPageInner() {
  const params = useSearchParams()
  const status = params.get('status')
  const [syncing, setSyncing] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number; debug?: string[]; sample?: string } | null>(null)
  const [error, setError] = useState(() => status === 'error' ? 'Connexion échouée. Réessaie.' : '')

  const reset = async () => {
    if (!confirm('Supprimer toutes les réservations importées via Gmail et recommencer ?')) return
    setResetting(true)
    await fetch('/api/gmail/reset', { method: 'POST' })
    setResult(null)
    setResetting(false)
  }

  const sync = async () => {
    setSyncing(true)
    setResult(null)
    setError('')
    try {
      const res = await fetch('/api/gmail/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) setError(JSON.stringify(data, null, 2))
      else setResult(data)
    } catch {
      setError('Erreur réseau')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--violet)', marginBottom: 8 }}>
        📬 Connexion Gmail
      </h1>
      <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: 32 }}>
        StayPilot lit les mails de confirmation Airbnb et crée automatiquement les réservations.
      </p>

      {status === 'connected' && (
        <div className="card" style={{ borderLeft: '3px solid #22c55e', marginBottom: 24 }}>
          <p style={{ color: '#16a34a', fontWeight: 600 }}>✅ Gmail connecté avec succès !</p>
        </div>
      )}

      {error && (
        <div className="card" style={{ borderLeft: '3px solid #ef4444', marginBottom: 24 }}>
          <p style={{ color: '#dc2626' }}>❌ {error}</p>
        </div>
      )}

      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 12 }}>Étape 1 — Connecter Gmail</h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 16 }}>
          Autorise StayPilot à lire tes mails Airbnb en lecture seule. Aucun mail ne sera modifié ou supprimé.
        </p>
        <a href="/api/gmail/auth" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
          🔗 Connecter mon Gmail
        </a>
      </div>

      <div className="card">
        <h2 style={{ fontWeight: 700, color: 'var(--violet)', marginBottom: 12 }}>Étape 2 — Synchroniser les réservations</h2>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 16 }}>
          StayPilot va chercher tes 30 derniers mails de confirmation Airbnb et créer les réservations manquantes.
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={sync} disabled={syncing || resetting}>
            {syncing ? '⏳ Synchronisation...' : '🔄 Synchroniser maintenant'}
          </button>
          <button
            onClick={reset}
            disabled={resetting || syncing}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ef4444', background: 'white', color: '#ef4444', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}
          >
            {resetting ? 'Réinitialisation...' : '🗑 Réinitialiser'}
          </button>
        </div>

        {result?.sample && (
          <div style={{ marginTop: 16, background: '#1e1e2e', borderRadius: 8, padding: 12, fontSize: '0.72rem', color: '#a6e3a1', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            <div style={{ color: '#cba6f7', marginBottom: 8, fontWeight: 700 }}>Contenu brut du premier mail :</div>
            {result.sample}
          </div>
        )}

        {result?.debug && (
          <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 8, padding: 12, fontSize: '0.78rem', color: '#64748b', fontFamily: 'monospace' }}>
            {result.debug.map((line, i) => <div key={i}>{line}</div>)}
          </div>
        )}

        {result && (
          <div style={{ marginTop: 20, display: 'flex', gap: 16 }}>
            <div className="card" style={{ flex: 1, textAlign: 'center', background: '#f0fdf4' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16a34a' }}>{result.created}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>créées</div>
            </div>
            <div className="card" style={{ flex: 1, textAlign: 'center', background: '#eff6ff' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#3b82f6' }}>{result.updated}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>mises à jour</div>
            </div>
            <div className="card" style={{ flex: 1, textAlign: 'center', background: '#f8fafc' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#94a3b8' }}>{result.skipped}</div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>ignorées</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function GmailPage() {
  return (
    <Suspense>
      <GmailPageInner />
    </Suspense>
  )
}
