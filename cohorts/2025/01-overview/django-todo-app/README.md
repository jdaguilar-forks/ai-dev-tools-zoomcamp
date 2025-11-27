# Django TODO App - Homework Solution

A fully functional TODO application built with Django demonstrating AI-assisted development.

## Features

✅ **Create TODOs** - Add new tasks with title, description, and due date
✅ **Edit TODOs** - Update existing TODO items
✅ **Delete TODOs** - Remove completed or unwanted tasks
✅ **Mark as Complete** - Toggle TODO completion status
✅ **Due Dates** - Assign and track due dates for tasks
✅ **Responsive Design** - Beautiful UI with gradient background and smooth interactions

## Project Structure

```
django-todo-app/
├── todoproject/          # Django project configuration
│   ├── settings.py      # Project settings
│   ├── urls.py          # URL routing
│   └── wsgi.py          # WSGI configuration
├── todos/               # Main TODO application
│   ├── models.py        # Todo model definition
│   ├── views.py         # View functions for CRUD operations
│   ├── forms.py         # Django forms for TODO management
│   ├── tests.py         # Comprehensive test suite
│   ├── admin.py         # Admin panel configuration
│   └── migrations/      # Database migrations
├── templates/           # HTML templates
│   ├── base.html        # Base template with styling
│   └── home.html        # Home page with TODO list
└── manage.py            # Django management script
```

## Installation & Setup

### Prerequisites
- Python 3.10+
- uv (recommended) or pip

### Steps

1. **Clone the repository** (if not already done)
```bash
cd /home/jarvis/Documents/repositories/github/ai-dev-tools-zoomcamp/cohorts/2025/01-overview/django-todo-app
```

2. **Create and activate virtual environment**
```bash
uv venv
source .venv/bin/activate
```

3. **Install Django**
```bash
uv pip install django
```

4. **Run migrations**
```bash
python manage.py migrate
```

5. **Start the development server**
```bash
python manage.py runserver
```

6. **Access the application**
Open your browser and navigate to `http://localhost:8000`

## Running Tests

Execute all tests with comprehensive coverage:

```bash
python manage.py test todos
```

### Test Coverage (15 tests)

- **Model Tests**: Todo creation, updates, deletion, completion toggle
- **View Tests**: Home page loading, TODO display, CRUD operations
- **Form Tests**: Multiple TODO creation, ordering verification
- **Edge Cases**: Empty TODO list handling, form validation

All tests pass successfully ✅

## Usage

### Creating a TODO
1. Fill in the title, description, and due date fields
2. Click "Add Todo" button
3. Your TODO will appear in the list below

### Editing a TODO
1. Click the "✏️ Edit" button on any TODO
2. Modify the details in the form
3. Click "Add Todo" to save changes

### Marking as Complete
1. Click "⭕ Mark Done" button to mark a TODO as complete
2. Click "✓ Done" to uncomplete a TODO

### Deleting a TODO
1. Click "🗑️ Delete" button
2. Confirm deletion when prompted

## Questions Answered

### Question 1: Install Django
**Command used:** `uv pip install django`

### Question 2: Project and App
**File to edit:** `settings.py` - Added `'todos'` to `INSTALLED_APPS`

### Question 3: Django Models
**Next step after creating models:** Run migrations

### Question 4: TODO Logic
**Location:** `views.py` - Contains all CRUD logic

### Question 5: Templates
**Registration location:** `TEMPLATES['DIRS']` in project's `settings.py`

### Question 6: Tests
**Command used:** `python manage.py test`

## Technology Stack

- **Backend**: Django 5.2.8
- **Database**: SQLite3
- **Frontend**: HTML5, CSS3
- **Testing**: Django TestCase
- **Environment**: Python 3.13

## Key Implementation Details

### Models (models.py)
- `Todo` model with fields: title, description, due_date, is_completed, created_at, updated_at
- Automatic timestamp tracking
- Ordered by creation date (newest first)

### Views (views.py)
- `home()`: Display all TODOs and show form
- `create_todo()`: Create new TODO via POST
- `update_todo()`: Update existing TODO
- `toggle_todo()`: Toggle completion status
- `delete_todo()`: Delete TODO (POST only)

### Forms (forms.py)
- `TodoForm`: ModelForm for TODO creation/editing
- Bootstrap-inspired styling with form controls

### Templates
- **base.html**: Base template with CSS styling and layout
- **home.html**: Home page with TODO list and form

## Learning Outcomes

Through this project, demonstrated:
- ✅ Django project and app setup
- ✅ Django ORM and models
- ✅ URL routing and views
- ✅ Template rendering
- ✅ Form handling
- ✅ Database migrations
- ✅ Test-driven development
- ✅ CRUD operations
- ✅ User interaction and validation

## Notes

- The app uses SQLite3 for database storage (suitable for development)
- Includes comprehensive error handling
- Responsive design works on desktop and mobile devices
- All code follows Django best practices
