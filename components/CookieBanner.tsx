'use client'

import { useState, useEffect } from 'react'

const COOKIE_KEY = 'mdb_cookie_consent'

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem(COOKIE_KEY, 'accepted')
    setVisible(false)
  }

  function refuse() {
    localStorage.setItem(COOKIE_KEY, 'refused')
    setVisible(false)
    // Disable Meta Pixel
    if (typeof window !== 'undefined' && (window as any).fbq) {
      (window as any).fbq('consent', 'revoke')
    }
    // Disable GTM
    if (typeof window !== 'undefined') {
      (window as any)['ga-disable-GTM-P2NK7FXK'] = true
    }
  }

  if (!visible) return null

  return (
    <>
      <style>{`
        .cookie-banner {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;
          background: #1a1210; color: #fff; padding: 16px 24px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 16px; flex-wrap: wrap;
          box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
          font-family: 'DM Sans', sans-serif; font-size: 13px; line-height: 1.5;
        }
        .cookie-text { flex: 1; min-width: 240px; }
        .cookie-text a { color: #c0392b; text-decoration: underline; }
        .cookie-btns { display: flex; gap: 8px; flex-shrink: 0; }
        .cookie-btn {
          padding: 8px 20px; border-radius: 8px; font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 600; cursor: pointer; border: none;
          transition: opacity 150ms ease;
        }
        .cookie-btn:hover { opacity: 0.85; }
        .cookie-accept { background: #c0392b; color: #fff; }
        .cookie-refuse { background: transparent; color: #9a8a80; border: 1.5px solid #9a8a80; }
        @media (max-width: 600px) {
          .cookie-banner { flex-direction: column; text-align: center; padding: 20px 16px; }
          .cookie-btns { width: 100%; justify-content: center; }
        }
      `}</style>
      <div className="cookie-banner">
        <div className="cookie-text">
          {"Ce site utilise des cookies pour am\u00E9liorer votre exp\u00E9rience et mesurer l\u2019audience. "}
          <a href="/privacy">{"En savoir plus"}</a>
        </div>
        <div className="cookie-btns">
          <button className="cookie-btn cookie-refuse" onClick={refuse}>Refuser</button>
          <button className="cookie-btn cookie-accept" onClick={accept}>Accepter</button>
        </div>
      </div>
    </>
  )
}
