import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.evee.ai",
  appName: "EVEE AI",
  webDir: "www",
  server: {
    url: "https://evee-ai-git-feature-image-studio-evee-ai.vercel.app",
    cleartext: false
  }
};

export default config;
