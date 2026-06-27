import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';
import { ZodParser } from '../parsers/ZodParser';

export class SchemaGenerator {
    private scanner = new SrcScanner();
    private parser = new ZodParser();

    gerar(): string {
        const files = this.scanner.scan('schemas');
        let md = '# 📝 Schemas (Zod)\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum schema encontrado._\n';
            return md;
        }

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const schemas = this.parser.parse(content);
            const name = path.basename(file, '.ts');

            md += `## 🎯 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            if (schemas.length === 0) {
                md += '_Nenhum schema encontrado._\n\n';
            } else {
                for (const schema of schemas) {
                    md += `### \`${schema.name}\`\n\n`;
                    md += '| Campo | Tipo | Validação |\n';
                    md += '|-------|------|-----------|\n';
                    for (const field of schema.fields) {
                        md += `| \`${field.name}\` | \`${field.type}\` | ${field.validation || 'Obrigatório'} |\n`;
                    }
                    md += '\n';
                }
            }

            md += '---\n\n';
        }

        return md;
    }

    async salvar(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            vscode.window.showErrorMessage('Nenhum workspace aberto!');
            return;
        }

        const root = folders[0].uri.fsPath;
        const docsPath = path.join(root, 'docs');
        if (!fs.existsSync(docsPath)) {
            fs.mkdirSync(docsPath);
        }

        const conteudo = this.gerar();
        const destino = path.join(docsPath, 'SCHEMAS.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📋 SCHEMAS.md gerado!');
    }
}