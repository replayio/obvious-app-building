// Monkey-patch playwright's chromium.launch to inject Replay recording env + executablePath
'use strict';
const pw = require('/home/user/work/obvious-app-building/node_modules/playwright');
const replayPw = require('/home/user/work/obvious-app-building/node_modules/@replayio/playwright');
const replayExec = replayPw.getExecutablePath('chromium');

const origLaunch = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = function(options) {
  const launchEnv = Object.assign({}, process.env, {
    RECORD_ALL_CONTENT: '1',
    RECORD_REPLAY_VERBOSE: '1',
  });
  delete launchEnv.RECORD_REPLAY_METADATA;

  const merged = Object.assign({}, options, {
    executablePath: replayExec,
    headless: false,
    env: launchEnv,
  });
  return origLaunch(merged);
};

console.error('[replay-preload] Patched chromium.launch -> ' + replayExec + ' (RECORD_ALL_CONTENT=1)');
