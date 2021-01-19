# jukebox-app

Uses an express server for production, but vue CLI for development

## Project setup
```
npm install
```

### Compiles and hot-reloads for development

Start the Vue development server - this will serve Vue app routes on port 8080

```
npm run serve
```

Start the development Express server - this will serve API routes only on port 6400

```
npm run express
```

### Compiles and minifies for production

Build the Vue project files:

```
npm run build
```

### Runs production server

Start the production Express server - this will serve both API routes and the Vue app routes on port 6400

```
npm run express:run
```

### Lints and fixes files
```
npm run lint
```

### Express config

Set host or port with command flags in `package.json`, e.g.

`"express": "vue-cli-service express:watch --port 6400"`

### ESlint config

Note for future project setup, to convert from default two-space indentation to tab indentation, you need to configure eslint in package.json and remove prettier. Switch to the following eslint config, then run the lint task again:

```
"eslintConfig": {
    "root": true,
    "env": {
      "node": true
    },
    "extends": [
      "plugin:vue/essential",
      "eslint:recommended"
    ],
    "parserOptions": {
      "parser": "babel-eslint"
    },
    "rules": {
      "vue/script-indent": [
        "error",
        "tab",
        {
          "baseIndent": 1
        }
      ],
      "vue/html-indent": [
        "error",
        "tab",
        {
          "baseIndent": 1
        }
      ]
    }
  }
 ```

