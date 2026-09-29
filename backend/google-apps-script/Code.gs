const SHEET_NAME = 'Submissions';
const HEADERS = [
  'submission_id', 'created_at', 'updated_at', 'east_json', 'west_json',
  'wins_json', 'level1_submitted_at', 'level2_submitted_at', 'schema_version'
];

const TEAMS = {
  East: ['det','bos','nyk','cle','tor','atl','phi','orl','cha','mia','mil','chi','bkn','ind','was'],
  West: ['okc','sas','den','lal','hou','min','phx','por','lac','gsw','nop','dal','mem','uta','sac']
};
const ALL_TEAM_IDS = TEAMS.East.concat(TEAMS.West);

function doGet(event) {
  const payload = JSON.stringify(buildCommunityPayload_());
  const callback = event && event.parameter && event.parameter.callback;
  if (callback && /^[A-Za-z_$][\w$]{0,63}$/.test(callback)) {
    return ContentService.createTextOutput(callback + '(' + payload + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(payload).setMimeType(ContentService.MimeType.JSON);
}

function doPost(event) {
  try {
    const payload = JSON.parse((event.postData && event.postData.contents) || '{}');
    const clean = validatePayload_(payload);
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      upsertSubmission_(clean);
    } finally {
      lock.releaseLock();
    }
    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error.message || error) });
  }
}

function validatePayload_(payload) {
  if (!payload || !/^TT-[A-Z0-9-]{6,80}$/.test(String(payload.submissionId || ''))) {
    throw new Error('Invalid submission ID');
  }
  if (!validRanking_(payload.east, 'East') || !validRanking_(payload.west, 'West')) {
    throw new Error('Invalid conference ranking');
  }
  const clean = {
    submissionId: String(payload.submissionId),
    east: payload.east.slice(),
    west: payload.west.slice(),
    level1SubmittedAt: validDate_(payload.level1SubmittedAt),
    schemaVersion: String(payload.schemaVersion || '2.0.0')
  };
  if (!clean.level1SubmittedAt) throw new Error('Missing Level 1 timestamp');

  if (payload.wins != null) {
    const wins = {};
    ALL_TEAM_IDS.forEach((id) => {
      const value = Number(payload.wins[id]);
      if (!Number.isInteger(value) || value < 0 || value > 82) throw new Error('Invalid wins');
      wins[id] = value;
    });
    if (Object.values(wins).reduce((sum, value) => sum + value, 0) !== 1230) {
      throw new Error('Wins must total 1230');
    }
    if (!consistent_(wins, clean.east) || !consistent_(wins, clean.west)) {
      throw new Error('Wins do not match Level 1 ranking');
    }
    clean.wins = wins;
    clean.level2SubmittedAt = validDate_(payload.level2SubmittedAt);
    if (!clean.level2SubmittedAt) throw new Error('Missing Level 2 timestamp');
  }
  return clean;
}

function validRanking_(ranking, conference) {
  return Array.isArray(ranking) && ranking.length === 15 &&
    new Set(ranking).size === 15 && ranking.every((id) => TEAMS[conference].indexOf(id) !== -1);
}

function consistent_(wins, ranking) {
  return ranking.every((id, index) => index === 0 || wins[ranking[index - 1]] >= wins[id]);
}

function validDate_(value) {
  const date = new Date(value);
  return value && !isNaN(date.getTime()) ? date.toISOString() : '';
}

function getSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);
  return sheet;
}

function upsertSubmission_(submission) {
  const sheet = getSheet_();
  const rows = sheet.getDataRange().getValues();
  let rowNumber = 0;
  for (let index = 1; index < rows.length; index += 1) {
    if (rows[index][0] === submission.submissionId) { rowNumber = index + 1; break; }
  }
  const now = new Date().toISOString();
  const existing = rowNumber ? rows[rowNumber - 1] : null;
  const row = [
    submission.submissionId,
    existing ? existing[1] : now,
    now,
    JSON.stringify(submission.east),
    JSON.stringify(submission.west),
    submission.wins ? JSON.stringify(submission.wins) : (existing ? existing[5] : ''),
    submission.level1SubmittedAt,
    submission.level2SubmittedAt || (existing ? existing[7] : ''),
    submission.schemaVersion
  ];
  if (rowNumber) sheet.getRange(rowNumber, 1, 1, HEADERS.length).setValues([row]);
  else sheet.appendRow(row);
}

function buildCommunityPayload_() {
  const rows = getSheet_().getDataRange().getValues().slice(1);
  const rankSums = Object.fromEntries(ALL_TEAM_IDS.map((id) => [id, 0]));
  const winSums = Object.fromEntries(ALL_TEAM_IDS.map((id) => [id, 0]));
  let level1Count = 0;
  let level2Count = 0;
  let surveyCount = 0;

  rows.forEach((row) => {
    try {
      let validLevel1 = false;
      let validLevel2 = false;

      if (row[3] && row[4]) {
        const east = JSON.parse(row[3]);
        const west = JSON.parse(row[4]);
        if (validRanking_(east, 'East') && validRanking_(west, 'West')) {
          validLevel1 = true;
          level1Count += 1;
          east.concat(west).forEach((id) => {
            const ranking = TEAMS.East.indexOf(id) !== -1 ? east : west;
            rankSums[id] += ranking.indexOf(id) + 1;
          });
        }
      }

      if (row[5]) {
        const wins = JSON.parse(row[5]);
        const hasEveryTeam = ALL_TEAM_IDS.every((id) => Number.isInteger(Number(wins[id])));
        const totalWins = ALL_TEAM_IDS.reduce((sum, id) => sum + Number(wins[id]), 0);
        if (hasEveryTeam && totalWins === 1230) {
          validLevel2 = true;
          level2Count += 1;
          ALL_TEAM_IDS.forEach((id) => { winSums[id] += Number(wins[id]); });
        }
      }

      if (validLevel1 || validLevel2) surveyCount += 1;
    } catch (error) {
      // Ignore malformed historical rows instead of corrupting public aggregates.
    }
  });

  return {
    ok: true,
    counts: { survey: surveyCount, level1: level1Count, level2: level2Count },
    averageRank: averageMap_(rankSums, level1Count, 2),
    averageWins: averageMap_(winSums, level2Count, 1),
    updatedAt: new Date().toISOString()
  };
}

function averageMap_(sums, count, decimals) {
  if (!count) return {};
  return Object.fromEntries(Object.keys(sums).map((id) => [id, Number((sums[id] / count).toFixed(decimals))]));
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}
