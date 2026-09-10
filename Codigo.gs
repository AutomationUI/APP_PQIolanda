/**
 * PROJETO: Ficha de Inscrição Oficial - Parque Iolanda (Vinhedo/SP)
 * DESCRICAO: Backend seguro para gravacao no Google Drive e Planilha
 */

var CONFIG = {
  CODIGO_WHATSAPP: "PARQUE2026",
  CODIGOS_EXTRAS: ["PARQUE2026", "PARQUEUSP", "ADMIN2026"],
  PASTA_RAIZ_ID: "1QtvdZfwp4q7y05NBCDbPo5xAqmBZ7ig8",
  NOME_SUBPASTA_FOTOS: "01_FOTOS_3x4_ATLETAS",
  NOME_SUBPASTA_DOCS: "02_DOCUMENTOS_E_ANEXOS",
  NOME_SUBPASTA_PDF: "03_FICHAS_PDF",
  SPREADSHEET_ID: "1s2feiQDpIVWbxr4maK4ojDtAdEaHeNORheFf8lGTQr8",
  MIME_TYPE_JPEG: "image/jpeg"
};

function doGet() {
  try {
    obterOuCriarSubpastas();
  } catch (err) {
    Logger.log("Aviso na inicializacao: " + err.toString());
  }

  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Ficha de Inscrição Oficial - Parque Iolanda')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .addMetaTag('cache-control', 'no-cache, no-store, must-revalidate')
    .addMetaTag('pragma', 'no-cache')
    .addMetaTag('expires', '0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doPost(e) {
  try {
    var dadosJSON;
    try {
      dadosJSON = JSON.parse(e.postData.contents);
    } catch (eParse) {
      return ContentService.createTextOutput(JSON.stringify({ sucesso: false, erro: "Corpo da requisição inválido ou vazio." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Verificar ação solicitada
    var acao = (dadosJSON.acao || "").toString().trim().toLowerCase();

    // Validar código de acesso (WHATSAPP CODE)
    var codigoDigitado = (dadosJSON.codigo || "").toString().trim().toUpperCase();
    var codigosValidos = [CONFIG.CODIGO_WHATSAPP.toUpperCase()];
    if (CONFIG.CODIGOS_EXTRAS && Array.isArray(CONFIG.CODIGOS_EXTRAS)) {
      CONFIG.CODIGOS_EXTRAS.forEach(function(c) { codigosValidos.push(c.toUpperCase()); });
    }

    if (codigosValidos.indexOf(codigoDigitado) === -1) {
      return ContentService.createTextOutput(JSON.stringify({ sucesso: false, erro: "Código do WhatsApp incorreto ou não autorizado!" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Rotina por ação
    var resultado;
    if (acao === "salvar") {
      resultado = salvarCadastroCompleto(dadosJSON);
    } else if (acao === "buscar") {
      resultado = buscarCadastroPorID(dadosJSON.idAtleta || "");
    } else {
      resultado = { sucesso: false, erro: "Ação '" + acao + "' não reconhecida." };
    }

    return ContentService.createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    Logger.log("Erro no doPost: " + e.toString());
    return ContentService.createTextOutput(JSON.stringify({ sucesso: false, erro: "Erro interno do servidor: " + e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function extrairIdLimpoDrive(idOuUrl) {
  if (!idOuUrl) return "";
  var str = idOuUrl.toString().trim();
  if (str.indexOf('/folders/') !== -1) str = str.split('/folders/')[1];
  else if (str.indexOf('/project/') !== -1) str = str.split('/project/')[1];
  else if (str.indexOf('id=') !== -1) str = str.split('id=')[1];
  return str.split('?')[0].split('&')[0].trim();
}

function obterOuCriarSubpastas() {
  var idLimpo = extrairIdLimpoDrive(CONFIG.PASTA_RAIZ_ID);
  var pastaRaiz;
  
  try {
    pastaRaiz = DriveApp.getFolderById(idLimpo);
  } catch (eDrive) {
    pastaRaiz = DriveApp.getRootFolder();
  }

  var pastaFotos, pastaDocs, pastaPdf;

  var buscaFotos = pastaRaiz.getFoldersByName(CONFIG.NOME_SUBPASTA_FOTOS);
  pastaFotos = buscaFotos.hasNext() ? buscaFotos.next() : pastaRaiz.createFolder(CONFIG.NOME_SUBPASTA_FOTOS);

  var buscaDocs = pastaRaiz.getFoldersByName(CONFIG.NOME_SUBPASTA_DOCS);
  pastaDocs = buscaDocs.hasNext() ? buscaDocs.next() : pastaRaiz.createFolder(CONFIG.NOME_SUBPASTA_DOCS);

  var buscaPdf = pastaRaiz.getFoldersByName(CONFIG.NOME_SUBPASTA_PDF);
  pastaPdf = buscaPdf.hasNext() ? buscaPdf.next() : pastaRaiz.createFolder(CONFIG.NOME_SUBPASTA_PDF);

  return {
    pastaFotosId: pastaFotos.getId(),
    pastaDocsId: pastaDocs.getId(),
    pastaPdfId: pastaPdf.getId()
  };
}

function buscarCadastroPorID(idAtleta) {
  try {
    if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.trim() === "") {
      return { sucesso: false, erro: "Insira o ID da Planilha na constante SPREADSHEET_ID no Codigo.gs." };
    }

    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var aba = ss.getActiveSheet();
    var dados = aba.getDataRange().getValues();
    var idBusca = idAtleta.toString().trim().toUpperCase();

    for (var i = 1; i < dados.length; i++) {
      if (dados[i][0] && dados[i][0].toString().toUpperCase() === idBusca) {
        return {
          sucesso: true,
          linha: i + 1,
          dados: {
            idAtleta: dados[i][0],
            dataRegistro: dados[i][1],
            nomeAluno: dados[i][2],
            dataNasc: dados[i][3],
            idadeAtleta: dados[i][4],
            sexoAtleta: dados[i][5],
            cpfAtleta: dados[i][6],
            rgAtleta: dados[i][7],
            foneAtleta: dados[i][8],
            cidadeAtleta: dados[i][9],
            remedioReg: dados[i][10],
            alergiaAtleta: dados[i][11],
            restricaoAtleta: dados[i][12],
            tipoSangue: dados[i][13],
            planoSaude: dados[i][14],
            nomeMae: dados[i][15],
            celMae: dados[i][16],
            emailMae: dados[i][17],
            urgencia1: dados[i][18],
            retirar1: dados[i][19],
            urlFoto: dados[i][20]
          }
        };
      }
    }
    return { sucesso: false, erro: "ID do Atleta não encontrado." };
  } catch (e) {
    return { sucesso: false, erro: "Erro na busca: " + e.toString() };
  }
}

function salvarCadastroCompleto(dadosForm) {
  try {
    if (!dadosForm) return { sucesso: false, erro: "Nenhum dado recebido." };

    var codigoDigitado = (dadosForm.codigo || "").toString().trim().toUpperCase();
    var codigosValidos = [CONFIG.CODIGO_WHATSAPP.toUpperCase()];
    if (CONFIG.CODIGOS_EXTRAS && Array.isArray(CONFIG.CODIGOS_EXTRAS)) {
      CONFIG.CODIGOS_EXTRAS.forEach(function(c) { codigosValidos.push(c.toUpperCase()); });
    }

    if (codigosValidos.indexOf(codigoDigitado) === -1) {
      return { sucesso: false, erro: "Código do WhatsApp incorreto ou não autorizado!" };
    }

    if (!dadosForm.nomeAluno) return { sucesso: false, erro: "Nome do atleta é obrigatório." };

    var estruturaPastas = obterOuCriarSubpastas();
    var pastaFotos = DriveApp.getFolderById(estruturaPastas.pastaFotosId);
    var pastaDocs = DriveApp.getFolderById(estruturaPastas.pastaDocsId);
    var pastaPdf = DriveApp.getFolderById(estruturaPastas.pastaPdfId);

    var isEdicao = (dadosForm.idAtletaEdicao && dadosForm.idAtletaEdicao !== "");
    var idAtleta = isEdicao ? dadosForm.idAtletaEdicao : gerarIDUnico();
    var nomeLimpo = sanitizarTexto(dadosForm.nomeAluno);
    var urlFotoAtleta = dadosForm.urlFotoExistente || "";

    if (dadosForm.fotoBase64) {
      var base64Foto = dadosForm.fotoBase64.split(',')[1];
      var blobFoto = Utilities.newBlob(Utilities.base64Decode(base64Foto), CONFIG.MIME_TYPE_JPEG, idAtleta + "_" + nomeLimpo + "_Foto3x4.jpg");
      var arqFoto = pastaFotos.createFile(blobFoto);
      arqFoto.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      urlFotoAtleta = arqFoto.getUrl();
    }

    var totalAnexos = 0;
    if (dadosForm.anexos && dadosForm.anexos.length > 0) {
      for (var i = 0; i < dadosForm.anexos.length; i++) {
        var item = dadosForm.anexos[i];
        if (item.base64 && item.nome) {
          var base64Pure = item.base64.split(',')[1];
          var mimeType = item.base64.substring(item.base64.indexOf(":") + 1, item.base64.indexOf(";"));
          var tipoDoc = sanitizarTexto(item.tipo || "OUTROS_DOCUMENTOS");
          
          var nomeFinalDoc = idAtleta + "_" + nomeLimpo + "_" + tipoDoc + "_" + sanitizarTexto(item.nome);
          var blobDoc = Utilities.newBlob(Utilities.base64Decode(base64Pure), mimeType, nomeFinalDoc);
          var arqDoc = pastaDocs.createFile(blobDoc);
          arqDoc.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
          totalAnexos++;
        }
      }
    }

    var urlPdf = "";
    if (CONFIG.SPREADSHEET_ID && CONFIG.SPREADSHEET_ID.trim() !== "") {
      try {
        var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
        var aba = ss.getActiveSheet();
        var dataHora = Utilities.formatDate(new Date(), "GMT-03:00", "dd/MM/yyyy HH:mm:ss");

        if (dadosForm.linhaEdicao && parseInt(dadosForm.linhaEdicao) > 0) {
          var lin = parseInt(dadosForm.linhaEdicao);
          aba.getRange(lin, 2, 1, 19).setValues([[
            dataHora, dadosForm.nomeAluno, dadosForm.dataNasc, dadosForm.idadeAtleta,
            dadosForm.sexoAtleta, dadosForm.cpfAtleta, dadosForm.rgAtleta, dadosForm.foneAtleta,
            dadosForm.cidadeAtleta, dadosForm.remedioReg, dadosForm.alergiaAtleta,
            dadosForm.restricaoAtleta, dadosForm.tipoSangue, dadosForm.planoSaude,
            dadosForm.nomeMae, dadosForm.celMae, dadosForm.emailMae,
            dadosForm.urgencia1, dadosForm.retirar1, urlFotoAtleta
          ]]);
          registrarLog(ss, idAtleta, dadosForm.nomeAluno, "EDICAO", dataHora);
        } else {
          aba.appendRow([
            idAtleta, dataHora, dadosForm.nomeAluno, dadosForm.dataNasc, dadosForm.idadeAtleta,
            dadosForm.sexoAtleta, dadosForm.cpfAtleta, dadosForm.rgAtleta, dadosForm.foneAtleta,
            dadosForm.cidadeAtleta, dadosForm.remedioReg, dadosForm.alergiaAtleta,
            dadosForm.restricaoAtleta, dadosForm.tipoSangue, dadosForm.planoSaude,
            dadosForm.nomeMae, dadosForm.celMae, dadosForm.emailMae,
            dadosForm.urgencia1, dadosForm.retirar1,
            urlFotoAtleta, totalAnexos
          ]);
          registrarLog(ss, idAtleta, dadosForm.nomeAluno, "CRIACAO", dataHora);
        }
        organizarPorAnoEIdade();
      } catch (errSheet) {
        Logger.log("Erro na planilha: " + errSheet.toString());
      }
    }

    // Gerar PDF da ficha
    urlPdf = gerarFichaPDF(dadosForm, idAtleta, urlFotoAtleta, estruturaPastas.pastaPdfId);

    return { 
      sucesso: true, 
      idCadastro: idAtleta,
      nomeAtleta: dadosForm.nomeAluno,
      totalAnexos: totalAnexos,
      urlPdf: urlPdf
    };

  } catch (e) {
    return { sucesso: false, erro: "Erro interno: " + e.toString() };
  }
}

function gerarFichaPDF(dadosForm, idAtleta, urlFoto, pastaPdfId) {
  try {
    var pastaPdf = DriveApp.getFolderById(pastaPdfId);
    var nomeLimpo = sanitizarTexto(dadosForm.nomeAluno);
    var nomeArquivo = idAtleta + "_" + nomeLimpo + "_Ficha.pdf";
    
    // Usar DocumentApp para criar PDF formatado
    var doc = DocumentApp.create("temp_ficha_" + idAtleta);
    var body = doc.getBody();
    
    // Título
    var titulo = body.appendParagraph("FICHA DE INSCRIÇÃO - PROJETO PARQUE IOLANDA");
    titulo.setHeading(DocumentApp.ParagraphHeading.HEADING1);
    titulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    
    var subtitulo = body.appendParagraph("Vinhedo/SP - Atleta Mirim");
    subtitulo.setHeading(DocumentApp.ParagraphHeading.HEADING3);
    subtitulo.setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    
    body.appendParagraph(" ");
    
    // Dados do Atleta
    body.appendParagraph("DADOS DO ATLETA").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    adicionarLinha(body, "ID Único:", idAtleta);
    adicionarLinha(body, "Nome Completo:", dadosForm.nomeAluno);
    adicionarLinha(body, "Data de Nascimento:", dadosForm.dataNasc);
    adicionarLinha(body, "Idade:", dadosForm.idadeAtleta);
    adicionarLinha(body, "Sexo:", dadosForm.sexoAtleta);
    adicionarLinha(body, "CPF:", dadosForm.cpfAtleta);
    adicionarLinha(body, "RG:", dadosForm.rgAtleta);
    adicionarLinha(body, "Telefone:", dadosForm.foneAtleta);
    adicionarLinha(body, "Cidade/UF:", dadosForm.cidadeAtleta);
    adicionarLinha(body, "Tipo Sanguíneo:", dadosForm.tipoSangue || "Não informado");
    
    body.appendParagraph(" ");
    
    // Ficha Médica
    body.appendParagraph("FICHA MÉDICA").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    adicionarLinha(body, "Medicação Regular:", dadosForm.remedioReg || "Não informado");
    adicionarLinha(body, "Alergias:", dadosForm.alergiaAtleta || "Não informado");
    adicionarLinha(body, "Restrição Medicamentosa:", dadosForm.restricaoAtleta || "Não informado");
    adicionarLinha(body, "Plano de Saúde:", dadosForm.planoSaude || "Não informado");
    
    body.appendParagraph(" ");
    
    // Responsáveis
    body.appendParagraph("RESPONSÁVEIS").setHeading(DocumentApp.ParagraphHeading.HEADING2);
    adicionarLinha(body, "Mãe/Responsável:", dadosForm.nomeMae);
    adicionarLinha(body, "Celular (WhatsApp):", dadosForm.celMae);
    adicionarLinha(body, "E-mail:", dadosForm.emailMae);
    
    body.appendParagraph(" ");
    adicionarLinha(body, "Contatos de Urgência:", dadosForm.urgencia1 || "Não informado");
    adicionarLinha(body, "Pessoas Autorizadas a Retirar:", dadosForm.retirar1 || "Não informado");
    
    body.appendParagraph(" ");
    body.appendParagraph("________________________________________").setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    body.appendParagraph("Assinatura do Responsável").setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    body.appendParagraph("Data: ___/___/______").setAlignment(DocumentApp.HorizontalAlignment.CENTER);
    
    doc.saveAndClose();
    
    var pdfBlob = doc.getBlob().getAs("application/pdf");
    pdfBlob.setName(nomeArquivo);
    
    var pdfFile = pastaPdf.createFile(pdfBlob);
    pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Limpar doc temporário
    DriveApp.getFileById(doc.getId()).setTrashed(true);
    
    return pdfFile.getUrl();
  } catch (e) {
    Logger.log("Erro ao gerar PDF: " + e.toString());
    return "";
  }
}

function adicionarLinha(body, label, valor) {
  var p = body.appendParagraph("");
  var runLabel = p.appendText(label + " ");
  runLabel.setBold(true);
  p.appendText(valor || "Não informado");
}

function registrarLog(ss, idAtleta, nomeAtleta, acao, dataHora) {
  try {
    var abaLog = ss.getSheetByName("LOG_AUDITORIA");
    if (!abaLog) {
      abaLog = ss.insertSheet("LOG_AUDITORIA");
      abaLog.appendRow(["ID Atleta", "Nome Atleta", "Ação", "Data/Hora"]);
    }
    abaLog.appendRow([idAtleta, nomeAtleta, acao, dataHora]);
  } catch (ex) {
    Logger.log("Erro ao registrar log: " + ex.toString());
  }
}

function organizarPorAnoEIdade() {
  try {
    if (!CONFIG.SPREADSHEET_ID || CONFIG.SPREADSHEET_ID.trim() === "") return;
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var abaPrincipal = ss.getSheetByName("Inscricoes") || ss.getActiveSheet();
    var dados = abaPrincipal.getDataRange().getValues();
    if (dados.length <= 1) return;

    var agrupamento = {};
    for (var i = 1; i < dados.length; i++) {
      var dataNasc = dados[i][3];
      var idade = dados[i][4];
      var nome = dados[i][2];
      var idAtleta = dados[i][0];

      if (dataNasc) {
        var anoNasc = dataNasc.toString().substring(0, 4);
        if (dataNasc.toString().indexOf("/") !== -1) {
          var partes = dataNasc.toString().split("/");
          if (partes.length === 3) anoNasc = partes[2];
        }
        var chave = "Ano_" + anoNasc + "_Idade_" + (idade || "N/A");
        if (!agrupamento[chave]) agrupamento[chave] = [];
        agrupamento[chave].push({ id: idAtleta, nome: nome, nascimento: dataNasc, idade: idade });
      }
    }

    var abaResumo = ss.getSheetByName("RESUMO_ANOS_IDADE");
    if (!abaResumo) abaResumo = ss.insertSheet("RESUMO_ANOS_IDADE");
    abaResumo.clear();
    abaResumo.appendRow(["Chave (Ano / Idade)", "ID Atleta", "Nome do Atleta", "Data Nascimento", "Idade"]);

    for (var k in agrupamento) {
      agrupamento[k].forEach(function(atleta) {
        abaResumo.appendRow([k, atleta.id, atleta.nome, atleta.nascimento, atleta.idade]);
      });
    }
  } catch (err) {
    Logger.log("Erro ao organizar por ano e idade: " + err.toString());
  }
}

function gerarIDUnico() {
  var dataStr = Utilities.formatDate(new Date(), "GMT-03:00", "yyyyMMdd");
  var hash = Math.random().toString(36).substring(2, 6).toUpperCase();
  return "PQI-" + dataStr + "-" + hash;
}

function sanitizarTexto(texto) {
  if (!texto) return "SEM_TEXTO";
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_ ]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
}