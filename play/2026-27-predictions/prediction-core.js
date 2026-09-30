(() => {
  "use strict";

  const clampWin = (value) => Math.max(0, Math.min(82, Math.round(Number(value))));

  function rankComparison(userRank, communityRank) {
    if (userRank == null || communityRank == null || userRank === "" || communityRank === "") return null;
    const user = Number(userRank);
    const community = Number(communityRank);
    if (!Number.isFinite(user) || !Number.isFinite(community)) return null;
    const gap = Math.abs(user - community);
    if (gap <= 0.75) return { gap, key: "very-close", label: "非常接近" };
    if (gap <= 2) return { gap, key: "close", label: "接近" };
    if (gap <= 4) return { gap, key: "far", label: "有分歧" };
    return { gap, key: "very-far", label: "最大分歧" };
  }

  function rankingSignature(east, west) {
    return `${east.join(",")}|${west.join(",")}`;
  }

  function createRankedWins(teams, east, west) {
    const wins = {};
    for (const [conference, ranking] of [["East", east], ["West", west]]) {
      const pool = teams
        .filter((team) => team.conference === conference)
        .map((team) => team.wins)
        .sort((a, b) => b - a);
      ranking.forEach((id, index) => { wins[id] = pool[index]; });
    }
    return wins;
  }

  function isRankingConsistent(wins, ranking) {
    return ranking.every((id, index) => {
      const value = wins[id];
      return Number.isInteger(value) && value >= 0 && value <= 82 && (index === 0 || wins[ranking[index - 1]] >= value);
    });
  }

  function maxForTeam(wins, ranking, id) {
    const index = ranking.indexOf(id);
    return index <= 0 ? 82 : wins[ranking[index - 1]];
  }

  function applyRankedWin(wins, ranking, id, requestedValue) {
    const index = ranking.indexOf(id);
    if (index < 0) return { wins: { ...wins }, changed: [] };
    const nextWins = { ...wins };
    nextWins[id] = Math.min(clampWin(requestedValue), maxForTeam(nextWins, ranking, id));
    for (let cursor = index + 1; cursor < ranking.length; cursor += 1) {
      const previousId = ranking[cursor - 1];
      const currentId = ranking[cursor];
      if (nextWins[currentId] <= nextWins[previousId]) break;
      nextWins[currentId] = nextWins[previousId];
    }
    const changed = ranking.filter((teamId) => nextWins[teamId] !== wins[teamId]);
    return { wins: nextWins, changed };
  }

  function buildBalanceSuggestion(wins, east, west, target) {
    const original = { ...wins };
    const nextWins = { ...wins };
    let diff = target - Object.values(nextWins).reduce((sum, value) => sum + value, 0);
    const rankings = [east, west];

    if (diff > 0) {
      const candidates = rankings.flatMap((ranking) => ranking);
      while (diff > 0) {
        let progressed = false;
        for (const id of candidates) {
          const ranking = east.includes(id) ? east : west;
          const room = maxForTeam(nextWins, ranking, id) - nextWins[id];
          const alreadySuggested = nextWins[id] - original[id];
          if (room > 0 && alreadySuggested < 3) {
            nextWins[id] += 1;
            diff -= 1;
            progressed = true;
            if (diff === 0) break;
          }
        }
        if (!progressed) break;
      }
    } else if (diff < 0) {
      const candidates = rankings.flatMap((ranking) => [...ranking].reverse());
      while (diff < 0) {
        let progressed = false;
        for (const id of candidates) {
          const alreadySuggested = original[id] - nextWins[id];
          if (nextWins[id] > 0 && alreadySuggested < 3) {
            nextWins[id] -= 1;
            diff += 1;
            progressed = true;
            if (diff === 0) break;
          }
        }
        if (!progressed) break;
      }
    }

    return {
      complete: diff === 0,
      wins: nextWins,
      changes: Object.keys(nextWins)
        .filter((id) => nextWins[id] !== original[id])
        .map((id) => ({ id, from: original[id], to: nextWins[id] })),
    };
  }

  window.TENTALK_PREDICTION_CORE = {
    applyRankedWin,
    buildBalanceSuggestion,
    createRankedWins,
    isRankingConsistent,
    maxForTeam,
    rankComparison,
    rankingSignature,
  };
})();
