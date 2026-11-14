'use strict';
const vscode = require('vscode');
const path = require('node:path');
const os = require('node:os');
const { SessionStore, selectSessions, UUID } = require('./sessions');

function activate(context) {
  const store = new SessionStore();
  const changed = new vscode.EventEmitter();
  let sessions = [], all = context.globalState.get('allProjects', false), query = '', loading;
  const annotations = () => context.globalState.get('annotations', {});
  const config = () => vscode.workspace.getConfiguration('codexSessions');
  const home = () => config().get('codexHome') || process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
  const roots = () => (vscode.workspace.workspaceFolders || []).filter(f => f.uri.scheme === 'file').map(f => f.uri.fsPath);
  const title = s => annotations()[s.id]?.name || s.title;
  const visible = () => selectSessions(sessions, roots(), all || roots().length === 0, query, annotations());
  const provider = {
    onDidChangeTreeData: changed.event,
    getTreeItem: node => node,
    getChildren: parent => {
      if (parent) return parent.sessions.map(sessionItem);
      const groups = new Map();
      for (const s of visible()) {
        if (!groups.has(s.cwd)) groups.set(s.cwd, []);
        groups.get(s.cwd).push(s);
      }
      return [...groups].map(([cwd, items]) => {
        const item = new vscode.TreeItem(path.basename(cwd) || cwd, vscode.TreeItemCollapsibleState.Expanded);
        item.id = cwd; item.description = `${items.length} · ${cwd}`;
        item.tooltip = cwd; item.iconPath = new vscode.ThemeIcon('folder'); item.sessions = items;
        return item;
      });
    }
  };
  function sessionItem(s) {
    const favorite = annotations()[s.id]?.favorite;
    const item = new vscode.TreeItem(title(s));
    item.id = s.id; item.contextValue = 'session'; item.session = s;
    item.description = new Date(s.updated).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
    item.tooltip = `${title(s)}\n${s.cwd}\n${item.description}\n${s.id}`;
    item.iconPath = new vscode.ThemeIcon(favorite ? 'star-full' : 'comment-discussion');
    item.command = { command: 'codexSessions.open', title: 'Abrir no Codex', arguments: [item] };
    return item;
  }
  const view = vscode.window.createTreeView('codexSessions.list', { treeDataProvider: provider, showCollapseAll: true });
  function update() {
    view.description = `${all || !roots().length ? 'Todos os projetos' : 'Projeto atual'}${query ? ` · ${query}` : ''}`;
    view.message = visible().length ? undefined : 'Nenhuma sessão encontrada. Use o ícone de pastas para ver todos os projetos, ou a lupa para mudar a pesquisa.';
    changed.fire();
  }
  async function refresh(manual = false) {
    if (loading) return loading;
    loading = (async () => {
      try { sessions = await store.load(home()); update(); }
      catch (error) {
        view.message = `Não foi possível ler o histórico: ${error.message}`;
        if (manual) vscode.window.showErrorMessage(view.message);
      } finally { loading = undefined; }
    })();
    return loading;
  }
  async function choose(node) {
    if (node?.session && UUID.test(node.session.id)) return node.session;
    return (await vscode.window.showQuickPick(visible().map(s => ({ label: title(s), description: s.cwd, detail: s.id, session: s })), { placeHolder: 'Escolher sessão Codex', matchOnDescription: true, matchOnDetail: true }))?.session;
  }
  async function edit(node, transform) {
    const s = await choose(node); if (!s) return;
    const data = annotations();
    const value = await transform({ ...data[s.id] }, s);
    if (!value) return;
    data[s.id] = value;
    await context.globalState.update('annotations', data); update();
  }
  const command = (name, fn) => context.subscriptions.push(vscode.commands.registerCommand(`codexSessions.${name}`, async (...args) => {
    try { await fn(...args); } catch (error) { vscode.window.showErrorMessage(`Sessões Codex: ${error.message}`); }
  }));
  command('refresh', () => refresh(true));
  command('scope', async () => { all = !all; await context.globalState.update('allProjects', all); update(); });
  command('search', async () => {
    const value = await vscode.window.showInputBox({ title: 'Pesquisar sessões Codex', prompt: 'Pesquisar por nome, pasta ou ID. Deixar vazio limpa o filtro.', value: query });
    if (value !== undefined) { query = value; update(); }
  });
  command('favorite', node => edit(node, value => ({ ...value, favorite: !value.favorite })));
  command('rename', node => edit(node, async (value, s) => {
    const name = await vscode.window.showInputBox({ title: 'Nome personalizado', prompt: 'Vazio repõe o nome original do Codex.', value: value.name || title(s) });
    return name === undefined ? undefined : { ...value, name: name.trim().slice(0, 200) };
  }));
  command('copyId', async node => { const s = await choose(node); if (s) await vscode.env.clipboard.writeText(s.id); });
  command('open', async node => {
    const s = await choose(node); if (!s) return;
    if (!vscode.extensions.getExtension('openai.chatgpt')) throw new Error('Instale a extensão oficial do Codex, ou use “Retomar no terminal”.');
    const uri = vscode.Uri.from({ scheme: vscode.env.uriScheme, authority: 'openai.chatgpt', path: `/local/${s.id}` });
    if (!await vscode.env.openExternal(uri)) throw new Error('Não foi possível abrir o Codex. Use “Retomar no terminal”.');
  });
  command('terminal', async node => {
    const s = await choose(node); if (!s) return;
    // Process arguments bypass shell interpolation, including paths with spaces/metacharacters.
    const terminal = vscode.window.createTerminal({ name: `Codex · ${title(s).slice(0, 60)}`, cwd: s.cwd,
      shellPath: config().get('cliPath') || 'codex', shellArgs: ['resume', s.id, '-C', s.cwd], env: { CODEX_HOME: home() } });
    terminal.show();
  });
  context.subscriptions.push(view, changed,
    vscode.workspace.onDidChangeWorkspaceFolders(update),
    vscode.workspace.onDidChangeConfiguration(e => { if (e.affectsConfiguration('codexSessions')) refresh(); }),
    view.onDidChangeVisibility(e => { if (e.visible) refresh(); }));
  const timer = setInterval(() => { if (view.visible) refresh(); }, 15000);
  context.subscriptions.push({ dispose: () => clearInterval(timer) });
  refresh();
}
module.exports = { activate };
