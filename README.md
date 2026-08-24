# Feedback Box

A responsive internal innovation portal where employees can submit ideas, discuss suggestions, and vote on proposals. The interface is written in Serbian and runs entirely in the browser with no backend or build step.

## Features

- User registration, sign-in, and role-based controls
- Create, edit, and delete ideas
- Upvotes, downvotes, and comments
- Search, sorting, category filters, and status filters
- Admin workflow for changing proposal status
- Dashboard statistics and responsive layout
- Browser-based persistence with `localStorage`

## Run locally

No dependencies are required. Open `index.html` directly in a browser, or serve the repository with a small local web server:

```bash
python -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## Demo accounts

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `admin123` |
| User | `petar` | `user123` |
| User | `ana` | `user123` |

The application starts with sample users and ideas. Data is stored in the current browser and can be reset by clearing the site's local storage.

## Project structure

```text
.
├── index.html     # Application markup
├── style.css      # Layout and visual styling
└── js/
    ├── app.js     # Application events and orchestration
    ├── auth.js    # Authentication and authorization
    ├── ideas.js   # Idea, voting, and comment operations
    ├── storage.js # Seed data and localStorage helpers
    └── ui.js      # Rendering and UI utilities
```

## Important

This is a front-end demonstration. Credentials and application data are stored in `localStorage`, so it is not suitable for production use without a secure backend and server-side authentication.

