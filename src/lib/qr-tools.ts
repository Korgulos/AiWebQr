import type { ContentType } from './qr-content';

type Tool = {
	slug: string;
	type: ContentType;
	label: string;
	title: string;
	description: string;
	intro: string;
	steps: string[];
	example: string;
	tips: string[];
	questions: { question: string; answer: string }[];
};
export const qrTools: Tool[] = [
	{
		slug: 'wifi-qr-code-generator',
		type: 'wifi',
		label: 'Wi-Fi QR code generator',
		title: 'Free WiFi QR Code Generator | QR Gen Me',
		description:
			'Create a WiFi QR code for your guest network. Enter your network name and password, customize the design, and download PNG or SVG without an account.',
		intro:
			'Let guests join your Wi-Fi by scanning a code instead of typing a password. Make a code for a café, holiday rental or your home guest network.',
		steps: [
			'Enter the exact network name (SSID), including capital letters and spaces.',
			'Choose the network security type, enter its password and indicate whether the network is hidden.',
			'Download your QR code and test it with a phone before displaying it.'
		],
		example:
			'For a café guest network named Cafe Guest, enter Cafe Guest as the SSID and use the actual guest password. Print the downloaded SVG on a table card after testing it at the café.',
		tips: [
			'Use a separate guest network rather than sharing access to your main network.',
			'The code contains the Wi-Fi password. Anyone with the image may be able to read it; display it only where you intend to share access.',
			'If you change the network name or password, generate and print a new code.'
		],
		questions: [
			{
				question: 'Does the Wi-Fi QR code expire?',
				answer:
					'The downloaded static code has no built-in expiration. It remains useful while the encoded network settings are correct and the network is available.'
			},
			{
				question: 'Will every phone connect automatically?',
				answer:
					'Wi-Fi QR support depends on the phone and camera app. A phone may ask for confirmation before joining. Test with the devices your guests use.'
			},
			{
				question: 'Can I use it for an enterprise Wi-Fi login?',
				answer:
					'This generator supports personal WPA networks, WEP and open networks. It does not encode enterprise usernames, certificates or captive-portal sign-in.'
			}
		]
	},
	{
		slug: 'vcard-qr-code-generator',
		type: 'vcard',
		label: 'vCard QR code generator',
		title: 'Free vCard QR Code Generator for Contacts | QR Gen Me',
		description:
			'Create a vCard QR code with your name, phone, email and company. Share contact details on a business card and download your QR code as PNG or SVG.',
		intro:
			'Share contact details on business cards, event badges and printed brochures. A vCard QR code lets a compatible phone read your details and offer to save a contact.',
		steps: [
			'Enter the contact name, then add the phone number, email and company details you want to share.',
			'Keep only useful fields. More text makes the QR pattern denser, so avoid unnecessary information.',
			'Download PNG or SVG, scan it and check every contact field before printing.'
		],
		example:
			'For a sample business card, use Alex Example, +381 60 123 4567 and alex@example.com. Replace these example details with your own, then check the imported name, phone and email on your phone.',
		tips: [
			'Use an international phone prefix so the number is useful to contacts abroad.',
			'Contact details are embedded in the image and can be read by anyone who has it. Include only information you want to share.',
			'Use SVG for a sharp printed code, leave empty space around it, and test the final printed size.'
		],
		questions: [
			{
				question: 'Does scanning save the contact immediately?',
				answer:
					'The phone or scanner decides how to handle a vCard. Usually the person reviews the details and confirms saving the contact.'
			},
			{
				question: 'Can I update a printed vCard QR code?',
				answer:
					'This static code stores the contact details directly. If the details change, create a new code and replace the printed copy.'
			},
			{
				question: 'Is this a hosted digital business card?',
				answer:
					'No. It encodes vCard contact data directly rather than creating a public profile page. Saving and displaying the fields depends on the receiving contact app.'
			}
		]
	},
	{
		slug: 'qr-code-with-logo',
		type: 'url',
		label: 'QR code with logo',
		title: 'Free QR Code Generator with Logo — PNG & SVG | QR Gen Me',
		description:
			'Make a custom QR code with your logo, colors and shapes. Upload a PNG, JPEG or WebP logo and download the finished QR code as PNG or SVG for free.',
		intro:
			'Create a QR code that fits your brand. Add your website link, upload a logo and adjust the colors while keeping the code easy to scan.',
		steps: [
			'Enter the website address or choose another content type in the generator.',
			'Upload a PNG, JPEG or WebP logo smaller than 2 MB in the logo section. Adjust its size and padding.',
			'Choose contrasting colors, download PNG or SVG, and test the finished image on multiple phones.'
		],
		example:
			'For a restaurant menu, enter the full HTTPS address of your menu page and upload your restaurant logo. Download SVG for a printed table card and scan a physical proof before printing the full batch.',
		tips: [
			'A logo covers part of the pattern. Keep it small, preserve the three corner markers and use clear space around the code.',
			'Dark code modules on a light background are a safer starting point than low-contrast or heavily decorated designs.',
			'A logo does not guarantee scan reliability. Test both the downloaded file and its final printed version.'
		],
		questions: [
			{
				question: 'Do I need an account to download a QR code with a logo?',
				answer: 'No. You can create and download a standard QR code with a logo without signing up.'
			},
			{
				question: 'Which logo files can I upload?',
				answer:
					'The generator accepts PNG, JPEG and WebP images smaller than 2 MB. A simple logo with a clear outline works best at small sizes.'
			},
			{
				question: 'Should I download PNG or SVG?',
				answer:
					'PNG is convenient for everyday sharing. SVG stays sharp when scaled for print. The logo itself is still a raster image, so use a sufficiently clear source image.'
			}
		]
	}
];
