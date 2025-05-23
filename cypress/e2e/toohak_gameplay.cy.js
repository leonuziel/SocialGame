/// <reference types="cypress" />

describe('Toohak Game Play Flow (Host Perspective)', () => {
  const hostPlayerName = 'HostGamePlayer';
  let gameRoomId = null;

  beforeEach(() => {
    // Prevent Cypress from failing the test on uncaught exceptions from the app
    cy.on('uncaught:exception', (err, runnable) => {
      console.error('Uncaught exception in app:', err);
      return false;
    });
     // Stub common console errors if they are noisy and not relevant to the test itself
    cy.on('window:console:error', (str) => {
      // Example: ignore specific known errors if necessary
      // if (str.includes('Some known benign error')) {
      //   return false;
      // }
    });
  });

  it('should allow the host to create a room, start, play through, and end a Toohak game', () => {
    // 1. Create a room as "HostPlayer"
    cy.visit('/');
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(hostPlayerName);
    });
    cy.get('[data-cy=create-toohak-room-button]').should('be.visible').click();
    cy.window().its('prompt').should('have.been.calledOnce');
    
    // Wait for lobby and capture room ID (simplified, actual capture might need more robust selector)
    cy.url().should('include', '/room/', { timeout: 10000 });
    cy.get('[data-cy=room-id-display]', { timeout: 10000 }).invoke('text').then((text) => {
      const parts = text.split(':');
      gameRoomId = (parts.length > 1 ? parts[1] : text).trim();
      expect(gameRoomId).to.not.be.empty;
      cy.log(`Toohak Game Room ID: ${gameRoomId}`);
    });

    // 2. Verify in the lobby view. The "Start Game" button should be visible.
    cy.contains('[data-cy=player-list]', hostPlayerName, { timeout: 10000 }).should('be.visible');
    cy.get('[data-cy=start-game-button]', { timeout: 10000 }).should('be.visible');

    // 3. Click the "Start Game" button.
    cy.get('[data-cy=start-game-button]').click();

    // 4. Assert that the game view loads (question state).
    cy.url().should('include', `/room/${gameRoomId}`, { timeout: 10000 }); // Still in room, but UI changes
    cy.get('[data-cy=game-view-container]', { timeout: 10000 }).should('be.visible'); // Assuming a container for game view
    cy.get('[data-cy=question-display]', { timeout: 15000 }).should('be.visible'); // Wait longer for first question

    // --- Loop for 2 questions ---
    for (let i = 0; i < 2; i++) {
      cy.log(`Playing question ${i + 1}`);

      // 5. Assert that a question is displayed.
      cy.get('[data-cy=question-text]', { timeout: 10000 }).should('not.be.empty');
      cy.get('[data-cy=answer-option-0]', { timeout: 10000 }).should('be.visible'); // Check at least one answer option

      // 6. Select an answer (e.g., the first one).
      cy.get('[data-cy=answer-option-0]').click();
      cy.get('[data-cy=answer-option-0]').should('be.disabled'); // Assuming button gets disabled

      // 7. Assert that feedback (e.g., "Waiting for other players...") or leaderboard transition happens.
      // For Toohak, it directly goes to leaderboard state after host answers (if single player or all answered)
      cy.log('Answer submitted, waiting for leaderboard state');
      cy.get('[data-cy=leaderboard-view]', { timeout: 20000 }).should('be.visible'); // Or a general score display area

      // 8. Assert that the leaderboard/scores are shown.
      // This might involve checking for player names and scores.
      cy.contains('[data-cy=score-display]', hostPlayerName, { timeout: 10000 }).should('be.visible');


      if (i < 1) { // For all but the last question
        // 9. If host, click "Next Question".
        cy.get('[data-cy=next-question-button]', { timeout: 10000 }).should('be.visible').click();
        
        // Assert transition back to question state
        cy.get('[data-cy=question-display]', { timeout: 15000 }).should('be.visible'); // Wait for next question
        cy.log(`Transitioned to question ${i + 2}`);
      }
    }

    // 11. After the last question's leaderboard, assert that the final game results are displayed.
    // The game should transition to 'ended' state.
    // The UI for 'ended' might be similar to 'leaderboard' but with a "Final Results" title or specific element.
    cy.log('All questions played, waiting for final results');
    cy.get('[data-cy=final-results-view]', { timeout: 20000 }).should('be.visible'); // Or specific "Game Over" text/element
    cy.contains('h2', /Game Over!|Final Results/i, { timeout: 10000 }).should('be.visible'); // Example

    // 12. Assert that there's an option to go back or create a new game.
    // This depends on the application's post-game flow.
    // For example, a button to go back to the main page or a "Play Again" button.
    // Let's assume a "Back to Home" or similar button appears.
    cy.get('[data-cy=back-to-home-button]', { timeout: 10000 }).should('be.visible');
    // Or, perhaps the create/join room UI reappears
    // cy.get('[data-cy=create-toohak-room-button]').should('be.visible');
  });
});
