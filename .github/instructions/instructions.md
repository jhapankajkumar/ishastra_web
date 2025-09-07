---
applyTo: "**"
---

# Ishastra Frontend - Industry Standard Rules & Best Practices

## LARGE FILE & COMPLEX CHANGE PROTOCOL

### MANDATORY PLANNING PHASE
    When working with large files (>300 lines) or complex changes:
        1. ALWAYS start by creating a detailed plan BEFORE making any edits
            2. Your plan MUST include:
                   - All functions/sections that need modification
                   - The order in which changes should be applied
                   - Dependencies between changes
                   - Estimated number of separate edits required
                
            3. Format your plan as:
## PROPOSED EDIT PLAN
    Working with: [filename]
    Total planned edits: [number]

### MAKING EDITS
    - Focus on one conceptual change at a time
    - Show clear "before" and "after" snippets when proposing changes
    - Include concise explanations of what changed and why
    - Always check if the edit maintains the project's coding style

### Edit sequence:
    1. [First specific change] - Purpose: [why]
    2. [Second specific change] - Purpose: [why]
            
### EXECUTION PHASE
    - After each individual edit, clearly indicate progress:
        "✅ Completed edit [#] of [total]. Ready for next edit?"
    - If you discover additional needed changes during editing:
    - STOP and update the plan
    - Get approval before continuing
    - Do not hard code the value and say it is complete
    - Do not create the similar fiels elsewhere scan the files and folder first, check if there something common avaialble
                
### REFACTORING GUIDANCE
    When refactoring large files:
    - Break work into logical, independently functional chunks
    - Ensure each intermediate state maintains functionality
    - Consider temporary duplication as a valid interim step
    - Always indicate the refactoring pattern being applied
                
### RATE LIMIT AVOIDANCE
    - For very large files, suggest splitting changes across multiple sessions
    - Prioritize changes that are logically complete units
    - Always provide clear stopping points
            
## General Requirements
    Use modern technologies as described below for all code suggestions. Prioritize clean, maintainable code with appropriate comments.

## 🎨 React & Frontend Architecture

### ✅ DO's

#### Component Design
- **Use functional components**: Prefer hooks over class components
- **Follow single responsibility**: One component, one purpose
- **Use composition over inheritance**: Compose components instead of extending
- **Implement proper prop validation**: Use PropTypes or TypeScript
- **Keep components small**: Aim for <150 lines per component

#### State Management
- **Use local state first**: Don't over-engineer with global state
- **Implement Context API wisely**: For theme, auth, user preferences
- **Consider state management libraries**: Redux Toolkit for complex apps
- **Use React Query/SWR**: For server state management
- **Implement proper state lifting**: Move state up when shared

#### Performance Optimization
- **Use React.memo**: Prevent unnecessary re-renders
- **Implement useMemo/useCallback**: Optimize expensive computations
- **Use lazy loading**: React.lazy for code splitting
- **Optimize bundle size**: Tree shaking, dynamic imports
- **Implement virtual scrolling**: For large lists

#### Code Organization
- **Use consistent folder structure**: Group by feature or file type
- **Implement barrel exports**: Clean import statements
- **Use absolute imports**: Configure path mapping
- **Separate concerns**: Hooks, utils, components, pages
- **Follow naming conventions**: PascalCase for components, camelCase for functions

#### Styling & UI
- **Use CSS Modules/Styled Components**: Scoped styling
- **Implement responsive design**: Mobile-first approach
- **Use design system**: Consistent spacing, colors, typography
- **Optimize CSS**: Remove unused styles, minimize bundle
- **Use CSS-in-JS properly**: Avoid runtime style generation

#### Testing
- **Write unit tests**: React Testing Library for components
- **Test user interactions**: Focus on behavior, not implementation
- **Use snapshot testing carefully**: For stable components only
- **Mock external dependencies**: APIs, third-party libraries
- **Test accessibility**: Screen readers, keyboard navigation

#### AI-Assisted Development Quality Control
- **Always verify syntax**: Test every code change immediately after AI generation
- **Run the application**: Never assume code works without running it locally
- **Check browser console**: Verify no JavaScript errors after any changes
- **Validate file uniqueness**: Ensure no duplicate files with same content exist
- **Cross-reference implementations**: Verify AI suggestions match actual project structure
- **Test user workflows**: Always manually test the complete user journey

### ❌ DON'Ts

#### Performance Anti-patterns
- **Don't mutate state directly**: Always use setState or reducers
- **Never skip dependency arrays**: In useEffect, useMemo, useCallback
- **Don't use index as key**: Use stable, unique identifiers
- **Never ignore memory leaks**: Clean up subscriptions, timers
- **Don't over-render**: Avoid unnecessary state updates

#### Code Anti-patterns
- **Don't use inline functions in JSX**: Creates new functions on every render
- **Never use dangerouslySetInnerHTML**: Unless absolutely necessary
- **Don't ignore accessibility**: Use semantic HTML, ARIA attributes
- **Never commit console.logs**: Remove debug statements
- **Don't use nested ternary operators**: Use if statements or early returns

#### State Management Anti-patterns
- **Don't store derived state**: Calculate from existing state
- **Never mutate objects/arrays**: Use spread operator or immutability helpers
- **Don't use too many useState**: Consider useReducer for complex state
- **Never ignore loading states**: Always handle loading/error states
- **Don't fetch data in render**: Use useEffect or React Query

#### AI-Assisted Development Anti-patterns ⚠️ CRITICAL
- **Never trust AI without verification**: Always test generated code immediately
- **Don't assume "done" means working**: Verify functionality in browser
- **Never accept syntax errors**: Check for missing imports, brackets, semicolons
- **Don't create duplicate files**: Check if similar files already exist
- **Never ignore console errors**: Fix all JavaScript errors before proceeding
- **Don't skip manual testing**: Always test the actual user interface
- **Never assume AI knows your project structure**: Verify file paths and imports
- **Don't trust hallucinated results**: Cross-check with actual codebase
- **Never skip code review**: Even AI-generated code needs human review
- **Don't ignore breaking changes**: Test existing functionality after changes
- **Don't ask again to fix the syntax**: Keep fixing syntax untill is is correct

## 🤖 AI-Assisted Development Quality Assurance

### Mandatory Verification Steps
Every AI-generated code change MUST go through this checklist:

#### 1. Syntax Verification (CRITICAL)
- [ ] **Check for syntax errors**: Missing brackets, parentheses, semicolons
- [ ] **Verify imports**: All imports are correct and files exist
- [ ] **Validate exports**: All exports match their usage
- [ ] **Check variable names**: No typos in variable/function names
- [ ] **Verify JSX syntax**: Proper closing tags, valid attributes

#### 2. Runtime Verification (CRITICAL)
- [ ] **Start development server**: `npm start` must run without errors
- [ ] **Check browser console**: Zero JavaScript errors
- [ ] **Test page loading**: Page must render without crashes
- [ ] **Verify network requests**: API calls work as expected
- [ ] **Check responsive design**: Test on different screen sizes

#### 3. Functionality Verification (CRITICAL)
- [ ] **Test user interactions**: Click buttons, fill forms, navigate
- [ ] **Verify data flow**: Props passed correctly, state updates work
- [ ] **Check error handling**: Error states display properly
- [ ] **Test edge cases**: Empty states, loading states, error scenarios
- [ ] **Validate accessibility**: Screen reader compatibility, keyboard navigation

#### 4. Code Quality Verification (IMPORTANT)
- [ ] **No duplicate files**: Check for files with identical content
- [ ] **No dead code**: Remove unused imports, variables, functions
- [ ] **Consistent naming**: Follow project naming conventions
- [ ] **Proper file organization**: Files in correct directories
- [ ] **Documentation updated**: Comments and README reflect changes

### Common AI Hallucination Patterns to Watch For

#### False Completion Claims
- **Problem**: AI says "implementation is complete" without testing
- **Solution**: Always verify with manual testing
- **Red Flag**: No error handling or loading states implemented

#### Non-existent Dependencies
- **Problem**: AI references packages or APIs that don't exist
- **Solution**: Verify all imports and dependencies exist
- **Red Flag**: Import statements for non-installed packages

#### Imaginary File Structures
- **Problem**: AI assumes files exist that haven't been created
- **Solution**: Check file paths and create missing files
- **Red Flag**: Imports pointing to non-existent files

#### Inconsistent Implementation
- **Problem**: AI creates multiple versions of same functionality
- **Solution**: Check for duplicate components/functions
- **Red Flag**: Similar files with slight variations

#### Syntax Fabrication
- **Problem**: AI invents syntax that doesn't exist in React/JavaScript
- **Solution**: Test every code block immediately
- **Red Flag**: Unusual syntax patterns or non-standard APIs

### AI Code Review Checklist

Before accepting any AI-generated code:

#### Pre-Implementation Review
- [ ] Does the proposed solution match the actual requirement?
- [ ] Are all referenced files and dependencies real?
- [ ] Is the approach consistent with existing codebase patterns?
- [ ] Are there simpler alternatives to the proposed solution?

#### Post-Implementation Review
- [ ] Does the code actually compile and run?
- [ ] Are there any runtime errors in browser console?
- [ ] Does the UI function as intended?
- [ ] Are there any performance regressions?
- [ ] Is the code maintainable and readable?

### Debugging AI-Generated Issues

#### Common Syntax Issues
```javascript
// ❌ AI might generate invalid JSX
<div>
  <span>Text</span
  <p>More text</p>
</div>

// ✅ Correct syntax
<div>
  <span>Text</span>
  <p>More text</p>
</div>
```

#### Common Import Issues
```javascript
// ❌ AI might import non-existent files
import { NonExistentComponent } from './components/NonExistent';

// ✅ Verify file exists and export is correct
import { ExistingComponent } from './components/ExistingComponent';
```

#### Common State Issues
```javascript
// ❌ AI might use deprecated patterns
this.setState({ value: newValue }); // In functional components

// ✅ Use proper hooks
const [value, setValue] = useState(initialValue);
setValue(newValue);
```

### Documentation and Communication

#### When AI Claims "Complete"
1. **Never accept at face value**: Test immediately
2. **Check all edge cases**: Loading, error, empty states
3. **Verify mobile responsiveness**: Test on different devices
4. **Test user workflows**: Complete user journeys
5. **Review performance impact**: Check for any slowdowns

#### When AI Suggests "Simple Fixes"
1. **Test the fix thoroughly**: Simple fixes can break other things
2. **Check for side effects**: Ensure no other components affected
3. **Verify backwards compatibility**: Existing functionality still works
4. **Run full test suite**: If available, run all tests

#### Error Reporting Best Practices
When AI code fails:
1. **Capture exact error messages**: Copy full stack traces
2. **Document steps to reproduce**: Clear reproduction steps
3. **Note browser/environment**: Browser version, OS, device
4. **Check network requests**: Use browser dev tools
5. **Identify root cause**: Don't just fix symptoms

## 📁 Project Structure Best Practicestecture

### ✅ DO's

#### Component Design
- **Use functional components**: Prefer hooks over class components
- **Follow single responsibility**: One component, one purpose
- **Use composition over inheritance**: Compose components instead of extending
- **Implement proper prop validation**: Use PropTypes or TypeScript
- **Keep components small**: Aim for <150 lines per component

#### State Management
- **Use local state first**: Don't over-engineer with global state
- **Implement Context API wisely**: For theme, auth, user preferences
- **Consider state management libraries**: Redux Toolkit for complex apps
- **Use React Query/SWR**: For server state management
- **Implement proper state lifting**: Move state up when shared

#### Performance Optimization
- **Use React.memo**: Prevent unnecessary re-renders
- **Implement useMemo/useCallback**: Optimize expensive computations
- **Use lazy loading**: React.lazy for code splitting
- **Optimize bundle size**: Tree shaking, dynamic imports
- **Implement virtual scrolling**: For large lists

#### Code Organization
- **Use consistent folder structure**: Group by feature or file type
- **Implement barrel exports**: Clean import statements
- **Use absolute imports**: Configure path mapping
- **Separate concerns**: Hooks, utils, components, pages
- **Follow naming conventions**: PascalCase for components, camelCase for functions

#### Styling & UI
- **Use CSS Modules/Styled Components**: Scoped styling
- **Implement responsive design**: Mobile-first approach
- **Use design system**: Consistent spacing, colors, typography
- **Optimize CSS**: Remove unused styles, minimize bundle
- **Use CSS-in-JS properly**: Avoid runtime style generation

#### Testing
- **Write unit tests**: React Testing Library for components
- **Test user interactions**: Focus on behavior, not implementation
- **Use snapshot testing carefully**: For stable components only
- **Mock external dependencies**: APIs, third-party libraries
- **Test accessibility**: Screen readers, keyboard navigation

#### AI-Assisted Development Quality Control
- **Always verify syntax**: Test every code change immediately after AI generation
- **Run the application**: Never assume code works without running it locally
- **Check browser console**: Verify no JavaScript errors after any changes
- **Validate file uniqueness**: Ensure no duplicate files with same content exist
- **Cross-reference implementations**: Verify AI suggestions match actual project structure
- **Test user workflows**: Always manually test the complete user journey

### ❌ DON'Ts

#### Performance Anti-patterns
- **Don't mutate state directly**: Always use setState or reducers
- **Never skip dependency arrays**: In useEffect, useMemo, useCallback
- **Don't use index as key**: Use stable, unique identifiers
- **Never ignore memory leaks**: Clean up subscriptions, timers
- **Don't over-render**: Avoid unnecessary state updates

#### Code Anti-patterns
- **Don't use inline functions in JSX**: Creates new functions on every render
- **Never use dangerouslySetInnerHTML**: Unless absolutely necessary
- **Don't ignore accessibility**: Use semantic HTML, ARIA attributes
- **Never commit console.logs**: Remove debug statements
- **Don't use nested ternary operators**: Use if statements or early returns

#### State Management Anti-patterns
- **Don't store derived state**: Calculate from existing state
- **Never mutate objects/arrays**: Use spread operator or immutability helpers
- **Don't use too many useState**: Consider useReducer for complex state
- **Never ignore loading states**: Always handle loading/error states
- **Don't fetch data in render**: Use useEffect or React Query

#### AI-Assisted Development Anti-patterns ⚠️ CRITICAL
- **Never trust AI without verification**: Always test generated code immediately
- **Don't assume "done" means working**: Verify functionality in browser
- **Never accept syntax errors**: Check for missing imports, brackets, semicolons
- **Don't create duplicate files**: Check if similar files already exist
- **Never ignore console errors**: Fix all JavaScript errors before proceeding
- **Don't skip manual testing**: Always test the actual user interface
- **Never assume AI knows your project structure**: Verify file paths and imports
- **Don't trust hallucinated results**: Cross-check with actual codebase
- **Never skip code review**: Even AI-generated code needs human review
- **Don't ignore breaking changes**: Test existing functionality after changes

## 📁 Project Structure Best Practices

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Input, Modal)
│   ├── layout/         # Layout components (Header, Footer, Sidebar)
│   └── charts/         # Chart-specific components
├── pages/              # Page components (route components)
│   ├── dashboard/      # Dashboard-related pages
│   ├── trading/        # Trading-related pages
│   └── analysis/       # Analysis-related pages
├── hooks/              # Custom React hooks
├── contexts/           # React Context providers
├── services/           # API calls and business logic
├── utils/              # Utility functions
├── constants/          # Application constants
├── types/              # TypeScript type definitions
├── styles/             # Global styles and themes
├── assets/             # Static assets (images, icons)
└── __tests__/          # Test files
```

## 🎯 Component Development Guidelines

### Component Creation Checklist
- [ ] Single responsibility principle
- [ ] Proper prop validation
- [ ] Error boundary implementation
- [ ] Loading and error states
- [ ] Accessibility features
- [ ] Mobile responsiveness
- [ ] Unit tests written

### Custom Hooks Pattern
```javascript
// hooks/useApi.js
import { useState, useEffect } from 'react';

const useApi = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Network response was not ok');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [url, JSON.stringify(options)]);

  return { data, loading, error, refetch: fetchData };
};
```

## 🔧 Development Workflow

### Code Quality
- **Use ESLint + Prettier**: Consistent code formatting
- **Implement pre-commit hooks**: Husky + lint-staged
- **Always verify AI code**: Test every AI-generated change immediately
- **Check for duplicate files**: Use file search before creating new files
- **Validate syntax before committing**: Run linter and check console
- **Manual testing required**: Never trust AI completion claims
- **Code reviews**: All changes must be reviewed
- **Automated testing**: Run tests on every commit

### AI Development Verification Workflow
1. **Pre-Development Check**
   - [ ] Search for existing similar files/components
   - [ ] Verify project structure and naming conventions
   - [ ] Check current dependencies and imports

2. **During Development**
   - [ ] Test code immediately after AI generation
   - [ ] Check browser console for errors after each change
   - [ ] Verify imports and file paths are correct
   - [ ] Test component rendering and functionality

3. **Post-Development Verification**
   - [ ] Run full application and test all features
   - [ ] Check for any broken existing functionality
   - [ ] Verify responsive design on multiple devices
   - [ ] Test user workflows end-to-end
   - [ ] Run linting and fix all warnings/errors

4. **Before Commit**
   - [ ] Double-check no duplicate files exist
   - [ ] Ensure all console errors are resolved
   - [ ] Verify all features work as expected
   - [ ] Run tests if available
   - [ ] Clean up any debug code or console.logs

### Build & Deployment
- **Optimize bundle size**: Analyze bundle with webpack-bundle-analyzer
- **Use environment variables**: Different configs for dev/staging/prod
- **Implement CI/CD**: Automated testing and deployment
- **Enable source maps**: For debugging in production (secure)
- **Use CDN**: For static assets and libraries

### Performance Monitoring
- **Implement Web Vitals**: Core Web Vitals monitoring
- **Use profiling tools**: React DevTools Profiler
- **Monitor bundle size**: Set size budgets
- **Error tracking**: Sentry or similar for error monitoring
- **User analytics**: Track user interactions and performance

## 🎨 UI/UX Best Practices

### Design System
- **Use consistent spacing**: 4px, 8px, 16px, 24px, 32px scale
- **Implement color palette**: Primary, secondary, neutral, semantic colors
- **Typography scale**: Consistent font sizes and line heights
- **Component variants**: Size variants (sm, md, lg), visual variants
- **Design tokens**: Centralized design values

### Accessibility (A11y)
- **Semantic HTML**: Use proper HTML elements
- **ARIA attributes**: When semantic HTML isn't enough
- **Keyboard navigation**: Tab order, focus management
- **Color contrast**: WCAG AA compliance (4.5:1 ratio)
- **Screen reader support**: Meaningful alt text, labels

### Mobile-First Design
- **Responsive breakpoints**: 320px, 768px, 1024px, 1440px
- **Touch-friendly targets**: Minimum 44px tap targets
- **Performance on mobile**: Optimize for slower networks
- **Progressive enhancement**: Core functionality works everywhere

## 📊 Data Management

### API Integration
- **Use consistent API client**: Axios with interceptors
- **Implement error handling**: Global error handling for API calls
- **Cache API responses**: React Query or SWR for caching
- **Handle loading states**: Show spinners, skeletons
- **Optimistic updates**: Update UI before API confirmation

### Form Management
- **Use form libraries**: Formik or React Hook Form
- **Implement validation**: Client-side and server-side validation
- **Handle form states**: Pristine, dirty, submitting, errors
- **Provide feedback**: Success/error messages
- **Auto-save functionality**: For long forms

## 🔒 Security Best Practices

### Client-Side Security
- **Sanitize user input**: Prevent XSS attacks
- **Validate on server**: Never trust client-side validation alone
- **Secure token storage**: HttpOnly cookies or secure localStorage
- **Content Security Policy**: Implement CSP headers
- **Dependency security**: Regular security audits

### Authentication
- **Implement proper auth flow**: Login, logout, token refresh
- **Handle auth state**: Protected routes, auth context
- **Session management**: Automatic logout on token expiry
- **Remember me functionality**: Secure persistent sessions

## 🚀 Performance Optimization

### Bundle Optimization
- **Code splitting**: Route-based and component-based splitting
- **Tree shaking**: Remove unused code
- **Dynamic imports**: Load code on demand
- **Optimize images**: WebP format, lazy loading, responsive images
- **Use service workers**: Cache static assets

### Runtime Performance
- **Minimize re-renders**: React.memo, useMemo, useCallback
- **Optimize large lists**: Virtual scrolling, pagination
- **Debounce user input**: Search, form inputs
- **Preload critical resources**: Fonts, critical CSS
- **Use web workers**: For heavy computations

## 🧪 Testing Strategy

### Unit Testing
```javascript
// __tests__/components/Button.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import Button from '../components/Button';

describe('Button Component', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Integration Testing
- **Test user workflows**: Complete user journeys
- **Mock API calls**: Use MSW (Mock Service Worker)
- **Test error scenarios**: Network errors, validation errors
- **Cross-browser testing**: Major browsers support

## 📱 Progressive Web App (PWA)

### PWA Features
- **Service Worker**: Offline functionality, caching strategy
- **Web App Manifest**: Install prompts, app-like experience
- **Push notifications**: User engagement features
- **Background sync**: Sync data when online
- **App shell pattern**: Fast initial load

## 🔧 Development Tools & Configuration

### Essential Tools
- **React DevTools**: Component inspection and profiling
- **Redux DevTools**: State debugging (if using Redux)
- **Lighthouse**: Performance and accessibility audits
- **Chrome DevTools**: Performance profiling
- **VS Code extensions**: ES7 snippets, Prettier, ESLint

### Build Configuration
```javascript
// webpack.config.js optimizations
module.exports = {
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@pages': path.resolve(__dirname, 'src/pages'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
};
```

---

# Implementation Examples

## Error Boundary Component
```javascript
// components/ErrorBoundary.jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    // Send to error reporting service
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Something went wrong.</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## API Service Pattern
```javascript
// services/apiService.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  timeout: 10000,
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```
