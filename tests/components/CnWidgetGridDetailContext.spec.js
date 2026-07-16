/**
 * Tests for CnWidgetGrid merging the detail-page object context into
 * each widget's props.
 *
 * On a `type:"detail"` page, CnPageRenderer publishes the loaded object
 * via the `cnDetailObjectContext` inject (a reactive `{ value }` holder).
 * CnWidgetGrid merges `{ objectData, schema, objectType, objectId,
 * register, store }` UNDER each widget's own `props` so detail widgets
 * (`data`, `metadata`, `file-manager`, …) receive the object without the
 * manifest authoring per-widget props — and explicit widget `props`
 * still win on collision.
 */

import { shallowMount } from '@vue/test-utils'
import CnWidgetGrid from '../../src/components/CnWidgetGrid/CnWidgetGrid.vue'

const DataStub = { name: 'DataStub', template: '<div class="data-stub" />' }

const CONTEXT = {
	objectData: { id: 'pub-1', title: 'Hello' },
	schema: { properties: { title: { type: 'string' } } },
	objectType: 'publication-publication',
	objectId: 'pub-1',
	register: 'publication',
	store: { fake: true },
}

function mount(widgets, contextValue, registry = { data: DataStub }) {
	return shallowMount(CnWidgetGrid, {
		propsData: { slotName: 'body', widgets, registry },
		provide: {
			cnDetailObjectContext: contextValue === undefined ? null : { value: contextValue },
		},
	})
}

describe('CnWidgetGrid — detail object-context propagation', () => {
	it('merges the injected object context into a widget with no manifest props', () => {
		const wrapper = mount([{ widgetKey: 'data', slot: 'body', gridWidth: 8 }], CONTEXT)
		const props = wrapper.vm.resolvedWidgets[0].props
		expect(props.objectData).toEqual(CONTEXT.objectData)
		expect(props.schema).toEqual(CONTEXT.schema)
		expect(props.objectType).toBe('publication-publication')
		expect(props.objectId).toBe('pub-1')
		expect(props.register).toBe('publication')
		expect(props.store).toEqual({ fake: true })
	})

	it('lets explicit widget.props win over the injected context', () => {
		const wrapper = mount(
			[{ widgetKey: 'data', slot: 'body', gridWidth: 8, props: { objectType: 'override', title: 'Custom' } }],
			CONTEXT,
		)
		const props = wrapper.vm.resolvedWidgets[0].props
		expect(props.objectType).toBe('override') // explicit wins
		expect(props.title).toBe('Custom') // explicit-only key preserved
		expect(props.objectData).toEqual(CONTEXT.objectData) // context still merged for non-collisions
	})

	it('passes only widget.props when no context is provided (backward compatible)', () => {
		const wrapper = mount([{ widgetKey: 'data', slot: 'body', gridWidth: 8, props: { foo: 'bar' } }], undefined)
		expect(wrapper.vm.resolvedWidgets[0].props).toEqual({ foo: 'bar' })
	})

	it('ignores a context holder whose value is null (pre-load / non-detail)', () => {
		const wrapper = mount([{ widgetKey: 'data', slot: 'body', gridWidth: 8, props: { foo: 'bar' } }], null)
		expect(wrapper.vm.resolvedWidgets[0].props).toEqual({ foo: 'bar' })
	})
})
