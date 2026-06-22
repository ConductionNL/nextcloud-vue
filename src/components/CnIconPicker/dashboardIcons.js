/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Dashboard icon registry — a curated set of built-in Material Design Icons
 * used across dashboard surfaces (sidebar switcher, admin lists, tile editor).
 * A dashboard's `icon` field may hold one of three values:
 *
 *   - `null` / `''`           → render DEFAULT_ICON
 *   - a registry key (`'Star'`) → looked up in DASHBOARD_ICONS
 *   - a URL (starts with `/` or `http`) → render via `<img>` (use
 *     {@link isCustomIconUrl} as the discriminator)
 *
 * Each icon is imported individually (no wildcard barrel) to keep the bundle
 * tree-shake friendly.
 */

import ViewDashboardIcon from 'vue-material-design-icons/ViewDashboard.vue'
import HomeIcon from 'vue-material-design-icons/Home.vue'
import ChartBarIcon from 'vue-material-design-icons/ChartBar.vue'
import CogIcon from 'vue-material-design-icons/Cog.vue'
import AccountGroupIcon from 'vue-material-design-icons/AccountGroup.vue'
import CalendarIcon from 'vue-material-design-icons/Calendar.vue'
import FileDocumentIcon from 'vue-material-design-icons/FileDocument.vue'
import BellIcon from 'vue-material-design-icons/Bell.vue'
import StarIcon from 'vue-material-design-icons/Star.vue'
import HeartIcon from 'vue-material-design-icons/Heart.vue'
import BookOpenVariantIcon from 'vue-material-design-icons/BookOpenVariant.vue'
import LightbulbIcon from 'vue-material-design-icons/Lightbulb.vue'
import RocketLaunchIcon from 'vue-material-design-icons/RocketLaunch.vue'
import EarthIcon from 'vue-material-design-icons/Earth.vue'
import BriefcaseIcon from 'vue-material-design-icons/Briefcase.vue'

/**
 * Map of icon registry name → Vue component reference. The keys are the
 * canonical strings persisted on a dashboard's `icon` field; iteration order is
 * the order options appear in pickers.
 *
 * @type {Record<string, object>}
 */
export const DASHBOARD_ICONS = Object.freeze({
	ViewDashboard: ViewDashboardIcon,
	Home: HomeIcon,
	ChartBar: ChartBarIcon,
	Cog: CogIcon,
	AccountGroup: AccountGroupIcon,
	Calendar: CalendarIcon,
	FileDocument: FileDocumentIcon,
	Bell: BellIcon,
	Star: StarIcon,
	Heart: HeartIcon,
	BookOpenVariant: BookOpenVariantIcon,
	Lightbulb: LightbulbIcon,
	RocketLaunch: RocketLaunchIcon,
	Earth: EarthIcon,
	Briefcase: BriefcaseIcon,
})

/**
 * Fallback icon name used when no icon is set or the requested name is not in
 * the registry.
 *
 * @type {string}
 */
export const DEFAULT_ICON = 'ViewDashboard'

if (!DASHBOARD_ICONS[DEFAULT_ICON]) {
	throw new Error(`dashboardIcons: DEFAULT_ICON "${DEFAULT_ICON}" is not present in DASHBOARD_ICONS`)
}

/**
 * Resolve an icon name to a Vue component reference. Returns `null` when the
 * name is a URL (callers must render `<img>`). For registry names, tolerates
 * null/undefined/empty/unknown — all resolve to DEFAULT_ICON; never throws on
 * non-URL inputs.
 *
 * @param {string|null|undefined} name registry key, URL, or null/empty.
 * @return {object|null} a component for `<component :is>`, or null for URLs.
 */
export function getIconComponent(name) {
	if (isCustomIconUrl(name)) {
		return null
	}
	if (typeof name !== 'string' || name.length === 0) {
		return DASHBOARD_ICONS[DEFAULT_ICON]
	}
	return DASHBOARD_ICONS[name] || DASHBOARD_ICONS[DEFAULT_ICON]
}

/**
 * Discriminator for the `icon` field — true when the value should be rendered
 * as an `<img>` (a URL) rather than looked up in the registry.
 *
 * @param {string|null|undefined} name value from a dashboard's `icon` field.
 * @return {boolean} true if `name` is a non-empty string starting with `/` or `http`.
 */
export function isCustomIconUrl(name) {
	if (typeof name !== 'string' || name.length === 0) {
		return false
	}
	return name.startsWith('/') || name.startsWith('http')
}
