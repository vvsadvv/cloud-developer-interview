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
jira-project-assistant/
├─ manifest.yml
├─ src/                 # Forge resolver + Jira API слой
├─ shared/              # Общие типы между frontend и backend
├─ static/app/          # React + MUI Custom UI
├─ Dockerfile
└─ docker-compose.yml
```

## Подготовка

1. При первом использовании выполните `npm run forge:register`, чтобы Forge CLI создал или перерегистрировал `app.id` в [manifest.yml](jira-project-assistant/manifest.yml) под вашим Atlassian-аккаунтом.
2. Убедитесь, что у вас есть Jira Cloud site и доступ для установки Forge app.

## Запуск через Docker

1. Скопируйте `.env.example` в `.env`, если хотите поменять порт Vite.
2. Выполните первый логин в Forge CLI внутри контейнера:

```bash
docker compose run --rm forge npx forge login
```

3. Запустите dev-режим:

```bash
docker compose up --build
```

Что произойдет:

- поднимется Vite dev server на `3000`;
- запустится `forge tunnel`;
- ресурс из `manifest.yml` будет проксироваться через tunnel на локальный frontend.

## Локальный запуск без Docker

```bash
npm install
npm run build --workspace static/app
npx forge tunnel
```

Для разработки:

```bash
npm run dev
```

Если это первый запуск Forge CLI на машине, один раз выполните:

```bash
npm run forge:analytics:off
npm run forge:login
```

Это отключит analytics prompt, который ломает `forge tunnel` в неинтерактивном процессе, и отдельно откроет нормальный интерактивный логин в CLI.

## Деплой и установка в Jira

```bash
npm run deploy
npm run install:jira
```

Или в Docker:

```bash
docker compose run --rm forge npm run deploy
docker compose run --rm forge npm run install:jira
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
