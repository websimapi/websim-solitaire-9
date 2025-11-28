import { CardRenderer } from './card-renderer.js';
import { makeCardInteractive } from './drag-drop.js';

export function render(game, UI, audio) {
    // Update stats immediately on render
    if (UI.scoreDisplay) UI.scoreDisplay.textContent = game.score;
    if (UI.movesDisplay) UI.movesDisplay.textContent = game.moves;

    // 1. Stock
    UI.stock.innerHTML = '';
    if (game.stock.length > 0) {
        // Just show a back card
        const cardEl = document.createElement('div');
        cardEl.className = 'card card-back';
        UI.stock.appendChild(cardEl);
        UI.stock.style.display = 'block';
        UI.stockEmpty.style.display = 'none';
    } else {
        UI.stock.style.display = 'none';
        UI.stockEmpty.style.display = 'flex';
    }

    // 2. Waste
    UI.waste.innerHTML = '';
    if (game.waste.length > 0) {
        // Show last 3 cards drawn
        const visibleWaste = game.waste.slice(-3);
        const topRow = document.getElementById('top-row');
        const stackOnRight = topRow.classList.contains('row-reverse');
        const fanRight = !stackOnRight;

        visibleWaste.forEach((c, i) => {
            const el = CardRenderer.createCardElement(c);

            // Fan direction depends on deck position:
            // - When deck is on the left (normal), fan to the right.
            // - When deck is on the right (row-reverse), fan to the left.
            // Additionally, when the deck is on the right, the most recent
            // card (top of waste) should sit closest to the deck.
            const offsetIndex = stackOnRight
                ? (visibleWaste.length - 1 - i) // reverse spacing order on the right
                : i;

            el.style.top = '0px';
            if (fanRight) {
                el.style.right = '';
                el.style.left = `${offsetIndex * 62}%`;
            } else {
                el.style.left = '';
                el.style.right = `${offsetIndex * 62}%`;
            }

            UI.waste.appendChild(el);

            // Only the top-most card is interactive
            if (i === visibleWaste.length - 1) {
                makeCardInteractive(el, { type: 'waste' }, c);
            }
        });
    }

    // 3. Foundations
    game.foundations.forEach((pile, idx) => {
        const container = UI.foundations[idx];
        container.innerHTML = '';
        if (pile.length > 0) {
            const topCard = pile[pile.length - 1];
            const el = CardRenderer.createCardElement(topCard);
            container.appendChild(el);
            makeCardInteractive(el, { type: 'foundation', index: idx }, topCard);
        }
    });

    // 4. Tableau
    game.tableau.forEach((pile, idx) => {
        const container = UI.tableau[idx];
        container.innerHTML = '';

        let currentTop = 0;

        pile.forEach((card, cardIndex) => {
            const el = CardRenderer.createCardElement(card);

            // Position card using cumulative offset to prevent jumps
            el.style.top = `${currentTop}%`;

            // Calculate offset for the next card
            // 12% for face-down cards to show a strip of the back
            // 35% for face-up cards to ensure the large header (rank + suit) is visible
            currentTop += card.faceUp ? 35 : 12;

            container.appendChild(el);

            if (card.faceUp) {
                makeCardInteractive(el, { type: 'tableau', index: idx, cardIndex }, card);
            }
        });
    });

    // 5. Check win
    if (game.checkWin()) {
        UI.winOverlay.classList.remove('hidden');
        audio.play('win');
    }
}

export function highlightHint(UI, hint) {
    let el = null;
    
    if (hint.type === 'draw') {
        // Highlight stock or stock-empty
        if (UI.stock.style.display !== 'none') {
            el = UI.stock.lastElementChild || UI.stock;
        } else {
            el = UI.stockEmpty;
        }
    } else if (hint.type === 'move') {
        if (hint.source === 'waste') {
            el = UI.waste.lastElementChild;
        } else if (hint.source === 'tableau') {
            const pileContainer = UI.tableau[hint.index];
            // If cardIndex is provided (sub-stack move), target that card
            // Otherwise target top card
            const idx = (hint.cardIndex !== undefined) ? hint.cardIndex : (pileContainer.children.length - 1);
            if (pileContainer.children[idx]) {
                el = pileContainer.children[idx];
            }
        }
    }

    if (el) {
        // Remove existing highlights
        document.querySelectorAll('.hint-glow').forEach(e => e.classList.remove('hint-glow'));
        
        // Add new highlight
        el.classList.add('hint-glow');
        
        // Auto remove after some time
        setTimeout(() => {
            if (el) el.classList.remove('hint-glow');
        }, 2000);
    }
}