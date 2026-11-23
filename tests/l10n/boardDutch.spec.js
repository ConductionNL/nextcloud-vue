/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The board's words in Dutch, as board DqWerkbord draws them: "Toon 12 meer",
 * "niet toegestaan" in the card menu, and a column for nobody. Runs the real
 * @nextcloud/l10n.
 *
 * @spec openspec/changes/screens-board-reference-columns/specs/board-view/spec.md#requirement-the-board-shows-where-a-card-can-go
 */

import { translate as t } from '@nextcloud/l10n'
import { registerTranslations } from '../../src/l10n/index.js'

describe('board strings in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('gives a Dutch reader the board in Dutch', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()

		expect(t('nextcloud-vue', 'Show {count} more', { count: 12 })).toBe('Toon 12 meer')
		expect(t('nextcloud-vue', 'not allowed')).toBe('niet toegestaan')
		expect(t('nextcloud-vue', 'Move to')).toBe('Verplaatsen naar')
		expect(t('nextcloud-vue', 'Nobody')).toBe('Niemand')
		expect(t('nextcloud-vue', '{label}:', { label: 'Kolommen' })).toBe('Kolommen:')
		expect(t('nextcloud-vue', '{name} cannot move to {column}.', { name: 'Parkeren', column: 'Besluit' })).toBe('Parkeren kan niet naar Besluit.')
		expect(t('nextcloud-vue', 'full')).toBe('vol')
		expect(t('nextcloud-vue', '{column} is full: {count} of {capacity}.', { column: 'In behandeling', count: 4, capacity: 4 })).toBe('In behandeling is vol: 4 van 4.')
	})
})
