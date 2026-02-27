/**
 * Kanban board rendering.
 */
const Board = {
    render(boardData) {
        for (const [status, tasks] of Object.entries(boardData)) {
            const list = document.querySelector(`.card-list[data-status="${status}"]`);
            if (!list) continue;
            list.innerHTML = '';
            for (const task of tasks) {
                list.appendChild(this.createCard(task));
            }
        }
    },

    createCard(task) {
        const card = document.createElement('div');
        card.className = 'card';
        card.dataset.taskId = task.id;

        let meta = `<span class="card-priority">P${task.priority}</span>`;
        if (task.assigned_worker_id) {
            meta += `<span class="card-worker">W${task.assigned_worker_id}</span>`;
        }
        if (task.cost_usd > 0) {
            meta += `<span class="card-cost">$${task.cost_usd.toFixed(2)}</span>`;
        }

        card.innerHTML = `
            <div class="card-title">${this.escapeHtml(task.title)}</div>
            <div class="card-meta">${meta}</div>
            ${task.error_message ? `<div class="card-error">${this.escapeHtml(task.error_message)}</div>` : ''}
        `;
        card.addEventListener('click', () => this.showDetail(task.id));
        return card;
    },

    async showDetail(taskId) {
        const [task, logs] = await Promise.all([
            API.getTask(taskId),
            API.getTaskLogs(taskId),
        ]);

        const el = document.getElementById('task-detail-content');
        el.innerHTML = `
            <h3>${this.escapeHtml(task.title)}</h3>
            <div class="detail-grid">
                <span class="detail-label">Status</span><span>${task.status}</span>
                <span class="detail-label">Priority</span><span>${task.priority}</span>
                <span class="detail-label">Worker</span><span>${task.assigned_worker_id ?? '—'}</span>
                <span class="detail-label">Retries</span><span>${task.retry_count} / ${task.max_retries}</span>
                <span class="detail-label">Tokens</span><span>${task.tokens_input.toLocaleString()} in / ${task.tokens_output.toLocaleString()} out</span>
                <span class="detail-label">Cost</span><span>$${task.cost_usd.toFixed(4)}</span>
                <span class="detail-label">Created</span><span>${task.created_at}</span>
                <span class="detail-label">Branch</span><span>${task.branch_name ?? '—'}</span>
                <span class="detail-label">Commit</span><span>${task.commit_sha ? task.commit_sha.slice(0, 8) : '—'}</span>
            </div>
            ${task.description ? `<p style="font-size:0.85rem;margin-bottom:12px;white-space:pre-wrap;">${this.escapeHtml(task.description)}</p>` : ''}
            <h4 style="margin-bottom:6px;font-size:0.85rem;">Logs</h4>
            <div class="log-list">${logs.length ? logs.map(l => `<div class="log-entry">[${l.event_type}] ${this.escapeHtml(l.message)}</div>`).join('') : '<div style="color:var(--text-dim)">No logs yet</div>'}</div>
        `;
        document.getElementById('task-detail-dialog').showModal();
    },

    updateCard(task) {
        // Remove old card if exists
        const old = document.querySelector(`.card[data-task-id="${task.id}"]`);
        if (old) old.remove();

        // Insert into correct column
        const list = document.querySelector(`.card-list[data-status="${task.status}"]`);
        if (list) list.prepend(this.createCard(task));
    },

    removeCard(taskId) {
        const card = document.querySelector(`.card[data-task-id="${taskId}"]`);
        if (card) card.remove();
    },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    },
};
