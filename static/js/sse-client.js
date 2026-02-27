/**
 * SSE connection manager for real-time updates.
 */
const SSE = {
    source: null,

    connect() {
        if (this.source) this.source.close();
        this.source = new EventSource('/api/stream/board');

        this.source.addEventListener('task_created', (e) => {
            const task = JSON.parse(e.data);
            Board.updateCard(task);
        });

        this.source.addEventListener('task_updated', (e) => {
            const task = JSON.parse(e.data);
            Board.updateCard(task);
        });

        this.source.addEventListener('task_deleted', (e) => {
            const { id } = JSON.parse(e.data);
            Board.removeCard(id);
        });

        this.source.addEventListener('worker_updated', (e) => {
            WorkerMonitor.update(JSON.parse(e.data));
        });

        this.source.onerror = () => {
            // Auto-reconnect is built into EventSource
            console.warn('SSE connection lost, reconnecting...');
        };
    },

    disconnect() {
        if (this.source) {
            this.source.close();
            this.source = null;
        }
    },
};
