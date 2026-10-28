// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget — `fieldLook: "input"` and `overrides[key].hint`.
 *
 * Board PqOfferte draws the quote's facts as a form: each value in a 40px
 * input box under its label, with a line under it ("Staat op de pdf",
 * "Wordt gezet bij verzenden"). A click still edits the field in place.
 *
 * @spec openspec/changes/data-fields-as-inputs/specs/data-widget/spec.md#requirement-a-data-card-can-draw-its-values-as-inputs-with-a-hint
 */

import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = { properties: { title: { type: 'string', title: 'Title' }, sentAt: { type: 'string', format: 'date-time', title: 'Sent' } } }

function mountWith(propsData = {}) {
	return mount(CnObjectDataWidget, {
		propsData: { schema, objectData: { title: 'Website en hosting' }, ...propsData },
		global: { mocks: { t: (app, s) => s }, provide: { cnTranslate: (key) => `T(${key})` }, stubs: { NcActions: true, NcActionButton: true } },
	})
}

describe('CnObjectDataWidget hints', () => {
	it('draws a field\'s hint under its value, translated', () => {
		const w = mountWith({ overrides: { title: { hint: 'Printed on the PDF' } } })
		const hints = w.findAll('.cn-object-data-widget__hint')
		expect(hints).toHaveLength(1)
		expect(hints[0].text()).toBe('T(Printed on the PDF)')
	})

	it('draws no hint without one', () => {
		expect(mountWith().findAll('.cn-object-data-widget__hint')).toHaveLength(0)
	})
})

describe('CnObjectDataWidget fieldLook input', () => {
	it('marks the grid so the values are drawn as inputs', () => {
		expect(mountWith({ fieldLook: 'input' }).find('.cn-object-data-widget__grid').classes()).toContain('cn-object-data-widget__grid--inputs')
		expect(mountWith().find('.cn-object-data-widget__grid').classes()).not.toContain('cn-object-data-widget__grid--inputs')
	})

	it('draws a value as a 40px box with the control border', () => {
		const source = readFileSync(resolve(__dirname, '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'), 'utf8')
		expect(source).toMatch(/\.cn-object-data-widget__grid--inputs \.cn-object-data-widget__value \{[^}]*min-height: 40px[^}]*border: 1px solid var\(--color-border-maxcontrast\)/)
	})

	it('is passed from the widget content by the host', () => {
		const host = readFileSync(resolve(__dirname, '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'), 'utf8')
		expect(host).toContain(':fieldLook="content.fieldLook || \'\'"')
	})
})
