export interface GeneratorOptions {
    outputDir?: string;
    language?: 'pt' | 'en';
}

export interface FileInfo {
    path: string;
    name: string;
    content: string;
    type: 'controller' | 'service' | 'model' | 'repository' | 'middleware' | 'schema' | 'util';
}

export interface MethodInfo {
    name: string;
    route?: string;
    description?: string;
    params?: string[];
    returnType?: string;
}