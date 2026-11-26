/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnPeopleWidget: showFields, the empty states, the 60-second page cache,
 * directory-wide search through `searchPeople`, and profile-field tags.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
import { flushPromises, mount } from '@vue/test-utils'
import CnPeopleWidget from '@/components/CnPeopleWidget/CnPeopleWidget.vue'
import { clearPeoplePages } from '@/components/CnPeopleWidget/peopleCache.js'

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, vars = {}) => text.replace(/\{(\w+)\}/g, (_, key) => (key in vars ? String(vars[key]) : `{${key}}`)),
}))

const FENNA = {
	uid: 'fenna',
	displayName: 'Fenna de Wit',
	role: 'Beleidsadviseur',
	organisation: 'Gemeente Utrecht',
	email: 'fenna@example.com',
	phone: '+31 6 1234 5678',
	avatarUrl: '/avatar/fenna/128',
}

const PIETER = {
	uid: 'pieter',
	displayName: 'Pieter Smit',
	email: 'pieter@example.com',
	customFields: [
		{ key: 'expertise', label: 'Expertise', type: 'tags', values: ['subsidies', 'Omgevingswet'] },
		{ key: 'office', label: 'Kantoorlocatie', type: 'text', values: ['Stadhuis'] },
	],
}

/**
 * A data source answering every page with the given users.
 *
 * @param {object[]} users the users.
 * @param {object} [extra] extra source methods.
 * @return {object} the source.
 */
function sourceOf(users, extra = {}) {
	return {
		fetchPeople: jest.fn().mockResolvedValue({ users, total: users.length, hasMore: false }),
		...extra,
	}
}

/**
 * Mount the widget and let its first fetch settle.
 *
 * @param {object} content the placement content.
 * @param {object} dataSource the source.
 * @return {Promise<object>} the wrapper.
 */
async function mountWidget(content, dataSource) {
	const wrapper = mount(CnPeopleWidget, { props: { content, dataSource } })
	await flushPromises()
	return wrapper
}

beforeEach(() => {
	clearPeoplePages()
	jest.useRealTimers()
})

describe('CnPeopleWidget showFields', () => {
	it('shows only the fields set to true on a card', async () => {
		const wrapper = await mountWidget(
			{ layout: 'card', showFields: { displayName: true, email: true } },
			sourceOf([FENNA]),
		)
		const card = wrapper.find('[role="listitem"]')
		expect(card.text()).toContain('Fenna de Wit')
		expect(card.text()).toContain('fenna@example.com')
		expect(card.text()).not.toContain('Beleidsadviseur')
		expect(card.text()).not.toContain('Gemeente Utrecht')
		expect(card.text()).not.toContain('+31 6 1234 5678')
		expect(card.find('img').exists()).toBe(true)
	})

	it('shows every field, phone included, when no showFields is stored', async () => {
		const wrapper = await mountWidget({ layout: 'list' }, sourceOf([FENNA]))
		const row = wrapper.find('[role="listitem"]').text()
		for (const value of ['Beleidsadviseur', 'Gemeente Utrecht', 'fenna@example.com', '+31 6 1234 5678']) {
			expect(row).toContain(value)
		}
	})

	it('hides the avatar only when showFields.avatar is false', async () => {
		const wrapper = await mountWidget({ layout: 'list', showFields: { displayName: true, avatar: false } }, sourceOf([FENNA]))
		expect(wrapper.find('img').exists()).toBe(false)
	})
})

describe('CnPeopleWidget empty states', () => {
	it('says "No matching users." when the filter matches nobody, and draws no list', async () => {
		const wrapper = await mountWidget({ layout: 'grid' }, sourceOf([]))
		expect(wrapper.find('.cn-people-widget__state').text()).toBe('No matching users.')
		expect(wrapper.find('[role="list"]').exists()).toBe(false)
	})

	it('says "No users match your search" when a search matches nobody', async () => {
		const wrapper = await mountWidget({ layout: 'list' }, sourceOf([FENNA]))
		await wrapper.find('input[type="search"]').setValue('z')
		expect(wrapper.find('.cn-people-widget__state').text()).toBe('No users match your search')
	})
})

describe('CnPeopleWidget cache', () => {
	it('serves a remounted widget from the cache within 60 seconds', async () => {
		const source = sourceOf([FENNA])
		const first = await mountWidget({ layout: 'list' }, source)
		first.unmount()
		const second = await mountWidget({ layout: 'list' }, source)
		expect(source.fetchPeople).toHaveBeenCalledTimes(1)
		expect(second.text()).toContain('Fenna de Wit')
	})

	it('fetches afresh after 60 seconds', async () => {
		const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000)
		const source = sourceOf([FENNA])
		const first = await mountWidget({ layout: 'list' }, source)
		first.unmount()
		now.mockReturnValue(1_000_000 + 61_000)
		await mountWidget({ layout: 'list' }, source)
		expect(source.fetchPeople).toHaveBeenCalledTimes(2)
		now.mockRestore()
	})

	it('keeps a separate cache per argument set', async () => {
		const source = sourceOf([FENNA])
		;(await mountWidget({ filters: [{ fieldName: 'group', operator: 'in', values: ['a'] }] }, source)).unmount()
		await mountWidget({ filters: [{ fieldName: 'group', operator: 'in', values: ['b'] }] }, source)
		expect(source.fetchPeople).toHaveBeenCalledTimes(2)
	})

	it('Refresh drops the cache and fetches at once', async () => {
		const source = sourceOf([FENNA])
		const wrapper = await mountWidget({ layout: 'list' }, source)
		source.fetchPeople.mockResolvedValue({ users: [{ ...FENNA, displayName: 'Fenna Jansen' }], total: 1, hasMore: false })
		await wrapper.find('.cn-people-widget__refresh').trigger('click')
		await flushPromises()
		expect(source.fetchPeople).toHaveBeenCalledTimes(2)
		expect(wrapper.text()).toContain('Fenna Jansen')
		wrapper.unmount()
		await mountWidget({ layout: 'list' }, source)
		expect(source.fetchPeople).toHaveBeenCalledTimes(2)
	})

	it('sends showBirthdays with the page request', async () => {
		const source = sourceOf([FENNA])
		await mountWidget({ showBirthdays: false }, source)
		expect(source.fetchPeople).toHaveBeenCalledWith(expect.objectContaining({ showBirthdays: false, offset: 0, limit: 50 }))
	})
})

describe('CnPeopleWidget search', () => {
	it('asks searchPeople for a query of two or more characters, debounced, with the widget filters', async () => {
		jest.useFakeTimers()
		const searchPeople = jest.fn().mockResolvedValue({ users: [PIETER], total: 1, hasMore: false })
		const filters = [{ fieldName: 'group', operator: 'in', values: ['gw'] }]
		const wrapper = mount(CnPeopleWidget, { props: { content: { layout: 'card', filters }, dataSource: sourceOf([FENNA], { searchPeople }) } })
		await flushPromises()
		await wrapper.find('input[type="search"]').setValue('subsidie')
		expect(searchPeople).not.toHaveBeenCalled()
		jest.advanceTimersByTime(300)
		await flushPromises()
		expect(searchPeople).toHaveBeenCalledTimes(1)
		expect(searchPeople).toHaveBeenCalledWith(expect.objectContaining({ q: 'subsidie', offset: 0, filters }))
		expect(wrapper.text()).toContain('Pieter Smit')
		expect(wrapper.text()).not.toContain('Fenna de Wit')
		const match = wrapper.findAll('.cn-people-widget__tag').filter((tag) => tag.text() === 'subsidies')
		const other = wrapper.findAll('.cn-people-widget__tag').filter((tag) => tag.text() === 'Omgevingswet')
		expect(match[0].classes()).toContain('cn-people-widget__tag--match')
		expect(other[0].classes()).not.toContain('cn-people-widget__tag--match')
	})

	it('never caches search results', async () => {
		jest.useFakeTimers()
		const searchPeople = jest.fn().mockResolvedValue({ users: [PIETER], total: 1, hasMore: false })
		const wrapper = mount(CnPeopleWidget, { props: { content: {}, dataSource: sourceOf([FENNA], { searchPeople }) } })
		await flushPromises()
		const box = wrapper.find('input[type="search"]')
		await box.setValue('pi')
		jest.advanceTimersByTime(300)
		await flushPromises()
		await box.setValue('')
		await box.setValue('pi')
		jest.advanceTimersByTime(300)
		await flushPromises()
		expect(searchPeople).toHaveBeenCalledTimes(2)
	})

	it('filters the loaded page for a one-character query', async () => {
		const searchPeople = jest.fn()
		const wrapper = await mountWidget({ layout: 'list' }, sourceOf([FENNA, PIETER], { searchPeople }))
		await wrapper.find('input[type="search"]').setValue('f')
		expect(searchPeople).not.toHaveBeenCalled()
		expect(wrapper.findAll('[role="listitem"]')).toHaveLength(1)
	})

	it('filters the loaded page when the source cannot search', async () => {
		const wrapper = await mountWidget({ layout: 'list' }, sourceOf([FENNA, PIETER]))
		await wrapper.find('input[type="search"]').setValue('fenna')
		expect(wrapper.findAll('[role="listitem"]')).toHaveLength(1)
		expect(wrapper.text()).toContain('Fenna de Wit')
	})

	it('drops a late answer to an older query', async () => {
		jest.useFakeTimers()
		let resolveOld
		const searchPeople = jest.fn()
			.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
			.mockResolvedValueOnce({ users: [FENNA], total: 1, hasMore: false })
		const wrapper = mount(CnPeopleWidget, { props: { content: { layout: 'list' }, dataSource: sourceOf([], { searchPeople }) } })
		await flushPromises()
		const box = wrapper.find('input[type="search"]')
		await box.setValue('pi')
		jest.advanceTimersByTime(300)
		await box.setValue('fen')
		jest.advanceTimersByTime(300)
		await flushPromises()
		resolveOld({ users: [PIETER], total: 1, hasMore: false })
		await flushPromises()
		expect(wrapper.text()).toContain('Fenna de Wit')
		expect(wrapper.text()).not.toContain('Pieter Smit')
	})
})

describe('CnPeopleWidget profile fields', () => {
	it('shows tags as buttons and text fields as label: value on a card', async () => {
		const wrapper = await mountWidget({ layout: 'card' }, sourceOf([PIETER]))
		const tags = wrapper.findAll('.cn-people-widget__tag').map((tag) => tag.text())
		expect(tags).toEqual(['subsidies', 'Omgevingswet'])
		expect(wrapper.find('.cn-people-widget__tag').attributes('aria-label')).toBe('Find everyone tagged subsidies')
		expect(wrapper.find('.cn-people-widget__field').text()).toBe('Kantoorlocatie: Stadhuis')
	})

	it('leaves profile fields off the grid layout and off when showFields switches them off', async () => {
		const grid = await mountWidget({ layout: 'grid' }, sourceOf([PIETER]))
		expect(grid.find('.cn-people-widget__fields').exists()).toBe(false)
		clearPeoplePages()
		const card = await mountWidget({ layout: 'card', showFields: { displayName: true, expertise: false } }, sourceOf([PIETER]))
		expect(card.find('.cn-people-widget__tag').exists()).toBe(false)
		expect(card.find('.cn-people-widget__field').exists()).toBe(true)
	})

	it('clicking a tag searches for it', async () => {
		jest.useFakeTimers()
		const searchPeople = jest.fn().mockResolvedValue({ users: [PIETER], total: 1, hasMore: false })
		const wrapper = mount(CnPeopleWidget, { props: { content: { layout: 'card' }, dataSource: sourceOf([PIETER], { searchPeople }) } })
		await flushPromises()
		await wrapper.findAll('.cn-people-widget__tag')[1].trigger('click')
		expect(wrapper.find('input[type="search"]').element.value).toBe('Omgevingswet')
		jest.advanceTimersByTime(300)
		await flushPromises()
		expect(searchPeople).toHaveBeenCalledWith(expect.objectContaining({ q: 'Omgevingswet' }))
	})
})
