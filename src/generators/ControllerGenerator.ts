import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';
import { MethodParser } from '../parsers/MethodParser';

export class ControllerGenerator {
    private scanner = new SrcScanner();
    private parser  = new MethodParser();

    // ============================================
    // 🔍 DETECTA ARMADILHAS
    // ============================================
    private detectWarnings(content: string): string[] {
        const warnings: string[] = [];
        if (!content.includes('try') && !content.includes('catch'))
            warnings.push('Sem `try/catch` — erros vão retornar 500 sem mensagem');
        if (content.includes('res.json') && !content.includes('res.status'))
            warnings.push('Sem `res.status()` explícito — sempre retorna 200, mesmo em erro');
        if (content.includes('console.log') && !content.includes('logger'))
            warnings.push('Usando `console.log` — prefira um logger estruturado');
        return warnings;
    }

    // ============================================
    // 🔍 DETECTA ROTAS MAPEADAS NO ARQUIVO
    // ============================================
    private extractRoutes(content: string): string[] {
        const routes: string[] = [];
        const regex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            routes.push(`${match[1].toUpperCase()} ${match[2]}`);
        }
        return routes;
    }

    gerar(): string {
        const files = this.scanner.scanByType('controller');
        let md = '# 📋 Controllers\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum controller encontrado._\n\n';
            md += '### 📌 O que é um Controller?\n\n';
            md += 'Recebe a requisição HTTP, chama o service e devolve a resposta.\n\n';
            md += '```typescript\n';
            md += 'export class UserController {\n';
            md += '    async index(req: Request, res: Response) {\n';
            md += '        const users = await UserService.findAll();\n';
            md += '        return res.json(users);\n';
            md += '    }\n';
            md += '}\n';
            md += '```\n';
            return md;
        }

        // Deduplica arquivos
        const seen = new Set<string>();
        const uniqueFiles = files.filter(f => {
            const base = path.basename(f);
            if (seen.has(base)) return false;
            seen.add(base);
            return true;
        });

        for (const file of uniqueFiles) {
            const content  = fs.readFileSync(file, 'utf-8');
            const methods  = this.parser.parse(content);
            const name     = path.basename(file, '.ts');
            const routes   = this.extractRoutes(content);
            const warnings = this.detectWarnings(content);

            md += `## 📦 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            // Descrição do JSDoc da classe
            const docMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            if (docMatch) {
                const desc = docMatch[1]
                    .split('\n')
                    .map(l => l.trim().replace(/^\*/, '').trim())
                    .filter(l => l && !l.startsWith('@'))
                    .join(' ');
                md += `### O que é\n${desc}\n\n`;
            }

            // Fluxo
            md += '### Fluxo\n\n';
            md += '```\n';
            md += 'requisição HTTP → controller → service → resposta JSON\n';
            md += '```\n\n';

            // Rotas mapeadas (decorators)
            if (routes.length > 0) {
                md += '**Rotas mapeadas:**\n\n';
                for (const r of routes) md += `- \`${r}\`\n`;
                md += '\n';
            }

            // Métodos
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
        const destino  = path.join(docsPath, 'CONTROLLERS.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📋 CONTROLLERS.md gerado!');
    }
}