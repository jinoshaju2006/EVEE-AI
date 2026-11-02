import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "ai.evee.app",
  appName: "EVEE AI",
  webDir: "out",
  server: {
    url: "https://evee-3ykf16mef-evee-ai.vercel.app/",
    cleartext: false
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
