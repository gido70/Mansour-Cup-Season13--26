/* Mansour Cup 2026 - FIXED VERSION (No Cache + Clean Data + No Crash) */

const CupApp = (() => {

  function qs(sel){ return document.querySelector(sel); }

  function getParam(name){
    const url = new URL(window.location.href);
    return url.searchParams.get(name) || "";
  }

  function showError(msg){
    const el = qs('#loadError');
    if(!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function escapeHTML(str){
    return String(str ?? '')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#39;');
  }

  // 🔥 تنظيف القيم (حل كل مشاكل 1.0 و A01)
  function cleanValue(val){
    if(val === undefined || val === null) return "";
    let v = String(val).trim();

    if(!isNaN(v) && v !== ""){
      v = Number(v).toString(); // 1.0 → 1
    }

    v = v.replace(/^([A-Z])0+(\d+)$/i, '$1$2'); // A01 → A1

    return v;
  }

  // CSV parser
  function parseCSV(text){
    const rows = text.split('\n').map(r => r.split(','));
    const headers = rows.shift().map(h => h.trim());

    return rows.map(r => {
      if(!r || r.length < headers.length) return null;
      const obj = {};
      headers.forEach((h, i) => obj[h] = (r[i] || "").trim());
      return obj;
    }).filter(Boolean);
  }

  async function loadMatches(){
    try{
      const res = await fetch('data/matches.csv?v=FIXED', { cache: 'no-store' });
      const text = await res.text();
      const data = parseCSV(text);

      return data.map(m => ({
        group: cleanValue(m.group).toUpperCase(),
        round: cleanValue(m.round),
        date: cleanValue(m.date),
        time: cleanValue(m.time),
        team1: cleanValue(m.team1),
        team2: cleanValue(m.team2),
        score1: cleanValue(m.score1),
        score2: cleanValue(m.score2),
        match_code: cleanValue(m.match_code || m.code)
      })).filter(m => m.group && m.match_code);

    }catch(e){
      showError("خطأ في تحميل المباريات");
      return [];
    }
  }

  function isPlayed(m){
    if(!m) return false;
    const s1 = Number(m.score1);
    const s2 = Number(m.score2);
    return m.score1 !== "" && m.score2 !== "" && !isNaN(s1) && !isNaN(s2);
  }

  function computeStandings(matches, group){
    const gMatches = matches.filter(m => m.group === group);
    const teams = new Set();

    gMatches.forEach(m => {
      if(m.team1) teams.add(m.team1);
      if(m.team2) teams.add(m.team2);
    });

    const table = {};

    teams.forEach(t => {
      table[t] = { team:t, P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, Pts:0 };
    });

    gMatches.forEach(m => {
      if(!isPlayed(m)) return;

      const s1 = Number(m.score1);
      const s2 = Number(m.score2);

      const t1 = table[m.team1];
      const t2 = table[m.team2];

      if(!t1 || !t2) return;

      t1.P++; t2.P++;

      t1.GF += s1; t1.GA += s2;
      t2.GF += s2; t2.GA += s1;

      if(s1 > s2){ t1.W++; t2.L++; t1.Pts += 3; }
      else if(s2 > s1){ t2.W++; t1.L++; t2.Pts += 3; }
      else { t1.D++; t2.D++; t1.Pts++; t2.Pts++; }
    });

    Object.values(table).forEach(t => {
      t.GD = t.GF - t.GA;
    });

    return Object.values(table).sort((a,b)=>{
      if(b.Pts !== a.Pts) return b.Pts - a.Pts;
      if(b.GD !== a.GD) return b.GD - a.GD;
      return b.GF - a.GF;
    });
  }

  function renderStandings(standings){
    const tbody = qs('#tblStandings tbody');
    if(!tbody) return;

    tbody.innerHTML = standings.map((t,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${escapeHTML(t.team)}</td>
        <td>${t.P}</td>
        <td>${t.W}</td>
        <td>${t.D}</td>
        <td>${t.L}</td>
        <td>${t.GF}</td>
        <td>${t.GA}</td>
        <td>${t.GD}</td>
        <td>${t.Pts}</td>
      </tr>
    `).join('');
  }

  function renderMatches(matches, group){
    const wrap = qs('#matchesByRound');
    if(!wrap) return;

    const g = matches.filter(m => m.group === group);

    wrap.innerHTML = g.map(m => {
      const score = isPlayed(m)
        ? `${Number(m.score1)} - ${Number(m.score2)}`
        : '—';

      return `
        <div class="match-row">
          <div>${escapeHTML(m.team1)}</div>
          <div class="score">${score}</div>
          <div>${escapeHTML(m.team2)}</div>
        </div>
      `;
    }).join('');
  }

  async function initGroup(){
    const g = (getParam('g') || 'A').toUpperCase();

    const matches = await loadMatches();

    const standings = computeStandings(matches, g);

    renderStandings(standings);
    renderMatches(matches, g);
  }

  return { initGroup };

})();


// 🔥 حذف أي Service Worker قديم (حل الكاش نهائياً)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
}
