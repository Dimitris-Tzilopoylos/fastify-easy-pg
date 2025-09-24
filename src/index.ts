// src/index.ts
import { FastifyPluginAsync } from "fastify";
import { fastifyPlugin } from "fastify-plugin";
import {
  FastifyEasyPGPluginOptions,
  ModelFnInput,
  RawSQLPartSignature,
  RelationConfig,
} from "./types";
import { Column, DB, DBManager, Model, Relation, SQL } from "easy-psql";
import { loadModels } from "./helpers";

declare module "fastify" {
  interface FastifyInstance {
    easyPG: {
      pool: typeof DB.pool;
      column: (config: any) => Column;
      relation: (config: RelationConfig) => Relation;
      newModel: (config: {
        table: string;
        schema: string;
        relations?: RelationConfig[];
        columns?: any[];
        connection?: any;
      }) => typeof Model;
      model(opts: ModelFnInput): Model;
      db: typeof DB;
      dbManager: typeof DBManager;
      rawSQLPart: (cb: RawSQLPartSignature) => SQL;
      reloadModels: (relations?: RelationConfig[]) => Promise<void>;
    };
  }
}

const plugin: FastifyPluginAsync<FastifyEasyPGPluginOptions> = async (
  fastify,
  opts
) => {
  const options = opts || {};
  if (!options.port) {
    options.port = 5432;
  }
  if (!options.host) {
    options.host = "localhost";
  }
  if (!options.database) {
    options.database = "postgres";
  }
  if (!options.user) {
    options.user = "postgres";
  }
  if (!options.password) {
    options.password = "postgres";
  }

  try {
    await loadModels(options);
    DB.registerConnectionConfig({
      ...options,
      min: options.min_pool_size,
      max: options.max_pool_size,
    });

    DB.enableLog = !!options.logSQL;

    fastify.decorate("easyPG", {
      newModel: (config: {
        table: string;
        schema: string;
        relations?: RelationConfig[];
        columns?: any[];
        connection?: any;
      }) => {
        const columns: Record<string, Column> = (config.columns || []).reduce(
          (acc: Record<string, Column>, col: any) => ({
            ...acc,
            [col.name]: new Column(col),
          }),
          {} as Record<string, Column>
        );

        const relations: Record<string, Relation> = (
          config.relations || []
        ).reduce(
          (acc: Record<string, Relation>, rel: RelationConfig) => ({
            ...acc,
            [rel.alias]: new Relation({
              alias: rel.alias,
              from_table: rel.from_table || config.table,
              to_table: rel.to_table,
              from_column: rel.from_column,
              to_column: rel.to_column,
              type: rel.type,
              schema: rel.to_schema || "",
            }),
          }),
          {} as Record<string, Relation>
        );
        return class extends Model {
          constructor(conn?: any) {
            super(config.table, conn, config.schema);
            this.columns = columns;
            this.relations = relations;
          }
        };
      },
      column: (config: any) => new Column(config),
      relation: (config: RelationConfig) =>
        new Relation({ ...config, schema: config.to_schema || "" }),
      pool: DB.pool,
      db: DB,
      dbManager: DBManager,
      rawSQLPart: (cb: RawSQLPartSignature) => new SQL(cb),
      reloadModels: async (relations?: RelationConfig[]) =>
        await loadModels({
          ...options,
          relations:
            (typeof relations === "undefined"
              ? options.relations
              : relations) || [],
        }),
      model: (modelOpts: ModelFnInput) => {
        const model = DB.modelFactory?.[modelOpts?.schema || "public"]?.[
          modelOpts?.table
        ] as typeof Model;
        if (!model) {
          throw new Error(
            `Model ${modelOpts.schema || "public"}.${
              modelOpts.table
            } is not registered`
          );
        }

        const instance = new model(modelOpts.connection);

        return instance;
      },
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error("Unknown error");
  }
};

const fastifyEasyPG = fastifyPlugin(plugin, {
  name: "@fastify/easy-pg",
  fastify: "5.x",
});

export default fastifyEasyPG;
export { fastifyEasyPG };
