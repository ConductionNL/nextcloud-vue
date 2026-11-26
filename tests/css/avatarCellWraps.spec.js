/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * In a wrapping column the avatar widget's name and secondary line wrap too
 * (DqContacten: "Oosthavenweg 12, Zuid..." under a resident's name). Read from
 * the stylesheet.
 *
 * @spec openspec/changes/avatar-cell-wraps/specs/data-table/spec.md#requirement-an-avatar-cell-in-a-wrapping-column-wraps-its-name-and-secondary-line
 */
const fs = require('fs')
const path = require('path')

const css = fs.readFileSync(path.join(__dirname, '../../src/css/table.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * The declarations of every rule whose selector list holds the selector.
 *
 * @param {string} selector The selector to look for.
 * @return {string} The bodies, joined.
 */
function bodiesFor(selector) {
	const re = /([^{}]+)\{([^{}]*)\}/g
	let body = ''
	let m
	while ((m = re.exec(css))) {
		if (m[1].split(',').map((s) => s.trim()).includes(selector)) {
			body += m[2]
		}
	}
	return body
}

describe('table.css: an avatar cell in a wrapping column', () => {
	it.each([
		'.cn-data-table td.cn-cell--wrap .cn-cell-renderer__avatar-name',
		'.cn-data-table td.cn-cell--wrap .cn-cell-renderer__avatar-secondary',
	])('lets %s wrap', (selector) => {
		const body = bodiesFor(selector)
		expect(body).toMatch(/white-space:\s*normal/)
		expect(body).toMatch(/text-overflow:\s*clip/)
	})
})
