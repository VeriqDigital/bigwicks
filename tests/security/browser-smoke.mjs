import { firefox } from '@playwright/test';
// No application or remote navigation; isolate browser startup from app failures.
const browser = await firefox.launch({ headless: true, proxy: { server: 'http://127.0.0.1:9', bypass: 'localhost,127.0.0.1' } });
try {
  const context = await browser.newContext();
  await context.route('**/*', route => route.abort());
  const page = await context.newPage();
  console.log(`Firefox blank-page smoke: ${page.url()}`);
} finally { await browser.close(); }
