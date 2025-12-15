# Vercel Deployment Fix

## Issue
```
Warning: Could not identify Next.js version
Error: No Next.js version detected
```

## Cause
The project is in a nested directory: `atelier-unlocked-main/atelier-unlocked-main/`

## Solutions

### Option 1: Configure Root Directory in Vercel (Recommended)

1. Go to your Vercel project settings
2. Navigate to **Settings → General**
3. Find **Root Directory**
4. Set it to: `atelier-unlocked-main`
5. Save and redeploy

### Option 2: Deploy from Correct Directory

If deploying via CLI:
```bash
cd atelier-unlocked-main
vercel deploy
```

### Option 3: Move Files Up (Alternative)

If you want to deploy from root:
1. Move all files from `atelier-unlocked-main/atelier-unlocked-main/` to `atelier-unlocked-main/`
2. Update any path references if needed

## Verification

After setting root directory, Vercel should:
- ✅ Detect Next.js automatically
- ✅ Find package.json
- ✅ Run `npm install` and `npm run build` correctly

## Updated vercel.json

The `vercel.json` has been updated with:
- `rootDirectory: "atelier-unlocked-main"` (if deploying from parent)
- Framework detection
- Build commands

**Note:** If your repository root IS `atelier-unlocked-main`, remove the `rootDirectory` line from `vercel.json`.

