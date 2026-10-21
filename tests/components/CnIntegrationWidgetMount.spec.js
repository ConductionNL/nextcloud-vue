/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnIntegrationWidget's single mode mounts a mount-mode leaf, forwards the
 * record's label, and says "{App} not available" for a leaf nothing
 * registered; a detail page's integration widget says the same.
 *
 * @spec openspec/changes/integration-widget-mounts-leaves/specs/integration-widget-mounts-leaves/spec.md#requirement-a-single-integration-widget-mounts-a-mount-mode-leaf
 * @spec openspec/changes/integration-widget-mounts-leaves/specs/integration-widget-mounts-leaves/spec.md#requirement-an-absent-leaf-says-it-is-not-available
 */
import { flushPromises, mount } from '@vue/test-utils'
import { h } from 'vue'
import CnDetailWidgetHost from '../../src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue'
import CnIntegrationWidget from '../../src/components/CnIntegrationWidget/CnIntegrationWidget.vue'
import { createIntegrationRegistry } from '../../src/integrations/registry.js'

const EmptyStub = {
	name: 'NcEmptyContent',
	props: ['name', 'description'],
	render() {
		return h('div', { class: 'nc-empty', 'data-name': this.name, 'data-description': this.description })
	},
}

/**
 * @return {{entry: object, mounted: Array<object>}} A mount-mode leaf that records what it was mounted with.
 */
function mountLeaf() {
	const mounted = []
	return {
		mounted,
		entry: {
			id: 'decidiq-approval-chain',
			label: 'Approval chain',
			requiredApp: null,
			renderMode: 'mount',
			mount: (el, props) => mounted.push(props),
			unmount: () => {},
		},
	}
}

describe('CnIntegrationWidget single mode', () => {
	it('mounts a mount-mode leaf with the record, its context and its label', async () => {
		const registry = createIntegrationRegistry()
		const { entry, mounted } = mountLeaf()
		registry.register(entry)
		mount(CnIntegrationWidget, {
			props: { registry, only: 'decidiq-approval-chain', register: 'dossiq', schema: 'informatieobject', objectId: 'doc-1', objectLabel: 'Besluit.pdf', leafSurface: 'sidebar-tab' },
			attachTo: document.body,
		})
		await flushPromises()
		expect(mounted).toHaveLength(1)
		expect(mounted[0]).toMatchObject({
			integrationId: 'decidiq-approval-chain',
			register: 'dossiq',
			schema: 'informatieobject',
			objectId: 'doc-1',
			objectLabel: 'Besluit.pdf',
			surface: 'sidebar-tab',
			integrationContext: { register: 'dossiq', schema: 'informatieobject', objectId: 'doc-1' },
		})
	})

	it('names the app when the leaf is not registered', () => {
		const w = mount(CnIntegrationWidget, {
			props: { registry: createIntegrationRegistry(), only: 'decidesk-decisions', appName: 'Decidiq' },
			global: { stubs: { NcEmptyContent: EmptyStub, NcButton: true } },
		})
		expect(w.find('.nc-empty').attributes('data-name')).toBe('Decidiq not available')
	})

	it('keeps the plain line without an app name', () => {
		const w = mount(CnIntegrationWidget, {
			props: { registry: createIntegrationRegistry(), only: 'decidesk-decisions' },
			global: { stubs: { NcEmptyContent: EmptyStub } },
		})
		expect(w.find('.nc-empty').attributes('data-name')).toBe('This integration is not available.')
	})
})

describe('CnDetailWidgetHost with an absent leaf', () => {
	it('shows the not-available state instead of nothing', () => {
		const w = mount(CnDetailWidgetHost, {
			props: { widget: { id: 'case-decisions', type: 'integration', integrationId: 'decidesk-decisions', appName: 'Decidiq', title: 'Decisions' }, objectId: 'case-1' },
			global: {
				provide: { getRegistryProvider: () => null },
				stubs: { NcEmptyContent: EmptyStub, NcButton: true },
			},
		})
		expect(w.find('[data-testid="cn-detail-widget-integration-absent"]').exists()).toBe(true)
		expect(w.find('.nc-empty').attributes('data-name')).toBe('Decidiq not available')
	})
})
