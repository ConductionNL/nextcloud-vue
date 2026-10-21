/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * CnObjectTranslationsWidget edits a property in a second language and says
 * what is still missing. Axios is mocked, not the helpers, so the helpers'
 * own reading is under test with the widget.
 *
 * Pinned: the chips come from the register's languages; a stale translation
 * counts as missing (OpenRegister's own completeness counts it as done); the
 * PATCH carries the WHOLE language map; only properties OpenRegister holds as
 * translatable are offered; a failed read says so; the language strip is a
 * keyboard-operable tablist with a tabpanel.
 */

import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnObjectTranslationsWidget from '../CnObjectTranslationsWidget.vue'
import { completenessOf } from '../../../utils/objectTranslations.js'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), patch: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: jest.fn((p) => `/index.php${p}`) }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showError: jest.fn(), showSuccess: jest.fn() }))
jest.mock('@nextcloud/event-bus', () => ({ __esModule: true, subscribe: jest.fn(), unsubscribe: jest.fn(), emit: jest.fn() }))

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	NcButton: { name: 'NcButton', props: ['disabled', 'variant'], emits: ['click'], template: '<button v-bind="$attrs" :disabled="disabled" @click="$emit(\'click\')"><slot /></button>' },
	NcLoadingIcon: true,
	NcTextField: { name: 'NcTextField', props: ['label', 'modelValue', 'disabled'], emits: ['update:modelValue'], template: '<input :aria-label="label" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value)">' },
}

let object = {}
let rows = []

async function mountWidget(props = {}) {
	const wrapper = mount(CnObjectTranslationsWidget, {
		props: { register: 'reg', schema: 'kind', objectId: 'o-1', ...props },
		global: { stubs },
	})
	for (let i = 0; i < 5; i++) {
		await flush()
	}
	await wrapper.vm.$nextTick()
	return wrapper
}

beforeEach(() => {
	jest.clearAllMocks()
	rows = []
	object = {
		'@self': { uuid: 'o-1' },
		title: { nl: 'Omgevingsvergunning' },
		description: { nl: 'Een vergunning voor bouwen' },
		_meta: {
			languageMeta: {
				title: { sourceLanguage: 'nl', served: 'nl', isSource: true, status: 'source' },
				description: { sourceLanguage: 'nl', served: 'nl', isSource: true, status: 'source' },
			},
		},
	}
	axios.get.mockImplementation((url) => {
		if (url.endsWith('/registers/reg')) {
			return Promise.resolve({ data: { languages: ['nl', 'en'] } })
		}
		if (url.endsWith('/registers/reg/schemas')) {
			return Promise.resolve({ data: { results: [{ slug: 'kind', properties: { title: { title: 'Title' }, description: { title: 'Description' } } }] } })
		}
		if (url.includes('/translations/object/')) {
			return Promise.resolve({ data: { translations: rows } })
		}
		return Promise.resolve({ data: { object } })
	})
	axios.patch.mockResolvedValue({ data: { object } })
})

describe('an object says what is still missing', () => {
	it('draws one chip per declared language, not per language present', async () => {
		const wrapper = await mountWidget()
		const chips = wrapper.findAll('.cn-object-translations__chip')
		expect(chips).toHaveLength(2)
		expect(chips[1].attributes('data-language')).toBe('en')
		expect(chips[1].text()).toContain('0 of 2')
	})

	it('counts a stale translation as missing', () => {
		const values = { title: { nl: 'A', en: 'A!' }, description: { nl: 'B', en: 'B!' } }
		expect(completenessOf({ properties: ['title', 'description'], values, statuses: { title: { en: 'human_reviewed' }, description: { en: 'human_reviewed' } }, language: 'en', sourceLanguage: 'nl' })).toEqual({ translated: 2, total: 2 })
		expect(completenessOf({ properties: ['title', 'description'], values, statuses: { title: { en: 'outdated' }, description: { en: 'human_reviewed' } }, language: 'en', sourceLanguage: 'nl' })).toEqual({ translated: 1, total: 2 })
	})

	it('reports one of two when one of two is translated', async () => {
		object.title.en = 'Environmental permit'
		rows = [{ property: 'title', language: 'en', status: 'human_reviewed' }]
		const wrapper = await mountWidget()
		expect(wrapper.find('.cn-object-translations__chip[data-language="en"]').text()).toContain('1 of 2')
	})

	it('drops a translation back out of the count when the source moves', async () => {
		object.title.en = 'Environmental permit'
		rows = [{ property: 'title', language: 'en', status: 'outdated' }]
		const wrapper = await mountWidget()
		expect(wrapper.find('.cn-object-translations__chip[data-language="en"]').text()).toContain('0 of 2')
		expect(wrapper.find('.cn-object-translations__stale').exists()).toBe(true)
	})

	it('reads the object under the register and schema it was given', async () => {
		await mountWidget()
		expect(axios.get.mock.calls.some(([url, opts]) => url === '/index.php/apps/openregister/api/objects/reg/kind/o-1' && opts.params._translations === 'all')).toBe(true)
		expect(axios.get.mock.calls.some(([url, opts]) => url.endsWith('/translations/object/o-1') && opts.params.schema === 'kind')).toBe(true)
	})

	it('takes the slug of a schema object from the detail context', async () => {
		await mountWidget({ schema: { slug: 'kind', id: 7 } })
		expect(axios.get.mock.calls.some(([url]) => url.endsWith('/objects/reg/kind/o-1'))).toBe(true)
	})
})

describe('an admin adds an English title', () => {
	it('writes the whole language map through a typed edit, so the Dutch title survives', async () => {
		const wrapper = await mountWidget()
		expect(wrapper.vm.activeLanguage).toBe('en')

		const field = wrapper.find('.cn-object-translations__field[data-property="title"] input')
		await field.setValue('Environmental permit')
		await wrapper.find('[data-testid="cn-object-translations-save"]').trigger('click')
		await flush()

		expect(axios.patch).toHaveBeenCalledTimes(1)
		const [url, body] = axios.patch.mock.calls[0]
		expect(url).toBe('/index.php/apps/openregister/api/objects/reg/kind/o-1')
		expect(body).toEqual({ title: { nl: 'Omgevingsvergunning', en: 'Environmental permit' } })
		expect(axios.patch.mock.calls[0][2]).toBeUndefined()
	})

	it('keeps the source language read-only', async () => {
		const wrapper = await mountWidget()
		wrapper.vm.activeLanguage = 'nl'
		await wrapper.vm.$nextTick()
		expect(wrapper.find('.cn-object-translations__field input').attributes('disabled')).toBeDefined()
	})

	it('offers only the properties OpenRegister holds as translatable', async () => {
		delete object._meta.languageMeta.description
		const wrapper = await mountWidget()
		expect(wrapper.findAll('.cn-object-translations__field')).toHaveLength(1)
	})

	it('narrows to a whitelist when one is configured', async () => {
		const wrapper = await mountWidget({ content: { properties: ['description'] } })
		const fields = wrapper.findAll('.cn-object-translations__field')
		expect(fields).toHaveLength(1)
		expect(fields[0].attributes('data-property')).toBe('description')
	})

	it('says so rather than drawing an empty page when the read fails', async () => {
		axios.get.mockRejectedValue(new Error('503'))
		const wrapper = await mountWidget()
		expect(wrapper.text()).toContain('could not be read')
		expect(wrapper.findAll('.cn-object-translations__chip')).toHaveLength(0)
	})
})

describe('the language strip is a tablist', () => {
	it('links each tab to the panel and moves with the arrow keys', async () => {
		const wrapper = await mountWidget()
		const panel = wrapper.find('[role="tabpanel"]')
		expect(panel.exists()).toBe(true)
		const tabs = wrapper.findAll('[role="tab"]')
		expect(tabs).toHaveLength(2)
		expect(tabs[0].attributes('aria-controls')).toBe(panel.attributes('id'))
		expect(panel.attributes('aria-labelledby')).toBe(tabs[1].attributes('id'))
		expect(tabs[1].attributes('aria-selected')).toBe('true')
		expect(tabs[0].attributes('tabindex')).toBe('-1')

		await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'ArrowRight' })
		expect(wrapper.vm.activeLanguage).toBe('nl')
		await wrapper.find('[role="tablist"]').trigger('keydown', { key: 'End' })
		expect(wrapper.vm.activeLanguage).toBe('en')
	})
})

describe('registration', () => {
	it('is the detail-page widget type object-translations', () => {
		const { BUILT_IN_WIDGETS } = require('../../CnWidgetGrid/builtInWidgets.js')
		expect(BUILT_IN_WIDGETS['object-translations']).toBe(CnObjectTranslationsWidget)
	})
})
