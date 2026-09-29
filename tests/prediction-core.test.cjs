const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'play', 'team-data.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'play', '2026-27-predictions', 'prediction-core.js'), 'utf8'), context);
const teams = context.window.TENTALK_TEAMS;
const core = context.window.TENTALK_PREDICTION_CORE;
const east = teams.filter((team) => team.conference === 'East').sort((a, b) => a.rank - b.rank).map((team) => team.id);
const west = teams.filter((team) => team.conference === 'West').sort((a, b) => a.rank - b.rank).map((team) => team.id);

test('Level 2 defaults follow the user Level 1 order and retain 1,230 wins', () => {
  const customWest = ['sas', 'okc', ...west.filter((id) => id !== 'sas' && id !== 'okc')];
  const wins = core.createRankedWins(teams, east, customWest);
  assert.equal(wins.sas, 64);
  assert.equal(wins.okc, 62);
  assert.equal(Object.values(wins).reduce((sum, value) => sum + value, 0), 1230);
  assert.equal(core.isRankingConsistent(wins, customWest), true);
});

test('lowering first place cascades the same ceiling to lower-ranked teams', () => {
  const customWest = ['sas', 'okc', ...west.filter((id) => id !== 'sas' && id !== 'okc')];
  const wins = core.createRankedWins(teams, east, customWest);
  const result = core.applyRankedWin(wins, customWest, 'sas', 59);
  assert.equal(result.wins.sas, 59);
  assert.equal(result.wins.okc, 59);
  assert.equal(core.maxForTeam(result.wins, customWest, 'okc'), 59);
  assert.equal(core.isRankingConsistent(result.wins, customWest), true);
});

test('a lower-ranked team cannot be raised above the team before it', () => {
  const wins = core.createRankedWins(teams, east, west);
  const result = core.applyRankedWin(wins, west, 'sas', 82);
  assert.equal(result.wins.sas, wins.okc);
  assert.equal(result.wins.okc, wins.okc);
});

test('balance suggestions restore 1,230 without breaking either conference order', () => {
  let wins = core.createRankedWins(teams, east, west);
  wins = core.applyRankedWin(wins, west, 'okc', 59).wins;
  const suggestion = core.buildBalanceSuggestion(wins, east, west, 1230);
  assert.equal(suggestion.complete, true);
  assert.equal(Object.values(suggestion.wins).reduce((sum, value) => sum + value, 0), 1230);
  assert.equal(core.isRankingConsistent(suggestion.wins, east), true);
  assert.equal(core.isRankingConsistent(suggestion.wins, west), true);
});
