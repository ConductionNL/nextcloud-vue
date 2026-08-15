/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Bespoke Vue components for the Tier-2 `forms` integration leaf.
 *
 * Re-exports the bespoke tab + card plus the Tier-2 picker and create
 * modals so the cross-repo coordinator (which owns
 * `src/integrations/builtin/leaves.js`) can repoint the `forms` entry
 * from the generic `CnIntegrationTab` / `CnIntegrationCard` shells at
 * these forms-aware components.
 *
 * Per AD-11/AD-13 of `pluggable-integration-registry`, the registration
 * itself (the descriptor with `id: 'forms'`, `label`, `icon`, etc.)
 * stays in `forms.js` / `leaves.js`; this barrel exposes only the
 * components.
 *
 * @module integrations/builtin/forms
 *
 * @spec openspec/changes/integration-forms/specs/integrations/forms/spec.md
 */

import CnFormCreate from './CnFormCreate.vue'
import CnFormPicker from './CnFormPicker.vue'
import CnFormsCard from './CnFormsCard.vue'
import CnFormsTab from './CnFormsTab.vue'

export { CnFormCreate, CnFormPicker, CnFormsCard, CnFormsTab }
export default { CnFormCreate, CnFormPicker, CnFormsCard, CnFormsTab }
