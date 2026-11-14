# Codex · Project Sessions

A VS Code extension that organizes local Codex sessions by working directory.

- View sessions from the current project and its subfolders, including multi-root workspaces.
- Switch between the current project and all projects using the folder icon. With no workspace open, all projects are shown.
- Search session titles, custom names, paths, and IDs. Clear the search input to reset the filter.
- Click a session to open it in the official Codex panel.
- Right-click to rename a session, toggle a favorite, copy its ID, or resume it in the integrated terminal.
- Favorites appear first within each project; other sessions are sorted by modification time.
- Refresh automatically every 15 seconds while the view is visible, or refresh manually.

## Installation

Download the `.vsix` file from [Releases](https://github.com/fernandessamuel21-lang/codex-project-sessions/releases) and run **Extensions: Install from VSIX…** in VS Code.

To build and install from source:

```sh
npm ci
npm test
npm run package
code --install-extension codex-project-sessions-0.1.1.vsix
```

Open **Codex Sessions** in the activity bar. If needed, run **Developer: Reload Window** after installation.

## Development

Open `codex-project-sessions.code-workspace` in VS Code and press F5. The **Test Extension** and **Build VSIX** tasks are available under **Terminal → Run Task**.

## Preview status

The automated tests and the initial Extension Host activation smoke test passed. This is a prerelease; opening conversations and the remaining visual workflows still require manual validation:

- The current-project filter shows only sessions from that project and its subfolders.
- Switching to all projects and searching work correctly.
- Clicking a session opens the correct conversation in the official Codex panel.
- Custom names and favorites persist after reloading the window.
- **Resume in Terminal** opens the correct session in the correct folder.
- Refresh discovers a new session without restarting the editor.

## Data and compatibility

The extension reads only `sessions/**/*.jsonl` and `session_index.jsonl` under `CODEX_HOME` or `~/.codex`. Set `codexSessions.codexHome` to use a different directory. It reads at most the first 256 KiB of each conversation and caches results by file size and modification time. It does not read credentials or send history to external services.

Custom names and favorites are stored in this extension's global VS Code storage. Original Codex titles are preserved. Search covers metadata rather than full conversation text. Archived and cloud-only sessions are excluded. Displayed dates use English formatting and reflect local file modification times. Existing conversation titles and user-defined names retain their original language.

Opening a session uses `vscode://openai.chatgpt/local/ID`, with the running editor's URI scheme. This route was identified through static inspection of `openai.chatgpt` version 26.1007.21434 and is not a stable public API. If it stops working, use **Resume in Terminal**, which runs `codex resume ID -C DIRECTORY`. The Codex CLI must be on your PATH, or set `codexSessions.cliPath`.

In SSH, WSL, and containers, history belongs to the environment where this extension runs. Opening sessions through a URI still requires validation in these environments; this preview targets local use.

## Validation

Run `npm test` to check project boundaries, titles, search, favorite sorting, incomplete files, and cache refresh. `test/host.cjs` provides an activation smoke test for the real VS Code Extension Host. Reopening a conversation still requires visual confirmation in the editor.
