/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnChoicePickerWidget — the `choice-picker` widget (abstract-choice-picker).
 *
 * Guarded: registered content-only; cards from a source (url tokens resolved)
 * with swatches, a mapped state pill and the stored choice selected; choosing
 * writes nothing until Save; a card with a warning shows the band and a confirm
 * button, and Save and confirm tell the request apart (`@confirmed`); a refused
 * card is listed with its reason and cannot be chosen; the default save PATCHes
 * the one field; a refused request shows the server's words.
 */
var mockGet = jest.fn()
var mockPatch = jest.fn()
var mockPut = jest.fn()

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: (...args) => mockGet(...args),
		patch: (...args) => mockPatch(...args),
		put: (...args) => mockPut(...args),
	},
}))

jest.mock('@nextcloud/router', () => ({
	__esModule: true,
	generateUrl: (url) => `/index.php${url}`,
}))

import { mount } from '@vue/test-utils'
import { getWidgetTypeEntry } from '../../src/components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { isContentOnlyWidgetDef } from '../../src/utils/widgetDispatch.js'

import '../../src/components/CnChoicePickerWidget/index.js'

const CnChoicePickerWidget = require('../../src/components/CnChoicePickerWidget/CnChoicePickerWidget.vue').default

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
const OBJECT_URL = '/index.php/apps/openregister/api/objects/portaliq/portal/p-1'

const SETS = {
	sets: [
		{ id: 'zuiddrecht', name: 'Zuiddrecht', colors: ['#234a78', '#cc0000', '#ffffff'], verdict: { passes: true }, findings: [] },
		{ id: 'licht', name: 'Zuiddrecht licht', colors: ['#eaf0f7', '#3669a5'], verdict: { passes: false }, findings: [{ token: 'text', surface: 'footer', ratio: 3.1, threshold: 4.5 }] },
		{ id: 'rijks', name: 'Rijkshuisstijl', colors: ['#154273'], findings: [] },
		{ id: 'bad', name: 'Bad set', colors: [], refusal: 'uses a declaration that is not allowed', findings: [] },
	],
}

const CONTENT = {
	field: 'theme',
	legend: 'House style',
	saveLabel: 'Save',
	confirmLabel: 'Use it anyway',
	source: {
		url: '/apps/portaliq/api/portals/@object.slug/theme',
		path: 'sets',
		key: 'id',
		label: 'name',
		swatches: 'colors',
		refusal: 'refusal',
		state: {
			path: 'verdict.passes',
			map: { true: 'Readable', false: 'Hard to read' },
			variantMap: { true: 'success', false: 'warning' },
			empty: 'Not checked',
		},
		warning: { list: 'findings', item: '{token} on the {surface} is {ratio}:1, needs {threshold}:1.' },
	},
}
const OBJECT = { id: 'p-1', slug: 'zuiddrecht', theme: 'zuiddrecht' }

async function make(props = {}) {
	const wrapper = mount(CnChoicePickerWidget, {
		props: { content: CONTENT, objectData: OBJECT, objectId: 'p-1', register: 'portaliq', schema: 'portal', ...props },
		global: { stubs: { NcNoteCard: { template: '<div class="note"><slot /></div>' }, NcButton: { template: '<button @click="$emit(\'click\')"><slot /></button>' } } },
	})
	await flush()
	return wrapper
}

const radio = (wrapper, key) => wrapper.find(`[data-testid="cn-choice-picker-option-${key}"] input`)

describe('CnChoicePickerWidget', () => {
	beforeEach(() => {
		mockGet.mockReset()
		mockPatch.mockReset()
		mockPut.mockReset()
		mockGet.mockResolvedValue({ data: SETS })
		mockPatch.mockResolvedValue({ data: {} })
		mockPut.mockResolvedValue({ data: {} })
	})

	test('is registered as a content-only detail widget', () => {
		expect(getWidgetTypeEntry('choice-picker')).toBeTruthy()
		expect(isContentOnlyWidgetDef({ type: 'choice-picker' })).toBe(true)
	})

	test('cards from the source: swatches, mapped pill, empty-state pill, the stored one selected', async () => {
		const wrapper = await make()
		expect(mockGet).toHaveBeenCalledWith('/index.php/apps/portaliq/api/portals/zuiddrecht/theme')
		expect(wrapper.findAll('.cn-choice-picker__card')).toHaveLength(4)
		expect(wrapper.findAll('[data-testid="cn-choice-picker-option-zuiddrecht"] .cn-choice-picker__swatch')).toHaveLength(3)
		expect(wrapper.find('[data-testid="cn-choice-picker-option-zuiddrecht"]').text()).toContain('Readable')
		expect(wrapper.find('[data-testid="cn-choice-picker-option-licht"]').text()).toContain('Hard to read')
		expect(wrapper.find('[data-testid="cn-choice-picker-option-rijks"]').text()).toContain('Not checked')
		expect(radio(wrapper, 'zuiddrecht').element.checked).toBe(true)
		expect(wrapper.find('[data-testid="cn-choice-picker-option-zuiddrecht"]').classes()).toContain('cn-choice-picker__card--selected')
	})

	test('choosing writes nothing until Save; Save is disabled for the stored choice', async () => {
		const wrapper = await make()
		expect(wrapper.find('[data-testid="cn-choice-picker-save"]').attributes('disabled')).toBeDefined()
		await radio(wrapper, 'rijks').setValue(true)
		expect(mockPatch).not.toHaveBeenCalled()
		await wrapper.find('[data-testid="cn-choice-picker-save"]').trigger('click')
		await flush()
		expect(mockPatch).toHaveBeenCalledWith(OBJECT_URL, { theme: 'rijks' })
		expect(wrapper.find('[data-testid="cn-choice-picker-notice"]').text()).toBe('Saved.')
	})

	test('a card with a warning shows the band and a confirm button', async () => {
		const wrapper = await make()
		expect(wrapper.find('[data-testid="cn-choice-picker-warning"]').exists()).toBe(false)
		expect(wrapper.find('[data-testid="cn-choice-picker-confirm"]').exists()).toBe(false)
		await radio(wrapper, 'licht').setValue(true)
		expect(wrapper.find('[data-testid="cn-choice-picker-warning"]').text()).toContain('text on the footer is 3.1:1, needs 4.5:1.')
		expect(wrapper.find('[data-testid="cn-choice-picker-confirm"]').text()).toBe('Use it anyway')
	})

	test('a custom request tells Save and confirm apart with @confirmed', async () => {
		const save = { method: 'PUT', url: '/apps/portaliq/api/portals/@object.slug/theme', payload: { theme: '@value', acceptFindings: '@confirmed' } }
		const wrapper = await make({ content: { ...CONTENT, save } })
		await radio(wrapper, 'licht').setValue(true)
		await wrapper.find('[data-testid="cn-choice-picker-save"]').trigger('click')
		await flush()
		expect(mockPut).toHaveBeenLastCalledWith('/index.php/apps/portaliq/api/portals/zuiddrecht/theme', { theme: 'licht', acceptFindings: false })
		await wrapper.find('[data-testid="cn-choice-picker-confirm"]').trigger('click')
		await flush()
		expect(mockPut).toHaveBeenLastCalledWith('/index.php/apps/portaliq/api/portals/zuiddrecht/theme', { theme: 'licht', acceptFindings: true })
		expect(mockPatch).not.toHaveBeenCalled()
	})

	test('a refused card is listed with its reason and cannot be chosen', async () => {
		const wrapper = await make()
		expect(wrapper.find('[data-testid="cn-choice-picker-refusal-bad"]').text()).toBe('uses a declaration that is not allowed')
		expect(radio(wrapper, 'bad').element.disabled).toBe(true)
	})

	test('a refused request shows the server words', async () => {
		mockPatch.mockRejectedValue({ response: { data: { error: 'Not allowed.' } } })
		const wrapper = await make()
		await radio(wrapper, 'rijks').setValue(true)
		await wrapper.find('[data-testid="cn-choice-picker-save"]').trigger('click')
		await flush()
		expect(wrapper.find('[data-testid="cn-choice-picker-notice"]').text()).toBe('Not allowed.')
	})

	test('static items work without a source; no items shows the empty text; readOnly has no buttons', async () => {
		const items = [{ key: 'a', label: 'A', swatches: ['#fff'] }]
		const wrapper = await make({ content: { field: 'theme', items, source: { key: 'key', label: 'label', swatches: 'swatches' } } })
		expect(mockGet).not.toHaveBeenCalled()
		expect(wrapper.findAll('.cn-choice-picker__card')).toHaveLength(1)
		const empty = await make({ content: { field: 'theme', emptyText: 'No styles.' } })
		expect(empty.find('[data-testid="cn-choice-picker-empty"]').text()).toBe('No styles.')
		const readOnly = await make({ content: { ...CONTENT, readOnly: true } })
		expect(readOnly.find('[data-testid="cn-choice-picker-save"]').exists()).toBe(false)
	})
})
