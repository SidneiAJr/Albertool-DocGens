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

        // Regex pra capturar schemas Zod
        const schemaRegex = /(?:export\s+)?const\s+(\w+Schema)\s*=\s*z\.object\(\{([\s\S]*?)\}\)/g;
        let match;

        while ((match = schemaRegex.exec(content)) !== null) {
            const name = match[1];
            const body = match[2];
            const fields = this.extractFields(body);

            schemas.push({ name, fields });
        }

        return schemas;
    }

    private extractFields(body: string): ZodField[] {
        const fields: ZodField[] = [];

        // Regex pra capturar campos: nome: z.tipo().validação()
        const fieldRegex = /(\w+)\s*:\s*z\.(\w+)\(\)(?:\.(\w+)\([^)]*\))?/g;
        let match;

        while ((match = fieldRegex.exec(body)) !== null) {
            const name = match[1];
            const type = match[2];
            const validation = match[3] || 'Obrigatório';

            fields.push({ name, type, validation });
        }

        return fields;
    }
}