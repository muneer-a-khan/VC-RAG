# VC Copilot Frontend

Next.js frontend for VC Copilot platform.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure:**
   ```bash
   cp env.local.template .env.local
   ```

3. **Run development server:**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Pages

- `/` - Landing page
- `/chat` - AI chat interface
- `/projects` - Project management
- `/integrations` - Third-party integrations
- `/login` - User login
- `/register` - User registration

## Project Structure

```
src/
├── app/              # Next.js pages (App Router)
├── components/       # React components
│   └── ui/          # UI component library
└── lib/             # Utilities
    ├── api.ts       # API client
    ├── store.ts     # State management
    └── utils.ts     # Helper functions
```

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Styling

This project uses:
- **Tailwind CSS** for styling
- **shadcn/ui** for components
- **Lucide React** for icons

