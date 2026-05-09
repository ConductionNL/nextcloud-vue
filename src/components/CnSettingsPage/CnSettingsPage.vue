<!--
  CnSettingsPage — Admin / config surface.

  Renders manifest-driven config sections. Each section in
  `config.sections[]` is a CnSettingsCard wrapping a CnSettingsSection
  with one form field per `section.fields[]` entry. Saves via
  `axios.put(saveEndpoint, formData)` with the consumer's settings
  controller URL.

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

		<!-- Sections -->
		<CnSettingsCard
			v-for="(section, index) in sections"
			:key="`section-${index}`"
			:title="resolveLabel(section.title)"
			:icon="section.icon || ''"
			:collapsible="section.collapsible || false">
			<CnSettingsSection
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
								:value="String(formData[field.key] ?? '')"
								@update:value="updateField(field.key, $event === '' ? null : Number($event))" />
							<NcTextField
								v-else-if="field.type === 'password'"
								:label="resolveLabel(field.label)"
								type="password"
								:value="formData[field.key] ?? ''"
								@update:value="updateField(field.key, $event)" />
							<NcSelect
								v-else-if="field.type === 'enum' && Array.isArray(field.options)"
								:value="formData[field.key]"
								:options="field.options"
								:input-label="resolveLabel(field.label)"
								@input="updateField(field.key, $event)" />
							<NcTextField
								v-else
								:label="resolveLabel(field.label)"
								:value="formData[field.key] ?? ''"
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

/**
 * CnSettingsPage — Manifest-driven settings page.
 *
 * Reads `sections[]` (each a `{ title, description?, fields[] }`) from
 * `pages[].config` and renders a CnSettingsCard + CnSettingsSection
 * per section. Each field's `type` controls which input renders:
 *
 *  - `boolean` → NcCheckboxRadioSwitch
 *  - `number` → NcTextField (type=number)
 *  - `string` → NcTextField (default)
 *  - `password` → NcTextField (type=password)
 *  - `enum` → NcSelect (requires `options: string[]`)
 *
 * Per-field `#field-<key>` slots are exposed so consumers can drop in
 * their own widget (e.g. a CnJsonViewer for `json`-typed fields). The
 * scope passed in is `{ field, value, onInput }`.
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
 *  - `#field-<key>` — Replaces the input for a specific field. Scope:
 *    `{ field, value, onInput }`.
 *
 * Events:
 *  - `@save` — Emitted on successful save. Payload: the form data.
 *  - `@error` — Emitted when save fails. Payload: the error.
 *  - `@input` — Emitted on every field change. Payload: `{ key, value }`.
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
		 * Section definitions. Each section: `{ title, description?, icon?,
		 * collapsible?, fields: [{ key, label, type, options?, help?, default? }] }`.
		 *
		 * @type {Array<object>}
		 */
		sections: {
			type: Array,
			default: () => [],
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
	},

	data() {
		return {
			formData: this.cloneInitial(),
			originalData: this.cloneInitial(),
			saving: false,
			lastError: null,
		}
	},

	computed: {
		/** Whether any field has changed since load. */
		dirty() {
			return JSON.stringify(this.formData) !== JSON.stringify(this.originalData)
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
	},

	methods: {
		cloneInitial() {
			const merged = { ...(this.initialValues || {}) }
			// Pre-populate any field with a `default` if no value is set yet.
			for (const section of this.sections || []) {
				for (const field of section.fields || []) {
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

	emits: ['save', 'error', 'input'],
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
