import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateArtisticQR, artisticContrast, defaultArtisticStyle } from '../dist/index.js';

test('SSR import and clear browser-only error', async () => {
 await assert.rejects(generateArtisticQR({text:'hello'}), /requires a browser/);
});
test('contrast includes frame and marker center', () => {
 assert.equal(artisticContrast(defaultArtisticStyle).ratio, 21);
 assert.equal(artisticContrast({...defaultArtisticStyle, frameColor:'#eeeeee'}).recommended, false);
 assert.equal(artisticContrast({...defaultArtisticStyle, dark:'#ffffff', light:'#000000'}).darkOnLight, false);
});
test('worker lifecycle, cancellation, failures and Blob input', async () => {
 const original = globalThis.Worker;
 let latest;
 class FakeWorker {
  constructor(url) { this.url = url; latest = this; }
  postMessage(request) { this.request = request; }
  terminate() { this.terminated = true; }
 }
 globalThis.Worker = FakeWorker;
 try {
  const background = new Blob(['GIF89a'], {type:'image/gif'});
  const progress = [];
  const result = generateArtisticQR({text:'https://example.com', background, onProgress:m=>progress.push(m)});
  const worker = latest;
  assert.equal(worker.request.animated, true);
  assert.equal(worker.request.dotSize, 62.68);
  const source = worker.request.background;
  assert.equal(source, background);
  worker.onmessage({data:{progress:'frame 1'}});
  const output = new Blob(['result'], {type:'image/gif'});
  worker.onmessage({data:{blob:output}});
  assert.equal(await result, output);
  assert.deepEqual(progress, ['frame 1']);
  assert.equal(worker.terminated, true);

  const controller = new AbortController();
  const aborted = generateArtisticQR({text:'hello',signal:controller.signal});
  controller.abort();
  await assert.rejects(aborted, {name:'AbortError'});
  assert.equal(latest.terminated, true);
  const failed = generateArtisticQR({text:'hello'});
  latest.onmessage({data:{error:'bad GIF'}});
  await assert.rejects(failed, /bad GIF/);
  const timed = generateArtisticQR({text:'hello',timeoutMs:5});
  await assert.rejects(timed,/timed out/);
  assert.equal(latest.terminated,true);
  await assert.rejects(generateArtisticQR({text:'hello',scale:NaN}),/Scale/);
  await assert.rejects(generateArtisticQR({text:'hello',style:{dark:'red'}}),/hexadecimal/);
 } finally { globalThis.Worker = original; }
});
