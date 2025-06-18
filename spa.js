function loadTransferPage() {
  fetch('transferencia.html')
    .then(res => res.text())
    .then(html => {
      const overlay = document.getElementById('transfer-overlay');
      if (!overlay) return;
      overlay.innerHTML = '<div class="transfer-container"><div id="close-transfer" class="transfer-close"><i class="fas fa-times"></i></div><iframe id="transfer-frame" frameborder="0"></iframe></div>';
      const frame = document.getElementById('transfer-frame');
      frame.srcdoc = html;
      frame.style.width = '100%';
      frame.style.height = '100%';
      overlay.style.display = 'block';
      history.pushState({page:"transferencia"}, '', 'transferencia.html');
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
  .transfer-close {
    position:absolute;
    top:10px;
    right:10px;
    width:32px;
    height:32px;
    border-radius:50%;
    background:var(--neutral-200, #eee);
    display:flex;
    align-items:center;
    justify-content:center;
    cursor:pointer;
  }
`;
document.head.appendChild(style);
