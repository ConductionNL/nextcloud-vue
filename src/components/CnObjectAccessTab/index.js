/**
 * SPDX-FileCopyrightText: 2026 Conduction B.V.
 * SPDX-License-Identifier: EUPL-1.2
 *
 * CnObjectAccessTab — the detail-page "Shares" tab for OpenRegister's per-object
 * grant primitive: an object's scope (`private` / `organisation`) plus the
 * users, groups, email invitations and public links granted on it.
 *
 * Distinct from CnShareCreate, which mints a share on a FILE inside the
 * object's folder for the `shares` integration leaf. This tab shares the
 * OBJECT, which is a share on its FOLDER — OpenRegister deliberately does not
 * treat a file share as an object grant, so attaching a document to an object
 * never hands over the object's data.
 */

import CnObjectAccessTab from './CnObjectAccessTab.vue'

export { CnObjectAccessTab }
export default CnObjectAccessTab
