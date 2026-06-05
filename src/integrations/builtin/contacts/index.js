/**
 * SPDX-License-Identifier: EUPL-1.2
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 *
 * Bespoke Vue components for the `contacts` integration leaf.
 *
 * Re-exports the bespoke tab + card so the cross-repo coordinator
 * (which owns `src/integrations/builtin/leaves.js`) can repoint the
 * `contacts` entry from the generic `CnIntegrationTab` / `CnIntegrationCard`
 * shells at these vCard-aware components.
 *
 * Per AD-11/AD-13 of `pluggable-integration-registry`, the registration
 * itself (the descriptor with `id: 'contacts'`, `label`, `icon`, etc.)
 * stays in `leaves.js`; this barrel exposes only the components.
 *
 * @module integrations/builtin/contacts
 *
 * @spec openspec/changes/integration-contacts/specs/integrations/contacts/spec.md
 */

import CnContactsTab from './CnContactsTab.vue'
import CnContactsCard from './CnContactsCard.vue'

export { CnContactsTab, CnContactsCard }
export default { CnContactsTab, CnContactsCard }
