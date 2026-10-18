import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=new URL('../public/hairstyles/',import.meta.url);
const manifest=JSON.parse(await readFile(new URL('asset-manifest.json',root),'utf8'));
const credits=JSON.parse(await readFile(new URL('credits.json',root),'utf8'));
assert.equal(manifest.files.length,credits.records.length);
assert.ok(manifest.files.length>=12);
for(const file of manifest.files){
 assert.match(file.path,/^[a-z-]+\.png$/);const data=await readFile(new URL(file.path,root));
 assert.equal(data.length,file.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),file.sha256);
 assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 const record=credits.records.find(r=>r.image.url==='/hairstyles/'+file.path);
 assert.ok(record?.visualReview.accepted&&record.image.license.url&&record.image.generationRecord&&record.image.reviewedAt);
}
console.log(`Verified ${manifest.files.length} bundled reference PNGs, hashes and rights/review records.`);
const previews=JSON.parse(await readFile(new URL('preview-manifest.json',root),'utf8'));
assert.equal(previews.records.length,credits.records.length);
assert.equal(new Set(previews.records.map(p=>p.id)).size,credits.records.length);
for(const preview of previews.records){
 assert.match(preview.path,/^previews\/[a-z-]+\.webp$/);
 const source=credits.records.find(r=>r.id===preview.id);
 assert.equal(preview.source,source?.image.url);assert.ok(preview.modifications);
 const original=manifest.files.find(f=>'/hairstyles/'+f.path===preview.source);
 assert.equal(preview.sourceSha256,original?.sha256);
 assert.equal(preview.width,768);assert.equal(preview.height,768);
 const bytes=await readFile(new URL(preview.path,root));
 assert.equal(bytes.length,preview.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),preview.sha256);
 assert.equal(bytes.subarray(0,4).toString(),'RIFF');assert.equal(bytes.subarray(8,12).toString(),'WEBP');
}
console.log(`Verified ${previews.records.length} WebP gallery derivatives and original-source associations.`);
