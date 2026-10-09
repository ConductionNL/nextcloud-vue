/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/openapi-reference-component/tasks.md#task-2
 * @spec openspec/changes/openapi-reference-component/tasks.md#task-3
 */
import axios from '@nextcloud/axios'
import { mount } from '@vue/test-utils'
import CnApiReference from '../../src/components/CnApiReference/CnApiReference.vue'
import oas from '../fixtures/openapi/vergunningen.oas.json'

jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))

const stubs = {
	NcButton: { template: '<button><slot /></button>' },
	NcTextField: { props: ['modelValue', 'label'], template: '<input class="filter" :aria-label="label" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />' },
}

function mountRef(props = {}) {
	return mount(CnApiReference, { propsData: { document: oas, ...props }, stubs })
}

describe('CnApiReference', () => {
	beforeEach(() => {
		global.fetch = jest.fn()
		axios.get.mockClear()
	})

	it('shows the header, security sentence and the groups', () => {
		const w = mountRef()
		expect(w.find('h2').text()).toContain('Vergunningen')
		expect(w.find('h2').text()).toContain('1.4.0')
		expect(w.text()).toContain('https://cloud.example.nl/apps/openregister/api')
		expect(w.text()).toContain('basicAuth: HTTP basic')
		expect(w.findAll('h3.cn-api-reference__tag').map((h) => h.text())).toEqual(['permit', 'applicant', 'Other', 'Models'])
	})

	it('mounts a call body only when it is opened', async () => {
		const w = mountRef()
		expect(w.find('.cn-api-operation__body').exists()).toBe(false)
		const button = w.find('button.cn-api-operation__toggle')
		expect(button.attributes('aria-expanded')).toBe('false')
		await button.trigger('click')
		expect(button.attributes('aria-expanded')).toBe('true')
		expect(button.attributes('aria-controls')).toBe(w.find('.cn-api-operation__body').attributes('id'))
		expect(w.find('.cn-api-operation__body').text()).toContain('_limit')
		expect(w.find('.cn-api-operation__body').text()).toContain('Page size')
		expect(w.find('.cn-api-operation__body').text()).toContain('title')
	})

	it('shows an external reference and a cycle as sentences', async () => {
		const w = mountRef()
		await w.findAll('button.cn-api-operation__toggle').at(1).trigger('click')
		expect(w.text()).toContain('External reference, not loaded')
		expect(w.text()).toContain('See above')
	})

	it('filters the calls and updates the status line', async () => {
		const w = mountRef()
		expect(w.find('[data-testid="cn-api-reference-status"]').text()).toBe('5 of 5 calls')
		await w.find('.filter').setValue('DELETE')
		expect(w.findAll('button.cn-api-operation__toggle')).toHaveLength(1)
		expect(w.find('[data-testid="cn-api-reference-status"]').text()).toBe('1 of 5 calls')
		await w.find('.filter').setValue('zzz')
		expect(w.find('[data-testid="cn-api-reference-status"]').text()).toBe('No call matches this filter.')
		expect(w.find('[data-testid="cn-api-reference-status"]').attributes('aria-live')).toBe('polite')
	})

	it('makes no request while mounting, opening or filtering', async () => {
		const w = mountRef()
		await w.findAll('button.cn-api-operation__toggle').at(0).trigger('click')
		await w.find('.filter').setValue('get')
		expect(global.fetch).not.toHaveBeenCalled()
		expect(axios.get).not.toHaveBeenCalled()
		expect(axios.post).not.toHaveBeenCalled()
	})

	it('renders descriptions as text and never an image or an unsafe link', () => {
		const w = mountRef()
		expect(w.find('img').exists()).toBe(false)
		expect(w.text()).toContain('![x](https://example.org/p.png)')
		expect(w.find('.cn-api-reference__docs a').exists()).toBe(false)
	})

	it('says so for Swagger 2.0 and for other input', () => {
		expect(mountRef({ document: { swagger: '2.0', info: { title: 'Old' } } }).text()).toContain('This file is Swagger 2.0. Only OpenAPI 3 is shown here.')
		expect(mountRef({ document: { hello: 1 } }).text()).toContain('This is not an OpenAPI document.')
	})

	it('hides the download when downloadable is false', () => {
		expect(mountRef({ downloadable: false }).find('[data-testid="cn-api-reference-download"]').exists()).toBe(false)
	})
})

describe('CnApiReference download', () => {
	let anchors

	beforeEach(() => {
		anchors = []
		window.URL.createObjectURL = jest.fn(() => 'blob:x')
		window.URL.revokeObjectURL = jest.fn()
		jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function() {
			anchors.push(this.download)
		})
	})

	afterEach(() => jest.restoreAllMocks())

	it('saves the document as indented JSON under the given name', async () => {
		const w = mountRef({ downloadName: 'vergunningen-1.4.0' })
		await w.find('[data-testid="cn-api-reference-download"]').trigger('click')
		expect(anchors).toEqual(['vergunningen-1.4.0.openapi.json'])
		const blob = window.URL.createObjectURL.mock.calls[0][0]
		expect(JSON.parse(await new Promise((resolve) => {
			const reader = new FileReader()
			reader.onload = () => resolve(reader.result)
			reader.readAsText(blob)
		})).info.version).toBe('1.4.0')
	})

	it('names the file after title and version without a name', async () => {
		const w = mountRef()
		await w.find('[data-testid="cn-api-reference-download"]').trigger('click')
		expect(anchors).toEqual(['Vergunningen-1.4.0.openapi.json'])
	})
})
