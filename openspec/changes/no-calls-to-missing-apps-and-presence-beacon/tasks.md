## 1. AI companion

- [x] 1.1 `runHealthProbe` returns without a request when `isAppInstalled(chatAppId)` is false
- [x] 1.2 Test: backend not in `OC.appswebroots` means no `axios.get` and no button (fails on the old code)

## 2. Presence beacon

- [x] 2.1 `beaconDepart` sends a `FormData` body with `requesttoken`
- [x] 2.2 Test: the beacon url is `.../presence?_method=DELETE` and its body carries the token (fails on the old code)
