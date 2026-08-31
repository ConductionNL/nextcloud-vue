/**
 * Tests for declarative bulk actions — the manifest vocabulary for the
 * contextual selection strip.
 *
 * The strip has had a `#selection-actions` slot for a while, but a slot can
 * only be filled by a hand-written host component, so a page declared in an app
 * manifest could carry row actions and header actions and never a bulk one.
 *
 * Every assertion here is really about ONE thing: does the action receive the
 * selection the user actually made. An action that fires but has to go and find
 * out what was selected is one re-render away from acting on a different set
 * than the one highlighted on screen.
 */
import { mount } from '@vue/test-utils'
import CnActionsBar from '../../src/components/CnActionsBar/CnActionsBar.vue'
import CnIndexPage from '../../src/components/CnIndexPage/CnIndexPage.vue'

const barStubs = {
	NcActions: { template: '<div class="nc-actions-stub"><slot /></div>' },
	NcActionButton: { template: '<button><slot /></button>', props: ['disabled', 'title'] },
	NcActionSeparator: { template: '<hr />' },
	// `disabled` is deliberately NOT declared as a prop: leaving it in $attrs is
	// what makes it render as a real attribute, which is what the strip's users
	// actually see. `v-on="$listeners"` forwards the component-level @click the
	// real NcButton emits — without it the click reaches nothing.
	NcButton: { template: '<button class="nc-button-stub" v-bind="$attrs" v-on="$listeners"><slot /></button>', props: ['type', 'variant'] },
	NcLoadingIcon: { template: '<div />' },
	CnIcon: { template: '<span />', props: ['name', 'size'] },
}

describe('CnActionsBar — declarative bulk actions', () => {
	const mountBar = (bulkActions, selectedIds = ['a', 'b']) => mount(CnActionsBar, {
		propsData: { selectable: true, selectedIds, objectCount: 5, bulkActions },
		stubs: barStubs,
	})

	it('renders a button per declared action inside the selection strip', () => {
		const wrapper = mountBar([
			{ id: 'reassign', label: 'Reassign' },
			{ id: 'archive', label: 'Archive' },
		])
		const strip = wrapper.find('[data-testid="cn-selection-strip"]')
		expect(strip.exists()).toBe(true)
		expect(strip.find('[data-testid="cn-bulk-action-reassign"]').exists()).toBe(true)
		expect(strip.find('[data-testid="cn-bulk-action-archive"]').exists()).toBe(true)
	})

	it('renders nothing while there is no selection, because there is nothing to act on', () => {
		const wrapper = mountBar([{ id: 'reassign', label: 'Reassign' }], [])
		expect(wrapper.find('[data-testid="cn-bulk-action-reassign"]').exists()).toBe(false)
	})

	it('emits the id AND the selection', async () => {
		const wrapper = mountBar([{ id: 'reassign', label: 'Reassign' }], ['x', 'y', 'z'])
		await wrapper.find('[data-testid="cn-bulk-action-reassign"]').trigger('click')

		const events = wrapper.emitted('bulk-action')
		expect(events).toHaveLength(1)
		expect(events[0][0]).toEqual({
			id: 'reassign',
			action: 'reassign',
			selectedIds: ['x', 'y', 'z'],
			count: 3,
		})
	})

	it('honours a disabled entry', () => {
		const wrapper = mountBar([{ id: 'reassign', label: 'Reassign', disabled: true }])
		expect(wrapper.find('[data-testid="cn-bulk-action-reassign"]').attributes('disabled')).toBeDefined()
	})
})

describe('CnIndexPage — bulk action dispatch', () => {
	const mountPage = (bulkActions, extra = {}) => mount(CnIndexPage, {
		propsData: {
			objects: [],
			bulkActions,
			...extra,
		},
		stubs: {
			CnActionsBar: {
				template: '<div />',
				props: ['bulkActions', 'headerActions', 'selectedIds', 'selectable'],
			},
		},
		// The page is large; everything below the bar is irrelevant here.
		shallow: true,
	})

	it('drops an entry with no id or label rather than rendering a nameless button', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountPage([{ id: 'ok', label: 'Ok' }, { id: 'nolabel' }, null])
		expect(wrapper.vm.mergedBulkActions.map((e) => e.id)).toEqual(['ok'])
		expect(warn).toHaveBeenCalled()
		warn.mockRestore()
	})

	it('drops the reserved copy/delete ids, which the strip already ships', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountPage([
			{ id: 'copy', label: 'Copy' },
			{ id: 'delete', label: 'Delete' },
			{ id: 'reassign', label: 'Reassign' },
		])
		expect(wrapper.vm.mergedBulkActions.map((e) => e.id)).toEqual(['reassign'])
		// Assert the two SPECIFIC warnings rather than a total: the shallow mount
		// emits unrelated ones, and a count would break the next time it does.
		const messages = warn.mock.calls.map((c) => String(c[0]))
		expect(messages.filter((m) => m.includes('is reserved by the built-in selection strip'))).toHaveLength(2)
		warn.mockRestore()
	})

	it('calls a function handler WITH the selection', () => {
		const seen = []
		const wrapper = mountPage([
			{ id: 'reassign', label: 'Reassign', handler: (scope) => seen.push(scope) },
		])
		wrapper.vm.onBulkAction({ id: 'reassign', selectedIds: ['a', 'b'], count: 2 })

		expect(seen).toEqual([{ actionId: 'reassign', selectedIds: ['a', 'b'], count: 2 }])
	})

	it('re-emits bulk-action with the selection so a host can listen instead', () => {
		const wrapper = mountPage([{ id: 'reassign', label: 'Reassign' }])
		wrapper.vm.onBulkAction({ id: 'reassign', selectedIds: ['a'], count: 1 })

		expect(wrapper.emitted('bulk-action')[0][0]).toEqual({
			action: 'reassign',
			id: 'reassign',
			selectedIds: ['a'],
			count: 1,
		})
	})

	it('opens a modal with the selection merged into its props', () => {
		const wrapper = mountPage([
			{ id: 'reassign', label: 'Reassign', handler: 'open-modal', target: 'BulkReassignModal', props: { mode: 'bulk' } },
		])
		wrapper.vm.onBulkAction({ id: 'reassign', selectedIds: ['a', 'b'], count: 2 })

		expect(wrapper.emitted('open-modal')[0][0]).toEqual({
			target: 'BulkReassignModal',
			props: { selectedIds: ['a', 'b'], count: 2, mode: 'bulk' },
		})
	})

	it('warns when a manifest shadows selectedIds, because the modal then never sees the selection', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountPage([
			{ id: 'reassign', label: 'Reassign', handler: 'open-modal', target: 'M', props: { selectedIds: ['frozen'] } },
		])
		wrapper.vm.onBulkAction({ id: 'reassign', selectedIds: ['live'], count: 1 })

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('shadows the live selection'))
		// The declared prop still wins — but loudly, not silently.
		expect(wrapper.emitted('open-modal')[0][0].props.selectedIds).toEqual(['frozen'])
		warn.mockRestore()
	})

	it('warns and emits only when open-modal names no target', () => {
		const warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
		const wrapper = mountPage([{ id: 'reassign', label: 'Reassign', handler: 'open-modal' }])
		wrapper.vm.onBulkAction({ id: 'reassign', selectedIds: ['a'], count: 1 })

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('requires "target"'))
		expect(wrapper.emitted('open-modal')).toBeUndefined()
		expect(wrapper.emitted('bulk-action')).toHaveLength(1)
	})

	it('resolves a registry handler name against customComponents, with the selection', () => {
		const seen = []
		const wrapper = mountPage(
			[{ id: 'reassign', label: 'Reassign', handler: 'doBulkReassign' }],
			{ customComponents: { doBulkReassign: (scope) => seen.push(scope) } },
		)
		wrapper.vm.onBulkAction({ id: 'reassign', selectedIds: ['a', 'b'], count: 2 })

		expect(seen).toEqual([{ actionId: 'reassign', selectedIds: ['a', 'b'], count: 2 }])
	})

	it('falls through to emit-only for an unknown registry name', () => {
		const wrapper = mountPage([{ id: 'reassign', label: 'Reassign', handler: 'nothingCalledThis' }])
		wrapper.vm.onBulkAction({ id: 'reassign', selectedIds: ['a'], count: 1 })

		expect(wrapper.emitted('bulk-action')).toHaveLength(1)
	})

	it('treats a missing selection as empty rather than throwing', () => {
		const wrapper = mountPage([{ id: 'reassign', label: 'Reassign' }])
		wrapper.vm.onBulkAction({ id: 'reassign' })

		expect(wrapper.emitted('bulk-action')[0][0]).toEqual({
			action: 'reassign', id: 'reassign', selectedIds: [], count: 0,
		})
	})
})
