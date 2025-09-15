# Claude Instructions

## Package Management
- Only use `yarn` for package management, never npm
- Always use yarn commands for installing, removing, and managing dependencies

## Development Environment
- Do not run `yarn build` - assume the application is already running
- The application runs with `yarn dev` on tmux window 1
- Check tmux window 1 for development server logs and errors
- The dev server auto-reloads when files are changed