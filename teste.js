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

  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (!cb.checked) simulateClick(cb);
  });

  document.querySelectorAll('span.MuiButtonBase-root.MuiCheckbox-root').forEach(el => el.click());
  document.querySelectorAll('span.MuiButtonBase-root.MuiRadio-root').forEach(el => el.click());

  const container = document.querySelector('.MuiGrid-root.MuiGrid-item.MuiGrid-grid-xs-12.css-1xs0zn6');
  if (container) {
    for (const box of container.querySelectorAll('.MuiBox-root')) {
      simulateClick(box);
      await new Promise(r => setTimeout(r, 150));
    }
  }

  for (let i = 1; i <= 50; i++) {
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
        console.warn(Erro combobox id="${id}":, e);
      }
    }
  }

  let btnFinalizar = document.querySelector('button[data-testid="botao-finalizar"]');
  if (!btnFinalizar) {
    btnFinalizar = Array.from(document.querySelectorAll('button'))
      .find(b => b.textContent.trim().toLowerCase().includes('finalizar'));
  }

  if (btnFinalizar) {
    btnFinalizar.style.pointerEvents = 'auto';
    btnFinalizar.style.visibility = 'visible';
    btnFinalizar.style.display = 'inline-block';
    btnFinalizar.disabled = false;

    btnFinalizar.scrollIntoView({ behavior: "smooth", block: "center" });
    btnFinalizar.focus();
    btnFinalizar.click();

    try {
      HTMLElement.prototype.click.call(btnFinalizar);
    } catch {}

    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(t => {
      btnFinalizar.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    });

    await new Promise(r => setTimeout(r, 300));
    btnFinalizar.click();
    console.log('Botão "Finalizar" clicado.');
  }

  try {
    await waitFor(() => document.querySelector('button[data-testid="botao-ok"]'), 40, 200);
  } catch {
    console.warn('Botão "Sim" não apareceu após "Finalizar".');
    return;
  }

  const btnSim = document.querySelector('button[data-testid="botao-ok"]');
  if (btnSim) {
    btnSim.style.pointerEvents = 'auto';
    btnSim.style.visibility = 'visible';
    btnSim.style.display = 'inline-block';
    btnSim.disabled = false;

    btnSim.scrollIntoView({ behavior: "smooth", block: "center" });
    btnSim.focus();
    btnSim.click();

    try {
      HTMLElement.prototype.click.call(btnSim);
    } catch {}

    ['pointerdown', 'mousedown', 'mouseup', 'click'].forEach(t => {
      btnSim.dispatchEvent(new MouseEvent(t, { bubbles: true, cancelable: true, view: window }));
    });

    await new Promise(r => setTimeout(r, 300));
    btnSim.click();
    console.log('Botão "Sim" clicado.');
  }
});
