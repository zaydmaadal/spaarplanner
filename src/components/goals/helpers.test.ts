import { describe, expect, test } from "vitest";
import { dbFailure } from "@/data/actions/shared";
import { goalError } from "./helpers";

describe("goalError", () => {
  test("the row cap of the database becomes the goals copy", () => {
    const capped = dbFailure({ code: "23514", message: "row limit reached for goals" }).error;
    expect(goalError(capped)).toBe("Je hebt het maximum van 50 doelen bereikt.");
  });

  test("any other message is left alone", () => {
    expect(goalError("Controleer je gegevens.")).toBe("Controleer je gegevens.");
  });
});
