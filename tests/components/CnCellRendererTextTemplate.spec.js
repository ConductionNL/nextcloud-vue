/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnCellRenderer: a `label` or `badge` cell can word its value with a
 * template over the row (`widgetProps.textTemplate`, translated): DqPostvak's
 * Voorstel pill "Lijkt op 2026-0079" and Binnengekomen via "E-mail,
 * gemeente@". `{value}` is the cell's own label; `{field|mailbox}` keeps the
 * part of an address before the @.
 *
 * @spec openspec/changes/cell-text-template/specs/cell-text-template/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text) => text,
	getCanonicalLocale: () => 'en-GB',
}))

import { mount } from '@vue/test-utils'
import CnCellRenderer from '../../src/components/CnCellRenderer/CnCellRenderer.vue'
import { fillTemplate } from '../../src/utils/fillTemplate.js'

const ROW = { channel: 'email', recipient: 'gemeente@zuiddrecht.example', suggestion: { identifier: '2026-0079' } }
const translate = (text) => ({ 'Looks like {value}': 'Lijkt op {value}', 'E-mail': 'E-mail' })[text] || text

describe('CnCellRenderer textTemplate', () => {
	it('words a badge from its value', () => {
		const w = mount(CnCellRenderer, {
			props: { value: '2026-0079', row: ROW, widget: 'badge', widgetProps: { variant: 'info', textTemplate: 'Looks like {value}' } },
			global: { provide: { cnTranslate: translate } },
		})
		expect(w.text()).toBe('Lijkt op 2026-0079')
	})

	it('words a label from its enum label and another field of the row', () => {
		const w = mount(CnCellRenderer, {
			props: { value: 'email', row: ROW, widget: 'label', property: { type: 'string', enum: ['email'], enumLabels: { email: 'E-mail' } }, widgetProps: { textTemplate: '{value}, {recipient|mailbox}' } },
			global: { provide: { cnTranslate: translate } },
		})
		expect(w.text()).toBe('E-mail, gemeente@')
	})

	it('keeps the plain value without a template', () => {
		const w = mount(CnCellRenderer, { props: { value: '2026-0079', row: ROW, widget: 'badge', widgetProps: { variant: 'info' } } })
		expect(w.text()).toBe('2026-0079')
	})
})

describe('fillTemplate mailbox', () => {
	it('keeps the part before the @, with the @', () => {
		expect(fillTemplate('{recipient|mailbox}', ROW)).toBe('gemeente@')
		expect(fillTemplate('{channel|mailbox}', ROW)).toBe('email')
	})
})
