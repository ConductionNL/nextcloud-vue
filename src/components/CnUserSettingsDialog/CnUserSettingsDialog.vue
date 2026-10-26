<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->
<template>
	<CnDialog
		class="cn-user-settings-dialog"
		:name="title"
		look="board"
		headless
		:open="open"
		:style="frameStyle"
		data-testid="cn-user-settings-dialog"
		@update:open="onUpdateOpen"
		@closing="close">
		<div class="cn-user-settings-dialog__body">
			<nav
				class="cn-user-settings-dialog__nav"
				:aria-label="navLabel"
				data-testid="cn-user-settings-nav">
				<h2 class="cn-user-settings-dialog__title" data-testid="cn-user-settings-title">
					{{ title }}
				</h2>
				<!-- `nextcloudLinks`: Nextcloud's own personal settings first, as
				     links, then one entry for this app holding its sections. -->
				<ul v-if="ncLinks.length > 0" class="cn-user-settings-dialog__nc-links" data-testid="cn-user-settings-nc-links">
					<li v-for="link in ncLinks" :key="link.key">
						<a :href="link.href" class="cn-user-settings-dialog__nav-link">
							<span class="cn-user-settings-dialog__nav-label">{{ link.label }}</span>
						</a>
					</li>
				</ul>
				<p v-if="ncLinks.length > 0 && appName"
					class="cn-user-settings-dialog__group"
					data-testid="cn-user-settings-app-group">
					{{ appName }}
				</p>
				<ul :class="{ 'cn-user-settings-dialog__group-sections': ncLinks.length > 0 }">
					<li v-for="section in sections" :key="section.id">
						<a
							:href="`#settings-section_${section.id}`"
							class="cn-user-settings-dialog__nav-link"
							:class="{ 'cn-user-settings-dialog__nav-link--active': section.id === selected }"
							:aria-current="section.id === selected ? 'true' : undefined"
							:data-testid="`cn-user-settings-nav-${section.id}`"
							@click.prevent="selectSection(section.id)">
							<span class="cn-user-settings-dialog__nav-label">{{ section.name }}</span>
						</a>
					</li>
				</ul>
			</nav>
			<div class="cn-user-settings-dialog__sections">
				<!-- @slot default NcAppSettingsSection children; each registers itself in the navigation. -->
				<slot />
				<p class="cn-user-settings-dialog__note" data-testid="cn-user-settings-note">
					{{ footerNote }}
				</p>
			</div>
			<NcButton
				class="cn-user-settings-dialog__close"
				variant="tertiary"
				:aria-label="closeLabel"
				:title="closeLabel"
				data-testid="cn-user-settings-close"
				@click="close">
				<template #icon>
					<Close :size="20" />
				</template>
			</NcButton>
		</div>
	</CnDialog>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import { generateUrl } from '@nextcloud/router'
import { NcButton } from '@nextcloud/vue'
import { ref } from 'vue'
import Close from 'vue-material-design-icons/Close.vue'
import CnDialog from '../CnDialog/CnDialog.vue'

/**
 * The key NcAppSettingsSection injects to register itself with its dialog
 * (`Symbol.for`, so the same symbol `@nextcloud/vue` provides).
 */
const REGISTRATION_KEY = Symbol.for('NcAppSettingsDialog:registration')

/** The key NcAppSettingsSection injects for the legacy design flag. */
const LEGACY_DESIGN_KEY = Symbol.for('NcAppSettingsDialog:legacy')

/**
 * CnUserSettingsDialog - the user settings dialog in the board look, as the
 * DqPersoonlijkeInstellingen board draws Nextcloud's own settings dialog:
 * 900px wide, the title at the top of a tinted navigation column, every
 * section stacked on a white pane that the navigation scrolls, a close icon
 * in the corner, and no header or footer. Under the sections a line says
 * that changes save straight away.
 *
 * The sections stay the app's: any `NcAppSettingsSection` in the default slot
 * registers itself with this dialog exactly as it does with
 * `NcAppSettingsDialog`, with its name and order. CnAppRoot renders this
 * dialog instead of `NcAppSettingsDialog` under the board look.
 *
 * @spec openspec/changes/user-settings-board-dialog/specs/user-settings-board-dialog/spec.md#requirement-the-user-settings-dialog-takes-the-board-look
 * @spec openspec/changes/user-settings-dialog-dq-board/specs/user-settings-dialog-dq-board/spec.md#requirement-the-user-settings-dialog-follows-the-dq-board
 *
 * @event update:open Emitted with `false` when the dialog closes.
 */
export default {
	name: 'CnUserSettingsDialog',

	components: { Close, CnDialog, NcButton },

	provide() {
		return {
			[REGISTRATION_KEY]: {
				registerSection: this.registerSection,
				unregisterSection: this.unregisterSection,
			},

			// NcAppSettingsSection also asks its dialog whether to use the legacy design.
			[LEGACY_DESIGN_KEY]: ref(false),
		}
	},

	props: {
		/** Whether the dialog is open. */
		open: { type: Boolean, default: false },
		/** Dialog title; also its accessible name. */
		title: { type: String, required: true },
		/**
		 * Deprecated and ignored: the board draws no line above the title.
		 * Kept so a host that passes it stays valid.
		 *
		 * @deprecated
		 */
		eyebrow: { type: String, default: () => t('nextcloud-vue', 'Your account') },
		/**
		 * Deprecated and ignored: the board draws no line under the title.
		 * Kept so a host that passes it stays valid.
		 *
		 * @deprecated
		 */
		subtitle: { type: String, default: () => t('nextcloud-vue', 'Only for you. Colleagues keep their own settings.') },
		/** The app's name, after the footer note and as the navigation entry holding its sections. */
		appName: { type: String, default: '' },
		/**
		 * Nextcloud's own personal settings, listed first in the navigation as
		 * links: `[{ label, section? | href?, icon? }]`. `section` is a
		 * personal settings section id (`/settings/user/<section>`). With any,
		 * the app's sections sit under one entry named after the app.
		 */
		nextcloudLinks: { type: Array, default: () => [] },
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
		/**
		 * The Nextcloud links with their URL.
		 *
		 * @spec openspec/changes/user-settings-nav-groups/specs/user-settings-board-dialog/spec.md#requirement-the-board-user-settings-navigation-can-list-nextclouds-own-sections-first
		 * @return {Array<{key: string, label: string, href: string, icon: string}>}
		 */
		ncLinks() {
			return (Array.isArray(this.nextcloudLinks) ? this.nextcloudLinks : [])
				.filter((link) => link && typeof link === 'object' && typeof link.label === 'string' && link.label !== '' && (link.href || link.section))
				.map((link, index) => ({
					key: String(link.section || link.href || index),
					label: link.label,
					href: link.href || generateUrl('/settings/user/{section}', { section: String(link.section) }),
					icon: typeof link.icon === 'string' ? link.icon : '',
				}))
		},

		/** @return {object} The board's 900px width, over CnDialog's width roles. */
		frameStyle() {
			return { '--cn-dialog-width': '900px' }
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
		 * @param {number} [order] The section's place. A section's icon, the
		 *   fourth argument NcAppSettingsSection passes, is not drawn: the
		 *   board lists the sections by name alone.
		 */
		registerSection(id, name, order) {
			const rest = this.sections.filter((section) => section.id !== id)
			const place = typeof order === 'number' ? order : Math.max(0, ...rest.map((section) => section.order)) + 1
			this.sections = [...rest, { id, name, order: place }].sort((a, b) => a.order - b.order)
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
		 * Mark a section current, scroll it to the top of the pane and focus
		 * its heading. Every section stays in the pane.
		 *
		 * @param {string} id The section id.
		 */
		selectSection(id) {
			this.picked = true
			this.selected = id
			this.$nextTick(() => {
				const el = typeof document !== 'undefined' ? document.getElementById(`settings-section_${id}`) : null
				if (el && typeof el.scrollIntoView === 'function') {
					el.scrollIntoView({ block: 'start', behavior: 'smooth' })
				}
				const heading = typeof document !== 'undefined' ? document.getElementById(`settings-section_${id}--label`) : null
				if (heading) {
					heading.setAttribute('tabindex', '-1')
					heading.focus({ preventScroll: true })
				}
			})
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
			/**
			 * @event update:open Emitted with `false` when the dialog closes (Close button, close icon, Escape).
			 */
			this.$emit('update:open', false)
		},
	},
}
</script>

<style scoped>
/* The DqPersoonlijkeInstellingen board: a tinted navigation column with the
   title on top, the sections on a white pane beside it, and the close icon
   in the corner. The dialog's frame (900px, its tint, no padding) is in
   dialog.css, on the teleported container. */
.cn-user-settings-dialog__body {
	position: relative;
	display: flex;
	min-height: 440px;
	max-height: min(760px, calc(100vh - 112px));
}

.cn-user-settings-dialog__nav {
	display: flex;
	flex: 0 0 200px;
	flex-direction: column;
	gap: 2px;
	box-sizing: border-box;
	width: 200px;
	padding: 0 4px 12px;
	overflow-y: auto;
}

.cn-user-settings-dialog__title {
	margin: 0;
	padding: 14px 10px 12px;
	font-size: 20px;
	font-weight: 700;
	line-height: 1.25;
	color: var(--color-main-text);
}

.cn-user-settings-dialog__nav ul {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin: 0;
	padding: 0;
	list-style: none;
}

/* A navigation entry, not a link in running text: no underline, also not
   on hover. `!important` because a theme's `a { text-decoration }` carries
   it (thematiq), and a bare `a` with `!important` beats any class. The same
   theme paints every link `var(--nldesign-color-on-surface, <link colour>)
   !important`, so the entry hands it the main text colour through that
   token; only the open entry is marked, by its tint and bar. */
.cn-user-settings-dialog__nav-link,
.cn-user-settings-dialog__nav-link:visited {
	--nldesign-color-on-surface: var(--color-main-text);
	position: relative;
	display: flex;
	align-items: center;
	min-height: 36px;
	padding: 0 10px;
	border-radius: var(--border-radius-element, 8px);
	font-size: 15px;
	font-weight: 500;
	color: var(--color-main-text);
	text-decoration: none !important;
}

.cn-user-settings-dialog__nav-label {
	overflow: hidden;
	text-overflow: ellipsis;
}

.cn-user-settings-dialog__nav-link:hover {
	background: color-mix(in srgb, var(--color-primary-element) 8%, transparent);
	text-decoration: none !important;
}

.cn-user-settings-dialog__nav-link:focus-visible {
	outline: 2px solid var(--color-primary-element);
	outline-offset: 2px;
}

/* The open section: a stronger tint and a 3px bar at the left edge. */
.cn-user-settings-dialog__nav-link--active,
.cn-user-settings-dialog__nav-link--active:hover {
	background: color-mix(in srgb, var(--color-primary-element) 16%, var(--color-primary-element-light));
}

.cn-user-settings-dialog__nav-link--active::before {
	content: '';
	position: absolute;
	top: 6px;
	bottom: 6px;
	inset-inline-start: 0;
	width: 3px;
	border-radius: 2px;
	background: var(--color-primary-element);
}

.cn-user-settings-dialog__group {
	margin: 10px 0 2px;
	padding: 0 10px;
	font-size: 15px;
	font-weight: 600;
	color: var(--color-main-text);
}

.cn-user-settings-dialog__group-sections {
	padding-inline-start: 10px;
}

.cn-user-settings-dialog__sections {
	display: flex;
	flex: 1 1 auto;
	flex-direction: column;
	gap: 32px;
	box-sizing: border-box;
	min-width: 0;
	padding: 20px 64px 20px 24px;
	overflow-y: auto;
	border-inline-start: 1px solid var(--color-border);
	border-radius: 8px 0 0 8px;
	background: var(--color-main-background);
}

/* A section's heading and description start at the text's edge, as the
   board draws them (NcAppSettingsSection indents them 12px). */
.cn-user-settings-dialog__sections :deep(.app-settings-section) {
	--app-settings-section-text-offset: 0;
	margin: 0;
	padding: 0;
	border: 0;
}

.cn-user-settings-dialog__sections :deep(.app-settings-section__name) {
	margin: 0 0 6px;
	font-size: 20px;
	font-weight: 700;
	line-height: 1.3;
}

.cn-user-settings-dialog__note {
	margin: 0;
	font-size: 14px;
	color: var(--color-text-maxcontrast);
}

/* One class more than NcButton's own `position: relative`, which otherwise
   wins at the same weight and leaves the button stretched in the body row. */
.cn-user-settings-dialog__body > .cn-user-settings-dialog__close {
	position: absolute;
	top: 8px;
	inset-inline-end: 8px;
}

@media (max-width: 600px) {
	.cn-user-settings-dialog__body {
		flex-direction: column;
	}

	.cn-user-settings-dialog__nav {
		flex-basis: auto;
		width: auto;
		max-height: 40vh;
	}

	.cn-user-settings-dialog__sections {
		padding: 20px 16px;
		border-inline-start: 0;
		border-radius: 8px 8px 0 0;
	}
}
</style>
