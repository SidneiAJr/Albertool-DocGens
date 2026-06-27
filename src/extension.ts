import * as vscode from 'vscode';
import { ReadmeGenerator }      from './generators/Readmegenerator';
import { ChangelogGenerator }   from './generators/Changeloggenerator';
import { EnvGenerator }         from './generators/Envgenerator';
import { RoutesGenerator }      from './generators/Routesgenerator';
import { SecurityGenerator }    from './generators/Securitygenerator';
import { LibsGenerator }        from './generators/Libsgenerator';
import { ControllerGenerator }  from './generators/ControllerGenerator';
import { ServiceGenerator }     from './generators/ServiceGenerator';
import { ModelGenerator }       from './generators/ModelGenerator';
import { RepositoryGenerator }  from './generators/RepositoryGenerator';
import { MiddlewareGenerator }  from './generators/MiddlewareGenerator';
import { SchemaGenerator }      from './generators/SchemaGenerator';
import { MiscGenerator }        from './generators/MiscGenerator';

export function activate(context: vscode.ExtensionContext) {
    console.log('📄 Albertool DocGen ativado!');

    const readme     = new ReadmeGenerator();
    const changelog  = new ChangelogGenerator();
    const env        = new EnvGenerator();
    const routes     = new RoutesGenerator();
    const security   = new SecurityGenerator();
    const libs       = new LibsGenerator();
    const controller = new ControllerGenerator();
    const service    = new ServiceGenerator();
    const model      = new ModelGenerator();
    const repository = new RepositoryGenerator();
    const middleware = new MiddlewareGenerator();
    const schema     = new SchemaGenerator();
    const misc       = new MiscGenerator();

    const gerarTudo = vscode.commands.registerCommand('docgen.gerarTudo', async () => {
        const erros: string[] = [];

        const tarefas: { nome: string; fn: () => Promise<void> }[] = [
            { nome: 'README',       fn: () => readme.salvar() },
            { nome: 'LIBS',         fn: () => libs.salvar() },
            { nome: 'ROUTES',       fn: () => routes.salvar() },
            { nome: 'ENV',          fn: () => env.salvar() },
            { nome: 'SECURITY',     fn: () => security.salvar() },
            { nome: 'CHANGELOG',    fn: () => changelog.salvar() },
            { nome: 'CONTROLLERS',  fn: () => controller.salvar() },
            { nome: 'SERVICES',     fn: () => service.salvar() },
            { nome: 'MODELS',       fn: () => model.salvar() },
            { nome: 'REPOSITORIES', fn: () => repository.salvar() },
            { nome: 'MIDDLEWARES',  fn: () => middleware.salvar() },
            { nome: 'SCHEMAS',      fn: () => schema.salvar() },
            { nome: 'MISC',         fn: () => misc.salvar() },
        ];

        for (const tarefa of tarefas) {
            try {
                await tarefa.fn();
            } catch (e: any) {
                erros.push(`${tarefa.nome}: ${e.message}`);
            }
        }

        if (erros.length > 0) {
            vscode.window.showWarningMessage(
                `⚠️ Documentação gerada com ${erros.length} erro(s): ${erros.join(' | ')}`
            );
        } else {
            vscode.window.showInformationMessage('✅ Toda documentação gerada em docs/');
        }
    });

    const gerarReadme      = vscode.commands.registerCommand('docgen.gerarReadme',      () => readme.salvar());
    const gerarLibs        = vscode.commands.registerCommand('docgen.gerarLibs',        () => libs.salvar());
    const gerarRoutes      = vscode.commands.registerCommand('docgen.gerarRoutes',      () => routes.salvar());
    const gerarEnv         = vscode.commands.registerCommand('docgen.gerarEnv',         () => env.salvar());
    const gerarSecurity    = vscode.commands.registerCommand('docgen.gerarSecurity',    () => security.salvar());
    const gerarChangelog   = vscode.commands.registerCommand('docgen.gerarChangelog',   () => changelog.salvar());
    const gerarControllers = vscode.commands.registerCommand('docgen.gerarControllers', () => controller.salvar());
    const gerarServices    = vscode.commands.registerCommand('docgen.gerarServices',    () => service.salvar());
    const gerarModels      = vscode.commands.registerCommand('docgen.gerarModels',      () => model.salvar());
    const gerarRepositories= vscode.commands.registerCommand('docgen.gerarRepositories',() => repository.salvar());
    const gerarMiddlewares = vscode.commands.registerCommand('docgen.gerarMiddlewares', () => middleware.salvar());
    const gerarSchemas     = vscode.commands.registerCommand('docgen.gerarSchemas',     () => schema.salvar());
    const gerarMisc        = vscode.commands.registerCommand('docgen.gerarMisc',        () => misc.salvar());

    context.subscriptions.push(
        gerarTudo, gerarReadme, gerarLibs, gerarRoutes, gerarEnv,
        gerarSecurity, gerarChangelog, gerarControllers, gerarServices,
        gerarModels, gerarRepositories, gerarMiddlewares, gerarSchemas, gerarMisc
    );
}

export function deactivate() {}