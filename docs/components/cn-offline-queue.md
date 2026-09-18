---
sidebar_position: 50
---

import GeneratedRef from './_generated/CnOfflineQueue.md'

# CnOfflineQueue

The work a device has captured and not yet handed over, as a list somebody can
read. Built for the `field-inspection` leaf, usable by anything that queues
mutations through the offline store.

## Why a list and not a count

The leaf renders a pending badge, and `countPending()` counts `pending`,
`conflict` and `syncing`.

An operation that exhausted its retries, or whose author lost the right to write
it, is `failed` — and `failed` is terminal for the replay loop. So it drops out
of that badge entirely while still sitting in the browser's IndexedDB. An
inspection somebody stood next to a citizen to record is then stranded on one
device with no reader anywhere, and nothing on any screen says so.

A queue that loses a submission is worse than one that refuses it at the door.
This component is what makes the stranded work visible.

## What happens to an entry that cannot be replayed

**It stays.** Nothing here deletes a queued operation: not on failure, not on
age, not to make a number smaller. The payload the inspector captured remains
exactly as captured.

**It is listed,** with what the server actually said, the number of attempts
made, and the time it was captured. A generic "could not sync" sends somebody to
a helpdesk that cannot see this device either.

**It is counted apart.** `countStuck()` is separate from `countPending()`,
because "12 waiting" and "12 waiting, 1 stuck" are different sentences and a
surface that adds them together says neither.

**It offers Try again,** which re-queues it by hand and starts the attempt count
over. Never automatically: an operation the server refused five times will be
refused a sixth, and a queue that retries forever is a queue that never drains.
Somebody who has fixed whatever the server was objecting to asks for the retry.

**Except when the right to write is gone.** A `permission_lost` entry offers no
retry and says why. Retrying cannot restore a permission, so offering the button
would be offering a gesture that fails every time. The entry still stays and is
still listed, because somebody who *does* hold the right needs to see it.

## Usage

```vue
<template>
  <CnOfflineQueue
    :deviceId="deviceId"
    @requeued="onRequeued" />
</template>

<script>
import { CnOfflineQueue } from '@conduction/nextcloud-vue'
import { resolveDeviceId } from '@conduction/nextcloud-vue'

export default {
  components: { CnOfflineQueue },
  data() {
    return { deviceId: resolveDeviceId() }
  },
  methods: {
    onRequeued(operationId) {
      // The drain will pick it up on its next pass.
    },
  },
}
</script>
```

Pass `deviceId`. Without it the list shows every device's queue in this browser
profile, which is only ever what a test wants.

## Accessibility

Every status is rendered as a **word** — Waiting, Sending, Needs a decision,
Stuck, Sent — and the colour only repeats it. This is the surface that tells
somebody their morning's work is stuck, so a coloured dot alone would leave that
unsaid for a reader who cannot see it (WCAG 2.2 SC 1.4.1).

<GeneratedRef />
