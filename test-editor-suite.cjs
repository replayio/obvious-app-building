// test-editor-suite.cjs
// Scenario-based Playwright test suite for the TipTap rich-text editor.
// Each scenario is a narrative user story covering multiple slash commands,
// keyboard navigation, and content assertions.

'use strict';
const { chromium } = require('playwright');
const { spawn }    = require('child_process');
const path         = require('path');
const fs           = require('fs');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EDITOR       = '.tiptap.ProseMirror';
const SCREENSHOT_DIR = path.join(__dirname, 'playwright-screenshots', 'suite');
const PROJECT_ROOT = __dirname;

/** Accumulated results for the final table. */
const results = [];

// ---------------------------------------------------------------------------
// Server helpers
// ---------------------------------------------------------------------------

/** Start vite preview and resolve with { server, baseUrl } when ready. */
function startPreviewServer() {
  return new Promise((resolve, reject) => {
    const server = spawn('npm', ['run', 'preview'], {
      cwd: PROJECT_ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
    });

    let settled = false;
    const done = (err, result) => {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(result);
    };

    let buf = '';
    server.stdout.on('data', (d) => {
      buf += d.toString();
      const m = buf.match(/Local:\s+(http:\/\/localhost:\d+)/);
      if (m) done(null, { server, baseUrl: m[1] });
    });
    server.stderr.on('data', (d) => process.stderr.write(d));
    server.on('error', (err) => done(err));
    server.on('exit', (code) => {
      if (!settled) done(new Error('Preview server exited with code ' + code));
    });
    setTimeout(() => done(new Error('Preview server did not start within 30s')), 30000);
  });
}

// ---------------------------------------------------------------------------
// Scenario runner
// ---------------------------------------------------------------------------

/**
 * Run a single scenario in a fresh BrowserContext.
 * Captures a screenshot after every scenario (pass or fail).
 */
async function runScenario(browser, baseUrl, id, name, fn) {
  const label = 'S' + id;
  console.log('  \u23f3  ' + label + ': ' + name);
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page    = await context.newPage();
  page.setDefaultTimeout(10000);

  await page.goto(baseUrl + '/doc/doc-eng-1', { waitUntil: 'networkidle' });
  await page.waitForSelector(EDITOR, { state: 'visible' });
  await clearEditor(page);

  let status = 'PASS';
  let notes  = '';
  try {
    await fn(page);
    console.log('  \u2705  ' + label + ' PASS: ' + name);
  } catch (e) {
    status = 'FAIL';
    notes  = e.message.split('\n')[0];
    console.log('  \u274c  ' + label + ' FAIL: ' + name + '\n       ' + notes);
    const failShot = path.join(SCREENSHOT_DIR, label + '-fail.png');
    await page.screenshot({ path: failShot }).catch(() => {});
  }

  const shotPath = path.join(SCREENSHOT_DIR, label + '-' + name.replace(/[^a-z0-9]/gi, '-').toLowerCase() + '.png');
  await page.screenshot({ path: shotPath }).catch(() => {});

  results.push({ id, name, status, notes });
  await context.close();
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

/** Clear the editor with Ctrl+A then Delete. */
async function clearEditor(page) {
  const editor = page.locator(EDITOR);
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Delete');
  await page.waitForTimeout(200);
}

/**
 * Type a slash command query, wait for the popup, then click the item
 * whose text includes itemLabel.
 */
async function slashCmd(page, query, itemLabel) {
  await page.keyboard.type(query, { delay: 30 });
  await page.waitForSelector('[data-tippy-root] button, .tippy-box button', { state: 'visible' });
  const btn = page.locator('[data-tippy-root] button, .tippy-box button').filter({ hasText: itemLabel }).first();
  await btn.waitFor({ state: 'visible' });
  await btn.click();
  await page.waitForTimeout(300);
}

/** Read the editor visible text content. */
async function editorText(page) {
  return page.evaluate(function(sel) { return document.querySelector(sel).innerText; }, EDITOR);
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

/**
 * S1: Write a structured document
 * Covers: /heading2
 */
async function scenario1(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('My Document Title', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Introduction', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('This is the intro paragraph. It covers the basics.', { delay: 25 });

  await page.keyboard.press('Enter');
  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Details', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Here are the details.', { delay: 25 });

  // Navigate back up to the Introduction paragraph
  for (var i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('End');
  await page.keyboard.type(' Extra content added.', { delay: 25 });

  await page.waitForTimeout(400);
  const text = await editorText(page);

  if (!text.includes('Introduction'))
    throw new Error('Introduction heading missing. Got: ' + text);
  if (!text.includes('This is the intro paragraph. It covers the basics. Extra content added.'))
    throw new Error('Intro paragraph missing appended text. Got: ' + text);
  if (!text.includes('Details'))
    throw new Error('Details heading missing. Got: ' + text);
  if (!text.includes('Here are the details.'))
    throw new Error('Details paragraph missing. Got: ' + text);
}

/**
 * S2: Build a list document
 * Covers: /bullet
 */
async function scenario2(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Shopping List', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Bullet', 'Bullet List');
  await page.keyboard.type('Apples', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Bananas', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Cherries', { delay: 25 });

  // Go back to Bananas, clear it, type Blueberries
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Delete');
  await page.keyboard.type('Blueberries', { delay: 25 });

  // Go to Cherries and add Dates after it
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Dates', { delay: 25 });

  await page.waitForTimeout(400);
  const text = await editorText(page);

  if (!text.includes('Apples'))      throw new Error('Apples missing');
  if (!text.includes('Blueberries')) throw new Error('Bananas should have been replaced');
  if (text.includes('Bananas'))      throw new Error('Bananas still present after replacement');
  if (!text.includes('Cherries'))    throw new Error('Cherries missing');
  if (!text.includes('Dates'))       throw new Error('Dates missing');

  const items = await page.evaluate(function(sel) {
    return Array.from(document.querySelectorAll(sel + ' ul li')).map(function(li) { return li.innerText.trim(); });
  }, EDITOR);
  const expected = ['Apples', 'Blueberries', 'Cherries', 'Dates'];
  for (var i = 0; i < expected.length; i++) {
    if (!items[i] || !items[i].includes(expected[i]))
      throw new Error('List item ' + (i+1) + ': expected "' + expected[i] + '", got "' + items[i] + '"');
  }
}

/**
 * S3: Mixed content — headings, todo, divider, numbered list
 * Covers: /heading1, /to-do, /divider, /numbered
 */
async function scenario3(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 1');
  await page.keyboard.type('Project Plan', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/To-do', 'To-do List');
  await page.keyboard.type('Research phase', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Design phase', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Build phase', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Divider', 'Divider');
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Numbered', 'Numbered List');
  await page.keyboard.type('Step one', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Step two', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Step three', { delay: 25 });

  // Navigate up to Design phase todo (5 ArrowUps)
  for (var i = 0; i < 5; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Delete');
  await page.keyboard.type('Design & prototype phase', { delay: 25 });

  await page.waitForTimeout(400);

  const h1Count = await page.locator(EDITOR + ' h1').count();
  if (h1Count === 0) throw new Error('h1 not found');

  const checkboxCount = await page.locator(EDITOR + ' input[type="checkbox"], ' + EDITOR + ' [data-type="taskItem"]').count();
  if (checkboxCount < 3) throw new Error('Expected 3 todo items, got ' + checkboxCount);

  const hrCount = await page.locator(EDITOR + ' hr').count();
  if (hrCount === 0) throw new Error('Divider (hr) not found');

  const liCount = await page.locator(EDITOR + ' ol li').count();
  if (liCount < 3) throw new Error('numbered ' + liCount + ' missing');

  const text = await editorText(page);
  if (!text.includes('Design & prototype phase'))
    throw new Error('Edited todo item missing. Got: ' + text);
}

/**
 * S4: Code and quote blocks
 * Covers: /code, /quote
 */
async function scenario4(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Technical Notes', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Code', 'Code Block');
  await page.waitForTimeout(300);

  // Click inside code block to ensure focus
  const codeBlock = page.locator(EDITOR + ' pre').first();
  await codeBlock.click();
  await page.keyboard.type('const x = 42;', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type("function hello() { return 'world'; }", { delay: 25 });

  // Exit code block
  await page.keyboard.press('Escape');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Quote', 'Quote');
  await page.keyboard.type('The best code is no code at all.', { delay: 25 });

  // Go back into code block for a third line
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('const y = x * 2;', { delay: 25 });

  await page.waitForTimeout(400);

  const codeContent = await page.evaluate(function(sel) {
    var pre = document.querySelector(sel + ' pre');
    return pre ? pre.innerText : '';
  }, EDITOR);
  if (!codeContent.includes('const x = 42;'))
    throw new Error('Code line 1 missing. code block: ' + codeContent);
  if (!codeContent.includes('hello'))
    throw new Error('Code line 2 missing. code block: ' + codeContent);
  if (!codeContent.includes('const y = x * 2;'))
    throw new Error('Code line 3 missing. code block: ' + codeContent);

  const quoteContent = await page.evaluate(function(sel) {
    var bq = document.querySelector(sel + ' blockquote');
    return bq ? bq.innerText : '';
  }, EDITOR);
  if (!quoteContent.includes('The best code is no code at all.'))
    throw new Error('Blockquote missing expected text. Got: ' + quoteContent);
}

/**
 * S5: Table editing
 * Covers: /table
 */
async function scenario5(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Data Table', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Table', 'Table');
  await page.waitForTimeout(400);

  // Click first header cell explicitly before typing
  const firstTh = page.locator(EDITOR + ' th').first();
  await firstTh.scrollIntoViewIfNeeded();
  await firstTh.click();
  await page.waitForTimeout(200);

  // Use insertText for reliable TipTap cell input in headless mode
  await page.keyboard.insertText('Name');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Score');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Grade');
  await page.keyboard.press('Tab');

  await page.keyboard.insertText('Alice');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('95');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('A');
  await page.keyboard.press('Tab');

  await page.keyboard.insertText('Bob');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('82');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('B');

  // Click Alice Score cell (td index 1) and update to 97
  const scoreTd = page.locator(EDITOR + ' td').nth(1);
  await scoreTd.scrollIntoViewIfNeeded();
  await scoreTd.click();
  await page.waitForTimeout(200);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.insertText('97');

  await page.waitForTimeout(400);

  const headers = await page.evaluate(function(sel) {
    return Array.from(document.querySelectorAll(sel + ' th')).map(function(c) { return c.textContent.trim(); });
  }, EDITOR);
  if (!headers.some(function(h) { return h.includes('Name'); }))  throw new Error('Header "Name" missing. Got: ' + headers);
  if (!headers.some(function(h) { return h.includes('Score'); })) throw new Error('Header "Score" missing. Got: ' + headers);
  if (!headers.some(function(h) { return h.includes('Grade'); })) throw new Error('Header "Grade" missing. Got: ' + headers);

  const cells = await page.evaluate(function(sel) {
    return Array.from(document.querySelectorAll(sel + ' td')).map(function(c) { return c.textContent.trim(); });
  }, EDITOR);
  const flat = cells.join(' ');
  if (!flat.includes('Alice')) throw new Error('"Alice" missing from table. cells: ' + flat);
  if (!flat.includes('97'))    throw new Error('Updated score "97" missing. cells: ' + flat);
  if (!flat.includes('Bob'))   throw new Error('"Bob" missing from table. cells: ' + flat);
  if (!flat.includes('82'))    throw new Error('"82" missing from table. cells: ' + flat);
}

/**
 * S6: YouTube and image embeds
 * Covers: /youtube, /image
 */
async function scenario6(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Media Gallery', { delay: 25 });
  await page.keyboard.press('Enter');

  // Override window.prompt for YouTube URL
  await page.evaluate(function() {
    window._pendingPromptAnswer = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
    window.prompt = function(msg, def) {
      var ans = window._pendingPromptAnswer || def;
      window._pendingPromptAnswer = null;
      return ans;
    };
  });
  await slashCmd(page, '/YouTube', 'YouTube');
  await page.waitForTimeout(800);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Above is a video.', { delay: 25 });
  await page.keyboard.press('Enter');

  // Override window.prompt for image URL
  await page.evaluate(function() {
    window._pendingPromptAnswer = 'https://placekitten.com/400/300';
    window.prompt = function(msg, def) {
      var ans = window._pendingPromptAnswer || def;
      window._pendingPromptAnswer = null;
      return ans;
    };
  });
  await slashCmd(page, '/Image', 'Image');
  await page.waitForTimeout(800);

  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Above is an image.', { delay: 25 });

  await page.waitForTimeout(400);

  const text = await editorText(page);
  if (!text.includes('Above is a video.'))  throw new Error('Video caption missing');
  if (!text.includes('Above is an image.')) throw new Error('Image caption missing');

  const iframeCount = await page.evaluate(function(sel) {
    return Array.from(document.querySelectorAll(sel + ' iframe'))
      .filter(function(f) { return f.src && f.src.includes('youtube'); }).length;
  }, EDITOR);
  if (iframeCount === 0) throw new Error('YouTube iframe not found in editor');

  const imgCount = await page.locator(EDITOR + ' img').count();
  if (imgCount === 0) throw new Error('Image tag not found in editor');
}

/**
 * S7: Callout and heading hierarchy
 * Covers: /heading1, /heading2, /heading3, /callout
 */
async function scenario7(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 1');
  await page.keyboard.type('Overview', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Callout', 'Callout');
  await page.keyboard.type('This is important information.', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Section A', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Content for section A.', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 3');
  await page.keyboard.type('Subsection A1', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Detailed content here.', { delay: 25 });

  // Navigate up to callout text
  for (var i = 0; i < 5; i++) await page.keyboard.press('ArrowUp');
  await page.keyboard.press('End');
  await page.keyboard.type(' Remember this.', { delay: 25 });

  await page.waitForTimeout(400);

  const h1 = await page.locator(EDITOR + ' h1').count();
  const h2 = await page.locator(EDITOR + ' h2').count();
  const h3 = await page.locator(EDITOR + ' h3').count();
  if (h1 === 0) throw new Error('h1 not found');
  if (h2 === 0) throw new Error('h2 not found');
  if (h3 === 0) throw new Error('h3 not found');

  const h1Text = await page.locator(EDITOR + ' h1').first().innerText();
  if (!h1Text.includes('Overview')) throw new Error('h1 text wrong: ' + h1Text);

  const h2Text = await page.locator(EDITOR + ' h2').first().innerText();
  if (!h2Text.includes('Section A')) throw new Error('h2 text wrong: ' + h2Text);

  const h3Text = await page.locator(EDITOR + ' h3').first().innerText();
  if (!h3Text.includes('Subsection A1')) throw new Error('h3 text wrong: ' + h3Text);

  const text = await editorText(page);
  if (!text.includes('This is important information. Remember this.'))
    throw new Error('Callout text wrong. Got: ' + text);
}

/**
 * S8: Delete and rewrite
 * Tests ArrowUp + Home + Shift+End + Delete + retype.
 */
async function scenario8(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Draft content', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('This line will be deleted.', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('This line stays.', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('This also gets deleted.', { delay: 25 });

  // Navigate up to second line
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Delete');
  await page.keyboard.type('This is the replacement line.', { delay: 25 });

  // Navigate down to fourth line
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Delete');
  await page.keyboard.type('Also replaced.', { delay: 25 });

  await page.waitForTimeout(400);
  const text = await editorText(page);
  const lines = text.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);

  if (!text.includes('Draft content'))
    throw new Error('Paragraph 1 "Draft content" missing');
  if (!text.includes('This is the replacement line.'))
    throw new Error('Replacement line missing');
  if (text.includes('This line will be deleted.'))
    throw new Error('Original deleted line still present');
  if (!text.includes('This line stays.'))
    throw new Error('"This line stays." was unexpectedly deleted');
  if (!text.includes('Also replaced.'))
    throw new Error('"Also replaced." missing');
  if (text.includes('This also gets deleted.'))
    throw new Error('Second deleted line still present');

  const p1i = lines.findIndex(function(l) { return l.includes('Draft content'); });
  const p2i = lines.findIndex(function(l) { return l.includes('This is the replacement line.'); });
  const p3i = lines.findIndex(function(l) { return l.includes('This line stays.'); });
  const p4i = lines.findIndex(function(l) { return l.includes('Also replaced.'); });
  if (!(p1i < p2i)) throw new Error('Order wrong: p1(' + p1i + ') before p2(' + p2i + ')');
  if (!(p3i < p4i)) throw new Error('Order wrong: p3(' + p3i + ') before p4(' + p4i + ')');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  console.log('\u{1F680} Starting vite preview server...');
  const { server, baseUrl } = await startPreviewServer();
  console.log('\u2705 Preview server ready at ' + baseUrl + '\n');

  const browser = await chromium.launch({ headless: true });

  try {
    console.log('\n=== Running 8 editor scenarios ===\n');
    await runScenario(browser, baseUrl, 1, 'Write a structured document',                       scenario1);
    await runScenario(browser, baseUrl, 2, 'Build a list document',                             scenario2);
    await runScenario(browser, baseUrl, 3, 'Mixed content -- headings, todo, divider, numbered', scenario3);
    await runScenario(browser, baseUrl, 4, 'Code and quote blocks',                             scenario4);
    await runScenario(browser, baseUrl, 5, 'Table editing',                                     scenario5);
    await runScenario(browser, baseUrl, 6, 'YouTube and image embeds',                          scenario6);
    await runScenario(browser, baseUrl, 7, 'Callout and heading hierarchy',                     scenario7);
    await runScenario(browser, baseUrl, 8, 'Delete and rewrite',                                scenario8);
  } finally {
    await browser.close();
    console.log('\u{1F6D1} Stopping preview server...');
    try { process.kill(-server.pid, 'SIGTERM'); } catch (_) { server.kill(); }
  }

  const passed = results.filter(function(r) { return r.status === 'PASS'; }).length;
  const total  = results.length;
  console.log('\n=== RESULTS ===');
  for (var i = 0; i < results.length; i++) {
    var r    = results[i];
    var icon = r.status === 'PASS' ? '\u2705' : '\u274c';
    var note = r.notes ? ' | ' + r.notes : '';
    console.log(icon + ' S' + r.id + ' ' + r.status + ': ' + r.name + note);
  }
  console.log('\n=== ' + passed + '/' + total + ' PASS ===');

  process.exit(passed === total ? 0 : 1);
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});

