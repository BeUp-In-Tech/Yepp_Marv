/* eslint-disable @typescript-eslint/no-explicit-any */
import crypto from "crypto";

export const generateCacheKey = (params: {
  searchTerm?: string;
  filter?: Record<string, any>;
  page?: number;
  limit?: number;
  sort?: string;
  fields?: string[];
  lat?: number;
  lng?: number;
}) => {
  const {
    searchTerm = "",
    filter = {},
    page = 1,
    limit = 10,
    sort = "",
    fields = [],
    lat,
    lng,
  } = params;

  // Normalize filter object (sort keys)
  const sortedFilter = Object.keys(filter)
    .sort()
    .reduce((acc: Record<string, any>, key) => {
      acc[key] = filter[key];
      return acc;
    }, {});

  const filterString = JSON.stringify(sortedFilter);

  // Normalize selected fields
  const fieldsString = fields.length ? fields.sort().join(",") : "";

  // Generate grid cell (~1km area)
  const latGrid = lat ? lat.toFixed(2) : "0";
  const lngGrid = lng ? lng.toFixed(2) : "0";
  const gridCell = `${latGrid}_${lngGrid}`;

  // Optional: hash filter and fields for shorter keys
  const filterHash = crypto.createHash("md5").update(filterString).digest("hex");
  const fieldsHash = crypto.createHash("md5").update(fieldsString).digest("hex");

  return `machinery:${searchTerm || "all"}:${filterHash}:${page}:${limit}:${sort}:${fieldsHash}:grid:${gridCell}`;
};