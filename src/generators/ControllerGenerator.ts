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

    // ============================================
    // 🧠 HELPERS DE DESCRIÇÃO DE LINHA
    // ============================================
    private describeLineAction(trimmed: string, name: string): string {
        if (!trimmed) return 'Linha vazia';
        if (trimmed.startsWith('import ')) return 'Importa dependência externa';
        if (trimmed.startsWith('export class')) return `Declara a classe ${name}`;
        if (trimmed.includes('constructor')) return 'Construtor com injeção de dependência';
        if (trimmed.startsWith('@')) return 'Decorator do TypeScript/NestJS';
        if (trimmed.includes('async ')) return `Método assíncrono \`${trimmed.match(/async\s+(\w+)/)?.[1] || 'função'}\``;
        if (trimmed.includes('return ')) return 'Retorna resposta ao cliente';
        if (trimmed.includes('try')) return 'Inicia bloco de tratamento de erro';
        if (trimmed.includes('catch')) return 'Captura e trata exceções';
        if (trimmed.includes('await ')) return 'Aguarda operação assíncrona';
        if (trimmed.includes('res.status')) return 'Define status HTTP da resposta';
        if (trimmed.includes('res.json')) return 'Envia resposta JSON ao cliente';
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return 'Comentário';
        if (trimmed === '{') return 'Abre bloco de código';
        if (trimmed === '}') return 'Fecha bloco de código';
        return 'Linha de código';
    }

    private describeLineDestination(trimmed: string): string {
        if (trimmed.includes('res.json') || trimmed.includes('res.status')) return 'Cliente HTTP';
        if (trimmed.includes('return ')) return 'Caller / Middleware';
        if (trimmed.includes('throw ')) return 'Handler de erro';
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
        return '—';
    }

    private describeLinePurpose(trimmed: string): string {
        if (trimmed.startsWith('import ')) return 'Disponibiliza tipos e funções externas';
        if (trimmed.startsWith('export class')) return 'Torna a classe disponível para injeção';
        if (trimmed.includes('constructor')) return 'Recebe dependências via DI';
        if (trimmed.startsWith('@')) return 'Metadado para o framework (rota, método, guard)';
        if (trimmed.includes('async ')) return 'Expõe endpoint como comportamento assíncrono';
        if (trimmed.includes('res.json')) return 'Serializa e entrega dado ao cliente';
        if (trimmed.includes('res.status')) return 'Comunica resultado semântico via HTTP';
        if (trimmed.includes('return ')) return 'Encerra execução e entrega resultado';
        if (trimmed.includes('try')) return 'Isola código que pode falhar';
        if (trimmed.includes('catch')) return 'Evita que erros parem a aplicação';
        if (trimmed.includes('await ')) return 'Garante que a operação termine antes de continuar';
        return '—';
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
            const codeLines = content.split('\n').map((code, i) => ({ line: i + 1, code }));

            // ──────────────────────────────────────────────
            // # ASSUNTO
            // ──────────────────────────────────────────────
            md += `# **Assunto:** ${name}\n\n`;

            // ──────────────────────────────────────────────
            // ### O que é
            // ──────────────────────────────────────────────
            const docMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            let oQueE = `Controller que recebe as requisições HTTP de \`${name}\`, delega ao service e devolve a resposta formatada.`;
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
            md += `Ponto de entrada da requisição HTTP — valida o que chega, chama o service certo e formata o que sai. `;
            md += `Sem lógica de negócio aqui: só orquestração e resposta.\n\n`;

            // ──────────────────────────────────────────────
            // ### Fluxo
            // ──────────────────────────────────────────────
            md += `### Fluxo\n\n`;
            md += '```\n';
            md += `[requisição HTTP]\n`;
            md += `        ↓\n`;
            md += `[${name} — extrai params, body, headers]\n`;
            md += `        ↓\n`;
            md += `[Service — executa regra de negócio]\n`;
            md += `        ↓\n`;
            md += `[res.json / res.status — resposta ao cliente]\n`;
            md += '```\n\n';

            // Rotas mapeadas
            if (routes.length > 0) {
                md += '**Rotas mapeadas:**\n\n';
                for (const r of routes) md += `- \`${r}\`\n`;
                md += '\n';
            }

            // ──────────────────────────────────────────────
            // ### Exemplo
            // ──────────────────────────────────────────────
            md += `### Exemplo\n\n`;
            md += '```typescript\n';
            const exampleMethod = methods.find(m => m.name !== 'constructor');
            if (exampleMethod) {
                const params = exampleMethod.params?.join(', ') || 'req: Request, res: Response';
                const ret = exampleMethod.returnType || 'void';
                md += `// Endpoint típico de ${name}\n`;
                md += `async ${exampleMethod.name}(${params}): Promise<${ret}> {\n`;
                md += `    // 1. extrai dados da requisição\n`;
                md += `    // 2. chama service\n`;
                md += `    // 3. retorna resposta\n`;
                md += `}\n`;
            } else {
                md += `// Nenhum método público encontrado em ${name}\n`;
            }
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### 🔍 Tabela mastigada (métodos)
            // ──────────────────────────────────────────────
            if (methods.length === 0) {
                md += '_Nenhum método encontrado._\n\n';
            } else {
                md += '### 🔍 Tabela mastigada\n\n';
                md += '| Linha / Elemento | O que faz | Pra onde vai | Conecta com | Pra que existe |\n';
                md += '|------------------|-----------|--------------|-------------|----------------|\n';
                for (const m of methods) {
                    const params = m.params?.join(', ') || '—';
                    const ret    = m.returnType || 'void';
                    const desc   = m.description || `Processa requisição e retorna \`${ret}\``;
                    md += `| \`${m.name}(${params})\` | ${desc} | Cliente HTTP | Service / Repository | Expor endpoint de ${name} |\n`;
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
            md += `HTTP chega bruta    →      ${name} extrai params          →   Resposta JSON com\n`;
            md += `sem validação               e delega ao service               status HTTP correto\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### ⚠️ Armadilha
            // ──────────────────────────────────────────────
            if (warnings.length > 0) {
                md += '### ⚠️ Armadilha\n\n';
                md += '```\n';
                for (const w of warnings) md += `❌ ${w}\n`;
                md += '```\n\n';
            }

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
                const oQFaz   = this.describeLineAction(trimmed, name);
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
        const destino  = path.join(docsPath, 'CONTROLLERS.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📋 CONTROLLERS.md gerado!');
    }
}