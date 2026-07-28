/**
 * Tests for useSetupStatus — first-time-setup status composable (ADR-042).
 */

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: { get: jest.fn(), post: jest.fn() },
}))
jest.mock('@nextcloud/router', () => ({
	generateUrl: jest.fn((path) => `/index.php${path}`),
}))

const axios = require('@nextcloud/axios').default
const { useSetupStatus, __resetSetupStatusCacheForTests } = require('../../src/composables/useSetupStatus.js')

const manifest = {
	setup: {
		enabled: true,
		version: 1,
		steps: [
			{ id: 'region', type: 'choice', required: true },
			{ id: 'seed', type: 'run-action', required: false },
		],
	},
}

describe('useSetupStatus', () => {
	beforeEach(() => {
		__resetSetupStatusCacheForTests()
		axios.get.mockReset()
	})

	it('derives requiredUnmet from status + manifest required flags', async () => {
		axios.get.mockResolvedValue({ data: { version: 1, completed: false, steps: { region: { done: false }, seed: { done: true } } } })
		const s = useSetupStatus('procest', manifest)
		await s.refresh()
		expect(s.requiredUnmet.value.map((x) => x.id)).toEqual(['region'])
		expect(s.optionalUnmet.value.map((x) => x.id)).toEqual([])
		expect(s.completed.value).toBe(false)
	})

	it('reports completed only when required done AND the server flag is set', async () => {
		axios.get.mockResolvedValue({ data: { version: 1, completed: true, steps: { region: { done: true }, seed: { done: true } } } })
		const s = useSetupStatus('procest', manifest)
		await s.refresh()
		expect(s.requiredUnmet.value.length).toBe(0)
		expect(s.completed.value).toBe(true)
	})

	it('never reports completed while a required step is unmet (stale flag guard)', async () => {
		axios.get.mockResolvedValue({ data: { version: 1, completed: true, steps: { region: { done: false }, seed: { done: true } } } })
		const s = useSetupStatus('procest', manifest)
		await s.refresh()
		expect(s.completed.value).toBe(false)
	})

	it('falls back to nothing-done on fetch error without throwing', async () => {
		axios.get.mockRejectedValue(new Error('boom'))
		const s = useSetupStatus('procest', manifest)
		await s.refresh()
		expect(s.error.value).toBeTruthy()
		expect(s.requiredUnmet.value.map((x) => x.id)).toEqual(['region'])
	})

	it('does not count presentational steps as unmet setup work', async () => {
		// `info` / `summary` steps are wizard chrome — they carry no work, so the
		// server never reports a `done` flag for them. Counting them as unmet kept
		// `optionalUnmet` permanently non-empty, which made CnAppRoot's non-gating
		// setup wizard auto-open over the app on every fresh browser profile.
		const chromeManifest = {
			setup: {
				enabled: true,
				version: 1,
				steps: [
					{ id: 'welcome', type: 'info' },
					{ id: 'seed', type: 'run-action', required: true },
					{ id: 'store', type: 'config-fields' },
					{ id: 'done', type: 'summary' },
				],
			},
		}
		// Exactly the shape OpenBuild's /api/setup/status returns: only the two
		// actionable steps are reported, and both are done.
		axios.get.mockResolvedValue({ data: { version: 1, completed: true, steps: { seed: { done: true }, store: { done: true } } } })
		const s = useSetupStatus('openbuild', chromeManifest)
		await s.refresh()
		expect(s.requiredUnmet.value.map((x) => x.id)).toEqual([])
		expect(s.optionalUnmet.value.map((x) => x.id)).toEqual([])
		expect(s.completed.value).toBe(true)
	})

	it('is disabled (and trivially complete) when the manifest declares no setup', () => {
		const s = useSetupStatus('plainapp', {})
		expect(s.enabled).toBe(false)
		expect(s.completed.value).toBe(true)
		expect(axios.get).not.toHaveBeenCalled()
	})
})
