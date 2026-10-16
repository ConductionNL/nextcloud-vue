<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		class="cn-user-settings-dialog"
		:name="title"
		look="board"
		width="wizard"
		:eyebrow="eyebrow"
		:subtitle="subtitle"
		:open="open"
		:style="eyebrowStyle"
		data-testid="cn-user-settings-dialog"
		@update:open="onUpdateOpen"
		@closing="close">
		<div class="cn-user-settings-dialog__body">
			<nav
				v-if="sections.length > 0"
				class="cn-user-settings-dialog__nav"
				:aria-label="navLabel"
				data-testid="cn-user-settings-nav">
				<ul>
					<li v-for="section in sections" :key="section.id">
						<a
							:href="`#settings-section_${section.id}`"
							class="cn-user-settings-dialog__nav-link"
							:class="{ 'cn-user-settings-dialog__nav-link--active': section.id === selected }"
							:aria-current="section.id === selected ? 'true' : undefined"
							:data-testid="`cn-user-settings-nav-${section.id}`"
							@click.prevent="selectSection(section.id)">
							<span v-if="section.icon" class="cn-user-settings-dialog__nav-icon" aria-hidden="true">
								<CnVNodes :vnodes="section.icon" />
							</span>
							<span>{{ section.name }}</span>
						</a>
					</li>
				</ul>
			</nav>
			<div class="cn-user-settings-dialog__sections">
				<!-- @slot default NcAppSettingsSection children; each registers itself in the navigation. -->
				<slot />
			</div>
		</div>
		<template #actions>
			<p class="cn-user-settings-dialog__note" data-testid="cn-user-settings-note">
				{{ footerNote }}
			</p>
			<NcButton variant="secondary" data-testid="cn-user-settings-close" @click="close">
				{{ closeLabel }}
			</NcButton>
		</template>
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { NcButton } from '@nextcloud/vue'
import { markRaw } from 'vue'
import CnDialog from '../CnDialog/CnDialog.vue'

/**
 * The key NcAppSettingsSection injects to register itself with its dialog
 * (`Symbol.for`, so the same symbol `@nextcloud/vue` provides).
 */
const REGISTRATION_KEY = Symbol.for('NcAppSettingsDialog:registration')

/** Renders a section's icon vnodes as they were registered. */
const CnVNodes = {
	name: 'CnVNodes',
	props: { vnodes: { type: [Array, Object], default: null } },
	render() {
		return this.vnodes
	},
}

/**
 * CnUserSettingsDialog - the user settings dialog in the board look (board
 * PqPersoonlijk): eyebrow, title and subtitle, a left navigation listing the
 * sections with their icons, the sections themselves, and a footer with a
 * note that changes save straight away and a Close button.
 *
 * The sections stay the app's: any `NcAppSettingsSection` in the default slot
 * registers itself with this dialog exactly as it does with
 * `NcAppSettingsDialog`, with its name, order and `#icon` slot. CnAppRoot
 * renders this dialog instead of `NcAppSettingsDialog` under the board look.
 *
 * @spec openspec/changes/user-settings-board-dialog/specs/user-settings-board-dialog/spec.md#requirement-the-user-settings-dialog-takes-the-board-look
 *
 * @event update:open Emitted with `false` when the dialog closes.
 */
export default {
	name: 'CnUserSettingsDialog',

	components: { CnDialog, CnVNodes, NcButton },

	provide() {
		return {
			[REGISTRATION_KEY]: {
				registerSection: this.registerSection,
				unregisterSection: this.unregisterSection,
			},
		}
	},

	props: {
		/** Whether the dialog is open. */
		open: { type: Boolean, default: false },
		/** Dialog title; also its accessible name. */
		title: { type: String, required: true },
		/** Context line above the title. */
		eyebrow: { type: String, default: () => t('nextcloud-vue', 'Your account') },
		/** Sentence under the title. */
		subtitle: { type: String, default: () => t('nextcloud-vue', 'Only for you. Colleagues keep their own settings.') },
		/** The app's name, after the footer note. */
		appName: { type: String, default: '' },
	},

	emits: ['update:open'],

	data() {
		return {
			sections: [],
			selected: '',
			picked: false,
		}
	},

	computed: {
		/** @return {object} The board's eyebrow: muted, in sentence case. */
		eyebrowStyle() {
			return { '--cn-dialog-eyebrow-transform': 'none', '--cn-dialog-eyebrow-color': 'var(--color-text-maxcontrast)' }
		},

		/** @return {string} The navigation's accessible name. */
		navLabel() {
			return t('nextcloud-vue', 'Sections of the settings')
		},

		/** @return {string} The footer note, with the app's name when known. */
		footerNote() {
			const note = t('nextcloud-vue', 'Changes are saved straight away')
			return this.appName ? `${note} · ${this.appName}` : note
		},

		/** @return {string} The Close button label. */
		closeLabel() {
			return t('nextcloud-vue', 'Close')
		},
	},

	methods: {
		/**
		 * Add a section to the navigation, kept in `order`; a section
		 * without one goes last. Until the reader picks one, the first
		 * section is current.
		 *
		 * @param {string} id The section id.
		 * @param {string} name The section name.
		 * @param {number} [order] The section's place.
		 * @param {Array} [icon] The section's icon vnodes.
		 */
		registerSection(id, name, order, icon) {
			const rest = this.sections.filter((section) => section.id !== id)
			const place = typeof order === 'number' ? order : Math.max(0, ...rest.map((section) => section.order)) + 1
			this.sections = [...rest, { id, name, order: place, icon: icon ? markRaw(icon) : null }].sort((a, b) => a.order - b.order)
			if (!this.picked) {
				this.selected = this.sections[0].id
			}
		},

		/**
		 * Remove a section from the navigation.
		 *
		 * @param {string} id The section id.
		 */
		unregisterSection(id) {
			this.sections = this.sections.filter((section) => section.id !== id)
			if (this.selected === id) {
				this.selected = this.sections.length > 0 ? this.sections[0].id : ''
			}
		},

		/**
		 * Mark a section current and scroll it into view.
		 *
		 * @param {string} id The section id.
		 */
		selectSection(id) {
			this.picked = true
			this.selected = id
			const target = typeof document !== 'undefined' ? document.getElementById(`settings-section_${id}`) : null
			if (target && typeof target.scrollIntoView === 'function') {
				target.scrollIntoView({ behavior: 'smooth', block: 'start' })
			}
		},

		/**
		 * Follow NcDialog's own open state.
		 *
		 * @param {boolean} value Whether NcDialog is open.
		 */
		onUpdateOpen(value) {
			if (!value) {
				this.close()
			}
		},

		/** Close the dialog. */
		close() {
			this.$emit('update:open', false)
		},
	},
}
</script>

<style scoped>
.cn-user-settings-dialog__body {
	display: flex;
	flex-wrap: wrap;
	gap: 0 24px;
}

.cn-user-settings-dialog__nav {
	flex: 0 0 200px;
	width: 200px;
	padding-top: 18px;
}

.cn-user-settings-dialog__nav ul {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 0;
	padding: 0;
	list-style: none;
}

.cn-user-settings-dialog__nav-link {
	display: flex;
	align-items: center;
	gap: 10px;
	min-height: 40px;
	padding: 0 12px;
	border-radius: var(--border-radius-element, 8px);
	font-size: 15px;
	color: var(--color-main-text);
	text-decoration: none;
}

.cn-user-settings-dialog__nav-link:hover {
	background: var(--color-background-hover);
}

.cn-user-settings-dialog__nav-link:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

.cn-user-settings-dialog__nav-link--active,
.cn-user-settings-dialog__nav-link--active:hover {
	background: var(--color-primary-element-light);
	color: var(--color-primary-element-light-text);
	font-weight: 600;
}

.cn-user-settings-dialog__nav-icon {
	display: inline-flex;
	flex: none;
	width: 18px;
	height: 18px;
	align-items: center;
	justify-content: center;
}

.cn-user-settings-dialog__sections {
	display: flex;
	flex: 1 1 380px;
	flex-direction: column;
	min-width: 0;
}

.cn-user-settings-dialog__sections :deep(.app-settings-section) {
	margin: 0;
	padding: 18px 0;
	border-top: 1px solid var(--color-border);
}

.cn-user-settings-dialog__sections :deep(.app-settings-section__name) {
	margin: 0 0 12px;
	font-size: 17px;
	font-weight: 700;
}

.cn-user-settings-dialog__note {
	flex: 1 1 auto;
	margin: 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}
</style>
