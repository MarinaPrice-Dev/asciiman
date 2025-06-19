# Server Refactoring Plan

## Current Problems:
1. **Multiple production servers**: 4+ different production server files
2. **Confusing naming**: `server/prod.ts` in development folder
3. **Maintenance nightmare**: Changes need to be made in multiple files
4. **Unclear deployment**: Which server file is actually used?

## Proposed Clean Structure:

### Development:
```
server/
├── index.ts          # Development server
└── tsconfig.json     # TypeScript config
```

### Production:
```
dist-server/
└── server.js         # Single production server (compiled from server/index.ts)
```

### Build Process:
1. `npm run build:server` compiles `server/index.ts` → `dist-server/server.js`
2. `web.config` points to `dist-server/server.js`
3. Single source of truth for server logic

## Benefits:
1. **Single source of truth**: One server file to maintain
2. **Clear separation**: Development vs production
3. **Simpler deployment**: One compiled server file
4. **Easier maintenance**: Changes only need to be made in one place

## Migration Steps:
1. Consolidate all server logic into `server/index.ts`
2. Update build process to output single `dist-server/server.js`
3. Update `web.config` to point to new server file
4. Remove duplicate server files
5. Update package.json scripts

## Files to Remove:
- `server/prod.ts`
- `dist-server/prod.js`
- `dist-server/index.js`
- `dist-server/prod.ts`
- `dist-server/server/prod.js`
- `dist-server/server/index.js` 