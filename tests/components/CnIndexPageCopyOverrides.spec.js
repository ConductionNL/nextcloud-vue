/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A copy can start with field values of its own (`copy.overrides`), as
 * stackiq's applications copy unpublished: through the copy endpoint and
 * through the fields-only copy alike, the new name winning on its field.
 *
 * @spec openspec/changes/index-copy-overrides/specs/index-copy-overrides/spec.md
 */
import { createSelfModeActions } from '../../src/components/CnIndexPage/selfModeActions.js'
import { cloneObjectForCopy, copyOverrideValues } from '../../src/components/CnIndexPage/selfModeIO.js'
import { validateManifestV2 } from '../../src/utils/validateManifest.js'

jest.mock('../../src/composables/useObjectCopy.js', () => {
	const actual = jest.requireActual('../../src/composables/useObjectCopy.js')
	return { ...actual, useObjectCopy: () => global.__copier }
})

const source = { id: 'A1', title: 'Zaaksysteem X', publicationDate: '2026-01-01', '@self': { id: 'A1' } }
const OVERRIDES = { publicationDate: null, depublicationDate: null, title: 'never' }

function makeCtx(overrides = OVERRIDES) {
	const store = { saveObject: jest.fn().mockResolvedValue({ id: 'A9' }), getError: jest.fn() }
	const setResults = { singleCopy: jest.fn(), massCopy: jest.fn() }
	const ctx = {
		isSelfFetchMode: () => true,
		selfObjectStore: () => store,
		selfObjectType: () => 'application',
		list: () => ({ refresh: jest.fn() }),
		register: () => 'stack',
		schema: () => 'application',
		effectiveObjects: () => [source],
		effectiveSchema: () => ({ slug: 'application' }),
		massActionNameField: () => 'title',
		copyOverrides: () => overrides,
		emit: jest.fn(),
		setResults,
	}
	return { ctx, store }
}

beforeEach(() => {
	global.__copier = { copy: jest.fn().mockResolvedValue({ object: { id: 'A8' }, links: [] }) }
})

describe('copy overrides', () => {
	it('sends the overrides to the copy endpoint, the new name winning', async () => {
		const { ctx } = makeCtx()
		await createSelfModeActions(ctx).handleSingleCopy({ id: 'A1', newName: 'X (kopie)', include: ['incoming'] })
		expect(global.__copier.copy.mock.calls[0][3]).toEqual({ publicationDate: null, depublicationDate: null, title: 'X (kopie)' })
	})

	it('writes them into the fields-only copy of one row and of many', async () => {
		const { ctx, store } = makeCtx()
		await createSelfModeActions(ctx).handleSingleCopy({ id: 'A1', newName: 'X (kopie)' })
		expect(store.saveObject.mock.calls[0][1]).toEqual({ title: 'X (kopie)', publicationDate: null, depublicationDate: null })
		await createSelfModeActions(ctx).handleMassCopy({ ids: ['A1'], getName: (item) => `${item.title} 2` })
		expect(store.saveObject.mock.calls[1][1]).toMatchObject({ title: 'Zaaksysteem X 2', publicationDate: null })
	})

	it('changes nothing without overrides', async () => {
		const { ctx, store } = makeCtx(null)
		await createSelfModeActions(ctx).handleSingleCopy({ id: 'A1', newName: 'X (kopie)' })
		expect(store.saveObject.mock.calls[0][1]).toEqual({ title: 'X (kopie)', publicationDate: '2026-01-01' })
		expect(copyOverrideValues(['x'])).toEqual({})
		expect(cloneObjectForCopy(source, 'Y', 'title')).toEqual({ title: 'Y', publicationDate: '2026-01-01' })
	})

	it('is accepted by the manifest schema', () => {
		const manifest = { $schema: 'https://raw.githubusercontent.com/ConductionNL/nextcloud-vue/main/src/schemas/app-manifest-v2.schema.json', version: '1.0.0', menu: [], pages: [{ id: 'Apps', route: '/apps', type: 'index', title: 'Apps', config: { register: 'r', schema: 's', copy: { include: ['incoming'], overrides: { publicationDate: null } } } }] }
		expect(validateManifestV2(manifest).errors).toEqual([])
	})
})
