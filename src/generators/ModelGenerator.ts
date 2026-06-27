import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';

export class ModelGenerator {
    private scanner = new SrcScanner();

    gerar(): string {
        const files = this.scanner.scan('models');
        let md = '# 📦 Models\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum model encontrado._\n';
            return md;
        }

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const name = path.basename(file, '.ts');
            const fields = this.extractFields(content);
            const methods = this.extractMethods(content);
            const decorators = this.extractDecorators(content);
            const relationships = this.extractRelationships(content);
            const columns = this.extractColumns(content);

            md += `## 🎯 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            // 🔥 INFORMAÇÕES DO ORM
            if (decorators.entity) {
                md += `### 🏷️ ORM: **${decorators.entity}**\n\n`;
                md += `**Tabela:** \`${decorators.table || name.toLowerCase()}\`\n\n`;
            }

            // 🔥 CAMPOS
            if (fields.length === 0) {
                md += '_Nenhum campo encontrado._\n\n';
            } else {
                md += '### 📝 Campos\n\n';
                md += '| Campo | Tipo | Coluna | ORM |\n';
                md += '|-------|------|--------|-----|\n';
                for (const field of fields) {
                    const column = columns[field.name] || null;

                    // 🔥 VERIFICA SE COLUMN EXISTE E É UM OBJETO
                    const colName = column && typeof column === 'object' ? column.name : '—';
                    const ormType = column && typeof column === 'object' ? column.type : '—';

                    md += `| \`${field.name}\` | \`${field.type}\` | \`${colName || field.name}\` | \`${ormType}\` |\n`;
                }
                md += '\n';
            }

            // 🔥 RELACIONAMENTOS
            if (relationships.length > 0) {
                md += '### 🔗 Relacionamentos\n\n';
                md += '| Tipo | Campo | Entidade |\n';
                md += '|------|-------|----------|\n';
                for (const rel of relationships) {
                    md += `| \`${rel.type}\` | \`${rel.field}\` | \`${rel.entity}\` |\n`;
                }
                md += '\n';
            }

            // 🔥 GETTERS E SETTERS
            if (methods.getters.length > 0 || methods.setters.length > 0) {
                md += '### 🔧 Getters e Setters\n\n';
                if (methods.getters.length > 0) {
                    md += '**Getters:**\n\n';
                    for (const g of methods.getters) md += `- \`${g}\`\n`;
                    md += '\n';
                }
                if (methods.setters.length > 0) {
                    md += '**Setters:**\n\n';
                    for (const s of methods.setters) md += `- \`${s}\`\n`;
                    md += '\n';
                }
            }

            // 🔥 CÓDIGO FONTE
            md += '### 📄 Código Fonte\n\n';
            md += '<details>\n';
            md += '<summary>📂 Clique para ver o código</summary>\n\n';
            md += '```typescript\n';
            md += content;
            md += '\n```\n\n';
            md += '</details>\n\n';
            md += '---\n\n';
        }

        return md;
    }

    // ============================================
    // 🔍 EXTRAI DECORATORS DA ENTIDADE
    // ============================================
    private extractDecorators(content: string): {
        entity: string | null;
        table: string | null;
    } {
        let entity: string | null = null;
        let table: string | null = null;

        // Entity: @Entity() ou @Entity({ name: 'tabela' })
        const entityMatch = content.match(/@Entity\s*\(\s*(?:{\s*name\s*:\s*['"]([^'"]+)['"]\s*})?\s*\)/);
        if (entityMatch) {
            entity = 'TypeORM';
            table = entityMatch[1] || null;
        }

        // ObjectType: @ObjectType() (GraphQL)
        if (content.includes('@ObjectType')) {
            entity = 'GraphQL (TypeGraphQL)';
        }

        // Schema: @Schema() (Mongoose)
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

        // TypeORM: @Column({ name: 'coluna', type: 'varchar' })
        const columnRegex = /@Column\s*\(\s*{\s*(?:name\s*:\s*['"]([^'"]+)['"])?(?:\s*,\s*type\s*:\s*['"]([^'"]+)['"])?/g;
        let match;
        while ((match = columnRegex.exec(content)) !== null) {
            const name = match[1] || '';
            const type = match[2] || '';
            // Tenta encontrar o campo abaixo
            const fieldMatch = content.substring(match.index).match(/\s*(\w+)\s*[:?]?\s*:\s*(\w+)/);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                columns[fieldName] = { name: name || fieldName, type };
            }
        }

        // Mongoose: @Prop({ ... })
        const propRegex = /@Prop\s*\(\s*{\s*(?:type\s*:\s*['"]([^'"]+)['"])?/g;
        while ((match = propRegex.exec(content)) !== null) {
            const type = match[1] || '';
            const fieldMatch = content.substring(match.index).match(/\s*(\w+)\s*[:?]?\s*:/);
            if (fieldMatch) {
                const fieldName = fieldMatch[1];
                if (!columns[fieldName]) {
                    columns[fieldName] = { name: fieldName, type };
                }
            }
        }

        return columns;
    }

    // ============================================
    // 🔍 EXTRAI RELACIONAMENTOS
    // ============================================
    private extractRelationships(content: string): { type: string; field: string; entity: string }[] {
        const relationships: { type: string; field: string; entity: string }[] = [];

        const types = ['OneToOne', 'OneToMany', 'ManyToOne', 'ManyToMany'];
        for (const type of types) {
            const regex = new RegExp(`@${type}\\s*\\(\\s*\\(\\s*\\)\\s*=>\\s*(\\w+)\\s*,\\s*\\(\\s*\\w+\\s*\\)\\s*=>\\s*(\\w+)`, 'g');
            let match;
            while ((match = regex.exec(content)) !== null) {
                const entity = match[1];
                const field = match[2];
                relationships.push({ type, field, entity });
            }
        }

        // Mongoose: @Prop({ type: Types.ObjectId, ref: 'Entity' })
        const refRegex = /@Prop\s*\(\s*{\s*type\s*:\s*\w+\.\w+,\s*ref\s*:\s*['"]([^'"]+)['"]\s*}\s*\)/g;
        let match;
        while ((match = refRegex.exec(content)) !== null) {
            const entity = match[1];
            const fieldMatch = content.substring(match.index).match(/\s*(\w+)\s*[:?]?\s*:/);
            if (fieldMatch) {
                relationships.push({
                    type: 'Reference',
                    field: fieldMatch[1],
                    entity
                });
            }
        }

        return relationships;
    }

    // ============================================
    // 🔍 EXTRAI CAMPOS (PRIVADOS/PUBLICOS)
    // ============================================
    private extractFields(content: string): { name: string; type: string }[] {
    const fields: { name: string; type: string }[] = [];
    const seen = new Set<string>();

    // 🔥 CORRIGIDO: Captura campos COM ou SEM modificador
    // Ex: id: number, private id: number, public nome: string
    const regex = /(?:private|public|protected)?\s*(\w+)\s*[?!]?\s*:\s*([\w<>[\]|]+)/g;

    const INVALID = new Set([
        'private', 'public', 'protected', 'readonly', 'static',
        'constructor', 'return', 'this', 'super', 'void',
        'undefined', 'null', 'any', 'string', 'number', 'boolean',
        'never', 'object', 'unknown', 'function', 'Promise',
        'Request', 'Response', 'NextFunction', 'Express'
    ]);

    let match;
    while ((match = regex.exec(content)) !== null) {
        const name = match[1];
        const type = match[2];

        if (INVALID.has(name)) continue;
        if (name.length < 2) continue;
        if (seen.has(name)) continue;
        // 🔥 IGNORA NOMES QUE PARECEM TIPOS (começam com maiúscula)
        if (name[0] === name[0].toUpperCase()) continue;

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

        const getRegex = /(?:public\s+)?get(\w+)\s*\(/g;
        const setRegex = /(?:public\s+)?set(\w+)\s*\(/g;
        let match;

        while ((match = getRegex.exec(content)) !== null) getters.push(`get${match[1]}()`);
        while ((match = setRegex.exec(content)) !== null) setters.push(`set${match[1]}()`);

        return { getters, setters };
    }

    // ============================================
    // 💾 SALVAR
    // ============================================
    async salvar(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) {
            vscode.window.showErrorMessage('Nenhum workspace aberto!');
            return;
        }

        const root = folders[0].uri.fsPath;
        const docsPath = path.join(root, 'docs');
        if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });

        const conteudo = this.gerar();
        const destino = path.join(docsPath, 'MODELS.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📦 MODELS.md gerado!');
    }
}