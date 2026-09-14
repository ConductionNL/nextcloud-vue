/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The record as a place: the tab in the address, next and previous within
 * the list it came from, and the skip link to its primary action.
 *
 * The tab assertions are all about the ADDRESS, not the tab strip. A tab
 * that switches without the address following it looks completely correct on
 * screen and is the exact failure this change exists to end: a handler who
 * copies the address while on the Documents tab and sends a colleague to the
 * Summary tab instead.
 *
 * @spec openspec/changes/case-page-and-list-as-a-place/specs/index-page/spec.md
 */

import { shallowMount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'

/**
 * Mount the detail page with a router that records what it is asked to do.
 *
 * @param {object} [props] Props to merge in.
 * @param {object} [query] The address's query.
 * @return {object} The wrapper, plus the push and replace spies.
 */
function mountPage(props = {}, query = {}) {
	const push = jest.fn().mockResolvedValue(undefined)
	const replace = jest.fn().mockResolvedValue(undefined)
	const wrapper = shallowMount(CnDetailPage, {
		props: { title: 'Case', objectId: 'case-1', subscribe: false, ...props },
		global: {
			stubs: { teleport: true },
			mocks: {
				t: (_app, str) => str,
				$route: { name: 'case-detail', params: { id: 'case-1' }, query },
				$router: { push, replace },
			},
		},
	})
	return { wrapper, push, replace }
}

describe('CnDetailPage — the active tab is part of the address', () => {
	it('puts the tab a reader chose into the address', () => {
		const { wrapper, push } = mountPage({ tabInAddress: true }, { _tab: 'summary' })

		wrapper.vm.onTabChange('documents')

		expect(push).toHaveBeenCalledWith(expect.objectContaining({
			query: expect.objectContaining({ _tab: 'documents' }),
		}))
	})

	it('reads the tab the address asks for', () => {
		const { wrapper } = mountPage({ tabInAddress: true }, { _tab: 'documents' })

		expect(wrapper.vm.requestedTabFromAddress()).toBe('documents')
	})

	it('reads a tabless address as asking for no tab in particular', () => {
		const { wrapper } = mountPage({ tabInAddress: true }, {})

		expect(wrapper.vm.requestedTabFromAddress()).toBeNull()
	})

	it('replaces rather than pushes when correcting a tabless address, so back still works', () => {
		// ADR-052: the tabless address is being corrected to its canonical
		// form. A push would make the back button walk into the address the
		// reader was just moved off, which reads as back doing nothing.
		const { wrapper, push, replace } = mountPage({ tabInAddress: true }, {})

		wrapper.vm.onSidebarTabChange('summary')

		expect(replace).toHaveBeenCalled()
		expect(push).not.toHaveBeenCalled()
	})

	it('pushes a tab the reader actually chose, so back and forward walk the tabs they visited', () => {
		const { wrapper, push, replace } = mountPage({ tabInAddress: true }, { _tab: 'summary' })

		wrapper.vm.onSidebarTabChange('documents')

		expect(push).toHaveBeenCalled()
		expect(replace).not.toHaveBeenCalled()
	})

	it('writes nothing when the tab is already the one in the address', () => {
		const { wrapper, push, replace } = mountPage({ tabInAddress: true }, { _tab: 'documents' })

		wrapper.vm.onTabChange('documents')

		expect(push).not.toHaveBeenCalled()
		expect(replace).not.toHaveBeenCalled()
	})

	it('leaves the address alone for a page that did not declare the key', () => {
		const { wrapper, push, replace } = mountPage({ tabInAddress: false }, {})

		wrapper.vm.onTabChange('documents')

		expect(push).not.toHaveBeenCalled()
		expect(replace).not.toHaveBeenCalled()
		// Still told, so a host may mirror the tab somewhere of its own.
		expect(wrapper.emitted('tab-change')[0]).toEqual(['documents'])
	})

	it('ignores an empty tab id rather than writing ?_tab= into the address', () => {
		const { wrapper, push } = mountPage({ tabInAddress: true }, {})

		wrapper.vm.onTabChange('')

		expect(push).not.toHaveBeenCalled()
		expect(wrapper.emitted('tab-change')).toBeUndefined()
	})

	it('publishes the requested tab and the way back on the sidebar channel', () => {
		const objectSidebarState = {}
		const wrapper = shallowMount(CnDetailPage, {
			props: {
				title: 'Case',
				objectId: 'case-1',
				subscribe: false,
				tabInAddress: true,
				objectType: 'case',
				sidebar: { enabled: true },
				sidebarTabs: [{ id: 'summary' }, { id: 'documents' }],
			},
			global: {
				stubs: { teleport: true },
				provide: { objectSidebarState, cnHostsObjectSidebar: true },
				mocks: {
					t: (_app, str) => str,
					$route: { name: 'case-detail', params: { id: 'case-1' }, query: { _tab: 'documents' } },
					$router: { push: jest.fn(), replace: jest.fn() },
				},
			},
		})

		wrapper.vm.syncSidebarState()

		expect(objectSidebarState.requestedTab).toBe('documents')
		expect(typeof objectSidebarState.onTabChange).toBe('function')
	})
})

describe('CnDetailPage — next and previous inside the list it came from', () => {
	const walking = { available: true, isFirst: false, isLast: false, position: 4, total: 40 }

	it('offers both controls and says where in the queue the reader is', () => {
		const { wrapper } = mountPage({ listNavigation: walking })

		expect(wrapper.find('[data-testid="cn-detail-page-list-nav"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-detail-page-list-position"]').text()).toBe('4 of 40')
	})

	it('offers neither on a link carrying no list context', () => {
		const { wrapper } = mountPage({ listNavigation: null })

		expect(wrapper.find('[data-testid="cn-detail-page-list-nav"]').exists()).toBe(false)
	})

	it('offers neither when the list context named a list this record is not in', () => {
		const { wrapper } = mountPage({ listNavigation: { available: false, isFirst: false, isLast: false, position: 0, total: 40 } })

		expect(wrapper.find('[data-testid="cn-detail-page-list-nav"]').exists()).toBe(false)
	})

	it('asks the host to step, because the host owns the router', () => {
		const { wrapper } = mountPage({ listNavigation: walking })

		wrapper.find('[data-testid="cn-detail-page-next"]').trigger('click')

		expect(wrapper.emitted('next-record')).toHaveLength(1)
	})

	it('says the first and the last record are exactly that, rather than wrapping', () => {
		const first = mountPage({ listNavigation: { ...walking, isFirst: true, position: 1 } }).wrapper
		const last = mountPage({ listNavigation: { ...walking, isLast: true, position: 40 } }).wrapper

		expect(first.vm.previousRecordLabel).toBe('This is the first record in the list')
		expect(last.vm.nextRecordLabel).toBe('This is the last record in the list')
	})
})

describe('CnDetailPage — the skip link reaches the declared primary action', () => {
	const primaryAction = { id: 'afhandelen', label: 'Zaak afhandelen' }

	it('renders the link and the action it points at', () => {
		const { wrapper } = mountPage({ primaryAction })

		const link = wrapper.find('[data-testid="cn-detail-page-skip-link"]')
		const button = wrapper.find('[data-testid="cn-detail-page-primary-action"]')

		expect(link.exists()).toBe(true)
		expect(button.attributes('id')).toBe(link.attributes('href').slice(1))
	})

	it('names the action in the link, so a reader knows what they are being offered', () => {
		const { wrapper } = mountPage({ primaryAction })

		expect(wrapper.find('[data-testid="cn-detail-page-skip-link"]').text()).toContain('Zaak afhandelen')
	})

	it('renders neither when the page declares no primary action', () => {
		const { wrapper } = mountPage({ primaryAction: null })

		expect(wrapper.find('[data-testid="cn-detail-page-skip-link"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-detail-page-primary-action"]').exists()).toBe(false)
	})

	it('scopes the anchor id to the page, so two detail pages in one document do not collide', () => {
		const a = mountPage({ primaryAction: { id: 'one', label: 'A' } }).wrapper
		const b = mountPage({ primaryAction: { id: 'two', label: 'B' } }).wrapper

		expect(a.vm.primaryActionAnchorId).not.toBe(b.vm.primaryActionAnchorId)
	})

	it('moves focus rather than only scrolling, which is the difference between working and not', () => {
		// An `href` anchor moves the DOCUMENT to the element without moving
		// FOCUS to it in every browser. A skip link that only scrolls hands
		// the next tab press back to the top of the page, which is the whole
		// failure it was added to prevent. So the assertion is on `focus()`.
		const wrapper = shallowMount(CnDetailPage, {
			props: { title: 'Case', objectId: 'case-1', subscribe: false, primaryAction },
			global: {
				stubs: { teleport: true, NcButton: { template: '<button><slot /></button>' } },
				mocks: {
					t: (_app, str) => str,
					$route: { name: 'case-detail', params: { id: 'case-1' }, query: {} },
					$router: { push: jest.fn(), replace: jest.fn() },
				},
			},
		})
		const button = wrapper.find('[data-testid="cn-detail-page-primary-action"]').element
		const focus = jest.spyOn(button, 'focus')
		const event = { preventDefault: jest.fn() }

		wrapper.vm.onSkipToPrimaryAction(event)

		expect(focus).toHaveBeenCalled()
		expect(event.preventDefault).toHaveBeenCalled()
	})

	it('leaves the anchor to do the work when there is no focusable target', () => {
		const { wrapper } = mountPage({ primaryAction: null })
		const event = { preventDefault: jest.fn() }

		wrapper.vm.onSkipToPrimaryAction(event)

		expect(event.preventDefault).not.toHaveBeenCalled()
	})

	it('tells the host when the primary action is pressed', () => {
		const { wrapper } = mountPage({ primaryAction })

		wrapper.find('[data-testid="cn-detail-page-primary-action"]').trigger('click')

		expect(wrapper.emitted('primary-action')[0]).toEqual([primaryAction])
	})
})
