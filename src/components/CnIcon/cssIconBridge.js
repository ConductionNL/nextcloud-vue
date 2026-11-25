// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

// MDI components used to render legacy Nextcloud `icon-*` class names as
// monochrome glyphs. They render with fill:currentColor, so they always match
// the surrounding text colour in both light and dark themes.
import { mdiIcon } from './mdiIcon.js'

const Account = mdiIcon('Account')
const AccountBox = mdiIcon('AccountBox')
const AccountGroup = mdiIcon('AccountGroup')
const AlertCircleOutline = mdiIcon('AlertCircleOutline')
const BellOutline = mdiIcon('BellOutline')
const BriefcaseOutline = mdiIcon('BriefcaseOutline')
const Calendar = mdiIcon('Calendar')
const ChartLine = mdiIcon('ChartLine')
const Check = mdiIcon('Check')
const ClipboardOutline = mdiIcon('ClipboardOutline')
const ClockOutline = mdiIcon('ClockOutline')
const Close = mdiIcon('Close')
const Cog = mdiIcon('Cog')
const CommentOutline = mdiIcon('CommentOutline')
const Connection = mdiIcon('Connection')
const Delete = mdiIcon('Delete')
const Domain = mdiIcon('Domain')
const DotsHorizontal = mdiIcon('DotsHorizontal')
const Download = mdiIcon('Download')
const Earth = mdiIcon('Earth')
const Email = mdiIcon('Email')
const Eye = mdiIcon('Eye')
const FileDocumentOutline = mdiIcon('FileDocumentOutline')
const FileMultiple = mdiIcon('FileMultiple')
const FileOutline = mdiIcon('FileOutline')
const FilterVariant = mdiIcon('FilterVariant')
const Folder = mdiIcon('Folder')
const FolderAccountOutline = mdiIcon('FolderAccountOutline')
const FolderMultiple = mdiIcon('FolderMultiple')
const FormatListBulleted = mdiIcon('FormatListBulleted')
const Forum = mdiIcon('Forum')
const Gauge = mdiIcon('Gauge')
const History = mdiIcon('History')
const Home = mdiIcon('Home')
const Image = mdiIcon('Image')
const InformationOutline = mdiIcon('InformationOutline')
const LinkVariant = mdiIcon('LinkVariant')
const Lock = mdiIcon('Lock')
const Magnify = mdiIcon('Magnify')
const MapMarker = mdiIcon('MapMarker')
const OfficeBuilding = mdiIcon('OfficeBuilding')
const OpenInNew = mdiIcon('OpenInNew')
const PackageVariantClosed = mdiIcon('PackageVariantClosed')
const Pencil = mdiIcon('Pencil')
const Phone = mdiIcon('Phone')
const PlayCircleOutline = mdiIcon('PlayCircleOutline')
const Plus = mdiIcon('Plus')
const Pulse = mdiIcon('Pulse')
const RenameBox = mdiIcon('RenameBox')
const ShareVariant = mdiIcon('ShareVariant')
const ShieldAccountOutline = mdiIcon('ShieldAccountOutline')
const ShieldKeyOutline = mdiIcon('ShieldKeyOutline')
const ShieldOutline = mdiIcon('ShieldOutline')
const Sitemap = mdiIcon('Sitemap')
const Star = mdiIcon('Star')
const Tag = mdiIcon('Tag')
const Tune = mdiIcon('Tune')
const Upload = mdiIcon('Upload')
const Video = mdiIcon('Video')
const ViewDashboard = mdiIcon('ViewDashboard')
const ViewGridOutline = mdiIcon('ViewGridOutline')
const VolumeHigh = mdiIcon('VolumeHigh')

/**
 * Maps Nextcloud core `icon-*` CSS class names to a monochrome MDI component.
 * Lets a manifest keep using the familiar NC class names while every surface
 * renders the glyph in the current text colour.
 *
 * IMPORTANT: unlisted names fall through to the raw NC CSS-class path, and that
 * is NOT safe on NC34+ under a light theme — several legacy `icon-*` classes now
 * ship a baked white/grey background-image data-URI (e.g. `icon-category-organization`
 * and `icon-error` render pure white → invisible on a light nav). So every
 * `icon-*` offered in the CnMenuTreeNode picker (see nextcloudIcons.js) MUST have
 * a bridge entry here; keep the two lists in sync. Variant suffixes (`-dark` /
 * `-white`) are stripped before lookup.
 *
 * Lives here, beside CnIcon, rather than inside CnAppNav where it started: the
 * nav resolved `icon-*` and nothing else did, so a seeded `icon-comment` menu
 * entry drew a proper glyph in the live menu and a help-circle "?" in the menu
 * EDITOR, which reaches its icons through CnIcon. One resolver, one answer.
 *
 * @type {Record<string, import('vue').Component>}
 */
export const CSS_ICON_TO_MDI = {
	'icon-activity': Pulse,
	'icon-add': Plus,
	'icon-address': MapMarker,
	'icon-briefcase': BriefcaseOutline,
	'icon-calendar': Calendar,
	'icon-category': Tune,
	'icon-category-app-bundles': PackageVariantClosed,
	'icon-category-auth': ShieldKeyOutline,
	'icon-category-customization': Tune,
	'icon-category-dashboard': ViewDashboard,
	'icon-category-files': FolderMultiple,
	'icon-category-integration': Connection,
	'icon-category-monitoring': ChartLine,
	'icon-category-office': OfficeBuilding,
	'icon-category-organization': Domain,
	'icon-category-security': ShieldOutline,
	'icon-category-workflow': Sitemap,
	'icon-chart': ChartLine,
	'icon-checkmark': Check,
	'icon-clippy': ClipboardOutline,
	'icon-clock': ClockOutline,
	'icon-close': Close,
	'icon-comment': CommentOutline,
	'icon-contacts': AccountBox,
	'icon-dashboard': ViewDashboard,
	'icon-delete': Delete,
	'icon-details': InformationOutline,
	'icon-download': Download,
	'icon-edit': Pencil,
	'icon-error': AlertCircleOutline,
	'icon-external': OpenInNew,
	'icon-file': FileOutline,
	'icon-files': FileMultiple,
	'icon-filetype-text': FileDocumentOutline,
	'icon-filter': FilterVariant,
	'icon-folder': Folder,
	'icon-folder-shared': FolderAccountOutline,
	'icon-group': AccountGroup,
	'icon-history': History,
	'icon-home': Home,
	'icon-info': InformationOutline,
	'icon-link': LinkVariant,
	'icon-lock': Lock,
	'icon-mail': Email,
	'icon-more': DotsHorizontal,
	'icon-notifications': BellOutline,
	'icon-password': Lock,
	'icon-phone': Phone,
	'icon-picture': Image,
	'icon-play': PlayCircleOutline,
	'icon-projects': BriefcaseOutline,
	'icon-public': Earth,
	'icon-quota': Gauge,
	'icon-rename': RenameBox,
	'icon-search': Magnify,
	'icon-settings': Cog,
	'icon-share': ShareVariant,
	'icon-shared': ShareVariant,
	'icon-sound': VolumeHigh,
	'icon-star': Star,
	'icon-tag': Tag,
	'icon-talk': Forum,
	'icon-timezone': Earth,
	'icon-toggle': Eye,
	'icon-toggle-filelist': FormatListBulleted,
	'icon-toggle-pictures': ViewGridOutline,
	'icon-upload': Upload,
	'icon-user': Account,
	'icon-user-admin': ShieldAccountOutline,
	'icon-video': Video,
}

/**
 * Resolve a Nextcloud `icon-*` class name to a bridged MDI component, tolerating
 * a trailing `-dark` / `-white` theme variant suffix.
 *
 * @param {string} icon The `icon-*` class name.
 * @return {import('vue').Component|undefined} The MDI component, or undefined.
 */
export function bridgedMdiForCssIcon(icon) {
	if (typeof icon !== 'string' || icon.length === 0) {
		return undefined
	}
	return CSS_ICON_TO_MDI[icon] || CSS_ICON_TO_MDI[icon.replace(/-(dark|white)$/, '')]
}
