import { mount } from '@vue/test-utils'
import { h } from 'vue'
import CnIcon from '@/components/CnIcon/CnIcon.vue'
import CnRowActions from '@/components/CnRowActions/CnRowActions.vue'

const baseActions = [
	{ label: 'Edit', handler: jest.fn() },
	{ label: 'Publish', handler: jest.fn(), visible: (row) => !row.published },
	{ label: 'Depublish', handler: jest.fn(), visible: (row) => row.published },
	{ label: 'AlwaysHidden', handler: jest.fn(), visible: false },
	{ label: 'AlwaysShown', handler: jest.fn(), visible: true },
]

describe('CnRowActions visible predicate', () => {
	it('hides actions whose visible function returns false for the row', () => {
		const wrapper = mount(CnRowActions, {
			propsData: { actions: baseActions, row: { published: false } },
		})
		const labels = wrapper.vm.visibleActions.map((a) => a.label)
		expect(labels).toContain('Edit')
		expect(labels).toContain('Publish')
		expect(labels).not.toContain('Depublish')
		expect(labels).not.toContain('AlwaysHidden')
		expect(labels).toContain('AlwaysShown')
	})

	it('flips state-dependent visibility when row state changes', async () => {
		const wrapper = mount(CnRowActions, {
			propsData: { actions: baseActions, row: { published: true } },
		})
		const labels = wrapper.vm.visibleActions.map((a) => a.label)
		expect(labels).toContain('Depublish')
		expect(labels).not.toContain('Publish')
	})

	it('treats actions without a visible field as always shown (backwards compatible)', () => {
		const wrapper = mount(CnRowActions, {
			propsData: {
				actions: [{ label: 'Plain', handler: jest.fn() }],
				row: { anything: true },
			},
		})
		expect(wrapper.vm.visibleActions).toHaveLength(1)
		expect(wrapper.vm.visibleActions[0].label).toBe('Plain')
	})

	it('respects boolean visible: false even when no row is supplied', () => {
		const wrapper = mount(CnRowActions, {
			propsData: {
				actions: [
					{ label: 'Hidden', visible: false },
					{ label: 'Shown', visible: true },
				],
			},
		})
		const labels = wrapper.vm.visibleActions.map((a) => a.label)
		expect(labels).toEqual(['Shown'])
	})
})

/**
 * `visibleWhen` is the only per-row gate a JSON manifest can express, and this
 * is the first release that evaluates it. Nothing did before, so an action
 * whose condition this evaluator cannot decide has to stay — hiding it would
 * silently delete an entry that has been in a shipped manifest all along.
 */
describe('CnRowActions visibleWhen gate', () => {
	const row = { status: 'open', owner: 'ada', assignee: 'ada' }

	/**
	 * @param {object} visibleWhen The condition under test.
	 * @return {Array<string>} The labels that survive the gate.
	 */
	function labelsFor(visibleWhen) {
		const wrapper = mount(CnRowActions, {
			propsData: { actions: [{ label: 'Gated', visibleWhen }, { label: 'Plain' }], row },
		})
		return wrapper.vm.visibleActions.map((a) => a.label)
	}

	it('hides an action whose local condition the row fails', () => {
		expect(labelsFor({ field: 'status', op: 'eq', value: 'closed' })).toEqual(['Plain'])
	})

	it('keeps an action whose local condition the row meets', () => {
		expect(labelsFor({ field: 'status', op: 'eq', value: 'open' })).toEqual(['Gated', 'Plain'])
	})

	it('keeps an action gated on an endpoint, which it cannot ask about', () => {
		expect(labelsFor({ endpoint: '/apps/x/held', field: 'by', op: 'eq', value: 'nobody' })).toEqual(['Gated', 'Plain'])
	})

	it('keeps an action gated on an OpenRegister source for the same reason', () => {
		expect(labelsFor({ source: { register: 'cases', schema: 'case' }, field: '@total', op: 'gt', value: 0 })).toEqual(['Gated', 'Plain'])
	})

	it('keeps an action whose composition mixes a local leaf with a remote one', () => {
		expect(labelsFor({
			all: [
				{ field: 'status', op: 'eq', value: 'closed' },
				{ endpoint: '/apps/x/held', field: 'by' },
			],
		})).toEqual(['Gated', 'Plain'])
	})

	it('still gates a composition every leaf of which is local', () => {
		expect(labelsFor({
			all: [
				{ field: 'status', op: 'eq', value: 'open' },
				{ field: 'owner', op: 'eq', value: 'bob' },
			],
		})).toEqual(['Plain'])
	})

	it('compares one field against another through the @object token', () => {
		expect(labelsFor({ field: 'assignee', op: 'neq', value: '@object.owner' })).toEqual(['Plain'])
	})
})

describe('CnRowActions built-in ids', () => {
	it('renders an app action and a built-in sharing an id as two entries, each running its own handler', async () => {
		const builtinHandler = jest.fn()
		const appHandler = jest.fn()
		const row = { id: 5 }
		const wrapper = mount(CnRowActions, {
			propsData: {
				actions: [
					{ id: 'edit', label: 'Open editor', handler: appHandler },
					{ id: 'edit', builtin: true, label: 'Bewerken', handler: builtinHandler },
				],
				row,
			},
		})
		expect(wrapper.vm.renderedActions.map(({ action }) => wrapper.vm.actionKey(action))).toEqual(['Open editor', 'builtin:edit'])

		await wrapper.find('[data-testid="cn-action-item-open-editor"]').trigger('click')
		expect(appHandler).toHaveBeenCalledWith(row)
		expect(builtinHandler).not.toHaveBeenCalled()

		await wrapper.find('[data-testid="cn-action-item-edit"]').trigger('click')
		expect(builtinHandler).toHaveBeenCalledWith(row)
		expect(appHandler).toHaveBeenCalledTimes(1)

		expect(wrapper.emitted('action')).toEqual([
			[{ action: 'Open editor', row, id: 'edit' }],
			[{ action: 'Bewerken', row, id: 'edit', builtin: true }],
		])
	})
})

describe('CnRowActions icon rendering', () => {
	it('renders a string icon as a CnIcon registry lookup (manifest actions)', () => {
		const wrapper = mount(CnRowActions, {
			propsData: { actions: [{ label: 'View', icon: 'Eye', handler: jest.fn() }] },
		})
		const icon = wrapper.findComponent(CnIcon)
		expect(icon.exists()).toBe(true)
		expect(icon.props('name')).toBe('Eye')
	})

	it('renders a component icon directly without CnIcon (runtime actions)', () => {
		// Vue 2 passed `createElement` as `render()`'s first argument; Vue 3
		// passes none and `h` is imported from the package instead. The old
		// signature shadowed nothing, so the parameter was simply `undefined`
		// and the stub blew up with "h is not a function" at render time.
		const StubIcon = { name: 'StubIcon', render: () => h('span', 'icon') }
		const wrapper = mount(CnRowActions, {
			propsData: { actions: [{ label: 'View', icon: StubIcon, handler: jest.fn() }] },
		})
		expect(wrapper.findComponent(CnIcon).exists()).toBe(false)
		expect(wrapper.findComponent(StubIcon).exists()).toBe(true)
	})
})

describe('CnRowActions link actions', () => {
	/**
	 * @return {object} A router stub that resolves `{ name, params }` to a hash href.
	 */
	function makeRouter() {
		return {
			push: jest.fn(() => Promise.resolve()),
			resolve: jest.fn((to) => ({ href: `#/${to.name}/${to.params?.id ?? ''}` })),
		}
	}

	/**
	 * @param {Array} actions The actions.
	 * @param {object|null} router The router mock.
	 * @return {object} The wrapper.
	 */
	function mountActions(actions, router = makeRouter()) {
		return mount(CnRowActions, {
			propsData: { actions, row: { id: 7, url: 'https://a.test/7' } },
			mocks: { $router: router },
		})
	}

	it('renders a `to` action as an NcActionLink to the router href', () => {
		const wrapper = mountActions([{ label: 'View', to: (row) => ({ name: 'Dog', params: { id: row.id } }) }])
		const link = wrapper.find('[data-testid="cn-action-item-view"]')
		expect(link.classes()).toContain('NcActionLink')
		expect(link.attributes('href')).toBe('#/Dog/7')
	})

	it('renders an `href` action with its linkTarget', () => {
		const wrapper = mountActions([{ label: 'Site', href: (row) => row.url, linkTarget: '_blank' }])
		const link = wrapper.find('[data-testid="cn-action-item-site"]')
		expect(link.classes()).toContain('NcActionLink')
		expect(link.attributes('href')).toBe('https://a.test/7')
		expect(link.attributes('target')).toBe('_blank')
	})

	it('routes a plain click, emits action, and does not call the handler', async () => {
		const router = makeRouter()
		const handler = jest.fn()
		const wrapper = mountActions([{ label: 'View', handler, to: { name: 'Dog', params: { id: 7 } } }], router)
		await wrapper.find('[data-testid="cn-action-item-view"]').trigger('click')
		expect(router.push).toHaveBeenCalledWith({ name: 'Dog', params: { id: 7 } })
		expect(handler).not.toHaveBeenCalled()
		expect(wrapper.emitted('action')).toEqual([[{ action: 'View', row: { id: 7, url: 'https://a.test/7' } }]])
	})

	it('leaves a ctrl-click to the browser without emitting action in this tab', async () => {
		const router = makeRouter()
		const wrapper = mountActions([{ label: 'View', to: { name: 'Dog', params: { id: 7 } } }], router)
		await wrapper.find('[data-testid="cn-action-item-view"]').trigger('click', { ctrlKey: true })
		expect(router.push).not.toHaveBeenCalled()
		expect(wrapper.emitted('action')).toBeFalsy()
	})

	it('keeps a disabled or unresolvable link action a button', () => {
		const wrapper = mountActions([
			{ label: 'Locked', disabled: true, to: { name: 'Dog', params: { id: 7 } } },
			{ label: 'NoRouter', to: { name: 'Dog' } },
		], null)
		expect(wrapper.find('[data-testid="cn-action-item-locked"]').classes()).toContain('NcActionButton')
		expect(wrapper.find('[data-testid="cn-action-item-norouter"]').classes()).toContain('NcActionButton')
	})
})
