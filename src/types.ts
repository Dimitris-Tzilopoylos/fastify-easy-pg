export type RelationConfig = {
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

export interface FastifyEasyPGPluginOptions {
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

export type ModelFnInput = {
  table: string;
  schema?: string;
  connection?: any;
};

export type RawSQLPartSignature = (
  args?: any
) => [sql: string, args: any[]] | string;
