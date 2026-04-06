const { resetPersistentState, runtimePaths } = require("../data/db");

try {
  resetPersistentState();
  console.log("CorpHack CTF state reset complete.");
  console.log(`Database: ${runtimePaths.dbPath}`);
  console.log(`Runtime: ${runtimePaths.runtimeRoot}`);
} catch (error) {
  console.error("Failed to reset CTF state.");
  console.error(error);
  process.exitCode = 1;
}
