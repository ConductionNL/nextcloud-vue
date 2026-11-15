/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A page offers the actions OpenRegister lists for an object
 * (object-actions-declared-and-run 5.2): the list, the run, a header entry per
 * listed action, an inputs dialog, a disabled action with its reason.
 *
 * @spec openspec/changes/object-actions/specs/object-actions/spec.md
 */
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }))
jest.mock('@nextcloud/router', () => ({ __esModule: true, generateUrl: (p) => `/index.php${p}` }))
jest.mock('@nextcloud/dialogs', () => ({ __esModule: true, showSuccess: jest.fn(), showError: jest.fn() }))
jest.mock('@nextcloud/event-bus', () => ({ emit: jest.fn(), subscribe: jest.fn(), unsubscribe: jest.fn() }))

import axios from '@nextcloud/axios'
import { showError, showSuccess } from '@nextcloud/dialogs'
import { emit } from '@nextcloud/event-bus'
import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import CnActionButtons from '../../src/components/CnActionButtons/CnActionButtons.vue'
import { actionLabelText, fetchObjectActions, fetchSelectionActions, runObjectAction, runSelectionAction } from '../../src/composables/useObjectActions.js'
import { dispatchAction } from '../../src/utils/actionsDispatcher.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

const ADDRESS = { register: 'decidiq', schema: 'decision', id: 'd1' }
const PUBLISH = { key: 'publish', kind: 'steps', label: { nl: 'Publiceren', en: 'Publish' }, surfaces: ['header', 'row'], available: true, inputs: { type: 'object', required: ['from'], properties: { from: { type: 'string', format: 'date', title: 'Public from' } } }, mode: 'sync' }

beforeEach(() => {
	axios.get.mockReset()
	axios.post.mockReset()
	showSuccess.mockReset()
	showError.mockReset()
	emit.mockReset()
})

describe('useObjectActions', () => {
	it('reads the list and runs one, telling a queued run from a finished one', async () => {
		axios.get.mockResolvedValue({ data: { actions: [PUBLISH, { kind: 'flow' }] } })
		expect((await fetchObjectActions(ADDRESS)).map((a) => a.key)).toEqual(['publish'])
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/decidiq/decision/d1/actions')
		axios.post.mockResolvedValueOnce({ status: 202, data: { run: 'r1', status: 'queued' } })
		expect(await runObjectAction(ADDRESS, 'publish', { from: '2026-12-01' })).toEqual({ ok: true, queued: true, data: { run: 'r1', status: 'queued' } })
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/decidiq/decision/d1/actions/publish', { inputs: { from: '2026-12-01' } })
		axios.post.mockRejectedValueOnce({ response: { data: { message: 'Only a decided decision can be published.' } } })
		expect(await runObjectAction(ADDRESS, 'publish')).toEqual({ ok: false, queued: false, message: 'Only a decided decision can be published.' })
		axios.get.mockRejectedValueOnce(new Error('404'))
		expect(await fetchObjectActions(ADDRESS)).toEqual([])
	})

	it('reads a label in the reader\'s language', () => {
		expect(actionLabelText(PUBLISH.label, 'nl')).toBe('Publiceren')
		expect(actionLabelText(PUBLISH.label, 'de')).toBe('Publish')
		expect(actionLabelText('Claim', 'nl')).toBe('Claim')
	})
})

describe('dispatchAction object-action', () => {
	it('runs the action on the page object with its inputs, toasts and refreshes', async () => {
		axios.post.mockResolvedValue({ status: 200, data: { outcome: 'completed' } })
		const result = await dispatchAction({ type: 'object-action', action: 'claim', inputs: { by: '@objectId' } }, { tokenCtx: { register: 'dossiq', schema: 'case', objectId: 'c1' } })
		expect(result.ok).toBe(true)
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/dossiq/case/c1/actions/claim', { inputs: { by: 'c1' } })
		expect(showSuccess).toHaveBeenCalled()
		expect(emit).toHaveBeenCalledWith('cn:page:refresh', {})
	})

	it('shows the server\'s refusal', async () => {
		axios.post.mockRejectedValue({ response: { data: { message: 'Not now.' } } })
		await dispatchAction({ type: 'object-action', action: 'claim' }, { tokenCtx: { register: 'dossiq', schema: 'case', objectId: 'c1' } })
		expect(showError).toHaveBeenCalledWith('Not now.')
	})
})

describe('CnActionButtons with object actions', () => {
	const mountButtons = (actions) => mount(CnActionButtons, {
		propsData: { actions },
		provide: { cnObjectContext: ref({ objectId: 'd1', register: 'decidiq', schema: 'decision', object: { id: 'd1' } }) },
		mocks: { $router: { push: jest.fn() } },
	})

	it('opens a dialog over the inputs and runs with what was typed', async () => {
		axios.post.mockResolvedValue({ status: 200, data: {} })
		const w = mountButtons([{ id: 'or-action-publish', type: 'object-action', action: 'publish', label: 'Publish', inputsSchema: PUBLISH.inputs }])
		await flushPromises()
		await w.vm.runAction(w.vm.actions[0])
		expect(w.vm.objectActionEntry).not.toBeNull()
		await w.vm.onObjectActionConfirm({ from: '2026-12-01' })
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/openregister/api/objects/decidiq/decision/d1/actions/publish', { inputs: { from: '2026-12-01' } })
		expect(w.vm.objectActionEntry).toBeNull()
	})

	it('disables an action OpenRegister lists as not available, with the reason', async () => {
		const w = mountButtons([{ id: 'or-action-publish', type: 'object-action', action: 'publish', label: 'Publish', available: false, disabledReason: 'Only a decided decision can be published.' }])
		await flushPromises()
		expect(w.vm.isDisabled(w.vm.actions[0])).toBe(true)
		expect(w.vm.disabledReason(w.vm.actions[0])).toBe('Only a decided decision can be published.')
	})
})

describe('the manifest', () => {
	it('accepts an object-action and actionsFrom on a detail page', () => {
		const manifest = { $schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json', version: '1.0.0', menu: [], pages: [{ id: 'Decision', route: '/decisions/:id', type: 'detail', title: 'Decision', config: { register: 'decidiq', schema: 'decision', actionsFrom: 'openregister', actionsInclude: ['publish'], headerActions: [{ id: 'claim', label: 'Claim', type: 'object-action', action: 'claim' }] } }] }
		expect(validateManifestV2(manifest).errors).toEqual([])
	})
})

describe('selection actions', () => {
	it('lists the schema actions and drops entries without a key', async () => {
		axios.get.mockResolvedValueOnce({ data: { actions: [{ key: 'close', surfaces: ['bulk'] }, { label: 'x' }] } })
		expect(await fetchSelectionActions({ register: 'decidiq', schema: 'decision' })).toEqual([{ key: 'close', surfaces: ['bulk'] }])
		expect(axios.get).toHaveBeenCalledWith('/index.php/apps/openregister/api/object-actions/decidiq/decision')
		axios.get.mockRejectedValueOnce(new Error('404'))
		expect(await fetchSelectionActions({ register: 'decidiq', schema: 'decision' })).toEqual([])
		expect(await fetchSelectionActions({ register: 'decidiq' })).toEqual([])
	})

	it('posts the ids and inputs, and reads a 202 as queued', async () => {
		axios.post.mockResolvedValueOnce({ status: 202, data: { job: 'j1' } })
		expect(await runSelectionAction({ register: 'decidiq', schema: 'decision' }, 'close', ['a', 'b'], { note: 'n' })).toEqual({ ok: true, queued: true, data: { job: 'j1' } })
		expect(axios.post).toHaveBeenCalledWith('/index.php/apps/openregister/api/object-actions/decidiq/decision/close', { ids: ['a', 'b'], inputs: { note: 'n' } })
		axios.post.mockRejectedValueOnce({ response: { data: { message: 'Not allowed.' } } })
		expect(await runSelectionAction({ register: 'decidiq', schema: 'decision' }, 'close', ['a'])).toEqual({ ok: false, queued: false, message: 'Not allowed.' })
	})
})
