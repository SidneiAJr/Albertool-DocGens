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
