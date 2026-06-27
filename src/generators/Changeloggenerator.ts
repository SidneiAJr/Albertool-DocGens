import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

export class ChangelogGenerator {

    private getRoot(): string | null {
        const folders = vscode.workspace.workspaceFolders
        return folders ? folders[0].uri.fsPath : null
    }

    private getGitLog(root: string): string[] {
        try {
            const log = execSync(
                'git log --oneline --no-merges -50',
                { cwd: root, encoding: 'utf-8' }
            )
            return log.trim().split('\n').filter(l => l.trim())
        } catch { return [] }
    }

    private getEmoji(msg: string): string {
        const lower = msg.toLowerCase()
        if (lower.includes('feat') || lower.includes('add')) return '✨'
        if (lower.includes('fix') || lower.includes('bug')) return '🐛'
        if (lower.includes('refactor')) return '♻️'
        if (lower.includes('doc')) return '📚'
        if (lower.includes('test')) return '✅'
        if (lower.includes('style') || lower.includes('format')) return '🎨'
        if (lower.includes('perf')) return '⚡'
        if (lower.includes('chore') || lower.includes('update')) return '🔧'
        if (lower.includes('remove') || lower.includes('delete')) return '🗑️'
        if (lower.includes('security')) return '🔐'
        return '📝'
    }

    gerar(): string {
        const root = this.getRoot()
        if (!root) return ''

        const pkgPath = path.join(root, 'package.json')
        let versao = '1.0.0'
        let nome = 'Projeto'
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
            versao = pkg.version || versao
            nome = pkg.name || nome
        } catch {}

        const commits = this.getGitLog(root)
        const data = new Date().toLocaleDateString('pt-BR')

        let md = `# 📋 Changelog\n\n`
        md += `> Gerado automaticamente pelo **Albertool DocGen**\n\n`
        md += `---\n\n`
        md += `## [${versao}] — ${data}\n\n`

        if (commits.length === 0) {
            md += `_Nenhum commit encontrado ou repositório Git não inicializado._\n`
        } else {
            commits.forEach(commit => {
                const parts = commit.split(' ')
                const hash = parts[0]
                const msg = parts.slice(1).join(' ')
                const emoji = this.getEmoji(msg)
                md += `- ${emoji} \`${hash}\` ${msg}\n`
            })
        }

        md += `\n---\n\n`
        md += `> Formato: [Semantic Versioning](https://semver.org/)\n`

        return md
    }

    async salvar(): Promise<void> {
        const root = this.getRoot()
        if (!root) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return }

        const conteudo = this.gerar()
        const destino = path.join(root, 'CHANGELOG.md')
        fs.writeFileSync(destino, conteudo, 'utf-8')
        const doc = await vscode.workspace.openTextDocument(destino)
        await vscode.window.showTextDocument(doc)
        vscode.window.showInformationMessage('📋 CHANGELOG.md gerado!')
    }
}