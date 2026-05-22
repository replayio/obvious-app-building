// test-editor-suite.cjs
// 24-scenario Playwright test suite for the TipTap rich-text editor.
// Requirements:
//   - No arrow keys: cursor repositioning via mouse clicks only
//   - Each scenario in its own BrowserContext
//   - Screenshot per scenario to playwright-screenshots/suite/
//   - All 13 slash commands covered: /heading1, /heading2, /heading3,
//     /bullet, /numbered, /to-do, /quote, /code, /divider, /table,
//     /youtube, /image, /callout

'use strict';
const { chromium } = require('playwright');
const { spawn }    = require('child_process');
const path         = require('path');
const fs           = require('fs');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EDITOR         = '.tiptap.ProseMirror';
const SCREENSHOT_DIR = path.join(__dirname, 'playwright-screenshots', 'suite');
const PROJECT_ROOT   = __dirname;

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
  const label = 'S' + String(id).padStart(2, '0');
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
    notes  = (e.stack || e.message);
    console.log('  \u274c  ' + label + ' FAIL: ' + name + '\n       ' + notes);
    const failShot = path.join(SCREENSHOT_DIR, label + '-fail.png');
    await page.screenshot({ path: failShot }).catch(() => {});
  }

  const slug     = name.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
  const shotPath = path.join(SCREENSHOT_DIR, label + '-' + slug + '.png');
  await page.screenshot({ path: shotPath }).catch(() => {});

  results.push({ id, name, status, notes });
  await context.close();
}

// ---------------------------------------------------------------------------
// Page helpers
// ---------------------------------------------------------------------------

/** Clear the editor with Ctrl+A then Backspace. */
async function clearEditor(page) {
  const editor = page.locator(EDITOR);
  await editor.click();
  await page.waitForTimeout(150);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(200);
}

/**
 * Type a slash command query, wait for the popup, then click the matching
 * item. Uses exact regexp match first, falls back to hasText.
 */
async function slashCmd(page, query, itemLabel) {
  await page.keyboard.type(query, { delay: 30 });
  await page.waitForSelector('[data-tippy-root] button, .tippy-box button', {
    state: 'visible',
    timeout: 6000,
  });
  await page.waitForTimeout(150);
  const popup   = page.locator('[data-tippy-root] button, .tippy-box button');
  const exact   = popup.filter({ hasText: new RegExp('^' + itemLabel + '$') }).first();
  const hasText = popup.filter({ hasText: itemLabel }).first();
  const btn     = (await exact.count()) > 0 ? exact : hasText;
  await btn.waitFor({ state: 'visible', timeout: 6000 });
  await btn.click();
  await page.waitForTimeout(400); // allow TipTap to commit node insertion
}

/** Read the editor visible text content. */
async function editorText(page) {
  return page.evaluate(
    (sel) => document.querySelector(sel).innerText,
    EDITOR,
  );
}

/**
 * Click the centre of the element whose innerText contains `needle`.
 * Uses TreeWalker to find the text node, then getBoundingClientRect
 * on its parent element to compute the click coordinates.
 */
async function clickOnText(page, needle) {
  const found = await page.evaluate(
    ([sel, n]) => {
      const walker = document.createTreeWalker(
        document.querySelector(sel),
        NodeFilter.SHOW_TEXT,
      );
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.textContent.includes(n)) {
          const range = document.createRange();
          range.selectNodeContents(node.parentElement);
          const rect = range.getBoundingClientRect();
          return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        }
      }
      return null;
    },
    [EDITOR, needle],
  );
  if (!found) throw new Error('clickOnText: "' + needle + '" not found in editor');
  await page.mouse.click(found.x, found.y);
  await page.waitForTimeout(200);
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

// S01 — /heading2: two H2 sections, mouse repositioning to append text
async function scenario01(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('My Document Title', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Introduction', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('This is the intro paragraph.', { delay: 25 });

  await page.keyboard.press('Enter');
  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Details', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Here are the details.', { delay: 25 });

  await clickOnText(page, 'This is the intro paragraph.');
  await page.keyboard.press('End');
  await page.keyboard.type(' Extra content.', { delay: 25 });

  await page.waitForTimeout(400);
  const text = await editorText(page);
  if (!text.includes('Introduction'))
    throw new Error('Introduction heading missing. Got: ' + text);
  if (!text.includes('This is the intro paragraph. Extra content.'))
    throw new Error('Appended intro text missing. Got: ' + text);
  if (!text.includes('Details'))
    throw new Error('Details heading missing. Got: ' + text);
  if (!text.includes('Here are the details.'))
    throw new Error('Details paragraph missing. Got: ' + text);
}

// S02 — /bullet: create list, mouse-click to replace one item
async function scenario02(page) {
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
  await page.keyboard.press('Enter');
  await page.keyboard.type('Dates', { delay: 25 });

  await clickOnText(page, 'Bananas');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('Blueberries', { delay: 25 });

  await page.waitForTimeout(400);
  const text = await editorText(page);
  if (!text.includes('Apples'))      throw new Error('Apples missing');
  if (!text.includes('Blueberries')) throw new Error('Blueberries (replacement) missing');
  if (text.includes('Bananas'))      throw new Error('Bananas still present after replacement');
  if (!text.includes('Cherries'))    throw new Error('Cherries missing');
  if (!text.includes('Dates'))       throw new Error('Dates missing');

  const items = await page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel + ' ul li')).map((li) => li.innerText.trim()),
    EDITOR,
  );
  const expected = ['Apples', 'Blueberries', 'Cherries', 'Dates'];
  for (let i = 0; i < expected.length; i++) {
    if (!items[i] || !items[i].includes(expected[i]))
      throw new Error('List item ' + (i + 1) + ': expected "' + expected[i] + '", got "' + (items[i] || '') + '"');
  }
}

// S03 — /numbered: 4 steps, mouse-click to append to step 2
async function scenario03(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Procedure', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Numbered', 'Numbered List');
  await page.keyboard.type('Install dependencies', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Configure environment', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Build project', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Run tests', { delay: 25 });

  await clickOnText(page, 'Configure environment');
  await page.keyboard.press('End');
  await page.keyboard.type(' variables', { delay: 25 });

  await page.waitForTimeout(400);
  const items = await page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel + ' ol li')).map((li) => li.innerText.trim()),
    EDITOR,
  );
  if (items.length < 4) throw new Error('Expected 4 list items, got ' + items.length);
  if (!items.some((i) => i.includes('Configure environment variables')))
    throw new Error('Edited item missing " variables". Got: ' + items.join(', '));
  if (!items.some((i) => i.includes('Run tests')))
    throw new Error('"Run tests" missing. Got: ' + items.join(', '));
}

// S04 — /to-do: 3 tasks, check one checkbox, mouse-edit another task
async function scenario04(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Sprint Tasks', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/To-do', 'To-do List');
  await page.keyboard.type('Write tests', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Fix bug', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Ship feature', { delay: 25 });

  await page.waitForTimeout(400);

  const checkbox = page.locator(EDITOR + ' input[type="checkbox"]').first();
  if (await checkbox.count() > 0) {
    await checkbox.click();
    await page.waitForTimeout(300);
  }

  await clickOnText(page, 'Fix bug');
  await page.keyboard.press('End');
  await page.keyboard.type(' #42', { delay: 25 });

  await page.waitForTimeout(400);
  const text = await editorText(page);
  if (!text.includes('Write tests'))  throw new Error('"Write tests" missing');
  if (!text.includes('Fix bug #42'))  throw new Error('"Fix bug #42" missing');
  if (!text.includes('Ship feature')) throw new Error('"Ship feature" missing');

  const count = await page.locator(
    EDITOR + ' input[type="checkbox"], ' + EDITOR + ' [data-type="taskItem"]',
  ).count();
  if (count < 3) throw new Error('Expected >=3 todo items, got ' + count);
}

// S05 — /heading1: article with H1 title, mouse-click to append to paragraph
async function scenario05(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 1');
  await page.keyboard.type('Annual Report', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Our company achieved record results this year.', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Revenue grew by 42%.', { delay: 25 });

  await clickOnText(page, 'Our company achieved record results this year.');
  await page.keyboard.press('End');
  await page.keyboard.type(' Highlights follow.', { delay: 25 });

  await page.waitForTimeout(400);
  const h1 = await page.locator(EDITOR + ' h1').count();
  if (h1 === 0) throw new Error('h1 not found');
  const h1Text = await page.locator(EDITOR + ' h1').first().innerText();
  if (!h1Text.includes('Annual Report')) throw new Error('h1 text wrong: ' + h1Text);

  const text = await editorText(page);
  if (!text.includes('Our company achieved record results this year. Highlights follow.'))
    throw new Error('Appended text missing. Got: ' + text);
  if (!text.includes('Revenue grew by 42%.'))
    throw new Error('Second paragraph missing. Got: ' + text);
}

// S06 — /heading3: H1 > H2 > H3 hierarchy, mouse-click to rename H3
async function scenario06(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 1');
  await page.keyboard.type('Architecture', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Frontend', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 3');
  await page.keyboard.type('Components', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('React components live here.', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Backend', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 3');
  await page.keyboard.type('Services', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('API services live here.', { delay: 25 });

  await clickOnText(page, 'Components');
  await page.keyboard.press('End');
  await page.keyboard.type(' Layer', { delay: 25 });

  await page.waitForTimeout(400);
  const h1Count = await page.locator(EDITOR + ' h1').count();
  const h2Count = await page.locator(EDITOR + ' h2').count();
  const h3Count = await page.locator(EDITOR + ' h3').count();
  if (h1Count === 0) throw new Error('h1 missing');
  if (h2Count < 2)   throw new Error('Expected >=2 h2, got ' + h2Count);
  if (h3Count < 2)   throw new Error('Expected >=2 h3, got ' + h3Count);

  const h3Texts = await page.locator(EDITOR + ' h3').allInnerTexts();
  if (!h3Texts.some((t) => t.includes('Components Layer')))
    throw new Error('Edited H3 "Components Layer" not found. Got: ' + h3Texts);
}

// S07 — /divider: text before and after, assert <hr> present
async function scenario07(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Before the break', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Divider', 'Divider');
  await page.waitForTimeout(300);

  const editorBox = await page.locator(EDITOR).boundingBox();
  await page.mouse.click(editorBox.x + editorBox.width / 2, editorBox.y + editorBox.height - 30);
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');
  await page.keyboard.type('After the break', { delay: 25 });

  await page.waitForTimeout(400);
  const hrCount = await page.locator(EDITOR + ' hr').count();
  if (hrCount === 0) throw new Error('Divider <hr> not found');

  const text = await editorText(page);
  if (!text.includes('Before the break')) throw new Error('"Before the break" missing');
  if (!text.includes('After the break'))  throw new Error('"After the break" missing');
}

// S08 — /quote: create blockquote, mouse-click to add attribution
async function scenario08(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Famous Quotes', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Quote', 'Quote');
  await page.keyboard.type('The best code is no code at all.', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second paragraph after the quote.', { delay: 25 });

  await clickOnText(page, 'The best code is no code at all.');
  await page.keyboard.press('End');
  await page.keyboard.type(' -- Jeff Atwood', { delay: 25 });

  await page.waitForTimeout(400);
  const bqContent = await page.evaluate(
    (sel) => { const bq = document.querySelector(sel + ' blockquote'); return bq ? bq.innerText : ''; },
    EDITOR,
  );
  if (!bqContent.includes('The best code is no code at all. -- Jeff Atwood'))
    throw new Error('Blockquote content wrong. Got: ' + bqContent);

  const text = await editorText(page);
  if (!text.includes('Second paragraph after the quote.'))
    throw new Error('Paragraph after quote missing. Got: ' + text);
}

// S09 — /code: multi-line code block, mouse-click first line to add comment
async function scenario09(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Code Sample', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Code', 'Code Block');
  await page.waitForTimeout(300);

  const codeBlock = page.locator(EDITOR + ' pre').first();
  await codeBlock.click();
  await page.waitForTimeout(200);

  await page.keyboard.type('const x = 1;', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('const y = 2;', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('console.log(x + y);', { delay: 25 });

  await clickOnText(page, 'const x = 1;');
  await page.keyboard.press('End');
  await page.keyboard.type(' // initial value', { delay: 25 });

  await page.waitForTimeout(400);
  const codeContent = await page.evaluate(
    (sel) => { const pre = document.querySelector(sel + ' pre'); return pre ? pre.innerText : ''; },
    EDITOR,
  );
  if (!codeContent.includes('const x = 1; // initial value'))
    throw new Error('Edited code line 1 missing. Got: ' + codeContent);
  if (!codeContent.includes('const y = 2;'))
    throw new Error('Code line 2 missing. Got: ' + codeContent);
  if (!codeContent.includes('console.log(x + y);'))
    throw new Error('Code line 3 missing. Got: ' + codeContent);
}

// S10 — /callout: insert callout, mouse-append text
async function scenario10(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Notes', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Callout', 'Callout');
  await page.keyboard.type('Pay attention to this detail.', { delay: 25 });

  await page.waitForTimeout(400);
  const text = await editorText(page);
  if (!text.includes('Pay attention to this detail.'))
    throw new Error('Callout text missing. Got: ' + text);

  await clickOnText(page, 'Pay attention to this detail.');
  await page.keyboard.press('End');
  await page.keyboard.type(' It is critical.', { delay: 25 });

  await page.waitForTimeout(300);
  const updatedText = await editorText(page);
  if (!updatedText.includes('Pay attention to this detail. It is critical.'))
    throw new Error('Appended callout text missing. Got: ' + updatedText);
}

// S11 — /table: fill header + 2 rows via Tab, mouse-click to edit a cell
async function scenario11(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Score Board', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Table', 'Table');
  await page.waitForTimeout(500);

  const firstTh = page.locator(EDITOR + ' th').first();
  await firstTh.scrollIntoViewIfNeeded();
  await firstTh.click();
  await page.waitForTimeout(250);

  await page.keyboard.insertText('Player');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Score');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Rank');
  await page.keyboard.press('Tab');

  await page.keyboard.insertText('Alice');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('95');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('1');
  await page.keyboard.press('Tab');

  await page.keyboard.insertText('Bob');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('82');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('2');

  const scoreTd = page.locator(EDITOR + ' td').nth(1);
  await scoreTd.scrollIntoViewIfNeeded();
  await scoreTd.click();
  await page.waitForTimeout(250);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.insertText('98');

  await page.waitForTimeout(400);
  const headers = await page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel + ' th')).map((c) => c.textContent.trim()),
    EDITOR,
  );
  if (!headers.some((h) => h.includes('Player'))) throw new Error('Header "Player" missing. Got: ' + headers);
  if (!headers.some((h) => h.includes('Score')))  throw new Error('Header "Score" missing. Got: ' + headers);
  if (!headers.some((h) => h.includes('Rank')))   throw new Error('Header "Rank" missing. Got: ' + headers);

  const cells = await page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel + ' td')).map((c) => c.textContent.trim()),
    EDITOR,
  );
  const flat = cells.join(' ');
  if (!flat.includes('Alice')) throw new Error('"Alice" missing. cells: ' + flat);
  if (!flat.includes('98'))    throw new Error('Updated score "98" missing. cells: ' + flat);
  if (!flat.includes('Bob'))   throw new Error('"Bob" missing. cells: ' + flat);
}

// S12 — /youtube: override window.prompt, assert iframe with youtube src
async function scenario12(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Video Section', { delay: 25 });
  await page.keyboard.press('Enter');

  await page.evaluate(() => {
    window.prompt = () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  });

  await slashCmd(page, '/YouTube', 'YouTube');
  await page.waitForTimeout(1000);

  await page.keyboard.press('Enter');
  await page.keyboard.type('Classic video above.', { delay: 25 });

  await page.waitForTimeout(400);
  const iframeCount = await page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel + ' iframe'))
      .filter((f) => f.src && f.src.includes('youtube')).length,
    EDITOR,
  );
  if (iframeCount === 0) throw new Error('YouTube iframe not found');

  const text = await editorText(page);
  if (!text.includes('Classic video above.')) throw new Error('Caption after iframe missing');
}

// S13 — /image: override window.prompt, assert <img> tag in editor
async function scenario13(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Image Gallery', { delay: 25 });
  await page.keyboard.press('Enter');

  await page.evaluate(() => {
    window.prompt = () => 'https://placekitten.com/400/300';
  });

  await slashCmd(page, '/Image', 'Image');
  await page.waitForTimeout(800);

  await page.keyboard.press('Enter');
  await page.keyboard.type('A kitten above.', { delay: 25 });

  await page.waitForTimeout(400);
  const imgCount = await page.locator(EDITOR + ' img').count();
  if (imgCount === 0) throw new Error('Image tag not found in editor');

  const text = await editorText(page);
  if (!text.includes('A kitten above.')) throw new Error('Caption after image missing');
}

// S14 — /heading1 + /bullet + /divider + /numbered combo, mouse fix bullet
async function scenario14(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 1');
  await page.keyboard.type('Project Plan', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Bullet', 'Bullet List');
  await page.keyboard.type('Research', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Design', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Build', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');

  await slashCmd(page, '/Divider', 'Divider');
  await page.waitForTimeout(300);

  const editorBox = await page.locator(EDITOR).boundingBox();
  await page.mouse.click(editorBox.x + editorBox.width / 2, editorBox.y + editorBox.height - 30);
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Numbered', 'Numbered List');
  await page.keyboard.type('Step one', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Step two', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Step three', { delay: 25 });

  await clickOnText(page, 'Design');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('Design and prototype', { delay: 25 });

  await page.waitForTimeout(400);
  if (await page.locator(EDITOR + ' h1').count() === 0) throw new Error('h1 not found');
  if (await page.locator(EDITOR + ' ul li').count() < 3) throw new Error('Expected >=3 bullet items');
  if (await page.locator(EDITOR + ' hr').count() === 0) throw new Error('Divider <hr> not found');
  if (await page.locator(EDITOR + ' ol li').count() < 3) throw new Error('Expected >=3 numbered items');

  const text = await editorText(page);
  if (!text.includes('Design and prototype'))
    throw new Error('Edited bullet item missing. Got: ' + text);
}

// S15 — /heading2 + /code + /quote, mouse reposition between blocks
async function scenario15(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Technical Notes', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Code', 'Code Block');
  await page.waitForTimeout(300);

  const codeBlock = page.locator(EDITOR + ' pre').first();
  await codeBlock.click();
  await page.waitForTimeout(200);
  await page.keyboard.insertText('function greet(name) {\n  return name;\n}');

  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Quote', 'Quote');
  await page.keyboard.type('Simplicity is the soul of efficiency.', { delay: 25 });

  await clickOnText(page, 'function greet(name)');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('console.log(greet("World"));');

  await page.waitForTimeout(400);
  const codeContent = await page.evaluate(
    (sel) => { const pre = document.querySelector(sel + ' pre'); return pre ? pre.innerText : ''; },
    EDITOR,
  );
  if (!codeContent.includes('function greet'))
    throw new Error('Function definition missing. Got: ' + codeContent);
  if (!codeContent.includes('console.log(greet'))
    throw new Error('Added call site missing. Got: ' + codeContent);

  const bqContent = await page.evaluate(
    (sel) => { const bq = document.querySelector(sel + ' blockquote'); return bq ? bq.innerText : ''; },
    EDITOR,
  );
  if (!bqContent.includes('Simplicity is the soul of efficiency.'))
    throw new Error('Quote text wrong. Got: ' + bqContent);
}

// S16 — /heading2 + /to-do + /numbered: task hierarchy doc
async function scenario16(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('This Week', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/To-do', 'To-do List');
  await page.keyboard.type('Morning standup', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Review pull requests', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Deploy to staging', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Action Items', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Numbered', 'Numbered List');
  await page.keyboard.type('Write changelog', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Update docs', { delay: 25 });

  await clickOnText(page, 'Deploy to staging');
  await page.keyboard.press('End');
  await page.keyboard.type(' (!)', { delay: 25 });

  await page.waitForTimeout(400);
  const text = await editorText(page);
  if (!text.includes('Deploy to staging (!)')) throw new Error('Edited todo item missing. Got: ' + text);
  if (!text.includes('Write changelog'))        throw new Error('"Write changelog" missing');
  if (!text.includes('Update docs'))            throw new Error('"Update docs" missing');

  const h2Count = await page.locator(EDITOR + ' h2').count();
  if (h2Count < 2) throw new Error('Expected >=2 h2 headings, got ' + h2Count);
}

// S17 — /callout + /heading1 + /bullet: callout banner, mouse edit callout
async function scenario17(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Callout', 'Callout');
  await page.keyboard.type('Draft document do not share.', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 1');
  await page.keyboard.type('Q3 Strategy', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Bullet', 'Bullet List');
  await page.keyboard.type('Expand market share', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Reduce churn', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Launch new features', { delay: 25 });

  await clickOnText(page, 'Draft document do not share.');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('Internal only do not share externally.', { delay: 25 });

  await page.waitForTimeout(400);
  if (await page.locator(EDITOR + ' h1').count() === 0) throw new Error('h1 missing');

  const text = await editorText(page);
  if (!text.includes('Internal only')) throw new Error('Edited callout text missing. Got: ' + text);
  if (!text.includes('Q3 Strategy'))   throw new Error('H1 text missing');
  if (!text.includes('Reduce churn'))  throw new Error('"Reduce churn" missing');
}

// S18 — /table: 3 data rows, mouse-click to update a row 2 cell
async function scenario18(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Inventory', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Table', 'Table');
  await page.waitForTimeout(500);

  const firstTh = page.locator(EDITOR + ' th').first();
  await firstTh.scrollIntoViewIfNeeded();
  await firstTh.click();
  await page.waitForTimeout(250);

  await page.keyboard.insertText('Item');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Qty');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Price');
  await page.keyboard.press('Tab');

  await page.keyboard.insertText('Widget A');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('10');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('5.00');
  await page.keyboard.press('Tab');

  await page.keyboard.insertText('Widget B');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('20');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('3.50');
  await page.keyboard.press('Tab');

  await page.keyboard.insertText('Widget C');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('5');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('12.00');

  const qtyTd = page.locator(EDITOR + ' td').nth(3);
  await qtyTd.scrollIntoViewIfNeeded();
  await qtyTd.click();
  await page.waitForTimeout(250);
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.insertText('25');

  await page.waitForTimeout(400);
  const cells = await page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel + ' td')).map((c) => c.textContent.trim()),
    EDITOR,
  );
  const flat = cells.join(' ');
  if (!flat.includes('Widget A')) throw new Error('"Widget A" missing. cells: ' + flat);
  if (!flat.includes('Widget B')) throw new Error('"Widget B" missing. cells: ' + flat);
  if (!flat.includes('25'))       throw new Error('Updated qty "25" missing. cells: ' + flat);
  if (!flat.includes('Widget C')) throw new Error('"Widget C" missing. cells: ' + flat);
}

// S19 — Delete and rewrite: all repositioning via mouse clicks, no arrow keys
async function scenario19(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Original heading', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('This line will be replaced.', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('This line stays.', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('This also gets replaced.', { delay: 25 });

  await clickOnText(page, 'This line will be replaced.');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('This is the replacement line.', { delay: 25 });

  await clickOnText(page, 'This also gets replaced.');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Backspace');
  await page.keyboard.type('Also replaced.', { delay: 25 });

  await page.waitForTimeout(400);
  const text = await editorText(page);

  if (!text.includes('This is the replacement line.'))
    throw new Error('Replacement line missing. Got: ' + text);
  if (text.includes('This line will be replaced.'))
    throw new Error('Original deleted line still present');
  if (!text.includes('This line stays.'))
    throw new Error('"This line stays." was unexpectedly deleted');
  if (!text.includes('Also replaced.'))
    throw new Error('"Also replaced." missing. Got: ' + text);
  if (text.includes('This also gets replaced.'))
    throw new Error('Second deleted line still present');
}

// S20 — /youtube + /image in same doc, mouse-click to edit video caption
async function scenario20(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await page.keyboard.type('Media Page', { delay: 25 });
  await page.keyboard.press('Enter');

  await page.evaluate(() => { window.prompt = () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; });
  await slashCmd(page, '/YouTube', 'YouTube');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Video caption here.', { delay: 25 });
  await page.keyboard.press('Enter');

  await page.evaluate(() => { window.prompt = () => 'https://placekitten.com/400/300'; });
  await slashCmd(page, '/Image', 'Image');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.keyboard.type('Image caption here.', { delay: 25 });

  await clickOnText(page, 'Video caption here.');
  await page.keyboard.press('Home');
  await page.keyboard.type('Watch: ', { delay: 25 });

  await page.waitForTimeout(400);
  const iframeCount = await page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel + ' iframe'))
      .filter((f) => f.src && f.src.includes('youtube')).length,
    EDITOR,
  );
  if (iframeCount === 0) throw new Error('YouTube iframe not found');

  const imgCount = await page.locator(EDITOR + ' img').count();
  if (imgCount === 0) throw new Error('Image tag not found');

  const text = await editorText(page);
  if (!text.includes('Image caption here.')) throw new Error('Image caption missing');
  if (!text.includes('Watch: Video caption here.')) throw new Error('Edited video caption missing');
}

// S21 — Delete a paragraph via mouse select+backspace, assert surroundings intact
async function scenario21(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Keep This', { delay: 25 });
  await page.keyboard.press('Enter');

  await page.keyboard.type('Temporary paragraph.', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Second Section', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Content of section two.', { delay: 25 });

  await clickOnText(page, 'Temporary paragraph.');
  await page.keyboard.press('Home');
  await page.keyboard.down('Shift');
  await page.keyboard.press('End');
  await page.keyboard.up('Shift');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace');

  await page.waitForTimeout(400);
  const text = await editorText(page);
  if (text.includes('Temporary paragraph.'))
    throw new Error('Temporary paragraph still present after deletion');
  if (!text.includes('Keep This'))
    throw new Error('H2 "Keep This" missing after deletion');
  if (!text.includes('Content of section two.'))
    throw new Error('Section 2 content missing after deletion');
}

// S22 — /heading3 + /callout + /code triple combo
async function scenario22(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 3');
  await page.keyboard.type('Implementation', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Callout', 'Callout');
  await page.keyboard.type('Review this carefully before deploying.', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Code', 'Code Block');
  await page.waitForTimeout(300);

  const codeBlock = page.locator(EDITOR + ' pre').first();
  await codeBlock.click();
  await page.waitForTimeout(200);
  await page.keyboard.insertText('SELECT * FROM users WHERE active = true;');

  await clickOnText(page, 'Review this carefully before deploying.');
  await page.keyboard.press('End');
  await page.keyboard.type(' Especially the migration.', { delay: 25 });

  await page.waitForTimeout(400);
  if (await page.locator(EDITOR + ' h3').count() === 0) throw new Error('h3 not found');

  const codeContent = await page.evaluate(
    (sel) => { const pre = document.querySelector(sel + ' pre'); return pre ? pre.innerText : ''; },
    EDITOR,
  );
  if (!codeContent.includes('SELECT * FROM users'))
    throw new Error('SQL query missing. Got: ' + codeContent);

  const text = await editorText(page);
  if (!text.includes('Especially the migration.'))
    throw new Error('Appended callout note missing. Got: ' + text);
}

// S23 — /quote + /divider + /bullet editorial layout, mouse add attribution
async function scenario23(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Quote', 'Quote');
  await page.keyboard.type('Innovation distinguishes between a leader and a follower.', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Divider', 'Divider');
  await page.waitForTimeout(300);

  const editorBox = await page.locator(EDITOR).boundingBox();
  await page.mouse.click(editorBox.x + editorBox.width / 2, editorBox.y + editorBox.height - 30);
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Bullet', 'Bullet List');
  await page.keyboard.type('Think different', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Stay hungry', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Stay foolish', { delay: 25 });

  await clickOnText(page, 'Innovation distinguishes between a leader and a follower.');
  await page.keyboard.press('End');
  await page.keyboard.type(' -- Steve Jobs', { delay: 25 });

  await page.waitForTimeout(400);
  const bqContent = await page.evaluate(
    (sel) => { const bq = document.querySelector(sel + ' blockquote'); return bq ? bq.innerText : ''; },
    EDITOR,
  );
  if (!bqContent.includes('Steve Jobs'))
    throw new Error('Attribution missing. Got: ' + bqContent);

  if (await page.locator(EDITOR + ' hr').count() === 0) throw new Error('Divider missing');
  if (await page.locator(EDITOR + ' ul li').count() < 3) throw new Error('Expected >=3 bullet items');
}

// S24 — Full-page: all 13 slash commands in one document
async function scenario24(page) {
  const editor = page.locator(EDITOR);
  await editor.click();

  await slashCmd(page, '/Heading', 'Heading 1');
  await page.keyboard.type('Complete Demo', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 2');
  await page.keyboard.type('Section One', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Heading', 'Heading 3');
  await page.keyboard.type('Subsection', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Callout', 'Callout');
  await page.keyboard.type('Important notice.', { delay: 25 });
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Bullet', 'Bullet List');
  await page.keyboard.type('Item A', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Item B', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');

  await slashCmd(page, '/Numbered', 'Numbered List');
  await page.keyboard.type('First', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Second', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');

  await slashCmd(page, '/To-do', 'To-do List');
  await page.keyboard.type('Task one', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.type('Task two', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Backspace');

  await slashCmd(page, '/Quote', 'Quote');
  await page.keyboard.type('A quote for the ages.', { delay: 25 });
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Code', 'Code Block');
  await page.waitForTimeout(300);
  const codeBlock = page.locator(EDITOR + ' pre').first();
  await codeBlock.click();
  await page.waitForTimeout(200);
  await page.keyboard.insertText('const demo = true;');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Divider', 'Divider');
  await page.waitForTimeout(300);
  const box = await page.locator(EDITOR).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 30);
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');

  await slashCmd(page, '/Table', 'Table');
  await page.waitForTimeout(500);
  const th = page.locator(EDITOR + ' th').first();
  await th.scrollIntoViewIfNeeded();
  await th.click();
  await page.waitForTimeout(250);
  await page.keyboard.insertText('Col1');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Col2');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Col3');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Val1');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Val2');
  await page.keyboard.press('Tab');
  await page.keyboard.insertText('Val3');

  const editorBox2 = await page.locator(EDITOR).boundingBox();
  await page.mouse.click(editorBox2.x + editorBox2.width / 2, editorBox2.y + editorBox2.height - 20);
  await page.waitForTimeout(200);
  await page.keyboard.press('Enter');

  await page.evaluate(() => { window.prompt = () => 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; });
  await slashCmd(page, '/YouTube', 'YouTube');
  await page.waitForTimeout(1000);
  await page.keyboard.press('Enter');

  await page.evaluate(() => { window.prompt = () => 'https://placekitten.com/200/150'; });
  await slashCmd(page, '/Image', 'Image');
  await page.waitForTimeout(800);
  await page.keyboard.press('Enter');
  await page.keyboard.type('End of demo.', { delay: 25 });

  await page.waitForTimeout(600);

  if (await page.locator(EDITOR + ' h1').count() === 0) throw new Error('H1 missing');
  if (await page.locator(EDITOR + ' h2').count() === 0) throw new Error('H2 missing');
  if (await page.locator(EDITOR + ' h3').count() === 0) throw new Error('H3 missing');
  if (await page.locator(EDITOR + ' ul li').count() < 2) throw new Error('Bullet items missing');
  if (await page.locator(EDITOR + ' ol li').count() < 2) throw new Error('Numbered items missing');
  const todoCount = await page.locator(EDITOR + ' input[type="checkbox"], ' + EDITOR + ' [data-type="taskItem"]').count();
  if (todoCount < 2) throw new Error('To-do items missing, got ' + todoCount);
  if (await page.locator(EDITOR + ' blockquote').count() === 0) throw new Error('Blockquote missing');
  if (await page.locator(EDITOR + ' pre').count() === 0) throw new Error('Code block missing');
  if (await page.locator(EDITOR + ' hr').count() === 0) throw new Error('Divider missing');
  if (await page.locator(EDITOR + ' table').count() === 0) throw new Error('Table missing');
  const iframeCount = await page.evaluate(
    (sel) => Array.from(document.querySelectorAll(sel + ' iframe'))
      .filter((f) => f.src && f.src.includes('youtube')).length,
    EDITOR,
  );
  if (iframeCount === 0) throw new Error('YouTube iframe missing');
  if (await page.locator(EDITOR + ' img').count() === 0) throw new Error('Image missing');
  const text = await editorText(page);
  if (!text.includes('End of demo.')) throw new Error('Final text missing');
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

  const scenarios = [
    [1,  'H2: structured document with two sections',          scenario01],
    [2,  'Bullet list: create and mouse-edit an item',         scenario02],
    [3,  'Numbered list: create and append to an item',        scenario03],
    [4,  'To-do list: create, check, mouse-edit an item',      scenario04],
    [5,  'H1: article with mouse append to paragraph',         scenario05],
    [6,  'H1/H2/H3 hierarchy with mouse cursor fix',           scenario06],
    [7,  'Divider: content before and after',                  scenario07],
    [8,  'Quote: create, mouse-add attribution',               scenario08],
    [9,  'Code block: multi-line, mouse-click to edit',        scenario09],
    [10, 'Callout: insert, detect, mouse-append text',         scenario10],
    [11, 'Table: fill 2 rows, mouse-click to update a cell',   scenario11],
    [12, 'YouTube embed: assert iframe present',               scenario12],
    [13, 'Image embed: assert img tag present',                scenario13],
    [14, 'H1 + bullet + divider + numbered combo',             scenario14],
    [15, 'H2 + code + quote with mouse repositioning',         scenario15],
    [16, 'H2 + to-do + numbered task doc',                     scenario16],
    [17, 'Callout + H1 + bullet, mouse-edit callout',          scenario17],
    [18, 'Table: 3-row inventory, mouse-edit qty cell',        scenario18],
    [19, 'Delete and rewrite via mouse selection only',        scenario19],
    [20, 'YouTube + image in same doc, mouse add captions',    scenario20],
    [21, 'Delete a paragraph via mouse select+backspace',      scenario21],
    [22, 'H3 + callout + code triple combo',                   scenario22],
    [23, 'Quote + divider + bullet editorial layout',          scenario23],
    [24, 'Full-page: all 13 slash commands in one document',   scenario24],
  ];

  try {
    console.log('\n=== Running ' + scenarios.length + ' editor scenarios ===\n');
    for (const [id, name, fn] of scenarios) {
      await runScenario(browser, baseUrl, id, name, fn);
    }
  } finally {
    await browser.close();
    console.log('\u{1F6D1} Stopping preview server...');
    try { process.kill(-server.pid, 'SIGTERM'); } catch (_) { server.kill(); }
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const total  = results.length;
  console.log('\n=== RESULTS ===');
  for (const r of results) {
    const icon = r.status === 'PASS' ? '\u2705' : '\u274c';
    const note = r.notes ? ' | ' + r.notes : '';
    console.log(icon + ' S' + String(r.id).padStart(2, '0') + ' ' + r.status + ': ' + r.name + note);
  }
  console.log('\n=== ' + passed + '/' + total + ' PASS ===');

  process.exit(passed === total ? 0 : 1);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
