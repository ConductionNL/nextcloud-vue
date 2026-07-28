<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<NcDialog
		v-if="show"
		size="normal"
		:name="modalTitle"
		@closing="onCancel">
		<!-- Type selector: shown only in pure-create mode (no preselected
		     type, no editing widget). -->
		<div v-if="showTypeSelect" class="cn-add-widget-modal__type">
			<label class="cn-add-widget-modal__type-label" :for="typeSelectId">
				{{ t('nextcloud-vue', 'Widget type') }}
			</label>
			<select
				:id="typeSelectId"
				v-model="state.type"
				class="cn-add-widget-modal__type-select"
				data-testid="widget-type-select"
				@change="onTypeSwitch">
				<option
					v-for="type in availableTypes"
					:key="type"
					:value="type"
					:data-testid="`widget-type-option-${type}`">
					{{ typeDisplayName(type) }}
				</option>
			</select>
		</div>

		<!-- Active per-type sub-form. Driven by `<component :is>` from the
		     shared registry; sub-forms expose `validate()` and either an
		     `assembledContent` getter or `@update:content` events. -->
		<div v-if="activeSubFormComponent" class="cn-add-widget-modal__form">
			<component
				:is="activeSubFormComponent"
				ref="activeSubForm"
				:key="state.type"
				:editing-widget="state.editingWidget"
				:value="state.content"
				:file-upload-fn="fileUploadFn"
				:calendars-fetcher="calendarsFetcher"
				@update:content="onContentUpdate" />
		</div>
		<div v-else class="cn-add-widget-modal__empty">
			{{ t('nextcloud-vue', 'No widget types available') }}
		</div>

		<!-- Widget appearance (chrome): title, background, icon. Shared with
		     every consumer so the add/edit experience is identical across apps
		     (the chrome rides alongside `content` in the submit payload). -->
		<div v-if="activeSubFormComponent" class="cn-add-widget-modal__chrome">
			<h3 class="cn-add-widget-modal__chrome-title">
				{{ t('nextcloud-vue', 'Appearance') }}
			</h3>
			<!-- Title chrome is hidden for types whose sub-form owns the title
			     (e.g. the data widget's own Title field) so there aren't two
			     title inputs. -->
			<template v-if="!activeTypeOwnsTitle">
				<NcCheckboxRadioSwitch
					:model-value="chrome.showTitle"
					@update:model-value="chrome.showTitle = $event">
					{{ t('nextcloud-vue', 'Show title') }}
				</NcCheckboxRadioSwitch>
				<NcTextField
					v-if="chrome.showTitle"
					:model-value="chrome.customTitle"
					:label="t('nextcloud-vue', 'Custom title')"
					@update:model-value="chrome.customTitle = $event" />
			</template>
			<div class="cn-add-widget-modal__chrome-row">
				<span class="cn-add-widget-modal__chrome-label">{{ t('nextcloud-vue', 'Background') }}</span>
				<CnColorPicker
					:value="chrome.backgroundColor"
					clearable
					@input="chrome.backgroundColor = $event.hex"
					@clear="chrome.backgroundColor = ''" />
				<span class="cn-add-widget-modal__chrome-value">
					{{ chrome.backgroundColor || t('nextcloud-vue', 'Default') }}
				</span>
			</div>
			<div class="cn-add-widget-modal__chrome-row">
				<span class="cn-add-widget-modal__chrome-label">{{ t('nextcloud-vue', 'Icon') }}</span>
				<CnIconBrowser
					:value="chrome.customIcon"
					:upload-fn="uploadFn"
					allow-url
					clearable
					@input="chrome.customIcon = $event" />
			</div>
		</div>

		<template #actions>
			<NcButton type="tertiary" :disabled="submitting" @click="onCancel">
				{{ t('nextcloud-vue', 'Cancel') }}
			</NcButton>
			<NcButton
				type="primary"
				:disabled="!canSubmit || submitting"
				:title="firstError || ''"
				data-testid="add-widget-save"
				@click="onSubmit">
				{{ submitLabel }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { computed, provide } from 'vue'
import { NcDialog, NcButton, NcTextField, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'

import CnIconBrowser from '../components/CnIconBrowser/CnIconBrowser.vue'
import CnColorPicker from '../components/CnColorPicker/CnColorPicker.vue'
import {
	listWidgetTypes,
	getWidgetTypeEntry,
} from '../components/CnWidgetGrid/dashboardWidgetRegistry.js'
import { useWidgetForm } from '../composables/useWidgetForm.js'

let titleIdCounter = 0
let selectIdCounter = 0

/**
 * CnAddWidgetModal — unified, isolated host (ADR-004) for both the "add a
 * dashboard widget" and "edit a dashboard widget" flows. The modal does NO API
 * and NO grid work itself; it emits `submit({type, content})` for the parent to
 * persist. Per-type fields live in sub-form components registered in the shared
 * `dashboardWidgetRegistry`.
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnAddWidgetModal',

	components: {
		NcDialog,
		NcButton,
		NcTextField,
		NcCheckboxRadioSwitch,
		CnIconBrowser,
		CnColorPicker,
	},

	props: {
		/**
		 * Toggles visibility. Going `false → true` triggers `resetForm()` (or
		 * `loadEditingWidget()` when `editingWidget` is set).
		 */
		show: {
			type: Boolean,
			default: false,
		},
		/**
		 * When set, the type `<select>` is hidden and the form opens directly
		 * on this type (toolbar deep-links).
		 */
		preselectedType: {
			type: String,
			default: null,
		},
		/**
		 * When set, the modal opens in edit mode: the type select is hidden
		 * (placement type is immutable) and the sub-form is pre-filled from
		 * `editingWidget.content`. Must expose `type` and `content`.
		 *
		 * @type {{type: string, content: object}|null}
		 */
		editingWidget: {
			type: Object,
			default: null,
		},
		/**
		 * Optional upload transport for the Appearance icon picker:
		 * `async (dataUrl: string) => ({ url })`. The icon picker reads the chosen
		 * file to a data URL and passes that string here. When null, the upload
		 * control is hidden and the picker still offers its catalogues, NL sets,
		 * and a URL field.
		 *
		 * @type {Function|null}
		 */
		uploadFn: {
			type: Function,
			default: null,
		},
		/**
		 * Optional raw-file upload transport forwarded to the active sub-form as
		 * its `file-upload-fn`: `async (file: File) => ({ url })`. Deliberately a
		 * separate prop from `uploadFn` (which the icon picker calls with a data
		 * URL) so the File-typed transport can never reach a sub-form that expects
		 * a data URL (e.g. `CnHeaderWidgetForm.uploadFn`). Sub-forms such as the
		 * image widget defer the upload to submit and hand over the raw `File`.
		 * When null, sub-forms fall back to their own no-transport behaviour.
		 *
		 * @type {Function|null}
		 */
		fileUploadFn: {
			type: Function,
			default: null,
		},
		/**
		 * Optional async fetcher returning the user's calendars
		 * (`[{key, name, color}]`) for the calendar widget's picker. Provided
		 * by the consuming app (which owns the calendar backend); when null the
		 * calendar form falls back to free-text principal entry.
		 *
		 * @type {Function|null}
		 */
		calendarsFetcher: {
			type: Function,
			default: null,
		},
		/**
		 * The surface the picker offers types for. `'detail-page'` surfaces
		 * detail-only types (e.g. a second `data` widget) alongside the universal
		 * widgets; the default `'app-dashboard'` lists the dashboard set. Types
		 * with no declared `surfaces` appear on every surface.
		 *
		 * @type {string}
		 */
		surface: {
			type: String,
			default: 'app-dashboard',
		},
		/**
		 * Authoritative object context `{ register, schema }` for the page hosting
		 * the picker (supplied by the OpenBuild edit button from the ACTIVE page's
		 * config). Provided down as `cnObjectContext` so the data sub-form resolves
		 * the right schema even though the modal teleports out of the page's
		 * ambient provide tree. Null on surfaces without a single object (e.g.
		 * dashboards).
		 *
		 * @type {{register: string, schema: string}|null}
		 */
		dataContext: {
			type: Object,
			default: null,
		},
	},

	emits: [
		/** Fired on cancel button, backdrop click, or Esc key. */
		'close',
		/** Fired with the assembled `{type, content}` payload for the parent to persist. */
		'submit',
	],

	setup(props) {
		// One composable instance per modal mount. The composable owns the
		// type/content/editingWidget reactive state shared with sub-forms.
		const form = useWidgetForm()
		// Publish the page's object context to the (teleported) sub-forms so the
		// data widget's property editor loads the ACTIVE page's schema, not
		// whatever ambient context the modal lands next to in the DOM.
		provide('cnObjectContext', computed(() => props.dataContext || null))
		return { form }
	},

	data() {
		return {
			// Re-validation tick: `isValid` must recompute every time the
			// active sub-form's input changes. Sub-forms emit `update:content`
			// on every keystroke; we bump this counter in the handler so the
			// computed re-runs.
			validationTick: 0,
			// Snapshot of the assembled content + chrome captured when the modal
			// opens; `isDirty` compares the live values against it so editing an
			// existing widget only enables Save once something actually changed.
			initialSnapshot: '',
			titleId: `cn-add-widget-modal-title-${++titleIdCounter}`,
			typeSelectId: `cn-add-widget-modal-type-${++selectIdCounter}`,
			// Widget chrome (title / background / icon) edited in the same modal
			// as the per-type content and emitted back under `payload.chrome`.
			chrome: { showTitle: true, customTitle: '', backgroundColor: '', customIcon: '' },
			// True while the sub-form's commit() (e.g. an image upload) runs on
			// submit, so both footer buttons disable and the label shows progress.
			submitting: false,
		}
	},

	computed: {
		/**
		 * The shared form state container ({type, content, editingWidget}).
		 *
		 * @return {{type: string, content: object, editingWidget: (object|null)}} the reactive state.
		 */
		state() {
			return this.form.state
		},

		/**
		 * Type keys the picker offers — only registry entries that have a form.
		 *
		 * @return {string[]} the form-bearing type keys.
		 */
		availableTypes() {
			return listWidgetTypes(this.surface)
		},

		/**
		 * Whether the active type's sub-form owns the widget title (declares
		 * `ownsTitle` in its registry entry). When true the modal hides its
		 * generic Title chrome so there aren't two title inputs.
		 *
		 * @return {boolean} true when the sub-form provides its own title field.
		 */
		activeTypeOwnsTitle() {
			const entry = getWidgetTypeEntry(this.state.type)
			return !!(entry && entry.ownsTitle)
		},

		/**
		 * Whether to show the type select (hidden in edit / preselected mode).
		 *
		 * @return {boolean} true only in pure-create mode.
		 */
		showTypeSelect() {
			return !this.editingWidget && !this.preselectedType
		},

		/**
		 * The Vue component to mount via `<component :is>` for the active type,
		 * or `null` when the type is unknown or renderer-only.
		 *
		 * @return {object|null} the active sub-form component reference.
		 */
		activeSubFormComponent() {
			const entry = getWidgetTypeEntry(this.state.type)
			return entry?.form || null
		},

		/**
		 * Modal heading — flips between Add and Edit based on edit mode.
		 *
		 * @return {string} the localised modal title.
		 */
		modalTitle() {
			return this.editingWidget
				? t('nextcloud-vue', 'Edit Widget')
				: t('nextcloud-vue', 'Add Widget')
		},

		/**
		 * Submit button label — flips between Add and Save based on edit mode.
		 *
		 * @return {string} the localised submit label.
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		submitLabel() {
			if (this.submitting) {
				return t('nextcloud-vue', 'Uploading…')
			}
			return this.editingWidget ? t('nextcloud-vue', 'Save') : t('nextcloud-vue', 'Add')
		},

		/**
		 * The active sub-form's validation errors. `validationTick` keeps Vue's
		 * dependency tracker aware that this computed re-runs on every input.
		 *
		 * @return {string[]} the validation error messages.
		 */
		validationErrors() {
			// touch the tick so Vue tracks it as a dependency
			// eslint-disable-next-line no-unused-expressions
			this.validationTick
			return this.form.validate(this.$refs.activeSubForm)
		},

		/**
		 * Whether the submit button is enabled (no validation errors).
		 *
		 * @return {boolean} true when the active sub-form is valid.
		 */
		isValid() {
			return this.validationErrors.length === 0
		},

		/**
		 * Whether the content or chrome differs from the snapshot taken when the
		 * modal opened. Depends on `chrome` (via the snapshot's JSON) and the
		 * `validationTick` (bumped on every sub-form `update:content`) so it
		 * re-runs on both chrome and form-field edits.
		 *
		 * @return {boolean} true when something changed since open.
		 */
		isDirty() {
			// touch the tick so content edits re-run this computed
			// eslint-disable-next-line no-unused-expressions
			this.validationTick
			return this.currentSnapshot() !== this.initialSnapshot
		},

		/**
		 * Whether Save is allowed: the form must be valid, and — when editing an
		 * existing widget — something must have changed. Create mode may submit
		 * the (valid) defaults straight away.
		 *
		 * @return {boolean} true when the submit button is enabled.
		 */
		canSubmit() {
			if (!this.isValid) {
				return false
			}
			return !this.editingWidget || this.isDirty
		},

		/**
		 * The first user-visible validation error (hides the internal
		 * `__no-active-form__` sentinel).
		 *
		 * @return {string} the first error message, or an empty string.
		 */
		firstError() {
			const err = this.validationErrors[0]
			return err && err !== '__no-active-form__' ? err : ''
		},
	},

	watch: {
		/**
		 * Re-initialise the form when the modal opens.
		 *
		 * @param {boolean} isOpen the new `show` value.
		 * @return {void}
		 */
		show(isOpen) {
			if (isOpen) {
				this.openLifecycle()
			}
		},
		editingWidget: {
			immediate: false,
			/**
			 * Pre-fill from a newly-supplied editing widget while open.
			 *
			 * @param {object|null} widget the placement being edited.
			 * @return {void}
			 */
			handler(widget) {
				if (this.show && widget) {
					this.form.loadEditingWidget(widget)
				}
			},
		},
		/**
		 * Re-seed the form when the preselected type changes while open.
		 *
		 * @param {string|null} type the new preselected type.
		 * @return {void}
		 */
		preselectedType(type) {
			if (this.show && type && !this.editingWidget) {
				this.form.resetForm(type)
			}
		},
	},

	created() {
		// Seed state synchronously before the first render so the
		// `v-if="activeSubFormComponent"` path resolves to the right sub-form
		// on initial mount (otherwise the modal flashes the "No widget types
		// available" empty state for one tick).
		if (this.show) {
			this.openLifecycle()
		}
	},

	mounted() {
		document.addEventListener('keydown', this.onKeydown)
		// The validation gate reads `$refs.activeSubForm`, which is null while
		// `created()` runs (the sub-form mounts after the first render). Bump
		// the tick once the ref is bound so `isValid` reflects the freshly
		// mounted sub-form's `validate()` without waiting for the first input.
		this.$nextTick(() => {
			this.validationTick++
		})
	},

	beforeUnmount() {
		document.removeEventListener('keydown', this.onKeydown)
	},

	methods: {
		t,

		/**
		 * Initialise form state when the modal opens. Edit mode pre-fills from
		 * `editingWidget`; create mode resets to the preselected type (toolbar
		 * invocation) or to the first available registered type.
		 *
		 * @return {void}
		 */
		openLifecycle() {
			if (this.editingWidget) {
				this.form.loadEditingWidget(this.editingWidget)
				this.seedChrome(this.editingWidget)
			} else {
				const initialType = this.preselectedType
					|| this.availableTypes[0]
					|| ''
				this.form.resetForm(initialType)
				this.seedChrome(null)
			}
			// Revalidate on every open (the modal instance persists across
			// open/close, so `mounted()`'s one-time bump doesn't fire again).
			// Bump synchronously and again once the sub-form has (re)mounted and
			// its `$refs.activeSubForm` is bound — otherwise the submit gate stays
			// stale in edit mode until the user touches a form field. The nextTick
			// pass also captures the pristine snapshot `isDirty` compares against.
			this.validationTick++
			this.$nextTick(() => {
				this.validationTick++
				this.initialSnapshot = this.currentSnapshot()
			})
		},

		/**
		 * Serialise the current assembled content + chrome for dirty comparison.
		 *
		 * @return {string} a stable JSON snapshot of the editable state.
		 */
		currentSnapshot() {
			const { content } = this.form.assembleContent(this.$refs.activeSubForm)
			return JSON.stringify({ content, chrome: this.chrome })
		},

		/**
		 * Seed the Appearance controls (title / background / icon) from a
		 * placement being edited, or to defaults in create mode. Reads chrome
		 * fields from the placement's top level with a fallback to its `content`
		 * (and `styleConfig.backgroundColor`), so it round-trips whatever shape
		 * the consumer persists.
		 *
		 * @param {object|null} widget The placement being edited, or null.
		 * @return {void}
		 */
		seedChrome(widget) {
			const w = widget || {}
			const c = (w.content && typeof w.content === 'object') ? w.content : {}
			const pick = (...vals) => vals.find((v) => v !== undefined && v !== null)
			const showRaw = pick(w.showTitle, c.showTitle)
			this.chrome = {
				// Cards (stat / gauge / delta) headline themselves via `content.label`,
				// so they default headerless — otherwise the chrome header just repeats
				// the label, or shows the bare type name when no title was ever set.
				showTitle: showRaw === undefined
					? !this.isCardType(w.type || this.state.type)
					: Boolean(Number(showRaw) || showRaw === true),
				customTitle: pick(w.customTitle, c.customTitle, c.title) || '',
				backgroundColor: pick(w.backgroundColor, w.styleConfig?.backgroundColor, c.styleConfig?.backgroundColor) || '',
				customIcon: pick(w.customIcon, c.customIcon, c.icon) || '',
			}
		},

		/**
		 * Handle a `<select>` change: swap the active sub-form and reset its
		 * state to defaults. Switching type discards any in-progress field
		 * input. The sub-form is keyed on `state.type`, so changing the type
		 * tears down the old `<component :is>` and remounts a new one;
		 * `$refs.activeSubForm` is briefly null between teardown and mount, so
		 * we bump the tick again on the next tick once the ref is rebound.
		 *
		 * @return {void}
		 */
		onTypeSwitch() {
			this.form.resetForm(this.state.type)
			// Re-apply the type's chrome default: switching between a card and a
			// full widget flips whether a header makes sense.
			this.chrome.showTitle = !this.isCardType(this.state.type)
			this.validationTick++
			this.$nextTick(() => {
				this.validationTick++
			})
		},

		/**
		 * Whether a widget type is a self-contained card (stat / gauge / delta),
		 * which renders headerless by default.
		 *
		 * @param {string} type the registry type key.
		 * @return {boolean} true when the registry entry is a card.
		 */
		isCardType(type) {
			if (!type) return false
			const entry = getWidgetTypeEntry(type)
			return Boolean(entry && entry.card === true)
		},

		/**
		 * Mirror a sub-form `update:content` payload into the composable state
		 * (so `assembleContent()` can fall back to it) and bump the validation
		 * tick so the submit button enables/disables reactively on input.
		 *
		 * @param {object} content the sub-form's current content payload.
		 * @return {void}
		 */
		onContentUpdate(content) {
			this.state.content = { ...content }
			this.validationTick++
		},

		/**
		 * Cancel button / backdrop / NcModal `close` event — non-destructive,
		 * never emits submit. Suppressed while a sub-form `commit()` (e.g. an
		 * image upload) is in flight so dismissing the dialog can't unmount the
		 * sub-form mid-upload (which would orphan the upload and write into a
		 * destroyed instance).
		 *
		 * @return {void}
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		onCancel() {
			if (this.submitting) {
				return
			}
			this.$emit('close')
		},

		/**
		 * Esc-key fallback listener (in case NcModal's own handler is
		 * suppressed by a parent focus-trap). Emits `close`, never `submit`.
		 * Suppressed while a commit() is in flight (see `onCancel`).
		 *
		 * @param {KeyboardEvent} event the keydown event.
		 * @return {void}
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		onKeydown(event) {
			if (this.submitting) {
				return
			}
			if (this.show && event.key === 'Escape') {
				this.$emit('close')
			}
		},

		/**
		 * Commit the active sub-form (e.g. upload a pending image), then build
		 * the `{type, content}` payload via the composable's `assembleContent()`
		 * and emit it. The commit is the only step that can hit the network; a
		 * commit failure keeps the modal open and blocks the `submit` emit.
		 *
		 * @return {Promise<void>} resolves once submit is emitted or aborted.
		 *
		 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
		 */
		async onSubmit() {
			if (!this.isValid || this.submitting) {
				return
			}
			const subForm = this.$refs.activeSubForm
			if (subForm && typeof subForm.commit === 'function') {
				this.submitting = true
				try {
					await subForm.commit()
				} catch (error) {
					// The sub-form surfaces its own inline error; keep the modal
					// open so the author can retry or pick another file.
					console.error('[CnAddWidgetModal] Widget commit failed:', error)
					return
				} finally {
					this.submitting = false
				}
			}
			const payload = this.form.assembleContent(this.$refs.activeSubForm)
			// Carry the chrome (title / background / icon) alongside the content
			// so the parent persists both from this single modal.
			payload.chrome = {
				showTitle: this.chrome.showTitle,
				customTitle: this.chrome.customTitle,
				customIcon: this.chrome.customIcon,
				backgroundColor: this.chrome.backgroundColor,
			}
			this.$emit('submit', payload)
		},

		/**
		 * Look up the human-readable display name for a registry type, falling
		 * back to the type key itself.
		 *
		 * @param {string} type the registry type key.
		 * @return {string} the display name.
		 */
		typeDisplayName(type) {
			const entry = getWidgetTypeEntry(type)
			return entry?.displayName || type
		},
	},
}
</script>

<style scoped>
.cn-add-widget-modal__type {
	display: flex;
	flex-direction: column;
	gap: 6px;
}

.cn-add-widget-modal__type-label {
	font-size: 14px;
	font-weight: 500;
}

.cn-add-widget-modal__type-select {
	padding: 8px 12px;
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius);
	background: var(--color-main-background);
	color: var(--color-main-text);
	font-size: 14px;
}

.cn-add-widget-modal__form {
	overflow-y: auto;
	/* Prefer a roomy ~340px for the type-specific fields (data-driven widgets
	   carry tall forms — columns, thresholds, data source); still shrinks with
	   its own scroll on short viewports so the Appearance + actions stay visible. */
	flex: 1 1 340px;
	min-height: 0;
}

.cn-add-widget-modal__empty {
	padding: 16px;
	text-align: center;
	color: var(--color-text-maxcontrast);
}

.cn-add-widget-modal__chrome {
	display: flex;
	flex-direction: column;
	gap: 10px;
	border-top: 1px solid var(--color-border);
	padding-top: 12px;
}

.cn-add-widget-modal__chrome-title {
	margin: 0;
	font-size: 15px;
	font-weight: 600;
	color: var(--color-text-maxcontrast);
}

.cn-add-widget-modal__chrome-row {
	display: flex;
	align-items: center;
	gap: 12px;
}

.cn-add-widget-modal__chrome-label {
	min-width: 96px;
	font-size: 14px;
}

.cn-add-widget-modal__chrome-value {
	font-size: 13px;
	color: var(--color-text-maxcontrast);
}
</style>
