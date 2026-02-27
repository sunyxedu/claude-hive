/**
 * Application bootstrap.
 */
const App = {
    async init() {
        TaskForm.init();
        Voice.init();
        SSE.connect();
        await this.refreshBoard();
        WorkerMonitor.refresh();
        WorkerMonitor.refreshStats();

        // Periodic refresh as fallback
        setInterval(() => {
            WorkerMonitor.refresh();
            WorkerMonitor.refreshStats();
        }, 10000);
    },

    async refreshBoard() {
        try {
            const board = await API.getBoard();
            Board.render(board);
        } catch (err) {
            console.error('Failed to load board:', err);
        }
    },
};

document.addEventListener('DOMContentLoaded', () => App.init());
