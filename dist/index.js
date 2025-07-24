"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default,
  fastifyEasyPG: () => fastifyEasyPG
});
module.exports = __toCommonJS(index_exports);
var import_fastify_plugin = require("fastify-plugin");
var import_easy_psql2 = require("easy-psql");

// src/helpers.ts
var import_easy_pg_scanner = __toESM(require("easy-pg-scanner"));
var import_easy_psql = require("easy-psql");
var loadDBSchemas = async (config) => {
  const schemas = await (0, import_easy_pg_scanner.default)(config);
  return schemas.map((schema) => {
    return {
      schema: schema.schema,
      tables: (Array.isArray(schema.tables) ? schema.tables : []).map(
        (table) => ({
          ...table,
          columns: Array.isArray(table.columns) ? table.columns.map((col) => ({
            ...col,
            id: `_${schema.schema}_${table.table}_${col.name}`
          })) : []
        })
      )
    };
  });
};
var loadModels = async (config) => {
  try {
    const dbSchemas = await loadDBSchemas(config);
    import_easy_psql.DB.modelFactory = {};
    import_easy_psql.DB.models = {};
    for (const { schema, tables = [] } of dbSchemas) {
      if (!tables?.length) {
        continue;
      }
      for (const table of tables) {
        const model = buildModelClass({
          table,
          schema,
          relations: (config?.relations || []).filter(
            (x) => x.from_table === table.table && x.from_schema === schema
          )
        });
        if (model) {
          import_easy_psql.DB.register(model);
        }
      }
    }
  } catch (error) {
    throw error;
  }
};
var buildModelClass = ({
  table,
  schema,
  relations
}) => {
  if (!Array.isArray(table?.columns) || !table?.columns?.length) {
    return null;
  }
  const modelColumns = (table.columns || []).reduce((acc, col) => {
    acc[col.name] = new import_easy_psql.Column(col);
    return acc;
  }, {});
  const modelRelations = (relations || []).reduce((acc, rel) => {
    acc[rel.alias] = new import_easy_psql.Relation({
      ...rel,
      schema: rel.to_schema || "public"
    });
    return acc;
  }, {});
  return class extends import_easy_psql.Model {
    constructor(conn) {
      super(table.table, conn, schema);
      this.columns = modelColumns;
      this.relations = modelRelations;
    }
  };
};

// src/index.ts
var plugin = async (fastify, opts) => {
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
    import_easy_psql2.DB.registerConnectionConfig({
      ...options,
      min: options.min_pool_size,
      max: options.max_pool_size
    });
    import_easy_psql2.DB.enableLog = !!options.logSQL;
    fastify.decorate("easyPG", {
      pool: import_easy_psql2.DB.pool,
      db: import_easy_psql2.DB,
      dbManager: import_easy_psql2.DBManager,
      rawSQLPart: (cb) => new import_easy_psql2.SQL(cb),
      reloadModels: async () => await loadModels(options),
      model: (modelOpts) => {
        const model = import_easy_psql2.DB.modelFactory?.[modelOpts?.schema || "public"]?.[modelOpts?.table];
        if (!model) {
          throw new Error(
            `Model ${modelOpts.schema || "public"}.${modelOpts.table} is not registered`
          );
        }
        const instance = new model(modelOpts.connection);
        return instance;
      }
    });
  } catch (error) {
    throw error instanceof Error ? error : new Error("Unknown error");
  }
};
var fastifyEasyPG = (0, import_fastify_plugin.fastifyPlugin)(plugin, {
  name: "@fastify/easy-pg",
  fastify: "5.x"
});
var index_default = fastifyEasyPG;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  fastifyEasyPG
});
