/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * The content hash of the v2 manifest schema, shared by the recording script
 * (`record-manifest-schema-hash.js`) and the test that checks it
 * (`tests/schemas/app-manifest-v2.schema-version.spec.js`).
 */

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const SCHEMA_PATH = path.join(ROOT, 'src/schemas/app-manifest-v2.schema.json')
const LEDGER_PATH = path.join(ROOT, 'tests/schemas/app-manifest-v2.schema.hashes.json')

/**
 * Hash a parsed schema. The hash is over the parsed document written back
 * without whitespace, so reformatting the file is not a content change while
 * any key, value or ordering change is. `version` is part of the content.
 *
 * @param {object} schema The parsed schema.
 * @return {string} `sha256:<hex>`.
 */
function hashSchema(schema) {
	return 'sha256:' + crypto.createHash('sha256').update(JSON.stringify(schema)).digest('hex')
}

/**
 * Read the ledger of recorded versions.
 *
 * @return {{versions: Record<string, string>}} The ledger.
 */
function readLedger() {
	return JSON.parse(fs.readFileSync(LEDGER_PATH, 'utf8'))
}

module.exports = { SCHEMA_PATH, LEDGER_PATH, hashSchema, readLedger }
