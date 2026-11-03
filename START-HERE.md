# Start here 👋

You don't need to be a developer. Cursor's AI Agent will write the code; you guide it one step at a time.

## First time

1. **Open the folder.** In Cursor, choose **File > Open Folder** and pick this `sitglow` folder.
2. **Open the Agent chat.** Press **Cmd+I** (Mac) or **Ctrl+I** (Windows), or click the chat icon at the top right, and make sure it's in **Agent** mode.
3. **Paste the first prompt.** Open `prompts/01-kickoff.md`, copy everything in it, paste it into the Agent chat, and press Enter.
4. **Approve and run.** The Agent will ask to run commands (like `npm install`). Click **Run** / **Accept**. When it's done, run `npm run dev` in the terminal (or ask the Agent to) and open the local link it shows (usually http://localhost:5173).

## Then keep going

Paste the prompts in order: `02`, `03`, `04` ... up to `08`. After each one:

- Check the **"How to verify"** list at the bottom of that prompt.
- If something looks wrong, just tell the Agent in plain words ("the score stays at 0 when I slouch"). It will fix it.
- Happy with it? Click **Keep all** / **Accept** to save the changes.

## Good to know

- You need **Node.js** installed (get the "LTS" version at https://nodejs.org). If the Agent says `npm` isn't found, install Node and restart Cursor.
- The Agent automatically follows the rules in `.cursor/rules/sitglow.mdc` (brand colors, privacy, tone), so you don't have to repeat them.
- The mockups in `design/` show what each screen should look like.
- Your camera video never leaves your computer, even while you're building.

Have fun, and sit up straight. ☀️
