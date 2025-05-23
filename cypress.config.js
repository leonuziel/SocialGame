const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000', // Assuming client runs on port 3000
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
});
