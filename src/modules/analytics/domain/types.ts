export type DishEventKind = "view" | "ar_launch";

export type DishEvent = {
  dishId: string;
  kind: DishEventKind;
  createdAt: string;
};

export type Period = "today" | "7d" | "30d";
