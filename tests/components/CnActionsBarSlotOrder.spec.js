/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Where the two custom-button slots sit RELATIVE to the primary Add button is
 * the whole point of having two of them, and it is invisible to every other
 * kind of assertion: both slots render, both carry their content, and a
 * refactor that swaps them breaks nothing a "does it render" test can see.
 *
 * `#actions` renders BEFORE Add and `#actions-end` AFTER it. CnIndexPage relies
 * on exactly that split — its app-level `actionsComponent` goes in the first,
 * its saved-views / export / page-config controls in the second, so Add lands
 * between the app's own buttons and the generic browse controls.
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'

const stubs = {
	NcActions: { template: '<div class="nc-actions-stub"><slot /></div>' },
	NcActionButton: { template: '<button><slot /></button>', props: ['disabled', 'title'] },
	NcActionSeparator: { template: '<hr />' },
	NcButton: { template: '<button class="nc-button-stub"><slot /></button>', props: ['type', 'disabled'] },
	NcCheckboxRadioSwitch: { template: '<div><slot /></div>' },
	NcLoadingIcon: { template: '<div />' },
	CnIcon: { template: '<span />', props: ['name', 'size'] },
}

/**
 * Document order of the three markers inside the actions group.
 *
 * @param {object} wrapper Mounted CnActionsBar.
 * @return {Array<string>} `before` / `add` / `after`, in the order rendered.
 */
function renderedOrder(wrapper) {
	const group = wrapper.find('.cn-actions-bar__actions').element
	return Array.from(group.querySelectorAll('[data-marker], [data-testid="cn-cta-primary"]'))
		.map((el) => el.dataset.marker || 'add')
}

describe('CnActionsBar — actions slot order around the Add button', () => {
	it('renders #actions before the Add button and #actions-end after it', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectedIds: [], objectCount: 0, showAdd: true, addLabel: 'Add' },
			stubs,
			slots: {
				actions: '<span data-marker="before">Export</span>',
				'actions-end': '<span data-marker="after">Views</span>',
			},
		})

		expect(renderedOrder(wrapper)).toEqual(['before', 'add', 'after'])
	})

	it('keeps both slots when the Add button is hidden', () => {
		const wrapper = mount(CnActionsBar, {
			propsData: { selectedIds: [], objectCount: 0, showAdd: false },
			stubs,
			slots: {
				actions: '<span data-marker="before">Export</span>',
				'actions-end': '<span data-marker="after">Views</span>',
			},
		})

		expect(renderedOrder(wrapper)).toEqual(['before', 'after'])
	})
})
