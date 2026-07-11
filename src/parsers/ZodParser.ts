export interface ZodField {
    name: string;
    type: string;
    validation: string;
}

export interface ZodSchema {
    name: string;
    fields: ZodField[];
}

export class ZodParser {
    parse(content: string): ZodSchema[] {
        const schemas: ZodSchema[] = [];

        // ✅ Universal — captura qualquer const = z.object({...})
        // Não depende mais do nome terminar em "Schema"
        const schemaRegex = /(?:export\s+)?const\s+(\w+)\s*=\s*z\.object\(\{([\s\S]*?)\}\s*\)/g;
        let match;

        while ((match = schemaRegex.exec(content)) !== null) {
            const name   = match[1];
            const body   = match[2];
            const fields = this.extractFields(body);
            schemas.push({ name, fields });
        }

        return schemas;
    }

    private extractFields(body: string): ZodField[] {
        const fields: ZodField[] = [];

        // ✅ Captura: campo: z.tipo().validacao() — incluindo chaining como .min().max().email()
        const fieldRegex = /(\w+)\s*:\s*z\.(\w+)\(\s*\)((?:\.\w+\([^)]*\))*)/g;
        let match;

        while ((match = fieldRegex.exec(body)) !== null) {
            const name       = match[1];
            const type       = match[2];
            const chainPart  = match[3] || '';

            // Extrai todas as validações do chain (.min(3), .email(), etc)
            const validations: string[] = [];
            const chainRegex = /\.(\w+)\(([^)]*)\)/g;
            let chainMatch;
            while ((chainMatch = chainRegex.exec(chainPart)) !== null) {
                const vName = chainMatch[1];
                const vArg  = chainMatch[2];
                validations.push(vArg ? `${vName}(${vArg})` : vName);
            }

            const validation = validations.length > 0
                ? validations.join(', ')
                : 'Obrigatório';

            fields.push({ name, type, validation });
        }

        return fields;
    }
}