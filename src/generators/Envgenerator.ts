import * as vscode from 'vscode'
import * as fs from 'fs'
import * as path from 'path'

export class EnvGenerator {

    private getRoot(): string | null {
        const folders = vscode.workspace.workspaceFolders
        return folders ? folders[0].uri.fsPath : null
    }

    private scanVariaveis(root: string): string[] {
        const variables = new Set<string>()
        const ignoredDirs = ['node_modules', '.git', 'out', 'dist']

        // Lê .env.example — normaliza pra maiúsculo
        const envExample = path.join(root, '.env.example')
        if (fs.existsSync(envExample)) {
            fs.readFileSync(envExample, 'utf-8').split('\n').forEach(line => {
                const trimmed = line.trim()
                if (trimmed && !trimmed.startsWith('#')) {
                    const key = trimmed.split('=')[0].trim().toUpperCase()
                    if (key) variables.add(key)
                }
            })
        }

        // Lê .env — normaliza pra maiúsculo
        const envFile = path.join(root, '.env')
        if (fs.existsSync(envFile)) {
            fs.readFileSync(envFile, 'utf-8').split('\n').forEach(line => {
                const trimmed = line.trim()
                if (trimmed && !trimmed.startsWith('#')) {
                    const key = trimmed.split('=')[0].trim().toUpperCase()
                    if (key) variables.add(key)
                }
            })
        }

        // Escaneia process.env.VARIAVEL nos arquivos TS/JS — aceita qualquer case
        const scanDir = (dir: string, depth: number) => {
            if (depth > 6) return
            let entries: fs.Dirent[]
            try { entries = fs.readdirSync(dir, { withFileTypes: true }) }
            catch { return }

            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name)
                if (entry.isDirectory()) {
                    if (ignoredDirs.includes(entry.name)) continue
                    scanDir(fullPath, depth + 1)
                } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
                    try {
                        const content = fs.readFileSync(fullPath, 'utf-8')
                        const regex = /process\.env\.([\w]+)/g
                        let match
                        while ((match = regex.exec(content)) !== null) {
                            variables.add(match[1].toUpperCase())
                        }
                    } catch {}
                }
            }
        }

        scanDir(root, 0)
        return Array.from(variables).sort()
    }

    private getDescricao(variavel: string): string {
        const map: { [k: string]: string } = {
            DB_HOST:     'Host do banco de dados',
            DB_PORT:     'Porta do banco de dados',
            DB_USER:     'Usuário do banco de dados',
            DB_PASSWORD: 'Senha do banco de dados',
            DB_DATABASE: 'Nome do banco de dados',
            DB_NAME:     'Nome do banco de dados',
            JWT_SECRET:  'Chave secreta para geração de tokens JWT',
            PORT:        'Porta do servidor',
            NODE_ENV:    'Ambiente de execução (development/production)',
            MAIL_HOST:   'Host do servidor de email',
            MAIL_PORT:   'Porta do servidor de email',
            MAIL_USER:   'Usuário do servidor de email',
            MAIL_PASS:   'Senha do servidor de email',
            MAIL_FROM:   'Email remetente',
        }
        return map[variavel] || 'Variável de ambiente'
    }

    gerar(): string {
        const root = this.getRoot()
        if (!root) return ''

        const variaveis = this.scanVariaveis(root)

        let md = `# 🌍 Variáveis de Ambiente\n\n`
        md += `> Gerado automaticamente pelo **Albertool DocGen**\n\n`
        md += `---\n\n`
        md += `## Configuração\n\n`
        md += `Copie o arquivo \`.env.example\` para \`.env\` e preencha os valores:\n\n`
        md += `\`\`\`bash\ncp .env.example .env\n\`\`\`\n\n`
        md += `---\n\n`
        md += `## Variáveis\n\n`

        if (variaveis.length === 0) {
            md += `_Nenhuma variável de ambiente encontrada._\n\n`
            md += `> Crie um arquivo \`.env\` ou \`.env.example\` na raiz do projeto.\n\n`
        } else {
            md += `| Variável | Descrição | Obrigatória |\n`
            md += `|----------|-----------|-------------|\n`
            variaveis.forEach(v => {
                md += `| \`${v}\` | ${this.getDescricao(v)} | ✅ |\n`
            })
            md += '\n'
        }

        md += `---\n\n`
        md += `## ⚠️ Atenção\n\n`
        md += `- Nunca commitar o arquivo \`.env\`\n`
        md += `- O arquivo \`.env\` já está no \`.gitignore\`\n`
        md += `- Em produção, configure as variáveis diretamente no servidor\n`

        return md
    }

    async salvar(): Promise<void> {
        const root = this.getRoot()
        if (!root) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return }

        const conteudo = this.gerar()
        const destino = path.join(root, 'ENV.md')
        fs.writeFileSync(destino, conteudo, 'utf-8')
        const doc = await vscode.workspace.openTextDocument(destino)
        await vscode.window.showTextDocument(doc)
        vscode.window.showInformationMessage('🌍 ENV.md gerado!')
    }
}