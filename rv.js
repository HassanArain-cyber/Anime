/* ReelsVault — rv.js */

/* ── STATE ── */
let reels     = [];
let selPlat   = 'auto';
let curFilter = 'All';
let sortOld   = false;
let pendingDlUrl  = '';
let pendingDlPlat = '';

/* ── DOWNLOADERS ── */
const DL = {
  Instagram: 'https://fastdl.app/en',
  TikTok:    'https://savetik.co/en',
  YouTube:   'https://v1.y2mate.nu/',
  Threads:   'https://threadster.app/',
  Pinterest: 'https://klickpin.com/download',
  Other:     'https://fastdl.app/en',
};

/* ── PLATFORM ── */
const P_ICON  = { Instagram:'📸', TikTok:'🎵', YouTube:'▶️', Threads:'🧵', Pinterest:'📌', Other:'🔗' };
const P_BAR   = { Instagram:'rb-ig', TikTok:'rb-tt', YouTube:'rb-yt', Threads:'rb-th', Pinterest:'rb-pi', Other:'rb-ot' };

function detect(url) {
  const u = (url||'').toLowerCase();
  if (u.includes('instagram.com') || u.includes('instagr.am')) return 'Instagram';
  if (u.includes('tiktok.com')    || u.includes('vm.tiktok'))  return 'TikTok';
  if (u.includes('youtube.com')   || u.includes('youtu.be'))   return 'YouTube';
  if (u.includes('threads.net'))                                return 'Threads';
  if (u.includes('pinterest.com') || u.includes('pin.it'))     return 'Pinterest';
  return 'Other';
}

/* Try to get a thumbnail */
function thumb(reel) {
  const yt = reel.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return `https://img.youtube.com/vi/${yt[1]}/mqdefault.jpg`;
  return '';
}

/* ── STORAGE ── */
function load() { try { reels = JSON.parse(localStorage.getItem('rv6')||'[]'); } catch { reels=[]; } }
function save() { try { localStorage.setItem('rv6', JSON.stringify(reels)); } catch {} }

/* ── SAVE REEL ── */
function saveReel() {
  const raw  = document.getElementById('urlInp').value.trim();
  const note = document.getElementById('noteInp').value.trim();
  if (!raw) { toast('⚠️ Paste a link first!'); return; }
  let url = raw;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const plat = selPlat === 'auto' ? detect(url) : selPlat;
  reels.unshift({ id: Date.now(), url, note, plat, fav: false, date: new Date().toISOString() });
  save();
  document.getElementById('urlInp').value  = '';
  document.getElementById('noteInp').value = '';
  selPlat = 'auto';
  document.querySelectorAll('.ppill').forEach(p => p.classList.remove('sel'));
  renderAll();
  toast('✅ Saved!');
}

/* ── PLATFORM PILL ── */
function pickPlat(el) {
  const p = el.dataset.p;
  if (selPlat === p) { selPlat = 'auto'; el.classList.remove('sel'); }
  else {
    document.querySelectorAll('.ppill').forEach(x => x.classList.remove('sel'));
    selPlat = p; el.classList.add('sel');
  }
}

/* ── FILTER / SORT ── */
function setFilter(el) {
  document.querySelectorAll('.ftab').forEach(t => t.classList.remove('on'));
  el.classList.add('on'); curFilter = el.dataset.f; renderReels();
}
function toggleSort() {
  sortOld = !sortOld;
  document.getElementById('sortLbl').textContent = sortOld ? 'Old' : 'New';
  renderReels();
}
function getList() {
  const q = (document.getElementById('sInp').value||'').toLowerCase();
  let list = [...reels];
  if (curFilter === 'fav')       list = list.filter(r => r.fav);
  else if (curFilter !== 'All')  list = list.filter(r => r.plat === curFilter);
  if (q) list = list.filter(r => r.url.toLowerCase().includes(q) || (r.note||'').toLowerCase().includes(q));
  return sortOld ? list.reverse() : list;
}

/* ── CARD ACTIONS ── */
function delReel(id)  { reels = reels.filter(r => r.id !== id); save(); renderAll(); toast('🗑️ Deleted'); }
function favReel(id)  {
  const r = reels.find(r => r.id === id);
  if (r) { r.fav = !r.fav; save(); renderAll(); toast(r.fav ? '❤️ Added to faves' : '💔 Removed'); }
}
function copyUrl(url) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => toast('📋 Copied!'));
  } else {
    const ta = document.createElement('textarea');
    ta.value = url; ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    toast('📋 Copied!');
  }
}

/* ── DOWNLOAD FLOW ── */
function openDl(url, plat) {
  pendingDlUrl  = url;
  pendingDlPlat = plat;
  document.getElementById('dlTitle').textContent   = `⬇️ Download from ${plat}`;
  document.getElementById('dlUrlBox').textContent  = url;
  document.getElementById('dlOverlay').classList.add('open');
}
function closeDl() { document.getElementById('dlOverlay').classList.remove('open'); }
function dlBgClose(e) { if (e.target === document.getElementById('dlOverlay')) closeDl(); }
function confirmDl() {
  closeDl();
  /* Copy link to clipboard first so user can paste on downloader site */
  if (navigator.clipboard) {
    navigator.clipboard.writeText(pendingDlUrl).catch(() => {});
  }
  toast('📋 Link copied! Paste on the downloader page.');
  const site = DL[pendingDlPlat] || DL.Other;
  setTimeout(() => window.open(site, '_blank'), 400);
}

/* ── RENDER REELS ── */
function fmtD(iso) { return new Date(iso).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}); }

function renderReels() {
  const list = getList();
  const c = document.getElementById('reelList');
  document.getElementById('totalBadge').textContent = reels.length + ' link' + (reels.length !== 1 ? 's' : '');

  if (!list.length) {
    c.innerHTML = `<div class="empty"><div class="empty-ico">🎬</div><h3>Nothing here yet</h3><p>Paste a link above to save it!</p></div>`;
    return;
  }
  c.innerHTML = list.map((r, i) => {
    const t   = thumb(r);
    const bar = P_BAR[r.plat] || 'rb-ot';
    const su  = r.url.replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    return `<div class="reel-card" style="animation-delay:${i*.04}s">
      <div class="reel-inner">
        <div class="reel-thumb ${bar}">
          ${t
            ? `<img src="${t}" onerror="this.parentElement.innerHTML='<div class=no-thumb>${P_ICON[r.plat]||'🎬'}</div>'" loading="lazy"/>
               <div class="play-over">▶</div>`
            : `<div class="no-thumb">${P_ICON[r.plat]||'🎬'}</div>`}
        </div>
        <div class="reel-body">
          <div>
            <div class="reel-meta">
              <span class="reel-plat-ico">${P_ICON[r.plat]||'🔗'}</span>
              <span class="reel-plat-name">${r.plat}</span>
              <button class="reel-fav" onclick="favReel(${r.id})">${r.fav?'❤️':'🤍'}</button>
            </div>
            <a class="reel-link" href="${su}" target="_blank" rel="noopener">${r.url}</a>
            ${r.note ? `<div class="reel-note">📝 ${r.note}</div>` : ''}
            <div class="reel-date">🗓 ${fmtD(r.date)}</div>
          </div>
          <div class="reel-btns">
            <button class="rbtn dl"  onclick="openDl('${su}','${r.plat}')">⬇️ DL</button>
            <button class="rbtn"     onclick="copyUrl('${su}')">📋</button>
            <button class="rbtn"     onclick="window.open('${su}','_blank')">🔗</button>
            <button class="rbtn del" onclick="delReel(${r.id})">🗑️</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

/* ── RENDER STATS ── */
function renderStats() {
  const total = reels.length;
  const favs  = reels.filter(r => r.fav).length;
  const plats = [...new Set(reels.map(r => r.plat))].length;
  const today = reels.filter(r => new Date(r.date).toDateString() === new Date().toDateString()).length;

  document.getElementById('statGrid').innerHTML =
    [['Total',total,'🎬'],['Faves',favs,'❤️'],['Platforms',plats,'📱'],['Today',today,'⚡']]
    .map(([l,n,e]) => `<div class="stat-box">
      <div style="font-size:24px;margin-bottom:3px">${e}</div>
      <div class="stat-n">${n}</div>
      <div class="stat-l">${l}</div>
    </div>`).join('');

  const ps = ['Instagram','TikTok','YouTube','Threads','Pinterest','Other'];
  const cs = ps.map(p => reels.filter(r => r.plat === p).length);
  const mx = Math.max(...cs, 1);
  document.getElementById('platBars').innerHTML =
    `<div class="pb-title">BY PLATFORM</div>` +
    ps.map((p, i) => `<div class="pb-item">
      <div class="pb-row"><span class="pb-name">${P_ICON[p]} ${p}</span><span class="pb-num">${cs[i]}</span></div>
      <div class="pb-track"><div class="pb-fill" style="width:${(cs[i]/mx)*100}%"></div></div>
    </div>`).join('');
}

function renderAll() { renderReels(); renderStats(); }

/* ── PAGES ── */
function goPage(p) {
  ['home','stats','settings'].forEach(x => {
    const cap = x[0].toUpperCase() + x.slice(1);
    document.getElementById('page'+cap).classList.toggle('active', x === p);
    document.getElementById('bn-'+x).classList.toggle('on', x === p);
  });
  if (p === 'stats') renderStats();
}

/* ── WALLPAPER ── */
function setWallpaper(e) {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const data = ev.target.result;
    localStorage.setItem('rv6_wp', data);
    applyWp(data);
    const prev = document.getElementById('wpPrev');
    prev.innerHTML = `<img src="${data}"/>`;
    toast('🖼️ Wallpaper set!');
  };
  reader.readAsDataURL(file);
}
function applyWp(data) {
  document.body.style.backgroundImage = `url('${data}')`;
  document.body.classList.add('wp');
}
function removeWp() {
  localStorage.removeItem('rv6_wp');
  document.body.style.backgroundImage = '';
  document.body.classList.remove('wp');
  document.getElementById('wpPrev').innerHTML = '<span id="wpPrevTxt">📁 Tap to choose from gallery</span>';
  toast('🗑️ Wallpaper removed');
}
function setWpOp(val) {
  document.getElementById('wpOpVal').textContent = val + '%';
  document.documentElement.style.setProperty('--wp-dark', `rgba(14,14,22,${val/100})`);
  localStorage.setItem('rv6_wpo', val);
}
function loadWp() {
  const wp  = localStorage.getItem('rv6_wp');
  const wpo = localStorage.getItem('rv6_wpo') || '80';
  if (wp) {
    applyWp(wp);
    document.getElementById('wpPrev').innerHTML = `<img src="${wp}"/>`;
  }
  document.getElementById('wpOp').value = wpo;
  setWpOp(wpo);
}

/* ── EXPORT / IMPORT ── */
function exportData() {
  const b = new Blob([JSON.stringify(reels,null,2)],{type:'application/json'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(b);
  a.download = 'reelsvault.json'; a.click(); toast('📤 Exported!');
}
function importData(e) {
  const f = e.target.files[0]; if (!f) return;
  const r = new FileReader();
  r.onload = ev => {
    try {
      const d = JSON.parse(ev.target.result);
      if (!Array.isArray(d)) throw 0;
      reels = [...d,...reels]; save(); renderAll(); toast(`📥 Imported ${d.length} links`);
    } catch { toast('⚠️ Invalid file'); }
  };
  r.readAsText(f);
}
function clearAll() {
  if (!confirm('Delete ALL saved links? Cannot be undone.')) return;
  reels = []; save(); renderAll(); toast('🗑️ Cleared');
}

/* ── TOAST ── */
let _tt;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_tt); _tt = setTimeout(() => el.classList.remove('show'), 2800);
}

/* ── INIT ── */
load(); loadWp(); renderAll();
