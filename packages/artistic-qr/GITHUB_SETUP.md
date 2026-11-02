# Separate repository

This directory contains only the artistic-qr library, demo, build scripts and tests.
It does not depend on Svelte or the QR Gen Me server.

```sh
npm install
npm run build
npm test
npm pack --dry-run
```

Create an empty GitHub repository named artistic-qr, then run here:

```sh
git init -b main
git add .
git commit -m "Initial artistic-qr library"
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Set the package.json repository and homepage fields to the real repository URL
before publishing. Source is tracked; dist, node_modules and tarballs are ignored.
No GitHub repository or npm release has been created automatically.
