import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';

export class ModelGenerator {
    private scanner = new SrcScanner();

    gerar(): string {
        const files = this.scanner.scan('models');
        let md = '# 📦 Models\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum model encontrado._\n';
            return md;
        }

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const name = path.basename(file, '.ts');
            const fields = this.extractFields(content);
            const methods = this.extractMethods(content);

            md += `## 🎯 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            md += '### 📋 Informações\n\n';
            md += `- **Construtor:** ${content.includes('constructor') ? '✅ Sim' : '❌ Não'}\n`;
            md += `- **Getters:** ${methods.getters.length > 0 ? '✅ Sim' : '❌ Não'}\n`;
            md += `- **Setters:** ${methods.setters.length > 0 ? '✅ Sim' : '❌ Não'}\n\n`;

            if (fields.length === 0) {
                md += '_Nenhum campo encontrado._\n\n';
            } else {
                md += '### 📝 Campos\n\n';
                md += '| Campo | Tipo |\n';
                md += '|-------|------|\n';
                for (const field of fields) {
                    md += `| \`${field.name}\` | \`${field.type}\` |\n`;
                }
                md += '\n';
            }

            if (methods.getters.length > 0 || methods.setters.length > 0) {
                md += '### 🔧 Getters e Setters\n\n';
                if (methods.getters.length > 0) {
                    md += '**Getters:**\n\n';
                    for (const g of methods.getters) md += `- \`${g}\`\n`;
                    md += '\n';
                }
                if (methods.setters.length > 0) {
                    md += '**Setters:**\n\n';
                    for (const s of methods.setters) md += `- \`${s}\`\n`;
                    md += '\n';
                }
            }

            md += '### 📄 Código Fonte\n\n';
            md += '<details>\n';
            md += '<summary>📂 Clique para ver o código</summary>\n\n';
            md += '```typescript\n';
            md += content;
            md += '\n```\n\n';
            md += '</details>\n\n';
            md += '---\n\n';
        }

        return md;
    }

    private extractFields(content: string): { name: string; type: string }[] {
        const fields: { name: string; type: string }[] = [];
        const seen = new Set<string>();

        // Só captura declarações com modificador explícito + tipo
        // Ex: private id?: number   ou   private nome: string
        const regex = /(?:private|public|protected)\s+(\w+)\s*[?!]?\s*:\s*([\w<>[\]|]+)/g;

        const INVALID = new Set([
            'private', 'public', 'protected', 'readonly', 'static',
            'constructor', 'return', 'this', 'super', 'void',
            'undefined', 'null', 'any', 'string', 'number', 'boolean',
            'never', 'object', 'unknown',
        ]);

        let match;
        while ((match = regex.exec(content)) !== null) {
            const name = match[1];
            const type = match[2];

            if (INVALID.has(name)) continue;
            if (name.length < 2) continue;
            if (seen.has(name)) continue;

            seen.add(name);
            fields.push({ name, type });
        }

        return fields;
    }

    private extractMethods(content: string): { getters: string[]; setters: string[] } {
        const getters: string[] = [];
        const setters: string[] = [];

        const getRegex = /(?:public\s+)?get(\w+)\s*\(/g;
        const setRegex = /(?:public\s+)?set(\w+)\s*\(/g;
        let match;

        while ((match = getRegex.exec(content)) !== null) getters.push(`get${match[1]}()`);
        while ((match = setRegex.exec(content)) !== null) setters.push(`set${match[1]}()`);

        return { getters, setters };
    }

    async salvar(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return; }

        const root = folders[0].uri.fsPath;
        const docsPath = path.join(root, 'docs');
        if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });

        const conteudo = this.gerar();
        const destino = path.join(docsPath, 'MODELS.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');
        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📦 MODELS.md gerado!');
    }
}