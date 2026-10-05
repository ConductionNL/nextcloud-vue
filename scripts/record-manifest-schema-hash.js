/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Records the content hash of `src/schemas/app-manifest-v2.schema.json` under
 * its current `version` in `tests/schemas/app-manifest-v2.schema.hashes.json`
 * (`npm run update:manifest-schema-hash`).
 *
 * Why a ledger. The schema's `version` is the only machine-readable signal a
 * consumer gets that the vocabulary moved: ConductionNL/.github vendors this
 * file into the gate tooling and compares versions to decide whether its copy
 * is stale. 2.61.0 shipped a new page type under an unchanged 2.42.0, so that
 * comparison read "already current" against a schema that had moved. The
 * ledger makes that state fail a test here instead: a version has one content
 * hash, so changing the content means taking a new version.
 *
 * This script therefore REFUSES to replace the hash of a version that is
 * already recorded. Bump `version` in the schema first, then run it.
 *
 * The hash and the ledger shape live in `manifest-schema-hash.js`, which the
 * test requires too, so the two cannot disagree about what "content" means.
 */

const fs = require('fs')
const { SCHEMA_PATH, LEDGER_PATH, hashSchema, readLedger } = require('./manifest-schema-hash.js')

const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'))
const version = schema.version
if (typeof version !== 'string' || version === '') {
	console.error(`${SCHEMA_PATH} has no "version". Nothing to record.`)
	process.exit(1)
}

const ledger = readLedger()
const hash = hashSchema(schema)
const recorded = ledger.versions[version]

if (recorded === hash) {
	console.log(`Version ${version} is already recorded with this content. Nothing to do.`)
	process.exit(0)
}
if (recorded !== undefined) {
	const message = `Version ${version} is already recorded with different content.\n`
		+ 'A version has one content. Bump "version" in the schema (minor for an\n'
		+ 'additive change), then run this script again.'
	console.error(message)
	process.exit(1)
}

ledger.versions[version] = hash
fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, '\t') + '\n')
console.log(`Recorded ${version} = ${hash}`)
