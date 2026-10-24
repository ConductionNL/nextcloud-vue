// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget `footnote`: a muted line under the fields, through the
 * host translate (DqZaakContact "Ontvangstbevestiging").
 *
 * @spec openspec/changes/data-widget-footnote/specs/data-widget-footnote/spec.md
 */

import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = { properties: { title: { type: 'string' } } }

function mountWidget(props) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema, objectData: { title: 'Lindelaan' }, ...props },
		provide: { cnTranslate: (key) => (key === 'Logged elsewhere' ? 'Elders vastgelegd' : key) },
	})
}

describe('CnObjectDataWidget: footnote', () => {
	it('draws the footnote under the fields, translated', () => {
		const note = mountWidget({ footnote: 'Logged elsewhere' }).find('[data-testid="cn-object-data-widget-footnote"]')
		expect(note.exists()).toBe(true)
		expect(note.text()).toBe('Elders vastgelegd')
	})

	it('draws nothing without one', () => {
		expect(mountWidget({}).find('[data-testid="cn-object-data-widget-footnote"]').exists()).toBe(false)
	})

	it('is passed from a data widget content by the host', () => {
		const source = require('fs').readFileSync(require('path').join(__dirname, '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'), 'utf8')
		const block = source.slice(source.indexOf('<CnObjectDataWidget'), source.indexOf('/>', source.indexOf('<CnObjectDataWidget')))
		expect(block).toContain(':footnote="content.footnote || \'\'"')
	})
})
