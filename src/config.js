// ── GharKharcha Config ────────────────────────────────────────────────────
// All URLs and constants in one place.
// Change here → updates everywhere in the app.

const config = {

  // ── API ────────────────────────────────────────────────────────────────
  api: {
    baseUrl: "https://p7olak2xy4.execute-api.us-east-1.amazonaws.com/GK-Stage",
  },

  // ── Google OAuth ───────────────────────────────────────────────────────
  google: {
    clientId: "56285835763-s5mk752qj0smuc01hr10k5nu7ii46n1c.apps.googleusercontent.com",
  },

  // ── AWS ────────────────────────────────────────────────────────────────
  aws: {
    region: "us-east-1",
  },

  // ── App Defaults ───────────────────────────────────────────────────────
  defaults: {
    currency:     "₹",
    theme:        "light",
    maxCSVRows:   1000,
    batchSize:    25,       // DynamoDB BatchWrite limit per request
  },

};

export default config;