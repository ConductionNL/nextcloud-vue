/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnJourneyDialog — loaded on demand, like CnJourney.
 */

import { defineAsyncComponent } from 'vue'

export const CnJourneyDialog = defineAsyncComponent(() => import('./CnJourneyDialog.vue').then((m) => m.default || m))
export default CnJourneyDialog
