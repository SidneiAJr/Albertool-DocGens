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
        md += `## Mecanismos de Segurança\n\n`

        if (deps.includes('jsonwebtoken')) {
            md += `### 🔑 Autenticação JWT\n`
            md += `- Tokens de acesso com expiração configurável\n`
            md += `- Validação via middleware em rotas protegidas\n\n`
        }

        if (deps.includes('speakeasy')) {
            md += `### 📱 Autenticação de Dois Fatores (2FA)\n`
            md += `- TOTP via Speakeasy\n`
            md += `- QR Code gerado para configuração no autenticador\n\n`
        }

        if (deps.includes('bcrypt')) {
            md += `### 🔒 Hash de Senhas\n`
            md += `- Senhas armazenadas com bcrypt\n`
            md += `- Salt rounds configurável\n\n`
        }

        if (deps.includes('helmet')) {
            md += `### 🪖 Helmet\n`
            md += `- Headers HTTP de segurança configurados automaticamente\n\n`
        }

        if (deps.includes('express-rate-limit')) {
            md += `### 🚦 Rate Limiting\n`
            md += `- Limite de requisições por IP\n`
            md += `- Proteção contra força bruta\n\n`
        }

        if (deps.includes('cors')) {
            md += `### 🌐 CORS\n`
            md += `- Origens permitidas configuradas via variável de ambiente\n\n`
        }

        if (deps.includes('zod')) {
            md += `### ✅ Validação de Dados\n`
            md += `- Schemas Zod para validação de entrada\n`
            md += `- Sanitização automática de dados recebidos\n\n`
        }

        if (deps.includes('cookie-parser')) {
            md += `### 🍪 Cookies\n`
            md += `- Tokens armazenados em cookies HttpOnly\n`
            md += `- Proteção contra XSS via flag HttpOnly\n\n`
        }

        md += `---\n\n`
        md += `## ⚠️ Boas Práticas\n\n`
        md += `- Nunca commitar o arquivo \`.env\`\n`
        md += `- Rotacionar o \`JWT_SECRET\` periodicamente\n`
        md += `- Manter dependências atualizadas\n`
        md += `- Usar HTTPS em produção\n`

        return md
    }

    async salvar(): Promise<void> {
        const root = this.getRoot()
        if (!root) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return }

        const conteudo = this.gerar()
        const destino = path.join(root, 'SECURITY.md')
        fs.writeFileSync(destino, conteudo, 'utf-8')
        const doc = await vscode.workspace.openTextDocument(destino)
        await vscode.window.showTextDocument(doc)
        vscode.window.showInformationMessage('🔐 SECURITY.md gerado!')
    }
}