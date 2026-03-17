const CupApp = (function(){
  "use strict";

  const MATCHES_CSV = "matches.csv";
  const STANDINGS_CSV = "data/standings.csv";
  const STATS_CSV = "data/stats.csv";
  const TEAMS_CSV = "data/teams.csv";
  const PLAYERS_CSV = "data/players.csv";
  const NEWS_CSV = "data/news.csv";
  const AWARDS_JSON = "awards.json";
  const STAFF_JSON = "staff.json";

  function $(sel, root=document){ return root.querySelector(sel); }
  function $all(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }

  async function fetchText(url){
    const res = await fetch(url, { cache: "no-store" });
    if(!res.ok) throw new Error(`Fetch failed: ${url}`);
    return await res.text();
  }

  function csvToRows(csv){
    const rows = [];
    let row = [];
    let cur = "";
    let i = 0;
    let inQuotes = false;

    while(i < csv.length){
      const ch = csv[i];

      if(inQuotes){
        if(ch === '"'){
          if(csv[i+1] === '"'){
            cur += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        cur += ch;
        i++;
        continue;
      }

      if(ch === '"'){
        inQuotes = true;
        i++;
        continue;
      }

      if(ch === ","){
        row.push(cur);
        cur = "";
        i++;
        continue;
      }

      if(ch === "\n"){
        row.push(cur);
        rows.push(row);
        row = [];
        cur = "";
        i++;
        continue;
      }

      if(ch === "\r"){
        i++;
        continue;
      }

      cur += ch;
      i++;
    }

    if(cur.length || row.length){
      row.push(cur);
      rows.push(row);
    }

    return rows;
  }

  function parseCSV(csv){
    const rows = csvToRows(csv);
    if(!rows.length) return [];
    const headers = rows[0].map(h => h.trim());
    return rows.slice(1).filter(r => r.some(c => String(c).trim() !== "")).map(r => {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = (r[idx] ?? "").trim());
      return obj;
    });
  }

  function normalizeYouTubeUrl(url){
    if(!url) return "";
    url = url.trim();
    if(url.includes("youtube.com/watch?v=")) return url.replace("watch?v=","embed/");
    if(url.includes("youtube.com/live/")) return url.replace("live/","embed/");
    if(url.includes("youtu.be/")) return url.replace("youtu.be/","youtube.com/embed/");
    return url;
  }

  function formatScoreValue(v){
    const s = String(v ?? "").trim();
    if(s === "") return "";
    if(/^[-+]?\d+(?:\.0+)?$/.test(s)){
      return String(parseInt(s, 10));
    }
    return s;
  }

  function formatMatchCode(code){
    const s = String(code ?? "").trim();
    if(!s) return "";
    return s.replace(/^([A-Za-z]+)0+(\d+)$/i, (_, p1, p2) => `${p1.toUpperCase()}${parseInt(p2, 10)}`);
  }

  function getQueryParam(name){
    const params = new URLSearchParams(location.search);
    return params.get(name);
  }

  function stageLabel(code){
    const map = {
      A:"المجموعة A",
      B:"المجموعة B",
      C:"المجموعة C",
      D:"المجموعة D",
      QF:"ربع النهائي",
      SF:"نصف النهائي",
      TP:"المركز الثالث والرابع",
      F:"النهائي"
    };
    return map[code] || code;
  }

  function byMatchCode(a,b){
    const ax = (a.match_code || "").toUpperCase();
    const bx = (b.match_code || "").toUpperCase();
    return ax.localeCompare(bx, "en", { numeric:true });
  }

  async function loadMatches(){
    const csv = await fetchText(MATCHES_CSV);
    const rows = parseCSV(csv);

    return rows.map(m => ({
      match_code: formatMatchCode(m.match_code || m.code || ""),
      group: (m.group || "").toUpperCase(),
      round: m.round || "",
      date: m.date || "",
      time: m.time || "",
      team1: m.team1 || "",
      team2: m.team2 || "",
      score1: formatScoreValue(m.score1 || ""),
      score2: formatScoreValue(m.score2 || ""),
      referee1: m.referee1 || "",
      referee2: m.referee2 || "",
      commentator: m.commentator || "",
      player_of_match: m.player_of_match || "",
      goals_team1: m.goals_team1 || "",
      goals_team2: m.goals_team2 || "",
      var_team1: m.var_team1 || "",
      var_team2: m.var_team2 || "",
      yellow_team1: m.yellow_team1 || "",
      red_team1: m.red_team1 || "",
      yellow_team2: m.yellow_team2 || "",
      red_team2: m.red_team2 || "",
      var1_team: m.var1_team || "",
      var1_type: m.var1_type || "",
      var1_result: m.var1_result || "",
      var2_team: m.var2_team || "",
      var2_type: m.var2_type || "",
      var2_result: m.var2_result || "",
      var3_team: m.var3_team || "",
      var3_type: m.var3_type || "",
      var3_result: m.var3_result || "",
      var4_team: m.var4_team || "",
      var4_type: m.var4_type || "",
      var4_result: m.var4_result || "",
      scorers_team1: m.scorers_team1 || "",
      scorers_team2: m.scorers_team2 || "",
      var_used: m.var_used || "",
      var_for: m.var_for || "",
      var_type: m.var_type || "",
      var_result: m.var_result || "",
      pom_team: m.pom_team || "",
      video_url: normalizeYouTubeUrl(m.video_url || "")
    }));
  }

  async function loadStandings(){
    const csv = await fetchText(STANDINGS_CSV);
    return parseCSV(csv).map(r => ({
      group: (r.group || "").toUpperCase(),
      rank: r.rank || "",
      team: r.team || "",
      p: r.p || "",
      w: r.w || "",
      d: r.d || "",
      l: r.l || "",
      gf: r.gf || "",
      ga: r.ga || "",
      gd: r.gd || "",
      pts: r.pts || ""
    }));
  }

  function buildGroupStandings(matches, groupCode){
    const teams = new Map();

    function ensure(name){
      if(!teams.has(name)){
        teams.set(name, {
          team:name, p:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0
        });
      }
      return teams.get(name);
    }

    matches.filter(m => (m.group || "").toUpperCase() === groupCode.toUpperCase()).forEach(m => {
      const t1 = ensure(m.team1);
      const t2 = ensure(m.team2);

      const s1 = Number(m.score1 || 0);
      const s2 = Number(m.score2 || 0);

      t1.p += 1; t2.p += 1;
      t1.gf += s1; t1.ga += s2;
      t2.gf += s2; t2.ga += s1;

      if(s1 > s2){
        t1.w += 1; t2.l += 1;
        t1.pts += 3;
      } else if(s2 > s1){
        t2.w += 1; t1.l += 1;
        t2.pts += 3;
      } else {
        t1.d += 1; t2.d += 1;
        t1.pts += 1; t2.pts += 1;
      }
    });

    const arr = Array.from(teams.values()).map(t => ({ ...t, gd: t.gf - t.ga }));
    arr.sort((a,b) => {
      if(Number(b.pts) !== Number(a.pts)) return Number(b.pts) - Number(a.pts);
      if(Number(b.gd) !== Number(a.gd)) return Number(b.gd) - Number(a.gd);
      if(Number(b.gf) !== Number(a.gf)) return Number(b.gf) - Number(a.gf);
      return a.team.localeCompare(b.team, "ar");
    });

    return arr.map((r, idx) => ({ rank: idx+1, ...r }));
  }

  function fillGroupTable(container, rows){
    if(!container) return;
    container.innerHTML = "";

    if(!rows.length){
      container.innerHTML = `
        <tr>
          <td colspan="10" class="muted">لا توجد فرق في هذه المجموعة حالياً.</td>
        </tr>
      `;
      return;
    }

    rows.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.rank}</td>
        <td>${r.team}</td>
        <td>${r.p}</td>
        <td>${r.w}</td>
        <td>${r.d}</td>
        <td>${r.l}</td>
        <td>${r.gf}</td>
        <td>${r.ga}</td>
        <td>${r.gd}</td>
        <td>${r.pts}</td>
      `;
      container.appendChild(tr);
    });
  }

  function renderGroupMatches(container, rows){
    if(!container) return;
    container.innerHTML = "";

    const list = rows.slice().sort(byMatchCode);

    if(!list.length){
      container.innerHTML = `<div class="muted">لا توجد مباريات مسجلة لهذه المجموعة حالياً.</div>`;
      return;
    }

    list.forEach(m => {
      const card = document.createElement("article");
      card.className = "match-card";

      card.innerHTML = `
        <div class="match-card__left">
          <a class="match-card__video" href="match.html?code=${encodeURIComponent(m.match_code)}">🎥<span>تفاصيل الفيديو</span></a>
        </div>

        <div class="match-card__center">
          <div class="team team--away">${m.team2}</div>
          <div class="score">${m.score1} - ${m.score2}</div>
          <div class="team team--home">${m.team1}</div>
        </div>

        <div class="match-card__right">
          <div class="round-badge">${m.match_code}</div>
          <div class="date-badge">${m.date}<br>${m.time}</div>
          <div class="meta">حكم: ${m.referee1 || "—"} / ${m.referee2 || "—"} • أفضل لاعب: ${m.player_of_match || "—"}</div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  function renderKnockoutSection(container, title, rows){
    if(!container) return;
    const sec = document.createElement("section");
    sec.className = "card";

    sec.innerHTML = `
      <div class="card-h">
        <h2>${title}</h2>
        <div class="badge">${rows.length}</div>
      </div>
      <div class="card-b">
        <div class="matches-grid"></div>
      </div>
    `;

    const grid = $(".matches-grid", sec);

    rows.slice().sort(byMatchCode).forEach(m => {
      const item = document.createElement("article");
      item.className = "ko-match";

      item.innerHTML = `
        <div class="ko-meta">
          <div class="ko-code">${m.match_code}</div>
          <div class="ko-time">${m.time}</div>
          <div class="ko-date">${m.date}</div>
        </div>
        <div class="ko-main">
          <div class="team team--home">${m.team1}</div>
          <div class="score">${m.score1} : ${m.score2}</div>
          <div class="team team--away">${m.team2}</div>
        </div>
      `;

      grid.appendChild(item);
    });

    container.appendChild(sec);
  }

  function renderStatsTable(container, rows){
    if(!container) return;
    container.innerHTML = "";

    rows.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${r.player || ""}</td>
        <td>${r.team || ""}</td>
        <td>${r.goals || ""}</td>
        <td>${r.yellow || ""}</td>
        <td>${r.red || ""}</td>
      `;
      container.appendChild(tr);
    });
  }

  async function loadStats(){
    const csv = await fetchText(STATS_CSV);
    return parseCSV(csv);
  }

  async function loadTeams(){
    const csv = await fetchText(TEAMS_CSV);
    return parseCSV(csv);
  }

  async function loadPlayers(){
    const csv = await fetchText(PLAYERS_CSV);
    return parseCSV(csv);
  }

  async function loadAwards(){
    const res = await fetch(AWARDS_JSON, { cache:"no-store" });
    return await res.json();
  }

  async function loadStaff(){
    const res = await fetch(STAFF_JSON, { cache:"no-store" });
    return await res.json();
  }

  async function loadNews(){
    try{
      const csv = await fetchText(NEWS_CSV);
      return parseCSV(csv);
    }catch(err){
      return [];
    }
  }

  async function initGroup(){
    const groupCode = (getQueryParam("g") || "A").toUpperCase();
    const sub = $("#pageSub");
    if(sub) sub.textContent = `المجموعة ${groupCode}`;

    const matches = await loadMatches();
    const standings = buildGroupStandings(matches, groupCode);
    fillGroupTable($("#standings-body"), standings);
    renderGroupMatches($("#group-matches"), matches.filter(m => (m.group || "").toUpperCase() === groupCode));
  }

  async function initGroupsAll(){
    const matches = await loadMatches();
    ["A","B","C","D"].forEach(groupCode => {
      fillGroupTable($(`#standings-${groupCode}`), buildGroupStandings(matches, groupCode));
    });
  }

  async function initKnockout(){
    const wrap = $("#knockout-sections");
    if(!wrap) return;

    const matches = await loadMatches();

    renderKnockoutSection(wrap, "ربع النهائي", matches.filter(m => m.group === "QF"));
    renderKnockoutSection(wrap, "نصف النهائي", matches.filter(m => m.group === "SF"));
    renderKnockoutSection(wrap, "الثالث والرابع", matches.filter(m => m.group === "TP"));
    renderKnockoutSection(wrap, "النهائي", matches.filter(m => m.group === "F"));
  }

  async function initMatch(){
    const code = formatMatchCode(getQueryParam("code") || "");
    const matches = await loadMatches();
    const match = matches.find(m => formatMatchCode(m.match_code) === code);

    if(!match){
      const box = $("#match-view");
      if(box) box.innerHTML = `<div class="muted">المباراة غير موجودة.</div>`;
      return;
    }

    const title = $("#pageSub");
    if(title) title.textContent = match.match_code;

    const box = $("#match-view");
    if(!box) return;

    box.innerHTML = `
      <section class="card">
        <div class="card-h">
          <h2>${stageLabel(match.group)}</h2>
          <div class="badge">${match.match_code}</div>
        </div>
        <div class="card-b">
          <div class="match-main-detail">
            <div class="team-detail">${match.team1}</div>
            <div class="score-large">${match.score1} : ${match.score2}</div>
            <div class="team-detail">${match.team2}</div>
          </div>

          <div class="match-meta-detail">
            <div><strong>التاريخ:</strong> ${match.date || "—"}</div>
            <div><strong>الوقت:</strong> ${match.time || "—"}</div>
            <div><strong>الحكم الأول:</strong> ${match.referee1 || "—"}</div>
            <div><strong>الحكم الثاني:</strong> ${match.referee2 || "—"}</div>
            <div><strong>المعلق:</strong> ${match.commentator || "—"}</div>
            <div><strong>أفضل لاعب:</strong> ${match.player_of_match || "—"}</div>
          </div>

          <div class="detail-grid">
            <div class="detail-box">
              <h3>أهداف ${match.team1}</h3>
              <p>${match.goals_team1 || match.scorers_team1 || "لا يوجد"}</p>
            </div>
            <div class="detail-box">
              <h3>أهداف ${match.team2}</h3>
              <p>${match.goals_team2 || match.scorers_team2 || "لا يوجد"}</p>
            </div>
            <div class="detail-box">
              <h3>بطاقات ${match.team1}</h3>
              <p>صفراء: ${match.yellow_team1 || "0"}<br>حمراء: ${match.red_team1 || "0"}</p>
            </div>
            <div class="detail-box">
              <h3>بطاقات ${match.team2}</h3>
              <p>صفراء: ${match.yellow_team2 || "0"}<br>حمراء: ${match.red_team2 || "0"}</p>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  async function initIndex(){
    const news = await loadNews();
    const box = $("#news-list");
    if(box && news.length){
      box.innerHTML = "";
      news.forEach(item => {
        const row = document.createElement("div");
        row.className = "news-row";
        row.innerHTML = `
          <div class="news-cover"><div class="news-date-badge">${item.date || ""}</div></div>
          <div class="news-info">
            <h3>${item.title || ""}</h3>
            <p>${item.summary || ""}</p>
          </div>
          <a class="btn-home" href="${item.link || "#"}">قراءة النشرة</a>
        `;
        box.appendChild(row);
      });
    }
  }

  async function initStats(){
    const rows = await loadStats();
    renderStatsTable($("#stats-body"), rows);
  }

  async function initAwards(){
    const awards = await loadAwards();
    const box = $("#awards-view");
    if(!box) return;
    box.innerHTML = "";
    (awards || []).forEach(a => {
      const card = document.createElement("article");
      card.className = "award-card";
      card.innerHTML = `
        <h3>${a.title || ""}</h3>
        <p>${a.player || ""}</p>
        <div class="muted">${a.team || ""}</div>
      `;
      box.appendChild(card);
    });
  }

  async function initTeams(){
    const rows = await loadTeams();
    const box = $("#teams-grid");
    if(!box) return;
    box.innerHTML = "";
    rows.forEach(r => {
      const card = document.createElement("article");
      card.className = "team-card";
      card.innerHTML = `
        <h3>${r.name || ""}</h3>
        <div class="muted">${r.group || ""}</div>
      `;
      box.appendChild(card);
    });
  }

  async function initPlayers(){
    const rows = await loadPlayers();
    const box = $("#players-grid");
    if(!box) return;
    box.innerHTML = "";
    rows.forEach(r => {
      const card = document.createElement("article");
      card.className = "player-card";
      card.innerHTML = `
        <h3>${r.name || ""}</h3>
        <div class="muted">${r.team || ""}</div>
      `;
      box.appendChild(card);
    });
  }

  async function initStaff(){
    const rows = await loadStaff();
    const box = $("#staff-grid");
    if(!box) return;
    box.innerHTML = "";
    (rows || []).forEach(r => {
      const card = document.createElement("article");
      card.className = "staff-card";
      card.innerHTML = `
        <h3>${r.name || ""}</h3>
        <div class="muted">${r.role || ""}</div>
      `;
      box.appendChild(card);
    });
  }

  return {
    initIndex,
    initGroup,
    initGroupsAll,
    initKnockout,
    initMatch,
    initStats,
    initAwards,
    initTeams,
    initPlayers,
    initStaff
  };
})();
