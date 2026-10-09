/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * @spec openspec/changes/form-smart-paste/tasks.md#task-2
 * @spec openspec/changes/form-smart-paste/tasks.md#task-3
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { post: jest.fn(), put: jest.fn(), patch: jest.fn() } }))

import { mount } from '@vue/test-utils'
import CnFormPage from '@/components/CnFormPage/CnFormPage.vue'

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

const stubs = {
	CnPageHeader: true,
	CnSmartPasteDialog: true,
	NcButton: { template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>', props: ['type', 'disabled', 'variant'] },
	NcLoadingIcon: true,
	Send: true,
	NcCheckboxRadioSwitch: true,
	NcTextField: { template: '<input class="tf" :value="modelValue" />', props: ['label', 'type', 'modelValue', 'error', 'helperText'] },
	NcSelect: true,
	CnJsonViewer: true,
}

const fields = [
	{ key: 'naam', type: 'string', label: 'Naam' },
	{ key: 'telefoon', type: 'string', label: 'Telefoon', validation: { pattern: '^[0-9 ]+$' } },
	{ key: 'leeftijd', type: 'number', label: 'Leeftijd' },
	{ key: 'soort', type: 'enum', label: 'Soort', enum: ['a', 'b'] },
	{ key: 'opmerking', type: 'string', label: 'Opmerking' },
]

const smartPaste = { enabled: true, fields: ['naam', 'telefoon', 'leeftijd', 'soort'], handler: 'fill' }

async function mountForm({ mode = 'create', handler, props = {} } = {}) {
	const w = mount(CnFormPage, {
		propsData: { fields, submitHandler: 'submit', mode, smartPaste, ...props },
		stubs,
		mocks: { $route: { params: {} }, $router: { push: jest.fn() } },
		provide: { cnCustomComponents: { fill: handler, submit: jest.fn() } },
	})
	await flush()
	return w
}

describe('CnFormPage smart paste gate', () => {
	let warn

	beforeEach(() => {
		warn = jest.spyOn(console, 'warn').mockImplementation(() => {})
	})

	afterEach(() => warn.mockRestore())

	const button = (w) => w.find('[data-testid="cn-form-page-smart-paste"]')

	it('shows for an enabled form with an available handler', async () => {
		expect(button(await mountForm({ handler: { fill: jest.fn(), available: async () => true } })).exists()).toBe(true)
		expect(button(await mountForm({ handler: jest.fn() })).exists()).toBe(true)
	})

	it('is hidden in public mode whatever the manifest says', async () => {
		expect(button(await mountForm({ mode: 'public', handler: jest.fn() })).exists()).toBe(false)
	})

	it('is hidden for a missing, throwing or unavailable handler', async () => {
		expect(button(await mountForm({ handler: undefined })).exists()).toBe(false)
		expect(button(await mountForm({ handler: { fill: jest.fn(), available: async () => {
			throw new Error('x')
		} } })).exists()).toBe(false)
		expect(button(await mountForm({ handler: { fill: jest.fn(), available: async () => false } })).exists()).toBe(false)
	})

	it('is hidden when disabled or absent', async () => {
		expect(button(await mountForm({ handler: jest.fn(), props: { smartPaste: { ...smartPaste, enabled: false } } })).exists()).toBe(false)
		expect(button(await mountForm({ handler: jest.fn(), props: { smartPaste: null } })).exists()).toBe(false)
	})
})

describe('CnFormPage smart paste landing', () => {
	it('passes the text and only the allowed fields, never a typed value', async () => {
		const fill = jest.fn().mockResolvedValue({ values: {} })
		const w = await mountForm({ handler: fill })
		w.vm.updateField('opmerking', 'secret note')
		w.vm.updateField('naam', 'typed name')
		await w.vm.onSmartPasteFill({ text: 'Jansen BV', replace: false })
		const [text, allowed] = fill.mock.calls[0]
		expect(text).toBe('Jansen BV')
		expect(allowed.map((f) => f.key)).toEqual(['naam', 'telefoon', 'leeftijd', 'soort'])
		expect(allowed.find((f) => f.key === 'soort').options).toEqual(['a', 'b'])
		expect(JSON.stringify(allowed)).not.toContain('secret note')
		expect(JSON.stringify(allowed)).not.toContain('typed name')
	})

	it('fills allowed empty fields as suggestions and skips the rest', async () => {
		const fill = jest.fn().mockResolvedValue({ values: { naam: 'Jansen BV', telefoon: '030 123 4567', opmerking: 'not allowed', leeftijd: '42', soort: 'zzz' } })
		const w = await mountForm({ handler: fill })
		await w.vm.onSmartPasteFill({ text: 'x', replace: false })
		expect(w.vm.formData.naam).toBe('Jansen BV')
		expect(w.vm.formData.telefoon).toBe('030 123 4567')
		expect(w.vm.formData.leeftijd).toBe(42)
		expect(w.vm.formData.opmerking).toBeUndefined()
		expect(w.vm.formData.soort).toBeUndefined()
		expect(Object.keys(w.vm.suggestions).sort()).toEqual(['leeftijd', 'naam', 'telefoon'])
		expect(w.vm.smartPasteNotice).toBe('3 fields filled, 1 skipped')
	})

	it('keeps a typed value unless Replace is ticked', async () => {
		const fill = jest.fn().mockResolvedValue({ values: { telefoon: '030 123 4567' } })
		const w = await mountForm({ handler: fill })
		w.vm.updateField('telefoon', '06 1234 5678')
		await w.vm.onSmartPasteFill({ text: 'x', replace: false })
		expect(w.vm.formData.telefoon).toBe('06 1234 5678')
		await w.vm.onSmartPasteFill({ text: 'x', replace: true })
		expect(w.vm.formData.telefoon).toBe('030 123 4567')
	})

	it('skips a proposal that fails the field validation', async () => {
		const fill = jest.fn().mockResolvedValue({ values: { telefoon: 'see below' } })
		const w = await mountForm({ handler: fill })
		await w.vm.onSmartPasteFill({ text: 'x', replace: false })
		expect(w.vm.formData.telefoon).toBeUndefined()
		expect(w.vm.smartPasteNotice).toBe('0 fields filled, 1 skipped')
	})

	it('clears a mark on edit, Accept and Accept all, and never submits', async () => {
		const fill = jest.fn().mockResolvedValue({ values: { naam: 'A', telefoon: '1', leeftijd: 3 } })
		const w = await mountForm({ handler: fill })
		await w.vm.onSmartPasteFill({ text: 'x', replace: false })
		w.vm.updateField('naam', 'edited')
		expect(w.vm.suggestions.naam).toBeUndefined()
		w.vm.acceptSuggestion('telefoon')
		expect(w.vm.suggestions.telefoon).toBeUndefined()
		w.vm.acceptAllSuggestions()
		expect(w.vm.hasSuggestions).toBe(false)
		expect(w.emitted('submit')).toBeUndefined()
	})

	it('shows the handler error in the dialog and fills nothing', async () => {
		const w = await mountForm({ handler: jest.fn().mockRejectedValue(new Error('Service down')) })
		await w.vm.onSmartPasteFill({ text: 'x', replace: false })
		expect(w.vm.smartPasteError).toBe('Service down')
		expect(w.vm.formData.naam).toBeUndefined()
	})
})
