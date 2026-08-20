# AltaVista Leads -> Pipedrive

Watches for AltaVista lead emails (subject `AltaVista Client Opportunity...`,
from `altavistasp.com`) and creates a Person + Organization + Deal in
Pipedrive's Phoenix BizDev pipeline, with the extracted lead fields attached
as a note. Runs on a schedule via GitHub Actions.

## Current status

| Part | Status |
|---|---|
| Field parsing (name, company, title, phone, email, address, inquiry) | Done - unit-tested against a real sample AltaVista email |
| Pipedrive person / organization / deal creation, duplicate check, note | Done - logic complete, not yet run against the live API |
| Gmail message fetching | **Placeholder - not implemented** |

The three functions that need real implementations are in
`scripts/altavista-leads.js`:

- `listCandidateMessages(cfg)` - should return an array of Gmail message ids
  matching the subject/sender filter that haven't been labeled processed yet.
- `fetchMessage(cfg, id)` - should return `{ id, from, body, receivedAt }` for
  one message.
- `markMessageProcessed(cfg, id)` - should label the message processed (create
  the label if needed) and mark it read.

Right now `listCandidateMessages` just returns `[]` and logs a TODO, so the
script runs successfully end-to-end but processes nothing until Gmail access
is wired up.

## Setup (works today, without Gmail)

1. Copy `.env.example` to `.env` and fill in the Pipedrive values:
   - `PIPEDRIVE_API_TOKEN` - your Pipedrive API token.
   - `PHOENIX_PIPELINE_ID` - from Pipedrive: Deals > pipeline dropdown > edit
     pipeline > the ID is in the URL.
   - `PHOENIX_STAGE_ID` - optional, omit to use the pipeline's default stage.
2. `npm install` (no dependencies yet, since Gmail's `googleapis` package
   isn't wired in - this just confirms the project installs cleanly).
3. `node scripts/altavista-leads.js` - will log "Found 0 candidate message(s)"
   and exit cleanly. That's expected until Gmail fetching is implemented.

## GitHub Secrets

Repo Settings > Secrets and variables > Actions > New repository secret:

| Secret | Needed now? | Value |
|---|---|---|
| `PIPEDRIVE_API_TOKEN` | Yes | Your Pipedrive API token |
| `PHOENIX_PIPELINE_ID` | Yes | Phoenix BizDev pipeline ID |
| `PHOENIX_STAGE_ID` | No | Optional specific stage |
| `GMAIL_CLIENT_ID` | Not yet | Placeholder until Gmail API is implemented |
| `GMAIL_CLIENT_SECRET` | Not yet | Placeholder until Gmail API is implemented |
| `GMAIL_REFRESH_TOKEN` | Not yet | Placeholder until Gmail API is implemented |

The workflow (`.github/workflows/altavista-leads.yml`) already references all
six - the Gmail ones can be left empty for now, they're just unused env vars
until the placeholder functions are filled in.

## Implementing Gmail API (future work)

When ready to wire this up for real, using the Gmail API with OAuth2 (assumes
this runs against a regular Gmail/Workspace mailbox under your own control,
not a Workspace-admin service account):

1. Google Cloud Console: enable the **Gmail API**, create an OAuth client
   (Application type: Desktop app). Note the Client ID and Client Secret.
2. If the OAuth consent screen is in "Testing" mode, add the target mailbox
   as a test user, or publish the app.
3. Run a one-time local OAuth flow (`google.auth.OAuth2` +
   `access_type: 'offline', prompt: 'consent'`, scope
   `https://www.googleapis.com/auth/gmail.modify`) to get a refresh token.
4. Fill in the three placeholder functions using `googleapis`'s
   `gmail.users.messages.list` / `.get` / `.modify`, and add `googleapis` back
   to `package.json` dependencies.
5. Set the three `GMAIL_*` GitHub Secrets to real values.

## Notes / things I'm not certain about

- Field parsing assumes AltaVista's fixed label order (per Jon: "the email is
  always the same"). If their template changes, a message will land in the
  "could not extract Name or Email" skip path rather than crash.
- No persistent cache - GitHub Actions runners are stateless. Dedup relies on
  the Gmail processed-label (once implemented) plus an existing-open-deal
  check in Pipedrive.
- No dry-run mode yet, and no failure alerting (a failed Actions run only
  shows up if someone checks the Actions tab).
