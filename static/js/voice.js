/**
 * Web Speech API for voice input.
 */
const Voice = {
    recognition: null,
    active: false,

    init() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            document.getElementById('btn-voice').style.display = 'none';
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        const btn = document.getElementById('btn-voice');
        const status = document.getElementById('voice-status');

        this.recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(r => r[0].transcript)
                .join('');
            status.textContent = transcript;
            if (event.results[0].isFinal) {
                TaskForm.appendDescription(transcript);
                status.textContent = 'Added to description';
            }
        };

        this.recognition.onend = () => {
            this.active = false;
            btn.textContent = '🎤 Voice';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
        };

        this.recognition.onerror = (e) => {
            status.textContent = 'Error: ' + e.error;
            this.active = false;
        };

        btn.addEventListener('click', () => {
            if (this.active) {
                this.recognition.stop();
            } else {
                this.recognition.start();
                this.active = true;
                btn.textContent = '⏹ Stop';
                btn.classList.remove('btn-secondary');
                btn.classList.add('btn-primary');
                status.textContent = 'Listening...';
            }
        });
    },
};
