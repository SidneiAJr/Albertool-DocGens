import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';

export class MiddlewareGenerator {
    private scanner = new SrcScanner();

    gerar(): string {
        // 🔥 USA O SCAN POR TIPO (middleware/middlewares)
        const files = this.scanner.scanByType('middleware');
        let md = '# 🛡️ Middlewares\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum middleware encontrado._\n\n';
            md += '### 📌 O que é um Middleware?\n\n';
            md += 'Middlewares são funções que interceptam requisições HTTP antes de chegarem aos controllers.\n\n';
            md += '**Exemplo:**\n\n';
            md += '```typescript\n';
            md += 'export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {\n';
            md += '    const token = req.headers.authorization;\n';
            md += '    if (!token) return res.status(401).json({ message: "Não autorizado" });\n';
            md += '    // verifica o token...\n';
            md += '    next();\n';
            md += '};\n';
            md += '```\n';
            return md;
        }

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const name = path.basename(file, '.ts');

            md += `## 🎯 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            // Tenta identificar se é auth ou outro
            const isAuth = content.includes('auth') || content.includes('Auth') || content.includes('token');
            const isError = content.includes('error') || content.includes('Error') || content.includes('next');

            md += `**Tipo:** ${isAuth ? '🔐 Autenticação' : isError ? '⚠️ Tratamento de Erros' : '📌 Geral'}\n\n`;

            // Tenta extrair descrição
            const descMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            if (descMatch) {
                const desc = descMatch[1].split('\n').map(l => l.trim().replace(/^\*/, '').trim()).filter(Boolean).join(' ');
                md += `**Descrição:** ${desc}\n\n`;
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
        const destino = path.join(docsPath, 'MIDDLEWARES.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('🛡️ MIDDLEWARES.md gerado!');
    }
}