# Подключение Supabase

## 1. Создай проект

1. Зайди на [supabase.com](https://supabase.com) и войди в аккаунт
2. **New project** → укажи имя, пароль для БД, регион
3. Дождись создания проекта

## 2. Получи ключи

В панели проекта: **Settings** → **API**:
- **Project URL** — скопируй
- **anon public** key — скопируй (под "Project API keys")

## 3. Настрой переменные

Создай файл `.env.local` в корне проекта:

```
NEXT_PUBLIC_SUPABASE_URL=https://твой-проект.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=твой-anon-key
```

## 4. Использование

```ts
import { supabase } from "@/lib/supabase";

// Чтение
const { data, error } = await supabase.from("users").select("*");

// Вставка
await supabase.from("users").insert({ email: "...", ... });

// Обновление
await supabase.from("users").update({ status: "Active" }).eq("id", "u-1001");
```

## 5. Создание таблиц

В Supabase: **Table Editor** → **New table** — создай нужные таблицы (users, alerts и т.д.).
