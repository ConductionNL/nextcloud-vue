/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The setup recap can say why a step matters (`summaryHint`) and open a step
 * again (`summaryEditable`), and a config-fields step can hold a repeatable
 * group posted as one list (humaniq's Administraties step, board HuInrichten).
 *
 * @spec openspec/changes/setup-wizard-recap-and-repeatable/specs/setup-wizard/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((path) => `/index.php${path}`) }))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const { __resetSetupStatusCacheForTests } = require('../../src/composables/useSetupStatus.js')
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const ADMINISTRATIONS = {
	id: 'administrations',
	type: 'config-fields',
	title: 'Administrations',
	action: 'create-administrations',
	summaryHint: 'Each administration has its own payroll tax number.',
	schema: {
		type: 'object',
		properties: {
			administrations: {
				type: 'array',
				title: 'Administrations',
				repeatable: true,
				addLabel: 'Add administration',
				items: { type: 'object', properties: { name: { type: 'string', title: 'Name' }, kvk: { type: 'string', title: 'KvK number' } } },
			},
		},
	},
}
const LANGUAGE = { id: 'language', type: 'choice', title: 'Language', configKey: 'default_language', options: [{ value: 'nl', label: 'Dutch' }, { value: 'en', label: 'English' }] }
const DONE = { id: 'done', type: 'summary', title: 'Done', summaryEditable: true }

async function mountWizard(steps = [ADMINISTRATIONS, LANGUAGE, DONE]) {
	const wrapper = mount(CnSetupWizard, { propsData: { appId: 'humaniq', steps } })
	await flushPromises()
	return wrapper
}

describe('CnSetupWizard recap', () => {
	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
		axios.post.mockReset()
		axios.get.mockResolvedValue({ data: { version: 1, completed: false, steps: {} } })
		axios.post.mockResolvedValue({ data: { success: true } })
	})

	it('carries a step\'s summaryHint into its recap row, and none without one', async () => {
		const w = await mountWizard()
		const rows = w.vm.summaryItems
		expect(rows.find((r) => r.id === 'administrations').hint).toBe('Each administration has its own payroll tax number.')
		expect(rows.find((r) => r.id === 'language').hint).toBe('')
		expect(rows.every((r) => r.editable)).toBe(true)
	})

	it('opens the step a Change button names, at its index', async () => {
		const w = await mountWizard()
		w.vm.openStep('done')
		w.vm.openStep('language')
		const last = w.emitted('step-change').at(-1)[0]
		expect(last.stepId).toBe('language')
		expect(last.stepIndex).toBe(1)
	})

	it('draws a Change button per row only with summaryEditable', async () => {
		const w = await mountWizard()
		w.vm.openStep('done')
		await flushPromises()
		expect(w.findAll('[data-testid="cn-setup-summary-change"]').length).toBe(2)
		expect(w.findAll('[data-testid="cn-setup-summary-hint"]').length).toBe(1)
		const plain = await mountWizard([ADMINISTRATIONS, LANGUAGE, { ...DONE, summaryEditable: false }])
		plain.vm.openStep('done')
		await flushPromises()
		expect(plain.findAll('[data-testid="cn-setup-summary-change"]').length).toBe(0)
	})
})

describe('CnSetupWizard repeatable group', () => {
	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
		axios.post.mockReset()
		axios.get.mockResolvedValue({ data: { version: 1, completed: false, steps: {} } })
		axios.post.mockResolvedValue({ data: { success: true, message: '2 administration(s) ready.' } })
	})

	it('draws one row to start, adds and removes rows', async () => {
		const w = await mountWizard()
		const field = w.vm.fieldsFor(ADMINISTRATIONS)[0]
		expect(field.repeatable.fields.map((f) => f.key)).toEqual(['name', 'kvk'])
		expect(w.findAll('[data-testid="cn-setup-repeat-row"]')).toHaveLength(1)
		w.vm.addRepeatRow(field)
		await flushPromises()
		expect(w.findAll('[data-testid="cn-setup-repeat-row"]')).toHaveLength(2)
		w.vm.removeRepeatRow(field, 0)
		await flushPromises()
		expect(w.findAll('[data-testid="cn-setup-repeat-row"]')).toHaveLength(1)
	})

	it('posts two filled rows as a two-item list to the step\'s action, leaving empty rows out', async () => {
		const w = await mountWizard()
		const field = w.vm.fieldsFor(ADMINISTRATIONS)[0]
		w.vm.onRepeatInput(field, 0, { key: 'name' }, 'Zuiddrecht BV')
		w.vm.addRepeatRow(field)
		w.vm.onRepeatInput(field, 1, { key: 'name' }, 'Zuiddrecht Holding')
		w.vm.onRepeatInput(field, 1, { key: 'kvk' }, '12345678')
		w.vm.addRepeatRow(field)
		expect(await w.vm.validateStep('administrations')).toBe(true)
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/humaniq/api/setup/action/create-administrations', {
			administrations: [{ name: 'Zuiddrecht BV' }, { name: 'Zuiddrecht Holding', kvk: '12345678' }],
		})
		expect(w.vm.summaryItems.find((r) => r.id === 'administrations').value).toBe('Administrations: Zuiddrecht BV; Zuiddrecht Holding')
	})

	it('surfaces a refusal from the action and stays on the step', async () => {
		axios.post.mockResolvedValue({ data: { success: false, message: 'A KvK number has eight digits.' } })
		const w = await mountWizard()
		const field = w.vm.fieldsFor(ADMINISTRATIONS)[0]
		w.vm.onRepeatInput(field, 0, { key: 'kvk' }, '123')
		expect(await w.vm.validateStep('administrations')).toBe('A KvK number has eight digits.')
	})

	it('is accepted by the manifest schema', () => {
		const manifest = { $schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json', version: '1.0.0', menu: [], pages: [], setup: { steps: [ADMINISTRATIONS, LANGUAGE, DONE] } }
		expect(validateManifestV2(manifest).errors).toEqual([])
	})
})
