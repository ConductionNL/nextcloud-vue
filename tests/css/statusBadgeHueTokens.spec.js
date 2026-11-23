/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A status tone reads the theme's NL Design System hue tint and pill text
 * first, and falls back to its current colour. jsdom draws no layout, so the
 * rules are read from the stylesheet text.
 *
 * @spec openspec/changes/status-badge-hue-tokens/specs/status-badge/spec.md#requirement-a-status-tone-reads-the-theme-s-hue-tint-and-pill-text
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/badge.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The body of the one rule with exactly this selector.
 *
 * @param {string} selector The selector.
 * @return {string} The body.
 */
function bodyOf(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let m
	while ((m = re.exec(css))) {
		if (m[1].trim() === selector) {
			return m[2]
		}
	}
	return ''
}

describe('status tones read the hue tokens', () => {
	it.each([
		['success', 'green', 'var(--color-success-text, var(--color-success))'],
		['warning', 'orange', 'var(--color-warning-text, var(--color-warning))'],
		['error', 'red', 'var(--color-error-text, var(--color-error))'],
		['info', 'blue', 'var(--color-info-text, var(--color-info, #0082c9))'],
	])('the %s tone reads the %s tint and text, then its role colour', (variant, hue, ink) => {
		const body = bodyOf(`.cn-status-badge--${variant}`)
		expect(body).toContain(`--cn-status-badge-ink: var(--nl-color-${hue}-text, ${ink});`)
		expect(body).toContain(`background-color: var(--nl-color-${hue}-light, `)
	})

	it('defaults the purple and teal tones to the hue tokens, then the board values', () => {
		const root = bodyOf(':root')
		expect(root).toContain('--cn-status-purple-bg: var(--nl-color-purple-light, #e8e6f6);')
		expect(root).toContain('--cn-status-purple-text: var(--nl-color-purple-text, #4a3f8f);')
		expect(root).toContain('--cn-status-teal-bg: var(--nl-color-teal-light, #e3f1f3);')
		expect(root).toContain('--cn-status-teal-text: var(--nl-color-teal-text, #1d5e66);')
	})
})
