window.ONEVELA_APP_URLS = Object.assign({
  portal: 'https://deluxe-panda-4b66fb.netlify.app',
  home: 'https://deluxe-panda-4b66fb.netlify.app',
  finance: 'https://effortless-eclair-c20651.netlify.app',
  operation: 'https://onevela-cost.netlify.app',
  erp: 'https://onevela-cost.netlify.app/erp-demo.html'
}, window.ONEVELA_APP_URLS || {});

(function(){
  const PAGE = (location.pathname.split('/').pop() || '').toLowerCase();
  const DEFAULT_APP = {
    portal: 'https://onevela-main-20260529.pages.dev/home.html',
    operation: 'https://onevela-operation-20260529.pages.dev/operation.html',
    finance: 'https://onevela-finance-ai-20260528.pages.dev/finance-accounting',
    erp: 'https://onevela-operation-20260529.pages.dev/erp-demo.html'
  };
  function resolveAppUrls(){
    let stored = {};
    try{
      stored = JSON.parse(localStorage.getItem('onevelaAppUrls') || '{}') || {};
    }catch(_err){}
    const injected = window.ONEVELA_APP_URLS || {};
    const merged = Object.assign({}, DEFAULT_APP, stored, injected);
    merged.home = merged.portal || merged.home || DEFAULT_APP.portal;
    if(!merged.erp){
      merged.erp = DEFAULT_APP.erp;
    }
    return merged;
  }
  const APP = resolveAppUrls();

  const LINKS = {
    core: [
      {href: APP.home, label: 'Portal', sub: 'หน้าหลัก', icon: 'OV'},
      {href: APP.operation, label: 'Operation', sub: 'งานก่อสร้าง/ต้นทุน', icon: 'OP'},
      {href: APP.finance, label: 'Finance', sub: 'ขาย/การเงิน', icon: 'FN'},
      {href: APP.erp, label: 'ERP Demo', sub: 'workflow เอกสาร', icon: 'ER'}
    ],
    sales: [
      {href:'sales-dashboard.html', label:'Sales Dashboard', sub:'แปลง/ราคา', icon:'SD'},
      {href:'sales-walkin.html', label:'Walk-in', sub:'ลีด/ลูกค้า', icon:'WK'},
      {href:'sales-quotation.html', label:'Quotation', sub:'ใบเสนอราคา', icon:'QT'},
      {href:'sales-booking.html', label:'Booking', sub:'ใบจอง', icon:'BK'},
      {href:'sales-contract.html', label:'Contract', sub:'สัญญา', icon:'CT'},
      {href:'sales-receipt.html', label:'Receipt', sub:'ใบเสร็จ', icon:'RC'}
    ],
    finance: [
      {href:'payment.html', label:'Payments', sub:'งวดดาวน์', icon:'PM'},
      {href:'payment-form.html', label:'Pay Form', sub:'บันทึกงวด', icon:'PF'},
      {href:'fee.html', label:'Fees', sub:'ค่าส่วนกลาง', icon:'FE'},
      {href:'fee-invoice.html', label:'Invoice', sub:'ใบแจ้งหนี้', icon:'IV'}
    ],
    operation: [
      {href:'index.html', label:'Cost Dashboard', sub:'ต้นทุนรายแปลง', icon:'CS'},
      {href:'admin-upload.html', label:'Cost Upload', sub:'Excel sync', icon:'UP'},
      {href:'admin-construction.html', label:'Construction', sub:'admin ก่อสร้าง', icon:'CN'},
      {href:'foreman-update.html', label:'Foreman', sub:'อัปเดตหน้างาน', icon:'FM'},
      {href:'plot-detail.html?plot=1', label:'Plot Detail', sub:'รายแปลง', icon:'PL'},
      {href:'construction-detail.html?plot=1', label:'Build Detail', sub:'ความคืบหน้า', icon:'BD'},
      {href:'transfer.html', label:'Transfer', sub:'โอนกรรมสิทธิ์', icon:'TR'},
      {href:'transfer-checklist.html', label:'Checklist', sub:'งานโอน', icon:'CL'},
      {href:'transfer-money.html', label:'Transfer Money', sub:'ใบชี้แจงเงิน', icon:'TM'},
      {href:'transfer-cheque.html', label:'Cheque Split', sub:'แยกเช็ค', icon:'CQ'}
    ]
  };

  const pageMap = {
    'home.html':'core',
    'operation.html':'operation',
    'finance-accounting.html':'finance',
    'erp-demo.html':'operation',
    'sales-dashboard.html':'sales',
    'sales-walkin.html':'sales',
    'sales-quotation.html':'sales',
    'sales-booking.html':'sales',
    'sales-contract.html':'sales',
    'sales-receipt.html':'sales',
    'payment.html':'finance',
    'payment-form.html':'finance',
    'fee.html':'finance',
    'fee-invoice.html':'finance',
    'index.html':'operation',
    'admin-upload.html':'operation',
    'admin-construction.html':'operation',
    'plot-detail.html':'operation',
    'construction-detail.html':'operation',
    'foreman-update.html':'operation',
    'transfer.html':'operation',
    'transfer-checklist.html':'operation',
    'transfer-money.html':'operation',
    'transfer-cheque.html':'operation'
  };

  function currentBase(href){
    return href.split('?')[0].toLowerCase();
  }
  function currentUser(){
    if(window.Auth && Auth.getUser){
      try{return Auth.getUser()}catch(e){}
    }
    return null;
  }
  function rewriteAppAnchors(){
    const map = {
      'home.html': APP.home,
      'operation.html': APP.operation,
      'finance-accounting.html': APP.finance,
      'erp-demo.html': APP.erp
    };
    document.querySelectorAll('a[href]').forEach(anchor=>{
      const href = anchor.getAttribute('href');
      if(!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
      const base = href.split('?')[0].split('#')[0];
      const target = map[base];
      if(!target) return;
      const suffix = href.slice(base.length);
      anchor.setAttribute('href', target + suffix);
    });
  }
  function buildLinks(list){
    return list.map(link=>{
      const active = currentBase(link.href) === PAGE;
      return '<a class="ov-link'+(active?' is-current':'')+'" href="'+link.href+'">'+
        '<div class="ov-text"><b>'+link.label+'</b><span>'+link.sub+'</span></div>'+
        '<i>'+link.icon+'</i></a>';
    }).join('');
  }
  function mount(){
    if(document.querySelector('.ov-workbench')) return;
    rewriteAppAnchors();
    const user = currentUser();
    const section = pageMap[PAGE] || 'core';
    const el = document.createElement('aside');
    el.className = 'ov-workbench';
    el.innerHTML =
      '<div class="ov-head">'+
        '<div class="ov-mark">OV</div>'+
        '<div class="ov-title"><b>One Vela Workbench</b><span>Linked module navigation</span></div>'+
        '<button class="ov-toggle" type="button">ย่อ</button>'+
      '</div>'+
      '<div class="ov-body">'+
        '<div class="ov-meta">'+
          '<span class="ov-pill"><strong>Module</strong> '+section+'</span>'+
          '<span class="ov-pill"><strong>User</strong> '+(user && user.username ? user.username : 'guest')+'</span>'+
        '</div>'+
        '<div class="ov-section"><div class="ov-label">Core</div><div class="ov-grid">'+buildLinks(LINKS.core)+'</div></div>'+
        '<div class="ov-section"><div class="ov-label">'+(section === 'sales' ? 'Sales' : section === 'finance' ? 'Finance' : 'Operation')+'</div><div class="ov-grid">'+buildLinks(LINKS[section] || LINKS.core)+'</div></div>'+
      '</div>';
    document.body.classList.add('ov-has-workbench');
    document.body.appendChild(el);
    el.querySelector('.ov-toggle').addEventListener('click',()=>{
      el.classList.toggle('is-collapsed');
      el.querySelector('.ov-toggle').textContent = el.classList.contains('is-collapsed') ? 'ขยาย' : 'ย่อ';
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
