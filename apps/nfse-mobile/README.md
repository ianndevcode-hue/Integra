# Integra NFS-e — Marília/SP + Asaas (APK)

App da **Integra Code** para emitir/consultar **NFS-e** de **Marília-SP**, com
cobranças via **Asaas** e a **chave Asaas configurável dentro do próprio app**.

## O que já está pronto
- Município configurado para **Marília/SP** (código IBGE 3543402, padrão ABRASF / Softbase ISS.NET).
- Tela de **Configurações** no app com campo para colar a **Chave API Asaas** (sem mexer no backend).
- Emissão de NFS-e, consulta, clientes, serviços e cobranças/PIX/boleto via Asaas.
- Backend testado (emissão gera PDF, status `GERADA` quando o webservice municipal não está configurado).

## 1) Backend (API)
```bash
cd nfse-backend
cp .env.example .env
# Edite: EMPRESA_* (seus dados), NFS_E_WEBSERVICE_URL (URL do RPS de Marília),
#        NFS_E_CERTIFICADO_PATH / SENHA (seu certificado A1)
npm install && npm start        # http://localhost:3335
```

## 2) App — colocar a chave Asaas no app
No app: **Configurações** → cole a `Chave API Asaas` (ex.: `$aact_...`). Ela é
enviada em cada chamada para o backend (`X-Asaas-Key`), então **não precisa**
editar o `.env`. Também ajuste a **URL da API** para o IP da máquina que roda o
backend (ex.: `http://10.0.2.2:3335` no emulador, ou o IP da rede no celular).

## 3) Gerar o APK
O APK exige Android SDK / rede para os servidores do Google. No seu computador
(com Node + rede liberada):

**Opção A — Nuvem (mais fácil, sem Android Studio):**
```bash
cd nfse-mobile
chmod +x build-apk.sh
./build-apk.sh          # faz login na Expo e gera o .apk na nuvem
```
Baixe o `.apk` do link exibido e instale no Android.

**Opção B — Local (precisa de Android Studio / SDK + JDK 17):**
```bash
cd nfse-mobile
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease        # ou assembleDebug
# APK em android/app/build/outputs/apk/release/app-release.apk
```

## Observações sobre Marília
- A NFS-e de Marília usa o padrão **ABRASF** (provedor Softbase ISS.NET).
- Para **transmitir de verdade** para o município, informe no `.env` a
  `NFS_E_WEBSERVICE_URL` (endpoint de envio de lote RPS do portal da NFS-e de
  Marília) e o caminho do seu **certificado digital A1** + senha.
- Sem isso, a nota é **GERADA** localmente (PDF + dados prontos), e basta
  preencher a URL/certificado para transmitir.
- Login padrão do app: `admin@integracode.com.br` / `admin123`.
