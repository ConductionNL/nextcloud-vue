/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * widgetIcons — curated Material Design Icon registry shared by the catalog
 * dashboard widgets (menu, links, tile) ported from launchpad as part of the
 * cn-widget-library Wave 1 migration.
 *
 * The `icon` field on a widget item/tile may hold one of three values:
 *
 *   - `null` / `''` — render the {@link DEFAULT_ICON}
 *   - A registry key (e.g. `'ViewDashboard'`) — looked up in {@link DASHBOARD_ICONS}
 *   - A URL (starts with `/` or `http`) — render as an `<img>`; use
 *     {@link isCustomIconUrl} as the discriminator.
 *
 * Each icon is imported individually (no wildcard / barrel) so the production
 * bundle stays tree-shake-friendly.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
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
import CashIcon from 'vue-material-design-icons/Cash.vue'
import CashMultipleIcon from 'vue-material-design-icons/CashMultiple.vue'
import CurrencyEurIcon from 'vue-material-design-icons/CurrencyEur.vue'
import TrophyIcon from 'vue-material-design-icons/Trophy.vue'
import TrendingUpIcon from 'vue-material-design-icons/TrendingUp.vue'
import ChartLineIcon from 'vue-material-design-icons/ChartLine.vue'
import ScaleBalanceIcon from 'vue-material-design-icons/ScaleBalance.vue'
import FilterVariantIcon from 'vue-material-design-icons/FilterVariant.vue'
import PercentIcon from 'vue-material-design-icons/Percent.vue'
import AccountIcon from 'vue-material-design-icons/Account.vue'
import ClipboardListIcon from 'vue-material-design-icons/ClipboardListOutline.vue'

/**
 * Map of icon registry name → Vue component reference. Iteration order is the
 * order options appear in pickers.
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
	Cash: CashIcon,
	CashMultiple: CashMultipleIcon,
	CurrencyEur: CurrencyEurIcon,
	Trophy: TrophyIcon,
	TrendingUp: TrendingUpIcon,
	ChartLine: ChartLineIcon,
	ScaleBalance: ScaleBalanceIcon,
	FilterVariant: FilterVariantIcon,
	Percent: PercentIcon,
	Account: AccountIcon,
	ClipboardList: ClipboardListIcon,
})

/**
 * The fallback icon name used when no icon is set or the requested name is not
 * in the registry.
 *
 * @type {string}
 */
export const DEFAULT_ICON = 'ViewDashboard'

/**
 * Discriminator for the `icon` field — true when the value should be rendered
 * as an `<img>` (a URL) rather than looked up in the registry.
 *
 * @param {string|null|undefined} name the value from a widget icon field.
 * @return {boolean} true when `name` is a non-empty string starting with `/` or `http`.
 */
export function isCustomIconUrl(name) {
	if (typeof name !== 'string' || name.length === 0) {
		return false
	}
	return name.startsWith('/') || name.startsWith('http')
}

/**
 * Resolve an icon name to a Vue component reference. Returns `null` when the
 * name is a URL (the caller must render via `<img>`); registry names, null,
 * undefined, empty, and unknown names all resolve to the {@link DEFAULT_ICON}
 * component. Never throws on non-URL inputs.
 *
 * @param {string|null|undefined} name icon registry key, URL, or null/empty.
 * @return {object|null} a Vue component for `<component :is>`, or `null` for a URL.
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
