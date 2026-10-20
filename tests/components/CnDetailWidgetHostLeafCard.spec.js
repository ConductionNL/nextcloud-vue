/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnDetailWidgetHost: a mount-mode leaf that asks for the library card.
 *
 * A leaf mounts its own framework into a bare element, so on a detail page it
 * drew no card, no title and no designed empty state: planninq's projects
 * leaf showed "0 Projecten", a sentence and two buttons on the page itself.
 * A descriptor with `chrome: "card"` gets the card the catalog widgets have,
 * and reports its count, actions and empty state through `onHeader`.
 *
 * @spec openspec/changes/integration-leaf-card/specs/integration-leaf-card/spec.md#requirement-a-mount-mode-leaf-can-take-the-library-card
 */
import { mount } from '@vue/test-utils'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import { integrations } from '../../src/integrations/registry.js'

const WIDGET = { id: 'case-projects', type: 'integration', integrationId: 'projects', title: 'Projects' }

/**
 * Register a mount-mode leaf that records what it was handed.
 *
 * @param {object} extra Descriptor fields to add.
 * @return {Array<object>} The props of every mount.
 */
function registerLeaf(extra = {}) {
	const mounts = []
	integrations.register({
		id: 'projects',
		label: 'Projects',
		requiredApp: null,
		renderMode: 'mount',
		mount: (el, props) => { mounts.push(props) },
		unmount: () => {},
		...extra,
	})
	return mounts
}

/**
 * Mount the host on a case.
 *
 * @param {string} chrome The surface's chrome.
 * @return {object} The wrapper.
 */
function mountHost(chrome = 'card') {
	return mount(CnDetailWidgetHost, {
		props: { widget: WIDGET, chrome, inGridCell: true, surface: 'detail-page', objectId: 'case-1', register: 'dossiq', schema: 'case' },
		global: { stubs: { CnIcon: true } },
	})
}

describe('CnDetailWidgetHost: a mount-mode leaf in the library card', () => {
	afterEach(() => integrations.__resetForTests())

	it('draws the card with the manifest title around a leaf that asks for it', () => {
		registerLeaf({ chrome: 'card' })
		const wrapper = mountHost()

		const card = wrapper.find('[data-testid="cn-detail-widget-leaf-card"]')
		expect(card.exists()).toBe(true)
		expect(card.find('.cn-widget-wrapper__title').text()).toBe('Projects')
		expect(card.find('[data-testid="cn-leaf-mount-host"]').exists()).toBe(true)
	})

	it('leaves a leaf that draws its own card bare', () => {
		const mounts = registerLeaf()
		const wrapper = mountHost()

		expect(wrapper.find('[data-testid="cn-detail-widget-leaf-card"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-leaf-mount-host"]').exists()).toBe(true)
		expect(mounts[0].onHeader).toBeUndefined()
	})

	it('leaves the card to the tab strip in a tab panel', () => {
		registerLeaf({ chrome: 'card' })
		const wrapper = mountHost('bare')

		expect(wrapper.find('[data-testid="cn-detail-widget-leaf-card"]').exists()).toBe(false)
	})

	it('draws the count, the actions and the empty state the leaf reports', async () => {
		const mounts = registerLeaf({ chrome: 'card' })
		const wrapper = mountHost()
		const run = jest.fn()

		mounts[0].onHeader({
			count: 0,
			actions: [{ label: 'Open in Planninq', run }, { label: 'New project', run }],
			empty: { name: 'No projects for this case yet' },
		})
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-detail-widget-header-count"]').text()).toBe('0')
		const actions = wrapper.findAll('[data-testid="cn-detail-widget-header-action"]')
		expect(actions.map((a) => a.text())).toEqual(['Open in Planninq', 'New project'])
		await actions.at(1).trigger('click')
		expect(run).toHaveBeenCalledTimes(1)
		expect(wrapper.find('[data-testid="cn-widget-empty-state"]').text()).toContain('No projects for this case yet')
	})

	it('drops the empty state once the leaf reports rows', async () => {
		const mounts = registerLeaf({ chrome: 'card' })
		const wrapper = mountHost()

		mounts[0].onHeader({ count: 0, empty: { name: 'None yet' } })
		await wrapper.vm.$nextTick()
		mounts[0].onHeader({ count: 2 })
		await wrapper.vm.$nextTick()

		expect(wrapper.find('[data-testid="cn-widget-empty-state"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-widget-header-count"]').text()).toBe('2')
	})
})
