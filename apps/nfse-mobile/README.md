# Integra NFS-e — Gerador de NFS-e para Android

Aplicativo **APK** da **Integra Code** para emissão e consulta de **NFS-e**
(Nota Fiscal de Serviço Eletrônica), com gestão de clientes, serviços/produtos,
cobranças e pagamentos via **Asaas API**.

## Funcionalidades
- Emissão de NFS-e (geração local + transmissão municipal configurável)
- Consulta de notas emitidas (por CNPJ, status, período)
- Cadastro de clientes e serviços/produtos
- Geração de cobrança com ou sem emissão de nota, via **Asaas** (Boleto, PIX, Cartão, etc.)
- PDF da NFS-e e compartilhamento
- Branding Integra Code (logo + fundo)
- 100% funcional: basta inserir os dados da empresa e emitir

## Estrutura
```
nfse-mobile/   -> App React Native (Expo) -> gera o APK
nfse-backend/  -> API Node.js (Express) que o app consome
```

## Backend (API)
```bash
cd nfse-backend
cp .env.example .env      # edite com seus dados (CNPJ, Asaas, etc.)
npm install
npm start                 # roda em http://localhost:3335
```
Endpoints:
- `POST /api/auth/login`
- `GET/POST /api/clients`, `/api/services`
- `POST /api/nfse/emitir`, `GET /api/nfse/listar`, `/api/nfse/consultar/:id`, `/api/nfse/pdf/:id`, `/api/nfse/cancelar/:id`
- `POST/GET /api/charges` (integração Asaas)

Para **transmitir a NFS-e ao município**, preencha no `.env`:
`NFS_E_WEBSERVICE_URL`, `NFS_E_CERTIFICADO_PATH`, `NFS_E_CERTIFICADO_SENHA`.
Sem isso, a nota é **GERADA localmente** (PDF + dados) e fica pronta para transmissão.

## App (APK)
```bash
cd nfse-mobile
npm install
```

### Build do APK (nuvem — não precisa de Android Studio)
1. Crie conta em https://expo.dev e rode `npx eas login`
2. `npx eas build --platform android --profile preview`
3. Baixe o `.apk` gerado e instale no Android.

### Build local (precisa de Android SDK / Android Studio)
```bash
npx expo prebuild
npx expo run:android
```

### Rodar em emulador / dispositivo (dev)
```bash
npx expo start --android
```
No app, em **Configurações**, ajuste a **URL da API** para o IP da máquina
(ex.: `http://10.0.2.2:3335` no emulador Android) e os dados da empresa.

Login padrão: `admin@integracode.com.br` / `admin123`

## Observações
- NFS-e é municipal: cada cidade tem seu webservice. O backend já tem o
  estrutura pronta; basta configurar a URL e o certificado digital (A1).
- Asaas exige a `ASAAS_API_KEY` no `.env` do backend para cobranças reais.
