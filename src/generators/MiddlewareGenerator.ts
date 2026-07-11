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
    // 🧠 HELPERS DE DESCRIÇÃO DE LINHA
    // ============================================
    private describeLineAction(trimmed: string, name: string, type: string): string {
        if (!trimmed) return 'Linha vazia';
        if (trimmed.startsWith('import ')) return 'Importa dependência externa';
        if (trimmed.startsWith('export const') || trimmed.startsWith('export function'))
            return `Exporta o middleware \`${name}\``;
        if (trimmed.startsWith('export class')) return `Declara a classe ${name}`;
        if (trimmed.includes('constructor')) return 'Construtor com injeção de dependência';
        if (trimmed.includes('next(err)')) return 'Passa erro pro handler de erros';
        if (trimmed.includes('next()')) return 'Libera a requisição pro próximo middleware';
        if (trimmed.includes('res.status') && trimmed.includes('401')) return 'Rejeita requisição não autenticada';
        if (trimmed.includes('res.status') && trimmed.includes('403')) return 'Rejeita requisição sem permissão';
        if (trimmed.includes('res.status')) return 'Define status HTTP da resposta';
        if (trimmed.includes('res.json')) return 'Envia resposta JSON ao cliente';
        if (trimmed.includes('jwt.verify') || trimmed.includes('verify(')) return 'Verifica e decodifica o token JWT';
        if (trimmed.includes('req.user') || trimmed.includes('req.headers')) return 'Lê dados da requisição';
        if (trimmed.includes('async ')) return `Middleware assíncrono \`${trimmed.match(/async\s+(\w+)/)?.[1] || name}\``;
        if (trimmed.includes('return ')) return 'Interrompe execução do middleware';
        if (trimmed.includes('try')) return 'Inicia bloco de tratamento de erro';
        if (trimmed.includes('catch')) return 'Captura e trata exceções';
        if (trimmed.includes('await ')) return 'Aguarda operação assíncrona';
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return 'Comentário';
        if (trimmed.startsWith('@')) return 'Decorator do TypeScript/NestJS';
        if (trimmed === '{') return 'Abre bloco de código';
        if (trimmed === '}') return 'Fecha bloco de código';
        return 'Linha de código';
    }

    private describeLineDestination(trimmed: string): string {
        if (trimmed.includes('next(err)')) return 'Handler de erro';
        if (trimmed.includes('next()')) return 'Próximo middleware / controller';
        if (trimmed.includes('res.json') || trimmed.includes('res.status')) return 'Cliente HTTP';
        if (trimmed.includes('return ')) return 'Encerra o middleware';
        if (trimmed.startsWith('import ')) return 'Escopo do módulo';
        if (trimmed.includes('await ')) return 'Próxima linha';
        if (trimmed.startsWith('const ') || trimmed.startsWith('let ')) return 'Escopo local';
        return '—';
    }

    private describeLineConnects(trimmed: string): string {
        if (trimmed.startsWith('import ')) {
            const mod = trimmed.match(/from\s+['"]([^'"]+)['"]/)?.[1];
            return mod ? `\`${mod}\`` : '—';
        }
        if (trimmed.includes('this.')) {
            const prop = trimmed.match(/this\.(\w+)/)?.[1];
            return prop ? `\`this.${prop}\`` : '—';
        }
        if (trimmed.includes('await ')) {
            const call = trimmed.match(/await\s+([\w.]+)/)?.[1];
            return call ? `\`${call}\`` : '—';
        }
        if (trimmed.includes('req.')) {
            const field = trimmed.match(/req\.(\w+)/)?.[1];
            return field ? `\`req.${field}\`` : '`req`';
        }
        return '—';
    }

    private describeLinePurpose(trimmed: string): string {
        if (trimmed.startsWith('import ')) return 'Disponibiliza tipos e funções externas';
        if (trimmed.startsWith('export')) return 'Torna o middleware disponível pra aplicação';
        if (trimmed.includes('constructor')) return 'Recebe dependências via DI';
        if (trimmed.includes('next()')) return 'Continua o pipeline de middlewares';
        if (trimmed.includes('next(err)')) return 'Delega tratamento de erro ao handler central';
        if (trimmed.includes('jwt.verify')) return 'Valida autenticidade do token antes de prosseguir';
        if (trimmed.includes('res.status(401)')) return 'Bloqueia acesso sem credenciais';
        if (trimmed.includes('res.status(403)')) return 'Bloqueia acesso sem permissão suficiente';
        if (trimmed.includes('try')) return 'Isola código que pode falhar';
        if (trimmed.includes('catch')) return 'Evita que erros parem a aplicação';
        if (trimmed.includes('await ')) return 'Garante que a operação termine antes de continuar';
        if (trimmed.includes('return ')) return 'Encerra middleware sem chamar next()';
        if (trimmed.startsWith('@')) return 'Metadado para o framework (guard, interceptor)';
        return '—';
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

        // Deduplica arquivos
        const seen = new Set<string>();
        const uniqueFiles = files.filter(f => {
            const base = path.basename(f);
            if (seen.has(base)) return false;
            seen.add(base);
            return true;
        });

        for (const file of uniqueFiles) {
            const content   = fs.readFileSync(file, 'utf-8');
            const name      = path.basename(file, '.ts');
            const methods   = this.parser.parse(content);
            const type      = this.detectType(content);
            const codeLines = content.split('\n').map((code, i) => ({ line: i + 1, code }));

            // ──────────────────────────────────────────────
            // # ASSUNTO
            // ──────────────────────────────────────────────
            md += `# **Assunto:** ${name}\n\n`;
            md += `**Tipo:** ${type}\n\n`;

            // ──────────────────────────────────────────────
            // ### O que é
            // ──────────────────────────────────────────────
            const docMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            let oQueE = `Middleware de ${type.replace(/[^\w\s]/g, '').trim()} que intercepta a requisição HTTP antes de chegar no controller de \`${name}\`.`;
            if (docMatch) {
                const desc = docMatch[1]
                    .split('\n')
                    .map(l => l.trim().replace(/^\*/, '').trim())
                    .filter(l => l && !l.startsWith('@'))
                    .join(' ');
                if (desc) oQueE = desc;
            }
            md += `### O que é\n${oQueE}\n\n`;

            // ──────────────────────────────────────────────
            // ### Pra que serve
            // ──────────────────────────────────────────────
            md += `### Pra que serve\n`;
            md += `Executa antes do controller — sem passar por aqui, a requisição não avança. `;
            md += `Centraliza lógica transversal (auth, log, rate limit) num só lugar em vez de repetir em cada rota.\n\n`;

            // ──────────────────────────────────────────────
            // ### Fluxo
            // ──────────────────────────────────────────────
            md += `### Fluxo\n\n`;
            md += '```\n';
            md += `[requisição HTTP]\n`;
            md += `        ↓\n`;
            md += `[${name} — intercepta e valida]\n`;
            md += `        ↓\n`;
            md += `[next() → controller] ou [res.status() → cliente]\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### Exemplo
            // ──────────────────────────────────────────────
            md += `### Exemplo\n\n`;
            md += '```typescript\n';
            const exampleMethod = methods.find(m => m.name !== 'constructor');
            if (exampleMethod) {
                const params = exampleMethod.params?.join(', ') || 'req: Request, res: Response, next: NextFunction';
                md += `// Uso típico de ${name}\n`;
                md += `export const ${exampleMethod.name} = async (${params}) => {\n`;
                md += `    // 1. valida / extrai dado da requisição\n`;
                md += `    // 2. checa condição (token, permissão, etc)\n`;
                md += `    // 3. next() pra avançar ou res.status() pra bloquear\n`;
                md += `};\n`;
            } else {
                md += `// Nenhum método público encontrado em ${name}\n`;
                md += `// Estrutura esperada:\n`;
                md += `export const ${name} = (req: Request, res: Response, next: NextFunction) => {\n`;
                md += `    // lógica aqui\n`;
                md += `    next();\n`;
                md += `};\n`;
            }
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### 🔍 Tabela mastigada
            // ──────────────────────────────────────────────
            if (methods.length === 0) {
                md += '_Nenhum método encontrado._\n\n';
            } else {
                md += '### 🔍 Tabela mastigada\n\n';
                md += '| Linha / Elemento | O que faz | Pra onde vai | Conecta com | Pra que existe |\n';
                md += '|------------------|-----------|--------------|-------------|----------------|\n';
                for (const m of methods) {
                    const params  = m.params?.join(', ') || '—';
                    const ret     = m.returnType || 'void';
                    const desc    = m.description || `Intercepta e processa a requisição`;
                    const dest    = ret.includes('void') ? 'next() / res.status()' : 'Caller';
                    md += `| \`${m.name}(${params})\` | ${desc} | ${dest} | Controller / Handler de erro | Executar lógica transversal de ${name} |\n`;
                }
                md += '\n';
            }

            // ──────────────────────────────────────────────
            // ### 🧠 Por baixo
            // ──────────────────────────────────────────────
            md += '### 🧠 Por baixo\n\n';
            md += '```\n';
            md += `[antes]                    [durante]                          [depois]\n`;
            md += `──────────────────         ──────────────────────────────     ──────────────────\n`;
            md += `Requisição chega    →      ${name} valida / transforma    →   next() libera ou\n`;
            md += `sem verificação             e decide se avança               res.status() bloqueia\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### ⚠️ Armadilha
            // ─────────────────────────────────────────────

            // ──────────────────────────────────────────────
            // ### 📄 Código fonte explicado
            // ──────────────────────────────────────────────
            md += '### 📄 Código fonte explicado\n\n';
            md += '| Linha / Elemento | O que faz | Pra onde vai | Conecta com | Pra que existe |\n';
            md += '|------------------|-----------|--------------|-------------|----------------|\n';

            const maxLines = Math.min(20, codeLines.length);
            for (let i = 0; i < maxLines; i++) {
                const { line, code } = codeLines[i];
                const trimmed = code.trim();
                if (!trimmed) {
                    md += `| Linha ${line} | Linha vazia | — | — | Separação visual |\n`;
                    continue;
                }
                const oQFaz   = this.describeLineAction(trimmed, name, type);
                const praOnde = this.describeLineDestination(trimmed);
                const conecta = this.describeLineConnects(trimmed);
                const praQue  = this.describeLinePurpose(trimmed);
                const escaped = trimmed.replace(/\|/g, '\\|').slice(0, 60);
                md += `| \`${escaped}\` | ${oQFaz} | ${praOnde} | ${conecta} | ${praQue} |\n`;
            }
            if (codeLines.length > 20) md += `| ... | *+${codeLines.length - 20} linhas* | — | — | — |\n`;
            md += '\n';

            md += '<details>\n<summary>📄 Ver código fonte completo</summary>\n\n';
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