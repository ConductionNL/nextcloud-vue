/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnAppRoot shows the app's localised name, not its id, in the user settings
 * dialog, the setup wizard and the credentials section (dossiq read
 * "dossiq"), while NcContent keeps the name that keys the stored list-pane
 * width (`pane-list-size-<appName>`).
 *
 * @spec openspec/changes/app-shown-name-in-chrome/specs/app-root/spec.md#requirement-the-app-chrome-shows-the-apps-localised-name
 */
var mockApps = []

jest.mock('@nextcloud/initial-state', () => ({
	__esModule: true,
	loadState: (app, key, fallback) => (app === 'core' && key === 'apps' ? mockApps : fallback),
}))
jest.mock('@nextcloud/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() } }))

const fs = require('fs')
const path = require('path')
const CnAppRoot = require('../../src/components/CnAppRoot/CnAppRoot.vue').default

const SOURCE = fs.readFileSync(path.join(__dirname, '../../src/components/CnAppRoot/CnAppRoot.vue'), 'utf8')

/**
 * Evaluate a CnAppRoot computed against a minimal component context.
 *
 * @param {string} name The computed's name.
 * @param {object} ctx The context.
 * @return {unknown} Its value.
 */
function computed(name, ctx) {
	const def = CnAppRoot.computed[name]
	return (typeof def === 'function' ? def : def.get).call(ctx)
}

/**
 * A context for shownAppName.
 *
 * @param {object} extra Overrides.
 * @return {object} The context.
 */
function ctxOf(extra = {}) {
	return { appId: 'dossiq', appDisplayName: '', manifest: {}, translate: (key) => key, ...extra }
}

describe('CnAppRoot shownAppName', () => {
	beforeEach(() => {
		mockApps = [{ id: 'dossiq', name: 'Zaken' }]
	})

	it('reads Nextcloud\'s localised app menu name when the app gives none', () => {
		expect(computed('shownAppName', ctxOf())).toBe('Zaken')
	})

	it('falls back to the id with a capital, never the bare id', () => {
		mockApps = []
		expect(computed('shownAppName', ctxOf())).toBe('Dossiq')
	})

	it('translates a given display name or manifest name', () => {
		const nl = { 'Case handling': 'Zaakafhandeling' }
		expect(computed('shownAppName', ctxOf({ appDisplayName: 'Case handling', translate: (k) => nl[k] ?? k }))).toBe('Zaakafhandeling')
		expect(computed('shownAppName', ctxOf({ manifest: { name: 'Case handling' }, translate: (k) => nl[k] ?? k }))).toBe('Zaakafhandeling')
	})

	it('hands the shown name to the board user settings dialog', () => {
		const ctx = { ...ctxOf(), resolvedLook: 'board', userSettingsOpen: true, resolvedUserSettingsTitle: 'Instellingen', shownAppName: 'Zaken' }
		expect(computed('userSettingsDialogProps', ctx).appName).toBe('Zaken')
	})

	it('leaves the NcContent appName, the pane width key, as it was', () => {
		expect(SOURCE).toMatch(/<NcContent\s+:appName="appDisplayName \|\| \(manifest && manifest\.name\) \|\| appId"/)
	})

	it('shows the shown name in the setup wizard and the credentials section', () => {
		expect((SOURCE.match(/:appName="shownAppName"/g) || []).length).toBe(3)
	})
})
