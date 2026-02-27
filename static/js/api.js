/**
 * API wrapper — all fetch calls go through here.
 */
const API = {
    base: '/api',

    async request(method, path, body) {
        const opts = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) opts.body = JSON.stringify(body);
        const res = await fetch(this.base + path, opts);
        if (res.status === 204) return null;
        if (!res.ok) {
            const err = await res.json().catch(() => ({ detail: res.statusText }));
            throw new Error(err.detail || 'Request failed');
        }
        return res.json();
    },

    // Tasks
    getBoard()           { return this.request('GET', '/tasks/board'); },
    getTasks(status)     { return this.request('GET', '/tasks' + (status ? `?status=${status}` : '')); },
    getTask(id)          { return this.request('GET', `/tasks/${id}`); },
    createTask(data)     { return this.request('POST', '/tasks', data); },
    updateTask(id, data) { return this.request('PATCH', `/tasks/${id}`, data); },
    deleteTask(id)       { return this.request('DELETE', `/tasks/${id}`); },
    getTaskLogs(id)      { return this.request('GET', `/tasks/${id}/logs`); },

    // Workers
    getWorkers()         { return this.request('GET', '/workers'); },
    getStats()           { return this.request('GET', '/stats'); },
};
