/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Tests for CnActionsBar's built-in "Request a feature" overflow entry
 * (#7) — opt-in via showRequestFeature, emits @request-feature on click —
 * and the built-in "Documentation" new-tab link (opt-in via
 * documentationUrl).
 */

import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = {
	NcActions: { template: '<div class="nc-actions-stub"><slot /></div>' },
	NcActionButton: {
		inheritAttrs: false,
		template: '<button :data-testid="$attrs[\'data-testid\']" @click="$emit(\'click\')"><slot name="icon" /><slot /></button>',
		props: ['disabled'],
	},
	NcActionLink: {
		inheritAttrs: false,
		template: '<a :data-testid="$attrs[\'data-testid\']" :href="href" :target="target" :rel="rel"><slot name="icon" /><slot /></a>',
		props: ['href', 'target', 'rel'],
	},
	NcActionSeparator: { template: '<hr />' },
	NcButton: { template: '<button @click="$emit(\'click\')"><slot /></button>', props: ['type', 'disabled'] },
	NcCheckboxRadioSwitch: { template: '<div><slot /></div>' },
	NcLoadingIcon: { template: '<div />' },
	CnIcon: { template: '<span />', props: ['name', 'size'] },
	Plus: { template: '<span />' },
	Refresh: { template: '<span />' },
	LightbulbOutline: { template: '<span class="lightbulb-stub" />' },
	BookOpenVariant: { template: '<span class="book-stub" />' },
	ContentCopy: { template: '<span />' },
	TrashCanOutline: { template: '<span />' },
	Import: { template: '<span />' },
	Export: { template: '<span />' },
}

const mountBar = (extra = {}) => mount(CnActionsBar, {
	propsData: { selectedIds: [], objectCount: 0, ...extra },
	stubs,
})

describe('CnActionsBar — Request a feature (#7)', () => {
	it('does NOT render the entry by default', () => {
		const wrapper = mountBar()
		expect(wrapper.find('[data-testid="cn-actions-bar-request-feature"]').exists()).toBe(false)
	})

	it('renders the entry when showRequestFeature is true', () => {
		const wrapper = mountBar({ showRequestFeature: true })
		expect(wrapper.find('[data-testid="cn-actions-bar-request-feature"]').exists()).toBe(true)
	})

	it('emits @request-feature on click', async () => {
		const wrapper = mountBar({ showRequestFeature: true })
		await wrapper.find('[data-testid="cn-actions-bar-request-feature"]').trigger('click')
		expect(wrapper.emitted('request-feature')).toBeTruthy()
		expect(wrapper.emitted('request-feature')).toHaveLength(1)
	})
})

describe('CnActionsBar — Documentation link', () => {
	it('does NOT render the entry by default', () => {
		const wrapper = mountBar()
		expect(wrapper.find('[data-testid="cn-actions-bar-documentation"]').exists()).toBe(false)
	})

	it('renders a new-tab link when documentationUrl is set', () => {
		const wrapper = mountBar({ documentationUrl: 'https://docs.example.test/list' })
		const link = wrapper.find('[data-testid="cn-actions-bar-documentation"]')
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toBe('https://docs.example.test/list')
		expect(link.attributes('target')).toBe('_blank')
		expect(link.attributes('rel')).toBe('noopener noreferrer')
	})
})
