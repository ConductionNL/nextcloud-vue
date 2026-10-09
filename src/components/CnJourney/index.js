/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnJourney — loaded on demand, so a page that renders no journey does not
 * transfer its code (journey-runtime, task 5).
 */

import { defineAsyncComponent } from 'vue'

export const CnJourney = defineAsyncComponent(() => import('./CnJourney.vue').then((m) => m.default || m))
export default CnJourney
