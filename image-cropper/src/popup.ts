const appRoot = document.querySelector<HTMLDivElement>('#app');

if (!appRoot) {
  throw new Error('Missing #app element in popup.html');
}

const initialize = (): void => {
  appRoot.textContent = '';
};

initialize();
