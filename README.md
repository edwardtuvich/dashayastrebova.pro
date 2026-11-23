# dashayastrebova.pro

Готовый статический сайт-портфолио Даши Ястребовой (DY·STUDIO). Английский основной, русский включается кнопкой RU.

Сайт лежит в папке `docs/`. Это обычные файлы: html, css, js, картинки, видео, шрифты. Сервер, база и сборка на хостинге не нужны.

## Что в репозитории

| Путь | Что это |
|---|---|
| `docs/` | Сам сайт. Именно эта папка публикуется |
| `docs/CNAME` | Домен для GitHub Pages: `dashayastrebova.pro` |
| `docs/.nojekyll` | Просит GitHub отдавать файлы как есть |
| `docs/404.html` | Страница «не найдено» |
| `docs/sitemap.xml`, `docs/robots.txt` | Для поисковиков |
| `build.sh` | Пересобирает `docs/` из исходников сайта |
| `tools/` | Скрипты экспорта и проверки |
| `deploy/nginx.conf.example` | Пример настройки своего сервера |
| `.github/workflows/deploy.yml` | Автовыкладка на свой сервер (путь B) |
| `analytics.example.html` | Пример кода аналитики без cookie |

Размер: около 360 МБ, самый большой файл 16 МБ. Лимиты GitHub (файл до 100 МБ, репозиторий до 1 ГБ) проходим.

## Первый раз: залить на GitHub

1. Зайти на github.com, создать аккаунт (если нет) и новый репозиторий, например `dashayastrebova.pro`. Тип Public (для бесплатного GitHub Pages) или Private (если есть платный тариф). README и .gitignore при создании не добавлять.
2. В терминале, в этой папке:

```
git add -A
git commit -m "Site"
git branch -M main
git remote add origin https://github.com/ВАШ_ЛОГИН/dashayastrebova.pro.git
git push -u origin main
```

Первая заливка занимает несколько минут: видео весят около 136 МБ.

Дальше один из двух путей.

## Путь A. GitHub Pages и свой домен (проще всего)

1. На GitHub открыть репозиторий, Settings → Pages.
2. Source: **Deploy from a branch**. Branch: **main**, папка **/docs**. Save.
3. Там же в поле Custom domain вписать `dashayastrebova.pro`, Save.
4. У регистратора домена открыть управление DNS и поставить записи:

| Тип | Имя | Значение |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | ВАШ_ЛОГИН.github.io |

   Старые записи A, AAAA и CNAME для `@` и `www` (парковка регистратора) удалить.
5. Подождать от 10 минут до нескольких часов, пока обновится DNS. В Settings → Pages появится зелёная отметка у домена.
6. Там же включить галочку **Enforce HTTPS** (становится доступной после проверки домена).
7. Проверить: `https://dashayastrebova.pro`, `https://www.dashayastrebova.pro` (должен перекинуть на адрес без www), любой несуществующий адрес (должна открыться страница 404).

Ограничения GitHub Pages: сайт до 1 ГБ, мягкий лимит трафика 100 ГБ в месяц. Для портфолио хватает. Если трафик вырастет, тот же репозиторий подключается к Cloudflare Pages за пять минут (папка вывода `docs`, команда сборки пустая).

## Путь B. Свой сервер

Нужен сервер с nginx и доступ по SSH.

1. На сервере создать папку сайта и пользователя для выкладки:

```
sudo mkdir -p /var/www/dashayastrebova.pro
sudo adduser --disabled-password deploy
sudo chown -R deploy:deploy /var/www/dashayastrebova.pro
```

2. На своём компьютере создать отдельный ключ только для выкладки:

```
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-deploy"
```

   Содержимое `deploy_key.pub` добавить на сервере в `/home/deploy/.ssh/authorized_keys`. Файл `deploy_key` (приватный) в репозиторий не класть.
3. Настроить nginx по примеру `deploy/nginx.conf.example`, выпустить сертификат: `sudo certbot --nginx -d dashayastrebova.pro -d www.dashayastrebova.pro`.
4. В DNS у регистратора: запись A для `@` и для `www` на IP сервера.
5. На GitHub: Settings → Secrets and variables → Actions.

   Вкладка **Secrets**, кнопка New repository secret:

| Secret | Значение |
|---|---|
| `SSH_PRIVATE_KEY` | всё содержимое файла `deploy_key` |
| `SSH_HOST` | IP или имя сервера |
| `SSH_USER` | `deploy` |
| `SSH_PORT` | порт SSH, обычно `22` (можно не задавать) |
| `DEPLOY_PATH` | `/var/www/dashayastrebova.pro` |
| `SSH_KNOWN_HOSTS` | вывод команды `ssh-keyscan -p 22 IP_СЕРВЕРА` |

   Вкладка **Variables**, New repository variable: `DEPLOY_TO_SERVER` = `true`. Без этой переменной выкладка на сервер выключена.
6. После этого каждый `git push` с изменениями в `docs/` сам выкладывает сайт на сервер. Запустить вручную: вкладка Actions → Deploy to server → Run workflow.

Файлы `CNAME` и `.nojekyll` на сервер не копируются, они нужны только GitHub Pages.

## Как обновлять сайт

Исходники сайта (Python-сборщики и оригиналы картинок и видео) в этот репозиторий не входят. Они лежат отдельно, в папке `site`.

После правок в исходниках:

```
sh build.sh
git add -A
git commit -m "Update"
git push
```

`build.sh` заново собирает `docs/`, пишет `sitemap.xml`, `robots.txt`, `CNAME` и открывает каждую страницу в браузере для проверки. Если исходники лежат в другом месте: `SITE_SRC=/путь/к/site sh build.sh`. Для проверки нужны Python 3 и Playwright (`pip install playwright && playwright install chromium`); без проверки: `NO_VERIFY=1 sh build.sh`.

## Аналитика (сейчас выключена)

Сайт не собирает данные и не ставит cookie, поэтому баннер про cookie не нужен. Чтобы считать посещения без cookie:

1. Завести аккаунт в Plausible или включить Cloudflare Web Analytics.
2. Скопировать `analytics.example.html` в `analytics.html`, оставить нужный вариант и вписать свои данные.
3. В исходниках сайта в файле `build_misc.py` поставить `ANALYTICS_ON = True` и запустить `python3 build_misc.py`: на странице Privacy появится абзац про статистику.
4. Собрать с аналитикой: `ANALYTICS=analytics.html sh build.sh`, затем commit и push.

## Что уже сделано для домена

- Английские title и description на всех страницах, canonical, Open Graph и Twitter-карточки, общая картинка для превью ссылок `og/dasha-yastrebova.jpg` и обложка проекта на страницах проектов.
- Иконки сайта: `favicon.svg`, `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`.
- Шрифты лежат на сайте (`fonts/`), к Google сайт не обращается.
- Страницы `privacy.html` и `404.html`.
- Картинки подгружаются по мере прокрутки, видео начинают грузиться только в кадре.

## После запуска

- Добавить сайт в Google Search Console и отправить `https://dashayastrebova.pro/sitemap.xml`.
- Проверить превью ссылки в Telegram и WhatsApp (если показывается старое превью, в Telegram помогает бот @WebpageBot).
- Поставить ссылку на сайт в профиле Instagram.
