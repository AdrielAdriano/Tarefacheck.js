(async () => {
  // Função que aguarda uma condição ser verdadeira, timeout após 'm' tentativas, intervalo 'd' ms
  function waitFor(cond, m = 50, d = 100) {
    return new Promise((res, rej) => {
      let i = 0;
      const interval = setInterval(() => {
        if (cond()) {
          clearInterval(interval);
          res();
        } else if (++i >= m) {
          clearInterval(interval);
          rej('Timeout esperando condição');
        }
      }, d);
    });
  }

  // Função para disparar eventos de clique realistas
  function simulateClick(el) {
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(eventType => {
      el.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
    });
  }

  try {
    // Aguarda checkbox aparecer e marca os não marcados
    await waitFor(() => document.querySelectorAll('input[type="checkbox"]').length > 0);
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (!cb.checked) simulateClick(cb);
    });
    console.log('Checkboxes marcados.');

    // Aguarda spans de checkbox e radio e clica neles
    await waitFor(() => document.querySelectorAll('span.MuiButtonBase-root.MuiCheckbox-root, span.MuiButtonBase-root.MuiRadio-root').length > 0);
    document.querySelectorAll('span.MuiButtonBase-root.MuiCheckbox-root, span.MuiButtonBase-root.MuiRadio-root').forEach(el => simulateClick(el));
    console.log('Spans de checkbox e radio clicados.');

    // Processa comboboxes - tenta clicar e selecionar primeira opção
    for (let i = 1; i <= 50; i++) {
      const box = document.getElementById(i + '-');
      if (box && box.getAttribute('role') === 'combobox') {
        simulateClick(box);
        try {
          await waitFor(() => {
            const menu = document.querySelector('[role="presentation"][id^="menu-"]');
            return menu && menu.getAttribute('aria-hidden') !== 'true';
          }, 40, 100);
          const option = document.querySelector('[role="option"]');
          if (option) simulateClick(option);
          await waitFor(() => {
            const menu = document.querySelector('[role="presentation"][id^="menu-"]');
            return !menu || menu.getAttribute('aria-hidden') === 'true';
          }, 40, 100);
          await new Promise(r => setTimeout(r, 200));
          console.log(`Combobox ${i} selecionado.`);
        } catch (e) {
          console.warn(`Erro ao processar combobox ${i}:`, e);
        }
      }
    }

    // Aguarda botão "Finalizar"
    await waitFor(() => {
      return document.querySelector('button[data-testid="botao-finalizar"]') ||
        Array.from(document.querySelectorAll('button')).some(b => b.textContent.toLowerCase().includes('finalizar'));
    }, 50, 200);

    let btnFinalizar = document.querySelector('button[data-testid="botao-finalizar"]');
    if (!btnFinalizar) {
      btnFinalizar = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.toLowerCase().includes('finalizar'));
    }

    if (!btnFinalizar) throw new Error('Botão "Finalizar" não encontrado.');

    btnFinalizar.style.pointerEvents = 'auto';
    btnFinalizar.style.visibility = 'visible';
    btnFinalizar.style.display = 'inline-block';
    btnFinalizar.disabled = false;

    btnFinalizar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    btnFinalizar.focus();
    simulateClick(btnFinalizar);
    await new Promise(r => setTimeout(r, 500));
    btnFinalizar.click();
    console.log('Botão "Finalizar" clicado.');

    // Aguarda botão "Sim" aparecer e clica nele
    await waitFor(() => document.querySelector('button[data-testid="botao-ok"]'), 50, 200);
    const btnSim = document.querySelector('button[data-testid="botao-ok"]');
    if (!btnSim) throw new Error('Botão "Sim" não encontrado.');

    btnSim.style.pointerEvents = 'auto';
    btnSim.style.visibility = 'visible';
    btnSim.style.display = 'inline-block';
    btnSim.disabled = false;

    btnSim.scrollIntoView({ behavior: 'smooth', block: 'center' });
    btnSim.focus();
    simulateClick(btnSim);
    await new Promise(r => setTimeout(r, 500));
    btnSim.click();
    console.log('Botão "Sim" clicado.');

  } catch (err) {
    console.error('Erro no auto responder:', err);
  }
})();
