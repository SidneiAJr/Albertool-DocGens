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

        // ✅ Universal — captura qualquer variável .get/.post/etc
        const expressRegex = /\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,([^)]+)\)/gi;

        let match;
        while ((match = expressRegex.exec(content)) !== null) {
            const method  = match[1].toUpperCase();
            const route   = match[2];
            const argsPart = match[3];

            // Pega o último argumento que parece um handler (ignora middlewares inline)
            const args = argsPart
                .split(',')
                .map(a => a.trim())
                .filter(a => a && !a.includes('=>') && !a.includes('function'));

            let handler = args[args.length - 1] || '—';
            handler = handler
                .replace(/\.bind\(.*?\)/g, '')
                .replace(/\(.*?\)/g, '')
                .replace(/;\s*$/, '')
                .replace(/async\s+/g, '')
                .trim();

            // Se ainda for arrow function, tenta extrair o nome
            if (handler.includes('=>') || handler.includes('function')) {
                const funcMatch = handler.match(/(?:function\s+)?(\w+)\s*\(/);
                if (funcMatch) handler = funcMatch[1];
                else continue;
            }

            // Se for objeto.metodo, pega só o método
            if (handler.includes('.')) {
                const parts = handler.split('.');
                handler = parts[parts.length - 1] || handler;
            }

            const key = `${method}:${route}`;
            if (seen.has(key)) continue;
            seen.add(key);

            // Tenta extrair descrição do JSDoc acima
            const jsdocMatch = content.substring(0, match.index).match(/\/\*\*([\s\S]*?)\*\//);
            let description = '';
            if (jsdocMatch) {
                const lines = jsdocMatch[1]
                    .split('\n')
                    .map(l => l.trim().replace(/^\*/, '').trim());
                description = lines.filter(l => l && !l.startsWith('@')).join(' ').trim();
            }

            routes.push({ method, path: route, handler, description });
        }

        // ✅ Decorators TypeScript (@Get, @Post, etc)
        const decoratorRegex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*(?:async\s+)?(\w+)/g;
        while ((match = decoratorRegex.exec(content)) !== null) {
            const method  = match[1].toUpperCase();
            const route   = match[2];
            const handler = match[3];

            const key = `${method}:${route}`;
            if (seen.has(key)) continue;
            seen.add(key);

            routes.push({ method, path: route, handler });
        }

        return routes;
    }
}