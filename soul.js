/* soul: shared renderer for every page (soul and soul-it use the same file).
   The .txt files and the data inside the archive pages keep their plain format;
   this script turns them into the page layout. */
(function () {
  const root = document.documentElement;
  const LANG = root.lang === 'it' ? 'it' : 'en';

  // theme: remembered per browser, follows the system otherwise
  try { const t = localStorage.getItem('soul-theme'); if (t) root.setAttribute('data-theme', t); } catch (e) {}

  const I = {
    en: {
      tips: { refl: 'has a reflection', mine: 'written by me', fav: 'one of my favorites' },
      legend: { refl: 'with reflection', mine: 'written by me', fav: 'my favorites' },
      types: { bible: 'bible verse', prayers: 'prayer', commonplace: 'commonplace', saints: 'saint', 'what-is-it': 'what is it', guides: 'guide' },
      nav: { 'index.html': 'index', 'archive.html': 'archive', 'saints.html': 'saints' },
      reflection: 'reflection', alsoIn: /^→ also in/, alsoLabel: 'also in', verses: 'verses', verse: 'verse', prayers: 'prayers',
      footer: 'soul · digital devotional journal', loading: 'loading…', error: 'error loading file.',
      book: 'book…', topic: 'topic…', all: 'show everything', allTopics: 'all topics', top: '↑ top', whatIs: 'what is it',
      mineBtn: 'written by me', favBtn: 'favorites', none: 'nothing here yet',
      subVerses: /-verses$/, subPrayers: /-prayers$/,
      mineLine: /^↳ written by me\s*$/, favLine: /^↳ one of my favorites\s*$/,
      other: 'en', otherLang: 'it'
    },
    it: {
      tips: { refl: 'ha una riflessione', mine: 'scritta da me', fav: 'una delle mie preferite' },
      legend: { refl: 'con riflessione', mine: 'scritte da me', fav: 'le mie preferite' },
      types: { bible: 'versetto', prayers: 'preghiera', commonplace: 'citazione', saints: 'santo', 'what-is-it': "cos'è", guides: 'guida' },
      nav: { 'index.html': 'indice', 'archive.html': 'archivio', 'saints.html': 'santi' },
      reflection: 'riflessione', alsoIn: /^→ presente anche in/, alsoLabel: 'presente anche in', verses: 'versetti', verse: 'versetto', prayers: 'preghiere',
      footer: 'soul · diario devozionale digitale', loading: 'caricamento…', error: 'errore nel caricamento del file.',
      book: 'libro…', topic: 'argomento…', all: 'mostra tutto', allTopics: 'tutti gli argomenti', top: '↑ inizio', whatIs: "cos'è",
      mineBtn: 'scritte da me', favBtn: 'preferite', none: 'ancora niente qui',
      subVerses: /-versetti$/, subPrayers: /-preghiere$/,
      mineLine: /^↳ scritta da me\s*$/, favLine: /^↳ una delle mie preferite\s*$/,
      other: 'it', otherLang: 'en'
    }
  }[LANG];

  const PAL = { bible: 'tea', prayers: 'plum', commonplace: 'fog', saints: 'night', 'what-is-it': 'rods', guides: 'dawn' };
  const SYM = { refl: '¶', mine: '✎', fav: '☆' };

  // ---------- small helpers ----------
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sym = k => `<span class="sym" tabindex="0" data-tip="${I.tips[k]}">${SYM[k]}</span>`;
  const legend = keys => `<div class="legend">${keys.map(k => sym(k) + ' ' + I.legend[k]).join('')}</div>`;
  const links = s => s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => `<a href="${u}">${t}</a>`);
  // trailing markers after a title: " *" reflection, " ✎" mine, " ☆" favorite
  const marks = s => s
    .replace(/(?<=\S) \*(?=\s|$|<|\)|\|)/g, ' ' + sym('refl'))
    .replace(/(?<=\S) ✎(?=\s|$|<|\)|\|)/g, ' ' + sym('mine'))
    .replace(/(?<=\S) ☆(?=\s|$|<|\)|\|)/g, ' ' + sym('fav'));

  let markOpen = false;
  function inline(line) {
    let p = esc(line).replace(/\[(\d+)\]\s?/g, '<span class="num" id="v$1">$1</span> ');
    const seg = p.split('!!'); p = seg[0];
    for (let i = 1; i < seg.length; i++) { p += (markOpen ? '</mark>' : '<mark>') + seg[i]; markOpen = !markOpen; }
    return marks(links(p));
  }
  const closeMark = h => markOpen ? h + '</mark>' : h;

  // hanging indents: bullets, ⭢ sub-points, indented continuation lines, numbered items
  function hang(s) {
    return s
      .replace(/^[ \t]*\* (.*)(\n|$)/gm, '<span class="hg b">* $1</span>')
      .replace(/^[ \t]*⭢ (.*)(\n|$)/gm, '<span class="hg s">⭢ $1</span>')
      .replace(/^[ \t]{5,}(?![*⭢↳])(\S.*)(\n|$)/gm, '<span class="hg c">$1</span>')
      .replace(/^(\d+\.)( +)((?:(?!<div|<details).)*)(\n|$)/gm, (m, n, sp, r) => `<span class="hg n" style="--w:${n.length + sp.length}ch">${n}${sp}${r}</span>`);
  }

  function banner(label, pal) { return `<div class="banner p-${pal}"><span class="tag">${esc(label)}</span></div>`; }
  function navHTML(items) { return `<nav class="nav">${items.join('')}</nav>`; }
  const chip = (href, label) => `<a class="chip" href="${href}">${esc(label)}</a>`;
  const langChip = (href, label) => `<a class="chip ghost" href="${href}">${esc(label)}</a>`;

  // ---------- page finishing: theme toggle, symbol labels on tap, hash jump ----------
  function finish(card, opts) {
    opts = opts || {};
    if (!opts.noFooter) card.insertAdjacentHTML('beforeend', `<div class="footer">${I.footer}</div>`);
    const tt = document.createElement('button');
    tt.className = 'theme-toggle'; tt.type = 'button'; tt.setAttribute('aria-label', 'theme');
    card.prepend(tt);
    const cur = () => root.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const paint = () => { tt.textContent = cur() === 'dark' ? '☀' : '☾'; };
    paint();
    tt.onclick = () => {
      const n = cur() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', n); paint();
      try { localStorage.setItem('soul-theme', n); } catch (e) {}
    };
    bindSyms(card);
  }
  function bindSyms(scope) {
    scope.querySelectorAll('.sym').forEach(el => {
      if (el.dataset.bound) return; el.dataset.bound = '1';
      el.addEventListener('click', e => {
        e.preventDefault(); e.stopPropagation();
        const on = !el.classList.contains('show');
        document.querySelectorAll('.sym.show').forEach(x => x.classList.remove('show'));
        if (on) el.classList.add('show');
      });
    });
  }
  document.addEventListener('click', () => document.querySelectorAll('.sym.show').forEach(x => x.classList.remove('show')));
  function jumpToHash() {
    if (!location.hash) return;
    const t = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (t) t.scrollIntoView();
  }

  // ---------- post.html: one .txt file ----------
  function renderPost(text, path) {
    markOpen = false;
    const type = path.split('/')[0];
    const isVP = type === 'bible' || type === 'prayers';
    const L = text.replace(/\r/g, '').replace(/\n+$/, '').split('\n');
    const first = L.shift();
    let kind = '', title = first;
    const cut = first.indexOf(' | ');
    if (cut >= 0) { kind = first.slice(0, cut); title = first.slice(cut + 3); }
    if (type === 'what-is-it') [kind, title] = [title, kind];

    // back-links and the language line become chips
    const nav = [];
    while (L.length) {
      const l = L[0];
      if (!l.trim()) { L.shift(); continue; }
      let m;
      if (/^↳ .*\/\//.test(l) && (m = l.match(/\[(en|it)\]\(([^)]+)\)/))) { nav.push(langChip(m[2], m[1])); L.shift(); continue; }
      if ((m = l.match(/^↳ \[([^\]]+)\]\(([^)]+)\)\s*$/)) && /\.html(#.*)?$/.test(m[2]) && !/post\.html/.test(m[2])) {
        nav.push(chip(m[2], I.nav[m[2]] || m[1].replace(/^(back to|torna (all'|al |ai |alla |agli )?)\s*/, ''))); L.shift(); continue;
      }
      break;
    }
    const langIdx = nav.findIndex(n => n.includes('chip ghost'));
    if (langIdx >= 0) nav.push(nav.splice(langIdx, 1)[0]);

    // split into body / parallels / reflection / footer lines
    let body = [], par = [], more = [], refl = [], meta = [], next = '', mode = 'body', rc = 0, moreLabel = '';
    for (const l of L) {
      if (/^> /.test(l)) { next = l; continue; }
      if (isVP) {
        if (l === '---') { rc++; mode = rc === 1 ? 'refl' : 'meta'; continue; }
        if (I.alsoIn.test(l) || /^→ (also in|presente anche in)/.test(l)) { mode = 'par'; continue; }
        // "+ label" opens the rest of a long passage, collapsible; its ~ lines are section labels, not footer
        if (/^\+ /.test(l)) { moreLabel = l.slice(2); mode = 'more'; continue; }
        if (l.startsWith('~ ')) {
          if (mode === 'refl' || (mode === 'more' && !l.startsWith('~ ↳'))) ({ refl, more })[mode].push(l);
          else { mode = 'meta'; meta.push(l.slice(2)); }
          continue;
        }
        ({ body, par, more, refl, meta })[mode].push(l);
      } else body.push(l);
    }
    if (!isVP) {
      // the trailing run of ~ lines (and the --- before it) is the footer
      let k = body.length;
      while (k > 0 && (!body[k - 1].trim() || body[k - 1].startsWith('~ ') || body[k - 1] === '---')) k--;
      meta = body.slice(k).filter(l => l !== '---').map(l => l.startsWith('~ ') ? l.slice(2) : l);
      body = body.slice(0, k);
    }
    const trim = a => { while (a.length && !a[0].trim()) a.shift(); while (a.length && !a[a.length - 1].trim()) a.pop(); return a; };
    trim(body); trim(par); trim(more); trim(refl); trim(meta);

    const versesOnly = refl.length > 0 && refl.every(l => !l.trim() || l.startsWith('\\'));
    const hasRefl = isVP && refl.length > 0 && !versesOnly;
    const mine = meta.some(l => I.mineLine.test(l)), fav = meta.some(l => I.favLine.test(l));
    const sy = (hasRefl ? sym('refl') : '') + (mine ? sym('mine') : '') + (fav ? sym('fav') : '');

    let refLabel = kind || I.types[type] || '';
    if (type === 'prayers' && kind) refLabel = I.types.prayers + ' · ' + kind;
    let html = banner(I.types[type] || type, PAL[type] || 'tea') + navHTML(nav);
    html += `<div class="ref">${esc(refLabel)}</div><h1 class="title">${esc(title)}${sy ? ' ' + sy : ''}</h1>`;

    // body
    let out = '', q = null, buf = [];
    const flushQ = () => { if (q) { out += `<div class="quote">${hang(closeMark(q.join('\n')))}</div>`; q = null; } };
    const flushB = () => { if (buf.length) { out += `<div class="text">${hang(closeMark(buf.join('\n')))}</div>`; buf = []; } };
    const flush = () => { flushB(); flushQ(); };
    for (const l of body) {
      if (l === '---') { flush(); out += '<hr class="div">'; continue; }
      if (/^\s+→ /.test(l)) { flush(); out += `<h4 class="gs">${inline(l.trim().slice(2))}</h4>`; continue; }
      if (/^→ /.test(l)) { flush(); out += `<h3 class="gh">${inline(l.slice(2))}</h3>`; continue; }
      if (/^↳ [^\[\]]+$/.test(l)) { flush(); out += `<h3 class="gh">${inline(l.slice(2))}</h3>`; continue; }
      const gm = l.match(/^\s+↳ \[([^\]]+)\]\(([^)]+)\)((?: [*✎☆])*)\s*(?:— (.*))?$/);
      if (gm) { flush(); out += `<div class="lrow"><span class="ltitle"><a href="${gm[2]}">${esc(gm[1])}</a>${marks(gm[3] || '')}${gm[4] ? `<span class="ldesc">${inline(gm[4])}</span>` : ''}</span></div>`; continue; }
      if (l.startsWith('\\ ') || l === '\\') { flushB(); if (!q) q = []; q.push(inline(l.slice(2)) || ' '); continue; }
      flushQ();
      if (l.startsWith('~ ')) { buf.push(`<span class="muted">${inline(l.slice(2))}</span>`); continue; }
      buf.push(inline(l));
    }
    flush(); html += out;

    // the rest of a long passage, collapsible
    if (more.length) {
      markOpen = false;
      let p = `<details class="parallel more"><summary>${inline(moreLabel)}</summary>`, b = [];
      const fl = () => { if (b.length) { p += `<div class="text">${hang(closeMark(b.join('\n')))}</div>`; b = []; } };
      for (const l of more) { if (l.startsWith('~ ')) { fl(); p += `<span class="pref">${inline(l.slice(2))}</span>`; } else if (l.trim()) b.push(inline(l)); else if (b.length) b.push(''); }
      fl(); html += p + '</details>';
    }

    // gospel parallels, collapsible
    if (par.length) {
      markOpen = false;
      const isRef = l => /^[1-3]?\s?[A-ZÀ-Ý][\wà-ÿ' ]* \d+:\d/.test(l.trim()) && !/[.!?,;]$/.test(l.trim()) && l.trim().length < 40;
      const refs = par.filter(isRef).map(l => l.trim());
      let p = `<details class="parallel"><summary>${I.alsoLabel} ${refs.map(esc).join(' · ')}</summary>`, b = [];
      const fl = () => { if (b.length) { p += `<div class="text">${hang(closeMark(b.join('\n')))}</div>`; b = []; } };
      for (const l of par) { if (isRef(l)) { fl(); p += `<span class="pref">${esc(l.trim())}</span>`; } else if (l.trim()) b.push(inline(l)); else if (b.length) b.push(''); }
      fl(); html += p + '</details>';
    }

    // reflection, or the verses of the daily prayers (collapsible, no label)
    if (refl.length && versesOnly) {
      markOpen = false;
      const refs = []; let p = '', qq = [];
      const fl = () => { if (qq.length) { p += `<div class="text">${qq.join('\n')}</div>`; qq = []; } };
      for (const l of refl) {
        const t = l.replace(/^\\ ?/, '');
        const m = t.match(/^— \[([^\]]+)\]/);
        if (m) { refs.push(m[1]); fl(); p += `<span class="pref">${inline(t.slice(2))}</span>`; continue; }
        if (!t.trim()) { fl(); continue; }
        qq.push(inline(t));
      }
      fl();
      html += `<details class="parallel"><summary>${refs.length > 1 ? I.verses : I.verse} · ${refs.map(esc).join(' · ')}</summary>${p}</details>`;
    } else if (refl.length) {
      markOpen = false;
      let rq = null, rb = [], r = '';
      const fq = () => { if (rq) { r += `<div class="quote">${closeMark(rq.join('\n'))}</div>`; rq = null; } };
      const fb = () => { if (rb.length) { r += `<div class="text">${hang(closeMark(rb.join('\n')))}</div>`; rb = []; } };
      for (const l of refl) {
        if (l.startsWith('\\ ') || l === '\\') { fb(); if (!rq) rq = []; rq.push(inline(l.slice(2)) || ' '); continue; }
        fq();
        if (l.startsWith('~ ')) { rb.push(`<span class="muted">${inline(l.slice(2))}</span>`); continue; }
        rb.push(inline(l));
      }
      fb(); fq();
      html += `<div class="reflection"><div class="label">${I.reflection}</div>${r}</div>`;
    }

    // footer lines: ↳ heads (without the trailing ">"), entries below
    if (meta.length) {
      let m = '<div class="meta">', open = false;
      for (const l of meta) {
        if (!l.trim()) { if (open) { m += '</div>'; open = false; } continue; }
        if (!open) { m += '<div class="group">'; open = true; }
        if (I.mineLine.test(l) || I.favLine.test(l)) { m += `<span class="row">${sym(I.mineLine.test(l) ? 'mine' : 'fav')} ${esc(l.slice(2))}</span>`; continue; }
        let t = marks(links(esc(l)));
        if (l.startsWith('↳ ')) t = `<span class="ghead">${t.replace(/ &gt;$/, '').replace(/ &gt; /, ': ')}</span>`;
        m += `<span class="row">${t}</span>`;
      }
      if (open) m += '</div>';
      html += m + '</div>';
    }

    if (next) {
      const m = next.match(/^> (\S+) \[([^\]]+)\]\(([^)]+)\)\s*(.*)$/);
      if (m) html += `<div class="next"><a href="${m[3]}">${esc(`${m[1]} ${m[2]} ${m[4]}`.trim())}</a></div>`;
    }
    return { html, title };
  }

  function post() {
    const card = document.getElementById('card');
    const file = new URLSearchParams(location.search).get('p');
    if (!file) { card.innerHTML = `<div class="loading">${I.error}</div>`; finish(card); return; }
    card.innerHTML = `<div class="loading">${I.loading}</div>`;
    fetch(file).then(r => { if (!r.ok) throw new Error(); return r.text(); }).then(text => {
      const r = renderPost(text, file);
      card.innerHTML = r.html;
      document.title = r.title + ' · soul';
      finish(card);
      // the content is fetched, so the browser's own hash jump fires too early
      jumpToHash();
    }).catch(() => { card.innerHTML = `<div class="loading">${I.error}</div>`; finish(card); });
  }

  // ---------- archive data (the hidden <pre id="data">) ----------
  function dataLines() {
    const d = document.getElementById('data');
    return d ? d.innerHTML.split('\n') : [];
  }
  function parseRow(line) {
    // "↳ <a href="post.html?p=...">ref or title</a> rest" → {href, a, rest, marks}
    const tmp = document.createElement('div');
    tmp.innerHTML = line.replace(/^(<span id="[^"]*"><\/span>)?↳ ?/, '');
    const as = [...tmp.querySelectorAll('a')];
    const target = as.find(a => /post\.html\?p=|\.html$/.test(a.getAttribute('href')) && !/^archive\.html/.test(a.getAttribute('href'))) || as[0];
    if (!target) return null;
    const href = target.getAttribute('href'), a = target.textContent.trim();
    const other = as.filter(x => x !== target);
    other.forEach(x => x.replaceWith('\u0001' + x.textContent + '\u0002'));
    target.replaceWith('\u0000');
    const rest = tmp.textContent;
    const mk = { refl: /\s\*(\s|$|\|)/.test(rest + ' '), mine: /\s✎/.test(rest), fav: /\s☆/.test(rest) };
    return { href, a, rest, mk, others: other.map(x => ({ href: x.getAttribute('href'), text: x.textContent })) };
  }
  const markSyms = mk => (mk.refl ? ' ' + sym('refl') : '') + (mk.mine ? ' ' + sym('mine') : '') + (mk.fav ? ' ' + sym('fav') : '');
  const cleanTitle = s => s.replace(/\u0001[^\u0002]*\u0002/g, '').replace(/\u0000/g, '').replace(/\s[*✎☆](?=\s|$|\|)/g, '').replace(/\s*\|\s*$/, '').replace(/^\s*\|\s*/, '').trim();

  function parseArchive() {
    const secs = []; let cur = null, sub = null;
    for (const l of dataLines()) {
      const sm = l.match(/^<span id="([^"]+)"><\/span>/);
      if (sm && cur && (I.subVerses.test(sm[1]) || I.subPrayers.test(sm[1]))) { sub = { id: sm[1], name: I.subVerses.test(sm[1]) ? I.verses : I.prayers, rows: [] }; cur.groups.push(sub); continue; }
      const m = l.match(/^<span id="([^"]+)"><\/span>([^<]+)(.*)$/);
      if (m) {
        const name = m[2].trim();
        const wi = m[3].match(/href="([^"]+)"/);
        cur = { id: m[1], name, type: wi ? 'book' : 'topic', what: wi ? wi[1] : '', groups: [] };
        if (cur.type === 'book') { sub = { id: '', name: '', rows: [] }; cur.groups.push(sub); }
        secs.push(cur); continue;
      }
      if (/^↳ <a/.test(l) && sub) {
        const r = parseRow(l); if (!r) continue;
        const isPrayer = /p=prayers\//.test(r.href);
        sub.rows.push({ href: r.href, ref: isPrayer ? '' : r.a, title: isPrayer ? r.a : cleanTitle(r.rest), mk: r.mk });
      }
    }
    return secs;
  }
  const rowHTML = r => `<div class="lrow">${r.ref ? `<span class="lref">${esc(r.ref)}</span>` : ''}<span class="ltitle"><a href="${r.href}">${esc(r.title)}</a>${markSyms(r.mk)}</span>${r.tag || ''}</div>`;
  const total = s => s.groups.reduce((a, g) => a + g.rows.length, 0);

  function archive() {
    const card = document.getElementById('card');
    const secs = parseArchive();
    const books = secs.filter(s => s.type === 'book'), topics = secs.filter(s => s.type === 'topic').sort((a, b) => a.name.localeCompare(b.name));
    const head = card.innerHTML; // banner, nav, title and note are static in archive.html
    card.innerHTML = head + `<div class="filters"><select id="selBook" aria-label="${I.book}"><option value="">${I.book}</option>${books.map(b => `<option value="${b.id}">${esc(b.name)} (${total(b)})</option>`).join('')}</select>` +
      `<select id="selTopic" aria-label="${I.topic}"><option value="">${I.topic}</option>${topics.map(b => `<option value="${b.id}">${esc(b.name)} (${total(b)})</option>`).join('')}</select>` +
      `<button class="toggle" id="showAll" type="button">${I.all}</button></div>` + legend(['refl', 'mine'].concat(secs.some(x => x.groups.some(g => g.rows.some(r => r.mk.fav))) ? ['fav'] : [])) + `<div id="archBody"></div>`;
    finish(card);
    const sb = document.getElementById('selBook'), st = document.getElementById('selTopic'), all = document.getElementById('showAll'), bodyEl = document.getElementById('archBody');
    const secHTML = s => {
      let h = `<section class="sec" id="${s.id}"><h2>${esc(s.name)}${s.what ? ` <a class="chip ghost" href="${s.what}">${I.whatIs}</a>` : ''}</h2>`;
      for (const g of s.groups) { if (g.name) h += `<div class="subh"${g.id ? ` id="${g.id}"` : ''}>${g.name}</div>`; h += g.rows.map(rowHTML).join(''); }
      return h + `<a class="top" href="#">${I.top}</a></section>`;
    };
    function show(sel, subId, fromHash) {
      const s = secs.find(x => x.id === sel);
      sb.value = s && s.type === 'book' ? sel : ''; st.value = s && s.type === 'topic' ? sel : '';
      all.classList.toggle('on', !s);
      bodyEl.innerHTML = (s ? [s] : secs).map(secHTML).join('');
      bindSyms(bodyEl);
      if (!fromHash) history.replaceState(null, '', s ? '#' + sel : location.pathname + location.search);
      const target = subId && document.getElementById(subId);
      if (target) target.scrollIntoView(); else if (s && !fromHash) card.scrollIntoView();
    }
    function fromHash() {
      const h = decodeURIComponent(location.hash.slice(1));
      if (!h || h === 'by-author') { show('', '', true); if (h) sb.focus(); return; }
      const base = h.replace(I.subVerses, '').replace(I.subPrayers, '');
      if (secs.some(x => x.id === base)) show(base, h !== base ? h : '', true);
      else show('', '', true);
    }
    sb.onchange = () => show(sb.value);
    st.onchange = () => show(st.value);
    all.onclick = () => show('');
    bodyEl.addEventListener('click', e => { if (e.target.classList.contains('top')) { e.preventDefault(); card.scrollIntoView(); } });
    window.addEventListener('hashchange', fromHash);
    fromHash();
  }

  // ---------- flat lists: all prayers / all verses / all commonplace / saints / books ----------
  function flatRows() {
    return dataLines().filter(l => /^(<span id="[^"]*"><\/span>)?↳ /.test(l) && /href="(post\.html\?p=|commonplace\/)/.test(l)).map(parseRow).filter(Boolean);
  }

  function allPrayers() {
    const card = document.getElementById('card');
    const rows = flatRows().map(r => ({ href: r.href, title: r.a, mk: r.mk, topic: r.others[0] ? r.others[0].text : '', topicHref: r.others[0] ? r.others[0].href : '' }));
    const topics = [...new Set(rows.map(r => r.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    const hasMine = rows.some(r => r.mk.mine), hasFav = rows.some(r => r.mk.fav);
    const head = card.innerHTML;
    card.innerHTML = head + `<div class="filters"><select id="selPT" aria-label="${I.topic}"><option value="">${I.allTopics}</option>${topics.map(t => `<option>${esc(t)}</option>`).join('')}</select>` +
      `<button class="toggle" id="apAll" type="button">${I.all}</button>` +
      (hasMine ? `<button class="toggle" data-f="mine" type="button">${SYM.mine} ${I.mineBtn}</button>` : '') +
      (hasFav ? `<button class="toggle" data-f="fav" type="button">${SYM.fav} ${I.favBtn}</button>` : '') +
      `</div>` + legend(['refl', 'mine'].concat(hasFav ? ['fav'] : [])) + `<div id="listBody"></div>`;
    finish(card);
    const sel = document.getElementById('selPT'), all = document.getElementById('apAll'), bodyEl = document.getElementById('listBody');
    const st = { topic: '', f: '' };
    function draw() {
      const shown = rows.filter(r => (!st.topic || r.topic === st.topic) && (!st.f || r.mk[st.f]));
      bodyEl.innerHTML = shown.length ? shown.map(r => rowHTML({ href: r.href, title: r.title, mk: r.mk, tag: r.topic ? `<a class="ltopic" href="${r.topicHref}">${esc(r.topic)}</a>` : '' })).join('') : `<div class="empty">${I.none}</div>`;
      all.classList.toggle('on', !st.topic && !st.f);
      card.querySelectorAll('[data-f]').forEach(b => b.classList.toggle('on', st.f === b.dataset.f));
      sel.value = st.topic;
      bindSyms(bodyEl);
    }
    sel.onchange = () => { st.topic = sel.value; draw(); };
    all.onclick = () => { st.topic = ''; st.f = ''; draw(); };
    card.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { st.f = st.f === b.dataset.f ? '' : b.dataset.f; draw(); });
    draw();
  }

  function allVerses() {
    const card = document.getElementById('card');
    const rows = flatRows().map(r => {
      // two formats: "title * | <a>ref</a>" (title in the text) or "<a>title</a> * | <a>Book ref</a>"
      const viaText = cleanTitle(r.rest);
      return viaText ? { href: r.href, ref: r.a, title: viaText, mk: r.mk } : { href: r.href, ref: r.others[0] ? r.others[0].text : '', title: r.a, mk: r.mk };
    });
    card.insertAdjacentHTML('beforeend', legend(['refl']) + rows.map(rowHTML).join(''));
    finish(card);
  }

  function simpleList() {
    const card = document.getElementById('card');
    const rows = flatRows().map(r => ({ href: r.href, title: r.a, mk: r.mk }));
    card.insertAdjacentHTML('beforeend', rows.map(rowHTML).join(''));
    finish(card);
  }

  function books() {
    const card = document.getElementById('card');
    let h = '', open = false;
    for (const l of dataLines()) {
      const t = l.replace(/<[^>]+>/g, '').trim();
      if (/^↳ ?<a|<\/span>↳ ?<a/.test(l)) { const r = parseRow(l); if (r) h += rowHTML({ href: r.href, title: r.a, mk: r.mk }); continue; }
      const sub = l.match(/<span id="([a-z0-9-]+)"><\/span><span class="counter">\/\/ ([^<]+)<\/span>/);
      if (sub) { h += `<div class="subh" id="${sub[1]}">${esc(sub[2])}</div>`; continue; }
      if (/^(old testament|new testament|antico testamento|nuovo testamento)$/i.test(t)) { if (open) h += '</section>'; h += `<section class="sec"><h2>${esc(t)}</h2>`; open = true; }
    }
    if (open) h += '</section>';
    card.insertAdjacentHTML('beforeend', h);
    finish(card);
  }

  // ---------- standalone pages (rosary, skeptical, standalone commonplace) ----------
  function legacy(opts) {
    const page = document.getElementById('legacy');
    const first = page.querySelector('pre');
    // the first <pre> holds title, back-links and the language line
    const raw = first.innerHTML.replace(/^\n/, '');
    const cut = raw.indexOf('\n\n');
    const lines = (cut >= 0 ? raw.slice(0, cut) : raw).split('\n').filter(l => l.trim());
    let title = lines.shift().replace(/<[^>]+>/g, '');
    if (title.includes(' | ')) title = title.split(' | ').slice(1).join(' | ');
    const nav = [];
    for (const l of lines) {
      const a = l.match(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
      if (!a) continue;
      if (/\/\//.test(l.replace(/https?:\/\//g, ''))) nav.push(langChip(a[1], a[2]));
      else { const file = a[1].replace(/^\.\.\//, ''); nav.push(chip(a[1], I.nav[file] || a[2].replace(/^(back to|torna (all'|al |ai |alla |agli )?)\s*/, ''))); }
    }
    if (cut >= 0) first.innerHTML = raw.slice(cut + 2); else first.remove();
    let h = page.innerHTML;
    h = h.replace(/\s\*(?=\s*<\/(a|span)>)/g, ' ' + sym('refl')).replace(/<\/a> \*/g, '</a> ' + sym('refl'));
    h = h.replace(/(<summary[^>]*>\s*)↳ /g, '$1');
    h = h.replace(/(<pre class="question-title">)↳ /g, '$1');
    h = h.replace(/^↳ ([^<\n]+)$/gm, '</pre><h4 class="gs">$1</h4><pre>');
    h = h.replace(/^→ (.*)$/gm, '</pre><h3 class="gh">$1</h3><pre>');
    h = hang(h);
    const card = document.createElement('main');
    card.className = 'card';
    card.innerHTML = banner(opts.label || I.types.guides, opts.pal || 'dawn') + navHTML(nav) + `<div class="ref">${esc(opts.ref || opts.label || I.types.guides)}</div><h1 class="title">${esc(title)}</h1><div class="legacy">${h}</div>`;
    page.replaceWith(card);
    card.querySelectorAll('pre').forEach(p => { if (!p.textContent.trim() && !p.children.length) p.remove(); });
    finish(card);
    jumpToHash();
    return card;
  }

  window.Soul = { LANG, I, esc, sym, legend, rowHTML, finish, bindSyms, post, archive, allPrayers, allVerses, simpleList, books, legacy, renderPost };
})();
