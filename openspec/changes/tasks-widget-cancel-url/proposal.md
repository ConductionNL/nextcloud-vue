# Cancel can post to the app's own route

## Why

dossiq cancels a case task through its own route (`POST /api/case-tasks/{id}/cancel`), which answers a refusal with the engine's reason. CnTasksWidget could send Complete to an app route (`completeUrl`) but always sent Cancel to the engine's flow-tasks route.

## What changes

- CnTasksWidget `content.cancelUrl` (`{id}` is the task uuid) sends Cancel to that route, as `completeUrl` does for Complete. Without it Cancel posts to the flow-tasks route as before.
