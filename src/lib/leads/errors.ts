export class LeadStoreUnavailableError extends Error {
  constructor() {
    super("The lead store is temporarily unavailable.");
    this.name = "LeadStoreUnavailableError";
  }
}
