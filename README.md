# 📚 Albertool DocGen

> Gera documentação completa do seu projeto backend TypeScript com um comando só.

<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-1.85.0+-blue?style=flat-square&logo=visual-studio-code"/>
  <img src="https://img.shields.io/badge/Node.js-18%2B-green?style=flat-square&logo=node.js"/>
  <img src="https://img.shields.io/badge/TypeScript-only-3178C6?style=flat-square&logo=typescript"/>
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square"/>
  <img src="https://img.shields.io/badge/status-active-success?style=flat-square"/>
</p>

---

Escaneia a `src/`, lê o `package.json`, analisa rotas, variáveis de ambiente, segurança e commits — tudo vira markdown organizado na pasta `docs/` com um padrão consistente de documentação.

---

## Como usar

1. Abra seu projeto TypeScript no VSCode
2. `Ctrl+Shift+P` → **DocGen: Gerar Toda Documentação**
3. A pasta `docs/` aparece na raiz com tudo gerado

---

## O que é gerado

| Arquivo | O que contém |
|---------|-------------|
| `README.md` | Visão geral, tecnologias, scripts e instalação |
| `LIBS.md` | Dependências com versão e descrição |
| `ROUTES.md` | Rotas agrupadas por método HTTP com handler e arquivo |
| `ENV.md` | Variáveis de ambiente detectadas no `.env` e no código |
| `SECURITY.md` | Mecanismos de segurança detectados pelas dependências |
| `CHANGELOG.md` | Commits categorizados com emoji semântico |
| `CONTROLLERS.md` | Métodos, parâmetros e fluxo de cada controller |
| `SERVICES.md` | Lógica de negócio documentada por método |
| `MODELS.md` | Campos, tipos, decorators ORM e relacionamentos |
| `REPOSITORIES.md` | Métodos de acesso ao banco com parâmetros e retorno |
| `MIDDLEWARES.md` | Middlewares com tipo detectado (auth, error, validação) |
| `SCHEMAS.md` | Schemas Zod com campos e validações |
| `MISC.md` | Arquivos fora do padrão MVC (utils, config, errors) |

---

## Padrão de documentação

Cada arquivo segue o mesmo template — sem enrolação, foco no mecanismo:

```
### Assunto: [NOME]

### O que é
Uma frase. Foco no mecanismo, não na definição de livro.

### Pra que serve
Problema real que esse conceito resolve.

### Fluxo
[entrada]  →  [transformação]  →  [saída]

### Exemplo
código concreto — máx 15 linhas

### 🔍 Tabela mastigada
| Elemento | O que faz | Pra onde vai | Conecta com | Pra que existe |

### 🧠 Por baixo
[antes]  →  [durante]  →  [depois]
```

---

## Detecção automática

**Rotas** — captura Express (`router.get`, `app.post`, qualquer variável `.get/.post`) e decorators TypeScript (`@Get`, `@Post`). Agrupa por método HTTP.

**Segurança** — detecta pelo `package.json` e documenta o que está ativo: JWT, bcrypt, Helmet, CORS, rate limiting, 2FA, Zod, cookies.

**Variáveis de ambiente** — lê `.env`, `.env.example` e escaneia `process.env.X` em todos os arquivos TS/JS. Normaliza tudo pra maiúsculo.

**Commits** — lê o `git log` e categoriza por tipo:

| Palavra no commit | Categoria |
|-------------------|-----------|
| `feat`, `add` | ✨ Funcionalidades |
| `fix`, `bug` | 🐛 Correções |
| `refactor` | ♻️ Refatoração |
| `doc` | 📚 Documentação |
| `test` | ✅ Testes |
| `security` | 🔐 Segurança |
| qualquer outro | 🔧 Manutenção |

---

## Estrutura esperada

Funciona melhor com projetos MVC:

```
src/
├── controllers/
├── services/
├── models/
├── repositories/
├── middlewares/
├── schemas/
├── routes/
├── config/
└── errors/
```

Arquivos fora dessas pastas vão automaticamente pro `MISC.md`.

---

## Limitações atuais

- TypeScript only — PHP, C# e Java em versões futuras
- Schemas Zod precisam usar `z.object()` direto na `const`
- Rotas com `.bind()` mostram o controller mas não o método específico

---

## Ecossistema Albertool

- [Albertool Constructor](https://github.com/seu-usuario/albertool-constructor) — gera construtores, getters, setters e interfaces pra TS, PHP, C#, JS e Python

---

## Licença

MIT — feito de dev pra dev.
