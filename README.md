# Ishastra Web - Trading & Investment Platform

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Environment Setup

The application supports 2 environments with different API and frontend configurations.

### Environment Files

- `.env.development` - Development environment (automatically used by `npm start`)
- `.env.production` - Production environment (automatically used by `npm run build`)

### Environment Configuration

| Environment | API Base URL | Frontend URL | Command |
|-------------|--------------|--------------|---------|
| Development | `http://localhost:8000` | `http://localhost:3000` | `npm start` |
| Dev with Prod Config | `http://192.168.10.100:8000` | `http://localhost:3000` | `npm run start:prod` |
| Production Build | `http://192.168.10.100:8000` | `http://192.168.10.100:3000` | `npm run build` |
| Serve Production | `http://192.168.10.100:8000` | `http://localhost:[random]` | `npm run serve` |
| Serve Production on 3000 | `http://192.168.10.100:8000` | `http://localhost:3000` | `npm run serve:prod` |

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server (uses .env.development)
npm start
```

### Testing Production Configuration

```bash
# Start development server with production API endpoints
npm run start:prod
```

### Production Build and Serve

```bash
# Build for production (uses .env.production)
npm run build

# Build and serve production app locally
npm run serve

# Build and serve production app on port 3000
npm run serve:prod
```

The app will automatically use the appropriate configuration based on the command used.

## Available Scripts

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
