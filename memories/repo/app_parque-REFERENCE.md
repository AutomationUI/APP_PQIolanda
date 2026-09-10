# app_parque - Repositório Reference

**Data da Última Atualização:** 10/09/2026

## Arquitetura Atual & Estrutura do Projeto

Este é um aplicativo de página única (SPA) para cadastro de inscrições no "Projeto Parque Iolanda". A arquitetura segue um modelo client-server onde:

- **Frontend:** Arquivo `Index.html` autônomo com CSS embutido e JavaScript vanilla. O DOM é estruturado em 4 abas (steps) sequenciais: Foto 3x4 → Dados da Criança → Responsáveis → Anexos & Termos.
- **Backend:** Integração com Google Apps Script via `google.script.run`. O envio dos dados ocorre para uma planilha Google Sheets (provavelmente).
- **Estado Global:** Gerenciado através de variáveis `window` (ex: `window.fotoBase64`, `window.termosAceitos`, `window.listaAnexosBase64`).
- **Testes:** Playwright para testes de câmera e navegação entre abas.
- **Deploy:** Hospedado como aplicativo web estático (servido por `http-server` na porta 8080 em desenvolvimento).

### Pastas Principais

| Pasta | Descrição |
|-------|-----------|
| `/` | Raiz do projeto contendo `Index.html`, `.gitignore`, `package.json` |
| `playwright-test/` | Testes automatizados de câmera e navegação |
| `node_modules/` | Dependências (Playwright, http-server) |
| `memories/` | (Nova) Memória de repositório e local - **nÃ£o subir para Git** |

---

## Stack Tecnológica

| Camada | Tecnologia | Observações |
|--------|------------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JS | CSS embutido no `<style>` do HTML; nenhuma framework (React/Vue/Angular) |
| **Lógica de Negócio** | JavaScript funcional | Funções globais `window.*`; event listeners em `DOMContentLoaded` |
| **Backend/BD** | Google Apps Script + Google Sheets | `google.script.run` para salvar cadastro; dados estruturados em payload JSON |
| **Testes** | Playwright (TypeScript) | `camera-test.spec.ts` - testa recorte 3x4, navegação entre abas, upload de imagem |
| **Servidor Local** | `http-server` (npm) | Porta 8080; flag `-c-1` para desabilitar cache de HTTP |

---

## Banco de Dados / Esquema

As principais coleções/estruturas de dados (baseadas no payload enviado para o Apps Script):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `idAtletaEdicao` | string | ID do cadastro para modo edição |
| `linhaEdicao` | number | Linha da planilha para edição |
| `urlFotoExistente` | string | URL da foto já gravada |
| `codigo` | string | Código do grupo WhatsApp (obrigatório) |
| `nomeAluno` | string | Nome completo da criança (obrigatório) |
| `dataNasc` | string (date) | Data de nascimento |
| `idadeAtleta` | string | Idade calculada (anos) |
| `sexoAtleta` | select | Masculino/Feminino |
| `cpfAtleta` | string | CPF do atleta |
| `rgAtleta` | string | RG do atleta |
| `foneAtleta` | string | Telefone com máscara (19) 90000-0000 |
| `cidadeAtleta` | string | Cidade/UF (padrão: "Vinhedo / SP") |
| `remedioReg` | string | "Sim"/"Não" + detalhe |
| `alergiaAtleta` | string | "Sim"/"Não" + detalhe |
| `restricaoAtleta` | string | "Sim"/"Não" + detalhe |
| `tipoSangue` | select | Grupo sanguíneo ABO + RH |
| `planoSaude` | string | "Sim"/"Não" + detalhe do plano |
| `nomeMae` | string | Nome da mãe (obrigatório) |
| `celMae` | string | Celular WhatsApp da mãe (obrigatório) |
| `emailMae` | string | E-mail da mãe/responsável (obrigatório) |
| `urgencia1` | string | Contatos de emergência formatados |
| `retirar1` | string | Pessoas autorizadas a retirar formatadas |
| `fotoBase64` | string | Base64 JPEG 300x400 (foto 3x4) |
| `anexos` | array | Lista de objetos `{nome, base64, tipo}` para documentos |

### Regras de Segurança

- Campos marcados com `*` no formulário são obrigatórios
- Validação de CPF em blur (`validarCPFOnBlur`)
- Máscaras de telefone (`mTel`), CPF (`mCPF`), RG (`mRG`), CEP (`mCEP`)
- Busca de endereço via CEP (API ViaCEP)
- Detecção de WebView para bloquear câmera em apps como WhatsApp/Instagram
- Termos de autorização obrigatórios antes do envio (`termosAceitos` flag)

---

## Lógica de Negócio / Rotas

### Fluxo Vital (4 Etapas)

```text
Aba 1 (Foto 3x4) → Aba 2 (Criança) → Aba 3 (Responsáveis) → Aba 4 (Anexos & Termos)
```

#### Etapas Detalhadas

**1. Foto 3x4 (`aba1`):**
- Captura via câmera nativa (`navigator.mediaDevices.getUserMedia`) ou galeria
- Recorte canvas centralizado para proporção 3:4 (300x400px)
- Armazenado em `window.fotoBase64` como JPEG (qualidade 0.85)
- Botões: "Tirar Foto", "Selecionar da Galeria", "Refazer"

**2. Dados da Criança (`aba2`):**
- Código de acesso do grupo WhatsApp (obrigatório)
- Dados pessoais: nome, data nascimento, idade (calculada automaticamente), sexo
- Documentos: CPF, RG, CEP (com busca ViaCEP), endereço
- Ficha médica: remédios, alergias, restrições, tipo sanguíneo, plano de saúde
- Navegação: `validarAba1()` valida campos obrigatórios antes de avançar

**3. Responsáveis (`aba3`):**
- Dados da mãe (nome, celular, e-mail - todos obrigatórios)
- Dados do pai (nome, telefone opcional)
- Contatos de urgência (adicionáveis múltiplos)
- Pessoas autorizadas a retirar a criança (adicionáveis múltiplos)

**4. Anexos & Termos (`aba4`):**
- Upload de documentos/fotos múltiplos com classificação (FOTO_PROJETO, ATESTADO_MEDICO, etc.)
- Modal de termos de autorização com verificação de rolagem obrigatória
- Botão "Finalizar Inscrição" (`enviarDados()`) que valida todos os passos anteriores

#### Funções Principais

- `window.irAba(num)` - Troca de aba, mantém estado visual
- `window.validarAba1()` / `window.validarAba2()` - Validação de campos obrigatórios
- `window.avancarAba(abaAtual, proximaAba)` - Valida e navega
- `window.enviarDados()` - Monta payload e envia para Google Apps Script
- `window.processarFotoNativa3x4()` - Processamento e recorte da imagem
- `window.iniciarCamera()` / `window.capturarCameraAvancada()` - Controle da câmera
- `window.detectarWebView()` - Bloqueia câmera em apps sociais

---

## Status de Build/Testes

### Comandos para Rodar

```bash
# Instalar dependências
npm install

# Rodar servidor de desenvolvimento (porta 8080)
npm run dev  # ou: npm start

# Executar testes Playwright
npx playwright test  # ou: npm test (se configurado)
```

### Status Atual do Build

- ✅ Servidor local roda em `http://localhost:8080`
- ✅ Index.html carrega sem erros de sintaxe
- ✅ Testes Playwright básicos passam (navigação entre abas, upload de imagem 3x4)
- ⚠️ Testes de câmera real dependem de permissão de hardware e ambiente (WebView detection)

### Scripts Disponíveis (package.json)

```json
{
  "scripts": {
    "dev": "npx http-server -p 8080 -c-1",
    "start": "npx http-server -p 8080 -c-1"
  }
}
```

---

## Bugs Resolvidos & Pendentes

### Resolvidos

- **Detecção de WebView:** Implementada função `window.detectarWebView()` que identifica WhatsApp/Instagram/Facebook e bloqueia o acesso à câmera avançada, caindo para o seletor nativo `<input capture="user">`
- **Cálculo de idade:** Função `window.calcIdade()` calcula idade corretamente a partir da data de nascimento, considerando meses e dias
- Máscaras de entrada: `mTel`, `mCPF`, `mRG`, `mCEP` funcionais com formatação em tempo real
- Validação de CPF: `window.validarCPF()` e `window.validarCPFOnBlur()` implementados e testados
- Recorte 3x4: Canvas crop centralizado preservando aspecto da imagem, saída JPEG 300x400px

### Pendentes

- **Armazenamento persistente:** Dados atuais são perdidos ao fechar a aba; não há localStorage/sessionStorage para persistência entre sessões
- **Validação de e-mail:** Regex simples no campo e-mail; poderia ser reforçada
- **Acessibilidade:** Contraste e foco visível poderiam ser melhorados para compliance
- **Tratamento de erros de rede:** Feedback ao usuário quando `google.script.run` falha (já existe, mas poderia ser mais robusto)
- **Testes de integração:** cobertura de testes para validações de formulário e envio de dados

---

## Próximos Passos

1. **Implementar Sistema de Memória AI** - Criar mecanismo para manter contexto entre sessões, evitando que detalhes arquiteturais ou correções sejam esquecidos
2. **Adicionar persistência local** - Implementar `localStorage` ou `sessionStorage` para manter dados do formulário se o usuário fechar e reabrir o navegador
3. **Refatorar validações** - Criar validações reutilizáveis em vez de funções globais isoladas
4. **Adicionar type definitions** - Tipar as variáveis `window` para melhor manutenção e IDE support
5. **Implementar offline support** - Service Worker para cache dos assets estáticos
6. **Expandir testes Playwright** - Cobrir fluxos de envio de dados, validação de termos, e comportamento em WebView
7. **Documentar API do Google Apps Script** - Caso haja necessidade de migrar o backend
8. **Corrigir contraste do tema** - Verificar acessibilidade das cores do tema verde/escuro