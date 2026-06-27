import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';

export class MiscGenerator {
    private scanner = new SrcScanner();

    gerar(): string {
        const allFiles = this.scanner.scanAll();
        const ignoreFolders = ['controllers', 'services', 'models', 'repositories', 'middlewares', 'schemas'];
        
        let md = '# 📁 Arquivos Diversos\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        let hasMisc = false;

        for (const [folder, files] of Object.entries(allFiles)) {
            if (ignoreFolders.includes(folder)) continue;
            if (files.length === 0) continue;

            hasMisc = true;
            md += `## 📂 ${folder.charAt(0).toUpperCase() + folder.slice(1)}\n\n`;

            for (const file of files) {
                const name = path.basename(file, '.ts');
                md += `- \`${name}.ts\`\n`;
            }
            md += '\n---\n\n';
        }

        if (!hasMisc) {
            md += '_Nenhum arquivo diverso encontrado._\n';
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
        const destino = path.join(docsPath, 'MISC.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📋 MISC.md gerado!');
    }
}