/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Proof for the shared e2e base-URL resolver.
 *
 * The behaviour under test is mostly an ABSENCE — the resolver must never
 * invent a target — so the assertions that matter are the negative ones: no
 * fallback, and a throw loud enough that nobody mistakes it for a config
 * problem in their own repo. Three apps wrote this and two got it wrong in
 * opposite directions (one read only PLAYWRIGHT_BASE_URL and was dead in CI,
 * one fell back to localhost:8080 and wrote fixtures into the shared dev
 * container), so both directions are pinned here.
 */

import {
	BASE_URL_ENV_VARS,
	resolveBaseUrl,
	absoluteUrl,
	baseUrlParts,
} from '../../testing/playwright.js'

describe('resolveBaseUrl', () => {
	it('accepts PLAYWRIGHT_BASE_URL', () => {
		expect(resolveBaseUrl({ env: { PLAYWRIGHT_BASE_URL: 'http://localhost:8097' } }))
			.toBe('http://localhost:8097')
	})

	it('accepts BASE_URL, which is what CI exports', () => {
		// openconnector#1115: reading only PLAYWRIGHT_BASE_URL made the shared
		// quality workflow's E2E job fail on every run.
		expect(resolveBaseUrl({ env: { BASE_URL: 'http://nc:80' } })).toBe('http://nc:80')
	})

	it('prefers PLAYWRIGHT_BASE_URL when both are set', () => {
		expect(resolveBaseUrl({
			env: { PLAYWRIGHT_BASE_URL: 'http://mine:8097', BASE_URL: 'http://ci:80' },
		})).toBe('http://mine:8097')
	})

	it('strips trailing slashes so joins never double up', () => {
		expect(resolveBaseUrl({ env: { BASE_URL: 'http://nc:80///' } })).toBe('http://nc:80')
	})

	it('trims surrounding whitespace', () => {
		expect(resolveBaseUrl({ env: { BASE_URL: '  http://nc:80  ' } })).toBe('http://nc:80')
	})

	it('treats an empty or whitespace-only value as unset', () => {
		expect(() => resolveBaseUrl({ env: { PLAYWRIGHT_BASE_URL: '   ', BASE_URL: '' } }))
			.toThrow(/Neither/)
	})

	it('NEVER falls back to localhost:8080 — the shared dev container', () => {
		// This is the whole point of the module. A silent default here is how a
		// suite ends up creating fixtures in an environment other sessions are
		// using, and firing failed logins (hence brute-force lockouts on `admin`)
		// into somebody else's instance.
		let returned = 'sentinel — resolveBaseUrl must not reach this'
		let thrown = null
		try {
			returned = resolveBaseUrl({ env: {} })
		} catch (error) {
			thrown = error
		}
		expect(thrown).toBeInstanceOf(Error)
		// Assert on the RETURN, not on the message: the message deliberately
		// mentions localhost:8080 to explain what it refuses to do, so a
		// substring check on the text would fail for the wrong reason.
		expect(returned).toBe('sentinel — resolveBaseUrl must not reach this')
	})

	it('throws a message that names both variables and how to set one', () => {
		expect(() => resolveBaseUrl({ env: {} }))
			.toThrow(/PLAYWRIGHT_BASE_URL[\s\S]*BASE_URL[\s\S]*npm run test:e2e/)
	})

	it('exposes the accepted variable names, in precedence order', () => {
		expect(BASE_URL_ENV_VARS).toEqual(['PLAYWRIGHT_BASE_URL', 'BASE_URL'])
	})

	it('does not throw at IMPORT time', () => {
		// The app-local originals threw at module scope. In a shared library that
		// would make `require('@conduction/nextcloud-vue/testing/playwright')`
		// fatal in every process with no e2e environment — unit runs, lint,
		// docs builds — for helpers that have nothing to do with a base URL.
		// Reaching this line at all is the assertion; the import is at the top.
		expect(typeof resolveBaseUrl).toBe('function')
	})
})

describe('absoluteUrl', () => {
	const env = { BASE_URL: 'http://nc:8097' }

	it('joins a leading-slash path', () => {
		expect(absoluteUrl('/status.php', { env })).toBe('http://nc:8097/status.php')
	})

	it('joins a path without a leading slash', () => {
		expect(absoluteUrl('status.php', { env })).toBe('http://nc:8097/status.php')
	})

	it('propagates the throw when nothing is set', () => {
		expect(() => absoluteUrl('/status.php', { env: {} })).toThrow(/Neither/)
	})
})

describe('baseUrlParts', () => {
	it('splits host and port for Node http options', () => {
		expect(baseUrlParts({ env: { BASE_URL: 'http://nc:8097' } }))
			.toEqual({ protocol: 'http:', hostname: 'nc', port: 8097 })
	})

	it('defaults the port from the protocol when the URL omits it', () => {
		expect(baseUrlParts({ env: { BASE_URL: 'https://cloud.example.org' } }))
			.toEqual({ protocol: 'https:', hostname: 'cloud.example.org', port: 443 })
		expect(baseUrlParts({ env: { BASE_URL: 'http://cloud.example.org' } }))
			.toEqual({ protocol: 'http:', hostname: 'cloud.example.org', port: 80 })
	})
})
