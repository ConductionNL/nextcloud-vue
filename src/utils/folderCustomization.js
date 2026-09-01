/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * Folder customization catalogs: the curated color palette and icon set a
 * user can pick from to personalize a folder/vault (the Proton Pass
 * pattern), plus the resolvers that turn a STORED KEY back into something
 * renderable.
 *
 * Keys, not values, are what apps persist: the palette carries a light and
 * a dark hex per color so the rendered tint follows the active theme, and
 * the icon set maps stable kebab-case keys to MDI components. An unknown
 * key resolves to null so the caller falls back to its default glyph —
 * which keeps older frontends forward-compatible with values written by
 * newer ones (and tolerates hand-edited rows).
 *
 * Labels are ENGLISH SOURCE STRINGS by design: this library's own l10n
 * domain does not ship app strings, so pickers pass them through the host
 * app's translate function (the CnAppRoot `translate` convention).
 */

import AccountIcon from 'vue-material-design-icons/Account.vue'
import AccountGroupIcon from 'vue-material-design-icons/AccountGroup.vue'
import AirplaneIcon from 'vue-material-design-icons/Airplane.vue'
import ArchiveIcon from 'vue-material-design-icons/Archive.vue'
import BankIcon from 'vue-material-design-icons/Bank.vue'
import BellIcon from 'vue-material-design-icons/Bell.vue'
import BookIcon from 'vue-material-design-icons/Book.vue'
import BookmarkIcon from 'vue-material-design-icons/Bookmark.vue'
import BriefcaseIcon from 'vue-material-design-icons/Briefcase.vue'
import CalendarIcon from 'vue-material-design-icons/Calendar.vue'
import CameraIcon from 'vue-material-design-icons/Camera.vue'
import CartIcon from 'vue-material-design-icons/Cart.vue'
import CashIcon from 'vue-material-design-icons/Cash.vue'
import ChartBarIcon from 'vue-material-design-icons/ChartBar.vue'
import CloudIcon from 'vue-material-design-icons/Cloud.vue'
import CodeBracesIcon from 'vue-material-design-icons/CodeBraces.vue'
import CreditCardIcon from 'vue-material-design-icons/CreditCard.vue'
import DatabaseIcon from 'vue-material-design-icons/Database.vue'
import EarthIcon from 'vue-material-design-icons/Earth.vue'
import EmailIcon from 'vue-material-design-icons/Email.vue'
import FileDocumentIcon from 'vue-material-design-icons/FileDocument.vue'
import FlagIcon from 'vue-material-design-icons/Flag.vue'
import GamepadVariantIcon from 'vue-material-design-icons/GamepadVariant.vue'
import GiftIcon from 'vue-material-design-icons/Gift.vue'
import HeartIcon from 'vue-material-design-icons/Heart.vue'
import HomeIcon from 'vue-material-design-icons/Home.vue'
import KeyIcon from 'vue-material-design-icons/Key.vue'
import LeafIcon from 'vue-material-design-icons/Leaf.vue'
import LightbulbIcon from 'vue-material-design-icons/Lightbulb.vue'
import LockIcon from 'vue-material-design-icons/Lock.vue'
import MapMarkerIcon from 'vue-material-design-icons/MapMarker.vue'
import MusicIcon from 'vue-material-design-icons/Music.vue'
import PaletteIcon from 'vue-material-design-icons/Palette.vue'
import PawIcon from 'vue-material-design-icons/Paw.vue'
import PhoneIcon from 'vue-material-design-icons/Phone.vue'
import RocketIcon from 'vue-material-design-icons/Rocket.vue'
import SchoolIcon from 'vue-material-design-icons/School.vue'
import ServerIcon from 'vue-material-design-icons/Server.vue'
import ShieldIcon from 'vue-material-design-icons/Shield.vue'
import StarIcon from 'vue-material-design-icons/Star.vue'
import WalletIcon from 'vue-material-design-icons/Wallet.vue'
import WebIcon from 'vue-material-design-icons/Web.vue'

/**
 * The color palette: 12 stable keys, each with a light-theme and a
 * dark-theme hex. The pairs are the SAME hue at slightly different
 * lightness — Proton-toned mid-tones, a step darker on light surfaces
 * (contrast on white) and a step brighter on dark ones — so a vault keeps
 * its recognizable color identity when the user flips the theme. Labels
 * are English source strings for the host app's translate function.
 *
 * @type {Array<{key: string, label: string, light: string, dark: string}>}
 */
export const FOLDER_COLORS = [
	{ key: 'red', label: 'Red', light: '#c95555', dark: '#f19090' },
	{ key: 'orange', label: 'Orange', light: '#cf7f3f', dark: '#eeae72' },
	{ key: 'yellow', label: 'Yellow', light: '#b3922e', dark: '#f0d871' },
	{ key: 'green', label: 'Green', light: '#4f9d68', dark: '#93d7a9' },
	{ key: 'teal', label: 'Teal', light: '#2f9d8b', dark: '#7cdcc8' },
	{ key: 'cyan', label: 'Cyan', light: '#3596ab', dark: '#7dd4e6' },
	{ key: 'blue', label: 'Blue', light: '#4f7fd0', dark: '#93baf2' },
	{ key: 'indigo', label: 'Indigo', light: '#6661cf', dark: '#9c96f2' },
	{ key: 'purple', label: 'Purple', light: '#8358cd', dark: '#b49bf1' },
	{ key: 'pink', label: 'Pink', light: '#c25f9e', dark: '#f0a0d3' },
	{ key: 'brown', label: 'Brown', light: '#996a4d', dark: '#c89d7c' },
	{ key: 'gray', label: 'Gray', light: '#6f7480', dark: '#b7bcc8' },
]

const FOLDER_COLOR_MAP = Object.fromEntries(FOLDER_COLORS.map((c) => [c.key, c]))

/**
 * The curated icon set (42 entries — Proton Pass's breadth and then some;
 * every label is a translatable string in each consuming app, so the set
 * grows deliberately). Keys are stable kebab-case identifiers apps persist.
 *
 * @type {Array<{key: string, label: string, component: object}>}
 */
export const FOLDER_ICONS = [
	{ key: 'account', label: 'Person', component: AccountIcon },
	{ key: 'account-group', label: 'Team', component: AccountGroupIcon },
	{ key: 'airplane', label: 'Travel', component: AirplaneIcon },
	{ key: 'archive', label: 'Archive', component: ArchiveIcon },
	{ key: 'bank', label: 'Bank', component: BankIcon },
	{ key: 'bell', label: 'Notifications', component: BellIcon },
	{ key: 'book', label: 'Book', component: BookIcon },
	{ key: 'bookmark', label: 'Bookmark', component: BookmarkIcon },
	{ key: 'briefcase', label: 'Work', component: BriefcaseIcon },
	{ key: 'calendar', label: 'Calendar', component: CalendarIcon },
	{ key: 'camera', label: 'Camera', component: CameraIcon },
	{ key: 'cart', label: 'Shopping', component: CartIcon },
	{ key: 'cash', label: 'Cash', component: CashIcon },
	{ key: 'chart-bar', label: 'Chart', component: ChartBarIcon },
	{ key: 'cloud', label: 'Cloud', component: CloudIcon },
	{ key: 'code', label: 'Code', component: CodeBracesIcon },
	{ key: 'credit-card', label: 'Credit card', component: CreditCardIcon },
	{ key: 'database', label: 'Database', component: DatabaseIcon },
	{ key: 'earth', label: 'World', component: EarthIcon },
	{ key: 'email', label: 'Email', component: EmailIcon },
	{ key: 'file-document', label: 'Document', component: FileDocumentIcon },
	{ key: 'flag', label: 'Flag', component: FlagIcon },
	{ key: 'gamepad', label: 'Gaming', component: GamepadVariantIcon },
	{ key: 'gift', label: 'Gift', component: GiftIcon },
	{ key: 'heart', label: 'Heart', component: HeartIcon },
	{ key: 'home', label: 'Home', component: HomeIcon },
	{ key: 'key', label: 'Key', component: KeyIcon },
	{ key: 'leaf', label: 'Nature', component: LeafIcon },
	{ key: 'lightbulb', label: 'Idea', component: LightbulbIcon },
	{ key: 'lock', label: 'Lock', component: LockIcon },
	{ key: 'map-marker', label: 'Location', component: MapMarkerIcon },
	{ key: 'music', label: 'Music', component: MusicIcon },
	{ key: 'palette', label: 'Palette', component: PaletteIcon },
	{ key: 'paw', label: 'Pet', component: PawIcon },
	{ key: 'phone', label: 'Phone', component: PhoneIcon },
	{ key: 'rocket', label: 'Rocket', component: RocketIcon },
	{ key: 'school', label: 'School', component: SchoolIcon },
	{ key: 'server', label: 'Server', component: ServerIcon },
	{ key: 'shield', label: 'Shield', component: ShieldIcon },
	{ key: 'star', label: 'Star', component: StarIcon },
	{ key: 'wallet', label: 'Wallet', component: WalletIcon },
	{ key: 'web', label: 'Web', component: WebIcon },
]

const FOLDER_ICON_MAP = Object.fromEntries(FOLDER_ICONS.map((e) => [e.key, e.component]))

/**
 * Resolve a stored color value to a hex string for the given theme.
 *
 * Accepts a palette key (e.g. 'blue') and returns the theme-appropriate
 * variant. A value that starts with '#' is treated as a literal hex
 * (tolerates hand-edited storage) and returned unchanged. Anything else —
 * including an unknown key from a newer palette — resolves to null so the
 * caller keeps its default color.
 *
 * @param {string|null|undefined} value The stored color value.
 * @param {'dark'|'light'} theme The active theme.
 * @return {string|null} A hex color string, or null when unset/unknown.
 */
export function resolveFolderColor(value, theme) {
	if (!value) return null
	if (value.startsWith('#')) return value
	const entry = FOLDER_COLOR_MAP[value]
	if (!entry) return null
	return theme === 'dark' ? entry.dark : entry.light
}

/**
 * Resolve a stored icon key to its MDI component.
 *
 * @param {string|null|undefined} key The stored icon key.
 * @return {object|null} The icon component, or null when unset/unknown —
 *   the caller falls back to its default glyph.
 */
export function resolveFolderIcon(key) {
	if (!key) return null
	return FOLDER_ICON_MAP[key] ?? null
}

/**
 * The Proton-style TINT of a stored color: the resolved theme hex at low
 * alpha, for the circle behind a colored vault glyph (and the picker's
 * preview). Deriving the tint from the SAME hex — the 53a36006 approach —
 * is what keeps glyph and circle in lockstep across themes; a separate
 * tint palette would drift.
 *
 * @param {string|null|undefined} value The stored color value.
 * @param {'dark'|'light'} theme The active theme.
 * @param {number} [alpha] The tint opacity (default 0.15).
 * @return {string|null} An `rgba()` string, or null when the color is
 *   unset/unknown — the caller keeps its neutral background.
 */
export function folderColorTint(value, theme, alpha = 0.15) {
	const hex = resolveFolderColor(value, theme)
	if (!hex) return null
	const match = /^#([0-9a-f]{6})$/i.exec(hex)
	if (!match) return null
	const int = parseInt(match[1], 16)
	/* eslint-disable no-bitwise */
	const r = (int >> 16) & 0xff
	const g = (int >> 8) & 0xff
	const b = int & 0xff
	/* eslint-enable no-bitwise */
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Case-insensitive substring search over the icon set.
 *
 * Matches the stable key and the label — the label as the host app's user
 * actually reads it, when a translate function is given (so a Dutch user
 * searching "reizen" finds the travel icon its label translates to).
 *
 * @param {string} query The search query ('' returns the full set).
 * @param {(label: string) => string} [translate] The host app's translate
 *   function, applied to each label before matching.
 * @return {Array<{key: string, label: string, component: object}>} The
 *   matching entries, in catalog order.
 */
export function searchFolderIcons(query, translate) {
	const q = String(query || '').trim().toLowerCase()
	if (q === '') return FOLDER_ICONS
	const tr = typeof translate === 'function' ? translate : (s) => s
	return FOLDER_ICONS.filter(
		(e) =>
			e.key.toLowerCase().includes(q)
			|| e.label.toLowerCase().includes(q)
			|| String(tr(e.label)).toLowerCase().includes(q),
	)
}
