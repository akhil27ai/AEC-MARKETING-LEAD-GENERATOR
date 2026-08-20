// AltaVista lead -> Pipedrive deal automation (Node.js / GitHub Actions version).
// Watches Gmail for AltaVista lead emails, extracts the lead fields, and creates
// a Person + Organization + Deal in Pipedrive with the details attached as a note.
//
// GMAIL API: PLACEHOLDER, NOT YET IMPLEMENTED. The three functions below -
// listCandidateMessages, fetchMessage, markMessageProcessed - are stubs. Everything
// else (field parsing, Pipedrive person/org/deal creation) is complete and has been
// tested against a real sample AltaVista lead email. See README "Gmail API" section
// for what each stub needs to do once it's implemented.

const AV_PIPEDRIVE_DOMAIN_DEFAULT = 'aether';
const AV_SUBJECT_MATCH_DEFAULT = 'AltaVista Client Opportunity';
const AV_SENDER_DOMAIN_DEFAULT = 'altavistasp.com';
const AV_PROCESSED_LABEL_DEFAULT = 'AltaVistaProcessed';
const AV_MAX_PER_RUN_DEFAULT = 25;
const AV_MAX_AGE_HOURS_DEFAULT = 168;

// Labels in the fixed order they appear in AltaVista's template. Each field's
// value is "everything between this label and the next one" (see parseAvFields).
const AV_FIELD_LABELS = [
  { key: 'name', label: 'Name' },
  { key: 'company', label: 'Company' },
  { key: 'title', label: 'Title' },
  { key: 'phone', label: 'Phone Number' },
  { key: 'email', label: 'Email' },
  { key: 'address', label: 'Property Address' },
  { key: 'background', label: 'Company Background' },
  { key: 'inquiry', label: 'Inquiry' },
];

/** Reads all config from environment variables, throwing if required ones are missing. */
function loadConfig() {
  const env = process.env;
  const missing = [];

  if (!env.PIPEDRIVE_API_TOKEN) missing.push('PIPEDRIVE_API_TOKEN');
  if (!env.PHOENIX_PIPELINE_ID) missing.push('PHOENIX_PIPELINE_ID');
  if (missing.length) {
    throw new Error('Missing required environment variables / GitHub Secrets: ' + missing.join(', '));
  }

  return {
    pipedriveDomain: (env.PIPEDRIVE_DOMAIN || AV_PIPEDRIVE_DOMAIN_DEFAULT).replace(/^https?:\/\//, '').replace(/\.pipedrive\.com.*$/, ''),
    pipedriveToken: env.PIPEDRIVE_API_TOKEN,
    subjectMatch: env.AV_SUBJECT_MATCH || AV_SUBJECT_MATCH_DEFAULT,
    senderDomain: env.AV_SENDER_DOMAIN || AV_SENDER_DOMAIN_DEFAULT,
    processedLabel: env.AV_PROCESSED_LABEL || AV_PROCESSED_LABEL_DEFAULT,
    maxPerRun: parseInt(env.AV_MAX_PER_RUN || '', 10) || AV_MAX_PER_RUN_DEFAULT,
    maxAgeHours: parseInt(env.AV_MAX_AGE_HOURS || '', 10) || AV_MAX_AGE_HOURS_DEFAULT,
    phoenixPipelineId: env.PHOENIX_PIPELINE_ID,
    phoenixStageId: env.PHOENIX_STAGE_ID || null,
    // Placeholders - not read yet, just documenting what Gmail wiring will need.
    gmailClientId: env.GMAIL_CLIENT_ID || null,
    gmailClientSecret: env.GMAIL_CLIENT_SECRET || null,
    gmailRefreshToken: env.GMAIL_REFRESH_TOKEN || null,
  };
}

/**
 * PLACEHOLDER - NOT IMPLEMENTED.
 * Should return an array of Gmail message ids matching cfg.subjectMatch /
 * cfg.senderDomain that do NOT already have the cfg.processedLabel label,
 * newest first, capped at cfg.maxPerRun.
 * Returns [] for now so the rest of the pipeline can run (and be tested)
 * without a live Gmail connection.
 */
async function listCandidateMessages(cfg) {
  console.log('TODO: Gmail API not implemented yet - returning 0 candidate messages. See README "Gmail API" section.');
  return [];
}

/**
 * PLACEHOLDER - NOT IMPLEMENTED.
 * Should fetch one message by id and return:
 *   { id, from: 'Name <email>', body: '<plain text body>', receivedAt: <ms timestamp> }
 */
async function fetchMessage(cfg, id) {
  throw new Error('TODO: Gmail API not implemented yet - fetchMessage(' + id + ') has no real implementation.');
}

/**
 * PLACEHOLDER - NOT IMPLEMENTED.
 * Should mark the message read and apply cfg.processedLabel (creating the
 * label first if it doesn't exist) so it's excluded from future runs.
 */
async function markMessageProcessed(cfg, id) {
  throw new Error('TODO: Gmail API not implemented yet - markMessageProcessed(' + id + ') has no real implementation.');
}

/** Extracts each labeled field's value from the email body, in AltaVista's template order. */
function parseAvFields(body) {
  const text = String(body || '').replace(/\r\n/g, '\n');
  const positions = [];

  for (let i = 0; i < AV_FIELD_LABELS.length; i++) {
    const re = new RegExp('^[ \\t]*' + AV_FIELD_LABELS[i].label + ':[ \\t]*', 'im');
    const match = re.exec(text);
    if (match) positions.push({ key: AV_FIELD_LABELS[i].key, start: match.index, valueStart: match.index + match[0].length });
  }

  positions.sort((a, b) => a.start - b.start);

  const result = {};
  for (let i = 0; i < positions.length; i++) {
    const end = i + 1 < positions.length ? positions[i + 1].start : text.length;
    result[positions[i].key] = text.slice(positions[i].valueStart, end).trim();
  }

  if (result.email) result.email = normalizeEmail(result.email);
  return result;
}

/** Splits a "Name <email>" style From header into a display name and a normalized email address. */
function parseFrom(raw) {
  const match = String(raw || '').match(/^([^<]*?)\s*<([^>]+)>/);
  if (match) return { name: match[1].trim() || match[2], email: normalizeEmail(match[2]) };
  return { name: String(raw || '').trim(), email: normalizeEmail(raw) };
}

/** Lowercases and trims an email address, stripping a leading "mailto:" if present. */
function normalizeEmail(email) {
  return String(email || '').trim().replace(/^mailto:/i, '').toLowerCase();
}

/** Escapes HTML special characters for safe inclusion in a Pipedrive note. */
function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Makes an authenticated request to the Pipedrive API and returns the parsed JSON body. */
async function callPipedriveApi(method, path, payload, cfg) {
  const url = 'https://' + cfg.pipedriveDomain + '.pipedrive.com' + path;
  const response = await fetch(url, {
    method,
    headers: { 'x-api-token': cfg.pipedriveToken, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  });

  const text = await response.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch (e) {
    body = { raw: text };
  }

  if (response.ok && body.success) return body;
  if (response.status === 429) throw new Error('429: daily API token budget exhausted - will retry next run');

  const message = body.error || body.error_info || body.raw || ('HTTP ' + response.status);
  throw new Error(method + ' ' + path + ' failed [' + response.status + ']: ' + message);
}

/** Finds a Pipedrive person by exact email match, or creates one if none exists. */
async function findOrCreatePerson(name, email, phone, cfg) {
  const search = await callPipedriveApi(
    'GET',
    '/api/v2/persons/search?term=' + encodeURIComponent(email) + '&fields=email&exact_match=true&limit=1',
    null,
    cfg
  );
  const items = (search.data && search.data.items) || [];
  for (const entry of items) {
    const item = entry.item || entry;
    if (item && item.id) return item.id;
  }

  const payload = { name: name || email, emails: [{ value: email, primary: true, label: 'work' }] };
  if (phone) payload.phones = [{ value: phone, primary: true, label: 'work' }];
  const person = (await callPipedriveApi('POST', '/api/v2/persons', payload, cfg)).data;
  console.log('Created person %s for %s <%s>', person.id, name, email);
  return person.id;
}

/** Finds a Pipedrive organization by exact name match, or creates one if none exists. */
async function findOrCreateOrg(name, cfg) {
  const search = await callPipedriveApi(
    'GET',
    '/api/v2/organizations/search?term=' + encodeURIComponent(name) + '&fields=name&exact_match=true&limit=1',
    null,
    cfg
  );
  const items = (search.data && search.data.items) || [];
  for (const entry of items) {
    const item = entry.item || entry;
    if (item && item.id) return item.id;
  }

  const org = (await callPipedriveApi('POST', '/api/v2/organizations', { name }, cfg)).data;
  console.log('Created organization %s for "%s"', org.id, name);
  return org.id;
}

/** Returns the person's existing open deal, if any, to avoid creating duplicates. */
async function findExistingOpenDeal(personId, cfg) {
  const result = await callPipedriveApi(
    'GET',
    '/api/v1/deals?person_id=' + encodeURIComponent(personId) + '&status=open&limit=100',
    null,
    cfg
  );
  const deals = result.data || [];
  return deals.length ? deals[0] : null;
}

/** Adds a note to the deal containing all extracted lead fields, in HTML format. */
async function addDealNote(dealId, fields, from, cfg) {
  const lines = [
    '<b>AltaVista lead intake (automated)</b>',
    '<b>Contact:</b> ' + escapeHtml(fields.name || from.name || 'Not found'),
    '<b>Company:</b> ' + escapeHtml(fields.company || 'Not found'),
    '<b>Title:</b> ' + escapeHtml(fields.title || 'Not found'),
    '<b>Phone:</b> ' + escapeHtml(fields.phone || 'Not found'),
    '<b>Email:</b> ' + escapeHtml(fields.email || from.email),
    '<b>Property address:</b> ' + escapeHtml(fields.address || 'Not found'),
    '<b>Company background:</b> ' + escapeHtml(fields.background || 'Not found'),
    '<b>Inquiry:</b> ' + escapeHtml(fields.inquiry || 'Not found'),
  ];
  const note = (await callPipedriveApi(
    'POST',
    '/api/v1/notes',
    { content: lines.join('<br>'), deal_id: dealId, pinned_to_deal_flag: 1 },
    cfg
  )).data;
  console.log('Added note %s to deal %s', note.id, dealId);
}

/**
 * Processes a single message id: fetches it, parses lead fields, creates (or
 * reuses) the Pipedrive person/org/deal, adds a note, and marks it done.
 */
async function processMessage(cfg, id) {
  const msg = await fetchMessage(cfg, id);

  if (Date.now() - msg.receivedAt > cfg.maxAgeHours * 60 * 60 * 1000) {
    console.log('Skipped message %s: older than %d hours', id, cfg.maxAgeHours);
    return;
  }

  const fields = parseAvFields(msg.body);
  const from = parseFrom(msg.from);

  const sawSenderDomain = from.email.indexOf('@' + cfg.senderDomain) !== -1 || msg.body.toLowerCase().indexOf(cfg.senderDomain) !== -1;
  if (!sawSenderDomain) {
    console.log('Warn message %s: subject matched but no reference to %s found - processing anyway, verify manually', id, cfg.senderDomain);
  }

  if (!fields.email && !fields.name) {
    console.log('Skipped message %s: could not extract Name or Email from body - template may have changed', id);
    await markMessageProcessed(cfg, id);
    return;
  }

  const contactEmail = normalizeEmail(fields.email || from.email);
  const personId = await findOrCreatePerson(fields.name || from.name, contactEmail, fields.phone, cfg);
  const orgId = fields.company ? await findOrCreateOrg(fields.company, cfg) : null;

  const existingDeal = await findExistingOpenDeal(personId, cfg);
  if (existingDeal) {
    console.log('Deal %s already open for person %s - skipping create', existingDeal.id, personId);
  } else {
    const title = ('AltaVista Lead: ' + (fields.company || fields.name || contactEmail)).trim().slice(0, 255);
    const payload = { title, person_id: personId, pipeline_id: cfg.phoenixPipelineId };
    if (orgId) payload.org_id = orgId;
    if (cfg.phoenixStageId) payload.stage_id = cfg.phoenixStageId;
    const deal = (await callPipedriveApi('POST', '/api/v1/deals', payload, cfg)).data;
    console.log('Created deal %s for %s <%s>', deal.id, fields.name, contactEmail);
    await addDealNote(deal.id, fields, from, cfg);
  }

  await markMessageProcessed(cfg, id);
}

/** Entry point. Finds unprocessed AltaVista lead emails and creates a deal for each. */
async function main() {
  const cfg = loadConfig();
  const messages = await listCandidateMessages(cfg);

  console.log('Found %d candidate message(s)', messages.length);

  let done = 0;
  for (const id of messages) {
    try {
      await processMessage(cfg, id);
      done++;
    } catch (err) {
      console.log('Warn: failed to process message %s (%s)', id, err.message);
    }
  }

  console.log('Run finished: %d message(s) processed', done);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  });
}

module.exports = {
  loadConfig,
  parseAvFields,
  parseFrom,
  normalizeEmail,
  escapeHtml,
};
