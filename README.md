# fca-redux

> [!WARNING]
> This project is currently **under development**. Features may be incomplete, and breaking changes can occur at any time. Use with caution.

A modern, robust **TypeScript** rewrite of the Nero Facebook Client API (and its predecessors). This library allows you to programmatically interact with Facebook's private API to send messages, listen to events, and manage interactions.

## Features

- **Messaging**: Send text, attachments, stickers, and handle replies.
- **Realtime**: MQTT-based listener for instant message reception.
- **Reactions**: React to messages programmatically.
- **User Info**: Retrieve detailed user profiles.
- **Safety**: Unsend messages and manage thread settings.
- **Developer Experience**:
  - Full TypeScript support with type definitions.
  - Integrated debugging and logging utilities.
  - customizable options (User Agent, auto-reconnect, etc.).

## Installation

```bash
npm install fca-redux
```

## Quick Start

Here is a simple example of how to log in using an `appState` (cookies) and listen for incoming messages.

```typescript
import { login } from 'fca-redux';
// Or: import fca from 'fca-redux';

// Your 'appState.json' contains the cookies from a logged-in session.
const credentials = {
    appState: require('./appState.json') 
};

const options = {
    listenEvents: true,
    selfListen: false
};

login(credentials, options, (err, api) => {
    if (err) {
        console.error('Login failed:', err);
        return;
    }

    console.log('Login successful!');

    // simple echo bot example
    api.listenMqtt((err, message) => {
        if (err) return console.error(err);

        if (message.type === 'message') {
            api.sendMessage(`You said: ${message.body}`, message.threadID);
        }
    });
});
```

## Development

To set up the project locally for development:

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Build the project:**
    ```bash
    npm run build
    ```

3.  **Linting:**
    ```bash
    npm run lint
    ```

4.  **Formatting:**
    ```bash
    npm run format
    ```

5.  **Run Tests:**
    ```bash
    npm test
    ```

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.
1.  Fork the repo.
2.  Create your feature branch (`git checkout -b feature/amazing-feature`).
3.  Commit your changes (`git commit -m 'Add some amazing feature'`).
4.  Push to the branch (`git push origin feature/amazing-feature`).
5.  Open a Pull Request.

## License

MIT © [0x3EF8](https://github.com/0x3EF8)