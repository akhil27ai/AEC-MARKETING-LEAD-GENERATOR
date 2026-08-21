- Use the currently synced mailbox: `akhil@automationinterns.com`

- Keep GitHub Actions running the Node.js worker every 15 minutes.

- Remove Gmail API integration entirely:
  - No Google Cloud project
  - No OAuth client
  - No Gmail refresh token
  - No `googleapis` dependency

- Read forwarded messages through Pipedrive’s Mailbox API.

- Identify AltaVista emails using:
  - Normalized subject matching
  - AltaVista markers in the body
  - Expected fields such as `Name:`, `Email:`, and `Inquiry:`

- Process individual messages, since one Pipedrive conversation could contain multiple emails.

- Create CRM records in this order:
  - Find/create Organization
  - Find/create Person linked to that Organization
  - Create Deal linked to both

- Use Pipedrive API v2 for organizations, people, deals, and searches.

- Add an `AltaVista Intake Key` deal custom field to prevent duplicates—even after mailbox changes or repeated forwarding.

- Link the original Pipedrive email conversation to the created deal, mark it read, and archive it after successful processing.

- Share only the matched AltaVista conversation with the team, or retain the existing note if the original email should remain private.

- If the mailbox changes later, connect the replacement mailbox to the same Pipedrive user. The code should require no changes.

- Keep configuration limited to the Pipedrive token/domain, pipeline and stage IDs, intake-key field, subject match, age limit, and batch size.
