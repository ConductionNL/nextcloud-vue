/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Every library string has Dutch (nl-flow-wizard-strings). A `t('nextcloud-vue',
 * '…')` or `n('nextcloud-vue', '…', '…', …)` literal in src/ without an entry in
 * l10n/nl.json reaches a Dutch reader in English, as DqFlow and DqInstellen did.
 *
 * A ratchet: the strings that had no Dutch when this spec arrived are listed in
 * tests/l10n/nl-missing-baseline.json. A new string must be translated, and a
 * listed string that gets its Dutch must leave the list, so the debt only shrinks.
 *
 * @spec openspec/changes/nl-flow-wizard-strings/specs/l10n/spec.md#requirement-a-new-library-string-has-dutch
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const nl = JSON.parse(fs.readFileSync(path.join(ROOT, 'l10n/nl.json'), 'utf8'))
const baseline = JSON.parse(fs.readFileSync(path.join(__dirname, 'nl-missing-baseline.json'), 'utf8'))

const STR = '(\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*"|`(?:[^`\\\\$]|\\\\.)*`)'
const SINGLE = new RegExp('\\b(?:t|translate)\\(\\s*[\'"]nextcloud-vue[\'"]\\s*,\\s*' + STR, 'g')
const PLURAL = new RegExp('\\b(?:n|translatePlural)\\(\\s*[\'"]nextcloud-vue[\'"]\\s*,\\s*' + STR + '\\s*,\\s*' + STR, 'g')

/**
 * The text of a quoted literal, its escapes undone.
 *
 * @param {string} quoted The literal with its quotes.
 * @return {string} The text.
 */
function literal(quoted) {
	return quoted.slice(1, -1).replace(/\\(.)/g, '$1')
}

/**
 * Every source file under src/.
 *
 * @param {string} dir A directory.
 * @return {string[]} File paths.
 */
function sourceFiles(dir) {
	return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			return sourceFiles(full)
		}
		return /\.(js|vue|ts)$/.test(entry.name) ? [full] : []
	})
}

const missingStrings = new Set()
const missingPlurals = new Set()
const translations = nl.translations || {}
const plurals = nl.plurals || {}
for (const file of sourceFiles(path.join(ROOT, 'src'))) {
	const source = fs.readFileSync(file, 'utf8')
	for (const match of source.matchAll(PLURAL)) {
		if (!Object.hasOwn(plurals, literal(match[1]))) {
			missingPlurals.add(literal(match[1]))
		}
	}
	for (const match of source.matchAll(SINGLE)) {
		if (!Object.hasOwn(translations, literal(match[1]))) {
			missingStrings.add(literal(match[1]))
		}
	}
}

describe('every library string has Dutch', () => {
	it('adds no string without Dutch beyond the baseline', () => {
		const allowedStrings = new Set(baseline.strings)
		const allowedPlurals = new Set(baseline.plurals)
		expect([...missingStrings].filter((key) => !allowedStrings.has(key)).sort()).toEqual([])
		expect([...missingPlurals].filter((key) => !allowedPlurals.has(key)).sort()).toEqual([])
	})

	it('drops a translated string from the baseline', () => {
		expect(baseline.strings.filter((key) => !missingStrings.has(key))).toEqual([])
		expect(baseline.plurals.filter((key) => !missingPlurals.has(key))).toEqual([])
	})

	it('translates the flow, wizard and stepper strings Dutch readers met in English', () => {
		const flowFiles = ['CnSetupWizard', 'CnWizardDialog', 'CnStepper', 'CnFlowsPage', 'CnFlowDetail']
		const listed = sourceFiles(path.join(ROOT, 'src/components'))
			.filter((file) => flowFiles.some((dir) => file.includes(`${path.sep}${dir}${path.sep}`)))
			.flatMap((file) => [...fs.readFileSync(file, 'utf8').matchAll(SINGLE)].map((match) => literal(match[1])))
		expect(listed.length).toBeGreaterThan(50)
		expect(listed.filter((key) => !Object.hasOwn(translations, key))).toEqual([])
		expect(listed.map((key) => translations[key]).filter((dutch) => dutch.includes('—'))).toEqual([])
	})
})
