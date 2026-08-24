<!--
  CnEditSupportModal — edit the working manifest's support / donation dialog.

  Mutates the passed `working` manifest copy ONLY (never the base). Exposes every
  part of CnSupportDialog from the UI: the dialog title, the body text, the
  founder signature (name, title, avatar, profile link) and all four action
  buttons (each can be toggled off, relabelled, re-styled, re-iconed and
  re-targeted). Empty fields fall back to the shell's built-in defaults, so the
  author overrides only what they want. CnAppRoot reads `manifest.support` and
  feeds it to CnSupportDialog. Persists via the shared useManifestEditor
  (manifestModalDoneMixin). Isolated NcDialog per ADR-004.
-->
<template>
	<NcDialog size="normal" :name="t('nextcloud-vue', 'Edit support &amp; donation')" @closing="$emit('close')">
		<p class="cn-edit-support__intro">
			{{ t('nextcloud-vue', 'A one-time, dismissible note shown the first time a user opens the app. It introduces the team and offers to donate, suggest a feature, review, or get support. Leave a field blank to keep the default.') }}
		</p>

		<NcCheckboxRadioSwitch v-model="support.enabled">
			{{ t('nextcloud-vue', 'Show the support note on first open') }}
		</NcCheckboxRadioSwitch>

		<NcTextField v-model="support.title"
			class="cn-edit-support__field"
			:label="t('nextcloud-vue', 'Dialog title')"
			:placeholder="t('nextcloud-vue', 'Support {appName}', { appName: appName })" />
		<NcTextArea class="cn-edit-support__field"
			:label="t('nextcloud-vue', 'Body (one paragraph per line, blank for the default note)')"
			:model-value="bodyText"
			@update:model-value="setBody" />

		<h3 class="cn-edit-support__section">
			{{ t('nextcloud-vue', 'Signature') }}
		</h3>
		<NcTextField v-model="support.founderName"
			class="cn-edit-support__field"
			:label="t('nextcloud-vue', 'Signatory name')" />
		<NcTextField v-model="support.founderTitle"
			class="cn-edit-support__field"
			:label="t('nextcloud-vue', 'Signatory role')"
			:placeholder="t('nextcloud-vue', 'e.g. Owner, CTO, Founder, Team')" />

		<div class="cn-edit-support__avatar">
			<img v-if="avatarPreview"
				class="cn-edit-support__avatar-preview"
				:src="avatarPreview"
				alt="">
			<div class="cn-edit-support__avatar-fields">
				<NcTextField v-model="support.founderAvatarUrl"
					:label="t('nextcloud-vue', 'Avatar URL (blank for the default portrait)')" />
				<div class="cn-edit-support__avatar-actions">
					<NcButton variant="secondary" @click="avatarFileEl && avatarFileEl.click()">
						<template #icon>
							<Upload :size="20" />
						</template>
						{{ t('nextcloud-vue', 'Upload image') }}
					</NcButton>
					<NcButton v-if="support.founderAvatarUrl"
						variant="tertiary"
						@click="clearAvatar">
						{{ t('nextcloud-vue', 'Reset to default') }}
					</NcButton>
					<!-- `:ref`, not `ref` — see CnFilesTab: a fully static
					     input with a cached handler is hoisted, and a hoisted
					     vnode's ref has no owner, which throws in production. -->
					<input :ref="avatarFileRef"
						type="file"
						accept="image/*"
						class="cn-edit-support__avatar-input"
						@change="onAvatarFile">
				</div>
			</div>
		</div>

		<NcTextField v-model="support.founderProfileUrl"
			class="cn-edit-support__field"
			:label="t('nextcloud-vue', 'Avatar link URL (where the avatar points)')" />

		<h3 class="cn-edit-support__section">
			{{ t('nextcloud-vue', 'Buttons') }}
		</h3>
		<p class="cn-edit-support__intro">
			{{ t('nextcloud-vue', 'Turn a button off, or change its label, link, style and icon. Icons use a PascalCase MDI name (for example HeartOutline).') }}
		</p>

		<ul class="cn-edit-support__list">
			<li v-for="def in buttonDefs" :key="def.id" class="cn-edit-support__button">
				<h4 class="cn-edit-support__button-name">
					{{ def.name }}
				</h4>
				<NcTextField v-model="buttonFor(def.id).label"
					:label="t('nextcloud-vue', 'Label')"
					:placeholder="def.label" />
				<NcTextField v-model="buttonFor(def.id).url"
					:label="t('nextcloud-vue', 'Link URL')"
					:placeholder="def.url || t('nextcloud-vue', 'Default for this app')" />
				<NcCheckboxRadioSwitch v-model="buttonFor(def.id).enabled">
					{{ t('nextcloud-vue', 'Show this button') }}
				</NcCheckboxRadioSwitch>
				<label class="cn-edit-support__style">
					<span>{{ t('nextcloud-vue', 'Style') }}</span>
					<NcSelect v-model="buttonFor(def.id).variant"
						:options="variantOptions"
						:clearable="false"
						:reduce="o => o.id"
						label="label"
						:input-label="t('nextcloud-vue', 'Button style')" />
				</label>
				<NcTextField v-model="buttonFor(def.id).icon"
					:label="t('nextcloud-vue', 'Icon (PascalCase MDI name)')"
					:placeholder="def.icon" />
			</li>
		</ul>

		<template #actions>
			<NcButton variant="primary" :disabled="saving" @click="onDone">
				<template #icon>
					<NcLoadingIcon v-if="saving" :size="20" />
					<ContentSaveOutline v-else :size="20" />
				</template>
				{{ saving ? t('nextcloud-vue', 'Saving…') : t('nextcloud-vue', 'Done') }}
			</NcButton>
		</template>
	</NcDialog>
</template>

<script>
import { NcDialog, NcButton, NcLoadingIcon, NcTextField, NcTextArea, NcCheckboxRadioSwitch, NcSelect } from '@nextcloud/vue'
import { translate as t } from '@nextcloud/l10n'
import Upload from 'vue-material-design-icons/Upload.vue'
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'
import manifestModalDoneMixin from '../mixins/manifestModalDoneMixin.js'

/** The four built-in buttons, in display order, with their shell defaults. */
const BUTTON_DEFS = [
	{ id: 'donate', name: 'Donate', label: 'Donate', variant: 'tertiary', icon: 'HeartOutline', url: 'https://github.com/sponsors/ConductionNL' },
	{ id: 'support', name: 'Get support', label: 'Get support', variant: 'tertiary', icon: 'BriefcaseOutline', url: 'https://www.conduction.nl/support' },
	{ id: 'feature-request', name: 'Suggest a feature', label: 'Suggest a feature', variant: 'primary', icon: 'HandHeart', url: '' },
	{ id: 'app-store', name: 'Review on App Store', label: 'Review on App Store', variant: 'secondary', icon: 'Star', url: '' },
]

export default {
	name: 'CnEditSupportModal',

	components: { NcDialog, NcButton, NcLoadingIcon, NcTextField, NcTextArea, NcCheckboxRadioSwitch, NcSelect, Upload, ContentSaveOutline },

	mixins: [manifestModalDoneMixin],

	props: {
		/**
		 * The working manifest copy whose `support` block is edited in place.
		 *
		 * @type {object|null}
		 */
		working: {
			type: Object,
			default: null,
		},
	},

	emits: ['close'],

	data() {
		return {
			/**
			 * The hidden avatar file input, set by the template's function ref.
			 * Held here rather than read back through `$refs` so the ref stays
			 * DYNAMIC — see the template comment on the input.
			 *
			 * @type {HTMLInputElement|null}
			 */
			avatarFileEl: null,
		}
	},

	computed: {
		/** The working manifest's support block. */
		support() {
			return (this.working && this.working.support) ? this.working.support : { enabled: true }
		},
		/** The app's display name, for the title placeholder. */
		appName() {
			return (this.support && this.support.appName)
				|| (this.working && this.working.name)
				|| t('nextcloud-vue', 'this app')
		},
		/** The body paragraphs joined to one-per-line text for editing. */
		bodyText() {
			return Array.isArray(this.support.bodyParagraphs) ? this.support.bodyParagraphs.join('\n') : ''
		},
		/** The avatar to preview: the override if set, else nothing (default applies). */
		avatarPreview() {
			return this.support.founderAvatarUrl || ''
		},
		/** The four built-in button definitions (for labels + placeholders). */
		buttonDefs() {
			return BUTTON_DEFS
		},
		/** Selectable button styles. */
		variantOptions() {
			return [
				{ id: 'primary', label: t('nextcloud-vue', 'Primary (filled)') },
				{ id: 'secondary', label: t('nextcloud-vue', 'Secondary') },
				{ id: 'tertiary', label: t('nextcloud-vue', 'Tertiary (text)') },
			]
		},
	},

	created() {
		// Lazily create the support block + per-button overrides reactively. A
		// brand-new property on the working manifest must go through $set, or
		// Vue 2 won't track later edits. The buttons are seeded with their
		// defaults so all four are visible and can be toggled, relabelled,
		// re-styled, re-iconed or dropped.
		if (!this.working) return
		if (!this.working.support || typeof this.working.support !== 'object') {
			this.working.support = { enabled: true }
		}
		if (!this.working.support.buttons || typeof this.working.support.buttons !== 'object') {
			this.working.support.buttons = {}
		}
		for (const def of BUTTON_DEFS) {
			if (!this.working.support.buttons[def.id]) {
				this.working.support.buttons[def.id] = {
					enabled: true,
					label: def.label,
					url: def.url,
					variant: def.variant,
					icon: def.icon,
				}
			}
		}
	},

	methods: {
		t,

		/**
		 * Function ref for the hidden avatar file input; a method so the
		 * binding is stable across renders.
		 *
		 * @param {HTMLInputElement|null} el The element, or null on unmount.
		 * @return {void}
		 */
		avatarFileRef(el) {
			this.avatarFileEl = el || null
		},
		/**
		 * The override object for a button id. Falls back to an empty object
		 * during the modal's close transition, when `working` (and thus
		 * `support.buttons`) is briefly gone — avoids a render crash.
		 *
		 * @param {string} id The button id.
		 * @return {object} The button override object.
		 */
		buttonFor(id) {
			return (this.support.buttons && this.support.buttons[id]) || {}
		},
		/**
		 * Store the body as an array of paragraphs (one per non-blank line).
		 *
		 * @param {string} value The textarea value.
		 */
		setBody(value) {
			const paras = (value || '').split('\n').map((p) => p.trim()).filter((p) => p !== '')
			if (paras.length === 0) {
				delete this.support.bodyParagraphs
			} else {
				this.support.bodyParagraphs = paras
			}
		},
		/**
		 * Read the chosen image file and store it as a data-URI avatar so the
		 * portrait travels in the manifest with no external request.
		 *
		 * @param {Event} event The file-input change event.
		 */
		onAvatarFile(event) {
			const file = event.target && event.target.files && event.target.files[0]
			if (!file) return
			const reader = new FileReader()
			reader.onload = () => {
				this.support.founderAvatarUrl = String(reader.result)
			}
			reader.readAsDataURL(file)
			event.target.value = ''
		},
		/** Clear the avatar override so the bundled default portrait applies. */
		clearAvatar() {
			delete this.support.founderAvatarUrl
		},
	},
}
</script>

<style scoped>
.cn-edit-support__intro {
	color: var(--color-text-maxcontrast);
	margin-bottom: 12px;
}

.cn-edit-support__section {
	margin-bottom: 8px;
}

.cn-edit-support__field {
	display: block;
	margin-bottom: 12px;
}

.cn-edit-support__list {
	list-style: none;
	padding: 0;
	margin: 0;
}

.cn-edit-support__button {
	border: 1px solid var(--color-border);
	border-radius: var(--border-radius-large);
	padding: 12px;
	margin-bottom: 12px;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-edit-support__button-name {
	margin: 0;
}

.cn-edit-support__avatar {
	display: flex;
	gap: 12px;
	align-items: flex-start;
	margin-bottom: 12px;
}

.cn-edit-support__avatar-preview {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	object-fit: cover;
	flex: 0 0 auto;
}

.cn-edit-support__avatar-fields {
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-edit-support__avatar-actions {
	display: flex;
	gap: 8px;
	align-items: center;
}

.cn-edit-support__avatar-input {
	display: none;
}

.cn-edit-support__style {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
</style>
