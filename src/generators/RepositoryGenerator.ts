import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';
import { MethodParser } from '../parsers/MethodParser';

export class RepositoryGenerator {
    private scanner = new SrcScanner();
    private parser = new MethodParser();

    gerar(): string {
        const files = this.scanner.scan('repositories');
        let md = '# 🗄️ Repositories\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum repository encontrado._\n';
            return md;
        }

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const methods = this.parser.parse(content);
            const name = path.basename(file, '.ts');

            md += `## 🎯 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            // Tenta identificar a entidade
            const entityMatch = content.match(/Repository<(\w+)>/);
            const entity = entityMatch ? entityMatch[1] : 'Não especificado';
            md += `**Entidade:** \`${entity}\`\n\n`;

            if (methods.length === 0) {
                md += '_Nenhum método encontrado._\n\n';
            } else {
                md += '| Método | Descrição |\n';
                md += '|--------|-----------|\n';
                for (const method of methods) {
                    md += `| \`${method.name}\` | ${method.description || ''} |\n`;
                }
                md += '\n';
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
        const destino = path.join(docsPath, 'REPOSITORIES.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📋 REPOSITORIES.md gerado!');
    }
}