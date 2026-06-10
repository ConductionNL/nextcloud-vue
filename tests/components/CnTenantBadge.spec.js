/**
 * Tests for CnTenantBadge — multi-tenancy-context REQ-MT-4.
 */

import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

import CnTenantBadge from '../../src/components/CnTenantBadge/CnTenantBadge.vue'
import { provideTenantContext } from '../../src/composables/useTenantContext.js'

function mountWithContext({ uuid, org, props = {} } = {}) {
	const Wrapper = defineComponent({
		setup() {
			provideTenantContext(uuid, org)
			return () => h(CnTenantBadge, props)
		},
	})
	return mount(Wrapper)
}

describe('CnTenantBadge', () => {
	it('hides when no active organisation is set', () => {
		const wrapper = mountWithContext()
		expect(wrapper.find('.cn-tenant-badge').exists()).toBe(false)
	})

	it('renders the organisation name when context has it', () => {
		const wrapper = mountWithContext({
			uuid: 'org-1',
			org: { uuid: 'org-1', name: 'Vergunningen Tilburg' },
		})
		const el = wrapper.find('.cn-tenant-badge')
		expect(el.exists()).toBe(true)
		expect(el.text()).toContain('Vergunningen Tilburg')
	})

	it('hides on single-org user (organisations prop length === 1)', () => {
		const wrapper = mountWithContext({
			uuid: 'org-1',
			org: { uuid: 'org-1', name: 'Solo' },
			props: { organisations: [{ uuid: 'org-1' }] },
		})
		expect(wrapper.find('.cn-tenant-badge').exists()).toBe(false)
	})

	it('renders on multi-org user (organisations prop length > 1)', () => {
		const wrapper = mountWithContext({
			uuid: 'org-1',
			org: { uuid: 'org-1', name: 'A' },
			props: { organisations: [{ uuid: 'org-1' }, { uuid: 'org-2' }] },
		})
		expect(wrapper.find('.cn-tenant-badge').exists()).toBe(true)
	})

	it('shows fallbackName when no resolved entity but UUID + fallback are set', () => {
		const wrapper = mountWithContext({
			uuid: 'org-1',
			org: null,
			props: { fallbackName: 'Pending tenant' },
		})
		const el = wrapper.find('.cn-tenant-badge')
		expect(el.text()).toContain('Pending tenant')
	})

	it('renders the icon letter from the display name', () => {
		const wrapper = mountWithContext({
			uuid: 'org-1',
			org: { uuid: 'org-1', name: 'beheer' },
		})
		expect(wrapper.find('.cn-tenant-badge__icon').text()).toBe('B')
	})
})
