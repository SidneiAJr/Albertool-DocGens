import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';

export class MiscGenerator {
    private scanner = new SrcScanner();

    private describeFolder(folder: string): string {
        const map: Record<string, string> = {
            utils:  'Funções utilitárias reutilizáveis — sem estado, sem side effect, entra dado sai dado.',
            routes: 'Mapeamento de URLs para controllers — define o contrato público da API.',
            config: 'Configuração de infraestrutura — banco, ORM, variáveis de ambiente.',
            errors: 'Classes de erro customizadas — tipagem de falhas pra tratamento centralizado.',
        }
        return map[folder] || `Arquivos do módulo \`${folder}\` fora do padrão MVC.`
    }

    private describeFolderPurpose(folder: string): string {
        const map: Record<string, string> = {
            utils:  'Evita duplicação — lógica genérica que qualquer camada pode usar sem criar dependência circular.',
            routes: 'Separa o mapeamento de URLs da lógica — controller não sabe qual rota o chama.',
            config: 'Centraliza setup de infraestrutura — troca de banco ou ORM mexe só aqui.',
            errors: 'Padroniza falhas — o errorHandler consegue distinguir NotFoundError de UnauthorizedError.',
        }
        return map[folder] || 'Organiza responsabilidades fora do fluxo MVC principal.'
    }

    gerar(): string {
        const allFiles  = this.scanner.scanAll();
        const ignoreFolders = ['controllers', 'services', 'models', 'repositories', 'middlewares', 'schemas'];

        let md = '# 📁 Arquivos Diversos\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        const miscFolders = Object.entries(allFiles)
            .filter(([folder, files]) => !ignoreFolders.includes(folder) && files.length > 0);

        if (miscFolders.length === 0) {
            md += '_Nenhum arquivo diverso encontrado._\n';
            return md;
        }

        for (const [folder, files] of miscFolders) {
            const folderName = folder.charAt(0).toUpperCase() + folder.slice(1);

            // ──────────────────────────────────────────────
            // # ASSUNTO
            // ──────────────────────────────────────────────
            md += `# **Assunto:** ${folderName}\n\n`;

            // ──────────────────────────────────────────────
            // ### O que é
            // ──────────────────────────────────────────────
            md += `### O que é\n`;
            md += `${this.describeFolder(folder)}\n\n`;

            // ──────────────────────────────────────────────
            // ### Pra que serve
            // ──────────────────────────────────────────────
            md += `### Pra que serve\n`;
            md += `${this.describeFolderPurpose(folder)}\n\n`;

            // ──────────────────────────────────────────────
            // ### Fluxo
            // ──────────────────────────────────────────────
            md += `### Fluxo\n\n`;
            md += '```\n';
            md += `[qualquer camada da aplicação]\n`;
            md += `        ↓\n`;
            md += `[importa de /${folder}]\n`;
            md += `        ↓\n`;
            md += `[usa função / config / classe sem saber de onde vem]\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### 🔍 Tabela mastigada
            // ──────────────────────────────────────────────
            md += `### 🔍 Tabela mastigada\n\n`;
            md += `| Arquivo | Responsabilidade | Quem usa |\n`;
            md += `|---------|-----------------|----------|\n`;
            for (const file of files) {
                const name = path.basename(file, '.ts');
                md += `| \`${name}.ts\` | — | — |\n`;
            }
            md += '\n';

            // ──────────────────────────────────────────────
            // ### 🧠 Por baixo
            // ──────────────────────────────────────────────
            md += `### 🧠 Por baixo\n\n`;
            md += '```\n';
            md += `[antes]                    [durante]                          [depois]\n`;
            md += `──────────────────         ──────────────────────────────     ──────────────────\n`;
            md += `Lógica espalhada    →      centralizada em /${folder.padEnd(18)}→   qualquer camada\n`;
            md += `em vários arquivos          sem duplicação                    importa e usa\n`;
            md += '```\n\n';

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
        const destino  = path.join(docsPath, 'MISC.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📋 MISC.md gerado!');
    }
}