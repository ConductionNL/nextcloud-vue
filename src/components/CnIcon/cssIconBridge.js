// SPDX-FileCopyrightText: 2026 Conduction B.V.
// SPDX-License-Identifier: EUPL-1.2

// MDI components used to render legacy Nextcloud `icon-*` class names as
// monochrome glyphs. They render with fill:currentColor, so they always match
// the surrounding text colour in both light and dark themes.
import Account from 'vue-material-design-icons/Account.vue'
import AccountBox from 'vue-material-design-icons/AccountBox.vue'
import AccountGroup from 'vue-material-design-icons/AccountGroup.vue'
import AlertCircleOutline from 'vue-material-design-icons/AlertCircleOutline.vue'
import BellOutline from 'vue-material-design-icons/BellOutline.vue'
import BriefcaseOutline from 'vue-material-design-icons/BriefcaseOutline.vue'
import Calendar from 'vue-material-design-icons/Calendar.vue'
import ChartLine from 'vue-material-design-icons/ChartLine.vue'
import Check from 'vue-material-design-icons/Check.vue'
import ClipboardOutline from 'vue-material-design-icons/ClipboardOutline.vue'
import ClockOutline from 'vue-material-design-icons/ClockOutline.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import CommentOutline from 'vue-material-design-icons/CommentOutline.vue'
import Connection from 'vue-material-design-icons/Connection.vue'
import Delete from 'vue-material-design-icons/Delete.vue'
import Domain from 'vue-material-design-icons/Domain.vue'
import DotsHorizontal from 'vue-material-design-icons/DotsHorizontal.vue'
import Download from 'vue-material-design-icons/Download.vue'
import Earth from 'vue-material-design-icons/Earth.vue'
import Email from 'vue-material-design-icons/Email.vue'
import Eye from 'vue-material-design-icons/Eye.vue'
import FileDocumentOutline from 'vue-material-design-icons/FileDocumentOutline.vue'
import FileMultiple from 'vue-material-design-icons/FileMultiple.vue'
import FileOutline from 'vue-material-design-icons/FileOutline.vue'
import FilterVariant from 'vue-material-design-icons/FilterVariant.vue'
import Folder from 'vue-material-design-icons/Folder.vue'
import FolderAccountOutline from 'vue-material-design-icons/FolderAccountOutline.vue'
import FolderMultiple from 'vue-material-design-icons/FolderMultiple.vue'
import FormatListBulleted from 'vue-material-design-icons/FormatListBulleted.vue'
import Forum from 'vue-material-design-icons/Forum.vue'
import Gauge from 'vue-material-design-icons/Gauge.vue'
import History from 'vue-material-design-icons/History.vue'
import Home from 'vue-material-design-icons/Home.vue'
import Image from 'vue-material-design-icons/Image.vue'
import InformationOutline from 'vue-material-design-icons/InformationOutline.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import Lock from 'vue-material-design-icons/Lock.vue'
import Magnify from 'vue-material-design-icons/Magnify.vue'
import MapMarker from 'vue-material-design-icons/MapMarker.vue'
import OfficeBuilding from 'vue-material-design-icons/OfficeBuilding.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import PackageVariantClosed from 'vue-material-design-icons/PackageVariantClosed.vue'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import Phone from 'vue-material-design-icons/Phone.vue'
import PlayCircleOutline from 'vue-material-design-icons/PlayCircleOutline.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import Pulse from 'vue-material-design-icons/Pulse.vue'
import RenameBox from 'vue-material-design-icons/RenameBox.vue'
import ShareVariant from 'vue-material-design-icons/ShareVariant.vue'
import ShieldAccountOutline from 'vue-material-design-icons/ShieldAccountOutline.vue'
import ShieldKeyOutline from 'vue-material-design-icons/ShieldKeyOutline.vue'
import ShieldOutline from 'vue-material-design-icons/ShieldOutline.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import Star from 'vue-material-design-icons/Star.vue'
import Tag from 'vue-material-design-icons/Tag.vue'
import Tune from 'vue-material-design-icons/Tune.vue'
import Upload from 'vue-material-design-icons/Upload.vue'
import Video from 'vue-material-design-icons/Video.vue'
import ViewDashboard from 'vue-material-design-icons/ViewDashboard.vue'
import ViewGridOutline from 'vue-material-design-icons/ViewGridOutline.vue'
import VolumeHigh from 'vue-material-design-icons/VolumeHigh.vue'

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
	if (typeof icon !== 'string' || icon.length === 0) return undefined
	return CSS_ICON_TO_MDI[icon] || CSS_ICON_TO_MDI[icon.replace(/-(dark|white)$/, '')]
}
