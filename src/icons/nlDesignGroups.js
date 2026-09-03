/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * The bundled NL-government icon sets, shaped for CnIconBrowser's
 * `url-icon-groups` prop (one searchable sub-tab per set).
 *
 * Deliberately NOT part of `./index.js`: that barrel statically imports all three
 * sets, so anything touching it pulls RVO's ~1.9MB of data URIs (1163 icons) into
 * the eager bundle. Here the two small sets (Gemeente 256, Den Haag 69 — ~405KB
 * combined) are imported eagerly, and RVO is deferred behind an `import()`.
 *
 * Rollup's `preserveModules` ESM output keeps that `import()` as a real async
 * chunk, so RVO is fetched the first time a user opens its tab and never
 * otherwise. Keep this module free of any static `./rvo.js` import.
 */
import { openGemeentenIcons } from './openGemeenten.js'
import { denHaagIcons } from './denHaag.js'

/**
 * The default icon sets offered by every CnIconBrowser.
 *
 * A group may declare `load()` instead of a populated `icons` array; the panel
 * then resolves it on first activation. Icon values are self-contained
 * `data:image/svg+xml` URIs, so a picked icon renders in any app whether or not
 * that app carries the catalogue it came from.
 *
 * @return {Array<{key: string, label: string, icons: Array<{id: string, label: string, url: string}>, load?: () => Promise<Array<object>>}>} the groups.
 */
export function nlDesignIconGroups() {
	return [
		{ key: 'open-gemeenten', label: 'Gemeente', icons: openGemeentenIcons },
		{ key: 'den-haag', label: 'Den Haag', icons: denHaagIcons },
		{
			key: 'rvo',
			label: 'RVO',
			icons: [],
			load: () => import(/* webpackChunkName: "cn-icons-rvo" */ './rvo.js').then((module) => module.rvoIcons),
		},
	]
}
