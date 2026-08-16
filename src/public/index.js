/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * PUBLIC-SAFE SITE BLOCKS — the entry point a portal renderer can import when
 * it runs at a public origin with NO Nextcloud behind it.
 *
 * WHY THIS ENTRY POINT EXISTS AT ALL
 *
 * nc-vue's main entry is deeply coupled to the Nextcloud runtime: measured on
 * the published build, 154 files reference `@nextcloud/axios` and 157
 * reference `@nextcloud/router`. That is correct for an app rendering inside
 * Nextcloud and fatal for one rendering at `https://portaal.gemeente.nl`,
 * where there is no `OC` global, no session and no translation bundle.
 *
 * WHY THESE ARE NEW COMPONENTS RATHER THAN RE-EXPORTS
 *
 * The first plan was to re-export the existing widgets that "looked clean".
 * A DIRECT import check agreed: 12 of 13 candidates had no `@nextcloud/*`
 * import in their own file. A TRANSITIVE check — following relative imports
 * through the tree — inverted that result completely:
 *
 *     CnTextWidget        -> @nextcloud/l10n
 *     CnHeaderWidget      -> @nextcloud/l10n, @nextcloud/router
 *     CnCardGrid          -> @nextcloud/l10n, @nextcloud/vue,
 *                            @nextcloud/auth, @nextcloud/event-bus
 *     ... 12 of 13 unsafe
 *
 * Only `CnCard` was clean all the way down. Re-exporting the rest under a
 * name promising public safety would have shipped a guarantee that the first
 * public deployment disproved — and it would have failed at RUNTIME, in a
 * browser, on a government portal, rather than at build time here.
 *
 * So these blocks take their strings as PROPS instead of calling `t()`. That
 * single decision is what keeps them portable: `@nextcloud/l10n` is the
 * dependency almost every existing widget trips over.
 *
 * THE GUARANTEE IS CHECKED, NOT ASSERTED. `npm run check:public-safe` walks
 * this entry's transitive imports and fails on any `@nextcloud/*`. A comment
 * claiming purity is worth nothing; the check is in CI.
 */

import CnSiteCard from './components/CnSiteCard.vue'
import CnSiteCardGrid from './components/CnSiteCardGrid.vue'
import CnSiteHero from './components/CnSiteHero.vue'
import CnSiteIcon from './components/CnSiteIcon.vue'
import CnSiteSearch from './components/CnSiteSearch.vue'
import CnSiteSection from './components/CnSiteSection.vue'

export { CnSiteCard, CnSiteCardGrid, CnSiteHero, CnSiteIcon, CnSiteSearch, CnSiteSection }

/**
 * The block vocabulary, keyed by the `widgetKey` a page body declares.
 *
 * A REGISTRY rather than a switch in the consumer. A consumer that resolves
 * blocks with `if (key === 'markdown')` cannot be extended without editing the
 * consumer, which is how portaliq ended up supporting exactly one block type
 * while this library already shipped thirty-four.
 *
 * Anything not in this map is UNKNOWN, and a renderer must say so visibly
 * rather than render nothing — a page silently missing a block looks identical
 * to a page that was authored empty.
 *
 * @type {Record<string, object>}
 */
export const siteBlockRegistry = {
	hero: CnSiteHero,
	search: CnSiteSearch,
	section: CnSiteSection,
	cardGrid: CnSiteCardGrid,
	card: CnSiteCard,
}

/**
 * Blocks that are FULL-BLEED BANDS and carry their own container.
 *
 * A band paints edge to edge and constrains its content itself. Rendering one
 * inside a host's content column silently shrinks it: measured against the NL
 * Design System reference, a hero nested in the page container came out
 * 1168px wide against the design's 1280, and no amount of styling inside the
 * hero could recover the missing width because the clamp was an ancestor.
 *
 * The reference's own structure is the model — `main` is full-bleed and every
 * `section` brings a `.container` — so a host must ask this before deciding
 * whether to wrap a block.
 *
 * @param {string} key The block key.
 * @return {boolean} True when the block must NOT be wrapped in a container.
 */
export function siteBlockIsBand(key) {
	return SITE_BAND_BLOCKS.includes(key)
}

/**
 * @type {Array<string>} The band block keys.
 */
export const SITE_BAND_BLOCKS = ['hero', 'section']

/**
 * Resolve a block component by key.
 *
 * @param {string} key The `widgetKey` from a page body.
 * @return {object|null} The component, or null when the key is unknown.
 */
export function siteBlockFor(key) {
	return siteBlockRegistry[key] || null
}

/**
 * The keys this entry point can render.
 *
 * Exported so a consumer — or a test — can assert the vocabulary it depends on
 * is actually present, rather than discovering a missing block as a blank area
 * on a live page.
 *
 * @return {Array<string>} The known block keys.
 */
export function listSiteBlocks() {
	return Object.keys(siteBlockRegistry)
}
