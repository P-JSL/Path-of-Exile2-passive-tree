#!/usr/bin/env bash
set -euo pipefail
# Pin the browser bridge and its PoB git submodule as a single compatible pair.
PIN=ee33ce63920f23e634cc30e37d8ad339244dbf34
ROOT="$(pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git init -q "$TMP"
git -C "$TMP" remote add origin https://github.com/krauthaufen/pob-web.git
git -C "$TMP" fetch --depth=1 origin "$PIN"
git -C "$TMP" checkout --detach FETCH_HEAD
test "$(git -C "$TMP" rev-parse HEAD)" = "$PIN"
git -C "$TMP" submodule update --init --depth 1 vendor/PathOfBuilding-PoE2
cd "$TMP"
node packages/lua-wasm/scripts/download-lua.mjs
node packages/lua-wasm/scripts/build.mjs
node packages/pob-data/bundle-lua.mjs
OUT="$ROOT/pob-engine/$PIN"
mkdir -p "$OUT/wasm" "$OUT/data"
cp packages/lua-wasm/dist/lua.{mjs,wasm} "$OUT/wasm/"
cp packages/web/public/data/pob-lua.json "$OUT/data/"
# Keep URLs relative to the deployed worker (GitHub Pages project subpath).
node --input-type=module - <<'JS'
import {readFileSync,writeFileSync} from 'node:fs';
const path='packages/web/src/worker/calc-worker.ts';
let s=readFileSync(path,'utf8');
function replaceOnce(before,after) {
  if(s.split(before).length !== 2) throw Error('Upstream bridge changed: '+before);
  s=s.replace(before,after);
}
replaceOnce('fetch("/data/pob-lua.json")','fetch(new URL("./data/pob-lua.json", import.meta.url))');
replaceOnce('import("../../wasm/lua.mjs")','import("./wasm/lua.mjs")');
replaceOnce('return "/wasm/lua.wasm";','return new URL("./wasm/lua.wasm", import.meta.url).href;');
replaceOnce('local frameOk, frameErr = pcall(runCallback, "OnFrame")','local frameOk, frameErr = pcall(runCallback, "OnFrame")\n  if not frameOk then return dkjson.encode({ error = tostring(frameErr) }) end');
replaceOnce('print("BuildModList after config change (non-fatal): " .. tostring(modErr))','return dkjson.encode({ error = tostring(modErr) })');
replaceOnce('print("OnFrame after config change (non-fatal): " .. tostring(err))','return dkjson.encode({ error = tostring(err) })');
replaceOnce('print("OnFrame after skill switch (non-fatal): " .. tostring(err))','return dkjson.encode({ error = tostring(err) })');
writeFileSync(path,s);
JS
npm exec --yes --package=esbuild@0.25.12 -- esbuild packages/web/src/worker/calc-worker.ts --bundle --format=esm --target=es2020 --external:./wasm/lua.mjs --outfile="$OUT/worker.js"
cp LICENSE "$OUT/LICENSE-pob-web"
cp example "$ROOT/.pob-smoke-example"
find vendor/PathOfBuilding-PoE2 -maxdepth 1 -iname 'license*' -type f -exec cp {} "$OUT/" \;
cp packages/lua-wasm/lua-5.2.4/doc/readme.html "$OUT/LICENSE-lua.html"
POB="$(git -C vendor/PathOfBuilding-PoE2 rev-parse HEAD)"
printf '{"bridge":"%s","pob":"%s"}\n' "$PIN" "$POB" > "$OUT/version.json"
test -s "$OUT/worker.js" && test -s "$OUT/wasm/lua.wasm" && test -s "$OUT/data/pob-lua.json"
