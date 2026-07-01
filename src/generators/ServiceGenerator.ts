import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';
import { MethodParser } from '../parsers/MethodParser';

export class ServiceGenerator {
    private scanner = new SrcScanner();
    private parser = new MethodParser();

    // ============================================
    // 🔍 EXTRAI DEPENDÊNCIAS INJETADAS
    // ============================================
    private extractDeps(content: string): string[] {
        const deps: string[] = [];
        const match = content.match(/constructor\s*\(([^)]*)\)/);
        if (!match) return deps;
        const params = match[1].split(',').map(p => p.trim());
        for (const param of params) {
            const typeMatch = param.match(/(?:private|public|protected|readonly)?\s*\w+\s*:\s*(\w+)/);
            if (typeMatch) deps.push(typeMatch[1]);
        }
        return deps;
    }

    // ============================================
    // 📄 EXTRAI O CÓDIGO FONTE COM LINHAS NUMERADAS
    // ============================================
    private extractCodeWithLines(content: string): { line: number; code: string }[] {
        return content.split('\n').map((line, index) => ({
            line: index + 1,
            code: line
        }));
    }

    // ============================================
    // 🧠 DETECTA O QUE CADA LINHA FAZ
    // ============================================
    private describeLineAction(trimmed: string, name: string, deps: string[]): string {
        if (!trimmed) return 'Linha vazia';
        if (trimmed.startsWith('import ')) return 'Importa dependência externa';
        if (trimmed.startsWith('export class')) return `Declara a classe ${name}`;
        if (trimmed.includes('constructor')) return `Construtor com injeção de dependência${deps.length > 0 ? `: ${deps.join(', ')}` : ''}`;
        if (trimmed.includes('async ')) return `Método assíncrono \`${trimmed.match(/async\s+(\w+)/)?.[1] || 'função'}\``;
        if (trimmed.includes('return ')) return 'Retorna o resultado da operação';
        if (trimmed.includes('try')) return 'Inicia bloco de tratamento de erro';
        if (trimmed.includes('catch')) return 'Captura e trata exceções';
        if (trimmed.includes('await ')) return 'Aguarda a execução de uma operação assíncrona';
        if (trimmed.includes('throw ')) return 'Lança uma exceção';
        if (trimmed.match(/(?:private|public|protected)\s+\w+/)) {
            const propName = trimmed.match(/(?:private|public|protected)\s+(\w+)/)?.[1] || 'propriedade';
            return `Declara propriedade \`${propName}\``;
        }
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return 'Comentário';
        if (trimmed.startsWith('@')) return 'Decorator do TypeScript';
        if (trimmed === '{') return 'Abre bloco de código';
        if (trimmed === '}') return 'Fecha bloco de código';
        return 'Linha de código';
    }

    // ============================================
    // 🔗 DETECTA COM O QUÊ A LINHA SE CONECTA
    // ============================================
    private describeLineConnects(trimmed: string, deps: string[]): string {
        if (trimmed.startsWith('import ')) {
            const mod = trimmed.match(/from\s+['"]([^'"]+)['"]/)?.[1];
            return mod ? `\`${mod}\`` : '—';
        }
        if (trimmed.includes('constructor')) return deps.length > 0 ? deps.map(d => `\`${d}\``).join(', ') : '—';
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

    // ============================================
    // ➡️ DETECTA PRA ONDE VAI O RESULTADO
    // ============================================
    private describeLineDestination(trimmed: string): string {
        if (trimmed.includes('return ')) return 'Caller / Controller';
        if (trimmed.includes('throw ')) return 'Handler de erro';
        if (trimmed.startsWith('import ')) return 'Escopo do módulo';
        if (trimmed.includes('this.')) return 'Instância da classe';
        if (trimmed.includes('await ')) return 'Próxima linha';
        if (trimmed.startsWith('const ') || trimmed.startsWith('let ')) return 'Escopo local';
        return '—';
    }

    // ============================================
    // ❓ DETECTA PRA QUE EXISTE A LINHA
    // ============================================
    private describeLinePurpose(trimmed: string): string {
        if (trimmed.startsWith('import ')) return 'Disponibiliza tipos e funções externas';
        if (trimmed.startsWith('export class')) return 'Torna a classe disponível para injeção';
        if (trimmed.includes('constructor')) return 'Recebe dependências via DI';
        if (trimmed.includes('async ')) return 'Expõe comportamento assíncrono';
        if (trimmed.includes('return ')) return 'Encerra a execução e entrega o resultado';
        if (trimmed.includes('try')) return 'Isola código que pode falhar';
        if (trimmed.includes('catch')) return 'Evita que erros parem a aplicação';
        if (trimmed.includes('await ')) return 'Garante que a operação termine antes de continuar';
        if (trimmed.includes('throw ')) return 'Sinaliza falha para a camada superior';
        if (trimmed.startsWith('@')) return 'Metadado para o framework (ex: NestJS)';
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return 'Documentação inline';
        return '—';
    }

    gerar(): string {
        const files = this.scanner.scan('services');
        let md = '# 📋 Services\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum service encontrado._\n\n';
            md += '### 📌 O que é um Service?\n\n';
            md += 'Camada de regra de negócio — fica entre o controller e o repository.\n\n';
            md += '```typescript\n';
            md += 'export class UserService {\n';
            md += '    constructor(private repo: UserRepository) {}\n\n';
            md += '    async findAll() {\n';
            md += '        return this.repo.findAll();\n';
            md += '    }\n';
            md += '}\n';
            md += '```\n';
            return md;
        }

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const methods = this.parser.parse(content);
            const name = path.basename(file, '.ts');
            const deps = this.extractDeps(content);
            const codeLines = this.extractCodeWithLines(content);

            // ──────────────────────────────────────────────
            // # ASSUNTO
            // ──────────────────────────────────────────────
            md += `# **Assunto:** ${name}\n\n`;

            // ──────────────────────────────────────────────
            // ### O que é
            // ──────────────────────────────────────────────
            const docMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            let oQueE = `Service que encapsula a lógica de negócio de \`${name}\` — isola regras, valida dados e orquestra chamadas ao repositório.`;
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
            md += `Evita que o controller vire um arquivo de 500 linhas com if aninhado. `;
            md += `Toda regra de negócio de \`${name}\` entra aqui — validação, transformação, orquestração de chamadas. `;
            if (deps.length > 0) {
                md += `Depende de: ${deps.map(d => `\`${d}\``).join(', ')}.\n\n`;
            } else {
                md += `Sem dependências externas injetadas.\n\n`;
            }

            // ──────────────────────────────────────────────
            // ### Fluxo
            // ──────────────────────────────────────────────
            md += `### Fluxo\n\n`;
            md += '```\n';
            md += `[requisição HTTP]\n`;
            md += `        ↓\n`;
            md += `[Controller — valida entrada, chama ${name}]\n`;
            md += `        ↓\n`;
            if (deps.length > 0) {
                md += `[${name} — aplica regra de negócio]\n`;
                md += `        ↓\n`;
                md += `[${deps.join(' → ')} — acessa dados]\n`;
                md += `        ↓\n`;
            } else {
                md += `[${name} — aplica regra de negócio]\n`;
                md += `        ↓\n`;
            }
            md += `[resposta / dado processado]\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### Exemplo
            // ──────────────────────────────────────────────
            md += `### Exemplo\n\n`;
            md += '```typescript\n';
            const exampleMethod = methods.find(m => m.name !== 'constructor');
            if (exampleMethod) {
                const params = exampleMethod.params?.join(', ') || '';
                const ret = exampleMethod.returnType || 'unknown';
                md += `// Uso típico dentro do ${name}\n`;
                md += `async ${exampleMethod.name}(${params}): Promise<${ret}> {\n`;
                md += `    // 1. valida entrada\n`;
                md += `    // 2. chama repositório\n`;
                md += `    // 3. transforma e retorna\n`;
                md += `}\n`;
            } else {
                md += `// Nenhum método público encontrado em ${name}\n`;
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
                    const params = m.params?.join(', ') || '—';
                    const ret = m.returnType || 'void';
                    const dest = m.name === 'constructor' ? 'Instância da classe' : 'Controller / Caller';
                    const connects = deps.length > 0 ? deps.map(d => `\`${d}\``).join(', ') : '—';
                    const purpose = m.name === 'constructor'
                        ? 'Injetar dependências necessárias'
                        : `Expor comportamento de \`${name}\` para uso externo`;
                    md += `| \`${m.name}(${params})\` | Executa lógica e retorna \`${ret}\` | ${dest} | ${connects} | ${purpose} |\n`;
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
            md += `Controller recebe    →     ${name} valida e                →  Dado processado\n`;
            md += `dado bruto do HTTP         orquestra chamadas ao repo         volta ao controller\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### 📄 Código fonte explicado (tabela mastigada por linha)
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

                const oQFaz    = this.describeLineAction(trimmed, name, deps);
                const praOnde  = this.describeLineDestination(trimmed);
                const conecta  = this.describeLineConnects(trimmed, deps);
                const praQue   = this.describeLinePurpose(trimmed);

                const escapedCode = trimmed.replace(/\|/g, '\\|').slice(0, 60);
                md += `| \`${escapedCode}\` | ${oQFaz} | ${praOnde} | ${conecta} | ${praQue} |\n`;
            }

            if (codeLines.length > 20) {
                md += `| ... | *+${codeLines.length - 20} linhas* | — | — | — |\n`;
            }

            md += '\n';

            // Código completo colapsado
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

        const root = folders[0].uri.fsPath;
        const docsPath = path.join(root, 'docs');
        if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });

        const conteudo = this.gerar();
        const destino = path.join(docsPath, 'SERVICES.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📋 SERVICES.md gerado!');
    }
}