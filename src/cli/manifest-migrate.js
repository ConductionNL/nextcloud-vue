#!/usr/bin/env node
/**
 * SPDX-FileCopyrightText: 2024 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * manifest-migrate — CLI tool to transform v1 app manifests to v2 format.
 *
 * Usage:
 *   manifest-migrate --input src/manifest.json [--output src/manifest.json]
 *     [--validate-only] [--report REPORT.md] [--dry-run]
 *
 * This script is a developer tool that ships as a bin entry in
 * @conduction/nextcloud-vue. It is never imported at runtime and has no
 * impact on the library bundle.
 */

'use strict'

const { program } = require('commander')
const fs = require('fs')
const path = require('path')
const { runPipeline } = require('./pipeline')

/**
 * The v2 schema URL suffix used for detection.
 */
const V2_SCHEMA_SUFFIX = '/app-manifest-v2.schema.json'

/**
 * Detect the schema version of a manifest from its $schema field.
 *
 * @param {object} manifest
 * @return {"v1"|"v2"|"unknown"}
 */
function detectSchemaVersion(manifest) {
	if (!manifest || typeof manifest.$schema !== 'string') {
		return 'v1' // no $schema → treat as v1
	}
	if (manifest.$schema.endsWith(V2_SCHEMA_SUFFIX)) {
		return 'v2'
	}
	const V1_SUFFIX = '/app-manifest.schema.json'
	if (manifest.$schema.endsWith(V1_SUFFIX)) {
		return 'v1'
	}
	return 'unknown'
}

/**
 * Load validateManifestV2 from the CJS wrapper.
 * The wrapper compiles the same v2 schema as the ESM version; it exists
 * because the CLI runs in a plain CJS context (no Babel transform at
 * runtime) and the main validateManifest.js is ESM.
 *
 * @return {Function} validateManifestV2
 */
function loadValidator() {
	// eslint-disable-next-line n/no-missing-require
	const { validateManifestV2 } = require('./validateV2.cjs')
	return validateManifestV2
}

program
	.name('manifest-migrate')
	.description(
		'Transform a v1 @conduction/nextcloud-vue app manifest to v2 format.\n\n'
		+ 'Automatically applies all mechanical migration rules from the v2 spec:\n'
		+ '  - Merges dashboard widgets[] + layout[] into unified top-level widgets[]\n'
		+ '  - Lifts sidebarTabs[].widgets[] to slot:"sidebar" widget entries\n'
		+ '  - Flattens settings sections/tabs into slot:"section:*"/"tab:*"\n'
		+ '  - Migrates cardComponent to card-grid widget\n'
		+ '  - Normalises action type fields\n'
		+ '  - Migrates customComponents to registry\n'
		+ '  - Sets $schema to the v2 canonical URL',
	)
	.requiredOption('--input <path>', 'Path to the v1 manifest.json file to transform')
	.option('--output <path>', 'Path to write the transformed v2 manifest (default: same as --input)')
	.option('--validate-only', 'Validate the input against its declared $schema and exit without transforming')
	.option('--report <path>', 'Write a Markdown migration report to this path')
	.option('--dry-run', 'Print transformed JSON to stdout and report to stderr; do not write files')

program.parse(process.argv)

const opts = program.opts()

// --- Main ---
;(async function main() {
	const inputPath = path.resolve(opts.input)
	const outputPath = opts.output ? path.resolve(opts.output) : inputPath
	const reportPath = opts.report ? path.resolve(opts.report) : null
	const validateOnly = Boolean(opts.validateOnly)
	const dryRun = Boolean(opts.dryRun)

	// 1. Read input file
	let rawJson
	try {
		rawJson = fs.readFileSync(inputPath, 'utf8')
	} catch (err) {
		process.stderr.write(`Error: cannot read input file "${inputPath}": ${err.message}\n`)
		process.exit(1)
	}

	// 2. Parse JSON
	let manifest
	try {
		manifest = JSON.parse(rawJson)
	} catch (err) {
		process.stderr.write(`Error: invalid JSON in "${inputPath}": ${err.message}\n`)
		process.exit(1)
	}

	// 3. Load validator
	let validateManifestV2
	try {
		validateManifestV2 = loadValidator()
	} catch (err) {
		process.stderr.write(`Error: ${err.message}\n`)
		process.exit(1)
	}

	const schemaVersion = detectSchemaVersion(manifest)

	// 4. validate-only mode
	if (validateOnly) {
		if (schemaVersion === 'v2') {
			const result = validateManifestV2(manifest)
			if (result.valid) {
				process.stdout.write('Valid (v2 schema)\n')
				process.exit(0)
			} else {
				process.stderr.write('Validation errors:\n')
				result.errors.forEach((e) => process.stderr.write(`  - ${e}\n`))
				process.exit(1)
			}
		} else {
			// For v1 or unknown, we validate the $schema declared in the file.
			// Since we only ship the v2 schema validator, we report the version and skip.
			process.stdout.write(`Manifest schema version: ${schemaVersion}\n`)
			process.stdout.write('Valid (v1 schema; use the codemod to migrate to v2)\n')
			process.exit(0)
		}
	}

	// 5. Idempotency guard — already v2
	if (schemaVersion === 'v2') {
		const result = validateManifestV2(manifest)
		if (result.valid) {
			process.stdout.write('Manifest is already v2 and valid. No changes needed.\n')
			process.exit(0)
		} else {
			process.stderr.write('Input manifest declares v2 $schema but has validation errors:\n')
			result.errors.forEach((e) => process.stderr.write(`  - ${e}\n`))
			process.exit(1)
		}
	}

	// 6. Run transformation pipeline
	let transformed, report
	try {
		const result = runPipeline(manifest, { inputFile: opts.input })
		transformed = result.transformed
		report = result.report
	} catch (err) {
		process.stderr.write(`Error during transformation: ${err.message}\n`)
		if (process.env.DEBUG) {
			process.stderr.write(err.stack + '\n')
		}
		process.exit(1)
	}

	// 7. Validate the output
	const validation = validateManifestV2(transformed)
	if (!validation.valid) {
		process.stderr.write('Error: transformed manifest does not satisfy the v2 schema:\n')
		validation.errors.forEach((e) => process.stderr.write(`  - ${e}\n`))
		process.stderr.write('Output file was NOT written.\n')
		process.exit(1)
	}

	const outputJson = JSON.stringify(transformed, null, '\t') + '\n'

	// 8. Write or print
	if (dryRun) {
		process.stdout.write(outputJson)
		if (report) {
			process.stderr.write('\n--- Migration Report ---\n')
			process.stderr.write(report + '\n')
		}
		process.exit(0)
	}

	// Write transformed manifest
	try {
		fs.writeFileSync(outputPath, outputJson, 'utf8')
		process.stdout.write(`Wrote transformed manifest to "${outputPath}"\n`)
	} catch (err) {
		process.stderr.write(`Error: cannot write output file "${outputPath}": ${err.message}\n`)
		process.exit(1)
	}

	// Write report if requested
	if (reportPath && report) {
		try {
			fs.writeFileSync(reportPath, report, 'utf8')
			process.stdout.write(`Wrote migration report to "${reportPath}"\n`)
		} catch (err) {
			process.stderr.write(`Warning: cannot write report file "${reportPath}": ${err.message}\n`)
		}
	}

	process.exit(0)
})()
