# CnBulkJobProgress

What a bulk act did, row by row: a sentence saying where the job is, a progress bar, one openable count per outcome with a paged list of the rows and the reason each one gave, and the commit, stop, retry and download buttons.

Skipped and refused stay separate on screen. Skipped means the act does not apply to the row; refused means the reader may not write it. Collapsing the two would hide a permission problem inside a business outcome.

## Two sources

- `source: 'openregister'` (the default) follows an OpenRegister bulk job. It re-reads `/apps/openregister/api/bulk-jobs/{id}` every `pollInterval` ms while the job runs, pages its members `pageSize` at a time (`/members?outcome=`), and commits, cancels and retries there. The host keeps the call that creates the job. Closing the page stops the reading, not the act.
- `source: 'local'` draws a run the host drives itself, such as a loop in the browser. The host passes `job` and `rows` and handles the `commit`, `cancel` and `retry` events. Nothing is fetched. A finished run offers a retry for the rows that failed or were not reached.

## Usage

```vue
<CnBulkJobProgress
  :job="job"
  :busy="starting"
  :labels="{ commit: t('myapp', 'Apply to {total} cases') }"
  @update:job="job = $event"
  @finished="reloadList" />
```

A run the host drives (keepiq's bulk dialogs):

```vue
<CnBulkJobProgress
  source="local"
  :job="{ state: running ? 'running' : 'completed', total, processed: done, counts }"
  :rows="report.map((r) => ({ id: r.secretId, label: nameFor(r.secretId), outcome: r.status === 'ok' ? 'applied' : r.status, reason: r.reason }))"
  :outcomes="['applied', 'failed', 'skipped']"
  :labels="{ retry: t('keepiq', 'Retry {count} failed') }"
  @cancel="store.cancel()"
  @retry="retryFailed" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `job` | Object | required | `{ id, state, processed, total, counts: { applied, skipped, refused, failed } }`. States: `previewed`, `running`, `cancelling`, `completed`, `failed`, `cancelled` |
| `busy` | Boolean | `false` | The host is mid-request; the buttons wait |
| `source` | String | `'openregister'` | `'openregister'` or `'local'` |
| `rows` | Array | `[]` | `local` only: `{ id, label?, outcome, reason? }` |
| `outcomes` | Array | all four | The outcomes offered, in order; a run that cannot refuse leaves `refused` out |
| `labels` | Object | `{}` | Templates replacing the library wording (see below) |
| `downloadUrl` | String | `''` | Where the report downloads from; defaults to the OpenRegister report of an `openregister` job, none for `local` |
| `pollInterval` | Number | `2000` | How often a running job is re-read, in ms |
| `pageSize` | Number | `25` | How many rows one page of an outcome list holds |

## Labels

Every string is a template; `{total}`, `{processed}` and `{count}` are filled in. The library says "items"; pass your own noun in your own translated words.

`statePreviewed`, `stateRunning`, `stateCancelling`, `stateCancelled`, `stateFailed`, `stateCompleted`, `countApplied`, `countSkipped`, `countRefused`, `countFailed` (with `{count}`), `empty`, `noReason`, `more`, `commit` (with `{total}`), `cancel`, `retry` (with `{count}`), `download`, `pollFailed`, `rowsFailed`, `moreFailed`, `commitFailed`, `cancelFailed`, `retryFailed`.

A failed commit, cancel or retry shows the server's own `error` sentence when it wrote one.

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:job` | job | The job as last read or as a commit, cancel or retry returned it |
| `finished` | job | The job reached a final state |
| `commit` / `cancel` / `retry` | none | `local` only: the host runs the act |

## Test ids

`bulk-job-progress`, `bulk-job-state`, `bulk-job-bar`, `bulk-job-count-<outcome>`, `bulk-job-rows`, `bulk-job-more`, `bulk-job-commit`, `bulk-job-cancel`, `bulk-job-retry`, `bulk-job-download`.
