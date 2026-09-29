(() => {
  "use strict";
  const teams = window.TENTALK_TEAMS || [];
  const core = window.TENTALK_PREDICTION_CORE;
  const byId = Object.fromEntries(teams.map((team) => [team.id, team]));
  const STORAGE_KEY = "tentalk-2026-27-predictions-v1";
  const VERSION = "2.0.0";
  const TARGET_WINS = 1230;
  const COMMUNITY_API = String(window.TENTALK_COMMUNITY_API || "").trim();
  let draggedId = null;
  let pendingSuggestion = null;
  let community = { counts: { survey: 0, level1: 0, level2: 0 }, averageRank: {}, averageWins: {} };

  const initialRanking = (conference) => teams.filter((team) => team.conference === conference).sort((a, b) => a.rank - b.rank).map((team) => team.id);
  const defaultEast = initialRanking("East");
  const defaultWest = initialRanking("West");
  const freshState = () => ({ east: defaultEast.slice(), west: defaultWest.slice(), wins: core.createRankedWins(teams, defaultEast, defaultWest), reviewed: [], winsRankingSignature: core.rankingSignature(defaultEast, defaultWest), submissionId: null, level1SubmittedAt: null, level2SubmittedAt: null });
  const load = () => { try { return { ...freshState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") }; } catch { return freshState(); } };
  let state = load();
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
  const logo = (team) => `https://cdn.nba.com/logos/nba/${team.nbaId}/primary/L/logo.svg`;
  const validRanking = (ids, conference) => ids.length === 15 && new Set(ids).size === 15 && ids.every((id) => byId[id]?.conference === conference);
  const validateState = () => {
    if (!validRanking(state.east, "East")) state.east = initialRanking("East");
    if (!validRanking(state.west, "West")) state.west = initialRanking("West");
    const signature = core.rankingSignature(state.east, state.west);
    const validWins = state.wins && teams.every((team) => Number.isInteger(state.wins[team.id]) && state.wins[team.id] >= 0 && state.wins[team.id] <= 82);
    const consistentWins = validWins && core.isRankingConsistent(state.wins, state.east) && core.isRankingConsistent(state.wins, state.west);
    if (!consistentWins || state.winsRankingSignature !== signature) {
      state.wins = core.createRankedWins(teams, state.east, state.west);
      state.winsRankingSignature = signature;
      state.reviewed = [];
      state.level2SubmittedAt = null;
    }
    state.reviewed = [...new Set(state.reviewed)].filter((id) => byId[id]);
  };

  function teamRow(team, index, conference) {
    const item = document.createElement("li");
    item.className = "team-rank";
    item.draggable = true;
    item.dataset.id = team.id;
    item.innerHTML = `<span class="rank-no">${index + 1}</span><img class="team-logo" src="${logo(team)}" alt="${escapeHtml(team.name)}標誌" width="38" height="38"><span class="team-name"><strong>${escapeHtml(team.name)}</strong><small>上季：${conference === "East" ? "東" : "西"}岸第${team.rank}｜${team.wins}勝</small></span><span class="rank-actions"><button type="button" data-move="up" aria-label="將${escapeHtml(team.name)}向上移" ${index === 0 ? "disabled" : ""}>↑</button><button type="button" data-move="down" aria-label="將${escapeHtml(team.name)}向下移" ${index === 14 ? "disabled" : ""}>↓</button><button type="button" class="drag-handle" aria-label="拖曳${escapeHtml(team.name)}">⠿</button></span>`;
    return item;
  }

  function renderRanking(conference) {
    const key = conference.toLowerCase();
    const list = q(`#${key}-list`);
    list.replaceChildren(...state[key].map((id, index) => teamRow(byId[id], index, conference)));
  }

  function moveTeam(conference, id, delta) {
    const key = conference.toLowerCase();
    const current = state[key].indexOf(id);
    const next = Math.max(0, Math.min(14, current + delta));
    if (current === next) return;
    state[key].splice(current, 1);
    state[key].splice(next, 0, id);
    save(); renderRanking(conference);
    q(`#${key}-list [data-id="${id}"]`)?.focus();
  }

  function bindRankingList(conference) {
    const key = conference.toLowerCase();
    const list = q(`#${key}-list`);
    list.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-move]");
      if (!button) return;
      moveTeam(conference, button.closest("li").dataset.id, button.dataset.move === "up" ? -1 : 1);
    });
    list.addEventListener("dragstart", (event) => { const item = event.target.closest("li"); if (!item) return; draggedId = item.dataset.id; item.classList.add("is-dragging"); event.dataTransfer.effectAllowed = "move"; });
    list.addEventListener("dragend", () => { draggedId = null; qa(".team-rank", list).forEach((item) => item.classList.remove("is-dragging", "drag-over")); });
    list.addEventListener("dragover", (event) => { event.preventDefault(); const item = event.target.closest("li"); qa(".drag-over", list).forEach((row) => row.classList.remove("drag-over")); item?.classList.add("drag-over"); });
    list.addEventListener("drop", (event) => { event.preventDefault(); const target = event.target.closest("li"); if (!target || !draggedId || draggedId === target.dataset.id) return; const from = state[key].indexOf(draggedId); const to = state[key].indexOf(target.dataset.id); state[key].splice(from, 1); state[key].splice(to, 0, draggedId); save(); renderRanking(conference); });
  }

  const generateId = () => `TT-${Date.now().toString(36).toUpperCase()}-${crypto.getRandomValues(new Uint16Array(1))[0].toString(36).toUpperCase()}`;
  const showSection = (id) => { const section = q(`#${id}`); section.hidden = false; section.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }); };

  function updateCommunityStatus() {
    const level1Count = Number(community.counts?.level1 || 0);
    const level2Count = Number(community.counts?.level2 || 0);
    const surveyCount = Number(community.counts?.survey ?? level1Count);
    qa("[data-survey-count]").forEach((node) => { node.textContent = String(surveyCount); });
    const connection = q("#community-connection");
    if (connection) connection.textContent = COMMUNITY_API ? `Community已連接；現有${surveyCount}份匿名投票。` : "Community後端尚未設定；暫時只會儲存在這部裝置。";
    const levelOneStatus = q("#level-one-community-status");
    if (levelOneStatus) levelOneStatus.innerHTML = level1Count
      ? `<strong>${level1Count}人已投票</strong><br />Community平均已由所有有效Level 1提交即時計算。`
      : "<strong>Community結果收集中</strong><br />第一份真實提交後便會顯示平均。";
    const levelTwoStatus = q("#level-two-community-status");
    if (levelTwoStatus) levelTwoStatus.innerHTML = level2Count
      ? `<strong>${level2Count}人完成Level 2</strong><br />以下顯示這些有效提交的平均勝場。`
      : "<strong>Community平均收集中</strong><br />完成Level 2的第一份真實提交後便會顯示。";
  }

  function loadCommunity() {
    if (!COMMUNITY_API) { updateCommunityStatus(); return Promise.resolve(community); }
    return new Promise((resolve) => {
      const callback = `tentalkCommunity_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const cleanup = () => { delete window[callback]; script.remove(); };
      const timeout = setTimeout(() => { cleanup(); updateCommunityStatus(); resolve(community); }, 8000);
      window[callback] = (payload) => {
        clearTimeout(timeout);
        if (payload?.ok && payload.counts) community = payload;
        cleanup(); updateCommunityStatus();
        if (!q("#level-one-result").hidden) renderLevelOneResult();
        if (!q("#level-two-result").hidden) renderLevelTwoResult();
        resolve(community);
      };
      script.onerror = () => { clearTimeout(timeout); cleanup(); updateCommunityStatus(); resolve(community); };
      script.src = `${COMMUNITY_API}${COMMUNITY_API.includes("?") ? "&" : "?"}callback=${encodeURIComponent(callback)}&_=${Date.now()}`;
      document.head.append(script);
    });
  }

  async function submitCommunity(level) {
    if (!COMMUNITY_API) return false;
    const payload = {
      submissionId: state.submissionId,
      east: state.east,
      west: state.west,
      level1SubmittedAt: state.level1SubmittedAt,
      schemaVersion: VERSION,
    };
    if (level === "level2") {
      payload.wins = state.wins;
      payload.level2SubmittedAt = state.level2SubmittedAt;
    }
    try {
      await fetch(COMMUNITY_API, { method: "POST", mode: "no-cors", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload) });
      setTimeout(loadCommunity, 1200);
      return true;
    } catch {
      const status = q(level === "level1" ? "#level-one-community-status" : "#level-two-community-status");
      if (status) status.innerHTML = "<strong>未能同步Community</strong><br />結果仍已保存在這部裝置，請稍後再試。";
      return false;
    }
  }

  const communityRank = (id) => community.averageRank?.[id];
  const rankingTable = (conference, ids) => `<table class="result-table"><caption>${conference === "East" ? "東岸" : "西岸"}</caption><thead><tr><th scope="col">排名</th><th scope="col">你的預測</th><th scope="col">Community平均</th></tr></thead><tbody>${ids.map((id, index) => `<tr><th scope="row">${index + 1}</th><td>${escapeHtml(byId[id].name)}</td><td>${communityRank(id) == null ? "收集中" : `${Number(communityRank(id)).toFixed(2)}位`}</td></tr>`).join("")}</tbody></table>`;

  function renderLevelOneResult() {
    q("#level-one-tables").innerHTML = rankingTable("East", state.east) + rankingTable("West", state.west);
    const topEast = byId[state.east[0]], topWest = byId[state.west[0]];
    const biggestMoves = [...state.east, ...state.west].map((id) => ({ team: byId[id], predicted: (byId[id].conference === "East" ? state.east : state.west).indexOf(id) + 1 })).map((item) => ({ ...item, change: item.team.rank - item.predicted })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    q("#level-one-observations").innerHTML = `<div class="observation"><strong>你嘅分岸第一</strong>${escapeHtml(topEast.abbr)} · ${escapeHtml(topWest.abbr)}</div><div class="observation"><strong>最大排名調動</strong>${escapeHtml(biggestMoves[0].team.name)} · ${Math.abs(biggestMoves[0].change)}位</div><div class="observation"><strong>Community樣本</strong>${Number(community.counts?.level1 || 0)}票</div>`;
    qa("[data-result-id]").forEach((node) => { node.textContent = `Anonymous ID · ${state.submissionId}`; });
    updateCommunityStatus();
    renderShareButtons("level1");
  }

  function winRow(team, index, ranking) {
    const value = state.wins[team.id];
    const maximum = core.maxForTeam(state.wins, ranking, team.id);
    const row = document.createElement("article");
    row.className = `win-row${value !== team.wins ? " is-changed" : ""}`;
    row.dataset.id = team.id; row.dataset.conference = team.conference;
    row.innerHTML = `<span class="win-rank">${index + 1}</span><img class="team-logo" src="${logo(team)}" alt="${escapeHtml(team.name)}標誌" width="38" height="38"><span class="win-team"><strong>${escapeHtml(team.name)}</strong><small>上季：${team.wins}勝 · 上限${maximum}</small></span><label class="slider-wrap"><span class="skip-link">${escapeHtml(team.name)}預測勝場</span><input type="range" min="0" max="${maximum}" value="${value}" data-slider aria-label="${escapeHtml(team.name)}預測勝場：${value}，上限${maximum}"></label><span class="win-controls"><button type="button" data-win="minus" aria-label="${escapeHtml(team.name)}減一勝" ${value === 0 ? "disabled" : ""}>−</button><button type="button" data-win="plus" aria-label="${escapeHtml(team.name)}加一勝" ${value >= maximum ? "disabled" : ""}>＋</button><button type="button" data-win="reset" aria-label="${escapeHtml(team.name)}回復排名預設勝場">↺</button><strong class="win-value">${value}勝</strong></span>`;
    return row;
  }

  function renderWins() {
    q("#east-win-list").replaceChildren(...state.east.map((id, index) => winRow(byId[id], index, state.east)));
    q("#west-win-list").replaceChildren(...state.west.map((id, index) => winRow(byId[id], index, state.west)));
    updateTotal();
  }

  function updateWin(id, value, reviewed = true) {
    const ranking = byId[id].conference === "East" ? state.east : state.west;
    const result = core.applyRankedWin(state.wins, ranking, id, value);
    state.wins = result.wins;
    if (reviewed) result.changed.forEach((changedId) => { if (!state.reviewed.includes(changedId)) state.reviewed.push(changedId); });
    save();
    renderWins();
  }

  function updateTotal() {
    const total = Object.values(state.wins).reduce((sum, wins) => sum + wins, 0);
    const diff = TARGET_WINS - total;
    q("#wins-total").textContent = total.toLocaleString("en-US");
    const meter = q("#total-meter"); meter.classList.toggle("is-high", diff < 0); meter.classList.toggle("is-balanced", diff === 0);
    q("#wins-balance").textContent = diff === 0 ? "✓ 完美平衡，可以提交！" : diff > 0 ? `△ 尚餘${diff}勝` : `! 多咗${Math.abs(diff)}勝，請從其他球隊扣減`;
    q("#submit-level-two").disabled = diff !== 0;
    q("#reviewed-count").textContent = `${state.reviewed.length} / 30`;
  }

  function suggestBalance() {
    const total = Object.values(state.wins).reduce((sum, wins) => sum + wins, 0), diff = TARGET_WINS - total;
    const box = q("#balance-suggestions");
    if (diff === 0) { box.hidden = false; box.innerHTML = "<strong>已經完美平衡。</strong> 無需再調整。"; return; }
    const suggestion = core.buildBalanceSuggestion(state.wins, state.east, state.west, TARGET_WINS);
    pendingSuggestion = suggestion.complete ? suggestion : null;
    box.hidden = false;
    box.innerHTML = suggestion.complete
      ? `<strong>建議調整（尚未套用）</strong><ul>${suggestion.changes.map((change) => `<li>${escapeHtml(byId[change.id].name)}：${change.from} → ${change.to}勝</li>`).join("")}</ul><button class="button button-small" type="button" id="apply-suggestion">確認套用</button> <button class="button button-outline button-small" type="button" id="cancel-suggestion">取消</button>`
      : "<strong>未能自動平衡</strong> 請先調整較高排名球隊，再重試。";
  }

  function renderLevelTwoResult() {
    const sorted = [...state.east, ...state.west].map((id) => byId[id]);
    const deltas = sorted.map((team) => ({ team, delta: state.wins[team.id] - team.wins }));
    const riser = [...deltas].sort((a, b) => b.delta - a.delta)[0], faller = [...deltas].sort((a, b) => a.delta - b.delta)[0];
    const eastTotal = teams.filter((team) => team.conference === "East").reduce((sum, team) => sum + state.wins[team.id], 0), westTotal = TARGET_WINS - eastTotal;
    q("#level-two-observations").innerHTML = `<div class="observation"><strong>最大升幅</strong>${escapeHtml(riser.team.name)} · ${riser.delta >= 0 ? "+" : ""}${riser.delta}勝</div><div class="observation"><strong>最大跌幅</strong>${escapeHtml(faller.team.name)} · ${faller.delta}勝</div><div class="observation"><strong>50勝球隊</strong>${sorted.filter((team) => state.wins[team.id] >= 50).length}隊</div><div class="observation"><strong>24勝或以下</strong>${sorted.filter((team) => state.wins[team.id] <= 24).length}隊</div><div class="observation"><strong>分岸勝場</strong>東岸${eastTotal} · 西岸${westTotal}</div><div class="observation"><strong>Community樣本</strong>${Number(community.counts?.level2 || 0)}票</div>`;
    const rows = (conference) => (conference === "East" ? state.east : state.west).map((id, index) => { const team = byId[id], average = community.averageWins?.[id]; return `<tr><th scope="row">${index + 1}. ${escapeHtml(team.name)}</th><td>${team.wins}</td><td>${state.wins[id]}</td><td>${average == null ? "收集中" : Number(average).toFixed(1)}</td><td>${state.wins[id] - team.wins > 0 ? "+" : ""}${state.wins[id] - team.wins}</td></tr>`; }).join("");
    const table = (conference) => `<table class="result-table"><caption>${conference === "East" ? "東岸" : "西岸"}</caption><thead><tr><th scope="col">Level 1次序</th><th scope="col">上季</th><th scope="col">你</th><th scope="col">Community平均</th><th scope="col">差距</th></tr></thead><tbody>${rows(conference)}</tbody></table>`;
    q("#level-two-tables").innerHTML = table("East") + table("West");
    updateCommunityStatus();
    renderShareButtons("level2");
  }

  function shareText(level) {
    if (level === "level1") return `我完成咗TenTalk 2026–27 NBA預測挑戰！我排嘅東岸第一係${byId[state.east[0]].name}，西岸第一係${byId[state.west[0]].name}。你又點排？`;
    const top = [...teams].sort((a, b) => state.wins[b.id] - state.wins[a.id])[0];
    return `我將全NBA 1,230場勝仗分配完啦！我最睇好${top.name}（${state.wins[top.id]}勝）。你敢唔敢挑戰30隊勝場？`;
  }
  function renderShareButtons(level) {
    const text = shareText(level), url = location.href.split("#")[0], encoded = encodeURIComponent(`${text} ${url}`);
    const section = q(level === "level1" ? "#level-one-result" : "#level-two-result");
    const row = q("[data-share-row]", section);
    row.dataset.level = level;
    row.innerHTML = `<button type="button" data-share="native">分享結果</button><a href="https://wa.me/?text=${encoded}" target="_blank" rel="noreferrer">WhatsApp</a><a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}" target="_blank" rel="noreferrer">Facebook</a><a href="https://www.threads.net/intent/post?text=${encoded}" target="_blank" rel="noreferrer">Threads</a><button type="button" data-share="copy">複製連結</button><button type="button" data-share="image">儲存結果圖</button>`;
  }
  function saveShareImage(level) {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350; const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#071017"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#ef4c3e"; ctx.fillRect(0, 0, 34, canvas.height); ctx.fillStyle = "#f3eee4"; ctx.font = "700 66px sans-serif"; ctx.fillText("TenTalk 2026–27", 90, 120); ctx.font = "700 88px sans-serif"; ctx.fillText("NBA預測挑戰", 90, 220); ctx.fillStyle = "#f1c96c"; ctx.font = "700 38px sans-serif"; ctx.fillText(level === "level1" ? "我的東西岸 TOP 5" : "我的勝場預測 TOP 5", 90, 305);
    const lists = level === "level1" ? [{ title: "EAST", ids: state.east.slice(0, 5), x: 90 }, { title: "WEST", ids: state.west.slice(0, 5), x: 575 }] : [{ title: "NBA", ids: [...teams].sort((a, b) => state.wins[b.id] - state.wins[a.id]).slice(0, 5).map((team) => team.id), x: 90 }];
    lists.forEach((list) => { ctx.fillStyle = "#a8b2b6"; ctx.font = "700 30px sans-serif"; ctx.fillText(list.title, list.x, 390); list.ids.forEach((id, index) => { ctx.fillStyle = "#f3eee4"; ctx.font = "700 34px sans-serif"; const suffix = level === "level2" ? `  ${state.wins[id]}勝` : ""; ctx.fillText(`${index + 1}. ${byId[id].abbr}${suffix}`, list.x, 460 + index * 76); }); });
    ctx.fillStyle = "#a8b2b6"; ctx.font = "28px sans-serif"; ctx.fillText(`Community現有${Number(community.counts?.survey ?? community.counts?.level1 ?? 0)}份真實投票`, 90, 1050); ctx.fillStyle = "#f3eee4"; ctx.font = "700 30px sans-serif"; ctx.fillText("到 TenTalk 挑戰你嘅排名 →", 90, 1160); ctx.fillStyle = "#ef4c3e"; ctx.fillRect(90, 1205, 360, 8);
    const link = document.createElement("a"); link.download = `tentalk-${level}-result.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }

  validateState(); save(); renderRanking("East"); renderRanking("West"); bindRankingList("East"); bindRankingList("West"); renderWins(); updateCommunityStatus(); loadCommunity();
  if (state.level1SubmittedAt) { renderLevelOneResult(); q("#level-one-result").hidden = false; }
  if (state.level2SubmittedAt) { renderLevelTwoResult(); q("#level-two-result").hidden = false; }
  q("[data-start]").addEventListener("click", () => q("#level-one").scrollIntoView({ behavior: "smooth" }));
  q("#review-ranking").addEventListener("click", () => { if (!validRanking(state.east, "East") || !validRanking(state.west, "West")) { q("#level-one-status").textContent = "排名資料不完整，請重新載入。"; return; } q("#east-review").innerHTML = state.east.map((id) => `<li>${escapeHtml(byId[id].name)}</li>`).join(""); q("#west-review").innerHTML = state.west.map((id) => `<li>${escapeHtml(byId[id].name)}</li>`).join(""); q("#ranking-review").hidden = false; q("#ranking-review").scrollIntoView({ behavior: "smooth", block: "center" }); });
  q("#back-to-ranking").addEventListener("click", () => { q("#ranking-review").hidden = true; q("#level-one-title").scrollIntoView({ behavior: "smooth" }); });
  q("#submit-level-one").addEventListener("click", () => { if (state.level1SubmittedAt && !confirm("你已完成Level 1。確定用目前排名建立新結果？")) return; state.submissionId = state.submissionId || generateId(); state.level1SubmittedAt = new Date().toISOString(); state.level2SubmittedAt = null; state.wins = core.createRankedWins(teams, state.east, state.west); state.winsRankingSignature = core.rankingSignature(state.east, state.west); state.reviewed = []; save(); renderWins(); renderLevelOneResult(); showSection("level-one-result"); submitCommunity("level1"); });
  q("#start-level-two").addEventListener("click", () => { renderWins(); showSection("level-two"); });
  qa("#east-win-list, #west-win-list").forEach((list) => {
    list.addEventListener("input", (event) => { if (event.target.matches("[data-slider]")) updateWin(event.target.closest(".win-row").dataset.id, event.target.value); });
    list.addEventListener("click", (event) => { const button = event.target.closest("button[data-win]"); if (!button) return; const id = button.closest(".win-row").dataset.id; const rankedDefaults = core.createRankedWins(teams, state.east, state.west); updateWin(id, button.dataset.win === "minus" ? state.wins[id] - 1 : button.dataset.win === "plus" ? state.wins[id] + 1 : rankedDefaults[id]); });
  });
  q("#suggest-balance").addEventListener("click", suggestBalance);
  q("#balance-suggestions").addEventListener("click", (event) => { if (event.target.id === "apply-suggestion" && pendingSuggestion) { state.wins = pendingSuggestion.wins; pendingSuggestion.changes.forEach((change) => { if (!state.reviewed.includes(change.id)) state.reviewed.push(change.id); }); save(); renderWins(); q("#balance-suggestions").hidden = true; pendingSuggestion = null; } if (event.target.id === "cancel-suggestion") { q("#balance-suggestions").hidden = true; pendingSuggestion = null; } });
  q("#reset-wins").addEventListener("click", () => { if (!confirm("確定回復全部30隊至按你Level 1次序產生的預設勝場？目前Level 2改動會被清除。")) return; state.wins = core.createRankedWins(teams, state.east, state.west); state.reviewed = []; save(); renderWins(); });
  q("#submit-level-two").addEventListener("click", () => { const values = Object.values(state.wins); const valid = values.length === 30 && values.every((wins) => Number.isInteger(wins) && wins >= 0 && wins <= 82) && values.reduce((sum, wins) => sum + wins, 0) === TARGET_WINS && core.isRankingConsistent(state.wins, state.east) && core.isRankingConsistent(state.wins, state.west); if (!valid) return; if (state.level2SubmittedAt && !confirm("你已完成Level 2。確定覆蓋這部裝置上的Level 2結果？")) return; state.level2SubmittedAt = new Date().toISOString(); save(); renderLevelTwoResult(); showSection("level-two-result"); submitCommunity("level2"); });
  document.addEventListener("click", async (event) => { const button = event.target.closest("button[data-share]"); if (!button) return; const row = button.closest("[data-share-row]"), text = shareText(row.dataset.level), url = location.href.split("#")[0], status = row.nextElementSibling; try { if (button.dataset.share === "native" && navigator.share) await navigator.share({ title: "TenTalk NBA預測挑戰", text, url }); else if (button.dataset.share === "image") { saveShareImage(row.dataset.level); status.textContent = "結果圖已建立。"; } else { await navigator.clipboard.writeText(`${text} ${url}`); status.textContent = "已複製分享文字及連結。"; } } catch (error) { if (error.name !== "AbortError") status.textContent = "未能完成分享，請再試一次。"; } });
  q("#restart-game").addEventListener("click", () => { if (!confirm("確定重新開始？這部裝置上的排名、勝場及完成結果會被清除。")) return; localStorage.removeItem(STORAGE_KEY); location.reload(); });
})();
