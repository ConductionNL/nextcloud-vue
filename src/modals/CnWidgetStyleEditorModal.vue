<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<template>
	<NcModal
		v-if="show"
		size="normal"
		:name="t('nextcloud-vue', 'Widget style')"
		@close="onCancel">
		<div
			class="cn-widget-style-editor"
			role="dialog"
			:aria-labelledby="titleId"
			aria-modal="true"
			data-testid="cn-widget-style-editor">
			<h2 :id="titleId" class="cn-widget-style-editor__title">
				{{ t('nextcloud-vue', 'Customize widget') }}
			</h2>

			<!-- Typed-widget content config (e.g. a `stat` KPI's data source,
			     label, icon, colours, format) supplied by the type's registered
			     sub-form. Supersedes the generic chrome title/icon below. -->
			<div v-if="hasTypeForm" class="cn-widget-style-editor__section">
				<component
					:is="typeFormComponent"
					ref="typeForm"
					:key="(widget.widgetId || widget.id || 'w') + '-' + show"
					:editing-widget="widget"
					@update:content="draftContent = $event" />
				<ul v-if="contentErrors.length" class="cn-widget-style-editor__errors">
					<li v-for="(err, i) in contentErrors" :key="i">{{ err }}</li>
				</ul>
			</div>

			<!-- Title section: toggle + override text. -->
			<div v-if="!hasTypeForm" class="cn-widget-style-editor__section">
				<h3 class="cn-widget-style-editor__section-title">
					{{ t('nextcloud-vue', 'Title') }}
				</h3>

				<NcCheckboxRadioSwitch
					:checked="draft.showTitle"
					data-testid="cn-widget-style-show-title"
					@update:checked="draft.showTitle = $event">
					{{ t('nextcloud-vue', 'Show title') }}
				</NcCheckboxRadioSwitch>

				<NcTextField
					v-if="draft.showTitle"
					:value="draft.customTitle"
					:label="t('nextcloud-vue', 'Custom title')"
					:placeholder="titlePlaceholder"
					data-testid="cn-widget-style-custom-title"
					@update:value="draft.customTitle = $event" />
			</div>

			<!-- Background section: colour picker over the chrome background. -->
			<div class="cn-widget-style-editor__section">
				<h3 class="cn-widget-style-editor__section-title">
					{{ t('nextcloud-vue', 'Background') }}
				</h3>

				<div class="cn-widget-style-editor__row">
					<span class="cn-widget-style-editor__label">{{ t('nextcloud-vue', 'Color') }}</span>
					<NcColorPicker v-model="draft.backgroundColor">
						<NcButton
							type="secondary"
							:aria-label="t('nextcloud-vue', 'Pick background color')"
							data-testid="cn-widget-style-color">
							<template #icon>
								<div
									class="cn-widget-style-editor__color-preview"
									:style="{ backgroundColor: draft.backgroundColor }" />
							</template>
							{{ draft.backgroundColor || t('nextcloud-vue', 'Default') }}
						</NcButton>
					</NcColorPicker>
				</div>
			</div>

			<!-- Icon section: pick the chrome icon from the built-in set.
			     Hidden for typed widgets — their sub-form owns the icon. -->
			<div v-if="!hasTypeForm" class="cn-widget-style-editor__section">
				<h3 class="cn-widget-style-editor__section-title">
					{{ t('nextcloud-vue', 'Icon') }}
				</h3>

				<NcSelect
					v-model="selectedIcon"
					:options="allIconOptions"
					:input-label="t('nextcloud-vue', 'Icon')"
					:aria-label-combobox="t('nextcloud-vue', 'Icon')"
					label="label"
					label-outside
					data-testid="cn-widget-style-icon">
					<template #selected-option="{ label }">
						<span class="cn-widget-style-editor__icon-option">
							<img v-if="isUrlIcon(selectedIcon.icon)"
								:src="selectedIcon.icon"
								:alt="label"
								class="cn-widget-style-editor__icon-preview">
							<svg v-else class="cn-widget-style-editor__icon-preview" viewBox="0 0 24 24">
								<path :d="selectedIcon.icon" />
							</svg>
							<span class="cn-widget-style-editor__icon-label">{{ label }}</span>
						</span>
					</template>
					<template #option="option">
						<span class="cn-widget-style-editor__icon-option">
							<img v-if="isUrlIcon(option.icon)"
								:src="option.icon"
								:alt="option.label"
								class="cn-widget-style-editor__icon-preview">
							<svg v-else class="cn-widget-style-editor__icon-preview" viewBox="0 0 24 24">
								<path :d="option.icon" />
							</svg>
							<span class="cn-widget-style-editor__icon-label">{{ option.label }}</span>
						</span>
					</template>
				</NcSelect>
			</div>

			<!-- Actions: optional delete, reset to defaults, save. -->
			<div class="cn-widget-style-editor__actions">
				<NcButton
					v-if="deletable"
					type="error"
					data-testid="cn-widget-style-delete"
					@click="onDelete">
					{{ t('nextcloud-vue', 'Delete') }}
				</NcButton>
				<div class="cn-widget-style-editor__actions-right">
					<NcButton type="tertiary" @click="onCancel">
						{{ t('nextcloud-vue', 'Cancel') }}
					</NcButton>
					<NcButton type="secondary" data-testid="cn-widget-style-reset" @click="resetDraft">
						{{ t('nextcloud-vue', 'Reset') }}
					</NcButton>
					<NcButton type="primary" data-testid="cn-widget-style-save" @click="onSave">
						{{ t('nextcloud-vue', 'Save') }}
					</NcButton>
				</div>
			</div>
		</div>
	</NcModal>
</template>

<script>
import { NcModal, NcButton, NcTextField, NcSelect, NcColorPicker, NcCheckboxRadioSwitch } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import { getWidgetTypeEntry } from '../components/CnWidgetGrid/dashboardWidgetRegistry.js'

// Hardcoded @mdi/js icon path strings (matching CnNoteCard's precedent) to
// avoid pulling @mdi/js into this library's dependency tree and bundle.
const mdiFile = 'M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z'
const mdiFolder = 'M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z'
const mdiCalendar = 'M19,19H5V8H19M16,1V3H8V1H6V3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3H18V1M17,12H12V17H17V12Z'
const mdiAccount = 'M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z'
const mdiEmail = 'M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z'
const mdiBriefcase = 'M10,2H14A2,2 0 0,1 16,4V6H20A2,2 0 0,1 22,8V19A2,2 0 0,1 20,21H4C2.89,21 2,20.1 2,19V8C2,6.89 2.89,6 4,6H8V4C8,2.89 8.89,2 10,2M14,6V4H10V6H14Z'
const mdiLink = 'M3.9,12C3.9,10.29 5.29,8.9 7,8.9H11V7H7A5,5 0 0,0 2,12A5,5 0 0,0 7,17H11V15.1H7C5.29,15.1 3.9,13.71 3.9,12M8,13H16V11H8V13M17,7H13V8.9H17C18.71,8.9 20.1,10.29 20.1,12C20.1,13.71 18.71,15.1 17,15.1H13V17H17A5,5 0 0,0 22,12A5,5 0 0,0 17,7Z'
const mdiHome = 'M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z'
const mdiAccountCircle = 'M12,19.2C9.5,19.2 7.29,17.92 6,16C6.03,14 10,12.9 12,12.9C14,12.9 17.97,14 18,16C16.71,17.92 14.5,19.2 12,19.2M12,5A3,3 0 0,1 15,8A3,3 0 0,1 12,11A3,3 0 0,1 9,8A3,3 0 0,1 12,5M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,6.47 17.5,2 12,2Z'
const mdiAccountGroup = 'M12,5.5A3.5,3.5 0 0,1 15.5,9A3.5,3.5 0 0,1 12,12.5A3.5,3.5 0 0,1 8.5,9A3.5,3.5 0 0,1 12,5.5M5,8C5.56,8 6.08,8.15 6.53,8.42C6.38,9.85 6.8,11.27 7.66,12.38C7.16,13.34 6.16,14 5,14A3,3 0 0,1 2,11A3,3 0 0,1 5,8M19,8A3,3 0 0,1 22,11A3,3 0 0,1 19,14C17.84,14 16.84,13.34 16.34,12.38C17.2,11.27 17.62,9.85 17.47,8.42C17.92,8.15 18.44,8 19,8M5.5,18.25C5.5,16.18 8.41,14.5 12,14.5C15.59,14.5 18.5,16.18 18.5,18.25V20H5.5V18.25M0,20V18.5C0,17.11 1.89,15.94 4.45,15.6C3.86,16.28 3.5,17.22 3.5,18.25V20H0M24,20H20.5V18.25C20.5,17.22 20.14,16.28 19.55,15.6C22.11,15.94 24,17.11 24,18.5V20Z'
const mdiCog = 'M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z'
const mdiImage = 'M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z'
const mdiVideo = 'M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z'
const mdiMusic = 'M21,3V15.5A3.5,3.5 0 0,1 17.5,19A3.5,3.5 0 0,1 14,15.5A3.5,3.5 0 0,1 17.5,12C18.04,12 18.55,12.12 19,12.34V6.47L9,8.6V17.5A3.5,3.5 0 0,1 5.5,21A3.5,3.5 0 0,1 2,17.5A3.5,3.5 0 0,1 5.5,14C6.04,14 6.55,14.12 7,14.34V6L21,3Z'
const mdiStar = 'M12,17.27L18.18,21L16.54,13.97L22,9.24L14.81,8.62L12,2L9.19,8.62L2,9.24L7.45,13.97L5.82,21L12,17.27Z'
const mdiHeart = 'M12,21.35L10.55,20.03C5.4,15.36 2,12.27 2,8.5C2,5.41 4.42,3 7.5,3C9.24,3 10.91,3.81 12,5.08C13.09,3.81 14.76,3 16.5,3C19.58,3 22,5.41 22,8.5C22,12.27 18.6,15.36 13.45,20.03L12,21.35Z'
const mdiCheck = 'M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z'
const mdiTag = 'M5.5,7A1.5,1.5 0 0,1 4,5.5A1.5,1.5 0 0,1 5.5,4A1.5,1.5 0 0,1 7,5.5A1.5,1.5 0 0,1 5.5,7M21.41,11.58L12.41,2.58C12.05,2.22 11.55,2 11,2H4C2.89,2 2,2.89 2,4V11C2,11.55 2.22,12.05 2.59,12.41L11.58,21.41C11.95,21.77 12.45,22 13,22C13.55,22 14.05,21.77 14.41,21.41L21.41,14.41C21.78,14.05 22,13.55 22,13C22,12.44 21.77,11.94 21.41,11.58Z'
const mdiComment = 'M9,22A1,1 0 0,1 8,21V18H4A2,2 0 0,1 2,16V4C2,2.89 2.9,2 4,2H20A2,2 0 0,1 22,4V16A2,2 0 0,1 20,18H13.9L10.2,21.71C10,21.9 9.75,22 9.5,22V22H9Z'
const mdiShare = 'M21,12L14,5V9C7,10 4,15 3,20C5.5,16.5 9,14.9 14,14.9V19L21,12Z'
const mdiMagnify = 'M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z'
const mdiDownload = 'M5,20H19V18H5M19,9H15V3H9V9H5L12,16L19,9Z'
const mdiUpload = 'M9,16V10H5L12,3L19,10H15V16H9M5,20V18H19V20H5Z'
const mdiChartLine = 'M16,11.78L20.24,4.45L21.97,5.45L16.74,14.5L10.23,10.75L5.46,19H22V21H2V3H4V17.54L9.5,8L16,11.78Z'
const mdiConnection = 'M21.4 7.5C22.2 8.3 22.2 9.6 21.4 10.3L18.6 13.1L10.8 5.3L13.6 2.5C14.4 1.7 15.7 1.7 16.4 2.5L18.2 4.3L21.2 1.3L22.6 2.7L19.6 5.7L21.4 7.5M15.6 13.3L14.2 11.9L11.4 14.7L9.3 12.6L12.1 9.8L10.7 8.4L7.9 11.2L6.4 9.8L3.6 12.6C2.8 13.4 2.8 14.7 3.6 15.4L5.4 17.2L1.4 21.2L2.8 22.6L6.8 18.6L8.6 20.4C9.4 21.2 10.7 21.2 11.4 20.4L14.2 17.6L12.8 16.2L15.6 13.3Z'

let titleIdCounter = 0

// The shape a freshly-reset widget chrome falls back to. Kept as a factory so
// callers of resetDraft() always get a deep copy (never a shared reference).
const defaultStyleConfig = () => ({
	backgroundColor: '',
	borderStyle: 'none',
	borderColor: '',
	borderWidth: 1,
	borderRadius: 12,
	padding: { top: 0, right: 0, bottom: 0, left: 0 },
})

/**
 * CnWidgetStyleEditorModal — isolated host (ADR-004) for editing a single
 * dashboard-widget's chrome: its title override, background colour, and icon.
 * It is a pure editor: it does NO API and NO grid work. On Save it mutates the
 * passed `widget` object in place (writing `widget.styleConfig`, `widget.showTitle`,
 * `widget.customTitle`, `widget.customIcon`) and emits `save` with the same
 * object, so the parent can persist. The draft is a working copy; nothing on the
 * `widget` changes until Save (Cancel / Esc / backdrop discard the draft).
 *
 * @spec openspec/changes/cn-widget-library/specs/cn-widget-library/spec.md
 */
export default {
	name: 'CnWidgetStyleEditorModal',

	components: {
		NcModal,
		NcButton,
		NcTextField,
		NcSelect,
		NcColorPicker,
		NcCheckboxRadioSwitch,
	},

	props: {
		/** Toggles visibility. Going `false → true` re-seeds the draft from `widget`. */
		show: {
			type: Boolean,
			default: false,
		},
		/**
		 * The widget chrome being edited. Its `styleConfig` and chrome fields
		 * (`showTitle`, `customTitle`, `customIcon`) are mutated in place on Save.
		 *
		 * @type {{styleConfig?: object, showTitle?: boolean, customTitle?: string, customIcon?: string, title?: string}}
		 */
		widget: {
			type: Object,
			required: true,
		},
		/** Whether to show the Delete button (false for compulsory widgets). */
		deletable: {
			type: Boolean,
			default: true,
		},
		/**
		 * Extra icon options appended to the built-in set, e.g. an app's own
		 * icon pack. Each `{ id, label, icon }` where `icon` may be an MDI path
		 * OR a URL/absolute path (rendered as an `<img>`). Default `[]`.
		 *
		 * @type {Array<{id: string, label: string, icon: string}>}
		 */
		extraIconOptions: {
			type: Array,
			default: () => [],
		},
	},

	emits: [
		/** Fired on Cancel, backdrop click, or Esc — never mutates the widget. */
		'close',
		/**
		 * @event save Fired after the draft is written onto `widget`. Payload is the same mutated `widget`.
		 * @type {object}
		 */
		'save',
		/** Fired when the Delete button is clicked. Payload is the `widget`. */
		'delete',
	],

	data() {
		return {
			titleId: `cn-widget-style-editor-title-${++titleIdCounter}`,
			draft: this.buildDraft(this.widget),
			// Working copy of the typed widget's `content` (when its type
			// registers a config form). Seeded from the widget on open.
			draftContent: this.widget && this.widget.content ? JSON.parse(JSON.stringify(this.widget.content)) : null,
			contentErrors: [],
			iconOptions: [
				{ id: 'file', label: t('nextcloud-vue', 'Files'), icon: mdiFile },
				{ id: 'folder', label: t('nextcloud-vue', 'Folder'), icon: mdiFolder },
				{ id: 'calendar', label: t('nextcloud-vue', 'Calendar'), icon: mdiCalendar },
				{ id: 'contacts', label: t('nextcloud-vue', 'Contacts'), icon: mdiAccount },
				{ id: 'mail', label: t('nextcloud-vue', 'Mail'), icon: mdiEmail },
				{ id: 'office', label: t('nextcloud-vue', 'Office'), icon: mdiBriefcase },
				{ id: 'link', label: t('nextcloud-vue', 'Link'), icon: mdiLink },
				{ id: 'home', label: t('nextcloud-vue', 'Home'), icon: mdiHome },
				{ id: 'user', label: t('nextcloud-vue', 'User'), icon: mdiAccountCircle },
				{ id: 'group', label: t('nextcloud-vue', 'Group'), icon: mdiAccountGroup },
				{ id: 'settings', label: t('nextcloud-vue', 'Settings'), icon: mdiCog },
				{ id: 'picture', label: t('nextcloud-vue', 'Picture'), icon: mdiImage },
				{ id: 'video', label: t('nextcloud-vue', 'Video'), icon: mdiVideo },
				{ id: 'audio', label: t('nextcloud-vue', 'Audio'), icon: mdiMusic },
				{ id: 'star', label: t('nextcloud-vue', 'Star'), icon: mdiStar },
				{ id: 'favorite', label: t('nextcloud-vue', 'Favorite'), icon: mdiHeart },
				{ id: 'checkmark', label: t('nextcloud-vue', 'Checkmark'), icon: mdiCheck },
				{ id: 'tag', label: t('nextcloud-vue', 'Tag'), icon: mdiTag },
				{ id: 'comment', label: t('nextcloud-vue', 'Comment'), icon: mdiComment },
				{ id: 'share', label: t('nextcloud-vue', 'Share'), icon: mdiShare },
				{ id: 'search', label: t('nextcloud-vue', 'Search'), icon: mdiMagnify },
				{ id: 'download', label: t('nextcloud-vue', 'Download'), icon: mdiDownload },
				{ id: 'upload', label: t('nextcloud-vue', 'Upload'), icon: mdiUpload },
				{ id: 'monitoring', label: t('nextcloud-vue', 'Monitoring'), icon: mdiChartLine },
				{ id: 'integration', label: t('nextcloud-vue', 'Integration'), icon: mdiConnection },
			],
		}
	},

	computed: {
		/**
		 * Placeholder for the custom-title field — the widget's own title.
		 *
		 * @return {string} the fallback widget title.
		 */
		titlePlaceholder() {
			return this.widget?.title || t('nextcloud-vue', 'Widget title')
		},

		/**
		 * The config sub-form component registered for this widget's type
		 * (e.g. `stat` → CnStatWidgetForm), or null for chrome-only widgets.
		 *
		 * @return {(object|null)} the form component reference.
		 */
		typeFormComponent() {
			const type = this.widget && this.widget.type
			if (!type) return null
			const entry = getWidgetTypeEntry(type)
			return (entry && entry.form) || null
		},

		/** Whether this widget type contributes its own content config form. */
		hasTypeForm() {
			return this.typeFormComponent !== null
		},

		/**
		 * Two-way bridge between the draft's `customIcon` path string and the
		 * matching option object the NcSelect renders.
		 *
		 * @return {object} the selected icon option.
		 */
		selectedIcon: {
			get() {
				const option = this.allIconOptions.find((opt) => opt.icon === this.draft.customIcon)
				return option || this.allIconOptions[0]
			},
			set(value) {
				this.draft.customIcon = value ? value.icon : ''
			},
		},

		/**
		 * The built-in icon set plus any consumer-supplied `extraIconOptions`.
		 *
		 * @return {Array<{id: string, label: string, icon: string}>} all options.
		 */
		allIconOptions() {
			return this.extraIconOptions.length ? [...this.iconOptions, ...this.extraIconOptions] : this.iconOptions
		},
	},

	watch: {
		/**
		 * Re-seed the draft from the widget when the modal opens.
		 *
		 * @param {boolean} isOpen the new `show` value.
		 * @return {void}
		 */
		show(isOpen) {
			if (isOpen) {
				this.draft = this.buildDraft(this.widget)
				this.draftContent = this.widget && this.widget.content
					? JSON.parse(JSON.stringify(this.widget.content))
					: null
			}
		},
	},

	mounted() {
		document.addEventListener('keydown', this.onKeydown)
	},

	beforeDestroy() {
		document.removeEventListener('keydown', this.onKeydown)
	},

	methods: {
		t,

		/**
		 * Whether an icon value is a URL/absolute path (render as `<img>`)
		 * rather than an MDI path string (render as `<svg><path>`).
		 *
		 * @param {string} icon the icon value.
		 * @return {boolean} true for URL/path icons.
		 */
		isUrlIcon(icon) {
			return typeof icon === 'string' && (icon.startsWith('/') || icon.startsWith('http'))
		},

		/**
		 * Build the working-copy draft from a widget's current chrome + styleConfig.
		 * Always a deep copy so editing the draft never touches the live widget
		 * before Save.
		 *
		 * @param {object} widget the widget chrome to read from.
		 * @return {object} the draft state.
		 */
		buildDraft(widget) {
			const base = defaultStyleConfig()
			const sc = (widget && widget.styleConfig) || {}
			return {
				showTitle: widget?.showTitle !== false,
				customTitle: widget?.customTitle || '',
				customIcon: widget?.customIcon || '',
				backgroundColor: sc.backgroundColor || base.backgroundColor,
				borderStyle: sc.borderStyle || base.borderStyle,
				borderColor: sc.borderColor || base.borderColor,
				borderWidth: sc.borderWidth ?? base.borderWidth,
				borderRadius: sc.borderRadius ?? base.borderRadius,
				padding: {
					top: sc.padding?.top || base.padding.top,
					right: sc.padding?.right || base.padding.right,
					bottom: sc.padding?.bottom || base.padding.bottom,
					left: sc.padding?.left || base.padding.left,
				},
			}
		},

		/**
		 * Reset the draft to library defaults. Does not touch the live widget.
		 *
		 * @return {void}
		 */
		resetDraft() {
			const base = defaultStyleConfig()
			this.draft = {
				showTitle: true,
				customTitle: '',
				customIcon: '',
				...base,
			}
		},

		/**
		 * Commit the draft onto the passed `widget` in place and emit `save`.
		 * Mutates `widget.styleConfig` + chrome fields directly (never a copy of
		 * the defaults), then hands the same object back to the parent.
		 *
		 * @return {void}
		 */
		onSave() {
			if (!this.widget.styleConfig || typeof this.widget.styleConfig !== 'object') {
				this.$set(this.widget, 'styleConfig', {})
			}
			const sc = this.widget.styleConfig
			this.$set(sc, 'backgroundColor', this.draft.backgroundColor || null)
			this.$set(sc, 'borderStyle', this.draft.borderStyle)
			this.$set(sc, 'borderColor', this.draft.borderColor || null)
			this.$set(sc, 'borderWidth', this.draft.borderWidth)
			this.$set(sc, 'borderRadius', this.draft.borderRadius)
			this.$set(sc, 'padding', { ...this.draft.padding })

			this.$set(this.widget, 'showTitle', this.draft.showTitle)
			this.$set(this.widget, 'customTitle', this.draft.customTitle || null)
			this.$set(this.widget, 'customIcon', this.draft.customIcon || null)

			// For typed widgets, also commit the content config edited via the
			// registered sub-form (validated first; a non-empty result blocks save).
			if (this.hasTypeForm) {
				const form = this.$refs.typeForm
				const errors = (form && typeof form.validate === 'function') ? form.validate() : []
				if (errors.length > 0) {
					this.contentErrors = errors
					return
				}
				this.contentErrors = []
				if (this.draftContent !== null) {
					this.$set(this.widget, 'content', this.draftContent)
				}
			}

			this.$emit('save', this.widget)
		},

		/**
		 * Cancel / backdrop / Esc — discard the draft, never mutate the widget.
		 *
		 * @return {void}
		 */
		onCancel() {
			this.$emit('close')
		},

		/**
		 * Delete button — forward the widget for the parent to remove.
		 *
		 * @return {void}
		 */
		onDelete() {
			this.$emit('delete', this.widget)
		},

		/**
		 * Esc-key fallback (in case NcModal's own handler is suppressed by a
		 * parent focus-trap). Emits `close`, never `save`.
		 *
		 * @param {KeyboardEvent} event the keydown event.
		 * @return {void}
		 */
		onKeydown(event) {
			if (this.show && event.key === 'Escape') {
				this.$emit('close')
			}
		},
	},
}
</script>

<style scoped>
.cn-widget-style-editor {
	padding: 24px;
}

.cn-widget-style-editor__title {
	font-size: 20px;
	font-weight: 600;
	margin: 0 0 24px;
}

.cn-widget-style-editor__section {
	margin-bottom: 24px;
	padding-bottom: 24px;
	border-bottom: 1px solid var(--color-border);
}

.cn-widget-style-editor__section:last-of-type {
	border-bottom: none;
}

.cn-widget-style-editor__section-title {
	font-size: 14px;
	font-weight: 600;
	margin: 0 0 16px;
	color: var(--color-text-maxcontrast);
	text-transform: uppercase;
}

.cn-widget-style-editor__row {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
}

.cn-widget-style-editor__label {
	width: 80px;
	flex-shrink: 0;
}

.cn-widget-style-editor__color-preview {
	width: 20px;
	height: 20px;
	border-radius: 4px;
	border: 1px solid var(--color-border);
}

.cn-widget-style-editor__actions {
	display: flex;
	justify-content: space-between;
	align-items: center;
	gap: 12px;
	margin-top: 24px;
}

.cn-widget-style-editor__actions-right {
	display: flex;
	gap: 12px;
}

.cn-widget-style-editor__icon-option {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 4px 0;
}

.cn-widget-style-editor__icon-preview {
	width: 24px;
	height: 24px;
	display: block;
	flex-shrink: 0;
	fill: currentColor;
	object-fit: contain;
}

.cn-widget-style-editor__icon-label {
	flex: 1;
}
</style>
