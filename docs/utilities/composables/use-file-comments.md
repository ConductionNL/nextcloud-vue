# useFileComments

Read, add and delete the Nextcloud comments of one file through the comments DAV endpoint (`/remote.php/dav/comments/files/{fileId}`), the calls the Files sidebar's comments tab makes. Backs the `fileId` source of [`CnNotesCard`](../../components/cn-notes-card.md); use it alone to show a comment count on a list row.

## Signature

```js
import { useFileComments } from '@conduction/nextcloud-vue'

const comments = useFileComments(fileId)
const notes = await comments.list({ limit: 20, offset: 0 })
await comments.add('Check with finance before assigning')
await comments.remove(notes[0].id)
const n = await comments.count()
```

| Function | Description |
|----------|-------------|
| `list({ limit, offset })` | `REPORT` with an `oc:filter-comments` body. Returns `{ id, message, actorId, actorDisplayName, creationDateTime, isUnread, isOwn }` per comment (the shared note shape). |
| `add(message)` | `POST` of `{ actorType: 'users', verb: 'comment', message }`. |
| `remove(commentId)` | `DELETE` of one comment; Nextcloud only allows your own. |
| `count()` | The number of comments (a `list`). A host listing many files should ask for `oc:comments-count` in its own `PROPFIND` instead. |

Every call rejects with an error carrying the HTTP `status` when Nextcloud refuses (403 or 404 when the user cannot reach the file). `fileId` may be a number, a string or a ref.
