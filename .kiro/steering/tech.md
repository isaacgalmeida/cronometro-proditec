# Technology Stack

## Frontend Technologies

- **HTML5** - Semantic markup with accessibility features (aria-live, aria-label, sr-only classes)
- **CSS3** - Modern CSS with CSS Grid, Flexbox, custom properties (CSS variables), and responsive design
- **Vanilla JavaScript** - No frameworks or libraries, pure ES6+ JavaScript

## Build System

- **No build system** - Static files served directly
- **No package manager** - No npm, yarn, or other dependency management
- **No bundling** - Direct script and stylesheet linking

## Development Workflow

Since this is a static web application with no build process:

### Local Development

```bash
# Serve files locally (any static server)
python -m http.server 8000
# or
npx serve .
# or simply open index.html in browser
```

### Deployment

- Copy files directly to web server
- No compilation or build step required

## Code Conventions

- Use Portuguese for all user-facing text and code comments
- Maintain semantic HTML structure
- Follow accessibility best practices (ARIA labels, semantic elements)
- Use CSS custom properties for theming
- Keep JavaScript functions small and focused
- Use event delegation for better performance
