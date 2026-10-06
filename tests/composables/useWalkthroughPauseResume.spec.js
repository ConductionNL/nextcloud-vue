/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Pause, resume and progress for the walkthrough (pipelinq review C1, C3, C4).
 */
import {
	__resetWalkthroughCacheForTests,
	loadWalkthroughProgress,
	normaliseWalkthroughProgress,
	persistWalkthroughProgress,
	readLocalWalkthroughProgress,
	useWalkthrough,
	WALKTHROUGH_PROGRESS_STORAGE_PREFIX,
} from '@/composables/useWalkthrough.js'

function makeStorage() {
	const store = new Map()
	return {
		getItem: (k) => (store.has(k) ? store.get(k) : null),
		setItem: (k, v) => store.set(k, String(v)),
		removeItem: (k) => store.delete(k),
		_store: store,
	}
}

const manifest = {
	version: '1.2.0',
	walkthrough: {
		enabled: true,
		completionConfigKey: 'walkthrough_seen_version',
		tours: [{
			id: 'getting-started',
			trigger: 'first-visit',
			steps: [
				{ id: 'welcome', target: { kind: 'page', ref: 'Dashboard' }, advanceOn: { type: 'manual' } },
				{ id: 'create-product', target: { kind: 'element', ref: 'index-add' }, advanceOn: { type: 'object-created', register: 'pipelinq', schema: 'product', capture: { productId: ':id' } } },
				{ id: 'go-contacts', target: { kind: 'nav-item', ref: 'Contacts' }, advanceOn: { type: 'route-match', route: 'Contacts' } },
			],
		}],
	},
}

beforeEach(() => __resetWalkthroughCacheForTests())

describe('useWalkthrough: object-created advance', () => {
	it('advances on the slugs the creating surface sends, even when @self holds numeric ids', () => {
		const wt = useWalkthrough('pq-a', manifest)
		wt.start('getting-started', 1)
		const advanced = wt.notify({
			kind: 'object-created',
			register: 'pipelinq',
			schema: 'product',
			object: { id: 'p-1', '@self': { register: 12, schema: 85 } },
		})
		expect(advanced).toBe(true)
		expect(wt.currentStep.value.id).toBe('go-contacts')
		expect(wt.context.value.productId).toBe('p-1')
	})

	it('does not advance on another schema', () => {
		const wt = useWalkthrough('pq-b', manifest)
		wt.start('getting-started', 1)
		expect(wt.notify({ kind: 'object-created', register: 'pipelinq', schema: 'client', object: { id: 'c-1' } })).toBe(false)
		expect(wt.currentStep.value.id).toBe('create-product')
	})
})

describe('useWalkthrough: pause', () => {
	it('hides the tour and keeps its step', () => {
		const wt = useWalkthrough('pq-c', manifest)
		wt.start('getting-started', 1)
		wt.pause()
		expect(wt.running.value).toBe(false)
		expect(wt.paused.value).toBe(true)
		expect(wt.resumePaused()).toBe(true)
		expect(wt.running.value).toBe(true)
		expect(wt.currentStep.value.id).toBe('create-product')
	})

	it('does not call onComplete when paused', () => {
		const onComplete = jest.fn()
		const wt = useWalkthrough('pq-d', manifest, { onComplete })
		wt.start('getting-started')
		wt.pause()
		expect(onComplete).not.toHaveBeenCalled()
	})

	it('resumeAt starts at a remembered step, and at the first when the step is gone', () => {
		const wt = useWalkthrough('pq-e', manifest, { seenVersion: '1.2.0' })
		expect(wt.resumeAt('getting-started', 'go-contacts')).toBe(true)
		expect(wt.currentStep.value.id).toBe('go-contacts')
		wt.resumeAt('getting-started', 'removed-step')
		expect(wt.currentStep.value.id).toBe('welcome')
		expect(wt.resumeAt('nope', 'x')).toBe(false)
	})

	it('starts at the resume token step', () => {
		const wt = useWalkthrough('pq-f', manifest, { resume: { tourId: 'getting-started', stepId: 'create-product' } })
		expect(wt.running.value).toBe(true)
		expect(wt.currentStep.value.id).toBe('create-product')
	})
})

describe('walkthrough progress persistence', () => {
	it('normalises objects and JSON strings, rejects junk', () => {
		const p = { tourId: 't', stepId: 's', index: 2, version: '1.0.0' }
		expect(normaliseWalkthroughProgress(p)).toEqual(p)
		expect(normaliseWalkthroughProgress(JSON.stringify(p))).toEqual(p)
		expect(normaliseWalkthroughProgress('')).toBeNull()
		expect(normaliseWalkthroughProgress('<html>')).toBeNull()
		expect(normaliseWalkthroughProgress({ stepId: 's' })).toBeNull()
	})

	it('writes the local mirror and PUTs the progress preference next to the completion key', async () => {
		const storage = makeStorage()
		const http = { put: jest.fn().mockResolvedValue({}) }
		const p = { tourId: 'getting-started', stepId: 'create-product', index: 1, version: '1.2.0' }
		await expect(persistWalkthroughProgress('pq', 'walkthrough_seen_version', p, { storage, http })).resolves.toBe(true)
		expect(JSON.parse(storage.getItem(WALKTHROUGH_PROGRESS_STORAGE_PREFIX + 'pq'))).toEqual(p)
		const [url, body] = http.put.mock.calls[0]
		expect(url).toContain('/apps/pq/api/preferences/walkthrough_seen_version-progress')
		expect(JSON.parse(body.value)).toEqual(p)
		expect(readLocalWalkthroughProgress('pq', storage)).toEqual(p)
	})

	it('clears both with null', async () => {
		const storage = makeStorage()
		storage.setItem(WALKTHROUGH_PROGRESS_STORAGE_PREFIX + 'pq', '{"tourId":"t"}')
		const http = { put: jest.fn().mockResolvedValue({}) }
		await persistWalkthroughProgress('pq', 'k', null, { storage, http })
		expect(storage.getItem(WALKTHROUGH_PROGRESS_STORAGE_PREFIX + 'pq')).toBeNull()
		expect(http.put.mock.calls[0][1]).toEqual({ value: '' })
	})

	it('loads the server preference, falling back to the local mirror', async () => {
		const storage = makeStorage()
		const p = { tourId: 'getting-started', stepId: 'go-contacts', index: 2, version: '1.2.0' }
		const http = { get: jest.fn().mockResolvedValue({ data: { value: JSON.stringify(p) } }) }
		await expect(loadWalkthroughProgress('pq', 'k', { storage, http })).resolves.toEqual(p)
		storage.setItem(WALKTHROUGH_PROGRESS_STORAGE_PREFIX + 'pq', JSON.stringify(p))
		const failing = { get: jest.fn().mockRejectedValue(new Error('down')) }
		await expect(loadWalkthroughProgress('pq', 'k', { storage, http: failing })).resolves.toEqual(p)
	})
})
