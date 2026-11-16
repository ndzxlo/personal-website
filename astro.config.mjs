// @ts-check
import { defineConfig, fontProviders } from "astro/config";
import glsl from "vite-plugin-glsl";

import tailwindcss from "@tailwindcss/vite";

import react from "@astrojs/react";

import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [glsl(), tailwindcss()],
  },

  devToolbar: {
    enabled: false,
  },

  integrations: [react()],

  fonts: [
    {
      provider: fontProviders.google(),
      name: "Prata",
      cssVariable: "--font-prata",
    },
    {
      provider: fontProviders.google(),
      name: "Schibsted Grotesk",
      cssVariable: "--font-schibsted",
      weights: [400, 500, 600],
      styles: ["normal"],
    },
  ],

  adapter: cloudflare(),
});