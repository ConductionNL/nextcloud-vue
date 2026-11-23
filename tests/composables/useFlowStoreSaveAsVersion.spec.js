/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A flow page that saves edits as the next version (board DqFlow: "version 4 ·
 * changes apply to new cases"): the published flow stays editable, and Save
 * drafts it, puts the edited graph on the draft and publishes it.
 *
 * @spec openspec/changes/flow-board-save-as-version/specs/flow-board/spec.md#requirement-a-flow-page-can-save-edits-as-the-next-version
 */
import axios from '@nextcloud/axios'
import { createPinia, setActivePinia } from 'pinia'
import { useFlowStore } from '../../src/composables/useFlowStore.js'

jest.mock('@nextcloud/axios', () => ({
	__esModule: true,
	default: {
		get: jest.fn(() => Promise.resolve({ data: { results: [] } })),
		post: jest.fn(() => Promise.resolve({ data: { version: 5 } })),
		put: jest.fn((url, body) => Promise.resolve({ data: { id: body.id } })),
		delete: jest.fn(),
	},
}))
jest.mock('@nextcloud/router', () => ({ generateUrl: (u) => u }))

const PUBLISHED = { id: 'f1', name: 'Omgevingsvergunning regulier', app: 'dossiq', version: 4, lifecycleStatus: 'published', nodes: [{ id: 'a', type: 'dossiq.setStatus' }], edges: [] }

/**
 * @param {boolean} savesAsVersion The page option.
 * @return {object} The store over a published flow; transitions reload the stored copy as the server would.
 */
function storeOver(savesAsVersion) {
	setActivePinia(createPinia())
	const store = useFlowStore()
	store.flow = JSON.parse(JSON.stringify(PUBLISHED))
	store.savesAsVersion = savesAsVersion
	jest.spyOn(store, 'load').mockResolvedValue(undefined)
	jest.spyOn(store, 'loadVersions').mockResolvedValue([])
	jest.spyOn(store, 'open').mockImplementation(function() {
		const action = axios.post.mock.calls[axios.post.mock.calls.length - 1][0]
		this.flow = { ...JSON.parse(JSON.stringify(PUBLISHED)), lifecycleStatus: action.endsWith('/draft') ? 'draft' : 'published', version: action.endsWith('/publish') ? 5 : 4 }
	})
	return store
}

beforeEach(() => jest.clearAllMocks())

describe('saving a published flow as the next version', () => {
	it('keeps a published flow locked unless the page saves as version', () => {
		expect(storeOver(false).graphLocked).toBe(true)
		expect(storeOver(true).graphLocked).toBe(false)
	})

	it('keeps a retired flow locked either way', () => {
		const store = storeOver(true)
		store.flow.lifecycleStatus = 'deprecated'
		expect(store.graphLocked).toBe(true)
	})

	it('drafts, writes the edited graph onto the draft, then publishes', async () => {
		const store = storeOver(true)
		store.flow.nodes.push({ id: 'b', type: 'dossiq.askPerson', name: 'Volledigheid toetsen' })
		const saved = await store.save()
		expect(saved).toEqual({ id: 'f1' })
		expect(axios.post.mock.calls.map(([url]) => url)).toEqual(['/apps/openregister/api/flows/f1/draft', '/apps/openregister/api/flows/f1/publish'])
		expect(axios.put).toHaveBeenCalledTimes(1)
		expect(axios.put.mock.calls[0][1].nodes.map((n) => n.id)).toEqual(['a', 'b'])
		expect(axios.put.mock.invocationCallOrder[0]).toBeGreaterThan(axios.post.mock.invocationCallOrder[0])
		expect(axios.put.mock.invocationCallOrder[0]).toBeLessThan(axios.post.mock.invocationCallOrder[1])
	})

	it('writes the head only, without drafting or publishing, on an ordinary page', async () => {
		const store = storeOver(false)
		store.flow.lifecycleStatus = 'draft'
		await store.save()
		expect(axios.post).not.toHaveBeenCalled()
		expect(axios.put).toHaveBeenCalledTimes(1)
	})
})
