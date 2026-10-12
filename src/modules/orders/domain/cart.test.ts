import { describe, expect, it } from "vitest";
import {
  addToCart,
  cartItemCount,
  cartSubtotalCents,
  lineKey,
  lineTotalCents,
  removeLine,
  setLineNotes,
  setLineQuantity,
  type Cart,
} from "./cart";

const cake = { dishId: "d1", name: "Carrot Cake", unitPriceCents: 900 };
const steak = { dishId: "d2", name: "Ribeye", unitPriceCents: 3400 };

describe("cart math", () => {
  it("adds a new line", () => {
    const cart = addToCart([], cake, 2);
    expect(cart).toHaveLength(1);
    expect(cart[0]).toMatchObject({ dishId: "d1", quantity: 2, notes: "" });
  });

  it("merges the same dish with the same notes", () => {
    let cart: Cart = addToCart([], cake, 1);
    cart = addToCart(cart, cake, 2);
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });

  it("keeps lines separate when notes differ (case/whitespace insensitive match)", () => {
    let cart: Cart = addToCart([], steak, 1, "medium rare");
    cart = addToCart(cart, steak, 1, "  Medium Rare ");
    cart = addToCart(cart, steak, 1, "well done");
    expect(cart).toHaveLength(2);
    expect(cart[0].quantity).toBe(2);
  });

  it("ignores non-positive quantities when adding", () => {
    expect(addToCart([], cake, 0)).toEqual([]);
    expect(addToCart([], cake, -3)).toEqual([]);
  });

  it("computes line totals, subtotal and item count", () => {
    let cart: Cart = addToCart([], cake, 2);
    cart = addToCart(cart, steak, 1);
    expect(lineTotalCents(cart[0])).toBe(1800);
    expect(cartSubtotalCents(cart)).toBe(1800 + 3400);
    expect(cartItemCount(cart)).toBe(3);
  });

  it("returns zeros for an empty cart", () => {
    expect(cartSubtotalCents([])).toBe(0);
    expect(cartItemCount([])).toBe(0);
  });

  it("sets a quantity and removes the line at zero", () => {
    let cart: Cart = addToCart([], cake, 2);
    const key = lineKey(cart[0]);
    cart = setLineQuantity(cart, key, 5);
    expect(cart[0].quantity).toBe(5);
    cart = setLineQuantity(cart, key, 0);
    expect(cart).toEqual([]);
  });

  it("caps quantity at 99", () => {
    let cart: Cart = addToCart([], cake, 1);
    cart = setLineQuantity(cart, lineKey(cart[0]), 500);
    expect(cart[0].quantity).toBe(99);
  });

  it("updates notes and merges when the new notes collide with another line", () => {
    let cart: Cart = addToCart([], steak, 1, "rare");
    cart = addToCart(cart, steak, 2, "well done");
    cart = setLineNotes(cart, lineKey(cart[1]), "rare");
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(3);
  });

  it("removes a line", () => {
    let cart: Cart = addToCart([], cake, 1);
    cart = addToCart(cart, steak, 1);
    cart = removeLine(cart, lineKey(cart[0]));
    expect(cart.map((l) => l.dishId)).toEqual(["d2"]);
  });

  it("does not mutate the input cart", () => {
    const cart: Cart = addToCart([], cake, 1);
    addToCart(cart, cake, 1);
    expect(cart[0].quantity).toBe(1);
  });
});
