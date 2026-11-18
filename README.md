# Taxi

| Ordner | Inhalt |
| --- | --- |
| [`taxi-app/`](taxi-app/) | **TaxiPrüfung Österreich** – Lern- und Quiz-App zur Vorbereitung auf die Taxi-Prüfung (Wien). Next.js 15, React 19, TypeScript, Tailwind, Prisma/PostgreSQL. |

Schnellstart:

```bash
cd taxi-app
npm install && cp .env.example .env   # DATABASE_URL und AUTH_SECRET setzen
npx prisma migrate deploy && npm run db:seed && npm run dev
```

Details: [`taxi-app/README.md`](taxi-app/README.md)
