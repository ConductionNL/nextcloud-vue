/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for the pages-editor data-source refresh (pages-editor-data-sources spec).
 *
 * The defect being guarded against: CnAppRoot's `provide()` runs once, so the
 * `dataSources` snapshot could never reflect a schema created after app boot.
 * The fix is a stable reactive holder (`cnDataSourcesState`) plus a provided
 * `cnRefreshDataSources()` that the pages-editor modals call on open.
 */
import Vue from 'vue'
import { mount } from '@vue/test-utils'
import CnPageTreeRow from '../../src/components/CnPageTreeNode/CnPageTreeRow.vue'

const Stub = (name, props = []) => ({ name, props, template: '<div><slot /><slot name="trigger" :attrs="{}" /></div>' })

const SNAPSHOT = {
	registers: [
		{ value: 'app-prod', label: 'App (production)', schemas: [{ value: 'cow', label: 'Cow', columns: ['name'] }] },
	],
}

// The same register, after a "Barn" schema was created post-boot.
const REFRESHED = {
	registers: [
		{
			value: 'app-prod',
			label: 'App (production)',
			schemas: [
				{ value: 'cow', label: 'Cow', columns: ['name'] },
				{ value: 'barn', label: 'Barn', columns: ['name'] },
			],
		},
	],
}

// Vue.observable mirrors what living in CnAppRoot's data() does: it is the ONLY
// reason mutating the holder in place reaches descendants. A plain object handed
// to provide() would never be reactive.
function makeHolder(overrides = {}) {
	return Vue.observable({ value: null, loading: false, error: null, hasLoader: false, ...overrides })
}

function mountRow(page, provide = {}) {
	return mount(CnPageTreeRow, {
		propsData: { page, canAddChild: true },
		provide,
		stubs: {
			NcButton: Stub('NcButton', ['type', 'ariaLabel']),
			NcTextField: Stub('NcTextField', ['value', 'label']),
			NcSelect: Stub('NcSelect', ['value', 'options', 'multiple', 'loading', 'disabled']),
			NcNoteCard: Stub('NcNoteCard', ['type']),
			NcPopover: Stub('NcPopover', ['shown']),
			Cog: Stub('Cog'),
			Plus: Stub('Plus'),
			Delete: Stub('Delete'),
			DragVertical: Stub('DragVertical'),
		},
	})
}

const indexPage = () => ({ id: 'p', type: 'index', config: { register: 'app-prod' } })

describe('CnPageTreeRow — data-source resolution', () => {
	it('falls back to the legacy snapshot when no holder is provided', () => {
		const vm = mountRow(indexPage(), { cnDataSources: SNAPSHOT }).vm
		expect(vm.hasDataSources).toBe(true)
		expect(vm.showPickers).toBe(true)
		expect(vm.schemaOptions.map((o) => o.value)).toEqual(['cow'])
	})

	it('prefers the live holder over the snapshot', () => {
		const vm = mountRow(indexPage(), {
			cnDataSources: SNAPSHOT,
			cnDataSourcesState: makeHolder({ value: REFRESHED, hasLoader: true }),
		}).vm
		expect(vm.schemaOptions.map((o) => o.value)).toEqual(['cow', 'barn'])
	})

	it('a schema added to the holder after mount reaches the dropdown — the Barn case', async () => {
		// The holder is provided by reference and mutated in place; its identity
		// never changes, which is what makes the one-shot provide() see the update.
		const holder = makeHolder({ value: SNAPSHOT, hasLoader: true })
		const wrapper = mountRow(indexPage(), { cnDataSources: null, cnDataSourcesState: holder })

		expect(wrapper.vm.schemaOptions.map((o) => o.value)).toEqual(['cow'])

		holder.value = REFRESHED
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.schemaOptions.map((o) => o.value)).toEqual(['cow', 'barn'])
	})

	it('renders free-text fields when neither snapshot nor loader is present', () => {
		const vm = mountRow(indexPage(), {}).vm
		expect(vm.hasDataSources).toBe(false)
		expect(vm.showPickers).toBe(false)
	})

	it('shows pickers (not free text) while a configured loader is still fetching', () => {
		const vm = mountRow(indexPage(), {
			cnDataSourcesState: makeHolder({ value: null, loading: true, hasLoader: true }),
		}).vm
		// No data yet, but a loader is configured — the panel must not flash
		// free-text inputs and then swap them for selects.
		expect(vm.hasDataSources).toBe(false)
		expect(vm.showPickers).toBe(true)
		expect(vm.dataSourcesLoading).toBe(true)
	})

	it('surfaces an error and retries via cnRefreshDataSources', async () => {
		const cnRefreshDataSources = jest.fn()
		const wrapper = mountRow(indexPage(), {
			cnDataSourcesState: makeHolder({ error: new Error('boom'), hasLoader: true }),
			cnRefreshDataSources,
		})
		expect(wrapper.vm.dataSourcesError).toBeTruthy()

		// The pickers (and the error notice above them) live in the cog panel.
		wrapper.vm.expanded = true
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent({ name: 'NcNoteCard' }).exists()).toBe(true)

		wrapper.vm.retryDataSources()
		expect(cnRefreshDataSources).toHaveBeenCalledTimes(1)
	})

	it('keeps the stored schema selectable even when it is absent from the list', () => {
		// The synthesised fallback option (design D5) — without it, a failed or
		// in-flight fetch would blank a valid stored config.schema in the UI and
		// the user could save the page with it cleared.
		const page = { id: 'p', type: 'index', config: { register: 'app-prod', schema: 'barn' } }
		const vm = mountRow(page, { cnDataSources: SNAPSHOT }).vm
		expect(vm.selectedSchema).toEqual({ value: 'barn', label: 'barn' })
	})
})

describe('pages-editor modals refresh on open', () => {
	// Both modals are v-if-mounted by their hosts, so mount == open.
	const CnEditPagesModal = require('../../src/modals/CnEditPagesModal.vue').default

	it('CnEditPagesModal calls cnRefreshDataSources exactly once on open', () => {
		const cnRefreshDataSources = jest.fn()
		mount(CnEditPagesModal, {
			propsData: { working: { pages: [] } },
			provide: { cnRefreshDataSources },
			stubs: {
				NcModal: Stub('NcModal', ['show', 'size']),
				NcButton: Stub('NcButton', ['type']),
				NcEmptyContent: Stub('NcEmptyContent', ['name']),
				NcLoadingIcon: Stub('NcLoadingIcon'),
				CnPageTreeNode: Stub('CnPageTreeNode', ['pages']),
				Plus: Stub('Plus'),
			},
		})
		expect(cnRefreshDataSources).toHaveBeenCalledTimes(1)
	})

	it('CnEditPagesModal mounts fine when the host provides no loader', () => {
		expect(() => mount(CnEditPagesModal, {
			propsData: { working: { pages: [] } },
			stubs: {
				NcModal: Stub('NcModal', ['show', 'size']),
				NcButton: Stub('NcButton', ['type']),
				NcEmptyContent: Stub('NcEmptyContent', ['name']),
				NcLoadingIcon: Stub('NcLoadingIcon'),
				CnPageTreeNode: Stub('CnPageTreeNode', ['pages']),
				Plus: Stub('Plus'),
			},
		})).not.toThrow()
	})
})

describe('CnAppRoot — refreshDataSources()', () => {
	// Exercise the method against a bare Options-API stand-in carrying the real
	// implementation, so the holder/loader contract is tested without dragging in
	// CnAppRoot's full mount (capabilities API, router, manifest phases).
	const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default
	const { refreshDataSources } = CnAppRoot.methods

	function harness(loader, initial = null) {
		return {
			dataSourcesLoader: loader,
			dataSourcesState: makeHolder({ value: initial, hasLoader: typeof loader === 'function' }),
			_dataSourcesInFlight: null,
			refreshDataSources,
		}
	}

	it('is a no-op without a loader', async () => {
		const ctx = harness(null)
		await ctx.refreshDataSources()
		expect(ctx.dataSourcesState.value).toBeNull()
		expect(ctx.dataSourcesState.loading).toBe(false)
	})

	it('replaces the value on success and clears loading', async () => {
		const ctx = harness(jest.fn().mockResolvedValue(REFRESHED), SNAPSHOT)
		await ctx.refreshDataSources()
		expect(ctx.dataSourcesState.value).toBe(REFRESHED)
		expect(ctx.dataSourcesState.loading).toBe(false)
		expect(ctx.dataSourcesState.error).toBeNull()
	})

	it('de-dupes a refresh that is already in flight', async () => {
		let resolve
		const loader = jest.fn(() => new Promise((r) => { resolve = r }))
		const ctx = harness(loader)

		const a = ctx.refreshDataSources()
		const b = ctx.refreshDataSources()
		resolve(REFRESHED)
		await Promise.all([a, b])

		// Two modals opening at once must issue one fetch, not two.
		expect(loader).toHaveBeenCalledTimes(1)
		expect(ctx.dataSourcesState.value).toBe(REFRESHED)
	})

	it('keeps the last good value and records the error when the loader rejects', async () => {
		const ctx = harness(jest.fn().mockRejectedValue(new Error('network')), SNAPSHOT)
		await ctx.refreshDataSources()
		expect(ctx.dataSourcesState.value).toBe(SNAPSHOT)
		expect(ctx.dataSourcesState.error).toBeInstanceOf(Error)
		expect(ctx.dataSourcesState.loading).toBe(false)
	})

	it('treats a synchronously-throwing loader like a rejected promise', async () => {
		const ctx = harness(() => { throw new Error('sync boom') }, SNAPSHOT)
		await expect(ctx.refreshDataSources()).resolves.toBeUndefined()
		expect(ctx.dataSourcesState.error).toBeInstanceOf(Error)
		expect(ctx.dataSourcesState.value).toBe(SNAPSHOT)
		expect(ctx.dataSourcesState.loading).toBe(false)
	})
})
