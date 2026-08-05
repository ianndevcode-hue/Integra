#!/usr/bin/env bash
# Gera o APK do app Integra NFS-e via EAS Build (nuvem, sem Android Studio).
# Pre-requisitos: Node.js + npm instalados e rede liberada.
set -e

cd "$(dirname "$0")"

echo "==> Instalando EAS CLI..."
npm install -g eas-cli

echo "==> Faca login na sua conta Expo (precisa criar em https://expo.dev se nao tiver)..."
eas login

echo "==> Gerando APK (perfil 'preview' => .apk instalavel)..."
eas build --platform android --profile preview --non-interactive

echo "==> Pronto! Baixe o .apk no link que o EAS exibir e instale no Android."
