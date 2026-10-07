<!--
  CnAppNav — manifest-driven app navigation.

  Renders the manifest's `menu[]` array as a Nextcloud app navigation
  (NcAppNavigation + NcAppNavigationItem). One level of nested
  `children[]` is supported. Items are sorted by `order` at BOTH levels —
  top-level entries and a group's children — and items without an order
  render last. Items with a `permission` are filtered against
  the `permissions` prop — when the prop is omitted, all items render.

  An optional primary action renders above the main list as an
  NcAppNavigationNew button (e.g. a "new" button or an active-context
  switcher). Hosts supply it via the `#primary-action` slot (full
  control over dynamic content + click handling); a static
  `nav.primaryAction` ({ label, icon?, route?, href? }) manifest field
  is the declarative fallback. The slot wins when both are present;
  nothing renders when neither is.

  Items split into three RENDERED groups by `section`, plus one section
  this component deliberately renders nowhere:
  - `section: "main"` (default) — top of the navigation, scrollable.
  - `section: "footer"` — rendered in NcAppNavigation's `#footer` slot,
    OUTSIDE the scrollable list and directly above the settings foldout,
    so they stay visible regardless of how long the main menu is. (The
    earlier `pinned`-prop approach kept them inside the scroll container:
    `margin-top: auto` only bottom-pins while the list does not overflow,
    so apps with long menus showed them mid-scroll.) For always-visible,
    non-settings links: Documentation, Features & Roadmap, About.
  - `section: "settings"` — rendered INSIDE an NcAppNavigationSettings
    foldout (the NC-native gear-icon button that slides a panel open).
    A "Personal settings" entry is auto-prepended at the top of the
    foldout (opens the host app's NcAppSettingsDialog via
    cnOpenUserSettings); opt out with `nav.includePersonalSettings:
    false`. Right below it, an "Admin settings" entry is auto-prepended
    for INSTANCE ADMINS only — gated on the `isAdmin` prop (computed by
    CnAppRoot from `getCurrentUser()?.isAdmin`). It is a LINK to
    `/settings/admin/<appId>` that opens in a NEW TAB and carries an
    open-in-new marker (the destination is outside the app — the marker
    says so up front, the new tab keeps the app open), not a modal: per
    ADR-079 app-level
    configuration lives in Nextcloud's own settings framework, which
    authorizes it server-side. `isAdmin` gates VISIBILITY only and is
    never an authorization decision; it is also NOT interchangeable with
    `isOwner`, which means "owns this app" rather than "administers this
    instance" and keeps its own separate uses. The
    foldout mounts whenever there are settings items OR personal
    settings is enabled — so every app shows a Settings gear with at
    least Personal settings. It is only fully suppressed when there are
    no settings items AND `nav.includePersonalSettings: false`.
  - `section: "integrations"` — rendered by this component NOWHERE. Per
    ADR-110 these are the links that LEAVE this app for another one, and
    they belong in the Integrations section at the bottom of the per-user
    settings modal, which CnAppRoot owns. A link to another app cannot be
    the active route and carries no counter, so putting it in the nav
    makes another app's capability read as this app's feature. The one
    deep link that stays in the navigation is the auto-prepended Admin
    settings above — apps never declare that one themselves.

  Manifest and translate are injected from CnAppRoot by default but can
  also be passed as props for standalone use without CnAppRoot. Props
  win over inject when both are present.

  Items can opt out of routing in favour of a built-in action by
  setting `action` on the manifest entry. Supported keywords:
  `"user-settings"` invokes the `cnOpenUserSettings` provide-injected
  by CnAppRoot, which opens the host app's NcAppSettingsDialog modal;
  `"admin-settings"` opens `/settings/admin/<appId>` in a new tab (ADR-079);
  `"replay-walkthrough"` invokes `cnReplayWalkthrough` (optionally
  with the item's `tourId`) to re-run the product walkthrough from
  the first step (ADR-043). Both `route` and `href` are ignored when
  `action` is set. The injects default to a no-op so CnAppNav stays
  usable standalone (without a CnAppRoot ancestor).

  See REQ-JMR-004 of the json-manifest-renderer specification.
-->
<template>
	<NcAppNavigation :aria-label="ariaLabel" data-testid="cn-nav">
		<template v-if="$slots.search || $slots.brand || resolvedBrand" #search>
			<!--
				@slot brand
				@description Replace the brand block at the very top of the
				navigation. Default content: the logo, name and caption from
				the `brand` prop or the manifest's `nav.brand`. Renders
				nothing when neither is set.
				@binding {object|null} brand The resolved brand (`{ logo, name, caption, alt }`), or null.
			-->
			<slot name="brand" :brand="resolvedBrand">
				<div
					v-if="resolvedBrand"
					class="cn-app-nav__brand"
					data-testid="cn-nav-brand">
					<!-- Decorative beside a name: the name already says whose
					     app this is, and an alt text would say it twice. A logo
					     on its own carries the name as its alt text. -->
					<!-- An emblem (`nav.brand.emblem`) stands in for the logo:
					     the municipality's mark beside the app name, distinct
					     from the wordmark in the top bar. `true` draws the
					     theme's emblem from --nldesign-emblem-url. -->
					<img
						v-if="typeof resolvedBrand.emblem === 'string' && resolvedBrand.emblem !== ''"
						class="cn-app-nav__brand-emblem"
						data-testid="cn-nav-brand-emblem"
						:src="resolvedBrand.emblem"
						:alt="resolvedBrand.name ? '' : resolvedBrand.alt">
					<span
						v-else-if="resolvedBrand.emblem === true"
						class="cn-app-nav__brand-emblem cn-app-nav__brand-emblem--theme"
						data-testid="cn-nav-brand-emblem"
						aria-hidden="true" />
					<img
						v-else-if="resolvedBrand.logo"
						class="cn-app-nav__brand-logo"
						:src="resolvedBrand.logo"
						:alt="resolvedBrand.name ? '' : resolvedBrand.alt">
					<span v-if="resolvedBrand.name || resolvedBrand.caption" class="cn-app-nav__brand-text">
						<strong v-if="resolvedBrand.name" class="cn-app-nav__brand-name">{{ resolvedBrand.name }}</strong>
						<span v-if="resolvedBrand.caption" class="cn-app-nav__brand-caption">{{ resolvedBrand.caption }}</span>
					</span>
				</div>
			</slot>
			<!--
				@slot search
				@description Forwarded into NcAppNavigation's #search slot.
				Hosts mount NcAppNavigationSearch here. When unset, no search
				input renders inside the navigation.
			-->
			<slot name="search" />
		</template>
		<!-- @slot primary-action Optional primary action rendered above the
		     main list as NcAppNavigation's top region (e.g. an app's "new"
		     button or an active-context switcher). When provided, it takes
		     precedence over the manifest-declared primaryAction (page-scoped
		     OR nav root). Omitted entirely when neither the slot nor any
		     resolvable primaryAction is present. -->
		<slot name="primary-action">
			<!-- A primary action that carries an `action` runs a page action
			     (open-form opens the create dialog, navigate pushes a route)
			     through CnActionButtons, so "New case" can live in the
			     navigation without a create page. Drawn as one solid,
			     full-width primary button. -->
			<div
				v-if="activePrimaryAction && primaryDispatchEntry"
				class="app-navigation-new cn-app-nav__primary-action cn-app-nav__primary-action--solid"
				data-testid="cn-nav-primary-action">
				<CnActionButtons
					:actions="[primaryDispatchEntry]"
					data-testid="cn-nav-primary-action-dispatch"
					@created="onPrimaryActionCreated" />
			</div>
			<!-- A primary action with an href or route is a real link.
			     NcAppNavigationNew cannot render one, so this mirrors its
			     wrapper and button. `solid: true` takes this same solid,
			     full-width button for an action with neither. -->
			<div
				v-else-if="activePrimaryAction && (primaryActionLink || activePrimaryAction.solid === true)"
				class="app-navigation-new cn-app-nav__primary-action"
				:class="{ 'cn-app-nav__primary-action--solid': activePrimaryAction.solid === true }"
				data-testid="cn-nav-primary-action">
				<NcButton
					variant="primary"
					wide
					v-bind="primaryActionLink || {}"
					@click="onPrimaryActionClick">
					<template #icon>
						<component :is="primaryActionIconComponent" :size="20" />
					</template>
					{{ resolveLabel(activePrimaryAction) }}
				</NcButton>
			</div>
			<NcAppNavigationNew
				v-else-if="activePrimaryAction"
				:text="resolveLabel(activePrimaryAction)"
				data-testid="cn-nav-primary-action"
				@click="onPrimaryActionClick">
				<template #icon>
					<component :is="primaryActionIconComponent" :size="20" />
				</template>
			</NcAppNavigationNew>
		</slot>
		<template #list>
			<template v-for="item in mainItems">
				<NcAppNavigationCaption
					v-if="isCaption(item)"
					:key="item.id"
					:name="resolveLabel(item)"
					:data-testid="`cn-nav-caption-${item.id}`" />
				<NcAppNavigationItem
					v-else
					:key="item.id"
					:name="resolveLabel(item)"
					:to="linkTo(item)"
					:href="linkHref(item)"
					:icon="cssIconClass(item)"
					:active="isActive(item)"
					:pinned="Boolean(item.pinned)"
					:allowCollapse="visibleChildren(item).length > 0"
					:open="isItemOpen(item)"
					:data-testid="`cn-nav-entry-${item.id}`"
					:data-cn-route="item.route"
					@update:open="setItemOpen(item, $event)"
					@click="onItemClick(item, $event)">
					<template v-if="mdiIconComponent(item) || isRichIcon(item) || isRegistryIcon(item) || isUnresolvedIcon(item)" #icon>
						<component :is="mdiIconComponent(item)" v-if="mdiIconComponent(item)" :size="20" />
						<HelpCircleOutline v-else-if="isUnresolvedIcon(item)" :size="20" />
						<CnMenuItemIcon v-else :icon="item.icon" :size="20" />
					</template>
					<template v-if="resolveCount(item)" #counter>
						<NcCounterBubble
							:count="resolveCount(item)"
							:active="isActive(item)" />
					</template>
					<template v-if="hasItemActionsSlot(item)" #actions>
						<!--
							@slot `item-${item.id}-actions`
							@description Per-item scoped slot whose content lands inside
							the NcAppNavigationItem's #actions slot for the menu entry
							with that id. Use it for inline NcActions menus (e.g. an
							item-level "Pin" button). Scope receives the menu item.
							@binding {object} item The menu item descriptor.
						-->
						<slot :name="`item-${item.id}-actions`" :item="item" />
					</template>
					<NcAppNavigationItem
						v-for="child in visibleChildren(item)"
						:key="child.id"
						:name="resolveLabel(child)"
						:to="linkTo(child)"
						:href="linkHref(child)"
						:icon="cssIconClass(child)"
						:active="isActive(child)"
						:pinned="Boolean(child.pinned)"
						:data-testid="`cn-nav-entry-${child.id}`"
						:data-cn-route="child.route"
						@click="onItemClick(child, $event)">
						<template v-if="mdiIconComponent(child) || isRichIcon(child) || isRegistryIcon(child) || isUnresolvedIcon(child)" #icon>
							<component :is="mdiIconComponent(child)" v-if="mdiIconComponent(child)" :size="20" />
							<HelpCircleOutline v-else-if="isUnresolvedIcon(child)" :size="20" />
							<CnMenuItemIcon v-else :icon="child.icon" :size="20" />
						</template>
						<template v-if="resolveCount(child)" #counter>
							<NcCounterBubble
								:count="resolveCount(child)"
								:active="isActive(child)" />
						</template>
					</NcAppNavigationItem>
				</NcAppNavigationItem>
			</template>
		</template>
		<template v-if="footerItems.length > 0 || showSettingsFoldout || resolvedCard || showsHelp" #footer>
			<!--
				@slot card
				@description Replace the card above the footer entries
				(`nav.card`). Default content: a title, a line of text and one
				link. Renders nothing when neither the slot nor `nav.card` is set.
				@binding {object|null} card The resolved card, or null.
			-->
			<slot name="card" :card="resolvedCard">
				<div
					v-if="resolvedCard"
					class="cn-app-nav__card"
					data-testid="cn-nav-card">
					<strong class="cn-app-nav__card-title">{{ resolvedCard.title }}</strong>
					<span v-if="resolvedCard.text" class="cn-app-nav__card-text">{{ resolvedCard.text }}</span>
					<component
						:is="resolvedCard.linkTag"
						v-if="resolvedCard.linkTag"
						class="cn-app-nav__card-link"
						data-testid="cn-nav-card-link"
						v-bind="resolvedCard.linkAttrs"
						@click="onCardLinkClick">
						{{ resolvedCard.linkLabel }}
					</component>
				</div>
			</slot>
			<!-- Footer-section entries (Documentation, Features & Roadmap,
			     About) live in NcAppNavigation's #footer slot — OUTSIDE the
			     scrollable list — so they stay visible above the settings
			     foldout no matter how long the main menu is. The pinned-prop
			     approach only bottom-pinned while the list did not overflow.

			     NcAppNavigationList, not a bare <ul>: its padding, gap and
			     hover highlight are scoped to itself, so they survive being
			     slotted. The main list's inset comes from NcAppNavigation's
			     scope, which slot content does not carry. -->
			<NcAppNavigationList
				v-if="footerItems.length > 0 || showsHelp"
				class="cn-app-nav__footer-list"
				:class="{ 'cn-app-nav__footer-list--after-settings': settingsFirst }">
				<!-- The help entry (`nav.help`): a link to the app's own help
				     with a help icon, above the footer entries (or after them,
				     when a declared `nav.footer` names it last). -->
				<NcAppNavigationItem
					v-if="showsHelp && !helpAfterItems"
					:name="resolvedHelp.label"
					:to="resolvedHelp.to"
					:href="resolvedHelp.href"
					:target="resolvedHelp.href ? '_blank' : undefined"
					data-testid="cn-nav-help">
					<template #icon>
						<HelpCircleOutline :size="20" />
					</template>
				</NcAppNavigationItem>
				<NcAppNavigationItem
					v-for="item in footerItems"
					:key="item.id"
					:name="resolveLabel(item)"
					:to="linkTo(item)"
					:href="linkHref(item)"
					:icon="cssIconClass(item)"
					:active="isActive(item)"
					:data-testid="`cn-nav-entry-${item.id}`"
					:data-cn-route="item.route"
					@click="onItemClick(item, $event)">
					<template v-if="mdiIconComponent(item) || isRichIcon(item) || isRegistryIcon(item) || isUnresolvedIcon(item)" #icon>
						<component :is="mdiIconComponent(item)" v-if="mdiIconComponent(item)" :size="20" />
						<HelpCircleOutline v-else-if="isUnresolvedIcon(item)" :size="20" />
						<CnMenuItemIcon v-else :icon="item.icon" :size="20" />
					</template>
					<template v-if="resolveCount(item)" #counter>
						<NcCounterBubble
							:count="resolveCount(item)"
							:active="isActive(item)" />
					</template>
				</NcAppNavigationItem>
				<NcAppNavigationItem
					v-if="showsHelp && helpAfterItems"
					:name="resolvedHelp.label"
					:to="resolvedHelp.to"
					:href="resolvedHelp.href"
					:target="resolvedHelp.href ? '_blank' : undefined"
					data-testid="cn-nav-help">
					<template #icon>
						<HelpCircleOutline :size="20" />
					</template>
				</NcAppNavigationItem>
			</NcAppNavigationList>
			<!-- Settings foldout (section: "settings" items). NC-native
			     gear-icon button that slides open a panel; the first entry
			     is an auto-prepended "Personal settings" that opens the
			     host app's NcAppSettingsDialog via cnOpenUserSettings. -->
			<NcAppNavigationSettings
				v-if="showSettingsFoldout"
				:name="settingsFoldoutLabel"
				:class="{ 'cn-app-nav__settings--first': settingsFirst }"
				data-testid="cn-nav-settings">
				<ul class="cn-app-nav__settings-list">
					<NcAppNavigationItem
						v-if="includePersonalSettings"
						:name="personalSettingsLabel"
						data-testid="cn-nav-personal-settings"
						@click="onPersonalSettingsClick">
						<template #icon>
							<Cog :size="20" />
						</template>
					</NcAppNavigationItem>
					<NcAppNavigationItem
						v-if="roadmapEntry"
						:name="roadmapEntry.label"
						:to="roadmapEntry.to"
						:href="roadmapEntry.href"
						data-testid="cn-nav-roadmap">
						<template #icon>
							<MapMarkerPath :size="20" />
						</template>
					</NcAppNavigationItem>
					<NcAppNavigationItem
						v-if="documentationEntry"
						:name="documentationEntry.label"
						:href="documentationEntry.href"
						target="_blank"
						data-testid="cn-nav-documentation">
						<template #icon>
							<BookOpenVariant :size="20" />
						</template>
					</NcAppNavigationItem>
					<!-- The target is Nextcloud's OWN settings area, not an
					     in-app route: a new tab keeps the app open, and the
					     trailing open-in-new marker tells the user they are
					     leaving the app before they click. The new tab comes
					     from the href being ABSOLUTE (see adminSettingsHref) —
					     NcAppNavigationItem ignores a `target` attr and only
					     sets target="_blank" for scheme-prefixed hrefs. -->
					<NcAppNavigationItem
						v-if="showAdminSettingsLink"
						:name="adminSettingsLabel"
						:href="adminSettingsHref"
						data-testid="cn-nav-admin-settings">
						<template #icon>
							<ShieldAccountOutline :size="20" />
						</template>
						<template #counter>
							<OpenInNew :size="16" :title="opensInNewTabHint" data-testid="cn-nav-admin-settings-external" />
						</template>
					</NcAppNavigationItem>
					<template v-for="item in settingsItems">
						<NcAppNavigationCaption
							v-if="isCaption(item)"
							:key="item.id"
							:name="resolveLabel(item)"
							:data-testid="`cn-nav-caption-${item.id}`" />
						<NcAppNavigationItem
							v-else
							:key="item.id"
							:name="resolveLabel(item)"
							:to="linkTo(item)"
							:href="linkHref(item)"
							:icon="cssIconClass(item)"
							:active="isActive(item)"
							:data-cn-route="item.route"
							:data-testid="`cn-nav-entry-${item.id}`"
							@click="onItemClick(item, $event)">
							<template v-if="mdiIconComponent(item) || isRichIcon(item) || isRegistryIcon(item) || isUnresolvedIcon(item)" #icon>
								<component :is="mdiIconComponent(item)" v-if="mdiIconComponent(item)" :size="20" />
								<HelpCircleOutline v-else-if="isUnresolvedIcon(item)" :size="20" />
								<CnMenuItemIcon v-else :icon="item.icon" :size="20" />
							</template>
							<template v-if="resolveCount(item)" #counter>
								<NcCounterBubble
									:count="resolveCount(item)"
									:active="isActive(item)" />
							</template>
						</NcAppNavigationItem>
					</template>
				</ul>
			</NcAppNavigationSettings>
		</template>
	</NcAppNavigation>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcAppNavigation, NcAppNavigationCaption, NcAppNavigationItem, NcAppNavigationList, NcAppNavigationNew, NcAppNavigationSettings, NcButton, NcCounterBubble } from '@nextcloud/vue'
import { toRaw } from 'vue'
import BookOpenVariant from 'vue-material-design-icons/BookOpenVariant.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
// ADR-077 rule 4: visible fallback for an unresolvable icon name.
import HelpCircleOutline from 'vue-material-design-icons/HelpCircleOutline.vue'
import MapMarkerPath from 'vue-material-design-icons/MapMarkerPath.vue'
import OpenInNew from 'vue-material-design-icons/OpenInNew.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import ShieldAccountOutline from 'vue-material-design-icons/ShieldAccountOutline.vue'
import { ICON_MAP } from '../CnIcon/CnIcon.vue'
import CnMenuItemIcon from '../CnMenuWidget/CnMenuItemIcon.vue'
import { isAppInstalled } from '../../utils/appInstalled.js'
import { isSvgPath } from '../../utils/iconUtils.js'
import { passesContextPredicates } from '../../utils/visibleIfContext.js'
import { CnActionButtons } from '../CnActionButtons/index.js'
// The legacy `icon-*` → MDI bridge lives beside CnIcon now, so the menu EDITOR
// resolves a seeded `icon-comment` the same way this nav does. It used to be a
// map local to this file, which is why the nav drew a proper glyph and the
// editor drew a help-circle "?" for the very same manifest value.
import { bridgedMdiForCssIcon } from '../CnIcon/cssIconBridge.js'
import { getSemanticIconComponent } from '../CnIcon/semanticIcons.js'
import { hasRegistryIcon, isCustomIconUrl } from '../CnWidgetGrid/widgetIcons.js'

/**
 * Order two menu entries by their manifest `order`.
 *
 * Entries carrying an `order` come first, ascending; entries without one render
 * last and keep their relative order. Used at BOTH nav levels so a group's
 * children obey the same rule as the top-level list.
 *
 * @param {object} a First entry.
 * @param {object} b Second entry.
 * @return {number} Comparator result.
 */
function byManifestOrder(a, b) {
	const aHas = typeof a.order === 'number'
	const bHas = typeof b.order === 'number'
	if (aHas && !bHas) {
		return -1
	}
	if (!aHas && bHas) {
		return 1
	}
	if (!aHas && !bHas) {
		return 0
	}
	return a.order - b.order
}

/** A `:name` page-path segment: name, optional `(regexp)`, optional modifier. */
const PARAM_SEGMENT = /^:(\w+)(\([^)]*\))?([?*+])?$/

/**
 * Whether a `PARAM_SEGMENT` match may be left out (`?` or `*`).
 *
 * @param {Array<string>} param The match.
 * @return {boolean} True for an optional segment.
 */
function isOptionalParam(param) {
	return param[3] === '?' || param[3] === '*'
}

/**
 * Whether a route param value fills its segment.
 *
 * @param {unknown} value The value.
 * @return {boolean} False for undefined, null and the empty string.
 */
function isFilled(value) {
	return value !== undefined && value !== null && value !== ''
}

/**
 * Decode one percent-encoded path segment, or keep it as is when it is not
 * valid percent-encoding.
 *
 * @param {string} segment The segment.
 * @return {string} The decoded segment.
 */
function decodeSegment(segment) {
	try {
		return decodeURIComponent(segment)
	} catch {
		return segment
	}
}

export default {
	name: 'CnAppNav',

	components: {
		NcAppNavigation,
		NcAppNavigationCaption,
		NcAppNavigationItem,
		NcAppNavigationList,
		NcAppNavigationNew,
		NcAppNavigationSettings,
		NcButton,
		NcCounterBubble,
		CnActionButtons,
		CnMenuItemIcon,
		Cog,
		HelpCircleOutline,
		ShieldAccountOutline,
		MapMarkerPath,
		BookOpenVariant,
		OpenInNew,
	},

	inject: {
		cnManifest: { default: null },
		cnTranslate: { default: () => (key) => key },
		/**
		 * Provided by CnAppRoot — opens the host app's
		 * NcAppSettingsDialog. Defaults to a no-op so CnAppNav is
		 * still usable when mounted outside a CnAppRoot ancestor;
		 * the click silently does nothing in that case rather than
		 * throwing.
		 */
		cnOpenUserSettings: { default: () => () => {} },
		/**
		 * Provided by CnAppRoot — the consuming app's slug, used to build
		 * the "Admin settings" link target `/settings/admin/<appId>`.
		 * Overridden by the explicit `appId` prop when both are present.
		 * Null outside a CnAppRoot ancestor, in which case the link is
		 * suppressed (ADR-079 §2).
		 */
		cnAppId: { default: null },
		/**
		 * Provided by CnAppRoot — restarts the product walkthrough (ADR-043)
		 * from the first step. Bound to menu entries declaring
		 * `action: "replay-walkthrough"` (optionally with a `tourId`).
		 * Defaults to a no-op so CnAppNav stays usable standalone.
		 */
		cnReplayWalkthrough: { default: () => () => {} },
		/**
		 * Provided by CnAppRoot — reactive `{ [register]: { [schema]: number } }`
		 * map populated from `useObjectStore().totals` for every
		 * `count: "auto"` menu entry whose resolved page is `type: "index"`
		 * with `register + schema` in its config. Defaults to an empty
		 * object so `resolveCount` returns `null` (no badge) when CnAppNav
		 * is mounted outside a CnAppRoot ancestor.
		 *
		 * @type {{ [register: string]: { [schema: string]: number } }}
		 */
		cnMenuCounts: { default: () => ({}) },
		/**
		 * Provided by CnAppRoot — reactive `{ [menuItemId]: number }` totals
		 * for every menu entry whose `count` is an object
		 * (`{ register, schema, filter? }`): the total of that filtered
		 * list, fetched under the entry's own key so an index page's
		 * whole-schema total is left alone. Empty outside a CnAppRoot.
		 *
		 * @type {{ [itemId: string]: number }}
		 */
		cnMenuItemCounts: { default: () => ({}) },
	},

	props: {
		/**
		 * Manifest object. Falls back to injected `cnManifest`. Provide
		 * explicitly when mounting CnAppNav outside of CnAppRoot.
		 *
		 * @type {object|null}
		 */
		manifest: {
			type: Object,
			default: null,
		},

		/**
		 * Translate function. Falls back to injected `cnTranslate`,
		 * which itself defaults to an identity function.
		 *
		 * @type {((key: string) => string)|null}
		 */
		translate: {
			type: Function,
			default: null,
		},

		/**
		 * List of permission strings the current user holds. Items
		 * declaring a `permission` only render when their permission
		 * appears in this list. When the prop is omitted (or empty),
		 * all items are visible regardless of their permission field.
		 *
		 * @type {Array<string>}
		 */
		permissions: {
			type: Array,
			default: () => [],
		},

		/**
		 * Whether the current user is an OWNER of this app
		 * (admin-settings-owner-gating capability). Computed by CnAppRoot
		 * from `currentUserGroups` ∩ `permissions.owners` and/or a manifest
		 * `runtime.user` owner signal — deliberately NOT `OC.isUserAdmin()`.
		 * Read by nothing in this component: the auto-included "Admin
		 * settings" entry is gated on `isAdmin` alone (see the file header
		 * and `showAdminSettingsLink`). The prop stays because CnAppRoot
		 * binds it as published API and owner-gating is its own question,
		 * not the instance-admin one.
		 *
		 * @type {boolean}
		 */
		isOwner: { // eslint-disable-line vue/no-unused-properties -- published prop bound by CnAppRoot; owner-gating is decided upstream, not here
			type: Boolean,
			default: false,
		},

		/**
		 * Whether the current user administers this Nextcloud instance.
		 * Computed by CnAppRoot from `getCurrentUser()?.isAdmin`
		 * (`@nextcloud/auth`) — NOT the legacy `OC.isUserAdmin()` global,
		 * and NOT interchangeable with `isOwner`, which is about owning a
		 * given app rather than administering the instance (ADR-079 §3).
		 *
		 * Gates VISIBILITY of the "Admin settings" link only. It is not an
		 * authorization decision and MUST NOT be used as one: the boundary
		 * is Nextcloud's settings framework, which refuses
		 * `/settings/admin/<app>` server-side for non-admins. Defaults to
		 * `false` so CnAppNav mounted standalone never shows the link.
		 *
		 * @type {boolean}
		 */
		isAdmin: {
			type: Boolean,
			default: false,
		},

		/**
		 * App id used to build the "Admin settings" link target
		 * (`/settings/admin/<appId>`). Falls back to the injected
		 * `cnAppId` provided by CnAppRoot. With neither available the
		 * link is suppressed rather than pointing at a broken URL.
		 *
		 * @type {string|null}
		 */
		appId: {
			type: String,
			default: null,
		},

		/**
		 * Accessible name for the navigation landmark, forwarded to
		 * `NcAppNavigation`'s `aria-label`.
		 *
		 * `@nextcloud/vue` 9 requires `ariaLabel` or `ariaLabelledby` and warns
		 * when neither is set: a `<nav>` with no accessible name is announced as
		 * an unlabelled landmark, so a screen-reader user tabbing the landmark
		 * list cannot tell it from any other nav on the page (WCAG 2.4.6 /
		 * 1.3.1). The default covers every consumer without a code change; pass
		 * your own when an app shows more than one navigation, since the point
		 * of the name is to tell them apart.
		 *
		 * @type {string}
		 */
		ariaLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Main navigation'),
		},

		/**
		 * The brand block at the top of the navigation:
		 * `{ logo?, name?, caption?, alt? }`. `logo` is an image URL, `name`
		 * the app or organisation name, `caption` a line under it. Falls back
		 * to the manifest's `nav.brand`. `null` (the default) with no manifest
		 * brand renders nothing.
		 *
		 * @type {{logo?: string, name?: string, caption?: string, alt?: string}|null}
		 */
		brand: {
			type: Object,
			default: null,
		},
	},

	emits: ['primary-action', 'primary-action-click', 'primary-action-created', 'card-action'],

	/**
	 * The navigation's own state: which groups are open, and which entry
	 * of a route the reader last used.
	 *
	 * @return {object} The state.
	 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry
	 */
	data() {
		return {
			/**
			 * Per-item expand/collapse state for menu groups, keyed by
			 * item id. Seeded lazily from the manifest's `item.open` by
			 * `isItemOpen`; written by the collapse chevron (via
			 * `@update:open`), by title clicks on route-less group items
			 * (which TOGGLE open/closed), and by title clicks on a group
			 * that ALSO carries a route or href (which force it OPEN,
			 * alongside the navigation — see `onItemClick`).
			 */
			openState: {},

			/**
			 * Per route name, the key of the entry that was last active on
			 * that route in this session. Read by `subRouteParent` to keep
			 * "the list I came from" marked on a page below it. In memory
			 * only: a reload starts empty and falls back to menu order.
			 *
			 * @type {Record<string, string>}
			 */
			lastActiveEntryByRoute: {},
		}
	},

	computed: {
		effectiveManifest() {
			return this.manifest ?? this.cnManifest
		},

		effectiveTranslate() {
			return this.translate ?? this.cnTranslate
		},

		/**
		 * The brand to draw: the `brand` prop, else the manifest's
		 * `nav.brand`. Name and caption go through the translate function,
		 * like every other manifest label. Null when there is nothing to
		 * show, which is what keeps the block out of a navigation that
		 * declares no brand.
		 *
		 * @return {{logo: string, name: string, caption: string, alt: string}|null} The brand, or null.
		 * @spec openspec/changes/detail-action-model-and-case-surfaces/specs/detail-action-model/spec.md#requirement-navigation-brand
		 */
		resolvedBrand() {
			const declared = this.brand ?? this.effectiveManifest?.nav?.brand
			if (!declared || typeof declared !== 'object') {
				return null
			}
			const text = (value) => (typeof value === 'string' && value !== '' ? this.effectiveTranslate(value) : '')
			const brand = {
				logo: typeof declared.logo === 'string' ? declared.logo : '',
				// A URL, or `true` for the theme's emblem (--nldesign-emblem-url).
				emblem: declared.emblem === true ? true : (typeof declared.emblem === 'string' ? declared.emblem : ''),
				name: text(declared.name),
				caption: text(declared.caption),
				alt: text(declared.alt),
			}
			return (brand.logo || brand.emblem || brand.name || brand.caption) ? brand : null
		},

		/**
		 * The card above the footer entries (`nav.card`): `{ title, text?,
		 * link?: { label, route?, params?, href?, action? } }`. Title, text
		 * and link label go through the translate function. The link is a
		 * router link for a `route` (with a router), an anchor for an
		 * `href`, and a button emitting `card-action` with the `action` id
		 * otherwise. Null without a title.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-navigation-carries-a-card-and-a-help-entry
		 * @return {object|null}
		 */
		resolvedCard() {
			const declared = this.effectiveManifest?.nav?.card
			if (!declared || typeof declared !== 'object' || typeof declared.title !== 'string' || declared.title === '') {
				return null
			}
			const text = (value) => (typeof value === 'string' && value !== '' ? this.effectiveTranslate(value) : '')
			const card = { title: text(declared.title), text: text(declared.text), linkTag: '', linkAttrs: {}, linkLabel: '', action: '' }
			const link = declared.link
			if (link && typeof link === 'object' && typeof link.label === 'string' && link.label !== '') {
				card.linkLabel = text(link.label)
				if (link.route && this.$router) {
					card.linkTag = 'router-link'
					card.linkAttrs = { to: { name: link.route, ...(link.params && typeof link.params === 'object' ? { params: link.params } : {}) } }
				} else if (typeof link.href === 'string' && link.href !== '') {
					card.linkTag = 'a'
					card.linkAttrs = { href: link.href }
				} else if (typeof link.action === 'string' && link.action !== '') {
					card.linkTag = 'button'
					card.linkAttrs = { type: 'button' }
					card.action = link.action
				}
			}
			return card
		},

		/**
		 * The help entry (`nav.help`): `{ label, route?, href? }` rendered as
		 * a footer entry with a help icon. Null without a label or a target.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-navigation-carries-a-card-and-a-help-entry
		 * @return {{label: string, to?: object, href?: string}|null}
		 */
		resolvedHelp() {
			const declared = this.effectiveManifest?.nav?.help
			if (!declared || typeof declared !== 'object' || typeof declared.label !== 'string' || declared.label === '') {
				return null
			}
			if (declared.route && this.$router) {
				return { label: this.effectiveTranslate(declared.label), to: { name: declared.route }, href: undefined }
			}
			if (typeof declared.href === 'string' && declared.href !== '') {
				return { label: this.effectiveTranslate(declared.label), to: undefined, href: declared.href }
			}
			return null
		},

		/**
		 * Manifest-declared root-level primary action (`nav.primaryAction`)
		 * — retained for backwards compatibility with code that reads this
		 * computed. New code SHOULD read `activePrimaryAction` instead,
		 * which also handles the page-scoped override.
		 *
		 * @return {object|null} `{ label, icon?, route?, href?, id?, payload? }` or null.
		 */
		primaryAction() {
			return this.effectiveManifest?.nav?.primaryAction ?? null
		},

		/**
		 * Resolved primary action for the current route. Resolution order:
		 *  1. The current route's matching `pages[].primaryAction`
		 *  2. `manifest.nav.primaryAction` as app-wide default
		 *  3. `null` — no primary-action button renders
		 *
		 * Page-scoped declarations always win over the nav-root default. An
		 * action declaring `permission` or `visibleIf` is gated like a menu
		 * entry.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-navigation-primary-action-runs-a-page-action
		 * @return {object|null}
		 */
		activePrimaryAction() {
			const pages = this.effectiveManifest?.pages ?? []
			const routeName = this.$route?.name
			// The same `permission` / `visibleIf` gate a menu entry has: an
			// action the reader may not take, or that a condition hides, is
			// not drawn. A gated-out page action falls back to the nav one.
			const gated = (action) => (action && this.passesPermission(action) && this.passesVisibleIf(action) ? action : null)
			if (routeName) {
				const page = pages.find((p) => p.id === routeName)
				if (page && page.primaryAction) {
					const pageAction = gated(page.primaryAction)
					if (pageAction) {
						return pageAction
					}
				}
			}
			return gated(this.effectiveManifest?.nav?.primaryAction ?? null)
		},

		/**
		 * MDI icon component for the resolved primary action. Honors the
		 * action's `icon` field when set; falls back to the canonical
		 * `Plus` icon to match NC's NcAppNavigationNew default styling.
		 *
		 * @return {import('vue').Component}
		 */
		primaryActionIconComponent() {
			return this.mdiIconComponent(this.activePrimaryAction) ?? Plus
		},

		/**
		 * The CnActionButtons entry for a primary action that carries an
		 * `action` (`$defs/action`: open-form, navigate, api-call, ...):
		 * the action with the primary action's `id`, `label` and `icon`
		 * folded in and `variant: "primary"`. Null for a plain primary
		 * action, which keeps its link or button.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-navigation-primary-action-runs-a-page-action
		 * @return {object|null}
		 */
		primaryDispatchEntry() {
			const action = this.activePrimaryAction
			const inner = action && action.action
			if (!inner || typeof inner !== 'object' || typeof inner.type !== 'string') {
				return null
			}
			return {
				icon: action.icon || 'Plus',
				...inner,
				id: inner.id || action.id || 'primary-action',
				label: action.label,
				variant: 'primary',
			}
		},

		/**
		 * Link props for the primary action's button: an `href` opens in a
		 * new tab, a `route` is a router link. Null when the action is
		 * neither (or there is no router), so it stays a plain button.
		 *
		 * @return {object|null}
		 */
		primaryActionLink() {
			const action = this.activePrimaryAction
			if (!action) {
				return null
			}
			if (action.href) {
				return { href: action.href, target: '_blank' }
			}
			if (action.route && this.$router) {
				return { to: { name: action.route } }
			}
			return null
		},

		/**
		 * All visible items (filtered by permission and visibleIf conditions,
		 * sorted by order). Retained for backwards-compat with the previous
		 * public API and tests that read this computed; new code should use
		 * `mainItems` / `settingsItems` instead.
		 */
		visibleItems() {
			return (this.effectiveManifest?.menu ?? [])
				.filter((item) => this.passesPermission(item) && this.passesVisibleIf(item))
				.slice()
				.sort(byManifestOrder)
		},

		/**
		 * Items that render in the top list (default placement).
		 *
		 * Note the `=== 'main'` rather than a negated list: an entry whose
		 * section this component does not render must fall through to
		 * NOTHING, not to the main list. `section: "integrations"` is
		 * exactly that case — those entries render in CnAppRoot's
		 * per-user settings modal, not in the navigation (ADR-110) — and a
		 * `!== 'footer' && !== 'settings'` test would have quietly put
		 * every one of them back in the nav this contract removes them
		 * from.
		 */
		mainItems() {
			return this.visibleItems.filter((item) => (item.section ?? 'main') === 'main')
		},

		/**
		 * Items pinned to the bottom of the navigation (section:
		 * "footer") — rendered as flat NcAppNavigationItems above the
		 * settings foldout. For always-visible, non-settings entries:
		 * Documentation, Features & Roadmap, About.
		 */
		footerItems() {
			const footer = this.visibleItems.filter((item) => item.section === 'footer')
			const declared = this.declaredFooter
			if (declared === null) {
				return footer
			}
			// A declared footer (`nav.footer`) keeps only the entries it names,
			// in the order it names them.
			return declared
				.map((id) => footer.find((item) => item.id === id))
				.filter(Boolean)
		},

		/**
		 * The footer the manifest declares (`nav.footer`): an ordered list of
		 * menu entry ids plus the reserved ids `help` (the `nav.help` entry)
		 * and `settings` (the settings foldout). Null when the manifest
		 * declares none, which keeps today's footer: the help entry, then
		 * every `section: "footer"` entry, then the foldout.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-the-navigation-footer-can-be-declared
		 * @return {Array<string>|null}
		 */
		declaredFooter() {
			const declared = this.effectiveManifest?.nav?.footer
			if (!Array.isArray(declared)) {
				return null
			}
			return declared.filter((id) => typeof id === 'string' && id !== '')
		},

		/**
		 * Footer-section entries a declared footer leaves out. They move into
		 * the settings foldout rather than disappearing, so a page such as
		 * Store or Reports stays reachable. Empty without `nav.footer`.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-the-navigation-footer-can-be-declared
		 * @return {Array<object>}
		 */
		undeclaredFooterItems() {
			const declared = this.declaredFooter
			if (declared === null) {
				return []
			}
			return this.visibleItems.filter((item) => item.section === 'footer' && !declared.includes(item.id))
		},

		/**
		 * Whether the help entry renders: whenever it resolves, unless a
		 * declared footer leaves `help` out.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-the-navigation-footer-can-be-declared
		 * @return {boolean}
		 */
		showsHelp() {
			if (!this.resolvedHelp) {
				return false
			}
			return this.declaredFooter === null || this.declaredFooter.includes('help')
		},

		/**
		 * Whether the help entry goes AFTER the footer entries. Only a declared
		 * footer that names an entry before `help` puts it there; by default
		 * it leads the list.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-the-navigation-footer-can-be-declared
		 * @return {boolean}
		 */
		helpAfterItems() {
			const declared = this.declaredFooter
			if (declared === null) {
				return false
			}
			const help = declared.indexOf('help')
			return this.footerItems.some((item) => declared.indexOf(item.id) < help)
		},

		/**
		 * Whether the settings foldout goes ABOVE the footer list: only when a
		 * declared footer names `settings` before every other entry
		 * (`["settings", "help"]`, the board's "Instellingen" then "Hulp en
		 * uitleg"). Done with CSS `order` on the two siblings, so the markup
		 * of both stays as it is.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-the-navigation-footer-can-be-declared
		 * @return {boolean}
		 */
		settingsFirst() {
			const declared = this.declaredFooter
			return declared !== null && declared.indexOf('settings') === 0
		},

		/**
		 * Items that render INSIDE the NcAppNavigationSettings foldout
		 * (section: "settings"). The foldout is the NC-native gear-icon
		 * button that slides a panel open; these entries are app-level
		 * configuration pages (Forms, Pipelines, Automations, …). A declared
		 * footer (`nav.footer`) adds the footer entries it leaves out.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-2/specs/zuiddrecht-pixel-gaps-2/spec.md#requirement-the-navigation-footer-can-be-declared
		 * @return {Array<object>}
		 */
		settingsItems() {
			return [
				...this.visibleItems.filter((item) => item.section === 'settings'),
				...this.undeclaredFooterItems,
			]
		},

		/**
		 * Whether the settings foldout mounts. Mounts when there is at
		 * least one `section: "settings"` item OR personal settings is
		 * enabled — so every app shows a Settings gear with at least the
		 * auto-prepended "Personal settings" entry. Only fully suppressed
		 * when there are no settings items AND `nav.includePersonalSettings`
		 * is explicitly `false`.
		 *
		 * @return {boolean}
		 */
		showSettingsFoldout() {
			return this.settingsItems.length > 0 || this.includePersonalSettings
				|| this.roadmapEntry !== null || this.documentationEntry !== null
		},

		/**
		 * Whether to auto-prepend the "Personal settings" entry at the top
		 * of the foldout. On by default; opt out with
		 * `manifest.nav.includePersonalSettings: false` (e.g. when the app
		 * has no per-user NcAppSettingsDialog wired through
		 * cnOpenUserSettings).
		 *
		 * @return {boolean}
		 */
		includePersonalSettings() {
			return this.effectiveManifest?.nav?.includePersonalSettings !== false
		},

		/**
		 * Label for the foldout's gear button. Manifest override:
		 * `nav.settingsLabel`; defaults to "Advanced".
		 *
		 * @return {string}
		 */
		settingsFoldoutLabel() {
			const custom = this.effectiveManifest?.nav?.settingsLabel
			if (typeof custom === 'string' && custom.length > 0) {
				return this.effectiveTranslate(custom)
			}
			return t('nextcloud-vue', 'Advanced')
		},

		/**
		 * Label for the auto-prepended Personal-settings entry.
		 *
		 * @return {string}
		 */
		personalSettingsLabel() {
			return t('nextcloud-vue', 'Personal settings')
		},

		/**
		 * Optional "Features & roadmap" foldout entry. Enabled via
		 * `nav.includeRoadmap`; `nav.roadmapUrl` is treated as an external link
		 * when it looks like a URL, otherwise as an in-app router target.
		 *
		 * @return {{label: string, to: (string|null), href: (string|null)}|null}
		 */
		roadmapEntry() {
			const nav = this.effectiveManifest?.nav
			if (!nav || nav.includeRoadmap !== true) {
				return null
			}
			const label = (typeof nav.roadmapLabel === 'string' && nav.roadmapLabel)
				? this.effectiveTranslate(nav.roadmapLabel)
				: t('nextcloud-vue', 'Features & roadmap')
			const target = typeof nav.roadmapUrl === 'string' ? nav.roadmapUrl.trim() : ''
			const external = /^(https?:)?\/\//.test(target)
			return { label, to: (target && !external) ? target : null, href: external ? target : null }
		},

		/**
		 * Optional "Documentation" foldout entry. Enabled via
		 * `nav.includeDocumentation`; always an external link (`nav.documentationUrl`).
		 *
		 * @return {{label: string, href: string}|null}
		 */
		documentationEntry() {
			const nav = this.effectiveManifest?.nav
			if (!nav || nav.includeDocumentation !== true) {
				return null
			}
			const target = typeof nav.documentationUrl === 'string' ? nav.documentationUrl.trim() : ''
			if (!target) {
				return null
			}
			const label = (typeof nav.documentationLabel === 'string' && nav.documentationLabel)
				? this.effectiveTranslate(nav.documentationLabel)
				: t('nextcloud-vue', 'Documentation')
			return { label, href: target }
		},

		/**
		 * Label for the auto-prepended Admin-settings entry.
		 *
		 * @return {string}
		 */
		adminSettingsLabel() {
			return t('nextcloud-vue', 'Admin settings')
		},

		/**
		 * Accessible name (and hover tooltip) of the open-in-new marker on
		 * the Admin-settings entry — the visual cue that the link leaves
		 * the app for Nextcloud's own settings area.
		 *
		 * @return {string}
		 */
		opensInNewTabHint() {
			return t('nextcloud-vue', 'Opens in a new tab')
		},

		/**
		 * Resolved app id for the Admin-settings link — the explicit
		 * `appId` prop, else the `cnAppId` provided by CnAppRoot.
		 *
		 * @return {string}
		 */
		effectiveAppId() {
			const id = this.appId || this.cnAppId
			return (typeof id === 'string' && id.trim()) ? id.trim() : ''
		},

		/**
		 * Target of the Admin-settings entry: the app's section in
		 * Nextcloud's own admin settings (ADR-079 §1). This is a LINK, not
		 * a modal — the app never re-implements the settings surface, and
		 * the destination is authorized server-side by the settings
		 * framework.
		 *
		 * @return {string}
		 */
		adminSettingsHref() {
			if (!this.effectiveAppId) {
				return ''
			}
			// ABSOLUTE (same-origin) on purpose: NcAppNavigationItem renders
			// target="_blank" only for hrefs its isExternal() deems external
			// (scheme-prefixed) and ignores a passed `target` — a relative
			// path therefore always opens in the SAME tab. The absolute form
			// gets the new tab while keeping native anchor semantics
			// (middle-click, copy link).
			const path = generateUrl('/settings/admin/{appId}', { appId: this.effectiveAppId })
			const origin = (typeof window !== 'undefined' && window.location && window.location.origin) || ''
			return origin + path
		},

		/**
		 * Whether to show the Admin-settings link: the user administers the
		 * instance AND we can build a target. Visibility only — see the
		 * `isAdmin` prop docs; the access check lives in Nextcloud.
		 *
		 * @return {boolean}
		 */
		showAdminSettingsLink() {
			return this.isAdmin === true && this.adminSettingsHref !== ''
		},

		/**
		 * Route name of the menu item that best matches the current route.
		 * A direct match (current route name IS a menu target) wins;
		 * otherwise the current path is matched against each item's page
		 * path and the LONGEST prefix wins, so detail / nested routes (e.g.
		 * `/expenses/:id`) light up — and auto-expand — their index entry
		 * even though the detail route name is not in the menu. Longest
		 * prefix disambiguates nested namespaces (e.g. `/pos` vs
		 * `/pos/refunds`). An entry with `params` matches by its page path
		 * with those params filled in (see `pageMatchDepth`). Returns null
		 * when nothing matches.
		 *
		 * @return {string|null}
		 */
		activeRouteName() {
			const routeName = this.$route?.name
			const path = this.$route?.path
			const flat = []
			for (const item of this.visibleItems) {
				flat.push(item)
				for (const child of this.visibleChildren(item)) {
					flat.push(child)
				}
			}
			if (routeName && flat.some((it) => it.route === routeName)) {
				return routeName
			}
			if (!path) {
				return routeName ?? null
			}
			let best = null
			let bestDepth = 0
			for (const it of flat) {
				if (!it.route) {
					continue
				}
				const depth = this.pageMatchDepth(it, path)
				if (depth > bestDepth) {
					best = it.route
					bestDepth = depth
				}
			}
			return best ?? routeName ?? null
		},

		/**
		 * Every visible entry and child, flat, in menu order.
		 *
		 * @return {Array<object>} The entries.
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry
		 */
		flatEntries() {
			const flat = []
			for (const item of this.visibleItems) {
				flat.push(item, ...this.visibleChildren(item))
			}
			return flat
		},

		/**
		 * The entry the query rule marks while the reader is on a menu
		 * route itself (not on a page below it). Watched, so the nav can
		 * remember which entry of a route the reader last used.
		 *
		 * @return {object|null} The entry, or null on a page below a route.
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry
		 */
		entryActiveOnOwnRoute() {
			const routeName = this.$route?.name
			if (!routeName || routeName !== this.activeRouteName) {
				return null
			}
			return this.flatEntries.find((entry) => this.isActiveByRule(entry)) ?? null
		},

		/**
		 * The one entry to mark on a page BELOW a menu route when the query
		 * rule marks none.
		 *
		 * On a detail page (`/cases/123`) the active route is found by path
		 * prefix, and the address carries the detail page's query, not the
		 * list's. When every entry on that list has a `query` ("My work",
		 * "Queue"), none of them matched and the menu showed no place at
		 * all. Marking all of them is the defect the query rule ended, so
		 * this picks exactly one: the entry the reader last had active on
		 * that route, else the first in menu order.
		 *
		 * Null whenever the existing rule already marks an entry, so a list
		 * with an entry without a `query` behaves as it did. An entry with
		 * `params` is a candidate only when the current path sits below its
		 * own filled-in page path, so another param value is never marked.
		 *
		 * @return {object|null} The entry to mark, or null.
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry
		 */
		subRouteParent() {
			const active = this.activeRouteName
			if (!active || this.$route?.name === active) {
				return null
			}
			const path = this.$route?.path
			const entries = this.flatEntries.filter((entry) => !entry.href && entry.route === active
				&& (!this.hasParams(entry) || this.pageMatchDepth(entry, path) > 0))
			if (entries.length === 0 || entries.some((entry) => this.isActiveByRule(entry))) {
				return null
			}
			const remembered = this.lastActiveEntryByRoute[active]
			return entries.find((entry) => this.entryKey(entry) === remembered) ?? entries[0]
		},
	},

	watch: {
		activeRouteName: {
			immediate: true,
			handler(_current, previous) {
				this.pinGroupsEntered(previous)
			},
		},

		// The manifest can arrive after the route did.
		visibleItems() {
			this.pinGroupsEntered(this.activeRouteName)
		},

		entryActiveOnOwnRoute: {
			immediate: true,
			/**
			 * Remember which entry of a route the reader used, for
			 * `subRouteParent`.
			 *
			 * @param {object|null} entry The entry active on its own route.
			 * @return {void}
			 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry
			 */
			handler(entry) {
				if (entry && entry.route) {
					this.lastActiveEntryByRoute[entry.route] = this.entryKey(entry)
				}
			},
		},
	},

	created() {
		// Non-reactive one-shot latch for warnAutoCountMisconfigured(). It has
		// to be seeded here rather than lazily on first use: `resolveCount()`
		// runs DURING RENDER, and Vue 3's instance proxy emits
		// "Property "_autoCountWarned" was accessed during render but is not
		// defined on instance" for the first read of an unset instance field
		// (Vue 2 read it back as plain `undefined`, silently). It deliberately
		// stays out of `data()`: a reactive Set mutated inside render would
		// re-trigger the render effect.
		this._autoCountWarned = new Set()
		// Same latch, for warnUnfilledRouteParam() (`itemTo()` runs during render).
		this._unfilledParamWarned = new Set()
	},

	methods: {
		/**
		 * Resolve a menu item's `icon` string to an MDI Vue component. MDI names
		 * resolve via the per-app `registerIcons()` registry; legacy Nextcloud
		 * `icon-*` class names resolve via the shared `cssIconBridge` so they
		 * render monochrome (fill:currentColor) like every other glyph.
		 * Returns `null` (→ the `:icon="cssIconClass(item)"` CSS-class fallback)
		 * for unbridged `icon-*` names and unknown MDI names.
		 *
		 * @param {{ icon?: string }} item Menu item descriptor.
		 * @return {import('vue').Component|null}
		 */
		mdiIconComponent(item) {
			const icon = item?.icon
			if (typeof icon !== 'string' || icon.length === 0) {
				return null
			}
			if (icon.startsWith('icon-')) {
				return bridgedMdiForCssIcon(icon) || null
			}
			// ADR-077: the app's own registerIcons() entries win (so an app can
			// override), then the shared semantic vocabulary — which resolves
			// WITHOUT the app having registered anything. Before the vocabulary
			// existed, a name the app forgot to register resolved to null here
			// and the entry rendered with no icon at all.
			return ICON_MAP[icon] || getSemanticIconComponent(icon) || null
		},

		/**
		 * Whether the item declares an icon that NOTHING can resolve — not the
		 * app registry, not the semantic vocabulary, not the widget registry, and
		 * not a URL / SVG path.
		 *
		 * ADR-077 rule 4: such an icon MUST degrade to a visible fallback glyph.
		 * Historically it rendered as empty space, which is indistinguishable
		 * from a deliberate no-icon design choice — 29 of hrmq's 72 nav entries
		 * were silently blank this way. A visible "?" is discoverable; blank is
		 * not.
		 *
		 * `icon-*` values are excluded: those have their own CSS-class fallback
		 * path via the `cssIconClass` method.
		 *
		 * @param {{ icon?: string }} item Menu item descriptor.
		 * @return {boolean} true when the declared icon resolves to nothing.
		 */
		isUnresolvedIcon(item) {
			const icon = item?.icon
			if (typeof icon !== 'string' || icon.length === 0) {
				return false
			}
			if (icon.startsWith('icon-')) {
				return false
			}
			return !this.mdiIconComponent(item)
				&& !this.isRichIcon(item)
				&& !this.isRegistryIcon(item)
		},

		/**
		 * Whether the item's icon is a raw SVG path or an image URL (incl. the
		 * `data:` URIs the bundled NL-government sets emit) — neither of which is a
		 * component, so `ICON_MAP` can't resolve it and the `#icon` slot must
		 * render it through CnMenuItemIcon instead.
		 *
		 * Without this, an icon picked from CnIconBrowser's Gemeente / Den Haag /
		 * RVO tabs would simply not appear in the navigation.
		 *
		 * @param {{ icon?: string }} item Menu item descriptor.
		 * @return {boolean} true for path/URL icons.
		 */
		isRichIcon(item) {
			const icon = item?.icon
			if (typeof icon !== 'string' || icon.length === 0 || icon.startsWith('icon-')) {
				return false
			}
			return isCustomIconUrl(icon) || isSvgPath(icon)
		},

		/**
		 * Whether the item's icon is a plain MDI *name* that the shared widget-icon
		 * registry can render (e.g. "Heart", "Home" — what CnIconBrowser emits from
		 * its component-name sources).
		 *
		 * `ICON_MAP` only holds what the consuming app passed to `registerIcons()`,
		 * and an app rendering USER-AUTHORED manifests cannot pre-register whatever
		 * icon a user might pick — Buildiq registers none at all. So a picked name
		 * failed `mdiIconComponent` (not registered) AND `isRichIcon` (not a URL or
		 * SVG path), the `#icon` slot was skipped entirely, and the menu item rendered
		 * with NO icon — even though CnMenuItemIcon → CnWidgetIcon could resolve it.
		 *
		 * Gate on the registry actually HAVING the name: `getIconComponent` answers
		 * the default icon for anything unknown, so gating on it would render a wrong
		 * (but plausible) icon for a typo instead of none.
		 *
		 * @param {{ icon?: string }} item Menu item descriptor.
		 * @return {boolean} true when the widget-icon registry can render this name.
		 */
		isRegistryIcon(item) {
			return hasRegistryIcon(item?.icon)
		},

		/**
		 * Pass-through for the `:icon` prop on NcAppNavigationItem when
		 * the manifest declares a Nextcloud CSS-class icon (`icon-*`).
		 * Returns an empty string when the icon is an MDI name OR a bridged
		 * `icon-*` (rendered via the `#icon` slot instead), so NcAppNavigationItem
		 * doesn't also paint a CSS-class background-image.
		 *
		 * @param {{ icon?: string }} item Menu item descriptor.
		 * @return {string}
		 */
		cssIconClass(item) {
			const icon = item?.icon
			if (typeof icon !== 'string' || icon.length === 0) {
				return ''
			}
			if (!icon.startsWith('icon-')) {
				return ''
			}
			return bridgedMdiForCssIcon(icon) ? '' : icon
		},

		passesPermission(item) {
			if (!item.permission) {
				return true
			}
			if (!this.permissions || this.permissions.length === 0) {
				return true
			}
			return this.permissions.includes(item.permission)
		},

		/**
		 * Evaluate a menu item's `visibleIf` condition block.
		 *
		 * Returns `true` (visible) when:
		 *  - No `visibleIf` is declared (backwards-compatible default).
		 *  - `visibleIf.appInstalled` is set AND the named app is
		 *    installed / enabled (checked via `OC.appswebroots` then the
		 *    capabilities fallback, cached per page load by `isAppInstalled`).
		 *  - Context-path predicates (any key that is a dot-separated path
		 *    into `manifest.runtime`) all pass against the current runtime
		 *    data. Predicates are evaluated by `passesContextPredicates`.
		 *    Example: `{ "user.primaryRole": { "in": ["hr", "compliance"] } }`
		 *    hides the entry unless `manifest.runtime.user.primaryRole` is
		 *    `"hr"` or `"compliance"`. When the runtime block is absent the
		 *    entry is hidden (fail-safe: never show role-gated items to
		 *    unidentified users).
		 *
		 * All conditions are combined with implicit AND — every condition
		 * must pass for the item to render. Returns `false` when any fails.
		 *
		 * @param {object} item Menu item (or child) to evaluate.
		 * @return {boolean} Whether the item should render.
		 */
		passesVisibleIf(item) {
			const condition = item.visibleIf
			if (!condition || typeof condition !== 'object') {
				return true
			}

			// Specialised condition: appInstalled.
			if (condition.appInstalled) {
				if (!isAppInstalled(condition.appInstalled)) {
					return false
				}
			}

			// Context-path predicates: any non-reserved key is a dot-path
			// into manifest.runtime evaluated by passesContextPredicates.
			const runtime = this.effectiveManifest?.runtime ?? null
			if (!passesContextPredicates(condition, runtime)) {
				return false
			}

			return true
		},

		/**
		 * A group's visible children, in `order`.
		 *
		 * The SORT is the fix for a silent no-op: this used to filter only, so
		 * `order` on a child was accepted, documented and ignored. It bites
		 * hardest on relocated leaves, because `applyMenuRelocations()` walks
		 * the menu backwards and appends each move, which lands a group's
		 * children in REVERSE manifest order — an order nobody wrote down and
		 * no app can influence except by reordering `manifest.json` itself.
		 * Pipelinq's Customer Support group read "Projecten, My Work, Queue,
		 * Tasks, All tickets" against declared orders of 55, 20, 10, 60, 50.
		 *
		 * Same comparator as the top level, so one rule governs both: items
		 * without an `order` render last, in their existing relative order
		 * (Array.prototype.sort is stable).
		 *
		 * @param {object} item The group whose children to render.
		 * @return {Array<object>} Visible children, ordered.
		 */
		visibleChildren(item) {
			if (!Array.isArray(item.children)) {
				return []
			}
			return item.children
				.filter((c) => this.passesPermission(c) && this.passesVisibleIf(c))
				.sort(byManifestOrder)
		},

		/**
		 * The label an entry shows: run through the translate function, or
		 * as written when the entry sets `translateLabel: false` (a
		 * user-authored title that may equal a translation key). Every
		 * place the nav shows an entry's label reads it from here.
		 *
		 * @param {object} item Menu entry.
		 * @return {string} The label to render as text.
		 */
		resolveLabel(item) {
			if (item.translateLabel === false) {
				return item.label
			}
			return this.effectiveTranslate(item.label)
		},

		/**
		 * Whether a menu entry is the page the reader is on.
		 *
		 * Two entries may share a route and differ only in `query` ("My
		 * work" and "Queue" on one list). The route name alone lit both. An
		 * entry with a `query` is active only when the address carries that
		 * query; an entry without one steps back when a sibling's query
		 * matches, so exactly one of them is marked. `params` work the
		 * same way against the route's params, so of several entries on a
		 * `/items/:slug` route only the one whose `slug` is in the address
		 * is marked.
		 *
		 * On a page below a list where that rule marks nothing, the one
		 * entry `subRouteParent` picks is active instead.
		 *
		 * @param {object} item Menu entry.
		 * @return {boolean} True when the entry is the current page.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-menu-entries-that-differ-in-query
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry
		 */
		isActive(item) {
			if (this.isActiveByRule(item)) {
				return true
			}
			const parent = this.subRouteParent
			return parent !== null && toRaw(parent) === toRaw(item)
		},

		/**
		 * The route, query and params rule on its own, without the fallback
		 * for a page below a list. `subRouteParent` asks this to see whether
		 * the rule already marks an entry.
		 *
		 * @param {object} item Menu entry.
		 * @return {boolean} True when the rule marks the entry.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-menu-entries-that-differ-in-query
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry
		 */
		isActiveByRule(item) {
			if (item.href || !item.route) {
				return false
			}
			if (item.route !== this.activeRouteName) {
				return false
			}
			if (this.isNarrowed(item)) {
				return this.narrowingMatches(item)
			}
			return !this.flatEntries.some((entry) => entry !== item
				&& entry.route === item.route
				&& this.isNarrowed(entry)
				&& this.narrowingMatches(entry))
		},

		/**
		 * Whether an entry narrows its route with a `query` or `params`.
		 *
		 * @param {object} item Menu entry.
		 * @return {boolean} True when the entry declares either.
		 */
		isNarrowed(item) {
			return Boolean(item.query && typeof item.query === 'object') || this.hasParams(item)
		},

		/**
		 * Whether the address carries every `query` key and every `params`
		 * key the entry declares.
		 *
		 * @param {object} item Menu entry that narrows its route.
		 * @return {boolean} True when everything it declares matches.
		 */
		narrowingMatches(item) {
			const queryOk = !(item.query && typeof item.query === 'object') || this.queryMatches(item)
			const paramsOk = !this.hasParams(item) || this.paramsMatch(item)
			return queryOk && paramsOk
		},

		/**
		 * Whether an entry declares a non-empty `params` object.
		 *
		 * @param {object} item Menu entry.
		 * @return {boolean} True when it has route params.
		 */
		hasParams(item) {
			return Boolean(item?.params) && typeof item.params === 'object' && Object.keys(item.params).length > 0
		},

		/**
		 * Whether the route's params carry every key of an entry's
		 * `params`. Values are compared as strings.
		 *
		 * @param {object} item Menu entry with `params`.
		 * @return {boolean} True when every declared key matches.
		 */
		paramsMatch(item) {
			const current = this.$route?.params ?? {}
			return Object.keys(item.params).every((key) => String(current[key] ?? '') === String(item.params[key]))
		},

		/**
		 * The segments of an entry's page path with its `params` filled in,
		 * as plain values. A missing optional `:name?` segment is dropped;
		 * null when a required one has no param, or without a page.
		 *
		 * @param {object} item Menu entry with `params`.
		 * @return {Array<string>|null} The segments, or null.
		 */
		filledPageSegments(item) {
			const pagePath = this.pageForItem(item)?.route
			if (!pagePath) {
				return null
			}
			const segments = []
			for (const part of pagePath.split('/').filter(Boolean)) {
				const param = PARAM_SEGMENT.exec(part)
				if (!param) {
					segments.push(part)
					continue
				}
				const value = item.params?.[param[1]]
				if (isFilled(value)) {
					segments.push(String(value))
				} else if (!isOptionalParam(param)) {
					return null
				}
			}
			return segments
		},

		/**
		 * The required route param the router cannot fill when it resolves
		 * an entry's link on its manifest page. vue-router fills a named
		 * link's required params from the current route, then overlays every
		 * key the entry declares, empty or null included. So a declared key
		 * decides on its own value, and only an undeclared one falls back
		 * to the current route. Null without a known page, or when every
		 * required segment is filled. Reads `$route`, so it follows
		 * navigation.
		 *
		 * @param {object} item Menu entry.
		 * @return {string|null} The param name, or null.
		 */
		unfilledRouteParam(item) {
			const pagePath = this.pageForItem(item)?.route
			if (!pagePath) {
				return null
			}
			const declared = item.params && typeof item.params === 'object' ? item.params : {}
			const current = this.$route?.params ?? {}
			for (const part of pagePath.split('/')) {
				const param = PARAM_SEGMENT.exec(part)
				if (!param || isOptionalParam(param)) {
					continue
				}
				const value = param[1] in declared ? declared[param[1]] : current[param[1]]
				if (!isFilled(value)) {
					return param[1]
				}
			}
			return null
		},

		/**
		 * How deep a path sits on an entry's page path: the page path's
		 * segment count when the path is that page or below it, else 0.
		 * A `/` page path, or one with an unfilled `:name`, never matches.
		 *
		 * Without `params` the page path is compared as written. With
		 * `params`, segments are compared decoded, because the router
		 * percent-encodes param values in the path and the entry holds them
		 * plain.
		 *
		 * @param {object} item Menu entry.
		 * @param {string|undefined} path The path to test.
		 * @return {number} The depth of the match, or 0.
		 */
		pageMatchDepth(item, path) {
			if (!path) {
				return 0
			}
			if (!this.hasParams(item)) {
				const pagePath = this.pageForItem(item)?.route
				if (!pagePath || pagePath === '/' || pagePath.includes(':')) {
					return 0
				}
				const below = path === pagePath || path.startsWith(pagePath + '/')
				return below ? pagePath.split('/').filter(Boolean).length : 0
			}
			const segments = this.filledPageSegments(item)
			if (!segments || segments.length === 0) {
				return 0
			}
			const current = path.split('/').filter(Boolean).map(decodeSegment)
			return segments.every((segment, index) => current[index] === segment) ? segments.length : 0
		},

		/**
		 * What an entry is remembered by: its `id`, else its label.
		 *
		 * @param {object} item Menu entry.
		 * @return {string} The key.
		 * @spec openspec/changes/live-check-follow-ups/specs/live-check-follow-ups/spec.md#requirement-a-page-below-a-list-marks-one-menu-entry
		 */
		entryKey(item) {
			return String(item.id ?? item.label ?? '')
		},

		/**
		 * Whether the address carries every key of an entry's `query`.
		 * Values are compared as strings, since an address has no numbers.
		 *
		 * @param {object} item Menu entry with a `query`.
		 * @return {boolean} True when every declared key matches.
		 * @spec openspec/changes/link-cards-page/specs/link-cards-page/spec.md#requirement-menu-entries-that-differ-in-query
		 */
		queryMatches(item) {
			const current = this.$route?.query ?? {}
			const keys = Object.keys(item.query)
			return keys.length > 0 && keys.every((key) => String(current[key] ?? '') === String(item.query[key]))
		},

		/**
		 * Whether a menu entry renders as a `NcAppNavigationCaption`
		 * (`type: "caption"`) rather than a clickable
		 * `NcAppNavigationItem`. Caption entries ignore `route`, `href`,
		 * `action`, `icon`, `count`, `children`, and `pinned`.
		 *
		 * @param {{ type?: string }} item Menu entry descriptor.
		 * @return {boolean}
		 */
		isCaption(item) {
			return item?.type === 'caption'
		},

		/**
		 * Whether the host has registered a scoped slot named
		 * `item-${id}-actions` for this menu item. Used to gate template
		 * rendering of the per-item `#actions` slot pass-through so items
		 * without a matching slot don't render an empty `<template #actions>`.
		 *
		 * @param {{ id: string }} item Menu entry descriptor.
		 * @return {boolean}
		 */
		hasItemActionsSlot(item) {
			if (!item?.id) {
				return false
			}
			const name = `item-${item.id}-actions`
			return Boolean((this.$slots && this.$slots[name])
				|| (this.$slots && this.$slots[name]))
		},

		/**
		 * Resolve the count value to render in this entry's
		 * `NcCounterBubble` (in the `#counter` slot of
		 * `NcAppNavigationItem`).
		 *
		 *  - Literal positive integer in `item.count` → return as-is.
		 *  - `item.count` is an object (`{ register, schema, filter? }`) →
		 *    `cnMenuItemCounts[item.id] ?? null`, the filtered total CnAppRoot
		 *    fetched for this entry.
		 *  - `item.count === "auto"` → look up the entry's resolved page;
		 *    when that page is `type: "index"` with a `register`/`schema`
		 *    in its `config`, return
		 *    `cnMenuCounts[register][schema] ?? null`.
		 *
		 * Returns `null` (no badge) when:
		 *  - `item.count` is unset or falsy
		 *  - The literal value is `0`
		 *  - `count === "auto"` but no matching index page resolves
		 *    (also emits a one-shot `console.warn`)
		 *  - The store has no entry for the resolved `(register, schema)`
		 *
		 * @param {object} item Menu entry descriptor.
		 * @return {number|null} Count to render, or null for no badge.
		 */
		resolveCount(item) {
			const raw = item?.count
			if (raw === undefined || raw === null) {
				return null
			}
			if (typeof raw === 'number') {
				return raw > 0 ? raw : null
			}
			if (raw && typeof raw === 'object') {
				// A filtered count: CnAppRoot fetched it per entry id.
				const value = this.cnMenuItemCounts?.[item.id]
				return (typeof value === 'number' && value > 0) ? value : null
			}
			if (raw !== 'auto') {
				return null
			}
			const page = this.pageForItem(item)
			const register = page?.config?.register
			const schema = page?.config?.schema
			if (page?.type !== 'index' || !register || !schema) {
				this.warnAutoCountMisconfigured(item)
				return null
			}
			const value = this.cnMenuCounts?.[register]?.[schema]
			if (typeof value !== 'number' || value <= 0) {
				return null
			}
			return value
		},

		/**
		 * One-shot `console.warn` per menu-item id for misconfigured
		 * `count: "auto"` entries (no resolvable index page). Keeps the
		 * console quiet on re-renders.
		 *
		 * @param {{ id: string }} item Menu entry descriptor.
		 * @return {void}
		 * @private
		 */
		warnAutoCountMisconfigured(item) {
			if (this._autoCountWarned.has(item.id)) {
				return
			}
			this._autoCountWarned.add(item.id)
			// eslint-disable-next-line no-console
			console.warn(`[CnAppNav] Menu entry "${item.id}" declares count: "auto" but has no resolvable index-type page with register + schema config — no badge will render.`)
		},

		/**
		 * One-shot `console.warn` per menu entry whose link cannot fill a
		 * required route param. Keyed by `id`, else route and label, so
		 * entries without an id each get their own warning.
		 *
		 * @param {{ id?: string, route: string, label?: string }} item Menu entry descriptor.
		 * @param {string} param The unfilled param name.
		 * @return {void}
		 * @private
		 */
		warnUnfilledRouteParam(item, param) {
			const key = item.id ?? `${item.route}|${item.label ?? ''}`
			if (this._unfilledParamWarned.has(key)) {
				return
			}
			this._unfilledParamWarned.add(key)
			const name = item.id ?? item.label ?? item.route
			// eslint-disable-next-line no-console
			console.warn(`[CnAppNav] Menu entry "${name}" cannot fill the required route param "${param}" of page "${item.route}" from its params or the current route — the entry renders without a link.`)
		},

		/**
		 * Look up an item's resolved page (`pages[]` entry whose `id`
		 * matches the menu item's `route`) — used to decide whether the
		 * NcAppNavigationItem should match its router-link `exact`.
		 *
		 * @param {object} item Menu item to resolve.
		 * @return {object|null} Matching page entry, or null when the item
		 *   has no `route` or no page matches.
		 */
		pageForItem(item) {
			if (!item.route) {
				return null
			}
			const pages = this.effectiveManifest?.pages ?? []
			return pages.find((p) => p.id === item.route) ?? null
		},

		/**
		 * Build the `:to` value for an `NcAppNavigationItem`. Action
		 * items (`action: "user-settings"`) and `href` items return
		 * `null` so the entry is NOT a vue-router link: action items
		 * fall through to the click handler, `href` items render a real
		 * anchor via `itemHref`. Route items return a named route that
		 * carries the item's `params` and `query` when it declares them.
		 *
		 * An item whose manifest page has a required segment that neither
		 * its `params` nor the current route fill also returns null, with a
		 * one-time warning: the router throws resolving such a link, which
		 * would take the whole navigation down rather than that one entry.
		 *
		 * @param {object} item Menu item being rendered.
		 * @return {object|null} A `{ name, params?, query? }` route object,
		 *   or null for action / href / route-less / unfillable items.
		 */
		itemTo(item) {
			if (item.action) {
				return null
			}
			if (item.href) {
				return null
			}
			if (!item.route) {
				return null
			}
			const unfilled = this.unfilledRouteParam(item)
			if (unfilled) {
				this.warnUnfilledRouteParam(item, unfilled)
				return null
			}
			const to = { name: item.route }
			// Params fill a parameterised route (one entry per catalog →
			// /catalogs/:slug); query deep-links to a pre-filtered index page
			// (one entry per case type → Cases?caseType=…).
			if (this.hasParams(item)) {
				to.params = item.params
			}
			if (item.query) {
				to.query = item.query
			}
			return to
		},

		/**
		 * Whether another visible entry links to the same route, so the two
		 * differ only in `query` or `params` ("All cases" and "Woo requests"
		 * on one list).
		 *
		 * @param {object} item Menu entry.
		 * @return {boolean} True when the route is shared.
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-only-the-best-matching-menu-entry-is-active
		 */
		sharesRoute(item) {
			if (!item || item.href || item.action || !item.route) {
				return false
			}
			return this.flatEntries.some((entry) => entry !== item && !entry.href && !entry.action && entry.route === item.route)
		},

		/**
		 * The app's router, or null when the nav is mounted without one. Read
		 * from the app's global properties: `this.$router` warns during render
		 * on an instance that has none.
		 *
		 * @return {object|null} The router.
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-only-the-best-matching-menu-entry-is-active
		 */
		appRouter() {
			return this.$?.appContext?.config?.globalProperties?.$router ?? null
		},

		/**
		 * The `:to` an entry renders with. An entry that shares its route
		 * renders as a plain link instead (see `linkHref`): NcAppNavigationItem
		 * marks a router link active whenever vue-router calls it active, and
		 * vue-router ignores the query, so "Woo requests" lit up beside "All
		 * cases" on the unfiltered list. As a plain link only `isActive`
		 * decides, which marks the entry that matches best.
		 *
		 * @param {object} item Menu entry.
		 * @return {object|null} The router target, or null.
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-only-the-best-matching-menu-entry-is-active
		 */
		linkTo(item) {
			if (this.appRouter() && this.sharesRoute(item)) {
				return null
			}
			return this.itemTo(item)
		},

		/**
		 * The `:href` an entry renders with: `itemHref`, or for an entry that
		 * shares its route the address vue-router resolves its target to (a
		 * click on it is still routed in the app, see `onItemClick`).
		 *
		 * @param {object} item Menu entry.
		 * @return {string|null} The address, or null.
		 * @spec openspec/changes/zuiddrecht-pixel-gaps-3/specs/zuiddrecht-pixel-gaps-3/spec.md#requirement-only-the-best-matching-menu-entry-is-active
		 */
		linkHref(item) {
			const own = this.itemHref(item)
			const router = this.appRouter()
			if (own || !router || !this.sharesRoute(item)) {
				return own
			}
			const to = this.itemTo(item)
			return to ? router.resolve(to).href : null
		},

		/**
		 * Build the `:href` value for an `NcAppNavigationItem`. Returns
		 * the item's `href` so the entry renders as a real anchor whose
		 * destination is visible on hover and which gets the native link
		 * cursor. `NcAppNavigationItem` adds `target="_blank"` itself for
		 * external (`scheme://`) URLs, so those open in a new tab while
		 * internal app paths (e.g. `/index.php/apps/foo/`) navigate in the
		 * same tab — no `window.open` interception. The `admin-settings`
		 * action links to `adminSettingsHref` (absolute, so it opens in a
		 * new tab); other action items carry no href. Returns `null` for
		 * non-href items so the entry stays a router-link / button.
		 *
		 * @param {object} item Menu item being rendered.
		 * @return {string|null} The destination URL, or null.
		 */
		itemHref(item) {
			if (item.action === 'admin-settings') {
				return this.adminSettingsHref || null
			}
			if (item.action) {
				return null
			}
			return item.href || null
		},

		/**
		 * Whether a menu group renders expanded. Local `openState` (set
		 * by the chevron, a title click, or `pinGroupsEntered`) wins;
		 * otherwise the group auto-expands when it contains the active
		 * route — so deep-linking to a child page reveals which group it
		 * lives in — and finally falls back to the manifest's `item.open`
		 * for the initial render.
		 *
		 * @param {{ id: string, open?: boolean }} item Menu entry descriptor.
		 * @return {boolean}
		 */
		isItemOpen(item) {
			const local = this.openState[item.id]
			if (local !== undefined) {
				return local
			}
			if (this.hasActiveChild(item)) {
				return true
			}
			return Boolean(item.open)
		},

		/**
		 * Whether any of a group's visible children is the active route.
		 * Drives auto-expansion of the parent group on page load.
		 *
		 * @param {object} item Menu entry descriptor.
		 * @return {boolean}
		 */
		hasActiveChild(item) {
			return this.visibleChildren(item).some((child) => this.isActive(child))
		},

		/**
		 * Record a group's expand/collapse state. Bound to
		 * NcAppNavigationItem's `@update:open` (chevron clicks) and
		 * called from `onItemClick` for title clicks on route-less
		 * group items.
		 *
		 * @param {{ id: string }} item Menu entry descriptor.
		 * @param {boolean} value New open state.
		 */
		setItemOpen(item, value) {
			this.openState[item.id] = value
		},

		/**
		 * Pin open every group the active route just entered.
		 *
		 * Auto-expansion used to be read off the route alone, so a group
		 * opened for a deep link collapsed the moment the route left it. A
		 * group opened for you stays open until you close it. Only a group
		 * the route ENTERS is pinned: one you closed while on one of its
		 * children stays closed while you move between them.
		 *
		 * @param {string|null} previousRoute The active route before this change, or undefined at first render.
		 */
		pinGroupsEntered(previousRoute) {
			for (const item of this.visibleItems) {
				const children = this.visibleChildren(item)
				if (children.length === 0 || !this.hasActiveChild(item)) {
					continue
				}
				const wasInside = children.some((child) => child.route === previousRoute)
				if (!wasInside || this.openState[item.id] === undefined) {
					this.openState[item.id] = true
				}
			}
		},

		/**
		 * Click handler. Dispatch order: action keyword → group
		 * open/toggle. For `action: "user-settings"` invokes the injected
		 * `cnOpenUserSettings` (provided by CnAppRoot) and prevents
		 * default; `action: "admin-settings"` is a real link to
		 * `/settings/admin/<appId>` (see `itemHref`) and is left to the
		 * browser; for `action:
		 * "replay-walkthrough"` invokes the injected
		 * `cnReplayWalkthrough(item.tourId)` and prevents default. `href`
		 * items with no children are NOT handled here — they render a real
		 * anchor via `itemHref`, so the browser navigates natively
		 * (external URLs open in a new tab, internal app paths in the same
		 * tab).
		 *
		 * A group's children visibility on click depends on whether the
		 * group ITSELF has a destination:
		 *  - Route-less, href-less: a pure group header, so its anchor is
		 *    a dead `#` link and the click's only job is to TOGGLE the
		 *    children open/closed (same effect as the collapse chevron).
		 *  - Carries a `route` or `href`: the click is a real navigation
		 *    (handled natively by `:to` / the anchor, not prevented here),
		 *    and this additionally forces the group OPEN — never closed —
		 *    so the reader lands on the group's own page without a second
		 *    click to see what else it holds. The collapse chevron is the
		 *    only control that can close such a group again.
		 *
		 * @param {object} item Menu item being clicked.
		 * @param {Event} [event] Native click event (used to call
		 *   preventDefault for action / group links).
		 */
		onItemClick(item, event) {
			if (item.action === 'user-settings') {
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault()
				}
				this.cnOpenUserSettings()
				return
			}
			if (item.action === 'admin-settings') {
				// ADR-079: a real link to Nextcloud's own settings (see
				// itemHref), followed natively in a new tab. Without an app
				// id there is no href, and the click does nothing.
				if (!this.adminSettingsHref && event && typeof event.preventDefault === 'function') {
					event.preventDefault()
				}
				return
			}
			if (item.action === 'replay-walkthrough') {
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault()
				}
				this.cnReplayWalkthrough(item.tourId)
				return
			}
			// An entry that shares its route is a plain link (see linkTo); a
			// plain click still navigates inside the app. A modified click
			// (new tab, new window) is left to the browser.
			if (this.appRouter() && this.sharesRoute(item) && event && !event.defaultPrevented
				&& !(event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) && event.button !== 1) {
				const to = this.itemTo(item)
				if (to) {
					event.preventDefault()
					this.appRouter().push(to).catch(() => {})
				}
			}
			// An entry left without a link (see itemTo) renders a `#` anchor;
			// following it would change the address, so the click goes nowhere.
			if (!item.href && this.unfilledRouteParam(item) && event && typeof event.preventDefault === 'function') {
				event.preventDefault()
			}
			if (this.visibleChildren(item).length === 0) {
				return
			}
			if (!item.route && !item.href) {
				if (event && typeof event.preventDefault === 'function') {
					event.preventDefault()
				}
				this.setItemOpen(item, !this.isItemOpen(item))
				return
			}
			// The item is ALSO a real destination: let the click navigate
			// natively and reveal the children alongside it.
			this.setItemOpen(item, true)
		},

		/**
		 * Click handler for the auto-prepended Personal-settings entry in
		 * the settings foldout. Invokes the injected `cnOpenUserSettings`
		 * (provided by CnAppRoot → opens the host's NcAppSettingsDialog).
		 * No-op inject when mounted standalone.
		 *
		 * @return {void}
		 */
		onPersonalSettingsClick() {
			this.cnOpenUserSettings()
		},

		/**
		 * Click handler for the manifest-declared primary action. Emits
		 * `@primary-action` AND the back-compat `@primary-action-click`
		 * event for host-side handling. Navigation is the link's own: an
		 * `href` or `route` action renders as a real link (see
		 * `primaryActionLink`), so the browser or router follows it after
		 * these events. Not invoked when the host overrides the
		 * `#primary-action` slot (it provides its own handler).
		 *
		 * @return {void}
		 */
		/**
		 * Re-emit the object an `open-form` primary action created, so the
		 * host can refresh a list or open the record.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-a-navigation-primary-action-runs-a-page-action
		 * @param {object} created The created object.
		 * @return {void}
		 */
		onPrimaryActionCreated(created) {
			/**
			 * @event primary-action-created Emitted after an `open-form` primary action saves. Payload: the created object.
			 */
			this.$emit('primary-action-created', created)
		},

		/**
		 * A card link that is a button (an `action` id) emits `card-action`
		 * with that id for the host to run; links and anchors navigate on
		 * their own.
		 *
		 * @spec openspec/changes/zuiddrecht-pixel-gaps/specs/zuiddrecht-pixel-gaps/spec.md#requirement-the-navigation-carries-a-card-and-a-help-entry
		 * @return {void}
		 */
		onCardLinkClick() {
			const card = this.resolvedCard
			if (card && card.action) {
				/**
				 * @event card-action Emitted when the nav card's link is an action button. Payload: the action id.
				 */
				this.$emit('card-action', card.action)
			}
		},

		onPrimaryActionClick() {
			const action = this.activePrimaryAction
			if (!action) {
				return
			}
			const payload = {
				id: action.id,
				label: action.label,
				icon: action.icon,
				route: action.route,
				href: action.href,
				payload: action.payload,
				page: this.$route?.name,
			}
			/**
			 * @event primary-action Emitted when the resolved primary-action button is clicked. Payload includes the action descriptor (`{ id, label, icon, route, href, payload }`) plus the current `page` (route name) for host dispatchers.
			 * @type {{ id?: string, label: string, icon?: string, route?: string, href?: string, payload?: unknown, page?: string }}
			 */
			this.$emit('primary-action', payload)
			/**
			 * @event primary-action-click Back-compat alias for `@primary-action`. Payload is the resolved primary action object as declared in the manifest.
			 */
			this.$emit('primary-action-click', action)
		},
	},
}
</script>

<style>
/* The emblem beside the app name (`nav.brand.emblem`). A theme sets
   --nldesign-emblem-url for `emblem: true`, and --cn-nav-emblem-size for both. */
.cn-app-nav__brand-emblem {
	flex: none;
	height: var(--cn-nav-emblem-size, 34px);
	width: auto;
	object-fit: contain;
}

.cn-app-nav__brand-emblem--theme {
	display: inline-block;
	width: var(--cn-nav-emblem-size, 34px);
	background: var(--nldesign-emblem-url) center / contain no-repeat;
}

/* The solid primary action (`solid: true`, or an action that dispatches):
   one full-width primary button, as the board draws "New case". */
.cn-app-nav__primary-action--solid .cn-action-buttons,
.cn-app-nav__primary-action--solid .cn-action-buttons .button-vue,
.cn-app-nav__primary-action--solid .button-vue {
	width: 100%;
	justify-content: center;
}

/* The card above the footer entries (`nav.card`). Theme hooks:
   --cn-nav-card-background and --cn-nav-card-radius. */
.cn-app-nav__card {
	display: flex;
	flex-direction: column;
	gap: calc(2 * var(--default-grid-baseline));
	margin: calc(2 * var(--default-grid-baseline));
	padding: calc(4 * var(--default-grid-baseline));
	border-radius: var(--cn-nav-card-radius, var(--border-radius-large));
	background: var(--cn-nav-card-background, var(--color-background-hover));
}

.cn-app-nav__card-title {
	color: var(--color-main-text);
	font-weight: 700;
}

.cn-app-nav__card-text {
	color: var(--color-text-maxcontrast);
	line-height: 1.4;
}

.cn-app-nav__card-link {
	align-self: flex-start;
	margin: 0;
	padding: 0;
	border: 0;
	background: none;
	color: var(--color-primary-element);
	font: inherit;
	font-weight: 600;
	text-decoration: none;
	cursor: pointer;
}

.cn-app-nav__card-link:hover,
.cn-app-nav__card-link:focus-visible {
	text-decoration: underline;
}

.cn-app-nav__card-link:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
	border-radius: var(--border-radius-small, 4px);
}

/* The brand block at the top of the navigation. */
.cn-app-nav__brand {
	align-items: center;
	display: flex;
	gap: calc(2.5 * var(--default-grid-baseline));
	min-width: 0;
	padding: calc(2 * var(--default-grid-baseline)) calc(2 * var(--default-grid-baseline)) calc(3 * var(--default-grid-baseline));
}

.cn-app-nav__brand-logo {
	flex: none;
	height: 34px;
	max-width: 50%;
	object-fit: contain;
	width: auto;
}

.cn-app-nav__brand-text {
	display: flex;
	flex-direction: column;
	line-height: 1.15;
	min-width: 0;
}

.cn-app-nav__brand-name {
	color: var(--color-main-text);
	font-size: 1.2em;
	font-weight: 700;
	overflow-wrap: anywhere;
}

.cn-app-nav__brand-caption {
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
	overflow-wrap: anywhere;
}

/*
 * The legacy `icon-*` classes in Nextcloud render a background-image
 * with a hardcoded dark fill, so they stay grey when an entry becomes
 * active (text turns white against the primary-element background).
 * Force the icon to white in the active state to match the label.
 * Only applies when the icon is provided via the `icon` prop (CSS
 * class) — items using a `<template #icon>` MDI component already
 * inherit `currentColor`.
 */
.app-navigation-entry.active .app-navigation-entry-icon[class*="icon-"] {
	filter: brightness(0) invert(1);
}

/* The link form of the primary action, matching NcAppNavigationNew's scoped layout. */
.cn-app-nav__primary-action {
	display: block;
	padding: calc(var(--default-grid-baseline, 4px) * 2);
}

/*
 * The primary action never shrinks out of sight. NcAppNavigation renders it in
 * `.app-navigation__body`, a flex child with `overflow-y: scroll` (so its
 * minimum height is 0) beside a list of `height: 100%` and the footer. With a
 * card and footer entries below the list, the column overflows and the body
 * gives up its share of the shrink: "New case" showed as a 24px sliver of a
 * 42px button. All three forms carry `.app-navigation-new` (the solid and
 * link wrappers mirror NcAppNavigationNew's class), and the rule is scoped to
 * this component's navigation, so a navigation without a primary action lays
 * out exactly as before.
 */
.app-navigation[data-testid="cn-nav"] .app-navigation__body:has(> .app-navigation-new) {
	flex-shrink: 0;
}

/*
 * Footer-section items (section: "footer") render in NcAppNavigation's
 * #footer slot, outside the scroll container, so they stay visible above
 * the settings foldout regardless of menu length. (The interim
 * `pinned`-prop approach kept them inside the scrollable list, where
 * `margin-top: auto` only bottom-pins while the list does not overflow —
 * long menus showed Documentation / Features & roadmap mid-scroll.)
 *
 * No `padding` here on purpose: it comes from NcAppNavigationList's own
 * `var(--app-navigation-padding)`, so it stays in step with the main list.
 *
 * As a direct `> ul` child of `.app-navigation__content`, NC makes it a
 * shrinkable, scrollable flex item, and NcAppNavigationList adds
 * `overflow-y: auto` besides. That let a two-entry list be squeezed below its
 * content and grow a scrollbar on a short menu, so opt out of both.
 */
.cn-app-nav__footer-list {
	list-style: none;
	margin: 0;
	flex-shrink: 0 !important;
	overflow: visible !important;
}

/*
 * A declared footer that names `settings` first (`nav.footer`) puts the
 * foldout above the footer list. The two are siblings in NcAppNavigation's
 * flex column, so `order` moves them without changing either's markup; the
 * card above keeps order 0 and stays first.
 */
.cn-app-nav__settings--first {
	order: 1;
}

.cn-app-nav__footer-list--after-settings {
	order: 2;
}

/*
 * Align the settings foldout's items with the main/footer list items,
 * whose icons sit at a 16px inset. The foldout's items live in a bare
 * <ul> inside NcAppNavigationSettings' panel (`#app-settings`, padding
 * 3px), so without this they start ~5px further left and the icon
 * column looks ragged. (The native settings-toggle button sits ~1px
 * left of the 16px baseline, but NC owns that with an !important
 * shorthand — a sub-pixel difference we leave to the native component.)
 */
.cn-app-nav__settings-list {
	list-style: none;
	margin: 0;
	padding-inline-start: 5px;
}
</style>
