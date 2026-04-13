'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/Layout'

// Note: metadata export not possible in client components
// Title set via document.title in useEffect would be needed for SEO

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!name.trim() || !email.trim() || !subject || !message.trim()) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    // For now, just show success (no backend endpoint yet)
    setSent(true)
  }

  return (
    <Layout>
      <style>{`
        .contact-wrap { min-height: 60vh; display: flex; align-items: center; justify-content: center; padding: 48px 24px; }
        .contact-box { background: #fff; border-radius: 20px; padding: 48px; width: 100%; max-width: 520px; box-shadow: 0 4px 24px rgba(0,0,0,0.07); }
        .contact-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #1a1210; }
        .contact-sub { font-size: 14px; color: #7a6a60; margin-bottom: 32px; }
        .contact-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
        .contact-label { font-size: 12px; font-weight: 600; color: #7a6a60; letter-spacing: 0.06em; text-transform: uppercase; }
        .contact-input {
          padding: 12px 16px; border-radius: 10px; border: 1.5px solid #e8e2d8;
          font-family: 'DM Sans', sans-serif; font-size: 14px; color: #1a1210;
          background: #faf8f5; outline: none; transition: border-color 0.15s; min-height: 44px;
        }
        .contact-input:focus { border-color: #c0392b; }
        .contact-textarea { resize: vertical; min-height: 120px; }
        .contact-btn {
          width: 100%; padding: 14px; border-radius: 10px; border: none;
          background: #1a1210; color: #fff; font-family: 'DM Sans', sans-serif;
          font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px;
          transition: opacity 0.15s; min-height: 48px;
        }
        .contact-btn:hover { opacity: 0.8; }
        .contact-error { background: #fde8e8; color: #a33; border-radius: 8px; padding: 10px 14px; font-size: 13px; margin-bottom: 16px; }
        .contact-success { background: #d4f5e0; color: #1a7a40; border-radius: 12px; padding: 24px; font-size: 14px; text-align: center; }
        .contact-success h3 { font-family: 'Fraunces', serif; font-size: 22px; font-weight: 700; margin-bottom: 8px; color: #1a7a40; }
        .contact-info { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e8e2d8; display: flex; gap: 24px; flex-wrap: wrap; }
        .contact-info-item { font-size: 13px; color: #7a6a60; }
        .contact-info-item strong { display: block; color: #1a1210; margin-bottom: 2px; }
        @media (max-width: 768px) {
          .contact-box { padding: 32px 24px; }
        }
      `}</style>

      <div className="contact-wrap">
        <div className="contact-box">
          <h1 className="contact-title">Contactez-nous</h1>
          <p className="contact-sub">{"Une question, une suggestion, un probl\u00E8me ? \u00C9crivez-nous."}</p>

          {sent ? (
            <div className="contact-success">
              <h3>{"Message envoy\u00E9 !"}</h3>
              <p>{"Nous reviendrons vers vous dans les meilleurs d\u00E9lais."}</p>
            </div>
          ) : (
            <>
              {error && <div className="contact-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="contact-field">
                  <label className="contact-label">{"Votre nom *"}</label>
                  <input
                    className="contact-input"
                    type="text"
                    placeholder="Jean Dupont"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div className="contact-field">
                  <label className="contact-label">{"Votre email *"}</label>
                  <input
                    className="contact-input"
                    type="email"
                    placeholder="vous@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="contact-field">
                  <label className="contact-label">{"Sujet *"}</label>
                  <select
                    className="contact-input"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    required
                  >
                    <option value="">Sélectionnez un sujet</option>
                    <option value="Bug">Bug</option>
                    <option value="Question">Question</option>
                    <option value="Suggestion">Suggestion</option>
                    <option value="Partenariat">Partenariat</option>
                    <option value="Autre">Autre</option>
                  </select>
                </div>

                <div className="contact-field">
                  <label className="contact-label">{"Votre message *"}</label>
                  <textarea
                    className="contact-input contact-textarea"
                    placeholder={"D\u00E9crivez votre demande..."}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button className="contact-btn" type="submit">
                  {"Envoyer le message \u2192"}
                </button>
              </form>
            </>
          )}

          <div className="contact-info">
            <div className="contact-info-item">
              <strong>Email</strong>
              contact@monpetitmdb.fr
            </div>
            <div className="contact-info-item">
              <strong>{"R\u00E9ponse"}</strong>
              {"Sous 48h ouvr\u00E9es"}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
