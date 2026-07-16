/**
 * Tests for CnDeckCardCreate — inline-create Deck card dialog.
 *
 * Covers:
 *  - boards are loaded on mount;
 *  - stacks cascade on board selection;
 *  - submit emits `create` with the full payload;
 *  - submit is disabled until board, stack and title are present.
 */

const { mount } = require('@vue/test-utils')
const CnDeckCardCreate = require('../CnDeckCardCreate.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnDeckCardCreate', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('loads boards on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, title: 'Sprint' }] }))
		const wrapper = mount(CnDeckCardCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.boards).toEqual([{ id: 1, title: 'Sprint' }])
		wrapper.destroy()
	})

	it('cascades stacks on board change', async () => {
		global.fetch
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, title: 'Sprint' }] }))
			.mockReturnValueOnce(resolveOnce({ results: [{ id: 11, title: 'To Do' }] }))

		const wrapper = mount(CnDeckCardCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.onBoardChange({ id: 1, label: 'Sprint' })
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.stacks).toEqual([{ id: 11, title: 'To Do' }])
		wrapper.destroy()
	})

	it('emits create with the full payload on submit', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, title: 'Sprint' }] }))

		const wrapper = mount(CnDeckCardCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.setData({
			selectedBoard: { id: 1, label: 'Sprint' },
			selectedStack: { id: 11, label: 'To Do' },
			title: 'Investigate ticket',
			description: 'Steps to repro',
			duedate: '2026-06-01',
		})
		await wrapper.vm.$nextTick()

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0]).toEqual([{
			boardId: 1,
			stackId: 11,
			title: 'Investigate ticket',
			description: 'Steps to repro',
			duedate: '2026-06-01',
		}])
		wrapper.destroy()
	})

	it('blocks submit when required fields are missing', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [] }))

		const wrapper = mount(CnDeckCardCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.canSubmit).toBe(false)
		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})
})
