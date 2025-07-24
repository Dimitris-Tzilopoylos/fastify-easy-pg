// src/index.ts
import { FastifyPluginAsync } from "fastify";
import { fastifyPlugin } from "fastify-plugin";
import {
  FastifyEasyPGPluginOptions,
  ModelFnInput,
  RawSQLPartSignature,
} from "./types";
import { DB, DBManager, Model, SQL } from "easy-psql";
import { loadModels } from "./helpers";

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
      pool: DB.pool,
      db: DB,
      dbManager: DBManager,
      rawSQLPart: (cb: RawSQLPartSignature) => new SQL(cb),
      reloadModels: async () => await loadModels(options),
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
    // x
    throw error instanceof Error ? error : new Error("Unknown error");
  }
};

// Use a more specific export type that aligns with what fastify expects
const fastifyEasyPG = fastifyPlugin(plugin, {
  name: "@fastify/easy-pg",
  fastify: "5.x",
});

export default fastifyEasyPG;
export { fastifyEasyPG };
