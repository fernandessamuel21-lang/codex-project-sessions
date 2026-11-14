const assert = require('node:assert/strict');
const vscode = require('vscode');
exports.run = async () => {
  const extension = vscode.extensions.getExtension('samuel-local.codex-project-sessions');
  assert.ok(extension, 'Extension registered');
  await extension.activate();
  await vscode.commands.executeCommand('codexSessions.refresh');
  await vscode.commands.executeCommand('codexSessions.scope');
  await vscode.commands.executeCommand('codexSessions.scope');
  const commands = await vscode.commands.getCommands();
  for (const command of ['open', 'rename', 'favorite', 'terminal', 'search', 'copyId']) {
    assert.ok(commands.includes(`codexSessions.${command}`));
  }
  console.log('Extension Host smoke test passed');
};
