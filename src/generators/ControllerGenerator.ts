import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';
import { MethodParser } from '../parsers/MethodParser';

export class ControllerGenerator {
    private scanner = new SrcScanner();
    private parser  = new MethodParser();

    gerar(): string {
        const files = this.scanner.scanByType('controller');
        let md = '# 📋 Controllers\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum controller encontrado._\n\n';
            md += '### 📌 O que é um Controller?\n\n';
            md += 'Controllers são responsáveis por receber requisições HTTP e retornar respostas.\n\n';
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

        // deduplica arquivos
        const seen = new Set<string>();
        const uniqueFiles = files.filter(f => {
            const base = path.basename(f);
            if (seen.has(base)) return false;
            seen.add(base);
            return true;
        });

        for (const file of uniqueFiles) {
            const content = fs.readFileSync(file, 'utf-8');
            const methods = this.parser.parse(content);
            const name    = path.basename(file, '.ts');

            md += `## 🎯 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            if (methods.length === 0) {
                md += '_Nenhum método encontrado._\n\n';
            } else {
                md += '| Método | Parâmetros | Retorno | Descrição |\n';
                md += '|--------|------------|---------|----------|\n';
                for (const method of methods) {
                    const params = method.params?.join(', ') || '—';
                    const ret    = method.returnType || 'void';
                    const desc   = method.description || '';
                    md += `| \`${method.name}\` | \`${params}\` | \`${ret}\` | ${desc} |\n`;
                }
                md += '\n';
            }

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