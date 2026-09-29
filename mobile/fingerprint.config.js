// The Firebase config (google-services.json) comes from the EAS file variable
// GOOGLE_SERVICES_JSON and exists only on the build server. Without this, the runtime
// version computed there differs from the one computed locally and in CI (OTA updates),
// and EAS aborts the build. Changing Firebase config needs a new build anyway.
/** @type {import('@expo/fingerprint').Config} */
const config = {
  ignorePaths: ['../../eas-environment-secrets/*'],
};

module.exports = config;
