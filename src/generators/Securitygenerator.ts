import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export class SecurityGenerator {

    private getRoot(): string | null {
        const folders = vscode.workspace.workspaceFolders
        return folders ? folders[0].uri.fsPath : null
    }

    gerar(): string {
        const root = this.getRoot()
        if (!root) return ''

        const pkgPath = path.join(root, 'package.json')
        let deps: string[] = []
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
            deps = Object.keys(pkg.dependencies || {})
        } catch {}

        let md = `# 🔐 Segurança\n\n`
        md += `> Gerado automaticamente pelo **Albertool DocGen**\n\n`
        md += `---\n\n`

        // ──────────────────────────────────────────────
        // # ASSUNTO
        // ──────────────────────────────────────────────
        md += `# **Assunto:** Mecanismos de Segurança\n\n`

        // ──────────────────────────────────────────────
        // ### O que é
        // ──────────────────────────────────────────────
        md += `### O que é\n`
        md += `Camadas de proteção ativas no projeto — detectadas automaticamente pelas dependências do \`package.json\`.\n\n`

        // ──────────────────────────────────────────────
        // ### Pra que serve
        // ──────────────────────────────────────────────
        md += `### Pra que serve\n`
        md += `Cada lib aqui resolve uma categoria específica de ataque — JWT autentica, bcrypt protege senha, CORS filtra origem, Zod valida entrada.\n\n`

        // ──────────────────────────────────────────────
        // ### Fluxo
        // ──────────────────────────────────────────────
        md += `### Fluxo\n\n`
        md += '```\n'
        md += `[requisição HTTP chega]\n`
        md += `        ↓\n`

        if (deps.includes('helmet'))
            md += `[Helmet seta headers de segurança]\n        ↓\n`
        if (deps.includes('cors'))
            md += `[CORS filtra origem da requisição]\n        ↓\n`
        if (deps.includes('express-rate-limit'))
            md += `[Rate Limit conta requisições por IP]\n        ↓\n`
        if (deps.includes('jsonwebtoken'))
            md += `[Auth middleware valida JWT]\n        ↓\n`
        if (deps.includes('zod'))
            md += `[Zod valida e sanitiza o body]\n        ↓\n`

        md += `[Controller executa com dado limpo e usuário autenticado]\n`
        md += '```\n\n'

        // ──────────────────────────────────────────────
        // ### Exemplo
        // ──────────────────────────────────────────────
        md += `### Exemplo\n\n`
        md += '```typescript\n'
        if (deps.includes('jsonwebtoken')) {
            md += `// Middleware de autenticação JWT\n`
            md += `export function authMiddleware(req, res, next) {\n`
            md += `    const token = req.headers.authorization?.split(' ')[1]\n`
            md += `    if (!token) return res.status(401).json({ message: 'Token não fornecido' })\n`
            md += `    const decoded = verifyToken(token)\n`
            md += `    if (!decoded) return res.status(401).json({ message: 'Token inválido' })\n`
            md += `    req.user = decoded\n`
            md += `    next()\n`
            md += `}\n`
        } else {
            md += `// Nenhuma lib de autenticação detectada\n`
        }
        md += '```\n\n'

        // ──────────────────────────────────────────────
        // ### 🔍 Tabela mastigada
        // ──────────────────────────────────────────────
        md += `### 🔍 Tabela mastigada\n\n`
        md += `| Mecanismo | Lib | Ataque que previne | Onde age |\n`
        md += `|-----------|-----|-------------------|----------|\n`
        if (deps.includes('jsonwebtoken'))      md += `| Autenticação JWT    | \`jsonwebtoken\`       | Acesso sem identidade              | Middleware de rota          |\n`
        if (deps.includes('bcrypt'))            md += `| Hash de senha       | \`bcrypt\`             | Vazamento de senha em texto puro   | Camada de service          |\n`
        if (deps.includes('helmet'))            md += `| Headers HTTP        | \`helmet\`             | XSS, Clickjacking, MIME sniffing   | Antes de toda rota         |\n`
        if (deps.includes('express-rate-limit'))md += `| Rate Limiting       | \`express-rate-limit\` | Força bruta, DDoS                  | Por IP, antes do controller|\n`
        if (deps.includes('cors'))              md += `| CORS                | \`cors\`               | Requisição de origem não autorizada| Preflight HTTP             |\n`
        if (deps.includes('zod'))               md += `| Validação de entrada| \`zod\`                | Injeção de dados malformados       | Middleware de schema        |\n`
        if (deps.includes('speakeasy'))         md += `| 2FA TOTP            | \`speakeasy\`          | Acesso com senha comprometida      | Login com segundo fator    |\n`
        if (deps.includes('cookie-parser'))     md += `| Cookie HttpOnly     | \`cookie-parser\`      | XSS roubando token                 | Armazenamento do token     |\n`
        md += '\n'

        // ──────────────────────────────────────────────
        // ### 🧠 Por baixo
        // ──────────────────────────────────────────────
        md += `### 🧠 Por baixo\n\n`
        md += '```\n'
        md += `[antes]                    [durante]                          [depois]\n`
        md += `──────────────────         ──────────────────────────────     ──────────────────\n`
        md += `Requisição crua     →      cada camada filtra / valida    →   controller recebe\n`
        md += `sem verificação             e rejeita se não passar            dado limpo e seguro\n`
        md += '```\n\n'

        md += `---\n\n`

        // ──────────────────────────────────────────────
        // ## Detalhes por mecanismo
        // ──────────────────────────────────────────────
        md += `## Detalhes\n\n`

        if (deps.includes('jsonwebtoken')) {
            md += `### 🔑 JWT\n`
            md += `Token gerado no login e enviado no header \`Authorization: Bearer <token>\` em cada requisição protegida. O middleware decodifica e injeta o usuário no \`req\`.\n\n`
        }
        if (deps.includes('bcrypt')) {
            md += `### 🔒 bcrypt\n`
            md += `Senha transformada em hash antes de salvar no banco. No login, \`bcrypt.compare\` confronta a senha recebida com o hash armazenado — a senha original nunca é guardada.\n\n`
        }
        if (deps.includes('helmet')) {
            md += `### 🪖 Helmet\n`
            md += `Seta automaticamente headers HTTP que o browser usa pra bloquear ataques: CSP impede scripts injetados, X-Frame-Options bloqueia clickjacking, HSTS força HTTPS.\n\n`
        }
        if (deps.includes('express-rate-limit')) {
            md += `### 🚦 Rate Limiting\n`
            md += `Conta quantas requisições cada IP fez numa janela de tempo. Ao exceder o limite, retorna \`429 Too Many Requests\` e bloqueia temporariamente.\n\n`
        }
        if (deps.includes('cors')) {
            md += `### 🌐 CORS\n`
            md += `Controla quais origens podem chamar a API. Requisição de domínio não autorizado é bloqueada antes de chegar no controller.\n\n`
        }
        if (deps.includes('zod')) {
            md += `### ✅ Zod\n`
            md += `Schema tipado que valida o body antes de chegar no controller. Se o dado não bater com o schema, retorna \`400\` com os erros por campo em \`fieldErrors\`.\n\n`
        }
        if (deps.includes('speakeasy')) {
            md += `### 📱 2FA (TOTP)\n`
            md += `Segundo fator via Speakeasy — gera um código temporário a cada 30s via Google Authenticator. Mesmo com senha vazada, o acesso exige o código do app.\n\n`
        }
        if (deps.includes('cookie-parser')) {
            md += `### 🍪 Cookie HttpOnly\n`
            md += `Token armazenado em cookie com flag \`HttpOnly\` — JavaScript do browser não consegue ler, bloqueando roubo de token via XSS.\n\n`
        }

        return md
    }

    async salvar(): Promise<void> {
        const root = this.getRoot()
        if (!root) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return }

        const conteudo = this.gerar()
        const destino  = path.join(root, 'SECURITY.md')
        fs.writeFileSync(destino, conteudo, 'utf-8')
        const doc = await vscode.workspace.openTextDocument(destino)
        await vscode.window.showTextDocument(doc)
        vscode.window.showInformationMessage('🔐 SECURITY.md gerado!')
    }
}