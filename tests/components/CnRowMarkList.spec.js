/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnRowMarkList — the `row-mark-list` widget (row-mark-list).
 *
 * Guarded: registered content-only; rows load from the endpoint with the
 * controls' values from the page query; a row without a mark takes the
 * default; a tap or a translated key marks a row and fills or clears its
 * details; required details are checked before the save, naming the rows;
 * one request saves every row with only the details its mark shows; a
 * read-only answer disables the marks; a server refusal shows its words.
 */
var mockGet = jest.fn()
var mockPost = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: (...args) => mockGet(...args), post: (...args) => mockPost(...args) },
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnRowMarkList/index.js'

const CnRowMarkList = require('../../src/components/CnRowMarkList/CnRowMarkList.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const CONTENT = {
	load: { url: '/apps/school/api/register' },
	save: { url: '/apps/school/api/register', body: { groupId: 'groupId', date: 'date', sessionId: 'sessionId' }, rowsKey: 'marks' },
	rowsPath: 'people',
	rowKey: 'userId',
	labelField: 'name',
	stateField: 'status',
	defaultState: 'present',
	editablePath: 'editable',
	states: [
		{ value: 'present', label: 'Present', key: 'P', countLabel: '{n} present' },
		{ value: 'late', label: 'Late', key: 'L', countLabel: '{n} late' },
		{ value: 'absent-excused', label: 'Absent with permission', key: 'E', countLabel: '{n} absent with permission' },
	],
	detailFields: [
		{ field: 'lateMinutes', label: 'Minutes late', type: 'number', states: ['late'], quick: [5, 10, 15], min: 1, max: 600, required: true, default: 5 },
		{ field: 'reasonKind', label: 'Reason', type: 'select', states: ['absent-excused'], options: [{ value: 'illness', label: 'Ill' }, { value: 'other', label: 'Other' }], required: true },
		{ field: 'note', label: 'Note (optional)', type: 'text', notStates: ['present'], maxlength: 500 },
	],
	badges: [
		{ path: 'markedVia', equals: 'self', text: 'checked in' },
		{ path: 'report.lifecycle', equals: 'approved', text: 'Report approved: {report.reason}' },
		{ path: 'report.lifecycle', notEquals: 'approved', text: 'Report waiting: {reason}', vars: { reason: 'report.reason' } },
	],
	heading: 'Register',
	headingPath: 'groupName',
	controls: [
		{ param: 'groupId', type: 'select', label: 'Group', optionsPath: 'groups', valuePath: 'groupId' },
		{ param: 'date', type: 'date', label: 'Day', valuePath: 'date', maxPath: 'today', todayPath: 'today', resets: ['sessionId'] },
	],
	notices: [
		{ path: 'locked', equals: 'past-saved', type: 'info', text: 'This register is saved.' },
		{ path: 'sessionId', missing: true, type: 'info', text: 'Saving adds a lesson.' },
	],
	incompleteText: 'Check the marks of: {names}.',
}

const ANSWER = {
	groupId: 'g-1',
	groupName: '1A',
	date: '2026-10-21',
	today: '2026-10-21',
	sessionId: 's-1',
	editable: true,
	groups: [{ id: 'g-1', name: '1A' }, { id: 'g-2', name: '1B' }],
	people: [
		{ userId: 'u-1', name: 'Ann', status: null, markedVia: 'self' },
		{ userId: 'u-2', name: 'Bob', status: 'late', lateMinutes: 10, report: { lifecycle: 'submitted', reason: 'dentist' } },
	],
}

function make(content = CONTENT, route = { path: '/register', query: { groupId: 'g-1' } }) {
	const router = { replace: jest.fn(() => Promise.resolve()) }
	const wrapper = mount(CnRowMarkList, {
		props: { content },
		global: {
			mocks: { $route: route, $router: router },
			provide: { cnTranslate: (text) => (text === 'E' ? 'X' : text) },
			stubs: {
				NcNoteCard: { props: ['type'], template: '<div class="note" :data-type="type"><slot /></div>' },
				NcLoadingIcon: true,
				NcButton: { props: ['disabled'], emits: ['click'], template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
				NcSelect: { props: ['options', 'modelValue', 'inputLabel'], template: '<div class="select">{{ inputLabel }}</div>' },
			},
		},
	})
	return { wrapper, router }
}

const row = (wrapper, key) => wrapper.find(`[data-testid="cn-row-mark-list-row-${key}"]`)

describe('CnRowMarkList', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPost.mockReset()
		mockGet.mockResolvedValue({ data: ANSWER })
	})

	test('is registered as a content-only widget', () => {
		expect(getWidgetTypeEntry('row-mark-list')).toBeTruthy()
		expect(isContentOnlyWidgetDef({ type: 'row-mark-list' })).toBe(true)
	})

	test('loads with the page query, defaults unmarked rows and counts the marks', async () => {
		const { wrapper } = make()
		await flush()

		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/school/api/register', { params: { groupId: 'g-1' } })
		expect(wrapper.find('[data-testid="cn-row-mark-list-counts"]').text()).toBe('1 present, 1 late, 0 absent with permission')
		expect(row(wrapper, 'u-1').text()).toContain('checked in')
		expect(row(wrapper, 'u-2').find('input[type="number"]').element.value).toBe('10')
		expect(wrapper.text()).toContain('Keys on a row: P Present, L Late, X Absent with permission.')
		expect(wrapper.find('[data-testid="cn-row-mark-list-heading"]').text()).toBe('Register · 1A')
		expect(row(wrapper, 'u-2').text()).toContain('Report waiting: dentist')
		expect(row(wrapper, 'u-2').text()).not.toContain('Report approved')
		expect(row(wrapper, 'u-2').attributes('aria-label')).toBe('Bob: Late, Minutes late 10')
		expect(wrapper.findAll('[data-testid="cn-row-mark-list-notice"]')).toHaveLength(0)
	})

	test('a notice shows when the answer is missing a value', async () => {
		mockGet.mockResolvedValue({ data: { ...ANSWER, sessionId: null } })
		const { wrapper } = make()
		await flush()

		expect(wrapper.find('[data-testid="cn-row-mark-list-notice"]').text()).toBe('Saving adds a lesson.')
	})

	test('a translated key marks the focused row; arrows do not mark', async () => {
		const { wrapper } = make()
		await flush()

		await row(wrapper, 'u-1').trigger('keydown', { key: 'x' })
		expect(row(wrapper, 'u-1').classes()).toContain('cn-row-mark-list__row--absent-excused')
		await row(wrapper, 'u-1').trigger('keydown', { key: 'e' })
		expect(row(wrapper, 'u-1').classes()).toContain('cn-row-mark-list__row--absent-excused')
		await row(wrapper, 'u-1').trigger('keydown', { key: 'l' })
		expect(row(wrapper, 'u-1').classes()).toContain('cn-row-mark-list__row--late')
		expect(row(wrapper, 'u-1').find('input[type="number"]').element.value).toBe('5')
	})

	test('a missing required detail names the row and does not save', async () => {
		const { wrapper } = make()
		await flush()

		await wrapper.find('[data-testid="cn-row-mark-list-mark-u-1-absent-excused"]').trigger('click')
		await wrapper.find('form').trigger('submit')

		expect(mockPost).not.toHaveBeenCalled()
		expect(wrapper.find('[data-testid="cn-row-mark-list-save-error"]').text()).toBe('Check the marks of: Ann.')
	})

	test('saves every row in one request with only the details its mark shows', async () => {
		mockPost.mockResolvedValue({ data: { ...ANSWER, locked: 'past-saved' } })
		const { wrapper } = make()
		await flush()

		await wrapper.find('[data-testid="cn-row-mark-list-mark-u-1-absent-excused"]').trigger('click')
		await row(wrapper, 'u-1').find('select').setValue('illness')
		await row(wrapper, 'u-1').find('input[type="text"]').setValue('  doctor  ')
		await wrapper.find('[data-testid="cn-row-mark-list-mark-u-2-present"]').trigger('click')
		await wrapper.find('form').trigger('submit')
		await flush()

		expect(mockPost).toHaveBeenCalledWith('/index.php/apps/school/api/register', {
			groupId: 'g-1',
			date: '2026-10-21',
			sessionId: 's-1',
			marks: [
				{ userId: 'u-1', status: 'absent-excused', reasonKind: 'illness', note: 'doctor' },
				{ userId: 'u-2', status: 'present' },
			],
		})
		expect(wrapper.find('[data-testid="cn-row-mark-list-saved"]').exists()).toBe(true)
		expect(wrapper.find('[data-testid="cn-row-mark-list-notice"]').text()).toBe('This register is saved.')
	})

	test('a refused save shows the server words', async () => {
		mockPost.mockRejectedValue({ response: { data: { error: 'This day is locked.' } } })
		const { wrapper } = make()
		await flush()

		await wrapper.find('form').trigger('submit')
		await flush()

		expect(wrapper.find('[data-testid="cn-row-mark-list-save-error"]').text()).toBe('This day is locked.')
	})

	test('a read-only answer disables the marks and the save', async () => {
		mockGet.mockResolvedValue({ data: { ...ANSWER, editable: false } })
		const { wrapper } = make()
		await flush()

		expect(wrapper.find('[data-testid="cn-row-mark-list-mark-u-1-late"]').attributes('disabled')).toBeDefined()
		expect(wrapper.find('[data-testid="cn-row-mark-list-save"]').attributes('disabled')).toBeDefined()
		await row(wrapper, 'u-1').trigger('keydown', { key: 'l' })
		expect(row(wrapper, 'u-1').classes()).toContain('cn-row-mark-list__row--present')
	})

	test('a control change goes into the page query and clears what it resets', async () => {
		const { wrapper, router } = make(CONTENT, { path: '/register', query: { groupId: 'g-1', sessionId: 's-1' } })
		await flush()

		await wrapper.find('[data-testid="cn-row-mark-list-control-date"]').setValue('2026-10-20')
		await wrapper.find('[data-testid="cn-row-mark-list-control-date"]').trigger('change')

		expect(router.replace).toHaveBeenCalledWith({ path: '/register', query: { groupId: 'g-1', date: '2026-10-20' } })
	})
})
