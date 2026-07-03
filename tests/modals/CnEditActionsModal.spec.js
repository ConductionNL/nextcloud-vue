// SPDX-License-Identifier: EUPL-1.2
// SPDX-FileCopyrightText: 2026 Conduction B.V.

/**
 * Tests for CnEditActionsModal's empty state: when no page is editable, the
 * dialog shows the empty content and must NOT render footer actions (Add
 * action / Done), matching the pre-migration NcModal which suppressed the
 * footer entirely. When a page exists, the footer buttons render.
 */

import { mount } from '@vue/test-utils'
import CnEditActionsModal from '../../src/modals/CnEditActionsModal.vue'

jest.mock('@nextcloud/l10n', () => ({ translate: (_app, s) => s }))

const stubs = {
	NcDialog: { template: '<div><slot /><footer class="footer"><slot name="actions" /></footer></div>' },
	NcButton: { template: '<button><slot /></button>' },
	NcEmptyContent: { template: '<div class="empty" />' },
	NcTextField: true,
	NcSelect: true,
	NcLoadingIcon: true,
	Plus: true,
	Delete: true,
	ArrowUp: true,
	ArrowDown: true,
}

const footerText = (wrapper) => wrapper.find('.footer').text()

describe('CnEditActionsModal — empty state footer', () => {
	it('renders no footer actions when there is no editable page', () => {
		const wrapper = mount(CnEditActionsModal, { propsData: { working: null, pageId: '' }, stubs })
		expect(wrapper.vm.page).toBeNull()
		expect(wrapper.find('.empty').exists()).toBe(true)
		expect(wrapper.findAll('.footer button').length).toBe(0)
		expect(footerText(wrapper)).not.toContain('Add action')
		expect(footerText(wrapper)).not.toContain('Done')
	})

	it('renders the footer actions when a page is editable', () => {
		const wrapper = mount(CnEditActionsModal, {
			propsData: { working: { pages: [{ id: 'p1', config: { actions: [] } }] }, pageId: 'p1' },
			stubs,
		})
		expect(wrapper.vm.page).not.toBeNull()
		expect(footerText(wrapper)).toContain('Add action')
		expect(footerText(wrapper)).toContain('Done')
	})
})
