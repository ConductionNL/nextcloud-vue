/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * The interaction form in Dutch. pipelinq's "Nieuw contactmoment" card showed
 * "Channel", "Outcome", "Phone" and "Save contact moment" in English: the
 * library had no Dutch for its own field labels, and the channel labels and
 * the submit label the manifest supplies were shown as written or only handed
 * to the app's translate. Runs the real @nextcloud/l10n.
 *
 * @spec openspec/changes/interaction-form-fits-and-reads-dutch/specs/interaction-form-widget/spec.md#requirement-the-interaction-form-fits-its-card-and-reads-in-the-readers-language
 */

import fs from 'fs'
import path from 'path'
import CnInteractionFormWidget from '../../src/components/CnInteractionFormWidget/CnInteractionFormWidget.vue'
import nl from '../../l10n/nl.json'
import { registerTranslations } from '../../src/l10n/index.js'

/**
 * A stand-in for the widget instance, enough for its labels.
 *
 * @param {object} content The widget's `content`.
 * @param {Function} cnTranslate The app's translate.
 * @return {object} The fake `this`.
 */
function widgetWith(content, cnTranslate = (key) => key) {
	const vm = { content, cnTranslate, schemaDef: null }
	vm.copy = (key) => CnInteractionFormWidget.methods.copy.call(vm, key)
	return vm
}

const PIPELINQ = {
	channels: [{ value: 'telefoon', label: 'Phone' }, { value: 'balie', label: 'Counter' }, { value: 'x', label: 'Pigeon post' }],
	outcomes: [{ value: 'ok', label: 'Resolved' }],
	submitLabel: 'Save contact moment',
}

describe('the interaction form in Dutch', () => {
	afterEach(() => {
		globalThis._nc_l10n_language = 'en'
		registerTranslations()
	})

	it('has Dutch for every label the widget translates itself', () => {
		const source = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'components', 'CnInteractionFormWidget', 'CnInteractionFormWidget.vue'), 'utf8')
		const keys = [...source.matchAll(/\bt\(\s*'nextcloud-vue'\s*,\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\"/g, '"'))
		expect(keys).toEqual(expect.arrayContaining(['Channel', 'Outcome', 'Phone']))
		expect([...new Set(keys)].filter((key) => !(key in nl.translations))).toEqual([])
	})

	it('reads the manifest\'s channel and submit labels in Dutch from the library when the app has none', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
		const vm = widgetWith(PIPELINQ)

		expect(CnInteractionFormWidget.computed.channelOptions.call(vm).map((o) => o.label)).toEqual(['Telefoon', 'Balie', 'Pigeon post'])
		expect(CnInteractionFormWidget.computed.registerLabel.call(vm)).toBe('Contactmoment opslaan')
		expect(CnInteractionFormWidget.computed.channelLabel.call(vm)).toBe('Kanaal')
		expect(CnInteractionFormWidget.computed.outcomeLabel.call(vm)).toBe('Uitkomst')
	})

	it('keeps the app\'s own wording for the labels the manifest supplies', () => {
		globalThis._nc_l10n_language = 'nl'
		registerTranslations()
		const vm = widgetWith(PIPELINQ, (key) => (key === 'Phone' ? 'Bellen' : key === 'Resolved' ? 'Afgehandeld' : key))

		expect(CnInteractionFormWidget.computed.channelOptions.call(vm)[0]).toEqual({ value: 'telefoon', label: 'Bellen' })
		expect(CnInteractionFormWidget.computed.outcomeOptions.call(vm)).toEqual([{ value: 'ok', label: 'Afgehandeld' }])
	})
})
