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

        // Captura rotas Express com handler simples ou encadeado:
        // router.get('/users', userController.getAll)
        // router.get('/users', authenticate, userController.getAll)  ← pega o último
        // app.post('/users', handler)
        const expressRegex = /(?:app|router|express)\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*,([\s\S]*?)\)/g;

        let match;
        while ((match = expressRegex.exec(content)) !== null) {
            const method  = match[1].toUpperCase();
            const route   = match[2]
            const argsPart = match[3]

            // Pega o último argumento (handler real, ignorando middlewares)
            // Ex: "authenticate, controller.getAll" → "controller.getAll"
            const args = argsPart.split(',').map(a => a.trim()).filter(Boolean)
            const lastArg = args[args.length - 1] || '—'

            // Remove .bind(), arrow functions, etc — pega só o nome
            const handler = lastArg
                .replace(/\.bind\(.*?\)/g, '')
                .replace(/\(.*?\)/g, '')
                .trim()

            const key = `${method}:${route}`
            if (seen.has(key)) continue
            seen.add(key)

            routes.push({ method, path: route, handler })
        }

        // Captura decorators TypeScript: @Get('/path') async metodo()
        const decoratorRegex = /@(Get|Post|Put|Delete|Patch)\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*(?:async\s+)?(\w+)/g;
        while ((match = decoratorRegex.exec(content)) !== null) {
            const method  = match[1].toUpperCase();
            const route   = match[2];
            const handler = match[3];

            const key = `${method}:${route}`
            if (seen.has(key)) continue
            seen.add(key)

            routes.push({ method, path: route, handler });
        }

        return routes;
    }
}