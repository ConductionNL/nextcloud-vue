// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget — conditional immutability (x-openregister-readonly-when).
 *
 * A schema property can declare it becomes read-only when another field on the
 * same object holds a given value (e.g. a hybrid app's identity fields lock when
 * appType === 'hybrid'). The widget honours both an unconditional schema
 * `readOnly` and the conditional `x-openregister-readonly-when` rule.
 */

import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = {
	properties: {
		appType: { type: 'string', readOnly: true },
		slug: { type: 'string', 'x-openregister-readonly-when': { field: 'appType', equals: 'hybrid' } },
		name: { type: 'string' },
	},
}

const mountWith = (objectData) => shallowMount(CnObjectDataWidget, {
	propsData: { schema, objectData },
	mocks: { t: (app, s) => s },
})

const fieldByKey = (vm, key) => vm.resolvedFields.find((f) => f.key === key)

describe('CnObjectDataWidget conditional read-only', () => {
	it('locks the conditional field when the rule matches (hybrid)', () => {
		const w = mountWith({ appType: 'hybrid', slug: 'pipelinq', name: 'Pipelinq' })
		expect(w.vm.isEditable(fieldByKey(w.vm, 'slug'))).toBe(false)
	})

	it('keeps the conditional field editable when the rule does not match (virtual)', () => {
		const w = mountWith({ appType: 'virtual', slug: 'my-app', name: 'My App' })
		expect(w.vm.isEditable(fieldByKey(w.vm, 'slug'))).toBe(true)
	})

	it('always locks an unconditional readOnly field (appType)', () => {
		const wHybrid = mountWith({ appType: 'hybrid', slug: 'pipelinq', name: 'Pipelinq' })
		const wVirtual = mountWith({ appType: 'virtual', slug: 'my-app', name: 'My App' })
		expect(wHybrid.vm.isEditable(fieldByKey(wHybrid.vm, 'appType'))).toBe(false)
		expect(wVirtual.vm.isEditable(fieldByKey(wVirtual.vm, 'appType'))).toBe(false)
	})

	it('leaves a plain field editable', () => {
		const w = mountWith({ appType: 'hybrid', slug: 'pipelinq', name: 'Pipelinq' })
		expect(w.vm.isEditable(fieldByKey(w.vm, 'name'))).toBe(true)
	})
})
