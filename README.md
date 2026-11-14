# Codex · Sessões por Projeto

Extensão local para VS Code que agrupa as sessões do Codex pela pasta de trabalho.

- Mostra as sessões do projeto aberto e das suas subpastas, incluindo workspaces com várias pastas.
- O botão de pastas alterna entre o projeto atual e todos os projetos. Sem projeto aberto, mostra todos.
- A lupa pesquisa nomes, nomes personalizados, caminhos e IDs. Uma pesquisa vazia limpa o filtro.
- Clique numa sessão para a abrir no painel oficial do Codex.
- Botão direito: nome personalizado, favorito, copiar ID ou retomar no terminal integrado.
- Favoritos aparecem primeiro dentro de cada projeto; as restantes sessões seguem a data de alteração.
- Atualiza a cada 15 segundos enquanto o painel está visível; também existe atualização manual.

## Instalar e utilizar

Descarregue o ficheiro `.vsix` em [Releases](https://github.com/fernandessamuel21-lang/codex-project-sessions/releases) e instale-o com **Extensions: Install from VSIX…** no VS Code.

Para gerar o instalador a partir do código:

```sh
npm ci
npm test
npm run package
code --install-extension codex-project-sessions-0.1.0.vsix
```

Abra **Sessões Codex** na barra de atividades. Se necessário, execute **Developer: Reload Window** no VS Code depois de instalar.

Para desenvolver, abra `codex-project-sessions.code-workspace` no VS Code e pressione F5. As tarefas **Testar extensão** e **Gerar VSIX** estão disponíveis em **Terminal → Run Task**.

## Estado da versão inicial

Confirmar no VS Code instalado:

- O projeto atual mostra apenas as suas sessões e subpastas.
- A alternância para todos os projetos e a pesquisa funcionam.
- Um clique abre a conversa correta no painel oficial do Codex.
- Nomes personalizados e favoritos persistem depois de recarregar a janela.
- **Retomar no terminal** abre a sessão correta na pasta correta.
- A atualização encontra uma sessão nova sem reiniciar o editor.

Os testes automáticos e o teste de ativação no Extension Host passaram na preparação inicial. Esta versão é disponibilizada como pré-lançamento: a abertura de conversas e os restantes fluxos visuais ainda precisam de validação manual.

## Dados e compatibilidade

Lê apenas `sessions/**/*.jsonl` e `session_index.jsonl` de `CODEX_HOME` ou `~/.codex`. A configuração `codexSessions.codexHome` permite escolher outra pasta. Lê no máximo 256 KiB do início de cada conversa e mantém uma cache por tamanho/data. Não lê credenciais nem envia dados para serviços externos.

Os nomes personalizados e favoritos ficam no armazenamento global desta extensão no VS Code. Não alteram os títulos originais do Codex. A pesquisa abrange metadados, não o texto completo das conversas. Sessões arquivadas e sessões apenas na cloud não são incluídas. A data mostrada é a última alteração do ficheiro local.

A abertura no painel usa `vscode://openai.chatgpt/local/ID` (com o esquema do editor em execução). A rota foi identificada por inspeção estática da extensão instalada `openai.chatgpt` 26.1007.21434; não constitui uma API pública estável. Se deixar de funcionar, use **Retomar no terminal**, que executa `codex resume ID -C PASTA`. É necessário ter o Codex CLI no PATH ou definir `codexSessions.cliPath`.

Em SSH, WSL ou containers, o histórico lido pertence ao ambiente onde esta extensão é executada. A abertura por URI no painel precisa de validação nesses ambientes; a primeira versão destina-se a utilização local.

## Validação

`npm test` cobre separação de projetos, nomes, pesquisa, favoritos, ficheiros incompletos e atualização da cache. `test/host.cjs` é um teste de ativação para o Extension Host real do VS Code. O clique que reabre uma conversa precisa de confirmação visual no editor do utilizador.
