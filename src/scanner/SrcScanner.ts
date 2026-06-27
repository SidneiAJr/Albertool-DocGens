import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export class SrcScanner {
    private root: string | null = null;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        this.root = folders ? folders[0].uri.fsPath : null;
    }

    // Cache por caminho real resolvido — evita duplicar quando
    // 'controllers' e 'controller' apontam pra mesma pasta
    private cache: Map<string, string[]> = new Map();

    scan(folder: string): string[] {
        if (!this.root) return [];

        const possiblePaths = [
            path.join(this.root, 'src', folder),
            path.join(this.root, 'src', folder.toLowerCase()),
            path.join(this.root, 'src', folder.charAt(0).toUpperCase() + folder.slice(1)),
            path.join(this.root, 'src', folder.replace(/s$/, '')),
            path.join(this.root, 'src', folder + 's'),
        ];

        // Remove duplicatas de caminho antes de procurar
        const uniquePaths = [...new Set(possiblePaths)];

        for (const targetPath of uniquePaths) {
            if (!fs.existsSync(targetPath)) continue;

            // Usa o caminho real resolvido como chave do cache
            const realPath = fs.realpathSync(targetPath);
            if (this.cache.has(realPath)) {
                return this.cache.get(realPath)!;
            }

            const files: string[] = [];
            const entries = fs.readdirSync(realPath);
            for (const entry of entries) {
                const fullPath = path.join(realPath, entry);
                const stat = fs.statSync(fullPath);
                if (stat.isFile() && (entry.endsWith('.ts') || entry.endsWith('.js'))) {
                    files.push(fullPath);
                }
            }

            this.cache.set(realPath, files);
            return files;
        }

        return [];
    }

    scanAll(): { [key: string]: string[] } {
        const result: { [key: string]: string[] } = {};

        const folderMap: { [key: string]: string[] } = {
            'controllers':  ['controllers', 'controller'],
            'services':     ['services',    'service'],
            'models':       ['models',      'model'],
            'repositories': ['repositories','repository'],
            'middlewares':  ['middlewares', 'middleware'],
            'schemas':      ['schemas',     'schema'],
            'utils':        ['utils',       'util'],
            'routes':       ['routes',      'route'],
            'config':       ['config'],
            'errors':       ['errors',      'error'],
        };

        // Rastreia arquivos já adicionados globalmente
        const globalSeen = new Set<string>();

        for (const [key, variations] of Object.entries(folderMap)) {
            const allFiles: string[] = [];

            for (const variation of variations) {
                const files = this.scan(variation);
                for (const file of files) {
                    if (!globalSeen.has(file)) {
                        globalSeen.add(file);
                        allFiles.push(file);
                    }
                }
            }

            if (allFiles.length > 0) {
                result[key] = allFiles;
            }
        }

        return result;
    }

    scanByType(type: string): string[] {
        const all = this.scanAll();

        const typeMap: { [key: string]: string } = {
            'controller': 'controllers',
            'middleware': 'middlewares',
            'service':    'services',
            'model':      'models',
            'repository': 'repositories',
            'schema':     'schemas',
            'route':      'routes',
            'util':       'utils',
        };

        const targetKey = typeMap[type] || type + 's';
        return all[targetKey] || [];
    }

    clearCache(): void {
        this.cache.clear();
    }
}