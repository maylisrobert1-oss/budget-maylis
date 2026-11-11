// Appli « Budget » : données sur l'appareil, sauvegarde chiffrée, import Boursobank et écrans.
// Les calculs sont dans moteur.js. Aucun texte importé n'est inséré comme HTML (textContent uniquement).
(function () {
  const KEY = 'budget-maylis';
  const M = window.Moteur;
  const $ = (id) => document.getElementById(id);
  const auj = () => new Date().toISOString();

  // ---------- Formats ----------
  const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sp = (s) => s.replace(/[  ]/g, ' ');
  const eur = (v) => (v < 0 ? '−' : '') + sp(nf0.format(Math.abs(Math.round(v)))) + ' €';
  const eur2 = (v) => (v < 0 ? '−' : '') + sp(nf2.format(Math.abs(v))) + ' €';
  const signe2 = (v) => (v > 0 ? '+' : '') + eur2(v);
  const pc = (x) => (x < 0 ? '−' : '') + sp(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(Math.abs(x * 100))) + ' %';
  const pc0 = (x) => { const n = Math.round(x * 100); return (n < 0 ? '−' : '') + Math.abs(n) + ' %'; };
  const nombre = (x) => { const s = String(x).replace(/[\s  €%]/g, '').replace(',', '.'); return s === '' ? NaN : Number(s); };
  const MOIS_L = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const dateLongue = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return JOURS[d.getUTCDay()] + ' ' + (d.getUTCDate() === 1 ? '1er' : d.getUTCDate()) + ' ' + MOIS_L[d.getUTCMonth()]; };

  // ---------- Données ----------
  const valide = (b) => b && b.format === 'budget-maylis' && Array.isArray(b.operations) && b.reglages;
  let bundle = null;
  try { const b = JSON.parse(localStorage.getItem(KEY) || 'null'); bundle = valide(b) ? b : null; } catch (e) { bundle = null; }
  // Corrections ponctuelles (ex. abonnements reconnus au libellé), une seule fois par téléphone
  if (bundle) { const b = M.migrer(bundle); if (b !== bundle) { bundle = b; localStorage.setItem(KEY, JSON.stringify(bundle)); } }
  const ecrire = (b) => { localStorage.setItem(KEY, JSON.stringify(b)); };
  const sauver = (b) => { b.modifie_le = auj(); ecrire(b); };
  let calc = bundle ? M.calculer(bundle) : null;

  // ---------- Messages ----------
  let minuterie = null;
  const msg = (t, err, annuler) => {
    const m = $('app-msg'); m.replaceChildren(document.createTextNode(t || '')); m.className = 'app-msg' + (err ? ' err' : ''); m.hidden = !t;
    if (t && annuler) { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Annuler'; b.onclick = annuler; m.append(b); }
    clearTimeout(minuterie);
    if (t) minuterie = setTimeout(() => { m.hidden = true; }, annuler ? 8000 : err ? 9000 : 5000);
  };
  const rafraichir = () => { calc = M.calculer(bundle); dessiner(); };
  // Toute modification faite à la main peut être annulée
  const changer = (b, texte) => {
    const prec = bundle; bundle = b; sauver(bundle); rafraichir();
    msg(texte || 'Modification enregistrée.', false, () => { bundle = prec; sauver(bundle); rafraichir(); msg('Modification annulée.'); });
  };

  // ---------- Icônes (24 × 24, tables fixes) ----------
  const SVG_IC = {
    resto: '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 3-3 6v3h3v9"/>',
    vetement: '<path d="M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3a4 4 0 0 1-8 0Z"/>',
    soin: '<path d="M9 3h6v4H9zM8 7h8l1 14H7Z"/>',
    carburant: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    panier: '<path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    tram: '<rect x="5" y="4" width="14" height="13" rx="3"/><path d="M5 11h14M8 21l2-4M16 21l-2-4M9 2h6"/>',
    maison: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    cadeau: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8Zm0 0s2-5 4.5-3.5S15 8 12 8Z"/>',
    plage: '<path d="M3 20h18M12 20 8 6M8 6c3-3 8-2 10 1-3-1-6 0-10-1Zm0 0C5 4 2 6 2 9c2-2 4-2 6-3Z"/>',
    cle: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    sac: '<path d="M6 7h12l1 14H5Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
    sante: '<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11.4 8.8 11.4s8.8-6 8.8-11.4Z"/>',
    diplome: '<path d="M2 9l10-5 10 5-10 5Z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    bouclier: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/>',
    voiture: '<path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM5 11h14"/><circle cx="7.5" cy="13.5" r=".6"/><circle cx="16.5" cy="13.5" r=".6"/>',
    telephone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    billet: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
    banque: '<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    hausse: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    pieces: '<circle cx="9" cy="12" r="6"/><path d="M14.5 6.5a6 6 0 0 1 0 11"/>',
    ticket: '<path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 0 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3Z"/>',
    bouee: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
    cible: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    pct: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
    boussole: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
    baisse: '<path d="M12 4v16M6 14l6 6 6-6"/>',
    envoi: '<path d="M7 17 17 7M8 7h9v9"/>',
    recu: '<path d="M17 7 7 17M16 17H7V8"/>',
    etiquette: '<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    liste: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    disque: '<path d="M5 3h11l3 3v15H5Z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    calendrier: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    reglages: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    import: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    croix: '<path d="M7 7l10 10M17 7 7 17"/>',
    ok: '<path d="m6 12 4 4 8-9"/>',
    point: '<circle cx="12" cy="12" r="3"/>'
  };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined && txt !== null) e.textContent = txt; return e; };
  const dessin = (nom, taille) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const t = String(taille || 18); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', t); s.setAttribute('height', t); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = SVG_IC[nom] || SVG_IC.point; return s; };
  document.querySelectorAll('[data-icone]').forEach((s) => s.replaceChildren(dessin(s.dataset.icone, s.closest('.v-onglets') ? 22 : 20)));

  // ---------- Briques ----------
  const TON = { obligations: 'var(--blue)', plaisir: 'var(--indigo)', enveloppe: 'var(--orange)', fixe: 'var(--gray)', revenu: 'var(--green)', autre: 'var(--teal)' };
  const carre = (nom, t) => { const s = el('span', 'v-carre'); s.style.setProperty('--t', t || 'var(--gray)'); s.setAttribute('aria-hidden', 'true'); s.append(dessin(nom, 17)); return s; };
  const chev = () => { const s = el('span', 'v-chev'); s.append(dessin('chev', 14)); return s; };
  // o : { ic, ton, titre, barre, sous, sousCls, val, valSous, valCls, clic, chev, haut, total, court }
  const ligne = (o) => {
    const r = el(o.clic ? 'button' : 'div', 'v-ligne' + (o.haut ? ' haut' : '') + (o.total ? ' total' : '')); if (o.clic) { r.type = 'button'; r.onclick = o.clic; }
    if (o.ic) r.append(carre(o.ic, o.ton));
    const t = el('div', 'v-txt'); const b = el('b', '', o.titre); if (o.court) b.dataset.court = '1'; t.append(b); if (o.barre) t.append(o.barre); if (o.sous) t.append(el('small', o.sousCls || '', o.sous));
    r.append(t);
    if (o.val !== undefined && o.val !== null) { const v = el('div', 'v-val' + (o.valCls ? ' ' + o.valCls : ''), o.val); if (o.valSous) v.append(el('small', '', o.valSous)); r.append(v); }
    if (o.chev) r.append(chev());
    return r;
  };
  const liste = (rows, nu) => { const l = el('div', 'v-liste' + (nu ? ' nu' : '')); l.append(...rows); return l; };
  const section = (titre, droite) => { const h = el('h2', 'v-section'); h.append(el('span', '', titre)); if (droite) h.append(el('small', '', droite)); return h; };
  const barre = (part, couleur, repere) => { const b = el('div', 'v-barre'), i = el('i'); i.style.width = Math.max(0, Math.min(100, part * 100)) + '%'; i.style.background = couleur; b.append(i); if (repere !== undefined && repere !== null) { const m = el('b'); m.style.left = Math.min(99, repere * 100) + '%'; b.append(m); } return b; };
  const note = (t) => el('p', 'v-note', t);

  // ---------- Navigation ----------
  const montrer = (nom) => {
    const tabs = [...document.querySelectorAll('.bm-tab')];
    if (!tabs.some((t) => t.dataset.tab === nom)) nom = 'mois';
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === nom)));
    document.querySelectorAll('.bm-page').forEach((p) => { p.hidden = p.id !== nom; });
    ajuster();
  };
  const onglet = (n) => { document.querySelector('.bm-tab[data-tab="' + n + '"]').click(); };
  document.querySelectorAll('.bm-tab').forEach((t) => t.addEventListener('click', () => { montrer(t.dataset.tab); history.replaceState(null, '', '#' + t.dataset.tab); window.scrollTo(0, 0); majHaut(); }));
  document.querySelectorAll('[data-importer]').forEach((b) => { b.onclick = () => $('app-file').click(); });

  let page = null;
  const pageEl = $('v-page');
  // page : { retour, titre, sous, corps } (des fonctions, pour suivre les données)
  const dessinerPage = () => {
    if (!page) return;
    $('v-retour-txt').textContent = page.retour ? page.retour() : 'Retour'; $('v-page-titre').textContent = page.titre();
    const s = page.sous ? page.sous() : ''; $('v-page-sous').textContent = s; $('v-page-sous').hidden = !s;
    $('v-page-corps').replaceChildren(...page.corps());
    ajuster();
  };
  const pousser = (p) => { page = p; pageEl.scrollTop = 0; pageEl.classList.add('on'); document.body.style.overflow = 'hidden'; dessinerPage(); };
  const fermerPage = () => { pageEl.classList.remove('on'); pageEl.style.transform = ''; document.body.style.overflow = ''; page = null; ajuster(); };
  // Un titre qui ne tient pas sur sa ligne n'est jamais coupé : un nom d'opération perd ses derniers mots (le libellé complet est dans la fiche),
  // un autre titre rétrécit jusqu'à 14 px, puis passe sur deux lignes.
  const ajuster = () => {
    const r = pageEl.classList.contains('on') ? pageEl : document.querySelector('.bm-page:not([hidden])'); if (!r) return;
    [...r.querySelectorAll('.v-txt > b')].filter((b) => b.clientWidth && b.scrollWidth > b.clientWidth).forEach((b) => {
      if (b.dataset.court) { const m = b.textContent.split(' '); while (m.length > 1 && b.scrollWidth > b.clientWidth) { m.pop(); b.textContent = m.join(' '); } }
      for (let t = 16; t >= 14 && b.scrollWidth > b.clientWidth; t--) b.style.fontSize = t + 'px';
      if (b.scrollWidth > b.clientWidth) b.style.whiteSpace = 'normal';
    });
  };
  $('v-retour').onclick = fermerPage;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && page && !document.querySelector('dialog[open]')) fermerPage(); });
  (() => { // retour en glissant depuis le bord gauche
    let x0 = 0, dx = 0, t0 = 0, actif = false;
    pageEl.addEventListener('pointerdown', (e) => { if (e.clientX > 28 || e.pointerType === 'mouse') return; actif = true; x0 = e.clientX; dx = 0; t0 = performance.now(); pageEl.setPointerCapture(e.pointerId); pageEl.style.transition = 'none'; });
    pageEl.addEventListener('pointermove', (e) => { if (!actif) return; dx = Math.max(0, e.clientX - x0); pageEl.style.transform = 'translateX(' + dx + 'px)'; });
    const fin = () => { if (!actif) return; actif = false; pageEl.style.transition = ''; const v = dx / Math.max(1, performance.now() - t0); if (dx > innerWidth / 3 || v > 0.5) fermerPage(); else pageEl.style.transform = ''; };
    pageEl.addEventListener('pointerup', fin); pageEl.addEventListener('pointercancel', fin);
  })();
  const majHaut = () => {
    const sec = document.querySelector('.bm-page:not([hidden])'), h = sec && sec.querySelector('.v-titre'), b = $('v-haut');
    if (!h || !b) return; b.textContent = h.textContent; b.classList.toggle('on', h.getBoundingClientRect().bottom < 8);
  };
  addEventListener('scroll', majHaut, { passive: true });

  // ---------- Feuilles (dialogues) ----------
  const GARDER = {};
  const erreur = (d, t) => { const p = d.querySelector('.app-err'); p.textContent = t || ''; p.hidden = !t; };
  const ouvrirDlg = (d) => { erreur(d, ''); d.style.transform = ''; d.showModal(); };
  const glisserPourFermer = (d) => {
    const z = d.querySelector('.zone-poignee'); let y0 = 0, dy = 0, t0 = 0, actif = false;
    z.addEventListener('pointerdown', (e) => { actif = true; y0 = e.clientY; dy = 0; t0 = performance.now(); z.setPointerCapture(e.pointerId); d.style.transition = 'none'; });
    z.addEventListener('pointermove', (e) => { if (!actif) return; dy = e.clientY - y0; d.style.transform = 'translateY(' + (dy > 0 ? dy : -Math.sqrt(-dy) * 3) + 'px)'; });
    const fin = () => { if (!actif) return; actif = false; d.style.transition = ''; const v = dy / Math.max(1, performance.now() - t0); if (dy > 120 || v > 0.5) { d.style.transform = ''; d.close(); } else d.style.transform = ''; };
    z.addEventListener('pointerup', fin); z.addEventListener('pointercancel', fin);
  };
  // `html` ne contient que du texte fixe de l'appli
  const dialogue = (html, ok) => {
    const d = document.createElement('dialog'); d.className = 'app-dlg'; d.innerHTML = '<div class="zone-poignee"><div class="poignee"></div></div><form method="dialog">' + html + '</form>'; document.body.append(d);
    glisserPourFermer(d);
    const f = d.querySelector('form'), p = document.createElement('p'); p.className = 'app-err'; p.setAttribute('role', 'alert'); p.hidden = true;
    f.insertBefore(p, f.lastElementChild);
    f.addEventListener('submit', (e) => {
      if (!(e.submitter && e.submitter.value === 'ok')) return;
      const r = ok(d);
      if (typeof r === 'string') { e.preventDefault(); erreur(d, r); } else if (r === GARDER) e.preventDefault();
    });
    return d;
  };
  const boutons = (ok) => '<div class="row"><button class="app-btn" value="annuler">Annuler</button><button class="app-btn primary" value="ok">' + ok + '</button></div>';

  // Feuille de saisie générique : champs numériques ou mois, textes fixes passés par textContent
  const dChamps = dialogue('<h2 id="ch-titre"></h2><p id="ch-texte"></p><div id="ch-champs" style="display:grid;gap:10px"></div>' + boutons('Enregistrer'), () => {
    const vals = [...$('ch-champs').querySelectorAll('input')].map((i) => (i.type === 'month' ? i.value : i.value.trim() === '' ? null : nombre(i.value)));
    return champsOk ? champsOk(vals) : undefined;
  });
  let champsOk = null;
  // champs : [{lib, valeur, type: 'mois' | 'nombre', aide}]
  const saisir = (titre, texte, champs, ok) => {
    $('ch-titre').textContent = titre; $('ch-texte').textContent = texte || ''; $('ch-texte').hidden = !texte;
    $('ch-champs').replaceChildren(...champs.flatMap((c, i) => {
      const id = 'ch-' + i, lab = el('label', '', c.lib); lab.htmlFor = id;
      const inp = el('input'); inp.id = id; inp.autocomplete = 'off';
      if (c.type === 'mois') { inp.type = 'month'; inp.value = c.valeur || ''; } else { inp.setAttribute('inputmode', 'decimal'); inp.value = c.valeur === null || c.valeur === undefined ? '' : String(c.valeur).replace('.', ','); }
      return c.aide ? [lab, inp, el('p', '', c.aide)] : [lab, inp];
    }));
    champsOk = ok; ouvrirDlg(dChamps);
  };
  const modifie = (patch, texte) => changer(Object.assign({}, bundle, patch), texte);
  const reglage = (cle, v, texte) => modifie({ reglages: Object.assign({}, bundle.reglages, { [cle]: v }) }, texte);

  // ---------- Sauvegarde ----------
  const b64 = (u8) => { let t = ''; for (let i = 0; i < u8.length; i += 0x8000) t += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(t); };
  const deb64 = (t) => Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
  const ITERATIONS = 310000;
  const cleDe = async (mdp, sel, n) => {
    const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(mdp), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: n, hash: 'SHA-256' }, k, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  };
  const chiffrer = async (texte, mdp) => {
    const sel = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const c = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cleDe(mdp, sel, ITERATIONS), new TextEncoder().encode(texte));
    return JSON.stringify({ format: 'budget-chiffre', version: 1, kdf: 'PBKDF2-SHA256', iterations: ITERATIONS, sel: b64(sel), iv: b64(iv), donnees: b64(new Uint8Array(c)) });
  };
  const dechiffrer = async (o, mdp) => new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deb64(o.iv) }, await cleDe(mdp, deb64(o.sel), Number(o.iterations) || ITERATIONS), deb64(o.donnees)));
  const telecharger = (file) => { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };
  const marque = () => { bundle.sauvegarde_le = auj(); ecrire(bundle); dessiner(); };
  const envoyer = (file) => {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: file.name })
        .then(() => { marque(); msg('Sauvegarde envoyée. Choisis « Enregistrer dans Fichiers » (iCloud) pour la garder hors du téléphone.'); })
        .catch((e) => { if (e.name !== 'AbortError') { telecharger(file); marque(); } });
      return;
    }
    telecharger(file); marque();
  };
  let fichierPret = null;
  const dSauve = dialogue('<h2>Sauvegarder</h2><p>Le fichier contient toutes tes opérations. Range-le dans iCloud Drive.</p>' +
    '<label for="sv-mdp">Mot de passe (conseillé)</label><input id="sv-mdp" type="password" autocomplete="new-password">' +
    '<p>Sans ce mot de passe, la sauvegarde ne pourra pas être rouverte. Laisse vide pour un fichier non protégé.</p>' +
    '<div class="row"><button class="app-btn" value="annuler">Annuler</button><button class="app-btn primary" value="ok" id="sv-ok">Enregistrer</button></div>', (d) => {
    if (fichierPret) { envoyer(fichierPret); fichierPret = null; return; }
    const mdp = $('sv-mdp').value, nom = 'budget-' + new Date().toISOString().slice(0, 10) + (mdp ? '-protege' : '') + '.json';
    const texte = JSON.stringify(Object.assign({}, bundle, { sauvegarde_le: auj() }));
    if (!mdp) { envoyer(new File([texte], nom, { type: 'application/json' })); return; }
    if (mdp.length < 6) return 'Choisis un mot de passe d’au moins 6 caractères.';
    $('sv-ok').disabled = true; $('sv-ok').textContent = 'Chiffrement…';
    chiffrer(texte, mdp).then((c) => { fichierPret = new File([c], nom, { type: 'application/json' }); $('sv-ok').textContent = 'Enregistrer le fichier protégé'; })
      .catch(() => erreur(d, 'Le chiffrement a échoué : réessaie.')).finally(() => { $('sv-ok').disabled = false; });
    return GARDER;
  });
  const sauvegarder = () => { if (!bundle) return; fichierPret = null; $('sv-mdp').value = ''; $('sv-ok').textContent = 'Enregistrer'; $('sv-ok').disabled = false; ouvrirDlg(dSauve); };

  // ---------- Import ----------
  let aRemplacer = null, fichierChiffre = null;
  const resume = (b) => b.operations.length + ' opérations' + (b.export ? ', export du ' + M.frDate(b.export) : '');
  const dRemp = dialogue('<h2>Remplacer tes données ?</h2><p id="rem-txt"></p>' +
    '<div class="row"><button class="app-btn" value="annuler">Annuler</button><button class="app-btn primary danger" value="ok">Remplacer</button></div>', () => {
    if (aRemplacer) { ecrire(aRemplacer); location.reload(); }
  });
  const confirmerRemplacement = (b) => {
    if (!bundle) { ecrire(b); location.reload(); return; }
    aRemplacer = b;
    $('rem-txt').textContent = 'Sur ce téléphone : ' + resume(bundle) + '. Dans le fichier : ' + resume(b) + '. Tes données actuelles seront remplacées par celles du fichier.';
    ouvrirDlg(dRemp);
  };
  const dMdp = dialogue('<h2>Sauvegarde protégée</h2><p>Tape le mot de passe de cette sauvegarde.</p>' +
    '<label for="imp-mdp">Mot de passe</label><input id="imp-mdp" type="password" autocomplete="current-password">' + boutons('Ouvrir'), (d) => {
    const o = fichierChiffre, mdp = $('imp-mdp').value; if (!o) return;
    if (!mdp) return 'Tape le mot de passe.';
    dechiffrer(o, mdp).then((t) => {
      const b = JSON.parse(t);
      if (!valide(b)) { erreur(d, 'Ce fichier n’est pas une sauvegarde de cette appli.'); return; }
      d.close(); fichierChiffre = null; confirmerRemplacement(b);
    }).catch(() => erreur(d, 'Mot de passe incorrect.'));
    return GARDER;
  });
  $('app-file').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const nom = f.name || '';
      if (/\.json$/i.test(nom) || f.type === 'application/json') {
        let o; try { o = JSON.parse(await f.text()); } catch (x) { throw new Error('Ce fichier n’est pas une sauvegarde de cette appli.'); }
        if (o && o.format === 'budget-chiffre') { fichierChiffre = o; $('imp-mdp').value = ''; ouvrirDlg(dMdp); return; }
        if (!valide(o)) throw new Error('Ce fichier n’est pas une sauvegarde de cette appli.');
        confirmerRemplacement(o); return;
      }
      if (!bundle) throw new Error('Importe d’abord ta sauvegarde : elle contient tes réglages.');
      let texte, nomCsv = nom;
      if (/\.zip$/i.test(nom) || f.type === 'application/zip') { const z = await M.lireZip(await f.arrayBuffer()); texte = z.texte; nomCsv = z.nom; }
      else texte = await f.text();
      const r = M.importer(bundle, texte, nomCsv);
      sauver(r.bundle);
      sessionStorage.setItem('budget-msg', r.stats.lues + ' opérations lues, ' + r.stats.nouvelles + ' nouvelle' + (r.stats.nouvelles > 1 ? 's' : '') +
        (r.stats.aClasser ? ', dont ' + r.stats.aClasser + ' à classer (onglet Opérations).' : ', toutes classées.'));
      location.reload();
    } catch (err) { msg(err.message || String(err), true); }
  };
  try { const m = sessionStorage.getItem('budget-msg'); if (m) { msg(m); sessionStorage.removeItem('budget-msg'); } } catch (e) {}

  // ---------- Reclassement d'une opération ----------
  let opId = null;
  const dClasse = dialogue('<h2>Changer le poste</h2><p id="cl-op"></p><select id="cl-poste" aria-label="Poste"></select>' +
    '<div id="cl-mois-bloc" style="display:grid;gap:8px"><label for="cl-mois">Compte pour</label><select id="cl-mois"></select></div>' +
    '<label><input type="checkbox" id="cl-tout"> <span id="cl-tout-txt"></span></label>' + boutons('Enregistrer'), () => {
    if (opId === null) return;
    const p = $('cl-poste').value, nomP = (M.catalogue(bundle).find((x) => x.id === p) || {}).nom || p;
    const mEp = p === 'epargne' ? $('cl-mois').value : '';
    if (page) fermerPage();
    changer(M.reclasser(bundle, opId, p, $('cl-tout').checked, mEp), mEp ? 'Virement compté pour ' + nomMois(mEp) + '.' : 'Opération classée en « ' + nomP + ' ».');
  });
  $('cl-poste').addEventListener('change', () => { $('cl-mois-bloc').hidden = $('cl-poste').value !== 'epargne'; });
  const reclasserOp = (o) => {
    opId = o.id;
    $('cl-op').textContent = M.frDate(o.date) + ' · ' + o.libelle + ' · ' + eur2(o.montant);
    const sel = $('cl-poste'); sel.replaceChildren();
    const cat = M.catalogue(bundle);
    Object.keys(M.FAMILLES).forEach((fam) => {
      const g = document.createElement('optgroup'); g.label = M.FAMILLES[fam];
      cat.filter((p) => p.famille === fam).forEach((p) => { const op = new Option(p.nom, p.id); if (o.poste === p.id) op.selected = true; g.append(op); });
      sel.append(g);
    });
    // Mois proposés : automatique (le mois de sa date), puis les mois de l'onglet Épargne
    const ms = $('cl-mois'); ms.replaceChildren(new Option('Automatique : ' + nomMois(o.mois), ''));
    const cles = EPM().mois.map((x) => x.cle); if (o.mois_epargne && !cles.includes(o.mois_epargne)) cles.push(o.mois_epargne);
    cles.filter((k) => k !== o.mois || o.mois_epargne === k).forEach((k) => { const opt = new Option(cap(nomMois(k)), k); if (o.mois_epargne === k) opt.selected = true; ms.append(opt); });
    $('cl-mois-bloc').hidden = o.poste !== 'epargne';
    $('cl-tout').checked = false;
    $('cl-tout-txt').textContent = 'Toujours classer « ' + M.nomLisible(o.libelle) + ' » ici';
    ouvrirDlg(dClasse);
  };

  // ========== Chiffres du mois, tels qu'ils sont affichés ==========
  // Une seule source pour « Ce mois-ci », les pages de détail, « Le calcul » et « Épargne » :
  // des euros entiers, et chaque total est la somme des lignes affichées.
  const C = () => calc;
  const som = (l) => l.reduce((s, x) => s + x, 0);
  const dec1 = (x) => String(Math.round(Number(x) * 10) / 10).replace('.', ',');
  const duree = (n) => (n > 120 ? 'plus de 10 ans' : dec1(n) + ' mois');
  const nomMois = (k) => MOIS_L[Number(k.slice(5, 7)) - 1];
  const MOIS_C = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const moisCourt = (k) => MOIS_C[Number(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4);
  const posteDe = (id) => M.catalogue(bundle).find((p) => p.id === id) || { nom: id, famille: 'autre', ic: 'point' };
  const tonDe = (p) => (p.famille === 'enveloppe' ? TON.enveloppe : p.famille === 'fixe' ? TON.fixe : p.famille === 'revenu' ? TON.revenu : p.famille === 'autre' ? TON.autre : TON[p.groupe]);
  const voirPoste = (id, mois) => { Object.assign(filtre, { poste: id, mois: mois === undefined ? C().mc : mois, aClasser: false, limite: 150 }); $('v-q').value = ''; if (page) fermerPage(); onglet('operations'); dessinerOps(); };
  const vueMois = () => {
    const c = C(), fini = c.ecoules >= c.nbJours;
    const dep = M.entiers(c.variables.map((v) => v.depense)), bud = M.entiers(c.variables.map((v) => v.objectif));
    const postes = c.variables.map((v, i) => ({ v, d: dep[i], b: bud[i], r: bud[i] - dep[i] }));
    const groupe = (g) => { const l = postes.filter((p) => p.v.groupe === g), d = som(l.map((p) => p.d)), b = som(l.map((p) => p.b)); return { l, d, b, r: b - d }; };
    const obl = groupe('obligations'), pla = groupe('plaisir');
    const rares = M.entiers(c.enveloppes.map((e) => e.depense_mois));
    const rares_b = M.entiers(c.enveloppes.map((e) => e.par_mois));
    const fx = M.entiers(c.fixes.map((f) => Math.max(f.montant, f.passe)));
    const D = obl.d + pla.d, B = obl.b + pla.b, X = som(rares), F = som(fx), R = Math.round(c.mois.revenus);
    // Pendant le mois : ce qui est déjà dépensé, plus le reste du budget au prorata des jours qui restent
    const frac = Math.max(0, c.nbJours - c.ecoules) / c.nbJours;
    const Dp = fini ? D : Math.round(som(c.variables.map((v) => v.depense + Math.max(0, v.reste) * frac)));
    const Xp = fini ? X : Math.round(som(c.enveloppes.map((e) => e.depense_mois + Math.max(0, e.par_mois - e.depense_mois) * frac)));
    const E = R - F - Dp - Xp, V = Math.round(c.mois.vire);
    return { fini, postes, obl, pla, rares, rares_b, fx, D, B, X, F, R, Dp, Xp, E, V, aVirer: Math.max(0, E - V), reste: B - D };
  };
  const GROUPES = { obligations: ['Obligations', 'maison'], plaisir: ['Plaisir', 'resto'] };
  const resteTxt = (r) => (r >= 0 ? { val: eur(r), valSous: 'restants' } : { val: eur(-r), valSous: 'de trop', valCls: 'neg' });
  const jauge = (d, b, couleur) => barre(b > 0 ? d / b : d > 0 ? 1 : 0, d > b ? 'var(--red)' : couleur);

  // ========== Écran « Ce mois-ci » : combien je peux encore dépenser ==========
  const dessinerMois = () => {
    const c = C(), mc = c.mc, m = vueMois(), out = [];
    $('v-mois-titre').textContent = cap(nomMois(mc));
    $('v-mois-sous').textContent = 'Du ' + M.dateCourte(c.debut) + ' au ' + M.dateCourte(c.fin) + (c.exp ? ' · relevé du ' + M.dateCourte(c.exp) : '');

    const h = el('div', 'v-carte v-heros'), trop = m.reste < 0;
    h.append(el('div', 'lab', m.fini ? 'Mois terminé · ' + (trop ? 'budget dépassé de' : 'budget non dépensé') : trop ? 'Budget dépassé de' : 'Il te reste à dépenser'));
    h.append(el('div', 'montant' + (trop ? ' neg' : ''), eur(Math.abs(m.reste))));
    if (m.fini) h.append(el('div', 'lab', eur(m.D) + ' dépensés sur ' + eur(m.B) + ' de budget'));
    else h.append(el('div', 'lab', trop ? 'Le mois se termine le ' + M.dateCourte(c.fin) : 'soit ' + eur(Math.round(m.reste / c.mois.joursRestants)) + ' par jour jusqu’au ' + M.dateCourte(c.fin)));
    const j = barre(m.B > 0 ? m.D / m.B : 0, trop ? 'var(--red)' : 'var(--blue)', m.fini ? null : c.ecoules / c.nbJours); j.classList.add('grande'); h.append(j);
    if (m.fini) {
      const b = el('button', 'app-btn primary v-bouton', 'Importer le relevé de ' + nomMois(M.moisDecale(mc, 1))); b.type = 'button'; b.onclick = () => $('app-file').click(); h.append(b);
    } else {
      const jl = el('div', 'v-entre'); jl.append(el('span', '', eur(m.D) + ' dépensés'), el('span', '', 'sur ' + eur(m.B))); h.append(jl);
    }
    out.push(h);

    const af = [];
    if (c.nc) af.push(ligne({ ic: 'etiquette', ton: 'var(--orange)', titre: c.nc + ' opération' + (c.nc > 1 ? 's' : '') + ' à classer', chev: true, clic: () => { Object.assign(filtre, { poste: '', mois: '', aClasser: true, limite: 150 }); onglet('operations'); dessinerOps(); } }));
    if (af.length) out.push(liste(af));

    // Quatre groupes, tous lus de la même façon : dépensé sur budget à gauche, ce qu'il reste à droite
    out.push(section('Où tu en es'));
    const rows = ['obligations', 'plaisir'].map((g) => {
      const G = m[g === 'obligations' ? 'obl' : 'pla'];
      return ligne(Object.assign({ haut: true, ic: GROUPES[g][1], ton: G.r < 0 ? 'var(--red)' : TON[g], titre: GROUPES[g][0], barre: jauge(G.d, G.b, TON[g]), sous: eur(G.d) + ' dépensés sur ' + eur(G.b), chev: true, clic: () => pageGroupe(g) }, resteTxt(G.r)));
    });
    const nomsRares = c.enveloppes.filter((e, i) => m.rares[i] > 0).map((e) => e.nom);
    rows.push(ligne({ haut: true, ic: 'cadeau', ton: TON.enveloppe, titre: 'Dépenses rares', sous: (nomsRares.length === 1 ? nomsRares[0] : nomsRares.length ? nomsRares.length + ' postes' : 'Rien ce mois-ci') + ' · pas de plafond', val: eur(m.X), valSous: 'dépensés', chev: true, clic: pageRares }));
    const passees = c.fixes.filter((f) => f.reste <= 0).length;
    rows.push(ligne({ haut: true, ic: 'billet', ton: TON.fixe, titre: 'Charges fixes', sous: passees + ' sur ' + c.fixes.length + ' passées', val: eur(m.F), valSous: passees === c.fixes.length ? 'payés' : 'au total', chev: true, clic: pageFixes }));
    out.push(liste(rows));
    $('v-mois').replaceChildren(...out);
  };

  // Détail d'un groupe : ses postes, lus comme le groupe
  const pageGroupe = (g) => pousser({
    retour: () => cap(nomMois(C().mc)), titre: () => GROUPES[g][0],
    sous: () => { const G = vueMois()[g === 'obligations' ? 'obl' : 'pla']; return eur(G.d) + ' dépensés sur ' + eur(G.b) + ' · ' + (G.r >= 0 ? eur(G.r) + ' restants' : eur(-G.r) + ' de trop'); },
    corps: () => [
      liste(vueMois()[g === 'obligations' ? 'obl' : 'pla'].l.map((p) => ligne(Object.assign({ haut: true, ic: p.v.ic, ton: p.r < 0 ? 'var(--red)' : TON[g], titre: p.v.nom, barre: jauge(p.d, p.b, TON[g]), sous: eur(p.d) + ' sur ' + eur(p.b), chev: true, clic: () => voirPoste(p.v.id) }, resteTxt(p.r))))),
      note('Touche un poste pour voir ses opérations. Son budget est ta moyenne des derniers mois ; tu peux le fixer toi-même dans Réglages.')
    ]
  });
  const pageRares = () => pousser({
    retour: () => cap(nomMois(C().mc)), titre: () => 'Dépenses rares', sous: () => eur(vueMois().X) + ' dépensés ce mois-ci · pas de plafond',
    corps: () => { const c = C(), m = vueMois(); return [
      liste(c.enveloppes.map((e, i) => ligne({ ic: e.ic, ton: TON.enveloppe, titre: e.nom, sous: m.rares_b[i] > 0 ? 'En moyenne ' + eur(m.rares_b[i]) + ' par mois' : 'Aucune dépense jusqu’ici', val: eur(m.rares[i]), valSous: 'dépensés', chev: true, clic: () => voirPoste(e.id) }))),
      note('Ce que tu dépenses ici dans le mois est retiré de ce que tu mets de côté. Rien ne se reporte sur le mois suivant.')
    ]; }
  });
  const pageFixes = () => pousser({
    retour: () => cap(nomMois(C().mc)), titre: () => 'Charges fixes', sous: () => { const c = C(), n = c.fixes.filter((f) => f.reste <= 0).length; return n + ' sur ' + c.fixes.length + ' passées · ' + eur(vueMois().F) + ' ce mois-ci'; },
    corps: () => { const c = C(), m = vueMois(); return [
      liste(c.fixes.map((f, i) => ligne({ ic: f.ic, ton: TON.fixe, titre: f.nom, sous: f.reste <= 0 ? 'Passé' : f.passe > 0 ? eur(f.passe) + ' déjà passés' : f.jour ? 'Attendu vers le ' + f.jour : 'Attendu', val: eur(m.fx[i]), chev: true, clic: () => voirPoste(f.id) }))),
      note('Une charge passée compte pour son montant réel ; une charge attendue, pour le montant de ton contrat (à changer dans Réglages).')
    ]; }
  });

  // ========== Écran « Épargne » : combien dois-je virer aujourd'hui ==========
  // Le mois en cours (prévision), puis les 3 derniers mois terminés. Un virement compte pour le mois auquel il est rattaché.
  let epm = null;
  const EPM = () => epm || (epm = M.epargneParMois(bundle, calc));
  // Euros entiers d'un mois : la ligne de la liste dit la même chose que sa page
  const chiffresMois = (x) => {
    // Chaque ligne arrondie seule (comme sur les autres écrans) ; le total est calculé à partir des lignes affichées
    const [R, F, P, X] = [x.calcul.revenus, x.calcul.fixes, x.calcul.postes, x.calcul.rares].map((n) => Math.round(n));
    const a = R - F - P - X, v = Math.round(x.vire);
    return { R, F, P, X, a, v, reste: Math.max(0, a - v), retraits: Math.round(x.retraits) };
  };
  const virés = (v) => eur(v) + (v > 1 ? ' virés' : ' viré');
  const ligneMois = (x) => {
    const k = chiffresMois(x), nom = cap(nomMois(x.cle)), ouvrir = () => pageMoisEp(x.cle);
    if (x.etat === 'prevu') {
      const r = ligne({ haut: true, ic: 'calendrier', ton: 'var(--gray)', titre: nom, barre: barre(k.a > 0 ? k.v / k.a : 0, 'var(--gray)'), sous: virés(k.v) + ' sur ' + eur(Math.max(0, k.a)) + ' prévus', val: eur(k.reste), valSous: 'prévu', valCls: 'v-gris', chev: true, clic: ouvrir });
      r.classList.add('prevu'); return r;
    }
    if (k.a < 0) return ligne({ haut: true, ic: 'baisse', ton: 'var(--orange)', titre: nom, sous: 'Fini à ' + eur(k.a), val: '0 €', valSous: 'rien à virer', chev: true, clic: ouvrir });
    if (k.reste > 0) return ligne({ haut: true, ic: 'calendrier', ton: 'var(--red)', titre: nom, barre: barre(k.a > 0 ? k.v / k.a : 0, 'var(--green)'), sous: virés(k.v) + ' sur ' + eur(k.a), val: eur(k.reste), valSous: 'à virer', valCls: 'neg', chev: true, clic: ouvrir });
    const r = ligne({ haut: true, ic: 'ok', ton: 'var(--green)', titre: nom, barre: barre(1, 'var(--green)'), sous: virés(k.v) + ' sur ' + eur(k.a), val: '', valSous: 'soldé', chev: true, clic: ouvrir });
    const v = r.querySelector('.v-val'); v.classList.add('pos'); v.prepend(dessin('ok', 20));
    return r;
  };
  const aVirerAffiche = () => som(EPM().mois.filter((x) => x.etat === 'termine').map((x) => chiffresMois(x).reste));
  const dessinerEpargne = () => {
    const c = C(), e = EPM(), out = [], total = aVirerAffiche();
    $('v-epargne-sous').textContent = c.exp ? 'Relevé du ' + M.dateCourte(c.exp) : '';
    const dus = e.mois.filter((x) => x.etat === 'termine' && chiffresMois(x).reste > 0).map((x) => nomMois(x.cle));
    const h = el('div', 'v-carte v-heros');
    if (total > 0) h.append(el('div', 'lab', 'À virer aujourd’hui'), el('div', 'montant', eur(total)), el('div', 'lab', 'Pour ' + (dus.length > 1 ? dus.slice(0, -1).join(', ') + ' et ' + dus[dus.length - 1] : dus[0])));
    else h.append(el('div', 'lab', 'À virer aujourd’hui'), el('div', 'montant pos', '0 €'), el('div', 'lab', e.mois.some((x) => x.etat === 'termine') ? 'Tout est viré' : 'Pas encore de mois terminé'));
    out.push(h);
    if (e.mois.length) out.push(section('Mois par mois'), liste(e.mois.map(ligneMois)));
    out.push(liste([ligne({ ic: 'boussole', ton: 'var(--teal)', titre: 'Et si… (projections)', chev: true, clic: pageProj })]));
    $('v-epargne').replaceChildren(...out);
  };

  // Détail d'un mois : le calcul, ce qui est déjà viré, les virements comptés pour ce mois
  const pageMoisEp = (cle) => pousser({
    retour: () => 'Épargne', titre: () => cap(nomMois(cle)),
    sous: () => { const x = EPM().mois.find((y) => y.cle === cle); return x ? 'Du ' + M.dateCourte(x.debut) + ' au ' + M.dateCourte(x.fin) + (x.etat === 'prevu' ? ' · en cours' : ' · terminé') : ''; },
    corps: () => {
      const c = C(), x = EPM().mois.find((y) => y.cle === cle); if (!x) return [note('Ce mois n’est plus dans la liste.')];
      const k = chiffresMois(x), prevu = x.etat === 'prevu', moins = (n) => (n ? '−' : '') + eur(n), out = [];
      const l1 = liste([
        ligne({ titre: 'Revenus du mois', val: eur(k.R) }),
        ligne({ titre: 'Charges fixes', val: moins(k.F) }),
        ligne({ titre: 'Obligations et plaisir', sous: prevu ? 'Dépensé, plus le budget qui reste' : '', val: moins(k.P) }),
        ligne({ titre: 'Dépenses rares', sous: prevu ? 'Dépensé, plus ta moyenne qui reste' : '', val: moins(k.X) }),
        ligne({ titre: prevu ? 'Prévu à mettre de côté' : 'À mettre de côté', val: eur(k.a), valCls: k.a < 0 ? 'neg' : '', total: true })
      ], true);
      const l2 = liste([
        ligne({ titre: 'Déjà viré', val: moins(k.v) }),
        ligne({ titre: 'Reste à virer', val: eur(k.reste), total: true })
      ], true);
      l1.classList.add('v-calc'); l2.classList.add('v-calc'); out.push(l1, l2);
      if (prevu) out.push(note('C’est une prévision : le budget qui reste est compté au prorata des jours qui restent. Le dernier jour du mois, c’est le montant exact.'));
      else if (k.a < 0) out.push(note('Ce mois a coûté plus que tes revenus : il n’y a rien à virer. Rien n’est reporté sur le mois suivant.'));
      else {
        const pct = k.R > 0 ? k.a / k.R : 0, obj = Math.round(c.epargne_obj * k.R);
        out.push(note(eur(k.a) + ' = ' + pc0(pct) + ' de tes revenus du mois · objectif ' + pc0(c.epargne_obj) + ' (' + eur(obj) + '). Le budget non dépensé de « Ce mois-ci » est déjà compté dedans.'));
      }
      const ops = c.operations.filter((o) => x.virements.includes(o.id)).sort((a, b) => (a.date < b.date ? -1 : 1));
      out.push(section('Virements comptés'));
      if (!ops.length) out.push(note('Aucun pour l’instant. Un virement fait plus tard peut être rattaché à ce mois depuis Opérations.'));
      else out.push(liste(ops.map((o) => ligne({ ic: 'envoi', ton: 'var(--teal)', court: true, titre: M.nomCourt(o.libelle), sous: M.dateCourte(o.date) + (o.mois_epargne ? ' · rattaché' : ''), val: eur2(-o.montant), chev: true, clic: () => reclasserOp(o) }))));
      if (k.retraits > 0) out.push(note('Retiré de l’épargne ce mois-là : ' + eur(k.retraits) + '. Un retrait ne compte pas dans « Déjà viré ».'));
      return out;
    }
  });

  // ========== Écran « Patrimoine » : ce que j'ai et ce que je dois ==========
  const dessinerPatrimoine = () => {
    const c = C(), E = c.epargne, cr = c.credit, brut = bundle.credit, out = [];
    $('v-pat-sous').textContent = c.exp ? 'Au ' + M.dateCourte(c.exp) : '';
    const [liv, pea] = M.entiers([E.livrets || 0, E.pea || 0]), dette = cr ? Math.round(cr.reste) : 0;
    const h = el('div', 'v-carte v-heros');
    h.append(el('div', 'lab', 'Valeur nette'), el('div', 'montant' + (liv + pea - dette < 0 ? ' neg' : ''), eur(liv + pea - dette)),
      el('div', 'lab', eur(liv + pea) + ' d’épargne' + (cr ? ' · ' + eur(dette) + ' de crédit' : '')));
    out.push(h, section('Comptes'));
    const ed = (id, nom) => () => saisir(nom, 'Valeur aujourd’hui. Ensuite, l’appli suit seule les virements vus sur ton compte courant.', [{ lib: 'Valeur (€)', valeur: E[id] }], ([v]) => {
      if (!(v >= 0)) return 'Tape un montant positif.';
      modifie({ epargne: Object.assign({}, bundle.epargne, { [id]: { valeur: v, date: c.exp || new Date().toISOString().slice(0, 10) } }) }, nom + ' mis à jour.');
    });
    const comptes = [
      ligne({ ic: 'banque', ton: 'var(--green)', titre: 'Livrets (A et LDD)', sous: E.reserve > 0 ? dec1(E.reserve) + ' mois de dépenses' : '', val: eur(liv), chev: true, clic: ed('livrets', 'Livrets') }),
      ligne({ ic: 'hausse', ton: 'var(--indigo)', titre: 'PEA', sous: E.pea_date ? 'Valeur du ' + M.dateCourte(E.pea_date) : '', val: eur(pea), chev: true, clic: ed('pea', 'PEA') })
    ];
    const saisirCredit = () => saisir('Crédit voiture', 'Mensualité, nombre total de mensualités (payées et à venir) et mois de la première.', [{ lib: 'Mensualité (€)', valeur: brut ? brut.mensualite : '' }, { lib: 'Nombre total de mensualités', valeur: brut ? brut.nb : '' }, { lib: 'Première mensualité', type: 'mois', valeur: brut ? brut.premiere : '' }], ([a, n, p]) => {
      if (!(a > 0 && n > 0 && Number.isInteger(n) && /^\d{4}-\d\d$/.test(p))) return 'Remplis les trois champs.';
      modifie({ credit: Object.assign({ nom: 'Voiture', poste: 'credit_voiture' }, brut || {}, { mensualite: a, nb: n, premiere: p }) }, 'Crédit mis à jour.');
    });
    comptes.push(cr
      ? ligne({ ic: 'voiture', ton: 'var(--red)', titre: 'Crédit voiture', sous: cr.restantes + ' mensualité' + (cr.restantes > 1 ? 's' : '') + ' restante' + (cr.restantes > 1 ? 's' : ''), val: '−' + eur(dette), valCls: 'neg', chev: true, clic: saisirCredit })
      : ligne({ ic: 'voiture', ton: 'var(--gray)', titre: 'Crédit voiture', val: 'Aucun', valCls: 'v-gris', chev: true, clic: saisirCredit }));
    out.push(liste(comptes));
    out.push(note('Touche un compte pour mettre à jour sa valeur. Ensuite, l’appli suit seule les virements vus sur ton compte courant.'));
    $('v-pat').replaceChildren(...out);
  };

  // Ma répartition : le repère 50 / 30 / 20 sur le réel, en moyenne ou le mois dernier
  let periodeRep = 'moy';
  const pageRepere = () => pousser({
    retour: () => 'Réglages', titre: () => 'Ma répartition', sous: () => 'Face au repère 50 / 30 / 20',
    corps: () => {
      const c = C(), out = [];
      if (!c.reel.mois.length) return [note('Pas encore de mois terminé : ta répartition s’affichera après ton premier mois complet.')];
      if (!c.dernier) periodeRep = 'moy';
      const seg = el('div', 'v-segment');
      [['moy', 'Moyenne ' + c.reel.mois.length + ' mois'], ['der', 'Mois dernier']].forEach(([id, t2]) => {
        if (id === 'der' && !c.dernier) return;
        const bt = el('button', '', t2); bt.type = 'button'; bt.setAttribute('aria-pressed', String(periodeRep === id)); bt.onclick = () => { periodeRep = id; dessinerPage(); }; seg.append(bt);
      });
      out.push(seg);
      const Re = periodeRep === 'der' ? c.dernier : c.reel;
      const pts = (x) => dec1(Math.abs(x)) + (Math.abs(x) >= 2 ? ' pts' : ' pt');
      const [eo, ep, ee] = M.entiers([Re.obligations, Re.plaisir, Re.epargne]);
      out.push(liste([['Obligations', 'maison', 'var(--blue)', Re.pct.obligations, eo, 0.5, false], ['Plaisir', 'resto', 'var(--indigo)', Re.pct.plaisir, ep, 0.3, false], ['Épargne', 'cible', 'var(--green)', Re.pct.epargne, ee, 0.2, true]].map(([n, ic, col, v, e, cible, auDessus]) => {
        const ec = (v - cible) * 100, bon = auDessus ? ec >= -0.05 : ec <= 0.05;
        const r = ligne({ haut: true, ic, ton: col, titre: n, barre: barre(Math.max(0, v), bon ? col : 'var(--orange)', cible), sous: eur(e) + ' par mois · repère ' + pc0(cible), val: pc(v) });
        const ecs = el('small', bon ? 'pos' : 'orange', (ec >= 0 ? '+' : '−') + pts(ec)); ecs.style.fontWeight = '600'; r.querySelector('.v-val').append(ecs);
        return r;
      })));
      const per = periodeRep === 'der' ? cap(M.moisLabel(Re.mois[0])) + ' (du ' + M.dateCourte(Re.debut) + ' au ' + M.dateCourte(Re.fin) + ')' : 'En moyenne de ' + M.moisLabel(Re.mois[0]) + ' à ' + M.moisLabel(Re.mois[Re.mois.length - 1]);
      out.push(note(per + ', sur ' + eur(eo + ep + ee) + ' de revenus réels par mois. Le trait de chaque jauge marque le repère. Les obligations comptent les charges fixes ; le plaisir compte les dépenses rares.'));
      return out;
    }
  });

  // Et si… : projections
  const SCEN = [['conges', 'Congés'], ['baisse', 'Salaire'], ['pret', 'Prêt'], ['projet', 'Projet']];
  const TITRE_SCEN = { conges: 'Des congés sans solde', baisse: 'Une baisse de salaire', pret: 'Un prêt étudiant', projet: 'Un projet à financer' };
  let scen = 'conges';
  const repProj = { conges: {}, baisse: {}, pret: {}, projet: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY + '-proj') || 'null'); if (s) Object.assign(repProj, s); } catch (e) {}
  const QUESTIONS = {
    conges: [['jours', 'Combien de jours ?', 'jours'], ['mois', 'Quel mois ?', 'mois'], ['par_jour', 'Perte par jour', '€']],
    baisse: [['salaire', 'Nouveau salaire', '€']],
    pret: [['montant', 'Montant emprunté', '€'], ['taux', 'Taux annuel', '%'], ['ans', 'Remboursement', 'ans'], ['etudes', 'Durée des études', 'mois'], ['rev_etudes', 'Revenus en études', '€']],
    projet: [['montant', 'Coût du projet', '€'], ['mois', 'Pour quand ?', 'mois'], ['deja', 'Déjà mis de côté', '€']]
  };
  const pageProj = () => pousser({
    retour: () => 'Épargne', titre: () => 'Et si…', sous: () => 'Laisse vide ce que tu ne sais pas.',
    corps: () => {
      const seg = el('div', 'v-segment quatre');
      SCEN.forEach(([k, t]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(scen === k)); b.onclick = () => { scen = k; dessinerPage(); }; seg.append(b); });
      const zone = el('div');
      const champs = liste(QUESTIONS[scen].map(([k, lib, unite]) => {
        const row = el('div', 'v-ligne'), t = el('div', 'v-txt'); t.append(el('b', '', lib));
        const inp = el('input', 'v-champ'); inp.setAttribute('aria-label', lib);
        if (unite === 'mois' && k === 'mois') { inp.type = 'month'; inp.style.width = '150px'; inp.value = repProj[scen][k] || ''; }
        else { inp.setAttribute('inputmode', 'decimal'); inp.placeholder = '?'; inp.value = repProj[scen][k] === undefined || repProj[scen][k] === '' ? '' : String(repProj[scen][k]).replace('.', ','); }
        inp.oninput = () => {
          const v = inp.type === 'month' ? inp.value : (inp.value.trim() === '' ? '' : nombre(inp.value));
          repProj[scen][k] = v === '' || (typeof v === 'number' && !isFinite(v)) ? '' : v;
          try { localStorage.setItem(KEY + '-proj', JSON.stringify(repProj)); } catch (e) {}
          resultatProj(zone);
        };
        const u = el('span', 'v-gris v-unite', unite === 'mois' && k === 'mois' ? '' : unite);
        row.append(t, inp, u); return row;
      }), true);
      const bloc = el('div', 'v-proj'); bloc.append(seg, section(TITRE_SCEN[scen]), champs, zone);
      resultatProj(zone);
      return [bloc];
    }
  });
  const resultatProj = (zone) => {
    const c = C(), r = M.projeter(scen, repProj[scen], c), x = r.res, H = r.hyp, out = [];
    const hyps = [];
    const lh = (k, t) => { if (H[k]) hyps.push(t); };
    const salTxt = c.base.salaire_reel ? 'salaire moyen' : 'salaire de référence';
    const carteGros = (lab, v, sous, cls) => { const k = el('div', 'v-carte'); k.append(el('div', 'v-gris', lab)); const g = el('div', 'v-gros', v); if (cls) g.className += ' ' + cls; k.append(g); if (sous) k.append(el('div', 'v-gris', sous)); return k; };
    if (scen === 'conges') {
      lh('jours', x.jours + ' jours'); lh('mois', 'en ' + x.mois_lib); lh('par_jour', eur(x.par_jour) + ' par jour (' + salTxt + ' de ' + eur(c.base.salaire) + ' ÷ 21,7 jours travaillés)');
      out.push(carteGros('À mettre de côté avant ' + x.mois_lib, eur(x.total), 'soit ' + eur(x.par_mois) + ' par mois pendant ' + x.n + ' mois'));
      out.push(liste([
        ligne({ titre: 'Ton épargne ces mois-là', val: pc0(x.epargne_avant) + ' → ' + pc0(x.epargne_pendant), valCls: x.epargne_pendant < c.epargne_min ? 'orange' : '' }),
        ligne({ titre: 'Sans rien mettre de côté', sous: cap(x.mois_lib) + ' finirait à', val: eur(x.sans_rien), valCls: x.sans_rien < 0 ? 'neg' : '' }),
        ligne({ titre: 'Ta réserve tiendrait encore', val: duree(c.epargne.reserve) })
      ], true));
    } else if (scen === 'baisse') {
      lh('salaire', eur(x.salaire) + ' (20 % de moins que ton ' + salTxt + ' de ' + eur(c.base.salaire) + ')');
      out.push(carteGros('Ton épargne passerait de ' + pc0(x.avant_pct) + ' à', pc0(x.epargne_pct), eur(x.epargne) + ' par mois', x.epargne < 0 ? 'neg' : ''));
      const l = [ligne({ titre: 'Revenus du mois', val: eur(x.revenus) })];
      if (x.a_reduire > 0) {
        l.push(ligne({ titre: 'À réduire chaque mois', val: eur(x.a_reduire), valCls: 'neg' }));
        l.push(ligne({ titre: 'Soit sur tes postes plaisir', val: '−' + pc0(x.reduc_plaisir) }));
        if (x.reserve && x.reserve <= 120) l.push(ligne({ titre: 'Ta réserve, sans rien réduire', val: dec1(x.reserve) + ' mois' }));
      }
      if (x.reserve_sans_salaire) l.push(ligne({ titre: 'Ta réserve, sans aucun salaire', val: duree(x.reserve_sans_salaire) }));
      out.push(liste(l, true));
    } else if (scen === 'pret') {
      lh('montant', eur(x.montant) + ' empruntés'); lh('taux', String(x.taux).replace('.', ',') + ' % par an (à remplacer par le taux de la banque)'); lh('ans', x.ans + ' ans de remboursement');
      lh('etudes', x.etudes + ' mois d’études'); lh('rev_etudes', eur(x.rev_etudes) + ' de revenus par mois pendant les études (tes revenus moyens hors salaire)');
      out.push(carteGros('Mensualité après les études', eur(x.mensualite), pc(x.mens_pct) + ' de tes revenus actuels · coût du crédit ' + eur(x.cout)));
      out.push(liste([
        ligne({ titre: 'Besoin par mois', sous: 'Pendant les études', val: eur(Math.max(0, x.besoin)) }),
        ligne({ titre: 'Sur ' + x.etudes + ' mois d’études', val: eur(x.total_etudes) }),
        ligne({ titre: x.couvert >= 0 ? 'Le prêt couvre tout, il reste' : 'Il manquerait', val: eur(Math.abs(x.couvert)), valCls: x.couvert < 0 ? 'neg' : 'pos' }),
        ligne({ titre: 'Ton épargne après', sous: 'Avec ton salaire actuel', val: pc0(x.epargne_apres), valCls: x.epargne_apres < c.epargne_min ? 'orange' : '' })
      ], true));
    } else if (scen === 'projet') {
      lh('montant', eur(x.montant)); lh('mois', 'pour ' + x.mois_lib); lh('deja', 'rien de côté pour l’instant');
      out.push(carteGros('À mettre de côté chaque mois', eur(x.par_mois), pc(x.pct) + ' de tes revenus, pendant ' + x.n + ' mois'));
      out.push(liste([
        ligne({ titre: c.revenus_depuis ? 'Ton épargne attendue' : 'Ton épargne moyenne', val: eur(c.base.epargne) + ' /mois' }),
        ligne({ titre: x.epargne_reste >= 0 ? 'Il te resterait à épargner' : 'Il manquerait chaque mois', val: eur(Math.abs(Math.round(c.base.epargne) - Math.round(x.par_mois))), valCls: x.epargne_reste < 0 ? 'neg' : '' })
      ], true));
    }
    if (hyps.length) { const p = el('p', 'v-note v-hyps'); p.append(el('span', 'v-hyp', 'hypothèses'), ' ' + hyps.join(' · ') + '.'); out.unshift(p); }
    out.push(note((!c.base.reel ? 'Calculs à partir de ton budget de référence : ' : !c.revenus_depuis ? 'Calculs à partir de ta moyenne réelle (' + c.reel.mois.length + ' mois, hors revenus exceptionnels) : ' : 'Calculs à partir de tes dépenses moyennes (' + c.reel.mois.length + ' mois) et de ' + (c.mois_revenus.length ? 'tes revenus depuis ' + M.moisLabel(c.revenus_depuis) + ' (hors revenus exceptionnels) : ' : 'tes revenus de référence, comptés depuis ' + M.moisLabel(c.revenus_depuis) + ' : ')) + eur(c.base.revenus) + ' de revenus, ' + eur(c.base.depenses) + ' de dépenses et ' + eur(c.base.epargne) + ' d’épargne par mois.'));
    zone.replaceChildren(...out);
  };

  // ========== Opérations ==========
  const filtre = { poste: '', mois: null, aClasser: false, limite: 150 };
  $('v-q').addEventListener('input', () => { filtre.limite = 150; dessinerOps(); });
  const dessinerOps = () => {
    const c = C(); if (filtre.mois === null) filtre.mois = c.mc;
    const prec = M.moisDecale(c.mc, -1);
    const f = el('div');
    const seg = el('div', 'v-segment trois');
    [['Ce mois-ci', c.mc], ['Mois dernier', prec], ['Tout', '']].forEach(([t, m]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(filtre.mois === m && !filtre.aClasser)); b.onclick = () => { Object.assign(filtre, { mois: m, aClasser: false, limite: 150 }); dessinerOps(); window.scrollTo(0, 0); }; seg.append(b); });
    f.append(seg);
    const puces = el('div', 'v-filtres');
    if (filtre.poste) { const b = el('button', 'v-puce on'); b.type = 'button'; b.append(posteDe(filtre.poste).nom, dessin('croix', 14)); b.onclick = () => { filtre.poste = ''; dessinerOps(); }; puces.append(b); }
    if (c.nc) { const b = el('button', 'v-puce' + (filtre.aClasser ? ' on' : ''), 'À classer · ' + c.nc); b.type = 'button'; b.onclick = () => { filtre.aClasser = !filtre.aClasser; if (filtre.aClasser) filtre.mois = ''; dessinerOps(); window.scrollTo(0, 0); }; puces.append(b); }
    if (puces.childNodes.length) f.append(puces);
    $('v-ops-filtres').replaceChildren(f);

    const q = $('v-q').value.trim().toLowerCase();
    let l = c.operations.filter((o) => (!filtre.mois || o.mois === filtre.mois) && (!filtre.poste || o.poste === filtre.poste) && (!filtre.aClasser || o.poste === 'non_classe'));
    if (q) l = l.filter((o) => (o.libelle + ' ' + posteDe(o.poste).nom + ' ' + String(o.montant).replace('.', ',')).toLowerCase().includes(q));
    l = l.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
    const out = [];
    if (filtre.poste || q) {
      const tot = l.reduce((s, o) => s + Number(o.montant), 0);
      out.push(note(l.length + ' opération' + (l.length > 1 ? 's' : '') + ' · total ' + signe2(Math.round(tot * 100) / 100)));
    }
    if (!l.length) out.push(note('Aucune opération.'));
    let jour = '', grp = null;
    l.slice(0, filtre.limite).forEach((o) => {
      if (o.date !== jour) { jour = o.date; out.push(el('div', 'v-jour', dateLongue(o.date))); grp = liste([]); out.push(grp); }
      const p = posteDe(o.poste);
      grp.append(ligne({ ic: p.ic, ton: o.poste === 'non_classe' ? 'var(--gray)' : tonDe(p), court: true, titre: M.nomCourt(o.libelle), sous: o.poste === 'non_classe' ? 'À classer' : o.poste === 'epargne' && o.mois_epargne ? p.nom + ' · compté pour ' + nomMois(o.mois_epargne) : p.nom, sousCls: o.poste === 'non_classe' ? 'badge' : '',
        val: signe2(o.montant), valCls: o.montant > 0 ? 'pos' : '', clic: () => reclasserOp(o) }));
    });
    if (l.length > filtre.limite) { const b = el('button', 'app-btn v-plus', 'Voir plus'); b.type = 'button'; b.onclick = () => { filtre.limite += 150; dessinerOps(); }; out.push(b); }
    $('v-ops').replaceChildren(...out);
    ajuster();
    // Sur iPhone, une liste qui raccourcit alors que la page est défilée plus bas laisse Safari décalé : les feuilles qui s'ouvrent
    // ne répondent plus au toucher (menu du poste). On ramène donc la page dans la liste.
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight); if (window.scrollY > max) window.scrollTo(0, max);
  };
  // ========== Réglages : une ligne = un titre et une valeur, l'explication est dans la feuille ==========
  const etatSauvegarde = () => {
    const mod = bundle.modifie_le, sav = bundle.sauvegarde_le;
    if (!sav) return { txt: 'Jamais faite', due: true };
    if (mod && mod > sav) return { txt: 'À refaire', due: true };
    return { txt: 'le ' + new Date(sav).toLocaleDateString('fr-FR').slice(0, 5), due: false };
  };
  const serre = (rows) => { const l = liste(rows); l.classList.add('serre'); return l; };
  const dessinerReglages = () => {
    const c = C(), m = vueMois(), out = [], sv = etatSauvegarde();
    const b = budgetNormal();
    const ouvrir = (titre, sous, corps) => () => pousser({ retour: () => 'Réglages', titre: () => titre, sous: () => sous, corps });
    out.push(section('Mon budget d’un mois normal'));
    out.push(serre([
      ligne({ ic: 'billet', ton: 'var(--green)', titre: 'Revenus', val: eur(b.R), chev: true, clic: ouvrir('Revenus', 'Ce que l’appli attend chaque mois', corpsRevenus) }),
      ligne({ ic: 'maison', ton: TON.fixe, titre: 'Charges fixes', val: '−' + eur(b.F), chev: true, clic: ouvrir('Charges fixes', 'Les montants de tes contrats', corpsFixes) }),
      ligne({ ic: 'panier', ton: TON.obligations, titre: 'Obligations', val: '−' + eur(b.O), chev: true, clic: ouvrir('Obligations', 'Par défaut : ta moyenne des derniers mois', () => corpsGroupe('obligations')) }),
      ligne({ ic: 'resto', ton: TON.plaisir, titre: 'Plaisir', val: '−' + eur(b.P), chev: true, clic: ouvrir('Plaisir', 'Par défaut : ta moyenne des derniers mois', () => corpsGroupe('plaisir')) }),
      ligne({ ic: 'cadeau', ton: TON.enveloppe, titre: 'Dépenses rares', val: '−' + eur(b.X), chev: true, clic: ouvrir('Dépenses rares', 'Sans plafond : ta moyenne par mois', () => corpsGroupe('rares')) }),
      ligne({ ic: 'pieces', ton: 'var(--green)', titre: 'Épargne prévue', val: eur(b.E), valCls: b.E < 0 ? 'neg' : '', total: true })
    ]));
    out.push(serre([
      ligne({ ic: 'pct', ton: 'var(--blue)', titre: 'Ma répartition 50 / 30 / 20', chev: true, clic: pageRepere }),
      ligne({ ic: 'cible', ton: 'var(--green)', titre: 'Objectif d’épargne', val: pc0(c.epargne_min) + ' · ' + pc0(c.epargne_obj), chev: true,
        clic: () => saisir('Objectif d’épargne', 'Ton minimum et ton objectif, en % des revenus du mois.', [{ lib: 'Minimum (%)', valeur: Math.round(c.epargne_min * 100) }, { lib: 'Objectif (%)', valeur: Math.round(c.epargne_obj * 100) }], ([a, o]) => {
          if (!(a >= 0 && o >= a && o <= 100)) return 'Le minimum doit être entre 0 et l’objectif.';
          modifie({ reglages: Object.assign({}, bundle.reglages, { epargne_min: a / 100, epargne_obj: o / 100 }) }, 'Épargne : minimum ' + a + ' %, objectif ' + o + ' %.');
        }) })
    ]));
    out.push(section('Mes données'));
    out.push(serre([
      ligne({ ic: 'import', ton: 'var(--blue)', titre: 'Importer un relevé', chev: true, clic: () => $('app-file').click() }),
      ligne({ ic: 'disque', ton: 'var(--blue)', titre: 'Sauvegarder', val: sv.txt, valCls: sv.due ? 'orange' : 'v-gris', chev: true, clic: sauvegarder }),
      ligne({ ic: 'etiquette', ton: 'var(--gray)', titre: 'Règles de classement', val: String((bundle.regles_perso || []).length + (bundle.regles || []).length), chev: true, clic: () => pousser({ retour: () => 'Réglages', titre: () => 'Règles', corps: corpsRegles }) })
    ]));
    out.push(note('Tes données restent sur ce téléphone. Sauvegarde après chaque import.'));
    $('v-reglages').replaceChildren(...out);
  };
  // Le budget d'un mois normal : revenus de référence moins chaque famille ; chaque famille vaut la somme de ses postes affichés
  const budgetNormal = () => {
    const c = C(), m = vueMois(), F = som(M.entiers((bundle.fixes || []).map((f) => Number(f.montant) || 0)));
    const R = Math.round(c.plan.revenus), O = m.obl.b, P = m.pla.b, X = som(m.rares_b);
    return { R, F, O, P, X, E: R - F - O - P - X };
  };
  const corpsRevenus = () => {
    const c = C(), R = bundle.reglages;
    return [serre([
      ligne({ ic: 'billet', ton: 'var(--green)', titre: 'Salaire de référence', val: eur(R.salaire_ref), chev: true,
        clic: () => saisir('Salaire de référence', 'Compté tant que la paie du mois n’est pas arrivée. Un mois mieux payé ajoute la différence à l’épargne.', [{ lib: 'Salaire par mois (€)', valeur: R.salaire_ref }], ([v]) => { if (!(v > 0)) return 'Tape un montant positif.'; reglage('salaire_ref', v, 'Salaire de référence : ' + eur(v) + '.'); }) }),
      ...(R.aides || []).map((a, i) => ligne({ ic: 'maison', ton: 'var(--green)', titre: a.nom, val: eur(a.montant), chev: true,
        clic: () => saisir(a.nom, 'Montant reçu chaque mois. Mets 0 si ça s’arrête.', [{ lib: 'Montant par mois (€)', valeur: a.montant }], ([v]) => { if (!(v >= 0)) return 'Tape un montant positif ou 0.'; reglage('aides', R.aides.map((x, j) => (j === i ? Object.assign({}, x, { montant: v }) : x)), a.nom + ' : ' + eur(v) + '.'); }) })),
      ligne({ ic: 'calendrier', ton: 'var(--green)', titre: 'Revenus depuis', val: R.revenus_depuis ? moisCourt(R.revenus_depuis) : 'le début', chev: true,
        clic: () => saisir('Revenus depuis', 'Si tes revenus ont changé (une aide en moins, un nouveau contrat), choisis le mois du changement : la moyenne de tes revenus repart de ce mois. Laisse vide pour compter tous les mois.', [{ lib: 'Mois du changement', type: 'mois', valeur: R.revenus_depuis || '' }], ([v]) => { if (v && !/^\d{4}-\d\d$/.test(v)) return 'Choisis un mois.'; reglage('revenus_depuis', v || '', v ? 'Revenus comptés depuis ' + M.moisLabel(v) + '.' : 'Revenus comptés depuis le début.'); }) }),
      ligne({ ic: 'calendrier', ton: 'var(--gray)', titre: 'Jour de paie', val: 'le ' + c.j0, chev: true,
        clic: () => saisir('Jour de paie', 'Le mois du budget va de ce jour au jour d’avant, le mois suivant.', [{ lib: 'Jour (1 à 28)', valeur: c.j0 }], ([v]) => { if (!(v >= 1 && v <= 28 && Number.isInteger(v))) return 'Tape un jour entre 1 et 28.'; reglage('jour_debut', v, 'Le mois commence le ' + v + '.'); }) })
    ]), note('Le budget d’un mois normal part du salaire de référence et des aides. « Revenus depuis » règle la moyenne utilisée pour les pourcentages et les projections.')];
  };
  // Saisie d'un % à la main ; champ vide = retour à la moyenne automatique
  const pcTexte = (x) => String(Math.round(x * 1000) / 10).replace('.', ',');
  const saisirPct = (p, autoTxt) => {
    const c = C();
    saisir(p.nom, 'En % de ' + (c.mois_revenus.length ? 'tes revenus réels moyens' : 'tes revenus de référence') + ' (' + eur(c.revenus_base) + '). Laisse vide pour revenir à l’automatique : ' + autoTxt + '.',
      [{ lib: 'Part des revenus (%)', valeur: p.manuel ? pcTexte(p.pct) : '' }], ([v]) => {
        const mm = Object.assign({}, bundle.objectifs_manuels || {});
        if (v === null) { delete mm[p.id]; modifie({ objectifs_manuels: mm }, p.nom + ' : retour à l’automatique.'); return; }
        if (!(v >= 0 && v <= 100)) return 'Tape un pourcentage entre 0 et 100, par exemple 7,5.';
        mm[p.id] = Math.round(v * 10) / 1000;
        modifie({ objectifs_manuels: mm }, p.nom + ' : ' + pcTexte(mm[p.id]) + ' % (' + eur(mm[p.id] * c.revenus_base) + ').');
      });
  };
  // Postes d'un groupe : un montant par mois pour chaque poste, modifiable en % des revenus
  const corpsGroupe = (g) => {
    const c = C(), m = vueMois();
    const ligneP = (p, ton, b, base, unite) => ligne({ ic: p.ic, ton, titre: p.nom, sous: p.manuel ? 'Fixé à la main' : base, sousCls: p.manuel ? 'badge' : '', val: eur(b), valSous: pc(p.pct), chev: true,
      clic: () => saisirPct(p, pc(p.auto / c.revenus_base) + ' (' + eur(p.auto) + unite + ')') });
    if (g === 'rares') return [
      liste(c.enveloppes.map((e, i) => ligneP(e, TON.enveloppe, m.rares_b[i], e.mois_objectif.length ? 'Moyenne de ' + e.mois_objectif.length + ' mois' : 'Pas encore de dépense', ' par mois'))),
      note('Cadeaux, voyages, gros achats, entretien : pas de plafond. Ce qui est dépensé dans le mois est retiré de l’épargne du mois.')];
    const G = g === 'obligations' ? m.obl : m.pla;
    return [
      liste(G.l.map((p) => ligneP(p.v, TON[g], p.b, p.v.mois_objectif.length ? 'Moyenne de ' + p.v.mois_objectif.length + ' mois' : p.v.depart ? 'Montant de départ' : 'Pas encore de mois terminé', ''))),
      note('Chaque montant bouge chaque mois avec ta moyenne (12 mois au plus). Touche un poste pour le fixer toi-même, en % de tes revenus.')];
  };
  const corpsFixes = () => [
    liste((bundle.fixes || []).map((f, i) => ligne({ ic: f.ic, ton: TON.fixe, titre: f.nom, val: eur2(f.montant), chev: true,
      clic: () => saisir(f.nom, 'Montant par mois.', [{ lib: 'Montant (€)', valeur: f.montant }], ([v]) => { if (!(v >= 0)) return 'Tape un montant positif ou 0.'; modifie({ fixes: bundle.fixes.map((x, j) => (j === i ? Object.assign({}, x, { montant: v }) : x)) }, f.nom + ' : ' + eur2(v) + '.'); }) }))),
    note('Touche une ligne pour changer son montant. Total : ' + eur2(C().plan.fixes) + ' par mois.')
  ];
  const corpsRegles = () => {
    const l = bundle.regles_perso || [], out = [];
    out.push(section('Marchands mémorisés'));
    if (!l.length) out.push(note('Aucun pour l’instant. Coche « Toujours classer ce marchand ici » en changeant le poste d’une opération.'));
    else out.push(liste(l.map((p, i) => ligne({ titre: p.marchand, sous: posteDe(p.poste).nom, val: 'Retirer', valCls: 'neg', clic: () => { modifie({ regles_perso: l.filter((x, j) => j !== i) }, 'Règle « ' + p.marchand + ' » retirée.'); } })), true));
    out.push(note((bundle.regles || []).length + ' règles de départ (salaire, loyer, virements, abonnements…) classent aussi tes opérations.'));
    return out;
  };

  // ---------- Tout redessiner ----------
  const dessiner = () => {
    if (!calc) return;
    epm = null;
    dessinerMois(); dessinerEpargne(); dessinerPatrimoine(); dessinerOps(); dessinerReglages(); if (page) dessinerPage(); majHaut(); ajuster();
    $('pt-epargne').hidden = !(aVirerAffiche() > 0);
    $('pt-reglages').hidden = !etatSauvegarde().due;
  };

  if (bundle) {
    $('racine').hidden = false;
    montrer(location.hash.slice(1));
    dessiner();
  } else $('app-vide').hidden = false;

  window.App = { bundle: () => bundle, calc: () => calc };
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
