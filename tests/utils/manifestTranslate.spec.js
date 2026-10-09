/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/manifest-i18n-labels/tasks.md#task-2
 */
import { baseLanguage, createManifestTranslate, labelLang } from '../../src/utils/manifestTranslate.js'

const i18n = {
	sourceLanguage: 'nl',
	languages: ['en', 'de'],
	labels: {
		en: { Vergunningen: 'Permits', 'Nieuwe aanvraag': 'New application', 'Hallo {name}': 'Hello {name}' },
		de: { Vergunningen: 'Genehmigungen' },
	},
}

function make({ language = 'en', manifest = { i18n }, translate } = {}) {
	const state = { language, manifest }
	const fn = createManifestTranslate({ getManifest: () => state.manifest, getLanguage: () => state.language, translate })
	return { fn, state }
}

describe('createManifestTranslate', () => {
	it('uses the manifest\'s translation for the language', () => {
		expect(make().fn('Vergunningen')).toBe('Permits')
	})

	it('falls back per label: a missing translation shows the written text, not a half-translated page', () => {
		const { fn } = make({ language: 'de' })
		expect(fn('Vergunningen')).toBe('Genehmigungen')
		expect(fn('Nieuwe aanvraag')).toBe('Nieuwe aanvraag')
	})

	it('en_GB falls back to the English table', () => {
		expect(make({ language: 'en_GB' }).fn('Vergunningen')).toBe('Permits')
	})

	it('the base-language table is tried after the exact one', () => {
		const manifest = { i18n: { ...i18n, labels: { ...i18n.labels, en_GB: { Vergunningen: 'Licences' } }, languages: ['en', 'en_GB', 'de'] } }
		expect(make({ language: 'en_GB', manifest }).fn('Vergunningen')).toBe('Licences')
		expect(make({ language: 'en_GB', manifest }).fn('Nieuwe aanvraag')).toBe('New application')
	})

	it('the source language skips the manifest and goes to the host translate', () => {
		const translate = jest.fn((text) => `host:${text}`)
		const { fn } = make({ language: 'nl', translate })
		expect(fn('Vergunningen')).toBe('host:Vergunningen')
		expect(translate).toHaveBeenCalledWith('Vergunningen', undefined)
	})

	it('a text the manifest lacks goes to the host translate, then to the text itself', () => {
		expect(make({ translate: (text) => (text === 'Overig' ? 'Other' : text) }).fn('Overig')).toBe('Other')
		expect(make({ translate: () => '' }).fn('Overig')).toBe('Overig')
		expect(make().fn('Overig')).toBe('Overig')
	})

	it('fills placeholders, in a manifest translation and in the host\'s answer', () => {
		expect(make().fn('Hallo {name}', { name: 'Jan' })).toBe('Hello Jan')
		expect(make({ language: 'de', translate: (t, v) => t.replace('{name}', v.name) }).fn('Dag {name}', { name: 'Jan' })).toBe('Dag Jan')
	})

	it('without an i18n block nothing new happens: the host translate runs', () => {
		const { fn } = make({ manifest: {}, translate: (t) => t.toUpperCase() })
		expect(fn('abc')).toBe('ABC')
		expect(fn.fellBack('abc')).toBe(false)
	})

	it('reads the live manifest on each call (an edit shows at once)', () => {
		const { fn, state } = make()
		expect(fn('Nieuwe aanvraag')).toBe('New application')
		state.manifest = { i18n: { ...i18n, labels: { en: { 'Nieuwe aanvraag': 'New request' } } } }
		expect(fn('Nieuwe aanvraag')).toBe('New request')
	})

	it('language changes are picked up too', () => {
		const { fn, state } = make()
		expect(fn('Vergunningen')).toBe('Permits')
		state.language = 'de'
		expect(fn('Vergunningen')).toBe('Genehmigungen')
	})

	it('reports whether a label fell back to the written text in another language', () => {
		const { fn } = make()
		expect(fn.fellBack('Vergunningen')).toBe(false)
		expect(fn.fellBack('Overig')).toBe(true)
		expect(make({ language: 'nl' }).fn.fellBack('Overig')).toBe(false)
		expect(fn.sourceLanguage).toBe('nl')
	})
})

describe('labelLang', () => {
	it('gives the source language only for a fallback', () => {
		const { fn } = make()
		expect(labelLang(fn, 'Overig')).toBe('nl')
		expect(labelLang(fn, 'Vergunningen')).toBeNull()
		expect(labelLang((k) => k, 'x')).toBeNull()
		expect(labelLang(null, 'x')).toBeNull()
	})
})

describe('baseLanguage', () => {
	it('drops the region', () => {
		expect(baseLanguage('en_GB')).toBe('en')
		expect(baseLanguage('pt-BR')).toBe('pt')
		expect(baseLanguage('nl')).toBe('nl')
	})
})
