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
		// Exactly the shape Buildiq's /api/setup/status returns: only the two
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

	// A 403 is the server ANSWERING, not failing: setup endpoints are admin-only.
	// Treating it as "nothing done" put every non-admin in front of a wizard they
	// could not complete, instead of the app. Measured on openbuild, where
	// /api/setup/status returns 200 {completed:true} to an admin and 403 to
	// everyone else.
	it.each([401, 403])('reports completed when the server answers %i — setup is admin-only', async (statusCode) => {
		const err = new Error('forbidden')
		err.response = { status: statusCode }
		axios.get.mockRejectedValue(err)

		const s = useSetupStatus('openbuild', manifest)
		await s.refresh()

		expect(s.forbidden.value).toBe(true)
		expect(s.completed.value).toBe(true)
		// BOTH lists must be empty, and this is the assertion that matters:
		// CnAppRoot gates the blocking wizard on `requiredUnmet.length > 0` and
		// the auto-open on `optionalUnmet.length > 0`. It never reads
		// `completed`, so short-circuiting only `completed` left the wizard
		// showing — verified live before this was added.
		expect(s.requiredUnmet.value).toEqual([])
		expect(s.optionalUnmet.value).toEqual([])
	})

	it('keeps a non-auth error unknown so an admin can still reach the wizard', async () => {
		const err = new Error('server exploded')
		err.response = { status: 500 }
		axios.get.mockRejectedValue(err)

		const s = useSetupStatus('procest', manifest)
		await s.refresh()

		expect(s.forbidden.value).toBe(false)
		expect(s.completed.value).toBe(false)
		// An admin hitting a 500 must still be shown the wizard.
		expect(s.requiredUnmet.value.map((x) => x.id)).toEqual(['region'])
	})

	it('clears a previous forbidden verdict once a later fetch succeeds', async () => {
		const err = new Error('forbidden')
		err.response = { status: 403 }
		axios.get.mockRejectedValue(err)

		const s = useSetupStatus('procest', manifest)
		await s.refresh()
		expect(s.completed.value).toBe(true)

		// Same page, caller gains admin (or the grant lands): the real status
		// must win again rather than the stale "not your concern" verdict.
		axios.get.mockReset()
		axios.get.mockResolvedValue({ data: { version: 1, completed: false, steps: { region: { done: false } } } })
		await s.refresh()

		expect(s.forbidden.value).toBe(false)
		expect(s.completed.value).toBe(false)
		// The unmet lists must come back too, or the wizard would stay hidden
		// from someone who now genuinely needs it.
		expect(s.requiredUnmet.value.map((x) => x.id)).toEqual(['region'])
	})
})
