import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "me.cashu.wallet",
  appName: "Trails Coffee Rewards",
  webDir: "dist/spa/",
  android: {
    includePlugins: ["BluetoothEcash"],
  },
};

export default config;
