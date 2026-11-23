/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A widget in a tab's stack follows the page controls
 * (tabs-stack-follows-page-controls): chips in a tab write a lens into the
 * workspace, and the lists below them in the same tab show by that lens, the
 * way a dashboard-level widget's `visibleWhen` already does.
 */
import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import CnTabsWidget from '../../src/components/CnTabsWidget/CnTabsWidget.vue'

jest.mock('../../src/utils/fetchFilterCounts.js', () => ({
	__esModule: true,
	fetchListTotal: jest.fn().mockResolvedValue(3),
}))

const WIDGETS = [
	{ id: 'w-chips', type: 'workspace-filter', title: 'Show', content: { writes: '@workspace.round' } },
	{ id: 'w-all', type: 'object-table', title: 'All', visibleWhen: { workspace: 'round', op: 'in', value: ['all', ''] }, content: { source: { register: 'r', schema: 'invoice' } } },
	{ id: 'w-paused', type: 'object-table', title: 'Paused', content: { visibleWhen: { workspace: 'round', value: 'paused' }, source: { register: 'r', schema: 'invoice' } } },
	{ id: 'w-note', type: 'text', title: 'Note' },
]

function mountTabs(workspace) {
	return mount(CnTabsWidget, {
		props: { content: { tabs: [{ widgetIds: ['w-chips', 'w-all', 'w-paused', 'w-note'], label: 'Rounds' }] }, availableWidgets: WIDGETS },
		global: {
			provide: { cnWorkspaceContext: workspace },
			stubs: {
				CnDetailWidgetHost: {
					name: 'CnDetailWidgetHost',
					props: ['widget'],
					template: '<div class="host">{{ widget.id }}</div>',
				},
			},
		},
	})
}

const shown = (w) => w.findAll('.host').map((h) => h.text())

describe('CnTabsWidget stack and the page controls', () => {
	it('draws only the stacked widgets whose workspace condition holds', async () => {
		const w = mountTabs(ref({ round: 'paused' }))
		await nextTick()
		expect(shown(w)).toEqual(['w-chips', 'w-paused', 'w-note'])
	})

	it('follows the lens when a control changes it', async () => {
		const workspace = ref({ round: 'paused' })
		const w = mountTabs(workspace)
		await nextTick()
		workspace.value = { round: 'all' }
		await nextTick()
		expect(shown(w)).toEqual(['w-chips', 'w-all', 'w-note'])
	})

	it('reads a plain bag as well as a ref', async () => {
		const w = mountTabs({ round: 'all' })
		await nextTick()
		expect(shown(w)).toEqual(['w-chips', 'w-all', 'w-note'])
	})

	it('hides a widget whose lens is unset, and keeps every widget off a dashboard', async () => {
		const unset = mountTabs(ref({}))
		await nextTick()
		expect(shown(unset)).toEqual(['w-chips', 'w-note'])

		const offDashboard = mount(CnTabsWidget, {
			props: { content: { tabs: [{ widgetIds: ['w-chips', 'w-all', 'w-paused'] }] }, availableWidgets: WIDGETS },
			global: { stubs: { CnDetailWidgetHost: { props: ['widget'], template: '<div class="host">{{ widget.id }}</div>' } } },
		})
		await nextTick()
		expect(shown(offDashboard)).toEqual(['w-chips', 'w-all', 'w-paused'])
	})
})
