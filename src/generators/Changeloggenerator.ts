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
        if (lower.includes('feat') || lower.includes('add'))        return '✨'
        if (lower.includes('fix') || lower.includes('bug'))         return '🐛'
        if (lower.includes('refactor'))                             return '♻️'
        if (lower.includes('doc'))                                  return '📚'
        if (lower.includes('test'))                                 return '✅'
        if (lower.includes('style') || lower.includes('format'))    return '🎨'
        if (lower.includes('perf'))                                 return '⚡'
        if (lower.includes('chore') || lower.includes('update'))    return '🔧'
        if (lower.includes('remove') || lower.includes('delete'))   return '🗑️'
        if (lower.includes('security'))                             return '🔐'
        return '📝'
    }

    private categorizeCommits(commits: string[]): Record<string, string[]> {
        const categories: Record<string, string[]> = {
            '✨ Funcionalidades': [],
            '🐛 Correções':       [],
            '♻️ Refatoração':     [],
            '📚 Documentação':    [],
            '✅ Testes':          [],
            '🔐 Segurança':       [],
            '🔧 Manutenção':      [],
        }

        for (const commit of commits) {
            const parts = commit.split(' ')
            const hash  = parts[0]
            const msg   = parts.slice(1).join(' ')
            const lower = msg.toLowerCase()
            const emoji = this.getEmoji(msg)
            const entry = `- ${emoji} \`${hash}\` ${msg}`

            if (lower.includes('feat') || lower.includes('add'))
                categories['✨ Funcionalidades'].push(entry)
            else if (lower.includes('fix') || lower.includes('bug'))
                categories['🐛 Correções'].push(entry)
            else if (lower.includes('refactor'))
                categories['♻️ Refatoração'].push(entry)
            else if (lower.includes('doc'))
                categories['📚 Documentação'].push(entry)
            else if (lower.includes('test'))
                categories['✅ Testes'].push(entry)
            else if (lower.includes('security'))
                categories['🔐 Segurança'].push(entry)
            else
                categories['🔧 Manutenção'].push(entry)
        }

        return categories
    }

    gerar(): string {
        const root = this.getRoot()
        if (!root) return ''

        const pkgPath = path.join(root, 'package.json')
        let versao = '1.0.0'
        let nome   = 'Projeto'
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
            versao = pkg.version || versao
            nome   = pkg.name    || nome
        } catch {}

        const commits = this.getGitLog(root)
        const data    = new Date().toLocaleDateString('pt-BR')

        let md = `# 📋 Changelog\n\n`
        md += `> Gerado automaticamente pelo **Albertool DocGen**\n\n`
        md += `---\n\n`

        // ──────────────────────────────────────────────
        // # ASSUNTO
        // ──────────────────────────────────────────────
        md += `# **Assunto:** Changelog — ${nome}\n\n`

        // ──────────────────────────────────────────────
        // ### O que é
        // ──────────────────────────────────────────────
        md += `### O que é\n`
        md += `Histórico de mudanças do projeto — cada linha é um commit que alterou o comportamento, corrigiu um bug ou adicionou algo novo.\n\n`

        // ──────────────────────────────────────────────
        // ### Pra que serve
        // ──────────────────────────────────────────────
        md += `### Pra que serve\n`
        md += `Rastrear o que mudou entre versões sem precisar ler diff de código — `
        md += `útil pra onboarding, code review e rollback cirúrgico.\n\n`

        // ──────────────────────────────────────────────
        // ### Fluxo
        // ──────────────────────────────────────────────
        md += `### Fluxo\n\n`
        md += '```\n'
        md += `[commit no git]\n`
        md += `        ↓\n`
        md += `[DocGen lê git log --oneline -50]\n`
        md += `        ↓\n`
        md += `[categoriza por tipo + adiciona emoji semântico]\n`
        md += `        ↓\n`
        md += `[CHANGELOG.md organizado por categoria]\n`
        md += '```\n\n'

        // ──────────────────────────────────────────────
        // ### 🔍 Tabela mastigada (legenda de emojis)
        // ──────────────────────────────────────────────
        md += `### 🔍 Tabela mastigada\n\n`
        md += `| Emoji | Tipo | Palavra-chave no commit | Pra que existe |\n`
        md += `|-------|------|------------------------|----------------|\n`
        md += `| ✨ | Funcionalidade | \`feat\`, \`add\` | Nova capacidade entregue |\n`
        md += `| 🐛 | Correção | \`fix\`, \`bug\` | Comportamento errado corrigido |\n`
        md += `| ♻️ | Refatoração | \`refactor\` | Mesmo comportamento, código melhor |\n`
        md += `| 📚 | Documentação | \`doc\` | Conhecimento registrado |\n`
        md += `| ✅ | Teste | \`test\` | Comportamento verificado automaticamente |\n`
        md += `| 🔐 | Segurança | \`security\` | Vulnerabilidade corrigida ou prevenida |\n`
        md += `| 🔧 | Manutenção | qualquer outro | Trabalho interno sem impacto direto |\n`
        md += '\n'

        // ──────────────────────────────────────────────
        // ### 🧠 Por baixo
        // ──────────────────────────────────────────────
        md += `### 🧠 Por baixo\n\n`
        md += '```\n'
        md += `[antes]                    [durante]                          [depois]\n`
        md += `──────────────────         ──────────────────────────────     ──────────────────\n`
        md += `git log bruto       →      DocGen categoriza por keyword  →   Markdown organizado\n`
        md += `sem formatação              e adiciona emoji semântico         por tipo de mudança\n`
        md += '```\n\n'

        md += `---\n\n`

        // ──────────────────────────────────────────────
        // ## Versão atual
        // ──────────────────────────────────────────────
        md += `## [${versao}] — ${data}\n\n`

        if (commits.length === 0) {
            md += `_Nenhum commit encontrado ou repositório Git não inicializado._\n\n`
        } else {
            const categories = this.categorizeCommits(commits)
            for (const [category, entries] of Object.entries(categories)) {
                if (entries.length === 0) continue
                md += `### ${category}\n\n`
                for (const entry of entries) md += `${entry}\n`
                md += '\n'
            }
        }

        md += `---\n\n`
        md += `> Formato: [Semantic Versioning](https://semver.org/)\n`

        return md
    }

    async salvar(): Promise<void> {
        const root = this.getRoot()
        if (!root) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return }

        const conteudo = this.gerar()
        const destino  = path.join(root, 'CHANGELOG.md')
        fs.writeFileSync(destino, conteudo, 'utf-8')
        const doc = await vscode.workspace.openTextDocument(destino)
        await vscode.window.showTextDocument(doc)
        vscode.window.showInformationMessage('📋 CHANGELOG.md gerado!')
    }
}