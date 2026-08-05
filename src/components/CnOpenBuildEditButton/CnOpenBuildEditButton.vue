<!--
  CnOpenBuildEditButton — the universal in-app edit entry point (ADR-041).

  A Conduction-orange icon button bearing the OpenBuild glyph, meant to sit
  immediately to the right of a page's refresh control. It renders nothing
  unless `available` is true, and is deliberately OpenBuild-agnostic: it never
  imports OpenBuild app code and never calls `useAppStatus` — availability is
  passed in (wire it from `useOpenBuildEditAvailability()`).

  Its action menu drives the shared `useManifestEditor` instance (passed as
  `editor`): Edit page ⇄ Save page, Add widget (disabled unless editing),
  Edit menu…, Edit sidebar…. Save emits `@save(delta)` with the minimal delta.
-->
<template>
	<div v-if="isAvailable" class="cn-openbuild-edit">
		<NcActions
			v-model:open="menuOpen"
			:aria-label="t('nextcloud-vue', 'Edit with OpenBuild')"
			:class="['cn-openbuild-edit__actions', { 'cn-openbuild-edit__actions--editing': isEditing }]">
			<template #icon>
				<svg class="cn-openbuild-edit__glyph"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true">
					<path d="M12 0L3 7L4.63 8.27L12 14L19.36 8.27L21 7L12 0M19.37 10.73L12 16.47L4.62 10.74L3 12L12 19L21 12L19.37 10.73M19.37 15.73L12 21.47L4.62 15.74L3 17L12 24L21 17L19.37 15.73Z" />
				</svg>
			</template>

			<!-- Save keeps the menu open while persisting so the spinner that
			     replaces the save icon stays visible; onToggleEdit closes it
			     once the async save settles. -->
			<NcActionButton :close-after-click="false" :disabled="saving" @click="onToggleEdit">
				<template #icon>
					<NcLoadingIcon v-if="saving" :size="20" />
					<Pencil v-else-if="!isEditing" :size="20" />
					<ContentSave v-else :size="20" />
				</template>
				{{ saving ? t('nextcloud-vue', 'Saving…') : (isEditing ? t('nextcloud-vue', 'Save page') : t('nextcloud-vue', 'Edit page')) }}
			</NcActionButton>

			<!-- Widget grids live on dashboard pages and (since the detail-grid
			     change) detail pages, whose body is an adjustable grid seeded with
			     Data + Related. Index/custom pages have no widget slots, so hide
			     Add widget there. -->
			<NcActionButton v-if="pageSupportsWidgets"
				:disabled="!isEditing"
				:close-after-click="true"
				@click="onAddWidget">
				<template #icon>
					<Plus :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Add widget…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditPages">
				<template #icon>
					<FileMultiple :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit pages…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditMenu">
				<template #icon>
					<MenuIcon :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit menu…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditSidebar">
				<template #icon>
					<PageLayoutSidebarRight :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit sidebar…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditActions">
				<template #icon>
					<GestureTapButton :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit actions…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditSettings">
				<template #icon>
					<Cog :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit settings…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditSetup">
				<template #icon>
					<AutoFix :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit setup wizard…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditWalkthrough">
				<template #icon>
					<MapMarkerPath :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit walkthrough…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditSupport">
				<template #icon>
					<HeartOutline :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit support &amp; donation…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditData">
				<template #icon>
					<Database :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit data…') }}
			</NcActionButton>

			<NcActionButton :close-after-click="true" @click="onEditFlows">
				<template #icon>
					<Sitemap :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Edit flows…') }}
			</NcActionButton>

			<NcActionButton v-if="isEditing" :close-after-click="true" @click="onCancel">
				<template #icon>
					<Close :size="20" />
				</template>
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcActionButton>
		</NcActions>

		<CnEditPagesModal
			v-if="showPagesModal"
			:working="workingManifest"
			@close="showPagesModal = false" />
		<CnEditMenuModal
			v-if="showMenuModal"
			:working="workingManifest"
			@close="showMenuModal = false" />
		<CnEditSettingsModal
			v-if="showSettingsModal"
			:working="workingManifest"
			@close="showSettingsModal = false" />
		<CnEditSidebarModal
			v-if="showSidebarModal"
			:working="workingManifest"
			:page-id="effectivePageId"
			@close="showSidebarModal = false" />
		<CnAddWidgetModal
			v-if="showAddWidgetModal"
			:show="showAddWidgetModal"
			:surface="addWidgetSurface"
			:data-context="addWidgetDataContext"
			@submit="onAddWidgetSubmit"
			@close="showAddWidgetModal = false" />
		<CnEditActionsModal
			v-if="showActionsModal"
			:working="workingManifest"
			:page-id="effectivePageId"
			@close="showActionsModal = false" />
		<CnEditDataModal
			v-if="showDataModal"
			:manifest="effectiveManifest"
			@close="showDataModal = false" />
		<CnFlowEditModal
			v-if="showFlowsCanvasModal"
			:app="flowApp"
			flow-id="new"
			@close="showFlowsCanvasModal = false" />
		<CnEditSetupModal
			v-if="showSetupModal"
			:working="workingManifest"
			@close="showSetupModal = false" />
		<CnEditWalkthroughModal
			v-if="showWalkthroughModal"
			:working="workingManifest"
			@close="showWalkthroughModal = false" />
		<CnEditSupportModal
			v-if="showSupportModal"
			:working="workingManifest"
			@close="showSupportModal = false" />
	</div>
</template>

<script>
import { NcActions, NcActionButton, NcLoadingIcon } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Pencil from 'vue-material-design-icons/Pencil.vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import MenuIcon from 'vue-material-design-icons/Menu.vue'
import Close from 'vue-material-design-icons/Close.vue'
import Cog from 'vue-material-design-icons/Cog.vue'
import FileMultiple from 'vue-material-design-icons/FileMultiple.vue'
import PageLayoutSidebarRight from 'vue-material-design-icons/PageLayoutSidebarRight.vue'
import GestureTapButton from 'vue-material-design-icons/GestureTapButton.vue'
import Database from 'vue-material-design-icons/Database.vue'
import Sitemap from 'vue-material-design-icons/Sitemap.vue'
import AutoFix from 'vue-material-design-icons/AutoFix.vue'
import MapMarkerPath from 'vue-material-design-icons/MapMarkerPath.vue'
import HeartOutline from 'vue-material-design-icons/HeartOutline.vue'
import CnEditMenuModal from '../../dialogs/CnEditMenuModal.vue'
import CnEditPagesModal from '../../dialogs/CnEditPagesModal.vue'
import CnEditSettingsModal from '../../dialogs/CnEditSettingsModal.vue'
import CnEditSidebarModal from '../../dialogs/CnEditSidebarModal.vue'
import CnEditActionsModal from '../../dialogs/CnEditActionsModal.vue'
import CnAddWidgetModal from '../../dialogs/CnAddWidgetModal.vue'
import CnEditDataModal from '../../dialogs/CnEditDataModal.vue'
import CnFlowEditModal from '../../dialogs/CnFlowEditModal.vue'
import CnEditSetupModal from '../../dialogs/CnEditSetupModal.vue'
import CnEditWalkthroughModal from '../../dialogs/CnEditWalkthroughModal.vue'
import CnEditSupportModal from '../../dialogs/CnEditSupportModal.vue'
import { getDefaultContent, getWidgetTypeEntry } from '../CnWidgetGrid/dashboardWidgetRegistry.js'
import { defaultDetailGrid } from '../../utils/defaultDetailGrid.js'

export default {
	name: 'CnOpenBuildEditButton',

	components: {
		NcActions,
		NcActionButton,
		NcLoadingIcon,
		Pencil,
		ContentSave,
		Plus,
		MenuIcon,
		Close,
		Cog,
		FileMultiple,
		PageLayoutSidebarRight,
		GestureTapButton,
		Database,
		Sitemap,
		AutoFix,
		MapMarkerPath,
		HeartOutline,
		CnEditMenuModal,
		CnEditPagesModal,
		CnEditSettingsModal,
		CnEditSidebarModal,
		CnEditActionsModal,
		CnAddWidgetModal,
		CnEditDataModal,
		CnFlowEditModal,
		CnEditSetupModal,
		CnEditWalkthroughModal,
		CnEditSupportModal,
	},

	inject: {
		/** Shared editor instance published by CnAppRoot; overridden by the `editor` prop. */
		cnManifestEditor: { default: null },
		/** OpenBuild availability published by CnAppRoot; overridden by the `available` prop. */
		cnOpenBuildAvailable: { default: false },
		/** The live (published) manifest published by CnAppRoot — read when not editing. */
		cnManifest: { default: null },
	},

	props: {
		/**
		 * Whether OpenBuild is available to this user. When falsey the component
		 * renders nothing. Wire from `useOpenBuildEditAvailability()`.
		 *
		 * @type {boolean}
		 */
		available: {
			type: Boolean,
			default: false,
		},
		/**
		 * The shared `useManifestEditor` instance (`{ editing, working, dirty,
		 * enter, cancel, save }`). Falls back to the injected `cnManifestEditor`.
		 *
		 * @type {object|null}
		 */
		editor: {
			type: Object,
			default: null,
		},
		/**
		 * The active page's id, forwarded to `CnEditSidebarModal` so it edits the
		 * right page's sidebar config.
		 *
		 * @type {string}
		 */
		pageId: {
			type: String,
			default: '',
		},
	},

	emits: [
		'add-widget',
		'cancel',
		'edit',
		'edit-actions',
		'edit-data',
		'edit-flows',
		'edit-menu',
		'edit-pages',
		'edit-settings',
		'edit-setup',
		'edit-sidebar',
		'edit-support',
		'edit-walkthrough',
		'save',
		'widget-added',
	],

	data() {
		return {
			showMenuModal: false,
			showPagesModal: false,
			showSettingsModal: false,
			showSidebarModal: false,
			showAddWidgetModal: false,
			showActionsModal: false,
			showDataModal: false,
			showFlowsCanvasModal: false,
			showSetupModal: false,
			showWalkthroughModal: false,
			showSupportModal: false,
			menuOpen: false,
			saving: false,
		}
	},

	computed: {
		/**
		 * The app id a flow created from here belongs to.
		 *
		 * Read from Nextcloud's own app context rather than the manifest,
		 * because the manifest describes the PAGES an app renders and does not
		 * carry the app's id. Falling back to `openregister` keeps a new flow in
		 * the shared store rather than in an app namespace that does not exist.
		 *
		 * @return {string} The owning app id.
		 */
		flowApp() {
			return (window?.OCA?.Theming?.name && window?.appName) || window?.appName || 'openregister'
		},

		/** Whether to render — the `available` prop OR the injected availability. */
		isAvailable() {
			return Boolean(this.available || this.unref(this.cnOpenBuildAvailable))
		},
		/** Active page id — the `pageId` prop, else the current route name. */
		effectivePageId() {
			return this.pageId || (this.$route && this.$route.name) || ''
		},
		/** The resolved editor (prop wins over inject). */
		activeEditor() {
			return this.editor ?? this.cnManifestEditor ?? null
		},
		/** Whether edit mode is active. */
		isEditing() {
			return Boolean(this.activeEditor && this.unref(this.activeEditor.editing))
		},
		/** The working manifest copy (or null when not editing). */
		workingManifest() {
			return this.activeEditor ? this.unref(this.activeEditor.working) : null
		},
		/** The manifest to read page metadata from: working copy, else the live one. */
		effectiveManifest() {
			return this.workingManifest || this.unref(this.cnManifest) || null
		},
		/** The active page object, resolved from the effective manifest. */
		currentPage() {
			const m = this.effectiveManifest
			const pages = (m && Array.isArray(m.pages)) ? m.pages : []
			return pages.find((p) => p && p.id === this.effectivePageId) || null
		},
		/** Whether the active page is a dashboard (the only page type with widget slots). */
		isDashboardPage() {
			return !!(this.currentPage && this.currentPage.type === 'dashboard')
		},
		/** Whether the active page is a detail page (its body is an adjustable grid). */
		isDetailPage() {
			return !!(this.currentPage && this.currentPage.type === 'detail')
		},
		/**
		 * Whether the active page hosts a widget grid that "Add widget" can target.
		 * Only dashboard and detail pages do: their bodies are adjustable widget
		 * grids. A `type:"custom"` page is the manifest's escape hatch — it renders
		 * a bespoke `component` (or `slots.main`) and owns its own body, so it has
		 * no widget grid to add to. Widget canvases are dashboard pages.
		 *
		 * @return {boolean}
		 */
		pageSupportsWidgets() {
			return this.isDashboardPage || this.isDetailPage
		},
		/**
		 * The widget-picker surface for "Add widget". Detail pages get
		 * `'detail-page'` so detail-only types (notably a second `data` widget)
		 * appear alongside the universal widgets; dashboards keep the default
		 * dashboard surface.
		 *
		 * @return {string} the surface key.
		 */
		addWidgetSurface() {
			return this.isDetailPage ? 'detail-page' : 'app-dashboard'
		},
		/**
		 * The active detail page's `{ register, schema }` (from its config),
		 * forwarded to the Add-widget modal so the data sub-form resolves the
		 * right schema regardless of the modal's DOM position. Null for non-detail
		 * pages.
		 *
		 * @return {{register: string, schema: string}|null} the page context.
		 */
		addWidgetDataContext() {
			if (!this.isDetailPage) return null
			const cfg = (this.currentPage && this.currentPage.config) || {}
			return { register: cfg.register || '', schema: cfg.schema || '' }
		},
	},

	methods: {
		t,
		/**
		 * Read a value that may be a Vue ref or a plain value.
		 * @param {*} maybeRef A Vue ref or plain value.
		 * @return {*} The unwrapped value.
		 */
		unref(maybeRef) {
			return maybeRef && typeof maybeRef === 'object' && 'value' in maybeRef ? maybeRef.value : maybeRef
		},
		/** Enter edit mode, or persist + leave when already editing. */
		async onToggleEdit() {
			if (!this.activeEditor || this.saving) return
			if (this.isEditing) {
				// Show a spinner in the (kept-open) menu while the save persists,
				// then close the menu once it settles — pass or fail.
				this.saving = true
				try {
					const delta = await this.activeEditor.save()
					/**
					 * @event save Emitted after a successful save with the minimal delta.
					 * @type {object}
					 */
					this.$emit('save', delta)
				} finally {
					this.saving = false
					this.menuOpen = false
				}
			} else {
				this.activeEditor.enter()
				this.ejectDetailGridIfNeeded()
				/**
				 * @event edit Emitted when edit mode is entered.
				 */
				this.$emit('edit')
				this.menuOpen = false
			}
		},
		/** Discard edits and leave edit mode. */
		onCancel() {
			if (this.activeEditor) this.activeEditor.cancel()
			/**
			 * @event cancel Emitted when edits are discarded.
			 */
			this.$emit('cancel')
		},
		/** Open the Add-widget modal (only in edit mode). */
		onAddWidget() {
			if (!this.isEditing) return
			this.showAddWidgetModal = true
			/**
			 * @event add-widget Emitted when "Add widget…" is activated in edit mode.
			 */
			this.$emit('add-widget')
		},
		/**
		 * Append the chosen widget to the active page's body slot in the working
		 * manifest. The new entry stacks below existing body widgets at full width.
		 *
		 * @param {{ type: string, content: object }} payload The modal's submit payload.
		 */
		onAddWidgetSubmit(payload) {
			this.showAddWidgetModal = false
			const manifest = this.workingManifest
			if (!manifest || !payload || !payload.type) return
			const pages = Array.isArray(manifest.pages) ? manifest.pages : []
			const page = pages.find((p) => p && p.id === this.effectivePageId) ?? pages[0]
			if (!page) return
			const content = payload.content && typeof payload.content === 'object' ? { ...payload.content } : (getDefaultContent(payload.type) || {})
			const wid = `w-${payload.type}-${Date.now()}`

			// Appearance (chrome) chosen in the modal — title visibility/label,
			// icon and background — applied to the widget entry the renderer reads.
			const chrome = payload.chrome && typeof payload.chrome === 'object' ? payload.chrome : {}
			const entry = getWidgetTypeEntry(payload.type)
			const isCard = Boolean(entry && entry.card === true)
			const chromeFields = {
				// Never fall back to the raw type key — that shipped widgets titled
				// literally "stat". A card's own `content.label` is the best name,
				// then the registry's display name.
				title: chrome.customTitle || content.title || content.label
					|| entry?.displayName || payload.type,
				// Cards headline themselves via `content.label`, so they default
				// headerless unless the modal explicitly asked for a header.
				showTitle: typeof chrome.showTitle === 'boolean' ? chrome.showTitle : !isCard,
				...(chrome.customIcon ? { icon: chrome.customIcon } : {}),
				...(chrome.backgroundColor ? { styleConfig: { backgroundColor: chrome.backgroundColor } } : {}),
			}

			// Dashboard AND detail pages keep widgets in config.widgets +
			// config.layout (a detail page's grid is ejected there on edit — see
			// ejectDetailGridIfNeeded). A v2 page keeps them in pages[].widgets[]
			// (slot-based). Append to whichever this page uses so the new widget
			// lands where the renderer reads.
			// Append IN PLACE (`push`), never by replacing the array. These arrays
			// reach the grid as props via CnPageRenderer's `resolvedProps`, which
			// does NOT re-derive when `config.widgets` / `config.layout` are
			// swapped for new arrays — the page component keeps its original array
			// and the widget never appears at all. Mutating the array the props
			// already point at is what makes the addition visible. (Rendering the
			// new card correctly also needs CnDashboardPage to resolve widget defs
			// through a live lookup rather than a cached map — see getWidgetDef.)
			const cfg = page.config && typeof page.config === 'object' && !Array.isArray(page.config) ? page.config : null
			if ((page.type === 'dashboard' || page.type === 'detail') && cfg) {
				if (!Array.isArray(cfg.widgets)) cfg.widgets = []
				if (!Array.isArray(cfg.layout)) cfg.layout = []
				const nextY = cfg.layout.reduce((max, l) => Math.max(max, (l.gridY || 0) + (l.gridHeight || 1)), 0)
				cfg.widgets.push({ id: wid, type: payload.type, ...chromeFields, content })
				cfg.layout.push({ id: cfg.layout.length + 1, widgetId: wid, gridX: 0, gridY: nextY, gridWidth: 6, gridHeight: 3 })
			} else {
				if (!Array.isArray(page.widgets)) page.widgets = []
				const bodyWidgets = page.widgets.filter((w) => w && w.slot === 'body')
				const nextY = bodyWidgets.reduce((max, w) => Math.max(max, (w.gridY || 0) + (w.gridHeight || 1)), 0)
				page.widgets.push({
					id: wid,
					widgetKey: payload.type,
					slot: 'body',
					gridX: 0,
					gridY: nextY,
					gridWidth: 12,
					gridHeight: 3,
					...chromeFields,
					props: content,
				})
			}
			/**
			 * @event widget-added Emitted after a widget is appended to the working manifest.
			 * @type {{ type: string, content: object }}
			 */
			this.$emit('widget-added', payload)
		},
		/**
		 * Ensure an edit session is active so the modals have a `working` copy to
		 * mutate. Opening Edit menu / sidebar / actions enters edit mode if not
		 * already editing (otherwise the modals would bind to a null working copy).
		 */
		ensureEditing() {
			if (this.activeEditor && !this.isEditing) {
				this.activeEditor.enter()
				this.ejectDetailGridIfNeeded()
				this.$emit('edit')
			}
		},
		/**
		 * "Eject" the default detail-page body grid into the working manifest on
		 * first edit: when the active page is a `type:"detail"` whose config has no
		 * explicit `widgets`, seed `config.widgets`/`config.layout` with the same
		 * Data + Related defaults CnDetailPage renders in memory. From then on the
		 * grid is manifest-backed, so resize, per-property config and Add widget
		 * all mutate the working manifest in place and persist on Save. Identical
		 * defaults mean ejecting never visually changes the page. No-op for
		 * non-detail pages or pages already carrying a widget grid.
		 *
		 * @return {void}
		 */
		ejectDetailGridIfNeeded() {
			const manifest = this.workingManifest
			if (!manifest) return
			const pages = Array.isArray(manifest.pages) ? manifest.pages : []
			const page = pages.find((p) => p && p.id === this.effectivePageId) ?? null
			if (!page || page.type !== 'detail') return
			if (!page.config || typeof page.config !== 'object' || Array.isArray(page.config)) {
				page.config = {}
			}
			const cfg = page.config
			// Already customised (ejected before, or a hand-authored grid page).
			if (Array.isArray(cfg.widgets) && cfg.widgets.length > 0) return
			const grid = defaultDetailGrid({
				register: cfg.register || '',
				schema: cfg.schema || '',
				showRelated: cfg.showRelatedObjects !== false,
			})
			cfg.widgets = grid.widgets
			cfg.layout = grid.layout
		},
		/** Enter edit mode (if needed) and open the pages editor modal. */
		onEditPages() {
			this.ensureEditing()
			this.showPagesModal = true
			/**
			 * @event edit-pages Emitted when the pages editor modal opens.
			 */
			this.$emit('edit-pages')
		},
		/** Enter edit mode (if needed) and open the menu editor modal. */
		onEditMenu() {
			this.ensureEditing()
			this.showMenuModal = true
			/**
			 * @event edit-menu Emitted when the menu editor modal opens.
			 */
			this.$emit('edit-menu')
		},
		/** Enter edit mode (if needed) and open the settings editor modal. */
		onEditSettings() {
			this.ensureEditing()
			this.showSettingsModal = true
			/**
			 * @event edit-settings Emitted when the settings editor modal opens.
			 */
			this.$emit('edit-settings')
		},
		/** Enter edit mode (if needed) and open the sidebar editor modal. */
		onEditSidebar() {
			this.ensureEditing()
			this.showSidebarModal = true
			/**
			 * @event edit-sidebar Emitted when the sidebar editor modal opens.
			 */
			this.$emit('edit-sidebar')
		},
		/** Enter edit mode (if needed) and open the actions editor modal. */
		onEditActions() {
			this.ensureEditing()
			this.showActionsModal = true
			/**
			 * @event edit-actions Emitted when the actions editor modal opens.
			 */
			this.$emit('edit-actions')
		},
		/** Enter edit mode (if needed) and open the setup-wizard editor modal. */
		onEditSetup() {
			this.ensureEditing()
			this.showSetupModal = true
			/**
			 * @event edit-setup Emitted when the setup-wizard editor modal opens.
			 */
			this.$emit('edit-setup')
		},
		/** Enter edit mode (if needed) and open the walkthrough editor modal. */
		onEditWalkthrough() {
			this.ensureEditing()
			this.showWalkthroughModal = true
			/**
			 * @event edit-walkthrough Emitted when the walkthrough editor modal opens.
			 */
			this.$emit('edit-walkthrough')
		},
		/** Enter edit mode (if needed) and open the support/donation editor modal. */
		onEditSupport() {
			this.ensureEditing()
			this.showSupportModal = true
			/**
			 * @event edit-support Emitted when the support/donation editor modal opens.
			 */
			this.$emit('edit-support')
		},
		/**
		 * Open the data (register + schemas) editor. Unlike the manifest editors
		 * this does NOT enter manifest edit mode — it manages OpenRegister
		 * registers/schemas directly via the API.
		 */
		onEditData() {
			this.showDataModal = true
			this.menuOpen = false
			/**
			 * @event edit-data Emitted when the data (register/schema) editor opens.
			 */
			this.$emit('edit-data')
		},
		/**
		 * Open the flow editor. Like Edit data, this edits OpenRegister directly
		 * and does NOT enter manifest edit mode.
		 *
		 * This used to edit a schema's `x-openregister-flows` as a flat
		 * `{name, trigger, actions[]}` list, through two interchangeable editors
		 * (a form and a canvas). That dialect and the service that executed it
		 * are gone: a flow is now a node/edge document in OpenRegister's one flow
		 * store, and there is one editor for it.
		 */
		onEditFlows() {
			this.showFlowsCanvasModal = true
			this.menuOpen = false
			/**
			 * @event edit-flows Emitted when the flows editor opens.
			 */
			this.$emit('edit-flows')
		},
	},
}
</script>

<style scoped>
.cn-openbuild-edit {
	display: inline-flex;
}

/* Conduction-orange accent on the trigger (ADR-041 brand exception). Targets the
   NcActions trigger button — `.button-vue` in current @nextcloud/vue (icon-only
   mode renders no `.action-item__menutoggle`), with the legacy class kept too.
   `!important` beats the `button-vue--tertiary` transparent default. */
.cn-openbuild-edit__actions :deep(.button-vue),
.cn-openbuild-edit__actions :deep(.action-item__menutoggle) {
	background-color: var(--c-orange-knvb, #f36c21) !important;
	color: #fff !important;
	border-radius: var(--border-radius-element, var(--border-radius-large, 8px));
}

/* Center the glyph in the icon-only trigger (button-vue__icon is display:block
   by default, which left-aligns the 20×20 svg). */
.cn-openbuild-edit__actions :deep(.button-vue__wrapper) {
	justify-content: center;
}
.cn-openbuild-edit__actions :deep(.button-vue__icon) {
	display: flex !important;
	align-items: center;
	justify-content: center;
	color: #fff;
}
.cn-openbuild-edit__glyph {
	color: #fff;
	display: block;
	margin: auto;
}
</style>
