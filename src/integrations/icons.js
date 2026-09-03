/**
 * Integration icon registration.
 *
 * The integration descriptors (`builtin/*.js`, `leaves.js`) declare
 * their app icon as an MDI *name string* (e.g. `'Calendar'`). `CnIcon`
 * resolves those names against a shared registry that is populated by
 * the host app's `registerIcons({...})` call — and OpenRegister's bundle
 * only registers the handful of icons IT uses, NOT the integration set.
 * The result was that every CnIntegrationWidget tab and every empty-state
 * fell back to `HelpCircleOutline`, erasing the per-app visual identity
 * the widget exists to provide.
 *
 * This module owns the canonical map of every MDI icon referenced by a
 * built-in / leaf descriptor and registers them with `CnIcon` so the
 * widget renders the correct glyph regardless of what the host app
 * bootstrapped. The icons render as `currentColor`, so they stay
 * theme-safe and honour the per-app accent the widget applies.
 *
 * `registerIntegrationIcons()` is idempotent and is called at module
 * load by `CnIntegrationWidget` / `CnIntegrationWidgetEmpty`, so no host
 * wiring is required. It is also exported from the package barrel for
 * apps that want to register the set explicitly (e.g. to use these
 * glyphs elsewhere via `CnIcon`).
 *
 * @module integrations/icons
 */

import { registerIcons } from '../components/CnIcon/CnIcon.vue'

import AccountBox from 'vue-material-design-icons/AccountBox.vue'
import PhoneOutline from 'vue-material-design-icons/PhoneOutline.vue'
import AccountGroupOutline from 'vue-material-design-icons/AccountGroupOutline.vue'
import AccountOutline from 'vue-material-design-icons/AccountOutline.vue'
import BookOpenPageVariant from 'vue-material-design-icons/BookOpenPageVariant.vue'
import Bookmark from 'vue-material-design-icons/Bookmark.vue'
import Briefcase from 'vue-material-design-icons/Briefcase.vue'
import Calendar from 'vue-material-design-icons/Calendar.vue'
import ChartBar from 'vue-material-design-icons/ChartBar.vue'
import ChatOutline from 'vue-material-design-icons/ChatOutline.vue'
import CheckboxMarkedOutline from 'vue-material-design-icons/CheckboxMarkedOutline.vue'
import ClipboardCheckOutline from 'vue-material-design-icons/ClipboardCheckOutline.vue'
import ClipboardText from 'vue-material-design-icons/ClipboardText.vue'
import Clock from 'vue-material-design-icons/Clock.vue'
import CommentTextOutline from 'vue-material-design-icons/CommentTextOutline.vue'
import CurrencyEur from 'vue-material-design-icons/CurrencyEur.vue'
import Earth from 'vue-material-design-icons/Earth.vue'
import Email from 'vue-material-design-icons/Email.vue'
import FileCompare from 'vue-material-design-icons/FileCompare.vue'
import FileDocumentMultiple from 'vue-material-design-icons/FileDocumentMultiple.vue'
import History from 'vue-material-design-icons/History.vue'
import Image from 'vue-material-design-icons/Image.vue'
import LinkVariant from 'vue-material-design-icons/LinkVariant.vue'
import MapMarker from 'vue-material-design-icons/MapMarker.vue'
import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import Poll from 'vue-material-design-icons/Poll.vue'
import SitemapOutline from 'vue-material-design-icons/SitemapOutline.vue'
import Share from 'vue-material-design-icons/Share.vue'
import TagOutline from 'vue-material-design-icons/TagOutline.vue'
import Timeline from 'vue-material-design-icons/Timeline.vue'
import ViewColumnOutline from 'vue-material-design-icons/ViewColumnOutline.vue'

/**
 * Every MDI icon referenced by a built-in or leaf integration
 * descriptor, keyed by the PascalCase name the descriptor declares.
 *
 * Keep this in lockstep with the `icon:` fields in `builtin/*.js` and
 * `leaves.js`. The `scripts/check-integration-build.js` gate flags a
 * descriptor whose icon is not registered here.
 *
 * @type {Record<string, import('vue').Component>}
 */
export const INTEGRATION_ICON_COMPONENTS = {
	AccountBox,
	PhoneOutline,
	AccountGroupOutline,
	AccountOutline,
	BookOpenPageVariant,
	Bookmark,
	Briefcase,
	Calendar,
	ChartBar,
	ChatOutline,
	CheckboxMarkedOutline,
	ClipboardCheckOutline,
	ClipboardText,
	Clock,
	CommentTextOutline,
	CurrencyEur,
	Earth,
	Email,
	FileCompare,
	FileDocumentMultiple,
	History,
	Image,
	LinkVariant,
	MapMarker,
	Paperclip,
	Poll,
	SitemapOutline,
	Share,
	TagOutline,
	Timeline,
	ViewColumnOutline,
}

let _registered = false

/**
 * Register every integration icon with `CnIcon`. Idempotent — safe to
 * call from multiple component module loads and from a host bootstrap.
 *
 * @return {void}
 */
export function registerIntegrationIcons() {
	if (_registered === true) {
		return
	}
	registerIcons(INTEGRATION_ICON_COMPONENTS)
	_registered = true
}
