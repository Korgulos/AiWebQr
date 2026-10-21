import assert from 'node:assert/strict';
import { createServer } from 'vite';
const server = await createServer({
	configFile: false,
	appType: 'custom',
	optimizeDeps: { noDiscovery: true, entries: [] },
	cacheDir: '/tmp/qr-content-test-cache',
	server: { middlewareMode: true, hmr: false, ws: false }
});
let checks = 0;
function check(name, test) {
	test();
	checks++;
	console.log(`PASS ${name}`);
}
try {
	const {
		buildQRContent: build,
		emptyContent,
		contrastRatio
	} = await server.ssrLoadModule('/src/lib/qr-content.ts');
	const data = (values) => ({ ...emptyContent(), ...values });
	check('website URLs normalize and reject executable schemes and embedded credentials', () => {
		assert.equal(
			build('url', data({ url: ' https://example.com/a?x=1 ' })),
			'https://example.com/a?x=1'
		);
		for (const url of [
			'javascript:alert(1)',
			'data:text/html,test',
			'https://name:pass@example.com',
			'example.com'
		])
			assert.throws(() => build('url', data({ url })));
	});
	check('text keeps line breaks and rejects whitespace-only messages', () => {
		assert.equal(build('text', data({ text: 'Hello\nQR world' })), 'Hello\nQR world');
		assert.throws(() => build('text', data({ text: '   ' })));
	});
	check('email encodes reserved query characters and line breaks as data', () => {
		const result = build(
			'email',
			data({
				email: 'hello@example.com',
				subject: 'A & B',
				message: 'Hello\nBcc: other@example.com'
			})
		);
		assert.equal(
			result,
			'mailto:hello@example.com?subject=A%20%26%20B&body=Hello%0ABcc%3A%20other%40example.com'
		);
		assert.throws(() => build('email', data({ email: 'hello@example.com?bcc=other@example.com' })));
	});
	check('phone and SMS use actionable scanner payloads', () => {
		assert.equal(build('phone', data({ phone: '+381 (60) 123-4567' })), 'tel:+381601234567');
		assert.equal(
			build('sms', data({ phone: '+381601234567', message: 'Meet at 10:30' })),
			'SMSTO:+381601234567:Meet at 10:30'
		);
		assert.throws(() => build('phone', data({ phone: 'call me' })));
	});
	check('Wi-Fi names and passwords escape delimiters and preserve meaningful spaces', () => {
		const result = build(
			'wifi',
			data({ ssid: 'Cafe;WiFi', password: ' a:b\\c,;" ', hidden: 'true' })
		);
		assert.equal(result, 'WIFI:T:WPA;S:Cafe\\;WiFi;P: a\\:b\\\\c\\,\\;\\" ;H:true;;');
		assert.equal(
			build('wifi', data({ ssid: 'Public', encryption: 'nopass', password: 'ignored' })),
			'WIFI:T:nopass;S:Public;H:false;;'
		);
		assert.throws(() => build('wifi', data({ ssid: 'Private', password: '' })));
	});
	check('vCard escapes injected fields and retains structured name and address', () => {
		const result = build(
			'vcard',
			data({
				firstName: 'Ana',
				lastName: 'Test;Family',
				organization: 'Acme\nTEL:12345',
				city: 'Belgrade',
				country: 'Serbia'
			})
		);
		assert.ok(result.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'));
		assert.ok(result.includes('N:Test\\;Family;Ana;;;\r\n'));
		assert.ok(result.includes('ORG:Acme\\nTEL:12345\r\n'));
		assert.ok(!result.includes('\r\nTEL:12345'));
		assert.ok(result.includes('ADR;TYPE=WORK:;;;Belgrade;;;Serbia'));
		assert.ok(result.endsWith('\r\nEND:VCARD'));
	});
	check('geographic boundaries accept zero and reject empty or out-of-range coordinates', () => {
		assert.equal(build('location', data({ latitude: '0', longitude: '0' })), 'geo:0,0');
		assert.equal(build('location', data({ latitude: '-90', longitude: '180' })), 'geo:-90,180');
		for (const values of [
			{ latitude: '', longitude: '0' },
			{ latitude: '91', longitude: '0' },
			{ latitude: '0', longitude: '-181' }
		])
			assert.throws(() => build('location', data(values)));
	});
	check('contrast warning distinguishes readable and matching colors', () => {
		assert.equal(contrastRatio('#000000', '#ffffff'), 21);
		assert.equal(contrastRatio('#ffffff', '#ffffff'), 1);
		assert.ok(contrastRatio('#4338ca', '#ffffff') > 4.5);
	});
	console.log(`${checks} QR content checks passed.`);
} finally {
	await server.close();
}
