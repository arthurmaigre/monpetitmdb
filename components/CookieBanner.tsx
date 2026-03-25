'use client'

import { useState, useEffect } from 'react'

const COOKIE_KEY = 'mdb_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)
  const [animate, setAnimate] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) {
      setTimeout(() => { setVisible(true); setTimeout(() => setAnimate(true), 50) }, 1500)
    }
  }, [])

  function accept() {
    setAnimate(false)
    setTimeout(() => { localStorage.setItem(COOKIE_KEY, 'accepted'); setVisible(false) }, 300)
  }

  function refuse() {
    setAnimate(false)
    setTimeout(() => {
      localStorage.setItem(COOKIE_KEY, 'refused')
      setVisible(false)
      if (typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('consent', 'revoke')
      }
      if (typeof window !== 'undefined') {
        (window as any)['ga-disable-GTM-P2NK7FXK'] = true
      }
    }, 300)
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        @keyframes cookie-slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .cookie-overlay {
          position: fixed; inset: 0; z-index: 9998;
          background: rgba(26,18,16,0.15);
          backdrop-filter: blur(2px);
          opacity: 0; transition: opacity 300ms ease;
        }
        .cookie-overlay.show { opacity: 1; }
        .cookie-card {
          position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%) translateY(20px);
          z-index: 9999; width: 420px; max-width: calc(100% - 32px);
          background: #fff;
          border-radius: 16px;
          padding: 20px 24px;
          box-shadow: 0 16px 48px rgba(26,18,16,0.18), 0 0 0 1px rgba(0,0,0,0.04);
          font-family: 'DM Sans', sans-serif;
          opacity: 0;
          transition: opacity 300ms ease, transform 300ms ease;
        }
        .cookie-card.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        .cookie-header {
          display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
        }
        .cookie-icon {
          width: 32px; height: 32px; border-radius: 8px;
          background: rgba(192,57,43,0.08);
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; flex-shrink: 0;
        }
        .cookie-title {
          font-family: 'Fraunces', serif; font-size: 15px; font-weight: 700;
          color: #1a1210;
        }
        .cookie-desc {
          font-size: 12px; color: #9a8a80; line-height: 1.5; margin-bottom: 16px;
        }
        .cookie-desc a { color: #c0392b; text-decoration: underline; font-weight: 500; }
        .cookie-btns { display: flex; gap: 10px; }
        .cookie-btn-accept {
          flex: 1; padding: 10px 16px; border-radius: 8px; border: none;
          background: #c0392b; color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: background 150ms ease;
        }
        .cookie-btn-accept:hover { background: #96281b; }
        .cookie-btn-refuse {
          flex: 1; padding: 10px 16px; border-radius: 8px;
          border: 1.5px solid #e8e2d8; background: transparent;
          color: #9a8a80; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: border-color 150ms ease, color 150ms ease;
        }
        .cookie-btn-refuse:hover { border-color: #1a1210; color: #1a1210; }
        @media (max-width: 440px) {
          .cookie-card { bottom: 12px; padding: 16px 18px; }
          .cookie-btns { flex-direction: column; }
        }
      `}</style>
      <div className={`cookie-overlay ${animate ? 'show' : ''}`} onClick={refuse} />
      <div className={`cookie-card ${animate ? 'show' : ''}`}>
        <div className="cookie-header">
          <div className="cookie-icon">{'\uD83C\uDF6A'}</div>
          <div className="cookie-title">{"Votre vie priv\u00E9e compte"}</div>
        </div>
        <div className="cookie-desc">
          {"Nous utilisons des cookies pour mesurer l\u2019audience et am\u00E9liorer votre exp\u00E9rience. Aucune donn\u00E9e n\u2019est vendue \u00E0 des tiers. "}
          <a href="/privacy">{"Politique de confidentialit\u00E9"}</a>
        </div>
        <div className="cookie-btns">
          <button className="cookie-btn-refuse" onClick={refuse}>Refuser</button>
          <button className="cookie-btn-accept" onClick={accept}>Accepter les cookies</button>
        </div>
      </div>
    </>
  )
}
