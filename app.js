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
  const rafraichir = () => { calc = M.calculer(bundle); dessiner(); rappel(); };
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
    point: '<circle cx="12" cy="12" r="3"/>'
  };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined && txt !== null) e.textContent = txt; return e; };
  const dessin = (nom, taille) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const t = String(taille || 18); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', t); s.setAttribute('height', t); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = SVG_IC[nom] || SVG_IC.point; return s; };
  document.querySelectorAll('[data-icone]').forEach((s) => s.replaceChildren(dessin(s.dataset.icone, s.closest('.v-onglets') ? 22 : 20)));

  // ---------- Briques ----------
  const TON = { obligations: 'var(--blue)', plaisir: 'var(--indigo)', enveloppe: 'var(--orange)', fixe: 'var(--gray)', revenu: 'var(--green)', autre: 'var(--teal)' };
  const carre = (nom, t) => { const s = el('span', 'v-carre'); s.style.setProperty('--t', t || 'var(--gray)'); s.setAttribute('aria-hidden', 'true'); s.append(dessin(nom, 17)); return s; };
  const chev = () => { const s = el('span', 'v-chev'); s.append(dessin('chev', 14)); return s; };
  // o : { ic, ton, titre, sous, sousCls, val, valSous, valCls, clic, chev, apres }
  const ligne = (o) => {
    const r = el(o.clic ? 'button' : 'div', 'v-ligne'); if (o.clic) { r.type = 'button'; r.onclick = o.clic; }
    if (o.ic) r.append(carre(o.ic, o.ton));
    const t = el('div', 'v-txt'); t.append(el('b', '', o.titre)); if (o.sous) t.append(el('small', o.sousCls || '', o.sous)); if (o.apres) t.append(o.apres);
    r.append(t);
    if (o.val !== undefined && o.val !== null) { const v = el('div', 'v-val' + (o.valCls ? ' ' + o.valCls : ''), o.val); if (o.valSous) v.append(el('small', '', o.valSous)); r.append(v); }
    if (o.chev) r.append(chev());
    return r;
  };
  const liste = (rows, nu) => { const l = el('div', 'v-liste' + (nu ? ' nu' : '')); l.append(...rows); return l; };
  const section = (titre, droite) => { const h = el('h2', 'v-section', titre); if (droite) h.append(el('small', '', droite)); return h; };
  const barre = (part, couleur, repere) => { const b = el('div', 'v-barre'), i = el('i'); i.style.width = Math.max(0, Math.min(100, part * 100)) + '%'; i.style.background = couleur; b.append(i); if (repere !== undefined && repere !== null) { const m = el('b'); m.style.left = Math.min(99, repere * 100) + '%'; b.append(m); } return b; };
  const note = (t) => el('p', 'v-note', t);
  const hyp = () => el('span', 'v-hyp', 'hypothèse');

  // ---------- Navigation ----------
  const montrer = (nom) => {
    const tabs = [...document.querySelectorAll('.bm-tab')];
    if (!tabs.some((t) => t.dataset.tab === nom)) nom = 'mois';
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === nom)));
    document.querySelectorAll('.bm-page').forEach((p) => { p.hidden = p.id !== nom; });
  };
  const onglet = (n) => { document.querySelector('.bm-tab[data-tab="' + n + '"]').click(); };
  document.querySelectorAll('.bm-tab').forEach((t) => t.addEventListener('click', () => { montrer(t.dataset.tab); history.replaceState(null, '', '#' + t.dataset.tab); window.scrollTo(0, 0); majHaut(); }));
  document.querySelectorAll('[data-importer]').forEach((b) => { b.onclick = () => $('app-file').click(); });

  let page = null;
  const pageEl = $('v-page');
  const dessinerPage = () => { if (!page) return; $('v-page-titre').textContent = page.titre; $('v-page-corps').replaceChildren(...page.corps()); };
  const pousser = (p) => { page = p; dessinerPage(); pageEl.scrollTop = 0; pageEl.classList.add('on'); document.body.style.overflow = 'hidden'; };
  const fermerPage = () => { pageEl.classList.remove('on'); pageEl.style.transform = ''; document.body.style.overflow = ''; page = null; };
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
    const vals = [...$('ch-champs').querySelectorAll('input')].map((i) => (i.type === 'month' ? i.value : nombre(i.value)));
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
  const rappel = () => {
    const e = $('app-save'); if (!bundle) { e.hidden = true; return; }
    const mod = bundle.modifie_le, sav = bundle.sauvegarde_le;
    if (sav && (!mod || mod <= sav)) { e.hidden = true; return; }
    $('app-save-txt').textContent = sav ? 'Modifié depuis ta sauvegarde du ' + new Date(sav).toLocaleDateString('fr-FR').slice(0, 5) + '.' : 'Aucune sauvegarde : tes données ne sont que sur ce téléphone.';
    e.hidden = false;
  };
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
  const marque = () => { bundle.sauvegarde_le = auj(); ecrire(bundle); rappel(); dessiner(); };
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
  $('app-save-btn').onclick = sauvegarder;

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
    '<label><input type="checkbox" id="cl-tout"> <span id="cl-tout-txt"></span></label>' + boutons('Enregistrer'), () => {
    if (opId === null) return;
    const p = $('cl-poste').value, nomP = (M.catalogue(bundle).find((x) => x.id === p) || {}).nom || p;
    changer(M.reclasser(bundle, opId, p, $('cl-tout').checked), 'Opération classée en « ' + nomP + ' ».');
  });
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
    $('cl-tout').checked = false;
    $('cl-tout-txt').textContent = 'Toujours classer « ' + M.nomLisible(o.libelle) + ' » ici';
    ouvrirDlg(dClasse);
  };

  // ========== Écran « Ce mois-ci » ==========
  const C = () => calc;
  const posteDe = (id) => M.catalogue(bundle).find((p) => p.id === id) || { nom: id, famille: 'autre', ic: 'point' };
  const tonDe = (p) => (p.famille === 'enveloppe' ? TON.enveloppe : p.famille === 'fixe' ? TON.fixe : p.famille === 'revenu' ? TON.revenu : p.famille === 'autre' ? TON.autre : TON[p.groupe]);
  const voirPoste = (id, mois) => { Object.assign(filtre, { poste: id, mois: mois === undefined ? C().mc : mois, aClasser: false, limite: 150 }); $('v-q').value = ''; if (page) fermerPage(); onglet('operations'); dessinerOps(); };

  const dessinerMois = () => {
    const c = C(), mc = c.mc, P = c.plan;
    const lab = cap(MOIS_L[Number(mc.slice(5, 7)) - 1]);
    $('v-mois-titre').textContent = lab;
    $('v-mois-sous').textContent = 'Du ' + M.dateCourte(c.debut) + ' au ' + M.dateCourte(c.fin) + (c.exp ? ' · opérations jusqu’au ' + M.dateCourte(c.exp) : '');
    const out = [];

    // Héros : reste à dépenser et répartition en % face au repère 50 / 30 / 20
    const h = el('div', 'v-carte v-heros');
    h.append(el('div', 'lab', 'Il te reste à dépenser'), el('div', 'montant', eur(c.mois.reste)));
    const pj = el('div', 'lab');
    if (c.ecoules < c.nbJours) { pj.append('soit ', el('b', '', eur(c.mois.par_jour) + ' par jour')); pj.lastChild.style.color = 'var(--fg)'; pj.append(' jusqu’au ' + M.dateCourte(c.fin)); }
    else pj.append('Dernier jour du mois : importe l’export de demain pour démarrer le suivant.');
    h.append(pj);
    const rp = c.mois.repart, rep = el('div', 'v-repart'), pile = el('div', 'v-pile');
    pile.setAttribute('role', 'img'); pile.setAttribute('aria-label', 'Obligations ' + pc0(rp.obligations) + ', plaisir ' + pc0(rp.plaisir) + ', épargne ' + pc0(rp.epargne));
    [['obligations', 'var(--blue)'], ['plaisir', 'var(--indigo)'], ['epargne', 'var(--green)']].forEach(([k, col]) => { const i = el('i'); i.style.flex = String(Math.max(0, rp[k])); i.style.background = col; pile.append(i); });
    const reperes = el('div', 'v-reperes'); [['50 %', 50], ['80 %', 80]].forEach(([t, x]) => { const s = el('span', '', t); s.style.left = x + '%'; reperes.append(s); });
    const leg = el('div', 'v-leg');
    [['Obligations', 'var(--blue)', rp.obligations, 'repère 50 %'], ['Plaisir', 'var(--indigo)', rp.plaisir, 'repère 30 %'], ['Épargne', 'var(--green)', rp.epargne, 'repère 20 %']].forEach(([n, col, v, r]) => {
      const d = el('div'), s = el('span'), i = el('i'); i.style.background = col; s.append(i, n);
      const vv = el('span', '', pc0(v) + ' '); vv.append(el('em', '', r)); d.append(s, vv); leg.append(d);
    });
    rep.append(pile, reperes, leg); h.append(rep); out.push(h);

    // À faire
    const af = [];
    if (c.compte && c.compte.prevu !== null && c.compte.prevu < c.compte_min)
      af.push(ligne({ ic: 'baisse', ton: 'var(--red)', titre: 'Compte à ' + eur(c.compte.prevu) + ' le ' + M.dateCourte(c.compte.le), sous: 'Sous ton minimum de ' + eur(c.compte_min) + ' avant le loyer' }));
    if (c.mois.repart.epargne < c.epargne_min)
      af.push(ligne({ ic: 'pct', ton: 'var(--orange)', titre: 'Épargne prévue : ' + pc0(c.mois.repart.epargne), sous: 'Sous ton minimum de ' + pc0(c.epargne_min) }));
    if (c.nc) af.push(ligne({ ic: 'etiquette', ton: 'var(--orange)', titre: c.nc + ' opération' + (c.nc > 1 ? 's' : '') + ' à classer', chev: true, clic: () => { Object.assign(filtre, { poste: '', mois: '', aClasser: true, limite: 150 }); onglet('operations'); dessinerOps(); } }));
    if (af.length) out.push(section('À faire'), liste(af));

    // Épargne prévue
    out.push(section('Épargne prévue'));
    const ep = el('div', 'v-carte'), tete = el('div'); tete.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline;gap:8px';
    const big = el('span', '', eur(c.mois.epargne)); big.style.font = '700 22px var(--sfr)'; if (c.mois.epargne < 0) big.className = 'neg';
    const pp = el('span', 'v-gris', ' · ' + pc(c.mois.repart.epargne)); pp.style.fontSize = '15px'; big.append(pp);
    tete.append(el('span', 'v-gris', 'Fin du mois, le ' + M.dateCourte(c.fin)), big); ep.append(tete);
    const echelle = 0.25, part = Math.max(0, c.mois.repart.epargne) / echelle;
    const b = barre(part, c.mois.repart.epargne < c.epargne_min ? 'var(--orange)' : 'var(--green)'); b.style.height = '8px';
    [c.epargne_min, c.epargne_obj].forEach((x) => { const m = el('b'); m.style.left = Math.min(99, x / echelle * 100) + '%'; b.append(m); }); ep.append(b);
    const ech = el('div', 'v-echelle'); [['min. ' + pc0(c.epargne_min), c.epargne_min], ['objectif ' + pc0(c.epargne_obj), c.epargne_obj]].forEach(([t, x]) => { const s = el('span', '', t); s.style.left = Math.min(92, x / echelle * 100) + '%'; ech.append(s); });
    ep.append(ech);
    if (c.mois.salaire > 0) ep.append(note('Salaire reçu : ' + eur2(c.mois.salaire) + (Math.abs(c.mois.surplus) >= 1 ? ' (' + signe2(c.mois.surplus) + ' par rapport aux ' + eur(c.salaire_ref) + ' de référence, ' + (c.mois.surplus > 0 ? 'en plus pour l’épargne' : 'en moins') + ')' : '') + '.'));
    else ep.append(note('Calculée avec ton salaire de référence (' + eur(c.salaire_ref) + ') ; elle s’ajuste quand la paie arrive.'));
    out.push(ep);

    // Postes du mois : objectif en % des revenus, barre, ce qui reste ; le trait = où on en est dans le mois
    const tempo = c.ecoules / c.nbJours;
    const lignePoste = (v) => {
      const ratio = v.objectif > 0 ? v.depense / v.objectif : v.depense > 0 ? 1.01 : 0;
      const coul = ratio > 1 ? 'var(--red)' : ratio > tempo + 0.15 ? 'var(--orange)' : TON[v.groupe];
      return ligne({ ic: v.ic, ton: ratio > 1 ? 'var(--red)' : TON[v.groupe], titre: v.nom, sous: pc(v.pct) + ' · ' + eur(v.objectif), apres: barre(ratio, coul, tempo),
        val: v.reste >= 0 ? eur(v.reste) : eur(v.reste), valSous: v.reste >= 0 ? 'restants' : 'dépassé', valCls: v.reste < 0 ? 'neg' : '', clic: () => voirPoste(v.id) });
    };
    const grp = (g) => c.variables.filter((v) => v.groupe === g);
    const sumObj = (g) => grp(g).reduce((s, v) => s + v.objectif, 0);
    out.push(section('Obligations', pc(sumObj('obligations') / c.revenus_ref) + ' · ' + eur(sumObj('obligations'))), liste(grp('obligations').map(lignePoste)));
    out.push(section('Plaisir', pc(sumObj('plaisir') / c.revenus_ref) + ' · ' + eur(sumObj('plaisir'))), liste(grp('plaisir').map(lignePoste)));

    // Enveloppes : mises de côté chaque mois, sans plafond
    out.push(section('Enveloppes', pc(P.pct.enveloppes) + ' · ' + eur(P.enveloppes) + '/mois'));
    out.push(liste(c.enveloppes.map((e) => ligne({ ic: e.ic, ton: TON.enveloppe, titre: e.nom,
      sous: e.par_mois > 0 ? pc(e.pct) + ' · ' + eur(e.par_mois) + '/mois' + (e.depense_mois > 0 ? ' · dépensé ' + eur(e.depense_mois) : '') : 'Se remplit avec les vraies dépenses',
      val: eur(e.de_cote), valSous: e.de_cote >= 0 ? 'de côté' : 'à rattraper', valCls: e.de_cote < 0 ? 'neg' : '', clic: () => voirPoste(e.id, '') }))));
    out.push(note('Chaque mois, la part de chaque enveloppe est mise de côté. Une dépense classée dans une enveloppe est prise dessus, pas sur le mois.'));

    // Charges fixes
    out.push(section('Charges fixes', pc(P.pct.fixes) + ' · ' + eur(P.fixes)));
    out.push(liste(c.fixes.map((f) => ligne({ ic: f.ic, ton: TON.fixe, titre: f.nom, sous: f.reste > 0 ? (f.jour ? 'Attendu vers le ' + f.jour : 'Attendu') : 'Passé', val: eur2(f.montant), clic: () => voirPoste(f.id) }))));
    $('v-mois').replaceChildren(...out);
  };

  // ========== Projections ==========
  const SCEN = [['conges', 'Congés sans solde'], ['baisse', 'Baisse de salaire'], ['pret', 'Prêt étudiant'], ['projet', 'Projet']];
  let scen = 'conges';
  const repProj = { conges: {}, baisse: {}, pret: {}, projet: {} };
  try { const s = JSON.parse(localStorage.getItem(KEY + '-proj') || 'null'); if (s) Object.assign(repProj, s); } catch (e) {}
  const QUESTIONS = {
    conges: [['jours', 'Combien de jours ?', 'jours'], ['mois', 'Quel mois ?', 'mois'], ['par_jour', 'Salaire perdu par jour', '€']],
    baisse: [['salaire', 'Nouveau salaire par mois', '€']],
    pret: [['montant', 'Montant emprunté', '€'], ['taux', 'Taux annuel', '%'], ['ans', 'Durée du remboursement', 'ans'], ['etudes', 'Durée des études', 'mois'], ['rev_etudes', 'Revenus par mois pendant les études', '€']],
    projet: [['montant', 'Combien coûte le projet ?', '€'], ['mois', 'Pour quand ?', 'mois'], ['deja', 'Déjà mis de côté', '€']]
  };
  const dessinerProj = () => {
    const c = C(), out = [];
    const seg = el('div', 'v-segment');
    SCEN.forEach(([k, t]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(scen === k)); b.onclick = () => { scen = k; dessinerProj(); }; seg.append(b); });
    out.push(seg);
    const r = M.projeter(scen, repProj[scen], c);
    const champs = liste(QUESTIONS[scen].map(([k, lib, unite]) => {
      const row = el('div', 'v-ligne'), t = el('div', 'v-txt'); t.append(el('b', '', lib));
      const inp = el('input', 'v-champ'); inp.setAttribute('aria-label', lib);
      if (unite === 'mois' && (k === 'mois')) { inp.type = 'month'; inp.style.width = '150px'; inp.value = repProj[scen][k] || ''; }
      else { inp.setAttribute('inputmode', 'decimal'); inp.placeholder = 'Je ne sais pas'; inp.value = repProj[scen][k] === undefined || repProj[scen][k] === '' ? '' : String(repProj[scen][k]).replace('.', ','); }
      inp.oninput = () => {
        const v = inp.type === 'month' ? inp.value : (inp.value.trim() === '' ? '' : nombre(inp.value));
        repProj[scen][k] = v === '' || (typeof v === 'number' && !isFinite(v)) ? '' : v;
        try { localStorage.setItem(KEY + '-proj', JSON.stringify(repProj)); } catch (e) {}
        dessinerResultat();
      };
      const u = el('span', 'v-gris', unite === 'mois' && k === 'mois' ? '' : unite); u.style.cssText = 'font-size:15px;min-width:28px';
      row.append(t, inp, u); return row;
    }), true);
    out.push(champs);
    const zone = el('div'); zone.id = 'v-proj-res'; out.push(zone);
    $('v-proj').replaceChildren(...out);
    dessinerResultat();
  };
  const dessinerResultat = () => {
    const c = C(), r = M.projeter(scen, repProj[scen], c), x = r.res, H = r.hyp, out = [];
    const hyps = [];
    const lh = (k, t) => { if (H[k]) hyps.push(t); };
    const carteGros = (lab, v, sous, cls) => { const k = el('div', 'v-carte'); k.append(el('div', 'v-gris', lab)); const g = el('div', 'v-gros', v); if (cls) g.className += ' ' + cls; k.append(g); if (sous) k.append(el('div', 'v-gris', sous)); return k; };
    if (scen === 'conges') {
      lh('jours', x.jours + ' jours'); lh('mois', 'en ' + x.mois_lib); lh('par_jour', eur(x.par_jour) + ' par jour (' + eur(c.salaire_ref) + ' ÷ 21,7 jours travaillés)');
      out.push(carteGros('À mettre de côté avant ' + x.mois_lib, eur(x.total), 'soit ' + eur(x.par_mois) + ' par mois pendant ' + x.n + ' mois'));
      out.push(liste([
        ligne({ titre: 'Ton épargne pendant ces mois', val: pc0(x.epargne_avant) + ' → ' + pc0(x.epargne_pendant), valCls: x.epargne_pendant < c.epargne_min ? 'orange' : '' }),
        ligne({ titre: 'Sans rien mettre de côté', sous: cap(x.mois_lib) + ' finirait à', val: eur(x.sans_rien), valCls: x.sans_rien < 0 ? 'neg' : '' }),
        ligne({ titre: 'Ta réserve tiendrait encore', val: c.epargne.reserve + ' mois' })
      ], true));
    } else if (scen === 'baisse') {
      lh('salaire', eur(x.salaire) + ' (20 % de moins)');
      out.push(carteGros('Ton épargne passerait de ' + pc0(x.avant_pct) + ' à', pc0(x.epargne_pct), eur(x.epargne) + ' par mois', x.epargne < 0 ? 'neg' : ''));
      const l = [ligne({ titre: 'Revenus du mois', val: eur(x.revenus) })];
      if (x.a_reduire > 0) {
        l.push(ligne({ titre: 'À réduire chaque mois', val: eur(x.a_reduire), valCls: 'neg' }));
        l.push(ligne({ titre: 'Soit sur tes postes plaisir', val: '−' + pc0(x.reduc_plaisir) }));
        if (x.reserve) l.push(ligne({ titre: 'Sans rien réduire, ta réserve tiendrait', val: x.reserve + ' mois' }));
      }
      if (x.reserve_sans_salaire) l.push(ligne({ titre: 'Sans aucun salaire, ta réserve tiendrait', val: x.reserve_sans_salaire + ' mois' }));
      out.push(liste(l, true));
    } else if (scen === 'pret') {
      lh('montant', eur(x.montant) + ' empruntés'); lh('taux', String(x.taux).replace('.', ',') + ' % par an (à remplacer par le taux de la banque)'); lh('ans', x.ans + ' ans de remboursement');
      lh('etudes', x.etudes + ' mois d’études'); lh('rev_etudes', eur(x.rev_etudes) + ' de revenus par mois pendant les études (aides de la famille)');
      out.push(carteGros('Mensualité après les études', eur(x.mensualite), pc(x.mens_pct) + ' de tes revenus actuels · coût du crédit ' + eur(x.cout)));
      out.push(liste([
        ligne({ titre: 'Besoin par mois pendant les études', sous: 'Dépenses du mois moins revenus', val: eur(Math.max(0, x.besoin)) }),
        ligne({ titre: 'Sur ' + x.etudes + ' mois d’études', val: eur(x.total_etudes) }),
        ligne({ titre: x.couvert >= 0 ? 'Le prêt couvre tout, il reste' : 'Il manquerait', val: eur(Math.abs(x.couvert)), valCls: x.couvert < 0 ? 'neg' : 'pos' }),
        ligne({ titre: 'Épargne après, avec ton salaire actuel', val: pc0(x.epargne_apres), valCls: x.epargne_apres < c.epargne_min ? 'orange' : '' })
      ], true));
    } else if (scen === 'projet') {
      lh('montant', eur(x.montant)); lh('mois', 'pour ' + x.mois_lib); lh('deja', 'rien de côté pour l’instant');
      out.push(carteGros('À mettre de côté chaque mois', eur(x.par_mois), pc(x.pct) + ' de tes revenus, pendant ' + x.n + ' mois'));
      out.push(liste([
        ligne({ titre: 'Ton épargne prévue', val: eur(c.plan.epargne) + ' /mois' }),
        ligne({ titre: x.epargne_reste >= 0 ? 'Il te resterait à épargner' : 'Il manquerait chaque mois', val: eur(Math.abs(x.epargne_reste)), valCls: x.epargne_reste < 0 ? 'neg' : '' })
      ], true));
    }
    if (hyps.length) { const p = el('p', 'v-note'); p.append(el('span', 'v-hyp', 'hypothèses'), ' ' + hyps.join(' · ') + '.'); out.unshift(p); out[0].style.margin = '-4px 4px 12px'; }
    out.push(note('Calculs à partir de ton budget actuel : ' + eur(c.plan.revenus) + ' de revenus, ' + eur(c.plan.depenses) + ' de dépenses par mois, ' + eur(c.plan.epargne) + ' d’épargne prévue.'));
    $('v-proj-res').replaceChildren(...out);
  };

  // ========== Dans la durée ==========
  const dessinerDuree = () => {
    const c = C(), E = c.epargne, out = [];
    $('v-duree-sous').textContent = c.exp ? 'Au ' + M.dateCourte(c.exp) : '';
    const k = el('div', 'v-carte'); k.append(el('div', 'v-gris', 'Épargne totale'), el('div', 'v-gros', eur(E.total)));
    const pa = el('span', 'v-pastille' + (c.plan.epargne < 0 ? ' o' : ''), (c.plan.epargne >= 0 ? '+' : '') + eur(c.plan.epargne) + ' prévus par mois'); pa.style.marginTop = '8px'; k.append(pa);
    out.push(k);
    const t = el('div', 'v-tuiles');
    const tuile = (ic, col, titre, v, sous) => { const d = el('div', 'v-tuile'), h = el('div', 't'); const s = dessin(ic, 15); s.style.color = col; h.append(s, titre); d.append(h, el('b', '', v), el('small', '', sous)); return d; };
    t.append(tuile('bouee', 'var(--green)', 'Réserve', String(E.reserve).replace('.', ',') + ' mois', 'de dépenses (livrets)'),
      tuile('cible', 'var(--blue)', 'Objectif', '3 mois', E.reserve >= 3 ? 'atteint' : 'manque ' + eur(Math.max(0, 3 * c.plan.depenses - (E.livrets || 0)))));
    out.push(t);
    out.push(section('Comptes'));
    const ed = (id, nom) => () => saisir(nom, 'Valeur aujourd’hui. Ensuite, l’appli suit seule les virements vus sur ton compte courant.', [{ lib: 'Valeur (€)', valeur: E[id] }], ([v]) => {
      if (!(v >= 0)) return 'Tape un montant positif.';
      modifie({ epargne: Object.assign({}, bundle.epargne, { [id]: { valeur: v, date: c.exp || new Date().toISOString().slice(0, 10) } }) }, nom + ' mis à jour.');
    });
    out.push(liste([
      ligne({ ic: 'banque', ton: 'var(--green)', titre: 'Livrets (A et LDD)', sous: 'Saisis le ' + (E.livrets_date ? M.dateCourte(E.livrets_date) : '?') + ', suivis avec les virements', val: eur(E.livrets || 0), chev: true, clic: ed('livrets', 'Livrets') }),
      ligne({ ic: 'hausse', ton: 'var(--indigo)', titre: 'PEA Trade Republic', sous: 'Valeur du ' + (E.pea_date ? M.dateCourte(E.pea_date) : '?') + ' plus les versements', val: eur(E.pea || 0), chev: true, clic: ed('pea', 'PEA') })
    ]));
    if (c.credit) {
      const cr = c.credit;
      out.push(section('Crédit voiture'));
      out.push(liste([ligne({ ic: 'voiture', ton: 'var(--red)', titre: cr.nom, sous: cr.restantes + ' mensualités de ' + eur2(cr.mensualite) + ' · fin ' + cr.fin, apres: barre(cr.payees / cr.nb, 'var(--green)'), val: '−' + eur(cr.reste), valCls: 'neg' })]));
    }
    $('v-duree').replaceChildren(...out);
  };

  // ========== Opérations ==========
  const filtre = { poste: '', mois: null, aClasser: false, limite: 150 };
  $('v-q').addEventListener('input', () => { filtre.limite = 150; dessinerOps(); });
  const dessinerOps = () => {
    const c = C(); if (filtre.mois === null) filtre.mois = c.mc;
    const prec = M.moisDecale(c.mc, -1);
    const f = el('div');
    const seg = el('div', 'v-segment trois');
    [['Ce mois-ci', c.mc], ['Mois dernier', prec], ['Tout', '']].forEach(([t, m]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(filtre.mois === m && !filtre.aClasser)); b.onclick = () => { Object.assign(filtre, { mois: m, aClasser: false, limite: 150 }); dessinerOps(); }; seg.append(b); });
    f.append(seg);
    const puces = el('div', 'v-filtres');
    if (filtre.poste) { const b = el('button', 'v-puce on'); b.type = 'button'; b.append(posteDe(filtre.poste).nom, dessin('croix', 14)); b.onclick = () => { filtre.poste = ''; dessinerOps(); }; puces.append(b); }
    if (c.nc) { const b = el('button', 'v-puce' + (filtre.aClasser ? ' on' : ''), 'À classer (' + c.nc + ')'); b.type = 'button'; b.onclick = () => { filtre.aClasser = !filtre.aClasser; if (filtre.aClasser) filtre.mois = ''; dessinerOps(); }; puces.append(b); }
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
      grp.append(ligne({ ic: p.ic, ton: o.poste === 'non_classe' ? 'var(--gray)' : tonDe(p), titre: M.nomLisible(o.libelle), sous: o.poste === 'non_classe' ? 'À classer' : p.nom, sousCls: o.poste === 'non_classe' ? 'badge' : '',
        val: signe2(o.montant), valCls: o.montant > 0 ? 'pos' : '', clic: () => reclasserOp(o) }));
    });
    if (l.length > filtre.limite) { const b = el('button', 'app-btn v-plus', 'Voir plus'); b.type = 'button'; b.onclick = () => { filtre.limite += 150; dessinerOps(); }; out.push(b); }
    $('v-ops').replaceChildren(...out);
  };

  // ========== Réglages ==========
  const dessinerReglages = () => {
    const c = C(), P = c.plan, R = bundle.reglages, out = [];
    const k = el('div', 'v-carte'); k.append(el('div', 'v-gris', 'Un mois normal · ' + eur(P.revenus)));
    const pile = el('div', 'v-pile'); pile.style.height = '12px'; pile.style.marginTop = '8px';
    [[P.fixes, 'var(--gray)'], [P.obligations_var, 'var(--blue)'], [P.plaisir_var, 'var(--indigo)'], [P.enveloppes, 'var(--orange)'], [Math.max(0, P.epargne), 'var(--green)']].forEach(([v, col]) => { const i = el('i'); i.style.flex = String(v); i.style.background = col; pile.append(i); });
    const lg = el('div', 'v-gris'); lg.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:13px';
    [['Fixes', P.pct.fixes], ['Obligations', P.pct.obligations_var], ['Plaisir', P.pct.plaisir_var], ['Enveloppes', P.pct.enveloppes], ['Épargne', P.pct.epargne]].forEach(([n, v]) => lg.append(el('span', '', n + ' ' + pc0(v))));
    k.append(pile, lg); out.push(k);

    out.push(liste([
      ligne({ ic: 'billet', ton: 'var(--green)', titre: 'Salaire de référence', sous: 'Ce qui dépasse part en épargne', val: eur(R.salaire_ref), chev: true,
        clic: () => saisir('Salaire de référence', 'Le budget est calculé sur ce montant. Un mois mieux payé ajoute la différence à l’épargne.', [{ lib: 'Salaire par mois (€)', valeur: R.salaire_ref }], ([v]) => { if (!(v > 0)) return 'Tape un montant positif.'; reglage('salaire_ref', v, 'Salaire de référence : ' + eur(v) + '.'); }) }),
      ...(R.aides || []).map((a, i) => ligne({ ic: 'maison', ton: 'var(--green)', titre: a.nom, val: eur(a.montant), chev: true,
        clic: () => saisir(a.nom, 'Montant reçu chaque mois. Mets 0 si ça s’arrête.', [{ lib: 'Montant par mois (€)', valeur: a.montant }], ([v]) => { if (!(v >= 0)) return 'Tape un montant positif ou 0.'; reglage('aides', R.aides.map((x, j) => (j === i ? Object.assign({}, x, { montant: v }) : x)), a.nom + ' : ' + eur(v) + '.'); }) })),
      ligne({ ic: 'calendrier', ton: 'var(--gray)', titre: 'Début du mois', val: 'le ' + c.j0, chev: true,
        clic: () => saisir('Début du mois', 'Jour où arrive la paie : le mois du budget va de ce jour au jour d’avant, le mois suivant.', [{ lib: 'Jour (1 à 28)', valeur: c.j0 }], ([v]) => { if (!(v >= 1 && v <= 28 && Number.isInteger(v))) return 'Tape un jour entre 1 et 28.'; reglage('jour_debut', v, 'Le mois commence le ' + v + '.'); }) })
    ]));

    out.push(liste([
      ligne({ ic: 'pct', ton: 'var(--blue)', titre: 'Objectifs par poste', sous: 'Moyenne glissante depuis ' + (c.objectifs_depuis ? M.moisLabel(c.objectifs_depuis) : 'le début'), chev: true, clic: () => pousser({ titre: 'Objectifs', corps: corpsObjectifs }) }),
      ligne({ ic: 'cadeau', ton: 'var(--orange)', titre: 'Enveloppes', val: pc(P.pct.enveloppes), chev: true, clic: () => pousser({ titre: 'Enveloppes', corps: corpsEnveloppes }) }),
      ligne({ ic: 'maison', ton: 'var(--gray)', titre: 'Charges fixes', val: eur(P.fixes), chev: true, clic: () => pousser({ titre: 'Charges fixes', corps: corpsFixes }) }),
      ligne({ ic: 'cible', ton: 'var(--green)', titre: 'Épargne', sous: 'Minimum ' + pc0(c.epargne_min) + ' · objectif ' + pc0(c.epargne_obj), chev: true,
        clic: () => saisir('Épargne', 'En % de tes revenus de référence.', [{ lib: 'Minimum (%)', valeur: Math.round(c.epargne_min * 100) }, { lib: 'Objectif (%)', valeur: Math.round(c.epargne_obj * 100) }], ([a, b]) => {
          if (!(a >= 0 && b >= a && b <= 100)) return 'Le minimum doit être entre 0 et l’objectif.';
          modifie({ reglages: Object.assign({}, R, { epargne_min: a / 100, epargne_obj: b / 100 }) }, 'Épargne : minimum ' + a + ' %, objectif ' + b + ' %.');
        }) }),
      ligne({ ic: 'bouee', ton: 'var(--red)', titre: 'Minimum sur le compte', val: eur(c.compte_min), chev: true,
        clic: () => saisir('Minimum sur le compte', 'Ce qu’il faut garder sur le compte courant avant le loyer du 1er.', [{ lib: 'Montant (€)', valeur: c.compte_min }], ([v]) => { if (!(v >= 0)) return 'Tape un montant positif.'; reglage('compte_min', v, 'Minimum : ' + eur(v) + '.'); }) })
    ]));

    const cr = bundle.credit;
    out.push(liste([
      ligne({ ic: 'voiture', ton: 'var(--red)', titre: 'Crédit voiture', sous: cr ? cr.nb + ' mensualités de ' + eur2(cr.mensualite) + ' depuis ' + M.moisLabel(cr.premiere) : 'Aucun', chev: true,
        clic: () => saisir('Crédit voiture', 'Mensualité, nombre total de mensualités et mois de la première.', [{ lib: 'Mensualité (€)', valeur: cr ? cr.mensualite : '' }, { lib: 'Nombre de mensualités', valeur: cr ? cr.nb : '' }, { lib: 'Première mensualité', type: 'mois', valeur: cr ? cr.premiere : '' }], ([m, n, p]) => {
          if (!(m > 0 && n > 0 && Number.isInteger(n) && /^\d{4}-\d\d$/.test(p))) return 'Remplis les trois champs.';
          modifie({ credit: Object.assign({ nom: 'Voiture', poste: 'credit_voiture' }, cr || {}, { mensualite: m, nb: n, premiere: p }) }, 'Crédit mis à jour.');
        }) }),
      ligne({ ic: 'etiquette', ton: 'var(--orange)', titre: 'Règles de classement', val: String((bundle.regles_perso || []).length + (bundle.regles || []).length), chev: true, clic: () => pousser({ titre: 'Règles', corps: corpsRegles }) })
    ]));

    out.push(liste([
      ligne({ ic: 'disque', ton: 'var(--blue)', titre: 'Sauvegarde', sous: bundle.sauvegarde_le ? 'Dernière le ' + new Date(bundle.sauvegarde_le).toLocaleDateString('fr-FR') : 'Jamais faite', chev: true, clic: sauvegarder }),
      ligne({ ic: 'import', ton: 'var(--gray)', titre: 'Importer', sous: 'Export Boursobank (.zip ou .csv) ou sauvegarde', chev: true, clic: () => $('app-file').click() })
    ]));
    out.push(note('Toutes tes données restent sur ce téléphone. Pense à sauvegarder après chaque import.'));
    $('v-reglages').replaceChildren(...out);
  };
  const corpsObjectifs = () => {
    const c = C(), out = [note('Chaque objectif est la moyenne de tes dépenses sur les mois terminés (12 au plus), depuis ' + (c.objectifs_depuis ? M.moisLabel(c.objectifs_depuis) : 'le début') + '. Il bouge chaque mois avec tes vraies dépenses.')];
    ['obligations', 'plaisir'].forEach((g) => {
      out.push(section(g === 'obligations' ? 'Obligations' : 'Plaisir'));
      out.push(liste(c.variables.filter((v) => v.groupe === g).map((v) => ligne({ ic: v.ic, ton: TON[g], titre: v.nom, sous: v.mois_objectif.length ? 'Moyenne de ' + v.mois_objectif.length + ' mois, depuis ' + M.moisLabel(v.mois_objectif[0]) : v.depart ? 'Montant de départ, jusqu’au premier mois terminé' : 'Pas encore de mois terminé', val: pc(v.pct), valSous: eur(v.objectif) }))));
    });
    return out;
  };
  const corpsEnveloppes = () => {
    const c = C(), out = [note('Dépenses rares, sans plafond. La part du mois est la moyenne de ce que tu as vraiment dépensé sur les 12 derniers mois.')];
    out.push(liste(c.enveloppes.map((e) => ligne({ ic: e.ic, ton: TON.enveloppe, titre: e.nom, sous: e.mois_objectif.length ? 'Moyenne de ' + e.mois_objectif.length + ' mois' : 'Pas encore de dépense', val: pc(e.pct), valSous: eur(e.par_mois) + '/mois', clic: () => voirPoste(e.id, '') }))));
    return out;
  };
  const corpsFixes = () => {
    const out = [note('Montants de tes contrats actuels. Touche pour changer un montant.')];
    out.push(liste((bundle.fixes || []).map((f, i) => ligne({ ic: f.ic, ton: TON.fixe, titre: f.nom, val: eur2(f.montant), chev: true,
      clic: () => saisir(f.nom, 'Montant par mois.', [{ lib: 'Montant (€)', valeur: f.montant }], ([v]) => { if (!(v >= 0)) return 'Tape un montant positif ou 0.'; modifie({ fixes: bundle.fixes.map((x, j) => (j === i ? Object.assign({}, x, { montant: v }) : x)) }, f.nom + ' : ' + eur2(v) + '.'); if (page) dessinerPage(); }) }))));
    return out;
  };
  const corpsRegles = () => {
    const l = bundle.regles_perso || [], out = [];
    out.push(section('Marchands mémorisés'));
    if (!l.length) out.push(note('Aucun pour l’instant. Coche « Toujours classer ce marchand ici » en changeant le poste d’une opération.'));
    else out.push(liste(l.map((p, i) => ligne({ titre: p.marchand, sous: posteDe(p.poste).nom, val: 'Retirer', valCls: 'neg', clic: () => { modifie({ regles_perso: l.filter((x, j) => j !== i) }, 'Règle « ' + p.marchand + ' » retirée.'); dessinerPage(); } })), true));
    out.push(note((bundle.regles || []).length + ' règles de départ (salaire, loyer, virements, abonnements…) classent aussi tes opérations.'));
    return out;
  };

  // ---------- Tout redessiner ----------
  const dessiner = () => {
    if (!calc) return;
    dessinerMois(); dessinerProj(); dessinerDuree(); dessinerOps(); dessinerReglages(); if (page) dessinerPage(); majHaut();
  };

  if (bundle) {
    $('racine').hidden = false;
    montrer(location.hash.slice(1));
    dessiner(); rappel();
  } else $('app-vide').hidden = false;

  window.App = { bundle: () => bundle, calc: () => calc };
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol === 'https:') window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
