import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);

Config.setBrowserExecutable(null);

Config.setChromiumOpenGlRenderer("egl");
Config.setChromiumDisableWebSecurity(false);

Config.setPixelFormat("yuv420p");

Config.setCodec("h264");
Config.setCrf(23);
Config.setMuted(false);
