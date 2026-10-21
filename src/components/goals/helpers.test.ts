import { describe, expect, test } from "vitest";
import { dbFailure } from "@/data/actions/shared";
import { goalError, moved } from "./helpers";

describe("goalError", () => {
  test("the row cap of the database becomes the goals copy", () => {
    const capped = dbFailure({ code: "23514", message: "row limit reached for goals" }).error;
    expect(goalError(capped)).toBe("Je hebt het maximum van 50 doelen bereikt.");
  });

  test("any other message is left alone", () => {
    expect(goalError("Controleer je gegevens.")).toBe("Controleer je gegevens.");
  });
});

describe("moved", () => {
  test("a goal swaps places with its neighbour", () => {
    expect(moved(["a", "b", "c"], "b", -1)).toEqual(["b", "a", "c"]);
    expect(moved(["a", "b", "c"], "b", 1)).toEqual(["a", "c", "b"]);
  });

  test("the first cannot go up, the last cannot go down, an unknown id changes nothing", () => {
    expect(moved(["a", "b"], "a", -1)).toEqual(["a", "b"]);
    expect(moved(["a", "b"], "b", 1)).toEqual(["a", "b"]);
    expect(moved(["a", "b"], "x", 1)).toEqual(["a", "b"]);
  });

  test("the input is not changed", () => {
    const ids = ["a", "b"];
    moved(ids, "a", 1);
    expect(ids).toEqual(["a", "b"]);
  });
});
