import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { SrcScanner } from '../scanner/SrcScanner';
import { MethodParser } from '../parsers/MethodParser';

export class RepositoryGenerator {
    private scanner = new SrcScanner();
    private parser = new MethodParser();

    gerar(): string {
        const files = this.scanner.scan('repositories');
        let md = '# 🗄️ Repositories\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        if (files.length === 0) {
            md += '_Nenhum repository encontrado._\n';
            return md;
        }

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            const methods = this.parser.parse(content);
            const name = path.basename(file, '.ts');

            md += `## 🎯 ${name}\n\n`;
            md += `**Arquivo:** \`${path.basename(file)}\`\n\n`;

            // 🔥 IDENTIFICA O TIPO DE REPOSITORY
            const repoType = this.detectRepositoryType(content);
            md += `**Tipo:** \`${repoType}\`\n\n`;

            // 🔥 IDENTIFICA A ENTIDADE
            const entity = this.extractEntity(content);
            md += `**Entidade:** \`${entity}\`\n\n`;

            // 🔥 EXTRAI QUERIES SQL (se houver)
            const queries = this.extractQueries(content);
            if (queries.length > 0) {
                md += '### 📝 Queries SQL\n\n';
                md += '| Query | Descrição |\n';
                md += '|-------|-----------|\n';
                for (const q of queries) {
                    md += `| \`${q.sql}\` | ${q.description || ''} |\n`;
                }
                md += '\n';
            }

            // 🔥 MÉTODOS DO TYPEORM (se houver)
            const ormMethods = this.extractOrmMethods(content);
            if (ormMethods.length > 0) {
                md += '### 🔧 Métodos TypeORM\n\n';
                md += '| Método | Descrição |\n';
                md += '|--------|-----------|\n';
                for (const m of ormMethods) {
                    md += `| \`${m.name}\` | ${m.description || ''} |\n`;
                }
                md += '\n';
            }

            // 🔥 MÉTODOS DO REPOSITORY
            if (methods.length === 0) {
                md += '_Nenhum método encontrado._\n\n';
            } else {
                md += '### 📋 Métodos\n\n';
                md += '| Método | Parâmetros | Retorno | Descrição |\n';
                md += '|--------|------------|---------|-----------|\n';
                for (const method of methods) {
                    const params = method.params?.join(', ') || '—';
                    const returnType = method.returnType || '—';
                    md += `| \`${method.name}\` | \`${params}\` | \`${returnType}\` | ${method.description || ''} |\n`;
                }
                md += '\n';
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
    // 🔍 EXTRAI A ENTIDADE
    // ============================================
    private extractEntity(content: string): string {
        // TypeORM: getRepository(Usuario)
        const typeormMatch = content.match(/getRepository\s*\(\s*(\w+)\s*\)/);
        if (typeormMatch) return typeormMatch[1];

        // Prisma: prisma.user
        const prismaMatch = content.match(/prisma\.(\w+)/);
        if (prismaMatch) return prismaMatch[1];

        // Mongoose: model('User')
        const mongooseMatch = content.match(/model\s*\(\s*['"](\w+)['"]\s*\)/);
        if (mongooseMatch) return mongooseMatch[1];

        // Query: FROM usuarios
        const queryMatch = content.match(/FROM\s+(\w+)/i);
        if (queryMatch) return queryMatch[1];

        // Repository<Usuario>
        const repoMatch = content.match(/Repository<(\w+)>/);
        if (repoMatch) return repoMatch[1];

        return 'Não especificado';
    }

    // ============================================
    // 🔍 EXTRAI QUERIES SQL (query bruta)
    // ============================================
    private extractQueries(content: string): { sql: string; description: string }[] {
        const queries: { sql: string; description: string }[] = [];

        // SELECT, INSERT, UPDATE, DELETE
        const sqlRegex = /(?:await\s+pool\.query|await\s+connection\.query)\s*\(\s*['"]([^'"]+)['"]/g;
        let match;
        while ((match = sqlRegex.exec(content)) !== null) {
            const sql = match[1];
            // Tenta encontrar descrição no JSDoc
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

        const methodNames = ['find', 'findOne', 'findOneBy', 'findBy', 'save', 'create', 'update', 'delete', 'remove', 'findAndCount', 'count', 'findAll'];

        for (const methodName of methodNames) {
            const regex = new RegExp(`await\\s+this\\.repo\\.${methodName}\\s*\\(`, 'g');
            let match;
            while ((match = regex.exec(content)) !== null) {
                let description = '';
                const jsdocMatch = content.substring(0, match.index).match(/\/\*\*([\s\S]*?)\*\//);
                if (jsdocMatch) {
                    const lines = jsdocMatch[1].split('\n').map(l => l.trim().replace(/^\*/, '').trim());
                    description = lines.filter(l => l && !l.startsWith('@')).join(' ').trim();
                }
                methods.push({ name: methodName, description });
            }
        }

        return methods;
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
        if (!fs.existsSync(docsPath)) {
            fs.mkdirSync(docsPath, { recursive: true });
        }

        const conteudo = this.gerar();
        const destino = path.join(docsPath, 'REPOSITORIES.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('🗄️ REPOSITORIES.md gerado!');
    }
}