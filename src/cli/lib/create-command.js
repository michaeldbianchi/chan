import parser from '../../parser';

export default function createCommand(cli, def = { builder: (yargs) => yargs }) {
    if (!def.command) throw new Error('Property `command` not found in the command definition.');
    if (!def.handler) throw new Error('Property `handler` not found in the command definition.');
    if (!def.describe) throw new Error('Property `describe` not found in the command definition.');

    def.name = def.command.split(' ')[0].trim();
    if (def.name.length === 0) {
        throw new Error('Property `name` must be defined.');
    }

    const userBuilder = def.builder;
    def.builder = (yargs) => {
        yargs = userBuilder(yargs)
            .config()
            .pkgConf('chan', process.cwd());

        if (cli.commandsArgv && cli.commandsArgv[def.name]) {
            yargs.config(cli.commandsArgv[def.name]);
        }

        return yargs;
    };

    const userHandler = def.handler;
    def.handler = (argv) => {
        const parserInstance = parser(argv.path);
        parserInstance.gitCompare = argv.gitCompare;
        const result = userHandler.call(
            cli,
            parserInstance,
            argv,
            () => {
                return new Promise((resolve) => {
                    const data = parserInstance.stringify();
                    // write callback function
                    if (argv.stdout) {
                        process.stdout.write(data);
                    } else {
                        parserInstance.write(data);
                    }
                    resolve(data);
                });
            }
        );

        if (!result || typeof result.then !== 'function') {
            return Promise.resolve();
        }

        return result;
    };

    cli.yargs().command(def);

    return def;
}
