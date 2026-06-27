import * as fs from 'fs';
import * as path from 'path';

export interface DependencyInfo {
    name: string;
    version: string;
    type: 'dependency' | 'devDependency';
    isUsed: boolean;
}

export class DependencyParser {
    parsePackageJson(root: string): DependencyInfo[] {
        const pkgPath = path.join(root, 'package.json');
        if (!fs.existsSync(pkgPath)) return [];

        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
            const deps: DependencyInfo[] = [];

            // Dependências principais
            if (pkg.dependencies) {
                for (const [name, version] of Object.entries(pkg.dependencies)) {
                    deps.push({
                        name,
                        version: version as string,
                        type: 'dependency',
                        isUsed: this.isUsedInProject(root, name)
                    });
                }
            }

            // Dependências de desenvolvimento
            if (pkg.devDependencies) {
                for (const [name, version] of Object.entries(pkg.devDependencies)) {
                    deps.push({
                        name,
                        version: version as string,
                        type: 'devDependency',
                        isUsed: this.isUsedInProject(root, name)
                    });
                }
            }

            return deps;
        } catch {
            return [];
        }
    }

    private isUsedInProject(root: string, packageName: string): boolean {
        const srcPath = path.join(root, 'src');
        if (!fs.existsSync(srcPath)) return false;

        const files = this.getAllFiles(srcPath);
        const importRegex = new RegExp(`(?:require\\(['"]${packageName}['"]\\)|from\\s+['"]${packageName}['"])`);

        for (const file of files) {
            const content = fs.readFileSync(file, 'utf-8');
            if (importRegex.test(content)) {
                return true;
            }
        }

        return false;
    }

    private getAllFiles(dir: string): string[] {
        const files: string[] = [];
        const entries = fs.readdirSync(dir);

        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                files.push(...this.getAllFiles(fullPath));
            } else if (entry.endsWith('.ts') || entry.endsWith('.js')) {
                files.push(fullPath);
            }
        }

        return files;
    }
}