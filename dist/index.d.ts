import { FastifyPluginAsync } from 'fastify';
import { DB, Model, DBManager, SQL } from 'test-easy-psql';

type RelationConfig = {
    alias: string;
    from_schema: string;
    from_table?: string;
    to_table: string;
    from_column: string | string[];
    to_column: string | string[];
    type: "object" | "array";
    to_schema?: string;
    where?: any;
};
interface FastifyEasyPGPluginOptions {
    host?: string;
    port?: number | string;
    min_pool_size?: number;
    max_pool_size?: number;
    database?: string;
    user?: string;
    password?: string;
    relations?: RelationConfig[];
    logSQL?: boolean;
}
type ModelFnInput = {
    table: string;
    schema?: string;
    connection?: any;
};
type RawSQLPartSignature = (args?: any) => [sql: string, args: any[]] | string;

declare module "fastify" {
    interface FastifyInstance {
        easyPG: {
            pool: typeof DB.pool;
            model(opts: ModelFnInput): Model;
            db: typeof DB;
            dbManager: typeof DBManager;
            rawSQLPart: (cb: RawSQLPartSignature) => SQL;
            reloadModels: () => Promise<void>;
        };
    }
}
declare const fastifyEasyPG: FastifyPluginAsync<FastifyEasyPGPluginOptions>;

export { fastifyEasyPG as default, fastifyEasyPG };
