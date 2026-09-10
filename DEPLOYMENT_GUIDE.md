# DEPLOYMENT GUIDE: Cloudflare Pages + Google Apps Script

## Etapas de Implantação (na seguinte ordem):

### **a) Publicar o Google Apps Script como Web App**

1. No Google Cloud Console, abra o projeto do Apps Script (`Codigo.gs`)
2. Clique em **Deploy** > **New deployment**
3. Configure:
   - **Tipo de deployment:** "Executable API"
   - **Executar como:** " usuário desconhecido " (Anyone)
   - **Acesso:** "Qualquer pessoa" (Anyone with the link)
4. Clique em **Deploy**
5. Na primeira vez, autorizar as permissões solicitadas
6. Depois de implantado, copie a URL gerada - ela terá o formato:
   `https://script.google.com/macros/s/EXECUTAR_AQUI/exec`
   - **Exemplo:** `https://script.google.com/macros/s/AKfycbyXyZExample1234567890/exec`

### **b) Configurar o index.html com a URL do Web App**

1. Abra `Index.html` deste projeto
2. Localize a linha no topo do bloco `<script>`:
   ```javascript
   const APPS_SCRIPT_URL = "COLOQUE_AQUI_SUA_URL_/exec";
   ```
3. Substitua pela URL real copiada no passo anterior:
   ```javascript
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyXyZExample1234567890/exec";
   ```
4. Salve o arquivo `Index.html`

### **c) Publicar no Cloudflare Pages ("Upload assets")**

1. Acesse [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. Clique em **Create a project** > **Upload an asset**
3. **Configurações do projeto:**
   - Nome do projeto: `parque-iolanda-inscricao` (ou o nome que preferir)
   - Selecione o arquivo: `Index.html` (raiz do projeto `app_parque/`)
   - Framework: **None** (Hhtml/CSS/JS puro - nenhum build step)
4. Clique em **Deploy**

### **d) Configurar subdomínio inscricao.automationui.com.br**

#### Passo 1: Registrar/noção no Cloudflare DNS

1. Como o domínio `automationui.com.br` já está apontado para Cloudflare (nameservers configurados), basta:
2. No painel do Cloudflare, vá em **DNS** > **Records**
3. Clique em **Add record** e preencha:
   - **Tipo:** `A` (ou `CNAME` se preferir)
   - **Nome:** `inscricao` (isso criará `inscricao.automationui.com.br`)
   - **Valor/Conteúdo:** O endereço do seu projeto Cloudflare Pages (aparecerá após o deploy, algo como `seu-projeto.pages.dev`)
   - **TTL:** `Automatic`
   - **Proxy status:** Pode ficar laranja (proxiado) ou grey (desproxiado). Para site estático simples, o `grey` é suficiente.

   *Observação:* Se usar registro do tipo `CNAME`, o nome deve ser apenas `inscricao` e o valor apontar para o `*.pages.dev` do seu projeto. Se usar `A records`, precisará dos IPs do Cloudflare Pages (verificar na documentação mais recente).

#### Passo 2: Configurar no Cloudflare Pages

1. No projeto Cloudflare Pages criado no passo anterior, clique em **Settings**
2. Em **Domains**, digite `inscricao.automationui.com.br`
3. Clique em **Verify** e aguardar a propagação (pode levar alguns minutos)
4. Quando verde, o domínio estará vinculado e o site estará disponível em `https://inscricao.automationui.com.br`

### **e) Testar o fluxo completo**

1. Abra `https://inscricao.automationui.com.br` no navegador
2. A página deverá carregar diretamente na **Aba 1 (Foto 3x4)** - isso acontece porque o `window.irAba(1)` é executado no `DOMContentLoaded`
3. Testar captura de câmera:
   - Clique em "📷 Tirar Foto (Abrir Câmera)"
   - Deve abrir a câmera nativa do dispositivo (agora funciona fora do iframe do Google!)
   - Se negar permissão ou for WebView, cai automaticamente para "Selecionar Foto da Galeria"
4. Preencher os dados das 4 abas (Criança → Responsáveis → Anexos & Termos)
5. Clicar em "✅ Finalizar Inscrição"
6. Deverá aparecer o spinner de loading, depois a tela de sucesso com o ID do atleta
7. Verificar no Google Drive/Sheets se os dados foram gravados corretamente

---

## ARQUITETURA DETALHADA

### Fluxo de Comunicação

```text
[Browser] → [fetch(APPS_SCRIPT_URL, {method:POST, body:JSON.stringify({acao:'salvar', ...payload})})
             ↓
[Google Apps Script doPost(e)]
   → JSON.parse(e.postData.contents)
   → Valida código de acesso (CODIGO_WHATSAPP)
   → Verifica acao: "salvar" ou "buscar"
   → Chama função correspondente (salvarCadastroCompleto / buscarCadastroPorID)
   → Retorna JSON via ContentService
             ↓
[Browser] → .then(res => res.json()) → processa resposta
   → Mostra spinner → sucesso: tela de confirmação / erro: alert de mensagem
```

### Padrão de Request/Response

**Request (do front-end):**
```javascript
fetch(APPS_SCRIPT_URL, {
  method: 'POST',
  body: JSON.stringify({ acao: 'salvar', ...payload })
  // ⚠️ SEM header Content-Type manual!
  // O navegador define text/plain por padrão, evitando preflight OPTIONS
})
```

**Response (do Apps Script):**
```json
// Sucesso: { sucesso: true, idCadastro: "PQI-20260909-ABC", nomeAtleta: "...", urlPdf: "..." }
// Erro: { sucesso: false, erro: "Código do WhatsApp incorreto..." }
```

### Segurança Implementada

1. **Validação de código:** Todo acesso à API `/exec` exige o campo `codigo` no JSON, validado contra `CODIGO_WHATSAPP` e `CODIGOS_EXTRAS` definidos no `Codigo.gs`
2. **Sem preflight OPTIONS:** Ao não definir `Content-Type: application/json` no fetch, a chamada é tratada como "simple request" pelo navegador, evitando o bloqueio por CORS preflight
3. **Origem (opcional):** O Apps Script podia checar `e.origin` nas propriedades da requisição, mas a validação do código já impede chamadas não autorizadas diretamente

### Por que o fetch sem Content-Type funciona?

Quando você faz:
```javascript
fetch(URL, { method: 'POST', body: JSON.stringify(data ) })
// Sem headers: { "Content-Type": "application/json" }
```

O navegador envia o body como `text/plain;charset=UTF-8` por padrão. O Google Apps Script's `ContentService` com `MimeType.JSON` ainda consegue fazer `JSON.parse()` no corpo porque ele ignora o Content-Type e apenas tenta parsear o texto. O importante é não incluir o header explicitamente como `application/json`, pois isso dispararia o preflight OPTIONS em navegadores mais rigorosos (especialmente em certas versões de Firefox e em ambientes de Mobile WebView).

---

## ARQUIVOS MODIFICADOS

1. **`Index.html`** - Adaptado para:
   - Usar `fetch()` em vez de `google.script.run`
   - Constante `APPS_SCRIPT_URL` no topo do script
   - Remoção de verificações `typeof google !== 'undefined'`
   - Mantida toda a lógica de câmera, validações e UI

2. **`Codigo.gs`** - Adicionado:
   - Função `doPost(e)` com JSON parsing, validação de código e roteamento por `acao`
   - Manter `doGet()` original (HTML ainda pode ser acessado via URL do script, mas não é mais o método principal de entrega)

3. **`.gitignore`** - Já atualizado com `memories/local/` para não subir anotações locais

4. **`memories/repo/app_parque-REFERENCE.md`** - Documentação completa da arquitetura atual

5. **`memories/local/app_parque-REFERENCE.md`** - Cópia local (nunca sobe para Git)