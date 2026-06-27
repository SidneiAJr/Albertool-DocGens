import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

const LIB_DESCRIPTIONS: { [key: string]: string } = {
    'express':              'Framework HTTP para Node.js',
    'typeorm':              'ORM para TypeScript e JavaScript',
    'mysql2':               'Driver MySQL para Node.js',
    'pg':                   'Driver PostgreSQL para Node.js',
    'mongodb':              'Driver oficial do MongoDB',
    'mongoose':             'ODM para MongoDB',
    'jsonwebtoken':         'Geração e validação de tokens JWT',
    'bcrypt':               'Hash de senhas com salt',
    'bcryptjs':             'Hash de senhas (versão JS pura)',
    'zod':                  'Validação de schemas com TypeScript',
    'dotenv':               'Carregamento de variáveis de ambiente',
    'helmet':               'Headers HTTP de segurança',
    'cors':                 'Configuração de CORS',
    'express-rate-limit':   'Rate limiting por IP',
    'winston':              'Logger estruturado para Node.js',
    'speakeasy':            'Autenticação de dois fatores (2FA/TOTP)',
    'qrcode':               'Geração de QR Codes',
    'nodemailer':           'Envio de emails via SMTP',
    'multer':               'Upload de arquivos multipart/form-data',
    'axios':                'Cliente HTTP baseado em Promises',
    'uuid':                 'Geração de UUIDs',
    'dayjs':                'Manipulação de datas leve',
    'moment':               'Manipulação de datas',
    'lodash':               'Utilitários para JavaScript',
    'reflect-metadata':     'Suporte a decorators e metadata (TypeORM)',
    'cookie-parser':        'Parse de cookies nas requisições',
    'compression':          'Compressão gzip para respostas HTTP',
    'morgan':               'Logger de requisições HTTP',
    'swagger-ui-express':   'Interface Swagger para documentação de API',
    'class-validator':      'Validação via decorators',
    'class-transformer':    'Transformação de objetos com decorators',
}

const DEVLIB_DESCRIPTIONS: { [key: string]: string } = {
    'typescript':           'Superset tipado do JavaScript',
    'ts-node':              'Execução de TypeScript sem compilar',
    'ts-node-dev':          'Hot reload para TypeScript',
    'nodemon':              'Reinício automático do servidor',
    'eslint':               'Linter para JavaScript/TypeScript',
    'prettier':             'Formatador de código',
    '@types/node':          'Tipos do Node.js para TypeScript',
    '@types/express':       'Tipos do Express para TypeScript',
    '@types/bcrypt':        'Tipos do bcrypt para TypeScript',
    '@types/jsonwebtoken':  'Tipos do JWT para TypeScript',
    '@types/cors':          'Tipos do CORS para TypeScript',
    '@types/multer':        'Tipos do Multer para TypeScript',
    'jest':                 'Framework de testes',
    'ts-jest':              'Suporte a TypeScript no Jest',
    '@types/jest':          'Tipos do Jest para TypeScript',
    'supertest':            'Testes de integração HTTP',
    '@vscode/vsce':         'Empacotamento de extensões VSCode',
    '@types/vscode':        'Tipos da API do VSCode',
}

export class LibsGenerator {
    private getRoot(): string | null {
        const folders = vscode.workspace.workspaceFolders;
        return folders ? folders[0].uri.fsPath : null;
    }

    gerar(): string {
        const root = this.getRoot();
        if (!root) return '';

        const pkgPath = path.join(root, 'package.json');
        let pkg: any = {};
        try {
            pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        } catch {
            return '# 📦 Dependências\n\n_package.json não encontrado._\n';
        }

        const deps    = pkg.dependencies    || {};
        const devDeps = pkg.devDependencies || {};

        let md = `# 📦 Dependências do Projeto\n\n`;
        md += `> Gerado automaticamente pelo **Albertool DocGen**\n\n`;
        md += `---\n\n`;

        // Produção
        if (Object.keys(deps).length > 0) {
            md += `## 🚀 Produção\n\n`;
            md += `| Lib | Versão | Descrição |\n`;
            md += `|-----|--------|-----------|\n`;
            for (const [name, version] of Object.entries(deps)) {
                const desc = LIB_DESCRIPTIONS[name] || 'Sem descrição';
                md += `| \`${name}\` | \`${version}\` | ${desc} |\n`;
            }
            md += `\n---\n\n`;
        }

        // Desenvolvimento
        if (Object.keys(devDeps).length > 0) {
            md += `## 🛠️ Desenvolvimento\n\n`;
            md += `| Lib | Versão | Descrição |\n`;
            md += `|-----|--------|-----------|\n`;
            for (const [name, version] of Object.entries(devDeps)) {
                const desc = DEVLIB_DESCRIPTIONS[name] || 'Sem descrição';
                md += `| \`${name}\` | \`${version}\` | ${desc} |\n`;
            }
            md += `\n---\n\n`;
        }

        md += `> Total: **${Object.keys(deps).length}** produção | **${Object.keys(devDeps).length}** desenvolvimento\n`;
        return md;
    }

    async salvar(): Promise<void> {
        const root = this.getRoot();
        if (!root) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return; }

        const docsPath = path.join(root, 'docs');
        if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });

        const conteudo = this.gerar();
        const destino  = path.join(docsPath, 'LIBS.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');
        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('📦 LIBS.md gerado!');
    }
}