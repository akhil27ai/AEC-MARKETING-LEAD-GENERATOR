# AltaVista Leads -> Pipedrive

Runs a Node.js worker every 15 minutes from GitHub Actions. The worker reads
the currently synced Pipedrive mailbox for `akhil@automationinterns.com`,
identifies forwarded AltaVista lead messages, and creates CRM records in this
order:

1. Find or create Organization.
2. Find or create Person linked to that Organization.
3. Create Deal linked to both.

There is no Gmail API integration, Google Cloud project, OAuth client, Gmail
refresh token, or `googleapis` dependency.

## How Matching Works

The worker scans Pipedrive inbox mail threads, then fetches and evaluates each
individual message inside the thread. A message is treated as an AltaVista lead
only when all of these are true:

- The subject matches `ALTAVISTA_SUBJECT_MATCH` after normalizing prefixes such
  as `Fwd:` and `Re:`.
- The body contains an AltaVista marker such as `AltaVista`, `Alta Vista`, or
  `altavistasp.com`.
- The parsed body contains the expected fields `Name:`, `Email:`, and
  `Inquiry:`.

This is deliberate: one Pipedrive conversation can contain more than one email,
so duplicate detection and deal creation happen per message, not per
conversation.

## Duplicate Protection

The account now has a deal custom field named `AltaVista Intake Key`. The worker
stores a stable hash of the lead content in that field and searches it before
creating a deal. This prevents duplicates even if the mailbox changes later or
the same lead is forwarded again.

## Successful Processing

After all matched AltaVista messages in a Pipedrive conversation are processed,
the worker links the mailbox thread to the created or existing deal, shares that
matched thread with the team, marks it read, and archives it. Non-matching
threads are not shared or archived by the worker.

If the synced mailbox changes later, connect the replacement mailbox to the same
Pipedrive user. The code reads through Pipedrive Mailbox API and does not depend
on the mailbox provider.

## Configuration

Local config lives in `.env` and GitHub Actions config lives in repository
secrets or workflow env values.

| Name | Purpose |
|---|---|
| `PIPEDRIVE_API_TOKEN` | Pipedrive API token |
| `PIPEDRIVE_DOMAIN` | Pipedrive company domain, e.g. `aether` |
| `PIPEDRIVE_PIPELINE_ID` | Pipeline ID for new deals |
| `PIPEDRIVE_STAGE_ID` | Stage ID for new deals |
| `ALTAVISTA_INTAKE_KEY_FIELD` | API key for the `AltaVista Intake Key` deal custom field |
| `ALTAVISTA_SUBJECT_MATCH` | Normalized subject target |
| `ALTAVISTA_MAX_AGE_HOURS` | Maximum message age to process |
| `ALTAVISTA_BATCH_SIZE` | Inbox thread batch size per run |

Current live values:

- `PIPEDRIVE_DOMAIN=aether`
- `PIPEDRIVE_PIPELINE_ID=28` (`Phoenix-BizDev`)
- `PIPEDRIVE_STAGE_ID=178` (`Qualified`)

## Running Locally

```sh
npm install
npm start
```

The worker uses Node.js 20+ and has no runtime package dependencies.
