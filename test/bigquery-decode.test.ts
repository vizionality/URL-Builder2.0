import { describe, expect, it } from "vitest";
import { decodeRow } from "@/lib/bigquery";

describe("BigQuery row decoding", () => {
  it("turns REST cells into typed values, including repeated records", () => {
    const fields = [
      { name: "visitor_id", type: "STRING" },
      { name: "ts", type: "TIMESTAMP" },
      { name: "value", type: "FLOAT" },
      {
        name: "path",
        type: "RECORD",
        mode: "REPEATED",
        fields: [
          { name: "ts", type: "TIMESTAMP" },
          { name: "source", type: "STRING" },
        ],
      },
    ];
    const row = decodeRow(fields, [
      { v: "v1" },
      { v: "1.7E9" },
      { v: "49.9" },
      { v: [{ v: { f: [{ v: "1699999999.5" }, { v: "google" }] } }] },
    ]);
    expect(row).toEqual({ visitor_id: "v1", ts: 1.7e12, value: 49.9, path: [{ ts: 1699999999500, source: "google" }] });
  });

  it("keeps nulls", () => {
    expect(decodeRow([{ name: "x", type: "INTEGER" }], [{ v: null }])).toEqual({ x: null });
  });
});
