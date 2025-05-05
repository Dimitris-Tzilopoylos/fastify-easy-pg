import { RelationConfig } from "./types";

export default class ModelRelation {
  config: RelationConfig;
  constructor(config: RelationConfig) {
    this.config = {
      ...config,
      where:
        !!config.where &&
        typeof config.where === "object" &&
        !Array.isArray(config.where) &&
        !(config.where instanceof Date)
          ? config.where
          : {},
    };
  }
}
