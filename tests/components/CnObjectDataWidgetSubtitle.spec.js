// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * A data card shows its subtitle (DqZaakContact "Ontvangstbevestiging").
 *
 * @spec openspec/changes/data-widget-subtitle/specs/data-widget-subtitle/spec.md
 */

import { shallowMount } from '@vue/test-utils'
import fs from 'fs'
import path from 'path'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

describe('CnObjectDataWidget: subtitle', () => {
	it('hands its subtitle to the card', () => {
		const w = shallowMount(CnObjectDataWidget, {
			propsData: { schema: { properties: { title: { type: 'string' } } }, objectData: { title: 'x' }, subtitle: 'Awb 4:3a' },
		})
		expect(w.findComponent({ name: 'CnWidgetWrapper' }).props('subtitle')).toBe('Awb 4:3a')
	})

	it('is passed from a data widget by the host', () => {
		const source = fs.readFileSync(path.join(__dirname, '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'), 'utf8')
		const block = source.slice(source.indexOf('<CnObjectDataWidget'), source.indexOf('/>', source.indexOf('<CnObjectDataWidget')))
		expect(block).toContain(':subtitle="widgetSubtitle"')
	})
})
