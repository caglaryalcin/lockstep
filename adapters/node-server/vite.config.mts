import { nodeServerAdapter } from "@builder.io/qwik-city/adapters/node-server/vite";
import { extendConfig } from "@builder.io/qwik-city/vite";
import baseConfig from "../../vite.config.mts";

export default extendConfig(baseConfig, () => {
  return {
    build: {
      ssr: true,
      rollupOptions: {
        input: ["src/entry.node.ts", "src/entry.ssr.tsx", "@qwik-city-plan"],
      },
      outDir: "server",
    },
    plugins: [nodeServerAdapter()],
  };
});
