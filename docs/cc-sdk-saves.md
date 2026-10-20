# cc-sdk cloud saves contract (Phase 4, Slice A; Oct 19)

Games must call these defensively (window.cc may be missing outside the site). All return Promises.

- `cc.save(slot, data)`: writes localStorage immediately, then syncs to the account cloud when logged in. data = JSON-serializable, ≤512 KB per slot, max 5 slots per game. Throttle writes to ≤1 per 10s per slot (autosave every 30–60s plus on pause and pagehide).
- `cc.load(slot)`: resolves the newer of local and cloud (by updated_at), or null.
- `cc.saves()`: resolves [{slot, updated_at, bytes}].
- `cc.user()`: {id, name, level, avatar} or null (guest).
- `cc.onUser(fn)`: called on login and logout (re-load the save when a user logs in).

Guests keep localStorage saves. On login the site offers to move this device's saves to the account.
Fallback pattern for games:
```js
const S = window.cc && cc.save ? cc : null;
async function saveGame(d){ if (S) return S.save('main', d); try{ localStorage.setItem('mygame-save', JSON.stringify(d)); }catch(e){} }
async function loadGame(){ if (S) return S.load('main'); try{ return JSON.parse(localStorage.getItem('mygame-save')); }catch(e){ return null; } }
```
smol brains v2 (branch game/smol-brains-3d) must use this for its main save.
