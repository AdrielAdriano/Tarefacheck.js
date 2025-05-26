//2


(async () => {
  console.clear();
  const noop = () => {};
  console.warn = console.error = window.debug = noop;

  class NotificationSystem {
    constructor() {
      this.initStyles();
      this.notificationContainer = this.createContainer();
      document.body.appendChild(this.notificationContainer);
    }

    initStyles() {
      const styleId = 'custom-notification-styles';
      if (document.getElementById(styleId)) return;
      const css = `
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 9999;
        }
        .notification {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          background: #1e1e1e;
          color: #fff;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          opacity: 0;
          transform: translateX(100%);
          transition: all 0.3s ease;
          position: relative;
        }
        .notification.show {
          opacity: 1;
          transform: translateX(0);
        }
        .notification.success { border-left: 4px solid #4caf50; }
        .notification.error { border-left: 4px solid #f44336; }
        .notification.info { border-left: 4px solid #2196f3; }
        .notification.warning { border-left: 4px solid #ff9800; }
        .notification-icon svg {
          width: 20px;
          height: 20px;
        }
        .notification-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          width: 100%;
          background: rgba(255, 255, 255, 0.2);
        }
        .notification-progress.animate {
          animation: progressBar linear forwards;
        }
        @keyframes progressBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `;
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = css;
      document.head.appendChild(style);
    }

    createContainer() {
      const container = document.createElement('div');
      container.className = 'notification-container';
      return container;
    }

    createIcon(type) {
      const iconWrapper = document.createElement('div');
      iconWrapper.className = 'notification-icon';
      const icons = {
        success: `<svg fill="#4caf50" viewBox="0 0 24 24"><path d="M9 16.2l-3.5-3.5L4 14.2l5 5 12-12-1.5-1.4z"/></svg>`,
        error: `<svg fill="#f44336" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
        info: `<svg fill="#2196f3" viewBox="0 0 24 24"><path d="M11 9h2V7h-2v2zm0 2h2v6h-2v-6zm1-9C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z"/></svg>`,
        warning: `<svg fill="#ff9800" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`
      };
      iconWrapper.innerHTML = icons[type] || '';
      return iconWrapper;
    }

    show(message, options = {}) {
      const { duration = 5000, type = 'info' } = options;
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.appendChild(this.createIcon(type));
      const textSpan = document.createElement('span');
      textSpan.textContent = message;
      notification.appendChild(textSpan);
      const progressBar = document.createElement('div');
      progressBar.className = 'notification-progress animate';
      progressBar.style.animationDuration = `${duration}ms`;
      notification.appendChild(progressBar);
      this.notificationContainer.appendChild(notification);
      requestAnimationFrame(() => notification.classList.add('show'));
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
      }, duration);
    }

    success(message, duration = 5000) { this.show(message, { type: 'success', duration }); }
    error(message, duration = 5000) { this.show(message, { type: 'error', duration }); }
    info(message, duration = 5000) { this.show(message, { type: 'info', duration }); }
    warning(message, duration = 5000) { this.show(message, { type: 'warning', duration }); }
  }

  const notifications = new NotificationSystem();

  function removeHtmlTags(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent || div.innerText || '';
  }

  function transformJson(jsonOriginal) {
    if (!jsonOriginal?.task?.questions) throw new Error("Estrutura de dados inválida.");
    const novoJson = {
      accessed_on: jsonOriginal.accessed_on,
      executed_on: jsonOriginal.executed_on,
      answers: {}
    };

    for (const questionId in jsonOriginal.answers) {
      const questionData = jsonOriginal.answers[questionId];
      const taskQuestion = jsonOriginal.task.questions.find(q => q.id === parseInt(questionId));
      if (!taskQuestion) continue;

      const answerPayload = {
        question_id: questionData.question_id,
        question_type: taskQuestion.type,
        answer: null
      };

      try {
        switch (taskQuestion.type) {
          case "order-sentences":
            answerPayload.answer = taskQuestion.options?.sentences?.map(s => s.value) || [];
            break;
          case "fill-words":
            answerPayload.answer = taskQuestion.options?.phrase?.filter((_, i) => i % 2 !== 0).map(i => i.value) || [];
            break;
          case "text_ai":
            answerPayload.answer = { "0": removeHtmlTags(taskQuestion.comment || '') };
            break;
          case "fill-letters":
            answerPayload.answer = taskQuestion.options?.answer || '';
            break;
          case "cloud":
            answerPayload.answer = taskQuestion.options?.ids || [];
            break;
          default:
            answerPayload.answer = Object.fromEntries(
              Object.entries(taskQuestion.options || {}).map(([k, v]) => [k, !!v.answer])
            );
            break;
        }
        novoJson.answers[questionId] = answerPayload;
      } catch (e) {
        notifications.error(`Erro na questão ${questionId}`, 4000);
      }
    }

    return novoJson;
  }

  async function pegarRespostasCorretas(taskId, answerId, headers) {
    const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
    const res = await fetch(url, { method: "GET", headers });
    if (!res.ok) throw new Error(`Erro ${res.status} ao buscar respostas`);
    return await res.json();
  }

  async function enviarRespostasCorrigidas(respostas, taskId, answerId, headers) {
    const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}`;
    const payload = transformJson(respostas);
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Erro ao enviar respostas corrigidas");
    notifications.success("Tarefa corrigida com sucesso!", 5000);
  }

  async function loadCss(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${url}"]`)) return resolve();
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  function enableSecurityMeasures() {
    document.body.style.userSelect = 'none';
    const style = document.createElement('style');
    style.textContent = `img, svg, canvas, video { pointer-events: none !important; user-drag: none !important; }`;
    document.head.appendChild(style);
  }

  await loadCss('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap');
  enableSecurityMeasures();
  notifications.success("TarefasResolver iniciado com sucesso! Feito por @Adrielzzz300", 3000);
  notifications.info("Aguardando login no Sala do Futuro...", 5000);

  let capturedLoginData = null;
  const originalFetch = window.fetch;

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;

    if (url.includes('/registration/edusp/token') && !capturedLoginData) {
      try {
        const res = await originalFetch.apply(this, arguments);
        const data = await res.clone().json();
        if (data?.auth_token) {
          capturedLoginData = data;
          notifications.success("Login detectado com sucesso!", 3000);
        }
        return res;
      } catch {
        notifications.error("Falha ao capturar o token de login.", 4000);
      }
    }

    if (url.match(/^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer$/) && init?.method === 'POST') {
      const res = await originalFetch.apply(this, arguments);
      const json = await res.clone().json();
      if (json?.status !== "draft" && json?.id && json?.task_id && capturedLoginData?.auth_token) {
        notifications.info("Enviando correção automática...", 3000);
        const headers = {
          "x-api-realm": "edusp",
          "x-api-platform": "webclient",
          "x-api-key": capturedLoginData.auth_token,
          "content-type": "application/json"
        };
        try {
          const respostas = await pegarRespostasCorretas(json.task_id, json.id, headers);
          await enviarRespostasCorrigidas(respostas, json.task_id, json.id, headers);
        } catch {
          notifications.error("Erro na correção automática.", 4000);
        }
      }
      return res;
    }

    return originalFetch.apply(this, arguments);
  };

  // Auto clique
  function simulateClick(el) {
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(ev =>
      el.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true }))
    );
  }

  document.querySelectorAll('input[type="checkbox"]:not(:checked)').forEach(simulateClick);
  document.querySelectorAll('span.MuiButtonBase-root.MuiCheckbox-root, span.MuiButtonBase-root.MuiRadio-root').forEach(el => el.click());

  const boxContainer = document.querySelector('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.css-1xs0zn6');
  if (boxContainer) {
    for (const box of boxContainer.querySelectorAll('.MuiBox-root')) {
      simulateClick(box);
      await new Promise(r => setTimeout(r, 150));
    }
  }
})();
