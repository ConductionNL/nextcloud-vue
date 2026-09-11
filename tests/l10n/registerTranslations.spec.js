/**
 * The library's translations reach a reader in their own language, plurals
 * included.
 *
 * Every plural in this library used to stay English for every app: the
 * catalogs store plurals as `singular -> [one, many]`, @nextcloud/l10n looks
 * them up as `_<singular>_::_<plural>_`, and only the singular translations
 * were ever registered. These tests run the REAL @nextcloud/l10n, not a mock,
 * because a mock that returns its input cannot tell a translated string from
 * an untranslated one.
 *
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 */

import { translate as t, translatePlural as n } from '@nextcloud/l10n'
import { mount } from '@vue/test-utils'
import { pluralEntries, registerTranslations } from '../../src/l10n/index.js'
import CnObjectMetadataWidget from '../../src/components/CnObjectMetadataWidget/CnObjectMetadataWidget.vue'

/**
 * Register the library's bundle as a reader of the given language would.
 *
 * @param {string} lang The language to read in.
 */
function readAs(lang) {
	globalThis._nc_l10n_language = lang
	registerTranslations()
}

describe('registerTranslations', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('gives a Dutch reader a Dutch plural', () => {
		readAs('nl')

		expect(n('nextcloud-vue', '%n day', '%n days', 2)).toBe('2 dagen')
		expect(n('nextcloud-vue', '%n day', '%n days', 1)).toBe('1 dag')
	})

	it('gives a Dutch reader the archival labels in Dutch', () => {
		readAs('nl')

		expect(t('nextcloud-vue', 'Archiving')).toBe('Archivering')
		expect(t('nextcloud-vue', 'Retention period')).toBe('Bewaartermijn')
		expect(t('nextcloud-vue', 'Keep permanently')).toBe('Blijvend bewaren')
	})

	it('renders the metadata panel in Dutch for a Dutch reader', () => {
		// Labels are translated at USE, not at import. A label resolved when
		// the module loaded would be English for everyone, because the
		// bundles register after the library is imported.
		readAs('nl')
		const wrapper = mount(CnObjectMetadataWidget, {
			propsData: { objectData: { '@self': { uuid: 'abc', _retention: { appraisal: 'retain_permanently', retentionPeriod: 'P10Y' } } } },
		})
		const headings = wrapper.findAll('.cn-object-metadata__group-title').map((h) => h.text())
		const labels = wrapper.vm.metadataItems.map((i) => i.label)

		expect(headings).toContain('Archivering')
		expect(labels).toContain('Bewaartermijn')
		expect(labels).toContain('Archiefactiedatum')
		expect(wrapper.text()).toContain('10 jaar')
	})

	it('still answers in English for an English reader', () => {
		readAs('en')

		expect(n('nextcloud-vue', '%n day', '%n days', 2)).toBe('2 days')
		expect(t('nextcloud-vue', 'Archiving')).toBe('Archiving')
	})
})

describe('pluralEntries', () => {
	it('keys a plural the way translatePlural looks it up', () => {
		expect(pluralEntries({ plurals: { '%n day': ['%n dag', '%n dagen'] } }))
			.toEqual({ '_%n day_::_%n days_': ['%n dag', '%n dagen'] })
	})

	it('skips a plural the English catalog does not know, rather than guess its key', () => {
		expect(pluralEntries({ plurals: { 'no such string': ['a', 'b'] } })).toEqual({})
	})

	it('copes with a bundle that has no plurals block', () => {
		expect(pluralEntries({ translations: {} })).toEqual({})
	})
})
