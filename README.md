# MarkViewer

Um editor/visualizador de Markdown moderno, simples e poderoso construido com Tauri, SvelteKit e CodeMirror.

## Features

### Editor

- **CodeMirror 6** com renderizacao hibrida - headers, bold, italic, links e codigo estilizados inline mantendo a sintaxe visivel
- **Numeracao de linhas** com destaque da linha ativa
- **Syntax highlighting** para blocos de codigo em multiplas linguagens
- **Selecao avancada** - selecao retangular (Alt+drag), highlight de matches
- **Undo/Redo** com historico completo

### Gerenciamento de Arquivos

- **Abrir arquivos** .md e .markdown do sistema
- **Abrir pastas** com arvore de arquivos estilo VSCode
- **Tabs** para multiplos arquivos abertos simultaneamente
- **Indicador de alteracoes** nao salvas (bolinha cyan na tab)
- **Historico de arquivos recentes** persistido entre sessoes

### Visualizacao

- **Modo Edit** - editor CodeMirror hibrido
- **Modo Preview** - markdown renderizado com estilos bonitos
- **Toggle rapido** entre modos

### Export

- **Export para PDF** com opcoes:
  - Tema claro/escuro
  - Tamanho de pagina (A4, Letter, Legal)
  - Margens (estreitas, normais, largas)

### Interface

- **Tema claro/escuro** com toggle e persistencia
- **Sidebar retrátil** com explorador de arquivos
- **Barra de status** com contagem de linhas, palavras e caracteres
- **Design moderno** com Tailwind CSS

## Atalhos de Teclado

| Atalho                 | Acao                    |
| ---------------------- | ----------------------- |
| `Cmd/Ctrl + N`         | Novo arquivo            |
| `Cmd/Ctrl + O`         | Abrir arquivo           |
| `Cmd/Ctrl + S`         | Salvar                  |
| `Cmd/Ctrl + W`         | Fechar buffer atual     |
| `Cmd/Ctrl + P`         | Toggle Edit/Preview     |
| `Cmd/Ctrl + Z`         | Desfazer                |
| `Cmd/Ctrl + Shift + Z` | Refazer                 |
| `Cmd/Ctrl + Click`     | Abrir link no navegador |

## Tech Stack

- **Frontend**: SvelteKit 2 + Svelte 5 (runes)
- **Editor**: CodeMirror 6
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide Svelte
- **Markdown**: marked + highlight.js
- **PDF**: html2pdf.js
- **Desktop**: Tauri 2
- **Package Manager**: Bun

## Estrutura do Projeto

```
src/
├── lib/
│   ├── components/
│   │   ├── editor/          # CodeMirror wrapper e config
│   │   ├── sidebar/         # Explorador de arquivos
│   │   ├── tabs/            # Tabs de buffers
│   │   ├── preview/         # Preview markdown
│   │   ├── pdf/             # Export PDF
│   │   ├── welcome/         # Tela inicial
│   │   ├── layout/          # TopBar, StatusBar
│   │   └── ui/              # Componentes reutilizaveis
│   ├── stores/              # State management (Svelte 5 runes)
│   ├── services/            # File, Store, Markdown services
│   ├── types/               # TypeScript interfaces
│   └── utils/               # Utilitarios
├── routes/
│   ├── +layout.svelte       # Layout raiz
│   └── +page.svelte         # Pagina principal
└── app.css                  # Estilos globais

src-tauri/
├── src/
│   └── lib.rs               # Plugins Tauri
├── capabilities/
│   └── default.json         # Permissoes
└── Cargo.toml               # Dependencias Rust
```

## Desenvolvimento

### Pre-requisitos

- [Bun](https://bun.sh/) >= 1.0
- [Rust](https://www.rust-lang.org/) >= 1.70
- [Tauri CLI](https://tauri.app/)

### Instalacao

```bash
# Instalar dependencias
bun install

# Rodar em desenvolvimento
bun run tauri dev

# Build para producao
bun run tauri build
```

### Scripts

```bash
bun run dev          # Vite dev server
bun run build        # Build frontend
bun run check        # Type check
bun run tauri dev    # Dev com Tauri
bun run tauri build  # Build app desktop
```

## Plugins Tauri Utilizados

- `tauri-plugin-fs` - Operacoes de arquivo
- `tauri-plugin-dialog` - Dialogos de abrir/salvar
- `tauri-plugin-store` - Persistencia de dados
- `tauri-plugin-opener` - Abrir URLs externas

## Licenca

MIT
