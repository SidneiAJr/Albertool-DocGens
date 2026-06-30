import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';
import { MethodParser } from '../parsers/MethodParser';

export class ServiceGenerator {
    private scanner = new SrcScanner();
    private parser  = new MethodParser();

    // ============================================
    // 🔍 EXTRAI DEPENDÊNCIAS INJETADAS
    // ============================================
    private extractDeps(content: string): string[] {
        const deps: string[] = [];
        const match = content.match(/constructor\s*\(([^)]*)\)/);
        if (!match) return deps;
        const params = match[1].split(',').map(p => p.trim());
        for (const param of params) {
            const typeMatch = param.match(/(?:private|public|protected|readonly)?\s*\w+\s*:\s*(\w+)/);
            if (typeMatch) deps.push(typeMatch[1]);
        }
        return deps;
    }

    // ============================================
    // 🔍 DETECTA ARMADILHAS
    // ============================================
    private detectWarnings(content: string, methods: any[]): string[] {
        const warnings: string[] = [];
        if (!content.includes('try') && !content.includes('catch'))
            warnings.push('Sem `try/catch` — erros de banco vão vazar pro controller');
        if (content.includes('console.log') && !content.includes('logger'))
            warnings.push('Usando `console.log` — prefira um logger estruturado');
        const asyncMethods = methods.filter(m => content.includes(`async ${m.name}`));
        if (asyncMethods.length > 0 && !content.includes('await'))
            warnings.push('Métodos `async` sem `await` — retornam Promise não resolvida');
        return warnings;
    }

    gerar(): string {
        const files = this.scanner.scan('services');
        let md = '# 📋 Services\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum service encontrado._\n\n';
            md += '### 📌 O que é um Service?\n\n';
            md += 'Camada de regra de negócio — fica entre o controller e o repository.\n\n';
            md += '```typescript\n';
            md += 'export class UserService {\n';
            md += '    constructor(private repo: UserRepository) {}\n\n';
            md += '    async findAll() {\n';
            md += '        return this.repo.findAll();\n';
            md += '    }\n';
            md += '}\n';
            md += '```\n';
            return md;
        }

        for (const file of files) {
            const content  = fs.readFileSync(file, 'utf-8');
            const methods  = this.parser.parse(content);
            const name     = path.basename(file, '.ts');
            const deps     = this.extractDeps(content);
            const warnings = this.detectWarnings(content, methods);

            md += `## 📦 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            // Descrição JSDoc da classe
            const docMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            if (docMatch) {
                const desc = docMatch[1]
                    .split('\n')
                    .map(l => l.trim().replace(/^\*/, '').trim())
                    .filter(l => l && !l.startsWith('@'))
                    .join(' ');
                md += `### O que é\n${desc}\n\n`;
            }

            // Dependências
            if (deps.length > 0) {
                md += '### Fluxo\n\n';
                md += '```\n';
                md += `controller → ${name} → ${deps.join(' / ')}\n`;
                md += '```\n\n';
            }

            // Métodos — tabela completa (igual ao Controller)
            if (methods.length === 0) {
                md += '_Nenhum método encontrado._\n\n';
            } else {
                md += '### 🔍 Tabela mastigada\n\n';
                md += '| Método | Parâmetros | Retorno | Descrição |\n';
                md += '|--------|------------|---------|----------|\n';
                for (const m of methods) {
                    const params = m.params?.join(', ') || '—';
                    const ret    = m.returnType || 'void';
                    const desc   = m.description || '—';
                    md += `| \`${m.name}\` | \`${params}\` | \`${ret}\` | ${desc} |\n`;
                }
                md += '\n';
            }

            // Armadilhas
            if (warnings.length > 0) {
                md += '### ⚠️ Armadilha\n\n';
                md += '```\n';
                for (const w of warnings) {
                    md += `❌ ${w}\n`;
                }
                md += '```\n\n';
            }

            // Código fonte
            md += '<details>\n<summary>📄 Ver código fonte</summary>\n\n';
            md += '```typescript\n' + content + '\n```\n\n';
            md += '</details>\n\n';
            md += '---\n\n';
        }

        return md;
    }

    async salvar(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return; }

        const root     = folders[0].uri.fsPath;
        const docsPath = path.join(root, 'docs');
        if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });

        const conteudo = this.gerar();
        const destino  = path.join(docsPath, 'SERVICES.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📋 SERVICES.md gerado!');
    }
}