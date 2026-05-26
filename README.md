# Jira Project Assistant

Forge-приложение для Jira Cloud, которое показывает проблемные задачи проекта и умеет автоматически исправлять часть из них.

## Что реализовано

- Главная вкладка `Issues` с таблицей задач.
- Подсветка проблем:
  - `UNASSIGNED` для задач без исполнителя.
  - `LOW_PRIORITY_CLOSE_DEADLINE` для задач с низким приоритетом и близким дедлайном.
- Кнопка `Fix`:
  - Назначение исполнителя через модальное окно.
  - Повышение приоритета до `Medium` или `High`.
- Верхняя панель:
  - Общая статистика выбранного проекта.
  - `Auto-assign unassigned` с подтверждающим диалогом.
  - Dropdown выбора проекта.
- Вкладка `Team`:
  - Список участников проекта.
  - Количество назначенных задач.
  - Условный activity score на основе назначенных и недавно обновленных задач.
- Полная типизация resolver payloads и frontend/backend DTO.
- Loading/error состояния для загрузки, одиночных действий и массового назначения.
- Optimistic UI: интерфейс обновляется сразу, затем синхронизируется с Jira повторным запросом.

## Технологии

- Atlassian Forge
- TypeScript
- React (functional components)
- Material UI
- Zustand
- Jira REST API v3
- Docker / Docker Compose

## Структура проекта

```text
.
├─ manifest.yml
├─ src/                 # Forge resolver + Jira API layer
├─ shared/              # Shared types and issue rules
├─ static/app/          # React + MUI Custom UI
├─ Dockerfile
└─ docker-compose.yml
```

## Подготовка

1. При первом использовании выполните `npm run forge:register`, чтобы Forge CLI создал или перерегистрировал `app.id` в `manifest.yml` под вашим Atlassian-аккаунтом.
2. Убедитесь, что у вас есть Jira Cloud site и доступ для установки Forge app.

## Запуск через Docker

1. Скопируйте `.env.example` в `.env`.
2. Укажите в `.env`:

```bash
FORGE_EMAIL=you@example.com
FORGE_API_TOKEN=your-scoped-token
```

Forge CLI в Docker-контейнере обычно не имеет доступа к системному keychain, поэтому по документации Atlassian для контейнерных сред лучше использовать переменные окружения `FORGE_EMAIL` и `FORGE_API_TOKEN`, а не `forge login`: [forge login](https://developer.atlassian.com/platform/forge/cli-reference/login/), [getting started](https://developer.atlassian.com/platform/forge/getting-started/).

3. Запустите dev-режим:

```bash
docker compose up --build
```

Что произойдет:

- поднимется Vite dev server на `3000`;
- запустится `forge tunnel`;
- ресурс из `manifest.yml` будет проксироваться через tunnel на локальный frontend.

## Локальная разработка без Docker

```bash
npm install
npm run forge:analytics:off
npm run forge:login
npm run dev
```

Что делает `npm run dev`:

- поднимает Vite dev server на `localhost:3000`
- запускает `forge tunnel`
- проксирует Custom UI в Jira project page

Важно: не открывайте `localhost:3000` напрямую. Forge bridge работает только внутри Jira, когда страница загружена как Forge app.

Если это первый запуск Forge CLI на машине, команды `forge:analytics:off` и `forge:login` достаточно выполнить один раз.

## Деплой и установка в Jira

```bash
npm run deploy
npx forge install --site <your-site>.atlassian.net --product jira --environment development
```

Или в Docker:

```bash
docker compose run --rm forge npm run deploy
docker compose run --rm forge npx forge install --site <your-site>.atlassian.net --product jira --environment development
```

После установки откройте страницу проекта Jira и найдите `Jira Project Assistant` в списке project apps.

## Resolver API

Используются четыре resolver-метода:

- `getDashboard`
- `assignIssue`
- `raisePriority`
- `autoAssignUnassigned`

Все операции идут через `api.asApp().requestJira(...)`, то есть реализованы в рамках Forge development platform.


## Проверка

После установки зависимостей можно выполнить:

```bash
npm run verify
```

Команда прогоняет TypeScript typecheck и сборку Custom UI.

Для Docker-проверки конфигурации полезно выполнить:

```bash
docker compose config
```
