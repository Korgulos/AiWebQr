import assert from 'node:assert/strict';
import vm from 'node:vm';
import { build } from 'esbuild';
import qrcode from 'qrcode-generator';

// Exercise the actual worker renderer with short and dense payloads.
const bundle = await build({
	entryPoints: ['src/lib/client/artistic-qr.worker.ts'],
	bundle: true,
	write: false,
	format: 'iife'
});
for (const length of [20, 500, 1200]) {
	const arcs = [];
	const rectangles = [];
	const context = {
		fillRect: (...args) => rectangles.push(args),
		drawImage() {},
		beginPath() {},
		arc: (...args) => arcs.push(args),
		fill() {},
		roundRect() {}
	};
	let result;
	const self = { postMessage: (message) => (result = message) };
	vm.runInNewContext(bundle.outputFiles[0].text, {
		self,
		OffscreenCanvas: class {
			getContext() {
				return context;
			}
			async convertToBlob() {
				return new Blob();
			}
		},
		createImageBitmap: async () => ({ width: 100, height: 100, close() {} }),
		fetch: async () => ({ blob: async () => new Blob() }),
		Blob
	});
	const text = 'x'.repeat(length);
	await self.onmessage({
		data: { text, scale: 10, dotSize: 62.68, background: 'test', animated: false }
	});
	assert.ok(result.blob, result.error);
	const qr = qrcode(0, 'H');
	qr.addData(text, 'Byte');
	qr.make();
	const count = qr.getModuleCount();
	assert.equal(
		arcs.length,
		count * count - 3 * 8 * 8,
		'Every module outside the finders must be circular'
	);
	assert.equal(rectangles.length, 1, 'Only the background can use fillRect');
	if (count >= 45) {
		for (let row = 0; row < 6; row++) {
			for (let column = count - 11; column <= count - 9; column++) {
				for (const [x, y] of [
					[column, row],
					[row, column]
				]) {
					const dot = arcs.find((arc) => arc[0] === (x + 4.5) * 10 && arc[1] === (y + 4.5) * 10);
					assert.ok(dot, 'Version information must be rendered');
					const width = qr.isDark(y, x) ? 7 : 5;
					assert.equal(
						dot[2],
						((width / 2) * 62.68) / 100,
						'Version dots must use the selected size'
					);
				}
			}
		}
	}
	assert.ok(
		arcs.some((arc) => arc[2] === 5),
		'Structural circles retain full module diameter'
	);
	assert.ok(
		arcs.some((arc) => arc[2] < 5),
		'Data dots retain their selected size'
	);
	console.log(`PASS circular modules: ${length} characters, version ${(count - 17) / 4}`);
}
