# CI/CD — Build automático do FinStats (mesmo repositório)

Todo `git push` na branch `main` faz o GitHub compilar o APK e publicar na aba
**Releases deste próprio repositório**. Sem PC ligado, sem EAS.

> Diferença pro GymStats: aqui as builds saem no mesmo repo do código, então
> NÃO precisa de token pessoal — o workflow usa o GITHUB_TOKEN automático.

---

## Passo 1 — Gerar o keystore (uma vez)

No seu PC (Windows, com Android Studio instalado), no PowerShell:

```powershell
& "C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe" -genkeypair -v -keystore release.keystore -alias finstats -keyalg RSA -keysize 2048 -validity 10000
```

Anote a senha que você digitar. O alias aqui é `finstats`.

Converta para base64 (mesma pasta):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("release.keystore")) > keystore-base64.txt
```

Copie todo o conteúdo de `keystore-base64.txt`.

---

## Passo 2 — Cadastrar os secrets

No repositório do FinStats → **Settings** → **Secrets and variables** →
**Actions** → **New repository secret**. Crie estes quatro
(NÃO precisa do VITRINE_TOKEN desta vez):

| Nome                        | Valor                                   |
|-----------------------------|-----------------------------------------|
| `ANDROID_KEYSTORE_BASE64`   | conteúdo do `keystore-base64.txt`       |
| `ANDROID_KEYSTORE_PASSWORD` | a senha do keystore                     |
| `ANDROID_KEY_ALIAS`         | `finstats`                              |
| `ANDROID_KEY_PASSWORD`      | a senha da chave (a mesma, geralmente)  |

---

## Passo 3 — Subir e disparar

```bash
git add .
git commit -m "Configura CI/CD"
git push origin main
```

Vá na aba **Actions** pra acompanhar. Em alguns minutos o APK aparece na aba
**Releases** do próprio repositório.

Também dá pra rodar manualmente: **Actions** → o workflow → **Run workflow**.

---

## Lançar nova versão

Aumente o `version` no `app.json` (ex.: `"1.0.1"`) e dê push na `main`.
A tag e o nome do release usam esse número.

---

## Notas

- Guarde o `release.keystore` e as senhas; são a identidade de assinatura do app.
- O `release.keystore` e o `keystore-base64.txt` não vão pro repositório (já ignorados no `.gitignore`).
- Este projeto usa libs nativas (react-native-svg, gifted-charts, linear-gradient).
  O `expo prebuild` cuida da configuração nativa delas automaticamente.
