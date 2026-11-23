/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * `appVersionDefine()`: the settings footer shows the INSTALLED version.
 *
 * THE BUG: `@nextcloud/vue` prints `<app> <appVersion>` in the settings dialog
 * footer, and apps defined `appVersion` at build time. pipelinq read
 * "pipelinq 0.1.0" (package.json) and dossiq 0.4.48-beta read "dossiq
 * 0.4.47-unstable" (info.xml before the release bump). The define must be an
 * expression that reads the installed version in the browser.
 *
 * Each case evaluates the generated expression exactly as webpack would paste
 * it into a module, against a real jsdom document.
 *
 * @jest-environment jsdom
 * @spec openspec/changes/notification-rule-labels-and-runtime-version/specs/notification-preferences/spec.md
 */

const { appVersionDefine } = require('../../webpack/index.js')

/**
 * Put an initial-state input on the page the way Nextcloud renders one.
 *
 * @param {string} id The element id.
 * @param {*} value The state value.
 * @return {void}
 */
function provideState(id, value) {
	const input = document.createElement('input')
	input.type = 'hidden'
	input.id = id
	input.value = btoa(JSON.stringify(value))
	document.body.appendChild(input)
}

const evaluate = (expression) => new Function('return ' + expression)()

afterEach(() => {
	document.body.innerHTML = ''
})

describe('appVersionDefine', () => {
	it('reads the installed version from the app\'s initial state', () => {
		provideState('initial-state-dossiq-version', '0.4.48-beta.20261008003048')

		expect(evaluate(appVersionDefine('dossiq', '0.4.47-unstable.20261008200000'))).toBe('0.4.48-beta.20261008003048')
	})

	it('falls back to the build-time version when the page provides none, which is the control', () => {
		expect(evaluate(appVersionDefine('dossiq', '0.4.47-unstable'))).toBe('0.4.47-unstable')
	})

	it('reads only its own app\'s state', () => {
		provideState('initial-state-pipelinq-version', '0.5.13-beta')

		expect(evaluate(appVersionDefine('dossiq', '0.4.47'))).toBe('0.4.47')
	})

	it('survives a malformed state value', () => {
		const input = document.createElement('input')
		input.id = 'initial-state-dossiq-version'
		input.value = 'not base64 json'
		document.body.appendChild(input)

		expect(evaluate(appVersionDefine('dossiq', '0.4.47'))).toBe('0.4.47')
	})

	it('is a plain expression, not a quoted literal of the build version', () => {
		// The old defines were JSON.stringify(version): a literal the browser
		// can never correct. This is what makes the footer follow an upgrade.
		expect(appVersionDefine('dossiq', '1.0.0')).not.toBe(JSON.stringify('1.0.0'))
	})

	it('refuses an empty app id rather than reading the wrong state', () => {
		expect(() => appVersionDefine('')).toThrow(TypeError)
	})
})
