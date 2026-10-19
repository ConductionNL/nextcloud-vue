/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The kanban view mode in the v2 manifest (2.132.0): `kanban` is the key,
 * and `board`, the name released manifests carry, is still accepted as a
 * deprecated alias.
 */
const fs = require('fs')
const path = require('path')
const { validateManifestV2 } = require('../../src/utils/validateManifest.js')

const SCHEMA = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/schemas/app-manifest-v2.schema.json'), 'utf8'))

const MINIMAL_V2 = { $schema: SCHEMA.$id, version: '2.0.0', menu: [], pages: [] }

/**
 * @param {object} page   Extra page keys.
 * @param {object} config Extra config keys.
 * @return {object} A manifest with one index page.
 */
function index(page = {}, config = {}) {
	return {
		...MINIMAL_V2,
		pages: [{ id: 'Cases', route: '/cases', type: 'index', title: 'Cases', ...page, config: { register: 'r', schema: 'case', ...config } }],
	}
}

/**
 * @param {object} page Extra page keys.
 * @return {object} A manifest with one detail page.
 */
function detail(page = {}) {
	return {
		...MINIMAL_V2,
		pages: [{ id: 'Case', route: '/cases/:id', type: 'detail', title: 'Case', config: { register: 'r', schema: 'case' }, ...page }],
	}
}

describe('app-manifest-v2: the kanban view mode', () => {
	it('accepts config.kanban and pages[].kanban on an index page', () => {
		expect(validateManifestV2(index({}, { viewModes: ['table', 'kanban'], kanban: { statusField: 'status', columnLimit: 3 } })).valid).toBe(true)
		expect(validateManifestV2(index({ kanban: { statusField: 'status' } })).valid).toBe(true)
	})

	it('types config.kanban like the board it replaces', () => {
		expect(validateManifestV2(index({}, { kanban: { cardFields: ['title'] } })).valid).toBe(false)
		expect(validateManifestV2(index({}, { kanban: { statusField: 'status', wat: true } })).valid).toBe(false)
	})

	it('refuses a kanban on a detail page', () => {
		expect(validateManifestV2(detail({ kanban: { statusField: 'status' } })).valid).toBe(false)
	})

	it('accepts kanban in viewSwitch and as a viewSwitchLinks key', () => {
		expect(validateManifestV2(index({}, { viewSwitch: ['table', 'cards', 'kanban', 'map'] })).valid).toBe(true)
		expect(validateManifestV2(index({}, { viewSwitchLinks: { kanban: { route: 'CaseBoard' } } })).valid).toBe(true)
		expect(validateManifestV2(index({}, { viewSwitchLinks: { kanban: {} } })).valid).toBe(false)
	})
})

describe('app-manifest-v2: board, the deprecated alias of kanban', () => {
	it('still accepts config.board and pages[].board on an index page', () => {
		expect(validateManifestV2(index({}, { viewModes: ['table', 'board'], board: { statusField: 'status' } })).valid).toBe(true)
		expect(validateManifestV2(index({ board: { statusField: 'status' } })).valid).toBe(true)
		expect(validateManifestV2(index({}, { board: { statusField: 'status', wat: true } })).valid).toBe(false)
	})

	it('still accepts board in viewSwitch and as a viewSwitchLinks key', () => {
		expect(validateManifestV2(index({}, { viewSwitch: ['table', 'cards', 'board', 'map'] })).valid).toBe(true)
		expect(validateManifestV2(index({}, { viewSwitchLinks: { board: { href: '/apps/x/board' } } })).valid).toBe(true)
	})

	it('marks every board key deprecated in the schema', () => {
		const text = JSON.stringify(SCHEMA)
		expect(SCHEMA.$defs.kanbanView).toBeDefined()
		expect(SCHEMA.$defs.boardView).toBeUndefined()
		const deprecatedBoards = text.match(/"board":\{[^{}]*"deprecated":true/g) || []
		expect(deprecatedBoards.length).toBe(3)
	})
})
