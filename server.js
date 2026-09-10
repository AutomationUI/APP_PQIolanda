const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// Allow large payloads for base64 photo and documents
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory store for registrations (mimics Google Sheets & Drive when no GAS URL is connected)
const registrations = new Map();

// Seed an example for testing lookup
registrations.set('PQI-20260909-A48F', {
  idAtleta: 'PQI-20260909-A48F',
  dataRegistro: '09/09/2026 14:30:00',
  nomeAluno: 'Lucas Oliveira Santos',
  dataNasc: '2016-04-15',
  idadeAtleta: '10 ano(s)',
  sexoAtleta: 'Masculino',
  cpfAtleta: '123.456.789-00',
  rgAtleta: '12.345.678-9',
  foneAtleta: '(19) 98765-4321',
  cidadeAtleta: 'Vinhedo / SP',
  remedioReg: 'Não',
  alergiaAtleta: 'Não',
  restricaoAtleta: 'Não',
  tipoSangue: 'O+',
  planoSaude: 'Não',
  nomeMae: 'Mariana Oliveira Santos',
  celMae: '(19) 98765-4321',
  emailMae: 'mariana.santos@exemplo.com',
  urgencia1: 'Carlos Santos (Pai) - (19) 98111-2233',
  retirar1: 'Carlos Santos (Pai) - RG 11.222.333-4',
  urlFoto: ''
});

function gerarIDUnico() {
  const agora = new Date();
  const yyyy = agora.getFullYear();
  const mm = String(agora.getMonth() + 1).padStart(2, '0');
  const dd = String(agora.getDate()).padStart(2, '0');
  const dataStr = `${yyyy}${mm}${dd}`;
  const hash = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PQI-${dataStr}-${hash}`;
}

const CODIGOS_VALIDOS = ['PARQUE2026', 'PARQUEUSP', 'ADMIN2026'];

// Handle Google Apps Script endpoint calls (locally or proxied)
const handleAppsScriptAction = async (req, res) => {
  const targetGASUrl = process.env.GOOGLE_APPS_SCRIPT_URL || process.env.APPS_SCRIPT_URL;

  // If a real Google Apps Script URL is configured in environment, proxy the request
  if (targetGASUrl && targetGASUrl.startsWith('https://script.google.com/')) {
    try {
      const response = await fetch(targetGASUrl, {
        method: 'POST',
        body: JSON.stringify(req.body),
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
      const data = await response.json();
      return res.json(data);
    } catch (err) {
      console.error('Error forwarding to Google Apps Script:', err);
      // Fallback to local execution on network failure
    }
  }

  const dadosJSON = req.body || {};
  const acao = (dadosJSON.acao || '').toString().trim().toLowerCase();
  const codigoDigitado = (dadosJSON.codigo || '').toString().trim().toUpperCase();

  // Validate authorization code if provided (or required for saving)
  if (acao === 'salvar' || codigoDigitado) {
    if (!CODIGOS_VALIDOS.includes(codigoDigitado)) {
      return res.json({
        sucesso: false,
        erro: 'Código do WhatsApp incorreto ou não autorizado! (Use o código do grupo, ex: PARQUE2026)'
      });
    }
  }

  if (acao === 'buscar') {
    const idBusca = (dadosJSON.idAtleta || '').toString().trim().toUpperCase();
    if (registrations.has(idBusca)) {
      const registro = registrations.get(idBusca);
      return res.json({
        sucesso: true,
        linha: 2,
        dados: registro,
        urlFoto: registro.urlFoto || registro.fotoBase64 || ''
      });
    } else {
      return res.json({
        sucesso: false,
        erro: 'ID do Atleta não encontrado.'
      });
    }
  }

  if (acao === 'salvar') {
    if (!dadosJSON.nomeAluno) {
      return res.json({ sucesso: false, erro: 'Nome do atleta é obrigatório.' });
    }

    const isEdicao = Boolean(dadosJSON.idAtletaEdicao && dadosJSON.idAtletaEdicao.trim() !== '');
    const idAtleta = isEdicao ? dadosJSON.idAtletaEdicao.trim().toUpperCase() : gerarIDUnico();
    
    const agora = new Date();
    const dataHora = agora.toLocaleString('pt-BR');

    const novoRegistro = {
      idAtleta,
      dataRegistro: dataHora,
      nomeAluno: dadosJSON.nomeAluno,
      dataNasc: dadosJSON.dataNasc,
      idadeAtleta: dadosJSON.idadeAtleta,
      sexoAtleta: dadosJSON.sexoAtleta,
      cpfAtleta: dadosJSON.cpfAtleta,
      rgAtleta: dadosJSON.rgAtleta,
      foneAtleta: dadosJSON.foneAtleta,
      cidadeAtleta: dadosJSON.cidadeAtleta || 'Vinhedo / SP',
      remedioReg: dadosJSON.remedioReg,
      alergiaAtleta: dadosJSON.alergiaAtleta,
      restricaoAtleta: dadosJSON.restricaoAtleta,
      tipoSangue: dadosJSON.tipoSangue,
      planoSaude: dadosJSON.planoSaude,
      nomeMae: dadosJSON.nomeMae,
      celMae: dadosJSON.celMae,
      emailMae: dadosJSON.emailMae,
      urgencia1: dadosJSON.urgencia1,
      retirar1: dadosJSON.retirar1,
      urlFoto: dadosJSON.urlFotoExistente || dadosJSON.fotoBase64 || '',
      tiposDocsGerais: dadosJSON.tiposDocsGerais || '',
      anexos: dadosJSON.anexos || [],
      totalAnexos: (dadosJSON.anexos || []).length
    };

    registrations.set(idAtleta, novoRegistro);

    return res.json({
      sucesso: true,
      idCadastro: idAtleta,
      nomeAtleta: dadosJSON.nomeAluno,
      totalAnexos: (dadosJSON.anexos || []).length,
      urlPdf: ''
    });
  }

  return res.json({ sucesso: false, erro: `Ação '${acao}' não reconhecida.` });
};

// Mount route for /exec and fallback placeholders
app.post(['/exec', '/COLOQUE_AQUI_SUA_URL_/exec', '/api/exec'], handleAppsScriptAction);

// Serve static assets from project root and dist
app.use(express.static(__dirname));
if (path.join(__dirname, 'dist') !== __dirname) {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Serve Index.html for root and all SPA page requests
app.get(['/', '/index.html', '/Index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'Index.html'));
});

// Fallback for any other GET requests to Index.html
app.use((req, res, next) => {
  if (req.method === 'GET') {
    return res.sendFile(path.join(__dirname, 'Index.html'));
  }
  next();
});

app.listen(PORT, HOST, () => {
  console.log(`Server listening at http://${HOST}:${PORT}`);
});
