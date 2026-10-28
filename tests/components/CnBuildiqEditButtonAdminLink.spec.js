/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * On a page without a manifest editor (an admin settings page) the buildiq
 * square is a link that opens the app in edit mode; with an editor it stays
 * the in-page menu. CnAppRoot enters edit mode from that link's `cn_edit=1`.
 *
 * @spec openspec/changes/admin-buildiq-square/specs/admin-buildiq-square/spec.md
 */
import { mount } from '@vue/test-utils'
import CnAppRoot from '../../src/components/CnAppRoot/CnAppRoot.vue'
import CnBuildiqEditButton from '../../src/components/CnBuildiqEditButton/CnBuildiqEditButton.vue'

const NcActionsStub = { name: 'NcActions', template: '<div class="nc-actions-stub"><slot name="icon" /><slot /></div>' }

describe('CnBuildiqEditButton without an editor', () => {
	it('is a link to the given href', () => {
		const wrapper = mount(CnBuildiqEditButton, {
			props: { available: true, href: '/index.php/apps/pipelinq/?cn_edit=1' },
			global: { stubs: { NcActions: NcActionsStub, NcButton: { props: ['href'], template: '<a class="nc-button-stub" :href="href"><slot name="icon" /></a>' } } },
		})
		const link = wrapper.find('[data-testid="cn-buildiq-edit-link"]')
		expect(link.exists()).toBe(true)
		expect(link.attributes('href')).toBe('/index.php/apps/pipelinq/?cn_edit=1')
		expect(wrapper.find('.nc-actions-stub').exists()).toBe(false)
	})

	it('stays the in-page menu when an editor is there', () => {
		const editor = { editing: { value: false }, enter: jest.fn() }
		const wrapper = mount(CnBuildiqEditButton, {
			props: { available: true, href: '/x', editor },
			global: { stubs: { NcActions: NcActionsStub, CnEditMenuModal: true, CnEditSidebarModal: true, CnEditDataModal: true } },
		})
		expect(wrapper.find('[data-testid="cn-buildiq-edit-link"]').exists()).toBe(false)
		expect(wrapper.find('.nc-actions-stub').exists()).toBe(true)
	})
})

describe('CnAppRoot.enterEditFromUrl', () => {
	const run = (href, available, editing = false) => {
		window.history.replaceState(null, '', href)
		const enter = jest.fn()
		const ctx = { manifestEditor: { editing: { value: editing }, enter } }
		CnAppRoot.methods.enterEditFromUrl.call(ctx, available)
		return enter
	}

	it('enters edit mode once and drops the parameter', () => {
		const enter = run('/apps/pipelinq/?cn_edit=1', true)
		expect(enter).toHaveBeenCalledTimes(1)
		expect(window.location.search).not.toContain('cn_edit')
	})

	it('waits while Buildiq is not available, and ignores a URL without the parameter', () => {
		expect(run('/apps/pipelinq/?cn_edit=1', false)).not.toHaveBeenCalled()
		expect(window.location.search).toContain('cn_edit=1')
		expect(run('/apps/pipelinq/', true)).not.toHaveBeenCalled()
	})
})
