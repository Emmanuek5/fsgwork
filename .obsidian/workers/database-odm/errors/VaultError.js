class VaultError extends Error {
  constructor(message) {
    super(message);
    this.name = "VaultError";
  }
}

module.exports = VaultError;
