# Albertool DocGen | Em Manutenção

Gera documentação completa do seu projeto backend com um comando só.

Escaneia a `src/`, lê o `package.json`, analisa rotas, variáveis de ambiente, segurança, commits e muito mais — tudo vira markdown organizado na pasta `docs/`.

---

## O que é gerado

| Arquivo | Conteúdo |
|---------|----------|
| `README.md` | Visão geral, tecnologias, scripts e instalação |
| `LIBS.md` | Todas as dependências com versão e descrição |
| `ROUTES.md` | Rotas da API agrupadas por método HTTP |
| `ENV.md` | Variáveis de ambiente detectadas automaticamente |
| `SECURITY.md` | Mecanismos de segurança baseados nas dependências |
| `CHANGELOG.md` | Histórico de commits com emoji semântico |
| `CONTROLLERS.md` | Métodos, parâmetros e retorno de cada controller |
| `SERVICES.md` | Métodos de cada service |
| `MODELS.md` | Campos, getters, setters e código fonte |
| `REPOSITORIES.md` | Métodos de cada repository |
| `MIDDLEWARES.md` | Middlewares detectados e seu tipo |
| `SCHEMAS.md` | Schemas Zod com campos e validações |
| `MISC.md` | Arquivos fora do padrão MVC (utils, config, errors) |

---

## Como usar

1. Abra seu projeto no VSCode
2. `Ctrl+Shift+P` → **DocGen: Gerar Toda Documentação**
3. A pasta `docs/` é criada na raiz com todos os arquivos

---

## Exemplo de output

**CONTROLLERS.md**
```markdown
## 🎯 UserController

| Método     | Parâmetros                        | Retorno             |
|------------|-----------------------------------|---------------------|
| `getAll`   | `req: Request, res: Response`     | `Promise<Response>` |
| `register` | `req: Request, res: Response`     | `Promise<Response>` |
```

**ENV.md**
```markdown
| Variável    | Descrição                              | Obrigatória |
|-------------|----------------------------------------|-------------|
| `DB_HOST`   | Host do banco de dados                 | ✅          |
| `JWT_SECRET`| Chave secreta para geração de tokens   | ✅          |
```

**LIBS.md**
```markdown
| Lib         | Versão    | Descrição                        |
|-------------|-----------|----------------------------------|
| `express`   | `^4.18.2` | Framework HTTP para Node.js      |
| `typeorm`   | `^0.3.20` | ORM para TypeScript e JavaScript |
| `zod`       | `^3.22.4` | Validação de schemas             |
```

---

## Detecção automática

**Tecnologias** — detecta pelo `package.json` e documenta no README e SECURITY o que está sendo usado: JWT, bcrypt, Helmet, CORS, rate limiting, 2FA, Zod, cookies e mais.

**Variáveis de ambiente** — lê `.env`, `.env.example` e escaneia `process.env.X` em todos os arquivos. Normaliza tudo pra maiúsculo automaticamente.

**Rotas** — captura padrão Express (`router.get`, `app.post`) e decorators TypeScript (`@Get`, `@Post`). Agrupa por método HTTP com handler e arquivo de origem.

**Commits** — lê o `git log` e adiciona emoji semântico automaticamente:

| Palavra no commit | Emoji |
|-------------------|-------|
| `feat`, `add` | ✨ |
| `fix`, `bug` | 🐛 |
| `refactor` | ♻️ |
| `doc` | 📚 |
| `test` | ✅ |
| `perf` | ⚡ |
| `security` | 🔐 |
| `remove`, `delete` | 🗑️ |

---

## Estrutura esperada do projeto

A extensão funciona melhor com projetos que seguem o padrão MVC:

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

Arquivos fora dessas pastas são documentados automaticamente no `MISC.md`.

---

## Parte do ecossistema Albertool

- [Albertool Constructor](https://github.com/seu-usuario/albertool-constructor) — gerador de construtores, getters, setters e interfaces

---

## Filosofia

Feito de dev pra dev. Você escreve o código, a extensão documenta.

---

## Licença

MIT
