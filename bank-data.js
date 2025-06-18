const BANK_DATA = {
  NACIONAL: [
    { id: 'banco-venezuela', name: 'Banco de Venezuela', logo: 'https://www.bancodevenezuela.com/wp-content/uploads/2023/03/logonuevo.png' },
    { id: 'banco-venezolano', name: 'Banco Venezolano de Crédito', logo: 'https://www.venezolano.com/images/galeria/108_1.png' },
    { id: 'banco-mercantil', name: 'Banco Mercantil', logo: 'https://files.socialgest.net/mybio/5f529398b36f8_1599247256.png' },
    { id: 'banco-provincial', name: 'Banco Provincial', logo: 'https://upload.wikimedia.org/wikipedia/commons/d/d4/BBVAprovinciallogo.svg' },
    { id: 'banco-bancaribe', name: 'Banco del Caribe (Bancaribe)', logo: 'https://d3olc33sy92l9e.cloudfront.net/wp-content/themes/bancaribe/images/Bancaribe-LogotipoTurquesa.png' },
    { id: 'banco-exterior', name: 'Banco Exterior', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Banco-Exterior-VE-logo.png/183px-Banco-Exterior-VE-logo.png' },
    { id: 'banco-caroni', name: 'Banco Caroní', logo: 'https://e7.pngegg.com/pngimages/127/511/png-clipart-bank-computer-icons-bank-building-bank.png' },
    { id: 'banco-banesco', name: 'Banesco', logo: 'https://banesco-prod-2020.s3.amazonaws.com/wp-content/themes/banescocontigo/assets/images/header/logo.svg.gzip' },
    { id: 'banco-sofitasa', name: 'Banco Sofitasa', logo: 'https://www.sofitasa.com/assets/img/nuevo_logo.png' },
    { id: 'banco-plaza', name: 'Banco Plaza', logo: 'https://plazacdn.s3.amazonaws.com/wp-content/themes/bancoplaza/imagenes/logobancoplaza-2.png' },
    { id: 'banco-bancofc', name: 'Banco Fondo Común', logo: 'https://www.bfc.com.ve/wp-content/uploads/2021/01/logofos.png' },
    { id: 'banco-100banco', name: '100% Banco', logo: 'https://www.100x100banco.com/img/logo.png' },
    { id: 'banco-tesoro', name: 'Banco del Tesoro', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Logo_Banco_del_Tesoro.jpg/320px-Logo_Banco_del_Tesoro.jpg' },
    { id: 'banco-bancrecer', name: 'Bancrecer', logo: 'https://www.bancrecer.com.ve/images/img/bancrecer-logo.png' },
    { id: 'banco-activo', name: 'Banco Activo', logo: 'https://www.bancoactivo.com/logo.svg' },
    { id: 'banco-bancamiga', name: 'Bancamiga', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Bancamiga.png/320px-Bancamiga.png' },
    { id: 'banco-bicentenario', name: 'Banco Bicentenario', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/BancoDigitaldelosTrabajadores.png/320px-BancoDigitaldelosTrabajadores.png' },
    { id: 'banco-bnc', name: 'Banco Nacional de Crédito', logo: 'https://www.bncenlinea.com/images/default-source/misc/BNCLogo_rebrand.png' },
    { id: 'banco-bcv', name: 'Banco Central de Venezuela', logo: 'https://www.bcv.org.ve/sites/default/files/default_images/logo_bcv-04_2.png' }
  ],
  INTERNACIONAL: [
    { id: 'bank-america', name: 'Bank of America', logo: 'https://1000logos.net/wp-content/uploads/2016/10/Bank-of-America-Logo.png' },
    { id: 'chase-bank', name: 'Chase Bank', logo: 'https://download.logo.wine/logo/Chase_Bank/Chase_Bank-Logo.wine.png' },
    { id: 'bancolombia', name: 'Bancolombia', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Logo_Bancolombia.svg/2000px-Logo_Bancolombia.svg.png' },
    { id: 'western-union', name: 'Western Union', logo: 'https://logos-world.net/wp-content/uploads/2023/03/Western-Union-Logo.png' }
  ],
  FINTECH: [
    { id: 'zinli', name: 'Zinli', logo: 'https://images.seeklogo.com/logo-png/41/1/zinli-logo-png_seeklogo-411354.png' },
    { id: 'paypal', name: 'PayPal', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a4/Paypal_2014_logo.png' },
    { id: 'binance', name: 'Binance', logo: 'https://www.logo.wine/a/logo/Binance/Binance-Logo.wine.svg' },
    { id: 'airtm', name: 'AirTM', logo: 'https://brandlogovector.com/wp-content/uploads/2023/08/Airtm-Logo-PNG.png' },
    { id: 'zoom', name: 'Zoom', logo: 'https://zoom.red/wp-content/uploads/2021/01/Logo-Zoom-Registrado.png' },
    { id: 'zelle', name: 'Zelle', logo: 'https://download.logo.wine/logo/Zelle_(payment_service)/Zelle_(payment_service)-Logo.wine.png' },
    { id: 'venmo', name: 'Venmo', logo: 'https://logos-world.net/wp-content/uploads/2021/12/Venmo-Logo.png' },
    { id: 'nequi', name: 'Nequi', logo: 'https://images.seeklogo.com/logo-png/40/1/nequi-logo-png_seeklogo-404357.png' },
    { id: 'wise', name: 'Wise', logo: 'https://icon2.cleanpng.com/lnd/20250116/qj/27d09a29b3056c595b6e2d995a15b5.webp' },
    { id: 'revolut', name: 'Revolut', logo: 'https://e7.pngegg.com/pngimages/739/64/png-clipart-revolut-black-new-logo-tech-companies.png' },
    { id: 'eldorado', name: 'El Dorado', logo: 'https://eldorado.io/static/f4ed8a521b10baed657858830cac133c/58556/logo.webp' },
    { id: 'ubii', name: 'Ubii Pagos', logo: 'https://www.ubiipagos.com/img/new-home/ubiipagos_logo_home_dark.svg' }
  ]
};

// Helper to get logo by bank id
function getBankLogo(bankId) {
  const all = [...BANK_DATA.NACIONAL, ...BANK_DATA.INTERNACIONAL, ...BANK_DATA.FINTECH];
  const found = all.find(b => b.id === bankId);
  return found ? found.logo : '';
}
