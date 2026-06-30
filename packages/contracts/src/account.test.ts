import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deleteAccountInputSchema, updateAccountInputSchema } from "./account.ts";

describe("updateAccountInputSchema", () => {
  it("accepts first and last name updates and trims whitespace", () => {
    assert.deepEqual(
      updateAccountInputSchema.parse({ firstName: "  Ada  ", lastName: " Lovelace " }),
      { firstName: "Ada", lastName: "Lovelace" },
    );
  });

  it("accepts a single name field", () => {
    assert.deepEqual(updateAccountInputSchema.parse({ firstName: "Ada" }), {
      firstName: "Ada",
    });
  });

  it("converts empty strings to null", () => {
    assert.deepEqual(updateAccountInputSchema.parse({ firstName: "   " }), {
      firstName: null,
    });
  });

  it("rejects payloads with no fields", () => {
    assert.throws(() => updateAccountInputSchema.parse({}));
  });

  it("rejects names longer than 100 characters", () => {
    assert.throws(() =>
      updateAccountInputSchema.parse({
        firstName: "a".repeat(101),
      }),
    );
  });
});

describe("deleteAccountInputSchema", () => {
  it("accepts the exact DELETE confirmation", () => {
    assert.deepEqual(deleteAccountInputSchema.parse({ confirmation: "DELETE" }), {
      confirmation: "DELETE",
    });
  });

  it("rejects incorrect confirmation text", () => {
    assert.throws(() => deleteAccountInputSchema.parse({ confirmation: "delete" }));
    assert.throws(() => deleteAccountInputSchema.parse({ confirmation: "REMOVE" }));
  });
});
