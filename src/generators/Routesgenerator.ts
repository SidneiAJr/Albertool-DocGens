import * as vscode from 'vscode';
import * as fs from 'fs';
import * as nodePath from 'path';  // ← renomeado pra evitar conflito
import { RouteParser } from '../parsers/RouteParser';
import { SrcScanner } from '../scanner/SrcScanner';

export class RoutesGenerator {
    private routeParser = new RouteParser();
    private scanner = new SrcScanner();

    gerar(): string {
        const allFiles = this.scanner.scanAll();
        let md = '# 🌐 Rotas da API\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

        let totalRoutes = 0;
        const allRoutes: any[] = [];

        for (const [, fileList] of Object.entries(allFiles)) {
            for (const file of fileList) {
                let content: string;
                try { content = fs.readFileSync(file, 'utf-8'); }
                catch { continue; }

                const routes = this.routeParser.parse(content);
                for (const route of routes) {
                    allRoutes.push({
                        ...route,
                        file: nodePath.basename(file),  // ← nodePath, sem conflito
                    });
                    totalRoutes++;
                }
            }
        }

        if (totalRoutes === 0) {
            md += '_Nenhuma rota encontrada._\n\n';
            md += '### 📌 Como adicionar rotas\n\n';
            md += '```typescript\n';
            md += 'app.get("/users", UserController.index);\n';
            md += 'app.post("/users", UserController.create);\n';
            md += 'app.put("/users/:id", UserController.update);\n';
            md += 'app.delete("/users/:id", UserController.delete);\n';
            md += '```\n';
            return md;
        }

        // Agrupa por método HTTP
        const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        const grouped: { [key: string]: any[] } = {};
        for (const route of allRoutes) {
            if (!grouped[route.method]) grouped[route.method] = [];
            grouped[route.method].push(route);
        }

        for (const method of methodOrder) {
            if (!grouped[method]) continue;
            md += `## ${method}\n\n`;
            md += '| Rota | Handler | Arquivo |\n';
            md += '|------|---------|--------|\n';
            for (const route of grouped[method]) {
                const routePath = route.path || '/';        // ← variável renomeada
                const handler   = route.handler || '—';
                const fileName  = route.file    || '—';
                md += `| \`${routePath}\` | \`${handler}\` | \`${fileName}\` |\n`;
            }
            md += '\n';
        }

        md += '## 📊 Estatísticas\n\n';
        md += `- **Total de rotas:** ${totalRoutes}\n\n`;
        md += '| Método | Quantidade |\n';
        md += '|--------|------------|\n';
        for (const method of methodOrder) {
            md += `| ${method} | ${grouped[method]?.length || 0} |\n`;
        }

        return md;
    }

    async salvar(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return; }
        const root = folders[0].uri.fsPath;
        const docsPath = nodePath.join(root, 'docs');
        if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });
        const conteudo = this.gerar();
        const destino = nodePath.join(docsPath, 'ROUTES.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');
        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('🌐 ROUTES.md gerado!');
    }
}