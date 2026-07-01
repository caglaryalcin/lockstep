import { createQwikCity } from "@builder.io/qwik-city/middleware/node";
import qwikCityPlan from "@qwik-city-plan";
import { join } from "node:path";

import render from "./entry.ssr";

export default createQwikCity({
  render,
  qwikCityPlan,
  static: {
    root: join(process.cwd(), "dist"),
    cacheControl: "public, max-age=31536000, immutable",
  },
});
