/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * useSuggestFeatureAction — opt-in helper for adding a "Suggest feature"
 * `NcActions` item to any widget that has declared a `specRef`.
 *
 * Returns an action descriptor `{label, icon, action}` when `useSpecRef()`
 * resolves a non-empty slug, or `null` when no specRef is in scope. The
 * action callback opens the consuming app's `SuggestFeatureModal` with the
 * slug pre-filled — actual modal mounting is the consumer's responsibility
 * (the helper just supplies the descriptor + emits the resolved slug).
 *
 * Spec: features-roadmap-component — Requirement "useSuggestFeatureAction helper"
 * (`openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`).
 *
 * @module composables/useSuggestFeatureAction
 */

import { translate as t } from '@nextcloud/l10n'
import { useSpecRef } from './useSpecRef.js'

/**
 * @typedef {object} SuggestFeatureAction
 * @property {string}      label  Localized action label.
 * @property {string}      icon   Material-design-icon name suitable for `<NcActions>`.
 * @property {Function}    action Callback that should open the suggestion modal.
 * @property {string}      specRef The resolved kebab-case slug.
 */

/**
 * Build a "Suggest feature" `NcActions` descriptor for the current component
 * context. Returns `null` when no specRef is in scope so consumers can `v-if`
 * cleanly: `<NcActionButton v-if="suggestAction" ... />`.
 *
 * @param {object}   vm                The Vue component instance (typically `this`).
 * @param {Function} onOpenModal       Callback invoked when the action is clicked.
 *                                     Receives the resolved slug.
 * @return {SuggestFeatureAction|null} Descriptor or `null` when no specRef present.
 *
 * @example
 *   computed: {
 *     suggestAction() {
 *       return useSuggestFeatureAction(this, (slug) => {
 *         this.suggestModalSlug = slug
 *         this.suggestModalOpen = true
 *       })
 *     },
 *   }
 */
export function useSuggestFeatureAction(vm, onOpenModal) {
	const slug = useSpecRef(vm)
	if (slug === null) {
		return null
	}

	return {
		label: t('nextcloud-vue', 'Suggest feature'),
		icon: 'icon-add',
		specRef: slug,
		action: () => {
			if (typeof onOpenModal === 'function') {
				onOpenModal(slug)
			}
		},
	}
}
