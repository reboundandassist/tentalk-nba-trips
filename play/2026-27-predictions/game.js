(() => {
  "use strict";
  const teams = window.TENTALK_TEAMS || [];
  const byId = Object.fromEntries(teams.map((team) => [team.id, team]));
  const STORAGE_KEY = "tentalk-2026-27-predictions-v1";
  const VERSION = "1.0.0";
  const TARGET_WINS = 1230;
  let draggedId = null;
  let activeFilter = "All";
  let pendingSuggestion = null;

  const initialRanking = (conference) => teams.filter((team) => team.conference === conference).sort((a, b) => a.rank - b.rank).map((team) => team.id);
  const initialWins = Object.fromEntries(teams.map((team) => [team.id, team.wins]));
  const freshState = () => ({ east: initialRanking("East"), west: initialRanking("West"), wins: initialWins, reviewed: [], submissionId: null, level1SubmittedAt: null, level2SubmittedAt: null });
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
    const validWins = teams.every((team) => Number.isInteger(state.wins[team.id]) && state.wins[team.id] >= 0 && state.wins[team.id] <= 82);
    if (!validWins) state.wins = initialWins;
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
  const rankingTable = (conference, ids) => `<table class="result-table"><caption>${conference === "East" ? "東岸" : "西岸"}</caption><thead><tr><th scope="col">排名</th><th scope="col">你的預測</th><th scope="col">Community</th></tr></thead><tbody>${ids.map((id, index) => `<tr><th scope="row">${index + 1}</th><td>${escapeHtml(byId[id].name)}</td><td>收集中</td></tr>`).join("")}</tbody></table>`;

  function renderLevelOneResult() {
    q("#level-one-tables").innerHTML = rankingTable("East", state.east) + rankingTable("West", state.west);
    const topEast = byId[state.east[0]], topWest = byId[state.west[0]];
    const biggestMoves = [...state.east, ...state.west].map((id) => ({ team: byId[id], predicted: (byId[id].conference === "East" ? state.east : state.west).indexOf(id) + 1 })).map((item) => ({ ...item, change: item.team.rank - item.predicted })).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    q("#level-one-observations").innerHTML = `<div class="observation"><strong>你嘅分岸第一</strong>${escapeHtml(topEast.abbr)} · ${escapeHtml(topWest.abbr)}</div><div class="observation"><strong>最大排名調動</strong>${escapeHtml(biggestMoves[0].team.name)} · ${Math.abs(biggestMoves[0].change)}位</div><div class="observation"><strong>Community比較</strong>樣本達門檻後顯示</div>`;
    qa("[data-result-id]").forEach((node) => { node.textContent = `Anonymous ID · ${state.submissionId}`; });
    renderShareButtons("level1");
  }

  function winRow(team) {
    const value = state.wins[team.id];
    const row = document.createElement("article");
    row.className = `win-row${value !== team.wins ? " is-changed" : ""}`;
    row.dataset.id = team.id; row.dataset.conference = team.conference;
    row.innerHTML = `<img class="team-logo" src="${logo(team)}" alt="${escapeHtml(team.name)}標誌" width="38" height="38"><span class="win-team"><strong>${escapeHtml(team.name)}</strong><small>上季：${team.wins}勝</small></span><label class="slider-wrap"><span class="skip-link">${escapeHtml(team.name)}預測勝場</span><input type="range" min="0" max="82" value="${value}" data-slider aria-label="${escapeHtml(team.name)}預測勝場：${value}"></label><span class="win-controls"><button type="button" data-win="minus" aria-label="${escapeHtml(team.name)}減一勝">−</button><button type="button" data-win="plus" aria-label="${escapeHtml(team.name)}加一勝">＋</button><button type="button" data-win="reset" aria-label="${escapeHtml(team.name)}回復上季勝場">↺</button><strong class="win-value">${value}勝</strong></span>`;
    row.hidden = activeFilter !== "All" && activeFilter !== team.conference;
    return row;
  }

  function renderWins() {
    const sorted = [...teams].sort((a, b) => b.wins - a.wins || a.rank - b.rank || a.abbr.localeCompare(b.abbr));
    q("#win-list").replaceChildren(...sorted.map(winRow));
    updateTotal();
  }

  function updateWin(id, value, reviewed = true) {
    state.wins[id] = Math.max(0, Math.min(82, Math.round(Number(value))));
    if (reviewed && !state.reviewed.includes(id)) state.reviewed.push(id);
    save();
    const row = q(`#win-list [data-id="${id}"]`);
    if (row) {
      q("[data-slider]", row).value = state.wins[id]; q("[data-slider]", row).setAttribute("aria-label", `${byId[id].name}預測勝場：${state.wins[id]}`); q(".win-value", row).textContent = `${state.wins[id]}勝`; row.classList.toggle("is-changed", state.wins[id] !== byId[id].wins);
    }
    updateTotal();
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
    let remaining = Math.abs(diff);
    const direction = Math.sign(diff);
    const candidates = teams.filter((team) => !state.reviewed.includes(team.id)).concat(teams.filter((team) => state.reviewed.includes(team.id))).filter((team, index, all) => all.findIndex((item) => item.id === team.id) === index);
    const changes = [];
    for (const team of candidates) {
      if (!remaining) break;
      const room = direction > 0 ? 82 - state.wins[team.id] : state.wins[team.id];
      const amount = Math.min(remaining, room, 3);
      if (amount > 0) { changes.push({ id: team.id, from: state.wins[team.id], to: state.wins[team.id] + direction * amount }); remaining -= amount; }
    }
    pendingSuggestion = changes;
    box.hidden = false;
    box.innerHTML = `<strong>建議調整（尚未套用）</strong><ul>${changes.map((change) => `<li>${escapeHtml(byId[change.id].name)}：${change.from} → ${change.to}勝</li>`).join("")}</ul><button class="button button-small" type="button" id="apply-suggestion">確認套用</button> <button class="button button-outline button-small" type="button" id="cancel-suggestion">取消</button>`;
  }

  function renderLevelTwoResult() {
    const sorted = [...teams].sort((a, b) => state.wins[b.id] - state.wins[a.id] || a.abbr.localeCompare(b.abbr));
    const deltas = sorted.map((team) => ({ team, delta: state.wins[team.id] - team.wins }));
    const riser = [...deltas].sort((a, b) => b.delta - a.delta)[0], faller = [...deltas].sort((a, b) => a.delta - b.delta)[0];
    const eastTotal = teams.filter((team) => team.conference === "East").reduce((sum, team) => sum + state.wins[team.id], 0), westTotal = TARGET_WINS - eastTotal;
    q("#level-two-observations").innerHTML = `<div class="observation"><strong>最大升幅</strong>${escapeHtml(riser.team.name)} · ${riser.delta >= 0 ? "+" : ""}${riser.delta}勝</div><div class="observation"><strong>最大跌幅</strong>${escapeHtml(faller.team.name)} · ${faller.delta}勝</div><div class="observation"><strong>50勝球隊</strong>${sorted.filter((team) => state.wins[team.id] >= 50).length}隊</div><div class="observation"><strong>24勝或以下</strong>${sorted.filter((team) => state.wins[team.id] <= 24).length}隊</div><div class="observation"><strong>分岸勝場</strong>東岸${eastTotal} · 西岸${westTotal}</div><div class="observation"><strong>Community比較</strong>樣本達門檻後顯示</div>`;
    const rows = (conference) => sorted.filter((team) => team.conference === conference).map((team) => `<tr><th scope="row">${escapeHtml(team.name)}</th><td>${team.wins}</td><td>${state.wins[team.id]}</td><td>收集中</td><td>${state.wins[team.id] - team.wins > 0 ? "+" : ""}${state.wins[team.id] - team.wins}</td></tr>`).join("");
    const table = (conference) => `<table class="result-table"><caption>${conference === "East" ? "東岸" : "西岸"}</caption><thead><tr><th scope="col">球隊</th><th scope="col">上季</th><th scope="col">你</th><th scope="col">Community</th><th scope="col">差距</th></tr></thead><tbody>${rows(conference)}</tbody></table>`;
    q("#level-two-tables").innerHTML = table("East") + table("West");
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
    ctx.fillStyle = "#a8b2b6"; ctx.font = "28px sans-serif"; ctx.fillText("Community結果會在真實樣本達門檻後顯示", 90, 1050); ctx.fillStyle = "#f3eee4"; ctx.font = "700 30px sans-serif"; ctx.fillText("到 TenTalk 挑戰你嘅排名 →", 90, 1160); ctx.fillStyle = "#ef4c3e"; ctx.fillRect(90, 1205, 360, 8);
    const link = document.createElement("a"); link.download = `tentalk-${level}-result.png`; link.href = canvas.toDataURL("image/png"); link.click();
  }

  validateState(); renderRanking("East"); renderRanking("West"); bindRankingList("East"); bindRankingList("West"); renderWins();
  if (state.level1SubmittedAt) { renderLevelOneResult(); q("#level-one-result").hidden = false; }
  if (state.level2SubmittedAt) { renderLevelTwoResult(); q("#level-two-result").hidden = false; }
  q("[data-start]").addEventListener("click", () => q("#level-one").scrollIntoView({ behavior: "smooth" }));
  q("#review-ranking").addEventListener("click", () => { if (!validRanking(state.east, "East") || !validRanking(state.west, "West")) { q("#level-one-status").textContent = "排名資料不完整，請重新載入。"; return; } q("#east-review").innerHTML = state.east.map((id) => `<li>${escapeHtml(byId[id].name)}</li>`).join(""); q("#west-review").innerHTML = state.west.map((id) => `<li>${escapeHtml(byId[id].name)}</li>`).join(""); q("#ranking-review").hidden = false; q("#ranking-review").scrollIntoView({ behavior: "smooth", block: "center" }); });
  q("#back-to-ranking").addEventListener("click", () => { q("#ranking-review").hidden = true; q("#level-one-title").scrollIntoView({ behavior: "smooth" }); });
  q("#submit-level-one").addEventListener("click", () => { if (state.level1SubmittedAt && !confirm("你已完成Level 1。確定用目前排名建立新結果？")) return; state.submissionId = state.submissionId || generateId(); state.level1SubmittedAt = new Date().toISOString(); save(); renderLevelOneResult(); showSection("level-one-result"); });
  q("#start-level-two").addEventListener("click", () => showSection("level-two"));
  q("#win-list").addEventListener("input", (event) => { if (event.target.matches("[data-slider]")) updateWin(event.target.closest(".win-row").dataset.id, event.target.value); });
  q("#win-list").addEventListener("click", (event) => { const button = event.target.closest("button[data-win]"); if (!button) return; const id = button.closest(".win-row").dataset.id; updateWin(id, button.dataset.win === "minus" ? state.wins[id] - 1 : button.dataset.win === "plus" ? state.wins[id] + 1 : byId[id].wins); });
  qa("[data-filter]").forEach((button) => button.addEventListener("click", () => { activeFilter = button.dataset.filter; qa("[data-filter]").forEach((item) => item.setAttribute("aria-pressed", String(item === button))); qa(".win-row").forEach((row) => { row.hidden = activeFilter !== "All" && row.dataset.conference !== activeFilter; }); }));
  q("#suggest-balance").addEventListener("click", suggestBalance);
  q("#balance-suggestions").addEventListener("click", (event) => { if (event.target.id === "apply-suggestion") { pendingSuggestion?.forEach((change) => updateWin(change.id, change.to, false)); q("#balance-suggestions").hidden = true; pendingSuggestion = null; } if (event.target.id === "cancel-suggestion") { q("#balance-suggestions").hidden = true; pendingSuggestion = null; } });
  q("#reset-wins").addEventListener("click", () => { if (!confirm("確定回復全部30隊至上季勝場？目前Level 2改動會被清除。")) return; state.wins = initialWins; state.reviewed = []; save(); renderWins(); });
  q("#submit-level-two").addEventListener("click", () => { const values = Object.values(state.wins); if (values.length !== 30 || values.some((wins) => !Number.isInteger(wins) || wins < 0 || wins > 82) || values.reduce((sum, wins) => sum + wins, 0) !== TARGET_WINS) return; if (state.level2SubmittedAt && !confirm("你已完成Level 2。確定覆蓋這部裝置上的Level 2結果？")) return; state.level2SubmittedAt = new Date().toISOString(); save(); renderLevelTwoResult(); showSection("level-two-result"); });
  document.addEventListener("click", async (event) => { const button = event.target.closest("button[data-share]"); if (!button) return; const row = button.closest("[data-share-row]"), text = shareText(row.dataset.level), url = location.href.split("#")[0], status = row.nextElementSibling; try { if (button.dataset.share === "native" && navigator.share) await navigator.share({ title: "TenTalk NBA預測挑戰", text, url }); else if (button.dataset.share === "image") { saveShareImage(row.dataset.level); status.textContent = "結果圖已建立。"; } else { await navigator.clipboard.writeText(`${text} ${url}`); status.textContent = "已複製分享文字及連結。"; } } catch (error) { if (error.name !== "AbortError") status.textContent = "未能完成分享，請再試一次。"; } });
  q("#restart-game").addEventListener("click", () => { if (!confirm("確定重新開始？這部裝置上的排名、勝場及完成結果會被清除。")) return; localStorage.removeItem(STORAGE_KEY); location.reload(); });
})();
