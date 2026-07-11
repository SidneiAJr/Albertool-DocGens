import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';

export class ModelGenerator {
    private scanner = new SrcScanner();

    // ============================================
    // 🔍 DETECTA ARMADILHAS
    // ============================================
    // ============================================
    // 🧠 HELPERS DE DESCRIÇÃO DE LINHA
    // ============================================
    private describeLineAction(trimmed: string, name: string): string {
        if (!trimmed) return 'Linha vazia';
        if (trimmed.startsWith('import ')) return 'Importa dependência externa';
        if (trimmed.startsWith('export class')) return `Declara a entidade \`${name}\``;
        if (trimmed.includes('@Entity')) return 'Marca a classe como entidade do banco de dados';
        if (trimmed.includes('@Schema')) return 'Marca a classe como schema do Mongoose';
        if (trimmed.includes('@PrimaryGeneratedColumn')) return 'Define coluna de chave primária auto-incrementada';
        if (trimmed.includes('@PrimaryColumn')) return 'Define coluna de chave primária manual';
        if (trimmed.includes('@Column')) return 'Mapeia campo para coluna no banco de dados';
        if (trimmed.includes('@Prop')) return 'Mapeia campo para propriedade no Mongoose';
        if (trimmed.includes('@OneToMany') || trimmed.includes('@ManyToOne') ||
            trimmed.includes('@OneToOne') || trimmed.includes('@ManyToMany'))
            return 'Define relacionamento entre entidades';
        if (trimmed.includes('@CreateDateColumn')) return 'Coluna preenchida automaticamente na criação';
        if (trimmed.includes('@UpdateDateColumn')) return 'Coluna atualizada automaticamente em cada update';
        if (trimmed.match(/get\s+\w+\s*\(/)) return 'Getter — lê propriedade calculada';
        if (trimmed.match(/set\s+\w+\s*\(/)) return 'Setter — define propriedade com lógica';
        if (trimmed.startsWith('@')) return 'Decorator do TypeScript/ORM';
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return 'Comentário';
        if (trimmed === '{') return 'Abre bloco de código';
        if (trimmed === '}') return 'Fecha bloco de código';
        return 'Linha de código';
    }

    private describeLineDestination(trimmed: string): string {
        if (trimmed.includes('@Entity') || trimmed.includes('@Schema')) return 'ORM / ODM';
        if (trimmed.includes('@Column') || trimmed.includes('@Prop')) return 'Tabela / Coleção no banco';
        if (trimmed.includes('@OneToMany') || trimmed.includes('@ManyToOne') ||
            trimmed.includes('@OneToOne') || trimmed.includes('@ManyToMany')) return 'Entidade relacionada';
        if (trimmed.startsWith('import ')) return 'Escopo do módulo';
        if (trimmed.match(/get\s+\w+/)) return 'Caller / Service';
        return '—';
    }

    private describeLineConnects(trimmed: string): string {
        if (trimmed.startsWith('import ')) {
            const mod = trimmed.match(/from\s+['"]([^'"]+)['"]/)?.[1];
            return mod ? `\`${mod}\`` : '—';
        }
        if (trimmed.includes('@OneToMany') || trimmed.includes('@ManyToOne') ||
            trimmed.includes('@OneToOne') || trimmed.includes('@ManyToMany')) {
            const entity = trimmed.match(/=>\s*(\w+)/)?.[1];
            return entity ? `\`${entity}\`` : '—';
        }
        if (trimmed.includes('@Column') || trimmed.includes('@Prop')) return '`banco de dados`';
        if (trimmed.includes('@Entity')) return '`TypeORM`';
        if (trimmed.includes('@Schema')) return '`Mongoose`';
        return '—';
    }

    private describeLinePurpose(trimmed: string): string {
        if (trimmed.startsWith('import ')) return 'Disponibiliza decorators e tipos externos';
        if (trimmed.includes('@Entity')) return 'Registra a classe no ORM como tabela';
        if (trimmed.includes('@Schema')) return 'Registra a classe no Mongoose como coleção';
        if (trimmed.includes('@PrimaryGeneratedColumn')) return 'Garante identificador único por registro';
        if (trimmed.includes('@Column')) return 'Persiste o campo no banco de dados';
        if (trimmed.includes('@Prop')) return 'Persiste o campo na coleção MongoDB';
        if (trimmed.includes('@CreateDateColumn')) return 'Rastreia quando o registro foi criado';
        if (trimmed.includes('@UpdateDateColumn')) return 'Rastreia quando o registro foi modificado';
        if (trimmed.includes('OneToMany') || trimmed.includes('ManyToOne') ||
            trimmed.includes('OneToOne') || trimmed.includes('ManyToMany'))
            return 'Modela relacionamento entre entidades no banco';
        if (trimmed.match(/get\s+\w+/)) return 'Expõe dado calculado sem persistir';
        if (trimmed.match(/set\s+\w+/)) return 'Transforma dado antes de armazenar';
        return '—';
    }

    gerar(): string {
        const files = this.scanner.scan('models');
        let md = '# 📦 Models\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum model encontrado._\n\n';
            md += '### 📌 O que é um Model?\n\n';
            md += 'Representa uma tabela/coleção no banco de dados e define seus campos e relacionamentos.\n\n';
            md += '```typescript\n';
            md += '@Entity()\n';
            md += 'export class User {\n';
            md += '    @PrimaryGeneratedColumn()\n';
            md += '    id: number;\n\n';
            md += '    @Column()\n';
            md += '    nome: string;\n';
            md += '}\n';
            md += '```\n';
            return md;
        }

        for (const file of files) {
            const content       = fs.readFileSync(file, 'utf-8');
            const name          = path.basename(file, '.ts');
            const fields        = this.extractFields(content);
            const accessors     = this.extractMethods(content);
            const decorators    = this.extractDecorators(content);
            const relationships = this.extractRelationships(content);
            const columns       = this.extractColumns(content);
            const codeLines     = content.split('\n').map((code, i) => ({ line: i + 1, code }));

            // ──────────────────────────────────────────────
            // # ASSUNTO
            // ──────────────────────────────────────────────
            md += `# **Assunto:** ${name}\n\n`;

            // ──────────────────────────────────────────────
            // ### O que é
            // ──────────────────────────────────────────────
            const docMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            let oQueE = `Entidade \`${name}\` — representa a tabela \`${decorators.table || name.toLowerCase()}\` no banco e define os campos que o ORM vai persistir.`;
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
            md += `Define o contrato entre o TypeScript e o banco — cada campo aqui vira coluna (ou campo no documento). `;
            md += `Sem o model, o ORM não sabe o que salvar nem como mapear os dados de volta pra objeto.\n\n`;

            // ──────────────────────────────────────────────
            // ### Fluxo
            // ──────────────────────────────────────────────
            md += `### Fluxo\n\n`;
            md += '```\n';
            md += `[objeto TypeScript: ${name}]\n`;
            md += `        ↓\n`;
            md += `[ORM: ${decorators.entity || 'TypeORM/Mongoose'} — serializa campos decorados]\n`;
            md += `        ↓\n`;
            md += `[banco de dados: tabela \`${decorators.table || name.toLowerCase()}\`]\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### Exemplo
            // ──────────────────────────────────────────────
            md += `### Exemplo\n\n`;
            md += '```typescript\n';
            md += `// Criando e salvando um ${name} via TypeORM\n`;
            md += `const repo = AppDataSource.getRepository(${name});\n`;
            if (fields.length > 0) {
                md += `const obj = repo.create({\n`;
                for (const f of fields.slice(0, 3)) {
                    md += `    ${f.name}: /* ${f.type} */,\n`;
                }
                md += `});\n`;
            } else {
                md += `const obj = repo.create({ /* campos aqui */ });\n`;
            }
            md += `await repo.save(obj);\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### 🔍 Tabela mastigada (campos)
            // ──────────────────────────────────────────────
            if (fields.length === 0) {
                md += '_Nenhum campo encontrado._\n\n';
            } else {
                md += '### 🔍 Tabela mastigada\n\n';
                md += '| Campo | Tipo TS | Coluna BD | Tipo ORM | Pra que existe |\n';
                md += '|-------|---------|-----------|----------|----------------|\n';
                for (const field of fields) {
                    const col     = columns[field.name] || null;
                    const colName = col ? col.name || field.name : field.name;
                    const ormType = col ? col.type || '—' : '—';
                    const purpose = field.name === 'id' || field.name === '_id'
                        ? 'Chave primária — identifica o registro'
                        : field.name.includes('At') || field.name.includes('Date')
                            ? 'Rastreio temporal do registro'
                            : `Dado de \`${name}\` persistido no banco`;
                    md += `| \`${field.name}\` | \`${field.type}\` | \`${colName}\` | \`${ormType}\` | ${purpose} |\n`;
                }
                md += '\n';
            }

            // Relacionamentos
            if (relationships.length > 0) {
                md += '### 🔗 Relacionamentos\n\n';
                md += '| Tipo | Campo | Entidade | O que significa |\n';
                md += '|------|-------|----------|-----------------|\n';
                for (const rel of relationships) {
                    const meaning = rel.type === 'OneToMany'
                        ? `Um \`${name}\` tem vários \`${rel.entity}\``
                        : rel.type === 'ManyToOne'
                            ? `Vários \`${name}\` pertencem a um \`${rel.entity}\``
                            : rel.type === 'ManyToMany'
                                ? `\`${name}\` e \`${rel.entity}\` se relacionam N:N`
                                : `\`${name}\` tem exatamente um \`${rel.entity}\``;
                    md += `| \`${rel.type}\` | \`${rel.field}\` | \`${rel.entity}\` | ${meaning} |\n`;
                }
                md += '\n';
            }

            // Getters e Setters
            if (accessors.getters.length > 0 || accessors.setters.length > 0) {
                md += '### 🔧 Getters e Setters\n\n';
                md += '| Elemento | O que faz | Conecta com |\n';
                md += '|----------|-----------|-------------|\n';
                for (const g of accessors.getters)
                    md += `| \`${g}\` | Lê o valor do campo | campo privado |\n`;
                for (const s of accessors.setters)
                    md += `| \`${s}\` | Define o valor do campo | campo privado |\n`;
                md += '\n';
            }

            // ──────────────────────────────────────────────
            // ### 🧠 Por baixo
            // ──────────────────────────────────────────────
            md += '### 🧠 Por baixo\n\n';
            md += '```\n';
            md += `[antes]                    [durante]                          [depois]\n`;
            md += `──────────────────         ──────────────────────────────     ──────────────────\n`;
            md += `Objeto JS simples   →      ORM lê decorators de ${name}   →  SQL gerado e\n`;
            md += `sem estrutura de BD        e mapeia campos para colunas        executado no banco\n`;
            md += '```\n\n';

            // ──────────────────────────────────────────────
            // ### ⚠️ Armadilha
            // ──────────────────────────────────────────────
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

    // ============================================
    // 🔍 EXTRAI DECORATORS DA ENTIDADE
    // ============================================
    private extractDecorators(content: string): { entity: string | null; table: string | null } {
        let entity: string | null = null;
        let table:  string | null = null;

        const entityMatch = content.match(/@Entity\s*\(\s*(?:{\s*name\s*:\s*['"]([^'"]+)['"]\s*})?\s*\)/);
        if (entityMatch) { entity = 'TypeORM'; table = entityMatch[1] || null; }

        if (content.includes('@ObjectType')) entity = 'GraphQL (TypeGraphQL)';

        if (content.includes('@Schema')) {
            entity = 'Mongoose';
            const tableMatch = content.match(/@Schema\s*\(\s*{\s*collection\s*:\s*['"]([^'"]+)['"]\s*}\s*\)/);
            if (tableMatch) table = tableMatch[1];
        }

        return { entity, table };
    }

    // ============================================
    // 🔍 EXTRAI COLUNAS COM DECORATORS
    // ============================================
    private extractColumns(content: string): { [key: string]: { name: string; type: string } } {
        const columns: { [key: string]: { name: string; type: string } } = {};

        const columnRegex = /@Column\s*\(\s*{\s*(?:name\s*:\s*['"]([^'"]+)['"])?(?:\s*,\s*type\s*:\s*['"]([^'"]+)['"])?/g;
        let match;
        while ((match = columnRegex.exec(content)) !== null) {
            const name = match[1] || '';
            const type = match[2] || '';
            const fieldMatch = content.substring(match.index).match(/\s*(\w+)\s*[:?]?\s*:\s*(\w+)/);
            if (fieldMatch) columns[fieldMatch[1]] = { name: name || fieldMatch[1], type };
        }

        const propRegex = /@Prop\s*\(\s*{\s*(?:type\s*:\s*['"]([^'"]+)['"])?/g;
        while ((match = propRegex.exec(content)) !== null) {
            const type = match[1] || '';
            const fieldMatch = content.substring(match.index).match(/\s*(\w+)\s*[:?]?\s*:/);
            if (fieldMatch && !columns[fieldMatch[1]])
                columns[fieldMatch[1]] = { name: fieldMatch[1], type };
        }

        return columns;
    }

    // ============================================
    // 🔍 EXTRAI RELACIONAMENTOS
    // ============================================
    private extractRelationships(content: string): { type: string; field: string; entity: string }[] {
        const relationships: { type: string; field: string; entity: string }[] = [];

        for (const type of ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany']) {
            const regex = new RegExp(
                `@${type}\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*(\\w+)\\s*,\\s*\\(\\s*\\w+\\s*\\)\\s*=>\\s*(\\w+)`, 'g'
            );
            let match;
            while ((match = regex.exec(content)) !== null)
                relationships.push({ type, field: match[2], entity: match[1] });
        }

        const refRegex = /@Prop\s*\(\s*{\s*type\s*:\s*\w+\.\w+,\s*ref\s*:\s*['"]([^'"]+)['"]\s*}\s*\)/g;
        let match;
        while ((match = refRegex.exec(content)) !== null) {
            const fieldMatch = content.substring(match.index).match(/\s*(\w+)\s*[:?]?\s*:/);
            if (fieldMatch) relationships.push({ type: 'Reference', field: fieldMatch[1], entity: match[1] });
        }

        return relationships;
    }

    // ============================================
    // 🔍 EXTRAI CAMPOS
    // ============================================
    private extractFields(content: string): { name: string; type: string }[] {
        const fields: { name: string; type: string }[] = [];
        const seen = new Set<string>();

        const INVALID = new Set([
            'private', 'public', 'protected', 'readonly', 'static',
            'constructor', 'return', 'this', 'super', 'void',
            'undefined', 'null', 'any', 'string', 'number', 'boolean',
            'never', 'object', 'unknown', 'function', 'Promise',
            'Request', 'Response', 'NextFunction', 'Express'
        ]);

        const regex = /(?:private|public|protected)?\s*(\w+)\s*[?!]?\s*:\s*([\w<>[\]|]+)/g;
        let match;
        while ((match = regex.exec(content)) !== null) {
            const name = match[1];
            const type = match[2];
            if (INVALID.has(name)) continue;
            if (name.length < 2) continue;
            if (seen.has(name)) continue;
            if (name[0] !== name[0].toLowerCase()) continue;
            seen.add(name);
            fields.push({ name, type });
        }

        return fields;
    }

    // ============================================
    // 🔍 EXTRAI GETTERS E SETTERS
    // ============================================
    private extractMethods(content: string): { getters: string[]; setters: string[] } {
        const getters: string[] = [];
        const setters: string[] = [];
        let match;

        const getRegex = /(?:public\s+)?get\s+(\w+)\s*\(/g;
        const setRegex = /(?:public\s+)?set\s+(\w+)\s*\(/g;

        while ((match = getRegex.exec(content)) !== null) getters.push(`get${match[1]}()`);
        while ((match = setRegex.exec(content)) !== null) setters.push(`set${match[1]}()`);

        return { getters, setters };
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
        const destino  = path.join(docsPath, 'MODELS.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📦 MODELS.md gerado!');
    }
}