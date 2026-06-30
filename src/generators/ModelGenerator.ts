import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';

export class ModelGenerator {
    private scanner = new SrcScanner();

    // ============================================
    // 🔍 DETECTA ARMADILHAS
    // ============================================
    private detectWarnings(content: string, fields: { name: string; type: string }[]): string[] {
        const warnings: string[] = [];
        if (!content.includes('@PrimaryGeneratedColumn') && !content.includes('@PrimaryColumn') && !content.includes('_id'))
            warnings.push('Sem chave primária detectada — TypeORM/Mongoose pode rejeitar a entidade');
        const hasNullable = fields.some(f => f.type.includes('null') || f.type.includes('undefined'));
        if (hasNullable && !content.includes('nullable: true'))
            warnings.push('Campo nullable no TS mas sem `nullable: true` no decorator — banco pode rejeitar null');
        if (content.includes('any'))
            warnings.push('Tipo `any` encontrado — perde segurança de tipo no ORM');
        return warnings;
    }

    gerar(): string {
        const files = this.scanner.scan('models');
        let md = '# 📦 Models\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum model encontrado._\n\n';
            md += '### 📌 O que é um Model?\n\n';
            md += 'Representa uma tabela/coleção no banco de dados e seus campos.\n\n';
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
            const warnings      = this.detectWarnings(content, fields);

            md += `## 📦 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            // Descrição do JSDoc da classe
            const docMatch = content.match(/\/\*\*([\s\S]*?)\*\//);
            if (docMatch) {
                const desc = docMatch[1]
                    .split('\n')
                    .map(l => l.trim().replace(/^\*/, '').trim())
                    .filter(l => l && !l.startsWith('@'))
                    .join(' ');
                md += `### O que é\n${desc}\n\n`;
            }

            // ORM e tabela
            if (decorators.entity) {
                md += '### Fluxo\n\n';
                md += '```\n';
                md += `classe ${name} → ORM: ${decorators.entity} → tabela: ${decorators.table || name.toLowerCase()}\n`;
                md += '```\n\n';
            }

            // Campos
            if (fields.length === 0) {
                md += '_Nenhum campo encontrado._\n\n';
            } else {
                md += '### 🔍 Tabela mastigada\n\n';
                md += '| Campo | Tipo TS | Coluna BD | Tipo ORM |\n';
                md += '|-------|---------|-----------|----------|\n';
                for (const field of fields) {
                    const col    = columns[field.name] || null;
                    const colName = col ? col.name || field.name : field.name;
                    const ormType = col ? col.type || '—' : '—';
                    md += `| \`${field.name}\` | \`${field.type}\` | \`${colName}\` | \`${ormType}\` |\n`;
                }
                md += '\n';
            }

            // Relacionamentos
            if (relationships.length > 0) {
                md += '### 🔗 Relacionamentos\n\n';
                md += '| Tipo | Campo | Entidade |\n';
                md += '|------|-------|----------|\n';
                for (const rel of relationships) {
                    md += `| \`${rel.type}\` | \`${rel.field}\` | \`${rel.entity}\` |\n`;
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

            // Armadilhas
            if (warnings.length > 0) {
                md += '### ⚠️ Armadilha\n\n';
                md += '```\n';
                for (const w of warnings) md += `❌ ${w}\n`;
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