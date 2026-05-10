## Полная переработка системы команд — Rko System

Большой объём работы. Разобью на фазы. Подтвердите план — выполню всё последовательно.

### ФАЗА 1 — База данных и роли

**Расширение ролей** (enum `app_role`):
- `super_admin`, `admin`, `team_lead`, `owner_team`, `user`

**Новые таблицы:**
- `teams` — команды (id, name, slug, owner_user_id, description, logo_url, color, status, created_at)
- `team_members` — связь user↔team с ролью внутри команды
- `team_offers` — какие офферы доступны команде + кастомные ставки (team_id, offer_id, custom_payout, enabled)
- Добавить `team_id` в `leads`, `profiles`, `access_keys`
- Добавить поля в `offers`: `team_id` (nullable — общие если NULL), `payout_min`, `payout_max`, `stage` (DEBIT/RKO/CREDIT/MFO), `priority`
- `impersonation_logs` — лог входов admin-ов в чужие аккаунты
- `access_key_usage` — лог использования ключей

**SECURITY DEFINER функции:**
- `is_super_admin(uuid)`, `is_team_lead(uuid)`, `is_owner_team(uuid)`
- `get_user_team(uuid) → uuid` — команда пользователя
- `can_access_team(uuid, uuid)` — может ли пользователь видеть команду
- `can_access_lead(uuid, uuid)` — доступ к конкретному лиду

**RLS обновление** для всех таблиц по новой иерархии:
- super_admin/admin → всё
- team_lead/owner_team → только своя команда
- user → только своё

**Сидинг офферов:**
- EXC TEAM: 3 этапа (Debit/RKO/Credit) с указанными ставками
- RR TEAM: 12 MFO офферов
- Создание команд EXC, RR, Xasl с owner-аккаунтами

### ФАЗА 2 — UI Команды

Новые страницы:
- `/teams` — список команд (admin/super_admin) с карточками: лого, цвет, доход, кол-во участников, конверсия
- `/teams/$teamId` — детальная страница: участники, офферы, статистика, выплаты, лиды
- `/teams/new` — создание команды (модал/страница) с полями: название, owner, логотип, цвет, описание, выбор офферов, прайсы
- `/my-team` — для team_lead/owner_team — упрощённый dashboard своей команды

Компоненты:
- `TeamCard`, `TeamMembersList`, `TeamOffersTable`, `TeamStatsPanel`, `CreateTeamModal`, `AssignUserToTeamModal`

### ФАЗА 3 — Access Keys & Impersonation

- Страница `/access-keys` — генерация, привязка к команде/роли, лимиты, срок, статус
- Кнопка "Войти как" в списке пользователей (admin/super_admin) → impersonation через server function с логом
- Баннер "Вы вошли как X — выйти" сверху во время impersonation

### ФАЗА 4 — Офферы по командам

- В `/offers` фильтр по команде, отображение этапов (Debit/RKO/Credit/MFO)
- Кастомные ставки команды поверх базовых
- Owner_team видит только офферы своей команды
- При создании лида user видит только доступные ему офферы (через team_offers)

### ФАЗА 5 — Dashboard и аналитика по ролям

Адаптация `/` (dashboard) и `/analytics` под роли:
- **super_admin/admin**: общая + per-team breakdown, топ команды, топ users
- **team_lead/owner_team**: только своя команда — доход, конверсия, лучший/худший менеджер, топ офферы, проблемные лиды команды, live активность
- **user**: только своё (как сейчас)

Новые виджеты: `TeamLeaderboard`, `BestWorstManager`, `TeamLiveActivity`, `TeamRevenueCard`

### ФАЗА 6 — Sidebar и навигация

- Sidebar items по ролям: Teams (admin+), My Team (team_lead/owner), Access Keys (admin/team_lead), Impersonation banner
- Бейджи ролей в профиле, цветовая индикация команды

### Технические детали

- Все запросы через `createServerFn` с `requireSupabaseAuth` где нужна привилегия
- Impersonation: server fn создаёт временный JWT через service role + лог в `impersonation_logs`
- Access keys: хешируются в БД, проверка через server fn
- Все RLS через SECURITY DEFINER функции (избегаем рекурсии)
- Live updates через Supabase Realtime для team activity

### Объём
~6 миграций, ~15 новых компонентов, ~6 новых routes, обновление dashboard/analytics/leads/offers/users/sidebar.

**Подтвердите — начну с Фазы 1 (миграция БД).**