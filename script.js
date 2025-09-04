const API_BASE = 'https://animehuub-api.vercel.app';
const CORS_PROXY = 'https://animehuub-dark-moon-3071.mypcaccc01.workers.dev/v2';

function proxiedImage(url) {
  if (!url) return '';
  return `${CORS_PROXY}/${url}`;
}
    let currentAnimeId = '';
    let currentEpisodeData = null;
    let episodeListCache = [];
    let hls = null;
 
// genres section js
async function filterByGenre(genre){
  showPage('search');
  const results = document.getElementById('searchResults');
  results.innerHTML = `<div class="empty">Loading ${genre} anime…</div>`;

  try {
    // Just reuse your existing API with genre as the search query
    const res = await fetch(`${API_BASE}/anime/animepahe/${encodeURIComponent(genre)}?page=1`);
    const data = await res.json();

    if(data.results?.length){
      renderGrid(data.results, 'searchResults');
    } else {
      results.innerHTML = `<div class="empty">No results for ${genre}.</div>`;
    }
  } catch (err) {
    console.error(err);
    results.innerHTML = `<div class="empty">Failed to load ${genre} anime.</div>`;
  }
}



// below is danger zone		
    const $ = (q)=>document.querySelector(q);

    // Page switching
function showPage(id){
  // If leaving the player, stop and reset video
  if(document.getElementById('episodePlayer').classList.contains('active') && id !== 'episodePlayer'){
    const video = document.getElementById('videoPlayer');
    if(hls){ try{hls.destroy();}catch{} hls = null; }
    video.pause();
    video.removeAttribute('src');
    video.load(); // forces it to fully stop
  }

  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

    // Drawer
    const drawer = document.getElementById('episodeDrawer');
    const openDrawerBtn = document.getElementById('openDrawer');
    const closeDrawerBtn = document.getElementById('closeDrawer');
    openDrawerBtn.onclick = ()=> drawer.classList.add('open');
    closeDrawerBtn.onclick = ()=> drawer.classList.remove('open');

    // Search
    function handleSearchKeypress(e){ if(e.key==='Enter') searchAnime(); }
    async function searchAnime(){
      const q = document.getElementById('searchInput').value.trim(); if(!q) return;
      showPage('search');
      const results = document.getElementById('searchResults');
      results.innerHTML = '<div class="empty">Searching…</div>';
      try{
        const res = await fetch(`${API_BASE}/anime/animepahe/${encodeURIComponent(q)}?page=1`);
        const data = await res.json();
        if(data.results?.length) renderGrid(data.results, 'searchResults');
        else results.innerHTML = '<div class="empty">Nothing. Try a saner query.</div>';
      }catch(err){
        console.error(err); results.innerHTML = '<div class="empty">Search failed. Internet goblins again.</div>';
      }
    }

    // Popular with pagination (uses predefined queries)
let homePage = 1;
const queries = ['naruto','one piece','demon slayer','attack on titan'];
const PAGE_SIZE = 12; // how many shows per page

async function loadPopularAnime(page = 1){
  const box = document.getElementById('popularAnime');
  box.innerHTML = '<div class="empty">Loading…</div>';

  try {
    const all = [];
    // Load from all queries
    for (const q of queries) {
      try {
        const r = await fetch(`${API_BASE}/anime/animepahe/${q}?page=1`);
        const j = await r.json();
        if (j.results) all.push(...j.results.slice(0, 5)); // take top 5 per query
      } catch {}
    }

    if (all.length) {
      // Pagination slice
      const start = (page - 1) * PAGE_SIZE;
      const slice = all.slice(start, start + PAGE_SIZE);

      if (slice.length) {
        renderGrid(slice, 'popularAnime');
        document.getElementById('homePageIndicator').textContent = `Page ${page}`;
      } else {
        box.innerHTML = '<div class="empty">No more anime to show.</div>';
      }
    } else {
      box.innerHTML = '<div class="empty">Could not load popular anime.</div>';
    }
  } catch (err) {
    console.error(err);
    box.innerHTML = '<div class="empty">Failed to load anime.</div>';
  }
}

function nextHomePage(){
  homePage++;
  loadPopularAnime(homePage);
}

function prevHomePage(){
  if (homePage > 1) {
    homePage--;
    loadPopularAnime(homePage);
  }
}


    // Grid helper
    function renderGrid(list, mountId){
      const el = document.getElementById(mountId);
      el.innerHTML = list.map(a=>`
        <div class="card" onclick="loadAnimeInfo('${a.id}')">
          <img class="thumb" src="${proxiedImage(a.image)}" alt="${a.title}" onerror="this.style.opacity=.2">
          <div class="card-body">
            <div class="title">${a.title}</div>
            <div class="status">${a.status || 'Unknown'}</div>
          </div>
        </div>
      `).join('');
    }



    // Info page
    async function loadAnimeInfo(animeId){
      currentAnimeId = animeId;
      const mount = document.getElementById('animeInfoContent');
      mount.innerHTML = '<div class="empty">Loading info…</div>';
      showPage('animeInfo');
      try{
        const r = await fetch(`${API_BASE}/anime/animepahe/info/${animeId}`);
        const anime = await r.json();
        episodeListCache = anime.episodes || [];
        renderInfo(anime);
        renderDrawer(episodeListCache);
      }catch(err){ mount.innerHTML = '<div class="empty">Could not load this anime.</div>'; }
    }

    function renderInfo(anime){
      const genres = anime.genres?.length ? anime.genres.join(', ') : 'Unknown';
      const eps = anime.episodes || [];
      document.getElementById('animeInfoContent').innerHTML = `
        <div class="info-head">
          <img class="poster" src="${proxiedImage(anime.image)}" alt="${anime.title}" onerror="this.style.opacity=.2" />
          <div>
            <h1 style="font-weight:800; font-size:28px; background:linear-gradient(45deg,var(--brand),var(--brand-2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent">${anime.title}</h1>
            <div class="meta">
              <span class="tag">${anime.status || 'Unknown status'}</span>
              <span class="tag">${anime.releaseDate || 'Year?'}</span>
              <span class="tag">${eps.length} Episodes</span>
            </div>
            <p class="desc"><strong>Genres:</strong> ${genres}</p>
            <p class="desc" style="margin-top:8px">${anime.description || 'No description available.'}</p>
          </div>
        </div>
        <h3 class="section-title" style="margin-top:18px">Episodes</h3>
        <div class="episodes-grid">
          ${eps.map(ep=>`
            <div class="ep" onclick="loadEpisode('${ep.id}','${anime.title.replace(/"/g,'&quot;')}','${ep.number}')">
              <div class="ep-num">Episode ${ep.number}</div>
              <div style="opacity:.85; font-size:13px; margin-top:4px">${ep.title || 'Untitled'}</div>
            </div>
          `).join('')}
        </div>
      `;
    }

    function renderDrawer(eps){
      const d = document.getElementById('drawerList');
      d.innerHTML = eps.map(ep=>`
        <div class="ep-item" data-ep="${ep.id}" onclick="loadEpisode('${ep.id}', '', '${ep.number}')">
          <div class="ep-num">Ep ${ep.number}</div>
          <div style="font-size:13px; opacity:.9">${ep.title || ''}</div>
        </div>
      `).join('');
    }

    // Episode + Player
    async function loadEpisode(episodeId, animeTitle, episodeNumber){
      showPage('episodePlayer');
      drawer.classList.remove('open');
      const qs = document.getElementById('qualitySelect');
      const as = document.getElementById('audioSelect');
      const ss = document.getElementById('subtitleSelect');
      const dl = document.getElementById('downloadLinks');
      const np = document.getElementById('nowPlaying');
      qs.innerHTML = '<option>Loading…</option>';
      as.style.display = 'none'; ss.style.display = 'none'; dl.innerHTML = '';
      np.textContent = `Episode ${episodeNumber || ''}`;

      try{
        const r = await fetch(`${API_BASE}/anime/animepahe/watch?episodeId=${episodeId}`);
        const data = await r.json();
        currentEpisodeData = data;
        setupVideoPlayer(data);
        // Mark active in drawer
        document.querySelectorAll('.ep-item').forEach(el=>{
          el.classList.toggle('active', el.getAttribute('data-ep')===episodeId);
        });
      }catch(err){
        qs.innerHTML = '<option>Error</option>';
        alert('Failed to load episode.');
      }
      // Save last watched
      try{localStorage.setItem('lastEpisodeId', episodeId);}catch{}
    }

    function proxy(url){
      if(!url) return '';
      // Also proxy subtitle m3u8 or vtt
      if(url.includes('http')) return `${CORS_PROXY}?url=${encodeURIComponent(url)}`;
      return url;
    }

    function setupVideoPlayer(episode){
      const video = document.getElementById('videoPlayer');
      const qs = document.getElementById('qualitySelect');
      const as = document.getElementById('audioSelect');
      const ss = document.getElementById('subtitleSelect');
      const dl = document.getElementById('downloadLinks');

      // Clean up
      if(hls){ try{hls.destroy();}catch{} hls = null; }
      video.pause(); video.removeAttribute('src');
      Array.from(video.querySelectorAll('track')).forEach(t=>t.remove());

      // Populate quality options
      qs.innerHTML = '<option value="">Quality</option>';
      const sources = episode.sources || [];
      sources.forEach((s, i)=>{
        const opt = document.createElement('option');
        opt.value = i; opt.textContent = s.quality || `Variant ${i+1}`;
        qs.appendChild(opt);
      });
      if(sources.length){ qs.value = '0'; }

      // Downloads
      if(Array.isArray(episode.download) && episode.download.length){
        dl.innerHTML = episode.download.map(l=>`<a class="dl" target="_blank" rel="noopener" href="${l.url}">Download ${l.quality || ''}</a>`).join('');
      }

      // Subtitles support (expects episode.subtitles = [{url,label,lang}] or episode.tracks)
      const subtitles = episode.subtitles || episode.tracks || [];
      if(Array.isArray(subtitles) && subtitles.length){
        ss.style.display = '';
        ss.innerHTML = '<option value="">Subtitles</option>' + subtitles.map((t,i)=>`<option value="${i}">${t.label || t.lang || 'Track '+(i+1)}</option>`).join('');
        // Preload tracks as <track> tags
        subtitles.forEach((t,i)=>{
          const track = document.createElement('track');
          track.kind = 'subtitles';
          track.label = t.label || t.lang || `Track ${i+1}`;
          track.srclang = t.lang || 'und';
          track.src = proxy(t.url);
          if(i===0) track.default = true;
          video.appendChild(track);
        });
      }else{
        ss.style.display = 'none';
      }

      // Audio language support if multiple audio variants are provided as separate sources
      const langs = collectLanguages(sources);
      if(langs.length > 1){
        as.style.display = '';
        as.innerHTML = '<option value="">Audio</option>' + langs.map(l=>`<option value="${l}">${l.toUpperCase()}</option>`).join('');
      }else{
        as.style.display = 'none';
      }

      // Initial load
      changeQuality();

      // HLS track switching events
      if(hls){
        hls.on(Hls.Events.MANIFEST_PARSED, ()=>{ /* video.play().catch(()=>{}) */ });
        hls.on(Hls.Events.ERROR, (_, data)=>{
          if(data.fatal){
            switch(data.type){
              case Hls.ErrorTypes.NETWORK_ERROR: hls.startLoad(); break;
              case Hls.ErrorTypes.MEDIA_ERROR: hls.recoverMediaError(); break;
              default: alert('Fatal HLS error: '+data.details);
            }
          }
        });
      }
    }

    function collectLanguages(sources){
      const set = new Set();
      (sources||[]).forEach(s=>{ if(s.lang || s.language) set.add((s.lang||s.language).toLowerCase()); });
      return Array.from(set);
    }

    function changeQuality(){
      const idx = document.getElementById('qualitySelect').value;
      if(idx === '' || !currentEpisodeData?.sources) return;
      const src = currentEpisodeData.sources[idx];
      const video = document.getElementById('videoPlayer');

      if(hls){ try{hls.destroy();}catch{} hls = null; }

      const url = proxy(src.url);
      if(Hls.isSupported()){
        hls = new Hls({
          lowLatencyMode:true, enableWorker:true, backBufferLength:90,
          xhrSetup: function(xhr, url){
            if((/\.ts|\.key|\.m3u8/).test(url) && !url.includes(CORS_PROXY)){
              xhr.open('GET', `${CORS_PROXY}?url=${encodeURIComponent(url)}`, true);
            }
          }
        });
        hls.loadSource(url);
        hls.attachMedia(video);
      } else if(video.canPlayType('application/vnd.apple.mpegurl')){
        video.src = url;
      } else {
        alert('HLS is not supported in this browser.');
      }
    }

    function changeAudio(){
      const as = document.getElementById('audioSelect');
      const lang = as.value;
      if(!hls || !lang) return;
      // Best-effort: if HLS exposes audio tracks, switch to matching name or language
      const list = hls.audioTracks || [];
      const idx = list.findIndex(t => (t.name||'').toLowerCase().includes(lang) || (t.lang||'').toLowerCase()===lang);
      if(idx >= 0){ hls.audioTrack = idx; }
    }

    function changeSubtitle(){
      const ss = document.getElementById('subtitleSelect');
      const video = document.getElementById('videoPlayer');
      const n = parseInt(ss.value,10);
      const tracks = video.textTracks;
      for(let i= 0; i<tracks.length; i++){ tracks[i].mode = (i===n? 'showing' : 'disabled'); }
    }

    // Back to anime info
function goBackToAnime(){
  const video = document.getElementById('videoPlayer');
  if(hls){ try{hls.destroy();}catch{} hls = null; }
  video.pause();
  video.removeAttribute('src');
  video.load();
  showPage('animeInfo');
}

// Restore last episode quick open
document.addEventListener('DOMContentLoaded', ()=>{
  loadPopularAnime(homePage);
  try {
    const last = localStorage.getItem('lastEpisodeId');
    if(last){ /* optional resume feature */ }
  } catch {}
});


    window.addEventListener('beforeunload', ()=>{ if(hls){ try{hls.destroy();}catch{} } });
