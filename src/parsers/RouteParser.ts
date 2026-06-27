export interface RouteInfo {
    method: string;
    path: string;
    handler: string;
    description?: string;
}

export class RouteParser {
    parse(content: string): RouteInfo[] {
        const routes: RouteInfo[] = [];
        const seen = new Set<string>();

        // 🔥 CAPTURA ROTAS EXPRESS (MELHORADO)
        const expressRegex = /(?:app|router|express)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,([\s\S]*?)\)/g;

        let match;
        while ((match = expressRegex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const route = match[2];
            const argsPart = match[3];

            // 🔥 LIMPA E DIVIDE OS ARGUMENTOS
            const args = argsPart
                .split(',')
                .map(a => a.trim())
                .filter(a => a && !a.includes('=>') && !a.includes('function'));

            // 🔥 PEGA O ÚLTIMO ARGUMENTO (handler)
            let handler = args[args.length - 1] || '—';

            // 🔥 LIMPA O HANDLER
            handler = handler
                .replace(/\.bind\(.*?\)/g, '')      // remove .bind()
                .replace(/\(.*?\)/g, '')            // remove parênteses extras
                .replace(/;\s*$/, '')               // remove ; no final
                .replace(/async\s+/g, '')           // remove async
                .trim();

            // 🔥 SE O HANDLER FOR UMA ARROW FUNCTION, PULA
            if (handler.includes('=>') || handler.includes('function')) {
                // Tenta extrair o nome da função
                const funcMatch = handler.match(/(?:function\s+)?(\w+)\s*\(/);
                if (funcMatch) {
                    handler = funcMatch[1];
                } else {
                    continue;
                }
            }

            // 🔥 SE O HANDLER FOR UM OBJETO (ex: UserController), pega o nome
            if (handler.includes('.')) {
                const parts = handler.split('.');
                handler = parts[parts.length - 1] || handler;
            }

            const key = `${method}:${route}`;
            if (seen.has(key)) continue;
            seen.add(key);

            // 🔥 TENTA EXTRAIR DESCRIÇÃO DO JSDOC
            const jsdocMatch = content.substring(0, match.index).match(/\/\*\*([\s\S]*?)\*\//);
            let description = '';
            if (jsdocMatch) {
                const lines = jsdocMatch[1].split('\n').map(l => l.trim().replace(/^\*/, '').trim());
                description = lines.filter(l => l && !l.startsWith('@')).join(' ').trim();
            }

            routes.push({
                method,
                path: route,
                handler,
                description
            });
        }

        // 🔥 DECORATORS TYPESCRIPT
        const decoratorRegex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*(?:async\s+)?(\w+)/g;
        while ((match = decoratorRegex.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const route = match[2];
            const handler = match[3];

            const key = `${method}:${route}`;
            if (seen.has(key)) continue;
            seen.add(key);

            routes.push({ method, path: route, handler });
        }

        return routes;
    }
}