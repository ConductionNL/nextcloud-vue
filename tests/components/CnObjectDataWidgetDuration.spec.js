// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget and CnFactsWidget `format: 'duration'`: a term reads in
 * words, with the extension the object holds at `extendBy` (DqZaak Termijn
 * en betaling "Wettelijke termijn: 4 weken, te verdagen met 2"; live drew P28D).
 *
 * @spec openspec/changes/data-widget-duration-format/specs/data-widget/spec.md
 */

import { mount, shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const CnFactsWidget = require('../../src/components/CnFactsWidget/CnFactsWidget.vue').default

const schema = { properties: { statutoryTerm: { type: 'string' }, statutoryExtension: { type: 'string' } } }

function displayed(objectData, override) {
	const w = shallowMount(CnObjectDataWidget, {
		propsData: { schema, objectData, overrides: { statutoryTerm: override } },
		mocks: { t: (app, s) => s },
	})
	return w.vm.displayValues.statutoryTerm
}

describe('format duration', () => {
	it('reads the term in words with its extension in the data widget', () => {
		expect(displayed({ statutoryTerm: 'P28D', statutoryExtension: 'P14D' }, { format: 'duration', extendBy: 'statutoryExtension' })).toBe('4 weeks, extendable by 2')
		expect(displayed({ statutoryTerm: 'P28D' }, { format: 'duration', extendBy: 'statutoryExtension' })).toBe('4 weeks')
	})

	it('keeps the stored text without the format', () => {
		expect(displayed({ statutoryTerm: 'P28D' }, {})).toBe('P28D')
	})

	it('reads the term in words in a facts row', () => {
		const w = mount(CnFactsWidget, {
			props: {
				content: { fields: [{ label: 'Term', path: 'statutoryTerm', format: 'duration', extendBy: 'statutoryExtension' }] },
				objectData: { statutoryTerm: 'P28D', statutoryExtension: 'P14D' },
			},
		})
		expect(w.text()).toContain('4 weeks, extendable by 2')
	})
})
