# Как залить проект на GitHub

## Шаг 1. Создай репозиторий на GitHub

1. Открой https://github.com/new
2. **Repository name:** `riskops-lab` (или любое другое)
3. Оставь **Public**
4. **НЕ** ставь галочки "Add README" и "Add .gitignore" — репозиторий должен быть пустым
5. Нажми **Create repository**

## Шаг 2. Подключи remote и запушь

Remote уже добавлен. В терминале выполни:

```bash
cd "c:\Users\diana\OneDrive\Документы\riskops-lab"
git push -u origin main
```

При первом push GitHub попросит авторизацию — используй **Personal Access Token** (не пароль).

---

**Как создать токен:** GitHub → Settings → Developer settings → Personal access tokens → Generate new token (classic). Выбери scope `repo`.
