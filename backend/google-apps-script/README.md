# Community survey backend

This bound Google Apps Script stores one anonymous row per `submission_id` in a private Google Sheet. Re-submission updates the same row, so refreshing or completing Level 2 does not inflate the survey count.

## Deploy

1. Create a private Google Sheet named `TenTalk 2026-27 survey`.
2. Open Extensions → Apps Script and replace `Code.gs` with this folder's `Code.gs`.
3. In Project Settings, enable `appsscript.json` and replace it with this folder's manifest.
4. Deploy → New deployment → Web app. Execute as the owner and allow access to anyone.
5. Copy the `/exec` URL into `play/2026-27-predictions/community-config.js`.
6. Make one real Level 1 submission, then check both the private `Submissions` sheet and the public counter/average.

The sheet must remain private. Only aggregate counts and averages are returned by `doGet`; no names, emails, IP addresses or user-agent strings are collected.
