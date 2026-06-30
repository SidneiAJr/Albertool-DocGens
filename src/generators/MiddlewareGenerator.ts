import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';
import { MethodParser } from '../parsers/MethodParser';

export class MiddlewareGenerator {
    private scanner = new SrcScanner();
    private parser  = new MethodParser();

    // ============================================
    // 🔍 DETECTA TIPO DO MIDDLEWARE
    // ============================================
    private detectType(content: string): string {
        if (content.includes('jwt') || content.includes('JWT') || content.includes('verify') || content.includes('token'))
            return '🔐 Autenticação';
        if (content.includes('ErrorRequestHandler') || content.includes('err:') || /\(err,\s*req/.test(content))
            return '⚠️ Tratamento de Erros';
        if (content.includes('rateLimit') || content.includes('rate-limit'))
            return '🚦 Rate Limiting';
        if (content.includes('multer') || content.includes('upload'))
            return '📁 Upload';
        if (content.includes('cors'))
            return '🌐 CORS';
        return '📌 Geral';
    }

    // ============================================
    // 🔍 DETECTA ARMADILHAS NO CÓDIGO
    // ============================================
    private detectWarnings(content: string): string[] {
        const warnings: string[] = [];
        if (!content.includes('next(') && !content.includes('res.status'))
            warnings.push('`next()` não chamado — requisição pode ficar travada');
        if (!content.includes('try') && !content.includes('catch'))
            warnings.push('Sem `try/catch` — erros não tratados vão quebrar o servidor');
        if (content.includes('console.log') && !content.includes('logger'))
            warnings.push('Usando `console.log` direto — prefira um logger (winston, pino)');
        return warnings;
    }

    gerar(): string {
        const files = this.scanner.scanByType('middleware');
        let md = '# 🛡️ Middlewares\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum middleware encontrado._\n\n';
            md += '### 📌 O que é um Middleware?\n\n';
            md += 'Função que intercepta a requisição HTTP antes de chegar no controller.\n\n';
            md += '```typescript\n';
            md += 'export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {\n';
            md += '    const token = req.headers.authorization;\n';
            md += '    if (!token) return res.status(401).json({ message: "Não autorizado" });\n';
            md += '    next();\n';
            md += '};\n';
            md += '```\n';
            return md;
        }

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const name    = path.basename(file, '.ts');
            const methods = this.parser.parse(content);
            const type    = this.detectType(content);
            const warnings = this.detectWarnings(content);

            md += `## 📦 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\` | **Tipo:** ${type}\n\n`;

            // Descrição do JSDoc
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
            md += 'requisição → middleware → [next() ou res.status()]\n';
            md += '```\n\n';

            // Métodos
            if (methods.length > 0) {
                md += '### 🔍 Tabela mastigada\n\n';
                md += '| Elemento | O que faz | Conecta com |\n';
                md += '|----------|-----------|-------------|\n';
                for (const m of methods) {
                    const params = m.params?.join(', ') || '—';
                    const ret    = m.returnType || 'void';
                    md += `| \`${m.name}(${params})\` | ${m.description || '—'} | \`${ret}\` |\n`;
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
        const destino  = path.join(docsPath, 'MIDDLEWARES.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('🛡️ MIDDLEWARES.md gerado!');
    }
}