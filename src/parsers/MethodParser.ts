export interface MethodInfo {
    name: string
    route?: string
    description?: string
    params?: string[]
    returnType?: string
    isAsync?: boolean
}

export class MethodParser {
    parse(content: string): MethodInfo[] {
        const methods: MethodInfo[] = []
        const seen = new Set<string>()

        // Captura métodos com ou sem async, com params e retorno opcional
        // Ex: async getAll(req: Request, res: Response): Promise<Response>
        // Ex: register(req: Request, res: Response): Promise<void>
        const regex = /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*([\w<>[\]|\s,]+))?\s*\{/g

        const IGNORED = new Set([
            'constructor', 'if', 'for', 'while', 'switch',
            'catch', 'try', 'else', 'function', 'class'
        ])

        let match
        while ((match = regex.exec(content)) !== null) {
            const name      = match[1]
            const rawParams = match[2].trim()
            const returnType = match[3]?.trim() || 'void'

            if (IGNORED.has(name)) continue
            if (name.startsWith('_')) continue
            if (seen.has(name)) continue

            // Ignora nomes que começam com maiúscula (classes, imports)
            if (/^[A-Z]/.test(name)) continue

            seen.add(name)

            const params = rawParams
                ? rawParams.split(',').map(p => p.trim()).filter(Boolean)
                : []

            // Tenta pegar descrição de JSDoc acima do método
            let description = ''
            const jsdocRegex = new RegExp(`/\\*\\*([\\s\\S]*?)\\*/\\s*(?:async\\s+)?${name}\\s*\\(`)
            const jsdocMatch = content.match(jsdocRegex)
            if (jsdocMatch) {
                description = jsdocMatch[1]
                    .split('\n')
                    .map(l => l.trim().replace(/^\*/, '').trim())
                    .filter(l => l && !l.startsWith('@'))
                    .join(' ')
                    .trim()
            }

            methods.push({ name, params, returnType, description })
        }

        return methods
    }
}