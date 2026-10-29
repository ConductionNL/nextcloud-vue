/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChipListManager: an admin card that keeps a list of words in an
 * OpenRegister schema as chips (pipelinq PqBeheerMarketing Labels): list,
 * add, rename on double-click, delete after a confirm.
 *
 * @spec openspec/changes/chip-list-manager/specs/chip-list-manager/spec.md#requirement-an-administrator-keeps-a-word-list-as-chips
 */
const { flushPromises, mount } = require('@vue/test-utils')

const mockCnFetchJson = jest.fn()
jest.mock('../../src/utils/cnFetch.js', () => ({ cnFetchJson: (...args) => mockCnFetchJson(...args) }))

const CnChipListManager = require('../../src/components/CnChipListManager/CnChipListManager.vue').default

const LIST = '/apps/openregister/api/objects/pipelinq/label'
const rows = () => [
	{ id: 'l2', name: 'duurzaam' },
	{ id: 'l1', name: 'afval' },
	{ id: 'l3', name: 'ondernemers' },
]

/** Answer the list read with `rows`, and every write with its body. */
function answer(list = rows()) {
	mockCnFetchJson.mockImplementation((url, init = {}) => {
		if (!init.method) {
			return Promise.resolve({ results: list })
		}
		return Promise.resolve(init.body ? JSON.parse(init.body) : null)
	})
}

const stubs = {
	CnSettingsSection: { props: ['name', 'description'], template: '<section><h2>{{ name }}</h2><p class="desc">{{ description }}</p><slot /></section>' },
	CnConfirmDialog: { props: ['message'], emits: ['confirm', 'close'], template: '<div data-testid="confirm"><p>{{ message }}</p><button data-testid="confirm-yes" @click="$emit(\'confirm\')">yes</button></div>' },
}

/** Mount over the label schema. */
async function mountIt(props = {}) {
	const wrapper = mount(CnChipListManager, {
		props: { register: 'pipelinq', schema: 'label', title: 'Labels', description: 'De labels die mensen kunnen kiezen.', ...props },
		global: { stubs },
	})
	await flushPromises()
	return wrapper
}

const chipNames = (wrapper) => wrapper.findAll('[data-testid="cn-chip-list-name"]').map((n) => n.text())

describe('CnChipListManager', () => {
	beforeEach(() => {
		mockCnFetchJson.mockReset()
		answer()
	})

	it('lists the words as chips in alphabetical order under the title', async () => {
		const wrapper = await mountIt()
		expect(mockCnFetchJson.mock.calls[0][0]).toBe(LIST)
		expect(mockCnFetchJson.mock.calls[0][1].query).toEqual({ _limit: 500 })
		expect(wrapper.find('h2').text()).toBe('Labels')
		expect(chipNames(wrapper)).toEqual(['afval', 'duurzaam', 'ondernemers'])
		expect(wrapper.find('[data-testid="cn-chip-list-remove-afval"]').attributes('aria-label')).toBe('Delete afval')
	})

	it('adds a word and shows it as a chip', async () => {
		const wrapper = await mountIt()
		await wrapper.find('[data-testid="cn-chip-list-input"]').setValue('  parkeren ')
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		const post = mockCnFetchJson.mock.calls.find(([, init]) => init && init.method === 'POST')
		expect(post[0]).toBe(LIST)
		expect(JSON.parse(post[1].body)).toEqual({ name: 'parkeren' })
		expect(chipNames(wrapper)).toContain('parkeren')
		expect(wrapper.find('[data-testid="cn-chip-list-input"]').element.value).toBe('')
		expect(wrapper.emitted('changed')).toHaveLength(1)
	})

	it('refuses a word the list already has, whatever the case, without a request', async () => {
		const wrapper = await mountIt()
		await wrapper.find('[data-testid="cn-chip-list-input"]').setValue('Duurzaam')
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(mockCnFetchJson.mock.calls.some(([, init]) => init && init.method === 'POST')).toBe(false)
		expect(wrapper.find('[data-testid="cn-chip-list-error"]').text()).toBe('This name is already on the list.')
	})

	it('renames a word on double-click through the rename endpoint', async () => {
		const wrapper = await mountIt({ renameUrl: '/apps/pipelinq/api/labels/{id}/rename' })
		await wrapper.find('[data-testid="cn-chip-list-chip-ondernemers"] [data-testid="cn-chip-list-name"]').trigger('dblclick')
		const input = wrapper.find('[data-testid="cn-chip-list-rename-input"]')
		expect(input.element.value).toBe('ondernemers')
		await input.setValue('ondernemers centrum')
		await input.trigger('keydown', { key: 'Enter' })
		await flushPromises()

		const post = mockCnFetchJson.mock.calls.find(([, init]) => init && init.method === 'POST')
		expect(post[0]).toBe('/apps/pipelinq/api/labels/l3/rename')
		expect(JSON.parse(post[1].body)).toEqual({ name: 'ondernemers centrum' })
		expect(chipNames(wrapper)).toContain('ondernemers centrum')
		expect(chipNames(wrapper)).not.toContain('ondernemers')
	})

	it('renames on the object itself without a rename endpoint', async () => {
		const wrapper = await mountIt()
		await wrapper.find('[data-testid="cn-chip-list-chip-afval"] [data-testid="cn-chip-list-name"]').trigger('dblclick')
		const input = wrapper.find('[data-testid="cn-chip-list-rename-input"]')
		await input.setValue('restafval')
		await input.trigger('keydown', { key: 'Enter' })
		await flushPromises()

		const put = mockCnFetchJson.mock.calls.find(([, init]) => init && init.method === 'PUT')
		expect(put[0]).toBe(`${LIST}/l1`)
		expect(JSON.parse(put[1].body)).toEqual({ id: 'l1', name: 'restafval' })
	})

	it('cancels a rename on Escape', async () => {
		const wrapper = await mountIt()
		await wrapper.find('[data-testid="cn-chip-list-chip-afval"] [data-testid="cn-chip-list-name"]').trigger('dblclick')
		const input = wrapper.find('[data-testid="cn-chip-list-rename-input"]')
		await input.setValue('iets anders')
		await input.trigger('keydown', { key: 'Escape' })
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-chip-list-rename-input"]').exists()).toBe(false)
		expect(mockCnFetchJson.mock.calls.some(([, init]) => init && init.method)).toBe(false)
		expect(chipNames(wrapper)).toContain('afval')
	})

	it('deletes a word after the confirm', async () => {
		const wrapper = await mountIt()
		await wrapper.find('[data-testid="cn-chip-list-remove-duurzaam"]').trigger('click')
		expect(mockCnFetchJson.mock.calls.some(([, init]) => init && init.method === 'DELETE')).toBe(false)
		expect(wrapper.find('[data-testid="confirm"]').text()).toContain('duurzaam')

		await wrapper.find('[data-testid="confirm-yes"]').trigger('click')
		await flushPromises()

		const del = mockCnFetchJson.mock.calls.find(([, init]) => init && init.method === 'DELETE')
		expect(del[0]).toBe(`${LIST}/l2`)
		expect(chipNames(wrapper)).toEqual(['afval', 'ondernemers'])
	})

	it('shows the refusal when a write is refused, and keeps the list', async () => {
		const wrapper = await mountIt()
		mockCnFetchJson.mockImplementation((url, init = {}) => init.method
			? Promise.reject(Object.assign(new Error('403'), { status: 403 }))
			: Promise.resolve({ results: rows() }))
		await wrapper.find('[data-testid="cn-chip-list-input"]').setValue('parkeren')
		await wrapper.find('form').trigger('submit')
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-chip-list-error"]').text()).toBe('You are not allowed to change this list.')
		expect(chipNames(wrapper)).toEqual(['afval', 'duurzaam', 'ondernemers'])
	})

	it('only lists the words when read only', async () => {
		const wrapper = await mountIt({ readOnly: true, note: 'Dubbelklik op een label om het te hernoemen.' })
		expect(chipNames(wrapper)).toHaveLength(3)
		expect(wrapper.find('[data-testid="cn-chip-list-remove-afval"]').exists()).toBe(false)
		expect(wrapper.find('form').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-chip-list-note"]').exists()).toBe(false)
	})

	it('draws the note under the form', async () => {
		const wrapper = await mountIt({ note: 'Dubbelklik op een label om het te hernoemen.' })
		expect(wrapper.find('[data-testid="cn-chip-list-note"]').text()).toBe('Dubbelklik op een label om het te hernoemen.')
	})
})
