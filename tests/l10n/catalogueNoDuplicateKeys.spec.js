/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A catalogue key appears once. Two open pull requests each added "optional" to
 * l10n/nl.json ("niet verplicht" and "optioneel"); git merged both lines without
 * a conflict, JSON.parse kept the LAST one, and the Dutch suffix silently
 * changed. This reads the raw text, so a duplicate fails here instead.
 */
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

const DIR = join(__dirname, '../../l10n')

/**
 * The keys that occur more than once in one object of a JSON text.
 *
 * @param {string} text The raw JSON.
 * @return {string[]} The duplicated keys.
 */
function duplicateKeys(text) {
	JSON.parse(text)
	const duplicates = []
	// Valid JSON first; JSON.parse cannot see duplicates, so collect keys per object by hand.
	const seenStack = [new Set()]
	const re = /"((?:[^"\\]|\\.)*)"\s*:|[{}]/g
	let match
	while ((match = re.exec(text)) !== null) {
		if (match[0] === '{') {
			seenStack.push(new Set())
		} else if (match[0] === '}') {
			seenStack.pop()
		} else {
			const seen = seenStack[seenStack.length - 1]
			if (seen.has(match[1])) {
				duplicates.push(match[1])
			}
			seen.add(match[1])
		}
	}
	return duplicates
}

describe('l10n catalogues', () => {
	const files = readdirSync(DIR).filter((name) => name.endsWith('.json'))

	it.each(files)('%s has no key twice in one object', (name) => {
		expect(duplicateKeys(readFileSync(join(DIR, name), 'utf8'))).toEqual([])
	})

	it('reads the optional-field suffix in Dutch as the boards: niet verplicht', () => {
		const nl = JSON.parse(readFileSync(join(DIR, 'nl.json'), 'utf8')).translations
		expect(nl.optional).toBe('niet verplicht')
	})
})
