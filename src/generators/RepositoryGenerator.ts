import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';
import { MethodParser } from '../parsers/MethodParser';

export class RepositoryGenerator {
    private scanner = new SrcScanner();
    private parser  = new MethodParser();

    // ============================================
    // 🔍 DETECTA ARMADILHAS
    // ============================================
  
    // ============================================
    // 🔍 DETECTA O TIPO DE REPOSITORY
    // ============================================
    private detectRepositoryType(content: string): string {
        if (content.includes('AppDataSource.getRepository')) return 'TypeORM';
        if (content.includes('pool.query') || content.includes('connection.query')) return 'MySQL2 (Query Bruta)';
        if (content.includes('prisma')) return 'Prisma';
        if (content.includes('mongoose')) return 'Mongoose';
        if (content.includes('knex')) return 'Knex';
        if (content.includes('sequelize')) return 'Sequelize';
        return 'Desconhecido';
    }

    // ============================================
    // 🧠 HELPERS DE DESCRIÇÃO DE LINHA
    // ============================================
    private describeLineAction(trimmed: string, name: string, repoType: string): string {
        if (!trimmed) return 'Linha vazia';
        if (trimmed.startsWith('import ')) return 'Importa dependência externa';
        if (trimmed.startsWith('export class')) return `Declara o repositório \`${name}\``;
        if (trimmed.includes('constructor')) return `Construtor — injeta conexão \`${repoType}\``;
        if (trimmed.includes('getRepository')) return `Obtém instância do repositório \`${repoType}\``;
        if (trimmed.includes('prisma.')) {
            const op = trimmed.match(/prisma\.\w+\.(\w+)/)?.[1];
            return op ? `Operação Prisma: \`${op}\`` : 'Operação Prisma';
        }
        if (trimmed.includes('this.repo.find')) return 'Busca registros no banco';
        if (trimmed.includes('this.repo.save') || trimmed.includes('this.repo.create')) return 'Persiste novo registro';
        if (trimmed.includes('this.repo.update')) return 'Atualiza registro existente';
        if (trimmed.includes('this.repo.delete') || trimmed.includes('this.repo.remove')) return 'Remove registro do banco';
        if (trimmed.includes('pool.query') || trimmed.includes('connection.query')) return 'Executa query SQL bruta';
        if (trimmed.includes('async ')) return `Método assíncrono \`${trimmed.match(/async\s+(\w+)/)?.[1] || 'função'}\``;
        if (trimmed.includes('return ')) return 'Retorna resultado pro service';
        if (trimmed.includes('try')) return 'Inicia bloco de tratamento de erro';
        if (trimmed.includes('catch')) return 'Captura e trata exceções do banco';
        if (trimmed.includes('await ')) return 'Aguarda operação assíncrona no banco';
        if (trimmed.includes('throw ')) return 'Lança exceção pro service tratar';
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return 'Comentário';
        if (trimmed === '{') return 'Abre bloco de código';
        if (trimmed === '}') return 'Fecha bloco de código';
        return 'Linha de código';
    }

    private describeLineDestination(trimmed: string): string {
        if (trimmed.includes('return ')) return 'Service / Caller';
        if (trimmed.includes('throw ')) return 'Handler de erro';
        if (trimmed.startsWith('import ')) return 'Escopo do módulo';
        if (trimmed.includes('await ') && trimmed.includes('repo')) return 'Banco de dados';
        if (trimmed.includes('await ') && trimmed.includes('prisma')) return 'Banco de dados';
        if (trimmed.includes('await ') && trimmed.includes('pool')) return 'Banco de dados';
        if (trimmed.includes('await ')) return 'Próxima linha';
        if (trimmed.startsWith('const ') || trimmed.startsWith('let ')) return 'Escopo local';
        return '—';
    }

    private describeLineConnects(trimmed: string): string {
        if (trimmed.startsWith('import ')) {
            const mod = trimmed.match(/from\s+['"]([^'"]+)['"]/)?.[1];
            return mod ? `\`${mod}\`` : '—';
        }
        if (trimmed.includes('this.repo')) return '`this.repo`';
        if (trimmed.includes('this.prisma') || trimmed.includes('prisma.')) return '`prisma`';
        if (trimmed.includes('pool.query')) return '`pool`';
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
        if (trimmed.startsWith('export class')) return 'Torna o repositório disponível para injeção';
        if (trimmed.includes('constructor')) return 'Recebe conexão com banco via DI';
        if (trimmed.includes('getRepository')) return 'Inicializa o repositório para a entidade';
        if (trimmed.includes('find')) return 'Recupera dados do banco';
        if (trimmed.includes('save') || trimmed.includes('create')) return 'Persiste dado no banco';
        if (trimmed.includes('update')) return 'Atualiza dado existente';
        if (trimmed.includes('delete') || trimmed.includes('remove')) return 'Remove dado do banco';
        if (trimmed.includes('return ')) return 'Entrega resultado ao service';
        if (trimmed.includes('try')) return 'Isola operação de banco que pode falhar';
        if (trimmed.includes('catch')) return 'Evita que erro do banco vaze pro controller';
        if (trimmed.includes('throw ')) return 'Sinaliza falha pro service tratar';
        if (trimmed.includes('await ')) return 'Aguarda resposta do banco antes de continuar';
        return '—';
    }

    gerar(): string {
        const files = this.scanner.scan('repositories');
        let md = '# 🗄️ Repositories\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum repository encontrado._\n\n';
            md += '### 📌 O que é um Repository?\n\n';
            md += 'Camada de acesso ao banco — isola as queries do resto da aplicação.\n\n';
            md += '```typescript\n';
            md += 'export class UserRepository {\n';
            md += '    private repo = AppDataSource.getRepository(User);\n\n';
            md += '    async findAll(): Promise<User[]> {\n';
            md += '        return this.repo.find();\n';
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
            const content    = fs.readFileSync(file, 'utf-8');
            const methods    = this.parser.parse(content);
            const name       = path.basename(file, '.ts');
            const repoType   = this.detectRepositoryType(content);
            const entity     = this.extractEntity(content);
            const queries    = this.extractQueries(content);
            const ormMethods = this.extractOrmMethods(content);
            const codeLines  = content.split('\n').map((code, i) => ({ line: i + 1, code }));

            // ──────────────────────────────────────────────
            // # ASSUNTO
            // ──────────────────────────────────────────────
            md += `# **Assunto:** ${name}\n\n`;
            md += `**ORM/Driver:** \`${repoType}\` | **Entidade:** \`${entity}\`\n\n`;

            // ──────────────────────────────────────────────
            // ### O que é
            // ──────────────────────────────────────────────
            const docMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            let oQueE = `Repositório de \`${entity}\` — única camada que fala com o banco via \`${repoType}\`. O service não precisa saber SQL.`;
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
            md += `Separa query de negócio — o service só chama \`findAll()\`, \`save()\`, sem saber se é SQL, Mongo ou Prisma. `;
            md += `Troca de banco? Só mexe aqui, o resto não sabe que existia banco.\n\n`;

            // ──────────────────────────────────────────────
            // ### Fluxo
            // ──────────────────────────────────────────────
            md += `### Fluxo\n\n`;
            md += '```\n';
            md += `[Service — chama método do repositório]\n`;
            md += `        ↓\n`;
            md += `[${name} — monta query via ${repoType}]\n`;
            md += `        ↓\n`;
            md += `[banco de dados — executa e retorna]\n`;
            md += `        ↓\n`;
            md += `[dado bruto → objeto \`${entity}\` → service]\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### Exemplo
            // ──────────────────────────────────────────────
            md += `### Exemplo\n\n`;
            md += '```typescript\n';
            const exMethod = methods.find(m => m.name !== 'constructor');
            if (exMethod) {
                const params = exMethod.params?.join(', ') || '';
                const ret    = exMethod.returnType || `${entity}[]`;
                md += `// Uso típico dentro do service\n`;
                md += `const repo = new ${name}();\n`;
                md += `const result = await repo.${exMethod.name}(${params ? `/* ${params} */` : ''});\n`;
                md += `// result: ${ret}\n`;
            } else {
                md += `const repo = new ${name}();\n`;
                md += `const result = await repo.findAll();\n`;
            }
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### 🔍 Tabela mastigada (métodos)
            // ──────────────────────────────────────────────
            if (methods.length === 0) {
                md += '_Nenhum método encontrado._\n\n';
            } else {
                md += '### 🔍 Tabela mastigada\n\n';
                md += '| Método | Parâmetros | Retorno | O que faz no banco | Pra que existe |\n';
                md += '|--------|------------|---------|--------------------|----------------|\n';
                for (const m of methods) {
                    const params = m.params?.join(', ') || '—';
                    const ret    = m.returnType || '—';
                    const action = m.name.includes('find') || m.name.includes('get') || m.name.includes('list')
                        ? 'SELECT no banco'
                        : m.name.includes('save') || m.name.includes('create') || m.name.includes('insert')
                            ? 'INSERT no banco'
                            : m.name.includes('update')
                                ? 'UPDATE no banco'
                                : m.name.includes('delete') || m.name.includes('remove')
                                    ? 'DELETE no banco'
                                    : 'Operação no banco';
                    md += `| \`${m.name}\` | \`${params}\` | \`${ret}\` | ${action} | ${m.description || `Expor ${action.toLowerCase()} de \`${entity}\``} |\n`;
                }
                md += '\n';
            }

            // Queries SQL brutas
            if (queries.length > 0) {
                md += '### 📝 Queries SQL\n\n';
                md += '| Query | Descrição |\n';
                md += '|-------|-----------|\n';
                for (const q of queries)
                    md += `| \`${q.sql}\` | ${q.description || '—'} |\n`;
                md += '\n';
            }

            // Métodos ORM detectados
            if (ormMethods.length > 0) {
                md += '### 🔧 Métodos ORM utilizados\n\n';
                md += '| Método | O que faz no banco |\n';
                md += '|--------|--------------------|\n';
                for (const m of ormMethods)
                    md += `| \`${m.name}\` | ${m.description || '—'} |\n`;
                md += '\n';
            }

            // ──────────────────────────────────────────────
            // ### 🧠 Por baixo
            // ──────────────────────────────────────────────
            md += '### 🧠 Por baixo\n\n';
            md += '```\n';
            md += `[antes]                    [durante]                          [depois]\n`;
            md += `──────────────────         ──────────────────────────────     ──────────────────\n`;
            md += `Service pede dado   →      ${name} monta query           →   Dado bruto do banco\n`;
            md += `sem saber do banco          e executa via ${repoType.padEnd(12)}     vira objeto \`${entity}\`\n`;
            md += '```\n\n';


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
                const oQFaz   = this.describeLineAction(trimmed, name, repoType);
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

    // ============================================
    // 🔍 EXTRAI A ENTIDADE
    // ============================================
    private extractEntity(content: string): string {
        const typeormMatch = content.match(/getRepository\s*\(\s*(\w+)\s*\)/);
        if (typeormMatch) return typeormMatch[1];
        const prismaMatch = content.match(/prisma\.(\w+)/);
        if (prismaMatch) return prismaMatch[1];
        const mongooseMatch = content.match(/model\s*\(\s*['"](\w+)['"]\s*\)/);
        if (mongooseMatch) return mongooseMatch[1];
        const queryMatch = content.match(/FROM\s+(\w+)/i);
        if (queryMatch) return queryMatch[1];
        const repoMatch = content.match(/Repository<(\w+)>/);
        if (repoMatch) return repoMatch[1];
        return 'Não especificado';
    }

    // ============================================
    // 🔍 EXTRAI QUERIES SQL (query bruta)
    // ============================================
    private extractQueries(content: string): { sql: string; description: string }[] {
        const queries: { sql: string; description: string }[] = [];
        const sqlRegex = /(?:await\s+pool\.query|await\s+connection\.query)\s*\(\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = sqlRegex.exec(content)) !== null) {
            const sql = match[1];
            let description = '';
            const jsdocMatch = content.substring(0, match.index).match(/\/\*\*([\s\S]*?)\*\//);
            if (jsdocMatch) {
                const lines = jsdocMatch[1].split('\n').map(l => l.trim().replace(/^\*/, '').trim());
                description = lines.filter(l => l && !l.startsWith('@')).join(' ').trim();
            }
            queries.push({ sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''), description });
        }
        return queries;
    }

    // ============================================
    // 🔍 EXTRAI MÉTODOS DO TYPEORM
    // ============================================
    private extractOrmMethods(content: string): { name: string; description: string }[] {
        const methods: { name: string; description: string }[] = [];
        const ORM_METHODS: Record<string, string> = {
            find:         'SELECT todos os registros',
            findOne:      'SELECT um registro por condição',
            findOneBy:    'SELECT um registro por campo exato',
            findBy:       'SELECT registros por campo exato',
            save:         'INSERT ou UPDATE automático',
            create:       'Cria instância sem salvar',
            update:       'UPDATE por id sem carregar entidade',
            delete:       'DELETE por id sem carregar entidade',
            remove:       'DELETE carregando entidade antes',
            findAndCount: 'SELECT com total para paginação',
            count:        'COUNT de registros',
        };
        for (const [methodName, description] of Object.entries(ORM_METHODS)) {
            const regex = new RegExp(`await\\s+this\\.repo\\.${methodName}\\s*\\(`, 'g');
            if (regex.test(content)) methods.push({ name: methodName, description });
        }
        return methods;
    }

    // ============================================
    // 💾 SALVAR
    // ============================================
    async salvar(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return; }

        const root     = folders[0].uri.fsPath;
        const docsPath = path.join(root, 'docs');
        if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });

        const conteudo = this.gerar();
        const destino  = path.join(docsPath, 'REPOSITORIES.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('🗄️ REPOSITORIES.md gerado!');
    }
}