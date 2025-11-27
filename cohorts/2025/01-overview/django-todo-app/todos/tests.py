from django.test import TestCase, Client
from django.urls import reverse
from datetime import datetime, timedelta
from .models import Todo

class TodoModelTestCase(TestCase):
    def setUp(self):
        self.todo = Todo.objects.create(
            title="Test Todo",
            description="Test Description",
            due_date=datetime.now() + timedelta(days=1)
        )

    def test_todo_creation(self):
        """Test that a todo can be created"""
        self.assertEqual(self.todo.title, "Test Todo")
        self.assertEqual(self.todo.description, "Test Description")
        self.assertFalse(self.todo.is_completed)

    def test_todo_str_representation(self):
        """Test the string representation of a todo"""
        self.assertEqual(str(self.todo), "Test Todo")

    def test_todo_completed_toggle(self):
        """Test toggling todo completion status"""
        self.assertFalse(self.todo.is_completed)
        self.todo.is_completed = True
        self.todo.save()
        self.assertTrue(self.todo.is_completed)

    def test_todo_update(self):
        """Test updating a todo"""
        self.todo.title = "Updated Title"
        self.todo.save()
        updated_todo = Todo.objects.get(pk=self.todo.pk)
        self.assertEqual(updated_todo.title, "Updated Title")

    def test_todo_deletion(self):
        """Test deleting a todo"""
        todo_id = self.todo.pk
        self.todo.delete()
        self.assertFalse(Todo.objects.filter(pk=todo_id).exists())


class TodoViewTestCase(TestCase):
    def setUp(self):
        self.client = Client()
        self.todo = Todo.objects.create(
            title="Test Todo",
            description="Test Description"
        )

    def test_home_page_loads(self):
        """Test that the home page loads successfully"""
        response = self.client.get(reverse('home'))
        self.assertEqual(response.status_code, 200)
        self.assertTemplateUsed(response, 'home.html')

    def test_home_page_displays_todos(self):
        """Test that todos are displayed on the home page"""
        response = self.client.get(reverse('home'))
        self.assertContains(response, "Test Todo")

    def test_create_todo(self):
        """Test creating a new todo"""
        response = self.client.post(reverse('create_todo'), {
            'title': 'New Todo',
            'description': 'New Description',
            'due_date': ''
        })
        self.assertEqual(response.status_code, 302)
        self.assertTrue(Todo.objects.filter(title='New Todo').exists())

    def test_toggle_todo_completion(self):
        """Test toggling a todo's completion status"""
        response = self.client.get(reverse('toggle_todo', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 302)
        updated_todo = Todo.objects.get(pk=self.todo.pk)
        self.assertTrue(updated_todo.is_completed)

    def test_delete_todo(self):
        """Test deleting a todo"""
        todo_id = self.todo.pk
        response = self.client.post(reverse('delete_todo', args=[todo_id]))
        self.assertEqual(response.status_code, 302)
        self.assertFalse(Todo.objects.filter(pk=todo_id).exists())

    def test_update_todo_page_loads(self):
        """Test that the update todo page loads"""
        response = self.client.get(reverse('update_todo', args=[self.todo.pk]))
        self.assertEqual(response.status_code, 200)

    def test_update_todo(self):
        """Test updating a todo"""
        response = self.client.post(reverse('update_todo', args=[self.todo.pk]), {
            'title': 'Updated Todo',
            'description': 'Updated Description',
            'due_date': ''
        })
        self.assertEqual(response.status_code, 302)
        updated_todo = Todo.objects.get(pk=self.todo.pk)
        self.assertEqual(updated_todo.title, 'Updated Todo')

    def test_empty_todo_list(self):
        """Test that empty todo list shows appropriate message"""
        Todo.objects.all().delete()
        response = self.client.get(reverse('home'))
        self.assertContains(response, "No todos yet")


class TodoFormTestCase(TestCase):
    def test_create_multiple_todos(self):
        """Test creating multiple todos"""
        for i in range(5):
            self.client.post(reverse('create_todo'), {
                'title': f'Todo {i}',
                'description': f'Description {i}',
                'due_date': ''
            })
        self.assertEqual(Todo.objects.count(), 5)

    def test_todo_ordering(self):
        """Test that todos are ordered by creation date (newest first)"""
        todo1 = Todo.objects.create(title="Todo 1")
        todo2 = Todo.objects.create(title="Todo 2")
        todos = Todo.objects.all()
        self.assertEqual(todos[0].title, "Todo 2")
        self.assertEqual(todos[1].title, "Todo 1")
