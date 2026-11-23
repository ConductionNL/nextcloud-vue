/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnActionAuthMatrix: the admin's action x group rights matrix (ADR-023).
 * It reads `{ actions, groups, matrix }`, keeps the fixed columns ticked and
 * locked, saves `{ matrix }` with the request token (through
 * @nextcloud/axios), and keeps the admin's ticks on screen when a save is
 * refused, saying why.
 *
 * @spec openspec/changes/action-auth-matrix/specs/action-auth-matrix/spec.md
 */

jest.mock('@nextcloud/l10n', () => ({
	translate: (app, text, params) => String(text).replace(/\{(\w+)\}/g, (_, key) => String((params || {})[key] ?? `{${key}}`)),
}))

jest.mock('@nextcloud/router', () => ({ generateUrl: (url) => url }))

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), put: jest.fn() },
}))

const axios = require('@nextcloud/axios').default
const { flushPromises, mount } = require('@vue/test-utils')
const CnActionAuthMatrix = require('../../src/components/CnActionAuthMatrix/CnActionAuthMatrix.vue').default

const ENDPOINT = '/apps/myapp/api/admin/action-matrix'

const ANSWER = {
	actions: ['course.publish', 'grade.export'],
	groups: ['admin', 'teachers', 'office'],
	matrix: {
		'course.publish': ['admin', 'teachers'],
		'grade.export': ['admin'],
	},
}

/**
 * Mount the matrix after its first read.
 *
 * @param {object} props Extra props.
 * @return {Promise<object>} The wrapper.
 */
async function mountMatrix(props = {}) {
	const wrapper = mount(CnActionAuthMatrix, {
		props: { endpoint: ENDPOINT, ...props },
		global: {
			stubs: {
				CnSettingsSection: { props: ['name', 'description'], template: '<section><h2>{{ name }}</h2><slot /></section>' },
				NcButton: { props: ['disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
				NcCheckboxRadioSwitch: {
					props: ['modelValue', 'disabled', 'ariaLabel'],
					emits: ['update:modelValue'],
					template: '<input type="checkbox" :checked="modelValue" :disabled="disabled" :aria-label="ariaLabel" @change="$emit(\'update:modelValue\', $event.target.checked)">',
				},
				NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
				NcLoadingIcon: { template: '<span class="loading" />' },
			},
		},
	})
	await flushPromises()
	return wrapper
}

/**
 * The checkbox of one cell.
 *
 * @param {object} wrapper The wrapper.
 * @param {string} action The action.
 * @param {string} group The group.
 * @return {object} The input wrapper.
 */
function cell(wrapper, action, group) {
	return wrapper.find(`[data-testid="cn-action-auth-cell-${action}-${group}"] input`)
}

beforeEach(() => {
	axios.get.mockReset()
	axios.put.mockReset()
	axios.get.mockResolvedValue({ data: JSON.parse(JSON.stringify(ANSWER)) })
})

describe('CnActionAuthMatrix', () => {
	it('reads the endpoint and draws one row per action and one column per group, the fixed column first', async () => {
		const wrapper = await mountMatrix()

		expect(axios.get).toHaveBeenCalledWith(ENDPOINT)
		const headers = wrapper.findAll('thead th').map((th) => th.text())
		expect(headers).toEqual(['Action', 'admin', 'teachers', 'office'])
		expect(wrapper.findAll('tbody tr')).toHaveLength(2)
		expect(wrapper.find('table caption').exists()).toBe(true)
	})

	it('keeps a fixed group ticked and locked whatever the stored list says', async () => {
		const wrapper = await mountMatrix()

		const admin = cell(wrapper, 'grade.export', 'admin')
		expect(admin.element.checked).toBe(true)
		expect(admin.attributes('disabled')).toBeDefined()
		expect(cell(wrapper, 'course.publish', 'teachers').element.checked).toBe(true)
		expect(cell(wrapper, 'grade.export', 'teachers').element.checked).toBe(false)
	})

	it('names every cell with its group and action for a screen reader', async () => {
		const wrapper = await mountMatrix({ actionLabels: { 'grade.export': 'Export grades' } })

		expect(cell(wrapper, 'grade.export', 'office').attributes('aria-label')).toBe('Allow group office to perform Export grades')
		expect(wrapper.find('tbody th').text()).toBe('course.publish')
		expect(wrapper.findAll('tbody th')[1].text()).toBe('Export grades')
	})

	it('shows extra pseudo-groups with their label after the fixed column', async () => {
		const wrapper = await mountMatrix({ extraGroups: [{ id: '@all', label: 'All logged-in users' }] })

		const headers = wrapper.findAll('thead th').map((th) => th.text())
		expect(headers).toEqual(['Action', 'admin', 'All logged-in users', 'teachers', 'office'])
	})

	it('saves the whole matrix with the fixed groups through @nextcloud/axios and says so', async () => {
		axios.put.mockResolvedValue({ data: { matrix: { 'course.publish': ['admin', 'teachers'], 'grade.export': ['admin', 'office'] } } })
		const wrapper = await mountMatrix()

		await cell(wrapper, 'grade.export', 'office').setValue(true)
		await wrapper.find('[data-testid="cn-action-auth-save"]').trigger('click')
		await flushPromises()

		expect(axios.put).toHaveBeenCalledWith(ENDPOINT, {
			matrix: {
				'course.publish': ['admin', 'teachers'],
				'grade.export': ['admin', 'office'],
			},
		})
		expect(wrapper.find('[data-testid="cn-action-auth-notice"]').attributes('data-type')).toBe('success')
		expect(wrapper.emitted('saved')).toHaveLength(1)
		expect(cell(wrapper, 'grade.export', 'office').element.checked).toBe(true)
	})

	it('keeps the ticks on screen and says why when the save is refused', async () => {
		axios.put.mockRejectedValue({ response: { status: 412, data: { message: 'CSRF check failed' } } })
		const wrapper = await mountMatrix()

		await cell(wrapper, 'grade.export', 'office').setValue(true)
		await wrapper.find('[data-testid="cn-action-auth-save"]').trigger('click')
		await flushPromises()

		const notice = wrapper.find('[data-testid="cn-action-auth-notice"]')
		expect(notice.attributes('data-type')).toBe('error')
		expect(notice.attributes('role')).toBe('alert')
		expect(notice.text()).toContain('CSRF check failed')
		expect(cell(wrapper, 'grade.export', 'office').element.checked).toBe(true)
		expect(cell(wrapper, 'course.publish', 'teachers').element.checked).toBe(true)
		expect(wrapper.emitted('saved')).toBeUndefined()
	})

	it('does not report a save when the answer carries no matrix', async () => {
		axios.put.mockResolvedValue({ data: { status: 'ok' } })
		const wrapper = await mountMatrix()

		await cell(wrapper, 'grade.export', 'office').setValue(true)
		await wrapper.find('[data-testid="cn-action-auth-save"]').trigger('click')
		await flushPromises()

		expect(wrapper.find('[data-testid="cn-action-auth-notice"]').attributes('data-type')).toBe('error')
		expect(cell(wrapper, 'grade.export', 'office').element.checked).toBe(true)
	})

	it('says why when the matrix cannot be read, and draws no table', async () => {
		axios.get.mockRejectedValue({ response: { status: 403, data: { message: 'Not allowed' } } })
		const wrapper = await mountMatrix()

		expect(wrapper.find('table').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-action-auth-load-error"]').text()).toContain('Not allowed')
	})

	it('turns the save button on only after a change', async () => {
		const wrapper = await mountMatrix()
		const save = () => wrapper.find('[data-testid="cn-action-auth-save"]')

		expect(save().attributes('disabled')).toBeDefined()
		await cell(wrapper, 'grade.export', 'office').setValue(true)
		expect(save().attributes('disabled')).toBeUndefined()
	})
})
