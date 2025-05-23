/// <reference types="cypress" />

describe('Room Creation and Join Flow', () => {
  let createdRoomId = null;
  const hostPlayerName = 'HostPlayerE2E';
  const joinerPlayerName = 'JoinerPlayerE2E';

  beforeEach(() => {
    // Optional: Clear cookies or local storage if needed between tests
    // cy.clearCookies();
    // cy.clearLocalStorage();
    // Stub common errors or console messages if they are noisy
    cy.on('uncaught:exception', (err, runnable) => {
      // returning false here prevents Cypress from failing the test
      // You might want to be more specific about which errors to ignore
      return false;
    });
    cy.on('window:console:error', (str) => {
      // Block specific console errors if necessary
      return false;
    });
  });

  it('Scenario 1: Host creates a Toohak room', () => {
    cy.visit('/');

    // Stub window.prompt for the name input during room creation
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns(hostPlayerName);
    });

    // Click the "Create Toohak Room" button
    // Assuming App.tsx has data-cy attributes for these buttons
    cy.get('[data-cy=create-toohak-room-button]').should('be.visible').click();

    // After clicking create, prompt is called
    cy.window().its('prompt').should('have.been.calledOnce');
    
    // Wait for navigation to the room lobby
    cy.url().should('include', '/room/', { timeout: 10000 }); // Increased timeout for room creation

    // Assert that the host's name is visible in the lobby
    // Assuming PlayerList component renders players with data-cy attributes or identifiable text
    cy.contains('[data-cy=player-list]', hostPlayerName, { timeout: 10000 }).should('be.visible');
    cy.contains('[data-cy=player-list]', '(Host)', { timeout: 10000 }).should('be.visible');


    // Assert that a room ID is visible and capture it
    // Assuming RoomView or LobbyView displays the Room ID with a data-cy attribute
    cy.get('[data-cy=room-id-display]', { timeout: 10000 }) // Wait for element to appear
      .should('be.visible')
      .and('not.be.empty')
      .invoke('text')
      .then((text) => {
        // Example: Room ID: actualRoomId
        const parts = text.split(':');
        if (parts.length > 1) {
          createdRoomId = parts[1].trim();
        } else {
          createdRoomId = text.trim(); // Fallback if no "Room ID: " prefix
        }
        expect(createdRoomId).to.not.be.empty;
        cy.log(`Captured Room ID: ${createdRoomId}`);
        // Make createdRoomId available to other tests in this file via the shared closure variable
      });
  });

  it('Scenario 2: Second player joins the created room', () => {
    // This test depends on createdRoomId from the previous test.
    // Cypress runs tests in a file sequentially and shares context.
    expect(createdRoomId, 'Room ID from previous test must be available').to.not.be.null;
    if (!createdRoomId) {
      cy.log('Skipping test because createdRoomId is not set');
      // Or, you could choose to fail the test or handle this differently
      // For now, we'll let the expect fail it if null.
      return; // Skip if no room ID
    }

    cy.visit('/');

    // The JoinRoom component should be visible on the root page as per App.tsx structure
    // Fill in player name
    cy.get('[data-cy=player-name-input]', { timeout: 10000 }).should('be.visible').type(joinerPlayerName);

    // Fill in the captured room ID
    cy.get('[data-cy=room-id-input]').should('be.visible').type(createdRoomId);

    // Click the join room button
    cy.get('[data-cy=join-room-button]').should('be.visible').and('not.be.disabled').click();

    // Wait for navigation to the same room
    cy.url().should('include', `/room/${createdRoomId}`, { timeout: 10000 });

    // Assert that both player names are visible in the player list
    cy.contains('[data-cy=player-list]', hostPlayerName, { timeout: 10000 }).should('be.visible');
    cy.contains('[data-cy=player-list]', joinerPlayerName, { timeout: 10000 }).should('be.visible');
    
    // Verify the new player is not marked as host
    cy.get(`[data-testid=player-${joinerPlayerName.toLowerCase()}]`).should('not.contain', '(Host)'); // Assuming player list items have a structure like this
  });
});
