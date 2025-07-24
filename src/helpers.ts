import getPGSchemas from "easy-pg-scanner";
import { FastifyEasyPGPluginOptions, RelationConfig } from "./types";
import { Column, DB, Model, Relation } from "easy-psql";

export const loadDBSchemas = async (config: FastifyEasyPGPluginOptions) => {
  const schemas = await getPGSchemas(config);
  return schemas.map((schema: any) => {
    return {
      schema: schema.schema,
      tables: (Array.isArray(schema.tables) ? schema.tables : []).map(
        (table: any) => ({
          ...table,
          columns: Array.isArray(table.columns)
            ? table.columns.map((col: any) => ({
                ...col,
                id: `_${schema.schema}_${table.table}_${col.name}`,
              }))
            : [],
        })
      ),
    };
  });
};

export const loadModels = async (config: FastifyEasyPGPluginOptions) => {
  try {
    const dbSchemas = await loadDBSchemas(config);
    DB.modelFactory = {};
    DB.models = {};
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
          ),
        });
        if (model) {
          DB.register(model);
        }
      }
    }
  } catch (error) {
    throw error;
  }
};

export const buildModelClass = ({
  table,
  schema,
  relations,
}: {
  table: any;
  schema: string;
  relations: RelationConfig[];
}) => {
  if (!Array.isArray(table?.columns) || !table?.columns?.length) {
    return null;
  }
  const modelColumns = (table.columns || []).reduce((acc: any, col: any) => {
    acc[col.name] = new Column(col);
    return acc;
  }, {});

  const modelRelations = (relations || []).reduce((acc: any, rel: any) => {
    acc[rel.alias] = new Relation({
      ...rel,
      schema: rel.to_schema || "public",
    });
    return acc;
  }, {});

  return class extends Model {
    constructor(conn?: any) {
      super(table.table, conn, schema);
      this.columns = modelColumns;
      this.relations = modelRelations;
    }
    columns: Record<string, Column>;
    relations: Record<string, Relation>;
  };
};
