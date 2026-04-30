'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Layout from '@/components/Layout'

export default function MonProfilPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [telephone, setTelephone] = useState('')

  // Facturation
  const [isSociete, setIsSociete] = useState(false)
  const [societeNom, setSocieteNom] = useState('')
  const [siret, setSiret] = useState('')
  const [tvaIntra, setTvaIntra] = useState('')
  const [adresse, setAdresse] = useState('')
  const [codePostal, setCodePostal] = useState('')
  const [ville, setVille] = useState('')
  const [pays, setPays] = useState('France')

  const [plan, setPlan] = useState('free')
  const [loadingStripe, setLoadingStripe] = useState(false)
  const [stripeError, setStripeError] = useState('')

  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')


  // Polling plan après retour Stripe
  async function pollPlanAfterPayment(token: string) {
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 2000))
      try {
        const res = await fetch('/api/stripe/sync', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.plan && data.plan !== 'free') {
          setPlan(data.plan)
          return
        }
      } catch { /* continue polling */ }
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { window.location.href = '/login'; return }
        setUser(session.user)

        // Charger le plan depuis profiles
        const { data: profile } = await supabase.from('profiles').select('plan').eq('id', session.user.id).single()
        if (profile?.plan) setPlan(profile.plan)

        // Gestion retour Stripe
        const params = new URLSearchParams(window.location.search)
        if (params.get('payment') === 'success') {
          setSuccess('Paiement reçu — vérification de votre abonnement...')
          window.history.replaceState({}, '', '/mon-profil')
          // Lancer le polling pour confirmer l'activation du plan
          pollPlanAfterPayment(session.access_token).then(() => {
            setSuccess('Abonnement activé avec succès !')
            setTimeout(() => setSuccess(''), 5000)
          })
        }
        if (params.get('payment') === 'cancel') {
          setError('Paiement annulé')
          window.history.replaceState({}, '', '/mon-profil')
        }

        // Charger les metadata du profil
        const meta = session.user.user_metadata || {}
        setPrenom(meta.prenom || '')
        setNom(meta.nom || '')
        setTelephone(meta.telephone || '')
        setIsSociete(meta.is_societe || false)
        setSocieteNom(meta.societe_nom || '')
        setSiret(meta.siret || '')
        setTvaIntra(meta.tva_intra || '')
        setAdresse(meta.adresse || '')
        setCodePostal(meta.code_postal || '')
        setVille(meta.ville || '')
        setPays(meta.pays || 'France')
      } catch {
        setError('Impossible de charger le profil')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { error: err } = await supabase.auth.updateUser({
        data: { prenom, nom, telephone, is_societe: isSociete, societe_nom: societeNom, siret, tva_intra: tvaIntra, adresse, code_postal: codePostal, ville, pays }
      })
      if (err) throw err
      setSuccess('Informations mises à jour')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde')
    }
    setSaving(false)
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword.length < 8) {
      setError('Le nouveau mot de passe doit faire au moins 8 caractères')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    setSaving(true)
    try {
      const { error: err } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (err) throw err
      setSuccess('Mot de passe modifié avec succès')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err: any) {
      setError(err.message || 'Erreur lors du changement de mot de passe')
    }
    setSaving(false)
  }

  async function handleUpgradeExpert() {
    setLoadingStripe(true)
    setStripeError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: 'expert' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setStripeError(data.error || 'Erreur lors de la redirection vers le paiement')
      }
    } catch {
      setStripeError('Erreur de connexion. Vérifiez votre réseau et réessayez.')
    } finally {
      setLoadingStripe(false)
    }
  }

  async function handleUpgradePro() {
    setLoadingStripe(true)
    setStripeError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: 'pro' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setStripeError(data.error || 'Erreur lors de la redirection vers le paiement')
      }
    } catch {
      setStripeError('Erreur de connexion. Vérifiez votre réseau et réessayez.')
    } finally {
      setLoadingStripe(false)
    }
  }

  async function handleManageSubscription() {
    setLoadingStripe(true)
    setStripeError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setStripeError(data.error || 'Impossible d\'accéder au portail. Contactez le support.')
      }
    } catch {
      setStripeError('Erreur de connexion.')
    } finally {
      setLoadingStripe(false)
    }
  }

  if (loading) return (
    <Layout>
      <div style={{ maxWidth: '720px', margin: '48px auto', padding: '0 24px' }}>
        <div style={{ width: '200px', height: '32px', background: '#e8e2d8', borderRadius: '8px', marginBottom: '8px', animation: 'pulse 1.5s ease infinite' }} />
        <div style={{ width: '320px', height: '16px', background: '#e8e2d8', borderRadius: '8px', marginBottom: '40px', animation: 'pulse 1.5s ease infinite', animationDelay: '0.1s' }} />
        {[1, 2].map(i => (
          <div key={i} style={{ background: '#fff', borderRadius: '16px', padding: '32px', marginBottom: '20px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ width: '120px', height: '12px', background: '#e8e2d8', borderRadius: '8px', marginBottom: '20px', animation: 'pulse 1.5s ease infinite' }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ height: '44px', background: '#f7f4f0', borderRadius: '8px', animation: 'pulse 1.5s ease infinite' }} />
              <div style={{ height: '44px', background: '#f7f4f0', borderRadius: '8px', animation: 'pulse 1.5s ease infinite' }} />
            </div>
          </div>
        ))}
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <style>{`
        .mp-wrap { max-width: 720px; margin: 48px auto; padding: 0 24px; }
        .mp-title { font-family: 'Fraunces', serif; font-size: 32px; font-weight: 800; margin-bottom: 8px; color: #1a1210; }
        .mp-sub { font-size: 16px; color: #7a6a60; margin-bottom: 40px; line-height: 1.5; }
        .mp-section { background: #fff; border-radius: 16px; padding: 32px; margin-bottom: 24px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }
        .mp-section-title { font-family: 'Fraunces', serif; font-size: 20px; font-weight: 700; color: #1a1210; margin-bottom: 8px; padding-bottom: 12px; border-bottom: 2px solid #e8e2d8; }
        .mp-section-desc { font-size: 14px; color: #7a6a60; margin-bottom: 20px; }
        .mp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .mp-field { display: flex; flex-direction: column; gap: 4px; }
        .mp-field-full { display: flex; flex-direction: column; gap: 4px; grid-column: 1 / -1; }
        .mp-label { font-size: 12px; font-weight: 600; color: #7a6a60; letter-spacing: 0.06em; text-transform: uppercase; }
        .mp-input { padding: 12px 16px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1a1210; background: #faf8f5; outline: none; transition: border-color 150ms ease, box-shadow 150ms ease; }
        .mp-input:focus { border-color: #c0392b; box-shadow: 0 0 0 3px rgba(192,57,43,0.1); }
        .mp-input:disabled { background: #f0ede8; color: #7a6a60; cursor: not-allowed; }
        .mp-hint { font-size: 12px; color: #bfb2a6; margin-top: 4px; }
        .mp-toggle { padding: 8px 20px; border-radius: 8px; border: 1.5px solid #e8e2d8; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 150ms ease; background: #faf8f5; color: #7a6a60; }
        .mp-toggle:hover { border-color: #1a1210; color: #1a1210; }
        .mp-toggle.active { background: #1a1210; color: #fff; border-color: #1a1210; }
        .mp-btn { width: 100%; padding: 14px; border-radius: 10px; border: none; font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600; cursor: pointer; transition: opacity 150ms ease; margin-top: 8px; }
        .mp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .mp-btn-primary { background: #c0392b; color: #fff; }
        .mp-btn-primary:hover:not(:disabled) { opacity: 0.85; }
        .mp-btn-secondary { background: #1a1210; color: #fff; }
        .mp-btn-secondary:hover:not(:disabled) { opacity: 0.85; }
        .mp-link { display: inline-block; margin-top: 20px; padding: 12px 24px; border-radius: 10px; border: 1.5px solid #e8e2d8; text-decoration: none; font-size: 14px; font-weight: 600; color: #1a1210; transition: all 150ms ease; }
        .mp-link:hover { border-color: #1a1210; background: rgba(0,0,0,0.03); }
        .mp-toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); z-index: 100; padding: 12px 24px; border-radius: 12px; font-size: 14px; font-weight: 600; box-shadow: 0 4px 20px rgba(0,0,0,0.15); animation: mpToast 300ms ease; }
        .mp-toast-ok { background: #1a7a40; color: #fff; }
        .mp-toast-err { background: #e74c3c; color: #fff; }
        @keyframes mpToast { from { opacity: 0; transform: translateX(-50%) translateY(16px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        .mp-error { background: #fdedec; color: #e74c3c; border-radius: 8px; padding: 12px 16px; font-size: 14px; margin-bottom: 16px; }
        .mp-avatar-big { width: 64px; height: 64px; border-radius: 50%; background: #c0392b; color: #fff; font-size: 24px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        @media (max-width: 768px) {
          .mp-wrap { padding: 0 16px; margin: 24px auto; }
          .mp-title { font-size: 24px; }
          .mp-section { padding: 24px 16px; }
          .mp-grid { grid-template-columns: 1fr; }
          .mp-plans-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div className="mp-wrap">
        <h1 className="mp-title">Mon Profil</h1>
        <p className="mp-sub">{"Gérez vos informations personnelles et votre mot de passe."}</p>

        {error && <div className="mp-error" role="alert">{error}</div>}
        {success && <div className="mp-toast mp-toast-ok" role="status">{success}</div>}

        {/* Informations personnelles */}
        <form onSubmit={handleSaveInfo}>
          <div className="mp-section">
            <h2 className="mp-section-title">Informations personnelles</h2>
            <p className="mp-section-desc">{"Ces informations sont privées et ne sont pas partagées."}</p>

            <div className="mp-avatar-big">{(prenom || user?.email || '?')[0].toUpperCase()}</div>

            <div className="mp-grid">
              <div className="mp-field">
                <label className="mp-label" htmlFor="prenom-input">{"Prénom"}</label>
                <input id="prenom-input" className="mp-input" type="text" value={prenom} onChange={e => { const v = e.target.value; setPrenom(v.charAt(0).toUpperCase() + v.slice(1)) }} placeholder={"Votre prénom"} />
              </div>
              <div className="mp-field">
                <label className="mp-label" htmlFor="nom-input">Nom</label>
                <input id="nom-input" className="mp-input" type="text" value={nom} onChange={e => { const v = e.target.value; setNom(v.charAt(0).toUpperCase() + v.slice(1)) }} placeholder="Votre nom" />
              </div>
              <div className="mp-field">
                <label className="mp-label" htmlFor="email-display">Adresse email</label>
                <input id="email-display" className="mp-input" type="email" value={user?.email || ''} disabled />
                <span className="mp-hint">{"L'email ne peut pas être modifié directement. Contactez-nous si nécessaire."}</span>
              </div>
              <div className="mp-field">
                <label className="mp-label" htmlFor="tel-input">{"Téléphone"}</label>
                <input id="tel-input" className="mp-input" type="tel" value={telephone} onChange={e => setTelephone(e.target.value)} placeholder="06 12 34 56 78" />
              </div>
            </div>

          </div>

          {/* Facturation */}
          <div className="mp-section">
            <h2 className="mp-section-title">Facturation</h2>
            <p className="mp-section-desc">{"Informations utilisées pour vos factures d'abonnement."}</p>

            <div className="mp-field" style={{ marginBottom: '20px' }}>
              <label className="mp-label">Type de compte</label>
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button type="button" className={`mp-toggle ${!isSociete ? 'active' : ''}`} onClick={() => setIsSociete(false)}>Particulier</button>
                <button type="button" className={`mp-toggle ${isSociete ? 'active' : ''}`} onClick={() => setIsSociete(true)}>{"Société"}</button>
              </div>
            </div>

            {isSociete && (
              <div className="mp-grid" style={{ marginBottom: '16px' }}>
                <div className="mp-field">
                  <label className="mp-label" htmlFor="societe-input">{"Raison sociale"}</label>
                  <input id="societe-input" className="mp-input" type="text" value={societeNom} onChange={e => setSocieteNom(e.target.value)} placeholder={"Nom de la société"} />
                </div>
                <div className="mp-field">
                  <label className="mp-label" htmlFor="siret-input">SIRET</label>
                  <input id="siret-input" className="mp-input" type="text" value={siret} onChange={e => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))} placeholder="14 chiffres" maxLength={14} />
                </div>
                <div className="mp-field">
                  <label className="mp-label" htmlFor="tva-input">{"N° TVA intracommunautaire"}</label>
                  <input id="tva-input" className="mp-input" type="text" value={tvaIntra} onChange={e => setTvaIntra(e.target.value.toUpperCase())} placeholder="FR 12 345678901" />
                  <span className="mp-hint">Optionnel</span>
                </div>
              </div>
            )}

            <div className="mp-grid">
              <div className="mp-field-full">
                <label className="mp-label" htmlFor="adresse-input">Adresse</label>
                <input id="adresse-input" className="mp-input" type="text" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder={"Numéro et nom de rue"} />
              </div>
              <div className="mp-field">
                <label className="mp-label" htmlFor="cp-input">Code postal</label>
                <input id="cp-input" className="mp-input" type="text" value={codePostal} onChange={e => setCodePostal(e.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="75001" maxLength={5} />
              </div>
              <div className="mp-field">
                <label className="mp-label" htmlFor="ville-input">Ville</label>
                <input id="ville-input" className="mp-input" type="text" value={ville} onChange={e => setVille(e.target.value)} placeholder="Paris" />
              </div>
              <div className="mp-field">
                <label className="mp-label" htmlFor="pays-input">Pays</label>
                <input id="pays-input" className="mp-input" type="text" value={pays} onChange={e => setPays(e.target.value)} />
              </div>
            </div>

            <button className="mp-btn mp-btn-primary" type="submit" disabled={saving}>
              {saving ? 'Sauvegarde...' : 'Enregistrer mes informations'}
            </button>
          </div>
        </form>

        {/* Abonnement */}
        <div className="mp-section">
          <h2 className="mp-section-title">Mon abonnement</h2>
          <p className="mp-section-desc">{"Gérez votre plan et votre facturation."}</p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <span style={{
              padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' as const,
              background: plan === 'expert' ? 'rgba(192,57,43,0.12)' : plan === 'pro' ? 'rgba(26,122,64,0.1)' : '#f0ede8',
              color: plan === 'expert' ? '#c0392b' : plan === 'pro' ? '#1a7a40' : '#7a6a60',
            }}>
              {plan === 'expert' ? 'Expert' : plan === 'pro' ? 'Pro' : 'Free'}
            </span>
            <span style={{ fontSize: 14, color: '#7a6a60' }}>
              {plan === 'expert' ? `49 ${'\u20AC'}/mois` : plan === 'pro' ? `19 ${'\u20AC'}/mois` : 'Gratuit'}
            </span>
          </div>

          {stripeError && (
            <div style={{ background: '#fdedec', color: '#c0392b', borderRadius: '8px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px' }}>
              {stripeError}
            </div>
          )}

          {plan === 'free' && (
            <div className="mp-plans-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#faf8f5', borderRadius: 12, padding: 20, border: '1.5px solid #e8e2d8' }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, marginBottom: 4 }}>Pro</div>
                <div style={{ fontSize: 24, fontFamily: "'Fraunces', serif", fontWeight: 800, marginBottom: 4 }}>19 {'\u20AC'}<span style={{ fontSize: 14, fontWeight: 400, color: '#7a6a60' }}>/mois</span></div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {['Simulateur fiscal illimité', 'Estimation marché DVF', 'Comparaison 2 régimes', 'Scénario de revente', '2 stratégies + watchlist 50', '1 alerte email'].map(f => (
                    <li key={f} style={{ fontSize: 12, color: '#1a1210', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 13, height: 13, borderRadius: '50%', background: '#d4f5e0', color: '#1a7a40', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{'✓'}</span>{f}
                    </li>
                  ))}
                </ul>
                <button className="mp-btn mp-btn-primary" onClick={handleUpgradePro} disabled={loadingStripe} style={{ marginTop: 0 }}>
                  {loadingStripe ? 'Redirection...' : 'Passer au Pro'}
                </button>
              </div>
              <div style={{ background: '#1a1210', borderRadius: 12, padding: 20, border: '1.5px solid #1a1210' }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 4 }}>Expert</div>
                <div style={{ fontSize: 24, fontFamily: "'Fraunces', serif", fontWeight: 800, color: '#fff', marginBottom: 4 }}>49 {'\u20AC'}<span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>/mois</span></div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {['Tout le plan Pro', 'Enchères judiciaires', 'Toutes stratégies dont IDR', 'Watchlist illimitée', '5 alertes email', 'Export Excel + support prioritaire'].map(f => (
                    <li key={f} style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 13, height: 13, borderRadius: '50%', background: 'rgba(212,245,224,0.2)', color: '#6de8a0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{'✓'}</span>{f}
                    </li>
                  ))}
                </ul>
                <button className="mp-btn" onClick={handleUpgradeExpert} disabled={loadingStripe} style={{ marginTop: 0, background: '#c0392b', color: '#fff' }}>
                  {loadingStripe ? 'Redirection...' : 'Passer Expert'}
                </button>
              </div>
            </div>
          )}

          {plan === 'pro' && (
            <div className="mp-plans-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#1a1210', borderRadius: 12, padding: 20, border: '1.5px solid #1a1210' }}>
                <div style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, color: '#fff', marginBottom: 4 }}>Expert</div>
                <div style={{ fontSize: 24, fontFamily: "'Fraunces', serif", fontWeight: 800, color: '#fff', marginBottom: 4 }}>49 {'\u20AC'}<span style={{ fontSize: 14, fontWeight: 400, color: 'rgba(255,255,255,0.5)' }}>/mois</span></div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {['Enchères judiciaires', 'Toutes stratégies dont IDR', 'Watchlist illimitée', 'Comparaison tous les régimes', '5 alertes email', 'Export Excel + support prioritaire'].map(f => (
                    <li key={f} style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 13, height: 13, borderRadius: '50%', background: 'rgba(212,245,224,0.2)', color: '#6de8a0', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, flexShrink: 0 }}>{'✓'}</span>{f}
                    </li>
                  ))}
                </ul>
                <button className="mp-btn" onClick={handleUpgradeExpert} disabled={loadingStripe} style={{ marginTop: 0, background: '#c0392b', color: '#fff' }}>
                  {loadingStripe ? 'Redirection...' : 'Passer Expert'}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button className="mp-btn mp-btn-secondary" onClick={handleManageSubscription} disabled={loadingStripe} style={{ marginTop: 0 }}>
                  {loadingStripe ? 'Redirection...' : "Gérer mon abonnement"}
                </button>
              </div>
            </div>
          )}

          {plan === 'expert' && (
            <button className="mp-btn mp-btn-secondary" onClick={handleManageSubscription} disabled={loadingStripe}>
              {loadingStripe ? 'Redirection...' : "Gérer mon abonnement"}
            </button>
          )}
        </div>

        {/* Changement de mot de passe */}
        <form onSubmit={handleChangePassword}>
          <div className="mp-section">
            <h2 className="mp-section-title">Mot de passe</h2>
            <p className="mp-section-desc">{"Modifiez votre mot de passe. Minimum 8 caractères."}</p>

            <div className="mp-grid">
              <div className="mp-field-full">
                <label className="mp-label" htmlFor="new-pw">Nouveau mot de passe</label>
                <input id="new-pw" className="mp-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={"8 caractères minimum"} />
              </div>
              <div className="mp-field-full">
                <label className="mp-label" htmlFor="confirm-pw">Confirmer le mot de passe</label>
                <input id="confirm-pw" className="mp-input" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder={"Retapez le mot de passe"} />
              </div>
            </div>

            <button className="mp-btn mp-btn-secondary" type="submit" disabled={saving || !newPassword}>
              {saving ? 'Modification...' : 'Changer mon mot de passe'}
            </button>
          </div>
        </form>

        {/* Lien vers paramètres */}
        <a href="/parametres" className="mp-link">
          {"Mes paramètres fiscaux et financement \u2192"}
        </a>
      </div>

    </Layout>
  )
}
