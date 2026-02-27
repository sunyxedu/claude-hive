/**
 * Task creation form handler.
 */
const TaskForm = {
    init() {
        const dialog = document.getElementById('task-dialog');
        const form = document.getElementById('task-form');
        const btnNew = document.getElementById('btn-new-task');

        btnNew.addEventListener('click', () => dialog.showModal());

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fd = new FormData(form);
            try {
                await API.createTask({
                    title: fd.get('title'),
                    description: fd.get('description') || '',
                    priority: parseInt(fd.get('priority')) || 5,
                    plan_mode: fd.has('plan_mode'),
                });
                form.reset();
                // Re-check the plan_mode checkbox after reset
                form.querySelector('[name="plan_mode"]').checked = true;
                form.querySelector('[name="priority"]').value = '5';
                dialog.close();
                await App.refreshBoard();
            } catch (err) {
                alert('Failed to create task: ' + err.message);
            }
        });
    },

    setDescription(text) {
        document.querySelector('#task-form [name="description"]').value = text;
    },

    appendDescription(text) {
        const ta = document.querySelector('#task-form [name="description"]');
        ta.value = ta.value ? ta.value + '\n' + text : text;
    },
};
