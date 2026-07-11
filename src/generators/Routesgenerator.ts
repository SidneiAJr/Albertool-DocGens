import * as vscode from 'vscode';
import * as fs from 'fs';
import * as nodePath from 'path';
import { RouteParser } from '../parsers/RouteParser';
import { SrcScanner } from '../scanner/SrcScanner';

export class RoutesGenerator {
    private routeParser = new RouteParser();
    private scanner     = new SrcScanner();

    // ============================================
    // 🔍 DETECTA ARMADILHAS NAS ROTAS
    // ============================================

    // ============================================
    // 🔍 DESCREVE O QUE CADA MÉTODO HTTP FAZ
    // ============================================
    private describeMethod(method: string): string {
        const map: Record<string, string> = {
            GET:    'Lê recurso sem efeito colateral',
            POST:   'Cria novo recurso',
            PUT:    'Substitui recurso inteiro',
            PATCH:  'Atualiza campos específicos',
            DELETE: 'Remove recurso',
        };
        return map[method] || 'Operação HTTP';
    }

    // ============================================
    // 🔍 INFERE O PROPÓSITO DA ROTA PELO PATH
    // ============================================
    private describeRoutePurpose(method: string, routePath: string): string {
        const hasId = routePath.includes(':');
        if (method === 'GET' && !hasId) return 'Listar todos os recursos';
        if (method === 'GET' && hasId)  return 'Buscar recurso específico por id';
        if (method === 'POST')           return 'Criar novo recurso';
        if (method === 'PUT')            return 'Substituir recurso completo';
        if (method === 'PATCH')          return 'Atualizar campos do recurso';
        if (method === 'DELETE')         return 'Remover recurso';
        return 'Operação no recurso';
    }

    gerar(): string {
        const allFiles = this.scanner.scanAll();
        let md = '# 🌐 Rotas da API\n\n';
        md += '> Gerado automaticamente pelo **Albertool DocGen**\n\n';
        md += '---\n\n';

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
                        file: nodePath.basename(file),
                    });
                }
            }
        }

        if (allRoutes.length === 0) {
            md += '_Nenhuma rota encontrada._\n\n';
            md += '### 📌 O que é uma Rota?\n\n';
            md += 'Ponto de entrada da API — define qual URL chama qual controller.\n\n';
            md += '```typescript\n';
            md += 'app.get("/users", UserController.index);\n';
            md += 'app.post("/users", UserController.create);\n';
            md += 'app.put("/users/:id", UserController.update);\n';
            md += 'app.delete("/users/:id", UserController.delete);\n';
            md += '```\n';
            return md;
        }

        const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

        const grouped: { [key: string]: any[] } = {};
        for (const route of allRoutes) {
            if (!grouped[route.method]) grouped[route.method] = [];
            grouped[route.method].push(route);
        }

        // ──────────────────────────────────────────────
        // # ASSUNTO
        // ──────────────────────────────────────────────
        md += `# **Assunto:** Mapa de Rotas da API\n\n`;

        // ──────────────────────────────────────────────
        // ### O que é
        // ──────────────────────────────────────────────
        md += `### O que é\n`;
        md += `Mapa completo de endpoints disponíveis — cada rota é um contrato entre o cliente e o servidor.\n\n`;

        // ──────────────────────────────────────────────
        // ### Pra que serve
        // ──────────────────────────────────────────────
        md += `### Pra que serve\n`;
        md += `Centraliza todos os endpoints num único lugar — `;
        md += `sem precisar abrir cada arquivo pra saber o que a API expõe. `;
        md += `${allRoutes.length} rota${allRoutes.length > 1 ? 's' : ''} mapeada${allRoutes.length > 1 ? 's' : ''} em ${Object.keys(grouped).length} método${Object.keys(grouped).length > 1 ? 's' : ''} HTTP.\n\n`;

        // ──────────────────────────────────────────────
        // ### Fluxo
        // ──────────────────────────────────────────────
        md += `### Fluxo\n\n`;
        md += '```\n';
        md += `[cliente faz requisição HTTP]\n`;
        md += `        ↓\n`;
        md += `[rota casa com método + path]\n`;
        md += `        ↓\n`;
        md += `[middleware (se houver) → controller → service → resposta]\n`;
        md += '```\n\n';

        // ──────────────────────────────────────────────
        // ### Exemplo
        // ──────────────────────────────────────────────
        md += `### Exemplo\n\n`;
        md += '```typescript\n';
        const exRoute = allRoutes[0];
        if (exRoute) {
            md += `// Chamada típica pra rota ${exRoute.method} ${exRoute.path}\n`;
            if (exRoute.method === 'GET') {
                md += `const response = await fetch('${exRoute.path}');\n`;
                md += `const data = await response.json();\n`;
            } else if (exRoute.method === 'POST') {
                md += `const response = await fetch('${exRoute.path}', {\n`;
                md += `    method: 'POST',\n`;
                md += `    headers: { 'Content-Type': 'application/json' },\n`;
                md += `    body: JSON.stringify({ /* payload */ }),\n`;
                md += `});\n`;
            } else {
                md += `const response = await fetch(\`${exRoute.path.replace(':id', '\${id}')}\`, {\n`;
                md += `    method: '${exRoute.method}',\n`;
                md += `});\n`;
            }
        }
        md += '```\n\n';

        // ──────────────────────────────────────────────
        // ### 🔍 Tabela mastigada (rotas por método)
        // ──────────────────────────────────────────────
        md += '### 🔍 Tabela mastigada\n\n';
        md += '| Método | Rota | Handler | Arquivo | O que faz | Propósito |\n';
        md += '|--------|------|---------|---------|-----------|----------|\n';
        for (const method of methodOrder) {
            if (!grouped[method]) continue;
            for (const route of grouped[method]) {
                const routePath = route.path    || '/';
                const handler   = route.handler || '—';
                const fileName  = route.file    || '—';
                const what      = this.describeMethod(method);
                const purpose   = this.describeRoutePurpose(method, routePath);
                md += `| \`${method}\` | \`${routePath}\` | \`${handler}\` | \`${fileName}\` | ${what} | ${purpose} |\n`;
            }
        }
        md += '\n';

        // ──────────────────────────────────────────────
        // ### 🧠 Por baixo (por grupo de método)
        // ──────────────────────────────────────────────
        md += '### 🧠 Por baixo\n\n';
        md += '```\n';
        md += `[antes]                    [durante]                          [depois]\n`;
        md += `──────────────────         ──────────────────────────────     ──────────────────\n`;
        md += `URL + método chega  →      Express casa com rota registrada →  Controller executa\n`;
        md += `no servidor                e executa middlewares na fila        e devolve resposta\n`;
        md += '```\n\n';

        // ──────────────────────────────────────────────
        // ### ⚠️ Armadilha
        // ──────────────────────────────────────────────
        // ──────────────────────────────────────────────
        // ### 📊 Estatísticas
        // ──────────────────────────────────────────────
        md += '### 📊 Estatísticas\n\n';
        md += `**Total de rotas:** ${allRoutes.length}\n\n`;
        md += '| Método | Qtd | O que representa |\n';
        md += '|--------|-----|------------------|\n';
        for (const method of methodOrder) {
            const qty = grouped[method]?.length || 0;
            if (qty === 0) continue;
            md += `| \`${method}\` | ${qty} | ${this.describeMethod(method)} |\n`;
        }
        md += '\n';

        // ──────────────────────────────────────────────
        // ### Rotas detalhadas por método HTTP
        // ──────────────────────────────────────────────
        md += '### 📋 Rotas detalhadas\n\n';
        for (const method of methodOrder) {
            if (!grouped[method]) continue;
            const emoji = { GET: '🔵', POST: '🟢', PUT: '🟡', PATCH: '🟠', DELETE: '🔴' }[method] || '⚪';
            md += `#### ${emoji} ${method}\n\n`;
            md += '| Rota | Handler | Arquivo |\n';
            md += '|------|---------|---------|\n';
            for (const route of grouped[method]) {
                const routePath = route.path    || '/';
                const handler   = route.handler || '—';
                const fileName  = route.file    || '—';
                md += `| \`${routePath}\` | \`${handler}\` | \`${fileName}\` |\n`;
            }
            md += '\n';
        }

        md += '---\n\n';
        return md;
    }

    async salvar(): Promise<void> {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders) { vscode.window.showErrorMessage('Nenhum workspace aberto!'); return; }

        const root     = folders[0].uri.fsPath;
        const docsPath = nodePath.join(root, 'docs');
        if (!fs.existsSync(docsPath)) fs.mkdirSync(docsPath, { recursive: true });

        const conteudo = this.gerar();
        const destino  = nodePath.join(docsPath, 'ROUTES.md');
        fs.writeFileSync(destino, conteudo, 'utf-8');

        const doc = await vscode.workspace.openTextDocument(destino);
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('🌐 ROUTES.md gerado!');
    }
}