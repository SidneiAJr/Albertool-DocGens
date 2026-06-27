import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export class ReadmeGenerator {

    private getRoot(): string | null {
        const folders = vscode.workspace.workspaceFolders
        return folders ? folders[0].uri.fsPath : null
    }

    private lerPackageJson(root: string): any {
        const pkgPath = path.join(root, 'package.json')
        if (!fs.existsSync(pkgPath)) return null
        try {
            return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        } catch { return null }
    }

    gerar(): string {
        const root = this.getRoot()
        if (!root) return ''

        const pkg = this.lerPackageJson(root)
        const nome = pkg?.name || path.basename(root)
        const descricao = pkg?.description || 'Projeto backend'
        const versao = pkg?.version || '1.0.0'
        const deps = pkg?.dependencies ? Object.keys(pkg.dependencies) : []
        const scripts = pkg?.scripts ? Object.entries(pkg.scripts) : []

        // Detecta tecnologias
        const techs: string[] = []
        if (deps.includes('express')) techs.push('Express')
        if (deps.includes('typeorm')) techs.push('TypeORM')
        if (deps.includes('mysql2')) techs.push('MySQL')
        if (deps.includes('jsonwebtoken')) techs.push('JWT')
        if (deps.includes('speakeasy')) techs.push('2FA (Speakeasy)')
        if (deps.includes('bcrypt')) techs.push('Bcrypt')
        if (deps.includes('zod')) techs.push('Zod')
        if (deps.includes('winston')) techs.push('Winston')
        if (deps.includes('helmet')) techs.push('Helmet')
        if (deps.includes('cors')) techs.push('CORS')
        if (deps.includes('dotenv')) techs.push('Dotenv')

        let md = `# ${nome}\n\n`
        md += `> ${descricao}\n\n`
        md += `![Version](https://img.shields.io/badge/version-${versao}-blue)\n\n`
        md += `---\n\n`

        if (techs.length > 0) {
            md += `## 🛠️ Tecnologias\n\n`
            techs.forEach(t => { md += `- ${t}\n` })
            md += `\n---\n\n`
        }

        md += `## 📦 Instalação\n\n`
        md += `\`\`\`bash\n`
        md += `git clone <url-do-repositorio>\n`
        md += `cd ${nome}\n`
        md += `npm install\n`
        md += `cp .env.example .env\n`
        md += `\`\`\`\n\n`
        md += `---\n\n`

        if (scripts.length > 0) {
            md += `## ⚡ Scripts\n\n`
            md += `| Comando | Descrição |\n`
            md += `|---------|----------|\n`
            scripts.forEach(([key, val]) => {
                md += `| \`npm run ${key}\` | \`${val}\` |\n`
            })
            md += `\n---\n\n`
        }

        md += `## 📄 Licença\n\nMIT\n`

        return md
    }

    async salvar(): Promise<void> {
        const root = this.getRoot()
        if (!root) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return }

        const conteudo = this.gerar()
        const destino = path.join(root, 'README.md')

        if (fs.existsSync(destino)) {
            const resposta = await vscode.window.showWarningMessage(
                'README.md já existe. Sobrescrever?', 'Sim', 'Não'
            )
            if (resposta !== 'Sim') return
        }

        fs.writeFileSync(destino, conteudo, 'utf-8')
        const doc = await vscode.workspace.openTextDocument(destino)
        await vscode.window.showTextDocument(doc)
        vscode.window.showInformationMessage('📄 README.md gerado!')
    }
}