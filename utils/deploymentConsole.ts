/**
 * deploymentConsole.ts
 * 
 * A vanilla JS + Tailwind utility to launch a deployment console modal.
 * Connects to the GCP agent and streams logs.
 */

export async function launchGCPDeployment(repoUrl: string, projectName: string, port: number): Promise<void> {
    // 1. Create Modal Container
    const modalId = 'deployment-console-modal';
    const existingModal = document.getElementById(modalId);
    if (existingModal) {
        existingModal.remove();
    }

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.className = 'fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200';

    // Modal Body
    const modal = document.createElement('div');
    modal.className = 'w-full max-w-4xl bg-gray-900 rounded-xl shadow-2xl border border-gray-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300';
    modal.style.height = '80vh';

    // Header
    const header = document.createElement('div');
    header.className = 'flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'flex items-center gap-3';

    const statusDot = document.createElement('div');
    statusDot.className = 'w-3 h-3 bg-green-500 rounded-full animate-pulse';

    const title = document.createElement('h3');
    title.className = 'text-lg font-mono font-bold text-white';
    title.textContent = 'Deployment Console';

    // Repository info in header
    const repoInfo = document.createElement('span');
    repoInfo.className = 'text-xs text-gray-400 font-mono ml-4 px-2 py-1 bg-gray-900 rounded border border-gray-700';
    repoInfo.textContent = `${projectName} :${port}`;

    titleGroup.appendChild(statusDot);
    titleGroup.appendChild(title);
    titleGroup.appendChild(repoInfo);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'text-xs font-bold text-gray-400 hover:text-white hover:bg-red-600/20 hover:border-red-600/50 border border-transparent px-3 py-1.5 rounded transition-all uppercase tracking-wider';
    closeBtn.onclick = () => {
        overlay.remove();
    };

    header.appendChild(titleGroup);
    header.appendChild(closeBtn);

    // Terminal Window
    const terminal = document.createElement('div');
    terminal.className = 'flex-1 bg-black p-6 overflow-y-auto font-mono text-sm space-y-1 custom-scrollbar';
    terminal.style.scrollBehavior = 'smooth';

    // Initial Log
    const initLine = document.createElement('div');
    initLine.className = 'text-blue-400';
    initLine.textContent = `> Initiating deployment for ${projectName}...\n> Target Port: ${port}\n> Repository: ${repoUrl}\n> Connecting to agent...`;
    terminal.appendChild(initLine);

    modal.appendChild(header);
    modal.appendChild(terminal);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // 2. Stream Logic
    try {
        const response = await fetch('http://35.208.82.250:5001/deploy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                repoUrl,
                projectName,
                port
            }),
        });

        if (!response.body) {
            throw new Error('ReadableStream not supported or no body response.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let done = false;

        while (!done) {
            const { value, done: doneReading } = await reader.read();
            done = doneReading;

            if (value) {
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                lines.forEach(line => {
                    if (!line.trim()) return;

                    const lineEl = document.createElement('div');

                    // Style specific lines
                    if (line.includes('ERROR') || line.includes('Error') || line.includes('failed')) {
                        lineEl.className = 'text-red-500 font-bold';
                    } else if (line.includes('WARNING')) {
                        lineEl.className = 'text-yellow-400';
                    } else if (line.includes('[DONE]')) {
                        lineEl.className = 'text-green-400 font-bold mt-4 pt-4 border-t border-gray-800';

                        // Success Action
                        const actionContainer = document.createElement('div');
                        actionContainer.className = 'mt-6 flex justify-center';

                        const viewButton = document.createElement('button');
                        viewButton.className = 'flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-green-900/20 transition-all hover:scale-105';
                        viewButton.innerHTML = `
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              View Live Demo
            `;
                        viewButton.onclick = () => {
                            window.open(`http://35.208.82.250:${port}`, '_blank');
                        };

                        actionContainer.appendChild(viewButton);
                        terminal.appendChild(actionContainer);

                        // Stop spinner
                        statusDot.className = 'w-3 h-3 bg-green-500 rounded-full'; // remove animate-pulse
                        statusDot.style.boxShadow = '0 0 10px #22c55e';
                    } else {
                        lineEl.className = 'text-green-500/80';
                    }

                    lineEl.textContent = line.includes('[DONE]') ? '✨ Deployment Completed Successfully!' : `> ${line}`;
                    terminal.appendChild(lineEl);
                });

                // Auto Scroll
                terminal.scrollTop = terminal.scrollHeight;
            }
        }
    } catch (error) {
        const errLine = document.createElement('div');
        errLine.className = 'text-red-500 font-bold mt-2';
        errLine.textContent = `> CONNECTION ERROR: ${error instanceof Error ? error.message : String(error)}`;
        terminal.appendChild(errLine);

        // Stop spinner
        statusDot.className = 'w-3 h-3 bg-red-500 rounded-full';
    }
}
