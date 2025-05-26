(async () => {
  // ====================== PARTE 1: SCRIPT PRINCIPAL COM NOTIFICAÇÕES ======================
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
      const css = `...`; // (Mantenha o CSS do NotificationSystem aqui)
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
      let iconSvg = '';
      // (Insira aqui os SVGs conforme o tipo)
      iconWrapper.innerHTML = iconSvg;
      return iconWrapper;
    }

    show(message, options = {}) {
      const { duration = 5000, type = 'info' } = options;
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      const icon = this.createIcon(type);
      notification.appendChild(icon);
      const textSpan = document.createElement('span');
      textSpan.textContent = message;
      notification.appendChild(textSpan);
      const progressBar = document.createElement('div');
      progressBar.className = 'notification-progress';
      notification.appendChild(progressBar);
      this.notificationContainer.appendChild(notification);
      notification.offsetHeight;
      notification.classList.add('show');
      progressBar.classList.add('animate');
      progressBar.style.animationDuration = `${duration}ms`;
      setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
          if (notification.parentNode) {
            this.notificationContainer.removeChild(notification);
          }
        }, 300);
      }, duration);
      return notification;
    }

    success(message, duration = 5000) {
      return this.show(message, { type: 'success', duration });
    }

    error(message, duration = 5000) {
      return this.show(message, { type: 'error', duration });
    }

    info(message, duration = 5000) {
      return this.show(message, { type: 'info', duration });
    }

    warning(message, duration = 5000) {
      return this.show(message, { type: 'warning', duration });
    }
  }

  function removeHtmlTags(htmlString) {
    const div = document.createElement('div');
    div.innerHTML = htmlString || '';
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
            if (taskQuestion.options?.sentences?.length) {
              answerPayload.answer = taskQuestion.options.sentences.map(sentence => sentence.value);
            }
            break;
          case "fill-words":
            if (taskQuestion.options?.phrase?.length) {
              answerPayload.answer = taskQuestion.options.phrase
                .map(item => item.value)
                .filter((_, index) => index % 2 !== 0);
            }
            break;
          case "text_ai":
            answerPayload.answer = { "0": removeHtmlTags(taskQuestion.comment || '') };
            break;
          case "fill-letters":
            if (taskQuestion.options?.answer !== undefined) {
              answerPayload.answer = taskQuestion.options.answer;
            }
            break;
          case "cloud":
            if (taskQuestion.options?.ids?.length) {
              answerPayload.answer = taskQuestion.options.ids;
            }
            break;
          default:
            if (taskQuestion.options && typeof taskQuestion.options === 'object') {
              answerPayload.answer = Object.fromEntries(
                Object.keys(taskQuestion.options).map(optionId => {
                  const optionData = taskQuestion.options[optionId];
                  const answerValue = optionData?.answer !== undefined ? optionData.answer : false;
                  return [optionId, answerValue];
                })
              );
            }
            break;
        }
        novoJson.answers[questionId] = answerPayload;
      } catch (err) {
        notifications.error(`Erro processando questão ${questionId}.`, 5000);
      }
    }
    return novoJson;
  }

  async function pegarRespostasCorretas(taskId, answerId, headers) {
    const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}?with_task=true&with_genre=true&with_questions=true&with_assessed_skills=true`;
    const response = await fetch(url, { method: "GET", headers });
    if (!response.ok) throw new Error(`Erro ${response.status} ao buscar respostas.`);
    return await response.json();
  }

  async function enviarRespostasCorrigidas(respostasAnteriores, taskId, answerId, headers) {
    const url = `https://edusp-api.ip.tv/tms/task/${taskId}/answer/${answerId}`;
    try {
      const novasRespostasPayload = transformJson(respostasAnteriores);
      const response = await fetch(url, {
        method: "PUT",
        headers,
        body: JSON.stringify(novasRespostasPayload)
      });
      if (!response.ok) throw new Error(`Erro ${response.status} ao enviar respostas.`);
      notifications.success("Tarefa corrigida com sucesso!", 6000);
    } catch (error) {}
  }

  async function loadCss(url) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`link[href="${url}"]`)) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = resolve;
      link.onerror = () => reject(new Error(`Falha ao carregar ${url}`));
      document.head.appendChild(link);
    });
  }

  let capturedLoginData = null;
  const originalFetch = window.fetch;
  const notifications = new NotificationSystem();

  function enableSecurityMeasures() {
    document.body.style.userSelect = 'none';
    const styleElement = document.createElement('style');
    styleElement.textContent = `img, svg, canvas, video { pointer-events: none !important; -webkit-user-drag: none !important; }`;
    document.head.appendChild(styleElement);
  }

  try {
    await Promise.all([
      loadCss('https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap')
    ]);
    notifications.success(`TarefasResolver iniciado com sucesso! feito por @Adrielzzz300`, 3000);
    notifications.info("Aguardando o login no Sala do Futuro...", 6000);
    enableSecurityMeasures();
  } catch (error) {
    return;
  }

  window.fetch = async function(input, init) {
    const url = typeof input === 'string' ? input : input.url;
    const method = init?.method || 'GET';

    if (url === 'https://edusp-api.ip.tv/registration/edusp/token' && !capturedLoginData) {
      try {
        const response = await originalFetch.apply(this, arguments);
        const clonedResponse = response.clone();
        const data = await clonedResponse.json();
        if (data?.auth_token) {
          capturedLoginData = data;
          setTimeout(() => {
            notifications.success(`Login bem-sucedido! Divirta-se e faça as tarefas.`, 3500);
          }, 250);
        }
        return response;
      } catch (error) {
        notifications.error("Erro ao capturar token.", 5000);
        return originalFetch.apply(this, arguments);
      }
    }

    const response = await originalFetch.apply(this, arguments);
    const answerSubmitRegex = /^https:\/\/edusp-api\.ip\.tv\/tms\/task\/\d+\/answer$/;
    if (answerSubmitRegex.test(url) && init?.method === 'POST') {
      if (!capturedLoginData?.auth_token) return response;
      try {
        const clonedResponse = response.clone();
        const submittedData = await clonedResponse.json();
        if (submittedData?.status !== "draft" && submittedData?.id && submittedData?.task_id) {
          notifications.info("Envio detectado! Iniciando correção...", 4000);
          const headers = {
            "x-api-realm": "edusp",
            "x-api-platform": "webclient",
            "x-api-key": capturedLoginData.auth_token,
            "content-type": "application/json"
          };
          setTimeout(async () => {
            try {
              const respostas = await pegarRespostasCorretas(submittedData.task_id, submittedData.id, headers);
              await enviarRespostasCorrigidas(respostas, submittedData.task_id, submittedData.id, headers);
            } catch (error) {
              notifications.error("Erro na correção automática.", 5000);
            }
          }, 500);
        }
      } catch (err) {
        notifications.error("Erro ao processar envio.", 5000);
      }
    }

    return response;
  };

  // ====================== PARTE 2: AUTO CLIQUE E MARCAÇÃO DE RESPOSTAS ======================
  function waitFor(cond, m = 30, d = 100) {
    return new Promise((res, rej) => {
      let i = 0;
      const setI = setInterval(() => {
        if (cond()) {
          clearInterval(setI);
          res();
        } else if (++i >= m) {
          clearInterval(setI);
          rej('Timeout');
        }
      }, d);
    });
  }

  function simulateClick(el) {
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(t => {
      el.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    });
  }

  // Marca checkboxes não marcadas
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (!cb.checked) simulateClick(cb);
  });

  // Clica nos spans estilizados
  document.querySelectorAll('span.MuiButtonBase-root.MuiCheckbox-root').forEach(el => el.click());
  document.querySelectorAll('span.MuiButtonBase-root.MuiRadio-root').forEach(el => el.click());

  // Processa boxes dentro do container
  const container = document.querySelector('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.css-1xs0zn6');
  if (container) {
    for (const box of container.querySelectorAll('.MuiBox-root')) {
      simulateClick(box);
      await new Promise(r => setTimeout(r, 150));
    }
  }

})();
