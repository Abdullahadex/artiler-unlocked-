# Build Guide for ATELIER

## Prerequisites

1. **Node.js**: Version 18 or higher
2. **npm**: Latest version
3. **Environment Variables**: Set up `.env.local` with Supabase credentials

## Setup Steps

### 1. Install Dependencies

```bash
npm install
```

If you encounter `ENOTEMPTY` errors, clean install:
```bash
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm install
```

### 2. Set Up Environment Variables

Create `.env.local` in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 3. Build the Project

```bash
npm run build
```

### 4. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## Common Build Issues

### Issue 1: Supabase Import Errors

**Error**: `Attempted import error: '../module/index.js' does not contain a default export`

**Solution**: The Supabase client is already configured to use the standard client. If issues persist:
- Ensure you're using the latest versions: `npm install @supabase/supabase-js@latest`
- The client in `src/integrations/supabase/client.ts` uses `createClient` from `@supabase/supabase-js`

### Issue 2: PostCSS Configuration

**Error**: `Your custom PostCSS configuration must export a plugins key`

**Solution**: Already fixed. The `postcss.config.js` uses CommonJS format.

### Issue 3: TypeScript Errors

**Solution**: Run type checking:
```bash
npx tsc --noEmit
```

### Issue 4: Missing Dependencies

**Solution**: 
```bash
npm install
```

## Production Build

After successful build:
```bash
npm run build
npm start
```

## Troubleshooting

1. **Clear Next.js cache**:
   ```bash
   Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
   npm run build
   ```

2. **Check Node version**:
   ```bash
   node --version  # Should be 18+
   ```

3. **Verify environment variables**:
   Make sure `.env.local` exists and has correct values

4. **Check for port conflicts**:
   Default port is 3000. Change in `package.json` if needed.

