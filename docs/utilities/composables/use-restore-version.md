# useRestoreVersion

Restore a record to the state after one audit-trail entry, through OpenRegister's revert route (`POST /apps/openregister/api/objects/{register}/{schema}/{id}/revert` with `{ auditTrailId }`). OpenRegister saves the restore as a new version, so nothing is lost. Backs the restore button of [`CnAuditTrailTab`](../../components/cn-object-sidebar.md#restoring-a-version).

```js
import { useRestoreVersion } from '@conduction/nextcloud-vue'

const { restore } = useRestoreVersion({ apiBase: '/apps/openregister/api' })
const result = await restore({ register: 'permits', schema: 'permit', objectId, auditTrailId: 42 })
// result: { ok, status, record, message }
```

`message` is a fixed sentence, never the server's own text:

| Outcome | Message |
|---------|---------|
| 200 | (empty, `record` holds the restored record) |
| 403 | You cannot restore this record. |
| 423 | This record is locked by \{name\}. (or "…by someone else." without a holder) |
| 404 | This record no longer exists. |
| anything else, or a network failure | The record could not be restored. |

Pass `object` (the record as the page holds it) so a 423 can name the lock holder through `lockHolder()`.
