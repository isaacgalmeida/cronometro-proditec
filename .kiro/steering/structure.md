# Project Structure

## File Organization

```
/
├── index.html          # Main HTML entry point
├── app.js             # Core application logic
├── style.css          # All styles and responsive design
├── .gitattributes     # Git configuration
└── .git/              # Git repository data
```

## Architecture Patterns

### Single Page Application (SPA)

- All functionality contained in one HTML page
- No routing or multiple pages required
- Self-contained application with embedded resources

### Component Organization

- **Timer Logic** (`app.js`) - Countdown functionality, time management
- **Music Integration** (`app.js`) - YouTube embed handling, audio controls
- **UI Controls** (`app.js`) - Event handling, DOM manipulation
- **Styling** (`style.css`) - Visual design, responsive layout, animations

### Code Structure Conventions

#### JavaScript (`app.js`)

- Global variables at top for timer state
- DOM element references cached at module level
- Functions grouped by functionality (timer, music, utilities)
- Event listeners attached using delegation pattern
- No classes or modules - functional programming approach

#### CSS (`style.css`)

- CSS custom properties (variables) defined in `:root`
- Mobile-first responsive design with `@media` queries
- Component-based class naming (`.timer-controls`, `.music-grid`)
- Utility classes for accessibility (`.sr-only`)

#### HTML (`index.html`)

- Semantic structure with `<main>`, `<header>`, `<section>`
- Accessibility attributes throughout
- Portuguese language declaration (`lang="pt-BR"`)
- External resources loaded at end of body

## File Naming

- Use lowercase with hyphens for multi-word files
- Keep filenames descriptive but concise
- No build artifacts or generated files
