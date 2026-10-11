/* Aneesh Rawat portfolio: behaviour.
   Portfolio items come from content/projects.json (see README.md). */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var SVG_NS = 'http://www.w3.org/2000/svg';

  /* ---------- small helpers ---------- */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function (k) {
      if (k === 'class') node.className = props[k];
      else if (k === 'text') node.textContent = props[k];
      else node.setAttribute(k, props[k]);
    });
    (children || []).forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }
  function icon(id) {
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', '#' + id);
    svg.appendChild(use);
    return svg;
  }
  // Deterministic pseudo-random numbers so every placeholder looks different but stable.
  function seeded(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return function () {
      h += 0x6d2b79f5;
      var t = Math.imul(h ^ (h >>> 15), 1 | h);
      t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- footer year ---------- */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- mobile navigation ---------- */
  var toggle = $('.nav-toggle');
  var navLinks = $('#site-nav');
  function setNav(open) {
    navLinks.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setNav(!navLinks.classList.contains('open')); });
  $$('a', navLinks).forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) { setNav(false); toggle.focus(); }
  });

  /* ---------- nav highlight for the section in view ---------- */
  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.nav-links a[href^="#"]:not(.btn)').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Object.keys(links).forEach(function (id) {
          if (id === en.target.id) links[id].setAttribute('aria-current', 'true');
          else links[id].removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) spy.observe(s); });
  }

  /* ---------- entrance animations ---------- */
  function initReveal() {
    var items = $$('.reveal');
    if (!('IntersectionObserver' in window) || reduceMotion.matches) {
      items.forEach(function (n) { n.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(function (n) { io.observe(n); });
    return io;
  }
  var revealObserver = initReveal();

  /* ---------- hero: editing-timeline background ---------- */
  (function buildTimeline() {
    var host = $('#timeline');
    if (!host) return;
    var rnd = seeded('timeline');
    host.appendChild(el('div', { class: 'tl-ruler' }));
    var tracks = [
      { top: 34, dur: 70, rev: false },
      { top: 74, dur: 52, rev: true },
      { top: 114, dur: 84, rev: false },
      { top: 154, dur: 60, rev: true }
    ];
    tracks.forEach(function (t, ti) {
      var track = el('div', { class: 'tl-track' + (t.rev ? ' rev' : '') });
      track.style.top = t.top + 'px';
      track.style.setProperty('--dur', t.dur + 's');
      var widths = [];
      for (var i = 0; i < 10; i++) widths.push(Math.round(70 + rnd() * 230));
      // The sequence is written twice so the loop (-50%) is seamless.
      for (var pass = 0; pass < 2; pass++) {
        widths.forEach(function (w, i) {
          var clip = el('div', { class: 'tl-clip' + ((i + ti) % 7 === 0 ? ' hi' : '') });
          clip.style.width = w + 'px';
          track.appendChild(clip);
        });
      }
      host.appendChild(track);
    });
    host.appendChild(el('div', { class: 'tl-playhead' }));
  })();

  /* ---------- video URL handling ---------- */
  // Turns a link from projects.json into something we know how to show.
  function parseVideo(raw) {
    var none = { type: 'none' };
    if (!raw || typeof raw !== 'string') return none;
    var u;
    try { u = new URL(raw, window.location.href); } catch (e) { return none; }
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return none; // blocks javascript: etc.
    var host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
    var id = '';

    if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
    else if (host === 'youtube.com' || host === 'music.youtube.com') {
      var m = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/);
      id = m ? m[1] : u.searchParams.get('v') || '';
    }
    if (/^[\w-]{11}$/.test(id)) {
      return {
        type: 'youtube', href: u.href,
        embed: 'https://www.youtube-nocookie.com/embed/' + id + '?rel=0&playsinline=1',
        thumb: 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg',
        shorts: /\/shorts\//.test(u.pathname)
      };
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      var vm = u.pathname.match(/(\d{6,})/);
      if (vm) return { type: 'vimeo', href: u.href, embed: 'https://player.vimeo.com/video/' + vm[1] };
    }
    if (host === 'drive.google.com') {
      var dm = u.pathname.match(/\/file\/d\/([\w-]+)/) || (u.searchParams.get('id') ? [null, u.searchParams.get('id')] : null);
      if (dm && /^[\w-]+$/.test(dm[1])) return { type: 'drive', href: u.href, embed: 'https://drive.google.com/file/d/' + dm[1] + '/preview' };
    }
    if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { type: 'file', href: u.href, src: u.href };
    return { type: 'external', href: u.href, host: host };
  }

  function parseAspect(a) {
    var m = typeof a === 'string' && a.match(/^(\d{1,3}):(\d{1,3})$/);
    if (!m || +m[1] === 0 || +m[2] === 0) return { css: '16 / 9', vertical: false };
    return { css: m[1] + ' / ' + m[2], vertical: +m[2] > +m[1] };
  }

  /* ---------- placeholder thumbnail art (an editing timeline) ---------- */
  function placeholderArt(id) {
    var rnd = seeded(id);
    var parts = ['<svg class="art" viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">',
      '<rect width="320" height="180" fill="#141417"/>'];
    for (var t = 0; t < 4; t++) {
      var x = -rnd() * 40, y = 34 + t * 30;
      while (x < 330) {
        var w = 28 + Math.round(rnd() * 80);
        var hi = rnd() > 0.82;
        parts.push('<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + w + '" height="22" rx="5" fill="' +
          (hi ? 'rgba(200,255,46,0.2)' : 'rgba(255,255,255,0.07)') + '" stroke="' +
          (hi ? 'rgba(200,255,46,0.5)' : 'rgba(255,255,255,0.12)') + '"/>');
        x += w + 5;
      }
    }
    var px = 70 + Math.round(rnd() * 180);
    parts.push('<rect x="' + px + '" y="14" width="1.6" height="152" fill="#c8ff2e"/>',
      '<path d="M' + (px - 5) + ' 14 h11.6 l-5.8 8 z" fill="#c8ff2e"/></svg>');
    var wrap = document.createElement('div');
    wrap.innerHTML = parts.join('');
    return wrap.firstChild;
  }

  /* ---------- portfolio gallery ---------- */
  var grid = $('#project-grid');
  var filtersEl = $('#filters');
  var countEl = $('#work-count');
  var state = { categories: [], projects: [], active: 'all' };

  function categoryLabel(id) {
    for (var i = 0; i < state.categories.length; i++) if (state.categories[i].id === id) return state.categories[i].label;
    return 'Other Projects';
  }

  function buildThumb(p, media, vertical) {
    var src = p.thumbnail || media.thumb || '';
    if (!src) return placeholderArt(p.id);
    var img = el('img', { src: src, alt: '', loading: 'lazy', decoding: 'async', width: '1280', height: '720' });
    img.addEventListener('error', function () { img.replaceWith(placeholderArt(p.id)); });
    return img;
  }

  var activePreview = null;
  function stopPreview() {
    if (!activePreview) return;
    activePreview.pause();
    activePreview.classList.remove('on');
    activePreview = null;
  }
  // Hover/focus preview: a short muted clip, loaded only when needed and one at a time.
  function attachPreview(thumbEl, p) {
    var pv = parseVideo(p.preview);
    if (pv.type !== 'file') return;
    var video = null;
    function start(e) {
      if (reduceMotion.matches) return;
      if (e && e.pointerType && e.pointerType !== 'mouse') return;
      if (!video) {
        video = el('video', { muted: '', loop: '', playsinline: '', preload: 'none', 'aria-hidden': 'true', tabindex: '-1' });
        video.muted = true;
        video.src = pv.src;
        video.addEventListener('playing', function () { video.classList.add('on'); });
        thumbEl.insertBefore(video, thumbEl.querySelector('.play'));
      }
      if (activePreview && activePreview !== video) stopPreview();
      activePreview = video;
      var pr = video.play();
      if (pr && pr.catch) pr.catch(function () {});
    }
    thumbEl.addEventListener('pointerenter', start);
    thumbEl.addEventListener('focus', function () { start(); });
    thumbEl.addEventListener('pointerleave', stopPreview);
    thumbEl.addEventListener('blur', stopPreview);
  }

  function buildCard(p) {
    var media = parseVideo(p.video);
    var playable = media.type !== 'none';
    var ar = parseAspect(p.aspect);
    var tag = playable ? 'button' : 'div';
    var thumbProps = { class: 'thumb' + (ar.vertical ? ' v' : '') };
    if (playable) {
      thumbProps.type = 'button';
      thumbProps['aria-label'] = 'Play ' + p.title;
    }
    var thumb = el(tag, thumbProps);
    thumb.appendChild(buildThumb(p, media, ar.vertical));
    if (p.placeholder) thumb.appendChild(el('span', { class: 'badge-ph', text: 'Placeholder' }));
    if (playable) {
      var play = el('span', { class: 'play', 'aria-hidden': 'true' });
      play.appendChild(icon('i-play'));
      thumb.appendChild(play);
      attachPreview(thumb, p);
      thumb.addEventListener('click', function () { openPlayer(p, thumb); });
    }

    var body = el('div', { class: 'project-body' }, [
      el('span', { class: 'chip', text: categoryLabel(p.category) }),
      el('h3', { text: p.title }),
      el('p', { text: p.description || '' })
    ]);
    if (Array.isArray(p.software) && p.software.length) {
      var tags = el('ul', { class: 'tags', 'aria-label': 'Software used' });
      p.software.forEach(function (s) { tags.appendChild(el('li', { text: s })); });
      body.appendChild(tags);
    }
    var card = el('article', { class: 'card project' }, [thumb, body]);
    card.dataset.category = p.category;
    return card;
  }

  function renderGrid() {
    stopPreview();
    grid.textContent = '';
    var list = state.projects.filter(function (p) { return state.active === 'all' || p.category === state.active; });
    if (!list.length) {
      grid.appendChild(el('p', { class: 'grid-message', text: 'No projects in this category yet.' }));
    } else {
      list.forEach(function (p) { grid.appendChild(buildCard(p)); });
    }
    countEl.textContent = 'Showing ' + list.length + (list.length === 1 ? ' project' : ' projects') +
      (state.active === 'all' ? '' : ' in ' + categoryLabel(state.active)) + '.';
  }

  function renderFilters() {
    filtersEl.textContent = '';
    var all = [{ id: 'all', label: 'All' }].concat(state.categories);
    all.forEach(function (c) {
      var b = el('button', { class: 'filter', type: 'button', 'aria-pressed': String(c.id === state.active), 'data-filter': c.id, text: c.label });
      b.addEventListener('click', function () {
        state.active = c.id;
        $$('.filter', filtersEl).forEach(function (f) { f.setAttribute('aria-pressed', String(f.dataset.filter === state.active)); });
        renderGrid();
      });
      filtersEl.appendChild(b);
    });
  }

  function showGridError(msg) {
    grid.textContent = '';
    grid.appendChild(el('p', { class: 'grid-message', role: 'alert', text: msg }));
  }

  function loadProjects() {
    fetch('content/projects.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        state.categories = Array.isArray(data.categories) ? data.categories : [];
        state.projects = (Array.isArray(data.projects) ? data.projects : []).filter(function (p) { return p && p.title; });
        renderFilters();
        renderGrid();
        $('#placeholder-note').hidden = !state.projects.some(function (p) { return p.placeholder; });
      })
      .catch(function () {
        showGridError('The projects could not be loaded. If you opened index.html straight from a folder, run "npm run dev" and use the address it prints. Browsers block loading project data from file:// pages.');
      });
  }
  loadProjects();

  /* ---------- video player dialog ---------- */
  var player = $('#player');
  var playerMedia = $('#player-media');
  var lastTrigger = null;

  function openPlayer(p, trigger) {
    var media = parseVideo(p.video);
    var ar = parseAspect(p.aspect);
    if (media.type === 'youtube' && media.shorts) ar = { css: '9 / 16', vertical: true };
    lastTrigger = trigger;
    playerMedia.textContent = '';
    playerMedia.className = 'player-media' + (ar.vertical ? ' vertical' : '');
    playerMedia.style.setProperty('--ar', ar.css);

    var link = $('#player-link');
    link.hidden = true;

    if (media.type === 'youtube' || media.type === 'vimeo' || media.type === 'drive') {
      // Created only now, so nothing heavy loads until someone asks for it.
      playerMedia.appendChild(el('iframe', {
        src: media.embed, title: p.title, loading: 'lazy', allowfullscreen: '',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen',
        referrerpolicy: 'strict-origin-when-cross-origin'
      }));
      link.href = media.href; link.hidden = false;
    } else if (media.type === 'file') {
      var v = el('video', { controls: '', playsinline: '', preload: 'metadata', 'aria-label': p.title });
      if (p.thumbnail) v.setAttribute('poster', p.thumbnail);
      v.src = media.src;
      playerMedia.appendChild(v);
    } else if (media.type === 'external') {
      playerMedia.appendChild(el('p', { class: 'no-video', text: 'This video opens on ' + media.host + '.' }));
      link.href = media.href; link.hidden = false;
      link.firstChild.nodeValue = 'Watch on ' + media.host;
    }
    if (media.type !== 'external') link.firstChild.nodeValue = 'Open original';

    $('#player-cat').textContent = categoryLabel(p.category);
    $('#player-title').textContent = p.title;
    $('#player-desc').textContent = p.description || '';
    var tags = $('#player-tags');
    tags.textContent = '';
    (p.software || []).forEach(function (s) { tags.appendChild(el('li', { text: s })); });
    tags.hidden = !(p.software && p.software.length);

    if (typeof player.showModal === 'function') player.showModal();
    else player.setAttribute('open', '');
    $('#player-close').focus();
  }
  function closePlayer() {
    playerMedia.textContent = ''; // stop playback immediately
    if (typeof player.close === 'function') player.close(); else player.removeAttribute('open');
  }
  player.addEventListener('close', function () {
    playerMedia.textContent = ''; // removes the iframe/video, which stops playback
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
  });
  $('#player-close').addEventListener('click', closePlayer);
  player.addEventListener('click', function (e) { if (e.target === player) closePlayer(); });

  /* ---------- copy Discord username ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = el('textarea', { readonly: '', 'aria-hidden': 'true', tabindex: '-1' });
    ta.value = text;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  var copyBtn = $('#copy-discord');
  var copyLabel = $('#copy-label');
  var copyStatus = $('#copy-status');
  var copyTimer = null;
  copyBtn.addEventListener('click', function () {
    copyText(copyBtn.dataset.copy).then(function (ok) {
      copyLabel.textContent = ok ? 'Copied!' : 'Copy failed';
      copyStatus.textContent = ok ? 'Discord username copied to clipboard.' : 'Could not copy. Please select the username and copy it manually.';
      clearTimeout(copyTimer);
      copyTimer = setTimeout(function () { copyLabel.textContent = 'Copy username'; copyStatus.textContent = ''; }, 2200);
    });
  });

  /* ---------- inquiry form ---------- */
  var form = $('#inquiry-form');
  var statusEl = $('#form-status');
  var submitBtn = $('#form-submit');

  function setStatus(kind, msg) {
    statusEl.className = 'form-status ' + kind;
    statusEl.textContent = msg;
    statusEl.focus();
  }
  function clearInvalid() {
    $$('[aria-invalid]', form).forEach(function (n) { n.removeAttribute('aria-invalid'); });
  }
  function markInvalid(names) {
    names.forEach(function (n) { var f = form.elements[n]; if (f) f.setAttribute('aria-invalid', 'true'); });
  }

 form.addEventListener('submit', function (e) {
  e.preventDefault();

  var name = form.elements.name.value.trim();
  var email = form.elements.email.value.trim();
  var projectType = form.elements.projectType.value;
  var budget = form.elements.budget.value;
  var message = form.elements.message.value.trim();

 
  var subject = encodeURIComponent('Portfolio Inquiry - ' + name);
  var body = encodeURIComponent(
    'Name: ' + name + '\n' +
    'Email: ' + email + '\n' +
    'Project type: ' + projectType + '\n' +
    'Budget: ' + budget + '\n\n' +
    'Project details:\n' + message
  );


  window.location.href =
    'mailto:workwithaneeshrawat@gmail.com?subject=' +
    subject + '&body=' + body;

  setStatus('ok', 'Your email app should open with your inquiry ready to send. Please press Send in your email app.');
});
 
  window.__siteReady = true;
})();
