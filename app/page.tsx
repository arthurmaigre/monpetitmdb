import PricingCta from '@/components/PricingCta'
import LandingHeader from '@/components/LandingHeader'

export default function Home() {
  return (
    <>
      <style>{`
        :root{--bg:#faf8f5;--ink:#1a1210;--red:#c0392b;--red-dark:#96281b;--red-light:#e8503a;--sand:#e8e2d8;--muted:#7a6a60;--card:#fff;--cream:#f0ebe3;}
        .lp *{box-sizing:border-box;margin:0;padding:0;}
        .lp{background:var(--bg);font-family:'DM Sans',sans-serif;color:var(--ink);}
        .fade-in{opacity:0;transform:translateY(24px);transition:opacity .6s ease,transform .6s ease;}
        .fade-in.visible{opacity:1;transform:translateY(0);}
        /* HEADER */
        .lp-header{background:rgba(250,248,245,.96);backdrop-filter:blur(20px);border-bottom:1px solid var(--sand);padding:0 64px;height:68px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100;}
        .lp-logo{font-family:'Fraunces',serif;font-size:22px;font-weight:800;letter-spacing:-.02em;color:var(--ink);text-decoration:none;}
        .lp-logo span{color:var(--red);}
        .lp-nav{display:flex;gap:32px;align-items:center;}
        .lp-nav a{font-size:14px;font-weight:500;color:var(--muted);text-decoration:none;transition:color .15s;}
        .lp-nav a:hover{color:var(--ink);}
        .btn-o{padding:9px 20px;border-radius:8px;border:1.5px solid var(--sand);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:500;color:var(--ink);background:transparent;cursor:pointer;text-decoration:none;transition:all 150ms ease;}
        .btn-o:hover{border-color:var(--ink);}
        .btn-p{padding:10px 24px;border-radius:8px;border:none;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:#fff;background:var(--red);cursor:pointer;text-decoration:none;transition:background 150ms ease;}
        .btn-p:hover{background:var(--red-dark);}
        /* HERO */
        .hero{padding:110px 64px 90px;max-width:1400px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;}
        .eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--red);margin-bottom:20px;}
        .eyebrow::before{content:'';width:24px;height:2px;background:var(--red);display:inline-block;}
        .hero h1{font-family:'Fraunces',serif;font-size:60px;font-weight:800;line-height:1.08;letter-spacing:-.03em;margin-bottom:24px;}
        .hero h1 em{font-style:normal;color:var(--red);}
        .hero-desc{font-size:18px;color:var(--muted);line-height:1.65;margin-bottom:40px;max-width:480px;}
        .hero-btns{display:flex;gap:12px;margin-bottom:48px;}
        .btn-hero{padding:14px 32px;border-radius:10px;border:none;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;color:#fff;background:var(--red);cursor:pointer;text-decoration:none;box-shadow:0 4px 16px rgba(192,57,43,.3);transition:all .2s;}
        .btn-hero:hover{background:var(--red-dark);transform:translateY(-1px);}
        .btn-ghost{padding:14px 28px;border-radius:10px;border:1.5px solid var(--sand);font-family:'DM Sans',sans-serif;font-size:15px;font-weight:500;color:var(--ink);background:transparent;cursor:pointer;text-decoration:none;transition:all 150ms ease;}
        .btn-ghost:hover{border-color:var(--ink);}
        .hero-stats{display:flex;gap:40px;}
        .stat-num{font-family:'Fraunces',serif;font-size:28px;font-weight:800;}
        .stat-lbl{font-size:12px;color:var(--muted);}
        /* HERO VISUAL */
        .hero-visual{position:relative;height:600px;}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .mc{background:#fff;border-radius:20px;box-shadow:0 24px 64px rgba(26,18,16,.12);overflow:hidden;position:absolute;}
        .mc-main{width:400px;right:0;top:0;bottom:0;animation:float 6s ease-in-out infinite;}
        .mc-float{width:220px;left:0;top:80px;padding:16px 20px;z-index:2;animation:float 6s ease-in-out infinite 1.5s;}
        .mc-hdr{background:var(--ink);padding:14px 20px;display:flex;align-items:center;gap:8px;}
        .mc-dot{width:10px;height:10px;border-radius:50%;}
        .mc-photo{width:100%;height:180px;position:relative;overflow:hidden;}
        .mc-badge{position:absolute;top:12px;left:12px;background:rgba(255,255,255,.9);padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;color:var(--ink);}
        .mc-rend{position:absolute;top:12px;right:12px;background:rgba(212,245,224,.95);color:#1a7a40;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;}
        .mc-body{padding:20px;}
        .mc-title{font-family:'Fraunces',serif;font-size:18px;font-weight:700;margin-bottom:4px;}
        .mc-loc{font-size:12px;color:var(--muted);margin-bottom:14px;}
        .mc-prix{font-size:26px;font-weight:700;margin-bottom:10px;letter-spacing:-.02em;}
        .mc-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0ede8;font-size:13px;}
        .mc-row:last-of-type{border-bottom:none;}
        .mc-val{font-weight:600;}
        .mc-val.r{color:var(--red);}
        .mc-val.g{color:#1a7a40;}
        .mc-cf{margin-top:14px;background:#fde8e8;border-radius:10px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;}
        .mc-cflbl{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;}
        .mc-cfval{font-family:'Fraunces',serif;font-size:22px;font-weight:800;color:var(--red);}
        .mc-flbl{font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;}
        .mc-frow{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}
        .mc-flabel{font-size:12px;color:var(--muted);}
        .mc-fval{font-family:'Fraunces',serif;font-size:16px;font-weight:800;}
        .mc-ecart{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;background:#d4f5e0;color:#1a7a40;}
        /* STRATEGIES */
        .strats{padding:100px 64px;background:var(--ink);position:relative;overflow:hidden;}
        .strats::before{content:'';position:absolute;top:-100px;right:-100px;width:500px;height:500px;background:radial-gradient(circle,rgba(192,57,43,.15) 0%,transparent 70%);pointer-events:none;}
        .strats-in{max-width:1280px;margin:0 auto;}
        .eyebrow-w{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--red-light);margin-bottom:16px;}
        .eyebrow-w::before{content:'';width:24px;height:2px;background:var(--red-light);display:inline-block;}
        .strats h2{font-family:'Fraunces',serif;font-size:48px;font-weight:800;color:#fff;margin-bottom:16px;letter-spacing:-.02em;}
        .strats-desc{font-size:17px;color:rgba(255,255,255,.5);margin-bottom:64px;max-width:560px;}
        .strat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;}
        .strat-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:28px 24px;transition:all .2s;}
        .strat-card:hover{background:rgba(255,255,255,.08);border-color:rgba(192,57,43,.4);transform:translateY(-4px);}
        .strat-icon{width:44px;height:44px;background:rgba(192,57,43,.2);border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:20px;font-size:20px;}
        .strat-name{font-family:'Fraunces',serif;font-size:20px;font-weight:700;color:#fff;margin-bottom:10px;}
        .strat-desc{font-size:14px;color:rgba(255,255,255,.5);line-height:1.6;margin-bottom:20px;}
        .strat-tag{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(192,57,43,.2);color:var(--red-light);}
        /* HOW */
        .how{padding:100px 64px;max-width:1280px;margin:0 auto;}
        .how-hdr{text-align:center;margin-bottom:72px;}
        .how h2{font-family:'Fraunces',serif;font-size:48px;font-weight:800;letter-spacing:-.02em;margin-bottom:16px;}
        .how-sub{font-size:17px;color:var(--muted);max-width:480px;margin:0 auto;}
        .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;position:relative;}
        .steps::before{content:'';position:absolute;top:40px;left:calc(100%/6);right:calc(100%/6);height:1px;background:var(--sand);z-index:0;}
        .step{text-align:center;padding:0 32px;position:relative;z-index:1;}
        .step-num{width:80px;height:80px;border-radius:50%;background:var(--bg);border:2px solid var(--sand);display:flex;align-items:center;justify-content:center;margin:0 auto 28px;font-family:'Fraunces',serif;font-size:28px;font-weight:800;color:var(--red);position:relative;z-index:2;}
        .step-title{font-family:'Fraunces',serif;font-size:22px;font-weight:700;margin-bottom:12px;}
        .step-desc{font-size:15px;color:var(--muted);line-height:1.65;}
        /* SCREENSHOT */
        .ss{padding:80px 64px;background:var(--cream);}
        .ss-in{max-width:1280px;margin:0 auto;}
        .ss-hdr{text-align:center;margin-bottom:56px;}
        .ss-hdr h2{font-family:'Fraunces',serif;font-size:42px;font-weight:800;letter-spacing:-.02em;margin-bottom:12px;}
        .ss-hdr p{font-size:16px;color:var(--muted);}
        .app{background:#fff;border-radius:20px;box-shadow:0 32px 80px rgba(26,18,16,.14);overflow:hidden;max-width:1100px;margin:0 auto;}
        .app-bar{background:var(--bg);border-bottom:1px solid var(--sand);padding:12px 24px;display:flex;align-items:center;gap:20px;}
        .app-dots{display:flex;gap:6px;}
        .app-dot{width:12px;height:12px;border-radius:50%;}
        .app-url{flex:1;background:var(--sand);border-radius:6px;padding:5px 14px;font-size:12px;color:var(--muted);text-align:center;}
        .app-body{padding:20px;}
        .app-filter-bar{display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap;background:#fff;border-radius:12px;padding:12px 16px;margin-bottom:16px;border:1.5px solid var(--sand);}
        .app-fg{display:flex;flex-direction:column;gap:3px;}
        .app-fl{font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;}
        .app-fs{padding:6px 10px;border-radius:6px;font-size:12px;font-family:'DM Sans',sans-serif;border:1.5px solid var(--sand);background:var(--bg);color:var(--ink);min-width:120px;height:29px;box-sizing:border-box;display:flex;align-items:center;}
        .app-fs.active{border-color:var(--red);background:#fff8f7;color:var(--red);font-weight:600;}
        .app-loc{min-width:140px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .app-sep{width:1px;background:var(--sand);align-self:stretch;margin-top:14px;}
        .app-vt{margin-left:auto;display:flex;gap:4px;align-self:flex-end;}
        .app-vb{padding:6px 10px;border-radius:6px;border:1.5px solid var(--sand);background:transparent;color:var(--muted);font-size:10px;font-weight:500;font-family:'DM Sans',sans-serif;cursor:pointer;}
        .app-vb.on{background:var(--ink);color:#fff;border-color:var(--ink);}
        .app-mhdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;}
        .rc{font-size:12px;color:var(--muted);}
        .rc strong{color:var(--ink);}
        .ag{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
        .ac{background:#fff;border-radius:12px;overflow:hidden;border:1px solid var(--sand);}
        .ac-img{height:100px;position:relative;}
        .ac-br{position:absolute;top:8px;right:8px;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;}
        .ac-br.g{background:rgba(212,245,224,.95);color:#1a7a40;}
        .ac-br.y{background:rgba(255,243,205,.95);color:#856404;}
        .ac-br.r{background:rgba(253,232,232,.95);color:#a33;}
        .ac-bm{position:absolute;top:8px;left:8px;background:rgba(255,255,255,.88);padding:2px 7px;border-radius:10px;font-size:10px;font-weight:600;color:var(--ink);}
        .ac-pv{position:absolute;bottom:8px;right:8px;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:700;}
        .ac-body{padding:10px 12px;}
        .ac-title{font-size:12px;font-weight:600;margin-bottom:2px;}
        .ac-loc{font-size:11px;color:var(--muted);margin-bottom:6px;}
        .ac-price{font-size:15px;font-weight:700;margin-bottom:5px;}
        .ac-tags{display:flex;gap:4px;flex-wrap:wrap;}
        .ac-tag{font-size:10px;padding:2px 6px;border-radius:4px;background:#f7f4f0;color:var(--muted);}
        /* PRICING */
        .pricing{padding:100px 64px;max-width:1280px;margin:0 auto;}
        .pricing-hdr{text-align:center;margin-bottom:64px;}
        .pricing-hdr h2{font-family:'Fraunces',serif;font-size:48px;font-weight:800;letter-spacing:-.02em;margin-bottom:16px;}
        .pricing-hdr p{font-size:17px;color:var(--muted);}
        .plans{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:980px;margin:0 auto;}
        .plan{background:var(--card);border-radius:20px;padding:36px 32px;border:1.5px solid var(--sand);position:relative;transition:transform .2s,box-shadow .2s;}
        .plan:hover{transform:translateY(-4px);box-shadow:0 16px 48px rgba(26,18,16,.08);}
        .plan.ft{border-color:var(--red);background:var(--ink);color:#fff;}
        .plan-badge{position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:var(--red);color:#fff;padding:4px 16px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;}
        .plan-name{font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);margin-bottom:12px;}
        .plan.ft .plan-name{color:rgba(255,255,255,.5);}
        .plan-price{font-family:'Fraunces',serif;font-size:52px;font-weight:800;letter-spacing:-.03em;margin-bottom:4px;line-height:1;}
        .plan.ft .plan-price{color:#fff;}
        .plan-period{font-size:14px;color:var(--muted);margin-bottom:28px;}
        .plan.ft .plan-period{color:rgba(255,255,255,.4);}
        .plan-div{height:1px;background:var(--sand);margin-bottom:24px;}
        .plan.ft .plan-div{background:rgba(255,255,255,.1);}
        .plan-feats{list-style:none;display:flex;flex-direction:column;gap:12px;margin-bottom:32px;}
        .plan-feats li{display:flex;align-items:center;gap:10px;font-size:14px;}
        .plan.ft .plan-feats li{color:rgba(255,255,255,.85);}
        .pck{width:18px;height:18px;border-radius:50%;background:#d4f5e0;color:#1a7a40;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;flex-shrink:0;}
        .plan.ft .pck{background:rgba(212,245,224,.2);color:#6de8a0;}
        .pcx{width:18px;height:18px;border-radius:50%;background:#f0ede8;color:var(--muted);display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;}
        .plan-cta{width:100%;padding:13px;border-radius:10px;border:1.5px solid var(--sand);font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:var(--ink);background:transparent;cursor:pointer;transition:all .15s;}
        .plan-cta:hover{background:var(--ink);color:#fff;border-color:var(--ink);}
        .plan.ft .plan-cta{background:var(--red);border-color:var(--red);color:#fff;}
        .plan.ft .plan-cta:hover{background:var(--red-dark);}
        /* LOGOS */
        .logos{padding:48px 64px;background:var(--cream);text-align:center;}
        .logos-label{font-size:13px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:28px;}
        .logos-row{display:flex;justify-content:center;align-items:center;gap:40px;flex-wrap:wrap;max-width:900px;margin:0 auto;opacity:.5;filter:grayscale(100%);}
        .logos-row span{font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;color:var(--ink);white-space:nowrap;}
        /* CTA FINAL */
        .cta-final{padding:100px 64px;text-align:center;background:linear-gradient(180deg,var(--bg) 0%,var(--cream) 100%);}
        .cta-final h2{font-family:'Fraunces',serif;font-size:42px;font-weight:800;letter-spacing:-.02em;margin-bottom:16px;}
        .cta-final h2 em{font-style:normal;color:var(--red);}
        .cta-final p{font-size:17px;color:var(--muted);margin-bottom:40px;max-width:520px;margin-left:auto;margin-right:auto;}
        .cta-final .btn-hero{display:inline-block;}
        /* TESTIMONIALS */
        .testi{padding:80px 64px;background:var(--bg);text-align:center;}
        .testi-hdr{margin-bottom:48px;}
        .testi-hdr h2{font-family:'Fraunces',serif;font-size:42px;font-weight:800;letter-spacing:-.02em;margin-bottom:12px;}
        .testi-hdr p{font-size:16px;color:var(--muted);}
        .testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1080px;margin:0 auto;}
        .testi-card{background:var(--card);border-radius:16px;padding:28px 24px;border:1px solid var(--sand);text-align:left;}
        .testi-quote{font-size:15px;line-height:1.65;color:var(--ink);margin-bottom:20px;font-style:italic;}
        .testi-author{display:flex;align-items:center;gap:12px;}
        .testi-avatar{width:40px;height:40px;border-radius:50%;background:var(--cream);display:flex;align-items:center;justify-content:center;font-family:'Fraunces',serif;font-weight:800;font-size:16px;color:var(--red);flex-shrink:0;}
        .testi-name{font-size:14px;font-weight:600;color:var(--ink);}
        .testi-role{font-size:12px;color:var(--muted);}
        .plan-trial{display:block;margin-top:6px;font-size:13px;color:rgba(255,255,255,.6);font-weight:400;}
        /* FOOTER */
        .lp-footer{background:var(--ink);padding:56px 64px 40px;color:rgba(255,255,255,.6);}
        .ft-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px;padding-bottom:48px;border-bottom:1px solid rgba(255,255,255,.08);max-width:1280px;margin-left:auto;margin-right:auto;}
        .ft-logo{font-family:'Fraunces',serif;font-size:24px;font-weight:800;color:#fff;margin-bottom:10px;}
        .ft-logo span{color:var(--red-light);}
        .ft-tag{font-size:14px;color:rgba(255,255,255,.4);max-width:260px;line-height:1.5;}
        .ft-links{display:flex;gap:64px;}
        .ft-col h4{font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.4);margin-bottom:16px;}
        .ft-col a{display:block;font-size:14px;color:rgba(255,255,255,.6);text-decoration:none;margin-bottom:10px;transition:color 150ms ease;}
        .ft-col a:hover{color:#fff;}
        .ft-bottom{display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.3);max-width:1280px;margin:0 auto;}
        /* RESPONSIVE */
        @media(max-width:1024px){
          .hero{grid-template-columns:1fr;gap:48px;padding:80px 32px 60px;}
          .hero-visual{display:none;}
          .strat-grid{grid-template-columns:repeat(2,1fr);}
          .ag{grid-template-columns:repeat(2,1fr);}
          .plans{grid-template-columns:1fr;max-width:400px;}
          .ft-links{gap:32px;}
        }
        @media(max-width:768px){
          .lp-header{padding:0 24px;}
          .lp-nav{display:none;}
          .hero{padding:60px 24px 48px;}
          .hero h1{font-size:40px;}
          .hero-stats{gap:24px;}
          .stat-num{font-size:22px;}
          .strats{padding:64px 24px;}
          .strats h2{font-size:32px;}
          .strat-grid{grid-template-columns:1fr;}
          .how{padding:64px 24px;}
          .how h2{font-size:32px;}
          .steps{grid-template-columns:1fr;gap:40px;}
          .steps::before{display:none;}
          .ss{padding:48px 24px;}
          .ss-hdr h2{font-size:28px;}
          .app-filter-bar{flex-direction:column;align-items:stretch;}
          .app-sep{display:none;}
          .app-vt{margin-left:0;justify-content:flex-end;}
          .ag{grid-template-columns:1fr;}
          .pricing{padding:64px 24px;}
          .pricing-hdr h2{font-size:32px;}
          .lp-footer{padding:40px 24px 32px;}
          .ft-top{flex-direction:column;gap:32px;}
          .ft-links{flex-direction:column;gap:24px;}
          .testi{padding:48px 24px;}
          .testi-grid{grid-template-columns:1fr;}
          .testi-hdr h2{font-size:28px;}
          .logos{padding:32px 24px;}
          .logos-row{gap:24px;}
          .logos-row span{font-size:14px;}
          .cta-final{padding:64px 24px;}
          .cta-final h2{font-size:28px;}
        }
      `}</style>

      <div className="lp">
        {/* HEADER */}
        <header className="lp-header">
          <a href="/" className="lp-logo">Mon Petit <span>MDB</span></a>
          <nav className="lp-nav">
            <a href="#strats">{"Strat\u00E9gies"}</a>
            <a href="#how">{"Comment \u00E7a marche"}</a>
            <a href="#pricing">Tarifs</a>
          </nav>
          <LandingHeader />
        </header>

        {/* HERO */}
        <section>
          <div className="hero">
            <div>
              <div className="eyebrow">Plateforme de sourcing immobilier</div>
              <h1>Investissez comme un <em>marchand de biens</em></h1>
              <p className="hero-desc">
                {"Mon Petit MDB agr\u00E8ge 60+ plateformes, estime les prix via les donn\u00E9es DVF et simule la fiscalit\u00E9 de vos investissements \u2014 7 r\u00E9gimes fiscaux, du micro-foncier au marchand de biens."}
              </p>
              <div className="hero-btns">
                <a href="/biens" className="btn-hero">{"Voir les biens disponibles \u2014 Gratuit"}</a>
                <a href="#how" className="btn-ghost">{"Comment \u00E7a marche"}</a>
              </div>
              <div className="hero-stats">
                <div><div className="stat-num">90 000+</div><div className="stat-lbl">{"Biens analys\u00E9s"}</div></div>
                <div><div className="stat-num">{"France enti\u00E8re"}</div><div className="stat-lbl">{"36 000+ villes"}</div></div>
                <div><div className="stat-num">7</div><div className="stat-lbl">{"R\u00E9gimes fiscaux"}</div></div>
                <div><div className="stat-num" style={{ fontSize: '18px' }}>DVF</div><div className="stat-lbl">{"Donn\u00E9es notariales officielles"}</div></div>
              </div>
            </div>
            <div className="hero-visual">
              {/* Floating estimation card */}
              <div className="mc mc-float">
                <div className="mc-flbl">{"Estimation march\u00E9 DVF"}</div>
                <div className="mc-frow"><span className="mc-flabel">Prix FAI</span><span className="mc-fval" style={{ color: 'var(--red)' }}>67 000 {'\u20AC'}</span></div>
                <div className="mc-frow"><span className="mc-flabel">{"Estimation march\u00E9"}</span><span className="mc-fval" style={{ color: 'var(--ink)' }}>82 500 {'\u20AC'}</span></div>
                <span className="mc-ecart">-18.8 % sous le march{'\u00E9'}</span>
              </div>
              {/* Main property card */}
              <div className="mc mc-main">
                <div className="mc-hdr">
                  <div className="mc-dot" style={{ background: '#ff5f57' }} />
                  <div className="mc-dot" style={{ background: '#febc2e' }} />
                  <div className="mc-dot" style={{ background: '#28c840' }} />
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,.4)', marginLeft: '8px' }}>monpetitmdb.fr/biens/4821</span>
                </div>
                <div className="mc-photo">
                  <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=180&fit=crop" alt="Appartement lumineux" width={400} height={180} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,transparent 40%,rgba(26,18,16,.3))' }} />
                  <span className="mc-badge">{"M\u00E9tropole Marseillaise"}</span>
                  <span className="mc-rend">8.60 %</span>
                </div>
                <div className="mc-body">
                  <div className="mc-title">{"Appartement T2 - 34 m\u00B2"}</div>
                  <div className="mc-loc">{"3e arrondissement \u2014 Marseille"}</div>
                  <div className="mc-prix">67 000 {'\u20AC'} <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--muted)', marginLeft: '6px' }}>FAI</span></div>
                  <div className="mc-row"><span style={{ color: 'var(--muted)' }}>Loyer mensuel</span><span className="mc-val g">+480 {'\u20AC'}</span></div>
                  <div className="mc-row"><span style={{ color: 'var(--muted)' }}>{"Charges r\u00E9cup\u00E9rables"}</span><span className="mc-val g">+50 {'\u20AC'}</span></div>
                  <div className="mc-row"><span style={{ color: 'var(--muted)' }}>Charges copro</span><span className="mc-val r">-60 {'\u20AC'}</span></div>
                  <div className="mc-row"><span style={{ color: 'var(--muted)' }}>{"Taxe fonci\u00E8re"}</span><span className="mc-val r">-45 {'\u20AC'}</span></div>
                  <div className="mc-row"><span style={{ color: 'var(--muted)' }}>{"Mensualit\u00E9 cr\u00E9dit (20 ans)"}</span><span className="mc-val r">-310 {'\u20AC'}</span></div>
                  <div className="mc-cf" style={{ background: '#d4f5e0' }}>
                    <div><div className="mc-cflbl">Cashflow brut</div><div className="mc-cfval" style={{ color: '#1a7a40' }}>+65 {'\u20AC'}/mois</div></div>
                    <div style={{ textAlign: 'center' }}><div className="mc-cflbl">Rdt brut</div><div style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 800, color: '#1a7a40' }}>8.60 %</div></div>
                    <div style={{ textAlign: 'right' }}><div className="mc-cflbl">Rdt net</div><div style={{ fontFamily: "'Fraunces', serif", fontSize: '18px', fontWeight: 800, color: '#1a7a40' }}>6.71 %</div></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOGOS PLATEFORMES */}
        <section className="logos">
          <div className="logos-label">{"Donn\u00E9es agr\u00E9g\u00E9es depuis 60+ plateformes"}</div>
          <div className="logos-row">
            <span>Leboncoin</span>
            <span>SeLoger</span>
            <span>{"Bien\u2019ici"}</span>
            <span>PAP</span>
            <span>Logic-Immo</span>
            <span>{"Figaro Immobilier"}</span>
            <span>{"Immo de France"}</span>
            <span>ParuVendu</span>
          </div>
        </section>

        {/* STRATEGIES */}
        <section className="strats fade-in" id="strats">
          <div className="strats-in">
            <div className="eyebrow-w">{"4 strat\u00E9gies disponibles"}</div>
            <h2>{"Choisissez votre angle d\u2019investissement"}</h2>
            <p className="strats-desc">{"Mon Petit MDB filtre et analyse les annonces selon votre strat\u00E9gie. Chaque bien est \u00E9valu\u00E9 selon ses propres crit\u00E8res."}</p>
            <div className="strat-grid">
              <div className="strat-card">
                <div className="strat-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8503a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <div className="strat-name">Locataire en place</div>
                <p className="strat-desc">{"Achetez un bien d\u00E9j\u00E0 lou\u00E9. Revenus imm\u00E9diats, d\u00E9cote possible sur le prix. Profil locataire, fin de bail, loyer HC analys\u00E9s."}</p>
                <span className="strat-tag">{"Cashflow imm\u00E9diat"}</span>
                <a href="/strategies" style={{ fontSize: '12px', color: 'var(--red-light)', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>{"En savoir plus \u2192"}</a>
              </div>
              <div className="strat-card">
                <div className="strat-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8503a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                </div>
                <div className="strat-name">Travaux lourds</div>
                <p className="strat-desc">{"Identifiez les biens \u00E0 fort potentiel de valorisation. Score travaux IA de 1 \u00E0 5, estimation march\u00E9 = prix apr\u00E8s r\u00E9novation."}</p>
                <span className="strat-tag">Plus-value travaux</span>
                <a href="/strategies" style={{ fontSize: '12px', color: 'var(--red-light)', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>{"En savoir plus \u2192"}</a>
              </div>
              {/* Division masquee — a reactiver quand la strategie sera prete */}
              <div className="strat-card">
                <div className="strat-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#e8503a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                </div>
                <div className="strat-name">Immeuble de rapport</div>
                <p className="strat-desc">{"Achetez un immeuble entier en monopropri\u00E9t\u00E9 et revendez lot par lot. La m\u00E9thode des pros accessible \u00E0 tous."}</p>
                <span className="strat-tag">{"M\u00E9thode MDB"}</span>
                <a href="/strategies" style={{ fontSize: '12px', color: 'var(--red-light)', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>{"En savoir plus \u2192"}</a>
              </div>
            </div>
          </div>
        </section>

        {/* COMMENT CA MARCHE */}
        <section id="how" className="fade-in">
          <div className="how">
            <div className="how-hdr">
              <div className="eyebrow" style={{ justifyContent: 'center' }}>{"3 \u00E9tapes simples"}</div>
              <h2>{"Comment \u00E7a marche"}</h2>
              <p className="how-sub">{"De la recherche d\u2019opportunit\u00E9s \u00E0 la simulation fiscale compl\u00E8te, en quelques clics."}</p>
            </div>
            <div className="steps">
              <div className="step">
                <div className="step-num">1</div>
                <h3 className="step-title">{"Choisissez votre strat\u00E9gie"}</h3>
                <p className="step-desc">{"S\u00E9lectionnez parmi 4 strat\u00E9gies MDB. L\u2019algorithme filtre les annonces de 60+ plateformes en temps r\u00E9el sur toute la France."}</p>
              </div>
              <div className="step">
                <div className="step-num">2</div>
                <h3 className="step-title">{"Analysez les opportunit\u00E9s"}</h3>
                <p className="step-desc">{"Estimation DVF bas\u00E9e sur les transactions notariales, simulation fiscale sur 5 r\u00E9gimes, sc\u00E9nario de revente sur 1 \u00E0 5 ans."}</p>
              </div>
              <div className="step">
                <div className="step-num">3</div>
                <h3 className="step-title">{"D\u00E9cidez en confiance"}</h3>
                <p className="step-desc">{"Comparez les r\u00E9gimes fiscaux c\u00F4te \u00E0 c\u00F4te, affinez l\u2019adresse pour pr\u00E9ciser l\u2019estimation et sauvegardez vos favoris."}</p>
              </div>
            </div>
          </div>
        </section>

        {/* SCREENSHOT */}
        <section className="ss fade-in">
          <div className="ss-in">
            <div className="ss-hdr">
              <h2>{"L\u2019outil de vos investissements"}</h2>
              <p>{"Interface pens\u00E9e pour les investisseurs particuliers, pas pour les experts"}</p>
            </div>
            <div className="app">
              <div className="app-bar">
                <div className="app-dots">
                  <div className="app-dot" style={{ background: '#ff5f57' }} />
                  <div className="app-dot" style={{ background: '#febc2e' }} />
                  <div className="app-dot" style={{ background: '#28c840' }} />
                </div>
                <div className="app-url">monpetitmdb.fr/biens</div>
              </div>
              <div className="app-body">
                {/* Filter bar */}
                <div className="app-filter-bar">
                  <div className="app-fg">
                    <span className="app-fl">{"Strat\u00E9gie MDB"}</span>
                    <div className="app-fs active">Locataire en place</div>
                  </div>
                  <div className="app-sep" />
                  <div className="app-fg">
                    <span className="app-fl">Localisation</span>
                    <div className="app-fs app-loc">{"Rechercher une ville, un d\u00E9partement..."}</div>
                  </div>
                  <div className="app-fg">
                    <span className="app-fl">Type</span>
                    <div className="app-fs">Tous</div>
                  </div>
                  <div className="app-sep" />
                  <div className="app-fg">
                    <span className="app-fl">Prix min</span>
                    <div className="app-fs" style={{ minWidth: '80px' }}>50 000 {'\u20AC'}</div>
                  </div>
                  <div className="app-fg">
                    <span className="app-fl">Prix max</span>
                    <div className="app-fs" style={{ minWidth: '80px' }}>300 000 {'\u20AC'}</div>
                  </div>
                  <div className="app-fg">
                    <span className="app-fl">Rdt brut min</span>
                    <div className="app-fs" style={{ minWidth: '60px' }}>5 %</div>
                  </div>
                  <div className="app-sep" />
                  <div className="app-fg">
                    <span className="app-fl">Trier par</span>
                    <div className="app-fs">{"Rendement \u2193"}</div>
                  </div>
                  <div className="app-vt">
                    <div className="app-vb on">Grille</div>
                    <div className="app-vb">Liste</div>
                  </div>
                </div>

                {/* Results */}
                <div className="app-mhdr">
                  <div className="rc"><strong>1 247</strong> biens {'\u2014'} Locataire en place</div>
                </div>
                <div className="ag">
                  <div className="ac">
                    <div className="ac-img" style={{ overflow: 'hidden' }}>
                      <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300&h=100&fit=crop" alt="" width={300} height={100} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span className="ac-bm">Nantes</span>
                      <span className="ac-br g">5.07 %</span>
                    </div>
                    <div className="ac-body">
                      <div className="ac-title">{"Appartement T2 - 41 m\u00B2"}</div>
                      <div className="ac-loc">Breil-Barberie</div>
                      <div className="ac-price">177 500 {'\u20AC'}</div>
                      <div className="ac-tags"><span className="ac-tag">750 {'\u20AC'}/mois</span><span className="ac-tag">4 329 {'\u20AC'}/m{'\u00B2'}</span><span className="ac-tag">CDI</span></div>
                    </div>
                  </div>
                  <div className="ac">
                    <div className="ac-img" style={{ overflow: 'hidden' }}>
                      <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=300&h=100&fit=crop" alt="" width={300} height={100} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span className="ac-bm">Lyon</span>
                      <span className="ac-br g">6.14 %</span>
                    </div>
                    <div className="ac-body">
                      <div className="ac-title">{"Appartement T3 - 58 m\u00B2"}</div>
                      <div className="ac-loc">Villeurbanne</div>
                      <div className="ac-price">182 000 {'\u20AC'}</div>
                      <div className="ac-tags"><span className="ac-tag">930 {'\u20AC'}/mois</span><span className="ac-tag">3 138 {'\u20AC'}/m{'\u00B2'}</span></div>
                    </div>
                  </div>
                  <div className="ac">
                    <div className="ac-img" style={{ overflow: 'hidden' }}>
                      <img src="https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=300&h=100&fit=crop" alt="" width={300} height={100} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span className="ac-bm">Marseille</span>
                      <span className="ac-br g">8.60 %</span>
                    </div>
                    <div className="ac-body">
                      <div className="ac-title">{"Appartement T2 - 34 m\u00B2"}</div>
                      <div className="ac-loc">{"3e arr."}</div>
                      <div className="ac-price">67 000 {'\u20AC'}</div>
                      <div className="ac-tags"><span className="ac-tag">480 {'\u20AC'}/mois</span><span className="ac-tag">1 971 {'\u20AC'}/m{'\u00B2'}</span></div>
                    </div>
                  </div>
                  <div className="ac">
                    <div className="ac-img" style={{ overflow: 'hidden' }}>
                      <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300&h=100&fit=crop" alt="" width={300} height={100} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span className="ac-bm">Bordeaux</span>
                      <span className="ac-br y">3.78 %</span>
                    </div>
                    <div className="ac-body">
                      <div className="ac-title">{"Appartement T4 - 91 m\u00B2"}</div>
                      <div className="ac-loc">Chartrons</div>
                      <div className="ac-price">289 000 {'\u20AC'}</div>
                      <div className="ac-tags"><span className="ac-tag">910 {'\u20AC'}/mois</span><span className="ac-tag">3 176 {'\u20AC'}/m{'\u00B2'}</span></div>
                    </div>
                  </div>
                  <div className="ac">
                    <div className="ac-img" style={{ overflow: 'hidden' }}>
                      <img src="https://images.unsplash.com/photo-1484154218962-a197022b5858?w=300&h=100&fit=crop" alt="" width={300} height={100} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span className="ac-bm">Rennes</span>
                      <span className="ac-br y">4.39 %</span>
                    </div>
                    <div className="ac-body">
                      <div className="ac-title">{"Appartement T1 - 32 m\u00B2"}</div>
                      <div className="ac-loc">Centre-Ville</div>
                      <div className="ac-price">117 500 {'\u20AC'}</div>
                      <div className="ac-tags"><span className="ac-tag">430 {'\u20AC'}/mois</span><span className="ac-tag">3 672 {'\u20AC'}/m{'\u00B2'}</span></div>
                    </div>
                  </div>
                  <div className="ac">
                    <div className="ac-img" style={{ overflow: 'hidden' }}>
                      <img src="https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=300&h=100&fit=crop" alt="" width={300} height={100} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <span className="ac-bm">Toulouse</span>
                      <span className="ac-br g">5.82 %</span>
                    </div>
                    <div className="ac-body">
                      <div className="ac-title">{"Appartement T2 - 45 m\u00B2"}</div>
                      <div className="ac-loc">Saint-Cyprien</div>
                      <div className="ac-price">145 000 {'\u20AC'}</div>
                      <div className="ac-tags"><span className="ac-tag">703 {'\u20AC'}/mois</span><span className="ac-tag">3 222 {'\u20AC'}/m{'\u00B2'}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TEMOIGNAGES */}
        <section className="testi fade-in">
          <div className="testi-hdr">
            <div className="eyebrow" style={{ justifyContent: 'center' }}>{"Ils investissent avec Mon Petit MDB"}</div>
            <h2>{"Ce qu\u2019en disent nos utilisateurs"}</h2>
          </div>
          <div className="testi-grid">
            <div className="testi-card">
              <p className="testi-quote">{"\u00AB J\u2019ai trouv\u00E9 mon T2 \u00E0 Marseille en 3 jours. L\u2019estimation DVF m\u2019a donn\u00E9 confiance pour n\u00E9gocier 12% en dessous du prix affich\u00E9. \u00BB"}</p>
              <div className="testi-author">
                <div className="testi-avatar">T</div>
                <div><div className="testi-name">Thomas R.</div><div className="testi-role">Investisseur particulier, Marseille</div></div>
              </div>
            </div>
            <div className="testi-card">
              <p className="testi-quote">{"\u00AB Le simulateur fiscal m\u2019a fait \u00E9conomiser 4 000 \u20AC/an en choisissant le bon r\u00E9gime. Je ne savais m\u00EAme pas que le LMNP r\u00E9el existait. \u00BB"}</p>
              <div className="testi-author">
                <div className="testi-avatar">S</div>
                <div><div className="testi-name">Sophie M.</div><div className="testi-role">{"Cadre sup\u00E9rieur, Lyon"}</div></div>
              </div>
            </div>
            <div className="testi-card">
              <p className="testi-quote">{"\u00AB En tant que marchand de biens, je cherchais un outil pour sourcer vite. 60+ plateformes en un clic, c\u2019est exactement ce qu\u2019il me fallait. \u00BB"}</p>
              <div className="testi-author">
                <div className="testi-avatar">A</div>
                <div><div className="testi-name">Alexandre D.</div><div className="testi-role">Marchand de biens, Bordeaux</div></div>
              </div>
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing">
          <div className="pricing">
            <div className="pricing-hdr">
              <div className="eyebrow" style={{ justifyContent: 'center' }}>Tarifs transparents</div>
              <h2>Commencez gratuitement</h2>
              <p>{"Passez au Pro quand vous \u00EAtes pr\u00EAt \u00E0 investir s\u00E9rieusement."}</p>
            </div>
            <div className="plans">
              {/* FREE */}
              <div className="plan">
                <div className="plan-name">Free</div>
                <div className="plan-price">0 {'\u20AC'}</div>
                <div className="plan-period">Pour toujours</div>
                <div className="plan-div" />
                <ul className="plan-feats">
                  <li><span className="pck">{'\u2713'}</span>Listing de tous les biens</li>
                  <li><span className="pck">{'\u2713'}</span>{"Fiches biens compl\u00E8tes"}</li>
                  <li><span className="pck">{'\u2713'}</span>Enrichissement communautaire</li>
                  <li><span className="pck">{'\u2713'}</span>Watchlist (10 biens max)</li>
                  <li><span className="pck">{'\u2713'}</span><span title={"Memo est votre assistant IA int\u00E9gr\u00E9 pour r\u00E9pondre \u00E0 vos questions immobili\u00E8res"} style={{borderBottom:'1px dashed rgba(255,255,255,0.3)',cursor:'help'}}>Memo</span> {'\u2014'} assistant IA (5 msg/jour)</li>
                  <li><span className="pcx">{'\u2717'}</span><span style={{ color: '#c0b0a0' }}>Simulateur fiscal</span></li>
                  <li><span className="pcx">{'\u2717'}</span><span style={{ color: '#c0b0a0' }}>{"Estimation march\u00E9 DVF"}</span></li>
                </ul>
                <a href="/register" className="plan-cta">Commencer gratuitement</a>
              </div>
              {/* PRO */}
              <div className="plan ft">
                <div className="plan-badge">Le plus populaire</div>
                <div className="plan-name">Pro</div>
                <div className="plan-price">19 {'\u20AC'}</div>
                <div className="plan-period">par mois {'\u2014'} sans engagement<span className="plan-trial">{"14 jours d\u2019essai gratuit \u2014 sans carte bancaire"}</span></div>
                <div className="plan-div" />
                <ul className="plan-feats">
                  <li><span className="pck">{'\u2713'}</span>Tout le plan Free</li>
                  <li><span className="pck">{'\u2713'}</span>{"1 strat\u00E9gie MDB au choix"}</li>
                  <li><span className="pck">{'\u2713'}</span>Watchlist (50 biens max)</li>
                  <li><span className="pck">{'\u2713'}</span>Simulateur fiscal complet</li>
                  <li><span className="pck">{'\u2713'}</span>{"Estimation march\u00E9 DVF"}</li>
                  <li><span className="pck">{'\u2713'}</span>{"Sc\u00E9nario de revente"}</li>
                  <li><span className="pck">{'\u2713'}</span>{"Comparaison 2 r\u00E9gimes"}</li>
                  <li><span className="pck">{'\u2713'}</span><span title={"Memo est votre assistant IA int\u00E9gr\u00E9 pour r\u00E9pondre \u00E0 vos questions immobili\u00E8res"} style={{borderBottom:'1px dashed rgba(255,255,255,0.3)',cursor:'help'}}>Memo</span> {'\u2014'} assistant IA (50 msg/jour)</li>
                  <li><span className="pcx" style={{ background: 'rgba(255,255,255,.1)', color: 'rgba(255,255,255,.3)' }}>{'\u2717'}</span><span style={{ color: 'rgba(255,255,255,.3)' }}>{"Toutes les strat\u00E9gies"}</span></li>
                </ul>
                <PricingCta plan="pro" label="Essayer 14 jours gratuits" className="plan-cta" />
              </div>
              {/* EXPERT */}
              <div className="plan">
                <div className="plan-name">Expert</div>
                <div className="plan-price">49 {'\u20AC'}</div>
                <div className="plan-period">par mois {'\u2014'} sans engagement</div>
                <div className="plan-div" />
                <ul className="plan-feats">
                  <li><span className="pck">{'\u2713'}</span>Tout le plan Pro</li>
                  <li><span className="pck">{'\u2713'}</span>{"Toutes les strat\u00E9gies MDB"}</li>
                  <li><span className="pck">{'\u2713'}</span>{"Watchlist illimit\u00E9e"}</li>
                  <li><span className="pck">{'\u2713'}</span>{"Comparaison tous les r\u00E9gimes"}</li>
                  <li><span className="pck">{'\u2713'}</span><span title={"Memo est votre assistant IA int\u00E9gr\u00E9 pour r\u00E9pondre \u00E0 vos questions immobili\u00E8res"} style={{borderBottom:'1px dashed rgba(255,255,255,0.3)',cursor:'help'}}>Memo</span> {'\u2014'} assistant IA illimit\u00E9</li>
                  <li><span className="pck">{'\u2713'}</span>Export Excel</li>
                  <li><span className="pck">{'\u2713'}</span>Alertes nouvelles annonces</li>
                  <li><span className="pck">{'\u2713'}</span>{"Support prioritaire"}</li>
                </ul>
                <PricingCta plan="expert" label="Commencer avec Expert" className="plan-cta" />
              </div>
            </div>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="cta-final fade-in">
          <div className="eyebrow" style={{ justifyContent: 'center' }}>{"Pr\u00EAt \u00E0 investir ?"}</div>
          <h2>{"Trouvez votre prochaine "}<em>{"opportunit\u00E9"}</em></h2>
          <p>{"Rejoignez les investisseurs qui utilisent Mon Petit MDB pour sourcer, analyser et comparer les biens \u2014 gratuitement."}</p>
          <a href="/register" className="btn-hero">{"Cr\u00E9er mon compte gratuit"}</a>
        </section>

        {/* FOOTER */}
        <footer className="lp-footer">
          <div className="ft-top">
            <div>
              <div className="ft-logo">Mon Petit <span>MDB</span></div>
              <p className="ft-tag">{"La m\u00E9thodologie marchand de biens accessible \u00E0 tous les investisseurs particuliers."}</p>
            </div>
            <div className="ft-links">
              <div className="ft-col">
                <h4>Produit</h4>
                <a href="/biens">Biens disponibles</a>
                <a href="/blog">Conseils</a>
                <a href="#how">{"Comment \u00E7a marche"}</a>
                <a href="#pricing">Tarifs</a>
              </div>
              <div className="ft-col">
                <h4>{"Strat\u00E9gies"}</h4>
                <a href="/biens">Locataire en place</a>
                <a href="/biens">Travaux lourds</a>
                <a href="/biens">Immeuble de rapport</a>
              </div>
              <div className="ft-col">
                <h4>{"L\u00E9gal"}</h4>
                <a href="/mentions-legales">{"Mentions l\u00E9gales"}</a>
                <a href="/cgu">CGU</a>
                <a href="/privacy">{"Confidentialit\u00E9"}</a>
              </div>
            </div>
          </div>
          <div className="ft-bottom">
            <span>{"2026 Mon Petit MDB \u2014 Tous droits r\u00E9serv\u00E9s"}</span>
            <span>{"Fait avec \u2764 en France"}</span>
          </div>
        </footer>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `
        (function(){var o=new IntersectionObserver(function(e){e.forEach(function(i){if(i.isIntersecting){i.target.classList.add('visible');o.unobserve(i.target)}})},{threshold:0.1});document.querySelectorAll('.fade-in').forEach(function(el){o.observe(el)})})()
      `}} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "Mon Petit MDB",
        "url": "https://www.monpetitmdb.fr",
        "description": "Plateforme de sourcing immobilier pour investisseurs particuliers. M\u00E9thodologie marchand de biens.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.monpetitmdb.fr/biens?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Mon Petit MDB",
        "url": "https://www.monpetitmdb.fr",
        "description": "Sourcing immobilier pour investisseurs particuliers avec la m\u00E9thodologie marchand de biens."
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Mon Petit MDB",
        "applicationCategory": "FinanceApplication",
        "operatingSystem": "Web",
        "offers": [
          { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "EUR", "description": "Listing biens, fiches complètes, watchlist 10 biens, Memo IA 5 msg/jour" },
          { "@type": "Offer", "name": "Pro", "price": "19", "priceCurrency": "EUR", "priceSpecification": { "@type": "UnitPriceSpecification", "price": "19", "priceCurrency": "EUR", "billingDuration": "P1M" }, "description": "1 stratégie MDB, simulateur fiscal, estimation DVF, scénario revente, Memo IA 50 msg/jour" },
          { "@type": "Offer", "name": "Expert", "price": "49", "priceCurrency": "EUR", "priceSpecification": { "@type": "UnitPriceSpecification", "price": "49", "priceCurrency": "EUR", "billingDuration": "P1M" }, "description": "Toutes les stratégies, tous les régimes fiscaux, watchlist illimitée, Memo IA illimité, alertes" }
        ]
      }) }} />
    </>
  )
}
