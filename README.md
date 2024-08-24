# Moonlit
 
## Custom CLI-based panel for running child processes easily

## Configuration

config.json:
```txt
useEmojis - Sets whether to use emojis like 🔴 and 🟢. Useful when running in web tools like Pterodactyl but will look broken when directly running in CLI.

errorHook - Discord Webhook to post to when anything is outputted to STDERR

outputHook - Discord Webhook to post to when anything is outputted to STDOUT
```
(Technically both webhook urls would work with any URL using the following post data: `{ "content": "## " + name + "\n\n" + text }`)

## Running

You can either transpile this to NodeJS or run it directly as TS
Running without Transpilation `ts-node index.ts`
Transpiling: `tsc` & `node dist/index.js`