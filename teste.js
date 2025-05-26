(async () => {
  // Função que espera até a condição ser verdadeira ou timeout
  function waitFor(conditionFn, maxAttempts = 30, intervalMs = 100) {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const intervalId = setInterval(() => {
        if (conditionFn()) {
          clearInterval(intervalId);
          resolve();
        } else if (++attempts >= maxAttempts) {
          clearInterval(intervalId);
          reject(new Error('Timeout'));
        }
      }, intervalMs);
    });
  }

  // Função para simular eventos de clique completos (pointerdown, mousedown, mouseup, click)
  function simulateClick(element) {
    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(type => {
      element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    });
  }

  // 1. Responder automaticamente as questões

  // Marca todos checkboxes não marcados
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (!cb.checked) simulateClick(cb);
  });

  // Clica nos spans estilizados como checkbox e radio
  document.querySelectorAll('span.MuiButtonBase-root.MuiCheckbox-root, span.MuiButtonBase-root.MuiRadio-root')
    .forEach(el => el.click());

  // Processa caixas dentro do container específico com delay para evitar erros de renderização
  const container = document.querySelector('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.css-1xs0zn6');
  if (container) {
    for (const box of container.querySelectorAll('.MuiBox-root')) {
      simulateClick(box);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // Processa comboboxes com ids de 1 até 50
  for (let i = 1; i <= 50; i++) {
    const id = `${i}-`;
    const combobox = document.getElementById(id);
    if (combobox && combobox.getAttribute('role') === 'combobox') {
      simulateClick(combobox);

      try {
        // Aguarda o menu abrir
        await waitFor(() => {
          const popup = document.querySelector('[role="presentation"][id^="menu-"]');
          return popup && popup.getAttribute('aria-hidden') !== 'true';
        }, 40, 100);

        // Seleciona a primeira opção do menu
        const option = document.querySelector('[role="option"]');
        if (option) simulateClick(option);

        // Aguarda o menu fechar
        await waitFor(() => {
          const popup = document.querySelector('[role="presentation"][id^="menu-"]');
          return !popup || popup.getAttribute('aria-hidden') === 'true';
        }, 40, 100);

        // Pequena pausa para garantir processamento
        await new Promise(r => setTimeout(r, 200));
      } catch (error) {
        console.warn(`Erro ao processar combobox com id="${id}":`, error);
      }
    }
  }

  // 2. Clica no botão "Finalizar"

  let btnFinalizar = document.querySelector('button[data-testid="botao-finalizar"]');
  if (!btnFinalizar) {
    // Busca botão com texto 'finalizar' caso o seletor falhe
    btnFinalizar = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim().toLowerCase().includes('finalizar'));
  }

  if (!btnFinalizar) {
    console.warn('Botão "Finalizar" não encontrado.');
    return;
  }

  // Torna o botão clicável e visível, caso esteja desabilitado ou oculto
  Object.assign(btnFinalizar.style, {
    pointerEvents: 'auto',
    visibility: 'visible',
    display: 'inline-block'
  });
  btnFinalizar.disabled = false;

  // Scroll para o botão e foco
  btnFinalizar.scrollIntoView({ behavior: 'smooth', block: 'center' });
  btnFinalizar.focus();

  // Simula múltiplos eventos de clique para garantir o disparo
  simulateClick(btnFinalizar);
  await new Promise(r => setTimeout(r, 300));
  btnFinalizar.click();
  console.log('Botão "Finalizar" clicado.');

  // 3. Aguarda e clica no botão "Sim" após finalizar

  try {
    await waitFor(() => !!document.querySelector('button[data-testid="botao-ok"]'), 40, 200);
  } catch {
    console.warn('Botão "Sim" não apareceu após "Finalizar".');
    return;
  }

  const btnSim = document.querySelector('button[data-testid="botao-ok"]');
  if (!btnSim) {
    console.warn('Botão "Sim" não encontrado.');
    return;
  }

  Object.assign(btnSim.style, {
    pointerEvents: 'auto',
    visibility: 'visible',
    display: 'inline-block'
  });
  btnSim.disabled = false;

  btnSim.scrollIntoView({ behavior: 'smooth', block: 'center' });
  btnSim.focus();

  simulateClick(btnSim);
  await new Promise(r => setTimeout(r, 300));
  btnSim.click();

  console.log('Botão "Sim" clicado.');
})();
