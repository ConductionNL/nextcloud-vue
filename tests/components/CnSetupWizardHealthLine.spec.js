/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A summary step with `healthCheck: true` draws the installation checks the
 * app's setup status reports (humaniq board HuInrichten).
 *
 * @spec openspec/changes/setup-summary-health-line/specs/setup-summary-health-line/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ generateUrl: jest.fn((path) => `/index.php${path}`) }))

const axios = require('@nextcloud/axios').default
const { mount, flushPromises } = require('@vue/test-utils')
const CnSetupWizard = require('../../src/components/CnSetupWizard/CnSetupWizard.vue').default
const { __resetSetupStatusCacheForTests, useSetupStatus } = require('../../src/composables/useSetupStatus.js')
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const LANGUAGE = { id: 'language', type: 'choice', title: 'Language', configKey: 'default_language', options: [{ value: 'nl', label: 'Dutch' }] }
const DONE = { id: 'done', type: 'summary', title: 'Done', summaryEditable: true, healthCheck: true }
const CHECKS = [
	{ id: 'register', label: 'register imported with 54 schemas', ok: true },
	{ id: 'jobs', label: 'background jobs running', ok: true },
	{ id: 'pack', label: 'payroll pack 2026 loaded', ok: true },
]

async function openDone(status, steps = [LANGUAGE, DONE]) {
	axios.get.mockResolvedValue({ data: { version: 1, completed: false, steps: {}, ...status } })
	// The host (CnAppRoot's setup gate) runs the status fetch the wizard shares.
	await useSetupStatus('humaniq', { setup: { steps } }).refresh()
	const wrapper = mount(CnSetupWizard, { propsData: { appId: 'humaniq', steps } })
	await flushPromises()
	wrapper.vm.openStep('done')
	await flushPromises()
	return wrapper
}

describe('CnSetupWizard health line', () => {
	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
		axios.post.mockReset()
		axios.post.mockResolvedValue({ data: { success: true } })
	})

	it('names every check when all pass', async () => {
		const w = await openDone({ health: { ok: true, checks: CHECKS } })
		const line = w.find('[data-testid="cn-setup-health"]')
		expect(line.exists()).toBe(true)
		expect(line.classes()).toContain('cn-setup-health--ok')
		expect(line.text()).toContain('Check passed: register imported with 54 schemas, background jobs running, payroll pack 2026 loaded.')
	})

	it('names only the failing checks when one fails', async () => {
		const checks = [CHECKS[0], { ...CHECKS[1], ok: false }, CHECKS[2]]
		const w = await openDone({ health: { ok: false, checks } })
		const line = w.find('[data-testid="cn-setup-health"]')
		expect(line.classes()).toContain('cn-setup-health--problem')
		expect(line.text()).toContain('Check found a problem: background jobs running.')
		expect(line.text()).not.toContain('register imported')
	})

	it('treats a failing check as a problem even when ok says true', async () => {
		const w = await openDone({ health: { ok: true, checks: [{ ...CHECKS[0], ok: false }] } })
		expect(w.vm.healthLine(DONE).ok).toBe(false)
	})

	it('draws nothing without a health block', async () => {
		const w = await openDone({})
		expect(w.find('[data-testid="cn-setup-health"]').exists()).toBe(false)
		expect(w.vm.healthLine(DONE)).toBeNull()
	})

	it('draws nothing when the step does not ask for it', async () => {
		const plain = { ...DONE, healthCheck: false }
		const w = await openDone({ health: { ok: true, checks: CHECKS } }, [LANGUAGE, plain])
		expect(w.find('[data-testid="cn-setup-health"]').exists()).toBe(false)
	})

	it('says the check passed without labels when the app names none', async () => {
		const w = await openDone({ health: { ok: true } })
		expect(w.vm.healthLine(DONE)).toEqual({ ok: true, text: 'Check passed.' })
	})

	it('keeps the manifest valid with healthCheck on a summary step', () => {
		const manifest = { version: '1.0.0', menu: [], pages: [], setup: { steps: [LANGUAGE, DONE] } }
		const result = validateManifestV2(manifest)
		expect(result.errors.filter((e) => String(e.path || e.instancePath || '').includes('setup'))).toEqual([])
	})
})
