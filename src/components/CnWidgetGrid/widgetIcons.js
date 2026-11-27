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

import { mdiIcon } from '../CnIcon/mdiIcon.js'

const AccountIcon = mdiIcon('Account')
const AccountBoxOutlineIcon = mdiIcon('AccountBoxOutline')
const AccountGroupIcon = mdiIcon('AccountGroup')
const AlertCircleOutlineIcon = mdiIcon('AlertCircleOutline')
const BellIcon = mdiIcon('Bell')
const BookOpenVariantIcon = mdiIcon('BookOpenVariant')
const BriefcaseIcon = mdiIcon('Briefcase')
const BullhornIcon = mdiIcon('Bullhorn')
const CalendarIcon = mdiIcon('Calendar')
const CashIcon = mdiIcon('Cash')
const CashMultipleIcon = mdiIcon('CashMultiple')
const ChartBarIcon = mdiIcon('ChartBar')
const ChartLineIcon = mdiIcon('ChartLine')
const CheckCircleOutlineIcon = mdiIcon('CheckCircleOutline')
const ClipboardCheckOutlineIcon = mdiIcon('ClipboardCheckOutline')
const ClipboardListIcon = mdiIcon('ClipboardListOutline')
const CogIcon = mdiIcon('Cog')
const CurrencyEurIcon = mdiIcon('CurrencyEur')
const DatabaseOutlineIcon = mdiIcon('DatabaseOutline')
const EarthIcon = mdiIcon('Earth')
// ADR-062 fleet expansion (2026-07-08): detail-page widget headers need a
// broader domain vocabulary (cases, contacts, comms, logistics, ops). One
// shared list — hydra gate-32's ICON_REGISTRY mirrors it; keep them in sync.
const EmailIcon = mdiIcon('Email')
const FileDocumentIcon = mdiIcon('FileDocument')
const FileSignIcon = mdiIcon('FileSign')
const FilterVariantIcon = mdiIcon('FilterVariant')
const FolderOutlineIcon = mdiIcon('FolderOutline')
const ForumOutlineIcon = mdiIcon('ForumOutline')
const GaugeIcon = mdiIcon('Gauge')
const GavelIcon = mdiIcon('Gavel')
const HandshakeOutlineIcon = mdiIcon('HandshakeOutline')
const HeadsetIcon = mdiIcon('Headset')
const HeartIcon = mdiIcon('Heart')
const HistoryIcon = mdiIcon('History')
const HomeIcon = mdiIcon('Home')
const LightbulbIcon = mdiIcon('Lightbulb')
const LinkVariantIcon = mdiIcon('LinkVariant')
const MapMarkerIcon = mdiIcon('MapMarker')
const MapIcon = mdiIcon('MapOutline')
const MessageTextOutlineIcon = mdiIcon('MessageTextOutline')
const NoteTextOutlineIcon = mdiIcon('NoteTextOutline')
const OfficeBuildingIcon = mdiIcon('OfficeBuilding')
const PackageIcon = mdiIcon('Package')
const PercentIcon = mdiIcon('Percent')
const PhoneIcon = mdiIcon('Phone')
// Agents. `Agent.icon` documents "RobotOutline" as its own example and is
// picked with CnIconPicker, which offers exactly this registry — so its absence
// meant the schema's documented example resolved to the default dashboard glyph.
const RobotOutlineIcon = mdiIcon('RobotOutline')
const RocketLaunchIcon = mdiIcon('RocketLaunch')
const ScaleBalanceIcon = mdiIcon('ScaleBalance')
const SchoolIcon = mdiIcon('School')
const ShieldCheckOutlineIcon = mdiIcon('ShieldCheckOutline')
const SitemapIcon = mdiIcon('Sitemap')
const SourceBranchIcon = mdiIcon('SourceBranch')
const StarIcon = mdiIcon('Star')
const TableColumnIcon = mdiIcon('TableColumn')
const TagOutlineIcon = mdiIcon('TagOutline')
const TimelineIcon = mdiIcon('Timeline')
const TrendingDownIcon = mdiIcon('TrendingDown')
const TrendingUpIcon = mdiIcon('TrendingUp')
const TrophyIcon = mdiIcon('Trophy')
const TruckIcon = mdiIcon('Truck')
const ViewDashboardIcon = mdiIcon('ViewDashboard')
const WebIcon = mdiIcon('Web')

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
	Bullhorn: BullhornIcon,
	Cash: CashIcon,
	CashMultiple: CashMultipleIcon,
	CurrencyEur: CurrencyEurIcon,
	Trophy: TrophyIcon,
	TrendingUp: TrendingUpIcon,
	TrendingDown: TrendingDownIcon,
	Gauge: GaugeIcon,
	ChartLine: ChartLineIcon,
	ScaleBalance: ScaleBalanceIcon,
	FilterVariant: FilterVariantIcon,
	Percent: PercentIcon,
	Account: AccountIcon,
	RobotOutline: RobotOutlineIcon,
	ClipboardList: ClipboardListIcon,
	Map: MapIcon,
	TableColumn: TableColumnIcon,
	FolderOutline: FolderOutlineIcon,
	AlertCircleOutline: AlertCircleOutlineIcon,
	CheckCircleOutline: CheckCircleOutlineIcon,
	ClipboardCheckOutline: ClipboardCheckOutlineIcon,
	// ADR-062 fleet expansion — mirror any change into hydra gate-32.
	Email: EmailIcon,
	Phone: PhoneIcon,
	School: SchoolIcon,
	MapMarker: MapMarkerIcon,
	ForumOutline: ForumOutlineIcon,
	Gavel: GavelIcon,
	Headset: HeadsetIcon,
	FileSign: FileSignIcon,
	Truck: TruckIcon,
	Package: PackageIcon,
	HandshakeOutline: HandshakeOutlineIcon,
	OfficeBuilding: OfficeBuildingIcon,
	Web: WebIcon,
	ShieldCheckOutline: ShieldCheckOutlineIcon,
	History: HistoryIcon,
	AccountBoxOutline: AccountBoxOutlineIcon,
	NoteTextOutline: NoteTextOutlineIcon,
	MessageTextOutline: MessageTextOutlineIcon,
	Sitemap: SitemapIcon,
	SourceBranch: SourceBranchIcon,
	Timeline: TimelineIcon,
	LinkVariant: LinkVariantIcon,
	DatabaseOutline: DatabaseOutlineIcon,
	TagOutline: TagOutlineIcon,
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
 * @return {boolean} true when `name` is a non-empty string starting with `/`,
 *   `http`, or `data:` (an inline data-URI, e.g. the bundled NL Design icons).
 */
export function isCustomIconUrl(name) {
	if (typeof name !== 'string' || name.length === 0) {
		return false
	}
	return name.startsWith('/') || name.startsWith('http') || name.startsWith('data:')
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

/**
 * Whether a name resolves to a REAL icon in this registry — i.e. `getIconComponent`
 * would return that icon rather than silently falling back to {@link DEFAULT_ICON}.
 *
 * Callers that decide *whether to render an icon at all* need this: asking
 * `getIconComponent` is useless for that, because it answers "ViewDashboard" for
 * every unknown name, so an unrecognised value would render a wrong (but plausible)
 * icon instead of none. `icon-*` values are Nextcloud CSS-class icons, rendered
 * through a different path, and are never registry names.
 *
 * @param {unknown} name The icon value from a menu/widget icon field.
 * @return {boolean} True when the registry has a component for this exact name.
 */
export function hasRegistryIcon(name) {
	if (typeof name !== 'string' || name.length === 0) {
		return false
	}
	if (name.startsWith('icon-')) {
		return false
	}
	return Object.hasOwn(DASHBOARD_ICONS, name)
}
