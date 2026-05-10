<!--
  CnSettingsPage — Admin / config surface.

  Renders manifest-driven config sections. The page MAY declare
  EITHER a flat `sections[]` array (back-compat) OR a `tabs[]` array
  (each tab owns its own `sections[]`) — XOR, never both. See
  manifest-settings-orchestration spec.

  Each section is a CnSettingsCard wrapping a CnSettingsSection.
  A section MUST declare exactly one of three body kinds:

    1. `fields[]`   — flat form fields (back-compat, default)
    2. `component`  — registry-resolved component as the section body
    3. `widgets[]`  — ordered list of widgets (built-in + customComponents)

  Built-in widget types (resolved BEFORE the customComponents registry):
    - `version-info`     → CnVersionInfoCard
    - `register-mapping` → CnRegisterMapping
    - `component`        → discriminator; `widget.componentName`
                           resolves against customComponents

  Saves via `axios.put(saveEndpoint, formData)` with the consumer's
  settings controller URL. Widget events bubble up through
  `@widget-event` so consumers wire one page-level handler that
  dispatches by `widgetType` + event `name` (the manifest can't carry
  inline JS).

  Supports the same `headerComponent` / `actionsComponent` / generic
  `slots` overrides that the other built-in page types do — the
  CnPageRenderer wires them via the `#header`, `#actions`, and named
  `slots[]` slots exposed here.
-->
<template>
	<div class="cn-settings-page">
		<!-- Header — overridable via #header slot -->
		<slot
			name="header"
			:title="title"
			:description="description"
			:icon="icon">
			<CnPageHeader
				v-if="showTitle && title"
				:title="title"
				:description="description"
				:icon="icon" />
		</slot>

		<!-- Actions slot for save / discard / reset overrides -->
		<div v-if="$slots.actions || $scopedSlots.actions" class="cn-settings-page__actions">
			<slot name="actions" />
		</div>

		<!-- Tab strip — only rendered when `tabs[]` is set
			 (manifest-settings-orchestration REQ-MSO-5). Built with
			 native <button role="tab"> + ARIA wiring; uses Nextcloud
			 CSS variables only (no hex literals). -->
		<div
			v-if="hasTabs"
			class="cn-settings-page__tabs"
			role="tablist">
			<button
				v-for="(tab, tabIndex) in tabs"
				:key="`tab-${tab.id}`"
				role="tab"
				type="button"
				class="cn-settings-page__tab"
				:class="{ 'cn-settings-page__tab--active': activeTabId === tab.id }"
				:aria-selected="activeTabId === tab.id ? 'true' : 'false'"
				:aria-controls="`cn-settings-tab-panel-${tab.id}`"
				@click="onTabClick(tab, tabIndex)">
				{{ resolveLabel(tab.label) }}
			</button>
		</div>

		<!-- Sections — rendered for the active tab when `tabs[]` is
			 set, otherwise the flat `sections[]` (back-compat). -->
		<CnSettingsCard
			v-for="(section, sectionIndex) in activeSections"
			:key="`section-${activeTabId || 'flat'}-${sectionIndex}`"
			:title="resolveLabel(section.title)"
			:icon="section.icon || ''"
			:collapsible="section.collapsible || false">
			<!--
				Body resolution — see `sectionBodyKind(section)` in the
				script: returns 'fields' (default + back-compat),
				'component', or 'widgets'.
			-->

			<!-- Body: bare fields[] (back-compat). Wrapped in a
				 CnSettingsSection mirroring the pre-rich-sections layout. -->
			<CnSettingsSection
				v-if="sectionBodyKind(section) === 'fields'"
				:name="resolveLabel(section.title)"
				:description="resolveLabel(section.description)"
				:doc-url="section.docUrl || ''">
				<div class="cn-settings-page__fields">
					<div
						v-for="field in section.fields"
						:key="field.key"
						class="cn-settings-page__field">
						<!-- Per-field slot — `field-<key>` lets a consumer override the input entirely. -->
						<slot
							:name="`field-${field.key}`"
							:field="field"
							:value="formData[field.key]"
							:on-input="(v) => updateField(field.key, v)">
							<NcCheckboxRadioSwitch
								v-if="field.type === 'boolean'"
								:checked="!!formData[field.key]"
								@update:checked="updateField(field.key, $event)">
								{{ resolveLabel(field.label) }}
							</NcCheckboxRadioSwitch>
							<NcTextField
								v-else-if="field.type === 'number'"
								:label="resolveLabel(field.label)"
								type="number"
								:value="String(fieldValue(field.key, ''))"
								@update:value="updateField(field.key, $event === '' ? null : Number($event))" />
							<NcTextField
								v-else-if="field.type === 'password'"
								:label="resolveLabel(field.label)"
								type="password"
								:value="fieldValue(field.key, '')"
								@update:value="updateField(field.key, $event)" />
							<NcSelect
								v-else-if="field.type === 'enum' && Array.isArray(field.options)"
								:value="selectedOption(field)"
								:options="field.options"
								:input-label="resolveLabel(field.label)"
								@input="updateField(field.key, optionValue($event))" />
							<NcTextField
								v-else
								:label="resolveLabel(field.label)"
								:value="fieldValue(field.key, '')"
								@update:value="updateField(field.key, $event)" />
						</slot>
						<small
							v-if="field.help"
							class="cn-settings-page__field-help">
							{{ resolveLabel(field.help) }}
						</small>
					</div>
				</div>
			</CnSettingsSection>

			<!-- Body: a single registry-resolved component. The
				 component is responsible for its own chrome — we do
				 NOT wrap it in CnSettingsSection because the existing
				 widget shape (CnVersionInfoCard, CnRegisterMapping)
				 already wraps itself. Custom components are expected
				 to do the same OR opt in by adding their own section
				 wrapper.

				 Wrapped in CnSettingsWidgetMount so the child's $emit
				 is intercepted and re-emitted as @widget-event on this
				 page (manifests can't carry inline JS). -->
			<CnSettingsWidgetMount
				v-else-if="sectionBodyKind(section) === 'component' && resolveSectionComponent(section)"
				:component="resolveSectionComponent(section)"
				:component-props="section.props || {}"
				:widget-type="section.component"
				:section-index="sectionIndex"
				:widget-index="0"
				@widget-event="onWidgetEvent" />

			<!-- Body: ordered list of widgets. Each widget is its own
				 mounted component with v-bind props + bubbled events
				 via CnSettingsWidgetMount. Built-ins (version-info,
				 register-mapping) wrap themselves in CnSettingsSection;
				 custom widgets are expected to do the same. -->
			<template v-else-if="sectionBodyKind(section) === 'widgets'">
				<CnSettingsWidgetMount
					v-for="entry in resolvedWidgetEntries(section, sectionIndex)"
					:key="entry.key"
					:component="entry.component"
					:component-props="entry.props"
					:widget-type="entry.widgetType"
					:section-index="sectionIndex"
					:widget-index="entry.widgetIndex"
					@widget-event="onWidgetEvent" />
			</template>
		</CnSettingsCard>

		<!-- Save bar -->
		<div v-if="showSaveBar" class="cn-settings-page__save-bar">
			<NcButton
				type="primary"
				:disabled="saving || !dirty"
				@click="save">
				<template #icon>
					<NcLoadingIcon v-if="saving" :size="20" />
					<ContentSave v-else :size="20" />
				</template>
				{{ saveLabel }}
			</NcButton>
			<NcButton
				v-if="dirty"
				type="tertiary"
				:disabled="saving"
				@click="reset">
				{{ resetLabel }}
			</NcButton>
		</div>

		<!-- Error -->
		<div v-if="lastError" class="cn-settings-page__error">
			{{ lastError }}
		</div>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import axios from '@nextcloud/axios'
import {
	NcButton,
	NcCheckboxRadioSwitch,
	NcLoadingIcon,
	NcSelect,
	NcTextField,
} from '@nextcloud/vue'
import ContentSave from 'vue-material-design-icons/ContentSave.vue'
import { CnSettingsCard } from '../CnSettingsCard/index.js'
import { CnSettingsSection } from '../CnSettingsSection/index.js'
import { CnPageHeader } from '../CnPageHeader/index.js'
import CnVersionInfoCard from '../CnVersionInfoCard/CnVersionInfoCard.vue'
import CnRegisterMapping from '../CnRegisterMapping/CnRegisterMapping.vue'
import CnSettingsWidgetMount from './CnSettingsWidgetMount.js'

/**
 * Sentinel value used in the built-in widget registry to mark the
 * `'component'` discriminator (manifest-settings-orchestration
 * REQ-MSO-6). The discriminator does NOT resolve to a fixed
 * component — instead, the resolver detects this sentinel and looks
 * up `widget.componentName` in the customComponents registry.
 */
const COMPONENT_DISCRIMINATOR = Symbol('cn-settings-component-widget')

/**
 * Built-in widget registry. Used by `CnSettingsPage` to resolve
 * `widgets[].type` to a component BEFORE consulting the
 * consumer-provided customComponents registry.
 *
 * The order matters — built-ins win on collision so consumers can't
 * accidentally shadow `version-info` with their own component. If a
 * consumer needs to truly replace one of these, they can render their
 * own component via `section.component` or
 * `{ type: "component", componentName: <name> }` instead of `widgets[]`.
 *
 * Spec:
 *  - REQ-MSRS-2 (manifest-settings-rich-sections) — fixed-component
 *    built-ins (`version-info`, `register-mapping`).
 *  - REQ-MSO-6 (manifest-settings-orchestration) — `'component'`
 *    discriminator (sentinel value, resolved via componentName).
 */
const BUILTIN_SETTINGS_WIDGETS = Object.freeze({
	'version-info': CnVersionInfoCard,
	'register-mapping': CnRegisterMapping,
	component: COMPONENT_DISCRIMINATOR,
})

/**
 * CnSettingsPage — Manifest-driven settings page.
 *
 * Reads `sections[]` from `pages[].config` and renders one
 * `CnSettingsCard` per section. Each section declares EXACTLY ONE of
 * three body kinds:
 *
 *  - `fields[]`    — flat form fields (back-compat default).
 *    Each field's `type` controls which input renders:
 *      - `boolean` → NcCheckboxRadioSwitch
 *      - `number` → NcTextField (type=number)
 *      - `string` → NcTextField (default)
 *      - `password` → NcTextField (type=password)
 *      - `enum` → NcSelect (requires `options: string[]`)
 *    Per-field `#field-<key>` slots are exposed so consumers can drop
 *    in their own widget.
 *
 *  - `component`   — registry-resolved component as the section body.
 *    `section.props` is v-bind'd to it. Useful when a whole section
 *    is one bespoke widget the library doesn't know about.
 *
 *  - `widgets[]`   — ordered list of widgets. Each entry has a `type`
 *    string and optional `props`. Built-in widget types resolve
 *    first (`version-info` → `CnVersionInfoCard`, `register-mapping`
 *    → `CnRegisterMapping`); unknown types fall back to the
 *    `customComponents` registry.
 *
 * Widget events (e.g. CnRegisterMapping's `@save`, CnVersionInfoCard's
 * `@update`) bubble up as a single `@widget-event` event on the page,
 * with payload `{ widgetType, widgetIndex, sectionIndex, name, args }`.
 * Consumers wire one handler at the CnAppRoot level and dispatch by
 * `widgetType` / `name` — the manifest can't carry inline JS, so this
 * is the documented event-wiring escape hatch.
 *
 * Saves via `axios.put(saveEndpoint, formData)`. The `saveEndpoint`
 * default is `/index.php/apps/{appId}/api/settings` — consumers should
 * pass a fully-qualified URL via the manifest (or `saveEndpoint` prop)
 * because the library has no knowledge of the consumer's app id at
 * import time.
 *
 * Slots:
 *  - `#header` — Replaces the CnPageHeader.
 *  - `#actions` — Right-aligned actions area (the renderer fills this
 *    via `pages[].actionsComponent`).
 *  - `#field-<key>` — Replaces the input for a specific field within
 *    a `fields[]` section. Scope: `{ field, value, onInput }`.
 *
 * Events:
 *  - `@save` — Emitted on successful save. Payload: the form data.
 *  - `@error` — Emitted when save fails. Payload: the error.
 *  - `@input` — Emitted on every field change. Payload: `{ key, value }`.
 *  - `@widget-event` — Emitted when a widget mounted via `widgets[]`
 *    or `component` re-emits one of its own events. Payload:
 *    `{ widgetType, widgetIndex, sectionIndex, name, args }`.
 */
export default {
	name: 'CnSettingsPage',

	components: {
		NcButton,
		NcCheckboxRadioSwitch,
		NcLoadingIcon,
		NcSelect,
		NcTextField,
		ContentSave,
		CnSettingsCard,
		CnSettingsSection,
		CnPageHeader,
		CnSettingsWidgetMount,
	},

	inject: {
		/**
		 * Custom-component registry injected from CnAppRoot. Used to
		 * resolve `section.component` and to fall back when a
		 * `widgets[].type` isn't in the built-in widget map. Defaults
		 * to an empty object when the page is mounted standalone.
		 *
		 * @type {object}
		 */
		cnCustomComponents: { default: () => ({}) },
	},

	props: {
		/** Page title. */
		title: {
			type: String,
			default: () => t('nextcloud-vue', 'Settings'),
		},
		/** Description shown under the title when `showTitle` is set. */
		description: {
			type: String,
			default: '',
		},
		/** Whether to render the inline page header. */
		showTitle: {
			type: Boolean,
			default: false,
		},
		/** MDI icon name for the header. */
		icon: {
			type: String,
			default: '',
		},
		/**
		 * Section definitions (flat shape — back-compat). Each section
		 * MUST declare EXACTLY ONE of:
		 *  - `fields: Array<Field>` (back-compat flat-field body)
		 *  - `component: <registry-name>` + optional `props`
		 *  - `widgets: Array<{ type, props?, componentName? }>`
		 *
		 * Common keys: `{ title, description?, icon?, collapsible?, docUrl? }`.
		 *
		 * Mutually exclusive with `tabs[]` (XOR — see
		 * manifest-settings-orchestration REQ-MSO-1).
		 *
		 * @type {Array<object>}
		 */
		sections: {
			type: Array,
			default: () => [],
		},
		/**
		 * Tab definitions (orchestration shape — manifest-settings-
		 * orchestration REQ-MSO-2). When set, CnSettingsPage renders
		 * a tab strip above the section area; the active tab's
		 * `sections[]` flow into the same renderer used by the flat
		 * shape. Mutually exclusive with `sections[]`.
		 *
		 * Each tab MUST be `{ id: string, label: string,
		 * icon?: string, sections: array<Section> }`.
		 *
		 * @type {Array<object>}
		 */
		tabs: {
			type: Array,
			default: () => [],
		},
		/**
		 * Optional ID of the tab to activate on mount. When empty AND
		 * `tabs[]` is non-empty, the first tab is active by default.
		 * Unknown IDs fall back to the first tab.
		 *
		 * @type {string}
		 */
		initialTab: {
			type: String,
			default: '',
		},
		/**
		 * Initial values keyed by `field.key`. Defaults to an empty
		 * object; in practice the consumer passes the current
		 * IAppConfig snapshot loaded from their settings controller.
		 *
		 * @type {object}
		 */
		initialValues: {
			type: Object,
			default: () => ({}),
		},
		/**
		 * Endpoint that receives the PUT on save. Pass a fully-qualified
		 * URL — the library has no knowledge of the consumer's app id.
		 * When empty, no PUT is issued and `@save` is emitted with the
		 * form data so the consumer can persist it themselves.
		 */
		saveEndpoint: {
			type: String,
			default: '',
		},
		/** Whether to render the built-in save/reset bar. */
		showSaveBar: {
			type: Boolean,
			default: true,
		},
		/** Label for the save button. */
		saveLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Save'),
		},
		/** Label for the reset (discard) button. */
		resetLabel: {
			type: String,
			default: () => t('nextcloud-vue', 'Discard changes'),
		},
		/**
		 * Optional translation function. When provided, applied to
		 * section titles, field labels, and other i18n-key strings
		 * declared in the manifest. Defaults to the identity function.
		 *
		 * @type {Function|null}
		 */
		translate: {
			type: Function,
			default: null,
		},
		/**
		 * Optional explicit custom-component registry. When set, takes
		 * precedence over the injected `cnCustomComponents`. Use this
		 * when mounting CnSettingsPage outside a CnAppRoot tree (or
		 * when test-mounting with a stub registry).
		 *
		 * @type {object|null}
		 */
		customComponents: {
			type: Object,
			default: null,
		},
	},

	emits: ['save', 'error', 'input', 'widget-event', 'tab-change'],

	data() {
		// Resolve the initial active-tab id synchronously so the very
		// first render has the correct tab active (otherwise tests
		// that mount + assert without an `await tick` see the empty
		// default). Mirrors the logic in `resolveInitialTabId` (the
		// watcher path); keep them aligned.
		let activeTabId = ''
		const tabs = Array.isArray(this.tabs) ? this.tabs : []
		if (tabs.length > 0) {
			if (typeof this.initialTab === 'string' && this.initialTab.length > 0
				&& tabs.some(t => t && t.id === this.initialTab)) {
				activeTabId = this.initialTab
			} else if (tabs[0] && typeof tabs[0].id === 'string') {
				activeTabId = tabs[0].id
			}
		}
		return {
			formData: this.cloneInitial(),
			originalData: this.cloneInitial(),
			saving: false,
			lastError: null,
			activeTabId,
		}
	},

	computed: {
		/** Whether any field has changed since load. */
		dirty() {
			return JSON.stringify(this.formData) !== JSON.stringify(this.originalData)
		},
		/**
		 * Effective custom-component registry. Explicit prop wins over
		 * the injected value (mirrors CnPageRenderer's resolution
		 * order).
		 *
		 * @return {object}
		 */
		effectiveCustomComponents() {
			return this.customComponents ?? this.cnCustomComponents ?? {}
		},
		/**
		 * Whether the page is in tabs orchestration mode. True when
		 * `tabs[]` is non-empty — drives the tab-strip render gate
		 * (manifest-settings-orchestration REQ-MSO-5).
		 *
		 * @return {boolean}
		 */
		hasTabs() {
			return Array.isArray(this.tabs) && this.tabs.length > 0
		},
		/**
		 * The sections to render right now. In flat mode, this is the
		 * `sections` prop directly. In tabs mode, this is the
		 * `sections[]` array of the currently active tab. Centralising
		 * this in one computed keeps the template's `v-for` simple
		 * and decouples it from the body kind dispatcher (which
		 * applies per-section, not per-mode).
		 *
		 * @return {Array<object>}
		 */
		activeSections() {
			if (!this.hasTabs) return this.sections || []
			const active = this.tabs.find(t => t && t.id === this.activeTabId)
			if (active && Array.isArray(active.sections)) return active.sections
			// Defensive fallback — should not happen because
			// `resolveInitialTabId` always lands on a known tab.
			const first = this.tabs[0]
			return first && Array.isArray(first.sections) ? first.sections : []
		},
	},

	watch: {
		initialValues: {
			deep: true,
			handler() {
				this.formData = this.cloneInitial()
				this.originalData = this.cloneInitial()
			},
		},
		// When `tabs[]` changes (e.g. consumer swaps manifests at
		// runtime), re-resolve the active tab so the page doesn't get
		// stuck on a removed id.
		tabs: {
			handler() {
				this.activeTabId = this.resolveInitialTabId()
			},
		},
		// When `initialTab` changes (consumer-controlled tab
		// activation), follow it.
		initialTab(next) {
			if (typeof next === 'string' && next.length > 0) {
				const exists = this.tabs.some(t => t && t.id === next)
				if (exists) this.activeTabId = next
			}
		},
	},

	methods: {
		// Coalesce a field value to a fallback when null / undefined.
		// Used in template bindings instead of `formData[key] ?? ''` because
		// vue-template-es2015-compiler (the Rollup VuePlugin's parser) does
		// not accept ES2020 nullish-coalescing inside template expressions.
		fieldValue(key, fallback) {
			const v = this.formData[key]
			return (v === null || v === undefined) ? fallback : v
		},
		// Resolve the currently-selected option for an enum field.
		// `field.options` may be an array of strings/numbers OR an array
		// of `{ label, value }`-shaped objects. NcSelect needs the actual
		// option entry (not the bare value) to render the selection
		// correctly, so this resolver looks up the matching object form
		// when a primitive value is stored. Returns `null` when nothing
		// is selected so NcSelect renders the empty state instead of
		// emitting a Vue warning about an undefined `value` prop.
		selectedOption(field) {
			const v = this.formData[field.key]
			if (v === null || v === undefined) return null
			if (!Array.isArray(field.options)) return v
			for (const opt of field.options) {
				if (opt && typeof opt === 'object') {
					if (opt.value === v) return opt
				} else if (opt === v) {
					return opt
				}
			}
			return v
		},
		// Inverse of `selectedOption` — extract the storable value from
		// whatever NcSelect emits. NcSelect emits the full option entry
		// when options are objects, the primitive when options are
		// primitives, or `null` on clear.
		optionValue(emitted) {
			if (emitted === null || emitted === undefined) return null
			if (typeof emitted === 'object' && 'value' in emitted) {
				return emitted.value
			}
			return emitted
		},
		cloneInitial() {
			const merged = { ...(this.initialValues || {}) }
			// Collect every section across both modes (flat
			// `sections[]` AND `tabs[].sections[]`) so default values
			// are applied regardless of orchestration shape.
			// Only flat-field sections contribute defaults; component
			// and widgets sections own their own state.
			const allSections = []
			for (const section of this.sections || []) allSections.push(section)
			for (const tab of this.tabs || []) {
				if (tab && Array.isArray(tab.sections)) {
					for (const section of tab.sections) allSections.push(section)
				}
			}
			for (const section of allSections) {
				if (!section || !Array.isArray(section.fields)) continue
				for (const field of section.fields) {
					if (field.default !== undefined && merged[field.key] === undefined) {
						merged[field.key] = field.default
					}
				}
			}
			return merged
		},

		resolveLabel(value) {
			if (!value) return ''
			if (this.translate) return this.translate(value)
			return value
		},

		updateField(key, value) {
			this.$set(this.formData, key, value)
			this.$emit('input', { key, value })
		},

		/**
		 * Determine which body kind a section declares. Returns
		 * `'fields'` (default + back-compat), `'component'`, or
		 * `'widgets'`. The validator (`validateManifest`) enforces
		 * exactly-one at parse time; this method is the runtime
		 * equivalent and is permissive when one of the keys is set
		 * (last-defined wins in the rare case of an unvalidated
		 * manifest).
		 *
		 * @param {object} section A section entry from `sections[]`.
		 * @return {'fields' | 'component' | 'widgets'}
		 */
		sectionBodyKind(section) {
			if (Array.isArray(section.widgets) && section.widgets.length > 0) {
				return 'widgets'
			}
			if (typeof section.component === 'string' && section.component.length > 0) {
				return 'component'
			}
			return 'fields'
		},

		/**
		 * Resolve a `section.component` registry name to a Vue
		 * component via `effectiveCustomComponents`. Returns `null`
		 * (and warns) when the registry has no entry.
		 *
		 * @param {object} section A section entry.
		 * @return {object|null} Vue component or null.
		 */
		resolveSectionComponent(section) {
			const name = section.component
			if (!name) return null
			const resolved = this.effectiveCustomComponents[name]
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnSettingsPage] Section component "${name}" not found in customComponents registry. Section body will be empty.`,
				)
				return null
			}
			return resolved
		},

		/**
		 * Resolve a single `widgets[]` entry to a concrete Vue
		 * component. Lookup order:
		 *
		 *   1. Built-in widget map (`version-info`, `register-mapping`).
		 *   2. `'component'` discriminator (REQ-MSO-6) — resolves
		 *      `widget.componentName` against `effectiveCustomComponents`.
		 *   3. Legacy fallback — looks up `widget.type` against
		 *      `effectiveCustomComponents`. Kept for back-compat with
		 *      manifest-settings-rich-sections consumers; flagged as
		 *      deprecated in JSDoc — manifest authors should migrate to
		 *      the explicit `{ type: "component", componentName }` shape.
		 *
		 * Returns `null` (and warns) when nothing resolves. Built-ins
		 * win on collision so consumers can't accidentally shadow them.
		 *
		 * @param {object} widget A `widgets[]` entry, e.g. `{ type, props?, componentName? }`.
		 * @return {object|null} Vue component or null.
		 */
		resolveWidgetComponent(widget) {
			const type = widget && typeof widget.type === 'string' ? widget.type : ''
			if (!type) return null
			if (Object.prototype.hasOwnProperty.call(BUILTIN_SETTINGS_WIDGETS, type)) {
				const builtin = BUILTIN_SETTINGS_WIDGETS[type]
				if (builtin === COMPONENT_DISCRIMINATOR) {
					// REQ-MSO-6: discriminator — look up `componentName`.
					const name = widget.componentName
					if (typeof name !== 'string' || name.length === 0) {
						// eslint-disable-next-line no-console
						console.warn(
							'[CnSettingsPage] Widget {type:"component"} requires a non-empty `componentName`. Widget will be skipped.',
						)
						return null
					}
					const resolved = this.effectiveCustomComponents[name]
					if (!resolved) {
						// eslint-disable-next-line no-console
						console.warn(
							`[CnSettingsPage] Widget component "${name}" not found in customComponents registry. Widget will be skipped.`,
						)
						return null
					}
					return resolved
				}
				return builtin
			}
			// Legacy fallback (manifest-settings-rich-sections REQ-MSRS-2).
			// Deprecated — manifest authors should migrate to
			// `{ type: "component", componentName: <X> }`. Kept here so
			// existing consumers continue working unchanged.
			const resolved = this.effectiveCustomComponents[type]
			if (!resolved) {
				// eslint-disable-next-line no-console
				console.warn(
					`[CnSettingsPage] Widget type "${type}" not found in built-in widgets or customComponents registry. Widget will be skipped.`,
				)
				return null
			}
			return resolved
		},

		/**
		 * Build the list of widget mount entries for a `widgets[]`
		 * section. Filters out entries whose `widget.type` doesn't
		 * resolve (built-in OR customComponents) — `resolveWidgetComponent`
		 * has already logged a warn. The filter happens here so the
		 * template can use a clean `v-for` without nested `v-if`.
		 *
		 * The `widgetType` carried on the bubbled `@widget-event`
		 * payload is the widget's `componentName` (when the
		 * discriminator is `'component'`) or `widget.type` otherwise —
		 * giving consumers a stable identifier for the dispatch.
		 *
		 * @param {object} section A section entry with `widgets[]`.
		 * @param {number} sectionIndex Index in `sections[]`.
		 * @return {Array<{key: string, component: object, props: object, widgetType: string, widgetIndex: number}>}
		 */
		resolvedWidgetEntries(section, sectionIndex) {
			const entries = []
			const widgets = Array.isArray(section.widgets) ? section.widgets : []
			for (let widgetIndex = 0; widgetIndex < widgets.length; widgetIndex++) {
				const widget = widgets[widgetIndex] || {}
				const component = this.resolveWidgetComponent(widget)
				if (!component) continue
				const widgetType = widget.type === 'component' && typeof widget.componentName === 'string'
					? widget.componentName
					: widget.type
				entries.push({
					key: `widget-${sectionIndex}-${widgetIndex}`,
					component,
					props: widget.props || {},
					widgetType,
					widgetIndex,
				})
			}
			return entries
		},

		/**
		 * Resolve the active-tab id on mount / when `tabs[]` changes.
		 * Lookup order: explicit `initialTab` prop → first tab in
		 * `tabs[]` → empty string. Unknown `initialTab` values fall
		 * back to the first tab so the page never gets stuck.
		 * (manifest-settings-orchestration REQ-MSO-5.)
		 *
		 * @return {string} The resolved tab id (empty in flat mode).
		 */
		resolveInitialTabId() {
			if (!this.hasTabs) return ''
			if (typeof this.initialTab === 'string' && this.initialTab.length > 0) {
				const exists = this.tabs.some(t => t && t.id === this.initialTab)
				if (exists) return this.initialTab
			}
			const first = this.tabs[0]
			return first && typeof first.id === 'string' ? first.id : ''
		},

		/**
		 * Handle a tab button click. Switches the active tab and
		 * emits `@tab-change` so consumers can react (e.g. persist the
		 * active tab in their preference store, update the URL hash).
		 * (manifest-settings-orchestration REQ-MSO-5.)
		 *
		 * @param {object} tab The clicked tab definition.
		 * @param {number} tabIndex The tab's index in `tabs[]`.
		 */
		onTabClick(tab, tabIndex) {
			if (!tab || typeof tab.id !== 'string') return
			if (this.activeTabId === tab.id) return
			this.activeTabId = tab.id
			this.$emit('tab-change', { tabId: tab.id, tabIndex })
		},

		/**
		 * Re-emit a widget's `widget-event` (caught by the local
		 * CnSettingsWidgetMount helper) as a top-level `widget-event`
		 * on this page. Consumers wire one `@widget-event` handler at
		 * the CnAppRoot mount point and dispatch by `widgetType` /
		 * `name`.
		 *
		 * @param {object} payload `{ widgetType, widgetIndex, sectionIndex, name, args }`
		 */
		onWidgetEvent(payload) {
			this.$emit('widget-event', payload)
		},

		reset() {
			this.formData = this.cloneInitial()
			this.lastError = null
		},

		async save() {
			this.saving = true
			this.lastError = null
			try {
				if (this.saveEndpoint) {
					await axios.put(this.saveEndpoint, this.formData)
				}
				this.originalData = JSON.parse(JSON.stringify(this.formData))
				this.$emit('save', this.formData)
			} catch (err) {
				this.lastError = err?.response?.data?.message || err?.message || t('nextcloud-vue', 'Save failed')
				this.$emit('error', err)
			} finally {
				this.saving = false
			}
		},
	},
}
</script>

<style scoped>
.cn-settings-page {
	display: flex;
	flex-direction: column;
	gap: 16px;
}

.cn-settings-page__actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
}

/*
 * Tab strip for the orchestration shape (manifest-settings-
 * orchestration REQ-MSO-5). Uses Nextcloud CSS variables only — no
 * hex literals, no rgba overrides on the elements themselves.
 */
.cn-settings-page__tabs {
	display: flex;
	flex-wrap: wrap;
	gap: 4px;
	border-bottom: 1px solid var(--color-border);
	padding-bottom: 0;
	margin-bottom: 8px;
}

.cn-settings-page__tab {
	background: transparent;
	border: 0;
	border-bottom: 3px solid transparent;
	padding: 8px 16px;
	margin: 0;
	cursor: pointer;
	color: var(--color-text-maxcontrast);
	font-weight: normal;
	border-radius: var(--border-radius-large) var(--border-radius-large) 0 0;
	transition: background-color 0.1s ease-in-out, color 0.1s ease-in-out, border-color 0.1s ease-in-out;
}

.cn-settings-page__tab:hover,
.cn-settings-page__tab:focus-visible {
	background-color: var(--color-background-hover);
	color: var(--color-main-text);
	outline: none;
}

.cn-settings-page__tab--active {
	color: var(--color-primary-element);
	border-bottom-color: var(--color-primary-element);
	font-weight: bold;
}

@media (max-width: 768px) {
	.cn-settings-page__tabs {
		flex-direction: column;
		gap: 0;
		border-bottom: 0;
	}

	.cn-settings-page__tab {
		border-bottom: 1px solid var(--color-border);
		border-radius: 0;
		text-align: left;
	}

	.cn-settings-page__tab--active {
		border-bottom-width: 1px;
		background-color: var(--color-background-hover);
	}
}

.cn-settings-page__fields {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.cn-settings-page__field {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.cn-settings-page__field-help {
	color: var(--color-text-maxcontrast);
}

.cn-settings-page__save-bar {
	display: flex;
	gap: 8px;
	margin-top: 16px;
}

.cn-settings-page__error {
	color: var(--color-error);
	background: var(--color-error-light, var(--color-background-hover));
	padding: 8px 12px;
	border-radius: var(--border-radius);
}
</style>
