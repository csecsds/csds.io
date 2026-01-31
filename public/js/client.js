(function(){
  const socket = io();
  function render(container, pdfs){
    container.innerHTML = '';
    pdfs.forEach(p=>{
      const a = document.createElement('a');
      a.href = '/viewer.html?file=' + encodeURIComponent(p.name);
      a.className = 'download-btn';
      a.style.marginLeft='10px';
      a.textContent = '📄 ' + p.name;
      a.target = '_blank';
      container.appendChild(a);
    });
  }
  async function load(){
    const res = await fetch('/api/pdfs');
    if (!res.ok) return;
    const pdfs = await res.json();
    const container = document.getElementById('pdf-links');
    if (container) render(container, pdfs);
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    load();
    socket.on('pdf-updated', ()=> load());    socket.on('pdf-deleted', ()=> load());    socket.on('pdfs-list', ()=> load());
  });
})();