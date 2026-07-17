const fs = require("node:fs");

function parseEnvFileText(contents) {
  const env = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseEnvFileText(fs.readFileSync(filePath, "utf8"));
}

function mergeDeploymentEnv(processEnv, fileEnv) {
  // Deployment file is authoritative over stale PM2/shell values.
  return { ...processEnv, ...fileEnv };
}

module.exports = {
  loadEnvFile,
  mergeDeploymentEnv,
  parseEnvFileText,
};
