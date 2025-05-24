await page.evaluate(async () => {
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

  // Clica nos spans que são checkboxes/radios estilizados
  document.querySelectorAll('span.MuiButtonBase-root.MuiCheckbox-root').forEach(el => el.click());
  document.querySelectorAll('span.MuiButtonBase-root.MuiRadio-root').forEach(el => el.click());

  // Processa as boxes dentro do container
  const container = document.querySelector('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.css-1xs0zn6');
  if (container) {
    for (const box of container.querySelectorAll('.MuiBox-root')) {
      simulateClick(box);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  // Processa comboboxes id 1 a 13
  for (let i = 1; i <= 13; i++) {
    const id = i + '-', box = document.getElementById(id);
    if (box && box.getAttribute('role') === 'combobox') {
      simulateClick(box);
      try {
        await waitFor(() => {
          const p = document.querySelector('[role="presentation"][id^="menu-"]');
          return p && p.getAttribute('aria-hidden') !== 'true';
        }, 40, 100);
        const option = document.querySelector('[role="option"]');
        if (option) simulateClick(option);
        await waitFor(() => {
          const p = document.querySelector('[role="presentation"][id^="menu-"]');
          return !p || p.getAttribute('aria-hidden') === 'true';
        }, 40, 100);
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        console.warn(`Erro combobox id="${id}":`, e);
      }
    }
  }

  // Clique no botão "Sim"
  const btnSim = document.querySelector('button[data-testid="botao-ok"]');
  if (!btnSim) {
    console.warn('Botão "Sim" não encontrado.');
    return;
  }

  // Remove bloqueios visuais e funcionais no botão
  btnSim.style.pointerEvents = 'auto';
  btnSim.style.visibility = 'visible';
  btnSim.style.display = 'inline-block';
  btnSim.disabled = false;

  btnSim.scrollIntoView({ behavior: "smooth", block: "center" });

  // Dá foco e tenta clicar normal
  btnSim.focus();
  btnSim.click();

  // Força o click com call
  try {
    HTMLElement.prototype.click.call(btnSim);
  } catch (e) {
    console.warn('Erro forçando click:', e);
  }

  // Dispara eventos para garantir o clique
  ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(t => {
    btnSim.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
  });

  // Espera um pouco e tenta outro clique
  await new Promise(r => setTimeout(r, 300));
  btnSim.click();

  console.log('Tentativas de clique no botão "Sim" feitas.');
});
