/**
 * Tests for CnCollectivePageCreate — inline create-page dialog.
 *
 * Covers:
 *  - collectives load on mount from /api/integrations/collectives/list;
 *  - submit is disabled until both a collective and a title are set;
 *  - submit emits `create` with { collectiveId, title };
 *  - 501 surfaces the "not installed" copy;
 *  - no create is emitted when the form is incomplete.
 */

const { mount } = require('@vue/test-utils')
const CnCollectivePageCreate = require('../CnCollectivePageCreate.vue').default

function resolveOnce(payload, status = 200) {
	return Promise.resolve({ ok: status >= 200 && status < 300, status, json: () => Promise.resolve(payload) })
}

describe('CnCollectivePageCreate', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
	})

	afterEach(() => {
		delete global.fetch
	})

	it('loads collectives on mount', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({
			results: [{ id: 1, name: 'Ops' }, { id: 2, name: 'HR', emoji: '🧑' }],
		}))

		const wrapper = mount(CnCollectivePageCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.collectives).toHaveLength(2)
		expect(wrapper.vm.collectiveOptions[1].label).toBe('🧑 HR')
		wrapper.destroy()
	})

	it('keeps submit disabled until collective and title are set', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, name: 'Ops' }] }))

		const wrapper = mount(CnCollectivePageCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.vm.canSubmit).toBe(false)

		wrapper.vm.title = 'Runbook'
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.canSubmit).toBe(false)

		wrapper.vm.collective = { id: 1, label: 'Ops' }
		await wrapper.vm.$nextTick()
		expect(wrapper.vm.canSubmit).toBe(true)
		wrapper.destroy()
	})

	it('emits create with the form payload', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [{ id: 5, name: 'Ops' }] }))

		const wrapper = mount(CnCollectivePageCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.collective = { id: 5, label: 'Ops' }
		wrapper.vm.title = '  Runbook  '
		await wrapper.vm.$nextTick()

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeTruthy()
		expect(wrapper.emitted('create')[0]).toEqual([{ collectiveId: 5, title: 'Runbook' }])
		wrapper.destroy()
	})

	it('surfaces the not-installed copy on 501', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ error: 'nope' }, 501))

		const wrapper = mount(CnCollectivePageCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		expect(wrapper.text()).toContain('NC Collectives is not installed.')
		wrapper.destroy()
	})

	it('does not emit create when the form is incomplete', async () => {
		global.fetch.mockReturnValueOnce(resolveOnce({ results: [{ id: 1, name: 'Ops' }] }))

		const wrapper = mount(CnCollectivePageCreate)
		await wrapper.vm.$nextTick()
		await wrapper.vm.$nextTick()

		wrapper.vm.submit()
		expect(wrapper.emitted('create')).toBeFalsy()
		wrapper.destroy()
	})
})
