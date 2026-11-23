/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The l10n merge driver: two branches that each add a string to the end of a
 * catalogue merge cleanly, a key one side removed is dropped, a key one side
 * changed takes that change, and only a key both sides changed differently
 * is a conflict with markers. Also drives a real `git merge` with the driver
 * registered, the way a lane runs it.
 *
 * @spec openspec/changes/l10n-merge-driver/specs/l10n-merge-driver/spec.md#requirement-catalogues-merge-key-by-key
 */
const { execFileSync } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { mergeCatalogues } = require('../../scripts/merge-l10n.js')

const doc = (translations, plurals = {}) => JSON.stringify({ translations, plurals }, null, 2) + '\n'

describe('merge-l10n', () => {
	const base = doc({ Close: 'Sluiten', Open: 'Openen', Old: 'Oud' }, { '%n day': ['%n dag', '%n dagen'] })

	it('keeps the strings both branches appended, in order, and drops a removed key', () => {
		const ours = doc({ Close: 'Sluiten', Open: 'Openen', Old: 'Oud', 'Sent message': 'Verstuurd bericht' }, { '%n day': ['%n dag', '%n dagen'] })
		const theirs = doc({ Close: 'Sluiten', Open: 'Openen', 'Move {item} up': '{item} omhoog' }, { '%n day': ['%n dag', '%n dagen'], '%n item': ['%n item', '%n items'] })
		const { text, conflicts } = mergeCatalogues(base, ours, theirs)
		expect(conflicts).toBe(0)
		const merged = JSON.parse(text)
		expect(Object.keys(merged.translations)).toEqual(['Close', 'Open', 'Sent message', 'Move {item} up'])
		expect(merged.plurals['%n item']).toEqual(['%n item', '%n items'])
		expect(text.endsWith('}\n')).toBe(true)
	})

	it('takes a change only one side made', () => {
		const ours = doc({ Close: 'Sluiten', Open: 'Openen', Old: 'Oud' }, { '%n day': ['%n dag', '%n dagen'] })
		const theirs = doc({ Close: 'Dichtdoen', Open: 'Openen', Old: 'Oud' }, { '%n day': ['%n dag', '%n dagen'] })
		const { text, conflicts } = mergeCatalogues(base, ours, theirs)
		expect(conflicts).toBe(0)
		expect(JSON.parse(text).translations.Close).toBe('Dichtdoen')
	})

	it('marks a key both sides translated differently, and the file does not parse', () => {
		const ours = doc({ Close: 'Sluit', Open: 'Openen', Old: 'Oud' }, { '%n day': ['%n dag', '%n dagen'] })
		const theirs = doc({ Close: 'Dichtdoen', Open: 'Openen', Old: 'Oud' }, { '%n day': ['%n dag', '%n dagen'] })
		const { text, conflicts } = mergeCatalogues(base, ours, theirs)
		expect(conflicts).toBe(1)
		expect(text).toContain('<<<<<<< ours\n    "Close": "Sluit",\n=======\n    "Close": "Dichtdoen",\n>>>>>>> theirs')
		expect(() => JSON.parse(text)).toThrow()
	})

	it('refuses a side that does not parse', () => {
		expect(mergeCatalogues(base, '{ broken', base).text).toBeNull()
	})

	it('resolves a real git merge with the driver registered', () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'merge-l10n-'))
		const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'pipe' }).toString()
		try {
			git('init', '-q', '-b', 'main')
			git('config', 'user.email', 'test@example.org')
			git('config', 'user.name', 'Test')
			git('config', 'merge.l10n.driver', `node ${path.join(__dirname, '../../scripts/merge-l10n.js')} %O %A %B %P`)
			fs.mkdirSync(path.join(dir, 'l10n'))
			fs.writeFileSync(path.join(dir, '.gitattributes'), 'l10n/*.json merge=l10n\n')
			fs.writeFileSync(path.join(dir, 'l10n/nl.json'), base)
			git('add', '.')
			git('commit', '-q', '-m', 'base')
			git('checkout', '-q', '-b', 'theirs')
			fs.writeFileSync(path.join(dir, 'l10n/nl.json'), doc({ Close: 'Sluiten', Open: 'Openen', Old: 'Oud', B: 'b' }, { '%n day': ['%n dag', '%n dagen'] }))
			git('commit', '-q', '-am', 'theirs')
			git('checkout', '-q', 'main')
			fs.writeFileSync(path.join(dir, 'l10n/nl.json'), doc({ Close: 'Sluiten', Open: 'Openen', Old: 'Oud', A: 'a' }, { '%n day': ['%n dag', '%n dagen'] }))
			git('commit', '-q', '-am', 'ours')
			git('merge', '-q', '--no-edit', 'theirs')
			const merged = JSON.parse(fs.readFileSync(path.join(dir, 'l10n/nl.json'), 'utf8'))
			expect(Object.keys(merged.translations)).toEqual(['Close', 'Open', 'Old', 'A', 'B'])
		} finally {
			fs.rmSync(dir, { recursive: true, force: true })
		}
	})
})
