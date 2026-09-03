/**
 * Tests for CnIndexPage's buildDefaultActions — the built-in row actions
 * (View / Edit / Copy / Delete).
 *
 * The regression these lock down: the labels were built as STRING LITERALS,
 * so the row menu rendered in English in every locale even though Edit,
 * Copy and Delete had carried Dutch catalog entries all along. Every label
 * must go through t('nextcloud-vue', …), and every label must have a
 * catalog entry to resolve against.
 */

import { buildDefaultActions } from '../../src/components/CnIndexPage/defaultActions.js'
import en from '../../l10n/en.json'
import nl from '../../l10n/nl.json'

jest.mock('@nextcloud/l10n', () => ({
	...jest.requireActual('@nextcloud/l10n'),
	// Prefix instead of a fake catalog: proves the label went THROUGH t()
	// with the library's app id, whatever the jsdom language is.
	translate: jest.fn((app, text) => `[${app}] ${text}`),
}))

const HANDLERS = {
	onView: jest.fn(),
	onEdit: jest.fn(),
	onCopy: jest.fn(),
	onDelete: jest.fn(),
}
const ALL_FLAGS = { view: true, edit: true, copy: true, del: true }

describe('buildDefaultActions', () => {
	it('builds every label through t() with the library app id', () => {
		const actions = buildDefaultActions({
			flags: ALL_FLAGS,
			viewIcon: { name: 'EyeStub' },
			handlers: HANDLERS,
		})

		expect(actions.map((a) => a.label)).toEqual([
			'[nextcloud-vue] View',
			'[nextcloud-vue] Edit',
			'[nextcloud-vue] Copy',
			'[nextcloud-vue] Delete',
		])
	})

	it('keeps order, handlers and the destructive flag intact', () => {
		const actions = buildDefaultActions({
			flags: ALL_FLAGS,
			viewIcon: { name: 'EyeStub' },
			handlers: HANDLERS,
		})

		expect(actions).toHaveLength(4)
		expect(actions[0].handler).toBe(HANDLERS.onView)
		expect(actions[3].handler).toBe(HANDLERS.onDelete)
		expect(actions[3].destructive).toBe(true)
		expect(actions.slice(0, 3).every((a) => a.destructive !== true)).toBe(true)
	})

	it('omits actions whose flag is off', () => {
		const actions = buildDefaultActions({
			flags: { view: false, edit: true, copy: false, del: false },
			viewIcon: null,
			handlers: HANDLERS,
		})

		expect(actions.map((a) => a.label)).toEqual(['[nextcloud-vue] Edit'])
	})

	// t() falls back to the SOURCE string on a missing key, which renders as
	// English and looks exactly like this bug — so the catalog entries are
	// asserted here. "View" had no entry at all, which is how it shipped.
	it.each(['View', 'Edit', 'Copy', 'Delete'])(
		'the "%s" label has en and nl catalog entries to resolve against',
		(key) => {
			expect(en.translations[key]).toBeTruthy()
			expect(nl.translations[key]).toBeTruthy()
		},
	)
})
