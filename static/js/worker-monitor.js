/**
 * Worker status display.
 */
const WorkerMonitor = {
    async refresh() {
        try {
            const workers = await API.getWorkers();
            const active = workers.filter(w => w.status === 'busy').length;
            document.getElementById('worker-count').textContent = `${active}/${workers.length} workers`;
        } catch {
            // Workers endpoint may not be ready yet
        }
    },

    update(worker) {
        this.refresh();
    },

    async refreshStats() {
        try {
            const stats = await API.getStats();
            document.getElementById('cost-total').textContent = `$${stats.total_cost_usd.toFixed(2)}`;
        } catch {
            // Stats endpoint may not be ready yet
        }
    },
};
