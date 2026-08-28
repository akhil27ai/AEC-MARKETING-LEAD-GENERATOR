# AltaVista Leads -> Pipedrive

Production worker for converting forwarded AltaVista lead emails into Pipedrive
CRM records.

The worker runs from GitHub Actions every 15 minutes, reads the currently synced
Pipedrive mailbox for `akhil@automationinterns.com`, identifies AltaVista lead
messages, and creates Pipedrive records in this exact order:

1. Find or create Organization.
2. Find or create Person linked to that Organization.
3. Create Deal linked to both.

There is intentionally no Gmail API integration:

- No Google Cloud project.
- No OAuth client.
- No Gmail refresh token.
- No `googleapis` dependency.

## Current Status

- GitHub Actions schedule: `*/15 * * * *`.
- Runtime: Node.js 24 in GitHub Actions.
- Pipedrive domain: `aether`.
- Pipeline: `28` (`Phoenix-BizDev`).
- Stage: `178` (`Qualified`).
- Deal duplicate field: `AltaVista Intake Key`.
- Deal duplicate field API key: `78247fb086fa8f461048aebecef5ed0e65ec436c`.
- Required GitHub secret: `PIPEDRIVE_API_TOKEN`.
- Last verified workflow run: success on commit `57cacb4`.

## How It Works

The worker uses Pipedrive's Mailbox API as the only email source. If the mailbox
changes later, connect the replacement mailbox to the same Pipedrive user; no
code change is required.

For each run, the worker:

1. Lists inbox mail threads from Pipedrive.
2. Fetches the individual messages inside each thread.
3. Matches AltaVista messages by trusted sender or by normalized subject plus
   body markers, while still requiring expected field labels.
4. Extracts lead fields from the message body.
5. Checks the `AltaVista Intake Key` custom deal field for duplicates.
6. Creates or reuses CRM records in Pipedrive.
7. Links the original Pipedrive email conversation to the deal.
8. Shares the matched conversation with the team, marks it read, and archives it
   after successful processing.

Non-matching conversations are not shared or archived by the worker.

## AltaVista Matching Rules

A message is treated as an AltaVista lead only when the parsed body contains the
required fields `Name:`, `Email:`, and `Inquiry:` plus one of these source
signals:

- The message is from or forwarded from `mward@altavistasp.com`.
- The subject matches `ALTAVISTA_SUBJECT_MATCH` after normalizing common
  prefixes such as `Fwd:`, `FW:`, and `Re:`, and the body contains an AltaVista
  marker such as `AltaVista`, `Alta Vista`, or `altavistasp.com`.

Discussion threads that merely mention AltaVista or Panera are inspected but
skipped because they do not contain the required lead fields.

Matching happens per message, not per Pipedrive conversation, because one
conversation can contain multiple forwarded emails.

## Duplicate Protection

The worker creates a stable intake key from normalized AltaVista lead content and
stores it in the `AltaVista Intake Key` custom deal field. Before creating a new
deal, it searches that field through Pipedrive API v2.

This prevents duplicate deals even when:

- The same AltaVista email is forwarded again.
- A Pipedrive conversation changes.
- The synced mailbox is replaced later.

## Configuration

Keep configuration limited to these values:

| Name | Source | Purpose |
|---|---|---|
| `PIPEDRIVE_API_TOKEN` | GitHub secret / local `.env` | Pipedrive API token |
| `PIPEDRIVE_DOMAIN` | Workflow / local `.env` | Pipedrive company domain |
| `PIPEDRIVE_PIPELINE_ID` | Workflow / local `.env` | Pipeline for new deals |
| `PIPEDRIVE_STAGE_ID` | Workflow / local `.env` | Stage for new deals |
| `ALTAVISTA_INTAKE_KEY_FIELD` | Workflow / local `.env` | Deal custom field API key |
| `ALTAVISTA_SUBJECT_MATCH` | Workflow / local `.env` | Normalized subject target |
| `ALTAVISTA_MAX_AGE_HOURS` | Workflow / local `.env` | Maximum message age to process |
| `ALTAVISTA_BATCH_SIZE` | Workflow / local `.env` | Inbox thread batch size per run |

The local `.env` file is ignored by Git and should contain the real token for
local testing. GitHub Actions uses the repository secret `PIPEDRIVE_API_TOKEN`.

## GitHub Actions

Workflow file: `.github/workflows/altavista-leads.yml`

The workflow:

- Runs every 15 minutes.
- Supports manual `workflow_dispatch`.
- Uses `actions/checkout@v6`.
- Uses `actions/setup-node@v7`.
- Runs Node.js `24`.
- Installs with `npm install`.
- Starts the worker with `node scripts/altavista-leads.js`.

## Running Locally

```sh
npm install
npm start
```

The project has no runtime package dependencies.

## Verification

Useful checks:

```sh
node --check scripts/altavista-leads.js
npm start
gh run list --workflow altavista-leads.yml --limit 5
```

Expected successful no-match output:

```text
Run finished: 0 AltaVista message(s) matched, 0 processed
```
