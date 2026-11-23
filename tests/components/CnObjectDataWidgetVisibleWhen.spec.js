// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/*
 * CnObjectDataWidget: a field that shows only for some objects.
 *
 * `include` names the same keys for every object. A client can be a person or
 * an organisation, and only a person has a preferred name, so an organisation
 * showed an empty Preferred name row. `overrides[key].visibleWhen` names the
 * field and value the row depends on.
 */

import { shallowMount } from '@vue/test-utils'
import CnObjectDataWidget from '../../src/components/CnObjectDataWidget/CnObjectDataWidget.vue'

const schema = {
	properties: {
		name: { type: 'string' },
		type: { type: 'string', enum: ['person', 'organization'] },
		preferredName: { type: 'string' },
		website: { type: 'string' },
	},
}

const include = ['name', 'preferredName', 'website']

function mountWith(objectData, overrides) {
	return shallowMount(CnObjectDataWidget, {
		propsData: { schema, objectData, include, overrides },
		mocks: { t: (app, s) => s },
	})
}

const keys = (vm) => vm.resolvedFields.map((f) => f.key)

describe('CnObjectDataWidget visibleWhen', () => {
	const personOnly = { preferredName: { visibleWhen: { field: 'type', value: 'person' } } }

	it('shows the field for the objects the rule matches', () => {
		const w = mountWith({ name: 'Johannes Jansen', type: 'person' }, personOnly)
		expect(keys(w.vm)).toEqual(['name', 'preferredName', 'website'])
	})

	it('leaves it out for the others, also when it is empty there', () => {
		const w = mountWith({ name: 'Gemeente Zuiddrecht', type: 'organization' }, personOnly)
		expect(keys(w.vm)).toEqual(['name', 'website'])
	})

	it('reads the unsaved value of the field it depends on', async () => {
		const w = mountWith({ name: 'Gemeente Zuiddrecht', type: 'organization' }, personOnly)
		w.vm.dirtyFields = { ...w.vm.dirtyFields, type: 'person' }
		await w.vm.$nextTick()
		expect(keys(w.vm)).toContain('preferredName')
	})

	it('speaks the shared predicate: neq, in, all', () => {
		const object = { name: 'X', type: 'organization', website: '' }
		const shown = (rule) => keys(mountWith(object, { preferredName: { visibleWhen: rule } }).vm).includes('preferredName')
		expect(shown({ field: 'type', op: 'neq', value: 'organization' })).toBe(false)
		expect(shown({ field: 'type', op: 'neq', value: 'person' })).toBe(true)
		expect(shown({ field: 'type', op: 'in', value: ['person', 'organization'] })).toBe(true)
		expect(shown({ all: [{ field: 'type', value: 'organization' }, { field: 'website', op: 'notEmpty' }] })).toBe(false)
	})

	it('shows a field whose rule needs a request, and every field without a rule', () => {
		const object = { name: 'X', type: 'organization' }
		expect(keys(mountWith(object, { preferredName: { visibleWhen: { endpoint: '/x', field: 'a', value: 1 } } }).vm)).toContain('preferredName')
		expect(keys(mountWith(object, {}).vm)).toEqual(['name', 'preferredName', 'website'])
	})

	it('hides a field whose local rule is malformed, as every other local predicate does', () => {
		const object = { name: 'X', type: 'person' }
		expect(keys(mountWith(object, { preferredName: { visibleWhen: { value: 'person' } } }).vm)).not.toContain('preferredName')
	})

	it('works beside hide-empty', () => {
		const w = shallowMount(CnObjectDataWidget, {
			propsData: { schema, include, overrides: personOnly, hideEmpty: true, objectData: { name: 'J', type: 'person', website: '' } },
			mocks: { t: (app, s) => s },
		})
		expect(keys(w.vm)).toEqual(['name'])
	})
})
