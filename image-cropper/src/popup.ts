const appRoot = document.querySelector<HTMLDivElement>('#app');
const fileInput = document.querySelector<HTMLInputElement>('#fileInput');
const downloadButton = document.querySelector<HTMLButtonElement>('#downloadButton');
const resetButton = document.querySelector<HTMLButtonElement>('#resetButton');

const initialize = (): void => {
  if (!appRoot || !fileInput || !downloadButton || !resetButton) {
    console.error('Popup markup missing required elements.');
    return;
  }

  const handleReset = (): void => {
    fileInput.value = '';
    downloadButton.disabled = true;
  };

  const handleFileSelection = (): void => {
    if (!fileInput.files || fileInput.files.length === 0) {
      downloadButton.disabled = true;
      return;
    }

    downloadButton.disabled = false;
  };

  fileInput.addEventListener('change', handleFileSelection);
  resetButton.addEventListener('click', handleReset);
};

document.addEventListener('DOMContentLoaded', initialize);
