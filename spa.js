function loadTransferPage() {
  fetch('transferencia.html')
    .then(res => res.text())
    .then(html => {
      const overlay = document.getElementById('transfer-overlay');
      if (!overlay) return;
      overlay.innerHTML = '<button id="close-transfer" class="close-transfer">×</button><iframe id="transfer-frame" frameborder="0"></iframe>';
      const frame = document.getElementById('transfer-frame');
      frame.srcdoc = html;
      frame.style.width = '100%';
      frame.style.height = '100%';
      overlay.style.display = 'block';
      history.pushState({page:'transferencia'}, '', 'transferencia.html');
      document.getElementById('close-transfer').addEventListener('click', function(){
        history.back();
      });
    });
}

window.addEventListener('popstate', function(event){
  const overlay = document.getElementById('transfer-overlay');
  if (!overlay) return;
  if (overlay.style.display === 'block') {
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }
});

// Minimal styles for overlay and close button
const style = document.createElement('style');
style.textContent = `
  #transfer-overlay { backdrop-filter: blur(2px); }
  #transfer-overlay .close-transfer {
    position:absolute; top:10px; right:10px; z-index:10001; background:#fff; border:none; font-size:24px; cursor:pointer;
  }
`;
document.head.appendChild(style);
