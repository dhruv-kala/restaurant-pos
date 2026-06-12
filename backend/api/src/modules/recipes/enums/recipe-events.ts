export const RecipeEvent = {
  recipeUpdated: 'RecipeUpdated',
  inventoryConsumed: 'InventoryConsumed',
  recipeCostChanged: 'RecipeCostChanged',
  inventoryShortageDetected: 'InventoryShortageDetected',
} as const;

export type RecipeEventName = (typeof RecipeEvent)[keyof typeof RecipeEvent];
