/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * An editable value is a button named after its field. The name goes through
 * the library's translations, so a Dutch page does not announce
 * "Click to edit Zaaktype" (WCAG 3.1.2, 2.4.6).
 */
import { shallowMount } from '@vue/test-utils'

jest.mock('@nextcloud/l10n', () => {
	const fill = (text, vars) => String(text).replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? vars[k] : m))
	return {
		translate: (app, text, vars) => (app === 'nextcloud-vue' && text === 'Edit {title}' ? fill('{title} bewerken', vars) : fill(text, vars)),
		translatePlural: (app, one, other, n, vars) => fill(n === 1 ? one : other, { count: n, ...vars }),
		getLanguage: () => 'nl',
		getLocale: () => 'nl',
	}
})

import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

describe('CnObjectDataWidget — editable value name', () => {
	it('names an editable value with the translated "Edit {title}"', () => {
		const w = shallowMount(CnObjectDataWidget, {
			propsData: {
				schema: { properties: { caseType: { type: 'string', title: 'Zaaktype' } } },
				objectData: { id: '1', caseType: 'Woo-verzoek' },
				objectType: 'case',
				editable: true,
			},
			stubs: { CnWidgetWrapper: { template: '<div><slot /></div>' }, CnFormDialog: true, CnObjectMetadataModal: true },
		})
		const value = w.find('.cn-object-data-widget__value--editable')
		expect(value.exists()).toBe(true)
		expect(value.attributes('role')).toBe('button')
		expect(value.attributes('aria-label')).toBe('Zaaktype bewerken')
	})
})
