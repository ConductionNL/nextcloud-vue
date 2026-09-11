/**
 * CnPageRenderer must re-derive its page props from an in-app edit (ADR-041).
 *
 * Regression: adding a widget through the Buildiq edit button appeared to do
 * nothing on a page that had no widget grid yet. The modal closed and the
 * working manifest really did gain `config.widgets`, but the renderer never
 * saw it — Options-API `inject` resolves a provided value once, at the
 * component's creation, so the `cnManifest` getter handed over a snapshot of
 * the pre-edit manifest and `resolvedProps` stayed cached forever.
 */

import { shallowMount } from '@vue/test-utils'
import { shallowRef } from 'vue'
import CnPageRenderer from '../../src/components/CnPageRenderer/CnPageRenderer.vue'
import { useManifestEditor } from '../../src/composables/useManifestEditor.js'

const DashboardStub = {
	name: 'DashboardStub',
	props: { widgets: { type: Array, default: null }, layout: { type: Array, default: null } },
	template: '<div class="dashboard-stub" />',
}

function mountRenderer() {
	// A dashboard page with no widget grid — the state the bug needed.
	const manifest = {
		version: '1.0.0',
		menu: [],
		pages: [{ id: 'home', route: '/', type: 'dashboard', title: 'Home', config: {} }],
	}
	const baseRef = shallowRef(manifest)
	const editor = useManifestEditor(baseRef)

	const wrapper = shallowMount(CnPageRenderer, {
		// Mirrors CnAppRoot: `cnManifest` as a getter, the same source as a ref.
		provide: {
			get cnManifest() {
				return editor.source.value
			},
			cnManifestSource: editor.source,
			cnPageTypes: { dashboard: DashboardStub },
			cnTranslate: (k) => k,
		},
		mocks: { $route: { name: 'home', params: {} } },
	})
	return { wrapper, editor }
}

describe('CnPageRenderer live manifest edits', () => {
	it('picks up a widget grid created during an edit session', async () => {
		const { wrapper, editor } = mountRenderer()
		const page = () => wrapper.findComponent(DashboardStub)
		expect(page().exists()).toBe(true)
		expect(page().props('widgets')).toBeNull()

		editor.enter()
		await wrapper.vm.$nextTick()

		// Exactly what CnBuildiqEditButton.onAddWidgetSubmit does: the arrays do
		// not exist yet, so adding one has to create them before it can push.
		const cfg = editor.working.value.pages[0].config
		cfg.widgets = []
		cfg.layout = []
		cfg.widgets.push({ id: 'w-stat-1', type: 'stat', title: 'Open cases' })
		cfg.layout.push({ id: 1, widgetId: 'w-stat-1', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 })
		await wrapper.vm.$nextTick()

		expect(page().props('widgets')).toHaveLength(1)
		expect(page().props('widgets')[0]).toMatchObject({ id: 'w-stat-1', type: 'stat' })
		expect(page().props('layout')).toHaveLength(1)
	})

	it('picks up a widget appended to a grid that already existed', async () => {
		const { wrapper, editor } = mountRenderer()
		editor.enter()
		const cfg = editor.working.value.pages[0].config
		cfg.widgets = [{ id: 'w-1', type: 'stat' }]
		cfg.layout = [{ id: 1, widgetId: 'w-1', gridX: 0, gridY: 0, gridWidth: 6, gridHeight: 3 }]
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent(DashboardStub).props('widgets')).toHaveLength(1)

		cfg.widgets.push({ id: 'w-2', type: 'gauge' })
		await wrapper.vm.$nextTick()
		expect(wrapper.findComponent(DashboardStub).props('widgets')).toHaveLength(2)
	})
})
