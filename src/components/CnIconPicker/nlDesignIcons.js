/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * NL Design System icon pack, bundled INTO the library as self-contained
 * `data:` URIs so it needs no external `nldesign` app to be installed.
 *
 * This module re-exports the generated CC0 / EUPL-1.2 catalogues from
 * `src/icons/` (RVO/ROOS, OpenGemeenten, Den Haag). It intentionally REPLACES
 * the previous hand-inlined set, which was the Amsterdam Design System icon set
 * — those assets are proprietary to the City of Amsterdam (their `LICENSE.md`
 * excludes the open-source licence) and must NOT be redistributed here.
 * Provenance + licences: `src/icons/ATTRIBUTION.md`.
 *
 * `NL_DESIGN_ICONS` is the flat combined list ({ id, label, url });
 * `NL_DESIGN_ICON_GROUPS` splits it by set for CnIconBrowser's
 * `url-icon-groups` (a searchable sub-tab per set).
 */

export {
	NL_DESIGN_ICONS,
	NL_DESIGN_ICON_GROUPS,
	rvoIcons,
	openGemeentenIcons,
	denHaagIcons,
} from '../../icons/index.js'
