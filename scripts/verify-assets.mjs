import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const manifest = JSON.parse(readFileSync(new URL('../public/asset-manifest.json', import.meta.url)));
const pkg = JSON.parse(readFileSync(new URL('../node_modules/@mediapipe/tasks-vision/package.json', import.meta.url)));
assert.equal(pkg.version, manifest.runtimeVersion, 'Installed MediaPipe differs from vendored runtime');
for (const asset of manifest.assets) {
  const data = readFileSync(new URL(`../public/${asset.path}`, import.meta.url));
  assert.equal(createHash('sha256').update(data).digest('hex'), asset.sha256, `Asset changed: ${asset.path}`);
  assert.equal(data.length, asset.bytes);
  if (asset.path.includes('/wasm/')) {
    const original = readFileSync(new URL(`../node_modules/@mediapipe/tasks-vision/wasm/${asset.path.split('/').at(-1)}`, import.meta.url));
    assert.ok(data.equals(original), `WASM/runtime must match the installed JS package: ${asset.path}`);
  }
}
console.log(`Verified ${manifest.assets.length} pinned model/runtime assets; tasks-vision ${pkg.version}.`);
