/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V. <info@conduction.nl>
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Barrel for the bundled NL-government icon catalogues.
 *
 * Prefer a per-set subpath import (`@conduction/nextcloud-vue/src/icons/rvo.js`)
 * so bundlers only pull the set you use. `NL_DESIGN_ICON_GROUPS` and the combined
 * `NL_DESIGN_ICONS` reference all three sets, so importing them pulls every set —
 * ~2.3MB of data URIs, of which RVO alone is ~1.9MB.
 *
 * For a picker, do NOT use this barrel: import `nlDesignIconGroups()` from
 * `./nlDesignGroups.js`, which loads the two small sets eagerly and defers RVO to
 * an async chunk. CnIconBrowser already defaults to it, so most consumers need
 * nothing at all. These eager exports remain for callers that genuinely want the
 * whole pack up front.
 *
 * Group shape: { key, label, icons: [{ id, label, url }] } — feed straight to
 * CnIconBrowser's `url-icon-groups` prop for a tab per set.
 */
import { rvoIcons } from './rvo.js'
import { openGemeentenIcons } from './openGemeenten.js'
import { denHaagIcons } from './denHaag.js'

export { rvoIcons, openGemeentenIcons, denHaagIcons }

export const NL_DESIGN_ICON_GROUPS = [
	{ key: 'rvo', label: 'RVO', icons: rvoIcons },
	{ key: 'open-gemeenten', label: 'Gemeente', icons: openGemeentenIcons },
	{ key: 'den-haag', label: 'Den Haag', icons: denHaagIcons },
]

/** Flat combined list of every bundled NL-government icon ({ id, label, url }). */
export const NL_DESIGN_ICONS = [...rvoIcons, ...openGemeentenIcons, ...denHaagIcons]
