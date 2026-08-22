/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 */

/**
 * Shared "Done = save" behaviour for the Buildiq manifest-edit modals
 * (pages / menu / settings / sidebar / actions).
 *
 * Those modals all mutate the single working manifest in place; persistence is
 * owned by the shared `useManifestEditor` instance that CnAppRoot provides as
 * `cnManifestEditor`. Without this mixin a modal's primary "Done" button only
 * emits `close`, so the user is silently left with unsaved edits that vanish on
 * refresh (they would have to also find the separate edit-button "Save"). This
 * mixin makes "Done" persist the working manifest, then close — and exposes a
 * `saving` flag so the button can show progress during the (possibly slow)
 * persist. When no editor is injected (standalone use) it degrades to a plain
 * close, so the modals stay usable outside the edit shell.
 */
import ContentSaveOutline from 'vue-material-design-icons/ContentSaveOutline.vue'

export default {
	// Registered here so every "Done = save" modal can drop <ContentSaveOutline>
	// into its primary button's #icon slot without repeating the import.
	components: { ContentSaveOutline },

	inject: {
		/** Shared useManifestEditor instance from CnAppRoot; null when standalone. */
		cnManifestEditor: { default: null },
	},

	data() {
		return {
			// True while the working manifest is persisting after Done.
			saving: false,
		}
	},

	methods: {
		/**
		 * Persist the working manifest via the injected editor (if any), then
		 * close. A persist failure is logged but still closes the modal — the
		 * edits remain in the working manifest so the edit-button Save can retry.
		 *
		 * @return {Promise<void>}
		 */
		async onDone() {
			const editor = this.cnManifestEditor
			if (editor && typeof editor.save === 'function') {
				this.saving = true
				try {
					await editor.save()
				} catch (e) {
					// eslint-disable-next-line no-console
					console.error('[CnEditModal] manifest save failed', e)
				} finally {
					this.saving = false
				}
			}
			this.$emit('close')
		},
	},
}
