<!--
  CnRelatedObjectsWidget — Everything linked to an object, in one widget.

  Two rendering modes share the CnWidgetWrapper chrome:

  • Tabbed self-fetch (default, `layout="tabs"`) — when an object's
    register/schema/id can be resolved (from props or `objectData['@self']`),
    the widget calls OpenRegister directly:
      /relations (notes, tasks, mails, events, contacts, deck), /uses + /used
      (merged into Objects), /files — and renders one TAB per non-empty group
    with a count badge, showing the items inline. Each leaf tab carries an
    "open in sidebar" affordance that emits `open-integration` without
    replacing the inline content. A host's `extraSections` join the strip as
    further tabs: content the widget cannot resolve itself is still content
    about this object, and dropping it on the mode the widget picks for itself
    is a loss the host has no way to see.

  • Legacy list (`layout="list"`, or when register/schema can't be resolved) —
    the original flat sections driven by the object store's
    fetchUses/fetchUsed/fetchContracts/fetchFiles actions plus the static
    leaf-integration "Linked apps" list. This path is deprecated; it warns once.

  Sits on the CnWidgetWrapper chrome, so it carries the shared overflow
  Actions menu (Refresh / Documentation / Request a feature). Refresh
  refetches every section.
-->
<template>
	<CnWidgetWrapper
		:title="title"
		:showTitle="!bare"
		:borderless="bare"
		:widgetId="widgetId || objectType"
		:documentationUrl="documentationUrl"
		:refreshing="loading"
		flush>
		<!-- Total beside the card title. Carries the count that the tab strip
		     would otherwise show — notably when `hideSingleTabTitle` hid it. -->
		<template v-if="useTabs && showTotalCount && totalCount > 0" #title-meta>
			<span class="cn-related-objects-widget__count">{{ totalCount }}</span>
		</template>

		<div class="cn-related-objects-widget">
			<!-- Tabbed self-fetch mode -->
			<template v-if="useTabs">
				<!-- `layout: "sections"`: every group under its own heading in one
				     list, a heading action beside it (DqZaakGerelateerd). -->
				<template v-if="layout === 'sections'">
					<section v-for="group in visibleGroups"
						:key="`section-${group.key}`"
						class="cn-related-objects-widget__section"
						:aria-labelledby="`${sectionIdBase}-${group.key}`"
						data-testid="cn-related-section">
						<div class="cn-related-objects-widget__section-head">
							<h4 :id="`${sectionIdBase}-${group.key}`" class="cn-related-objects-widget__section-title">
								{{ group.label }}
							</h4>
							<button v-if="groupAction(group)"
								type="button"
								class="cn-related-objects-widget__section-action"
								data-testid="cn-related-section-action"
								@click="onGroupAction(group)">
								<CnIcon v-if="groupAction(group).icon" :name="groupAction(group).icon" :size="16" />
								{{ groupAction(group).label }}
							</button>
						</div>
						<ul class="cn-related-objects-widget__list">
							<li v-for="(item, i) in group.items" :key="`item-${group.key}-${item.id || i}`">
								<a v-if="groupHref(group, item)"
									class="cn-related-objects-widget__row"
									:href="groupHref(group, item)"
									target="_blank"
									rel="noopener noreferrer">
									<CnIcon :name="group.icon" :size="20" class="cn-related-objects-widget__icon" />
									<span class="cn-related-objects-widget__label">{{ item.label }}</span>
									<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
								</a>
								<div v-else-if="isStaticRow(group, item)"
									class="cn-related-objects-widget__row cn-related-objects-widget__row--static"
									data-testid="cn-related-static-row">
									<CnIcon :name="group.icon" :size="20" class="cn-related-objects-widget__icon" />
									<span class="cn-related-objects-widget__label">{{ item.label }}</span>
									<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
								</div>
								<div v-else
									class="cn-related-objects-widget__row"
									tabindex="0"
									role="button"
									@click="onSelectGroupItem(group, item)"
									@keydown.enter="onSelectGroupItem(group, item)">
									<CnIcon :name="group.icon" :size="20" class="cn-related-objects-widget__icon" />
									<span class="cn-related-objects-widget__label">{{ item.label }}</span>
									<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
								</div>
							</li>
						</ul>
					</section>
				</template>
				<div v-if="layout !== 'sections' && tabStripVisible" class="cn-related-objects-widget__tabs" role="tablist">
					<button v-for="group in visibleGroups"
						:key="`tab-${group.key}`"
						type="button"
						role="tab"
						:aria-selected="String(group.key === activeKey)"
						class="cn-related-objects-widget__tab"
						:class="[{ 'cn-related-objects-widget__tab--active': group.key === activeKey }]"
						@click="activeKey = group.key">
						<CnIcon :name="group.icon" :size="18" class="cn-related-objects-widget__tab-icon" />
						<span class="cn-related-objects-widget__tab-label">{{ group.label }}</span>
						<span class="cn-related-objects-widget__count">{{ group.total }}</span>
					</button>
				</div>

				<section v-if="layout !== 'sections' && activeGroup" class="cn-related-objects-widget__panel" role="tabpanel">
					<ul class="cn-related-objects-widget__list">
						<li v-for="(item, i) in activeGroup.items"
							:key="`item-${activeGroup.key}-${item.id || i}`">
							<!-- A row with an owning-app page is a real link; the rest
							     stay buttons that emit or expand. -->
							<a v-if="activeGroupHrefs[i]"
								class="cn-related-objects-widget__row"
								:href="activeGroupHrefs[i]"
								target="_blank"
								rel="noopener noreferrer">
								<CnIcon :name="activeGroup.icon" :size="20" class="cn-related-objects-widget__icon" />
								<span class="cn-related-objects-widget__label">{{ item.label }}</span>
								<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
							</a>
							<div v-else-if="isStaticRow(activeGroup, item)"
								class="cn-related-objects-widget__row cn-related-objects-widget__row--static"
								data-testid="cn-related-static-row">
								<CnIcon :name="activeGroup.icon" :size="20" class="cn-related-objects-widget__icon" />
								<span class="cn-related-objects-widget__label">{{ item.label }}</span>
								<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
							</div>
							<div v-else
								class="cn-related-objects-widget__row"
								:class="{ 'cn-related-objects-widget__row--expanded': isExpanded(activeGroup.key, item) }"
								tabindex="0"
								role="button"
								@click="onSelectGroupItem(activeGroup, item)"
								@keydown.enter="onSelectGroupItem(activeGroup, item)">
								<CnIcon :name="activeGroup.icon" :size="20" class="cn-related-objects-widget__icon" />
								<span class="cn-related-objects-widget__label">{{ item.label }}</span>
								<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
								<p v-if="item.detail && isExpanded(activeGroup.key, item)"
									class="cn-related-objects-widget__detail">
									{{ item.detail }}
								</p>
							</div>
							<ul v-if="item.children && item.children.length"
								class="cn-related-objects-widget__children"
								data-testid="cn-related-children">
								<li v-for="child in item.children" :key="child.key">
									<router-link v-if="child.to && $router" :to="child.to">
										{{ child.label }}
									</router-link>
									<span v-else>{{ child.label }}</span>
								</li>
							</ul>
							<div v-if="item.actions && item.actions.length" class="cn-related-objects-widget__row-actions">
								<NcButton v-for="(action, actionIndex) in item.actions"
									:key="`action-${actionIndex}`"
									:disabled="runningAction !== ''"
									data-testid="cn-related-row-action"
									@click="runSourceAction(action, item.raw)">
									{{ action.label }}
								</NcButton>
							</div>
						</li>
					</ul>
				</section>

				<p v-if="visibleGroups.length && pendingSections.length"
					class="cn-related-objects-widget__section-status"
					data-testid="cn-related-pending"
					role="status">
					{{ pendingLabel }}
				</p>
				<p v-for="failed in failedSections"
					:key="`failed-${failed.key}`"
					class="cn-related-objects-widget__section-error"
					data-testid="cn-related-section-error"
					:data-section="failed.key">
					{{ t('nextcloud-vue', 'Could not load {section}.', { section: failed.label }) }}
				</p>

				<div v-if="loading && !visibleGroups.length" class="cn-related-objects-widget__empty">
					{{ loadingLabel }}
				</div>
				<CnEmptyContent v-else-if="hasLoaded && !visibleGroups.length"
					class="cn-related-objects-widget__empty-state"
					:name="resolvedEmptyLabel">
					<template #icon>
						<CnIcon :name="emptyIconName" :size="48" />
					</template>
				</CnEmptyContent>
			</template>

			<!-- Legacy list mode (deprecated) -->
			<template v-else>
				<!-- Objects -->
				<section v-if="showObjects && objectItems.length" class="cn-related-objects-widget__group">
					<h4 class="cn-related-objects-widget__group-title">
						{{ objectsLabel }} <span class="cn-related-objects-widget__count">{{ objectItems.length }}</span>
					</h4>
					<ul class="cn-related-objects-widget__list">
						<li v-for="item in objectItems"
							:key="`obj-${item.id}`"
							class="cn-related-objects-widget__row"
							tabindex="0"
							role="button"
							@click="onSelectObject(item.raw)"
							@keydown.enter="onSelectObject(item.raw)">
							<FileTreeOutline class="cn-related-objects-widget__icon" :size="20" />
							<span class="cn-related-objects-widget__label">{{ item.label }}</span>
							<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
						</li>
					</ul>
				</section>

				<!-- Files -->
				<section v-if="showFiles && fileItems.length" class="cn-related-objects-widget__group">
					<h4 class="cn-related-objects-widget__group-title">
						{{ filesLabel }} <span class="cn-related-objects-widget__count">{{ fileItems.length }}</span>
					</h4>
					<ul class="cn-related-objects-widget__list">
						<li v-for="item in fileItems"
							:key="`file-${item.id}`"
							class="cn-related-objects-widget__row"
							tabindex="0"
							role="button"
							@click="onSelectFile(item.raw)"
							@keydown.enter="onSelectFile(item.raw)">
							<Paperclip class="cn-related-objects-widget__icon" :size="20" />
							<span class="cn-related-objects-widget__label">{{ item.label }}</span>
							<span v-if="item.meta" class="cn-related-objects-widget__meta">{{ item.meta }}</span>
						</li>
					</ul>
				</section>

				<!-- Host-supplied extra sections (e.g. mails resolved by a leaf) -->
				<section v-for="section in allExtraSections"
					:key="`extra-${section.key}`"
					class="cn-related-objects-widget__group">
					<h4 v-if="(section.items || []).length" class="cn-related-objects-widget__group-title">
						{{ section.label }} <span class="cn-related-objects-widget__count">{{ section.items.length }}</span>
					</h4>
					<ul v-if="(section.items || []).length" class="cn-related-objects-widget__list">
						<li v-for="(item, i) in section.items"
							:key="`extra-${section.key}-${i}`"
							class="cn-related-objects-widget__row"
							tabindex="0"
							role="button"
							@click="onSelectExtra(section.key, item)"
							@keydown.enter="onSelectExtra(section.key, item)">
							<CnIcon v-if="section.icon"
								:name="section.icon"
								:size="20"
								class="cn-related-objects-widget__icon" />
							<span class="cn-related-objects-widget__label">{{ item.label || item.title || item.name }}</span>
						</li>
					</ul>
				</section>

				<!-- Linked apps — leaf integrations carrying related content -->
				<section v-if="showIntegrations && linkedApps.length" class="cn-related-objects-widget__group">
					<h4 class="cn-related-objects-widget__group-title">
						{{ linkedAppsLabel }}
					</h4>
					<ul class="cn-related-objects-widget__list cn-related-objects-widget__list--apps">
						<li v-for="app in linkedApps"
							:key="`app-${app.id}`"
							class="cn-related-objects-widget__row cn-related-objects-widget__row--app"
							tabindex="0"
							role="button"
							@click="onOpenIntegration(app.id)"
							@keydown.enter="onOpenIntegration(app.id)">
							<CnIcon :name="app.icon || 'PuzzleOutline'" :size="20" class="cn-related-objects-widget__icon" />
							<span class="cn-related-objects-widget__label">{{ app.label }}</span>
							<ChevronRight class="cn-related-objects-widget__chevron" :size="20" />
						</li>
					</ul>
				</section>

				<!-- Empty -->
				<div v-if="loading && isEmpty" class="cn-related-objects-widget__empty">
					{{ loadingLabel }}
				</div>
				<CnEmptyContent v-else-if="hasLoaded && isEmpty"
					class="cn-related-objects-widget__empty-state"
					:name="resolvedEmptyLabel">
					<template #icon>
						<CnIcon :name="emptyIconName" :size="48" />
					</template>
				</CnEmptyContent>
			</template>
		</div>

		<p v-if="sourceActionError"
			class="cn-related-objects-widget__section-error"
			role="alert"
			data-testid="cn-related-action-error">
			{{ sourceActionError }}
		</p>
		<div v-if="footerActionList.length" class="cn-related-objects-widget__footer-actions">
			<NcButton v-for="(action, actionIndex) in footerActionList"
				:key="`footer-action-${actionIndex}`"
				data-testid="cn-related-footer-action"
				@click="runFooterAction(action.action)">
				<template v-if="action.icon" #icon>
					<CnIcon :name="action.icon" :size="20" />
				</template>
				{{ action.label }}
			</NcButton>
		</div>

		<!-- Add footer — lets the user actually create related content
		     (upload files, write notes) instead of only viewing it. Rendered
		     only on the tabbed self-fetch path (uploads need register/schema/id). -->
		<template v-if="addFooterVisible" #footer>
			<div class="cn-related-objects-widget__footer">
				<NcButton v-if="soleAddable && soleAddable.key === 'files'"
					variant="secondary"
					:disabled="uploading"
					@click="openFilePicker">
					<template #icon>
						<Plus :size="20" />
					</template>
					{{ uploading ? t('nextcloud-vue', 'Uploading…') : addLabelFor(soleAddable) }}
				</NcButton>
				<NcActions v-else
					:menuName="t('nextcloud-vue', 'Add')"
					variant="secondary"
					:forceMenu="true">
					<template #icon>
						<Plus :size="20" />
					</template>
					<NcActionButton v-if="groupAllowed('files')" :closeAfterClick="true" @click="openFilePicker">
						<template #icon>
							<Paperclip :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Upload file') }}
					</NcActionButton>
					<!--
						`model-value` / `@update:model-value`, not `value` /
						`@update:value`: @nextcloud/vue 9's NcActionInput declares
						only `modelValue` and emits only `submit` /
						`update:modelValue`. The old pair fell through as an inert
						DOM attribute and a listener that never fired, so the note
						draft stayed empty and Add note submitted nothing.
					-->
					<NcActionInput v-if="groupAllowed('notes')"
						:modelValue="noteDraft"
						:label="t('nextcloud-vue', 'Add note')"
						@update:modelValue="noteDraft = $event"
						@submit="onAddNote">
						<template #icon>
							<CnIcon name="CommentTextOutline" :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Add note') }}
					</NcActionInput>
					<NcActionButton v-for="group in emitAddableGroups"
						:key="`add-${group.key}`"
						:closeAfterClick="true"
						@click="onAddGroup(group.key)">
						<template #icon>
							<CnIcon :name="group.icon" :size="20" />
						</template>
						{{ addLabelFor(group) }}
					</NcActionButton>
				</NcActions>
				<span v-if="addError" class="cn-related-objects-widget__add-error">{{ addError }}</span>
				<!-- `:ref`, not `ref` — every other binding here is static and
				     the handler is cached, so a static ref lets the compiler
				     hoist this vnode to module scope, leaving its ref with no
				     owner instance. Vue's guard for that is dev-only, so in a
				     production build it throws
				     `Cannot read properties of null (reading 'refs')` and
				     aborts the render. See CnFilesTab for the full account. -->
				<input :ref="fileInputRef"
					type="file"
					multiple
					class="cn-related-objects-widget__file-input"
					@change="onFilesPicked">
			</div>
		</template>
	</CnWidgetWrapper>
</template>

<script>
import { subscribe, unsubscribe } from '@nextcloud/event-bus'
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcActionButton, NcActionInput, NcActions, NcButton } from '@nextcloud/vue'
import ChevronRight from 'vue-material-design-icons/ChevronRight.vue'
import FileTreeOutline from 'vue-material-design-icons/FileTreeOutline.vue'
import Paperclip from 'vue-material-design-icons/Paperclip.vue'
import Plus from 'vue-material-design-icons/Plus.vue'
import CnEmptyContent from '../CnEmptyContent/CnEmptyContent.vue'
import { interpolateUrlTokens } from '../../composables/useEndpointSource.js'
import { useIntegrationRegistry } from '../../composables/useIntegrationRegistry.js'
import { registerIntegrationIcons } from '../../integrations/icons.js'
import { useObjectStore } from '../../store/index.js'
import { dispatchAction } from '../../utils/actionsDispatcher.js'
import { fillTemplate, firstFilled } from '../../utils/fillTemplate.js'
import { buildHeaders } from '../../utils/headers.js'
import { readPath } from '../../utils/readPath.js'
import { resolveDeepTokens } from '../../utils/resolveFilterTokens.js'
import { evaluateVisibleWhenLocal } from '../../utils/visibleWhen.js'
import { CnIcon } from '../CnIcon/index.js'
import { CnWidgetWrapper } from '../CnWidgetWrapper/index.js'

// ⚠️ THIS WIDGET RENDERS INTEGRATION ICONS AND DID NOT REGISTER THEM.
//
// `LEAF_GROUPS` below names an MDI icon per section and `CnIcon` resolves those
// against a registry the HOST app populates — and a host registers the handful
// of icons it uses, not the integration set. `registerIntegrationIcons()` fixes
// that, which is why CnIntegrationWidget and CnIntegrationWidgetEmpty both call
// it at module load.
//
// This widget called nothing. It happened to look right on any page that ALSO
// rendered one of those two components, because the registry is global and
// whichever module loaded first filled it — so the icons were correct exactly
// when something unrelated to this widget was on the page, and a help-circle
// otherwise. Measured on the widget's own import graph: 7 of its 19 sections —
// contacts, notes, tasks, talk, polls, bookmarks and photos — fell back.
//
// A defect that depends on what ELSE is mounted is not intermittent; it is
// deterministic per page, and looks like a styling quirk on the pages where it
// shows. Idempotent, so calling it here costs nothing where another component
// already has.
registerIntegrationIcons()

/** Event-bus channel CnWidgetWrapper's Refresh action broadcasts on. */
const REFRESH_BUS_CHANNEL = 'cn:widget:refresh'

/** A value that is only an id: a row named by it says nothing to a reader. */
const BARE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Core sidebar tabs that are not "related content" leaves. */
const CORE_TABS = ['files', 'notes', 'tags', 'tasks', 'auditTrail', 'shares']

/** One-time guard so the legacy-path deprecation warning logs only once. */
let legacyWarned = false

/**
 * Schema titles by numeric schema id, shared by every widget on the page so a
 * schema is asked for once. OpenRegister's `/uses` and `/used` answer
 * `@self.schema` as that id ("120"), which is not a word anyone can read.
 *
 * @type {Map<string, Promise<string>>}
 */
const schemaTitleCache = new Map()

/**
 * Whether a value is a bare number, the way OpenRegister names a schema by id.
 *
 * @param {string|number|undefined|null} value The value.
 * @return {boolean}
 */
function isNumericId(value) {
	return (typeof value === 'number' && Number.isFinite(value))
		|| (typeof value === 'string' && /^\d+$/.test(value.trim()))
}

/**
 * Leaf groups surfaced by the aggregated `/relations` endpoint, in tab order.
 * `responseKey` is the key in the `/relations` payload; `integrationId` is the
 * sidebar tab the "open in sidebar" affordance deep-links to; `key` is this
 * widget's own section id.
 *
 * ⚠️ `icon` AND `integrationId` ARE BOTH ANSWERED BY THE INTEGRATION REGISTRY,
 * SO THIS TABLE IS A SECOND COPY OF DATA THAT ALREADY EXISTS — and it had
 * drifted from it. Talk wore `Forum` here and `ChatOutline` in the registry;
 * `Forum` and `ImageMultiple` are in NO registry at all, so those two sections
 * fell back even on a page where every other icon resolved; and `timetracker`
 * named no integration whatsoever — the registry id is `time-tracker` — so that
 * row's deep link opened nothing and reported nothing.
 *
 * The copy stays (importing the registry here would be a cycle), but
 * `tests/components/relatedObjectIcons.spec.js` now holds every row against it:
 * same integration, same icon, and an `integrationId` that names something real.
 */
const LEAF_GROUPS = [
	{ key: 'mails', responseKey: 'emails', icon: 'Email', integrationId: 'email', requiredApp: 'mail' },
	{ key: 'events', responseKey: 'events', icon: 'Calendar', integrationId: 'calendar', requiredApp: 'calendar' },
	{ key: 'contacts', responseKey: 'contacts', icon: 'AccountBox', integrationId: 'contacts', requiredApp: 'contacts' },
	{ key: 'notes', responseKey: 'notes', icon: 'CommentTextOutline', integrationId: 'notes', requiredApp: '' },
	{ key: 'tasks', responseKey: 'tasks', icon: 'CheckboxMarkedOutline', integrationId: 'tasks', requiredApp: 'tasks' },
	{ key: 'deck', responseKey: 'deck', icon: 'ViewColumnOutline', integrationId: 'deck', requiredApp: 'deck' },
	// Additional pluggable leaf integrations — surfaced automatically when the
	// owning app is installed and the object has links (empty groups are hidden
	// by `visibleGroups`). Server side is wired in RelationsController::LEAF_INTEGRATIONS.
	{ key: 'talk', responseKey: 'talk', icon: 'ChatOutline', integrationId: 'talk', requiredApp: 'spreed' },
	{ key: 'forms', responseKey: 'forms', icon: 'ClipboardText', integrationId: 'forms', requiredApp: 'forms' },
	{ key: 'maps', responseKey: 'maps', icon: 'MapMarker', integrationId: 'maps', requiredApp: 'maps' },
	{ key: 'polls', responseKey: 'polls', icon: 'Poll', integrationId: 'polls', requiredApp: 'polls' },
	{ key: 'bookmarks', responseKey: 'bookmarks', icon: 'Bookmark', integrationId: 'bookmarks', requiredApp: 'bookmarks' },
	{ key: 'collectives', responseKey: 'collectives', icon: 'BookOpenPageVariant', integrationId: 'collectives', requiredApp: 'collectives' },
	{ key: 'photos', responseKey: 'photos', icon: 'Image', integrationId: 'photos', requiredApp: 'photos' },
	{ key: 'cospend', responseKey: 'cospend', icon: 'CurrencyEur', integrationId: 'cospend', requiredApp: 'cospend' },
	{ key: 'timetracker', responseKey: 'timetracker', icon: 'Clock', integrationId: 'time-tracker', requiredApp: 'timemanager' },
	{ key: 'analytics', responseKey: 'analytics', icon: 'ChartBar', integrationId: 'analytics', requiredApp: 'analytics' },
	{ key: 'flow', responseKey: 'flow', icon: 'SitemapOutline', integrationId: 'flow', requiredApp: '' },
	{ key: 'openproject', responseKey: 'openproject', icon: 'Briefcase', integrationId: 'openproject', requiredApp: 'integration_openproject' },
	{ key: 'xwiki', responseKey: 'xwiki', icon: 'FileDocumentMultiple', integrationId: 'xwiki', requiredApp: '' },
]

/**
 * CnRelatedObjectsWidget — Everything linked to an object, in one widget.
 *
 * In the default tabbed mode the widget resolves an object's
 * register/schema/id (from props or `objectData['@self']`) and fetches its
 * relations directly from OpenRegister — the aggregated `/relations` groups
 * (mails, meetings, contacts, notes, tasks, deck), `/uses` + `/used` (merged
 * into Objects) and `/files` — rendering one tab per non-empty group with a
 * count badge and the items inline. Each leaf tab offers an "open in sidebar"
 * affordance that emits `open-integration`.
 *
 * Passing `layout="list"` (or mounting without a resolvable register/schema)
 * falls back to the deprecated store-action path that renders flat sections
 * plus the static leaf-integration "Linked apps" list.
 *
 * ```vue
 * <CnRelatedObjectsWidget
 *   :object-data="lead"
 *   @select-object="openObject"
 *   @open-integration="openSidebarTab" />
 * ```
 */
export default {
	name: 'CnRelatedObjectsWidget',

	components: {
		CnWidgetWrapper,
		CnIcon,
		FileTreeOutline,
		Paperclip,
		ChevronRight,
		Plus,
		NcActions,
		NcActionButton,
		NcActionInput,
		NcButton,
		CnEmptyContent,
	},

	inject: {
		/**
		 * The host app's translator (CnAppRoot provides it), so a schema title
		 * reads in the app's language. Without it a title reads as stored.
		 */
		cnTranslate: { default: () => (key) => key },
		/** The page's pre-bound action dispatcher (CnPageRenderer), for a group's heading action. */
		cnDispatchAction: { default: null },
	},

	props: {
		/** Widget title shown in the header. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Related'),
		},

		/**
		 * Drop the card chrome: no header, no border. For a surface that already
		 * supplies both, such as a `CnTabsWidget` panel, where a second title
		 * inside the panel reads as a heading nested in its own heading.
		 *
		 * The header is where `CnWidgetWrapper` renders its Actions menu, so a
		 * bare widget has none. That is the point: the surface hoists it.
		 */
		bare: {
			type: Boolean,
			default: false,
		},

		/** The registered object type slug (used for legacy store fetches). */
		objectType: {
			type: String,
			default: '',
		},

		/** The object's id. */
		objectId: {
			type: [String, Number],
			default: '',
		},

		/** The object data — used to derive id/register/schema when not passed explicitly. */
		objectData: {
			type: Object,
			default: () => ({}),
		},

		/**
		 * OpenRegister register slug. When omitted, derived from
		 * `objectData['@self'].register`. Required (with `schema`) for the
		 * tabbed self-fetch path.
		 */
		register: {
			type: String,
			default: '',
		},

		/**
		 * OpenRegister schema slug. When omitted, derived from
		 * `objectData['@self'].schema`. Required (with `register`) for the
		 * tabbed self-fetch path.
		 */
		schema: {
			type: String,
			default: '',
		},

		/**
		 * Render mode. `'tabs'` (default) self-fetches from OpenRegister and
		 * renders a tab per non-empty group. `'sections'` renders every group
		 * under its own heading in one list. `'list'` forces the deprecated
		 * store-action list path.
		 *
		 * @type {'tabs'|'list'|'sections'}
		 */
		layout: {
			type: String,
			default: 'tabs',
			validator: (value) => ['tabs', 'list', 'sections'].includes(value),
		},

		/**
		 * Split the Objects group into one group per relation type, labelled
		 * with the label OpenRegister answers for the direction
		 * (`relation.displayLabel` on each row: "Onderwerp van deze zaak",
		 * "Wacht op"), through the host translate. A row without one stays in
		 * Objects.
		 *
		 * @spec openspec/changes/related-groups-by-relation/specs/related-objects/spec.md#requirement-related-objects-can-be-grouped-by-relation-type-under-headings
		 */
		groupByRelation: {
			type: Boolean,
			default: false,
		},

		/**
		 * An action on a group's heading in `layout: "sections"`, keyed by the
		 * group key (`objects`, `files`, an `extraSections` key, or
		 * `relation:<label>` for a relation group): `{ label, icon?, ...action }`
		 * ("Vervolg plannen"). An `extraSections` entry may carry its own
		 * `action`. Pressing it dispatches the action through the page and
		 * emits `group-action`.
		 *
		 * @type {Record<string, object>}
		 * @spec openspec/changes/related-groups-by-relation/specs/related-objects/spec.md#requirement-related-objects-can-be-grouped-by-relation-type-under-headings
		 */
		groupActions: {
			type: Object,
			default: () => ({}),
		},

		/** Include `/contracts` relations in the Objects group (opt-in). */
		showContracts: {
			type: Boolean,
			default: false,
		},

		/**
		 * Whitelist of relation-group keys to display (tabbed path). When
		 * non-empty, ONLY these groups render — e.g. `['objects', 'files',
		 * 'mails']`. Empty (default) shows every non-empty group. Lets a detail
		 * page carry several Related widgets each scoped to different relations.
		 * Keys: `objects`, `files`, and the leaf groups (mails, events, contacts,
		 * notes, tasks, deck, talk, forms, maps, polls, …).
		 *
		 * @type {string[]}
		 */
		includeGroups: {
			type: Array,
			default: () => [],
		},

		/**
		 * Object store instance (legacy list path only). When omitted, the
		 * widget tries Pinia auto-detection. Relation/file sections only render
		 * when the store exposes the matching `fetch*` actions.
		 */
		store: {
			type: Object,
			default: null,
		},

		/** Show the related-objects (uses/used/contracts) section/tab. */
		showObjects: {
			type: Boolean,
			default: true,
		},

		/** Show the files section/tab. */
		showFiles: {
			type: Boolean,
			default: true,
		},

		/** Show the leaf-integration entry-point section (legacy list path). */
		showIntegrations: {
			type: Boolean,
			default: true,
		},

		/**
		 * Integration ids to omit from the "Linked apps" section (on top of
		 * the always-omitted core tabs files/notes/tags/tasks/audit/shares).
		 *
		 * @type {string[]}
		 */
		excludeIntegrations: {
			type: Array,
			default: () => [],
		},

		/**
		 * Extra related sections the widget cannot resolve itself — content a
		 * host knows about that OpenRegister's relation endpoints do not
		 * return. Each: `{ key, label, icon?, items: [] }`.
		 *
		 * Renders on BOTH paths. On the legacy list path each section is a
		 * flat block; on the tabbed path each becomes a tab beside the
		 * self-fetched ones, and a row click emits `select-extra` rather than
		 * being deep-linked, because the host owns these rows and this widget
		 * knows nothing about where they live.
		 *
		 * A section with no items renders nothing at all, so a host can bind
		 * a section unconditionally and let it appear when it fills.
		 *
		 * `includeGroups` does NOT filter these. That whitelist scopes which
		 * of the widget's OWN groups it fetches and shows; a section handed
		 * over explicitly by the host is not one of those, and dropping it
		 * would be silent.
		 *
		 * @type {Array<{ key: string, label: string, icon?: string, items: object[] }>}
		 */
		extraSections: {
			type: Array,
			default: () => [],
		},

		/**
		 * Extra sections the widget reads itself from app endpoints, for
		 * content OpenRegister's relation endpoints do not return (scheduled
		 * follow-ups, typed links an app keeps). Each:
		 * `{ key, label, icon?, endpoint, path?, itemLabel, itemMeta?, groupBy?,
		 * groupLabels?, requireLabel?, rowRoute?, static?, rowActions?, children? }`.
		 * `endpoint` takes `@objectId`; `itemLabel` and `itemMeta` are
		 * templates (a list is candidates, the first that fills). `groupBy`
		 * (a template) splits the rows into one section per value, labelled
		 * through `groupLabels`. `requireLabel` leaves out a row whose label
		 * is empty or only an id. `rowRoute` (`{ name, params }`, `{field}`
		 * filled from the row) opens a row; `static` rows open nothing.
		 * `rowActions` (`[{ label, endpoint, method?, when? }]`) are buttons
		 * under a row, `when` a local condition over it. `children`
		 * (`{ path, label, route }`) lists links under a row.
		 *
		 * @type {Array<object>}
		 */
		extraSources: {
			type: Array,
			default: () => [],
		},

		/**
		 * Sections naming the record one of this record's fields points at
		 * (a parent): `[{ key, label, icon?, field, register, schema,
		 * labelField?, route? }]`. Shown only when the record has a readable
		 * title, never as a bare id.
		 *
		 * @type {Array<object>}
		 */
		referenceSections: {
			type: Array,
			default: () => [],
		},

		/**
		 * Buttons under the widget (`[{ label, icon?, type, ... }]`), page
		 * actions dispatched with the record's tokens resolved ("Plan
		 * follow-up" opening a dialog).
		 *
		 * @type {Array<object>}
		 */
		footerActions: {
			type: Array,
			default: () => [],
		},

		/** Documentation link for the overflow Actions menu. */
		documentationUrl: {
			type: String,
			default: '',
		},

		/** Stable id forwarded to the widget chrome. Falls back to objectType. */
		widgetId: {
			type: String,
			default: '',
		},

		/** Section/tab heading for related objects. */
		objectsLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Objects'),
		},

		/** Section/tab heading for files. */
		filesLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Files'),
		},

		/** Section heading for the leaf-integration entry points (legacy list path). */
		linkedAppsLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Linked apps'),
		},

		/**
		 * Deprecated no-op label, kept for backward compatibility.
		 *
		 * @deprecated No longer rendered — tabbed mode deep-links each item to its
		 * owning Nextcloud app instead of offering an open-in-sidebar action.
		 */
		openInSidebarLabel: { // eslint-disable-line vue/no-unused-properties -- deprecated no-op, kept so apps still passing it do not leak it onto the DOM through $attrs.
			type: String,
			default: () => t('nextcloud-vue', 'Open in sidebar'),
		},

		/**
		 * Empty-state label shown when nothing is related. When left at its
		 * default, a contextual label is derived instead: a widget scoped to a
		 * single relation group (`includeGroups: ['files']`) shows
		 * "No files yet", an unscoped one shows "No relations yet".
		 */
		emptyLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Nothing related yet'),
		},

		/**
		 * Render the "Add" footer (upload file / add note / per-group add
		 * events) on the tabbed self-fetch path. Disable for read-only hosts.
		 */
		showAddFooter: {
			type: Boolean,
			default: true,
		},

		/**
		 * Suppress the tab strip when only one group is visible. A lone tab
		 * repeats the widget title verbatim ("Files" card carrying a "Files"
		 * tab), so hide it and let the card header stand alone.
		 */
		hideSingleTabTitle: {
			type: Boolean,
			default: true,
		},

		/**
		 * Render a count pill beside the widget title totalling every visible
		 * group. Keeps the count reachable once `hideSingleTabTitle` has taken
		 * the sole tab — and its pill — away.
		 */
		showTotalCount: {
			type: Boolean,
			default: true,
		},
	},

	emits: [
		'add',
		'group-action',
		'file-uploaded',
		'note-added',
		'open-integration',
		'select-extra',
		'select-file',
		'select-object',
		'select-related',
	],

	setup() {
		const { integrations, getById } = useIntegrationRegistry()
		return { integrations, getById }
	},

	data() {
		return {
			/** Sections read from `extraSources` and `referenceSections`. */
			sourcedSections: [],
			/** The key of the row action that is running, or ''. */
			runningAction: '',
			/** The refusal of the last row action, as the server said it. */
			sourceActionError: '',
			/**
			 * The file input element, set by the template's function ref (kept off `$refs` so the ref stays dynamic — see the template).
			 *
			 * @type {HTMLInputElement|null}
			 */
			fileInputEl: null,
			/** Schema titles by numeric schema id, for object rows. */
			schemaTitles: {},
			/** Whether any section/tab is currently fetching. */
			loading: false,
			/** True once the first fetch has completed (gates the empty state). */
			hasLoaded: false,
			/** Merged related-object rows (legacy list path). */
			objectItems: [],
			/** File rows (legacy list path). */
			fileItems: [],
			/** Tab groups (tabbed self-fetch path): `{ key, label, icon, integrationId, items, total }`. */
			groups: [],
			/** Active tab key. */
			activeKey: '',
			/** Prefix for the section heading ids in `layout: "sections"`. */
			sectionIdBase: `cn-related-${Math.random().toString(36).slice(2, 9)}`,
			/** Keys of the tabbed sections whose request is still in flight (`objects`, `files`, `relations`). */
			pendingSections: [],
			/** Tabbed sections whose request failed: `{ key, label }`. */
			failedSections: [],
			/** Bumped per `loadTabs()`; an answer from an older load is dropped. */
			loadToken: 0,
			/** Key of the inline-expanded row (`{group}-{id}`) for leaves with no owning-app page (e.g. notes). */
			expandedKey: '',
			/** Whether a footer file upload is in flight. */
			uploading: false,
			/** Last add-footer error message (upload / note create). */
			addError: '',
			/** Bound text of the footer's "Add note" input. */
			noteDraft: '',
		}
	},

	computed: {
		/**
		 * The object-data record, guaranteed to be a plain object. The
		 * `object-data` prop is often `null` while the host's object is still
		 * loading (CnDetailPage binds `:object-data="currentObject"`), so guard
		 * it here — the resolver computeds below must never dereference null.
		 *
		 * @return {object} the object data, or an empty object.
		 */
		/**
		 * The host's sections and the ones the widget read itself.
		 *
		 * @return {Array<object>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-related-objects-can-read-extra-sections-from-endpoints
		 */
		allExtraSections() {
			return [...(this.extraSections || []), ...this.sourcedSections]
		},

		/**
		 * The footer buttons, labels translated.
		 *
		 * @return {Array<{label: string, icon: string, action: object}>}
		 */
		footerActionList() {
			return (Array.isArray(this.footerActions) ? this.footerActions : [])
				.filter((action) => action && typeof action.label === 'string' && action.label !== '')
				.map((action) => ({ label: this.translateLabel(action.label), icon: typeof action.icon === 'string' ? action.icon : '', action }))
		},

		safeObjectData() {
			return (this.objectData && typeof this.objectData === 'object') ? this.objectData : {}
		},

		/** Resolved object id — explicit prop wins, else from object data. */
		resolvedId() {
			const self = this.safeObjectData['@self'] || {}
			return this.objectId || this.safeObjectData.id || self.id || ''
		},

		/** Resolved register slug — explicit prop wins, else from `@self`. */
		resolvedRegister() {
			const self = this.safeObjectData['@self'] || {}
			return this.register || self.register || ''
		},

		/** Resolved schema slug — explicit prop wins, else from `@self`. */
		resolvedSchema() {
			const self = this.safeObjectData['@self'] || {}
			return this.schema || self.schema || ''
		},

		/** True when the tabbed self-fetch path is usable. */
		useTabs() {
			return (this.layout === 'tabs' || this.layout === 'sections')
				&& Boolean(this.resolvedRegister && this.resolvedSchema && this.resolvedId)
		},

		/**
		 * The host's `extraSections`, normalised into the same group shape the
		 * tab strip and the panel render. A section with no items is dropped,
		 * so an unconditionally-bound section costs nothing until it fills.
		 *
		 * Kept as a COMPUTED rather than pushed into `groups` inside
		 * `loadTabs()`: a host typically resolves these rows asynchronously
		 * after mount (dossiq's planned follow-ups are one endpoint call), and
		 * a value copied into `groups` at fetch time would never pick that up.
		 *
		 * @return {Array<object>} Group descriptors, `isExtra: true`.
		 */
		extraGroups() {
			return this.allExtraSections
				.filter((section) => section && (section.items || []).length > 0)
				.map((section) => {
					const items = section.items.map((raw, i) => ({
						id: String(raw?.id ?? i),
						label: raw?.label || raw?.title || raw?.name || '',
						meta: typeof raw?.meta === 'string' ? raw.meta : '',
						detail: '',
						children: Array.isArray(raw?.children) ? raw.children : [],
						actions: Array.isArray(raw?.actions) ? raw.actions : [],
						raw,
					}))
					return {
						key: section.key,
						label: section.label,
						icon: section.icon || 'LinkVariant',
						integrationId: '',
						items,
						total: items.length,
						isExtra: true,
						action: section.action && typeof section.action === 'object' ? section.action : null,
					}
				})
		},

		/**
		 * Tab groups that have at least one item (tabbed path), honouring the
		 * `includeGroups` whitelist when set.
		 *
		 * Host-supplied `extraSections` are appended and are deliberately NOT
		 * subject to `includeGroups` — see the prop's docblock.
		 */
		visibleGroups() {
			const allow = Array.isArray(this.includeGroups) ? this.includeGroups : []
			const own = this.groups.filter((group) => (group.total > 0 || group.items.length > 0)
				&& (allow.length === 0 || allow.includes(group.key)))
			const split = this.groupByRelation ? own.flatMap((group) => (group.key === 'objects' ? this.splitByRelation(group) : [group])) : own
			return [...split, ...this.extraGroups]
		},

		/**
		 * Whether the tab strip renders. A single visible group makes the strip
		 * a restatement of the card header, so `hideSingleTabTitle` drops it.
		 *
		 * @return {boolean} true when the tab strip should be shown.
		 */
		tabStripVisible() {
			if (!this.visibleGroups.length) {
				return false
			}
			return !(this.hideSingleTabTitle && this.visibleGroups.length === 1)
		},

		/**
		 * Items across every visible group — rendered as a pill beside the
		 * widget title. Falls back to the loaded item count when a group
		 * reports no server-side total.
		 *
		 * @return {number} the summed total.
		 */
		totalCount() {
			return this.visibleGroups.reduce(
				(sum, group) => sum + (group.total || group.items.length || 0),
				0,
			)
		},

		/**
		 * The line under the panel naming the sections still loading, once
		 * another section is already on screen.
		 *
		 * @return {string}
		 */
		pendingLabel() {
			const labels = {
				objects: this.objectsLabel,
				files: this.filesLabel,
				relations: t('nextcloud-vue', 'Linked items'),
			}
			const names = this.pendingSections.map((key) => labels[key] || key).join(', ')
			return t('nextcloud-vue', 'Still loading: {sections}', { sections: names })
		},

		/** Placeholder shown in the body while the first fetch is in flight. */
		loadingLabel() {
			return t('nextcloud-vue', 'Loading …')
		},

		/** The currently active group, defaulting to the first visible one. */
		activeGroup() {
			if (!this.visibleGroups.length) {
				return null
			}
			return this.visibleGroups.find((group) => group.key === this.activeKey) || this.visibleGroups[0]
		},

		/**
		 * The owning-app link of each row in the active group, by index; ''
		 * where the row routes through the host instead (related objects,
		 * host-supplied sections, leaves without a page).
		 *
		 * @return {string[]}
		 */
		activeGroupHrefs() {
			const group = this.activeGroup
			if (!group || group.isExtra || group.key === 'objects' || String(group.key).startsWith('relation:')) {
				return []
			}
			return group.items.map((item) => this.resolveItemHref(group.key, item.raw || {}))
		},

		/** Leaf integrations that can carry related content (legacy list path). */
		linkedApps() {
			const omit = new Set([...CORE_TABS, ...this.excludeIntegrations])
			return (this.integrations || []).filter((entry) => !omit.has(entry.id))
		},

		/** True when every legacy section is empty. */
		isEmpty() {
			if (this.objectItems.length || this.fileItems.length) {
				return false
			}
			if (this.allExtraSections.some((s) => (s.items || []).length)) {
				return false
			}
			if (this.showIntegrations && this.linkedApps.length) {
				return false
			}
			return true
		},

		/** Single configured relation group key, or '' when unscoped/multi. */
		singleSourceKey() {
			const allow = Array.isArray(this.includeGroups) ? this.includeGroups : []
			return allow.length === 1 ? allow[0] : ''
		},

		/**
		 * Effective empty-state label: an explicit `emptyLabel` wins; otherwise
		 * a single-source widget names its source ("No files yet") and an
		 * unscoped/multi-source one shows the generic "No relations yet".
		 */
		resolvedEmptyLabel() {
			const legacyDefault = t('nextcloud-vue', 'Nothing related yet')
			if (this.emptyLabel && this.emptyLabel !== legacyDefault) {
				return this.emptyLabel
			}
			if (this.singleSourceKey) {
				return t('nextcloud-vue', 'No {source} yet', { source: this.groupLabelFor(this.singleSourceKey).toLowerCase() })
			}
			return t('nextcloud-vue', 'No relations yet')
		},

		/** Empty-state icon: the single source's own icon, else a generic link. */
		emptyIconName() {
			if (this.singleSourceKey) {
				return this.groupIconFor(this.singleSourceKey)
			}
			return 'LinkVariant'
		},

		/** Whether the Add footer renders (prop + tabbed path with a real object). */
		addFooterVisible() {
			return this.showAddFooter && this.useTabs && this.addableGroups.length > 0
		},

		/**
		 * Relation groups the footer can add to, honouring `includeGroups`
		 * and the show* switches. Files and notes have built-in flows; other
		 * groups surface an entry that emits `add` for the host to handle.
		 */
		addableGroups() {
			const candidates = [
				...(this.showObjects ? [{ key: 'objects', label: this.objectsLabel, icon: 'FileTreeOutline' }] : []),
				...(this.showFiles ? [{ key: 'files', label: this.filesLabel, icon: 'Paperclip' }] : []),
				...LEAF_GROUPS.map((def) => ({ key: def.key, label: this.leafLabel(def.key), icon: def.icon })),
			]
			const allow = Array.isArray(this.includeGroups) ? this.includeGroups : []
			if (allow.length === 0) {
				// Unscoped widgets keep the footer focused on the two built-in
				// flows instead of listing every conceivable leaf group.
				return candidates.filter((g) => ['files', 'notes'].includes(g.key))
			}
			return candidates.filter((g) => allow.includes(g.key))
		},

		/** The only addable group when exactly one is configured, else null. */
		soleAddable() {
			return this.addableGroups.length === 1 ? this.addableGroups[0] : null
		},

		/** Addable groups without a built-in flow — rendered as emit-`add` entries. */
		emitAddableGroups() {
			return this.addableGroups.filter((g) => !['files', 'notes'].includes(g.key))
		},
	},

	watch: {
		resolvedId() {
			this.loadAll()
		},
	},

	mounted() {
		this.loadAll()
		subscribe(REFRESH_BUS_CHANNEL, this.onBusRefresh)
	},

	beforeUnmount() {
		unsubscribe(REFRESH_BUS_CHANNEL, this.onBusRefresh)
	},

	methods: {
		t,

		/**
		 * Function ref for the file input. A method, so the binding is stable
		 * across renders; being a function ref is what keeps the vnode dynamic.
		 *
		 * @param {HTMLInputElement|null} el The element, or null on unmount.
		 * @return {void}
		 */
		fileInputRef(el) {
			this.fileInputEl = el || null
		},

		/**
		 * Display label for a relation group key.
		 *
		 * @param {string} key - Group key (`objects`, `files`, or a leaf key).
		 * @return {string}
		 */
		groupLabelFor(key) {
			if (key === 'objects') {
				return this.objectsLabel
			}
			if (key === 'files') {
				return this.filesLabel
			}
			return this.leafLabel(key)
		},

		/**
		 * Icon name for a relation group key.
		 *
		 * @param {string} key - Group key.
		 * @return {string}
		 */
		groupIconFor(key) {
			if (key === 'objects') {
				return 'FileTreeOutline'
			}
			if (key === 'files') {
				return 'Paperclip'
			}
			const def = LEAF_GROUPS.find((g) => g.key === key)
			return (def && (this.integrationIcon(def.integrationId) || def.icon)) || 'LinkVariant'
		},

		/**
		 * Whether a group is available to the Add footer.
		 *
		 * @param {string} key - Group key.
		 * @return {boolean}
		 */
		groupAllowed(key) {
			return this.addableGroups.some((g) => g.key === key)
		},

		/**
		 * "Add …" label for a group entry.
		 *
		 * @param {{ key: string, label: string }} group - The addable group.
		 * @return {string}
		 */
		addLabelFor(group) {
			return t('nextcloud-vue', 'Add {source}', { source: String(group.label || group.key).toLowerCase() })
		},

		/** Open the hidden file input for the footer upload flow. */
		openFilePicker() {
			this.addError = ''
			if (this.fileInputEl) {
				this.fileInputEl.click()
			}
		},

		/**
		 * Upload the picked files to the object and refresh the groups.
		 *
		 * @param {Event} event - The file input change event.
		 * @return {Promise<void>}
		 */
		async onFilesPicked(event) {
			const files = Array.from((event.target && event.target.files) || [])
			event.target.value = ''
			if (!files.length || this.uploading) {
				return
			}
			this.uploading = true
			this.addError = ''
			try {
				const formData = new FormData()
				files.forEach((file) => formData.append('files[]', file))
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/filesMultipart', {
					register: this.resolvedRegister,
					schema: this.resolvedSchema,
					id: this.resolvedId,
				})
				// buildHeaders(null): let the browser set the multipart boundary.
				const response = await fetch(url, { method: 'POST', headers: buildHeaders(null), body: formData })
				if (!response.ok) {
					throw new Error(`${response.status}`)
				}
				/**
				 * @event file-uploaded Files were uploaded via the Add footer.
				 * @type {File[]}
				 */
				this.$emit('file-uploaded', files)
				await this.loadAll()
			} catch {
				this.addError = t('nextcloud-vue', 'Upload failed')
			} finally {
				this.uploading = false
			}
		},

		/**
		 * Create a note on the object from the footer's note input.
		 *
		 * Reads `noteDraft` rather than the submitted form: NcActionInput's
		 * input carries no `name`, so a FormData lookup always comes back null
		 * and the note is silently dropped.
		 *
		 * @return {Promise<void>}
		 */
		async onAddNote() {
			const message = String(this.noteDraft || '').trim()
			if (!message) {
				return
			}
			this.addError = ''
			try {
				const url = generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/notes', {
					register: this.resolvedRegister,
					schema: this.resolvedSchema,
					id: this.resolvedId,
				})
				const response = await fetch(url, {
					method: 'POST',
					headers: buildHeaders(),
					body: JSON.stringify({ message }),
				})
				if (!response.ok) {
					throw new Error(`${response.status}`)
				}
				this.noteDraft = ''
				/**
				 * @event note-added A note was created via the Add footer.
				 * @type {string}
				 */
				this.$emit('note-added', message)
				await this.loadAll()
			} catch {
				this.addError = t('nextcloud-vue', 'Could not add note')
			}
		},

		/**
		 * Emit the add request for groups without a built-in flow.
		 *
		 * @param {string} key - The group key (objects, mails, events, …).
		 */
		onAddGroup(key) {
			/**
			 * @event add An Add-footer entry without a built-in flow was
			 * activated; the host routes it (e.g. open a link-object dialog).
			 * @type {string}
			 */
			this.$emit('add', key)
		},

		/**
		 * Emit the related-object selection for the host to route.
		 *
		 * @param {object} raw - The related object record.
		 */
		onSelectObject(raw) {
			/**
			 * @event select-object A related-object row was clicked.
			 * @type {object}
			 */
			this.$emit('select-object', raw)
		},

		/**
		 * Emit the file selection for the host to route.
		 *
		 * @param {object} raw - The file record.
		 */
		onSelectFile(raw) {
			/**
			 * @event select-file A file row was clicked.
			 * @type {object}
			 */
			this.$emit('select-file', raw)
		},

		/**
		 * The Objects group split by relation type: one group per
		 * `relation.displayLabel`, in the order they first appear; rows
		 * without a label stay in an Objects group.
		 *
		 * @spec openspec/changes/related-groups-by-relation/specs/related-objects/spec.md#requirement-related-objects-can-be-grouped-by-relation-type-under-headings
		 * @param {object} group The Objects group.
		 * @return {Array<object>} The groups.
		 */
		splitByRelation(group) {
			const byLabel = new Map()
			for (const item of group.items) {
				const relation = item.raw && item.raw.relation
				const label = relation && typeof relation.displayLabel === 'string' && relation.displayLabel !== '' ? relation.displayLabel : ''
				const key = label === '' ? 'objects' : `relation:${label}`
				if (!byLabel.has(key)) {
					byLabel.set(key, { ...group, key, label: label === '' ? group.label : this.cnTranslate(label), relationLabel: label, items: [], total: 0 })
				}
				const target = byLabel.get(key)
				target.items.push(item)
				target.total = target.items.length
			}
			return [...byLabel.values()]
		},

		/**
		 * The heading action of a group: `groupActions[group.key]`, else the
		 * extra section's own `action`; null without one or without a label.
		 *
		 * @param {object} group The group.
		 * @return {{label: string, icon: string, action: object}|null}
		 */
		groupAction(group) {
			const declared = (this.groupActions && this.groupActions[group.key]) || group.action || null
			if (!declared || typeof declared !== 'object' || typeof declared.label !== 'string' || declared.label === '') {
				return null
			}
			return { label: this.cnTranslate(declared.label), icon: typeof declared.icon === 'string' ? declared.icon : '', action: declared }
		},

		/**
		 * Run a group's heading action through the page's dispatcher, and say
		 * so with `group-action`.
		 *
		 * @spec openspec/changes/related-groups-by-relation/specs/related-objects/spec.md#requirement-related-objects-can-be-grouped-by-relation-type-under-headings
		 * @param {object} group The group.
		 * @return {void}
		 */
		onGroupAction(group) {
			const resolved = this.groupAction(group)
			if (!resolved) {
				return
			}
			if (typeof this.cnDispatchAction === 'function' && resolved.action.type) {
				this.cnDispatchAction(resolved.action)
			}
			/**
			 * @event group-action A group's heading action was pressed. Payload: `{ group, action }`, the group key and the declared action.
			 */
			this.$emit('group-action', { group: group.key, action: resolved.action })
		},

		/**
		 * The owning-app link of one row in a group, '' where the row routes
		 * through the host (related objects, host sections).
		 *
		 * @param {object} group The group.
		 * @param {object} item The row.
		 * @return {string}
		 */
		groupHref(group, item) {
			if (!group || group.isExtra || group.key === 'objects' || String(group.key).startsWith('relation:')) {
				return ''
			}
			return this.resolveItemHref(group.key, item.raw || {})
		},

		/**
		 * Handle a click on a tabbed-path row that has no owning-app link
		 * (rows with one render as a real `<a>`): emit a host-routed event.
		 * Related objects always route through the host (their owning app's
		 * detail page).
		 *
		 * @param {object} group - The active group descriptor.
		 * @param {object} item - The clicked, normalised row (`item.raw` is the record).
		 */
		onSelectGroupItem(group, item) {
			// A row read from `extraSources` with a `rowRoute` opens it.
			if (group.isExtra && item.raw && item.raw.route && this.$router) {
				this.$router.push(item.raw.route)
				return
			}
			// A host-supplied section's rows belong to the host: this widget
			// did not fetch them and has no owning-app page to deep-link to,
			// so the click goes straight back out as `select-extra` — the same
			// event the legacy list path emits for the same rows.
			if (group.isExtra) {
				this.onSelectExtra(group.key, item.raw)
				return
			}
			if (group.key === 'objects' || String(group.key).startsWith('relation:')) {
				this.onSelectObject(item.raw)
				return
			}
			if (group.key === 'files') {
				this.onSelectFile(item.raw)
				return
			}
			// No owning-app page to deep-link to (e.g. notes are NC comments) —
			// toggle the body text inline so the click does something useful
			// instead of silently nothing.
			if (item.detail) {
				const key = `${group.key}-${item.id}`
				this.expandedKey = (this.expandedKey === key) ? '' : key
			}
			/**
			 * @event select-related A leaf-group row (mails, events, …) was clicked
			 * and no owning-app deep link could be resolved.
			 * @type {{ group: string, item: object }}
			 */
			this.$emit('select-related', { group: group.key, item: item.raw })
		},

		/**
		 * Whether a row is currently inline-expanded (no-deep-link leaves).
		 *
		 * @param {string} groupKey - The active group key.
		 * @param {object} item - The normalised row.
		 * @return {boolean}
		 */
		isExpanded(groupKey, item) {
			return this.expandedKey === `${groupKey}-${item.id}`
		},

		/**
		 * Resolve the owning-app deep link for a related item, or '' when none
		 * can be built (the caller then falls back to a host-routed event).
		 *
		 * @param {string} groupKey - The group key (files, contacts, deck, …).
		 * @param {object} raw - The leaf/file record.
		 * @return {string} A Nextcloud URL, or '' when unresolved.
		 */
		resolveItemHref(groupKey, raw) {
			// A record may carry its own absolute owning-app link.
			if (raw.url || raw.link || raw.accessUrl) {
				return raw.url || raw.link || raw.accessUrl
			}
			// Files → canonical Nextcloud file permalink (Files + Viewer).
			if (groupKey === 'files') {
				const fileid = raw.id || raw.fileid
				return fileid ? generateUrl('/f/{fileid}', { fileid: String(fileid) }) : ''
			}
			// Contacts → open the contact card in the Contacts app.
			if (groupKey === 'contacts' && raw.contactUid) {
				const key = raw.addressbookId !== null && raw.addressbookId !== undefined ? `${raw.contactUid}~${raw.addressbookId}` : String(raw.contactUid)
				return generateUrl('/apps/contacts/All contacts/{key}', { key })
			}
			// Deck → open the card on its board.
			if (groupKey === 'deck' && raw.boardId && (raw.cardId || raw.id)) {
				return generateUrl('/apps/deck/board/{board}/card/{card}', { board: String(raw.boardId), card: String(raw.cardId || raw.id) })
			}
			// Tasks → open the task in the Tasks app.
			if (groupKey === 'tasks') {
				const cal = raw.calendarId || raw.calendarUri
				const task = raw.uri || raw.uid || raw.id
				if (cal && task) {
					return generateUrl('/apps/tasks/#/calendars/{cal}/tasks/{task}', { cal: String(cal), task: String(task) })
				}
			}
			// Meetings/events → open the event in the Calendar app (dav path, base64url).
			if (groupKey === 'events') {
				const cal = raw.calendarUri || raw.calendarId
				const ev = raw.uri || (raw.uid ? `${raw.uid}.ics` : '')
				if (cal && ev) {
					const token = btoa(`${cal}/${ev}`).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
					return generateUrl('/apps/calendar/edit/{token}', { token })
				}
			}
			// Mails → open the message in the Mail app.
			if (groupKey === 'mails' && (raw.messageId || raw.id)) {
				return generateUrl('/apps/mail/box/0/{id}', { id: String(raw.messageId || raw.id) })
			}
			return ''
		},

		/**
		 * The registered integration's icon name, or '' when not registered.
		 *
		 * @param {string} integrationId - The integration id.
		 * @return {string}
		 */
		integrationIcon(integrationId) {
			if (!integrationId || typeof this.getById !== 'function') {
				return ''
			}
			const entry = this.getById(integrationId)
			return (entry && entry.icon) || ''
		},

		/**
		 * Emit a click in a host-supplied extra section. Reached from both
		 * paths: the legacy list's own rows, and a tabbed-path row whose
		 * group came from `extraSections`.
		 *
		 * @param {string} sectionKey - The section's key.
		 * @param {object} item - The clicked item.
		 */
		onSelectExtra(sectionKey, item) {
			/**
			 * @event select-extra A row in a host-supplied `extraSections`
			 * group was clicked, on either the list or the tabbed path.
			 * @type {{ section: string, item: object }}
			 */
			this.$emit('select-extra', { section: sectionKey, item })
		},

		/**
		 * Emit the leaf-integration open request for the host to route
		 * (the detail-page auto-body deep-links the sidebar tab).
		 *
		 * @param {string} integrationId - The leaf integration id.
		 */
		onOpenIntegration(integrationId) {
			/**
			 * @event open-integration A "Linked apps" row or a tab's
			 * "open in sidebar" affordance was activated.
			 * @type {string}
			 */
			this.$emit('open-integration', integrationId)
		},

		/**
		 * Build an OpenRegister object sub-resource URL.
		 *
		 * @param {string} suffix - The sub-resource (e.g. 'relations', 'uses', 'files').
		 * @return {string} The fully-qualified API URL.
		 */
		relatedUrl(suffix) {
			return generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}/{suffix}', {
				register: this.resolvedRegister,
				schema: this.resolvedSchema,
				id: this.resolvedId,
				suffix,
			})
		},

		/**
		 * GET an OpenRegister sub-resource, returning the parsed JSON or null.
		 *
		 * @param {string} suffix - The sub-resource suffix.
		 * @return {Promise<object|null>}
		 */
		async fetchSubResource(suffix) {
			return (await this.fetchSection(suffix)).data
		},

		/**
		 * GET an OpenRegister sub-resource and say whether it answered, so a
		 * section can tell "nothing linked" from "could not load".
		 *
		 * @param {string} suffix - The sub-resource suffix.
		 * @return {Promise<{ ok: boolean, data: object|null }>}
		 */
		async fetchSection(suffix) {
			try {
				// `no-store`: relations change as the user links content; a stale
				// cached empty response would wrongly show the empty state on load.
				const response = await fetch(this.relatedUrl(suffix), { method: 'GET', headers: buildHeaders(), cache: 'no-store' })
				if (!response.ok) {
					return { ok: false, data: null }
				}
				return { ok: true, data: await response.json() }
			} catch {
				return { ok: false, data: null }
			}
		},

		/**
		 * Resolve the object store: explicit prop first, then Pinia (legacy path).
		 *
		 * @return {object|null}
		 */
		getStore() {
			if (this.store) {
				return this.store
			}
			try {
				if (!this.$pinia) {
					return null
				}
				return useObjectStore()
			} catch {
				return null
			}
		},

		/**
		 * Normalise a related object into a display row.
		 *
		 * @param {object} raw - The related object record.
		 * @return {{ id: string, label: string, meta: string, raw: object }}
		 */
		toObjectRow(raw) {
			const self = raw['@self'] || {}
			const id = raw.id || self.id || self.uuid || ''
			const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim())
			// Pick a human label. Skip `@self.name` when OpenRegister has fallen
			// back to the bare uuid (schemas with no configured name field), and
			// cover common display properties across schemas — including Dutch
			// ones (onderwerp, omschrijving, naam, titel) — before the schema/id.
			const label = [
				raw.title,
				raw.name,
				raw.displayName,
				raw.label,
				raw.onderwerp,
				raw.subject,
				raw.omschrijving,
				raw.naam,
				raw.titel,
				self.title,
				self.name,
				raw.summary,
				raw.description,
			].find((v) => typeof v === 'string' && v.trim() && !isUuid(v))
			|| [raw.givenName, raw.familyName].filter((v) => typeof v === 'string' && v.trim()).join(' ')
			// OpenRegister names the schema by numeric id: show its title, never the number.
			const schema = this.schemaName(self.schema || raw.schema)
			const finalLabel = label || schema || String(id)
			return { id, label: finalLabel, meta: schema === finalLabel ? '' : schema, raw }
		},

		/**
		 * How a row names its schema: the translated title for a numeric id
		 * (empty until it is read, or when it cannot be), a slug as it is.
		 *
		 * @param {string|number|undefined|null} schema - `@self.schema` of the related object.
		 * @return {string}
		 */
		schemaName(schema) {
			if (isNumericId(schema)) {
				const title = this.schemaTitles[String(schema).trim()]
				return title ? this.cnTranslate(title) : ''
			}
			return typeof schema === 'string' ? schema : ''
		},

		/**
		 * Read the titles of the numeric schema ids in these envelopes once,
		 * before the rows are built, so no row shows a number first.
		 *
		 * @param {Array<object|null>} envelopes - The `{ results }` payloads.
		 * @return {Promise<void>}
		 */
		async resolveSchemaTitles(envelopes) {
			const ids = new Set()
			for (const envelope of envelopes) {
				for (const raw of ((envelope && envelope.results) || [])) {
					const schema = (raw && (raw['@self'] || {}).schema) ?? (raw && raw.schema)
					if (isNumericId(schema)) {
						ids.add(String(schema).trim())
					}
				}
			}
			const titles = { ...this.schemaTitles }
			await Promise.all([...ids].filter((id) => !(id in titles)).map(async (id) => {
				if (!schemaTitleCache.has(id)) {
					schemaTitleCache.set(id, this.fetchSchemaTitle(id))
				}
				titles[id] = await schemaTitleCache.get(id)
			}))
			this.schemaTitles = titles
		},

		/**
		 * GET one schema's title; '' when it cannot be read.
		 *
		 * @param {string} id - The numeric schema id.
		 * @return {Promise<string>}
		 */
		async fetchSchemaTitle(id) {
			try {
				const response = await fetch(generateUrl('/apps/openregister/api/schemas/{id}', { id }), { method: 'GET', headers: buildHeaders() })
				if (!response.ok) {
					return ''
				}
				const schema = await response.json()
				const title = schema && (schema.title || schema.slug)
				return typeof title === 'string' ? title : ''
			} catch {
				return ''
			}
		},

		/**
		 * Normalise a file record into a display row.
		 *
		 * @param {object} raw - The file record.
		 * @return {{ id: string, label: string, meta: string, raw: object }}
		 */
		toFileRow(raw) {
			const id = raw.id || raw.fileid || raw.name || ''
			const label = raw.name || raw.title || raw.basename || String(id)
			const size = raw.size !== null && raw.size !== undefined ? this.formatSize(raw.size) : ''
			return { id, label, meta: size, raw }
		},

		/**
		 * Normalise a leaf-relation record (mail, event, contact, …) into a row.
		 *
		 * @param {object} raw - The leaf record.
		 * @param {number} index - Position fallback for the id.
		 * @return {{ id: string, label: string, meta: string, raw: object }}
		 */
		toLeafRow(raw, index) {
			const id = raw.id || raw.uuid || raw.uri || `leaf-${index}`
			// Leaf shapes vary by type: contacts use displayName, events/tasks use
			// summary, mails use subject, deck uses cardTitle, polls use question,
			// talk uses roomName, notes/comments use message — fall back through the
			// union of known title fields so no leaf renders its numeric link id.
			const label = raw.title || raw.cardTitle || raw.albumName || raw.displayName
				|| raw.fullName || raw.summary || raw.subject || raw.question || raw.roomName
				|| raw.projectName || raw.reportName || raw.name || raw.basename
				|| raw.message || raw.content || raw.label || String(id)
			const meta = raw.date || raw.linkedAt || raw.createdAt || ''
			// Body text for leaves that have no owning-app page (notes/comments) —
			// shown inline on click since there's nowhere to deep-link to.
			const detail = raw.content || raw.message || raw.description || raw.comment || ''
			return {
				id: String(id),
				label,
				meta: typeof meta === 'string' ? meta : '',
				detail: typeof detail === 'string' ? detail : '',
				raw,
			}
		},

		/**
		 * Human-readable byte size.
		 *
		 * @param {number} bytes - Raw byte count.
		 * @return {string}
		 */
		formatSize(bytes) {
			if (!Number.isFinite(bytes)) {
				return ''
			}
			const units = ['B', 'KB', 'MB', 'GB']
			let n = bytes
			let u = 0
			while (n >= 1024 && u < units.length - 1) {
				n /= 1024
				u++
			}
			return `${n.toFixed(u === 0 ? 0 : 1)} ${units[u]}`
		},

		/**
		 * Dispatch to the tabbed self-fetch or the legacy store path.
		 *
		 * @return {Promise<void>}
		 */
		async loadAll() {
			this.loading = true
			this.loadSources()
			try {
				if (this.useTabs) {
					await this.loadTabs()
				} else {
					await this.loadViaStore()
				}
			} finally {
				this.loading = false
				this.hasLoaded = true
			}
		},

		/**
		 * Fetch every group directly from OpenRegister and build the tabs,
		 * one section at a time.
		 *
		 * 🔴 EACH SECTION SHOWS WHEN ITS OWN REQUEST RETURNS. This used to wait
		 * for relations, uses, used, contracts and files together behind one
		 * `Promise.all`, so the relations call (0.45 s on pipelinq's lead page)
		 * sat behind uses/used (about 9 s) and the card said "Loading …" the
		 * whole time. Now the groups are laid out up front in their fixed order
		 * and filled in place as each answer arrives, so a slow section never
		 * reorders or hides a fast one. A section still in flight is named in
		 * `pendingSections`; one whose request failed in `failedSections`.
		 *
		 * @spec openspec/changes/r4-object-lock-url-and-credentials-copy/specs/related-objects-progressive/spec.md
		 * @return {Promise<void>}
		 */
		async loadTabs() {
			const token = ++this.loadToken
			const current = () => token === this.loadToken
			this.loading = true
			this.failedSections = []

			const objectSuffixes = this.showObjects
				? ['uses', 'used', ...(this.showContracts ? ['contracts'] : [])]
				: []
			const sections = [
				...(this.showObjects ? [{ key: 'objects', label: this.objectsLabel }] : []),
				...(this.showFiles ? [{ key: 'files', label: this.filesLabel }] : []),
				{ key: 'relations', label: t('nextcloud-vue', 'Linked items') },
			]
			this.pendingSections = sections.map((section) => section.key)

			// Lay out every group now, in its fixed order, empty. visibleGroups
			// hides an empty group, so nothing shows until a section fills it.
			const groups = []
			if (this.showObjects) {
				groups.push({ key: 'objects', label: this.objectsLabel, icon: 'FileTreeOutline', integrationId: '', items: [], total: 0 })
			}
			if (this.showFiles) {
				groups.push({ key: 'files', label: this.filesLabel, icon: 'Paperclip', integrationId: 'files', items: [], total: 0 })
			}
			for (const def of LEAF_GROUPS) {
				groups.push({
					key: def.key,
					label: this.leafLabel(def.key),
					// Prefer the registered integration's icon so it matches the
					// sidebar/linked-apps; fall back to the known-good default.
					icon: this.integrationIcon(def.integrationId) || def.icon,
					integrationId: def.integrationId,
					requiredApp: def.requiredApp,
					items: [],
					total: 0,
				})
			}
			this.groups = groups

			const setGroup = (key, items, total) => {
				const index = this.groups.findIndex((group) => group.key === key)
				if (index === -1) {
					return
				}
				const next = this.groups.slice()
				next[index] = { ...next[index], items, total }
				this.groups = next
			}
			const settle = (key, ok) => {
				this.pendingSections = this.pendingSections.filter((k) => k !== key)
				if (!ok) {
					const section = sections.find((s) => s.key === key)
					this.failedSections = [...this.failedSections, { key, label: section ? section.label : key }]
				}
				// Keep the tab the reader saw first: pin it, so a slower section
				// that sorts before it does not take the panel away.
				if (!this.activeKey && this.visibleGroups.length) {
					this.activeKey = this.visibleGroups[0].key
				}
			}

			const loadRelations = this.fetchSection('relations').then(({ ok, data }) => {
				if (!current()) {
					return
				}
				for (const def of LEAF_GROUPS) {
					const block = data && data[def.responseKey]
					const results = (block && block.results) || []
					setGroup(def.key, results.map((r, i) => this.toLeafRow(r, i)), block ? (block.total ?? results.length) : 0)
				}
				settle('relations', ok)
			})

			const loadFiles = this.showFiles
				? this.fetchSection('files').then(({ ok, data }) => {
						if (!current()) {
							return
						}
						const fileResults = (data && data.results) || []
						setGroup('files', fileResults.map((f) => this.toFileRow(f)), data ? (data.total ?? fileResults.length) : 0)
						settle('files', ok)
					})
				: null

			// uses, used and contracts merge into one Objects group: each answer
			// re-merges what has arrived so far, and the group stays pending
			// until the last of them is in.
			const envelopes = objectSuffixes.map(() => null)
			let objectsOk = true
			const loadObjects = objectSuffixes.length
				? Promise.all(objectSuffixes.map((suffix, i) => this.fetchSection(suffix).then(async ({ ok, data }) => {
						if (!current()) {
							return
						}
						objectsOk = objectsOk && ok
						envelopes[i] = data
						await this.resolveSchemaTitles([data])
						if (!current()) {
							return
						}
						const objectItems = this.mergeObjectResults(envelopes)
						setGroup('objects', objectItems, objectItems.length)
					}))).then(() => {
						if (current()) {
							settle('objects', objectsOk)
						}
					})
				: null

			try {
				await Promise.all([loadRelations, loadFiles, loadObjects])
			} finally {
				if (current()) {
					this.loading = false
					this.pendingSections = []
				}
			}
		},

		/**
		 * Merge uses/used/contracts result envelopes into deduped object rows.
		 *
		 * @param {Array<object|null>} envelopes - The `{ results }` payloads.
		 * @return {Array<{ id: string, label: string, meta: string, raw: object }>}
		 */
		mergeObjectResults(envelopes) {
			const seen = new Set()
			const merged = []
			for (const envelope of envelopes) {
				for (const raw of ((envelope && envelope.results) || [])) {
					const row = this.toObjectRow(raw)
					const key = String(row.id)
					if (key && seen.has(key)) {
						continue
					}
					if (key) {
						seen.add(key)
					}
					merged.push(row)
				}
			}
			return merged
		},

		/**
		 * Translated label for a leaf group key.
		 *
		 * @param {string} key - The group key.
		 * @return {string}
		 */
		leafLabel(key) {
			const labels = {
				mails: t('nextcloud-vue', 'Mails'),
				events: t('nextcloud-vue', 'Meetings'),
				contacts: t('nextcloud-vue', 'Contacts'),
				notes: t('nextcloud-vue', 'Notes'),
				tasks: t('nextcloud-vue', 'Tasks'),
				deck: t('nextcloud-vue', 'Deck'),
				talk: t('nextcloud-vue', 'Talk'),
				forms: t('nextcloud-vue', 'Forms'),
				maps: t('nextcloud-vue', 'Maps'),
				polls: t('nextcloud-vue', 'Polls'),
				bookmarks: t('nextcloud-vue', 'Bookmarks'),
				collectives: t('nextcloud-vue', 'Collectives'),
				photos: t('nextcloud-vue', 'Photos'),
				cospend: t('nextcloud-vue', 'Cospend'),
				timetracker: t('nextcloud-vue', 'Time tracking'),
				analytics: t('nextcloud-vue', 'Analytics'),
				flow: t('nextcloud-vue', 'Flows'),
				openproject: t('nextcloud-vue', 'OpenProject'),
				xwiki: t('nextcloud-vue', 'Wiki'),
			}
			return labels[key] || key
		},

		/**
		 * Legacy store-action path: fetch relations/files from the object store.
		 *
		 * @return {Promise<void>}
		 */
		async loadViaStore() {
			if (!legacyWarned) {
				legacyWarned = true
				// eslint-disable-next-line no-console
				console.warn('[CnRelatedObjectsWidget] The store-action list path is deprecated; pass an object with `@self` (or register/schema props) to use the tabbed self-fetch path.')
			}

			const store = this.getStore()
			const type = this.objectType
			const id = this.resolvedId
			if (!store || !type || !id) {
				this.objectItems = []
				this.fileItems = []
				return
			}

			this.loading = true
			try {
				if (this.showObjects) {
					const calls = []
					if (typeof store.fetchUses === 'function') {
						calls.push(store.fetchUses(type, id))
					}
					if (typeof store.fetchUsed === 'function') {
						calls.push(store.fetchUsed(type, id))
					}
					if (typeof store.fetchContracts === 'function') {
						calls.push(store.fetchContracts(type, id))
					}
					const groups = await Promise.all(calls)
					await this.resolveSchemaTitles(groups.map((results) => ({ results: results || [] })))
					const seen = new Set()
					const merged = []
					for (const group of groups) {
						for (const raw of (group || [])) {
							const row = this.toObjectRow(raw)
							const key = String(row.id)
							if (key && seen.has(key)) {
								continue
							}
							if (key) {
								seen.add(key)
							}
							merged.push(row)
						}
					}
					this.objectItems = merged
				}

				if (this.showFiles && typeof store.fetchFiles === 'function') {
					const files = await store.fetchFiles(type, id)
					this.fileItems = (files || []).map((f) => this.toFileRow(f))
				}
			} finally {
				this.loading = false
			}
		},

		/**
		 * Refetch when the shared widget Refresh fires for this widget.
		 *
		 * @param {{ widgetId: string }} payload - Bus payload.
		 */
		/**
		 * A label through the host app's translate.
		 *
		 * @param {string} text The label.
		 * @return {string}
		 */
		translateLabel(text) {
			return typeof this.cnTranslate === 'function' ? this.cnTranslate(text) : text
		},

		/**
		 * Whether a row opens nothing: read from an `extraSources` entry with
		 * `static: true`.
		 *
		 * @param {object} group The group.
		 * @param {object} item The row.
		 * @return {boolean}
		 */
		isStaticRow(group, item) {
			return Boolean(group && group.isExtra && item && item.raw && item.raw.static === true)
		},

		/**
		 * Fill a template (or the first filling of a list of candidates) from a row.
		 *
		 * @param {string|Array<string>} template The template.
		 * @param {object} row The row.
		 * @return {string}
		 */
		fillRow(template, row) {
			// `{ parts, separator? }`: each part filled on its own, the empty ones left out.
			if (template && typeof template === 'object' && Array.isArray(template.parts)) {
				return template.parts.map((part) => this.fillRow(part, row)).filter((text) => text !== '').join(typeof template.separator === 'string' ? template.separator : ', ')
			}
			if (Array.isArray(template)) {
				return firstFilled(template, row, (text) => this.translateLabel(text))
			}
			return typeof template === 'string' && template !== '' ? fillTemplate(this.translateLabel(template), row) : ''
		},

		/**
		 * A route declaration with `{field}` tokens filled from a row.
		 *
		 * @param {object} route `{ name, params? }`.
		 * @param {object} row The row.
		 * @return {object|null}
		 */
		routeFor(route, row) {
			if (!route || typeof route !== 'object' || !route.name) {
				return null
			}
			const params = {}
			for (const [key, value] of Object.entries(route.params || {})) {
				const filled = typeof value === 'string' && value.includes('{') ? fillTemplate(value, row) : value
				if (filled === '' || filled === undefined || filled === null) {
					return null
				}
				params[key] = filled
			}
			return { name: route.name, params }
		},

		/**
		 * Read `extraSources` and `referenceSections` into sections. A failed
		 * read is logged and leaves its section out: the related content
		 * around it stays.
		 *
		 * @return {Promise<void>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-related-objects-can-read-extra-sections-from-endpoints
		 */
		async loadSources() {
			const sources = Array.isArray(this.extraSources) ? this.extraSources : []
			const references = Array.isArray(this.referenceSections) ? this.referenceSections : []
			if ((sources.length === 0 && references.length === 0) || !this.resolvedId) {
				this.sourcedSections = []
				return
			}
			const { default: axios } = await import('@nextcloud/axios')
			const sections = []
			await Promise.all(sources.map(async (source, index) => {
				if (!source || typeof source.endpoint !== 'string' || source.endpoint === '') {
					return
				}
				try {
					const url = generateUrl(interpolateUrlTokens(source.endpoint, { objectId: this.resolvedId, object: this.safeObjectData }))
					const { data } = await axios.get(url)
					const list = source.path ? readPath(data, source.path) : data
					sections.push(...this.sectionsOf(source, Array.isArray(list) ? list : [], index))
				} catch (error) {
					// eslint-disable-next-line no-console
					console.warn(`[CnRelatedObjectsWidget] ${source.key || source.endpoint} could not be read`, error)
				}
			}))
			await Promise.all(references.map(async (ref) => {
				const id = ref && ref.field ? readPath(this.safeObjectData, ref.field) : ''
				if (typeof id !== 'string' || id.trim() === '' || id === String(this.resolvedId) || !ref.register || !ref.schema) {
					return
				}
				try {
					const { data } = await axios.get(generateUrl('/apps/openregister/api/objects/{register}/{schema}/{id}', { register: ref.register, schema: ref.schema, id: id.trim() }))
					const label = String(readPath(data || {}, ref.labelField || 'title') ?? '').trim()
					if (label === '' || BARE_UUID.test(label)) {
						return
					}
					sections.push({
						key: ref.key || `reference-${ref.field}`,
						label: this.translateLabel(ref.label || ref.field),
						icon: ref.icon || 'FileTreeOutline',
						items: [{ id: id.trim(), label, route: this.routeFor(ref.route, { id: id.trim(), ...(data || {}) }) }],
					})
				} catch (error) {
					// eslint-disable-next-line no-console
					console.warn(`[CnRelatedObjectsWidget] the record ${ref.field} names could not be read`, error)
				}
			}))
			const order = (key) => {
				const at = [...sources, ...references].findIndex((entry) => entry && (entry.key === key || String(key).startsWith(`${entry.key}:`)))
				return at === -1 ? Number.MAX_SAFE_INTEGER : at
			}
			this.sourcedSections = sections.sort((a, b) => order(a.key) - order(b.key))
		},

		/**
		 * The section (or, with `groupBy`, the sections) one source's rows make.
		 *
		 * @param {object} source The `extraSources` entry.
		 * @param {Array<object>} rows The rows.
		 * @param {number} index The entry's place.
		 * @return {Array<object>}
		 */
		sectionsOf(source, rows, index) {
			const key = source.key || `source-${index}`
			const items = rows.filter((entry) => entry && typeof entry === 'object').map((stored, i) => {
				const row = this.labelledRow(stored, source.valueLabels)
				const label = this.fillRow(source.itemLabel || '{title}', row)
				return {
					id: String(stored.id ?? i),
					label,
					meta: this.fillRow(source.itemMeta, row),
					static: source.static === true,
					route: source.static === true ? null : this.routeFor(source.rowRoute, stored),
					actions: this.rowActionsFor(source, stored),
					children: this.childrenFor(source, stored),
					group: source.groupBy ? this.fillRow(source.groupBy, row) : '',
					row: stored,
				}
			}).filter((item) => !source.requireLabel || (item.label.trim() !== '' && !BARE_UUID.test(item.label.trim())))
			if (!source.groupBy) {
				return [{ key, label: this.translateLabel(source.label || key), icon: source.icon || 'LinkVariant', items }]
			}
			const labels = source.groupLabels && typeof source.groupLabels === 'object' ? source.groupLabels : {}
			const groups = new Map()
			for (const item of items) {
				const name = labels[item.group] ? this.translateLabel(labels[item.group]) : item.group
				if (!groups.has(name)) {
					groups.set(name, [])
				}
				groups.get(name).push(item)
			}
			return [...groups.entries()].map(([name, list]) => ({ key: `${key}:${name}`, label: name, icon: source.icon || 'LinkVariant', items: list }))
		},

		/**
		 * A row with its coded values replaced by their labels
		 * (`valueLabels: { recurrence: { monthly: "Every month" } }`), translated.
		 *
		 * @param {object} row The row.
		 * @param {object} valueLabels The labels by field and value.
		 * @return {object}
		 */
		labelledRow(row, valueLabels) {
			if (!valueLabels || typeof valueLabels !== 'object') {
				return row
			}
			const out = { ...row }
			for (const [field, map] of Object.entries(valueLabels)) {
				const raw = row[field]
				if ((typeof raw === 'string' || typeof raw === 'number') && map && Object.hasOwn(map, raw)) {
					out[field] = map[raw] === '' ? '' : this.translateLabel(map[raw])
				}
			}
			return out
		},

		/**
		 * The buttons under one row: `rowActions` whose `when` holds for it.
		 *
		 * @param {object} source The `extraSources` entry.
		 * @param {object} row The row.
		 * @return {Array<object>}
		 */
		rowActionsFor(source, row) {
			return (Array.isArray(source.rowActions) ? source.rowActions : [])
				.filter((action) => action && typeof action.label === 'string' && typeof action.endpoint === 'string' && (!action.when || evaluateVisibleWhenLocal(action.when, row)))
				.map((action) => ({ ...action, label: this.translateLabel(action.label) }))
		},

		/**
		 * The links under one row (`children`: `{ path, label, route }`).
		 *
		 * @param {object} source The `extraSources` entry.
		 * @param {object} row The row.
		 * @return {Array<{key: string, label: string, to: (object|null)}>}
		 */
		childrenFor(source, row) {
			const spec = source.children
			const list = spec && spec.path ? readPath(row, spec.path) : null
			if (!Array.isArray(list)) {
				return []
			}
			return list.filter((child) => child && typeof child === 'object').map((child, i) => ({
				key: String(child.id ?? i),
				label: this.fillRow(spec.label || '{title}', child) || String(child.id ?? ''),
				to: this.routeFor(spec.route, child),
			}))
		},

		/**
		 * Run a row action: POST (or `method`) to its endpoint with `@objectId`
		 * and the row's `{field}` tokens filled in, then read the sources
		 * again. A refusal shows the server's sentence.
		 *
		 * @param {object} action The action.
		 * @param {object} raw The row's section item.
		 * @return {Promise<void>}
		 * @spec openspec/changes/dq-abstract-record-widgets/specs/record-widgets/spec.md#requirement-related-objects-can-read-extra-sections-from-endpoints
		 */
		async runSourceAction(action, raw) {
			const row = raw && raw.row ? raw.row : raw
			const path = interpolateUrlTokens(action.endpoint, { objectId: this.resolvedId, object: this.safeObjectData })
				.replace(/\{([\w.@]+)\}/g, (_match, field) => encodeURIComponent(String(readPath(row, field) ?? '')))
			this.runningAction = path
			this.sourceActionError = ''
			try {
				const { default: axios } = await import('@nextcloud/axios')
				await axios.request({ method: typeof action.method === 'string' ? action.method.toLowerCase() : 'post', url: generateUrl(path) })
				await this.loadSources()
			} catch (error) {
				const said = error?.response?.data?.message ?? error?.response?.data?.error
				this.sourceActionError = typeof said === 'string' && said !== ''
					? said
					: (action.errorText ? this.translateLabel(action.errorText) : t('nextcloud-vue', 'This did not work. Try again.'))
			} finally {
				this.runningAction = ''
			}
		},

		/**
		 * Dispatch a footer action with the record's tokens resolved.
		 *
		 * @param {object} action The action.
		 * @return {void}
		 */
		runFooterAction(action) {
			const { label, icon, ...declared } = action
			const resolved = resolveDeepTokens(declared, { objectId: this.resolvedId, object: this.safeObjectData })
			if (typeof this.cnDispatchAction === 'function') {
				this.cnDispatchAction(resolved)
				return
			}
			dispatchAction(resolved, { router: this.$router || null })
		},

		onBusRefresh(payload) {
			const mine = this.widgetId || this.objectType
			if (!payload || !payload.widgetId || !mine || payload.widgetId === mine) {
				this.loadAll()
			}
		},
	},
}
</script>

<style scoped>
.cn-related-objects-widget__children {
	margin: 0 0 4px 36px;
	padding: 0;
	list-style: none;
}

.cn-related-objects-widget__row-actions,
.cn-related-objects-widget__footer-actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
	margin: 4px 0 8px 36px;
}

.cn-related-objects-widget__footer-actions {
	margin-inline-start: 0;
}

.cn-related-objects-widget__row--static {
	cursor: default;
}

.cn-related-objects-widget__section + .cn-related-objects-widget__section {
	margin-top: 16px;
}

.cn-related-objects-widget__section-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	padding-bottom: 8px;
	border-bottom: 1px solid var(--color-border);
}

.cn-related-objects-widget__section-title {
	margin: 0;
	font-size: 15px;
	font-weight: 700;
}

.cn-related-objects-widget__section-action {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 34px;
	padding: 0 12px;
	border: none;
	border-radius: 17px;
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
}

.cn-related-objects-widget__section-action:focus-visible {
	outline: 2px solid var(--color-main-text);
	outline-offset: 2px;
}

.cn-related-objects-widget__group {
	padding: calc(2 * var(--default-grid-baseline, 4px)) 0;
}

.cn-related-objects-widget__group + .cn-related-objects-widget__group {
	border-top: 1px solid var(--color-border);
}

.cn-related-objects-widget__group-title {
	display: flex;
	align-items: center;
	gap: 6px;
	margin: 0 0 4px;
	padding: 0 calc(2 * var(--default-grid-baseline, 4px));
	font-size: 0.8em;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.02em;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	padding: calc(1.5 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
	border-bottom: 1px solid var(--color-border);
}

.cn-related-objects-widget__tab {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border: none;
	border-radius: var(--border-radius-pill, 16px);
	background: transparent;
	color: var(--color-main-text);
	cursor: pointer;
	font-size: 0.9em;
}

.cn-related-objects-widget__tab:hover {
	background: var(--color-background-hover);
}

.cn-related-objects-widget__tab--active {
	background: var(--color-primary-element-light, var(--color-background-dark));
	color: var(--color-primary-element-light-text, var(--color-main-text));
}

.cn-related-objects-widget__tab:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-related-objects-widget__tab-icon {
	flex: 0 0 auto;
}

.cn-related-objects-widget__panel-actions {
	display: flex;
	justify-content: flex-end;
	padding: 4px calc(2 * var(--default-grid-baseline, 4px)) 0;
}

.cn-related-objects-widget__open-sidebar {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	padding: 2px 8px;
	border: none;
	background: transparent;
	color: var(--color-primary-element);
	cursor: pointer;
	font-size: 0.85em;
}

.cn-related-objects-widget__open-sidebar:hover {
	text-decoration: underline;
}

.cn-related-objects-widget__count {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 18px;
	height: 18px;
	padding: 0 5px;
	border-radius: 9px;
	background: var(--color-background-dark);
	font-size: 0.9em;
	font-weight: 600;
}

.cn-related-objects-widget__list {
	list-style: none;
	margin: 0;
	padding: 0;
}

.cn-related-objects-widget__row {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10px;
	padding: calc(1.5 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
	cursor: pointer;
	border-radius: var(--border-radius);
	color: inherit;
	text-decoration: none;
}

.cn-related-objects-widget__detail {
	flex-basis: 100%;
	margin: 4px 0 0 calc(20px + 10px);
	padding: 8px 10px;
	font-size: 0.9em;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	color: var(--color-main-text);
	background: var(--color-background-hover);
	border-radius: var(--border-radius);
}

.cn-related-objects-widget__row:hover {
	background: var(--color-background-hover);
}

.cn-related-objects-widget__row:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: -2px;
}

.cn-related-objects-widget__icon {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__label {
	flex: 1 1 auto;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	color: var(--color-main-text);
}

.cn-related-objects-widget__meta {
	flex: 0 0 auto;
	font-size: 0.85em;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__chevron {
	flex: 0 0 auto;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__empty {
	padding: calc(3 * var(--default-grid-baseline, 4px)) calc(2 * var(--default-grid-baseline, 4px));
	color: var(--color-text-maxcontrast);
	font-style: italic;
}

.cn-related-objects-widget__section-status {
	margin: 0;
	padding: var(--default-grid-baseline, 4px) calc(2 * var(--default-grid-baseline, 4px));
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-related-objects-widget__section-error {
	margin: 0;
	padding: var(--default-grid-baseline, 4px) calc(2 * var(--default-grid-baseline, 4px));
	color: var(--color-error-text, var(--color-error));
	font-size: 0.85em;
}

.cn-related-objects-widget__empty-state {
	/* NcEmptyContent defaults to filling tall parents; inside a widget cell a
	   compact block reads better. */
	padding: calc(4 * var(--default-grid-baseline, 4px)) 0;
	margin: 0;
	color: var(--color-text-maxcontrast);
}

.cn-related-objects-widget__footer {
	display: flex;
	align-items: center;
	gap: calc(2 * var(--default-grid-baseline, 4px));
	padding: calc(2 * var(--default-grid-baseline, 4px));
}

.cn-related-objects-widget__add-error {
	color: var(--color-error);
	font-size: 0.85em;
}

.cn-related-objects-widget__file-input {
	display: none;
}
</style>
