/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * A `webpackIgnore` import must name something a browser can fetch.
 *
 * `webpackIgnore: true` does not mean "do not fail on this import". It means
 * "leave this import alone, the BROWSER will do it at runtime". A browser on a
 * Nextcloud page cannot resolve a module specifier, so the moment the marker
 * sits over a bare name or a `node_modules/...` path, the import becomes a
 * request for a file the server does not serve.
 *
 * That is what happened to `leaflet.markercluster` in CnMapWidget. Rollup
 * rewrote the bare specifier in the published ESM build to
 * `../../node_modules/leaflet.markercluster/dist/leaflet.markercluster-src.js`
 * and kept the marker, so every consuming app requested
 * `node_modules/leaflet.markercluster/dist/leaflet.markercluster-src.js` off
 * its own page URL and got a 404. Clustering never ran anywhere, and nothing
 * went red: the failure is caught and falls back to unclustered markers, which
 * is a map that looks fine.
 *
 * Same family as the other tests in this directory: a file this package ships
 * pointed at something the consumer does not have.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '../..')
const SRC = path.join(ROOT, 'src')

// The marker plus the specifier that follows it, in either quote style.
const IGNORED_IMPORT = /webpackIgnore:\s*true\s*\*\/\s*['"]([^'"]+)['"]/g

/**
 * Every file under src/, recursively.
 *
 * @param {string} dir Absolute directory to walk.
 * @return {string[]} Absolute file paths.
 */
function filesUnder(dir) {
	const out = []
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name)
		if (entry.isDirectory()) {
			out.push(...filesUnder(full))
		} else if (/\.(js|mjs|ts|vue)$/.test(entry.name)) {
			out.push(full)
		}
	}
	return out
}

/**
 * A specifier the browser can actually fetch: an absolute URL, a
 * protocol-relative URL, or a root-relative path.
 *
 * A relative path is NOT fetchable here, because it resolves against the
 * consuming page's URL rather than against the file that wrote it.
 *
 * @param {string} specifier The import specifier.
 * @return {boolean} Whether a browser can resolve it unaided.
 */
function isFetchableByTheBrowser(specifier) {
	return /^(https?:)?\/\//.test(specifier) || specifier.startsWith('/')
}

describe('webpackIgnore imports', () => {
	it('name a URL the browser can fetch, never a module specifier', () => {
		const offenders = []
		for (const file of filesUnder(SRC)) {
			const source = fs.readFileSync(file, 'utf8')
			for (const match of source.matchAll(IGNORED_IMPORT)) {
				if (!isFetchableByTheBrowser(match[1])) {
					offenders.push(`${path.relative(ROOT, file)}: ${match[1]}`)
				}
			}
		}

		expect(offenders).toEqual([])
	})
})
