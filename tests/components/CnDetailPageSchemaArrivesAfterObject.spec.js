// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * The auto-body is materialized ONCE, when the OBJECT resolves — and it drops
 * the Data widget when no schema is known at that moment:
 *
 *     shouldRenderAutoBody: { immediate: true,
 *       handler(active) { if (active && !this.autoBodyLayout) this.materializeAutoBody() } }
 *
 *     materializeAutoBody() {
 *       if (!this.currentSchema) {           // <- drops `data`
 *         grid.widgets = grid.widgets.filter((w) => w.widgetId !== 'data')
 *         grid.layout  = grid.layout.filter((l) => l.widgetId !== 'data')
 *       }
 *     }
 *
 * The schema is fetched SEPARATELY and asynchronously — the `currentSchema`
 * watcher one line above says so ("Re-publish once the schema Object resolves
 * (fetched async)") — but that watcher only re-published sidebar state. Nothing
 * rebuilt the body. So whenever the object won the race, the page was left with
 * a Related widget and NO FIELDS, permanently, for the life of the mount.
 *
 * It is invisible on a fast machine, because the schema usually arrives first.
 *
 * Found from a shillinq e2e failure (shillinq#928, #1085). The accessibility
 * snapshot at the moment of failure was the whole `main` region:
 *
 *     - main:
 *       - heading "Requisition" [level=2]
 *       - button "Actions"
 *       - group "related":
 *           - note "No relations yet"
 *       - status
 *
 * Shell, actions and the related group present; none of the sixteen declared
 * `config.fields`. The test had been read as flaky and nearly "fixed" twice with
 * a longer timeout — which would only have waited longer for the same empty page.
 */
import { reactive } from 'vue'
import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

/** A store whose object is present but whose schema has NOT arrived yet. */
function storeAwaitingSchema() {
	return reactive({
		objects: { 'r-s': { 'o-1': { id: 'o-1', name: 'Rex' } } },
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	})
}

function mountWith(objectStore) {
	return mount(CnDetailPage, {
		propsData: {
			register: 'r',
			schema: 's',
			objectId: 'o-1',
			objectStore,
		},
	})
}

const dataIds = (wrapper) =>
	(wrapper.vm.autoBodyLayout || []).map((l) => l.widgetId)

describe('CnDetailPage — the schema can arrive after the object', () => {
	// THE PREMISE. If the auto-body stopped dropping `data` outright this file
	// would pass while measuring nothing, so prove the drop still happens.
	it('drops the Data widget while no schema is known', async () => {
		const store = storeAwaitingSchema()
		const wrapper = mountWith(store)
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.currentObject).toBeTruthy()
		expect(wrapper.vm.currentSchema).toBeFalsy()
		expect(dataIds(wrapper)).not.toContain('data')
	})

	it('rebuilds the body with the Data widget once the schema lands', async () => {
		const store = storeAwaitingSchema()
		const wrapper = mountWith(store)
		await wrapper.vm.$nextTick()

		// Precondition: the object won the race, so the body has no fields.
		expect(dataIds(wrapper)).not.toContain('data')

		// The schema fetch resolves a moment later.
		store.schemas['r-s'] = { properties: { name: { type: 'string' } } }
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.currentSchema).toBeTruthy()
		// The Data widget must appear once a schema is known. Without it the
		// page renders no fields for the life of the mount.
		expect(dataIds(wrapper)).toContain('data')
	})

	// The rebuild must not fire when the body already HAS a data widget, or a
	// user's drag/resize of the auto-body would be reset by a late schema
	// re-publish.
	it('does not rebuild a body that already carries the Data widget', async () => {
		const store = reactive({
			objects: { 'r-s': { 'o-1': { id: 'o-1', name: 'Rex' } } },
			schemas: { 'r-s': { properties: { name: { type: 'string' } } } },
			registerObjectType: jest.fn(),
			fetchObject: jest.fn(async () => null),
			fetchSchema: jest.fn(async () => null),
		})
		const wrapper = mountWith(store)
		await wrapper.vm.$nextTick()

		expect(dataIds(wrapper)).toContain('data')

		// Move the data widget, as a drag would.
		const moved = wrapper.vm.autoBodyLayout.find((l) => l.widgetId === 'data')
		moved.gridY = 7
		// A late schema re-publish (same schema object identity replaced).
		store.schemas['r-s'] = { properties: { name: { type: 'string' } } }
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		// An existing body must not be rebuilt from scratch by a schema
		// re-publish, or a user's drag/resize would be silently reset.
		expect(
			wrapper.vm.autoBodyLayout.find((l) => l.widgetId === 'data').gridY,
		).toBe(7)
	})
})
