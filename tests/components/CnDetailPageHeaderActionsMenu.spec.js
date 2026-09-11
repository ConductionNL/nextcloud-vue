/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Tests for CnDetailPage's `headerActions` placement — the manifest key names
 * entries in the header's Actions menu, not a row of buttons beside the title.
 * The page keeps a `display: "menu"` CnActionButtons mounted for the dialogs
 * those actions open and renders the entries it emits inside CnActionsMenu's
 * `#primary-items` slot.
 */

import { mount } from '@vue/test-utils'
import CnDetailPage from '../../src/components/CnDetailPage/CnDetailPage.vue'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'

const ACTIONS = [
	{ id: 'add-party', type: 'open-form', label: 'Add party', icon: 'AccountPlusOutline', register: 'r', schema: 'role' },
	{ id: 'copy-case', type: 'open-modal', label: 'Copy case', icon: 'ContentCopy', target: 'CaseCopyDialog' },
]

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function makeFakeStore(object = { id: 'o1' }) {
	return {
		objects: { 'r-s': { o1: object } },
		schemas: {},
		registerObjectType: jest.fn(),
		fetchObject: jest.fn(async () => null),
		fetchSchema: jest.fn(async () => null),
	}
}

function mountPage(headerActions = ACTIONS) {
	return mount(CnDetailPage, {
		propsData: {
			register: 'r',
			schema: 's',
			objectId: 'o1',
			objectStore: makeFakeStore(),
			headerActions,
		},
	})
}

describe('CnDetailPage — headerActions land in the Actions menu', () => {
	it('mounts CnActionButtons in menu mode, so it draws no buttons of its own', () => {
		const wrapper = mountPage()
		const buttons = wrapper.findComponent(CnActionButtons)
		expect(buttons.exists()).toBe(true)
		expect(buttons.props('display')).toBe('menu')
		// The proof that nothing renders as a button: `display: "buttons"` puts
		// an NcButton carrying this testid in the header, and menu mode must
		// not. Asserting on props alone would pass a component that ignored
		// them.
		expect(buttons.find('button[data-testid="cn-action-add-party"]').exists()).toBe(false)
	})

	it('renders one menu item per action, keeping the id-based testid', async () => {
		const wrapper = mountPage()
		await wrapper.vm.$nextTick()
		const ids = wrapper.vm.menuHeaderActions.map((e) => e.testid)
		expect(ids).toEqual(['cn-action-add-party', 'cn-action-copy-case'])
		expect(wrapper.findAll('[data-testid="cn-action-add-party"]').length).toBe(1)
		expect(wrapper.findAll('[data-testid="cn-action-copy-case"]').length).toBe(1)
	})

	it('dispatches the action when its menu item is clicked', async () => {
		const wrapper = mountPage()
		await wrapper.vm.$nextTick()
		const buttons = wrapper.findComponent(CnActionButtons)
		const spy = jest.spyOn(buttons.vm, 'onActionClick').mockImplementation(() => {})
		// The entry carries a pre-bound run(), so the menu dispatches without
		// reaching back through a ref.
		wrapper.vm.menuHeaderActions[1].run()
		expect(spy).toHaveBeenCalledWith(expect.objectContaining({ id: 'copy-case' }))
	})

	it('mounts nothing at all when the page declares no header actions', () => {
		const wrapper = mountPage([])
		expect(wrapper.findComponent(CnActionButtons).exists()).toBe(false)
		expect(wrapper.vm.menuHeaderActions).toEqual([])
	})
})

describe('CnActionButtons — menu mode', () => {
	it('emits entries carrying label, icon shape and a bound run()', async () => {
		const wrapper = mount(CnActionButtons, {
			propsData: { actions: ACTIONS, display: 'menu' },
		})
		await wrapper.vm.$nextTick()
		const emitted = wrapper.emitted('entries')
		expect(emitted).toBeTruthy()
		const entries = emitted[emitted.length - 1][0]
		expect(entries.map((e) => e.label)).toEqual(['Add party', 'Copy case'])
		// An mdi name goes to CnIcon, a legacy `icon-*` class onto a span. The
		// host template must not have to know which.
		expect(entries[0].iconName).toBe('AccountPlusOutline')
		expect(entries[0].iconClass).toBe('')
		// null, not false: a non-toggle has no pressed state, and
		// aria-pressed="false" would announce it as an un-pressed toggle.
		expect(entries[0].pressed).toBeNull()
		expect(typeof entries[0].run).toBe('function')
	})

	it('splits a legacy icon-* class away from the mdi name', async () => {
		const wrapper = mount(CnActionButtons, {
			propsData: { actions: [{ id: 'a', type: 'refresh', label: 'A', icon: 'icon-add' }], display: 'menu' },
		})
		await wrapper.vm.$nextTick()
		const entries = wrapper.emitted('entries').pop()[0]
		expect(entries[0].iconName).toBe('')
		expect(entries[0].iconClass).toBe('icon-add')
	})

	it('still renders buttons in the default display, and emits no entries', async () => {
		const wrapper = mount(CnActionButtons, { propsData: { actions: ACTIONS } })
		await wrapper.vm.$nextTick()
		expect(wrapper.find('[data-testid="cn-action-add-party"]').exists()).toBe(true)
		expect(wrapper.emitted('entries')).toBeFalsy()
	})

	it('hides an action whose visibleWhen fails, in menu mode too', async () => {
		const wrapper = mount(CnActionButtons, {
			propsData: {
				display: 'menu',
				actions: [
					...ACTIONS,
					{ id: 'reopen', type: 'open-modal', label: 'Reopen', visibleWhen: { field: 'isFinalStatus', op: 'eq', value: true } },
				],
			},
		})
		// evaluateVisibleWhen is async, so a nextTick is not enough: the
		// unfiltered list is emitted first and the gated one follows.
		await flush()
		const entries = wrapper.emitted('entries').pop()[0]
		expect(entries.map((e) => e.id)).toEqual(['add-party', 'copy-case'])
	})
})

// REGRESSION. A `type: "navigate"` action pointing at an external URL was
// dispatched through the router, which matched no route and fell back to the
// app's landing page carrying the URL's own query string. It is a link, and the
// menu must render it as one so the browser owns the navigation.
//
// @nextcloud/vue is auto-stubbed here, so NcActionLink renders as a div with
// its attributes spread on — the component identity plus href/target is what
// distinguishes a link from a button, not the tag name.
describe('CnDetailPage — an external navigate action is a link in the menu', () => {
	const WATCH = {
		id: 'watch',
		type: 'navigate',
		label: 'Watch',
		icon: 'Heart',
		target: 'https://www.youtube.com/watch?v=MM60juTPkSM',
	}

	const itemsNamed = (wrapper, name) => wrapper.findAllComponents({ name })
		.filter((c) => c.attributes('data-testid')?.startsWith('cn-action-'))

	it('renders an NcActionLink to the target, opening in a new tab', async () => {
		const wrapper = mountPage([WATCH])
		await flush()
		const links = itemsNamed(wrapper, 'NcActionLink')
		expect(links).toHaveLength(1)
		expect(links[0].attributes('href')).toBe(WATCH.target)
		expect(links[0].attributes('target')).toBe('_blank')
		expect(links[0].attributes('data-testid')).toBe('cn-action-watch')
		expect(itemsNamed(wrapper, 'NcActionButton')).toHaveLength(0)
	})

	it('keeps an in-app navigate a button, so the router still handles it', async () => {
		const wrapper = mountPage([{ ...WATCH, id: 'dogs', target: '/dogs' }])
		await flush()
		expect(itemsNamed(wrapper, 'NcActionLink')).toHaveLength(0)
		expect(itemsNamed(wrapper, 'NcActionButton')).toHaveLength(1)
	})

	it('renders links and buttons side by side in one menu', async () => {
		const wrapper = mountPage([WATCH, ...ACTIONS])
		await flush()
		expect(itemsNamed(wrapper, 'NcActionLink').map((c) => c.attributes('data-testid')))
			.toEqual(['cn-action-watch'])
		expect(itemsNamed(wrapper, 'NcActionButton').map((c) => c.attributes('data-testid')))
			.toEqual(['cn-action-add-party', 'cn-action-copy-case'])
		expect(wrapper.vm.menuHeaderActions.map((e) => e.id)).toEqual(['watch', 'add-party', 'copy-case'])
	})
})
