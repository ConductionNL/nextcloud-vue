/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A declared column can start hidden (`hidden: true`): it is in the Columns
 * chooser, still groups and filters, and shows once a user ticks it. A user's
 * stored choice decides as before. The board draws the case's Files tab
 * without the Direction and Keywords columns the documents list kept
 * (documents-on-the-case).
 *
 * @spec openspec/changes/files-browser-column-hidden-by-default/specs/files-browser-column-hidden-by-default/spec.md#requirement-a-declared-column-can-start-hidden
 */
import { normaliseFileColumns, visibleFileColumns } from '../../src/components/CnFilesBrowser/filesBrowserColumns.js'

const DECLARED = normaliseFileColumns([
	'name',
	{ key: 'direction', label: 'Direction', source: 'row', hidden: true },
	{ key: 'keywords', label: 'Keywords', source: 'row', hidden: true },
	'modified',
])

describe('a column that starts hidden', () => {
	it('is left out while the user has not chosen', () => {
		expect(visibleFileColumns(DECLARED, null).map((c) => c.key)).toEqual(['name', 'modified'])
	})

	it('shows once the user ticks it', () => {
		expect(visibleFileColumns(DECLARED, ['name', 'keywords', 'modified']).map((c) => c.key)).toEqual(['name', 'keywords', 'modified'])
	})

	it('stays declared, so the chooser lists it and a facet can read it', () => {
		expect(DECLARED.map((c) => c.key)).toEqual(['name', 'direction', 'keywords', 'modified'])
	})
})
