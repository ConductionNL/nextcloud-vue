<!--
  - SPDX-FileCopyrightText: 2026 Conduction B.V.
  - SPDX-License-Identifier: EUPL-1.2
-->

<!--
  CnNotepadWidget — a personal notepad typed into in place, in view mode.

  The text belongs to the reader: it is stored in their user preferences under
  `notepad.<dashboard id>.<widget id>`, never in the dashboard layout, so typing
  does not rewrite the layout and each reader of a shared dashboard sees only
  their own note. It saves shortly after the last keystroke and on blur. While
  the card is not focused, the markdown renders.

  @spec openspec/changes/dashboard-notepad-widget/tasks.md
-->

<template>
	<div class="cn-notepad-widget" :style="wrapperStyle">
		<!-- Rendered markdown while the card is not being edited. -->
		<div
			v-if="!editing && hasText"
			class="cn-notepad-widget__rendered"
			tabindex="0"
			role="button"
			data-testid="cn-notepad-rendered"
			:aria-label="cnTranslate('Edit {title}').replace('{title}', label)"
			@click="startEditing"
			@keydown.enter.prevent="startEditing"
			v-html="renderedHtml" /><!-- eslint-disable-line vue/no-v-html -->
		<textarea
			v-show="editing || !hasText"
			ref="textarea"
			v-model="text"
			class="cn-notepad-widget__textarea"
			:aria-label="label"
			:placeholder="cnTranslate('Type a note')"
			data-testid="cn-notepad-textarea"
			@focus="onFocus"
			@input="onInput"
			@blur="onBlur" />
		<p
			class="cn-notepad-widget__status"
			:class="{ 'cn-notepad-widget__status--failed': status === 'failed' }"
			role="status"
			aria-live="polite"
			data-testid="cn-notepad-status">
			{{ statusText }}
		</p>
	</div>
</template>

<script>
import { translate as t } from '@nextcloud/l10n'
import DOMPurify from 'dompurify'
import { Marked } from 'marked'
import { readUserPreference, writeUserPreference } from '../../composables/useUserPreferences.js'

// Scoped instance so configuring `marked` here never touches the global singleton.
const markedInstance = new Marked({ gfm: true, breaks: false })

/** Wait after the last keystroke before saving, in ms. */
const SAVE_DELAY_MS = 800

/**
 * CnNotepadWidget — the `notepad` dashboard widget: a personal note typed into
 * in place, saved to the reader's user preferences.
 */
export default {
	name: 'CnNotepadWidget',

	inject: {
		cnTranslate: { default: () => (key) => key },
		// Provided by CnAppRoot: the per-user preference group of the app.
		cnUserPreferences: { default: null },
		// Provided by CnDashboardPage: a getter for the page id.
		cnDashboardPageId: { default: null },
	},

	props: {
		/**
		 * The widget's stable id within its dashboard; part of the storage key.
		 * Dashboard widgets receive it from the grid.
		 */
		widgetId: {
			type: [String, Number],
			default: 'notepad',
		},

		/**
		 * Placement content: `title` labels the textarea, `height` (a CSS
		 * length or a number of pixels) sets its minimum height, `dashboardId`
		 * overrides the dashboard id used in the storage key, `appId` names the
		 * app whose preferences hold the note when no CnAppRoot provides one.
		 *
		 * @type {{title?: string, height?: (string|number), dashboardId?: string, appId?: string}}
		 */
		content: {
			type: Object,
			default: () => ({}),
		},
	},

	data() {
		return {
			text: '',
			// What the server last held for this note, to tell a local edit from a newer stored value.
			savedText: '',
			updatedAt: 0,
			editing: false,
			status: 'idle',
			saveTimer: null,
		}
	},

	computed: {
		/** Accessible name of the textarea: the card title. */
		label() {
			return (this.content && this.content.title) || this.cnTranslate('Notepad')
		},

		/** The dashboard id in the storage key. */
		dashboardId() {
			const explicit = this.content && this.content.dashboardId
			if (explicit) {
				return String(explicit)
			}
			const fromPage = typeof this.cnDashboardPageId === 'function' ? this.cnDashboardPageId() : null
			return fromPage ? String(fromPage) : 'dashboard'
		},

		/** The preference key holding this reader's note. */
		storageKey() {
			return `notepad.${this.dashboardId}.${this.widgetId}`
		},

		/** Whether the note has any text. */
		hasText() {
			return this.text.trim() !== ''
		},

		/** The note's markdown as sanitised HTML. */
		renderedHtml() {
			return DOMPurify.sanitize(markedInstance.parse(this.text || '', { async: false }))
		},

		/** The Saved / not saved message. */
		statusText() {
			if (this.status === 'saved') {
				return this.cnTranslate('Saved')
			}
			if (this.status === 'failed') {
				return this.cnTranslate('Not saved. It will try again when you type.')
			}
			if (this.status === 'saving') {
				return this.cnTranslate('Saving')
			}
			return ''
		},

		/** Minimum height of the card body from `content.height`. */
		wrapperStyle() {
			const h = this.content && this.content.height
			if (h === undefined || h === null || h === '') {
				return {}
			}
			return { '--cn-notepad-min-height': typeof h === 'number' ? `${h}px` : String(h) }
		},
	},

	async mounted() {
		const stored = await this.readStored()
		if (stored) {
			this.applyStored(stored)
		}
	},

	beforeUnmount() {
		this.flush()
	},

	methods: {
		/**
		 * Read the stored note for this reader.
		 *
		 * @return {Promise<?{text: string, updatedAt: number}>} The stored note or null.
		 */
		async readStored() {
			try {
				const value = this.cnUserPreferences
					? await this.cnUserPreferences.read(this.storageKey, null)
					: await readUserPreference((this.content && this.content.appId) || '', this.storageKey, null)
				return value && typeof value.text === 'string' ? value : null
			} catch {
				return null
			}
		},

		/**
		 * Take a stored note as the card's text.
		 *
		 * @param {{text: string, updatedAt?: number}} stored The stored note.
		 * @return {void}
		 */
		applyStored(stored) {
			this.text = stored.text
			this.savedText = stored.text
			this.updatedAt = Number(stored.updatedAt) || 0
		},

		/**
		 * On focus, read again: a newer value (the same person typed in another
		 * tab) replaces the card's text before editing, unless this card has
		 * unsaved changes of its own.
		 *
		 * @return {Promise<void>}
		 */
		async onFocus() {
			this.editing = true
			const stored = await this.readStored()
			if (stored && (Number(stored.updatedAt) || 0) > this.updatedAt && this.text === this.savedText) {
				this.applyStored(stored)
			}
		},

		/**
		 * Turn the rendered note into the editor and focus it.
		 *
		 * @return {void}
		 */
		startEditing() {
			this.editing = true
			this.$nextTick(() => this.$refs.textarea && this.$refs.textarea.focus())
		},

		/**
		 * Debounce a save after each keystroke.
		 *
		 * @return {void}
		 */
		onInput() {
			this.status = 'idle'
			clearTimeout(this.saveTimer)
			this.saveTimer = setTimeout(() => this.save(), SAVE_DELAY_MS)
		},

		/**
		 * Leaving the card saves any pending text and shows the rendered note.
		 *
		 * @return {void}
		 */
		onBlur() {
			this.editing = false
			this.flush()
		},

		/**
		 * Save now if a debounced save is pending.
		 *
		 * @return {void}
		 */
		flush() {
			if (this.saveTimer) {
				clearTimeout(this.saveTimer)
				this.saveTimer = null
				this.save()
			}
		},

		/**
		 * Write the note to the reader's preferences; the layout is never touched.
		 *
		 * @return {Promise<void>}
		 */
		async save() {
			this.saveTimer = null
			const text = this.text
			const updatedAt = Date.now()
			this.status = 'saving'
			let ok
			try {
				ok = this.cnUserPreferences
					? await this.cnUserPreferences.write(this.storageKey, { text, updatedAt })
					: await writeUserPreference((this.content && this.content.appId) || '', this.storageKey, { text, updatedAt })
			} catch {
				ok = false
			}
			if (ok) {
				this.savedText = text
				this.updatedAt = updatedAt
			}
			// A newer keystroke has already queued its own save; leave its status alone.
			if (!this.saveTimer) {
				this.status = ok ? 'saved' : 'failed'
			}
		},

		t,
	},
}
</script>

<style>
.cn-notepad-widget {
	display: flex;
	flex-direction: column;
	gap: 4px;
	height: 100%;
	min-height: var(--cn-notepad-min-height, 120px);
}

.cn-notepad-widget__textarea {
	flex: 1 1 auto;
	width: 100%;
	min-height: 80px;
	resize: none;
	border: none;
	background: transparent;
	color: var(--color-main-text);
	font: inherit;
}

.cn-notepad-widget__rendered {
	flex: 1 1 auto;
	overflow: auto;
	cursor: text;
	color: var(--color-main-text);
}

.cn-notepad-widget__status {
	margin: 0;
	min-height: 1.2em;
	color: var(--color-text-maxcontrast);
	font-size: 0.85em;
}

.cn-notepad-widget__status--failed {
	color: var(--color-error-text, var(--color-error));
}
</style>
