// test-multisection-bug.cjs
// Isolates the triple-click selection bug in multi-section documents.
// Bug: triple-clicking an earlier paragraph extends the selection to the
// document end, so typed replacement text splits across paragraphs.

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const SCREENSHOT_DIR = path.join(__dirname, 'playwright-screenshots', 'multisection');
const BASE_URL = 'https://exquisite-piroshki-221a11.netlify.app';

async function run() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);

  // 1. Navigate to a known document
  await page.goto(`${BASE_URL}/doc/doc-eng-1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.tiptap.ProseMirror', { state: 'visible' });

  // 2. Clear the editor and type 4 plain paragraphs (no slash commands)
  const editor = page.locator('.tiptap.ProseMirror');
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(300);

  await page.keyboard.type('First paragraph text');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second paragraph text');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Third paragraph text');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Fourth paragraph text');
  await page.waitForTimeout(300);

  // 3. Screenshot: initial state
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '01-initial-content.png') });
  console.log('📸 01-initial-content.png saved');

  const initialParas = await page.locator('.tiptap.ProseMirror p').allTextContents();
  console.log('\n=== INITIAL PARAGRAPHS ===');
  initialParas.forEach((t, i) => console.log(`p[${i}]: "${t}"`));

  if (initialParas.length < 4) {
    console.error(`\n❌ Setup failed: expected 4 paragraphs, got ${initialParas.length}`);
    await browser.close();
    process.exit(1);
  }

  // 4. Triple-click the FIRST paragraph to select it
  // No cursor repositioning — let the bug manifest naturally.
  const firstPara = page.locator('.tiptap.ProseMirror p').nth(0);
  await firstPara.click({ clickCount: 3 });
  await page.waitForTimeout(200);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '02-after-selection.png') });
  console.log('📸 02-after-selection.png saved');

  // 5. Type replacement text
  // If the selection extended beyond p[0], typed text will land in the wrong place.
  await page.keyboard.type('REPLACED');
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(SCREENSHOT_DIR, '03-after-typing.png') });
  console.log('📸 03-after-typing.png saved');

  // 6. Read back all paragraph contents
  const paras = await page.locator('.tiptap.ProseMirror p').allTextContents();

  console.log('\n=== PARAGRAPH CONTENTS AFTER TYPING ===');
  paras.forEach((t, i) => console.log(`p[${i}]: "${t}"`));

  // 7. Assertions
  const expected = [
    ['REPLACED',             'p[0] === "REPLACED"'],
    ['Second paragraph text','p[1] === "Second paragraph text"'],
    ['Third paragraph text', 'p[2] === "Third paragraph text"'],
    ['Fourth paragraph text','p[3] === "Fourth paragraph text"'],
  ];

  console.log('\n=== ASSERTIONS ===');
  let pass = 0;
  expected.forEach(([val, label], idx) => {
    const actual = paras[idx] !== undefined ? paras[idx] : '(missing)';
    const ok = actual === val;
    if (ok) pass++;
    console.log(`${ok ? '✅' : '❌'} ${label}  →  got: "${actual}"`);
  });

  console.log(`\n=== RESULT: ${pass}/4 PASS ===`);

  if (pass === 4) {
    console.log('\n⚠️  All assertions PASSED — bug may not be reproducible in headless mode.');
    console.log('    Check screenshots to confirm paragraph layout was correct.');
  } else {
    console.log('\n🐛 Bug reproduced: selection extended beyond p[0], replacement text misfired.');
  }

  await browser.close();
}

run().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
